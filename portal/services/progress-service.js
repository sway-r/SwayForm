/* Learning-progress abstraction. Guest sessions stay on localStorage
   (namespaced per-account, so switching accounts in the same browser never
   mixes up progress — with a one-time migration from the older unnamespaced
   keys, so a guest who used the portal before that isolation shipped
   doesn't lose progress). Real accounts sync to the database: the full
   state is fetched once per page load and cached in memory (every read
   already goes through a single `getCompletedActivities()`-then-`Set.has()`
   pattern at the call sites, so this mirrors that instead of hitting the
   network on every check). Writes are serialized and acknowledged by the
   server before the in-memory state changes. */
import { getSession } from './auth-service.js';

const COMPLETED_KEY = 'swayform.portal.progress.completed';
const CURRENT_KEY = 'swayform.portal.progress.current';
const GUEST_COMPLETED_KEY = `${COMPLETED_KEY}.guest`;
const GUEST_CURRENT_KEY = `${CURRENT_KEY}.guest`;

// The session can't change without a full page reload (logout navigates
// away), so resolving this once per page load is safe — cached as the
// in-flight promise itself (not the resolved value) so concurrent callers
// during that first await all share one fetch instead of each firing their
// own request to /api/auth/session.
let sessionPromise = null;
function resolveSession(){
  if (!sessionPromise) sessionPromise = getSession().then((s) => { if (!s) throw new Error('Please sign in again.'); return s; });
  return sessionPromise;
}

function isGuest(session){
  return session.mode === 'guest';
}

/* ------------------------------------------------------------ localStorage (guest) */
let migrated = false;
function migrateLegacyGuestKeysOnce(){
  if (migrated) return;
  migrated = true;
  try {
    if (localStorage.getItem(GUEST_COMPLETED_KEY) === null && localStorage.getItem(COMPLETED_KEY) !== null){
      localStorage.setItem(GUEST_COMPLETED_KEY, localStorage.getItem(COMPLETED_KEY));
      localStorage.removeItem(COMPLETED_KEY);
    }
    if (localStorage.getItem(GUEST_CURRENT_KEY) === null && localStorage.getItem(CURRENT_KEY) !== null){
      localStorage.setItem(GUEST_CURRENT_KEY, localStorage.getItem(CURRENT_KEY));
      localStorage.removeItem(CURRENT_KEY);
    }
  } catch (e) { /* storage unavailable */ }
}
function readGuestCompleted(){
  migrateLegacyGuestKeysOnce();
  try { return new Set(JSON.parse(localStorage.getItem(GUEST_COMPLETED_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function writeGuestCompleted(set){
  try { localStorage.setItem(GUEST_COMPLETED_KEY, JSON.stringify(Array.from(set))); } catch (e) { /* noop */ }
}
function readGuestCurrent(){
  migrateLegacyGuestKeysOnce();
  try { return JSON.parse(localStorage.getItem(GUEST_CURRENT_KEY) || 'null'); }
  catch (e) { return null; }
}
function writeGuestCurrent(current){
  try {
    if (current) localStorage.setItem(GUEST_CURRENT_KEY, JSON.stringify(current));
    else localStorage.removeItem(GUEST_CURRENT_KEY);
  } catch (e) { /* noop */ }
}

/* ------------------------------------------------------------ backend (real accounts) */
// Cached as the in-flight promise itself, same reasoning as resolveSession()
// above — otherwise two components mounting in the same tick (e.g. a
// section view's Promise.all) would each fire their own GET /api/progress.
let remoteStatePromise = null;
function reportError(error){
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('swayform:save-error', { detail: error.message }));
}
function loadRemoteState(){
  if (!remoteStatePromise){
    remoteStatePromise = fetch('/api/progress', { cache: 'no-store', signal: AbortSignal.timeout(10000) })
      .then((res) => { if (!res.ok) throw new Error('Could not load your saved progress. Reconnect and reload to retry.'); return res.json(); })
      .then((data) => ({ completed: new Set(data.completed || []), current: data.current || null }))
      .catch((error) => { remoteStatePromise = null; reportError(error); throw error; });
  }
  return remoteStatePromise;
}

// Serialize writes. Only confirm a change locally after the server accepted it.
let mutationTail = Promise.resolve();
function mutateRemote(makeChange){
  const operation = mutationTail.then(async () => {
    const state = await loadRemoteState();
    const { body, apply } = makeChange(state);
    const res = await fetch('/api/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('Your progress was not saved. Reconnect and try the action again.');
    return apply(state);
  }).catch((error) => {
    // A timed-out request may have reached the server. Reload before the next write.
    remoteStatePromise = null;
    reportError(error);
    throw error;
  });
  mutationTail = operation.catch(() => {});
  return operation;
}

export async function getCompletedActivities(){
  const session = await resolveSession();
  return isGuest(session) ? Array.from(readGuestCompleted()) : Array.from((await loadRemoteState()).completed);
}
export async function isActivityComplete(activityId){
  return (await getCompletedActivities()).includes(activityId);
}
export async function markComplete(activityId){
  if (isGuest(await resolveSession())){ const set = readGuestCompleted(); set.add(activityId); writeGuestCompleted(set); return; }
  return mutateRemote(() => ({ body: { action: 'complete', activityId }, apply: (state) => { state.completed.add(activityId); } }));
}
export async function markIncomplete(activityId){
  if (isGuest(await resolveSession())){ const set = readGuestCompleted(); set.delete(activityId); writeGuestCompleted(set); return; }
  return mutateRemote(() => ({ body: { action: 'incomplete', activityId }, apply: (state) => { state.completed.delete(activityId); } }));
}
export async function toggleComplete(activityId){
  if (isGuest(await resolveSession())){
    const set = readGuestCompleted(); const done = !set.has(activityId);
    if (done) set.add(activityId); else set.delete(activityId);
    writeGuestCompleted(set); return done;
  }
  return mutateRemote((state) => {
    const done = !state.completed.has(activityId);
    return { body: { action: done ? 'complete' : 'incomplete', activityId }, apply: (state) => {
      if (done) state.completed.add(activityId); else state.completed.delete(activityId); return done;
    } };
  });
}
export async function getCurrentActivity(){
  return isGuest(await resolveSession()) ? readGuestCurrent() : (await loadRemoteState()).current;
}
export async function setCurrentActivity(activityId, stepIndex){
  const current = { activityId, stepIndex: stepIndex || 0 };
  if (isGuest(await resolveSession())){ writeGuestCurrent(current); return; }
  return mutateRemote(() => ({ body: { action: 'current', ...current }, apply: (state) => { state.current = current; } }));
}
export async function resetProgress(){
  if (isGuest(await resolveSession())){ writeGuestCompleted(new Set()); writeGuestCurrent(null); return; }
  return mutateRemote(() => ({ body: { action: 'reset' }, apply: (state) => { state.completed = new Set(); state.current = null; } }));
}
