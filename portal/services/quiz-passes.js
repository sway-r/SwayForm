/* Quizzes marked `savePass: true` remember a pass in this browser, one list
   per account, so a lab's robot gate (robotGate.needsQuiz) can check it and
   the quiz still shows as passed after a reload. Browser-only, like code
   drafts: on another computer the student takes the quiz again. */
const PREFIX = 'swayform.portal.quiz-passes.';
let storageKey = PREFIX + 'guest';

export function setQuizAccount(session){
  storageKey = PREFIX + encodeURIComponent(session?.email || 'guest');
}

function readPasses(){
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch { return []; }
}

export function hasPassedQuiz(id){
  return readPasses().includes(id);
}

export function recordQuizPass(id){
  const ids = readPasses();
  if (ids.includes(id)) return;
  ids.push(id);
  try { localStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* storage unavailable */ }
}
