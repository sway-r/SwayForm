-- Apply before deploying the portal privacy branch. Existing JWT cookies will
-- require a fresh Google sign-in; no existing student/profile records are erased.
BEGIN;

CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_email ON portal_sessions(email);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expiry ON portal_sessions(expires_at);

CREATE TABLE IF NOT EXISTS school_invitations (
  id SERIAL PRIMARY KEY,
  robot_id INTEGER NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days',
  UNIQUE (robot_id, email)
);
CREATE INDEX IF NOT EXISTS idx_school_invitations_email ON school_invitations(email);

CREATE TABLE IF NOT EXISTS portal_rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL CHECK (hits > 0)
);

CREATE TABLE IF NOT EXISTS portal_audit_events (
  id BIGSERIAL PRIMARY KEY,
  robot_id INTEGER REFERENCES robots(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
