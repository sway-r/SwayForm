import { createHash } from 'node:crypto';
import { requireMethod } from '../_lib/session.js';
import { requireBridgeSecret } from '../_lib/bridge.js';
import { sql } from '../_lib/db.js';

const MAX_OUTPUT_CHARS = 64 * 1024;

/**
 * All machine-to-machine endpoints the bridge server calls — never a
 * browser. Consolidated into one function (was 4 separate files:
 * agent-auth, heartbeat, job-update, dispatch-queue) because Vercel's
 * Hobby plan caps Serverless Functions at 12 per deployment and this repo
 * was about to exceed it (14), which fails the deployment silently at the
 * "Deploying outputs" stage with no clear error in the CLI logs — the
 * build itself reports success, only the platform-level function-count
 * check fails afterward. Routed by `action` (POST body) or `?action=`
 * (GET query) rather than by path.
 */
export default async function handler(req, res){
  if (!requireBridgeSecret(req, res)) return;

  if (req.method === 'GET'){
    if (req.query.action === 'dispatch-queue') return handleDispatchQueue(req, res);
    res.status(400).json({ error: 'unknown_action' });
    return;
  }

  if (!requireMethod(req, res, 'POST')) return;

  switch ((req.body || {}).action){
    case 'auth': return handleAuth(req, res);
    case 'heartbeat': return handleHeartbeat(req, res);
    case 'job-started': return handleJobStarted(req, res);
    case 'job-output': return handleJobOutput(req, res);
    case 'job-finished': return handleJobFinished(req, res);
    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}

// ── auth ─────────────────────────────────────────────────────────────────
async function handleAuth(req, res){
  const { token, serial } = req.body || {};
  if (!token || !serial){
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const rows = await sql`
    SELECT id, serial_number FROM robots
    WHERE serial_number = ${serial} AND agent_token_hash = ${tokenHash}
  `;
  if (!rows.length){
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  res.status(200).json({ robotId: rows[0].id, robotSerial: rows[0].serial_number });
}

// ── heartbeat ────────────────────────────────────────────────────────────
async function handleHeartbeat(req, res){
  const { robotId, online, agentVersion } = req.body || {};
  if (!robotId){
    res.status(400).json({ error: 'missing_robot_id' });
    return;
  }

  await sql`
    UPDATE robots
    SET is_online = ${!!online}, last_seen_at = now(), agent_version = ${agentVersion || null}
    WHERE id = ${robotId}
  `;
  res.status(200).json({ ok: true });
}

// ── job lifecycle ───────────────────────────────────────────────────────
async function handleJobStarted(req, res){
  const { jobId } = req.body || {};
  if (!jobId){
    res.status(400).json({ error: 'missing_job_id' });
    return;
  }
  // The partial unique index on (robot_id) WHERE status='running' makes
  // "only one job moves the robot at a time" a database guarantee — a
  // second concurrent 'started' for the same robot fails here with 23505.
  try {
    const updated = await sql`
      UPDATE robot_jobs SET status = 'running', started_at = now()
      WHERE id = ${jobId} AND status = 'approved'
      RETURNING id
    `;
    if (!updated.length){ res.status(400).json({ error: 'not_approved' }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    if (e && e.code === '23505'){ res.status(409).json({ error: 'robot_busy' }); return; }
    throw e;
  }
}

async function handleJobOutput(req, res){
  const { jobId, text } = req.body || {};
  if (!jobId){
    res.status(400).json({ error: 'missing_job_id' });
    return;
  }
  await sql`
    UPDATE robot_jobs
    SET output = right(COALESCE(output, '') || ${String(text || '')}, ${MAX_OUTPUT_CHARS})
    WHERE id = ${jobId} AND status = 'running'
  `;
  res.status(200).json({ ok: true });
}

async function handleJobFinished(req, res){
  const { jobId, exitCode } = req.body || {};
  if (!jobId){
    res.status(400).json({ error: 'missing_job_id' });
    return;
  }
  const code = Number.isInteger(exitCode) ? exitCode : null;
  const status = code === 0 ? 'succeeded' : 'failed';
  await sql`
    UPDATE robot_jobs SET status = ${status}, exit_code = ${code}, finished_at = now()
    WHERE id = ${jobId} AND status = 'running'
  `;
  res.status(200).json({ ok: true });
}

// ── dispatch queue (GET) ────────────────────────────────────────────────
async function handleDispatchQueue(req, res){
  const robotId = Number(req.query.robotId);
  if (!robotId){
    res.status(400).json({ error: 'missing_robot_id' });
    return;
  }

  const rows = await sql`
    SELECT id, workspace_path, package, executable, code, code_sha256
    FROM robot_jobs
    WHERE robot_id = ${robotId} AND status = 'approved'
    ORDER BY decided_at ASC
  `;

  res.status(200).json({
    jobs: rows.map((r) => ({
      jobId: r.id,
      path: r.workspace_path,
      package: r.package,
      executable: r.executable,
      code: r.code,
      sha256: r.code_sha256,
    })),
  });
}
