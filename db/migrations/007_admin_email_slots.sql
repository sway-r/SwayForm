-- Adds a real, database-enforced admin "slot" (1 or 2) to admin_emails.
-- Previously "which slot is this email in" was only ever an implicit
-- position inferred by reading existing rows ordered by id — a read, then a
-- separate insert/update decided in application code (api/admin.js's
-- set_admin_email), not one atomic operation. Two concurrent requests for
-- the same still-empty slot could both read "0 existing rows for this
-- account" and both insert, producing a 3rd admin for a robot that the
-- 2-slot admin UI can never display or manage.
--
-- Additive; safe to re-run. After this, db/schema.sql already reflects the
-- new shape for fresh installs, and api/admin.js's set_admin_email upserts
-- on (admin_account_id, slot) instead of a read-then-branch check.

ALTER TABLE admin_emails ADD COLUMN IF NOT EXISTS slot SMALLINT;

-- Backfill: existing rows get slot 1/2 in their current (id ASC) order —
-- the same order the admin UI has always displayed them in. A pre-existing
-- 3rd-or-later row for one account (the exact symptom of the race this
-- migration closes) has no valid slot to backfill and is deliberately left
-- with slot = NULL — Postgres treats each NULL as distinct for uniqueness
-- purposes, so this migration never fails or silently drops such a row; it
-- just doesn't auto-resolve which of 3+ admins should be demoted. If any
-- row still has slot IS NULL after this migration, review it manually.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY admin_account_id ORDER BY id) AS rn
  FROM admin_emails
  WHERE slot IS NULL
)
UPDATE admin_emails ae
SET slot = ranked.rn
FROM ranked
WHERE ae.id = ranked.id AND ranked.rn <= 2;

-- ADD CONSTRAINT has no IF NOT EXISTS of its own (unlike ADD COLUMN/DROP
-- CONSTRAINT), and Postgres's own auto-generated name for an inline column
-- CHECK (as db/schema.sql declares for a fresh install) can collide with an
-- explicit name chosen here — guard it explicitly so this stays safe to
-- run against either an old pre-slot database or a fresh-install one.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_emails_slot_check') THEN
    ALTER TABLE admin_emails ADD CONSTRAINT admin_emails_slot_check CHECK (slot IS NULL OR slot IN (1, 2));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_emails_account_slot ON admin_emails (admin_account_id, slot);
