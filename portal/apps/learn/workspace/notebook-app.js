/* Notebook application — a continuous, scrollable robotics textbook/lab
 * manual, not a slideshow. An activity's steps render as sections of one
 * document; a compact table of contents + scroll-spy replace Back/Next as
 * the primary way to navigate. Reuses the existing block renderer and the
 * existing block DATA (portal/data/learning-path.js) completely unchanged —
 * only how many steps render at once has changed. */
import { icon } from '../../../icons.js';
import { renderBlocks } from '../lesson-renderer.js';

export const meta = { id: 'notebook', title: 'Notebook', icon: 'book' };

function diffTag(activity) {
  if (activity.kind === 'demo') return '<span class="diff-tag demo">Demo walkthrough</span>';
  if (activity.kind === 'reading' || activity.kind === 'placeholder') return '<span class="diff-tag reading">Reading</span>';
  if (!activity.difficulty) return '';
  return `<span class="diff-tag ${activity.difficulty}">${activity.difficulty}</span>`;
}

export function mount(bodyEl, winApi, opts) {
  const { activity, section, initialStepIndex, nextActivity, isDone, lessonCtx, onSectionChange, onFinish } = opts;
  const isReading = activity.kind === 'reading' || activity.kind === 'placeholder';
  const totalSteps = activity.steps.length;
  let currentIndex = Math.min(Math.max(initialStepIndex || 0, 0), totalSteps - 1);
  let done = !!isDone;

  // A continuous document reports reading progress as a percentage, not a
  // "Step N of M" wizard count — this isn't a step-by-step slideshow.
  function progressLabel(i) {
    const pct = totalSteps > 1 ? Math.round(((i + 1) / totalSteps) * 100) : 100;
    return `Progress: ${pct}%`;
  }

  bodyEl.innerHTML = `
    <div class="nb-root">
      <div class="nb-topbar">
        <span class="nb-topbar-meta">${diffTag(activity)}<span class="nb-topbar-time">${activity.estimatedTime || ''}</span></span>
        <span class="nb-progress" data-progress>${progressLabel(currentIndex)}</span>
        <button type="button" class="nb-toc-toggle" data-toc-toggle>${icon('layers')}<span>Contents</span></button>
      </div>
      <div class="nb-toc-panel" data-toc-panel></div>
      <div class="nb-scroll p-scroll content-surface" data-scroll></div>
    </div>`;

  const scrollEl = bodyEl.querySelector('[data-scroll]');
  const progressEl = bodyEl.querySelector('[data-progress]');
  const tocPanel = bodyEl.querySelector('[data-toc-panel]');
  const tocToggle = bodyEl.querySelector('[data-toc-toggle]');

  const doc = document.createElement('div');
  doc.className = 'nb-doc';
  scrollEl.appendChild(doc);

  const head = document.createElement('div');
  head.className = 'nb-head';
  head.innerHTML = `
    <div class="nb-crumb">${activity.number ? `${activity.number} · ` : ''}${section.title}</div>
    <h1 class="nb-title">${activity.title}</h1>`;
  doc.appendChild(head);

  const sectionEls = [];
  activity.steps.forEach((step, i) => {
    const sec = document.createElement('section');
    sec.className = 'nb-section';
    sec.id = `nb-step-${i}`;
    sec.dataset.index = String(i);
    const hdr = document.createElement('div');
    hdr.className = 'nb-section-hdr';
    hdr.innerHTML = `<span class="nb-section-num">${i + 1}</span><h2 class="nb-section-title">${step.title}</h2>`;
    sec.appendChild(hdr);
    const blocksEl = document.createElement('div');
    blocksEl.className = 'nb-blocks';
    sec.appendChild(blocksEl);
    renderBlocks(blocksEl, step.blocks, lessonCtx);
    doc.appendChild(sec);
    if (i < activity.steps.length - 1) {
      const div = document.createElement('div');
      div.className = 'nb-section-divider';
      doc.appendChild(div);
    }
    sectionEls.push(sec);
  });

  const completeBlock = document.createElement('div');
  completeBlock.className = 'nb-complete';
  function renderComplete() {
    // A placeholder has nothing to complete — no fake "Mark Complete" on
    // content that doesn't exist yet.
    if (activity.kind === 'placeholder') {
      completeBlock.innerHTML = `
        <div class="nb-complete-icon">${icon('clock')}</div>
        <h2>Not written yet</h2>
        <p>This entry is planned but not yet available — check back after this section is authored.</p>
        ${nextActivity ? `<div class="nb-complete-actions"><button type="button" class="p-btn ghost" data-next-activity>${icon('arrowRight')}<span>${nextActivity.title}</span></button></div>` : ''}`;
      const nextBtn = completeBlock.querySelector('[data-next-activity]');
      if (nextBtn) nextBtn.addEventListener('click', () => onFinish('next'));
      return;
    }
    completeBlock.innerHTML = `
      <div class="nb-complete-icon">${icon('checkCircle')}</div>
      <h2>${done ? `${activity.title} complete.` : 'Finished reading?'}</h2>
      <p>${(activity.completionSummary && activity.completionSummary.text) || 'Mark this activity complete when you\'re done.'}</p>
      ${(done && activity.completionSummary && activity.completionSummary.conceptsUsed && activity.completionSummary.conceptsUsed.length)
        ? `<div class="nb-complete-concepts">${activity.completionSummary.conceptsUsed.map((c) => `<span class="nb-complete-chip">${c}</span>`).join('')}</div>` : ''}
      <div class="nb-complete-actions">
        <button type="button" class="p-btn primary" data-mark-complete>${icon('checkCircle')}<span>${done ? 'Completed' : 'Mark Activity Complete'}</span></button>
        ${nextActivity
          ? nextActivity.kind === 'placeholder'
            // The next real slot isn't written yet — say so up front rather
            // than offering a button visually identical to "go to the next
            // real lab" that only reveals it was unfinished after the click.
            ? `<button type="button" class="p-btn ghost" data-next-activity>${icon('clock')}<span>Coming Soon — ${nextActivity.title}</span></button>`
            : `<button type="button" class="p-btn ghost" data-next-activity>${icon('arrowRight')}<span>${nextActivity.title}</span></button>`
          : ''}
      </div>`;
    completeBlock.querySelector('[data-mark-complete]').addEventListener('click', async () => {
      done = true;
      await onFinish();
      renderComplete();
    });
    const nextBtn = completeBlock.querySelector('[data-next-activity]');
    if (nextBtn) nextBtn.addEventListener('click', () => onFinish('next'));
  }
  renderComplete();
  doc.appendChild(completeBlock);

  /* ---------------------------------------------------------------- TOC */
  function renderToc() {
    tocPanel.innerHTML = activity.steps.map((s, i) => `
      <button type="button" class="nb-toc-item ${i === currentIndex ? 'active' : ''}" data-toc-index="${i}">
        <span class="nb-toc-num">${i + 1}</span><span class="nb-toc-title">${s.title}</span>
      </button>`).join('');
    tocPanel.querySelectorAll('[data-toc-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        scrollToStep(Number(btn.dataset.tocIndex));
        tocPanel.classList.remove('open');
      });
    });
  }
  renderToc();
  tocToggle.addEventListener('click', () => tocPanel.classList.toggle('open'));

  function scrollToStep(i, opts) {
    const el = sectionEls[i];
    if (el) el.scrollIntoView({ behavior: (opts && opts.instant) ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------------------------------------------------------------- scroll-spy */
  // Jump to the resumed position BEFORE the observer starts watching, so its
  // first snapshot reflects where we actually are — not the pre-scroll top
  // (which would otherwise fire a spurious onSectionChange(0) and clobber
  // the resumed step the instant this window reopens).
  if (currentIndex > 0) scrollToStep(currentIndex, { instant: true });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const i = Number(entry.target.dataset.index);
      if (i !== currentIndex) {
        currentIndex = i;
        progressEl.textContent = progressLabel(i);
        tocPanel.querySelectorAll('.nb-toc-item').forEach((el, idx) => el.classList.toggle('active', idx === i));
        onSectionChange && onSectionChange(i);
      }
    });
  }, { root: scrollEl, rootMargin: '-10% 0px -70% 0px', threshold: 0 });
  sectionEls.forEach((el) => io.observe(el));

  return {
    scrollToStep,
    dispose() { io.disconnect(); },
  };
}
