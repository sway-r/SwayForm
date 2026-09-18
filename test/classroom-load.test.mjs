import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';

// A full classroom at once: real handlers on an isolated PostgreSQL.
const db = new PGlite();
let queryCount = 0;
function query(strings, ...params){
  queryCount += 1;
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
process.env.BRIDGE_SERVICE_SECRET = 'synthetic-bridge-secret';
process.env.VERCEL_ENV = 'production';
delete process.env.BRIDGE_URL;

const { createSessionCookie } = await import('../api/_lib/session.js');
const { default: queue } = await import('../api/robot/queue.js');
const { default: agent } = await import('../api/robot/agent.js');
const { default: status } = await import('../api/robot/status.js');
const { default: progress } = await import('../api/progress.js');
const { WORKSPACE_FILES } = await import('../portal/data/workspace-files.js');

const STUDENTS = 15;
const WAVE_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const solvedWave = WORKSPACE_FILES[WAVE_PATH].replace('WAVE_CYCLES = 1', 'WAVE_CYCLES = 5');

function request(cookie, body, method = 'POST'){
  return { method, body, headers: { cookie, origin: 'https://learning.swayform.net', 'content-type': 'application/json' }, query: {} };
}
function response(){
  return { headers: {}, code: 200, setHeader(k, v){ this.headers[k.toLowerCase()] = v; }, status(code){ this.code = code; return this; }, json(data){ this.data = data; return this; } };
}
async function post(handler, cookie, body){ const res = response(); await handler(request(cookie, body), res); return res; }
async function get(handler, cookie, params = {}){ const req = request(cookie, undefined, 'GET'); req.query = params; const res = response(); await handler(req, res); return res; }
async function agentCall(body, params = {}, method = 'POST'){
  const req = request('', body, method); req.query = params; req.headers['x-bridge-secret'] = process.env.BRIDGE_SERVICE_SECRET;
  const res = response(); await agent(req, res); return res;
}

let teacher; const students = [];
before(async () => {
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO robots (id,serial_number,school_name,is_online,last_seen_at) VALUES (1,'S1-001','Demo School',true,now());
    INSERT INTO admin_accounts (id,robot_id) VALUES (1,1);
    INSERT INTO admin_emails (admin_account_id,email,slot) VALUES (1,'teacher@example.test',1);
    INSERT INTO user_profiles (email,display_name,school_name) VALUES ('teacher@example.test','Teacher','Demo School');
  `);
  for (let i = 1; i <= STUDENTS; i++){
    await db.query(`INSERT INTO user_profiles (email,display_name,school_name) VALUES ($1,$2,'Demo School')`, [`s${i}@example.test`, `Student ${i}`]);
    await db.query(`INSERT INTO students (robot_id,email,seat_number,status) VALUES (1,$1,$2,'active')`, [`s${i}@example.test`, i]);
    students.push({ email: `s${i}@example.test`, cookie: (await createSessionCookie({ email: `s${i}@example.test`, mode: 'student', robotId: 1 })).split(';')[0] });
  }
  teacher = (await createSessionCookie({ email: 'teacher@example.test', mode: 'admin', robotId: 1 })).split(';')[0];
});
after(async () => { await db.close(); delete globalThis.__portalTestSql; });

test('15 students validating and submitting at the same moment all get a queued job with a unique position', async () => {
  const validations = await Promise.all(students.map((s) => post(queue, s.cookie, { action: 'validate', path: WAVE_PATH, code: solvedWave })));
  assert.ok(validations.every((r) => r.code === 200 && r.data.status === 'complete'));

  const submits = await Promise.all(students.map((s) => post(queue, s.cookie, { action: 'submit', path: WAVE_PATH, code: solvedWave })));
  assert.ok(submits.every((r) => r.code === 200 && r.data.ok), JSON.stringify(submits.map((r) => r.data)));
  const positions = submits.map((r) => r.data.queuePosition);
  assert.equal(new Set(positions).size, STUDENTS, `queue positions must be unique: ${positions}`);

  // Each student's second click inside the cooldown is refused, never a duplicate job.
  const again = await Promise.all(students.map((s) => post(queue, s.cookie, { action: 'submit', path: WAVE_PATH, code: solvedWave })));
  assert.ok(again.every((r) => r.code === 400 && r.data.error === 'cooldown'));
  assert.equal((await db.query("SELECT count(*)::int AS n FROM robot_jobs WHERE status='pending'")).rows[0].n, STUDENTS);

  // The admin's list shows all 15 in queue order, and the badge count matches.
  const pulse = await get(queue, teacher, { view: 'pulse' });
  assert.equal(pulse.data.pendingCount, STUDENTS);
  const list = await get(queue, teacher);
  const listed = list.data.jobs.filter((j) => j.status === 'pending').map((j) => j.queuePosition);
  assert.deepEqual(listed, [...listed].sort((a, b) => a - b));
});

test('everyone watching their own job at once costs 3 queries each and nobody sees anyone else', async () => {
  const jobs = (await db.query('SELECT id, student_email FROM robot_jobs ORDER BY id')).rows;
  const before = queryCount;
  const views = await Promise.all(students.map((s) => {
    const own = jobs.find((j) => j.student_email === s.email);
    return get(queue, s.cookie, { view: 'job', id: String(own.id), sinceLen: '0' });
  }));
  assert.ok(views.every((r) => r.code === 200 && r.data.job.status === 'pending'));
  assert.equal(queryCount - before, STUDENTS * 3);
  // Student 1 asking for student 2's job: 404, same as a job that doesn't exist.
  const other = jobs.find((j) => j.student_email === students[1].email);
  assert.equal((await get(queue, students[0].cookie, { view: 'job', id: String(other.id) })).code, 404);
  // Every student's list is only their own single job.
  const lists = await Promise.all(students.map((s) => get(queue, s.cookie)));
  assert.ok(lists.every((r, i) => r.data.jobs.length === 1 && r.data.jobs[0].studentEmail === students[i].email));
});

test('the robot runs the classroom one job at a time, in queue order, whatever the approve/dispatch timing', async () => {
  const pending = (await db.query("SELECT id FROM robot_jobs WHERE status='pending' ORDER BY queue_position")).rows.map((r) => r.id);
  // The admin approves everything in a burst (bridge unreachable: approve still succeeds).
  const warn = console.warn; console.warn = () => {};
  const approvals = await Promise.all(pending.map((id) => post(queue, teacher, { action: 'approve', jobId: id })));
  console.warn = warn;
  assert.ok(approvals.every((r) => r.code === 200 && r.data.ok));
  assert.equal((await agentCall({ action: 'heartbeat', robotId: 1, online: true })).data.hasApproved, true);

  const ran = [];
  for (let round = 0; round < STUDENTS; round++){
    // Notify, presence fallback and a retry can all ask at the same moment.
    const burst = await Promise.all([1, 2, 3].map(() => agentCall(null, { action: 'dispatch-queue', robotId: '1' }, 'GET')));
    const claimed = burst.flatMap((r) => r.data.jobs);
    assert.equal(claimed.length, 1, `round ${round}: exactly one job claimed`);
    assert.equal(claimed[0].code, solvedWave, 'the robot receives exactly the validated code');
    ran.push(claimed[0].jobId);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM robot_jobs WHERE status='running'")).rows[0].n, 1);
    assert.deepEqual((await agentCall(null, { action: 'dispatch-queue', robotId: '1' }, 'GET')).data.jobs, [], 'nothing else while one is running');
    // The agent streams output in chunks, then exits.
    await agentCall({ action: 'job-started', robotId: 1, jobId: claimed[0].jobId });
    for (let c = 0; c < 5; c++) await agentCall({ action: 'job-output', robotId: 1, jobId: claimed[0].jobId, text: `[INFO] wave cycle ${c}\n` });
    await agentCall({ action: 'job-finished', robotId: 1, jobId: claimed[0].jobId, exitCode: 0 });
  }
  assert.deepEqual(ran, pending, 'served in the order the admin saw them');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM robot_jobs WHERE status='succeeded'")).rows[0].n, STUDENTS);
  assert.equal((await agentCall({ action: 'heartbeat', robotId: 1, online: true })).data.hasApproved, false);

  // Every student can read their own finished output; the admin's history is capped at 15 of the finished ones.
  for (const s of students){
    const own = (await db.query('SELECT id FROM robot_jobs WHERE student_email=$1', [s.email])).rows[0];
    const view = await get(queue, s.cookie, { view: 'job', id: String(own.id) });
    assert.equal(view.data.job.status, 'succeeded');
    assert.match(view.data.job.outputTail, /wave cycle 4/);
  }
  assert.equal((await get(queue, teacher)).data.jobs.length, 15);
});

test('a whole class polling status and progress at once stays within the rate limits and query budget', async () => {
  const before = queryCount;
  const statuses = await Promise.all(students.map((s) => get(status, s.cookie)));
  assert.ok(statuses.every((r) => r.code === 200 && r.data.online === true));
  const progressReads = await Promise.all(students.map((s) => get(progress, s.cookie)));
  assert.ok(progressReads.every((r) => r.code === 200));
  assert.ok(queryCount - before <= STUDENTS * 8, `${queryCount - before} queries for ${STUDENTS} students`);

  // 60 mutations a minute per student is the ceiling; a normal lab session never gets near it.
  const one = students[0];
  let limited = 0;
  for (let i = 0; i < 70; i++){
    const r = await post(queue, one.cookie, { action: 'cancel', jobId: 999999 });
    if (r.code === 429) limited++;
  }
  assert.equal(limited, 12, `60/min per student: 2 submits earlier + 70 here = 12 refused (got ${limited})`);
  // ...and it is per student: the others are unaffected.
  assert.equal((await post(queue, students[1].cookie, { action: 'cancel', jobId: 999999 })).code, 400);
});

test('two simultaneous submits from one student create one job, not two', async () => {
  await db.exec("DELETE FROM robot_jobs");
  const s = students[2];
  const both = await Promise.all([1, 2].map(() => post(queue, s.cookie, { action: 'submit', path: WAVE_PATH, code: solvedWave })));
  assert.deepEqual(both.map((r) => r.code).sort(), [200, 400]);
  assert.equal(both.find((r) => r.code === 400).data.error, 'cooldown');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM robot_jobs WHERE student_email=$1', [s.email])).rows[0].n, 1);
});

test('a job submitted later never runs ahead of one that was already approved', async () => {
  await db.exec("DELETE FROM robot_jobs");
  const warn = console.warn; console.warn = () => {};
  const submit = async (s) => (await post(queue, s.cookie, { action: 'submit', path: WAVE_PATH, code: solvedWave })).data.jobId;
  const a = await submit(students[3]); const b = await submit(students[4]);
  await post(queue, teacher, { action: 'approve', jobId: a });
  await post(queue, teacher, { action: 'approve', jobId: b });
  const claim = async () => (await agentCall(null, { action: 'dispatch-queue', robotId: '1' }, 'GET')).data.jobs.map((j) => j.jobId);
  assert.deepEqual(await claim(), [a]);
  // C arrives while A runs and nothing is pending; it is told it's third in line.
  const third = await post(queue, students[5].cookie, { action: 'submit', path: WAVE_PATH, code: solvedWave });
  assert.equal(third.data.queuePosition, 3);
  // Reordering the pending list doesn't let it jump the approved job either.
  await post(queue, teacher, { action: 'reorder', orderedIds: [third.data.jobId] });
  await post(queue, teacher, { action: 'approve', jobId: third.data.jobId });
  console.warn = warn;
  await agentCall({ action: 'job-finished', robotId: 1, jobId: a, exitCode: 0 });
  assert.deepEqual(await claim(), [b], 'B was approved first and runs first');
  await agentCall({ action: 'job-finished', robotId: 1, jobId: b, exitCode: 0 });
  assert.deepEqual(await claim(), [third.data.jobId]);
  await agentCall({ action: 'job-finished', robotId: 1, jobId: third.data.jobId, exitCode: 0 });
});

test('the queued code is the canonical variant, so its hash is one the robot can derive itself', async () => {
  await db.exec("DELETE FROM robot_jobs");
  const messy = solvedWave.replace('WAVE_CYCLES = 5', 'WAVE_CYCLES = 5   ') + '\n\n';
  const r = await post(queue, students[6].cookie, { action: 'submit', path: WAVE_PATH, code: messy });
  assert.equal(r.code, 200, JSON.stringify(r.data));
  const row = (await db.query('SELECT code, code_sha256 FROM robot_jobs WHERE id=$1', [r.data.jobId])).rows[0];
  assert.equal(row.code, solvedWave);
  assert.equal(row.code_sha256, createHash('sha256').update(solvedWave, 'utf8').digest('hex'));
});

test('Live Robot Session only turns on when no job is open and the robot was actually told', async () => {
  await db.exec("DELETE FROM robot_jobs");
  const idleFlag = async () => (await db.query('SELECT idle_session_enabled AS on FROM robots WHERE id=1')).rows[0].on;
  // No bridge configured in this test process: the robot can't be reached, so "on" is refused and not persisted.
  const unreachable = await post(status, teacher, { action: 'idle-on' });
  assert.equal(unreachable.code, 502);
  assert.equal(await idleFlag(), false);
  // A pending job blocks it outright.
  await post(queue, students[7].cookie, { action: 'submit', path: WAVE_PATH, code: solvedWave });
  const blocked = await post(status, teacher, { action: 'idle-on' });
  assert.equal(blocked.code, 409);
  assert.equal(blocked.data.error, 'job_in_progress');
  // Turning it off always works, and says whether the robot heard it.
  const off = await post(status, teacher, { action: 'idle-off' });
  assert.deepEqual([off.code, off.data.idleSessionEnabled, off.data.delivered], [200, false, false]);
  assert.equal((await post(status, students[7].cookie, { action: 'idle-on' })).code, 403);
});
