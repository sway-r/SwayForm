import { icon } from '../../icons.js';
import { getTheme, setTheme } from '../../theme.js';
import { getSession } from '../../services/auth-service.js';
import { resetProgress } from '../../services/progress-service.js';
import { getPrefs, setPref, resetPrefs, FONT_SIZES } from '../../prefs.js';

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

function confirmTyped(container, message){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'set-modal-overlay';
    overlay.innerHTML = `
      <div class="set-modal" role="dialog" aria-modal="true">
        <div class="set-modal-title">Reset progress</div>
        <p class="set-modal-text"></p>
        <label class="set-modal-label" for="set-delete-input">Type <strong>DELETE</strong> to confirm</label>
        <input type="text" id="set-delete-input" class="set-modal-input" autocomplete="off" spellcheck="false">
        <div class="set-modal-actions">
          <button type="button" class="p-btn ghost" data-cancel>Cancel</button>
          <button type="button" class="p-btn set-modal-danger" data-confirm disabled>Reset progress</button>
        </div>
      </div>`;
    overlay.querySelector('.set-modal-text').textContent = message;
    const input = overlay.querySelector('input');
    const confirmBtn = overlay.querySelector('[data-confirm]');
    const close = (result) => { overlay.remove(); resolve(result); };
    input.addEventListener('input', () => { confirmBtn.disabled = input.value !== 'DELETE'; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value === 'DELETE') close(true);
      if (e.key === 'Escape') close(false);
    });
    confirmBtn.addEventListener('click', () => close(true));
    overlay.querySelector('[data-cancel]').addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(overlay);
    input.focus();
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
          ${toggleRow('pref-motion', 'Reduce motion', 'Turns off animations and transitions across the portal.', prefs.reduceMotion)}
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Code Editor</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Font size</span><span class="set-row-desc">Text size in the Code Editor.</span></span>
            <div class="set-theme-toggle" data-font-size>
              ${FONT_SIZES.map((n) => `<button type="button" data-size="${n}" class="${prefs.editorFontSize === n ? 'active' : ''}">${n}</button>`).join('')}
            </div>
          </div>
          ${toggleRow('pref-wrap', 'Word wrap', 'Wrap long lines instead of scrolling sideways.', prefs.editorWordWrap)}
          ${toggleRow('pref-minimap', 'Minimap', 'Show a small overview of the file on the right edge.', prefs.editorMinimap)}
        </div>
      </div>

      <div class="set-section">
        <div class="set-section-title">Workspace</div>
        <div class="set-card">
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset preferences</span><span class="set-row-desc">Puts the accessibility and Code Editor settings back to their defaults. Theme is separate.</span></span>
            <button type="button" class="p-btn ghost" data-reset-prefs>Reset preferences</button>
          </div>
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset window layout</span><span class="set-row-desc">Returns Textbook, Code Editor, and Terminal to the default tiled arrangement.</span></span>
            <button type="button" class="p-btn ghost" data-reset-layout>Reset layout</button>
          </div>
          <div class="set-row">
            <span class="set-row-text"><span class="set-row-label">Reset workspace edits</span><span class="set-row-desc">Drafts are saved in this browser — they survive closed tabs and restarts — and are cleared on sign-out. Reset restores the starter files.</span></span>
            <button type="button" class="p-btn ghost" data-reset-fs>Reset workspace</button>
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

  const switchPrefs = { 'pref-motion': 'reduceMotion', 'pref-wrap': 'editorWordWrap', 'pref-minimap': 'editorMinimap' };
  container.querySelectorAll('.set-switch input').forEach((input) => {
    input.addEventListener('change', () => setPref(switchPrefs[input.id], input.checked));
  });

  container.querySelectorAll('[data-font-size] button').forEach((btn) => {
    btn.addEventListener('click', () => {
      setPref('editorFontSize', Number(btn.dataset.size));
      container.querySelectorAll('[data-font-size] button').forEach((b) => b.classList.toggle('active', b === btn));
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

  container.querySelector('[data-reset-prefs]').addEventListener('click', () => {
    resetPrefs();
    const fresh = getPrefs();
    container.querySelector('#pref-motion').checked = fresh.reduceMotion;
    container.querySelector('#pref-wrap').checked = fresh.editorWordWrap;
    container.querySelector('#pref-minimap').checked = fresh.editorMinimap;
    container.querySelectorAll('[data-font-size] button').forEach((b) => b.classList.toggle('active', Number(b.dataset.size) === fresh.editorFontSize));
  });

  container.querySelector('[data-reset-fs]').addEventListener('click', async () => {
    if (!window.confirm('Reset all local workspace edits? Every file reverts to its starter version. This cannot be undone.')) return;
    const fs = await import('../learn/editor/mock-fs.js');
    fs.resetAll();
    // A currently-open Code Editor (a separate window) can't see this call —
    // tell it to refresh from the now-reset fs, same pattern as the layout
    // reset button just above.
    window.dispatchEvent(new CustomEvent('swayform:workspace-fs-reset'));
  });
  container.querySelector('[data-reset-progress]').addEventListener('click', async (e) => {
    const session = await getSession();
    const confirmMsg = (!session || session.mode === 'guest')
      ? 'Reset all locally saved Guest progress? Every activity will show as not started. This cannot be undone.'
      : 'Reset your progress? This permanently deletes your saved progress from your account (not just this browser) — every activity will show as not started. This cannot be undone.';
    if (!await confirmTyped(container, confirmMsg)) return;
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
