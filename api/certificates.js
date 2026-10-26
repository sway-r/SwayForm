import { readSessionFromRequest } from './_lib/session.js';
import { sql } from './_lib/db.js';
import { privateResponse, requireBrowserMutation, rateLimit } from './_lib/browser-security.js';
import {
  CERTIFICATES, QUESTION_COUNT, PASS_MARK, SECONDS_PER_QUESTION, GRACE_SECONDS, RETRY_WAIT_MINUTES,
  evaluateLabs, labsUnlocked, buildQuestions, publicQuestion, newCertificateId, validCertificateId, cleanHolderName,
} from './_lib/certification.js';

const KEY = 'foundation';

function clientIp(req){
  return String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'unknown').trim();
}

async function loadLabs(email){
  const [completed, ran] = await Promise.all([
    sql`SELECT activity_id FROM progress_completed WHERE email = ${email}`,
    sql`SELECT DISTINCT workspace_path FROM robot_jobs WHERE student_email = ${email} AND status = 'succeeded'`,
  ]);
  return evaluateLabs(KEY, new Set(completed.map((r) => r.activity_id)), new Set(ran.map((r) => r.workspace_path)));
}

/** Times out an unanswered question (counts as wrong) and finishes the attempt when it is done. */
async function settle(attempt){
  const questions = attempt.questions;
  const answers = [...attempt.answers];
  let index = attempt.current_index;
  let startedAt = attempt.question_started_at ? new Date(attempt.question_started_at) : null;
  const now = Date.now();
  let changed = false;

  if (startedAt && now - startedAt.getTime() > (SECONDS_PER_QUESTION + GRACE_SECONDS) * 1000){
    answers[index] = { choice: null, correct: false, timedOut: true };
    index += 1;
    startedAt = null;
    changed = true;
  }
  if (index >= questions.length) return finish(attempt, answers, index);
  if (!startedAt){ startedAt = new Date(); changed = true; }
  if (changed){
    await sql`UPDATE certificate_attempts SET answers = ${JSON.stringify(answers)}::jsonb, current_index = ${index}, question_started_at = ${startedAt.toISOString()}
              WHERE id = ${attempt.id}`;
  }
  return { ...attempt, answers, current_index: index, question_started_at: startedAt, status: 'in_progress' };
}

async function finish(attempt, answers, index){
  const score = answers.filter((a) => a && a.correct).length;
  const status = score >= PASS_MARK ? 'passed' : 'failed';
  await sql`UPDATE certificate_attempts SET answers = ${JSON.stringify(answers)}::jsonb, current_index = ${index},
            question_started_at = NULL, status = ${status}, score = ${score}, finished_at = now() WHERE id = ${attempt.id}`;
  return { ...attempt, answers, current_index: index, question_started_at: null, status, score };
}

function currentQuestion(attempt){
  const started = new Date(attempt.question_started_at).getTime();
  const left = Math.max(0, SECONDS_PER_QUESTION - Math.floor((Date.now() - started) / 1000));
  return publicQuestion(attempt.questions[attempt.current_index], attempt.current_index + 1, attempt.questions.length, left);
}

async function certificateFor(email){
  const [row] = await sql`SELECT id, holder_name, issued_at FROM certificates WHERE email = ${email} AND certificate_key = ${KEY}`;
  return row ? { id: row.id, name: row.holder_name, issuedAt: row.issued_at, program: CERTIFICATES[KEY].program } : null;
}

async function status(email, res){
  const labs = await loadLabs(email);
  const certificate = await certificateFor(email);
  let attempt = null;
  const [open] = await sql`SELECT * FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'in_progress'`;
  if (open) attempt = await settle(open);
  const [latest] = await sql`SELECT status, score, finished_at FROM certificate_attempts
    WHERE email = ${email} AND certificate_key = ${KEY} AND status <> 'in_progress' ORDER BY started_at DESC LIMIT 1`;
  const [passed] = await sql`SELECT 1 AS ok FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'passed' LIMIT 1`;
  let retryAt = null;
  if (latest && latest.status === 'failed' && !passed){
    const at = new Date(new Date(latest.finished_at).getTime() + RETRY_WAIT_MINUTES * 60000);
    if (at.getTime() > Date.now()) retryAt = at.toISOString();
  }
  const inProgress = attempt && attempt.status === 'in_progress';
  res.status(200).json({
    program: CERTIFICATES[KEY].program,
    labs: labs.map(({ id, number, title, done, ran, placeholder }) => ({ id, number, title, done, ran, placeholder })),
    labsUnlocked: labsUnlocked(labs),
    assessment: {
      questionCount: QUESTION_COUNT, passMark: PASS_MARK, secondsPerQuestion: SECONDS_PER_QUESTION,
      passed: !!passed, retryAt,
      lastResult: latest ? { status: latest.status, score: latest.score } : null,
      current: inProgress ? currentQuestion(attempt) : null,
    },
    certificate,
  });
}

