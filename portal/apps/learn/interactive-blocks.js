/* Interactive lesson blocks: mcq, match, quiz (fields are listed in README.md).
   A block that must be solved to finish a lab carries data-gate and fires cb-gate when it changes. */

const LETTERS = 'ABCDEFGH';

function shuffled(list){
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
  wrap.innerHTML = `<div class="cb-q-lbl">Check yourself</div><p class="cb-q-text">${h.inlineHtml(block.question)}</p><div class="cb-q-opts"></div><div class="cb-q-feedback" role="status" aria-live="polite"></div>`;
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
        feedback.className = 'cb-q-feedback ok';
        feedback.innerHTML = `<strong>Correct.</strong> ${block.explain ? h.inlineHtml(block.explain) : ''}`;
        setGate(wrap, 'done');
      } else {
        btn.classList.add('wrong');
        btn.disabled = true;
        feedback.className = 'cb-q-feedback bad';
        feedback.textContent = block.hint ? `Not quite. ${block.hint}` : 'Not quite. Try another answer.';
      }
    });
    opts.appendChild(btn);
  });
  return wrap;
}

/* Pair each item on the left with its partner on the right using dropdowns. Right-hand texts must be unique.
   Optional `distractors` are extra wrong answers in every dropdown, so the last pair can't be found by elimination. */
function renderMatch(block, h){
  const wrap = h.el('div', 'cb-q cb-match');
  initGate(wrap, block, 'Finish the matching activity to finish this lab.');
  wrap.innerHTML = `<div class="cb-q-lbl">Match it up</div><p class="cb-q-text">${h.inlineHtml(block.prompt || 'Match each item on the left with the right description.')}</p><div class="cb-match-rows"></div><div class="cb-q-actions"><button type="button" class="p-btn primary" data-check>Check matches</button></div><div class="cb-q-feedback" role="status" aria-live="polite"></div>`;
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
      feedback.className = 'cb-q-feedback ok';
      feedback.innerHTML = `<strong>All ${rows.length} match.</strong> ${block.explain ? h.inlineHtml(block.explain) : ''}`;
      setGate(wrap, 'done');
    } else {
      feedback.className = 'cb-q-feedback bad';
      feedback.textContent = `${correct} of ${rows.length} match. Fix the red ones and check again.`;
    }
  });
  return wrap;
}

/* A scored set of questions. Passing needs passPercent or better; failing shows which ones missed and allows a retry. */
function renderQuiz(block, h){
  const pass = block.passPercent || 80;
  const draw = Math.min(block.count || block.questions.length, block.questions.length);
  const wrap = h.el('div', 'cb-q cb-quiz');
  initGate(wrap, block, `Score at least ${pass}% on the quiz to finish this lab.`);
  wrap.innerHTML = `<div class="cb-q-lbl">${h.inlineHtml(block.title || 'Quiz')}</div><p class="cb-q-text">${draw} questions. You need ${pass}% or better to pass, and you can try again as many times as you like.${draw < block.questions.length ? ' Each try draws a fresh mix of questions.' : ''}</p><div class="cb-quiz-qs"></div><div class="cb-q-actions"><button type="button" class="p-btn primary" data-submit disabled>Submit answers</button></div><div class="cb-q-feedback" role="status" aria-live="polite"></div>`;
  const qsEl = wrap.querySelector('.cb-quiz-qs');
  const submitBtn = wrap.querySelector('[data-submit]');
  const feedback = wrap.querySelector('.cb-q-feedback');
  let qs = [];
  let attempt = 0;

  function build(){
    attempt++;
    qsEl.innerHTML = '';
    feedback.className = 'cb-q-feedback';
    feedback.textContent = '';
    submitBtn.textContent = 'Submit answers';
    submitBtn.disabled = true;
    qs = shuffled(block.questions).slice(0, draw).map((q, qi) => {
      const box = h.el('fieldset', 'cb-quiz-q');
      box.appendChild(h.el('legend', 'cb-quiz-q-text', `<span class="cb-quiz-num">${qi + 1}</span>${h.inlineHtml(q.question)}`));
      const name = `quiz-${block.id || 'q'}-${attempt}-${qi}`;
      shuffled(q.options.map((text, index) => ({ text, index }))).forEach((opt, oi) => {
        const label = h.el('label', 'cb-quiz-opt');
        label.innerHTML = `<input type="radio" name="${name}" value="${opt.index}"><span class="cb-quiz-opt-letter">${LETTERS[oi]}</span><span>${h.inlineHtml(opt.text)}</span>`;
        label.querySelector('input').addEventListener('change', () => { submitBtn.disabled = !qs.every((x) => x.box.querySelector('input:checked')); });
        box.appendChild(label);
      });
      const note = h.el('div', 'cb-quiz-note');
      box.appendChild(note);
      qsEl.appendChild(box);
      return { box, note, answer: q.answer, explain: q.explain, review: q.review };
    });
  }

  submitBtn.addEventListener('click', () => {
    if (submitBtn.dataset.mode === 'retry'){ submitBtn.dataset.mode = ''; build(); return; }
    let right = 0;
    qs.forEach((q) => {
      const picked = q.box.querySelector('input:checked');
      const ok = !!picked && Number(picked.value) === q.answer;
      if (ok) right++;
      q.box.classList.toggle('right', ok);
      q.box.classList.toggle('wrong', !ok);
      q.box.querySelectorAll('input').forEach((i) => { i.disabled = true; });
      const review = q.review ? `<span class="cb-quiz-review">Review: <a href="/learn/activity/${encodeURIComponent(q.review.id)}" target="_blank" rel="noopener">${h.inlineHtml(q.review.label)}</a></span>` : '';
      q.note.innerHTML = ok ? '<strong>Correct.</strong>' : `<strong>Not quite.</strong> ${q.explain ? h.inlineHtml(q.explain) : 'Take another look at this one.'}${review}`;
    });
    const percent = Math.round((right / qs.length) * 100);
    const passed = right * 100 >= pass * qs.length;
    feedback.className = `cb-q-feedback ${passed ? 'ok' : 'bad'}`;
    feedback.innerHTML = passed
      ? `<strong>${percent}%, you passed.</strong> ${right} of ${qs.length} correct.`
      : `<strong>${percent}%.</strong> ${right} of ${qs.length} correct, and you need ${pass}%. Read the notes on the ones you missed, then try again.`;
    if (passed){
      wrap.classList.add('solved');
      submitBtn.disabled = true;
      setGate(wrap, 'done');
    } else {
      submitBtn.textContent = 'Try again';
      submitBtn.dataset.mode = 'retry';
      submitBtn.disabled = false;
    }
  });

  build();
  return wrap;
}

/** Returns a DOM node for an interactive block type, or null if `block` is not one. */
export function renderInteractive(block, helpers){
  if (block.type === 'mcq') return renderMcq(block, helpers);
  if (block.type === 'match') return renderMatch(block, helpers);
  if (block.type === 'quiz') return renderQuiz(block, helpers);
  return null;
}
