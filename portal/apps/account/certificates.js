/* Certificates section of the Account window: progress toward the Foundation
 * certificate, the timed assessment, and the download once it is earned. */
import { escapeHtml } from '../../utils.js';
import { renderCertificate, canvasToPngBlob, canvasToPdfBlob, CERTIFICATES } from '../../services/certificate.js';

async function call(method, body){
  const res = await fetch('/api/certificates', {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: res.status, data });
  return data;
}

function download(blob, filename){
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function waitText(iso){
  const mins = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
  return mins >= 60 ? `about ${Math.ceil(mins / 60)} hour${mins > 90 ? 's' : ''}` : `${mins} minute${mins === 1 ? '' : 's'}`;
}

export async function mountCertificates(host, { isGuest, defaultName }){
  if (isGuest){
    host.innerHTML = `<div class="cert-card"><div class="cert-title">Foundations of Humanoid Robotics</div>
      <p class="cert-note">Sign in with your school or Google account to earn certificates. Guest progress stays in this browser and can't be verified.</p></div>`;
    return;
  }
  host.innerHTML = '<div class="cert-card"><p class="cert-note">Loading…</p></div>';

  let state;
  async function refresh(){
    try { state = await call('GET'); }
    catch (error){ host.innerHTML = '<div class="cert-card"><p class="cert-note">Certificates couldn’t load right now. Reopen this window to try again.</p></div>'; return false; }
    return true;
  }

  async function render(){
    if (!await refresh()) return;
    const built = state.labs.filter((l) => !l.placeholder);
    const finished = state.labs.filter((l) => l.done && l.ran).length;
    const waiting = state.labs.filter((l) => l.placeholder).length;
    const a = state.assessment;
    const cert = state.certificate;

    const labsLine = `<div class="cert-step ${state.labsUnlocked ? 'ok' : ''}">
      <span class="cert-step-mark">${state.labsUnlocked ? '✓' : '1'}</span>
      <span class="cert-step-text"><strong>Finish every foundation lab on the robot</strong>
      <span>${finished} of ${state.labs.length} done. Each lab has to be marked complete and its code run successfully on the real robot.${waiting ? ` Labs ${built.length + 1}–${state.labs.length} are still being written.` : ''}</span></span></div>`;
    const quizLine = `<div class="cert-step ${a.passed ? 'ok' : ''}">
      <span class="cert-step-mark">${a.passed ? '✓' : '2'}</span>
      <span class="cert-step-text"><strong>Pass the Foundations Assessment</strong>
      <span>${a.questionCount} questions, ${a.secondsPerQuestion} seconds each, ${a.passMark} right to pass. Some questions are about your own robot runs.</span></span></div>`;
    const certLine = `<div class="cert-step ${cert ? 'ok' : ''}">
      <span class="cert-step-mark">${cert ? '✓' : '3'}</span>
      <span class="cert-step-text"><strong>Get your certificate</strong><span>Download it as a PNG or PDF. Anyone can verify it at swayform.net/verify.</span></span></div>`;

    let action = '';
    if (cert){
      action = `<div class="cert-done">
        <div class="cert-id">${escapeHtml(cert.id)}</div>
        <div class="cert-actions">
          <button type="button" class="p-btn primary" data-download="png">Download PNG</button>
          <button type="button" class="p-btn" data-download="pdf">Download PDF</button>
        </div></div>`;
    } else if (a.passed){
      action = `<div class="cert-name-row">
        <label for="cert-name">Name to print on your certificate</label>
        <input id="cert-name" class="cert-input" maxlength="60" value="${escapeHtml(defaultName || '')}" autocomplete="name">
        <p class="cert-note">Use your real name. It can't be changed after it's issued.</p>
        <button type="button" class="p-btn primary" data-issue>Get my certificate</button>
        <p class="cert-error" data-error hidden></p></div>`;
    } else if (state.labsUnlocked){
      action = a.retryAt
        ? `<button type="button" class="p-btn" disabled>Try again in ${waitText(a.retryAt)}</button>`
        : `<button type="button" class="p-btn primary" data-start>${a.current ? 'Continue assessment' : 'Start assessment'}</button>
           ${a.lastResult && a.lastResult.status === 'failed' ? `<p class="cert-note">Last attempt: ${a.lastResult.score} of ${a.questionCount}. You need ${a.passMark}.</p>` : ''}`;
    } else {
      action = '<button type="button" class="p-btn" disabled>Locked until every foundation lab is finished</button>';
    }

    host.innerHTML = `<div class="cert-card">
      <div class="cert-title">${escapeHtml(state.program)}</div>
      <div class="cert-sub">SwayForm Foundation Labs certificate</div>
      <div class="cert-steps">${labsLine}${quizLine}${certLine}</div>
      <div class="cert-action">${action}</div></div>`;

    const startBtn = host.querySelector('[data-start]');
    if (startBtn) startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      try {
        const out = a.current ? { question: a.current } : await call('POST', { action: 'start' });
        await runAssessment(out.question);
      } catch (error){
        startBtn.disabled = false;
        if (error.status === 429) { await render(); return; }
      }
      await render();
    });

    const issueBtn = host.querySelector('[data-issue]');
    if (issueBtn) issueBtn.addEventListener('click', async () => {
      const errorEl = host.querySelector('[data-error]');
      issueBtn.disabled = true;
      errorEl.hidden = true;
      try {
        await call('POST', { action: 'issue', name: host.querySelector('#cert-name').value });
        await render();
      } catch (error){
        issueBtn.disabled = false;
        errorEl.textContent = error.data && error.data.error === 'invalid_name'
          ? 'Use letters only, 2 to 60 characters.' : 'Couldn’t issue the certificate. Try again in a moment.';
        errorEl.hidden = false;
      }
    });

    host.querySelectorAll('[data-download]').forEach((btn) => btn.addEventListener('click', async () => {
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Preparing…';
      try {
        const canvas = await renderCertificate({ cert: CERTIFICATES.foundation, name: cert.name, date: new Date(cert.issuedAt), certificateId: cert.id });
        const kind = btn.dataset.download;
        download(kind === 'pdf' ? await canvasToPdfBlob(canvas) : await canvasToPngBlob(canvas), `SwayForm-Certificate-${cert.id}.${kind}`);
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    }));
  }

  function runAssessment(first){
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cert-quiz-overlay';
      overlay.innerHTML = '<div class="cert-quiz" role="dialog" aria-modal="true"></div>';
      const box = overlay.firstElementChild;
      ['copy', 'cut', 'paste', 'contextmenu', 'dragstart'].forEach((type) => overlay.addEventListener(type, (e) => e.preventDefault()));
      const root = host.closest('.acct-root') || host;
      if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
      root.appendChild(overlay);

      let timer = null;
      let busy = false;

      function showQuestion(q){
        busy = false;
        const end = Date.now() + q.secondsLeft * 1000;
        box.innerHTML = `
          <div class="cert-quiz-head"><span>Question ${q.index} of ${q.total}</span><span class="cert-quiz-time" data-time>${q.secondsLeft}s</span></div>
          <div class="cert-quiz-bar"><span data-bar></span></div>
          <pre class="cert-quiz-prompt">${escapeHtml(q.prompt)}</pre>
          <div class="cert-quiz-options">${q.options.map((o, i) => `<button type="button" class="cert-option" data-choice="${i}">${escapeHtml(o)}</button>`).join('')}</div>
          <p class="cert-note">One try per question. Running out of time counts as wrong.</p>`;
        const timeEl = box.querySelector('[data-time]');
        const barEl = box.querySelector('[data-bar]');
        clearInterval(timer);
        const total = Math.max(1, q.secondsLeft);
        timer = setInterval(() => {
          const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
          timeEl.textContent = `${left}s`;
          barEl.style.width = `${(left / total) * 100}%`;
          if (left <= 0) submit(q, null);
        }, 250);
        box.querySelectorAll('[data-choice]').forEach((btn) => btn.addEventListener('click', () => submit(q, Number(btn.dataset.choice))));
      }

      async function submit(q, choice){
        if (busy) return;
        busy = true;
        clearInterval(timer);
        box.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        try {
          const out = await call('POST', { action: 'answer', index: q.index, choice });
          if (out.finished) return showResult(out);
          showQuestion(out.question);
        } catch (error){
          box.innerHTML = '<p class="cert-note">Something went wrong. Close this and reopen it to continue.</p><button type="button" class="p-btn" data-close>Close</button>';
          box.querySelector('[data-close]').addEventListener('click', close);
        }
      }

      function showResult(out){
        box.innerHTML = `<div class="cert-quiz-result">
          <div class="cert-quiz-score">${out.score} / ${out.total}</div>
          <p>${out.passed ? 'You passed the Foundations Assessment.' : `You needed ${out.passMark}. You can try again after a short break; the questions will be different.`}</p>
          <button type="button" class="p-btn primary" data-close>${out.passed ? 'Continue' : 'Close'}</button></div>`;
        box.querySelector('[data-close]').addEventListener('click', close);
      }

      function close(){ clearInterval(timer); overlay.remove(); resolve(); }
      showQuestion(first);
    });
  }

  await render();
}
