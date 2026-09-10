import { sql } from '../_lib/db.js';

// Enforces the retention promise made on /data-retention: terminal "Run on
// Robot" submissions (succeeded/failed/rejected/cancelled) are deleted 90
// days after they reach that terminal state. Pending/approved/running jobs
// are never touched here — only a terminal one has a "reached final state"
// timestamp to measure from.
//
// Triggered on a schedule by Vercel Cron (see vercel.json's "crons" entry).
// Vercel signs cron-triggered requests with `Authorization: Bearer
// $CRON_SECRET` when that env var is set — set CRON_SECRET in the Vercel
// project settings, or this endpoint refuses every request, including the
// real cron's.
export default async function handler(req, res){
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  if (!expected || authHeader !== `Bearer ${expected}`){
    res.status(401).json({ error: 'not_authorized' });
    return;
  }

  const deleted = await sql`
    DELETE FROM robot_jobs
    WHERE status IN ('succeeded', 'failed', 'rejected', 'cancelled')
      AND COALESCE(finished_at, decided_at, submitted_at) < now() - interval '90 days'
    RETURNING id
  `;

  res.status(200).json({ deletedCount: deleted.length });
}
