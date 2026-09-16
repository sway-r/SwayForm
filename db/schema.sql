-- SwayForm Learning Portal — auth schema (Phase 1)
-- Run this once in the Neon/Vercel Postgres SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS robots (
  id SERIAL PRIMARY KEY,
  serial_number TEXT UNIQUE NOT NULL,       -- e.g. 'robot005'
  school_name TEXT,
  is_online BOOLEAN NOT NULL DEFAULT FALSE, -- set by api/robot/heartbeat.js, via the bridge server
  last_seen_at TIMESTAMPTZ,
  agent_token_hash TEXT,                    -- sha256 of the Pi agent's long-lived token; see db/migrations/002_robot_agent.sql
  agent_version TEXT,
  idle_session_enabled BOOLEAN NOT NULL DEFAULT FALSE, -- admin's "Live Robot Session" toggle intent; see db/migrations/008_robot_idle_session.sql
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id SERIAL PRIMARY KEY,
  robot_id INTEGER NOT NULL UNIQUE REFERENCES robots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- `slot` (1 or 2) is a real column, not an implicit position inferred from
-- row id order — the unique index below makes "only one admin per slot"
-- a database guarantee that api/admin.js's set_admin_email upserts against
-- (ON CONFLICT (admin_account_id, slot)), instead of a read-existing-rows-
-- then-insert check in application code, which two concurrent requests for
-- the same empty slot could both pass, creating a 3rd admin the 2-slot UI
-- can never show or manage. See db/migrations/007_admin_email_slots.sql.
CREATE TABLE IF NOT EXISTS admin_emails (
  id SERIAL PRIMARY KEY,
  admin_account_id INTEGER NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  slot SMALLINT CHECK (slot IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_emails_account_slot ON admin_emails (admin_account_id, slot);

-- One row per student ever granted access to a robot. 'active' students hold
-- one of 15 seats and can log in; 'archived' students were removed by the
-- admin but their row (and progress) is kept until the admin permanently
-- deletes it. Max 15 active + max 40 total (active+archived) per robot,
-- enforced by the admin API, not the DB.
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  robot_id INTEGER NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  seat_number INTEGER CHECK (seat_number BETWEEN 1 AND 15), -- NULL when archived
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE (robot_id, email)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_active_seat
  ON students (robot_id, seat_number) WHERE status = 'active';

-- One row per Google account that has completed onboarding. Collected once,
-- right after a user's first real login, so the portal never shows
-- fabricated identity data (name/school) for a real account.
CREATE TABLE IF NOT EXISTS user_profiles (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Learning progress, mirroring progress-service.js's two localStorage keys.
-- Keyed by email (any real account — admin/student/member all get a
-- user_profiles row via onboarding), not student_id, since simulation
-- progress belongs to the person, not to a specific robot seat. Cascades
-- automatically when a user_profiles row is deleted (the admin panel's
-- "delete this student's data forever" action deletes user_profiles, which
-- takes progress with it for free via this foreign key).
CREATE TABLE IF NOT EXISTS progress_completed (
  email TEXT NOT NULL REFERENCES user_profiles(email) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, activity_id)
);

CREATE TABLE IF NOT EXISTS progress_current (
  email TEXT PRIMARY KEY REFERENCES user_profiles(email) ON DELETE CASCADE,
  activity_id TEXT,
  step_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Run on Robot" submission queue. See db/migrations/004_robot_jobs.sql and
-- docs/robot-connectivity.md. Terminal jobs are purged after 90 days by
-- api/cron/cleanup-robot-jobs.js — see /data-retention on the public site.
CREATE TABLE IF NOT EXISTS robot_jobs (
  id             SERIAL PRIMARY KEY,
  robot_id       INTEGER NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  -- References user_profiles so deleting a student's account cascades to
  -- their submitted code/output, same pattern as progress_completed above.
  student_email  TEXT NOT NULL REFERENCES user_profiles(email) ON DELETE CASCADE,
  workspace_path TEXT NOT NULL,
  package        TEXT NOT NULL,
  executable     TEXT NOT NULL,
  code           TEXT NOT NULL,
  code_sha256    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','running','succeeded','failed','rejected','cancelled')),
  queue_position INTEGER,
  decided_by     TEXT,
  reject_reason  TEXT,
  exit_code      INTEGER,
  output         TEXT,
  -- Monotonic running total of characters ever appended via job-output —
  -- independent of `output`'s own length, which is capped/truncated (a
  -- rolling tail, see api/robot/agent.js's MAX_OUTPUT_CHARS). See
  -- db/migrations/006_robot_job_output_counter.sql for why this exists.
  output_total_len INTEGER NOT NULL DEFAULT 0,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_robot_jobs_queue ON robot_jobs (robot_id, status, queue_position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_robot_jobs_one_running
  ON robot_jobs (robot_id) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_robot_jobs_terminal_age
  ON robot_jobs (status, finished_at, decided_at, submitted_at)
  WHERE status IN ('succeeded','failed','rejected','cancelled');

-- Clickwrap acceptance record for the Terms of Use + Privacy Policy, written
-- on every Google sign-in (including a user's first, pre-onboarding). Not
-- tied to user_profiles so it survives even if onboarding is never
-- completed. See db/migrations/003_terms_acceptance.sql.
CREATE TABLE IF NOT EXISTS terms_acceptances (
  email TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, version)
);

-- Portal privacy additions (migration 005).
-- Apply before deploying the portal privacy branch. Existing JWT cookies will
-- require a fresh Google sign-in; no existing student/profile records are erased.

CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_email ON portal_sessions(email);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expiry ON portal_sessions(expires_at);

CREATE TABLE IF NOT EXISTS school_invitations (
  id SERIAL PRIMARY KEY,
  robot_id INTEGER NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days',
  UNIQUE (robot_id, email)
);
CREATE INDEX IF NOT EXISTS idx_school_invitations_email ON school_invitations(email);

CREATE TABLE IF NOT EXISTS portal_rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL CHECK (hits > 0)
);

CREATE TABLE IF NOT EXISTS portal_audit_events (
  id BIGSERIAL PRIMARY KEY,
  robot_id INTEGER REFERENCES robots(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
