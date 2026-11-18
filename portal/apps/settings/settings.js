import { icon } from '../../icons.js';
import { getTheme, setTheme } from '../../theme.js';
import { getPrefs, setPref, resetPrefs, TEXT_SIZE_MIN, TEXT_SIZE_MAX } from '../../prefs.js';
import '../../sounds.js';
import { confirmDialog } from '../../confirm-dialog.js';
import { exportProgress } from '../../services/export-progress.js';

// The settings screen, shown as a section of the Account app.

function toggleRow(id, label, desc, checked){
  return `
    <label class="set-row" for="${id}">
      <span class="set-row-text"><span class="set-row-label">${label}</span><span class="set-row-desc">${desc}</span></span>
      <span class="set-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="set-switch-track"><span class="set-switch-thumb"></span></span></span>
    </label>`;
}

export function mountSettings(container){
  const prefs = getPrefs();

  container.innerHTML = `
    <div class="set-root set-embedded">
      <div class="set-section">
        <div class="set-section-title">Appearance</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Theme</span><span class="set-row-desc">Applies across the whole portal. The desktop wallpaper and the Code Editor stay dark either way.</span></span>
            <div class="set-theme-toggle" data-theme-toggle>
              <button type="button" data-theme="light" class="${getTheme() === 'light' ? 'active' : ''}">${icon('sun')}<span>Light</span></button>
              <button type="button" data-theme="dark" class="${getTheme() === 'dark' ? 'active' : ''}">${icon('moon')}<span>Dark</span></button>
            </div>
          </div>
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Accessibility</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Text size</span><span class="set-row-desc">Scales lessons, the Code Editor, and the Learn and Account screens.</span></span>
            <div class="set-stepper" data-font-size>
              <button type="button" data-step="-1" aria-label="Smaller">−</button>
              <span class="set-stepper-value" data-font-value>${prefs.textSize}</span>
              <button type="button" data-step="1" aria-label="Larger">+</button>
            </div>
          </div>
          ${toggleRow('pref-motion', 'Reduce motion', 'Turns off the small fades and transitions. On by default if your device asks for reduced motion.', prefs.reduceMotion)}
          ${toggleRow('pref-sounds', 'Sound effects', 'Soft sounds for clicks, opening windows and finishing a lab.', prefs.sounds)}
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Learning</div>
        <div class="set-card">
          ${toggleRow('pref-hide-done', 'Hide completed labs', 'Moves finished labs into a collapsed "Completed labs" group at the end of each section, in section lists and the curriculum menu.', prefs.hideCompleted)}
          ${toggleRow('pref-timer', 'Show lab timer', 'Shows your time in this session, on this lab, and in total at the top of every lab. Time only counts while you are active.', prefs.showTimer)}
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Code Editor</div>
        <div class="set-card">
          ${toggleRow('pref-wrap', 'Word wrap', 'Wrap long lines instead of scrolling sideways.', prefs.editorWordWrap)}
          ${toggleRow('pref-minimap', 'Minimap', 'Show a tiny zoomed-out preview of the whole code file on the right edge of the Code Editor. Click it to jump to a spot in the file.', prefs.editorMinimap)}
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Your data</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Export my progress</span><span class="set-row-desc">Downloads a zip with your completed labs, time spent, and the code you wrote (saved in this browser).</span></span>
            <button type="button" class="p-btn ghost" data-export>Export</button>
          </div>
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Reset</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset preferences</span><span class="set-row-desc">Puts every setting above, except theme, back to its default.</span></span>
            <button type="button" class="p-btn ghost" data-reset-prefs>Reset preferences</button>
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

  const switchPrefs = {
    'pref-wrap': 'editorWordWrap', 'pref-minimap': 'editorMinimap', 'pref-motion': 'reduceMotion',
    'pref-sounds': 'sounds', 'pref-hide-done': 'hideCompleted', 'pref-timer': 'showTimer',
  };
  container.querySelectorAll('.set-switch input').forEach((input) => {
    input.addEventListener('change', () => setPref(switchPrefs[input.id], input.checked));
  });

  const fontValueEl = container.querySelector('[data-font-value]');
  container.querySelectorAll('[data-font-size] button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, getPrefs().textSize + Number(btn.dataset.step)));
      setPref('textSize', next);
      fontValueEl.textContent = next;
    });
  });

  container.querySelector('[data-export]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Exporting…';
    try {
      const result = await exportProgress();
      btn.textContent = `Exported ${result.completed} lab${result.completed === 1 ? '' : 's'}`;
    } catch (err) {
      btn.textContent = 'Export failed';
    }
    setTimeout(() => { if (btn.isConnected){ btn.textContent = original; btn.disabled = false; } }, 2200);
  });

  container.querySelector('[data-reset-prefs]').addEventListener('click', async () => {
    if (!await confirmDialog(container, { title: 'Reset preferences', message: 'Put every setting on this page except theme back to its default?', confirmLabel: 'Reset preferences' })) return;
    resetPrefs();
    const fresh = getPrefs();
    Object.entries(switchPrefs).forEach(([id, name]) => { container.querySelector('#' + id).checked = fresh[name]; });
    fontValueEl.textContent = fresh.textSize;
  });

  return {};
}
