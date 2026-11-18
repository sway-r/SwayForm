// Quiz result rows (oldest first) grouped per quiz: best, last, tries and whether it was ever passed.
export function summarizeQuizResults(rows){
  const byQuiz = {};
  for (const r of rows){
    const q = byQuiz[r.quiz_id] ||= { quizId: r.quiz_id, best: 0, last: 0, attempts: 0, passed: false, lastAt: null, tries: [] };
    q.attempts += 1;
    q.best = Math.max(q.best, r.percent);
    q.last = r.percent;
    q.passed = q.passed || r.passed;
    q.lastAt = r.finished_at;
    q.tries.push({ percent: r.percent, passed: r.passed, at: r.finished_at });
  }
  return Object.values(byQuiz);
}
