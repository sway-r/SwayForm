// The one queue poll in the browser: badge + Admin app share it. Polls a tiny
// pulse; the list is only fetched when the pulse's version changes. Admin-only.
import { createPoller } from './adaptive-poller.js';

const FAST_MS = 5_000;          // Admin app in view, a job approved/running
// In view and nothing changing; the pulse is counts only, so a new submission shows within ~10s without a page refresh.
const PENDING_MAX_MS = 10_000;
const IDLE_MAX_MS = 10_000;
const BADGE_MS = 30_000;        // Admin app closed or minimized

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
    const recovered = wasFailing; // reload after an outage even if unchanged, so the stale label clears
    wasFailing = false;
    if (subscribers.length && (mustLoad || recovered || pulse.version !== listVersion)) await loadList(pulse.version);
  } finally {
    resolveAfter.forEach((resolve) => resolve());
  }
}

function onError(error, failures){
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

// cb(pendingCount) now if known, then on every change. Returns unsubscribe.
export function onPendingCountChange(cb){
  countListeners.push(cb);
  if (lastCount >= 0) cb(lastCount);
  return () => { countListeners = countListeners.filter((l) => l !== cb); };
}

// onJobs(jobs) on every real change (and once now). isViewing() false = badge cadence. Returns unsubscribe.
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

// Poll now and reload the list regardless of version; resolves after that poll.
export function refreshQueueNow(){
  if (!poller) return Promise.resolve();
  forceList = true;
  const done = new Promise((resolve) => { waiters.push(resolve); });
  poller.now();
  return done;
}
