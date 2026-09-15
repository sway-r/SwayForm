import { requireSession } from './_lib/session.js';
import { listSchoolNames } from './_lib/db.js';
import { privateResponse } from './_lib/browser-security.js';

export default async function handler(req, res){
  privateResponse(res);
  const session = await requireSession(req, res);
  if (!session) return;

  res.status(200).json({ schools: await listSchoolNames() });
}
