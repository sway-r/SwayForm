import { sql, findRoleForEmail, syncProfileSchoolToRobot } from './db.js';
import { MAX_ACTIVE_SEATS } from './limits.js';

export async function respondToInvitation(session, res, id, accept){
  if (!Number.isSafeInteger(id) || id < 1){ res.status(400).json({ error: 'invalid_invitation' }); return; }
  const [invite] = await sql`SELECT robot_id FROM school_invitations
    WHERE id = ${id} AND email = ${session.email} AND expires_at > now()`;
  if (!invite){ res.status(404).json({ error: 'invitation_not_found' }); return; }
  if (!accept){
    await sql`DELETE FROM school_invitations WHERE id = ${id} AND email = ${session.email}`;
    res.status(200).json({ ok: true });
    return;
  }
  const current = await findRoleForEmail(session.email);
  if (current && (current.robotId !== invite.robot_id || current.role === 'admin')){
    res.status(409).json({ error: 'already_linked', message: 'You are already linked to a robot. Ask your school to arrange a transfer first.' });
    return;
  }
  // Row lock serializes seat allocation with other acceptance/roster actions.
  // The invitation is checked again in the write, including owner and expiry.
  try {
    const [, , activated] = await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(hashtext(${session.email}))`,
      sql`SELECT id FROM robots WHERE id = ${invite.robot_id} FOR UPDATE`,
      sql`
        INSERT INTO students (robot_id, email, seat_number, status)
        SELECT i.robot_id, i.email, seats.n, 'active'
        FROM school_invitations i
        CROSS JOIN LATERAL (
          SELECT n FROM generate_series(1, ${MAX_ACTIVE_SEATS}) n
          WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.robot_id = i.robot_id AND s.status = 'active' AND s.seat_number = n)
          ORDER BY n LIMIT 1
        ) seats
        WHERE i.id = ${id} AND i.email = ${session.email} AND i.expires_at > now()
          AND EXISTS (SELECT 1 FROM user_profiles WHERE email = ${session.email})
          AND NOT EXISTS (SELECT 1 FROM students WHERE email = ${session.email} AND status = 'active')
          AND NOT EXISTS (SELECT 1 FROM admin_emails WHERE email = ${session.email})
        ON CONFLICT (robot_id, email) DO UPDATE SET status = 'active', seat_number = EXCLUDED.seat_number, archived_at = NULL
        RETURNING id
      `,
      sql`DELETE FROM school_invitations WHERE id = ${id} AND email = ${session.email}
        AND EXISTS (SELECT 1 FROM students WHERE robot_id = ${invite.robot_id} AND email = ${session.email} AND status = 'active')`,
    ]);
    if (!activated.length){ res.status(409).json({ error: 'seat_unavailable', message: 'No seat is available, or your membership changed. Refresh and ask your teacher to check.' }); return; }
  } catch (e){
    if (e.code === '23505'){ res.status(409).json({ error: 'seat_unavailable' }); return; }
    throw e;
  }
  await syncProfileSchoolToRobot(session.email, invite.robot_id);
  await sql`INSERT INTO portal_audit_events (robot_id, actor_email, action, subject_email)
    VALUES (${invite.robot_id}, ${session.email}, 'accept_invitation', ${session.email})`;
  res.status(200).json({ ok: true });
}
