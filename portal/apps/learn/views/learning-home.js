import { icon } from '../../../icons.js';
import { CURRICULUM, LAB_SECTION_IDS, sectionProgress } from '../../../data/curriculum.js';
import { getCompletedActivities } from '../../../services/progress-service.js';

export function mount(container, nav, ctx){
  const root = document.createElement('div');
  root.className = 'lh-root p-scroll la-surface';
  container.appendChild(root);

  root.innerHTML = `
    <div class="lh-topbar">
      <button type="button" class="lh-menu-btn" data-menu title="Curriculum" aria-label="Open curriculum index">${icon('menu')}</button>
      <span class="lh-topbar-title">My Learning</span>
    </div>
    <div class="lh-body">
      <div class="lh-head">
        <h1>SwayForm Robotics Path</h1>
        <p class="lh-head-sub" data-summary></p>
      </div>
      <div class="lh-sections" data-sections></div>
    </div>`;

  root.querySelector('[data-menu]').addEventListener('click', () => nav.toggleIndex());

  const summaryEl = root.querySelector('[data-summary]');
  const sectionsEl = root.querySelector('[data-sections]');

  getCompletedActivities().then((completedIds) => {
    let labDone = 0, labTotal = 0;
    CURRICULUM.sections.forEach((s) => { if (LAB_SECTION_IDS.includes(s.id)){ const p = sectionProgress(s.id, completedIds); labDone += p.complete; labTotal += p.total; } });
    summaryEl.textContent = `${labDone} / ${labTotal} labs complete`;

    sectionsEl.innerHTML = '';
    CURRICULUM.sections.forEach((section) => {
      const { complete, total } = sectionProgress(section.id, completedIds);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'lh-sec-row';
      row.innerHTML = `
        <span class="lh-sec-num">${String(section.number).padStart(2, '0')}</span>
        <span class="lh-sec-icon">${icon(section.icon)}</span>
        <span class="lh-sec-main">
          <span class="lh-sec-title">${section.title}${section.levelLabel ? `<span class="lh-sec-level">${section.levelLabel}</span>` : ''}</span>
          <span class="lh-sec-desc">${section.description}</span>
        </span>
        <span class="lh-sec-meta">
          <span class="lh-sec-progress">${complete} / ${total}</span>
          <span class="lh-sec-chevron">${icon('chevronRight')}</span>
        </span>`;
      row.addEventListener('click', () => nav.section(section.id));
      sectionsEl.appendChild(row);
    });
  });

  ctx.setTitle && ctx.setTitle('');

  return {
    unmount(){},
  };
}
