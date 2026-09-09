-- SwayForm Learning Portal — auth schema (Phase 1)
-- Run this once in the Neon/Vercel Postgres SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS robots (
  id SERIAL PRIMARY KEY,
  serial_number TEXT UNIQUE NOT NULL,       -- e.g. 'robot005'
  school_name TEXT,
  is_online BOOLEAN NOT NULL DEFAULT FALSE, -- Phase 2: heartbeat sets this
  last_seen_at TIMESTAMPTZ,
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
-- enforced by the Phase 2 admin API, not the DB.
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

-- Phase 2 stubs, mirroring progress-service.js's two localStorage keys.
-- Keyed by student_id (not email) so a permanent delete (admin's "forget
-- this student forever" action) cascades and removes progress automatically.
CREATE TABLE IF NOT EXISTS progress_completed (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, activity_id)
);

CREATE TABLE IF NOT EXISTS progress_current (
  student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  activity_id TEXT,
  step_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
