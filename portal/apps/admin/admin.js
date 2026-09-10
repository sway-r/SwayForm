import { escapeHtml } from '../../utils.js';

export const meta = {
  id: 'admin',
  title: 'Admin',
  icon: 'building',
  defaultSize: { w: 640, h: 640 },
};

// The server (api/_lib/limits.js) is the actual source of truth and
// enforcement point for these — mirrored here only for display, since a
// browser module can't import server-only code. Keep in sync by hand.
const MAX_ACTIVE_SEATS = 15;
const MAX_TOTAL_STUDENTS = 40;

async function fetchState(){
  const res = await fetch('/api/admin');
  if (!res.ok) throw new Error('Could not load admin data.');
  return res.json();
}

async function postAction(body){
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}

async function fetchQueue(){
  const res = await fetch('/api/robot/queue');
  if (!res.ok) return [];
  const data = await res.json();
  return data.jobs || [];
}

async function postQueueAction(body){
  const res = await fetch('/api/robot/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong. Please try again.');
  return data;
}

const STATUS_LABEL = {
  pending: 'Pending review', approved: 'Approved — waiting for robot',
  running: 'Running on robot', succeeded: 'Succeeded', failed: 'Failed',
  rejected: 'Rejected', cancelled: 'Cancelled',
};

function jobRow(job, pendingJobs){
  const fileName = job.workspacePath.split('/').pop();
  const idx = pendingJobs.indexOf(job);
  const actions = [];
  if (job.status === 'pending'){
    actions.push(`<button type="button" class="p-btn primary" data-approve="${job.id}">Approve</button>`);
    actions.push(`<button type="button" class="p-btn ghost" data-reject="${job.id}">Reject</button>`);
    if (idx > 0) actions.push(`<button type="button" class="p-btn ghost" data-move-up="${job.id}" title="Move up">↑</button>`);
    if (idx < pendingJobs.length - 1) actions.push(`<button type="button" class="p-btn ghost" data-move-down="${job.id}" title="Move down">↓</button>`);
  }
  if (job.status === 'pending' || job.status === 'approved'){
    actions.push(`<button type="button" class="p-btn ghost" data-cancel="${job.id}">Cancel</button>`);
  } else if (job.status === 'running'){
    // A job can get stuck here if the robot's agent crashed/disconnected
    // mid-run without ever reporting back — the one-job-at-a-time DB rule
    // would otherwise block every future job on this robot forever, so
    // this is the only way to clear it.
    actions.push(`<button type="button" class="p-btn ghost" data-cancel="${job.id}">Force stop (stuck?)</button>`);
  }

  return `
    <div class="rq-job rq-status-${job.status}">
      <div class="rq-job-header">
        <span class="rq-status-badge">${STATUS_LABEL[job.status] || job.status}</span>
        <span class="rq-job-who">${escapeHtml(job.studentEmail)} · ${escapeHtml(fileName)}</span>
        <span class="rq-job-time">${new Date(job.submittedAt).toLocaleString()}</span>
      </div>
      <details class="rq-code-details">
        <summary>View submitted code</summary>
        <pre class="rq-code">${escapeHtml(job.code)}</pre>
      </details>
      ${job.output ? `<pre class="rq-output">${escapeHtml(job.output)}</pre>` : ''}
      ${job.status === 'rejected' && job.rejectReason ? `<div class="rq-reason">Reason: ${escapeHtml(job.rejectReason)}</div>` : ''}
      ${job.status === 'failed' || job.status === 'succeeded' ? `<div class="rq-reason">Exit code: ${job.exitCode}</div>` : ''}
      <div class="rq-job-actions">${actions.join('')}</div>
    </div>`;
}

/** Just the queue section's inner content — split out from the rest of the
 * page so the 5s poll (jobs change from student activity, not just admin
 * clicks) can refresh only this subtree instead of the whole panel. A
 * full-page re-render every 5s was interrupting anything else the admin
 * was doing (typing into a seat/email form, an open <details>, scroll
 * position) — this fixes that at the source instead of trying to detect
 * and dodge "is the admin busy right now". */
function queueSectionHtml(jobs){
  const pendingJobs = jobs.filter((j) => j.status === 'pending');
  const openJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'approved' || j.status === 'running');
  const closedJobs = jobs.filter((j) => !openJobs.includes(j)).slice(0, 15);

  return `
    <div class="set-section-title">Run on Robot queue ${pendingJobs.length ? `<span class="set-mock-badge">${pendingJobs.length} pending</span>` : ''}</div>
    ${openJobs.length ? `<div class="rq-list">${openJobs.map((j) => jobRow(j, pendingJobs)).join('')}</div>` : '<div class="set-card"><p class="adm-loading">No submissions waiting right now.</p></div>'}
    ${closedJobs.length ? `<details class="rq-history"><summary>Recent history (${closedJobs.length})</summary><div class="rq-list">${closedJobs.map((j) => jobRow(j, [])).join('')}</div></details>` : ''}
  `;
}

