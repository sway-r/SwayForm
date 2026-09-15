import { SignJWT, jwtVerify } from 'jose';
import { serialize, parse } from 'cookie';
import { randomUUID } from 'node:crypto';
import { sql, findRoleForEmail } from './db.js';

const COOKIE_NAME = 'swayform_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey(){
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

function cookieOptions(){
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview',
  };
}

/** Signs `session` and returns a Set-Cookie header value. */
export async function createSessionCookie(session){
  const id = randomUUID();
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  await sql`INSERT INTO portal_sessions (id, email, expires_at)
    VALUES (${id}, ${session.email}, now() + interval '7 days')`;

  return serialize(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_SECONDS });
}

/** Returns a Set-Cookie header value that clears the session cookie. */
export function clearSessionCookie(){
  return serialize(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 });
}

/** Reads and verifies the session cookie from a request. Returns null if absent/invalid. */
export async function readSessionFromRequest(req){
  const header = req.headers.cookie;
  if (!header) return null;

  const token = parse(header)[COOKIE_NAME];
  if (!token) return null;

  let payload;
  try {
    ({ payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] }));
  } catch (e) {
    return null;
  }
  // Pre-migration stateless cookies are deliberately not accepted.
  if (typeof payload.jti !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.jti) || typeof payload.email !== 'string') return null;
  const rows = await sql`SELECT id FROM portal_sessions
    WHERE id = ${payload.jti} AND email = ${payload.email} AND expires_at > now()`;
  if (!rows.length) return null;
  const { iat, exp, jti, ...session } = payload;
  const current = await findRoleForEmail(session.email);
  const result = {
    ...session,
    mode: current ? current.role : 'member',
    robotId: current ? current.robotId : null,
    robotSerial: current ? current.robotSerial : null,
    robotSchoolName: current ? current.robotSchoolName : null,
  };
  // Available to server logout, never serialized into the browser response.
  Object.defineProperty(result, 'sessionId', { value: jti });
  return result;
}

export async function revokeSession(req){
  const session = await readSessionFromRequest(req);
  if (session) await sql`DELETE FROM portal_sessions WHERE id = ${session.sessionId}`;
}

/** Rejects with 405 and returns false unless req.method matches. */
export function requireMethod(req, res, method){
  if (req.method !== method){
    res.status(405).json({ error: 'method_not_allowed' });
    return false;
  }
  return true;
}

/** Reads the session cookie, rejecting with 401 if there isn't a valid one. */
export async function requireSession(req, res){
  const session = await readSessionFromRequest(req);
  if (!session){
    res.status(401).json({ error: 'not_authenticated' });
    return null;
  }
  return session;
}
