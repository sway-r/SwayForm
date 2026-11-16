/* Quiz passes and tries, kept in this browser per account like code drafts.
   A pass survives a reload and opens robotGate.needsQuiz; a try starts the wait before the next one. */
const PASSES = 'swayform.portal.quiz-passes.';
const TRIES = 'swayform.portal.quiz-tries.';
export const QUIZ_WAIT_MINUTES = 15;
let account = 'guest';

export function setQuizAccount(session){
  account = encodeURIComponent(session?.email || 'guest');
}

function read(key, fallback){
  try {
    const value = JSON.parse(localStorage.getItem(key + account) || 'null');
    return value && typeof value === 'object' && Array.isArray(value) === Array.isArray(fallback) ? value : fallback;
  } catch { return fallback; }
}

function write(key, value){
  try { localStorage.setItem(key + account, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function hasPassedQuiz(id){
  return read(PASSES, []).includes(id);
}

export function recordQuizPass(id){
  const ids = read(PASSES, []);
  if (!ids.includes(id)){ ids.push(id); write(PASSES, ids); }
}

/** The latest try: { startedAt, endedAt, percent }. endedAt is missing while it runs, or if it was never submitted. */
export function lastQuizTry(id){
  return read(TRIES, {})[id] || null;
}

export function startQuizTry(id, now = Date.now()){
  const tries = read(TRIES, {});
  tries[id] = { startedAt: now };
  write(TRIES, tries);
}

export function finishQuizTry(id, percent, now = Date.now()){
  const tries = read(TRIES, {});
  tries[id] = { startedAt: tries[id]?.startedAt ?? now, endedAt: now, percent };
  write(TRIES, tries);
}

/** When the next try may start: QUIZ_WAIT_MINUTES after the last one was submitted, or after it started if it never was. 0 if there was none. */
export function nextQuizTryAt(id){
  const last = lastQuizTry(id);
  return last ? (last.endedAt ?? last.startedAt) + QUIZ_WAIT_MINUTES * 60000 : 0;
}
