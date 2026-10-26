import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Production handlers and SQL against an isolated PostgreSQL engine; only the Neon transport is replaced.
const db = new PGlite();
function query(strings, ...params){
  const text = strings.reduce((s, part, i) => s + (i ? `$${i}` : '') + part, '');
  return { text, params, then(resolve, reject){ return db.query(text, params).then((r) => r.rows).then(resolve, reject); } };
}
query.transaction = (queries) => db.transaction(async (tx) => {
  const results = [];
  for (const q of queries) results.push((await tx.query(q.text, q.params)).rows);
  return results;
});
globalThis.__portalTestSql = query;
registerHooks({ resolve(specifier, context, next){
  if (specifier === '@neondatabase/serverless') return {
    url: 'data:text/javascript,export const neon = () => globalThis.__portalTestSql;', shortCircuit: true,
  };
  return next(specifier, context);
} });
process.env.SWAYFORM_DB_METRICS = 'off';
process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@localhost/synthetic';
process.env.SESSION_SECRET = 'test-only-session-secret-not-a-real-credential';
process.env.VERCEL_ENV = 'production';

const { createSessionCookie } = await import('../api/_lib/session.js');
const { default: certificates } = await import('../api/certificates.js');
const { default: progress } = await import('../api/progress.js');
const { CURRICULUM } = await import('../portal/data/curriculum.js');
const { QUESTION_BANK } = await import('../api/_lib/question-bank.js');
const {
  requiredLabs, evaluateLabs, labsUnlocked, cleanHolderName, validCertificateId,
  decodeToken, encodeToken, shuffledOptions, questionIdsForAttempt,
} = await import('../api/_lib/certification.js');

const ORIGIN = 'https://learning.swayform.net';
function response(){
  return { headers: {}, code: 200, setHeader(k, v){ this.headers[k.toLowerCase()] = v; }, status(code){ this.code = code; return this; }, json(data){ this.data = data; return this; } };
}
async function post(cookie, body, handler = certificates){
  const res = response();
  await handler({ method: 'POST', body, headers: { cookie, origin: ORIGIN, 'content-type': 'application/json' }, query: {} }, res);
  return res;
}
async function get(cookie, query = {}){
  const res = response();
  await certificates({ method: 'GET', body: undefined, headers: cookie ? { cookie } : {}, query }, res);
  return res;
}
async function cookieFor(email){ return (await createSessionCookie({ email, name: email })).split(';')[0]; }

// The real foundation section still has placeholders (labs 11-20), so nobody can unlock it yet.
// For the flow tests, pretend only the ten built labs are required.
const foundation = CURRICULUM.sections.find((s) => s.id === 'foundation');
const allItems = foundation.items;
const builtItems = allItems.filter((i) => i.kind !== 'placeholder');
function setRequired(items){ foundation.items = items; }

const EMAILS = ['ready@example.test', 'norobot@example.test', 'slacker@example.test', 'newbie@example.test'];
const cookies = {};

before(async () => {
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await db.exec(`INSERT INTO robots (id, serial_number, school_name) VALUES (1, 'cert-test', 'Cert School');`);
  for (const email of EMAILS){
    await db.query('INSERT INTO user_profiles (email, display_name, school_name) VALUES ($1, $2, $3)', [email, email.split('@')[0], 'Cert School']);
    cookies[email] = await cookieFor(email);
  }
  const insertRuns = async (email) => {
    for (const item of builtItems){
      await db.query(
        `INSERT INTO robot_jobs (robot_id, student_email, workspace_path, package, executable, code, code_sha256, status, finished_at)
         VALUES (1, $1, $2, 'pkg', 'exe', 'x', 'sha', 'succeeded', now())`, [email, item.workspaceFile]);
    }
  };
  const complete = async (email) => {
    for (const item of builtItems) await db.query('INSERT INTO progress_completed (email, activity_id) VALUES ($1, $2)', [email, item.id]);
  };
  await complete('ready@example.test'); await insertRuns('ready@example.test');
  await complete('norobot@example.test'); // marked complete but never ran on the robot
  await complete('slacker@example.test'); await insertRuns('slacker@example.test');
});

function correctChoice(token){
  return shuffledOptions(token.q[token.i], token.a).correctIndex;
}
async function takeAttempt(email, { right = 10 } = {}){
  const start = await post(cookies[email], { action: 'start' });
  if (start.code !== 200) return { start };
  let token = start.data.token;
  let last;
  for (let i = 0; i < 10; i++){
    const decoded = decodeToken(token);
    const choice = i < right ? correctChoice(decoded) : (correctChoice(decoded) + 1) % 4;
    last = await post(cookies[email], { action: 'answer', token, index: i + 1, choice });
    assert.equal(last.code, 200);
    token = last.data.token;
  }
  return { start, last };
}

