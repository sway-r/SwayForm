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
process.env.SWAYFORM_DB_METRICS = 'off'; // keep per-read log lines out of test output
process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@localhost/synthetic';
process.env.SESSION_SECRET = 'test-only-session-secret-not-a-real-credential';
process.env.VERCEL_ENV = 'production';

const { createSessionCookie, readSessionFromRequest } = await import('../api/_lib/session.js');
const { default: admin } = await import('../api/admin.js');
const { default: profile } = await import('../api/profile.js');
const { default: progress } = await import('../api/progress.js');
const { default: logout } = await import('../api/auth/logout.js');
const { requireBrowserMutation } = await import('../api/_lib/browser-security.js');

let teacherCookie, studentCookie, otherCookie, teacherCCookie;
function request(cookie, body, method = 'POST'){
  return { method, body, headers: { cookie, origin: 'https://learning.swayform.net', 'content-type': 'application/json' }, query: {} };
}
function response(){
  return { headers: {}, code: 200, setHeader(k, v){ this.headers[k.toLowerCase()] = v; }, status(code){ this.code = code; return this; }, json(data){ this.data = data; return this; } };
}
async function call(handler, cookie, body, method){ const res = response(); await handler(request(cookie, body, method), res); return res; }

before(async () => {
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  // Verify these additive migrations remain safe after a fresh-schema install.
  await db.exec(await readFile(new URL('../db/migrations/005_portal_privacy.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../db/migrations/006_robot_job_output_counter.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../db/migrations/007_admin_email_slots.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO robots (id,serial_number,school_name) VALUES (1,'test-a','School A'),(2,'test-b','School B'),(3,'test-c','School C');
    INSERT INTO admin_accounts (id,robot_id) VALUES (1,1),(2,2),(3,3);
    INSERT INTO admin_emails (admin_account_id,email,slot) VALUES (1,'teacher-a@example.test',1),(2,'teacher-b@example.test',1),(3,'teacher-c@example.test',1);
    INSERT INTO user_profiles (email,display_name,school_name) VALUES
      ('teacher-a@example.test','Teacher A','School A'),('student@example.test','Student','Independent'),('other@example.test','Other Student','School B'),('teacher-c@example.test','Teacher C','School C');
    INSERT INTO students (robot_id,email,seat_number,status) VALUES (2,'other@example.test',1,'active');
    INSERT INTO progress_completed (email,activity_id) VALUES ('student@example.test','welcome'),('other@example.test','welcome');
  `);
  teacherCookie = (await createSessionCookie({ email: 'teacher-a@example.test', mode: 'admin', robotId: 1 })).split(';')[0];
  studentCookie = (await createSessionCookie({ email: 'student@example.test', mode: 'member' })).split(';')[0];
  otherCookie = (await createSessionCookie({ email: 'other@example.test', mode: 'student', robotId: 2 })).split(';')[0];
  // Robot 3 is fully separate from 1/2 — used only by the queue-view tests
  // near the end of this file, which insert 50+ job rows and must not
  // disturb robot 1/2's job history that earlier tests already depend on.
  teacherCCookie = (await createSessionCookie({ email: 'teacher-c@example.test', mode: 'admin', robotId: 3 })).split(';')[0];
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

test('concurrent set_admin_email requests for the same empty slot cannot create a duplicate admin', async () => {
  const cookie = (await createSessionCookie({ email: 'teacher-b@example.test', mode: 'admin', robotId: 2 })).split(';')[0];
  // Same reproduction shape as a real race: two requests for the SAME
  // still-empty slot fired together, both allowed to interleave their own
  // internal awaits (read, then decide, then write) via Promise.all —
  // exactly the window the old read-then-insert code left open.
  const [r1, r2] = await Promise.all([
    call(admin, cookie, { action: 'set_admin_email', slot: 2, email: 'concurrent-a@example.test' }),
    call(admin, cookie, { action: 'set_admin_email', slot: 2, email: 'concurrent-b@example.test' }),
  ]);
  assert.equal(r1.code, 200);
  assert.equal(r2.code, 200);
  const rows = await db.query(
    "SELECT ae.email FROM admin_emails ae JOIN admin_accounts aa ON aa.id = ae.admin_account_id WHERE aa.robot_id = 2 AND ae.slot = 2"
  );
  // Exactly one row for (this account, slot 2) ever exists, regardless of
  // which request's write landed last — the unique index on
  // (admin_account_id, slot) plus ON CONFLICT DO UPDATE guarantees it.
  assert.equal(rows.rows.length, 1);
  assert.ok(['concurrent-a@example.test', 'concurrent-b@example.test'].includes(rows.rows[0].email));
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
test('a student cannot reconcile a stuck running job, but an admin can — and it releases the execution lock', async () => {
  const adminCookie = (await createSessionCookie({email:'teacher-b@example.test',mode:'admin',robotId:2})).split(';')[0];
  const {rows:[job]} = await db.query("SELECT id FROM robot_jobs WHERE robot_id=2 AND status='running'");
  assert.equal((await call(queue,otherCookie,{action:'reconcile',jobId:job.id})).code,403);
  assert.equal((await db.query('SELECT status FROM robot_jobs WHERE id=$1',[job.id])).rows[0].status,'running');
  const reconciled = await call(queue,adminCookie,{action:'reconcile',jobId:job.id});
  assert.equal(reconciled.code,200);
  assert.equal((await db.query('SELECT status FROM robot_jobs WHERE id=$1',[job.id])).rows[0].status,'failed');
  assert.equal((await db.query("SELECT action FROM portal_audit_events WHERE robot_id=2 ORDER BY id DESC LIMIT 1")).rows[0].action,'reconcile_job');
  // The one-running-job-per-robot lock is now actually released.
  await db.query(`INSERT INTO robot_jobs (robot_id,student_email,workspace_path,package,executable,code,code_sha256,status,queue_position)
    VALUES (2,'other@example.test','test.py','test','test.py','pass','hash2','approved',3)`);
  assert.equal((await agentCall(null, { action: 'dispatch-queue', robotId: '2' }, 'GET')).data.jobs.length, 1);
});
test('shared code editor rejects admins of robots without a configured isolated destination', async () => {
  const cookie = (await createSessionCookie({email:'teacher-b@example.test',mode:'admin',robotId:2})).split(';')[0];
  delete process.env.CODE_SERVER_ROBOT_ID;
  assert.equal((await call(admin,cookie,{action:'code-server-token'})).code,403);
});

test('the queue view always includes every non-terminal job, even past the 50-newest-submission window', async () => {
  const { rows: [oldRunning] } = await db.query(
    `INSERT INTO robot_jobs (robot_id,student_email,workspace_path,package,executable,code,code_sha256,status,submitted_at)
     VALUES (3,'other@example.test','old.py','test','old','pass','hash-old','running', now() - interval '1 day')
     RETURNING id`
  );
  for (let i = 0; i < 50; i++){
    await db.query(
      `INSERT INTO robot_jobs (robot_id,student_email,workspace_path,package,executable,code,code_sha256,status)
       VALUES (3,'other@example.test',$1,'test',$1,'pass',$2,'succeeded')`,
      [`newer${i}.py`, `hash-newer-${i}`]
    );
  }
  const state = await call(queue, teacherCCookie, undefined, 'GET');
  assert.equal(state.code, 200);
  assert.ok(
    state.data.jobs.some((j) => j.id === oldRunning.id && j.status === 'running'),
    'a running job must never be pushed out of the queue view by 50 newer finished jobs'
  );
  // Clean up so the next test in this block starts from a known state.
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 3');
});

test('reordering pending jobs changes the order the queue view returns them in', async () => {
  const ids = [];
  for (const name of ['a.py', 'b.py', 'c.py']){
    const { rows: [job] } = await db.query(
      `INSERT INTO robot_jobs (robot_id,student_email,workspace_path,package,executable,code,code_sha256,status,queue_position)
       VALUES (3,'other@example.test',$1,'test',$1,'pass',$2,'pending', (SELECT COALESCE(MAX(queue_position),0)+1 FROM robot_jobs WHERE robot_id=3))
       RETURNING id`,
      [name, `hash-${name}`]
    );
    ids.push(job.id);
  }
  const [aId, bId, cId] = ids; // submitted in order a, b, c — starts displayed as a, b, c
  const reordered = await call(queue, teacherCCookie, { action: 'reorder', orderedIds: [cId, aId, bId] });
  assert.equal(reordered.code, 200);
  const state = await call(queue, teacherCCookie, undefined, 'GET');
  const pendingIdsInOrder = state.data.jobs.filter((j) => j.status === 'pending').map((j) => j.id);
  assert.deepEqual(pendingIdsInOrder, [cId, aId, bId], 'the view must reflect the saved queue_position order, not submission time');
  await db.query('DELETE FROM robot_jobs WHERE robot_id = 3');
});

test('reactivating an archived student is not blocked by the 40-total roster cap', async () => {
  await db.exec(`
    INSERT INTO robots (id,serial_number,school_name) VALUES (4,'test-d','School D');
    INSERT INTO admin_accounts (id,robot_id) VALUES (4,4);
    INSERT INTO admin_emails (admin_account_id,email,slot) VALUES (4,'teacher-d@example.test',1);
    INSERT INTO user_profiles (email,display_name,school_name) VALUES ('teacher-d@example.test','Teacher D','School D');
  `);
  for (let i = 0; i < 40; i++){
    await db.query(
      `INSERT INTO user_profiles (email,display_name,school_name) VALUES ($1,$2,'School D')`,
      [`archived${i}@example.test`, `Archived ${i}`]
    );
    await db.query(`INSERT INTO students (robot_id,email,status) VALUES (4,$1,'archived')`, [`archived${i}@example.test`]);
  }
  const teacherDCookie = (await createSessionCookie({ email: 'teacher-d@example.test', mode: 'admin', robotId: 4 })).split(';')[0];
  // Roster is already at the 40-total cap (all archived, zero active) —
  // re-inviting one of those SAME students must still succeed, since
  // accepting just reactivates their existing row rather than adding a new
  // one.
  const result = await call(admin, teacherDCookie, { action: 'add_student', email: 'archived0@example.test' });
  assert.equal(result.code, 200);
  assert.equal(result.data.invited, true);
  // A genuinely NEW 41st student is still correctly refused.
  await db.query(`INSERT INTO user_profiles (email,display_name,school_name) VALUES ('new-student@example.test','New Student','School D')`);
  const blocked = await call(admin, teacherDCookie, { action: 'add_student', email: 'new-student@example.test' });
  assert.equal(blocked.code, 400);
  assert.equal(blocked.data.error, 'total_limit');
});
