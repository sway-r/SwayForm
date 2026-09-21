import { privateResponse, requireBrowserMutation } from '../_lib/browser-security.js';
import { SignJWT } from 'jose';
import { readSessionFromRequest } from '../_lib/session.js';
import { requireCurrentRobotMember } from '../_lib/authz.js';
import { sql } from '../_lib/db.js';
import { callBridge } from '../_lib/bridge.js';
import { ROBOT_ONLINE_CUTOFF_MS } from '../_lib/limits.js';
import { logDbRead, approxBytes } from '../_lib/metrics.js';

import { isInteractiveRobotPath } from '../../portal/apps/learn/workspace/ros-paths.js';

const VIEWER_TOKEN_TTL_SECONDS = 120;
const TELEOP_TOKEN_TTL_SECONDS = 60; // only has to survive the WebSocket handshake

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
 * toggle — holds the physical robot still in its safe rest pose between
 * real jobs (agents before 0.6.0 looped idle.py's gestures here). 'idle-on' is refused (409) if any job is pending/approved/
 * running for this robot, so idle can never start into a race with a job
 * about to be dispatched, and (502) if the robot couldn't be told to start,
 * so "on" never shows for a session that isn't running. 'idle-off' reports
 * `delivered` so the UI can say when the stop didn't reach the robot, and
 * also relays job.stop for any job stuck 'running' (its own job.exit never
 * arrived) so "off" stops everything holding the robot, not just the idle
 * loop — reported as `stoppedJobId`.
 * Persisted in robots.idle_session_enabled (the
 * admin's intent, not a live status report) and reset to false server-side
 * by api/robot/queue.js's approve action the moment a job is approved —
 * see db/migrations/008_robot_idle_session.sql.
 *
 * POST {action:'movement-on'|'movement-off'}: admin-only "Movement" toggle.
 * Since agent 0.6.0 the session only holds the safe rest pose; the ambient
 * gestures run only while Movement is on. 'movement-on' is refused (409
 * session_off) unless the session is on, and (502) unless the robot itself
 * confirmed it, so an older agent or a robot whose session is really off
 * never shows "on". Turning the session off turns Movement off with it.
 * Persisted in robots.movement_enabled; see db/migrations/009_robot_movement.sql.
 *
 * Approving a job pauses both and remembers them (resume_session /
 * resume_movement); the bridge puts them back when the last approved job
 * ends. Turning either off here clears that memory too.
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
    SELECT serial_number, is_online, last_seen_at, agent_version, idle_session_enabled, movement_enabled, resume_session, resume_movement
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
      // Same robot-row lock as submit, so the open-job check and the flag flip can't straddle one.
      const [, turnedOn] = await sql.transaction([
        sql`SELECT id FROM robots WHERE id = ${robotId} FOR UPDATE`,
        sql`
          UPDATE robots SET idle_session_enabled = true, movement_enabled = false, resume_session = false, resume_movement = false
          WHERE id = ${robotId} AND NOT EXISTS (
            SELECT 1 FROM robot_jobs WHERE robot_id = ${robotId} AND status IN ('pending', 'approved', 'running')
          )
          RETURNING id
        `,
      ]);
      if (!turnedOn.length){ res.status(409).json({ error: 'job_in_progress' }); return; }

      let relay = null;
      try { relay = await callBridge('/idle-request', { robotId, action: 'start' }); } catch (e) { /* handled below */ }
      if (!relay || !relay.delivered){
        // "On" must mean the robot was actually told; otherwise the toggle lies.
        await sql`UPDATE robots SET idle_session_enabled = false, movement_enabled = false WHERE id = ${robotId}`;
        if (relay && relay.reason === 'job_running'){ res.status(409).json({ error: 'job_in_progress' }); return; }
        res.status(502).json({ error: 'robot_unreachable', message: "Couldn't reach the robot to start the live session. Check that it's online." });
        return;
      }
      res.status(200).json({ ok: true, idleSessionEnabled: true, movementEnabled: false });
      return;
    }

    // One statement: Movement never outlives the session (the robot drops it on idle.stop too).
    // Off by hand also means "don't bring it back after the running job".
    await sql`UPDATE robots SET idle_session_enabled = false, movement_enabled = false, resume_session = false, resume_movement = false WHERE id = ${robotId}`;
    // idle.stop does nothing for a dispatched job, so one still running (its exit never arrived) gets its own stop.
    // That never ends the row: only the robot's report or a reconcile does.
    const [stuckJob] = await sql`SELECT id FROM robot_jobs WHERE robot_id = ${robotId} AND status = 'running'`;
    const stoppedJobId = stuckJob ? stuckJob.id : null;
    let delivered = false;
    // straighten: off by hand also centers the robot, unless a job may still be moving it. Approve's stop never asks for it.
    try { delivered = !!(await callBridge('/idle-request', { robotId, action: 'stop', straighten: !stuckJob })).delivered; } catch (e) { /* reported as undelivered */ }
    if (stuckJob){
      try { await callBridge('/admin-stop', { robotId, jobId: stuckJob.id }); } catch (e) { /* best-effort */ }
    }

    res.status(200).json({ ok: true, idleSessionEnabled: false, movementEnabled: false, delivered, stoppedJobId });
    return;
  }

  if (req.method === 'POST' && (req.body?.action === 'movement-on' || req.body?.action === 'movement-off')){
    if (member.role !== 'admin'){ res.status(403).json({ error: 'not_authorized' }); return; }

    if (req.body.action === 'movement-on'){
      // The session check and the flag flip are one statement, so a concurrent idle-off cannot slip between them.
      const turnedOn = await sql`
        UPDATE robots SET movement_enabled = true
        WHERE id = ${robotId} AND idle_session_enabled = true
        RETURNING id
      `;
      if (!turnedOn.length){
        res.status(409).json({ error: 'session_off', message: 'Turn Live Robot Session on first.' });
        return;
      }

      let relay = null;
      try { relay = await callBridge('/movement-request', { robotId, action: 'start' }); } catch (e) { /* handled below */ }
      if (!relay || !relay.delivered || relay.movement !== true){
        // "On" must mean the robot itself said so; anything less is put back.
        await sql`UPDATE robots SET movement_enabled = false WHERE id = ${robotId}`;
        if (relay && relay.reason === 'session_off'){
          // The robot's session is really off (a job ran, or the agent restarted): the saved intent was stale.
          await sql`UPDATE robots SET idle_session_enabled = false WHERE id = ${robotId}`;
          res.status(409).json({ error: 'session_off', message: 'The robot reports Live Robot Session is off. Turn it on again first.', idleSessionEnabled: false });
          return;
        }
        if (relay && relay.reason === 'job_running'){ res.status(409).json({ error: 'job_in_progress' }); return; }
        const message = relay && relay.reason === 'no_reply'
          ? "The robot didn't confirm Movement. Its software may need updating (agent 0.6.0 or newer)."
          : "Couldn't reach the robot to start Movement. Check that it's online.";
        res.status(502).json({ error: 'robot_unreachable', message });
        return;
      }
      res.status(200).json({ ok: true, idleSessionEnabled: true, movementEnabled: true });
      return;
    }

    await sql`UPDATE robots SET movement_enabled = false, resume_movement = false WHERE id = ${robotId}`;
    let delivered = false;
    try { delivered = !!(await callBridge('/movement-request', { robotId, action: 'stop' })).delivered; } catch (e) { /* reported as undelivered */ }
    res.status(200).json({ ok: true, idleSessionEnabled: r.idle_session_enabled, movementEnabled: false, delivered });
    return;
  }

  // Only the running interactive job's own submitter (or an admin) may drive it.
  if (req.method === 'POST' && req.body?.action === 'teleop-token'){
    const jobs = await sql`
      SELECT id, student_email, workspace_path FROM robot_jobs
      WHERE robot_id = ${robotId} AND status = 'running' LIMIT 1
    `;
    const job = jobs[0];
    if (!job || !isInteractiveRobotPath(job.workspace_path)){ res.status(409).json({ error: 'no_interactive_job' }); return; }
    if (member.role !== 'admin' && job.student_email !== session.email){ res.status(403).json({ error: 'not_authorized' }); return; }

    // watch: a read-only view (an admin looking over a student's shoulder); the bridge never reads its input.
    const token = await new SignJWT({ robotId, jobId: job.id, purpose: req.body.watch === true ? 'teleop-watch' : 'teleop' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${TELEOP_TOKEN_TTL_SECONDS}s`)
      .sign(bridgeSecretKey());
    res.status(200).json({ token, jobId: job.id });
    return;
  }

  if (req.method === 'POST'){
    const action = req.body && req.body.action === 'stop' ? 'stop' : 'start';
    const rawViewerId = req.body && req.body.viewerId;
    const viewerId = typeof rawViewerId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(rawViewerId) ? rawViewerId : undefined;
    // Best-effort: a bridge hiccup here must never block the viewer JWT
    // below — worst case the Pi doesn't get the memo to start encoding and
    // the WHEP connection just fails to find a path (viewer sees "offline"),
    // same as if the bridge were unreachable before this feature existed.
    try { await callBridge('/video-request', { robotId, action, viewerId }); } catch (e) { /* best-effort */ }

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
    movementEnabled: r.idle_session_enabled && r.movement_enabled,
    // Paused for a job and due back when it ends; see db/migrations/010_robot_session_resume.sql.
    resumeSession: !r.idle_session_enabled && r.resume_session,
    resumeMovement: !r.idle_session_enabled && r.resume_session && r.resume_movement,
  });
}
