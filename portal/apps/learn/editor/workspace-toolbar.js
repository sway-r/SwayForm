import { icon } from '../../../icons.js';

export class WorkspaceToolbar {
  constructor(container, { onRun, onSave, onReset, onCheck, onQueueOnRobot } = {}){
    this.container = container;
    container.innerHTML = `
      <div class="wt-left">
        <button type="button" class="p-btn primary" data-act="run">${icon('play')}<span>Run</span></button>
        <button type="button" class="p-btn" data-act="check">${icon('checkCircle')}<span>Check</span></button>
        <div class="wt-divider"></div>
        <button type="button" class="p-btn ghost" data-act="save" title="Drafts are saved for this tab and cleared on sign-out. Copy code you want to keep.">${icon('save')}<span>Save</span></button>
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

    // Queue on Robot has two independent gates, both of which must be clear
    // for the button to be enabled: not currently busy, and "ready" — Run
    // must have confirmed the current content first (see code-editor-app.js,
    // which flips this back to false on every edit and on a fresh file).
    this.queueReady = false;
    this.runBusy = false;
    this.queueBusy = false;
    this.queueRobotBtn.disabled = true;
  }

  setFileStatus(text){
    this.statusEl.textContent = text || '';
  }

  setBusy(busy){
    this.runBtn.disabled = busy;
    this.checkBtn.disabled = busy;
    this.runBusy = busy;
    this._refreshQueueDisabled();
  }

  /** Show Queue on Robot (and hide Check, which only makes sense for
   * TODO-based lab exercises, not a canonical demo file with nothing to
   * fill in) for files with real robot source to validate against. */
  setRobotEligible(eligible){
    this.queueRobotBtn.hidden = !eligible;
    this.robotDivider.hidden = !eligible;
    this.checkBtn.hidden = eligible;
  }

  /** Whether Run has confirmed (server-validated) the file's current content.
   * Stays false until a Run against this exact content succeeds, so a
   * student can't queue code they haven't run and had confirmed first. */
  setQueueRobotReady(ready){
    this.queueReady = ready;
    this.queueRobotBtn.title = ready ? '' : 'Run your code first to confirm it works before queueing it on the robot.';
    this._refreshQueueDisabled();
  }

  setQueueRobotBusy(busy){
    this.queueBusy = busy;
    this._refreshQueueDisabled();
  }

  _refreshQueueDisabled(){
    if (this.queueRobotBtn.hidden) return;
    this.queueRobotBtn.disabled = this.runBusy || this.queueBusy || !this.queueReady;
  }
}
