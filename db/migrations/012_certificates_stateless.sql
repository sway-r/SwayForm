-- The assessment became stateless: question progress travels in a signed token
-- instead of being stored per answer, so an attempt now needs just one insert
-- (start) and one update (finish). Drops the per-question columns from 011
-- (the table was new and empty) and records which fixed set the attempt used.
--
-- Also remembers, per completed lab, that the student's code for it ran
-- successfully on the robot, because robot_jobs rows are deleted after 90 days.
--
-- Additive except for the dropped, never-populated certificate_attempts columns; safe to re-run.

ALTER TABLE certificate_attempts DROP COLUMN IF EXISTS questions;
ALTER TABLE certificate_attempts DROP COLUMN IF EXISTS answers;
ALTER TABLE certificate_attempts DROP COLUMN IF EXISTS current_index;
ALTER TABLE certificate_attempts DROP COLUMN IF EXISTS question_started_at;
ALTER TABLE certificate_attempts ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE progress_completed ADD COLUMN IF NOT EXISTS robot_verified BOOLEAN NOT NULL DEFAULT FALSE;
