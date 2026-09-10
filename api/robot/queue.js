import { createHash } from 'node:crypto';
import { readSessionFromRequest } from '../_lib/session.js';
import { sql } from '../_lib/db.js';
import { requireCurrentRobotMember } from '../_lib/authz.js';
import { validateAgainstCanonicalSource, packageAndEntry } from '../_lib/canonical-source.js';

const SUBMIT_COOLDOWN_MS = 15_000;
const MAX_CODE_BYTES = 64 * 1024;

function sha256(text){
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

const CSV_COLUMNS = [
  ['id', (r) => r.id],
  ['submitted_at', (r) => r.submitted_at.toISOString()],
  ['student_email', (r) => r.student_email],
  ['package', (r) => r.package],
  ['executable', (r) => r.executable],
  ['workspace_path', (r) => r.workspace_path],
  ['status', (r) => r.status],
  ['decided_by', (r) => r.decided_by || ''],
  ['decided_at', (r) => (r.decided_at ? r.decided_at.toISOString() : '')],
  ['started_at', (r) => (r.started_at ? r.started_at.toISOString() : '')],
  ['finished_at', (r) => (r.finished_at ? r.finished_at.toISOString() : '')],
  ['exit_code', (r) => (r.exit_code === null ? '' : r.exit_code)],
  ['reject_reason', (r) => r.reject_reason || ''],
];

function csvEscape(value){
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Deliberately excludes `code`/`output` — those can be large multi-line
// blobs and this export is for grading/record-keeping (who ran what,
// when, with what result), not a full audit dump. The full code/output is
// still visible per-job in the Admin app itself.
function jobsToCsv(rows){
  const header = CSV_COLUMNS.map(([name]) => name).join(',');
  const lines = rows.map((row) => CSV_COLUMNS.map(([, get]) => csvEscape(get(row))).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}

function jobView(row){
  return {
    id: row.id,
    studentEmail: row.student_email,
    workspacePath: row.workspace_path,
    package: row.package,
    executable: row.executable,
    code: row.code,
    status: row.status,
    queuePosition: row.queue_position,
    decidedBy: row.decided_by,
    rejectReason: row.reject_reason,
    exitCode: row.exit_code,
    output: row.output,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export default async function handler(req, res){
  const session = await readSessionFromRequest(req);
  const member = await requireCurrentRobotMember(session);
  if (!member){
    res.status(401).json({ error: 'not_authorized' });
    return;
  }
  const robotId = member.robotId;
  // The CURRENT database role, not session.mode — the JWT cookie can be up
  // to 7 days stale, so a removed/demoted admin must not keep approve/
  // reject/reorder rights just because their cookie hasn't expired yet.
  const isAdmin = member.role === 'admin';

  if (req.method === 'GET'){
    if (req.query.format === 'csv'){
      if (!isAdmin){ res.status(403).json({ error: 'admin_only' }); return; }
      // No LIMIT here (unlike the live-view query below) — this is the
      // full historical record for grading, not "what needs my attention
      // right now", so it should include everything, not just the last 50.
      const rows = await sql`SELECT * FROM robot_jobs WHERE robot_id = ${robotId} ORDER BY submitted_at ASC`;
      const filename = `robot-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(jobsToCsv(rows));
      return;
    }

    const rows = isAdmin
      ? await sql`SELECT * FROM robot_jobs WHERE robot_id = ${robotId} ORDER BY submitted_at DESC LIMIT 50`
      : await sql`SELECT * FROM robot_jobs WHERE robot_id = ${robotId} AND student_email = ${session.email} ORDER BY submitted_at DESC LIMIT 50`;
    res.status(200).json({ jobs: rows.map(jobView) });
    return;
  }

  if (req.method !== 'POST'){
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = req.body || {};

  switch (body.action){
    case 'validate': {
      const path = String(body.path || '');
      const code = String(body.code || '');
      const result = validateAgainstCanonicalSource(path, code);
      res.status(200).json(result);
      return;
    }

    case 'submit': {
      const path = String(body.path || '');
      const code = String(body.code || '');
      if (!path || !code){ res.status(400).json({ error: 'missing_fields' }); return; }
      if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES){ res.status(400).json({ error: 'code_too_large' }); return; }

      const check = validateAgainstCanonicalSource(path, code);
      if (!check.valid){ res.status(400).json({ error: 'code_mismatch', reason: check.reason }); return; }

      const [last] = await sql`
        SELECT submitted_at FROM robot_jobs
        WHERE robot_id = ${robotId} AND student_email = ${session.email}
        ORDER BY submitted_at DESC LIMIT 1
      `;
      if (last){
        const elapsedMs = Date.now() - new Date(last.submitted_at).getTime();
        if (elapsedMs < SUBMIT_COOLDOWN_MS){
          res.status(400).json({ error: 'cooldown', retryAfterMs: SUBMIT_COOLDOWN_MS - elapsedMs });
          return;
        }
      }

      const { pkg, file } = packageAndEntry(path);
      const [posRow] = await sql`
        SELECT COALESCE(MAX(queue_position), 0) + 1 AS next_position
        FROM robot_jobs WHERE robot_id = ${robotId} AND status = 'pending'
      `;
      const inserted = await sql`
        INSERT INTO robot_jobs (robot_id, student_email, workspace_path, package, executable, code, code_sha256, queue_position)
        VALUES (${robotId}, ${session.email}, ${path}, ${pkg}, ${file}, ${code}, ${sha256(code)}, ${posRow.next_position})
        RETURNING id, queue_position
      `;
      res.status(200).json({ ok: true, jobId: inserted[0].id, queuePosition: inserted[0].queue_position });
      return;
    }

    case 'approve': {
      if (!isAdmin){ res.status(403).json({ error: 'admin_only' }); return; }
      const jobId = Number(body.jobId);
      if (!jobId){ res.status(400).json({ error: 'missing_job_id' }); return; }
      const updated = await sql`
        UPDATE robot_jobs SET status = 'approved', decided_by = ${session.email}, decided_at = now()
        WHERE id = ${jobId} AND robot_id = ${robotId} AND status = 'pending'
        RETURNING id
      `;
      if (!updated.length){ res.status(400).json({ error: 'not_pending' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    case 'reject': {
      if (!isAdmin){ res.status(403).json({ error: 'admin_only' }); return; }
      const jobId = Number(body.jobId);
      if (!jobId){ res.status(400).json({ error: 'missing_job_id' }); return; }
      const reason = body.reason ? String(body.reason).slice(0, 500) : null;
      const updated = await sql`
        UPDATE robot_jobs SET status = 'rejected', decided_by = ${session.email}, decided_at = now(), reject_reason = ${reason}
        WHERE id = ${jobId} AND robot_id = ${robotId} AND status = 'pending'
        RETURNING id
      `;
      if (!updated.length){ res.status(400).json({ error: 'not_pending' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    case 'cancel': {
      const jobId = Number(body.jobId);
      if (!jobId){ res.status(400).json({ error: 'missing_job_id' }); return; }
      // Not using neon's sql tag for the conditional clause — its template
      // function doesn't support composing sub-fragments the way some other
      // SQL-template libraries do, so this is two explicit query shapes
      // rather than one query built from parts.
      //
      // Admins can also force-cancel a 'running' job — the only way to
      // clear one stuck there (agent crashed/disconnected mid-run without
      // ever reporting job.exit) since the one-job-at-a-time DB constraint
      // would otherwise block every future job on this robot forever.
      // Students cannot touch a running job — only their own pending/
      // approved submissions.
      const updated = isAdmin
        ? await sql`
            UPDATE robot_jobs SET status = 'cancelled', decided_by = ${session.email}, decided_at = now(), finished_at = now()
            WHERE id = ${jobId} AND robot_id = ${robotId} AND status IN ('pending', 'approved', 'running')
            RETURNING id
          `
        : await sql`
            UPDATE robot_jobs SET status = 'cancelled', decided_by = ${session.email}, decided_at = now()
            WHERE id = ${jobId} AND robot_id = ${robotId} AND status IN ('pending', 'approved') AND student_email = ${session.email}
            RETURNING id
          `;
      if (!updated.length){ res.status(400).json({ error: 'not_cancellable' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    case 'reorder': {
      if (!isAdmin){ res.status(403).json({ error: 'admin_only' }); return; }
      const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map(Number).filter(Boolean) : [];
      if (!orderedIds.length){ res.status(400).json({ error: 'missing_ordered_ids' }); return; }
      // One UPDATE per id, all pending-only and scoped to this robot — small
      // queue sizes at this scale, matches how the admin panel already
      // accepts a full re-fetch/re-render rather than optimizing this path.
      for (let i = 0; i < orderedIds.length; i++){
        await sql`
          UPDATE robot_jobs SET queue_position = ${i + 1}
          WHERE id = ${orderedIds[i]} AND robot_id = ${robotId} AND status = 'pending'
        `;
      }
      res.status(200).json({ ok: true });
      return;
    }

    case 'clear_history': {
      if (!isAdmin){ res.status(403).json({ error: 'admin_only' }); return; }
      // Only ever touches terminal statuses — pending/approved/running jobs
      // are never in reach of this, regardless of what the client sends.
      const deleted = await sql`
        DELETE FROM robot_jobs
        WHERE robot_id = ${robotId} AND status IN ('succeeded', 'failed', 'rejected', 'cancelled')
        RETURNING id
      `;
      res.status(200).json({ ok: true, deletedCount: deleted.length });
      return;
    }

    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}
