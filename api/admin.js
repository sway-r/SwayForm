import { readSessionFromRequest } from './_lib/session.js';
import { sql, fetchProgressSummary, syncProfileSchoolToRobot } from './_lib/db.js';
import { requireCurrentAdmin } from './_lib/authz.js';
import { MAX_ACTIVE_SEATS, MAX_TOTAL_STUDENTS } from './_lib/limits.js';
import { findItem } from '../portal/data/curriculum.js';

export default async function handler(req, res){
  const session = await readSessionFromRequest(req);
  const robotId = await requireCurrentAdmin(session);
  if (!robotId){
    res.status(401).json({ error: 'not_authorized' });
    return;
  }

  if (req.method === 'GET'){
    const [robotRows, emailRows, studentRows] = await Promise.all([
      sql`SELECT serial_number FROM robots WHERE id = ${robotId}`,
      sql`
        SELECT ae.email FROM admin_emails ae
        JOIN admin_accounts aa ON aa.id = ae.admin_account_id
        WHERE aa.robot_id = ${robotId} ORDER BY ae.id
      `,
      sql`
        SELECT id, email, seat_number, status FROM students
        WHERE robot_id = ${robotId}
        ORDER BY (status = 'active') DESC, seat_number, created_at
      `,
    ]);

    // Only active students' progress is worth the admin's time — archived
    // students' work is preserved in the DB but not surfaced here.
    const activeEmails = studentRows.filter((r) => r.status === 'active').map((r) => r.email);
    const progress = await fetchProgressSummary(activeEmails);

    res.status(200).json({
      robotSerial: robotRows[0] && robotRows[0].serial_number,
      adminEmails: emailRows.map((r) => r.email),
      students: studentRows.map((r) => {
        const p = progress[r.email];
        const current = p && p.currentActivityId ? findItem(p.currentActivityId) : null;
        return {
          id: r.id, email: r.email, seatNumber: r.seat_number, status: r.status,
          completedCount: p ? p.completedCount : 0,
          currentActivityTitle: current ? current.item.title : null,
          currentActivityUpdatedAt: p ? p.currentUpdatedAt : null,
        };
      }),
    });
    return;
  }

  if (req.method !== 'POST'){
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = req.body || {};

  switch (body.action){
    case 'add_student': {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email){ res.status(400).json({ error: 'missing_email' }); return; }

      const [counts] = await sql`
        SELECT
          count(*) FILTER (WHERE status = 'active') AS active_count,
          count(*) AS total_count
        FROM students WHERE robot_id = ${robotId}
      `;
      const existing = await sql`SELECT id FROM students WHERE robot_id = ${robotId} AND email = ${email}`;
      const isNewStudent = existing.length === 0;

      if (isNewStudent && Number(counts.total_count) >= MAX_TOTAL_STUDENTS){
        res.status(400).json({ error: 'total_limit', message: `This robot has reached its ${MAX_TOTAL_STUDENTS}-student history limit. Permanently delete an archived student to add a new one.` });
        return;
      }
      if (Number(counts.active_count) >= MAX_ACTIVE_SEATS){
        res.status(400).json({ error: 'seat_limit', message: `All ${MAX_ACTIVE_SEATS} seats are already full.` });
        return;
      }

      const seatRows = await sql`
        SELECT s AS seat FROM generate_series(1, ${MAX_ACTIVE_SEATS}) AS s
        WHERE s NOT IN (
          SELECT seat_number FROM students
          WHERE robot_id = ${robotId} AND status = 'active' AND seat_number IS NOT NULL
        )
        ORDER BY s LIMIT 1
      `;
      const seatNumber = seatRows[0] && seatRows[0].seat;
      if (!seatNumber){
        res.status(400).json({ error: 'seat_limit', message: `All ${MAX_ACTIVE_SEATS} seats are already full.` });
        return;
      }

      try {
        await sql`
          INSERT INTO students (robot_id, email, seat_number, status)
          VALUES (${robotId}, ${email}, ${seatNumber}, 'active')
          ON CONFLICT (robot_id, email) DO UPDATE
            SET status = 'active', seat_number = ${seatNumber}, archived_at = NULL
        `;
      } catch (e){
        // Two concurrent requests can both pick the same free seat before
        // either commits — the partial unique index on (robot_id,
        // seat_number) WHERE status='active' catches that collision.
        if (e && e.code === '23505'){
          res.status(400).json({ error: 'seat_limit', message: 'That seat was just taken by another request — please try again.' });
          return;
        }
        throw e;
      }
      // A robot's school is the source of truth once someone's actually
      // tied to it — if they'd already onboarded with a different
      // self-reported school (or transferred from elsewhere), correct it
      // now rather than leaving a stale mismatch. No-op if they haven't
      // onboarded yet.
      await syncProfileSchoolToRobot(email, robotId);
      res.status(200).json({ ok: true });
      return;
    }

    case 'archive_student': {
      const studentId = Number(body.studentId);
      if (!studentId){ res.status(400).json({ error: 'missing_student_id' }); return; }
      await sql`
        UPDATE students SET status = 'archived', seat_number = NULL, archived_at = now()
        WHERE id = ${studentId} AND robot_id = ${robotId}
      `;
      res.status(200).json({ ok: true });
      return;
    }

    // Permanent, per the original spec ("delete data forever"). Deletes the
    // student's seat history for THIS robot, and additionally erases their
    // account-wide profile (which cascades to their progress) only if this
    // email has no other footprint anywhere else on the platform — the same
    // email can legitimately be an active student at a different robot, or
    // an admin, and "delete forever" from one robot's panel must not nuke
    // an account another robot's admin still relies on.
    case 'delete_student': {
      const studentId = Number(body.studentId);
      if (!studentId){ res.status(400).json({ error: 'missing_student_id' }); return; }
      const rows = await sql`SELECT email FROM students WHERE id = ${studentId} AND robot_id = ${robotId}`;
      if (!rows.length){ res.status(404).json({ error: 'not_found' }); return; }
      const email = rows[0].email;

      await sql`DELETE FROM students WHERE id = ${studentId} AND robot_id = ${robotId}`;

      const elsewhere = await sql`
        SELECT 1 AS hit FROM students WHERE email = ${email}
        UNION ALL
        SELECT 1 AS hit FROM admin_emails WHERE email = ${email}
        LIMIT 1
      `;
      if (!elsewhere.length){
        await sql`DELETE FROM user_profiles WHERE email = ${email}`;
      }

      res.status(200).json({ ok: true });
      return;
    }

    case 'set_admin_email': {
      const slot = Number(body.slot);
      const email = String(body.email || '').trim().toLowerCase();
      if (![1, 2].includes(slot) || !email){ res.status(400).json({ error: 'invalid_input' }); return; }

      const accountRows = await sql`SELECT id FROM admin_accounts WHERE robot_id = ${robotId}`;
      const adminAccountId = accountRows[0] && accountRows[0].id;
      const existing = await sql`SELECT id FROM admin_emails WHERE admin_account_id = ${adminAccountId} ORDER BY id`;

      try {
        if (existing[slot - 1]){
          await sql`UPDATE admin_emails SET email = ${email} WHERE id = ${existing[slot - 1].id}`;
        } else if (existing.length < 2){
          await sql`INSERT INTO admin_emails (admin_account_id, email) VALUES (${adminAccountId}, ${email})`;
        } else {
          res.status(400).json({ error: 'slot_taken' });
          return;
        }
      } catch (e){
        if (e && e.code === '23505'){
          res.status(400).json({ error: 'email_taken', message: 'That email is already registered as an admin for another robot.' });
          return;
        }
        throw e;
      }
      await syncProfileSchoolToRobot(email, robotId);
      res.status(200).json({ ok: true });
      return;
    }

    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}