async function start(email, res){
  if (await certificateFor(email)) return res.status(409).json({ error: 'already_certified' });
  const labs = await loadLabs(email);
  if (!labsUnlocked(labs)) return res.status(403).json({ error: 'labs_incomplete' });
  const [open] = await sql`SELECT * FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'in_progress'`;
  if (open){ const attempt = await settle(open); if (attempt.status === 'in_progress') return res.status(200).json({ question: currentQuestion(attempt) }); }
  const [latest] = await sql`SELECT finished_at FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'failed' ORDER BY started_at DESC LIMIT 1`;
  if (latest && new Date(latest.finished_at).getTime() + RETRY_WAIT_MINUTES * 60000 > Date.now()){
    return res.status(429).json({ error: 'retry_later', retryAt: new Date(new Date(latest.finished_at).getTime() + RETRY_WAIT_MINUTES * 60000).toISOString() });
  }
  const jobs = await sql`SELECT workspace_path, status, code, finished_at FROM robot_jobs WHERE student_email = ${email}
                         AND status IN ('succeeded','failed') ORDER BY id DESC LIMIT 400`;
  const questions = buildQuestions(labs, jobs);
  const rows = await sql`INSERT INTO certificate_attempts (email, certificate_key, questions, question_started_at)
                         VALUES (${email}, ${KEY}, ${JSON.stringify(questions)}::jsonb, now())
                         ON CONFLICT DO NOTHING RETURNING *`;
  if (!rows.length) return status(email, res);
  return res.status(200).json({ question: currentQuestion(rows[0]) });
}

async function answer(email, body, res){
  const choice = Number.isInteger(body.choice) ? body.choice : null;
  const [open] = await sql`SELECT * FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'in_progress'`;
  if (!open) return res.status(409).json({ error: 'no_attempt' });
  if (body.index !== open.current_index + 1) return res.status(409).json({ error: 'out_of_sync' });

  const questions = open.questions;
  const question = questions[open.current_index];
  const started = new Date(open.question_started_at).getTime();
  const late = Date.now() - started > (SECONDS_PER_QUESTION + GRACE_SECONDS) * 1000;
  const valid = choice !== null && choice >= 0 && choice < question.options.length;
  const answers = [...open.answers];
  answers[open.current_index] = { choice: valid ? choice : null, correct: !late && valid && choice === question.correctIndex, timedOut: late };

  const next = open.current_index + 1;
  if (next >= questions.length){
    const done = await finish(open, answers, next);
    return res.status(200).json({ finished: true, passed: done.status === 'passed', score: done.score, total: questions.length, passMark: PASS_MARK });
  }
  await sql`UPDATE certificate_attempts SET answers = ${JSON.stringify(answers)}::jsonb, current_index = ${next}, question_started_at = now() WHERE id = ${open.id}`;
  const updated = { ...open, answers, current_index: next, question_started_at: new Date() };
  return res.status(200).json({ finished: false, question: currentQuestion(updated) });
}

async function issue(email, body, res){
  const name = cleanHolderName(body.name);
  if (!name) return res.status(400).json({ error: 'invalid_name' });
  if (await certificateFor(email)) return res.status(409).json({ error: 'already_certified' });
  const labs = await loadLabs(email);
  if (!labsUnlocked(labs)) return res.status(403).json({ error: 'labs_incomplete' });
  const [passed] = await sql`SELECT 1 AS ok FROM certificate_attempts WHERE email = ${email} AND certificate_key = ${KEY} AND status = 'passed' LIMIT 1`;
  if (!passed) return res.status(403).json({ error: 'assessment_not_passed' });
  for (let tries = 0; tries < 5; tries++){
    const id = newCertificateId(KEY);
    const rows = await sql`INSERT INTO certificates (id, email, certificate_key, holder_name) VALUES (${id}, ${email}, ${KEY}, ${name})
                           ON CONFLICT DO NOTHING RETURNING id, holder_name, issued_at`;
    if (rows.length) return res.status(200).json({ certificate: { id: rows[0].id, name: rows[0].holder_name, issuedAt: rows[0].issued_at, program: CERTIFICATES[KEY].program } });
    if (await certificateFor(email)) return res.status(409).json({ error: 'already_certified' });
  }
  return res.status(500).json({ error: 'could_not_issue' });
}

async function verify(req, res){
  privateResponse(res);
  const id = String(req.query?.verify || '').trim().toUpperCase();
  if (!await rateLimit(res, 'verify', clientIp(req), 30)) return;
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
  const session = await readSessionFromRequest(req);
  if (!session || session.mode === 'guest'){
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  const email = session.email;
  if (req.method === 'GET') return status(email, res);
  if (req.method !== 'POST'){ res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!await rateLimit(res, 'certificates', email, 60)) return;
  const body = req.body || {};
  switch (body.action){
    case 'start': return start(email, res);
    case 'answer': return answer(email, body, res);
    case 'issue': return issue(email, body, res);
    default: res.status(400).json({ error: 'unknown_action' });
  }
}
