// Grades: a teacher sees every student's quiz scores, finished labs and current lab; a student sees their own.
import { CURRICULUM, LAB_SECTION_IDS, findItem, labTotals, sectionProgress } from '../../data/curriculum.js';
import { QUIZZES } from '../../data/quizzes.js';
import { getSession } from '../../services/auth-service.js';
import { getCompletedActivities, getCurrentActivity, getMyQuizResults } from '../../services/progress-service.js';
import { escapeHtml } from '../../utils.js';

export const meta = {
  id: 'grades',
  title: 'Grades',
  icon: 'grades',
  defaultSize: { w: 900, h: 620 },
};

const when = (at) => (at ? new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const labName = (activityId) => {
  const found = activityId ? findItem(activityId) : null;
  return found ? `${found.item.number} ${found.item.title}` : 'Not started';
};

function quizTable(results){
  const byId = Object.fromEntries(results.map((r) => [r.quizId, r]));
  return `<table class="gr-table">
    <thead><tr><th>Quiz</th><th>Lab</th><th>Best</th><th>Last</th><th>Tries</th><th>Result</th><th>Last taken</th></tr></thead>
    <tbody>${QUIZZES.map((q) => {
      const r = byId[q.id];
      return `<tr>
        <td>${escapeHtml(q.title)}<div class="gr-sub">${escapeHtml(q.group)}</div></td>
        <td>${escapeHtml(q.itemNumber)}</td>
        <td>${r ? `${r.best}%` : 'Not taken'}</td>
        <td>${r ? `${r.last}%` : ''}</td>
        <td>${r ? r.attempts : ''}</td>
        <td>${r ? (r.passed ? 'Passed' : `Not passed (needs ${q.passPercent}%)`) : ''}</td>
        <td>${r ? when(r.lastAt) : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function progressTable(completed){
  const rows = CURRICULUM.sections.filter((s) => LAB_SECTION_IDS.includes(s.id) || s.type === 'reading' || s.type === 'demo')
    .map((s) => ({ s, ...sectionProgress(s.id, completed) }));
  return `<table class="gr-table gr-narrow">
    <thead><tr><th>Section</th><th>Finished</th></tr></thead>
    <tbody>${rows.map(({ s, complete, total }) => `<tr><td>${s.number}. ${escapeHtml(s.title)}</td><td>${total ? `${complete} of ${total}` : 'Planned'}</td></tr>`).join('')}</tbody>
  </table>`;
}

function personView({ title, subtitle, completed, current, results }){
  const labs = labTotals(completed);
  return `
    <div class="gr-person">
      <h2 class="gr-title">${escapeHtml(title)}</h2>
      ${subtitle ? `<p class="gr-meta">${escapeHtml(subtitle)}</p>` : ''}
      <p class="gr-meta">Current lab: ${escapeHtml(labName(current && current.activityId))}${current && current.updatedAt ? `, last active ${when(current.updatedAt)}` : ''}</p>
      <p class="gr-meta">Labs finished: ${labs.complete} of ${labs.total}</p>
      <h3 class="gr-h3">Quizzes</h3>
      ${quizTable(results)}
      <h3 class="gr-h3">Progress by section</h3>
      ${progressTable(completed)}
    </div>`;
}

function classView(students){
  if (!students.length) return '<p class="gr-meta">No active students yet. Add students in the Admin app.</p>';
  return `<table class="gr-table gr-class">
    <thead><tr><th>Student</th><th>Current lab</th><th>Labs</th>${QUIZZES.map((q) => `<th title="${escapeHtml(q.title)}">${escapeHtml(q.itemNumber)}<div class="gr-sub">${escapeHtml(q.title)}</div></th>`).join('')}</tr></thead>
    <tbody>${students.map((s, i) => {
      const byId = Object.fromEntries(s.quizResults.map((r) => [r.quizId, r]));
      const labs = labTotals(s.completed);
      return `<tr class="gr-row" data-student="${i}" tabindex="0">
        <td>${escapeHtml(s.name || s.email)}<div class="gr-sub">${escapeHtml(s.name ? s.email : `Seat ${s.seatNumber || ''}`)}</div></td>
        <td>${escapeHtml(labName(s.current && s.current.activityId))}</td>
        <td>${labs.complete} of ${labs.total}</td>
        ${QUIZZES.map((q) => { const r = byId[q.id]; return `<td>${r ? `${r.best}%${r.passed ? '' : ' (not passed)'}<div class="gr-sub">${r.attempts} ${r.attempts === 1 ? 'try' : 'tries'}</div>` : ''}</td>`; }).join('')}
      </tr>`;
    }).join('')}</tbody>
  </table>
  <p class="gr-meta">Best score per quiz. Click a student for every try and their progress by section.</p>`;
}

export function mount(container, ctx){
  container.innerHTML = '<div class="gr-root p-scroll la-surface"><p class="gr-meta">Loading grades…</p></div>';
  const root = container.firstElementChild;

  (async () => {
    const session = await getSession();
    if (!session || session.mode === 'guest'){
      root.innerHTML = '<p class="gr-meta">Grades are saved for signed-in accounts. Sign in with your school account to see yours.</p>';
      return;
    }
    if (session.mode === 'admin' && session.robotId){
      ctx.setAppTitle && ctx.setAppTitle('Grades: Class');
      let students;
      try {
        const res = await fetch('/api/admin?view=grades', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error();
        students = (await res.json()).students || [];
      } catch {
        root.innerHTML = '<p class="gr-meta">Could not load grades. Close and reopen Grades to try again.</p>';
        return;
      }
      const showClass = () => {
        root.innerHTML = `<h2 class="gr-title">Class grades</h2>${classView(students)}`;
        root.querySelectorAll('[data-student]').forEach((row) => {
          const open = () => {
            const s = students[Number(row.dataset.student)];
            root.innerHTML = `<button type="button" class="p-btn ghost gr-back">Back to the class</button>${personView({
              title: s.name || s.email, subtitle: s.name ? s.email : '', completed: s.completed, current: s.current, results: s.quizResults,
            })}${s.quizResults.length ? `<h3 class="gr-h3">Every try</h3><table class="gr-table gr-narrow"><thead><tr><th>Quiz</th><th>Score</th><th>When</th></tr></thead><tbody>${
              s.quizResults.flatMap((r) => r.tries.map((t) => ({ r, t }))).sort((a, b) => new Date(b.t.at) - new Date(a.t.at))
                .map(({ r, t }) => `<tr><td>${escapeHtml((QUIZZES.find((q) => q.id === r.quizId) || { title: r.quizId }).title)}</td><td>${t.percent}%${t.passed ? ', passed' : ''}</td><td>${when(t.at)}</td></tr>`).join('')
            }</tbody></table>` : ''}`;
            root.querySelector('.gr-back').addEventListener('click', showClass);
          };
          row.addEventListener('click', open);
          row.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
        });
      };
      showClass();
      return;
    }
    ctx.setAppTitle && ctx.setAppTitle('Grades');
    try {
      const [completed, current, results] = await Promise.all([getCompletedActivities(), getCurrentActivity(), getMyQuizResults()]);
      root.innerHTML = personView({ title: 'My grades', subtitle: '', completed, current, results });
    } catch {
      root.innerHTML = '<p class="gr-meta">Could not load your grades. Close and reopen Grades to try again.</p>';
    }
  })();
  return {};
}
