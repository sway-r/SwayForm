-- Admin-only "Live Robot Session" toggle on the Robot tab: when enabled, the
-- robot loops idle.py (small ambient look-around/joint movement) so it
-- "looks alive" between real jobs. This column is the admin's *intent*
-- (what they last clicked), not a live status report from the Pi.
--
-- It is set back to false server-side the moment a job is approved
-- (api/robot/queue.js's approve action) so idle and a real running job can
-- never overlap on the physical robot — matches the same one-thing-moves-
-- the-robot-at-a-time principle as idx_robot_jobs_one_running below, just
-- enforced in application code here since idle sessions aren't rows in
-- robot_jobs. It does not auto-resume after the job finishes; the admin
-- turns it back on manually.
--
-- Additive; safe to re-run. After this, db/schema.sql already reflects the
-- new shape for fresh installs.

ALTER TABLE robots ADD COLUMN IF NOT EXISTS idle_session_enabled BOOLEAN NOT NULL DEFAULT FALSE;
