import { clearSessionCookie, requireMethod } from '../_lib/session.js';

export default async function handler(req, res){
  if (!requireMethod(req, res, 'POST')) return;

  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ ok: true });
}
