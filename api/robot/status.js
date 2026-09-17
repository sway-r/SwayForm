import { privateResponse, requireBrowserMutation } from '../_lib/browser-security.js';
import { SignJWT } from 'jose';
import { readSessionFromRequest } from '../_lib/session.js';
import { requireCurrentRobotMember } from '../_lib/authz.js';
import { sql } from '../_lib/db.js';
import { callBridge } from '../_lib/bridge.js';
import { ROBOT_ONLINE_CUTOFF_MS } from '../_lib/limits.js';
import { logDbRead, approxBytes } from '../_lib/metrics.js';

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
 *
 * POST {action:'idle-on'|'idle-off'}: admin-only "Live Robot Session"
 * toggle — loops idle.py on the physical robot so it looks alive between
 * real jobs. 'idle-on' is refused (409) if any job is pending/approved/
 * running for this robot, so idle can never start into a race with a job
 * about to be dispatched. Persisted in robots.idle_session_enabled (the
 * admin's intent, not a live status report) and reset to false server-side
 * by api/robot/queue.js's approve action the moment a job is approved —
 * see db/migrations/008_robot_idle_session.sql.
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

  const started = Date.now();
  const rows = await sql`
    SELECT serial_number, is_online, last_seen_at, agent_version, idle_session_enabled
    FROM robots WHERE id = ${robotId}
  `;
  if (req.method === 'GET') logDbRead({ view: 'status', role: member.role, rows: rows.length, dbBytes: approxBytes(rows), ms: Date.now() - started });
  if (!rows.length){
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const r = rows[0];

  if (req.method === 'POST' && (req.body?.action === 'idle-on' || req.body?.action === 'idle-off')){
    if (member.role !== 'admin'){ res.status(403).json({ error: 'not_authorized' }); return; }
    const enable = req.body.action === 'idle-on';

    if (enable){
      const [openJob] = await sql`
        SELECT id FROM robot_jobs
        WHERE robot_id = ${robotId} AND status IN ('pending', 'approved', 'running')
        LIMIT 1
      `;
      if (openJob){ res.status(409).json({ error: 'job_in_progress' }); return; }
    }

    await sql`UPDATE robots SET idle_session_enabled = ${enable} WHERE id = ${robotId}`;
    try { await callBridge('/idle-request', { robotId, action: enable ? 'start' : 'stop' }); } catch (e) { /* best-effort */ }
    res.status(200).json({ ok: true, idleSessionEnabled: enable });
    return;
  }

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
    online: !!r.is_online && Date.now() - new Date(r.last_seen_at).getTime() < ROBOT_ONLINE_CUTOFF_MS,
    lastSeenAt: r.last_seen_at,
    agentVersion: r.agent_version,
    idleSessionEnabled: r.idle_session_enabled,
  });
}