test('the real foundation section is locked: placeholders can never be completed', () => {
  setRequired(allItems);
  const labs = evaluateLabs('foundation', new Map(builtItems.map((i) => [i.id, true])), new Set(builtItems.map((i) => i.workspaceFile)));
  assert.equal(requiredLabs('foundation').length, 20);
  assert.equal(labsUnlocked(labs), false);
});

test('no robot run, no unlock, even with every lab marked complete', async () => {
  setRequired(builtItems);
  const res = await get(cookies['norobot@example.test']);
  assert.equal(res.data.labsUnlocked, false);
  assert.ok(res.data.labs.every((l) => l.done && !l.ran));
  const start = await post(cookies['norobot@example.test'], { action: 'start' });
  assert.equal(start.code, 403);
});

test('guests and signed-out visitors cannot reach it', async () => {
  const res = await get('');
  assert.equal(res.code, 401);
});

test('the bank has 50 questions, each with 4 distinct options, in 5 fixed sets', () => {
  assert.equal(QUESTION_BANK.length, 50);
  for (const [prompt, ...options] of QUESTION_BANK){
    assert.ok(prompt.length > 10);
    assert.equal(options.length, 4);
    assert.equal(new Set(options).size, 4);
  }
  assert.deepEqual(questionIdsForAttempt(1), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(questionIdsForAttempt(5), [40, 41, 42, 43, 44, 45, 46, 47, 48, 49]);
  const sixth = questionIdsForAttempt(6);
  assert.equal(new Set(sixth).size, 10);
  assert.ok(sixth.every((id) => id >= 0 && id < 50));
});

test('answering a question costs no database queries, and answers never reach the browser', async () => {
  setRequired(builtItems);
  const email = 'ready@example.test';
  const start = await post(cookies[email], { action: 'start' });
  assert.equal(start.code, 200);
  assert.equal(start.data.question.total, 10);
  assert.equal(start.data.question.index, 1);
  assert.equal(start.data.question.secondsLeft, 45);
  assert.ok(!JSON.stringify(start.data).includes('correct'));

  const realQuery = db.query.bind(db);
  let queries = 0;
  db.query = (...args) => { queries += 1; return realQuery(...args); };
  const token = decodeToken(start.data.token);
  const out = await post(cookies[email], { action: 'answer', token: start.data.token, index: 1, choice: correctChoice(token) });
  db.query = realQuery;
  assert.equal(out.code, 200);
  assert.equal(queries, 0);
  assert.equal(out.data.finished, false);
  assert.ok(!JSON.stringify(out.data).includes('correct'));

  const bad = await post(cookies[email], { action: 'answer', token: start.data.token, index: 5, choice: 0 });
  assert.equal(bad.code, 409);
  const forged = await post(cookies[email], { action: 'answer', token: start.data.token.slice(0, -3) + 'abc', index: 1, choice: 0 });
  assert.equal(forged.code, 409);
  await db.query('DELETE FROM certificate_attempts WHERE email = $1', [email]);
});

test('first attempt uses fixed set 1; passing and issuing a certificate works end to end', async () => {
  setRequired(builtItems);
  const email = 'ready@example.test';
  const { start, last } = await takeAttempt(email);
  assert.deepEqual(decodeToken(start.data.token).q, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(last.data.finished, true);
  assert.equal(last.data.passed, true);
  assert.equal(last.data.score, 10);

  const noName = await post(cookies[email], { action: 'issue', name: '<script>' });
  assert.equal(noName.code, 400);
  const issued = await post(cookies[email], { action: 'issue', name: '  Ada   Lovelace ' });
  assert.equal(issued.code, 200);
  assert.equal(issued.data.certificate.name, 'Ada Lovelace');
  assert.ok(validCertificateId(issued.data.certificate.id));
  const again = await post(cookies[email], { action: 'issue', name: 'Someone Else' });
  assert.equal(again.code, 409);

  const verified = await get('', { verify: issued.data.certificate.id.toLowerCase() });
  assert.equal(verified.data.valid, true);
  assert.equal(verified.data.name, 'Ada Lovelace');
  assert.deepEqual(Object.keys(verified.data).sort(), ['issuedAt', 'name', 'program', 'valid']);
  assert.equal((await get('', { verify: 'SF-FL-AAAA-BBBB' })).data.valid, false);
  assert.equal((await get('', { verify: "' OR 1=1 --" })).data.valid, false);
});

test('a finished attempt cannot be replayed', async () => {
  setRequired(builtItems);
  const email = 'slacker@example.test';
  const start = await post(cookies[email], { action: 'start' });
  let token = start.data.token;
  const tokens = [token];
  let last;
  for (let i = 0; i < 10; i++){
    const decoded = decodeToken(token);
    last = await post(cookies[email], { action: 'answer', token, index: i + 1, choice: correctChoice(decoded) });
    token = last.data.token; tokens.push(token);
  }
  assert.equal(last.data.passed, true);
  const replay = await post(cookies[email], { action: 'answer', token: tokens[9], index: 10, choice: 0 });
  assert.equal(replay.code, 409);
  assert.equal(replay.data.error, 'attempt_closed');
  await db.query('DELETE FROM certificate_attempts WHERE email = $1', [email]);
});

test('failing locks retries for a while, then the next fixed set is used', async () => {
  setRequired(builtItems);
  const email = 'slacker@example.test';
  const noPass = await post(cookies[email], { action: 'issue', name: 'Slack Er' });
  assert.equal(noPass.code, 403);

  const first = await takeAttempt(email, { right: 0 });
  assert.equal(first.last.data.passed, false);
  assert.equal(first.last.data.score, 0);
  const retry = await post(cookies[email], { action: 'start' });
  assert.equal(retry.code, 429);
  assert.ok(retry.data.retryAt);
  const status = await get(cookies[email]);
  assert.ok(status.data.assessment.retryAt);
  assert.equal(status.data.assessment.lastResult.status, 'failed');

  await db.query("UPDATE certificate_attempts SET finished_at = now() - interval '2 hours' WHERE email = $1", [email]);
  const second = await post(cookies[email], { action: 'start' });
  assert.equal(second.code, 200);
  assert.deepEqual(decodeToken(second.data.token).q, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  const issue = await post(cookies[email], { action: 'issue', name: 'Slack Er' });
  assert.equal(issue.code, 403);

  // walking away from an open attempt counts as a failed one and moves to the next set
  await db.query("UPDATE certificate_attempts SET started_at = now() - interval '2 hours' WHERE email = $1 AND status = 'in_progress'", [email]);
  const third = await post(cookies[email], { action: 'start' });
  assert.equal(third.code, 200);
  assert.deepEqual(decodeToken(third.data.token).q, [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  const rows = (await db.query('SELECT status FROM certificate_attempts WHERE email = $1 ORDER BY id', [email])).rows.map((r) => r.status);
  assert.deepEqual(rows, ['failed', 'failed', 'in_progress']);
});

test('an answer that arrives after the time limit counts as wrong', async () => {
  setRequired(builtItems);
  const email = 'ready@example.test';
  await db.query('DELETE FROM certificates WHERE email = $1', [email]);
  await db.query('DELETE FROM certificate_attempts WHERE email = $1', [email]);
  const start = await post(cookies[email], { action: 'start' });
  const late = decodeToken(start.data.token);
  late.t -= 5 * 60 * 1000;
  const out = await post(cookies[email], { action: 'answer', token: encodeToken(late), index: 1, choice: correctChoice(late) });
  assert.equal(out.code, 200);
  assert.equal(decodeToken(out.data.token).c, 0, 'a correct but late answer scores nothing');
});

test('marking a lab complete records whether its code already ran on the robot', async () => {
  const email = 'newbie@example.test';
  const item = builtItems[0];
  const complete = () => post(cookies[email], { action: 'complete', activityId: item.id }, progress);
  assert.equal((await complete()).code, 200);
  let [row] = (await db.query('SELECT robot_verified FROM progress_completed WHERE email = $1 AND activity_id = $2', [email, item.id])).rows;
  assert.equal(row.robot_verified, false);

  await db.query(
    `INSERT INTO robot_jobs (robot_id, student_email, workspace_path, package, executable, code, code_sha256, status, finished_at)
     VALUES (1, $1, $2, 'pkg', 'exe', 'x', 'sha', 'succeeded', now())`, [email, item.workspaceFile]);
  await complete();
  [row] = (await db.query('SELECT robot_verified FROM progress_completed WHERE email = $1 AND activity_id = $2', [email, item.id])).rows;
  assert.equal(row.robot_verified, true);

  // the robot_jobs row is purged after 90 days, but the recorded run keeps counting
  await db.query('DELETE FROM robot_jobs WHERE student_email = $1', [email]);
  setRequired([item]);
  const status = await get(cookies[email]);
  assert.equal(status.data.labs[0].ran, true);
  setRequired(builtItems);
});

test('an existing completed lab is upgraded once its robot run is seen', async () => {
  const email = 'ready@example.test';
  setRequired(builtItems);
  await get(cookies[email]);
  const rows = (await db.query('SELECT robot_verified FROM progress_completed WHERE email = $1', [email])).rows;
  assert.ok(rows.length > 0 && rows.every((r) => r.robot_verified === true));
});

test('holder names are restricted to plain names', () => {
  assert.equal(cleanHolderName('José O’Neil-Smith'), 'José O’Neil-Smith');
  assert.equal(cleanHolderName('A'), null);
  assert.equal(cleanHolderName('<b>Bob</b>'), null);
  assert.equal(cleanHolderName('x'.repeat(80)), null);
});
