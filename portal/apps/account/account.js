import { icon } from '../../icons.js';
import { ACCOUNT_MOCK } from '../../data/account-mock.js';

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

export function mount(container, ctx){
  const a = ACCOUNT_MOCK;
  container.innerHTML = `
    <div class="acct-root p-scroll">
      <div class="acct-hero">
        <div class="acct-avatar">${initials(a.studentName)}</div>
        <div class="acct-hero-info">
          <div class="acct-name">${a.studentName}</div>
          <div class="acct-role">${a.role} &middot; ${a.school}</div>
          <div class="acct-badges">
            <span class="acct-badge plan">${a.plan}</span>
            <span class="acct-badge id">${a.accountId}</span>
          </div>
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Learning progress</div>
        <div class="acct-stats">
          ${statRow('Lessons', a.progress.lessonsCompleted, a.progress.totalLessons, 'book')}
          ${statRow('Labs', a.progress.labsCompleted, a.progress.totalLabs, 'terminal')}
          ${statRow('Demos viewed', a.progress.demosViewed, a.progress.totalDemos, 'play')}
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Account</div>
        <div class="acct-rows">
          <div class="acct-row"><span>Member since</span><span>${new Date(a.memberSince).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
          <div class="acct-row"><span>School / organization</span><span>${a.school}</span></div>
          <div class="acct-row"><span>Plan</span><span>${a.plan}</span></div>
        </div>
      </div>

      <div class="acct-section">
        <div class="acct-section-title">Coming with school accounts</div>
        <div class="acct-coming">
          ${a.comingSoon.map((c) => `<div class="acct-coming-item"><div class="acct-coming-label">${c.label}</div><div class="acct-coming-desc">${c.description}</div></div>`).join('')}
        </div>
      </div>

      <div class="acct-actions">
        <button type="button" class="p-btn ghost" disabled title="Not available yet">${icon('externalLink')}<span>Manage subscription</span></button>
        <button type="button" class="p-btn ghost" disabled title="Not available yet">${icon('close')}<span>Sign out</span></button>
      </div>
    </div>`;

  ctx.setAppTitle && ctx.setAppTitle('Account');
  return {};
}
