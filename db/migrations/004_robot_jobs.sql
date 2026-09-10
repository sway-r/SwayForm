-- Adds the "Run on Robot" submission queue: students submit code that
-- exactly matches a verified working file, an admin approves/rejects/
-- reorders/cancels, and an approved job actually runs on the physical
-- robot. Additive only. Run once in the Neon SQL Editor. After this,
-- db/schema.sql already reflects the new shape for fresh installs.

CREATE TABLE IF NOT EXISTS robot_jobs (
  id             SERIAL PRIMARY KEY,
  robot_id       INTEGER NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  -- References user_profiles so deleting a student's account (the admin
  -- panel's "delete this student's data forever" action, or a direct
  -- deletion request) takes their submitted code/output with it for free —
  -- same pattern as progress_completed/progress_current in schema.sql. Any
  -- account submitting a job has already completed onboarding (a
  -- user_profiles row is required to reach this feature at all), so this
  -- FK never rejects a legitimate insert.
  student_email  TEXT NOT NULL REFERENCES user_profiles(email) ON DELETE CASCADE,
  workspace_path TEXT NOT NULL,
  package        TEXT NOT NULL,
  executable     TEXT NOT NULL,
  code           TEXT NOT NULL,          -- immutable snapshot at submit time
  code_sha256    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','running','succeeded','failed','rejected','cancelled')),
  queue_position INTEGER,
  decided_by     TEXT,
  reject_reason  TEXT,
  exit_code      INTEGER,
  output         TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_robot_jobs_queue ON robot_jobs (robot_id, status, queue_position);

-- Hard guarantee, not just an application convention: the robot can never
-- have two jobs "running" at once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_robot_jobs_one_running
  ON robot_jobs (robot_id) WHERE status = 'running';

-- Terminal jobs (succeeded/failed/rejected/cancelled) are purged 90 days
-- after they reach that terminal state — see /data-retention on the public
-- site and api/cron/cleanup-robot-jobs.js, which runs this on a schedule.
-- Speeds up that cron's WHERE clause (status IN (...) AND the COALESCE'd
-- terminal timestamp).
CREATE INDEX IF NOT EXISTS idx_robot_jobs_terminal_age
  ON robot_jobs (status, finished_at, decided_at, submitted_at)
  WHERE status IN ('succeeded','failed','rejected','cancelled');
