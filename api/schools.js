import { readSessionFromRequest } from './_lib/session.js';
import { listSchoolNames } from './_lib/db.js';

export default async function handler(req, res){
  const session = await readSessionFromRequest(req);
  if (!session){
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }

  res.status(200).json({ schools: await listSchoolNames() });
}
