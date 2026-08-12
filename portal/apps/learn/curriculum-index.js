/* Curriculum Index — the "what learning material exists?" drawer, distinct
 * from the Notebook's own per-activity Contents panel (which answers "what
 * is inside THIS lab?"). Mounted once at the Learn app shell level so it
 * persists (open/closed, expanded sections) across Home/Section/Activity
 * view switches without disturbing whatever the current view is doing —
 * opening it must never reset window bounds, file edits, or scroll position.
 */
import { icon } from '../../icons.js';
import { CURRICULUM, LAB_SECTION_IDS, search as searchCurriculum } from '../../data/curriculum.js';
import { getCompletedActivities } from '../../services/progress-service.js';

// Module-level so expanded sections survive close/reopen within the session
// (not persisted across page reloads — that would be over-engineering this).
const expandedSections = new Set();

function statusIcon(item, completedIds, currentId) {
  if (item.kind === 'placeholder') return '<span class="ci-status ci-status-placeholder"></span>';
  if (item.id === currentId) return `<span class="ci-status ci-status-current">${icon('dot')}</span>`;
  if (completedIds.has(item.id)) return `<span class="ci-status ci-status-done">${icon('checkCircle')}</span>`;
  return '<span class="ci-status ci-status-open"></span>';
}

function kindBadge(item) {
  if (item.kind === 'demo') return '<span class="ci-kind-badge demo">Demo</span>';
  if (item.kind === 'placeholder') return '<span class="ci-kind-badge soon">Soon</span>';
  return '';
}

export function mount(hostEl, { onNavigate, getCurrentItemId, getCurrentSectionId }) {
  const root = document.createElement('div');
  root.className = 'ci-root';
  root.innerHTML = `
    <div class="ci-backdrop" data-backdrop></div>
    <aside class="ci-drawer" role="dialog" aria-label="Curriculum index">
      <div class="ci-hdr">
        <span class="ci-hdr-title">Curriculum</span>
        <button type="button" class="ci-close" data-close aria-label="Close curriculum index">${icon('close')}</button>
      </div>
      <div class="ci-search-wrap">
        <span class="ci-search-icon">${icon('search')}</span>
        <input type="text" class="ci-search-input" data-search placeholder="Search labs, demos, concepts…" autocomplete="off" spellcheck="false">
      </div>
      <div class="ci-list p-scroll la-surface" data-list></div>
    </aside>`;
  hostEl.appendChild(root);

  const drawerEl = root.querySelector('.ci-drawer');
  const listEl = root.querySelector('[data-list]');
  const searchInput = root.querySelector('[data-search]');
  let isOpen = false;
  let completedIds = new Set();

  function renderSearchResults(query) {
    const results = searchCurriculum(query);
    listEl.innerHTML = '';
    if (!results.length) {
      listEl.innerHTML = `<div class="ci-empty">No matches for "${query}"</div>`;
      return;
    }
    results.forEach((r) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'ci-item ci-search-result';
      if (r.type === 'section') {
        row.innerHTML = `<span class="ci-item-num">${String(r.section.number).padStart(2, '0')}</span><span class="ci-item-title">${r.section.title}</span><span class="ci-kind-badge section-tag">Section</span>`;
        row.addEventListener('click', () => { close(); onNavigate({ type: 'section', id: r.section.id }); });
      } else {
        row.innerHTML = `
          ${statusIcon(r.item, completedIds, getCurrentItemId())}
          <span class="ci-item-num">${r.item.number}</span>
          <span class="ci-item-title">${r.item.title}<span class="ci-search-parent"> — ${r.section.title}</span></span>
          ${kindBadge(r.item)}`;
        row.addEventListener('click', () => { close(); onNavigate({ type: 'item', id: r.item.id }); });
      }
      listEl.appendChild(row);
    });
  }

  async function renderList() {
    completedIds = new Set(await getCompletedActivities());
    const currentId = getCurrentItemId();
    const query = searchInput.value.trim();
    if (query) { renderSearchResults(query); return; }
    listEl.innerHTML = '';
    CURRICULUM.sections.forEach((section) => {
      const isLabSection = LAB_SECTION_IDS.includes(section.id);
      const real = section.items.filter((i) => i.kind !== 'placeholder');
      const doneCount = real.filter((i) => completedIds.has(i.id)).length;
      const hasCurrent = section.items.some((i) => i.id === currentId) || (getCurrentSectionId && getCurrentSectionId() === section.id);
      if (hasCurrent) expandedSections.add(section.id);
      const expanded = expandedSections.has(section.id);

      const block = document.createElement('div');
      block.className = 'ci-section';
      block.innerHTML = `
        <div class="ci-section-row">
          <button type="button" class="ci-chevron ${expanded ? 'open' : ''}" data-toggle="${section.id}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${section.title}">${icon('chevronRight')}</button>
          <button type="button" class="ci-section-btn" data-goto-section="${section.id}">
            <span class="ci-section-num">${String(section.number).padStart(2, '0')}</span>
            <span class="ci-section-title">${section.title}</span>
          </button>
          ${isLabSection ? `<span class="ci-section-count">${doneCount}/${real.length}</span>` : ''}
        </div>
        <div class="ci-items" data-items="${section.id}" ${expanded ? '' : 'hidden'}></div>`;
      listEl.appendChild(block);

      const itemsEl = block.querySelector(`[data-items="${section.id}"]`);
      section.items.forEach((item) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'ci-item' + (item.id === currentId ? ' active' : '') + (item.kind === 'placeholder' ? ' is-placeholder' : '');
        row.dataset.gotoItem = item.id;
        row.innerHTML = `
          ${statusIcon(item, completedIds, currentId)}
          <span class="ci-item-num">${item.number}</span>
          <span class="ci-item-title">${item.title}</span>
          ${kindBadge(item)}`;
        itemsEl.appendChild(row);
      });
    });

    listEl.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.toggle;
        if (expandedSections.has(id)) expandedSections.delete(id); else expandedSections.add(id);
        renderList();
      });
    });
    listEl.querySelectorAll('[data-goto-section]').forEach((btn) => {
      btn.addEventListener('click', () => { close(); onNavigate({ type: 'section', id: btn.dataset.gotoSection }); });
    });
    listEl.querySelectorAll('[data-goto-item]').forEach((btn) => {
      btn.addEventListener('click', () => { close(); onNavigate({ type: 'item', id: btn.dataset.gotoItem }); });
    });
  }

  function open() {
    isOpen = true;
    root.classList.add('open');
    renderList();
    document.addEventListener('keydown', onKeydown);
  }
  function close() {
    isOpen = false;
    root.classList.remove('open');
    document.removeEventListener('keydown', onKeydown);
  }
  function toggle() { isOpen ? close() : open(); }
  function onKeydown(e) { if (e.key === 'Escape') close(); }

  root.querySelector('[data-close]').addEventListener('click', close);
  root.querySelector('[data-backdrop]').addEventListener('click', close);
  drawerEl.addEventListener('click', (e) => e.stopPropagation());
  searchInput.addEventListener('input', () => renderList());

  return {
    open, close, toggle,
    refresh() { if (isOpen) renderList(); },
    destroy() { document.removeEventListener('keydown', onKeydown); root.remove(); },
  };
}
