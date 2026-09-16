import crypto from 'node:crypto';
import { SignJWT } from 'jose';
import { readSessionFromRequest } from './_lib/session.js';
import { sql, fetchProgressSummary } from './_lib/db.js';
import { requireCurrentAdmin } from './_lib/authz.js';
import { MAX_ACTIVE_SEATS, MAX_TOTAL_STUDENTS } from './_lib/limits.js';
import { privateResponse, requireBrowserMutation, rateLimit, validEmail } from './_lib/browser-security.js';
import { findItem } from '../portal/data/curriculum.js';

const CODE_SERVER_TOKEN_TTL_SECONDS = 60;

function bridgeSecretKey(){
  const secret = process.env.BRIDGE_SERVICE_SECRET;
  if (!secret) throw new Error('BRIDGE_SERVICE_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export default async function handler(req, res){
  privateResponse(res);
  if (req.method === 'POST' && !requireBrowserMutation(req, res)) return;
  const session = await readSessionFromRequest(req);
  const robotId = await requireCurrentAdmin(session);
  if (!robotId){
    res.status(401).json({ error: 'not_authorized' });
    return;
  }

  if (req.method === 'GET'){
    const [robotRows, emailRows, studentRows, invitations] = await Promise.all([
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
      sql`SELECT id, email, expires_at FROM school_invitations WHERE robot_id = ${robotId} AND expires_at > now() ORDER BY created_at`,
    ]);

    // Only active students' progress is worth the admin's time — archived
    // students' work is preserved in the DB but not surfaced here.
    const activeEmails = studentRows.filter((r) => r.status === 'active').map((r) => r.email);
    const progress = await fetchProgressSummary(activeEmails);

    res.status(200).json({
      robotSerial: robotRows[0] && robotRows[0].serial_number,
      adminEmails: emailRows.map((r) => r.email),
      invitations,
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

  if (!await rateLimit(res, 'admin', session.email, 60)) return;
  const body = req.body || {};
  async function audit(action, email){
    await sql`INSERT INTO portal_audit_events (robot_id, actor_email, action, subject_email) VALUES (${robotId}, ${session.email}, ${action}, ${email})`;
  }

  switch (body.action){
    case 'add_student': {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!validEmail(email)){ res.status(400).json({ error: 'invalid_email' }); return; }
      const [existing] = await sql`SELECT status FROM students WHERE robot_id = ${robotId} AND email = ${email}`;
      if (existing?.status === 'active'){ res.status(200).json({ ok: true, alreadyActive: true }); return; }
      // Serialize invitation allocation for this robot, including concurrent admins.
      const [, inserted] = await sql.transaction([
        sql`SELECT id FROM robots WHERE id = ${robotId} FOR UPDATE`,
        sql`
          INSERT INTO school_invitations (robot_id, email, invited_by)
          SELECT ${robotId}, ${email}, ${session.email}
          WHERE (SELECT count(*) FROM students WHERE robot_id = ${robotId})
              + (SELECT count(*) FROM school_invitations WHERE robot_id = ${robotId} AND expires_at > now()) < ${MAX_TOTAL_STUDENTS}
            OR EXISTS (SELECT 1 FROM school_invitations WHERE robot_id = ${robotId} AND email = ${email})
          ON CONFLICT (robot_id, email) DO UPDATE SET invited_by = EXCLUDED.invited_by, expires_at = now() + interval '14 days'
          RETURNING id
        `,
      ]);
      if (!inserted.length){ res.status(400).json({ error: 'total_limit', message: 'Remove an unused invitation or roster entry before inviting another student.' }); return; }
      await audit('invite_student', email);
      res.status(200).json({ ok: true, invited: true });
      return;
    }

    case 'cancel_invitation': {
      const id = Number(body.invitationId);
      if (!Number.isSafeInteger(id) || id < 1){ res.status(400).json({ error: 'invalid_invitation' }); return; }
      const rows = await sql`DELETE FROM school_invitations WHERE id = ${id} AND robot_id = ${robotId} RETURNING email`;
      if (rows.length) await audit('cancel_invitation', rows[0].email);
      res.status(200).json({ ok: true });
      return;
    }

    case 'archive_student': {
      const studentId = Number(body.studentId);
      if (!studentId){ res.status(400).json({ error: 'missing_student_id' }); return; }
      const rows = await sql`
        UPDATE students SET status = 'archived', seat_number = NULL, archived_at = now()
        WHERE id = ${studentId} AND robot_id = ${robotId}
        RETURNING email
      `;
      // Every other roster action (invite/cancel/remove) writes an audit
      // row — this one didn't, leaving no record of who archived a student
      // or when.
      if (rows.length) await audit('archive_student', rows[0].email);
      res.status(200).json({ ok: true });
      return;
    }

    // Removing a roster entry never gives this school authority to erase an
    // account-wide profile or progress. Verified account deletion is a separate process.
    case 'delete_student': {
      const studentId = Number(body.studentId);
      if (!studentId){ res.status(400).json({ error: 'missing_student_id' }); return; }
      const rows = await sql`SELECT email FROM students WHERE id = ${studentId} AND robot_id = ${robotId}`;
      if (!rows.length){ res.status(404).json({ error: 'not_found' }); return; }
      const email = rows[0].email;

      await sql`DELETE FROM students WHERE id = ${studentId} AND robot_id = ${robotId}`;

      await audit('remove_student', email);

      res.status(200).json({ ok: true });
      return;
    }

    case 'set_admin_email': {
      const slot = Number(body.slot);
      const email = String(body.email || '').trim().toLowerCase();
      if (![1, 2].includes(slot) || !validEmail(email)){ res.status(400).json({ error: 'invalid_input' }); return; }

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
      await audit('set_admin_email', email);
      res.status(200).json({ ok: true });
      return;
    }

    // Mints a single-use, 60s token exchanged at the bridge
    // (bridge/server.js's /_exchange route) for a 30-min httpOnly cookie
    // on code.bridge.swayform.net. requireCurrentAdmin above already
    // re-validated the admin role fresh from Postgres for this whole
    // request — no separate check needed here. Full arbitrary code
    // execution on the robot's Pi sits behind this, so admin-only and a
    // short, single-use token are load-bearing, not just tidiness.
    case 'code-server-token': {
      // This installation is one shared editor, not an isolated editor per school.
      if (!process.env.CODE_SERVER_ROBOT_ID || String(robotId) !== process.env.CODE_SERVER_ROBOT_ID){
        res.status(403).json({ error: 'editor_not_configured_for_robot' }); return;
      }
      const token = await new SignJWT({ robotId, purpose: 'code-server', jti: crypto.randomUUID() })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${CODE_SERVER_TOKEN_TTL_SECONDS}s`)
        .sign(bridgeSecretKey());
      res.status(200).json({ token });
      return;
    }

    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}
