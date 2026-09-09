import { readSessionFromRequest } from '../_lib/session.js';
import { enrichSessionWithProfile } from '../_lib/db.js';

export default async function handler(req, res){
  const session = await readSessionFromRequest(req);
  res.status(200).json({ session: await enrichSessionWithProfile(session) });
}
