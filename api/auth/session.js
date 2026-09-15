import { readSessionFromRequest, requireMethod } from '../_lib/session.js';
import { enrichSessionWithProfile } from '../_lib/db.js';
import { privateResponse } from '../_lib/browser-security.js';

export default async function handler(req, res){
  privateResponse(res);
  if (!requireMethod(req, res, 'GET')) return;
  const session = await readSessionFromRequest(req);
  res.status(200).json({ session: await enrichSessionWithProfile(session) });
}
