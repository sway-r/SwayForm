import { requireMethod } from '../_lib/session.js';
import { requireBridgeSecret } from '../_lib/bridge.js';
import { sql } from '../_lib/db.js';

/**
 * Polled by the bridge (never a browser) while a robot's agent is connected,
 * to find approved-but-not-yet-dispatched jobs. The bridge tracks which
 * jobIds it has already sent as job.run in memory, so this just returns
 * everything currently 'approved' — including ones already sent, in case
 * the bridge restarted and lost its in-memory dispatch record.
 */
export default async function handler(req, res){
  if (!requireMethod(req, res, 'GET')) return;
  if (!requireBridgeSecret(req, res)) return;

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
