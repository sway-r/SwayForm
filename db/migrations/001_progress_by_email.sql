-- One-time migration: re-key progress from student_id to email.
-- Safe to run — nothing has ever written to progress_completed/progress_current
-- yet, so there's no data to lose. Run this once in the Neon SQL editor.
-- After this, db/schema.sql already reflects the new shape for fresh installs.

DROP TABLE IF EXISTS progress_completed;
DROP TABLE IF EXISTS progress_current;

CREATE TABLE progress_completed (
  email TEXT NOT NULL REFERENCES user_profiles(email) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, activity_id)
);

CREATE TABLE progress_current (
  email TEXT PRIMARY KEY REFERENCES user_profiles(email) ON DELETE CASCADE,
  activity_id TEXT,
  step_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
