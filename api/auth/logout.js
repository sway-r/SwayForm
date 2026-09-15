import { clearSessionCookie, requireMethod, revokeSession } from '../_lib/session.js';
import { requireBrowserMutation } from '../_lib/browser-security.js';

export default async function handler(req, res){
  if (!requireMethod(req, res, 'POST')) return;
  if (!requireBrowserMutation(req, res)) return;
  await revokeSession(req);

  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ ok: true });
}
