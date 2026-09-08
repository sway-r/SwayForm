-- Example seed data — copy this into the Neon/Vercel SQL editor and replace
-- the placeholder emails with real ones. Do NOT commit the filled-in copy;
-- db/seed.local.sql is gitignored for exactly that purpose.

INSERT INTO robots (serial_number, school_name) VALUES ('robot005', 'Test School') RETURNING id;
INSERT INTO admin_accounts (robot_id) VALUES (1) RETURNING id;                    -- use the robots.id above
INSERT INTO admin_emails (admin_account_id, email) VALUES (1, 'you@example.com'); -- use the admin_accounts.id above
INSERT INTO students (robot_id, email, seat_number) VALUES (1, 'student@example.com', 1); -- optional, to test the student role
