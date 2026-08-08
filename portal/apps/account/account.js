import { icon } from '../../icons.js';
import { ACCOUNT_MOCK } from '../../data/account-mock.js';
import { CURRICULUM, labTotals, sectionProgress } from '../../data/curriculum.js';
import { getSession, logout } from '../../services/auth-service.js';
import { getCompletedActivities, resetProgress } from '../../services/progress-service.js';

export const meta = {
  id: 'account',
  title: 'Account',
  icon: 'account',
  defaultSize: { w: 760, h: 640 },
};

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
  const a = ACCOUNT_MOCK;
  const session = await getSession();
  const isGuest = session && session.mode === 'guest';
  const completed = await getCompletedActivities();
  const labs = labTotals(completed);

  const displayName = isGuest ? 'Guest User' : a.studentName;
  const roleLine = isGuest ? 'Guest session · progress saved in this browser only' : `${a.role} · ${a.school}`;

  const perSection = CURRICULUM.sections.map((section) => ({ section, ...sectionProgress(section.id, completed) }));

  container.innerHTML = `
    <div class="acct-root p-scroll la-surface">
      <div class="acct-hero">
        <div class="acct-avatar">${initials(displayName)}</div>
        <div class="acct-hero-info">
          <div class="acct-name">${displayName}</div>
          <div class="acct-role">${roleLine}</div>
          <div class="acct-badges">
            ${isGuest ? '<span class="acct-badge plan">Guest Mode</span>' : `<span class="acct-badge plan">${a.plan}</span><span class="acct-badge id">${a.accountId}</span>`}
          </div>
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Learning progress</div>
        <div class="acct-stats">
          ${statRow('Labs complete (Foundation–Projects)', labs.complete, labs.total, 'checkCircle')}
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
            : `<div class="acct-row"><span>Member since</span><span>${new Date(a.memberSince).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
               <div class="acct-row"><span>School / organization</span><span>${a.school}</span></div>
               <div class="acct-row"><span>Plan</span><span>${a.plan}</span></div>`}
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Coming with school accounts</div>
        <div class="acct-coming">
          ${a.comingSoon.map((c) => `<div class="acct-coming-item"><div class="acct-coming-label">${c.label}</div><div class="acct-coming-desc">${c.description}</div></div>`).join('')}
        </div>
      </div>

      <div class="acct-actions">
        <button type="button" class="p-btn ghost" data-reset>${icon('refresh')}<span>Reset local progress</span></button>
        <button type="button" class="p-btn ghost" disabled title="Not available yet">${icon('externalLink')}<span>Manage subscription</span></button>
        <button type="button" class="p-btn ghost" data-signout>${icon('close')}<span>Sign out</span></button>
      </div>
    </div>`;

  container.querySelector('[data-signout]').addEventListener('click', async () => {
    await logout();
    location.href = '/';
  });
  container.querySelector('[data-reset]').addEventListener('click', async () => {
    await resetProgress();
    render(container, ctx);
  });
}

export function mount(container, ctx){
  ctx.setAppTitle && ctx.setAppTitle('Account');
  render(container, ctx);
  return {};
}
