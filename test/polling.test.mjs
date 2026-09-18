import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Fake clock, document and fetch, so a day of polling replays in milliseconds.
function makeDocument(){
  const listeners = new Map();
  return {
    visibilityState: 'visible',
    addEventListener(type, fn){ if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn){ listeners.get(type)?.delete(fn); },
    listenerCount(){ return [...listeners.values()].reduce((n, set) => n + set.size, 0); },
    emit(type){ (listeners.get(type) || []).forEach((fn) => fn()); },
    setVisibility(state){ this.visibilityState = state; this.emit('visibilitychange'); },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
async function advance(ms, step = 250){
  for (let t = 0; t < ms; t += step){ mock.timers.tick(Math.min(step, ms - t)); await flush(); }
}
function jsonResponse(status, data){ return { ok: status >= 200 && status < 300, status, json: async () => data }; }

beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  globalThis.document = makeDocument();
  globalThis.window = makeDocument();
});
afterEach(() => {
  mock.timers.reset();
  delete globalThis.document; delete globalThis.window; delete globalThis.fetch;
});

const { createPoller, STOP, hiddenDelayMs } = await import('../portal/services/adaptive-poller.js');
const { watchJob } = await import('../portal/services/job-watch.js');

test('poller: a slow response never causes overlapping requests', async () => {
  let active = 0, maxActive = 0, started = 0;
  const releases = [];
  const poller = createPoller({
    delayMs: () => 1000,
    task: () => { started++; active++; maxActive = Math.max(maxActive, active); return new Promise((resolve) => releases.push(() => { active--; resolve(); })); },
  });
  poller.start();
  await advance(10_000); // the first request is still pending the whole time
  assert.equal(started, 1);
  poller.now(); poller.now(); poller.now(); // "refresh now" while one is in flight
  await flush();
  assert.equal(started, 1);
  releases.shift()(); await flush();
  assert.equal(started, 2, 'exactly one follow-up run, however many times it was asked');
  releases.shift()(); await flush();
  await advance(1000);
  assert.equal(started, 3, 'then back to the normal cadence');
  assert.equal(maxActive, 1);
  poller.stop();
});

test('poller: stop() leaves no timer or listener behind, and a late response is ignored', async () => {
  let runs = 0, release;
  const poller = createPoller({ delayMs: () => 1000, task: () => { runs++; return new Promise((resolve) => { release = resolve; }); } });
  poller.start();
  assert.equal(document.listenerCount() + window.listenerCount(), 2);
  poller.stop();
  release(); await flush();
  await advance(60_000);
  assert.equal(runs, 1, 'the response arriving after stop() did not schedule another run');
  assert.equal(document.listenerCount() + window.listenerCount(), 0);
  assert.equal(poller.stopped, true);
});

test('poller: failures are reported and back off exponentially, then recover to the normal cadence', async () => {
  const runAt = [], errors = [];
  let failing = true;
  const poller = createPoller({
    delayMs: () => 5000,
    onError: (error, failures) => errors.push(failures),
    task: async () => { runAt.push(Date.now()); if (failing) throw new Error('server down'); },
  });
  const t0 = Date.now();
  poller.start(); await flush();
  await advance(10 * 60_000, 1000);
  const gaps = runAt.map((t, i) => (i ? t - runAt[i - 1] : t - t0)).slice(1);
  assert.deepEqual(gaps.slice(0, 5), [10_000, 20_000, 40_000, 80_000, 120_000], 'doubling, capped at two minutes');
  assert.deepEqual(errors.slice(0, 3), [1, 2, 3], 'every failure reaches onError; none are swallowed');
  assert.ok(runAt.length <= 9, `a dead server gets a handful of requests in ten minutes, not 120 (saw ${runAt.length})`);

  failing = false;
  await advance(121_000, 1000);
  const recoveredAt = runAt.length;
  await advance(20_000, 1000);
  assert.equal(runAt.length - recoveredAt, 4, 'back to every 5s once it works again');
  poller.stop();
});

