import { icon } from '../../../icons.js';
import { CURRICULUM, LAB_SECTION_IDS, findSection, sectionProgress } from '../../../data/curriculum.js';
import { getCompletedActivities, getCurrentActivity } from '../../../services/progress-service.js';

function diffTag(item){
  if (item.kind === 'reading') return '<span class="diff-tag reading">Reading</span>';
  if (!item.difficulty) return '';
  return `<span class="diff-tag ${item.difficulty}">${item.difficulty}</span>`;
}

function kindLabel(item){
  if (item.kind === 'demo') return '<span class="sv-kind-badge demo">Demo</span>';
  if (item.kind === 'placeholder') return '<span class="sv-kind-badge soon">Coming Soon</span>';
  return '';
}

export function mount(container, params, nav, ctx){
  const section = findSection(params.sectionId);
  if (!section){ nav.home(); return { unmount(){} }; }

  const isLabSection = LAB_SECTION_IDS.includes(section.id);
  const levelIndex = isLabSection ? LAB_SECTION_IDS.indexOf(section.id) + 1 : null;

  const root = document.createElement('div');
  root.className = 'sv-root p-scroll la-surface';
  container.appendChild(root);

  root.innerHTML = `
    <div class="sv-topbar">
      <button type="button" class="lh-menu-btn" data-menu title="Curriculum" aria-label="Open curriculum index">${icon('menu')}</button>
      <button type="button" class="sv-back" data-back>${icon('arrowLeft')}<span>My Learning</span></button>
    </div>
    <div class="sv-body">
      <div class="sv-head">
        <div class="sv-crumb">Learn / ${section.title}</div>
        <h1>${section.title}${levelIndex ? `<span class="sv-level">Level ${levelIndex} of ${LAB_SECTION_IDS.length}</span>` : ''}</h1>
        <p class="sv-desc">${section.description}</p>
        <div class="sv-progress-row" data-progress-row></div>
      </div>
      <div class="sv-items" data-items></div>
    </div>`;

  root.querySelector('[data-menu]').addEventListener('click', () => nav.toggleIndex());
  root.querySelector('[data-back]').addEventListener('click', () => nav.home());

  const progressRowEl = root.querySelector('[data-progress-row]');
  const itemsEl = root.querySelector('[data-items]');

  Promise.all([getCompletedActivities(), getCurrentActivity()]).then(([completedIds, current]) => {
    const done = new Set(completedIds);
    const { complete, total } = sectionProgress(section.id, completedIds);
    const pct = total ? Math.round((complete / total) * 100) : 0;
    progressRowEl.innerHTML = `
      <span class="sv-progress-bar"><span style="width:${pct}%"></span></span>
      <span class="sv-progress-text">${complete} / ${total} complete</span>`;

    section.items.forEach((item) => {
      const isDone = done.has(item.id);
      const isCurrent = current && current.activityId === item.id;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'sv-item-row' + (item.kind === 'placeholder' ? ' is-placeholder' : '');
      row.innerHTML = `
        <span class="sv-item-num">${item.number}</span>
        <span class="sv-item-main">
          <span class="sv-item-title">${item.title}${kindLabel(item)}</span>
          <span class="sv-item-meta">${diffTag(item)}<span class="sv-item-time">${item.estimatedTime || ''}</span></span>
        </span>
        <span class="sv-item-status">${
          item.kind === 'placeholder' ? ''
          : isDone ? `<span class="sv-status done">${icon('checkCircle')}<span>Complete</span></span>`
          : isCurrent ? `<span class="sv-status current">${icon('dot')}<span>In Progress</span></span>`
          : `<span class="sv-status open">${icon('chevronRight')}</span>`
        }</span>`;
      row.addEventListener('click', () => nav.activity(item.id));
      itemsEl.appendChild(row);
    });
  });

  ctx.setTitle && ctx.setTitle(section.title);

  return {
    unmount(){},
  };
}
