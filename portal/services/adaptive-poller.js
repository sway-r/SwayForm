// Shared polling loop: never overlaps, slows or pauses when hidden, backs off on failure.

const HIDDEN_DELAY_MS = 60_000;
const LONG_HIDDEN_AFTER_MS = 30 * 60_000;
const LONG_HIDDEN_DELAY_MS = 5 * 60_000;
const MAX_FAILURE_DELAY_MS = 2 * 60_000;
const MIN_REFOCUS_GAP_MS = 3_000; // focus events fire on every click back into the window
const RELEVANCE_RECHECK_MS = 2_000;

// Return from a task to end the loop.
export const STOP = Symbol('poller.stop');

export function hiddenDelayMs(hiddenForMs){
  return hiddenForMs >= LONG_HIDDEN_AFTER_MS ? LONG_HIDDEN_DELAY_MS : HIDDEN_DELAY_MS;
}

// task: async poll, throw = failure, return STOP to end. delayMs(state) -> ms while visible.
// whenHidden: 'slow' | 'pause'. isRelevant: extra "is anyone looking" check (e.g. not minimized).
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
      // A minimized window fires no event, so re-check locally until it's back.
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
    now(){ if (!stopped) run(); }, // coalesces with an in-flight run
    reschedule(){ if (!stopped && !running) schedule(); },
    get stopped(){ return stopped; },
  };
}
