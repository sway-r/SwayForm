import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Execute the production handlers and SQL against an isolated PostgreSQL engine.
// Replace only Neon transport; no network, real credentials, or student data.
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
process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@localhost/synthetic';
process.env.SESSION_SECRET = 'test-only-session-secret-not-a-real-credential';
process.env.VERCEL_ENV = 'production';

const { createSessionCookie, readSessionFromRequest } = await import('../api/_lib/session.js');
const { default: admin } = await import('../api/admin.js');
const { default: profile } = await import('../api/profile.js');
const { default: progress } = await import('../api/progress.js');
const { default: logout } = await import('../api/auth/logout.js');
const { requireBrowserMutation } = await import('../api/_lib/browser-security.js');

let teacherCookie, studentCookie, otherCookie;
function request(cookie, body, method = 'POST'){
  return { method, body, headers: { cookie, origin: 'https://learning.swayform.net', 'content-type': 'application/json' }, query: {} };
}
function response(){
  return { headers: {}, code: 200, setHeader(k, v){ this.headers[k.toLowerCase()] = v; }, status(code){ this.code = code; return this; }, json(data){ this.data = data; return this; } };
}
async function call(handler, cookie, body, method){ const res = response(); await handler(request(cookie, body, method), res); return res; }

before(async () => {
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  // Verify the additive migration remains safe after a fresh-schema install.
  await db.exec(await readFile(new URL('../db/migrations/005_portal_privacy.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO robots (id,serial_number,school_name) VALUES (1,'test-a','School A'),(2,'test-b','School B');
    INSERT INTO admin_accounts (id,robot_id) VALUES (1,1),(2,2);
    INSERT INTO admin_emails (admin_account_id,email) VALUES (1,'teacher-a@example.test'),(2,'teacher-b@example.test');
    INSERT INTO user_profiles (email,display_name,school_name) VALUES
      ('teacher-a@example.test','Teacher A','School A'),('student@example.test','Student','Independent'),('other@example.test','Other Student','School B');
    INSERT INTO students (robot_id,email,seat_number,status) VALUES (2,'other@example.test',1,'active');
    INSERT INTO progress_completed (email,activity_id) VALUES ('student@example.test','welcome'),('other@example.test','welcome');
  `);
  teacherCookie = (await createSessionCookie({ email: 'teacher-a@example.test', mode: 'admin', robotId: 1 })).split(';')[0];
  studentCookie = (await createSessionCookie({ email: 'student@example.test', mode: 'member' })).split(';')[0];
  otherCookie = (await createSessionCookie({ email: 'other@example.test', mode: 'student', robotId: 2 })).split(';')[0];
});
after(async () => { await db.close(); delete globalThis.__portalTestSql; });

test('untrusted, missing, and non-JSON browser origins are rejected', () => {
  for (const origin of ['https://evil.example', undefined, 'null']){
    const req = request('', {}); req.headers.origin = origin; const res = response();
    assert.equal(requireBrowserMutation(req, res), false); assert.equal(res.code, 403);
  }
  const req = request('', {}); req.headers['content-type'] = 'application/x-www-form-urlencoded';
  const res = response(); assert.equal(requireBrowserMutation(req, res), false); assert.equal(res.code, 415);
});

test('students cannot read the admin roster', async () => {
  assert.equal((await call(admin, studentCookie, undefined, 'GET')).code, 401);
});

test('adding another school email creates an invitation without exposing progress or relabeling the account', async () => {
  const added = await call(admin, teacherCookie, { action: 'add_student', email: 'other@example.test' });
  assert.equal(added.code, 200); assert.equal(added.data.invited, true);
  const state = await call(admin, teacherCookie, undefined, 'GET');
  assert.equal(state.data.students.length, 0); assert.equal(state.data.invitations.length, 1);
  const rows = await db.query('SELECT school_name FROM user_profiles WHERE email=$1', ['other@example.test']);
  assert.equal(rows.rows[0].school_name, 'School B');
});

test('an invitation is owner-bound and cannot transfer an already-linked student', async () => {
  const { rows: [invite] } = await db.query('SELECT id FROM school_invitations WHERE email=$1', ['other@example.test']);
  assert.equal((await call(profile, studentCookie, { action: 'accept_invitation', invitationId: invite.id })).code, 404);
  assert.equal((await call(profile, otherCookie, { action: 'accept_invitation', invitationId: invite.id })).code, 409);
});

test('a student accepts their own invitation before the admin sees progress; old member cookie refreshes its role', async () => {
  await call(admin, teacherCookie, { action: 'add_student', email: 'student@example.test' });
  const { rows: [invite] } = await db.query('SELECT id FROM school_invitations WHERE email=$1', ['student@example.test']);
  assert.equal((await call(admin, teacherCookie, undefined, 'GET')).data.students.length, 0);
  const accepted = await call(profile, studentCookie, { action: 'accept_invitation', invitationId: invite.id });
  assert.equal(accepted.code, 200, JSON.stringify(accepted.data));
  const state = await call(admin, teacherCookie, undefined, 'GET');
  assert.equal(state.data.students[0].completedCount, 1);
  assert.equal((await readSessionFromRequest(request(studentCookie))).mode, 'student');
});

test('removing a roster entry preserves the personal profile and progress', async () => {
  const state = await call(admin, teacherCookie, undefined, 'GET');
  await call(admin, teacherCookie, { action: 'delete_student', studentId: state.data.students[0].id });
  assert.equal((await db.query('SELECT * FROM user_profiles WHERE email=$1', ['student@example.test'])).rows.length, 1);
  assert.equal((await call(progress, studentCookie, undefined, 'GET')).data.completed.includes('welcome'), true);
});

test('invalid activity IDs and out-of-range steps do not create progress records', async () => {
  for (const body of [
    { action: 'complete', activityId: 'invented-activity' },
    { action: 'current', activityId: 'welcome', stepIndex: -1 },
    { action: 'current', activityId: 'welcome', stepIndex: 999999 },
  ]) assert.equal((await call(progress, studentCookie, body)).code, 400);
});

test('valid progress mutations persist and remain scoped to the signed-in email', async () => {
  const res = await call(progress, studentCookie, { action: 'incomplete', activityId: 'welcome', email: 'other@example.test' });
  assert.equal(res.code, 200);
  assert.deepEqual((await call(progress, studentCookie, undefined, 'GET')).data.completed, []);
  assert.equal((await call(progress, otherCookie, undefined, 'GET')).data.completed.includes('welcome'), true);
  assert.equal(res.headers['cache-control'], 'private, no-store');
});

test('logout revokes the signed cookie server-side; replay is rejected', async () => {
  assert.ok(await readSessionFromRequest(request(studentCookie)));
  const res = await call(logout, studentCookie, {});
  assert.equal(res.code, 200); assert.match(res.headers['set-cookie'], /Max-Age=0/);
  assert.equal(await readSessionFromRequest(request(studentCookie)), null);
});

test('demoted admin cookie does not retain admin permissions', async () => {
  await db.exec("DELETE FROM admin_emails WHERE email='teacher-a@example.test'");
  assert.equal((await call(admin, teacherCookie, undefined, 'GET')).code, 401);
});

const { default: agent } = await import('../api/robot/agent.js');
const { default: queue } = await import('../api/robot/queue.js');
process.env.BRIDGE_SERVICE_SECRET = 'synthetic-bridge-secret';
async function agentCall(body, query = {}, method = 'POST'){
  const req = request('', body, method); req.query = query;
  req.headers['x-bridge-secret'] = process.env.BRIDGE_SERVICE_SECRET;
  const res = response(); await agent(req, res); return res;
}
test('dispatch claims one job before delivery and never replays a running job', async () => {
  await db.exec(`INSERT INTO robot_jobs (robot_id,student_email,workspace_path,package,executable,code,code_sha256,status,queue_position)
    VALUES (2,'other@example.test','test.py','test','test.py','pass','hash','approved',1),
           (2,'other@example.test','test.py','test','test.py','pass','hash','approved',2)`);
  const first = await agentCall(null, { action: 'dispatch-queue', robotId: '2' }, 'GET');
  assert.equal(first.data.jobs.length, 1);
  const id = first.data.jobs[0].jobId;
  assert.equal((await agentCall(null, { action: 'dispatch-queue', robotId: '2' }, 'GET')).data.jobs.length, 0);
  assert.equal((await agentCall({ action: 'job-started', robotId: 1, jobId: id })).code, 400);
  await agentCall({ action: 'job-finished', robotId: 1, jobId: id, exitCode: 0 });
  assert.equal((await db.query('SELECT status FROM robot_jobs WHERE id=$1',[id])).rows[0].status,'running');
  assert.equal((await agentCall({ action: 'job-started', robotId: 2, jobId: id })).code, 200);
  await agentCall({ action: 'job-finished', robotId: 2, jobId: id, exitCode: 0 });
  assert.equal((await agentCall(null, { action: 'dispatch-queue', robotId: '2' }, 'GET')).data.jobs.length, 1);
});
test('even an admin cannot release the physical execution lock with a database-only cancel', async () => {
  const cookie = (await createSessionCookie({email:'teacher-b@example.test',mode:'admin',robotId:2})).split(';')[0];
  const {rows:[job]} = await db.query("SELECT id FROM robot_jobs WHERE robot_id=2 AND status='running'");
  assert.equal((await call(queue,cookie,{action:'cancel',jobId:job.id})).code,400);
  assert.equal((await db.query('SELECT status FROM robot_jobs WHERE id=$1',[job.id])).rows[0].status,'running');
});
test('shared code editor rejects admins of robots without a configured isolated destination', async () => {
  const cookie = (await createSessionCookie({email:'teacher-b@example.test',mode:'admin',robotId:2})).split(';')[0];
  delete process.env.CODE_SERVER_ROBOT_ID;
  assert.equal((await call(admin,cookie,{action:'code-server-token'})).code,403);
});
