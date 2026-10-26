import { icon } from '../../icons.js';
import { getTheme, setTheme } from '../../theme.js';
import { getSession } from '../../services/auth-service.js';
import { resetProgress } from '../../services/progress-service.js';
import { getPrefs, setPref, resetPrefs, TEXT_SIZE_MIN, TEXT_SIZE_MAX } from '../../prefs.js';

export const meta = {
  id: 'settings',
  title: 'Settings',
  icon: 'settings',
  defaultSize: { w: 560, h: 520 },
};

function toggleRow(id, label, desc, checked){
  return `
    <label class="set-row" for="${id}">
      <span class="set-row-text"><span class="set-row-label">${label}</span><span class="set-row-desc">${desc}</span></span>
      <span class="set-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="set-switch-track"><span class="set-switch-thumb"></span></span></span>
    </label>`;
}

function confirmDialog(container, { title, message, confirmLabel, typeWord }){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'set-modal-overlay';
    overlay.innerHTML = `
      <div class="set-modal" role="dialog" aria-modal="true">
        <div class="set-modal-title"></div>
        <p class="set-modal-text"></p>
        <label class="set-modal-label" for="set-confirm-input">Type <strong></strong> to confirm</label>
        <input type="text" id="set-confirm-input" class="set-modal-input" autocomplete="off" spellcheck="false">
        <div class="set-modal-actions">
          <button type="button" class="p-btn ghost" data-cancel>Cancel</button>
          <button type="button" class="p-btn set-modal-danger" data-confirm></button>
        </div>
      </div>`;
    overlay.querySelector('.set-modal-title').textContent = title;
    overlay.querySelector('.set-modal-text').textContent = message;
    overlay.querySelector('[data-confirm]').textContent = confirmLabel;
    const input = overlay.querySelector('input');
    const confirmBtn = overlay.querySelector('[data-confirm]');
    const label = overlay.querySelector('.set-modal-label');
    const ok = () => !typeWord || input.value === typeWord;
    if (typeWord) { label.querySelector('strong').textContent = typeWord; confirmBtn.disabled = true; }
    else { label.remove(); input.remove(); }
    const close = (result) => { overlay.remove(); resolve(result); };
    input.addEventListener('input', () => { confirmBtn.disabled = !ok(); });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && ok()) close(true);
      if (e.key === 'Escape') close(false);
    });
    confirmBtn.addEventListener('click', () => close(true));
    overlay.querySelector('[data-cancel]').addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(overlay);
    (typeWord ? input : confirmBtn).focus();
  });
}

export function mount(container, ctx){
  const prefs = getPrefs();

  container.innerHTML = `
    <div class="set-root p-scroll la-surface">
      <div class="set-section">
        <div class="set-section-title">Appearance</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Theme</span><span class="set-row-desc">Applies across the whole portal — Learn, Textbook, Projects, Account, and Help. The Portal Desktop wallpaper and the Code Editor/Terminal stay dark either way.</span></span>
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
            <span class="set-row-text"><span class="set-row-label">Text size</span><span class="set-row-desc">Scales lessons, the Terminal, the Code Editor and the Learn, Account and Help screens.</span></span>
            <div class="set-stepper" data-font-size>
              <button type="button" data-step="-1" aria-label="Smaller">−</button>
              <span class="set-stepper-value" data-font-value>${prefs.textSize}</span>
              <button type="button" data-step="1" aria-label="Larger">+</button>
            </div>
          </div>
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
        <div class="set-section-title">Reset</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset preferences</span><span class="set-row-desc">Puts text size and the Code Editor settings back to their defaults. Theme is separate.</span></span>
            <button type="button" class="p-btn ghost" data-reset-prefs>Reset preferences</button>
          </div>
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset learning progress</span><span class="set-row-desc">Clears "completed" marks on every activity — for a signed-in account, everywhere, not just this browser.</span></span>
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

  const switchPrefs = { 'pref-wrap': 'editorWordWrap', 'pref-minimap': 'editorMinimap' };
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

  container.querySelector('[data-reset-prefs]').addEventListener('click', async () => {
    if (!await confirmDialog(container, { title: 'Reset preferences', message: 'Put text size, word wrap and minimap back to their defaults?', confirmLabel: 'Reset preferences' })) return;
    resetPrefs();
    const fresh = getPrefs();
    container.querySelector('#pref-wrap').checked = fresh.editorWordWrap;
    container.querySelector('#pref-minimap').checked = fresh.editorMinimap;
    fontValueEl.textContent = fresh.textSize;
  });

  container.querySelector('[data-reset-progress]').addEventListener('click', async (e) => {
    const session = await getSession();
    const confirmMsg = (!session || session.mode === 'guest')
      ? 'Reset all locally saved Guest progress? Every activity will show as not started. This cannot be undone.'
      : 'Reset your progress? This permanently deletes your saved progress from your account (not just this browser) — every activity will show as not started. This cannot be undone.';
    if (!await confirmDialog(container, { title: 'Reset progress', message: confirmMsg, confirmLabel: 'Reset progress', typeWord: 'DELETE' })) return;
    try { await resetProgress(); } catch { return; }
    const btn = e.currentTarget;
    const original = btn.textContent;
    btn.textContent = 'Progress reset';
    btn.disabled = true;
    setTimeout(() => { if (btn.isConnected){ btn.textContent = original; btn.disabled = false; } }, 1500);
  });

  ctx.setAppTitle && ctx.setAppTitle('Settings');
  return {};
}
