/* Simulation window in a lab workspace: start a cloud Gazebo session, run the file open in the Code Editor, stop, reset, watch it in 3D. */
import { icon } from '../../../../icons.js';
import { SIM_CONFIG } from '../../../../data/sim-config.js';
import * as sim from '../../../../services/sim-service.js';
import { createViewer } from './sim-viewer.js';
import { validateJointContract, crossCheckUrdf } from './joint-contract.js';

export const meta = { id: 'simulation', title: 'Simulation', icon: 'cloud' };

const MAX_OUTPUT_LINES = 2000;
const TABLE_REFRESH_MS = 200;

const LINK_NOTES = {
  unconfigured: 'Simulation servers are not running yet.',
  denied: 'Simulation is not available for this account yet.',
  offline: 'Not connected to the simulation server.',
  connecting: 'Connecting to the simulation server…',
};

const STATE_NOTES = {
  none: 'No simulation is running. Start one to try your code on the simulated robot.',
  starting: 'Starting the simulation. This can take up to a minute.',
  resetting: 'Resetting the world. The simulation restarts from the beginning.',
  ending: 'Ending the session…',
};

const EXIT_NOTES = {
  finished: (code) => `Program finished with exit code ${code}.`,
  stopped: () => 'Program stopped.',
  timeout: () => 'Program stopped after 60 seconds, the same limit the real robot uses.',
  reset: () => 'Program stopped for the reset.',
  ended: () => 'Program stopped because the session ended.',
  error: () => 'The program could not be started.',
};

