-- Adds the fields the Pi-side agent needs to authenticate to the bridge
-- server and be tracked for online/offline status. Additive only — safe to
-- run on a database that already has the `robots` table. Run once in the
-- Neon SQL Editor. After this, db/schema.sql already reflects the new shape
-- for fresh installs.

ALTER TABLE robots ADD COLUMN IF NOT EXISTS agent_token_hash TEXT;
ALTER TABLE robots ADD COLUMN IF NOT EXISTS agent_version TEXT;
