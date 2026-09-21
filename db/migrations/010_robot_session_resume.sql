-- Approving a job still turns "Live Robot Session" and "Movement" off so
-- they can never overlap a real job, but it no longer forgets them: what was
-- on is remembered here and put back once the last approved job has ended.
-- An admin turning either toggle off by hand, or reconciling a stuck job,
-- clears the memory instead.
--
-- Additive; safe to re-run.

ALTER TABLE robots ADD COLUMN IF NOT EXISTS resume_session BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE robots ADD COLUMN IF NOT EXISTS resume_movement BOOLEAN NOT NULL DEFAULT FALSE;
