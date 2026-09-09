import { SignJWT, jwtVerify } from 'jose';
import { serialize, parse } from 'cookie';

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
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

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

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const { iat, exp, ...session } = payload;
    return session;
  } catch (e) {
    return null;
  }
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
