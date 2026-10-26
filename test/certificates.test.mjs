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
const { CURRICULUM } = await import('../portal/data/curriculum.js');
const { requiredLabs, evaluateLabs, labsUnlocked, cleanHolderName, validCertificateId } = await import('../api/_lib/certification.js');

const ORIGIN = 'https://learning.swayform.net';
function response(){
  return { headers: {}, code: 200, setHeader(k, v){ this.headers[k.toLowerCase()] = v; }, status(code){ this.code = code; return this; }, json(data){ this.data = data; return this; } };
}
async function post(cookie, body){
  const res = response();
  await certificates({ method: 'POST', body, headers: { cookie, origin: ORIGIN, 'content-type': 'application/json' }, query: {} }, res);
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
  const insertRuns = async (email, status = 'succeeded', repeat = 1) => {
    for (const [i, item] of builtItems.entries()){
      for (let r = 0; r < repeat; r++){
        await db.query(
          `INSERT INTO robot_jobs (robot_id, student_email, workspace_path, package, executable, code, code_sha256, status, finished_at)
           VALUES (1, $1, $2, 'pkg', 'exe', $3, 'sha', $4, now() - ($5 || ' minutes')::interval)`,
          [email, item.workspaceFile, `CURL_ANGLE = ${60 + i}\nHOLD_SECONDS = 1.5\n`, status, String(100 - i * 5 - r)],
        );
      }
    }
  };
  const complete = async (email) => {
    for (const item of builtItems) await db.query('INSERT INTO progress_completed (email, activity_id) VALUES ($1, $2)', [email, item.id]);
  };
  await complete('ready@example.test'); await insertRuns('ready@example.test', 'succeeded', 2);
  await complete('norobot@example.test'); // marked complete but never ran on the robot
  await complete('slacker@example.test'); await insertRuns('slacker@example.test');
});

test('the real foundation section is locked: placeholders can never be completed', () => {
  setRequired(allItems);
  const labs = evaluateLabs('foundation', new Set(builtItems.map((i) => i.id)), new Set(builtItems.map((i) => i.workspaceFile)));
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

test('assessment hides answers, serves one question at a time, and passes only with enough right', async () => {
  setRequired(builtItems);
  const email = 'ready@example.test';
  const status = await get(cookies[email]);
  assert.equal(status.data.labsUnlocked, true);

  const start = await post(cookies[email], { action: 'start' });
  assert.equal(start.code, 200);
  assert.equal(start.data.question.total, 10);
  assert.equal(start.data.question.index, 1);
  assert.ok(!JSON.stringify(start.data).includes('correctIndex'));

  const [attempt] = (await db.query("SELECT questions FROM certificate_attempts WHERE email = $1", [email])).rows;
  assert.ok(attempt.questions.some((q) => q.personal), 'some questions come from the student’s own robot runs');

  // answering out of order is rejected
  const bad = await post(cookies[email], { action: 'answer', index: 3, choice: 0 });
  assert.equal(bad.code, 409);

  let last;
  for (let i = 0; i < 10; i++){
    last = await post(cookies[email], { action: 'answer', index: i + 1, choice: attempt.questions[i].correctIndex });
    assert.equal(last.code, 200);
    if (i < 9) assert.ok(!JSON.stringify(last.data).includes('correctIndex'));
  }
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
  const fake = await get('', { verify: 'SF-FL-AAAA-BBBB' });
  assert.equal(fake.data.valid, false);
  const junk = await get('', { verify: "' OR 1=1 --" });
  assert.equal(junk.data.valid, false);
});

test('failing the assessment locks retries for a while, and wrong or slow answers do not pass', async () => {
  setRequired(builtItems);
  const email = 'slacker@example.test';
  const noPass = await post(cookies[email], { action: 'issue', name: 'Slack Er' });
  assert.equal(noPass.code, 403);

  await post(cookies[email], { action: 'start' });
  const [attempt] = (await db.query('SELECT questions FROM certificate_attempts WHERE email = $1', [email])).rows;
  let last;
  for (let i = 0; i < 10; i++){
    const wrong = (attempt.questions[i].correctIndex + 1) % attempt.questions[i].options.length;
    last = await post(cookies[email], { action: 'answer', index: i + 1, choice: wrong });
  }
  assert.equal(last.data.passed, false);
  assert.equal(last.data.score, 0);

  const retry = await post(cookies[email], { action: 'start' });
  assert.equal(retry.code, 429);
  assert.ok(retry.data.retryAt);
  const issue = await post(cookies[email], { action: 'issue', name: 'Slack Er' });
  assert.equal(issue.code, 403);
});

test('an answer that arrives after the time limit counts as wrong', async () => {
  setRequired(builtItems);
  const email = 'ready@example.test';
  await db.query('DELETE FROM certificates WHERE email = $1', [email]);
  await db.query("DELETE FROM certificate_attempts WHERE email = $1", [email]);
  await post(cookies[email], { action: 'start' });
  const [attempt] = (await db.query('SELECT id, questions FROM certificate_attempts WHERE email = $1', [email])).rows;
  await db.query("UPDATE certificate_attempts SET question_started_at = now() - interval '5 minutes' WHERE id = $1", [attempt.id]);
  const late = await post(cookies[email], { action: 'answer', index: 1, choice: attempt.questions[0].correctIndex });
  assert.equal(late.code, 200);
  const [row] = (await db.query('SELECT answers FROM certificate_attempts WHERE id = $1', [attempt.id])).rows;
  assert.equal(row.answers[0].correct, false);
  assert.equal(row.answers[0].timedOut, true);
});

test('holder names are restricted to plain names', () => {
  assert.equal(cleanHolderName('José O’Neil-Smith'), 'José O’Neil-Smith');
  assert.equal(cleanHolderName('A'), null);
  assert.equal(cleanHolderName('<b>Bob</b>'), null);
  assert.equal(cleanHolderName('x'.repeat(80)), null);
});