function adminEmailRow(slot, email){
  if (email){
    return `
      <div class="set-row">
        <span class="set-row-text"><span class="set-row-label">Admin ${slot}</span><span class="set-row-desc">${escapeHtml(email)}</span></span>
        <button type="button" class="p-btn ghost" data-change-admin-email data-slot="${slot}">Change</button>
      </div>`;
  }
  return `
    <div class="set-row">
      <span class="set-row-text"><span class="set-row-label">Admin ${slot}</span><span class="set-row-desc">Empty — add a second admin email</span></span>
      <form class="adm-inline-form" data-add-admin-email data-slot="${slot}">
        <input type="email" placeholder="email@school.edu" required>
        <button type="submit" class="p-btn ghost">Save</button>
      </form>
    </div>`;
}

function studentProgressText(student){
  const bits = [];
  if (student.completedCount) bits.push(`${student.completedCount} activit${student.completedCount === 1 ? 'y' : 'ies'} completed`);
  if (student.currentActivityTitle) bits.push(`currently on ${escapeHtml(student.currentActivityTitle)}`);
  return bits.length ? bits.join(' · ') : 'No activity yet';
}

function seatRow(seatNumber, student){
  if (student){
    return `
      <div class="set-row">
        <span class="set-row-text">
          <span class="set-row-label">Seat ${seatNumber} · ${escapeHtml(student.email)}</span>
          <span class="set-row-desc">${studentProgressText(student)}</span>
        </span>
        <span class="adm-row-actions">
          <button type="button" class="p-btn ghost" data-archive="${student.id}">Archive</button>
          <button type="button" class="p-btn ghost" data-delete="${student.id}">Delete forever</button>
        </span>
      </div>`;
  }
  return `
    <div class="set-row">
      <span class="set-row-text"><span class="set-row-label">Seat ${seatNumber} · Empty</span></span>
      <form class="adm-inline-form" data-add-student>
        <input type="email" placeholder="student@school.edu" required>
        <button type="submit" class="p-btn ghost">Add</button>
      </form>
    </div>`;
}

function archivedRow(student){
  return `
    <div class="set-row">
      <span class="set-row-text"><span class="set-row-label">${escapeHtml(student.email)}</span><span class="set-row-desc">Archived — history kept</span></span>
      <span class="adm-row-actions">
        <button type="button" class="p-btn ghost" data-restore="${escapeHtml(student.email)}">Restore</button>
        <button type="button" class="p-btn ghost" data-delete="${student.id}">Delete forever</button>
      </span>
    </div>`;
}

function showError(container, message){
  const note = container.querySelector('[data-admin-note]');
  if (!note) return;
  note.textContent = message;
  note.classList.add('visible');
}

/** Binds the roster/settings actions (seats, admin emails, archive/delete).
 * Only called from fullRender() — these nodes are never touched by the 5s
 * queue poll, so there's no risk of re-binding onto the same DOM twice. */
function bindRosterActions(container, ctx, { fullRender }){
  container.querySelectorAll('[data-add-student]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input').value.trim();
      try { await postAction({ action: 'add_student', email }); await fullRender(); }
      catch (err){ showError(container, err.message); }
    });
  });

  container.querySelectorAll('[data-add-admin-email]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input').value.trim();
      const slot = Number(form.dataset.slot);
      try { await postAction({ action: 'set_admin_email', slot, email }); await fullRender(); }
      catch (err){ showError(container, err.message); }
    });
  });

  container.querySelectorAll('[data-change-admin-email]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = window.prompt('New admin email:');
      if (!email) return;
      try { await postAction({ action: 'set_admin_email', slot: Number(btn.dataset.slot), email: email.trim() }); await fullRender(); }
      catch (err){ showError(container, err.message); }
    });
  });

  container.querySelectorAll('[data-archive]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm("Archive this student? They will lose access, but their history is kept until you delete it forever.")) return;
      try { await postAction({ action: 'archive_student', studentId: Number(btn.dataset.archive) }); await fullRender(); }
      catch (err){ showError(container, err.message); }
    });
  });

  container.querySelectorAll('[data-restore]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try { await postAction({ action: 'add_student', email: btn.dataset.restore }); await fullRender(); }
      catch (err){ showError(container, err.message); }
    });
  });

  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm("Permanently delete this student's data? This erases their account and progress forever and cannot be undone.")) return;
      try { await postAction({ action: 'delete_student', studentId: Number(btn.dataset.delete) }); await fullRender(); }
      catch (err){ showError(container, err.message); }
    });
  });
}

/** Binds the queue subtree's own actions — scoped to `root` (the
 * `[data-queue-root]` element), never the whole panel, so the 5s poll's
 * innerHTML swap-and-rebind can't accumulate duplicate listeners on
 * roster/settings nodes it never touches. */