export function mount(bodyEl, winApi, opts){
  opts = opts || {};
  bodyEl.innerHTML = `
    <div class="sim-root">
      <div class="sim-toolbar">
        <button type="button" class="p-btn primary" data-act="start">${icon('play')}<span>Start simulation</span></button>
        <button type="button" class="p-btn primary" data-act="run" hidden>${icon('play')}<span>Run file</span></button>
        <button type="button" class="p-btn" data-act="stop" hidden><span>Stop</span></button>
        <button type="button" class="p-btn ghost" data-act="reset" hidden>${icon('refresh')}<span>Reset world</span></button>
        <button type="button" class="p-btn ghost" data-act="end" hidden><span>End session</span></button>
        <div class="sim-views" role="group" aria-label="Camera">
          ${['front', 'side', 'top', 'angle'].map((v) => `<button type="button" class="p-btn ghost" data-view="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div class="sim-stage">
        <div class="sim-canvas" data-canvas></div>
        <div class="sim-note" data-note></div>
      </div>
      <div class="sim-status" data-status></div>
      <div class="sim-bottom">
        <div class="sim-output" data-output aria-live="polite"></div>
        <div class="sim-joints">
          <table><thead><tr><th>Joint</th><th>Position (rad)</th><th>(deg)</th></tr></thead><tbody data-joints></tbody></table>
          <p class="sim-joints-empty" data-joints-empty>Joint positions measured by the physics engine appear here.</p>
        </div>
      </div>
    </div>`;

  const $ = (sel) => bodyEl.querySelector(sel);
  const btn = { start: $('[data-act="start"]'), run: $('[data-act="run"]'), stop: $('[data-act="stop"]'), reset: $('[data-act="reset"]'), end: $('[data-act="end"]') };
  const noteEl = $('[data-note]');
  const statusEl = $('[data-status]');
  const outputEl = $('[data-output]');
  const jointsEl = $('[data-joints]');
  const jointsEmptyEl = $('[data-joints-empty]');

  let viewer = null;
  let modelNote = SIM_CONFIG.modelUrl ? '' : 'Model S1 has not been imported into the simulator yet.';
  let pendingRun = false;
  let pendingStart = false;
  let latestJoints = null;
  let tableTimer = null;
  let stats = null;
  let disposed = false;

  createViewer($('[data-canvas]')).then(async (v) => {
    if (disposed){ v.dispose(); return; }
    viewer = v;
    if (SIM_CONFIG.modelUrl) await loadModel();
    render();
  }).catch((e) => {
    console.error('sim viewer failed', e);
    modelNote = 'The 3D view could not load. Check your connection and reopen this window.';
    render();
  });

  async function loadModel(){
    try {
      const urdfJoints = await viewer.loadModel(SIM_CONFIG.modelUrl, SIM_CONFIG.meshPackages);
      if (!SIM_CONFIG.contractUrl) return;
      const contract = await fetch(SIM_CONFIG.contractUrl).then((r) => r.json());
      const check = validateJointContract(contract);
      const cross = crossCheckUrdf(contract, urdfJoints);
      if (!check.ok || cross.missingInUrdf.length || cross.missingInContract.length){
        console.warn('sim model and joint contract disagree', { errors: check.errors, ...cross });
        appendLine('The robot model and the joint contract do not match yet. The details are in the browser console.', 'stderr');
      }
    } catch (e){
      console.error('sim model failed', e);
      modelNote = 'The robot model could not load.';
    }
  }

  function appendLine(text, stream){
    const line = document.createElement('div');
    line.className = 'sim-line' + (stream === 'stderr' ? ' is-err' : stream === 'note' ? ' is-note' : '');
    line.textContent = text;
    outputEl.appendChild(line);
    while (outputEl.childElementCount > MAX_OUTPUT_LINES) outputEl.firstElementChild.remove();
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function render(){
    const link = sim.getLink();
    const state = link === 'online' ? sim.getStatus().state : null;
    btn.start.hidden = !(state === null || state === 'none');
    btn.start.disabled = link === 'unconfigured' || link === 'denied' || link === 'connecting';
    btn.run.hidden = state !== 'ready';
    btn.stop.hidden = state !== 'running';
    btn.reset.hidden = !(state === 'ready' || state === 'running');
    btn.end.hidden = !(state === 'ready' || state === 'running');
    const active = opts.getActiveFile && opts.getActiveFile();
    btn.run.querySelector('span').textContent = active ? `Run ${active.path.split('/').pop()}` : 'Run file';
    btn.run.disabled = !active;

    const note = link !== 'online' ? LINK_NOTES[link] : (STATE_NOTES[state] || '');
    noteEl.textContent = [note, modelNote].filter(Boolean).join(' ');
    noteEl.hidden = !noteEl.textContent;

    const parts = [];
    if (state === 'running') parts.push('Running');
    else if (state === 'ready') parts.push('Ready');
    if (stats) parts.push(`Real-time factor ${stats.rtf.toFixed(2)}`, `Sim time ${stats.simTime.toFixed(1)} s`);
    statusEl.textContent = parts.join('  ·  ');
  }

  function renderJoints(){
    tableTimer = null;
    const f = latestJoints;
    if (!f) return;
    jointsEmptyEl.hidden = true;
    jointsEl.innerHTML = f.name.map((n, i) => {
      const rad = f.position[i];
      return `<tr><td>${escapeHtml(n)}</td><td>${rad.toFixed(3)}</td><td>${(rad * 180 / Math.PI).toFixed(1)}</td></tr>`;
    }).join('');
  }

  function runActive(){
    const active = opts.getActiveFile && opts.getActiveFile();
    if (!active){ appendLine('Open a file in the Code Editor first.', 'note'); return; }
    appendLine(`$ run ${active.path.replace(/^swayform_ws\//, '~/swayform_ws/')} in simulation`, 'note');
    sim.runFile(active.path, active.content);
  }

  const unsubscribe = sim.subscribe((msg) => {
    switch (msg.type){
      case 'link':
        if (msg.link === 'online' && (pendingStart || pendingRun)){ pendingStart = false; sim.startSession(); }
        break;
      case 'status':
        if (msg.state === 'ready' && pendingRun){ pendingRun = false; runActive(); }
        if (msg.state === 'none'){ stats = null; latestJoints = null; jointsEl.innerHTML = ''; jointsEmptyEl.hidden = false; }
        if (msg.state === 'none' && msg.reason && msg.reason !== 'ended') appendLine(`Session ended (${msg.reason.replace(/_/g, ' ')}).`, 'note');
        break;
      case 'output':
        msg.text.replace(/\n$/, '').split('\n').forEach((t) => appendLine(t, msg.stream));
        break;
      case 'exit':
        appendLine((EXIT_NOTES[msg.reason] || EXIT_NOTES.finished)(msg.code), 'note');
        break;
      case 'joints':
        if (viewer) viewer.applyJoints(msg);
        latestJoints = msg;
        if (!tableTimer) tableTimer = setTimeout(renderJoints, TABLE_REFRESH_MS);
        return;
      case 'poses':
        if (viewer) viewer.applyPoses(msg);
        return;
      case 'stats':
        stats = msg;
        break;
      case 'error':
        if (msg.message) appendLine(msg.message, 'stderr');
        else if (msg.code === 'cooldown') appendLine('Wait a few seconds before running again.', 'note');
        break;
    }
    render();
  });

  btn.start.addEventListener('click', () => {
    if (sim.getLink() === 'online') sim.startSession();
    else { pendingStart = true; sim.connect(); }
  });
  btn.run.addEventListener('click', runActive);
  btn.stop.addEventListener('click', () => sim.stopRun());
  btn.reset.addEventListener('click', () => sim.resetWorld());
  btn.end.addEventListener('click', () => sim.endSession());
  bodyEl.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => viewer && viewer.setView(b.dataset.view)));

  if (sim.getLink() === 'offline') sim.connect();
  render();

  return {
    // From the Code Editor's Simulation button: start a session if needed, then run once it is ready.
    runFromEditor(){
      winApi.focus && winApi.focus();
      const state = sim.getLink() === 'online' ? sim.getStatus().state : null;
      if (state === 'ready'){ runActive(); return; }
      if (state === 'running'){ appendLine('A program is already running. Stop it first.', 'note'); return; }
      pendingRun = true;
      if (sim.getLink() === 'online' && state === 'none') sim.startSession();
      else if (sim.getLink() === 'offline') sim.connect();
      render();
    },
    refresh: render,
    dispose(){
      disposed = true;
      unsubscribe();
      if (tableTimer) clearTimeout(tableTimer);
      if (viewer) viewer.dispose();
    },
  };
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
