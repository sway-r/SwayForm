import { icon } from '../../../icons.js';

export class WorkspaceToolbar {
  constructor(container, { onRun, onSave, onReset, onCheck, onRunOnRobot, onQueue } = {}){
    this.container = container;
    container.innerHTML = `
      <div class="wt-left">
        <button type="button" class="p-btn primary" data-act="run">${icon('play')}<span>Run</span></button>
        <button type="button" class="p-btn" data-act="check">${icon('checkCircle')}<span>Check</span></button>
        <div class="wt-divider"></div>
        <button type="button" class="p-btn ghost" data-act="save">${icon('save')}<span>Save</span></button>
        <button type="button" class="p-btn ghost" data-act="reset">${icon('refresh')}<span>Reset</span></button>
        <div class="wt-divider" data-robot-divider hidden></div>
        <button type="button" class="p-btn" data-act="run-robot" hidden>${icon('robot')}<span>Run on Robot</span></button>
        <button type="button" class="p-btn primary" data-act="queue" hidden disabled>${icon('arrowRight')}<span>Queue</span></button>
      </div>
      <div class="wt-right">
        <span class="wt-file-status" data-file-status></span>
        <button type="button" class="p-btn ghost wt-sim" disabled title="Cloud simulation will appear here.">${icon('cloud')}<span>Simulation</span></button>
      </div>`;

    container.querySelector('[data-act="run"]').addEventListener('click', () => onRun && onRun());
    container.querySelector('[data-act="check"]').addEventListener('click', () => onCheck && onCheck());
    container.querySelector('[data-act="save"]').addEventListener('click', () => onSave && onSave());
    container.querySelector('[data-act="reset"]').addEventListener('click', () => onReset && onReset());
    container.querySelector('[data-act="run-robot"]').addEventListener('click', () => onRunOnRobot && onRunOnRobot());
    container.querySelector('[data-act="queue"]').addEventListener('click', () => onQueue && onQueue());

    this.statusEl = container.querySelector('[data-file-status]');
    this.runBtn = container.querySelector('[data-act="run"]');
    this.checkBtn = container.querySelector('[data-act="check"]');
    this.runRobotBtn = container.querySelector('[data-act="run-robot"]');
    this.queueBtn = container.querySelector('[data-act="queue"]');
    this.robotDivider = container.querySelector('[data-robot-divider]');
  }

  setFileStatus(text){
    this.statusEl.textContent = text || '';
  }

  setBusy(busy){
    this.runBtn.disabled = busy;
    this.checkBtn.disabled = busy;
    if (!this.runRobotBtn.hidden) this.runRobotBtn.disabled = busy;
  }

  /** Show/hide the Run on Robot + Queue buttons for the current file. */
  setRobotEligible(eligible){
    this.runRobotBtn.hidden = !eligible;
    this.queueBtn.hidden = !eligible;
    this.robotDivider.hidden = !eligible;
    if (!eligible) this.setQueueEnabled(false);
  }

  /** Queue only becomes tappable after a passing Run on Robot check against
   * the current, unedited-since content — see resetQueueGate() in
   * code-editor-app.js's onChange handler. */
  setQueueEnabled(enabled){
    this.queueBtn.disabled = !enabled;
  }

  setRunRobotBusy(busy){
    this.runRobotBtn.disabled = busy;
  }
}
