-- Certificates and the assessment that gates them.
--
-- certificates: one row per certificate a student has earned. The id is the
-- public, unguessable code printed on the certificate and checked on the
-- verification page. holder_name is the name the student chose to print.
--
-- certificate_attempts: one row per assessment attempt. `questions` holds the
-- full question set including correct answers and is only ever read on the
-- server; the browser is sent one question at a time without the answer.
--
-- Additive; safe to re-run.

CREATE TABLE IF NOT EXISTS certificates (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL REFERENCES user_profiles(email) ON DELETE CASCADE,
  certificate_key TEXT NOT NULL,
  holder_name     TEXT NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, certificate_key)
);

CREATE TABLE IF NOT EXISTS certificate_attempts (
  id                  SERIAL PRIMARY KEY,
  email               TEXT NOT NULL REFERENCES user_profiles(email) ON DELETE CASCADE,
  certificate_key     TEXT NOT NULL,
  questions           JSONB NOT NULL,
  answers             JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_index       INTEGER NOT NULL DEFAULT 0,
  question_started_at TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress','passed','failed')),
  score               INTEGER,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_certificate_attempts_email
  ON certificate_attempts (email, certificate_key, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_attempts_one_open
  ON certificate_attempts (email, certificate_key) WHERE status = 'in_progress';
