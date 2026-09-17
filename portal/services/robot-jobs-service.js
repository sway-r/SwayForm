/* The one place in the browser that polls the Run on Robot queue.

   It used to be two independent loops hitting the same endpoint — this
   file's 15s badge poll, plus admin.js's own 5s poll while the Admin app was
   open — and each downloaded the entire queue (every job's full code and
   output) just to count pending jobs or notice that nothing had changed.

   Now a single loop asks for a "pulse": one tiny row with the pending count
   and a version hash of the visible queue. The badge uses the count. The
   Admin app, if open, gets the (lightweight) list re-fetched only when the
   version actually changes. An idle queue costs ~100 bytes a poll.

   Admin-only; a no-op for any other session. */
import { createPoller } from './adaptive-poller.js';

const FAST_MS = 5_000;          // Admin app in view and a job is approved/running
const PENDING_MAX_MS = 15_000;  // in view, only pending jobs, nothing changing
const IDLE_MAX_MS = 30_000;     // in view, empty queue, nothing changing
const BADGE_MS = 30_000;        // Admin app closed or minimized: badge/tab title only
// Hidden tabs are slowed further by the poller itself (60s, then 5 min) —
// not paused, because the pending count in the tab title is exactly how an
// admin working in another tab finds out a student is waiting.

let poller = null;
let badgeActive = false;
let lastCount = -1; // -1 = "never polled yet", forces the first callback
let countListeners = [];
let subscribers = [];
let jobs = null;
let listVersion = null;   // pulse version the current `jobs` snapshot matches
let seenVersion = null;
let unchangedPolls = 0;
let pendingCount = 0;
let openCount = 0;
let forceList = false;
let wasFailing = false;
let waiters = [];

function delayMs(){
  if (!subscribers.some((s) => s.isViewing())) return BADGE_MS;
  if (openCount > pendingCount) return FAST_MS;
  const cap = pendingCount > 0 ? PENDING_MAX_MS : IDLE_MAX_MS;
  return Math.min(cap, FAST_MS * 2 ** Math.min(unchangedPolls, 3));
}

async function loadList(version){
  const res = await fetch('/api/robot/queue');
  if (!res.ok) throw new Error(`queue list -> ${res.status}`);
  const data = await res.json();
  jobs = data.jobs || [];
  listVersion = version;
  subscribers.forEach((s) => s.onJobs(jobs));
}

async function poll(){
  const mustLoad = forceList;
  forceList = false;
  const resolveAfter = waiters;
  waiters = [];
  try {
    const res = await fetch('/api/robot/queue?view=pulse');
    if (!res.ok) throw new Error(`queue pulse -> ${res.status}`);
    const pulse = await res.json();

    pendingCount = pulse.pendingCount || 0;
    openCount = pulse.openCount || 0;
    if (pulse.version === seenVersion) unchangedPolls += 1;
    else { seenVersion = pulse.version; unchangedPolls = 0; }

    if (pendingCount !== lastCount){
      lastCount = pendingCount;
      countListeners.forEach((l) => l(pendingCount));
    }
    // After a failure streak, reload even if the version is unchanged, so a
    // subscriber showing "couldn't refresh" hears that it's working again.
    const recovered = wasFailing;
    wasFailing = false;
    if (subscribers.length && (mustLoad || recovered || pulse.version !== listVersion)) await loadList(pulse.version);
  } finally {
    resolveAfter.forEach((resolve) => resolve());
  }
}

function onError(error, failures){
  // Reported, not swallowed: the Admin app shows it, and the console keeps
  // the first of each streak. The poller is already backing off.
  if (failures === 1) console.warn('Run on Robot queue refresh failed:', error.message);
  wasFailing = true;
  subscribers.forEach((s) => s.onError && s.onError(error, failures));
}

function sync(){
  const needed = badgeActive || subscribers.length > 0;
  if (needed && !poller){
    poller = createPoller({ task: poll, delayMs, onError, whenHidden: 'slow' });
    poller.start();
  } else if (!needed && poller){
    poller.stop();
    poller = null;
    lastCount = -1;
    jobs = null;
    listVersion = null;
    seenVersion = null;
    unchangedPolls = 0;
    wasFailing = false;
    waiters.splice(0).forEach((resolve) => resolve());
  }
}

export function startAdminJobWatch(){
  badgeActive = true;
  sync();
}

export function stopAdminJobWatch(){
  badgeActive = false;
  sync();
}

/** cb(pendingCount) — called immediately with the current count once known,
 * and again every time it changes. Returns an unsubscribe function. */
export function onPendingCountChange(cb){
  countListeners.push(cb);
  if (lastCount >= 0) cb(lastCount);
  return () => { countListeners = countListeners.filter((l) => l !== cb); };
}

/**
 * For the Admin app's queue section. onJobs(jobs) fires with lightweight job
 * summaries whenever the queue actually changed (and once right away).
 * isViewing() says whether that UI is really on screen — while it isn't
 * (window minimized), the loop drops back to the badge cadence.
 * Returns an unsubscribe function; the last one out stops the list fetches.
 */
export function subscribeQueue({ onJobs, onError: onSubError, isViewing }){
  const sub = { onJobs, onError: onSubError, isViewing: isViewing || (() => true) };
  subscribers.push(sub);
  if (jobs) onJobs(jobs);
  forceList = true;
  sync();
  poller.now();
  return () => {
    subscribers = subscribers.filter((s) => s !== sub);
    if (!subscribers.length){ jobs = null; listVersion = null; }
    sync();
    if (poller) poller.reschedule();
  };
}

/** Re-check now and reload the list regardless of version — call after an
 * action (approve/reject/reorder/...) or when the queue UI comes back into
 * view. Resolves once a poll that started after this call has finished. */
export function refreshQueueNow(){
  if (!poller) return Promise.resolve();
  forceList = true;
  const done = new Promise((resolve) => { waiters.push(resolve); });
  poller.now();
  return done;
}
