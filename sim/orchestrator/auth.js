import { jwtVerify } from 'jose';

// Tokens are minted by api/_lib/sim.js; keep PURPOSE and AUDIENCE in sync with it.
export const SIM_TOKEN_PURPOSE = 'sim-session';
export const SIM_TOKEN_AUDIENCE = 'swayform-sim';

export async function verifySimToken(token, secret){
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(String(token || ''), key, {
    algorithms: ['HS256'],
    audience: SIM_TOKEN_AUDIENCE,
    requiredClaims: ['exp', 'iat', 'sub'],
  });
  if (payload.purpose !== SIM_TOKEN_PURPOSE) throw new Error('wrong_purpose');
  if (typeof payload.sub !== 'string' || !payload.sub.includes('@')) throw new Error('bad_subject');
  return { owner: payload.sub.toLowerCase(), role: payload.role || 'student', robotId: payload.robotId ?? null };
}
