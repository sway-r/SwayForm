import { icon } from '../../icons.js';
import { getReadingTheme, setReadingTheme } from '../../theme.js';
import { resetProgress } from '../../services/progress-service.js';

export const meta = {
  id: 'settings',
  title: 'Settings',
  icon: 'settings',
  defaultSize: { w: 560, h: 520 },
};

const PREFS_KEY = 'swayform.portal.notificationPrefs';
const DEFAULT_PREFS = { queueUpdates: true, labUnlocked: true, weeklyDigest: false };

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
    <div class="set-root p-scroll">
      <div class="set-section">
        <div class="set-section-title">Appearance</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reading surface theme</span><span class="set-row-desc">Applies to the Learn notebook pane and Help reference viewer. The desktop and code editor stay dark.</span></span>
            <div class="set-theme-toggle" data-theme-toggle>
              <button type="button" data-theme="light" class="${getReadingTheme() === 'light' ? 'active' : ''}">${icon('sun')}<span>Light</span></button>
              <button type="button" data-theme="dark" class="${getReadingTheme() === 'dark' ? 'active' : ''}">${icon('moon')}<span>Dark</span></button>
            </div>
          </div>
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Notifications <span class="set-mock-badge">Mocked — no backend yet</span></div>
        <div class="set-card">
          ${toggleRow('pref-queue', 'Queue updates', 'Notify when a submission is approved or needs changes.', prefs.queueUpdates)}
          ${toggleRow('pref-lab', 'New lab unlocked', 'Notify when a new lab becomes available.', prefs.labUnlocked)}
          ${toggleRow('pref-digest', 'Weekly digest', 'A short weekly summary of classroom activity.', prefs.weeklyDigest)}
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Workspace</div>
        <div class="set-card">
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
      setReadingTheme(btn.dataset.theme);
      container.querySelectorAll('[data-theme-toggle] button').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  container.querySelectorAll('.set-switch input').forEach((input) => {
    input.addEventListener('change', () => {
      const map = { 'pref-queue': 'queueUpdates', 'pref-lab': 'labUnlocked', 'pref-digest': 'weeklyDigest' };
      prefs[map[input.id]] = input.checked;
      savePrefs(prefs);
    });
  });

  container.querySelector('[data-reset-fs]').addEventListener('click', async () => {
    const fs = await import('../learn/editor/mock-fs.js');
    fs.resetAll();
  });
  container.querySelector('[data-reset-progress]').addEventListener('click', () => {
    resetProgress();
  });

  ctx.setAppTitle && ctx.setAppTitle('Settings');
  return {};
}
