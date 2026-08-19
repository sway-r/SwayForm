/* SwayForm Studio — in-page editing overlay.
 *
 * Injected by the STUDIO PREVIEW SERVER ONLY (never part of the deployed
 * portal). Loaded on every preview page but completely dormant unless the
 * page is embedded in the Studio UI AND Studio sends `studio:init` with
 * editMode on. It decorates the REAL rendered notebook — the same DOM
 * students get — with Notion-style editing affordances:
 *
 *   hover   → left cluster [+ | ⋮⋮ drag | ⋯ menu], faint outline
 *   gaps    → thin insert line with a + between blocks
 *   click   → text blocks edit in place (floating B/I/code/HL/link bar);
 *             complex blocks select and open Studio's right inspector
 *   drag    → move blocks within or across steps
 *
 * Every change becomes a Studio op posted to the parent — the overlay
 * NEVER touches source files. After the op lands, Studio sends back the
 * updated activity and the affected steps re-render through the portal's
 * own lesson-renderer, so what you see stays exactly what students see.
 */

const STUDIO_ORIGIN = 'http://127.0.0.1:4600';
const TEXT_BLOCKS = new Set(['lead', 'p', 'heading', 'callout', 'list', 'steps', 'checklist']);
const BLOCK_MENU = [
  ['p', 'Text'], ['heading', 'Heading'], ['lead', 'Lead'], ['code', 'Code Block'],
  ['image', 'Image'], ['video', 'Video'], ['callout', 'Callout'], ['list', 'Bullet List'],
  ['steps', 'Numbered List'], ['checklist', 'Checklist'], ['table', 'Table'],
  ['terminal', 'Terminal'], ['terms', 'Terms'], ['troubleshoot', 'Troubleshoot'],
  ['reveal', 'Hint / Reveal'], ['divider', 'Divider'],
];

if (window.parent !== window) boot();

