import { escapeHtml } from '../../utils.js';
import { subscribeQueue, refreshQueueNow } from '../../services/robot-jobs-service.js';
import { isInteractiveRobotPath } from '../learn/workspace/ros-paths.js';
import { openTargetLockPopup } from '../learn/workspace/target-lock-popup.js';

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

// The list comes from robot-jobs-service.js; code/output are fetched per job on demand.
async function fetchJobDetail(jobId, { sinceLen, includeCode }){
  const params = new URLSearchParams({ view: 'job', id: String(jobId), sinceLen: String(sinceLen || 0) });
  if (includeCode) params.set('include', 'code');
  const res = await fetch(`/api/robot/queue?${params}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'This job is no longer available.' : 'Could not load this job. Try again.');
  return (await res.json()).job;
}

const MAX_SHOWN_OUTPUT_CHARS = 64 * 1024;

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

function detailBodyHtml(job, detail){
  if (!detail || (detail.code === null && !detail.error)) return '<p class="adm-loading">Loading…</p>';
  if (detail.error && detail.code === null) return `<p class="adm-loading">${escapeHtml(detail.error)}</p>`;
  const showOutputHere = job.status !== 'running' && detail.output;
  return `<pre class="rq-code">${escapeHtml(detail.code)}</pre>${showOutputHere ? `<pre class="rq-output">${escapeHtml(detail.output)}</pre>` : ''}`;
}

function jobRow(job, pendingJobs, detail){
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
    // Read-only: the admin sees the student's live view without taking the controls.
    if (isInteractiveRobotPath(job.workspacePath)) actions.push(`<button type="button" class="p-btn primary" data-watch-live="${job.id}">Watch live</button>`);
    // Sends a stop request to the connected agent — it does not touch this
    // row's status itself (see the cancel action: a browser click never
    // gets to unilaterally declare a running job stopped). The row only
    // moves once the agent reports back what actually happened on the
    // hardware. If the agent isn't connected, or its build doesn't yet
    // handle a stop request, physically stop the robot and reconcile the
    // stuck row with support.
    actions.push(`<button type="button" class="p-btn ghost" data-stop="${job.id}">Send stop signal</button>`);
    actions.push(`<span class="p-muted rq-stop-note">Confirms delivery to the robot's connection, not that it physically stopped — verify in person.</span>`);
    // Last resort: a job with no connected agent (crash, reconnect, pulled
    // plug) has no automatic way out of "running" — it would otherwise block
    // every future job for this robot forever. This clears the database
    // lock only; it never claims to know or affect physical state, which is
    // why the confirm dialog itself carries that requirement.
    actions.push(`<button type="button" class="p-btn ghost rq-reconcile" data-reconcile="${job.id}">Mark reconciled…</button>`);
  }

  return `
    <div class="rq-job rq-status-${job.status}">
      <div class="rq-job-header">
        <span class="rq-status-badge">${STATUS_LABEL[job.status] || job.status}</span>
        <span class="rq-job-who">${escapeHtml(job.studentEmail)} · ${escapeHtml(fileName)}</span>
        <span class="rq-job-time">${new Date(job.submittedAt).toLocaleString()}</span>
      </div>
      <details class="rq-code-details" data-job-id="${job.id}">
        <summary>View submitted code${job.status !== 'running' && job.outputTotalLen ? ' and output' : ''}</summary>
        <div data-detail-body="${job.id}">${detailBodyHtml(job, detail)}</div>
      </details>
      ${job.status === 'running' ? `<pre class="rq-output" data-live-output="${job.id}"${detail && detail.output ? '' : ' hidden'}>${escapeHtml(detail ? detail.output : '')}</pre>` : ''}
      ${job.status === 'rejected' && job.rejectReason ? `<div class="rq-reason">Reason: ${escapeHtml(job.rejectReason)}</div>` : ''}
      ${job.status === 'failed' || job.status === 'succeeded' ? `<div class="rq-reason">Exit code: ${job.exitCode}</div>` : ''}
      <div class="rq-job-actions">${actions.join('')}</div>
    </div>`;
}

