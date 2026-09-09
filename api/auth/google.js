import { OAuth2Client } from 'google-auth-library';
import { findRoleForEmail } from '../_lib/db.js';
import { createSessionCookie } from '../_lib/session.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res){
  if (req.method !== 'POST'){
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { credential } = req.body || {};
  if (!credential){
    res.status(400).json({ error: 'missing_credential' });
    return;
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (e) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  if (!payload || !payload.email || !payload.email_verified){
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  // Any verified Google account may sign in. If it's linked to a robot
  // (admin or student), the session carries that binding; otherwise it's a
  // plain 'member' session — simulations only, no Robot desktop icon.
  const match = await findRoleForEmail(payload.email);

  const session = {
    mode: match ? match.role : 'member',
    email: payload.email.trim().toLowerCase(),
    name: payload.name || payload.email,
    picture: payload.picture || null,
    robotId: match ? match.robotId : null,
    robotSerial: match ? match.robotSerial : null,
  };

  const cookie = await createSessionCookie(session);
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ session });
}
