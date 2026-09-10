/* Lightweight polling for admin-facing "pending Run on Robot submissions" —
   drives the Admin desktop icon's badge and the browser tab title, so an
   admin doesn't have to have the Admin app open (or keep re-opening it) to
   notice a student is waiting on a review. Admin-only; a no-op for any
   other session. Independent from admin.js's own in-app queue polling —
   this one runs from the moment the desktop loads, that one only while
   the Admin window is actually open. */

const POLL_INTERVAL_MS = 15_000;

let timer = null;
let lastCount = -1; // -1 = "never polled yet", forces the first callback
let listeners = [];

export function startAdminJobWatch(){
  if (timer) return;
  poll();
  timer = setInterval(poll, POLL_INTERVAL_MS);
}

export function stopAdminJobWatch(){
  clearInterval(timer);
  timer = null;
  lastCount = -1;
}

/** cb(pendingCount) — called immediately with the current count once known,
 * and again every time it changes. Returns an unsubscribe function. */
export function onPendingCountChange(cb){
  listeners.push(cb);
  if (lastCount >= 0) cb(lastCount);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

async function poll(){
  try {
    const res = await fetch('/api/robot/queue');
    if (!res.ok) return;
    const { jobs } = await res.json();
    const count = (jobs || []).filter((j) => j.status === 'pending').length;
    if (count !== lastCount){
      lastCount = count;
      listeners.forEach((l) => l(count));
    }
  } catch (e) { /* best-effort — network hiccup, try again next tick */ }
}