// Queue subtree only, so a queue change doesn't re-render the roster forms.
// jobs is null until first load; stale keeps the last known queue on screen, labelled.
function queueSectionHtml(jobs, details, stale){
  const title = (pendingCount) => `
    <div class="set-section-title">
      Run on Robot queue ${pendingCount ? `<span class="set-mock-badge">${pendingCount} pending</span>` : ''}
      <a class="p-btn ghost rq-export" href="/api/robot/queue?format=csv">Export CSV</a>
    </div>
    ${stale ? `<p class="p-muted" role="status">Couldn't refresh the queue${jobs ? ' — showing the last known state' : ''}. Retrying…</p>` : ''}`;

  if (!jobs) return `${title(0)}${stale ? '' : '<div class="set-card"><p class="adm-loading">Loading queue…</p></div>'}`;

  const pendingJobs = jobs.filter((j) => j.status === 'pending');
  const openJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'approved' || j.status === 'running');
  const closedJobs = jobs.filter((j) => !openJobs.includes(j)).slice(0, 15);

  return `
    ${title(pendingJobs.length)}
    ${openJobs.length ? `<div class="rq-list">${openJobs.map((j) => jobRow(j, pendingJobs, details.get(j.id))).join('')}</div>` : '<div class="set-card"><p class="adm-loading">No submissions waiting right now.</p></div>'}
    ${closedJobs.length ? `
      <details class="rq-history">
        <summary>Recent history (${closedJobs.length})</summary>
        <div class="rq-history-actions"><button type="button" class="p-btn ghost" data-clear-history>Clear history</button></div>
        <div class="rq-list">${closedJobs.map((j) => jobRow(j, [], details.get(j.id))).join('')}</div>
      </details>` : ''}
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
          <button type="button" class="p-btn ghost" data-delete="${student.id}">Remove from class</button>
        </span>
      </div>`;
  }
  return `
    <div class="set-row">
      <span class="set-row-text"><span class="set-row-label">Seat ${seatNumber} · Empty</span></span>
      <form class="adm-inline-form" data-add-student>
        <input type="email" placeholder="student@school.edu" required>
        <button type="submit" class="p-btn ghost">Invite</button>
      </form>
    </div>`;
}

