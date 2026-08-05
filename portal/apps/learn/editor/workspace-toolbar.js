import { icon } from '../../../icons.js';

export class WorkspaceToolbar {
  constructor(container, { onRun, onSave, onReset, onCheck } = {}){
    this.container = container;
    container.innerHTML = `
      <div class="wt-left">
        <button type="button" class="p-btn primary" data-act="run">${icon('play')}<span>Run</span></button>
        <button type="button" class="p-btn" data-act="check">${icon('checkCircle')}<span>Check</span></button>
        <div class="wt-divider"></div>
        <button type="button" class="p-btn ghost" data-act="save">${icon('save')}<span>Save</span></button>
        <button type="button" class="p-btn ghost" data-act="reset">${icon('refresh')}<span>Reset</span></button>
      </div>
      <div class="wt-right">
        <span class="wt-file-status" data-file-status></span>
        <button type="button" class="p-btn ghost wt-sim" disabled title="Cloud simulation will appear here.">${icon('cloud')}<span>Simulation</span></button>
      </div>`;

    container.querySelector('[data-act="run"]').addEventListener('click', () => onRun && onRun());
    container.querySelector('[data-act="check"]').addEventListener('click', () => onCheck && onCheck());
    container.querySelector('[data-act="save"]').addEventListener('click', () => onSave && onSave());
    container.querySelector('[data-act="reset"]').addEventListener('click', () => onReset && onReset());

    this.statusEl = container.querySelector('[data-file-status]');
    this.runBtn = container.querySelector('[data-act="run"]');
    this.checkBtn = container.querySelector('[data-act="check"]');
  }

  setFileStatus(text){
    this.statusEl.textContent = text || '';
  }

  setBusy(busy){
    this.runBtn.disabled = busy;
    this.checkBtn.disabled = busy;
  }
}
