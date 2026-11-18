/* Interactive lesson blocks: mcq, match, quiz (fields are listed in README.md).
   A block that must be solved to finish a lab carries data-gate and fires cb-gate when it changes. */

import { isAdminView } from './admin-view.js';
import { hasPassedQuiz, recordQuizPass, lastQuizTry, startQuizTry, finishQuizTry, nextQuizTryAt, QUIZ_WAIT_MINUTES } from '../../services/quiz-passes.js';
import { recordQuizResult } from '../../services/progress-service.js';

// The quiz open full screen in this page, if any, so its lab block can tell a running try from an abandoned one.
let openQuizId = null;

function adminNote(html){
  const d = document.createElement('div');
  d.className = 'cb-admin-answer';
  d.innerHTML = '<span>Admin only</span>' + html;
  return d;
}

function shuffled(list){
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function button(label, primary){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = primary ? 'p-btn primary' : 'p-btn';
  b.textContent = label;
  return b;
}

const clockTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function setGate(node, state){
  if (node.dataset.gate === undefined) return;
  node.dataset.gate = state;
  node.dispatchEvent(new CustomEvent('cb-gate', { bubbles: true }));
}

function initGate(node, block, hint){
  if (block.required === false) return;
  node.dataset.gate = 'pending';
  node.dataset.gateHint = hint;
}

/* One question with clickable answers. Wrong picks grey out; the right pick locks the block. */
function renderMcq(block, h){
  const wrap = h.el('div', 'cb-q');
  initGate(wrap, block, 'Answer every question to finish this lab.');
  wrap.innerHTML = `<p class="cb-q-text">${h.inlineHtml(block.question)}</p><div class="cb-q-opts"></div><div class="cb-q-feedback" role="status" aria-live="polite"></div>`;
  const opts = wrap.querySelector('.cb-q-opts');
  const feedback = wrap.querySelector('.cb-q-feedback');
  shuffled(block.options.map((text, index) => ({ text, index }))).forEach((opt) => {
    const btn = h.el('button', 'cb-q-opt');
    btn.type = 'button';
    btn.innerHTML = `<span class="cb-q-opt-mark"></span><span>${h.inlineHtml(opt.text)}</span>`;
    btn.addEventListener('click', () => {
      if (wrap.classList.contains('solved')) return;
      if (opt.index === block.answer){
        btn.classList.add('right');
        wrap.classList.add('solved');
        opts.querySelectorAll('.cb-q-opt').forEach((b) => { b.disabled = true; });
        feedback.innerHTML = `<strong>Correct.</strong> ${block.explain ? h.inlineHtml(block.explain) : ''}`;
        setGate(wrap, 'done');
      } else {
        btn.classList.add('wrong');
        btn.disabled = true;
        feedback.textContent = block.hint ? `Not quite. ${block.hint}` : 'Not quite. Try another answer.';
      }
    });
    opts.appendChild(btn);
  });
  if (isAdminView()) wrap.appendChild(adminNote(`Answer: <strong>${h.inlineHtml(block.options[block.answer])}</strong>${block.explain ? '<br>' + h.inlineHtml(block.explain) : ''}`));
  return wrap;
}

/* Pair each item on the left with its partner on the right using dropdowns. Right-hand texts must be unique.
   Optional `distractors` are extra wrong answers in every dropdown, so the last pair can't be found by elimination. */
function renderMatch(block, h){
  const wrap = h.el('div', 'cb-q cb-match');
  initGate(wrap, block, 'Finish the matching activity to finish this lab.');
  wrap.innerHTML = `<p class="cb-q-text">${h.inlineHtml(block.prompt || 'Match each item on the left with the right description.')}</p><div class="cb-match-rows"></div><div class="cb-q-actions"><button type="button" class="p-btn" data-check>Check matches</button></div><div class="cb-q-feedback" role="status" aria-live="polite"></div>`;
  const rowsEl = wrap.querySelector('.cb-match-rows');
  const feedback = wrap.querySelector('.cb-q-feedback');
  const checkBtn = wrap.querySelector('[data-check]');
  const rights = shuffled(block.pairs.map((p) => p[1]).concat(block.distractors || []));
  const rows = block.pairs.map(([left, right]) => {
    const row = h.el('div', 'cb-match-row');
    const term = h.el('div', 'cb-match-left', h.inlineHtml(left));
    const select = h.el('select', 'cb-match-select');
    select.setAttribute('aria-label', `Match for ${left.replace(/`/g, '')}`);
    select.appendChild(new Option('Choose…', ''));
    rights.forEach((text) => select.appendChild(new Option(text, text)));
    select.addEventListener('change', () => row.classList.remove('right', 'wrong'));
    row.appendChild(term);
    row.appendChild(select);
    rowsEl.appendChild(row);
    return { row, select, right };
  });
  checkBtn.addEventListener('click', () => {
    let correct = 0;
    rows.forEach(({ row, select, right }) => {
      const ok = select.value === right;
      row.classList.toggle('right', ok);
      row.classList.toggle('wrong', !ok && select.value !== '');
      if (ok){ correct++; select.disabled = true; }
    });
    if (correct === rows.length){
      checkBtn.disabled = true;
      wrap.classList.add('solved');
      feedback.innerHTML = `<strong>All ${rows.length} match.</strong> ${block.explain ? h.inlineHtml(block.explain) : ''}`;
      setGate(wrap, 'done');
    } else {
      feedback.textContent = `${correct} of ${rows.length} match. Fix the marked ones and check again.`;
    }
  });
  if (isAdminView()) wrap.appendChild(adminNote(block.pairs.map(([l, r]) => `${h.inlineHtml(l)} &rarr; <strong>${h.inlineHtml(r)}</strong>`).join('<br>')));
  return wrap;
}

/* A scored quiz. In the lab it says how to prepare and offers Start; the quiz itself runs full screen (openQuizScreen).
   A pass is remembered. Students wait QUIZ_WAIT_MINUTES between tries; admins never wait. */
function renderQuiz(block, h){
  const pass = block.passPercent || 80;
  const count = Math.min(block.count || block.questions.length, block.questions.length);
  const admin = isAdminView();
  const wrap = h.el('div', 'cb-q cb-quiz');
  initGate(wrap, block, `Pass the quiz with ${pass}% or better to finish this lab.`);
  wrap.innerHTML = `
    <p class="cb-quiz-title">${h.inlineHtml(block.title || 'Quiz')}</p>
    <div data-intro>
      <p class="cb-p">${count} questions. You need ${pass}% or better to pass.</p>
      <p class="cb-quiz-sub">Before you start</p>
      <ul class="cb-list">
        ${block.prepare ? `<li class="cb-li">${h.inlineHtml(block.prepare)}</li>` : ''}
        <li class="cb-li">The quiz fills the screen, and you can't leave it until you submit.</li>
        <li class="cb-li">The questions come in a different order every time.</li>
        <li class="cb-li">If you don't pass, you can take it again ${QUIZ_WAIT_MINUTES} minutes after you submit.</li>
      </ul>
    </div>
    <p class="cb-quiz-status" role="status" aria-live="polite"></p>
    <div class="cb-q-actions"></div>`;
  const intro = wrap.querySelector('[data-intro]');
  const status = wrap.querySelector('.cb-quiz-status');
  const actions = wrap.querySelector('.cb-q-actions');
  let timer = null;

  const show = (text, ...buttons) => { status.textContent = text; actions.replaceChildren(...buttons); };
  const later = (ms) => { timer = setTimeout(() => { if (wrap.isConnected) refresh(); }, ms); };

  function startButton(label){
    const btn = button(label, true);
    btn.addEventListener('click', () => {
      const go = button('Start now', true);
      const back = button('Not yet');
      go.addEventListener('click', start);
      back.addEventListener('click', refresh);
      show(`Have you prepared? Once the quiz starts you can't leave it until you submit, and if you don't pass you wait ${QUIZ_WAIT_MINUTES} minutes to try again.`, go, back);
      go.focus();
    });
    return btn;
  }

  function start(){
    if (!admin && (hasPassedQuiz(block.id) || nextQuizTryAt(block.id) > Date.now())){ refresh(); return; }
    openQuizScreen(block, h, () => { refresh(); actions.querySelector('button')?.focus(); });
    refresh();
  }

  function refresh(){
    clearTimeout(timer);
    const last = lastQuizTry(block.id);
    if (openQuizId === block.id){ intro.hidden = true; show('Quiz in progress.'); later(1000); return; }
    if (hasPassedQuiz(block.id)){
      if (wrap.dataset.gate === 'pending') setGate(wrap, 'done');
      intro.hidden = true;
      show(last?.percent != null ? `Passed with ${last.percent}%.` : 'Passed.', ...(admin ? [startButton('Take it again')] : []));
      return;
    }
    intro.hidden = false;
    const wait = admin ? 0 : nextQuizTryAt(block.id);
    if (wait > Date.now()){
      const minutes = Math.ceil((wait - Date.now()) / 60000);
      const lastText = last.endedAt == null ? 'Your last try was not submitted, so it counts as a try.' : `Last try: ${last.percent}%. You need ${pass}%.`;
      const btn = startButton('Start quiz');
      btn.disabled = true;
      show(`${lastText} You can take it again at ${clockTime(wait)}, in ${minutes} minute${minutes === 1 ? '' : 's'}.`, btn);
      later(Math.min(wait - Date.now() + 250, 30000));
      return;
    }
    show(last?.percent != null ? `Last try: ${last.percent}%. You need ${pass}%.` : '', startButton('Start quiz'));
  }

  refresh();
  return wrap;
}

/* The quiz itself: only the questions and their answers, over the whole screen. A student can't leave it until they
   submit (leaving the page anyway still counts as a try). Admins see the answers and can close it. */
function openQuizScreen(block, h, onClose){
  const admin = isAdminView();
  const pass = block.passPercent || 80;
  const picked = shuffled(block.questions).slice(0, Math.min(block.count || block.questions.length, block.questions.length));
  const run = Date.now().toString(36);
  if (!admin) startQuizTry(block.id);
  openQuizId = block.id;

  const screen = h.el('div', 'qz-screen la-surface');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', `qz-title-${run}`);
  screen.innerHTML = `
    <div class="qz-bar"><div class="qz-bar-in">
      <h2 class="qz-title" id="qz-title-${run}" tabindex="-1">${h.inlineHtml(block.title || 'Quiz')}</h2>
      <span class="qz-count" data-count></span>
      ${admin ? '<button type="button" class="p-btn" data-close>Close</button>' : ''}
    </div></div>
    <div class="qz-scroll p-scroll" data-scroll><div class="qz-doc">
      <p class="qz-result" data-result hidden></p>
      <div data-list></div>
      <div class="qz-foot"><button type="button" class="p-btn primary" data-submit disabled>Submit</button><span class="qz-foot-note" data-note></span></div>
    </div></div>`;
  const $ = (sel) => screen.querySelector(sel);
  const list = $('[data-list]');
  const countEl = $('[data-count]');
  const submitBtn = $('[data-submit]');
  const footNote = $('[data-note]');
  const titleEl = $('.qz-title');

  const items = picked.map((q, qi) => {
    const box = h.el('div', 'qz-q');
    box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-labelledby', `qz-${run}-${qi}`);
    box.innerHTML = `<p class="qz-q-text" id="qz-${run}-${qi}"><span class="qz-num">${qi + 1}.</span><span>${h.inlineHtml(q.question)}</span></p><div class="qz-opts"></div><p class="qz-note"></p>`;
    const opts = box.querySelector('.qz-opts');
    shuffled(q.options.map((text, index) => ({ text, index }))).forEach((opt) => {
      const label = h.el('label', 'qz-opt');
      label.innerHTML = `<input type="radio" name="qz-${run}-${qi}" value="${opt.index}"><span>${h.inlineHtml(opt.text)}</span>`;
      opts.appendChild(label);
    });
    if (admin) box.appendChild(adminNote(`Answer: <strong>${h.inlineHtml(q.options[q.answer])}</strong>`));
    list.appendChild(box);
    return { q, box, note: box.querySelector('.qz-note') };
  });

  const answered = () => items.filter((it) => it.box.querySelector('input:checked')).length;
  function update(){
    const n = answered();
    countEl.textContent = `${n} of ${items.length} answered`;
    submitBtn.disabled = n < items.length;
    footNote.textContent = n < items.length ? 'Answer every question to submit.' : '';
  }
  list.addEventListener('change', update);
  update();

  // Lock the rest of the page: nothing behind is clickable or focusable, and app shortcuts don't fire.
  const behind = Array.from(document.body.children).filter((el) => !el.inert);
  behind.forEach((el) => { el.inert = true; });
  const stopKeys = (e) => e.stopPropagation();
  const warnLeave = (e) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('keydown', stopKeys, true);
  window.addEventListener('beforeunload', warnLeave);
  document.body.appendChild(screen);
  titleEl.focus();

  function close(){
    window.removeEventListener('keydown', stopKeys, true);
    window.removeEventListener('beforeunload', warnLeave);
    behind.forEach((el) => { el.inert = false; });
    screen.remove();
    openQuizId = null;
    onClose();
  }
  if (admin) $('[data-close]').addEventListener('click', close);

  let graded = false;
  submitBtn.addEventListener('click', () => {
    if (graded){ close(); return; }
    if (answered() < items.length) return;
    let right = 0;
    items.forEach(({ q, box, note }) => {
      const ok = Number(box.querySelector('input:checked').value) === q.answer;
      if (ok) right++;
      box.querySelectorAll('input').forEach((i) => { i.disabled = true; });
      box.classList.add(ok ? 'right' : 'wrong');
      const review = q.review ? ` Review: <a href="/learn/activity/${encodeURIComponent(q.review.id)}" target="_blank" rel="noopener">${h.inlineHtml(q.review.label)}</a>.` : '';
      note.innerHTML = ok ? '<strong>Correct.</strong>' : `<strong>Incorrect.</strong> ${q.explain ? h.inlineHtml(q.explain) : ''}${review}`;
    });
    const percent = Math.round((right / items.length) * 100);
    const passed = right * 100 >= pass * items.length;
    finishQuizTry(block.id, percent);
    if (passed) recordQuizPass(block.id);
    recordQuizResult(block.id, right, items.length).catch(() => {});
    graded = true;
    window.removeEventListener('beforeunload', warnLeave);
    const result = $('[data-result]');
    result.hidden = false;
    result.innerHTML = passed
      ? `<strong>You passed with ${percent}%.</strong> ${right} of ${items.length} correct.`
      : `<strong>You scored ${percent}%.</strong> ${right} of ${items.length} correct, and you need ${pass}% to pass.${admin ? '' : ` You can take the quiz again at ${clockTime(nextQuizTryAt(block.id))}.`} The questions you missed are marked below.`;
    countEl.textContent = `${percent}%`;
    submitBtn.textContent = 'Back to the lab';
    footNote.textContent = '';
    $('[data-scroll]').scrollTop = 0;
    titleEl.focus();
  });
}

/** Returns a DOM node for an interactive block type, or null if `block` is not one. */
export function renderInteractive(block, helpers){
  if (block.type === 'mcq') return renderMcq(block, helpers);
  if (block.type === 'match') return renderMatch(block, helpers);
  if (block.type === 'quiz') return renderQuiz(block, helpers);
  return null;
}
