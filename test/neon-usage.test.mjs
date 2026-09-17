import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Same approach as portal-security.test.mjs: the production handlers and
// their real SQL run against an isolated PostgreSQL engine. Only the Neon
// transport is replaced — here it also counts queries, because "how many
// database round trips does one poll cost" is the thing under test.
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

const { createSessionCookie } = await import('../api/_lib/session.js');
const { findRoleForEmail } = await import('../api/_lib/db.js');
const { ROBOT_ONLINE_CUTOFF_MS } = await import('../api/_lib/limits.js');
const { default: queue } = await import('../api/robot/queue.js');
const { default: agent } = await import('../api/robot/agent.js');
const { default: status } = await import('../api/robot/status.js');

function request(cookie, body, method = 'POST'){
  return { method, body, headers: { cookie, origin: 'https://learning.swayform.net', 'content-type': 'application/json' }, query: {} };
}
function response(){
  return {
    headers: {}, code: 200,
    setHeader(k, v){ this.headers[k.toLowerCase()] = v; },
    status(code){ this.code = code; return this; },
    json(data){ this.data = data; return this; },
    send(body){ this.body = body; return this; },
  };
}
async function post(handler, cookie, body){ const res = response(); await handler(request(cookie, body), res); return res; }
async function get(handler, cookie, params = {}){
  const req = request(cookie, undefined, 'GET'); req.query = params;
  const res = response(); await handler(req, res); return res;
}
async function agentCall(body, params = {}, method = 'POST'){
  const req = request('', body, method); req.query = params;
  req.headers['x-bridge-secret'] = process.env.BRIDGE_SERVICE_SECRET;
  const res = response(); await agent(req, res); return res;
}
async function insertJob(robotId, email, jobStatus, extra = {}){
  const { rows: [job] } = await db.query(
    `INSERT INTO robot_jobs (robot_id,student_email,workspace_path,package,executable,code,code_sha256,status,queue_position,output,output_total_len)
     VALUES ($1,$2,'lab.py','test','lab','SECRET_STUDENT_CODE','hash',$3,$4,$5,$6) RETURNING id`,
    [robotId, email, jobStatus, extra.position || null, extra.output || null, extra.outputTotalLen || 0]
  );
  return job.id;
}

