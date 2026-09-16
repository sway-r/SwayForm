-- Adds a monotonic total-output-length counter to robot_jobs, independent
-- of the `output` column itself (a rolling tail capped at MAX_OUTPUT_CHARS
-- — see api/robot/agent.js). Without this, once a job's output exceeds that
-- cap, output's own length plateaus (old text drops off the front as fast
-- as new text is appended), so the client's length-based "is there new
-- output" check (job.output.length > lastSeen) goes permanently false —
-- every later line, including a final error, silently never displays.
-- Additive only. Run once in the Neon SQL Editor. After this, db/schema.sql
-- already reflects the new shape for fresh installs.

ALTER TABLE robot_jobs ADD COLUMN IF NOT EXISTS output_total_len INTEGER NOT NULL DEFAULT 0;