function archivedRow(student){
  return `
    <div class="set-row">
      <span class="set-row-text"><span class="set-row-label">${escapeHtml(student.email)}</span><span class="set-row-desc">Archived — personal progress preserved</span></span>
      <span class="adm-row-actions">
        <button type="button" class="p-btn ghost" data-restore="${escapeHtml(student.email)}">Invite again</button>
        <button type="button" class="p-btn ghost" data-delete="${student.id}">Remove from class</button>
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
  container.querySelectorAll('[data-cancel-invitation]').forEach((button) => {
    button.addEventListener('click', async () => {
      try { await postAction({ action: 'cancel_invitation', invitationId: Number(button.dataset.cancelInvitation) }); await fullRender(); }
      catch (error){ showError(container, error.message); }
    });
  });
  container.querySelectorAll('[data-add-student]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input').value.trim();
      try { await postAction({ action: 'add_student', email }); await fullRender(); showError(container, 'Invitation created. Ask the student to sign in and open Account to accept it. No email is sent automatically.'); }
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
      if (!window.confirm("Archive this student? They will lose class access. Their personal learning progress is preserved.")) return;
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
      if (!window.confirm("Remove this student from your class? This does not delete their personal account or learning progress.")) return;
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
  root.querySelectorAll('[data-watch-live]').forEach((btn) => {
    btn.addEventListener('click', () => openTargetLockPopup({ spectate: true }));
  });

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

  root.querySelectorAll('[data-stop]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm("Send a stop request to the robot's connected agent? This does not mark the job stopped here — verify physically.")) return;
      try {
        const result = await postQueueAction({ action: 'stop', jobId: Number(btn.dataset.stop) });
        window.alert(result.delivered
          ? "Stop signal delivered to the robot's connection. This does not confirm physical motion actually stopped — verify in person."
          : "The robot's agent isn't currently connected — nothing was delivered. Stop it physically.");
      }
      catch (err){ showError(container, err.message); }
    });
  });

  root.querySelectorAll('[data-reconcile]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm(
        "Only do this after physically confirming the robot is stopped and this job is not moving it.\n\n" +
        "This clears the database lock so future jobs can run again — it does NOT stop the robot and does not " +
        "verify anything on its own. Use this when the agent crashed, reconnected, or was disconnected mid-job " +
        "and will never report back.\n\nMark this job reconciled?"
      )) return;
      try { await postQueueAction({ action: 'reconcile', jobId: Number(btn.dataset.reconcile), outcome: 'failed' }); await refreshQueue(); }
      catch (err){ showError(container, err.message); }
    });
  });

  const clearHistoryBtn = root.querySelector('[data-clear-history]');
  if (clearHistoryBtn){
    clearHistoryBtn.addEventListener('click', async () => {
      if (!window.confirm('Permanently delete this robot\'s finished submission history (succeeded/failed/rejected/cancelled)? Pending, approved, and running jobs are not affected. This cannot be undone.')) return;
      try { await postQueueAction({ action: 'clear_history' }); await refreshQueue(); }
      catch (err){ showError(container, err.message); }
    });
  }

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

  let jobs = null;
  let queueStale = false;
  let unmounted = false;
  const details = new Map(); // jobId -> { code, output, outputLen, error, loading }

  function paintDetail(jobId){
    const job = jobs && jobs.find((j) => j.id === jobId);
    const detail = details.get(jobId);
    if (!job || !detail) return;
    const body = container.querySelector(`[data-detail-body="${jobId}"]`);
    if (body) body.innerHTML = detailBodyHtml(job, detail);
    const live = container.querySelector(`[data-live-output="${jobId}"]`);
    if (live){ live.textContent = detail.output; live.hidden = !detail.output; }
  }

  // Fetches only what's missing: code once, output from where it left off.
  function ensureDetail(job, needCode){
    let detail = details.get(job.id);
    if (!detail){ detail = { code: null, output: '', outputLen: 0, error: null, loading: null }; details.set(job.id, detail); }
    const wantCode = needCode && detail.code === null;
    const wantOutput = job.outputTotalLen > detail.outputLen;
    if ((!wantCode && !wantOutput) || detail.loading) return;
    detail.loading = (async () => {
      try {
        const loaded = await fetchJobDetail(job.id, { sinceLen: detail.outputLen, includeCode: wantCode });
        if (wantCode) detail.code = loaded.code || '';
        if (loaded.outputTotalLen > detail.outputLen){
          const gap = loaded.outputTruncated ? '\n[some output in between was not retained]\n' : '';
          detail.output = (detail.output + gap + (loaded.outputTail || '')).slice(-MAX_SHOWN_OUTPUT_CHARS);
          detail.outputLen = loaded.outputTotalLen;
        }
        detail.error = null;
      } catch (e){
        detail.error = e.message;
      } finally {
        detail.loading = null;
      }
      if (unmounted) return;
      paintDetail(job.id);
      // Panel may have opened mid-load; fetch its code now (not after an error, to avoid a loop).
      const current = jobs && jobs.find((j) => j.id === job.id);
      const panel = container.querySelector(`.rq-code-details[data-job-id="${job.id}"]`);
      if (current && panel && panel.open && !detail.error) ensureDetail(current, true);
    })();
  }

  function syncDetails(root){
    if (!jobs) return;
    const ids = new Set(jobs.map((j) => j.id));
    for (const id of details.keys()) if (!ids.has(id)) details.delete(id);

    const openIds = new Set(Array.from(root.querySelectorAll('.rq-code-details[open]')).map((el) => Number(el.dataset.jobId)));
    jobs.forEach((job) => {
      const panelOpen = openIds.has(job.id);
      if (panelOpen || (job.status === 'running' && job.outputTotalLen > 0)) ensureDetail(job, panelOpen);
    });
    root.querySelectorAll('.rq-code-details').forEach((el) => {
      el.addEventListener('toggle', () => {
        const job = jobs && jobs.find((j) => j.id === Number(el.dataset.jobId));
        if (el.open && job) ensureDetail(job, true);
      });
    });
  }

  async function fullRender(){
    container.innerHTML = `<div class="adm-root p-scroll la-surface"><p class="adm-loading">Loading…</p></div>`;

    let state;
    try {
      state = await fetchState();
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
        <div class="set-section" data-queue-root></div>

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

        <div class="set-section">
          <div class="set-section-title">Pending student invitations</div>
          <p>Students must sign in and accept in Account before you can see their progress. Invitations expire after 14 days; no email is sent automatically.</p>
          ${(state.invitations || []).map((invite) => `<div class="set-row"><span>${escapeHtml(invite.email)}</span><button class="p-btn ghost" data-cancel-invitation="${invite.id}">Cancel invitation</button></div>`).join('') || '<p>No pending invitations.</p>'}
        </div>
        <div class="adm-note" data-admin-note role="status"></div>
      </div>`;

    bindRosterActions(container, ctx, { fullRender });
    renderQueue();
  }

  function renderQueue(){
    const root = container.querySelector('[data-queue-root]');
    if (!root) return;
    // Keep open <details> open across the innerHTML swap.
    const wasHistoryOpen = !!root.querySelector('.rq-history[open]');
    const openCodeJobIds = Array.from(root.querySelectorAll('.rq-code-details[open]'))
      .map((el) => el.dataset.jobId);
    root.innerHTML = queueSectionHtml(jobs, details, queueStale);
    if (wasHistoryOpen){
      const historyEl = root.querySelector('.rq-history');
      if (historyEl) historyEl.open = true;
    }
    openCodeJobIds.forEach((id) => {
      const el = root.querySelector(`.rq-code-details[data-job-id="${id}"]`);
      if (el) el.open = true;
    });
    if (!jobs) return;
    syncDetails(root);
    bindQueueActions(root, container, {
      pendingJobs: jobs.filter((j) => j.status === 'pending'),
      refreshQueue: refreshQueueNow,
    });
  }

  fullRender();

  const unsubscribe = subscribeQueue({
    onJobs(latest){ jobs = latest; queueStale = false; renderQueue(); },
    onError(){ if (!queueStale){ queueStale = true; renderQueue(); } },
    isViewing: () => container.offsetParent !== null, // minimized = display:none
  });

  // Refresh at once when the window is un-minimized.
  let wasOnScreen = true;
  const screenWatch = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
        const onScreen = entries.some((e) => e.isIntersecting);
        if (onScreen && !wasOnScreen) refreshQueueNow();
        wasOnScreen = onScreen;
      })
    : null;
  if (screenWatch) screenWatch.observe(container);

  return {
    onFocus(){ refreshQueueNow(); },
    unmount(){
      unmounted = true;
      unsubscribe();
      if (screenWatch) screenWatch.disconnect();
    },
  };
}
