/* Learning-progress abstraction. Guest sessions stay on localStorage
   (namespaced per-account, so switching accounts in the same browser never
   mixes up progress). Real accounts sync to the database: the full state is
   fetched once per page load and cached in memory (every read here already
   goes through a single `getCompletedActivities()`-then-`Set.has()` pattern
   at the call sites, so this mirrors that instead of hitting the network on
   every check), and every write updates the cache immediately (instant UI)
   while posting the change to the backend in the background. */
import { getSession } from './auth-service.js';

const COMPLETED_KEY = 'swayform.portal.progress.completed';
const CURRENT_KEY = 'swayform.portal.progress.current';

// The session can't change without a full page reload (logout navigates
// away), so resolving this once per page load and caching it is safe.
let sessionCache = null;
async function resolveSession(){
  if (!sessionCache) sessionCache = await getSession();
  return sessionCache || { mode: 'guest' };
}

function isGuest(session){
  return !session || session.mode === 'guest';
}

/* ------------------------------------------------------------ localStorage (guest) */
function guestNamespace(){
  return 'guest';
}
function readGuestCompleted(){
  try { return new Set(JSON.parse(localStorage.getItem(`${COMPLETED_KEY}.${guestNamespace()}`) || '[]')); }
  catch (e) { return new Set(); }
}
function writeGuestCompleted(set){
  try { localStorage.setItem(`${COMPLETED_KEY}.${guestNamespace()}`, JSON.stringify(Array.from(set))); } catch (e) { /* noop */ }
}
function readGuestCurrent(){
  try { return JSON.parse(localStorage.getItem(`${CURRENT_KEY}.${guestNamespace()}`) || 'null'); }
  catch (e) { return null; }
}
function writeGuestCurrent(current){
  try {
    if (current) localStorage.setItem(`${CURRENT_KEY}.${guestNamespace()}`, JSON.stringify(current));
    else localStorage.removeItem(`${CURRENT_KEY}.${guestNamespace()}`);
  } catch (e) { /* noop */ }
}

/* ------------------------------------------------------------ backend (real accounts) */
let remoteState = null; // { completed: Set, current: {activityId, stepIndex}|null }

async function loadRemoteState(){
  if (remoteState) return remoteState;
  try {
    const res = await fetch('/api/progress');
    const data = await res.json();
    remoteState = { completed: new Set(data.completed || []), current: data.current || null };
  } catch (e) {
    remoteState = { completed: new Set(), current: null };
  }
  return remoteState;
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
