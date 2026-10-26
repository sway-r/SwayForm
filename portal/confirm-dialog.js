/* Small confirmation popup, optionally requiring a typed word (e.g. DELETE).
 * Styled by the .set-modal rules in apps/settings/settings.css. Resolves true or false. */
export function confirmDialog(container, { title, message, confirmLabel, typeWord }){
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
