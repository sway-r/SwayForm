import { icon } from '../../icons.js';
import { MOCK_PROJECTS } from '../../data/mock-projects.js';
import { findItem } from '../../data/curriculum.js';

export const meta = {
  id: 'projects',
  title: 'Projects',
  icon: 'projects',
  defaultSize: { w: 880, h: 620 },
};

const STATUS_LABEL = {
  draft: 'Draft',
  'in-progress': 'In progress',
  submitted: 'Submitted',
  'needs-changes': 'Needs changes',
  approved: 'Approved',
};

function relativeDate(iso){
  const d = new Date(iso);
  const now = new Date('2026-08-05T12:00:00');
  const days = Math.round((now - d) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function mount(container, ctx){
  container.innerHTML = `
    <div class="proj-root p-scroll la-surface">
      <div class="proj-head">
        <div>
          <h1 class="proj-title">Your Projects</h1>
          <p class="proj-sub">Work saved locally in this browser. Cloud project storage is coming with school accounts.</p>
        </div>
        <button type="button" class="p-btn primary" data-new-project>${icon('plus')}<span>New Project</span></button>
      </div>
      <div class="proj-grid" data-grid></div>
    </div>`;

  const gridEl = container.querySelector('[data-grid]');

  MOCK_PROJECTS.forEach((p) => {
    const found = findItem(p.associatedActivityId);
    const activityLabel = found ? found.item.title : p.associatedActivityId;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'proj-card';
    card.innerHTML = `
      <div class="proj-card-top">
        <span class="proj-status ${p.status}">${STATUS_LABEL[p.status] || p.status}</span>
        <span class="proj-edited">${relativeDate(p.lastEdited)}</span>
      </div>
      <div class="proj-card-title">${p.title}</div>
      <div class="proj-card-desc">${p.summary}</div>
      <div class="proj-card-foot">${icon('learn')}<span>${activityLabel}</span></div>`;
    card.addEventListener('click', () => {
      ctx.openApp('learn', { view: 'activity', activityId: p.associatedActivityId });
    });
    gridEl.appendChild(card);
  });

  container.querySelector('[data-new-project]').addEventListener('click', () => {
    ctx.openApp('learn', { view: 'home' });
  });

  ctx.setAppTitle && ctx.setAppTitle('Projects');

  return {};
}
