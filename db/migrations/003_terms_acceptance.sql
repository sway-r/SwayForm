-- Records clickwrap acceptance of the Terms of Use + Privacy Policy at
-- sign-in, so SwayForm has a durable, queryable record of who accepted
-- which published version and when (Meyer v. Uber-style "continuing means
-- agreeing" notice, logged server-side rather than only shown client-side).
-- Not tied to user_profiles (which only exists after onboarding) — this
-- table is written on every Google sign-in, including a user's very first
-- one, before onboarding has run. Additive only. Run once in the Neon SQL
-- Editor. After this, db/schema.sql already reflects the new shape for
-- fresh installs.

CREATE TABLE IF NOT EXISTS terms_acceptances (
  email TEXT NOT NULL,
  version TEXT NOT NULL,       -- e.g. '2026-09-09', matching the policy pages' "Last updated" date
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, version)
);
