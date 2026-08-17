import { icon } from '../../icons.js';
import { getTheme, setTheme } from '../../theme.js';
import { resetProgress } from '../../services/progress-service.js';

export const meta = {
  id: 'settings',
  title: 'Settings',
  icon: 'settings',
  defaultSize: { w: 560, h: 520 },
};

const PREFS_KEY = 'swayform.portal.notificationPrefs';
const DEFAULT_PREFS = { robotUpdates: true, labUnlocked: true, weeklyDigest: false };

function loadPrefs(){
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
  catch (e) { return { ...DEFAULT_PREFS }; }
}
function savePrefs(p){
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* noop */ }
}

function toggleRow(id, label, desc, checked){
  return `
    <label class="set-row" for="${id}">
      <span class="set-row-text"><span class="set-row-label">${label}</span><span class="set-row-desc">${desc}</span></span>
      <span class="set-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="set-switch-track"><span class="set-switch-thumb"></span></span></span>
    </label>`;
}

export function mount(container, ctx){
  const prefs = loadPrefs();

  container.innerHTML = `
    <div class="set-root p-scroll la-surface">
      <div class="set-section">
        <div class="set-section-title">Appearance</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Theme</span><span class="set-row-desc">Applies across the whole portal — Learn, Notebook, Projects, Account, and Help. The Portal Desktop wallpaper and the Code Editor/Terminal stay dark either way.</span></span>
            <div class="set-theme-toggle" data-theme-toggle>
              <button type="button" data-theme="light" class="${getTheme() === 'light' ? 'active' : ''}">${icon('sun')}<span>Light</span></button>
              <button type="button" data-theme="dark" class="${getTheme() === 'dark' ? 'active' : ''}">${icon('moon')}<span>Dark</span></button>
            </div>
          </div>
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Notifications <span class="set-mock-badge">Mocked — no backend yet</span></div>
        <div class="set-card">
          ${toggleRow('pref-robot', 'Robot updates', 'Notify when SwayForm software or a lesson you\'re using gets updated.', prefs.robotUpdates)}
          ${toggleRow('pref-lab', 'New lab unlocked', 'Notify when a new lab becomes available.', prefs.labUnlocked)}
          ${toggleRow('pref-digest', 'Weekly digest', 'A short weekly summary of classroom activity.', prefs.weeklyDigest)}
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Workspace</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset window layout</span><span class="set-row-desc">Returns Notebook, Code Editor, and Terminal to the default tiled arrangement.</span></span>
            <button type="button" class="p-btn ghost" data-reset-layout>Reset layout</button>
          </div>
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset all local workspace edits</span><span class="set-row-desc">Reverts every file in the mock ROS 2 workspace back to its starter version.</span></span>
            <button type="button" class="p-btn ghost" data-reset-fs>Reset workspace</button>
          </div>
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset learning progress</span><span class="set-row-desc">Clears local "completed" marks on every activity.</span></span>
            <button type="button" class="p-btn ghost" data-reset-progress>Reset progress</button>
          </div>
        </div>
      </div>
    </div>`;

  container.querySelectorAll('[data-theme-toggle] button').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
      container.querySelectorAll('[data-theme-toggle] button').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  container.querySelectorAll('.set-switch input').forEach((input) => {
    input.addEventListener('change', () => {
      const map = { 'pref-robot': 'robotUpdates', 'pref-lab': 'labUnlocked', 'pref-digest': 'weeklyDigest' };
      prefs[map[input.id]] = input.checked;
      savePrefs(prefs);
    });
  });

  container.querySelector('[data-reset-layout]').addEventListener('click', (e) => {
    // Workspace layout is stored per-activity now (see activity-workspace.js),
    // so there's no single key to clear from here — instead, tell whichever
    // Activity Workspace is currently open (a separate window) to reset its
    // own live WorkspaceWindowManager immediately. If none is open, there's
    // nothing to visibly reset — the next activity opened starts from the
    // default layout regardless, since only activities you've customized
    // have a saved key at all.
    window.dispatchEvent(new CustomEvent('swayform:workspace-layout-reset'));
    const btn = e.currentTarget;
    const original = btn.textContent;
    btn.textContent = 'Layout reset';
    btn.disabled = true;
    setTimeout(() => { if (btn.isConnected){ btn.textContent = original; btn.disabled = false; } }, 1500);
  });

  container.querySelector('[data-reset-fs]').addEventListener('click', async () => {
    if (!window.confirm('Reset all local workspace edits? Every file reverts to its starter version. This cannot be undone.')) return;
    const fs = await import('../learn/editor/mock-fs.js');
    fs.resetAll();
  });
  container.querySelector('[data-reset-progress]').addEventListener('click', () => {
    if (!window.confirm('Reset all locally saved Guest progress? Every activity will show as not started. This cannot be undone.')) return;
    resetProgress();
  });

  ctx.setAppTitle && ctx.setAppTitle('Settings');
  return {};
}
