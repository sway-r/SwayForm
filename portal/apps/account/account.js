import { icon } from '../../icons.js';
import { CURRICULUM, labTotals, sectionProgress } from '../../data/curriculum.js';
import { getSession, logout } from '../../services/auth-service.js';
import { getCompletedActivities, resetProgress } from '../../services/progress-service.js';

export const meta = {
  id: 'account',
  title: 'Account',
  icon: 'account',
  defaultSize: { w: 760, h: 640 },
};

const ROLE_LABELS = { admin: 'Admin', student: 'Student', member: 'Member' };

// Still genuinely true — features SwayForm hasn't built yet, not fabricated
// data about this account.
const COMING_SOON = [
  {
    label: 'School Organization',
    description: "Join your class or school's account to share progress with an instructor, coming with school accounts.",
  },
  {
    label: 'Instructor Review',
    description: 'Get structured feedback from a teacher on your labs, coming with school accounts.',
  },
  {
    label: 'Subscription & Billing',
    description: 'Manage a paid Learning Hub plan and billing details once commercial plans are available.',
  },
];

function escapeHtml(s){
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function initials(name){
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function statRow(label, done, total, iconName){
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="acct-stat">
      <div class="acct-stat-hdr">${icon(iconName)}<span>${label}</span><span class="acct-stat-frac">${done} / ${total}</span></div>
      <div class="acct-stat-bar"><span style="width:${pct}%"></span></div>
    </div>`;
}

async function render(container, ctx){
  const session = await getSession();
  const isGuest = session && session.mode === 'guest';
  const completed = await getCompletedActivities();
  const labs = labTotals(completed);

  const displayName = isGuest ? 'Guest User' : (session.displayName || session.name || 'Signed in');
  const roleLine = isGuest
    ? 'Guest session · progress saved in this browser only'
    : `${ROLE_LABELS[session.mode] || 'Member'} · ${session.schoolName || 'No school on file'}`;

  const avatar = (!isGuest && session.picture)
    ? `<img class="acct-avatar" src="${escapeHtml(session.picture)}" alt="">`
    : `<div class="acct-avatar">${initials(displayName)}</div>`;

  const perSection = CURRICULUM.sections.map((section) => ({ section, ...sectionProgress(section.id, completed) }));

  container.innerHTML = `
    <div class="acct-root p-scroll la-surface">
      <div class="acct-hero">
        ${avatar}
        <div class="acct-hero-info">
          <div class="acct-name">${escapeHtml(displayName)}</div>
          <div class="acct-role">${escapeHtml(roleLine)}</div>
          <div class="acct-badges">
            ${isGuest ? '<span class="acct-badge plan">Guest Mode</span>' : ''}
          </div>
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Learning progress</div>
        <div class="acct-stats">
          ${statRow('Labs complete', labs.complete, labs.total, 'checkCircle')}
          ${perSection.map((l) => statRow(`${l.section.number}. ${l.section.title}`, l.complete, l.total, 'layers')).join('')}
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Account</div>
        <div class="acct-rows">
          ${isGuest
            ? `<div class="acct-row"><span>Mode</span><span>Guest</span></div>
               <div class="acct-row"><span>Progress</span><span>Local to this browser</span></div>
               <div class="acct-row"><span>Session started</span><span>${session.startedAt ? new Date(session.startedAt).toLocaleString(undefined, { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</span></div>`
            : `<div class="acct-row"><span>Member since</span><span>${session.profileCreatedAt ? new Date(session.profileCreatedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span></div>
               <div class="acct-row"><span>School / organization</span><span>${escapeHtml(session.schoolName || '—')}</span></div>
               <div class="acct-row"><span>Email</span><span>${escapeHtml(session.email || '—')}</span></div>`}
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Coming soon</div>
        <div class="acct-coming">
          ${COMING_SOON.map((c) => `<div class="acct-coming-item"><div class="acct-coming-label">${c.label}</div><div class="acct-coming-desc">${c.description}</div></div>`).join('')}
        </div>
      </div>

      <div class="acct-actions">
        <button type="button" class="p-btn ghost" data-reset>${icon('refresh')}<span>Reset local progress</span></button>
        <button type="button" class="p-btn ghost" disabled title="Not available yet">${icon('externalLink')}<span>Manage subscription</span></button>
        <button type="button" class="p-btn ghost" data-signout>${icon('logout')}<span>Logout</span></button>
      </div>
      <a href="https://swayform.net/" target="_blank" rel="noopener noreferrer" class="acct-external-link">Visit swayform.net ${icon('externalLink')}</a>
    </div>`;

  container.querySelector('[data-signout]').addEventListener('click', async () => {
    if (!window.confirm('Log out of SwayForm Learning Portal?')) return;
    await logout();
    location.href = '/';
  });
  container.querySelector('[data-reset]').addEventListener('click', async () => {
    if (!window.confirm('Reset all locally saved progress? Every activity will show as not started. This cannot be undone.')) return;
    await resetProgress();
    render(container, ctx);
  });
}

export function mount(container, ctx){
  ctx.setAppTitle && ctx.setAppTitle('Account');
  render(container, ctx);
  return {};
}