function boot() {
  let activity = null;
  let editMode = false;
  let renderBlocksFn = null;
  let selected = null;            // { step, block }
  let editing = null;             // { el, step, block, itemIndex?, original }
  let dragging = null;            // { step, block }
  let armed = false;

  const post = (msg) => window.parent.postMessage(msg, STUDIO_ORIGIN);

  /* ------------------------------------------------------------ chrome */
  const css = document.createElement('style');
  css.textContent = `
    .st-hover { outline: 1px dashed rgba(61,139,255,.45); outline-offset: 4px; border-radius: 4px; }
    .st-selected { outline: 2px solid rgba(61,139,255,.8) !important; outline-offset: 4px; border-radius: 4px; }
    .st-editing { outline: 2px solid rgba(61,139,255,.8); outline-offset: 4px; border-radius: 4px;
      background: rgba(61,139,255,.04); cursor: text; }
    [contenteditable="true"]:focus { outline: 2px solid rgba(61,139,255,.8); outline-offset: 4px; }
    .st-cluster { position: absolute; display: flex; gap: 2px; z-index: 60; opacity: 0; transition: opacity .12s; pointer-events: none; }
    .st-cluster.on { opacity: 1; pointer-events: auto; }
    .st-cbtn { width: 22px; height: 22px; border: none; border-radius: 5px; background: rgba(20,24,32,.85);
      color: #aab6cc; cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 13px; line-height: 1; padding: 0; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,.1); }
    .st-cbtn:hover { background: #3d8bff; color: #fff; border-color: #3d8bff; }
    .st-cbtn.grip { cursor: grab; letter-spacing: -1px; }
    .st-insert-line { position: absolute; left: 0; right: 0; height: 2px; background: #3d8bff; border-radius: 1px;
      z-index: 55; pointer-events: none; box-shadow: 0 0 6px rgba(61,139,255,.6); }
    .st-insert-plus { position: absolute; z-index: 56; width: 18px; height: 18px; border-radius: 9px; border: none;
      background: #3d8bff; color: #fff; font-size: 13px; line-height: 1; cursor: pointer; display: flex;
      align-items: center; justify-content: center; padding: 0; }
    .st-menu { position: absolute; z-index: 80; background: #171b23; border: 1px solid rgba(255,255,255,.14);
      border-radius: 9px; padding: 5px; min-width: 168px; box-shadow: 0 16px 48px rgba(0,0,0,.55);
      max-height: 380px; overflow-y: auto; }
    .st-menu button { display: flex; width: 100%; text-align: left; border: none; background: none; color: #c7d1e4;
      font: 600 12px/1.2 'Segoe UI', system-ui, sans-serif; padding: 7px 10px; border-radius: 6px; cursor: pointer; gap: 8px; align-items: center; }
    .st-menu button:hover { background: rgba(61,139,255,.18); color: #fff; }
    .st-menu .st-menu-sep { height: 1px; background: rgba(255,255,255,.08); margin: 4px 2px; }
    .st-menu .st-menu-hd { font: 700 9.5px/1 'Segoe UI', sans-serif; letter-spacing: .1em; text-transform: uppercase;
      color: #5c6880; padding: 6px 10px 4px; }
    .st-fmtbar { position: absolute; z-index: 90; display: flex; gap: 2px; background: #171b23;
      border: 1px solid rgba(255,255,255,.14); border-radius: 8px; padding: 4px; box-shadow: 0 12px 36px rgba(0,0,0,.5); }
    .st-fmtbar button { min-width: 26px; height: 24px; border: none; border-radius: 5px; background: none; color: #c7d1e4;
      font: 600 12px/1 'Segoe UI', system-ui, sans-serif; cursor: pointer; padding: 0 6px; }
    .st-fmtbar button:hover { background: rgba(61,139,255,.22); color: #fff; }
    .st-fmtbar .sep { width: 1px; background: rgba(255,255,255,.1); margin: 2px 1px; }
    .nb-section-title.st-t-edit, .nb-title.st-t-edit { cursor: text; }
    .nb-section-title.st-t-edit:hover, .nb-title.st-t-edit:hover { outline: 1px dashed rgba(61,139,255,.4); outline-offset: 3px; border-radius: 4px; }
    /* Everything Studio-only is scoped under st-edit-mode, toggled only by
       studio:init — this is the single gate that makes Preview Mode an
       exact, control-free match for the student experience. */
    .st-hamburger { display: none; }
    html.st-edit-mode .st-hamburger { display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px; border: none; background: none; color: var(--la-muted, #7c8496);
      font-size: 13px; flex-shrink: 0; margin-right: 2px; }
    html.st-edit-mode .st-hamburger:hover { background: rgba(61,139,255,.14); color: #3d8bff; }
    html:not(.st-edit-mode) .st-cluster, html:not(.st-edit-mode) .st-insert-line,
    html:not(.st-edit-mode) .st-insert-plus, html:not(.st-edit-mode) .st-menu,
    html:not(.st-edit-mode) .st-fmtbar { display: none !important; }
  `;
  document.head.appendChild(css);

  const cluster = document.createElement('div');
  cluster.className = 'st-cluster';
  cluster.innerHTML = `
    <button class="st-cbtn" data-act="add" title="Insert below">+</button>
    <button class="st-cbtn grip" data-act="grip" draggable="true" title="Drag to move">⋮⋮</button>
    <button class="st-cbtn" data-act="menu" title="Block actions">⋯</button>`;
  document.body.appendChild(cluster);
  let clusterTarget = null; // { el, step, block }

  const insertLine = document.createElement('div');
  insertLine.className = 'st-insert-line';
  insertLine.style.display = 'none';
  const insertPlus = document.createElement('button');
  insertPlus.className = 'st-insert-plus';
  insertPlus.textContent = '+';
  insertPlus.style.display = 'none';
  document.body.appendChild(insertLine);
  document.body.appendChild(insertPlus);
  let gapTarget = null; // { step, index }

  let openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }

  let fmtbar = null;
  function closeFmtbar() { if (fmtbar) { fmtbar.remove(); fmtbar = null; } }

  /* ------------------------------------------------------------ messaging */
  window.addEventListener('message', (e) => {
    if (e.origin !== STUDIO_ORIGIN) return;
    const msg = e.data || {};
    if (msg.type === 'studio:init') {
      activity = msg.activity;
      const wasEdit = editMode;
      editMode = !!msg.editMode;
      document.documentElement.classList.toggle('st-edit-mode', editMode);
      if (editMode && !armed) arm();
      if (wasEdit && !editMode) exitEditModeUI();
      refreshTitles();
    } else if (msg.type === 'studio:activity') {
      const stepsChanged = !activity || activity.steps.length !== msg.activity.steps.length
        || activity.steps.some((s, i) => s.id !== msg.activity.steps[i].id);
      activity = msg.activity;
      if (stepsChanged) { location.reload(); return; }
      rerenderSteps();
      refreshTitles();
      if (msg.select) setSelected(msg.select.step, msg.select.block, { scroll: true });
    } else if (msg.type === 'studio:select') {
      setSelected(msg.step, msg.block, { scroll: true });
    } else if (msg.type === 'studio:deselect') {
      setSelected(null);
    } else if (msg.type === 'studio:scrollTo') {
      scrollToStepWhenReady(msg.step);
    }
  });

  /** Preview Mode must look and behave exactly like the student portal —
   * drop every overlay affordance and any edit in flight. */
  function exitEditModeUI() {
    hideCluster(); hideGap(); closeMenu(); closeFmtbar();
    if (editing) editing.el.blur(); // triggers the normal commit-on-blur path
    if (dragging) onDragEnd();
    setSelected(null);
  }
  post({ type: 'studio:hello', path: location.pathname });

  /* ------------------------------------------------------------ helpers */
  // studio:scrollTo can arrive (e.g. straight off a search jump) before the
  // notebook window has finished mounting — retry briefly rather than
  // silently dropping the jump.
  function scrollToStepWhenReady(step, triesLeft) {
    if (triesLeft === undefined) triesLeft = 20;
    const el = sectionEl(step);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (triesLeft > 0) setTimeout(() => scrollToStepWhenReady(step, triesLeft - 1), 150);
  }

  const doc = () => document.querySelector('.nb-doc');
  const scrollEl = () => document.querySelector('.nb-scroll');
  const sectionEl = (step) => document.querySelector(`.nb-section[data-index="${step}"]`);
  const blockEl = (step, block) => sectionEl(step)?.querySelector(`.nb-blocks > [data-cb-i="${block}"]`);

  function locate(el) {
    const blockRoot = el.closest('[data-cb-i]');
    if (!blockRoot) return null;
    const sec = blockRoot.closest('.nb-section');
    if (!sec) return null;
    return { el: blockRoot, step: Number(sec.dataset.index), block: Number(blockRoot.dataset.cbI) };
  }

  async function renderer() {
    if (!renderBlocksFn) {
      const mod = await import('/portal/apps/learn/lesson-renderer.js');
      renderBlocksFn = mod.renderBlocks;
    }
    return renderBlocksFn;
  }

  const stubCtx = { openFile() {}, insertCode() {} };

  async function rerenderSteps() {
    const rb = await renderer();
    const sc = scrollEl();
    const keep = sc ? sc.scrollTop : 0;
    activity.steps.forEach((step, i) => {
      const sec = sectionEl(i);
      if (!sec) return;
      rb(sec.querySelector('.nb-blocks'), step.blocks, stubCtx);
    });
    if (sc) sc.scrollTop = keep;
    if (selected) {
      const el = blockEl(selected.step, selected.block);
      if (el) el.classList.add('st-selected'); else selected = null;
    }
  }

  function refreshTitles() {
    if (!activity) return;
    const t = document.querySelector('.nb-title');
    if (t && t.textContent !== activity.title && !t.isContentEditable) t.textContent = activity.title;
    activity.steps.forEach((s, i) => {
      const h = sectionEl(i)?.querySelector('.nb-section-title');
      if (h && h.textContent !== s.title && !h.isContentEditable) h.textContent = s.title;
    });
  }

  function setSelected(step, block, opts = {}) {
    document.querySelectorAll('.st-selected').forEach((el) => el.classList.remove('st-selected'));
    if (step === null || step === undefined) { selected = null; return; }
    selected = { step, block };
    const el = blockEl(step, block);
    if (el) {
      el.classList.add('st-selected');
      if (opts.scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      post({ type: 'studio:selected', step, block, blockData: activity.steps[step].blocks[block] });
    }
  }

  /* ------------------------------------------------------------ arming */
  function arm() {
    armed = true;

    // The notebook window may mount/remount at any time (SPA nav, window
    // reopen) — watch for .nb-doc and refresh titles when it appears.
    const mo = new MutationObserver(() => {
      if (doc() && !doc().dataset.stArmed) {
        doc().dataset.stArmed = '1';
        refreshTitles();
        decorateTitles();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    if (doc()) { doc().dataset.stArmed = '1'; decorateTitles(); }

    document.addEventListener('mouseover', onHover, true);
    document.addEventListener('mousemove', onGapMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('scroll', () => { hideCluster(); hideGap(); }, true);

    cluster.addEventListener('click', onClusterClick);
    cluster.querySelector('[data-act="grip"]').addEventListener('dragstart', onDragStart);
    cluster.querySelector('[data-act="grip"]').addEventListener('dragend', onDragEnd);
    document.addEventListener('dragover', onDragOver, true);
    document.addEventListener('drop', onDrop, true);
    insertPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      if (gapTarget) showInsertMenu(insertPlus, gapTarget.step, gapTarget.index);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeMenu(); if (!editing) setSelected(null); }
    });
  }

  function decorateTitles() {
    const t = document.querySelector('.nb-title');
    if (t) { t.classList.add('st-t-edit'); t.title = 'Click to edit the lesson title'; }
    document.querySelectorAll('.nb-section-title').forEach((h) => {
      h.classList.add('st-t-edit');
      h.title = 'Click to edit the step title';
    });
    installHamburger();
  }

  /** The Insert/Widgets entry point from the brief: a small ☰ docked into
   * the notebook's own top bar (a real flex child, not an absolute overlay —
   * so it never floats over lesson content). Opens the same block menu as
   * the per-block "+", targeting the end of whichever step is currently
   * scrolled into view. */
  function installHamburger() {
    const bar = document.querySelector('.nb-topbar');
    if (!bar || bar.querySelector('.st-hamburger')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'st-hamburger';
    btn.title = 'Add content';
    btn.textContent = '☰';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const step = visibleStepIndex();
      if (step === null) return;
      showInsertMenu(btn, step, activity.steps[step].blocks.length);
    });
    bar.insertBefore(btn, bar.firstChild);
  }

  function visibleStepIndex() {
    if (!activity) return null;
    const anchor = 90; // just under the 36px topbar, with margin
    let best = null, bestDist = Infinity;
    activity.steps.forEach((_, i) => {
      const el = sectionEl(i);
      if (!el) return;
      const d = Math.abs(el.getBoundingClientRect().top - anchor);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  /* ------------------------------------------------------------ hover UI */
  function hideCluster() {
    cluster.classList.remove('on');
    if (clusterTarget) clusterTarget.el.classList.remove('st-hover');
    clusterTarget = null;
  }
  function hideGap() { insertLine.style.display = 'none'; insertPlus.style.display = 'none'; gapTarget = null; }

  function onHover(e) {
    if (!editMode || editing || dragging) return;
    if (cluster.contains(e.target) || (openMenu && openMenu.contains(e.target))) return;
    const hit = locate(e.target);
    if (!hit) { if (!openMenu) hideCluster(); return; }
    if (clusterTarget && clusterTarget.el === hit.el) return;
    hideCluster();
    clusterTarget = hit;
    hit.el.classList.add('st-hover');
    const r = hit.el.getBoundingClientRect();
    cluster.style.left = Math.max(4, r.left - 78) + 'px';
    cluster.style.top = (r.top + window.scrollY + 2) + 'px';
    cluster.classList.add('on');
  }

  function onGapMove(e) {
    if (!editMode || editing || dragging || openMenu) return;
    // The cursor crossing onto the + button itself (its natural path to
    // being clicked) must not hide the thing it's about to click.
    if (e.target === insertPlus || insertLine.contains(e.target)) return;
    const hit = locate(e.target);
    if (!hit) { hideGap(); return; }
    const r = hit.el.getBoundingClientRect();
    let index = null;
    if (e.clientY - r.top < 7) index = hit.block;
    else if (r.bottom - e.clientY < 7) index = hit.block + 1;
    if (index === null) { hideGap(); return; }
    gapTarget = { step: hit.step, index };
    const y = (index === hit.block ? r.top : r.bottom) + window.scrollY - 1;
    insertLine.style.display = 'block';
    insertLine.style.left = r.left + 'px';
    insertLine.style.width = r.width + 'px';
    insertLine.style.top = y + 'px';
    insertPlus.style.display = 'flex';
    insertPlus.style.left = (r.left + r.width / 2 - 9) + 'px';
    insertPlus.style.top = (y - 8) + 'px';
  }

  /* ------------------------------------------------------------ menus */
  function menuAt(anchor, items) {
    closeMenu();
    const m = document.createElement('div');
    m.className = 'st-menu';
    for (const it of items) {
      if (it === 'sep') { m.appendChild(Object.assign(document.createElement('div'), { className: 'st-menu-sep' })); continue; }
      if (it.header) {
        const h = document.createElement('div');
        h.className = 'st-menu-hd';
        h.textContent = it.header;
        m.appendChild(h);
        continue;
      }
      const b = document.createElement('button');
      b.textContent = it.label;
      b.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); it.run(); });
      m.appendChild(b);
    }
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.left = Math.min(r.left, window.innerWidth - m.offsetWidth - 12) + 'px';
    m.style.top = Math.min(r.bottom + 4 + window.scrollY, window.scrollY + window.innerHeight - m.offsetHeight - 12) + 'px';
    openMenu = m;
    setTimeout(() => document.addEventListener('click', function onDoc(e) {
      if (!m.contains(e.target)) { closeMenu(); document.removeEventListener('click', onDoc, true); }
    }, true), 0);
  }

  function showInsertMenu(anchor, step, index) {
    menuAt(anchor, [
      { header: 'Add content' },
      ...BLOCK_MENU.map(([type, label]) => ({
        label,
        run: () => post({ type: 'studio:insert', step, index, blockType: type }),
      })),
    ]);
  }

  function onClusterClick(e) {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || !clusterTarget) return;
    e.stopPropagation();
    const { step, block } = clusterTarget;
    const blocks = activity.steps[step].blocks;
    if (act === 'add') showInsertMenu(cluster, step, block + 1);
    else if (act === 'menu') {
      menuAt(cluster, [
        { label: 'Edit in inspector', run: () => setSelected(step, block) },
        { label: 'Duplicate', run: () => post({ type: 'studio:op', op: { type: 'block.insert', activityId: activity.id, stepIndex: step, blockIndex: block + 1, block: blocks[block] } }) },
        'sep',
        { label: 'Move up', run: () => block > 0 && post({ type: 'studio:op', op: { type: 'block.move', activityId: activity.id, stepIndex: step, fromIndex: block, toIndex: block - 1 } }) },
        { label: 'Move down', run: () => block < blocks.length - 1 && post({ type: 'studio:op', op: { type: 'block.move', activityId: activity.id, stepIndex: step, fromIndex: block, toIndex: block + 1 } }) },
        { label: 'Insert above', run: () => showInsertMenu(cluster, step, block) },
        { label: 'Insert below', run: () => showInsertMenu(cluster, step, block + 1) },
        'sep',
        { label: 'Delete block', run: () => {
          if (window.confirm(`Delete this ${blocks[block].type} block?`)) {
            if (selected && selected.step === step && selected.block === block) setSelected(null);
            post({ type: 'studio:op', op: { type: 'block.remove', activityId: activity.id, stepIndex: step, blockIndex: block } });
          }
        } },
      ]);
    }
  }

  /* ------------------------------------------------------------ drag/drop */
  let dropAt = null; // { step, index }
  function onDragStart(e) {
    if (!clusterTarget) { e.preventDefault(); return; }
    dragging = { step: clusterTarget.step, block: clusterTarget.block };
    clusterTarget.el.style.opacity = '0.35';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'st-block');
    e.dataTransfer.setDragImage(clusterTarget.el, 20, 12);
    hideGap();
  }
  function onDragOver(e) {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const sec = e.target.closest?.('.nb-section');
    if (!sec) { insertLine.style.display = 'none'; dropAt = null; return; }
    const step = Number(sec.dataset.index);
    const container = sec.querySelector('.nb-blocks');
    const kids = [...container.children];
    let index = kids.length;
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { index = i; break; }
    }
    dropAt = { step, index };
    const cr = container.getBoundingClientRect();
    const y = (index < kids.length ? kids[index].getBoundingClientRect().top : cr.bottom) + window.scrollY - 1;
    insertLine.style.display = 'block';
    insertLine.style.left = cr.left + 'px';
    insertLine.style.width = cr.width + 'px';
    insertLine.style.top = y + 'px';
  }
  function onDrop(e) {
    if (!dragging || !dropAt) return;
    e.preventDefault();
    const { step, block } = dragging;
    let { step: toStep, index } = dropAt;
    if (toStep === step) {
      if (index > block) index -= 1; // removing first shifts the target
      if (index !== block) {
        post({ type: 'studio:op', op: { type: 'block.move', activityId: activity.id, stepIndex: step, fromIndex: block, toIndex: index } });
      }
    } else {
      post({ type: 'studio:op', op: { type: 'block.transfer', activityId: activity.id, fromStepIndex: step, fromIndex: block, toStepIndex: toStep, toIndex: index } });
    }
  }
  function onDragEnd() {
    if (dragging) {
      const el = blockEl(dragging.step, dragging.block);
      if (el) el.style.opacity = '';
    }
    dragging = null;
    dropAt = null;
    insertLine.style.display = 'none';
  }

  /* ------------------------------------------------------------ click / edit */
  function onClick(e) {
    if (!editMode || editing) return;
    if (cluster.contains(e.target) || (openMenu && openMenu.contains(e.target)) || (fmtbar && fmtbar.contains(e.target))) return;
    if (e.target === insertPlus) return;

    // Titles.
    const title = e.target.closest('.nb-title.st-t-edit, .nb-section-title.st-t-edit');
    if (title) { e.preventDefault(); e.stopPropagation(); startTitleEdit(title); return; }

    const hit = locate(e.target);
    if (!hit) return;
    const block = activity?.steps?.[hit.step]?.blocks?.[hit.block];
    if (!block) return;

    // Never hijack interactive elements (Show Solution, troubleshoot
    // accordions, links) — those still work in edit mode.
    if (e.target.closest('a, button, video, iframe')) { setSelected(hit.step, hit.block); return; }

    if (TEXT_BLOCKS.has(block.type)) {
      const target = editableTextTarget(e.target, block);
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        setSelected(hit.step, hit.block);
        startTextEdit(target.el, hit, block, target.itemIndex);
        return;
      }
    }
    e.preventDefault();
    setSelected(hit.step, hit.block);
  }

  /** Which element inside the block is the editable text surface? */
  function editableTextTarget(target, block) {
    switch (block.type) {
      case 'p': case 'lead': {
        const el = target.closest('.cb-p, .cb-lead');
        return el ? { el } : null;
      }
      case 'heading': {
        const el = target.closest('.cb-h2, .cb-h3');
        return el ? { el } : null;
      }
      case 'callout': {
        const el = target.closest('.cb-callout p');
        return el ? { el } : null;
      }
      case 'list': case 'steps': {
        const li = target.closest('li');
        if (!li) return null;
        return { el: li, itemIndex: [...li.parentElement.children].indexOf(li) };
      }
      case 'checklist': {
        const row = target.closest('.cb-check');
        if (!row) return null;
        return { el: row.lastElementChild, itemIndex: [...row.parentElement.children].indexOf(row) };
      }
      default: return null;
    }
  }

  function startTextEdit(el, hit, block, itemIndex) {
    hideCluster(); hideGap(); closeMenu();
    editing = { el, step: hit.step, block: hit.block, itemIndex, original: el.innerHTML };
    el.contentEditable = 'true';
    el.classList.add('st-editing');
    el.focus();
    showFmtbar(el, block);

    const finish = (commit) => {
      el.contentEditable = 'false';
      el.classList.remove('st-editing');
      closeFmtbar();
      const was = editing;
      editing = null;
      if (!commit) { el.innerHTML = was.original; return; }
      const text = serialize(el);
      const b = activity.steps[was.step].blocks[was.block];
      let next = null;
      if (b.type === 'heading') {
        const level = pendingHeadingLevel !== null ? (pendingHeadingLevel === 3 ? 3 : undefined) : b.level;
        pendingHeadingLevel = null;
        if (text !== b.text || level !== b.level) next = { ...b, text, level };
      } else if (b.type === 'p' || b.type === 'lead') {
        if (text !== b.text) next = { ...b, text };
      } else if (b.type === 'callout') {
        if (text !== b.text) next = { ...b, text };
      } else if (b.type === 'list' || b.type === 'steps' || b.type === 'checklist') {
        if (text !== b.items[was.itemIndex]) {
          next = { ...b, items: b.items.map((it, i) => (i === was.itemIndex ? text : it)) };
        }
      }
      if (next) {
        post({ type: 'studio:op', op: { type: 'block.set', activityId: activity.id, stepIndex: was.step, blockIndex: was.block, block: next } });
      } else {
        el.innerHTML = was.original; // normalize any stray editing markup
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(); finish(false); }
      else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cleanup(); finish(true); }
    };
    const onBlur = (e) => {
      // Clicking the format bar must not commit-and-close mid-formatting.
      if (fmtbar && (fmtbar.contains(e.relatedTarget) || e.relatedTarget === null && fmtbar.matches(':hover'))) {
        el.focus();
        return;
      }
      cleanup();
      finish(true);
    };
    const cleanup = () => {
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
  }

  function startTitleEdit(el) {
    const isLesson = el.classList.contains('nb-title');
    const sec = el.closest('.nb-section');
    const stepIndex = sec ? Number(sec.dataset.index) : null;
    const original = el.textContent;
    editing = { el, title: true };
    el.contentEditable = 'true';
    el.classList.add('st-editing');
    el.focus();
    document.getSelection()?.selectAllChildren(el);

    const finish = (commit) => {
      el.contentEditable = 'false';
      el.classList.remove('st-editing');
      editing = null;
      const text = el.textContent.trim();
      if (!commit || !text || text === original) { el.textContent = original; return; }
      if (isLesson) {
        post({ type: 'studio:op', op: { type: 'activity.setMeta', activityId: activity.id, fields: { title: text } } });
      } else {
        post({ type: 'studio:op', op: { type: 'step.rename', activityId: activity.id, stepIndex, title: text } });
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(); finish(false); }
      else if (e.key === 'Enter') { e.preventDefault(); cleanup(); finish(true); }
    };
    const onBlur = () => { cleanup(); finish(true); };
    const cleanup = () => { el.removeEventListener('keydown', onKey); el.removeEventListener('blur', onBlur); };
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
  }

  /* ------------------------------------------------------------ formatting */
  function showFmtbar(el, block) {
    closeFmtbar();
    fmtbar = document.createElement('div');
    fmtbar.className = 'st-fmtbar';
    const btn = (label, title, run) => {
      const b = document.createElement('button');
      b.innerHTML = label;
      b.title = title;
      b.addEventListener('mousedown', (e) => e.preventDefault()); // keep selection
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); run(); el.focus(); });
      fmtbar.appendChild(b);
      return b;
    };
    btn('<b>B</b>', 'Bold (**text**)', () => document.execCommand('bold'));
    btn('<i>I</i>', 'Italic (*text*)', () => document.execCommand('italic'));
    btn('&lt;/&gt;', 'Inline code (`text`)', () => wrapSelection('code'));
    btn('<span style="background:rgba(224,169,64,.5);padding:0 3px;border-radius:2px">H</span>', 'Highlight (==text==)', () => wrapSelection('mark'));
    btn('🔗', 'Link', () => {
      const url = window.prompt('Link URL (https://…)');
      if (url && /^https?:\/\//.test(url)) document.execCommand('createLink', false, url);
    });
    if (block.type === 'heading') {
      fmtbar.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
      btn('H2', 'Section heading', () => queueHeadingLevel(2));
      btn('H3', 'Sub-heading', () => queueHeadingLevel(3));
    }
    document.body.appendChild(fmtbar);
    const r = el.getBoundingClientRect();
    fmtbar.style.left = Math.max(8, r.left) + 'px';
    fmtbar.style.top = Math.max(8, r.top + window.scrollY - 34) + 'px';

    function queueHeadingLevel(level) {
      // Heading level changes the BLOCK, not the selection — commit it as
      // part of the block.set that fires when editing finishes.
      pendingHeadingLevel = level;
      el.blur(); // commit now with the new level
    }
  }

  let pendingHeadingLevel = null;

  /* HTML (from contenteditable) → the renderer's inline grammar. */
  function serialize(root) {
    let out = '';
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) { out += child.textContent; continue; }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        const tag = child.tagName;
        if (tag === 'BR') { out += ' '; continue; }
        const before = out.length;
        if (tag === 'STRONG' || tag === 'B') { out += '**'; walk(child); out += out.length === before + 2 ? '' : '**'; }
        else if (tag === 'EM' || tag === 'I') { out += '*'; walk(child); out += out.length === before + 1 ? '' : '*'; }
        else if (tag === 'CODE') { out += '`'; walk(child); out += '`'; }
        else if (tag === 'MARK') { out += '=='; walk(child); out += '=='; }
        else if (tag === 'A') {
          const href = child.getAttribute('href') || '';
          out += '[';
          walk(child);
          out += `](${href})`;
        } else walk(child);
      }
    };
    walk(root);
    return out.replace(/ /g, ' ').replace(/[\t\n\r ]+/g, ' ').trim();
  }

  function wrapSelection(tag) {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const wrapper = document.createElement(tag);
    try {
      range.surroundContents(wrapper);
    } catch {
      // Selection crosses element boundaries — flatten it into the wrapper.
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
    }
    sel.removeAllRanges();
  }

}
