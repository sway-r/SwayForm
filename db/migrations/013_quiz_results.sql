-- Quiz results: one row per finished quiz try, so the Grades app can show
-- students their scores and show teachers the whole class. The score is
-- reported by the browser at submit, like the rest of the quiz rules.
--
-- Additive; safe to re-run.

CREATE TABLE IF NOT EXISTS quiz_results (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL REFERENCES user_profiles(email) ON DELETE CASCADE,
  quiz_id     TEXT NOT NULL,
  correct     INTEGER NOT NULL CHECK (correct >= 0),
  total       INTEGER NOT NULL CHECK (total > 0 AND correct <= total),
  percent     INTEGER NOT NULL CHECK (percent BETWEEN 0 AND 100),
  passed      BOOLEAN NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_results_email_quiz ON quiz_results (email, quiz_id, finished_at);
