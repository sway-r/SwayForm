/* Learning-progress abstraction. Backed by localStorage for now, namespaced
   per account (by email, or 'guest') so switching accounts in the same
   browser never shows one person's progress as another's. Shaped as async
   so a future backend (real cross-device progress) can replace the storage
   layer without touching call sites. */
import { getSession } from './auth-service.js';

const COMPLETED_KEY = 'swayform.portal.progress.completed';
const CURRENT_KEY = 'swayform.portal.progress.current';

// The session can't change without a full page reload (logout navigates
// away), so resolving this once per page load and caching it is safe.
let namespaceCache = null;
async function namespace(){
  if (namespaceCache) return namespaceCache;
  const session = await getSession();
  namespaceCache = (session && session.mode !== 'guest' && session.email) || 'guest';
  return namespaceCache;
}

async function readCompleted(){
  const ns = await namespace();
  try { return new Set(JSON.parse(localStorage.getItem(`${COMPLETED_KEY}.${ns}`) || '[]')); }
  catch (e) { return new Set(); }
}
async function writeCompleted(set){
  const ns = await namespace();
  try { localStorage.setItem(`${COMPLETED_KEY}.${ns}`, JSON.stringify(Array.from(set))); } catch (e) { /* noop */ }
}

export async function getCompletedActivities(){
  return Array.from(await readCompleted());
}

export async function isActivityComplete(activityId){
  return (await readCompleted()).has(activityId);
}

export async function markComplete(activityId){
  const set = await readCompleted();
  set.add(activityId);
  await writeCompleted(set);
}

export async function markIncomplete(activityId){
  const set = await readCompleted();
  set.delete(activityId);
  await writeCompleted(set);
}

export async function toggleComplete(activityId){
  const set = await readCompleted();
  if (set.has(activityId)) set.delete(activityId); else set.add(activityId);
  await writeCompleted(set);
  return set.has(activityId);
}

export async function getCurrentActivity(){
  const ns = await namespace();
  try { return JSON.parse(localStorage.getItem(`${CURRENT_KEY}.${ns}`) || 'null'); }
  catch (e) { return null; }
}

export async function setCurrentActivity(activityId, stepIndex){
  const ns = await namespace();
  try { localStorage.setItem(`${CURRENT_KEY}.${ns}`, JSON.stringify({ activityId, stepIndex: stepIndex || 0 })); }
  catch (e) { /* noop */ }
}

export async function resetProgress(){
  await writeCompleted(new Set());
  const ns = await namespace();
  try { localStorage.removeItem(`${CURRENT_KEY}.${ns}`); } catch (e) { /* noop */ }
}
