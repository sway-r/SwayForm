/* Active time spent per lab, stored in this browser per account. Time only
 * counts while the tab is visible and the student has used the mouse or
 * keyboard in the last minute. */
const KEY_PREFIX = 'swayform.portal.time.';
const IDLE_MS = 60000;
const SAVE_EVERY_S = 5;

let lastActivity = Date.now();
if (typeof document !== 'undefined'){
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach((type) => {
    document.addEventListener(type, () => { lastActivity = Date.now(); }, { passive: true, capture: true });
  });
}

export function timeStorageKey(email){
  return KEY_PREFIX + encodeURIComponent(email || 'guest');
}

/** { activityId: seconds } for an account. */
export function readTimes(email){
  try {
    const raw = JSON.parse(localStorage.getItem(timeStorageKey(email)) || '{}');
    const out = {};
    for (const [id, secs] of Object.entries(raw)) if (Number.isFinite(secs) && secs > 0) out[id] = secs;
    return out;
  } catch (e) { return {}; }
}

export function formatClock(seconds){
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function formatTotal(seconds){
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (!h && !m) return s ? '<1m' : '0m';
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Starts counting for one lab. Call stop() when leaving it. */
export function startTracking(activityId, email){
  const key = timeStorageKey(email);
  let stored = readTimes(email);
  let pending = 0;
  let session = 0;
  let sinceSave = 0;

  function save(){
    if (!pending) return;
    try {
      stored = readTimes(email);
      stored[activityId] = (stored[activityId] || 0) + pending;
      localStorage.setItem(key, JSON.stringify(stored));
      pending = 0;
    } catch (e) { /* storage unavailable: keep counting in memory */ }
  }

  const timer = setInterval(() => {
    if (document.visibilityState !== 'visible' || Date.now() - lastActivity > IDLE_MS) return;
    session += 1;
    pending += 1;
    sinceSave += 1;
    if (sinceSave >= SAVE_EVERY_S){ sinceSave = 0; save(); }
  }, 1000);
  window.addEventListener('pagehide', save);

  return {
    getTimes(){
      const others = Object.entries(stored).reduce((sum, [id, secs]) => sum + (id === activityId ? 0 : secs), 0);
      const lab = (stored[activityId] || 0) + pending;
      return { session, lab, total: others + lab };
    },
    stop(){
      clearInterval(timer);
      window.removeEventListener('pagehide', save);
      save();
    },
  };
}
