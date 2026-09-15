import { test } from 'node:test';
import assert from 'node:assert/strict';

function storage(){
  const data = new Map();
  return { get length(){ return data.size; }, key: (i) => [...data.keys()][i], getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();

test('workspace edits are isolated by account and legacy unscoped drafts are discarded', async () => {
  localStorage.setItem('swayform.portal.fs.overrides', JSON.stringify({ 'swayform_ws/test.py': 'legacy personal note' }));
  const fs = await import('../portal/apps/learn/editor/mock-fs.js');
  fs.setWorkspaceAccount({ email: 'a@example.test' });
  assert.equal(fs.readFile('swayform_ws/test.py'), null);
  fs.writeFile('swayform_ws/test.py', 'private A draft');
  fs.setWorkspaceAccount({ email: 'b@example.test' });
  assert.equal(fs.readFile('swayform_ws/test.py'), null);
  fs.setWorkspaceAccount({ email: 'a@example.test' });
  assert.equal(fs.readFile('swayform_ws/test.py'), 'private A draft');
  fs.setWorkspaceAccount({ mode: 'guest' });
  assert.equal(fs.readFile('swayform_ws/test.py'), null);
});

test('failed saves reject, never report false completion, and can recover', async () => {
  let fail = true;
  const remote = new Set();
  globalThis.fetch = async (url, options = {}) => {
    if (url === '/api/auth/session') return { ok: true, json: async () => ({ session: { email: 'a@example.test', mode: 'member' } }) };
    if (options.method === 'POST'){
      if (fail) return { ok: false, status: 500 };
      const body = JSON.parse(options.body);
      if (body.action === 'complete') remote.add(body.activityId);
      if (body.action === 'incomplete') remote.delete(body.activityId);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => ({ completed: [...remote], current: null }) };
  };
  const p = await import('../portal/services/progress-service.js');
  await assert.rejects(p.markComplete('welcome'), /not saved/);
  assert.equal(await p.isActivityComplete('welcome'), false);
  fail = false;
  await Promise.all([p.markComplete('welcome'), p.markIncomplete('welcome')]);
  assert.equal(await p.isActivityComplete('welcome'), false);
  assert.equal(remote.has('welcome'), false);
  await p.markComplete('welcome'); assert.equal(await p.isActivityComplete('welcome'), true);
});

test('failed logout rejects and blocks cached account reopening until retry succeeds', async () => {
  const auth = await import('../portal/services/auth-service.js');
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  await assert.rejects(auth.logout(), /Sign-out/);
  assert.equal(sessionStorage.getItem('swayform.portal.fs.a%40example.test'), null);
  assert.equal(await auth.getSession(), null);
  assert.equal(auth.hasPendingLogout(), true);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ session: null }) });
  await auth.logout(); assert.equal(auth.hasPendingLogout(), false);
});
