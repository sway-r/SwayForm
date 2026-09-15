import { createHash } from 'node:crypto';
import { sql } from './db.js';

export function privateResponse(res){
  res.setHeader('Cache-Control', 'private, no-store');
}

// Browser mutations only. Machine-to-machine robot routes use their own protocol.
export function requireBrowserMutation(req, res){
  privateResponse(res);
  const allowed = new Set(['https://swayform.net', 'https://www.swayform.net', 'https://learning.swayform.net']);
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]){
    if (host) allowed.add(`https://${host}`);
  }
  if (!process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production'){
    for (const port of [3000, 4600, 4601]){
      allowed.add(`http://localhost:${port}`);
      allowed.add(`http://127.0.0.1:${port}`);
    }
  }
  if (!allowed.has(req.headers.origin)){
    res.status(403).json({ error: 'untrusted_origin' });
    return false;
  }
  if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json'){
    res.status(415).json({ error: 'json_required' });
    return false;
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)){
    res.status(400).json({ error: 'invalid_body' });
    return false;
  }
  return true;
}

export function validEmail(value){
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function rateLimit(res, scope, identity, limit, seconds = 60){
  const key = createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  const [row] = await sql`
    INSERT INTO portal_rate_limits (key, window_start, hits)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN portal_rate_limits.window_start < now() - ${seconds} * interval '1 second'
        THEN 1 ELSE portal_rate_limits.hits + 1 END,
      window_start = CASE WHEN portal_rate_limits.window_start < now() - ${seconds} * interval '1 second'
        THEN now() ELSE portal_rate_limits.window_start END
    RETURNING hits
  `;
  if (Number(row.hits) <= limit) return true;
  res.setHeader('Retry-After', String(seconds));
  res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please wait a minute and try again.' });
  return false;
}