function bindQueueActions(root, container, { pendingJobs, refreshQueue }){
  root.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try { await postQueueAction({ action: 'approve', jobId: Number(btn.dataset.approve) }); await refreshQueue(); }
      catch (err){ showError(container, err.message); }
    });
  });

  root.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reason = window.prompt('Reason for rejecting (optional):') || '';
      try { await postQueueAction({ action: 'reject', jobId: Number(btn.dataset.reject), reason }); await refreshQueue(); }
      catch (err){ showError(container, err.message); }
    });
  });

  root.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Cancel this submission?')) return;
      try { await postQueueAction({ action: 'cancel', jobId: Number(btn.dataset.cancel) }); await refreshQueue(); }
      catch (err){ showError(container, err.message); }
    });
  });

  root.querySelectorAll('[data-move-up], [data-move-down]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const movingId = Number(btn.dataset.moveUp || btn.dataset.moveDown);
      const dir = btn.dataset.moveUp ? -1 : 1;
      const ids = pendingJobs.map((j) => j.id);
      const i = ids.indexOf(movingId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      try { await postQueueAction({ action: 'reorder', orderedIds: ids }); await refreshQueue(); }
      catch (err){ showError(container, err.message); }
    });
  });
}

export function mount(container, ctx){
  ctx.setAppTitle && ctx.setAppTitle('Admin');

  async function fullRender(){
    container.innerHTML = `<div class="adm-root p-scroll la-surface"><p class="adm-loading">Loading…</p></div>`;

    let state, jobs;
    try {
      [state, jobs] = await Promise.all([fetchState(), fetchQueue()]);
    } catch (e){
      container.querySelector('.adm-root').innerHTML = `<p class="adm-loading">${escapeHtml(e.message)}</p>`;
      return;
    }

    const activeStudents = state.students.filter((s) => s.status === 'active');
    const archivedStudents = state.students.filter((s) => s.status === 'archived');
    const seatMap = new Map(activeStudents.map((s) => [s.seatNumber, s]));
    const seatRows = [];
    for (let n = 1; n <= MAX_ACTIVE_SEATS; n++) seatRows.push(seatRow(n, seatMap.get(n)));

    // Queue first — it's the thing that needs an admin's attention right
    // now (a student is waiting on a review), everything below it is
    // steady-state roster management that doesn't page an admin in.
    container.innerHTML = `
      <div class="adm-root p-scroll la-surface">
        <div class="set-section" data-queue-root>${queueSectionHtml(jobs)}</div>

        <div class="set-section">
          <div class="set-section-title">Robot</div>
          <div class="set-card">
            <div class="set-row"><span class="set-row-text"><span class="set-row-label">Serial number</span></span><span>${escapeHtml(state.robotSerial || '—')}</span></div>
          </div>
        </div>

        <div class="set-section">
          <div class="set-section-title">Admin access</div>
          <div class="set-card">
            ${adminEmailRow(1, state.adminEmails[0])}
            ${adminEmailRow(2, state.adminEmails[1])}
          </div>
        </div>

        <div class="set-section">
          <div class="set-section-title">Student seats <span class="set-mock-badge">${activeStudents.length} / ${MAX_ACTIVE_SEATS} active</span></div>
          <div class="set-card">${seatRows.join('')}</div>
        </div>

        ${archivedStudents.length ? `
          <div class="set-section">
            <div class="set-section-title">Archived students <span class="set-mock-badge">${state.students.length} / ${MAX_TOTAL_STUDENTS} total</span></div>
            <div class="set-card">${archivedStudents.map(archivedRow).join('')}</div>
          </div>` : ''}

        <div class="adm-note" data-admin-note></div>
      </div>`;

    bindRosterActions(container, ctx, { fullRender });
    bindQueueActions(container.querySelector('[data-queue-root]'), container, {
      pendingJobs: jobs.filter((j) => j.status === 'pending'),
      refreshQueue,
    });
  }

  /** Re-fetches and re-renders ONLY the queue subtree — used by the 5s
   * poll, and after any queue action, so approving/rejecting/etc. doesn't
   * blow away seat-list scroll position or an in-progress edit elsewhere
   * on the page. */
  async function refreshQueue(){
    const root = container.querySelector('[data-queue-root]');
    if (!root) return; // panel isn't mounted (e.g. still on the loading state)
    const jobs = await fetchQueue();
    root.innerHTML = queueSectionHtml(jobs);
    bindQueueActions(root, container, {
      pendingJobs: jobs.filter((j) => j.status === 'pending'),
      refreshQueue,
    });
  }

  fullRender();
  const pollTimer = setInterval(refreshQueue, 5000);
  return { unmount(){ clearInterval(pollTimer); } };
}
