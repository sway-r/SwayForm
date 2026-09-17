/* One polling loop, used by every recurring request in the portal (admin
   queue/badge, a student's job watcher, robot status). Each of those used to
   be its own bare setInterval, and together they had the same four problems:
   a slow response let requests pile up on top of each other, a hidden or
   abandoned tab kept polling at full speed around the clock, a failing server
   was retried at full speed, and nothing slowed down when nothing changed.
   Every one of those polls is several Neon queries, so they are fixed once,
   here, instead of four times slightly differently.

   Guarantees:
   - Never overlaps: the next run is scheduled only after the previous one
     settles (a timeout chain, not an interval).
   - Hidden tabs slow down (or pause), and catch up the moment they're visible.
   - Failures back off exponentially and are reported, not swallowed.
   - stop() is final: no timer survives it and a late response is ignored. */

const HIDDEN_DELAY_MS = 60_000;
const LONG_HIDDEN_AFTER_MS = 30 * 60_000;
const LONG_HIDDEN_DELAY_MS = 5 * 60_000;
const MAX_FAILURE_DELAY_MS = 2 * 60_000;
// Regaining focus/visibility polls at once, but not if a poll just happened —
// focus events fire on every click back into the window.
const MIN_REFOCUS_GAP_MS = 3_000;
const RELEVANCE_RECHECK_MS = 2_000;

/** Return this from a task to end the loop from inside it. */
export const STOP = Symbol('poller.stop');

/** Delay for a tab nobody is looking at. Browsers throttle background timers
 *  to about once a minute anyway; past half an hour it is almost certainly
 *  unattended (left open overnight), so it drops to every five minutes. */
export function hiddenDelayMs(hiddenForMs){
  return hiddenForMs >= LONG_HIDDEN_AFTER_MS ? LONG_HIDDEN_DELAY_MS : HIDDEN_DELAY_MS;
}

/**
 * @param {object} opts
 * @param {() => Promise<any>} opts.task   One poll. Throw/reject = failure.
 *   Return STOP (or call stop()) to end the loop from inside.
 * @param {(state) => number} opts.delayMs Milliseconds until the next run
 *   while visible. state = { runs, failures, lastResult }.
 * @param {'slow'|'pause'} [opts.whenHidden='slow'] 'slow' keeps a background
 *   cadence (for things that notify through the tab title); 'pause' stops
 *   entirely until visible again (for things only a viewer can see).
 * @param {() => boolean} [opts.isRelevant] Extra "is anyone looking" check,
 *   e.g. the app's window isn't minimized. False is treated like hidden.
 * @param {(error, failures) => void} [opts.onError]
 */
export function createPoller({ task, delayMs, whenHidden = 'slow', isRelevant, onError }){
  let timer = null;
  let running = false;
  let rerun = false;
  let stopped = true;
  let failures = 0;
  let runs = 0;
  let lastResult;
  let hiddenSince = null;
  let lastRunAt = 0;

  const doc = () => (typeof document !== 'undefined' ? document : null);

  function looking(){
    const d = doc();
    if (d && d.visibilityState === 'hidden') return false;
    return isRelevant ? !!isRelevant() : true;
  }

  function nextDelay(){
    if (failures > 0){
      const base = Math.max(1000, delayMs({ runs, failures, lastResult }));
      return Math.min(MAX_FAILURE_DELAY_MS, base * 2 ** failures);
    }
    if (!looking()){
      if (whenHidden === 'pause') return null;
      if (hiddenSince === null) hiddenSince = Date.now();
      return Math.max(hiddenDelayMs(Date.now() - hiddenSince), delayMs({ runs, failures, lastResult }));
    }
    hiddenSince = null;
    return delayMs({ runs, failures, lastResult });
  }

  function schedule(){
    clearTimeout(timer);
    timer = null;
    if (stopped) return;
    const delay = nextDelay();
    if (delay === null){
      // Paused. A hidden document wakes this up through visibilitychange. A
      // minimized app window fires no event at all, so look again locally
      // (no request) until it's back on screen.
      const d = doc();
      if (!d || d.visibilityState !== 'hidden'){
        timer = setTimeout(() => { if (looking()) run(); else schedule(); }, RELEVANCE_RECHECK_MS);
      }
      return;
    }
    timer = setTimeout(run, delay);
  }

  async function run(){
    if (stopped) return;
    if (running){ rerun = true; return; }
    clearTimeout(timer);
    timer = null;
    running = true;
    let result;
    try {
      result = await task();
      failures = 0;
    } catch (error) {
      failures += 1;
      if (onError && !stopped) onError(error, failures);
    } finally {
      running = false;
      lastRunAt = Date.now();
    }
    if (stopped) return;
    runs += 1;
    if (result === STOP){ stop(); return; }
    lastResult = result;
    if (rerun){ rerun = false; run(); return; }
    schedule();
  }

  function onVisibility(){
    if (stopped) return;
    if (looking() && Date.now() - lastRunAt >= MIN_REFOCUS_GAP_MS){ hiddenSince = null; run(); }
    else if (!running) schedule();
  }

  function start(){
    if (!stopped) return;
    stopped = false;
    const d = doc();
    if (d) d.addEventListener('visibilitychange', onVisibility);
    if (typeof window !== 'undefined') window.addEventListener('focus', onVisibility);
    run();
  }

  function stop(){
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    timer = null;
    rerun = false;
    const d = doc();
    if (d) d.removeEventListener('visibilitychange', onVisibility);
    if (typeof window !== 'undefined') window.removeEventListener('focus', onVisibility);
  }

  return {
    start,
    stop,
    /** Run as soon as possible. If a run is in flight, exactly one more
     *  follows it — so "refresh after my action" can't be lost, and can't
     *  stack up either. Resolves nothing; listen via the task's own effects. */
    now(){ if (!stopped) run(); },
    /** Re-evaluate the delay (e.g. the cadence inputs changed). */
    reschedule(){ if (!stopped && !running) schedule(); },
    get stopped(){ return stopped; },
  };
}
