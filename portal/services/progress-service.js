/* Learning-progress abstraction. Backed by localStorage for now; shaped as
   async so a future backend (real accounts, cross-device progress) can
   replace the storage layer without touching call sites. */
const COMPLETED_KEY = 'swayform.portal.progress.completed';
const CURRENT_KEY = 'swayform.portal.progress.current';

function readCompleted(){
  try { return new Set(JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function writeCompleted(set){
  try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(set))); } catch (e) { /* noop */ }
}

export async function getCompletedActivities(){
  return Array.from(readCompleted());
}

export async function isActivityComplete(activityId){
  return readCompleted().has(activityId);
}

export async function markComplete(activityId){
  const set = readCompleted();
  set.add(activityId);
  writeCompleted(set);
}

export async function markIncomplete(activityId){
  const set = readCompleted();
  set.delete(activityId);
  writeCompleted(set);
}

export async function toggleComplete(activityId){
  const set = readCompleted();
  if (set.has(activityId)) set.delete(activityId); else set.add(activityId);
  writeCompleted(set);
  return set.has(activityId);
}

export async function getCurrentActivity(){
  try { return JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null'); }
  catch (e) { return null; }
}

export async function setCurrentActivity(activityId, stepIndex){
  try { localStorage.setItem(CURRENT_KEY, JSON.stringify({ activityId, stepIndex: stepIndex || 0 })); }
  catch (e) { /* noop */ }
}

export async function resetProgress(){
  writeCompleted(new Set());
  try { localStorage.removeItem(CURRENT_KEY); } catch (e) { /* noop */ }
}