test('poller: a hidden tab slows to once a minute, then every five minutes, and catches up when visible again', async () => {
  let runs = 0;
  const poller = createPoller({ delayMs: () => 5000, whenHidden: 'slow', task: async () => { runs++; } });
  poller.start(); await flush();
  await advance(60_000, 1000);
  assert.equal(runs, 13, 'visible: every 5s');

  document.setVisibility('hidden'); await flush();
  runs = 0;
  await advance(30 * 60_000, 5000);
  assert.ok(runs >= 29 && runs <= 31, `hidden: about once a minute (saw ${runs} in 30 minutes)`);
  runs = 0;
  await advance(8 * 60 * 60_000, 30_000);
  assert.ok(runs >= 94 && runs <= 97, `left open overnight: every five minutes (saw ${runs} in 8 hours, was 5,760 at 5s)`);
  assert.equal(hiddenDelayMs(0), 60_000); assert.equal(hiddenDelayMs(31 * 60_000), 5 * 60_000);

  await advance(60_000, 1000); // some way into a five-minute gap
  runs = 0;
  document.setVisibility('visible'); await flush();
  assert.equal(runs, 1, 'refreshes immediately on return');
  await advance(10_000, 1000);
  assert.equal(runs, 3, 'and resumes the visible cadence');

  // Clicking back into the window right after a poll does not fire another one.
  window.emit('focus'); window.emit('focus'); await flush();
  assert.equal(runs, 3);
  poller.stop();
});

test("poller: 'pause' makes no requests at all while hidden or while its window is minimized", async () => {
  let runs = 0, minimized = false;
  const poller = createPoller({ delayMs: () => 15_000, whenHidden: 'pause', isRelevant: () => !minimized, task: async () => { runs++; } });
  poller.start(); await flush();
  assert.equal(runs, 1);

  document.setVisibility('hidden'); await flush();
  await advance(60 * 60_000, 60_000);
  assert.equal(runs, 1, 'hidden for an hour: nothing');
  document.setVisibility('visible'); await flush();
  assert.equal(runs, 2);

  minimized = true;
  await advance(10 * 60_000, 1000);
  assert.equal(runs, 3, 'at most the one run already scheduled before it was minimized');
  minimized = false;
  await advance(3000, 500);
  assert.equal(runs, 4, 'back on screen: refreshed within a couple of seconds, with no event needed');
  poller.stop();
});

test('poller: returning STOP from the task ends the loop', async () => {
  let runs = 0;
  const poller = createPoller({ delayMs: () => 1000, task: async () => (++runs === 3 ? STOP : null) });
  poller.start(); await flush();
  await advance(60_000);
  assert.equal(runs, 3);
  assert.equal(poller.stopped, true);
});

// ── the student's job watcher ──────────────────────────────────────────────
function jobServer(script){
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(url);
    const next = script.length > 1 ? script.shift() : script[0];
    if (next instanceof Error) throw next;
    return typeof next === 'number' ? jsonResponse(next, {}) : jsonResponse(200, { job: { id: 7, rejectReason: null, outputTruncated: false, outputTail: '', outputTotalLen: 0, ...next } });
  };
  return requests;
}

test('job watch: asks for one job and only unseen output, and stops the moment the job is finished', async () => {
  const requests = jobServer([
    { status: 'pending' },
    { status: 'approved' },
    { status: 'running', outputTotalLen: 5, outputTail: 'hello' },
    { status: 'running', outputTotalLen: 11, outputTail: ' world' },
    { status: 'succeeded', outputTotalLen: 11 },
    { status: 'succeeded', outputTotalLen: 11 },
  ]);
  const events = [];
  watchJob(7, { onStatus: (s) => events.push(`status:${s}`), onOutput: (text) => events.push(`out:${text}`) });
  await flush();
  await advance(60_000, 500);

  assert.deepEqual(events, ['status:approved', 'status:running', 'out:hello', 'out: world', 'status:succeeded']);
  assert.equal(requests.length, 5, 'no request is made after the terminal status');
  assert.deepEqual(requests, [
    '/api/robot/queue?view=job&id=7&sinceLen=0',
    '/api/robot/queue?view=job&id=7&sinceLen=0',
    '/api/robot/queue?view=job&id=7&sinceLen=0',
    '/api/robot/queue?view=job&id=7&sinceLen=5',
    '/api/robot/queue?view=job&id=7&sinceLen=11',
  ]);
  await advance(10 * 60_000, 5000);
  assert.equal(requests.length, 5);
});

test('job watch: waiting for review eases off instead of polling every 3s all afternoon', async () => {
  const requests = jobServer([{ status: 'pending' }]);
  const watch = watchJob(7, { onStatus(){}, onOutput(){} });
  await flush();
  await advance(60 * 60_000, 1000);
  // 2 min at 5s + 28 min at 15s + 30 min at 60s, versus 1,200 at a fixed 3s.
  assert.ok(requests.length >= 160 && requests.length <= 172, `saw ${requests.length} requests in an hour`);
  watch.stop();
  const settled = requests.length;
  await advance(10 * 60_000, 5000);
  assert.equal(requests.length, settled, 'closing the editor ends it');
});

