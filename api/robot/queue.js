import { privateResponse, requireBrowserMutation, rateLimit } from '../_lib/browser-security.js';
import { createHash } from 'node:crypto';
import { readSessionFromRequest } from '../_lib/session.js';
import { sql } from '../_lib/db.js';
import { requireCurrentRobotMember } from '../_lib/authz.js';
import { validateAgainstCanonicalSource, packageAndEntry } from '../_lib/canonical-source.js';
import { callBridge } from '../_lib/bridge.js';
import { logDbRead, approxBytes } from '../_lib/metrics.js';

const SUBMIT_COOLDOWN_MS = 15_000;
const DISPATCH_NOTIFY_TIMEOUT_MS = 3_000;

/**
 * Tells the bridge "this robot's dispatch queue may have work now", so it
 * checks immediately instead of polling Neon every 4 seconds around the clock
 * waiting for this moment.
 *
 * This carries no job and grants nothing: the bridge reacts by calling the
 * same atomic claim in api/robot/agent.js it always has, which is still the
 * only place a job can move to 'running'. A lost, duplicated, or even forged
 * notification can therefore only cause one extra (idempotent) claim attempt,
 * never a second dispatch. If it doesn't arrive, the bridge's once-a-minute
 * presence write reports the waiting job and dispatch happens then — logged
 * here rather than swallowed so a bridge that's unreachable shows up.
 */
async function notifyDispatch(robotId, reason){
  try {
    const result = await callBridge('/dispatch-notify', { robotId }, DISPATCH_NOTIFY_TIMEOUT_MS);
    return !!(result && result.delivered);
  } catch (e) {
    console.warn(JSON.stringify({ evt: 'dispatch_notify_failed', robotId, reason, error: String(e && e.message || e) }));
    return false;
  }
}
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
  let s = String(value);
  if (/^[=+@\-\t\r\n]/.test(s)) s = "'" + s;
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

// How many finished jobs the live list carries. The Admin app only ever
// renders this many ("Recent history"); the full record is the CSV export.
const RECENT_TERMINAL_LIMIT = 15;

