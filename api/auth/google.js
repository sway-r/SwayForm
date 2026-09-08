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

  const match = await findRoleForEmail(payload.email);
  if (!match){
    res.status(403).json({
      error: 'not_authorized',
      message: "This Google account isn't linked to a SwayForm robot yet. Ask your admin to add you, or continue as a guest below.",
    });
    return;
  }

  const session = {
    mode: match.role,
    email: payload.email.trim().toLowerCase(),
    name: payload.name || payload.email,
    picture: payload.picture || null,
    robotId: match.robotId,
    robotSerial: match.robotSerial,
  };

  const cookie = await createSessionCookie(session);
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ session });
}
