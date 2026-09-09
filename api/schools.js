import { requireSession } from './_lib/session.js';
import { listSchoolNames } from './_lib/db.js';

export default async function handler(req, res){
  const session = await requireSession(req, res);
  if (!session) return;

  res.status(200).json({ schools: await listSchoolNames() });
}
