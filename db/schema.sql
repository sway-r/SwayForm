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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id SERIAL PRIMARY KEY,
  robot_id INTEGER NOT NULL UNIQUE REFERENCES robots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Max 2 rows per admin_account_id, enforced by the Phase 2 admin API, not the DB.
CREATE TABLE IF NOT EXISTS admin_emails (
  id SERIAL PRIMARY KEY,
  admin_account_id INTEGER NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
