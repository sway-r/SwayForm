import { icon } from '../../../icons.js';

export class WorkspaceToolbar {
  constructor(container, { onRun, onSave, onReset, onCheck, onQueueOnRobot } = {}){
    this.container = container;
    container.innerHTML = `
      <div class="wt-left">
        <button type="button" class="p-btn primary" data-act="run">${icon('play')}<span>Run</span></button>
        <button type="button" class="p-btn" data-act="check">${icon('checkCircle')}<span>Check</span></button>
        <div class="wt-divider"></div>
        <button type="button" class="p-btn ghost" data-act="save">${icon('save')}<span>Save</span></button>
        <button type="button" class="p-btn ghost" data-act="reset">${icon('refresh')}<span>Reset</span></button>
        <div class="wt-divider" data-robot-divider hidden></div>
        <button type="button" class="p-btn primary" data-act="queue-robot" hidden>${icon('robot')}<span>Queue on Robot</span></button>
      </div>
      <div class="wt-right">
        <span class="wt-file-status" data-file-status></span>
        <button type="button" class="p-btn ghost wt-sim" disabled title="Cloud simulation will appear here.">${icon('cloud')}<span>Simulation</span></button>
      </div>`;

    container.querySelector('[data-act="run"]').addEventListener('click', () => onRun && onRun());
    container.querySelector('[data-act="check"]').addEventListener('click', () => onCheck && onCheck());
    container.querySelector('[data-act="save"]').addEventListener('click', () => onSave && onSave());
    container.querySelector('[data-act="reset"]').addEventListener('click', () => onReset && onReset());
    container.querySelector('[data-act="queue-robot"]').addEventListener('click', () => onQueueOnRobot && onQueueOnRobot());

    this.statusEl = container.querySelector('[data-file-status]');
    this.runBtn = container.querySelector('[data-act="run"]');
    this.checkBtn = container.querySelector('[data-act="check"]');
    this.queueRobotBtn = container.querySelector('[data-act="queue-robot"]');
    this.robotDivider = container.querySelector('[data-robot-divider]');
  }

  setFileStatus(text){
    this.statusEl.textContent = text || '';
  }

  setBusy(busy){
    this.runBtn.disabled = busy;
    this.checkBtn.disabled = busy;
    if (!this.queueRobotBtn.hidden) this.queueRobotBtn.disabled = busy;
  }

  /** Show Queue on Robot (and hide Check, which only makes sense for
   * TODO-based lab exercises, not a canonical demo file with nothing to
   * fill in) for files with real robot source to validate against. */
  setRobotEligible(eligible){
    this.queueRobotBtn.hidden = !eligible;
    this.robotDivider.hidden = !eligible;
    this.checkBtn.hidden = eligible;
  }

  setQueueRobotBusy(busy){
    this.queueRobotBtn.disabled = busy;
  }
}
