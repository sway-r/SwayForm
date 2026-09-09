import { readSessionFromRequest } from './_lib/session.js';
import { upsertProfile, enrichSessionWithProfile } from './_lib/db.js';

const MAX_LENGTH = 100;

export default async function handler(req, res){
  if (req.method !== 'POST'){
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const session = await readSessionFromRequest(req);
  if (!session){
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }

  const displayName = String((req.body || {}).displayName || '').trim().slice(0, MAX_LENGTH);
  const schoolName = String((req.body || {}).schoolName || '').trim().slice(0, MAX_LENGTH);
  if (!displayName || !schoolName){
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  await upsertProfile(session.email, { displayName, schoolName });
  res.status(200).json({ session: await enrichSessionWithProfile(session) });
}
