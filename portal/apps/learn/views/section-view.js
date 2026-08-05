import { icon } from '../../../icons.js';
import { findSection } from '../../../data/learning-path.js';
import { getCompletedActivities } from '../../../services/progress-service.js';
import { applyReadingTheme } from '../../../theme.js';

function diffTag(difficulty){
  if (!difficulty) return '';
  return `<span class="diff-tag ${difficulty}">${difficulty}</span>`;
}

export function mount(container, params, nav, ctx){
  const found = findSection(params.sectionId);
  if (!found){ nav.home(); return { unmount(){} }; }
  const { level, section } = found;

  const root = document.createElement('div');
  root.className = 'sv-root p-scroll content-surface';
  container.appendChild(root);
  applyReadingTheme(root);

  root.innerHTML = `
    <button type="button" class="sv-back" data-back>${icon('arrowLeft')}<span>My Learning</span></button>
    <div class="sv-header">
      <div class="sv-crumb">Level ${level.number} · ${level.title}</div>
      <h1>${section.title}</h1>
      <div class="sv-header-meta">${diffTag(section.difficulty)}<span class="lh-section-time">${section.estimatedTime || ''}</span></div>
      <p class="sv-desc">${section.description}</p>
    </div>
    <div class="sv-activities" data-activities></div>`;

  root.querySelector('[data-back]').addEventListener('click', () => nav.home());

  const activitiesEl = root.querySelector('[data-activities]');

  getCompletedActivities().then((completedIds) => {
    section.activities.forEach((activity, i) => {
      const done = completedIds.includes(activity.id);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'sv-activity-row';
      row.innerHTML = `
        <span class="sv-activity-num">${String(i + 1).padStart(2, '0')}</span>
        <div class="sv-activity-main">
          <div class="sv-activity-title">${activity.title}${done ? `<span class="done-check">${icon('check')}</span>` : ''}</div>
          <div class="sv-activity-summary">${activity.summary || ''}</div>
        </div>
        <div class="sv-activity-meta">
          ${diffTag(activity.difficulty)}
          <span class="sv-activity-time">${activity.estimatedTime}</span>
          <span class="sv-activity-chevron">${icon('chevronRight')}</span>
        </div>`;
      row.addEventListener('click', () => nav.activity(activity.id));
      activitiesEl.appendChild(row);
    });
  });

  ctx.setTitle && ctx.setTitle(section.title);

  return {
    unmount(){},
  };
}
