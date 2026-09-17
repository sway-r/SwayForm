import { createHash, timingSafeEqual } from 'node:crypto';

/** Constant-time string comparison — hashing first means both inputs
 *  compare as fixed-size (32-byte) buffers regardless of their own length,
 *  so this never hits timingSafeEqual's "different length" throw and never
 *  leaks length or prefix-match information through response timing, unlike
 *  a plain `===` on the raw secret. */
function secureEqual(a, b){
  const bufA = createHash('sha256').update(String(a)).digest();
  const bufB = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a server-to-server request from the bridge VPS (api/robot/agent.js
 * — auth, heartbeat, and job lifecycle updates). A static shared secret is
 * enough here — this call never reaches a browser, unlike the short-lived
 * per-viewer JWTs used for browser-facing bridge access added in later
 * phases.
 */
export function requireBridgeSecret(req, res){
  const expected = process.env.BRIDGE_SERVICE_SECRET;
  if (!expected) throw new Error('BRIDGE_SERVICE_SECRET is not set');

  const provided = req.headers['x-bridge-secret'];
  if (typeof provided !== 'string' || !secureEqual(provided, expected)){
    res.status(401).json({ error: 'not_authorized' });
    return false;
  }
  return true;
}

/**
 * The one direction that didn't exist before force-stop: api/ calling OUT
 * to the bridge (every other exchange is bridge-initiated). Same shared
 * secret, opposite direction — the bridge validates it with the same
 * x-bridge-secret check it already uses to gate /mediamtx-auth and
 * /_exchange from being reachable as arbitrary HTTP routes.
 */
export async function callBridge(path, body, timeoutMs = 8_000){
  const base = process.env.BRIDGE_URL;
  const secret = process.env.BRIDGE_SERVICE_SECRET;
  if (!base) throw new Error('BRIDGE_URL is not set');
  if (!secret) throw new Error('BRIDGE_SERVICE_SECRET is not set');

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bridge-secret': secret },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}
