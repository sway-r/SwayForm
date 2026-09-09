/* Learning-progress abstraction. Guest sessions stay on localStorage
   (namespaced per-account, so switching accounts in the same browser never
   mixes up progress — with a one-time migration from the older unnamespaced
   keys, so a guest who used the portal before that isolation shipped
   doesn't lose progress). Real accounts sync to the database: the full
   state is fetched once per page load and cached in memory (every read
   already goes through a single `getCompletedActivities()`-then-`Set.has()`
   pattern at the call sites, so this mirrors that instead of hitting the
   network on every check), and every write updates the cache immediately
   (instant UI) while posting the change to the backend in the background. */
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
  if (!sessionPromise) sessionPromise = getSession().then((s) => s || { mode: 'guest' });
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
function loadRemoteState(){
  if (!remoteStatePromise){
    remoteStatePromise = fetch('/api/progress')
      .then((res) => res.json())
      .then((data) => ({ completed: new Set(data.completed || []), current: data.current || null }))
      .catch(() => ({ completed: new Set(), current: null }));
  }
  return remoteStatePromise;
}

function postProgress(body){
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => { /* best-effort; UI already reflects the change locally */ });
}

/* ------------------------------------------------------------ public API */
export async function getCompletedActivities(){
  const session = await resolveSession();
  if (isGuest(session)) return Array.from(readGuestCompleted());
  return Array.from((await loadRemoteState()).completed);
}

export async function isActivityComplete(activityId){
  const session = await resolveSession();
  if (isGuest(session)) return readGuestCompleted().has(activityId);
  return (await loadRemoteState()).completed.has(activityId);
}

export async function markComplete(activityId){
  const session = await resolveSession();
  if (isGuest(session)){
    const set = readGuestCompleted();
    set.add(activityId);
    writeGuestCompleted(set);
    return;
  }
  (await loadRemoteState()).completed.add(activityId);
  postProgress({ action: 'complete', activityId });
}

export async function markIncomplete(activityId){
  const session = await resolveSession();
  if (isGuest(session)){
    const set = readGuestCompleted();
    set.delete(activityId);
    writeGuestCompleted(set);
    return;
  }
  (await loadRemoteState()).completed.delete(activityId);
  postProgress({ action: 'incomplete', activityId });
}

export async function toggleComplete(activityId){
  const session = await resolveSession();
  if (isGuest(session)){
    const set = readGuestCompleted();
    const nowComplete = !set.has(activityId);
    if (nowComplete) set.add(activityId); else set.delete(activityId);
    writeGuestCompleted(set);
    return nowComplete;
  }
  const state = await loadRemoteState();
  const nowComplete = !state.completed.has(activityId);
  if (nowComplete) state.completed.add(activityId); else state.completed.delete(activityId);
  postProgress({ action: nowComplete ? 'complete' : 'incomplete', activityId });
  return nowComplete;
}

export async function getCurrentActivity(){
  const session = await resolveSession();
  if (isGuest(session)) return readGuestCurrent();
  return (await loadRemoteState()).current;
}

export async function setCurrentActivity(activityId, stepIndex){
  const session = await resolveSession();
  const current = { activityId, stepIndex: stepIndex || 0 };
  if (isGuest(session)){
    writeGuestCurrent(current);
    return;
  }
  (await loadRemoteState()).current = current;
  postProgress({ action: 'current', activityId: current.activityId, stepIndex: current.stepIndex });
}

export async function resetProgress(){
  const session = await resolveSession();
  if (isGuest(session)){
    writeGuestCompleted(new Set());
    writeGuestCurrent(null);
    return;
  }
  const state = await loadRemoteState();
  state.completed = new Set();
  state.current = null;
  postProgress({ action: 'reset' });
}
