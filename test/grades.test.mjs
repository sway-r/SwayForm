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
const { default: progress } = await import('../api/progress.js');
const { default: admin } = await import('../api/admin.js');
const { QUIZZES, findQuiz } = await import('../portal/data/quizzes.js');

function request(cookie, body, method = 'POST', query = {}){
  return { method, body, query, headers: { cookie, origin: 'https://learning.swayform.net', 'content-type': 'application/json' } };
}
function response(){
  return { headers: {}, code: 200, setHeader(k, v){ this.headers[k.toLowerCase()] = v; }, status(code){ this.code = code; return this; }, json(data){ this.data = data; return this; } };
}
async function call(handler, req){ const res = response(); await handler(req, res); return res; }
const cookie = async (email, mode) => (await createSessionCookie({ email, mode, robotId: 1 })).split(';')[0];

let teacher, ana, ben;
before(async () => {
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO robots (id,serial_number,school_name) VALUES (1,'S1-001','Demo School');
    INSERT INTO admin_accounts (id,robot_id) VALUES (1,1);
    INSERT INTO admin_emails (admin_account_id,email,slot) VALUES (1,'teacher@example.test',1);
    INSERT INTO user_profiles (email,display_name,school_name) VALUES
      ('teacher@example.test','Teacher','Demo School'),('ana@example.test','Ana','Demo School'),('ben@example.test','Ben','Demo School');
    INSERT INTO students (robot_id,email,seat_number,status) VALUES (1,'ana@example.test',1,'active'),(1,'ben@example.test',2,'active');
  `);
  teacher = await cookie('teacher@example.test', 'admin');
  ana = await cookie('ana@example.test', 'student');
  ben = await cookie('ben@example.test', 'student');
});

test('the quiz list holds every quiz in the course, in order', () => {
  assert.deepEqual(QUIZZES.map((q) => q.id), ['wv-03-functions', 'wv-06-final-quiz', 'hs-05-quiz', 'fb-10-quiz']);
  assert.equal(findQuiz('hs-05-quiz').count, 10);
});

test('a finished try is saved with its score, and a bad one is refused', async () => {
  const quiz = findQuiz('hs-05-quiz');
  assert.equal((await call(progress, request(ana, { action: 'quiz_result', quizId: quiz.id, correct: 6, total: 10 }))).data.percent, 60);
  assert.equal((await call(progress, request(ana, { action: 'quiz_result', quizId: quiz.id, correct: 10, total: 10 }))).code, 200);
  assert.equal((await call(progress, request(ana, { action: 'quiz_result', quizId: quiz.id, correct: 11, total: 10 }))).code, 400);
  assert.equal((await call(progress, request(ana, { action: 'quiz_result', quizId: quiz.id, correct: 2, total: 4 }))).code, 400, 'a try is the quiz\'s own length');
  assert.equal((await call(progress, request(ana, { action: 'quiz_result', quizId: 'made-up', correct: 1, total: 1 }))).code, 400);
  const mine = (await call(progress, request(ana, undefined, 'GET', { view: 'grades' }))).data.quizResults;
  assert.equal(mine.length, 1);
  assert.deepEqual([mine[0].best, mine[0].last, mine[0].attempts, mine[0].passed], [100, 100, 2, true]);
  assert.deepEqual(mine[0].tries.map((t) => t.percent), [60, 100]);
});

test('a student sees only their own grades', async () => {
  await call(progress, request(ben, { action: 'quiz_result', quizId: 'wv-03-functions', correct: 7, total: 10 }));
  const bens = (await call(progress, request(ben, undefined, 'GET', { view: 'grades' }))).data.quizResults;
  assert.deepEqual(bens.map((r) => [r.quizId, r.best, r.passed]), [['wv-03-functions', 70, false]]);
  assert.equal((await call(admin, request(ben, undefined, 'GET', { view: 'grades' }))).code, 401, 'students cannot open the class view');
});

test('the teacher sees every active student\'s scores, labs and current lab', async () => {
  await call(progress, request(ana, { action: 'complete', activityId: 'wv-01-intro' }));
  await call(progress, request(ana, { action: 'current', activityId: 'wv-02-imports-settings', stepIndex: 1 }));
  const res = await call(admin, request(teacher, undefined, 'GET', { view: 'grades' }));
  assert.equal(res.code, 200);
  const [a, b] = res.data.students;
  assert.deepEqual([a.email, a.name, a.completed, a.current.activityId], ['ana@example.test', 'Ana', ['wv-01-intro'], 'wv-02-imports-settings']);
  assert.equal(a.quizResults[0].best, 100);
  assert.deepEqual(b.quizResults.map((r) => r.best), [70]);
});
