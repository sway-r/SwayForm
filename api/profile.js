import { requireMethod, requireSession } from './_lib/session.js';
import { upsertProfile, enrichSessionWithProfile, findRoleForEmail } from './_lib/db.js';
import { requireBrowserMutation, rateLimit } from './_lib/browser-security.js';
import { respondToInvitation } from './_lib/invitations.js';

const MAX_LENGTH = 100;

export default async function handler(req, res){
  if (!requireMethod(req, res, 'POST')) return;
  if (!requireBrowserMutation(req, res)) return;
  const session = await requireSession(req, res);
  if (!session) return;
  if (!await rateLimit(res, 'profile', session.email, 30)) return;
  if (['accept_invitation', 'decline_invitation'].includes(req.body.action)){
    return respondToInvitation(session, res, Number(req.body.invitationId), req.body.action === 'accept_invitation');
  }

  const displayName = String((req.body || {}).displayName || '').trim().slice(0, MAX_LENGTH);
  let schoolName = String((req.body || {}).schoolName || '').trim().slice(0, MAX_LENGTH);

  // If this email is already linked to a robot, that robot's school is
  // authoritative — re-derived fresh from the database here rather than
  // trusting the client, same as the onboarding UI locking the field is
  // a UX nicety, not the actual enforcement.
  {
    const current = await findRoleForEmail(session.email);
    if (current && current.robotSchoolName) schoolName = current.robotSchoolName;
  }

  if (!displayName || !schoolName){
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  await upsertProfile(session.email, { displayName, schoolName });
  res.status(200).json({ session: await enrichSessionWithProfile(session) });
}
