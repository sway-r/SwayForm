import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal Web Storage stand-ins; sessionStorage is what a brand-new tab starts without.
function fakeStorage(){
  const map = new Map();
  return {
    get length(){ return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
  };
}
globalThis.localStorage = fakeStorage();
globalThis.sessionStorage = fakeStorage();

const fs = await import('../portal/apps/learn/editor/mock-fs.js');
const auth = await import('../portal/services/auth-service.js');

const WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const HANDSHAKE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/handshake.py';
const alice = { email: 'alice@school.edu' };
const bob = { email: 'bob@school.edu' };

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

test('a draft survives a closed tab: a new tab of the same account reads it back', () => {
  fs.setWorkspaceAccount(alice);
  assert.equal(fs.writeFile(WAVE, 'WAVE_CYCLES = 5'), true);

  sessionStorage.clear(); // the old tab is gone
  fs.setWorkspaceAccount(alice);
  assert.equal(fs.readFile(WAVE), 'WAVE_CYCLES = 5');
  assert.equal(fs.isModified(WAVE), true);
});

test('drafts from the old per-tab storage are adopted once and then removed from it', () => {
  const key = fs.workspaceStorageKey(alice.email);
  sessionStorage.setItem(key, JSON.stringify({ [WAVE]: 'old tab draft' }));
  fs.setWorkspaceAccount(alice);
  assert.equal(fs.readFile(WAVE), 'old tab draft');
  assert.equal(sessionStorage.getItem(key), null);
  assert.deepEqual(JSON.parse(localStorage.getItem(key)), { [WAVE]: 'old tab draft' });
});

test('two tabs editing different files do not overwrite each other', () => {
  const key = fs.workspaceStorageKey(alice.email);
  fs.setWorkspaceAccount(alice);
  fs.writeFile(WAVE, 'tab one');
  // Another tab saves a different file straight to storage.
  localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), [HANDSHAKE]: 'tab two' }));
  fs.writeFile(WAVE, 'tab one, again');
  assert.deepEqual(JSON.parse(localStorage.getItem(key)), { [WAVE]: 'tab one, again', [HANDSHAKE]: 'tab two' });
  assert.equal(fs.readFile(HANDSHAKE), 'tab two');
});

test('reset restores the starter file and the reset itself persists', () => {
  fs.setWorkspaceAccount(alice);
  fs.writeFile(WAVE, 'changed');
  fs.resetFile(WAVE);
  fs.setWorkspaceAccount(alice);
  assert.equal(fs.isModified(WAVE), false);
  fs.writeFile(WAVE, 'changed');
  fs.writeFile(HANDSHAKE, 'changed');
  fs.resetAll();
  fs.setWorkspaceAccount(alice);
  assert.equal(fs.isModified(WAVE) || fs.isModified(HANDSHAKE), false);
});

test("one account never opens another's drafts", () => {
  fs.setWorkspaceAccount(alice);
  fs.writeFile(WAVE, 'alice only');
  fs.setWorkspaceAccount(bob);
  assert.equal(fs.isModified(WAVE), false);
});

test("signing in keeps that account's drafts and removes everyone else's; signing out removes them all", async () => {
  fs.setWorkspaceAccount(alice);
  fs.writeFile(WAVE, 'alice');
  fs.setWorkspaceAccount(bob);
  fs.writeFile(WAVE, 'bob');

  globalThis.fetch = async (url) => {
    if (url === '/api/auth/google') return new Response(JSON.stringify({ session: alice }), { status: 200 });
    if (url === '/api/auth/logout') return new Response('{}', { status: 200 });
    return new Response(JSON.stringify({ session: null }), { status: 200 });
  };
  await auth.loginWithGoogle('credential');
  assert.notEqual(localStorage.getItem(fs.workspaceStorageKey(alice.email)), null, 'a returning student keeps their work');
  assert.equal(localStorage.getItem(fs.workspaceStorageKey(bob.email)), null, "the previous person's drafts do not linger");

  await auth.logout();
  assert.equal(localStorage.getItem(fs.workspaceStorageKey(alice.email)), null);
  delete globalThis.fetch;
});