test('job watch: a job that is gone ends the loop; an outage is reported once, retried, and recovery is announced', async () => {
  let requests = jobServer([{ status: 'pending' }, 404]);
  const gone = [];
  watchJob(7, { onStatus(){}, onOutput(){}, onGone: (reason) => gone.push(reason) });
  await flush(); await advance(60_000, 1000);
  assert.deepEqual(gone, ['not_found']);
  assert.equal(requests.length, 2, 'a 404 is not retried forever');

  requests = jobServer([{ status: 'pending' }, 500, new Error('offline'), { status: 'approved' }, { status: 'failed' }]);
  const log = [];
  watchJob(7, {
    onStatus: (s) => log.push(`status:${s}`), onOutput(){},
    onError: (e, failures) => log.push(`error:${failures}`), onRecovered: () => log.push('recovered'),
  });
  await flush(); await advance(5 * 60_000, 1000);
  assert.deepEqual(log, ['error:1', 'error:2', 'recovered', 'status:approved', 'status:failed']);
  assert.equal(requests.length, 5);
});

// ── the shared admin queue service ─────────────────────────────────────────
test('queue service: the badge alone never downloads the list; an open Admin app gets it only when the queue changes', async () => {
  const state = { pendingCount: 2, openCount: 2, version: 'v1', fail: false };
  const hits = { pulse: 0, list: 0 };
  globalThis.fetch = async (url) => {
    if (state.fail) return jsonResponse(500, {});
    if (url === '/api/robot/queue?view=pulse'){ hits.pulse++; return jsonResponse(200, { pendingCount: state.pendingCount, openCount: state.openCount, version: state.version }); }
    if (url === '/api/robot/queue'){ hits.list++; return jsonResponse(200, { jobs: [{ id: 1, status: 'pending', version: state.version }] }); }
    throw new Error(`unexpected request: ${url}`);
  };
  const service = await import('../portal/services/robot-jobs-service.js');
  const warn = console.warn; console.warn = () => {};

  const counts = [];
  service.onPendingCountChange((n) => counts.push(n));
  service.startAdminJobWatch(); await flush();
  await advance(5 * 60_000, 1000);
  assert.deepEqual(counts, [2]);
  assert.equal(hits.list, 0, 'badge only: count, never the list');
  assert.equal(hits.pulse, 11, 'every 30s, not every 15s');

  // Admin app opens.
  const renders = [], errors = [];
  let viewing = true;
  const unsubscribe = service.subscribeQueue({ onJobs: (jobs) => renders.push(jobs[0].version), onError: () => errors.push(1), isViewing: () => viewing });
  await flush();
  assert.deepEqual(renders, ['v1']);
  hits.pulse = 0;
  await advance(5 * 60_000, 1000);
  assert.equal(hits.list, 1, 'five quiet minutes: the list was not fetched again');
  assert.ok(hits.pulse >= 20 && hits.pulse <= 24, `pending-only and unchanged settles at 15s (saw ${hits.pulse})`);

  // A student submits: the next pulse notices, and only then is the list reloaded.
  state.version = 'v2'; state.pendingCount = 3; state.openCount = 3;
  await advance(16_000, 1000);
  assert.deepEqual(renders, ['v1', 'v2']);
  assert.deepEqual(counts, [2, 3]);
  assert.equal(hits.list, 2);

  // After the admin's own action: refresh now, resolved only once it is on screen.
  state.version = 'v3'; state.pendingCount = 2; state.openCount = 3; // one job approved -> fast cadence
  await service.refreshQueueNow();
  assert.deepEqual(renders, ['v1', 'v2', 'v3']);
  hits.pulse = 0;
  await advance(30_000, 1000);
  assert.ok(hits.pulse >= 5 && hits.pulse <= 7, `a job is approved/running: every 5s (saw ${hits.pulse} in 30s)`);
  assert.equal(hits.list, 3);

  // An outage is surfaced to the panel, and recovery re-renders it even though nothing changed.
  state.fail = true;
  await advance(30_000, 1000);
  assert.ok(errors.length >= 1);
  state.fail = false;
  await advance(3 * 60_000, 1000);
  assert.equal(renders.length, 4);

  // Minimized: back to the badge cadence. Closed: list fetching stops entirely.
  viewing = false; hits.pulse = 0;
  await advance(5 * 60_000, 1000);
  assert.ok(hits.pulse <= 11, `minimized Admin window polls like the badge (saw ${hits.pulse})`);
  unsubscribe();
  const listsBefore = hits.list;
  state.version = 'v4';
  await advance(2 * 60_000, 1000);
  assert.equal(hits.list, listsBefore);

  service.stopAdminJobWatch();
  hits.pulse = 0;
  await advance(10 * 60_000, 5000);
  assert.equal(hits.pulse, 0, 'signed out / not an admin: nothing polls');
  assert.equal(document.listenerCount() + window.listenerCount(), 0);
  console.warn = warn;
});
