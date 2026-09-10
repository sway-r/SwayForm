import { requireMethod } from '../_lib/session.js';
import { requireBridgeSecret } from '../_lib/bridge.js';
import { sql } from '../_lib/db.js';

const MAX_OUTPUT_CHARS = 64 * 1024;

/**
 * Called by the bridge server as it relays a job's lifecycle from the Pi's
 * agent: started (job.accepted) -> zero or more output chunks (job.output)
 * -> finished (job.exit). Never called directly by a browser.
 */
export default async function handler(req, res){
  if (!requireMethod(req, res, 'POST')) return;
  if (!requireBridgeSecret(req, res)) return;

  const { jobId, phase } = req.body || {};
  if (!jobId || !phase){
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  if (phase === 'started'){
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
    return;
  }

  if (phase === 'output'){
    const chunk = String(req.body.text || '');
    await sql`
      UPDATE robot_jobs
      SET output = right(COALESCE(output, '') || ${chunk}, ${MAX_OUTPUT_CHARS})
      WHERE id = ${jobId} AND status = 'running'
    `;
    res.status(200).json({ ok: true });
    return;
  }

  if (phase === 'finished'){
    const exitCode = Number.isInteger(req.body.exitCode) ? req.body.exitCode : null;
    const status = exitCode === 0 ? 'succeeded' : 'failed';
    await sql`
      UPDATE robot_jobs SET status = ${status}, exit_code = ${exitCode}, finished_at = now()
      WHERE id = ${jobId} AND status = 'running'
    `;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ error: 'unknown_phase' });
}
