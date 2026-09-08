import { readSessionFromRequest } from '../_lib/session.js';

export default async function handler(req, res){
  const session = await readSessionFromRequest(req);
  res.status(200).json({ session });
}
