import { readSessionFromRequest } from './_lib/session.js';
import { sql } from './_lib/db.js';
import { privateResponse, requireBrowserMutation, rateLimit } from './_lib/browser-security.js';
import {
  CERTIFICATES, QUESTION_COUNT, PASS_MARK, SECONDS_PER_QUESTION, GRACE_SECONDS, RETRY_WAIT_MINUTES, MAX_ATTEMPT_MINUTES,
  evaluateLabs, labsUnlocked, questionIdsForAttempt, shuffledOptions, publicQuestion, encodeToken, decodeToken,
  newCertificateId, validCertificateId, cleanHolderName,
} from './_lib/certification.js';

/* Database use is kept deliberately small: one read to open the Account section, two statements to
 * start an attempt, none while answering (progress travels in a signed token), one to finish it. */

const KEY = 'foundation';

function minutesToMs(minutes){ return minutes * 60000; }

/** Everything the certificate rules need about one student, in a single round trip. */
async function snapshot(email){
  const [row] = await sql`
    SELECT
      (SELECT COALESCE(json_agg(json_build_object('id', activity_id, 'verified', robot_verified)), '[]'::json)
         FROM progress_completed WHERE email = ${email}) AS completed,
      (SELECT COALESCE(json_agg(DISTINCT workspace_path), '[]'::json)
         FROM robot_jobs WHERE student_email = ${email} AND status = 'succeeded') AS ran,
      (SELECT row_to_json(c) FROM (SELECT id, holder_name, issued_at FROM certificates
         WHERE email = ${email} AND certificate_key = ${KEY}) c) AS certificate,
      (SELECT COUNT(*)::int FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY}) AS attempts,
      (SELECT COUNT(*)::int FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'passed') AS passed,
      (SELECT MAX(COALESCE(finished_at, started_at)) FROM certificate_attempts
         WHERE email = ${email} AND certificate_key = ${KEY} AND status <> 'passed') AS last_failed_at,
      (SELECT row_to_json(a) FROM (SELECT status, score FROM certificate_attempts
         WHERE email = ${email} AND certificate_key = ${KEY} AND status <> 'in_progress' ORDER BY id DESC LIMIT 1) a) AS last_result
  `;
  const completed = new Map(row.completed.map((c) => [c.id, c.verified]));
  const labs = evaluateLabs(KEY, completed, new Set(row.ran));
  // A lab whose robot run is still on file but not yet recorded gets recorded now, before the 90-day purge.
  const upgrade = labs.filter((l) => l.newlyVerified).map((l) => l.id);
  if (upgrade.length){
    await sql`UPDATE progress_completed SET robot_verified = TRUE WHERE email = ${email} AND activity_id = ANY(${upgrade})`;
  }
  return { ...row, labs };
}

function certificatePayload(row){
  return row ? { id: row.id, name: row.holder_name, issuedAt: row.issued_at, program: CERTIFICATES[KEY].program } : null;
}

function retryAtFor(snap){
  if (snap.passed || !snap.last_failed_at) return null;
  const at = new Date(snap.last_failed_at).getTime() + minutesToMs(RETRY_WAIT_MINUTES);
  return at > Date.now() ? new Date(at).toISOString() : null;
}

async function status(email, res){
  const snap = await snapshot(email);
  res.status(200).json({
    program: CERTIFICATES[KEY].program,
    labs: snap.labs.map(({ id, number, title, done, ran, placeholder }) => ({ id, number, title, done, ran, placeholder })),
    labsUnlocked: labsUnlocked(snap.labs),
    assessment: {
      questionCount: QUESTION_COUNT, passMark: PASS_MARK, secondsPerQuestion: SECONDS_PER_QUESTION,
      passed: snap.passed > 0, retryAt: retryAtFor(snap), lastResult: snap.last_result || null,
    },
    certificate: certificatePayload(snap.certificate),
  });
}

async function start(email, res){
  const snap = await snapshot(email);
  if (snap.certificate) return res.status(409).json({ error: 'already_certified' });
  if (!labsUnlocked(snap.labs)) return res.status(403).json({ error: 'labs_incomplete' });
  if (snap.passed) return res.status(409).json({ error: 'already_passed' });
  const retryAt = retryAtFor(snap);
  if (retryAt) return res.status(429).json({ error: 'retry_later', retryAt });

  // Walking away from an attempt counts as a failed one.
  await sql`UPDATE certificate_attempts SET status = 'failed', score = 0, finished_at = now()
            WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'in_progress'`;
  const attemptNumber = snap.attempts + 1;
  const [attempt] = await sql`INSERT INTO certificate_attempts (email, certificate_key, attempt_number)
                              VALUES (${email}, ${KEY}, ${attemptNumber}) RETURNING id`;
  const now = Date.now();
  const token = { a: attempt.id, e: email, q: questionIdsForAttempt(attemptNumber), i: 0, c: 0, s: now, t: now };
  return res.status(200).json({ token: encodeToken(token), question: publicQuestion(token, 0, SECONDS_PER_QUESTION) });
}

