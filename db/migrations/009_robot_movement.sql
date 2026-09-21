-- "Movement" toggle beside "Live Robot Session" on the Robot tab. Since agent
-- 0.6.0 the session only holds the robot still in its safe rest pose; the
-- ambient gestures run only while Movement is on. Like idle_session_enabled,
-- this is the admin's intent, not a live report from the Pi.
--
-- Movement can never be on without the session: the CHECK below makes that
-- true in the database itself, whatever the application code does.
--
-- Additive; safe to re-run.

ALTER TABLE robots ADD COLUMN IF NOT EXISTS movement_enabled BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
  ALTER TABLE robots ADD CONSTRAINT robots_movement_needs_session CHECK (NOT movement_enabled OR idle_session_enabled);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
