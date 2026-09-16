import { privateResponse, requireBrowserMutation } from '../_lib/browser-security.js';
import { SignJWT } from 'jose';
import { readSessionFromRequest } from '../_lib/session.js';
import { requireCurrentRobotMember } from '../_lib/authz.js';
import { sql } from '../_lib/db.js';
import { callBridge } from '../_lib/bridge.js';

const VIEWER_TOKEN_TTL_SECONDS = 120;

function bridgeSecretKey(){
  const secret = process.env.BRIDGE_SERVICE_SECRET;
  if (!secret) throw new Error('BRIDGE_SERVICE_SECRET is not set');
  return new TextEncoder().encode(secret);
}

/**
 * GET: polled by the portal's Robot app Status tab — reads whatever the
 * bridge last wrote via api/robot/agent.js's heartbeat action.
 *
 * POST {action:'start'|'stop'}: on-demand video, not an always-on relay —
 * the Pi used to encode around the clock regardless of viewers, which is
 * the whole bandwidth cost this replaces. 'start' relays to the bridge
 * (best-effort — see callBridge below) so it can ping the connected agent
 * to begin encoding, then mints a short-lived viewer JWT for the Live Video
 * tab's WHEP connection. Signed with BRIDGE_SERVICE_SECRET (already shared
 * between Vercel and the bridge VPS for the opposite direction —
 * bridge-to-api calls) so the bridge's /mediamtx-auth webhook can verify it
 * locally, with no Vercel round-trip per viewer join. 'stop' relays a
 * matching stop request and returns no token. Any current robot member
 * (admin or student) can call this — video is visible to everyone linked to
 * the robot, not admin-only.
 */
export default async function handler(req, res){
  privateResponse(res);
  if (req.method === 'POST' && !requireBrowserMutation(req, res)) return;
  const session = await readSessionFromRequest(req);
  const member = await requireCurrentRobotMember(session);
  if (!member){
    res.status(401).json({ error: 'not_authorized' });
    return;
  }
  const robotId = member.robotId;

  const rows = await sql`
    SELECT serial_number, is_online, last_seen_at, agent_version
    FROM robots WHERE id = ${robotId}
  `;
  if (!rows.length){
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const r = rows[0];

  if (req.method === 'POST'){
    const action = req.body && req.body.action === 'stop' ? 'stop' : 'start';
    // Best-effort: a bridge hiccup here must never block the viewer JWT
    // below — worst case the Pi doesn't get the memo to start encoding and
    // the WHEP connection just fails to find a path (viewer sees "offline"),
    // same as if the bridge were unreachable before this feature existed.
    try { await callBridge('/video-request', { robotId, action }); } catch (e) { /* best-effort */ }

    if (action === 'stop'){ res.status(200).json({ ok: true }); return; }

    const token = await new SignJWT({ robotId, serial: r.serial_number, purpose: 'video-viewer' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${VIEWER_TOKEN_TTL_SECONDS}s`)
      .sign(bridgeSecretKey());
    res.status(200).json({ token, serial: r.serial_number, expiresInSeconds: VIEWER_TOKEN_TTL_SECONDS });
    return;
  }

  if (req.method !== 'GET'){
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  res.status(200).json({
    robotSerial: r.serial_number,
    online: !!r.is_online && Date.now() - new Date(r.last_seen_at).getTime() < 30_000,
    lastSeenAt: r.last_seen_at,
    agentVersion: r.agent_version,
  });
}
