import { findRoleForEmail } from './db.js';

/**
 * Re-validates a session's admin claim against the database (the cookie JWT
 * can be up to 7 days stale) so a removed admin can't keep acting as one
 * until their cookie happens to expire. Returns the current robotId on
 * success, or null if the session should be rejected.
 */
export async function requireCurrentAdmin(session){
  if (!session || session.mode !== 'admin') return null;
  const current = await findRoleForEmail(session.email);
  if (!current || current.role !== 'admin' || current.robotId !== session.robotId) return null;
  return current.robotId;
}

/**
 * Same re-validation, but accepts either an admin or an active student —
 * for endpoints any linked account may read (e.g. robot online/offline
 * status). Returns the current robotId, or null if unauthorized.
 */
export async function requireCurrentRobotMember(session){
  if (!session || (session.mode !== 'admin' && session.mode !== 'student')) return null;
  const current = await findRoleForEmail(session.email);
  if (!current || current.robotId !== session.robotId) return null;
  return current.robotId;
}