async function answer(body, res){
  const token = decodeToken(body.token);
  if (!token || body.index !== token.i + 1) return res.status(409).json({ error: 'out_of_sync' });
  const now = Date.now();
  if (now - token.s > minutesToMs(MAX_ATTEMPT_MINUTES)) return res.status(409).json({ error: 'attempt_expired' });

  const id = token.q[token.i];
  const { options, correctIndex } = shuffledOptions(id, token.a);
  const choice = Number.isInteger(body.choice) && body.choice >= 0 && body.choice < options.length ? body.choice : null;
  const late = now - token.t > (SECONDS_PER_QUESTION + GRACE_SECONDS) * 1000;
  const correct = !late && choice === correctIndex;
  const next = { ...token, i: token.i + 1, c: token.c + (correct ? 1 : 0), t: now };

  if (next.i < token.q.length){
    return res.status(200).json({ finished: false, token: encodeToken(next), question: publicQuestion(next, next.i, SECONDS_PER_QUESTION) });
  }
  const passed = next.c >= PASS_MARK;
  const rows = await sql`UPDATE certificate_attempts SET status = ${passed ? 'passed' : 'failed'}, score = ${next.c}, finished_at = now()
                         WHERE id = ${token.a} AND email = ${token.e} AND status = 'in_progress' RETURNING id`;
  if (!rows.length) return res.status(409).json({ error: 'attempt_closed' });
  return res.status(200).json({ finished: true, passed, score: next.c, total: token.q.length, passMark: PASS_MARK });
}

async function issue(email, body, res){
  const name = cleanHolderName(body.name);
  if (!name) return res.status(400).json({ error: 'invalid_name' });
  const snap = await snapshot(email);
  if (snap.certificate) return res.status(409).json({ error: 'already_certified' });
  if (!labsUnlocked(snap.labs)) return res.status(403).json({ error: 'labs_incomplete' });
  if (!snap.passed) return res.status(403).json({ error: 'assessment_not_passed' });
  for (let tries = 0; tries < 5; tries++){
    const id = newCertificateId(KEY);
    const rows = await sql`INSERT INTO certificates (id, email, certificate_key, holder_name) VALUES (${id}, ${email}, ${KEY}, ${name})
                           ON CONFLICT DO NOTHING RETURNING id, holder_name, issued_at`;
    if (rows.length) return res.status(200).json({ certificate: certificatePayload(rows[0]) });
    const [existing] = await sql`SELECT id FROM certificates WHERE email = ${email} AND certificate_key = ${KEY}`;
    if (existing) return res.status(409).json({ error: 'already_certified' });
  }
  return res.status(500).json({ error: 'could_not_issue' });
}

async function verify(req, res){
  privateResponse(res);
  const id = String(req.query?.verify || '').trim().toUpperCase();
  if (!validCertificateId(id)) return res.status(200).json({ valid: false });
  const [row] = await sql`SELECT holder_name, issued_at, certificate_key FROM certificates WHERE id = ${id}`;
  if (!row) return res.status(200).json({ valid: false });
  const cert = CERTIFICATES[row.certificate_key];
  return res.status(200).json({ valid: true, name: row.holder_name, issuedAt: row.issued_at, program: cert ? cert.program : 'SwayForm certificate' });
}

export default async function handler(req, res){
  if (req.method === 'GET' && req.query && req.query.verify !== undefined) return verify(req, res);
  privateResponse(res);
  if (req.method === 'POST' && !requireBrowserMutation(req, res)) return;
  // The signed token already proves who this is, so answering costs no database reads.
  if (req.method === 'POST' && (req.body || {}).action === 'answer') return answer(req.body, res);
  const session = await readSessionFromRequest(req);
  if (!session || session.mode === 'guest'){
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  const email = session.email;
  if (req.method === 'GET') return status(email, res);
  if (req.method !== 'POST'){ res.status(405).json({ error: 'method_not_allowed' }); return; }
  const body = req.body || {};
  if (!await rateLimit(res, 'certificates', email, 20)) return;
  switch (body.action){
    case 'start': return start(email, res);
    case 'issue': return issue(email, body, res);
    default: res.status(400).json({ error: 'unknown_action' });
  }
}