// Everything a list row or status line needs, and nothing large: `code` and
// `output` are deliberately absent. They're multi-KB blobs, and returning
// them for every job on every poll (three separate pollers used to) is what
// exhausted the Neon transfer allowance. They're served one job at a time by
// the job view below, only when something actually asks for them.
function jobSummary(row){
  return {
    id: row.id,
    studentEmail: row.student_email,
    workspacePath: row.workspace_path,
    package: row.package,
    executable: row.executable,
    status: row.status,
    queuePosition: row.queue_position,
    decidedBy: row.decided_by,
    rejectReason: row.reject_reason,
    exitCode: row.exit_code,
    // A running total of characters ever appended, independent of output's
    // own length (which is a truncated rolling tail) — the client needs
    // this to detect new output once a job has produced more than the
    // retained cap. See db/migrations/006_robot_job_output_counter.sql.
    outputTotalLen: row.output_total_len,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

// ?view=pulse — admin-only, one tiny row. Drives the desktop badge
// (pendingCount) and tells an open Admin app whether the list is worth
// re-fetching (version). `version` hashes exactly the fields that can change
// on the rows the list shows — id, status, queue position, output length —
// so any submit/approve/reorder/output/clear-history changes it, and an idle
// queue costs ~100 bytes per poll instead of the whole list.
async function handlePulse(res, robotId, isAdmin, started){
  if (!isAdmin){ res.status(403).json({ error: 'admin_only' }); return; }
  const rows = await sql`
    SELECT
      (SELECT count(*) FROM robot_jobs WHERE robot_id = ${robotId} AND status = 'pending')::int AS pending_count,
      (SELECT count(*) FROM robot_jobs WHERE robot_id = ${robotId} AND status IN ('pending', 'approved', 'running'))::int AS open_count,
      (SELECT md5(COALESCE(string_agg(id || ':' || status || ':' || COALESCE(queue_position, 0) || ':' || output_total_len, ',' ORDER BY id), ''))
        FROM (
          (SELECT id, status, queue_position, output_total_len FROM robot_jobs
            WHERE robot_id = ${robotId} AND status IN ('pending', 'approved', 'running'))
          UNION ALL
          (SELECT id, status, queue_position, output_total_len FROM robot_jobs
            WHERE robot_id = ${robotId} AND status NOT IN ('pending', 'approved', 'running')
            ORDER BY submitted_at DESC LIMIT ${RECENT_TERMINAL_LIMIT})
        ) visible) AS version
  `;
  const row = rows[0];
  logDbRead({ view: 'pulse', role: 'admin', rows: 1, dbBytes: approxBytes(rows), ms: Date.now() - started });
  res.status(200).json({ pendingCount: row.pending_count, openCount: row.open_count, version: row.version });
}

// ?view=job&id=N[&sinceLen=M][&include=code] — one job, for the student's
// status watcher and the Admin app's on-demand code/output panel.
//
// Authorization never uses anything the client sent except the job id: the
// robot comes from the caller's current database membership, and a
// non-admin is additionally pinned to their own session email. Every miss —
// wrong robot, someone else's job, no such id — is the same 404, so the
// endpoint can't be used to probe which job ids exist elsewhere.
//
// sinceLen is the outputTotalLen the caller already has; only output written
// after that point is returned, so a watcher polling a long run doesn't
// re-download the whole retained tail every few seconds.
async function handleJobView(req, res, { robotId, isAdmin, email, started }){
  const jobId = Number(req.query.id);
  if (!Number.isSafeInteger(jobId) || jobId < 1){ res.status(400).json({ error: 'invalid_job_id' }); return; }
  const sinceLen = req.query.sinceLen === undefined ? 0 : Number(req.query.sinceLen);
  if (!Number.isSafeInteger(sinceLen) || sinceLen < 0){ res.status(400).json({ error: 'invalid_since_len' }); return; }
  const includeCode = req.query.include === 'code';

  // Two explicit shapes rather than one composed query — see the note on
  // neon's sql tag in the cancel action below. CASE is lazy, so `code` is
  // never even read from storage unless it was asked for.
  const rows = isAdmin
    ? await sql`
        SELECT id, student_email, workspace_path, package, executable, status, queue_position, decided_by,
               reject_reason, exit_code, output_total_len, submitted_at, decided_at, started_at, finished_at,
               CASE WHEN ${includeCode} THEN code END AS code,
               CASE WHEN output_total_len > ${sinceLen}
                 THEN right(COALESCE(output, ''), GREATEST(output_total_len - ${sinceLen}, 0)) ELSE '' END AS output_tail
        FROM robot_jobs WHERE id = ${jobId} AND robot_id = ${robotId}
      `
    : await sql`
        SELECT id, student_email, workspace_path, package, executable, status, queue_position, decided_by,
               reject_reason, exit_code, output_total_len, submitted_at, decided_at, started_at, finished_at,
               CASE WHEN ${includeCode} THEN code END AS code,
               CASE WHEN output_total_len > ${sinceLen}
                 THEN right(COALESCE(output, ''), GREATEST(output_total_len - ${sinceLen}, 0)) ELSE '' END AS output_tail
        FROM robot_jobs WHERE id = ${jobId} AND robot_id = ${robotId} AND student_email = ${email}
      `;
  logDbRead({ view: 'job', role: isAdmin ? 'admin' : 'student', rows: rows.length, dbBytes: approxBytes(rows), ms: Date.now() - started });
  if (!rows.length){ res.status(404).json({ error: 'not_found' }); return; }

  const row = rows[0];
  // output_total_len counts JS string units (see agent.js); SQL right()
  // counts code points, so it can only ever return slightly too much. Trim
  // to exactly the unseen part here. If less came back than was written,
  // the rest already rolled off the retained tail — say so, don't hide it.
  const unseen = Math.max(row.output_total_len - sinceLen, 0);
  const tail = row.output_tail || '';
  const job = {
    ...jobSummary(row),
    outputTail: unseen > 0 ? tail.slice(-unseen) : '',
    outputTruncated: unseen > tail.length,
  };
  if (includeCode) job.code = row.code;
  res.status(200).json({ job });
}

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

    const started = Date.now();
    if (req.query.view === 'pulse') return handlePulse(res, robotId, isAdmin, started);
    if (req.query.view === 'job') return handleJobView(req, res, { robotId, isAdmin, email: session.email, started });
    if (req.query.view !== undefined){ res.status(400).json({ error: 'unknown_view' }); return; }

    // The list itself: lightweight summaries only (see jobSummary).
    //  - Every non-terminal job (pending/approved/running) is always
    //    included, never subject to the LIMIT — a single
    //    `ORDER BY submitted_at DESC LIMIT n` could push an older pending
    //    or even the one running job (which holds the physical execution
    //    lock) out of the result entirely once enough newer jobs existed,
    //    silently hiding it (and its Stop/Reconcile controls) from the
    //    admin view. The LIMIT applies only to already-finished (terminal)
    //    jobs, which is the actual "recent history".
    //  - Pending jobs are ordered by queue_position, not submitted_at —
    //    reorder (the ↑/↓ controls) writes queue_position, but reading by
    //    submission time meant a reorder never visibly changed anything on
    //    refresh even though the robot's own dispatch order (which reads
    //    queue_position) had actually changed.
    //  - Columns are named, never `SELECT *`: that is what keeps `code` and
    //    `output` from leaving the database on a list read.
    const rows = isAdmin
      ? await sql`
          SELECT * FROM (
            (SELECT id, student_email, workspace_path, package, executable, status, queue_position, decided_by,
                    reject_reason, exit_code, output_total_len, submitted_at, decided_at, started_at, finished_at
              FROM robot_jobs WHERE robot_id = ${robotId} AND status IN ('pending', 'approved', 'running'))
            UNION ALL
            (SELECT id, student_email, workspace_path, package, executable, status, queue_position, decided_by,
                    reject_reason, exit_code, output_total_len, submitted_at, decided_at, started_at, finished_at
              FROM robot_jobs WHERE robot_id = ${robotId} AND status NOT IN ('pending', 'approved', 'running')
              ORDER BY submitted_at DESC LIMIT ${RECENT_TERMINAL_LIMIT})
          ) combined
          ORDER BY
            CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'running' THEN 2 ELSE 3 END,
            CASE WHEN status = 'pending' THEN queue_position END ASC,
            submitted_at DESC
        `
      : await sql`
          SELECT * FROM (
            (SELECT id, student_email, workspace_path, package, executable, status, queue_position, decided_by,
                    reject_reason, exit_code, output_total_len, submitted_at, decided_at, started_at, finished_at
              FROM robot_jobs WHERE robot_id = ${robotId} AND student_email = ${session.email} AND status IN ('pending', 'approved', 'running'))
            UNION ALL
            (SELECT id, student_email, workspace_path, package, executable, status, queue_position, decided_by,
                    reject_reason, exit_code, output_total_len, submitted_at, decided_at, started_at, finished_at
              FROM robot_jobs WHERE robot_id = ${robotId} AND student_email = ${session.email} AND status NOT IN ('pending', 'approved', 'running')
              ORDER BY submitted_at DESC LIMIT ${RECENT_TERMINAL_LIMIT})
          ) combined
          ORDER BY
            CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'running' THEN 2 ELSE 3 END,
            CASE WHEN status = 'pending' THEN queue_position END ASC,
            submitted_at DESC
        `;
    logDbRead({ view: 'list', role: isAdmin ? 'admin' : 'student', rows: rows.length, dbBytes: approxBytes(rows), ms: Date.now() - started });
    res.status(200).json({ jobs: rows.map(jobSummary) });
    return;
  }

  if (req.method !== 'POST'){
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = req.body || {};
  // 'validate' is read-only and fires on every Run click (Wave/Fist Bump's
  // Run flow calls it automatically) — sharing one 60/min bucket with the
  // mutating actions (submit/approve/reject/...) meant a student iterating
  // quickly could burn the whole class's submit budget just from clicking
  // Run, or hit a rate limit that then rendered as "no verified working
  // version of this file" client-side (no `status` field on a 429) instead
  // of a rate-limit message. Its own, higher-ceiling bucket fixes both.
  const limited = body.action === 'validate'
    ? !await rateLimit(res, 'robot-queue-validate', session.email, 120)
    : !await rateLimit(res, 'robot-queue', session.email, 60);
  if (limited) return;

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
      if (!check.valid){ res.status(400).json({ error: 'code_mismatch', reason: check.status }); return; }

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
      // A real job is about to be dispatched — the admin's "Live Robot
      // Session" (idle.py loop) must yield so it can never overlap with an
      // actual job on the physical robot. Turn off the DB intent and relay
      // best-effort; it does not auto-resume once the job finishes, the
      // admin re-enables it manually. See db/migrations/008_robot_idle_session.sql.
      const [wasIdle] = await sql`UPDATE robots SET idle_session_enabled = false WHERE id = ${robotId} AND idle_session_enabled = true RETURNING id`;
      if (wasIdle){
        try { await callBridge('/idle-request', { robotId, action: 'stop' }); } catch (e) { /* best-effort */ }
      }
      // After the idle stop, never before it: the bridge relays frames to
      // the agent in the order it receives them.
      const dispatchNotified = await notifyDispatch(robotId, 'approve');
      res.status(200).json({ ok: true, dispatchNotified });
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
      // A database cancellation does not stop physical motion. Only pending
      // and approved jobs may be cancelled; running jobs require verified
      // physical stop and support reconciliation before the queue is released.
      const updated = isAdmin
        ? await sql`
            UPDATE robot_jobs SET status = 'cancelled', decided_by = ${session.email}, decided_at = now(), finished_at = now()
            WHERE id = ${jobId} AND robot_id = ${robotId} AND status IN ('pending', 'approved')
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

    // Admin-only. Relays a stop request to whichever agent is currently
    // connected for this robot — it does NOT change the job's database
    // status itself (see the cancel case above: a browser action never
    // gets to unilaterally declare a running job stopped). Whether this
    // actually halts the robot depends on the Pi-side agent implementing
    // the job.stop frame; `delivered` only confirms the bridge reached a
    // connected agent, not that motion actually stopped. Only ever act on
    // that confirmation from the agent's own eventual job.exit/job.error.
    case 'stop': {
      if (!isAdmin){ res.status(403).json({ error: 'not_authorized' }); return; }
      const jobId = Number(body.jobId);
      if (!jobId){ res.status(400).json({ error: 'missing_job_id' }); return; }
      const [job] = await sql`SELECT id FROM robot_jobs WHERE id = ${jobId} AND robot_id = ${robotId} AND status = 'running'`;
      if (!job){ res.status(400).json({ error: 'not_running' }); return; }
      try {
        const result = await callBridge('/admin-stop', { robotId, jobId });
        res.status(200).json({ ok: true, delivered: !!result.delivered });
      } catch (e){
        res.status(502).json({ error: 'bridge_unreachable', message: "Couldn't reach the bridge to relay the stop signal." });
      }
      return;
    }

    // Admin-only, last resort. A running job with no connected agent (a
    // reconnect, a crash, a pulled plug) has no automatic path back to a
    // terminal status — cancel refuses 'running' rows on purpose (see
    // above), and stop only ever relays a signal, never touches the
    // database. Without this action such a row blocks every future job for
    // this robot forever (the one-running-job-at-a-time constraint). This
    // does NOT verify or claim anything about physical state — it exists
    // for exactly the case the docs already describe ("have the operator
    // reconcile that specific running record before restarting"), so an
    // admin must explicitly confirm they've physically checked the robot
    // first; the client-side confirmation dialog carries that requirement.
    case 'reconcile': {
      if (!isAdmin){ res.status(403).json({ error: 'admin_only' }); return; }
      const jobId = Number(body.jobId);
      if (!jobId){ res.status(400).json({ error: 'missing_job_id' }); return; }
      const outcome = body.outcome === 'succeeded' ? 'succeeded' : 'failed';
      const updated = await sql`
        UPDATE robot_jobs SET status = ${outcome}, decided_by = ${session.email}, finished_at = now()
        WHERE id = ${jobId} AND robot_id = ${robotId} AND status = 'running'
        RETURNING id
      `;
      if (!updated.length){ res.status(400).json({ error: 'not_running' }); return; }
      await sql`INSERT INTO portal_audit_events (robot_id, actor_email, action, subject_email)
        VALUES (${robotId}, ${session.email}, 'reconcile_job', NULL)`;
      // Releasing the execution lock can unblock an approved job that was
      // waiting behind the stuck one.
      await notifyDispatch(robotId, 'reconcile');
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
