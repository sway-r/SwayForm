-- Lets a robot have a third admin (slot 3). Additive and safe to re-run.
ALTER TABLE admin_emails DROP CONSTRAINT IF EXISTS admin_emails_slot_check;
ALTER TABLE admin_emails ADD CONSTRAINT admin_emails_slot_check CHECK (slot IN (1, 2, 3));