// Two separate schools: robot 5 (teacher E, students E1 and E2) and robot 6
// (teacher F, student F1), plus a signed-in account that belongs to neither.
let teacherE, stuE1, stuE2, teacherF, stuF1, stranger;
before(async () => {
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO robots (id,serial_number,school_name) VALUES (5,'test-e','School E'),(6,'test-f','School F');
    INSERT INTO admin_accounts (id,robot_id) VALUES (5,5),(6,6);
    INSERT INTO admin_emails (admin_account_id,email,slot) VALUES (5,'teacher-e@example.test',1),(6,'teacher-f@example.test',1);
    INSERT INTO user_profiles (email,display_name,school_name) VALUES
      ('teacher-e@example.test','Teacher E','School E'),('teacher-f@example.test','Teacher F','School F'),
      ('stu-e1@example.test','E One','School E'),('stu-e2@example.test','E Two','School E'),
      ('stu-f1@example.test','F One','School F'),('stranger@example.test','Stranger','Independent');
    INSERT INTO students (robot_id,email,seat_number,status) VALUES
      (5,'stu-e1@example.test',1,'active'),(5,'stu-e2@example.test',2,'active'),(6,'stu-f1@example.test',1,'active');
  `);
  const cookie = async (session) => (await createSessionCookie(session)).split(';')[0];
  teacherE = await cookie({ email: 'teacher-e@example.test', mode: 'admin', robotId: 5 });
  teacherF = await cookie({ email: 'teacher-f@example.test', mode: 'admin', robotId: 6 });
  stuE1 = await cookie({ email: 'stu-e1@example.test', mode: 'student', robotId: 5 });
  stuE2 = await cookie({ email: 'stu-e2@example.test', mode: 'student', robotId: 5 });
  stuF1 = await cookie({ email: 'stu-f1@example.test', mode: 'student', robotId: 6 });
  stranger = await cookie({ email: 'stranger@example.test', mode: 'member' });
});
after(async () => { await db.close(); delete globalThis.__portalTestSql; });

test('the queue list carries summaries only: no code or output leaves the database on a list read', async () => {
  const runningId = await insertJob(5, 'stu-e1@example.test', 'running', { output: 'SECRET_OUTPUT', outputTotalLen: 13 });
  await insertJob(5, 'stu-e2@example.test', 'pending', { position: 1 });
  for (const cookie of [teacherE, stuE1]){
    const list = await get(queue, cookie);
    assert.equal(list.code, 200);
    assert.ok(list.data.jobs.length >= 1);
    for (const job of list.data.jobs){
      assert.equal('code' in job, false);
      assert.equal('output' in job, false);
    }
    assert.equal(JSON.stringify(list.data).includes('SECRET_'), false);
  }
  // A student's list is still only their own jobs; the admin's is the robot's.
  assert.deepEqual((await get(queue, stuE1)).data.jobs.map((j) => j.id), [runningId]);
  const adminList = (await get(queue, teacherE)).data.jobs;
  assert.equal(adminList.length, 2);
  assert.equal(adminList.find((j) => j.id === runningId).outputTotalLen, 13);
  assert.equal((await get(queue, teacherE, { view: 'everything' })).code, 400);
});

test('history in the live list is capped at what the Admin app shows; the CSV export is not', async () => {
  for (let i = 0; i < 20; i++) await insertJob(6, 'stu-f1@example.test', 'succeeded');
  assert.equal((await get(queue, teacherF)).data.jobs.length, 15);
  const csv = await get(queue, teacherF, { format: 'csv' });
  assert.equal(csv.body.trim().split('\r\n').length, 21); // header + all 20
  assert.equal(csv.body.includes('SECRET_'), false);
  assert.equal((await get(queue, stuF1, { format: 'csv' })).code, 403);
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 6');
});

test('pulse is admin-only, counts pending jobs, and its version changes exactly when the visible queue does', async () => {
  assert.equal((await get(queue, stuE1, { view: 'pulse' })).code, 403);
  assert.equal((await get(queue, stranger, { view: 'pulse' })).code, 401);
  assert.equal((await get(queue, '', { view: 'pulse' })).code, 401);

  const first = await get(queue, teacherE, { view: 'pulse' });
  assert.equal(first.code, 200);
  assert.deepEqual(Object.keys(first.data).sort(), ['openCount', 'pendingCount', 'version']);
  assert.equal(first.data.pendingCount, 1);
  assert.equal(first.data.openCount, 2);
  assert.match(first.data.version, /^[0-9a-f]{32}$/);

  // Nothing happened: same version, so the Admin app re-fetches nothing.
  assert.equal((await get(queue, teacherE, { view: 'pulse' })).data.version, first.data.version);
  // Another school's activity is invisible to this robot's pulse.
  const otherSchoolJob = await insertJob(6, 'stu-f1@example.test', 'pending', { position: 1 });
  const unaffected = await get(queue, teacherE, { view: 'pulse' });
  assert.equal(unaffected.data.version, first.data.version);
  assert.equal(unaffected.data.pendingCount, 1);
  await db.query('DELETE FROM robot_jobs WHERE id = $1', [otherSchoolJob]);

  // New output, a new submission, and a status change each move it.
  const seen = new Set([first.data.version]);
  await db.query("UPDATE robot_jobs SET output_total_len = output_total_len + 5 WHERE robot_id = 5 AND status = 'running'");
  const afterOutput = await get(queue, teacherE, { view: 'pulse' });
  assert.equal(seen.has(afterOutput.data.version), false); seen.add(afterOutput.data.version);
  const extra = await insertJob(5, 'stu-e2@example.test', 'pending', { position: 2 });
  const afterSubmit = await get(queue, teacherE, { view: 'pulse' });
  assert.equal(afterSubmit.data.pendingCount, 2);
  assert.equal(seen.has(afterSubmit.data.version), false); seen.add(afterSubmit.data.version);
  await db.query("UPDATE robot_jobs SET status = 'rejected' WHERE id = $1", [extra]);
  const afterReject = await get(queue, teacherE, { view: 'pulse' });
  assert.equal(afterReject.data.pendingCount, 1);
  assert.equal(seen.has(afterReject.data.version), false);
});

test('job view: the owner and the admin of that robot can read it; everyone else gets the same 404', async () => {
  const { rows: [job] } = await db.query("SELECT id FROM robot_jobs WHERE robot_id = 5 AND student_email = 'stu-e1@example.test' AND status = 'running'");
  const view = (cookie, params = {}) => get(queue, cookie, { view: 'job', id: String(job.id), ...params });

  const own = await view(stuE1);
  assert.equal(own.code, 200);
  assert.equal(own.data.job.id, job.id);
  assert.equal(own.data.job.status, 'running');
  assert.equal('code' in own.data.job, false, 'code is only sent when asked for');
  assert.equal((await view(stuE1, { include: 'code' })).data.job.code, 'SECRET_STUDENT_CODE');
  assert.equal((await view(teacherE, { include: 'code' })).data.job.code, 'SECRET_STUDENT_CODE');

  // Same robot but a different student; another school's student; another school's admin.
  for (const cookie of [stuE2, stuF1, teacherF]){
    const denied = await view(cookie, { include: 'code' });
    assert.equal(denied.code, 404);
    assert.deepEqual(denied.data, { error: 'not_found' });
  }
  // Indistinguishable from a job id that does not exist at all.
  assert.deepEqual((await get(queue, stuE2, { view: 'job', id: '99999999' })).data, { error: 'not_found' });
  // No robot membership, or no session: never reaches the job lookup.
  assert.equal((await view(stranger)).code, 401);
  assert.equal((await view('')).code, 401);

  // Client-supplied robot, email, or role parameters are ignored, not trusted.
  const spoofed = await view(stuE2, { robotId: '5', email: 'stu-e1@example.test', studentEmail: 'stu-e1@example.test', role: 'admin' });
  assert.equal(spoofed.code, 404);

  for (const id of ['0', '-1', 'abc', '1.5', '', '1e99']) assert.equal((await get(queue, stuE1, { view: 'job', id })).code, 400);
  assert.equal((await view(stuE1, { sinceLen: '-1' })).code, 400);
  assert.equal((await view(stuE1, { sinceLen: 'x' })).code, 400);

  // A student removed from the class loses access at once, even with a live cookie.
  await db.query("UPDATE students SET status = 'archived', seat_number = NULL WHERE email = 'stu-e1@example.test'");
  assert.equal((await view(stuE1)).code, 401);
  await db.query("UPDATE students SET status = 'active', seat_number = 1 WHERE email = 'stu-e1@example.test'");
  assert.equal((await view(stuE1)).code, 200);
});

test('job view returns only output newer than sinceLen, and says when output was not retained', async () => {
  const id = await insertJob(6, 'stu-f1@example.test', 'succeeded', { output: '0123456789', outputTotalLen: 10 });
  const view = async (params) => (await get(queue, stuF1, { view: 'job', id: String(id), ...params })).data.job;

  const all = await view({});
  assert.equal(all.outputTail, '0123456789'); assert.equal(all.outputTotalLen, 10); assert.equal(all.outputTruncated, false);
  const some = await view({ sinceLen: '7' });
  assert.equal(some.outputTail, '789'); assert.equal(some.outputTruncated, false);
  const none = await view({ sinceLen: '10' });
  assert.equal(none.outputTail, ''); assert.equal(none.outputTruncated, false);
  assert.equal((await view({ sinceLen: '500' })).outputTail, '');

  // 100 characters were written in total but only the last 10 were kept.
  await db.query('UPDATE robot_jobs SET output_total_len = 100 WHERE id = $1', [id]);
  const rolled = await view({ sinceLen: '40' });
  assert.equal(rolled.outputTail, '0123456789'); assert.equal(rolled.outputTruncated, true);
  const recent = await view({ sinceLen: '96' });
  assert.equal(recent.outputTail, '6789'); assert.equal(recent.outputTruncated, false);
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 6');
});

test('a polled read costs one session check, one role lookup, and one data query', async () => {
  const { rows: [job] } = await db.query("SELECT id FROM robot_jobs WHERE robot_id = 5 AND status = 'running'");
  const cost = async (fn) => { const before = queryCount; await fn(); return queryCount - before; };
  assert.equal(await cost(() => get(queue, stuE1, { view: 'job', id: String(job.id) })), 3, 'student job poll (was 6)');
  assert.equal(await cost(() => get(queue, teacherE, { view: 'pulse' })), 3, 'admin pulse (was 4)');
  assert.equal(await cost(() => get(status, stuE1)), 3, 'robot status (was 6 for a student)');
});

test('role lookup keeps its precedence in one query: admin first, then the oldest active seat', async () => {
  assert.deepEqual(await findRoleForEmail(' Teacher-E@example.test '), { role: 'admin', robotId: 5, robotSerial: 'test-e', robotSchoolName: 'School E' });
  assert.deepEqual(await findRoleForEmail('stu-f1@example.test'), { role: 'student', robotId: 6, robotSerial: 'test-f', robotSchoolName: 'School F' });
  assert.equal(await findRoleForEmail('stranger@example.test'), undefined);
  // An admin who is also on a roster is an admin.
  await db.query("INSERT INTO students (robot_id,email,seat_number,status) VALUES (6,'teacher-e@example.test',9,'active')");
  const both = await findRoleForEmail('teacher-e@example.test');
  assert.deepEqual([both.role, both.robotId], ['admin', 5]);
  await db.query("DELETE FROM students WHERE email = 'teacher-e@example.test'");
  // Two active seats: the older one wins, as before.
  await db.query("INSERT INTO students (robot_id,email,seat_number,status,created_at) VALUES (6,'stu-e2@example.test',8,'active', now() - interval '1 year')");
  assert.equal((await findRoleForEmail('stu-e2@example.test')).robotId, 6);
  await db.query("DELETE FROM students WHERE email = 'stu-e2@example.test' AND robot_id = 6");
  // Archived seats do not count.
  await db.query("UPDATE students SET status = 'archived', seat_number = NULL WHERE email = 'stu-e2@example.test'");
  assert.equal(await findRoleForEmail('stu-e2@example.test'), undefined);
  await db.query("UPDATE students SET status = 'active', seat_number = 2 WHERE email = 'stu-e2@example.test'");
});

test('concurrent dispatch requests claim a job exactly once, and never while another is running', async () => {
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 6');
  const a = await insertJob(6, 'stu-f1@example.test', 'approved', { position: 1 });
  const b = await insertJob(6, 'stu-f1@example.test', 'approved', { position: 2 });
  const dispatch = () => agentCall(null, { action: 'dispatch-queue', robotId: '6' }, 'GET');

  // A notification, the presence fallback, and a retry can all land together.
  const burst = await Promise.all([dispatch(), dispatch(), dispatch(), dispatch(), dispatch()]);
  const claimed = burst.flatMap((r) => r.data.jobs.map((j) => j.jobId));
  assert.deepEqual(claimed, [a], 'exactly one request wins, and it gets the first job in queue order');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM robot_jobs WHERE robot_id = 6 AND status = 'running'")).rows[0].n, 1);

  // The second job stays put until the first one really finishes.
  assert.deepEqual((await dispatch()).data.jobs, []);
  assert.equal((await db.query('SELECT status FROM robot_jobs WHERE id = $1', [b])).rows[0].status, 'approved');
  await agentCall({ action: 'job-finished', robotId: 6, jobId: a, exitCode: 0 });
  const next = await Promise.all([dispatch(), dispatch(), dispatch()]);
  assert.deepEqual(next.flatMap((r) => r.data.jobs.map((j) => j.jobId)), [b]);
  // A claimed job's code is handed over once; asking again never replays it.
  assert.deepEqual((await dispatch()).data.jobs, []);
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 6');
});

test('the presence write reports whether an approved job is waiting (the dispatch fallback)', async () => {
  const beat = () => agentCall({ action: 'heartbeat', robotId: 6, online: true, agentVersion: 'test' });
  assert.deepEqual((await beat()).data, { ok: true, hasApproved: false });
  const pending = await insertJob(6, 'stu-f1@example.test', 'pending', { position: 1 });
  assert.equal((await beat()).data.hasApproved, false, 'pending is not dispatchable');
  await db.query("UPDATE robot_jobs SET status = 'approved' WHERE id = $1", [pending]);
  assert.equal((await beat()).data.hasApproved, true);
  // Another robot's approved job is not this robot's business.
  assert.equal((await agentCall({ action: 'heartbeat', robotId: 5, online: true })).data.hasApproved, false);
  assert.equal((await db.query('SELECT is_online, agent_version FROM robots WHERE id = 6')).rows[0].agent_version, 'test');
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 6');
  // Without the bridge secret it is refused outright.
  const res = response();
  await agent(request('', { action: 'heartbeat', robotId: 6, online: true }), res);
  assert.equal(res.code, 401);
});

test('a robot stays online across the once-a-minute presence write, and goes offline past the cutoff or on disconnect', async () => {
  assert.ok(ROBOT_ONLINE_CUTOFF_MS >= 2 * 60_000, 'must tolerate one late 60s presence write');
  const seen = async (secondsAgo, online = true) => {
    await db.query("UPDATE robots SET is_online = $1, last_seen_at = now() - ($2 || ' seconds')::interval WHERE id = 6", [online, String(secondsAgo)]);
    return (await get(status, stuF1)).data.online;
  };
  assert.equal(await seen(5), true);
  assert.equal(await seen(59), true, 'just before the next presence write');
  assert.equal(await seen(100), true, 'one presence write was lost or late');
  assert.equal(await seen(ROBOT_ONLINE_CUTOFF_MS / 1000 + 5), false, 'the bridge itself has gone quiet');
  assert.equal(await seen(1, false), false, 'a disconnect is written immediately and wins regardless of age');
});

test('approving notifies the bridge for that robot only, and still succeeds when the bridge is unreachable', async () => {
  const hits = [];
  const bridge = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    hits.push({ url: req.url, secret: req.headers['x-bridge-secret'], body: JSON.parse(raw || '{}') });
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true, delivered: true }));
  });
  bridge.listen(0, '127.0.0.1'); await once(bridge, 'listening');
  process.env.BRIDGE_URL = `http://127.0.0.1:${bridge.address().port}`;

  const first = await insertJob(6, 'stu-f1@example.test', 'pending', { position: 1 });
  assert.equal((await post(queue, stuF1, { action: 'approve', jobId: first })).code, 403);
  assert.equal(hits.length, 0, 'a refused approve notifies nobody');
  const approved = await post(queue, teacherF, { action: 'approve', jobId: first });
  assert.equal(approved.code, 200); assert.equal(approved.data.dispatchNotified, true);
  assert.deepEqual(hits, [{ url: '/dispatch-notify', secret: process.env.BRIDGE_SERVICE_SECRET, body: { robotId: 6 } }]);
  // The notification names a robot and nothing else: no job, no code.
  assert.equal(JSON.stringify(hits).includes('SECRET_'), false);

  bridge.closeAllConnections();
  await new Promise((resolve) => bridge.close(resolve));
  const second = await insertJob(6, 'stu-f1@example.test', 'pending', { position: 2 });
  const warn = console.warn; const warned = []; console.warn = (line) => warned.push(line);
  try {
    const offline = await post(queue, teacherF, { action: 'approve', jobId: second });
    assert.equal(offline.code, 200); assert.equal(offline.data.dispatchNotified, false);
  } finally { console.warn = warn; }
  assert.equal((await db.query('SELECT status FROM robot_jobs WHERE id = $1', [second])).rows[0].status, 'approved');
  assert.equal(warned.length, 1, 'the missed notification is logged, not swallowed');
  assert.equal(JSON.parse(warned[0]).evt, 'dispatch_notify_failed');
  delete process.env.BRIDGE_URL;
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 6');
});
