// Target Lock's live view: camera feed, the staged unlock, then keyboard driving (head, torso, left arm, hand) over the bridge's /teleop socket.
import { mountVideoPlayer } from '../../robot/video-player.js';

const TELEOP_URL = 'wss://bridge.swayform.net/teleop';
const MOVE_REPEAT_MS = 100;  // held keys are re-sent; the robot stops on its own 300ms after the last one
const PING_INTERVAL_MS = 10_000;
const RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECTS = 3;
const ARM_READY_MS = 2_500;  // after ui:unlocked the arm eases to its ready pose; the robot ignores arm keys until then
const FLASH_MS = 400;

// event.code -> [group, axis, direction]; codes, so Caps Lock and Shift don't matter.
const HOLD_KEYS = {
  ArrowLeft: ['head', 'dx', -1], ArrowRight: ['head', 'dx', 1], ArrowUp: ['head', 'dy', 1], ArrowDown: ['head', 'dy', -1],
  KeyR: ['arm', 'lift', 1], KeyF: ['arm', 'lift', -1],
  KeyW: ['arm', 'b', 1], KeyS: ['arm', 'b', -1],
  KeyA: ['arm', 'a', -1], KeyD: ['arm', 'a', 1],
  KeyQ: ['torso', 'turn', -1], KeyE: ['torso', 'turn', 1],
  Space: ['hand', 'close', 1],
};
const LIMIT_KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
// A spectator lights the legend from the driver's own stdin lines, relayed by the bridge.
const DRIVER_LINE_KEYS = {
  'head.move': (dx, dy) => [dx > 0 && 'ArrowRight', dx < 0 && 'ArrowLeft', dy > 0 && 'ArrowUp', dy < 0 && 'ArrowDown'],
  'arm.lift': (v) => [v > 0 && 'KeyR', v < 0 && 'KeyF'],
  'arm.move': (a, b) => [a < 0 && 'KeyA', a > 0 && 'KeyD', b > 0 && 'KeyW', b < 0 && 'KeyS'],
  'torso.turn': (v) => [v < 0 && 'KeyQ', v > 0 && 'KeyE'],
  'hand.close': (v) => [v > 0 && 'Space'],
};
const DRIVER_KEY_EXPIRY_MS = 400; // the driver repeats held keys every 100ms; silence means released
const CHECK_LABELS = { camera: 'Camera', robot: 'Robot', motion: 'Motion', target: 'Target system' };
// Alphabetical on purpose: the lights fill in as the robot reports each stage, so the run order is not in this file.
const STAGE_LABELS = { arm: 'Arm', check: 'System check', controls: 'Controls', crosshair: 'Crosshair', movement: 'Movement' };
const PARKING = ' The robot opens its hand and returns to centre by itself.';
const ENDED_TEXT = {
  stopped: 'Session stopped from the admin workspace.' + PARKING,
  user: 'Session ended.' + PARKING,
  abandoned: 'Session ended — no input for a while.' + PARKING,
  max_time: 'Session ended — time limit reached.' + PARKING,
  error: 'The robot stopped the session because a step or check failed.',
  job_ended: 'The program finished.',
  replaced: 'This session was opened somewhere else.',
};

const key = (code, label, wide) => `<span class="tl-key${wide ? ' tl-key-wide' : ''}" data-key="${code}">${label}</span>`;

let open = null; // one popup at a time

// spectate: a read-only view of someone else's session (Admin's "Watch live"); it sends nothing to the robot.
export function openTargetLockPopup({ spectate = false } = {}){
  if (open) return open;

  const root = document.createElement('div');
  root.className = 'tl-backdrop';
  root.innerHTML = `
    <div class="tl-popup" role="dialog" aria-modal="true" aria-label="Target Lock live view">
      <div class="tl-head">
        <span class="tl-title">${spectate ? 'Target Lock — watching live (view only)' : "Target Lock — robot's eyes"}</span>
        <button type="button" class="tl-close" data-role="close">${spectate ? 'Close' : 'End session'}</button>
      </div>
      <ol class="tl-stages" data-role="stages">${'<li></li>'.repeat(Object.keys(STAGE_LABELS).length)}</ol>
      <div class="tl-body">
        <div class="tl-stage">
          <div class="tl-video" data-role="video"></div>
          <div class="tl-reticle" aria-hidden="true"></div>
          <ul class="tl-checks" data-role="checks"></ul>
          <div class="tl-readout" data-role="readout"></div>
        </div>
        <div class="tl-legend">
          <div class="tl-group" data-group="head">
            <div class="tl-group-title">Head</div>
            <div class="tl-arrows">${key('ArrowUp', '▲')}${key('ArrowLeft', '◀')}${key('ArrowDown', '▼')}${key('ArrowRight', '▶')}</div>
          </div>
          <div class="tl-group" data-group="arm">
            <div class="tl-group-title">Left arm</div>
            <div class="tl-row">${key('KeyR', 'R')}${key('KeyF', 'F')}<span class="tl-label">Shoulder up / down</span></div>
            <div class="tl-row">${key('KeyW', 'W')}${key('KeyS', 'S')}<span class="tl-label">Elbow bend / straighten</span></div>
            <div class="tl-row">${key('KeyA', 'A')}${key('KeyD', 'D')}<span class="tl-label">Shoulder out / in</span></div>
            <div class="tl-joints" data-role="joints"></div>
          </div>
          <div class="tl-group" data-group="torso">
            <div class="tl-group-title">Torso</div>
            <div class="tl-row">${key('KeyQ', 'Q')}${key('KeyE', 'E')}<span class="tl-label">Turn right / left</span></div>
          </div>
          <div class="tl-group" data-group="hand">
            <div class="tl-group-title">Hand</div>
            <div class="tl-row">${key('Space', 'Space', true)}<span class="tl-label">Hold to close</span></div>
            <div class="tl-row">${key('Enter', 'Enter', true)}<span class="tl-label">Open</span></div>
            <div class="tl-grip"><span data-role="grip"></span></div>
            <div class="tl-joints" data-role="grip-text"></div>
          </div>
        </div>
      </div>
      <p class="tl-status" data-role="status">Connecting to the robot…</p>
    </div>`;
  document.body.appendChild(root);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

  const role = (name) => root.querySelector(`[data-role="${name}"]`);
  const statusEl = role('status');
  const checksEl = role('checks');
  const stagesEl = role('stages');
  const closeEl = role('close');
  const keyEls = Object.fromEntries([...root.querySelectorAll('.tl-key')].map((el) => [el.dataset.key, el]));
  const video = mountVideoPlayer(role('video'), { autoStart: true, keepOpen: true });

  let ws = null;
  let ready = false;     // ui:ready: the head is live
  let unlocked = false;  // ui:unlocked: arm, torso and hand are live too
  let ended = false;
  let reconnects = 0;
  let moveTimer = null;
  let pingTimer = null;
  let armTimer = null;
  const held = new Set();

  function send(frame){
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
  }

  function framesFor(group){
    const v = { dx: 0, dy: 0, lift: 0, a: 0, b: 0, turn: 0, close: 0 };
    for (const code of held){ const [g, axis, dir] = HOLD_KEYS[code]; if (g === group) v[axis] += dir; }
    if (group === 'head') return [{ t: 'head.move', dx: v.dx, dy: v.dy }];
    // arm.lift and arm.move share one deadman on the robot, so they go out together and a released axis is always zeroed.
    if (group === 'arm') return [{ t: 'arm.lift', v: v.lift }, { t: 'arm.move', a: v.a, b: v.b }];
    if (group === 'torso') return [{ t: 'torso.turn', v: v.turn }];
    return [{ t: 'hand.close', v: v.close }];
  }

  function sendGroup(group){
    if (group === 'head' ? !ready : !unlocked) return;
    for (const frame of framesFor(group)) send(frame);
  }

  const heldGroups = () => new Set([...held].map((code) => HOLD_KEYS[code][0]));

  function syncMoveTimer(){
    if (held.size && !moveTimer) moveTimer = setInterval(() => heldGroups().forEach(sendGroup), MOVE_REPEAT_MS);
    if (!held.size && moveTimer){ clearInterval(moveTimer); moveTimer = null; }
  }

  function releaseKeys(){
    if (!held.size) return;
    const groups = heldGroups();
    held.clear();
    for (const el of Object.values(keyEls)) el.classList.remove('is-held');
    syncMoveTimer();
    groups.forEach(sendGroup);
  }

  function flash(el, cls){
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), FLASH_MS);
  }

  // The page behind must not see these keys: W/A/S/D would otherwise type into the editor.
  function swallow(event){ event.preventDefault(); event.stopPropagation(); }

  function onKeyDown(event){
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Enter' || event.code === 'NumpadEnter'){
      swallow(event);
      if (!unlocked || event.repeat) return;
      send({ t: 'hand.open' });
      flash(keyEls.Enter, 'is-held');
      return;
    }
    if (!HOLD_KEYS[event.code]) return;
    swallow(event);
    if (held.has(event.code)) return;
    held.add(event.code);
    keyEls[event.code].classList.add('is-held');
    syncMoveTimer();
    sendGroup(HOLD_KEYS[event.code][0]);
  }

  function onKeyUp(event){
    if (HOLD_KEYS[event.code] || event.code === 'Enter' || event.code === 'NumpadEnter') swallow(event);
    if (!held.delete(event.code)) return;
    keyEls[event.code].classList.remove('is-held');
    syncMoveTimer();
    sendGroup(HOLD_KEYS[event.code][0]);
  }

  const driverLit = new Map(); // command -> { codes, timer }

  function showDriverLine(line){
    const [command, ...args] = line.split(' ');
    if (command === 'hand.open'){ flash(keyEls.Enter, 'is-held'); return; }
    const keysFor = DRIVER_LINE_KEYS[command];
    if (!keysFor) return;
    const was = driverLit.get(command);
    if (was){ clearTimeout(was.timer); was.codes.forEach((code) => keyEls[code].classList.remove('is-held')); }
    const codes = keysFor(...args.map(Number)).filter(Boolean);
    codes.forEach((code) => keyEls[code].classList.add('is-held'));
    const timer = setTimeout(() => showDriverLine(`${command} 0 0`), DRIVER_KEY_EXPIRY_MS);
    if (codes.length) driverLit.set(command, { codes, timer });
    else { clearTimeout(timer); driverLit.delete(command); }
  }

  function lightStage(name, ok = true){
    let el = stagesEl.querySelector(`[data-stage="${name}"]`);
    if (!el){
      el = stagesEl.querySelector('li:not([data-stage])');
      if (!el) return;
      el.dataset.stage = name;
      el.textContent = STAGE_LABELS[name];
    }
    el.className = ok ? 'is-ok' : 'is-fail';
  }

  function handleUiLine(text){
    const [, kind, a, b, c] = text.match(/^ui:(\S+)(?:\s+(\S+))?(?:\s+(\S+))?(?:\s+(\S+))?/) || [];
    if (kind === 'check' && CHECK_LABELS[a]){
      let row = checksEl.querySelector(`[data-check="${a}"]`);
      if (!row){ row = document.createElement('li'); row.dataset.check = a; checksEl.appendChild(row); }
      row.textContent = `${CHECK_LABELS[a]} ${b === 'ok' ? '✓' : '✕'}`;
      row.className = b === 'ok' ? 'is-ok' : 'is-fail';
      if (b !== 'ok') lightStage('check', false);
      else if (checksEl.querySelectorAll('.is-ok').length === Object.keys(CHECK_LABELS).length){
        lightStage('check');
        statusEl.textContent = 'System check passed.';
      }
    } else if (kind === 'crosshair' || kind === 'controls'){
      root.classList.add(`has-${kind}`);
      lightStage(kind);
      statusEl.textContent = kind === 'crosshair' ? 'Crosshair activated.' : 'Controls loaded.';
    } else if (kind === 'ready'){
      ready = true;
      root.classList.add('is-live');
      lightStage('movement');
      statusEl.textContent = 'Movement unlocked — the arrow keys turn the head.';
    } else if (kind === 'unlocked'){
      unlocked = true;
      root.classList.add('is-armed');
      lightStage('arm');
      statusEl.textContent = 'Arm unlocked — the arm is moving to its ready position…';
      clearTimeout(armTimer);
      armTimer = setTimeout(() => {
        if (!ended) statusEl.textContent = spectate ? 'The driver has control of the robot.' : 'You have control — grab the object and lift it.';
      }, ARM_READY_MS);
    } else if (kind === 'head'){
      role('readout').textContent = `pan ${a}°  tilt ${b}°`;
    } else if (kind === 'arm'){
      role('joints').textContent = `shoulder ${a}°  roll ${b}°  elbow ${c}°`;
    } else if (kind === 'hand'){
      const percent = Math.max(0, Math.min(100, Number(a) || 0));
      role('grip').style.width = `${percent}%`;
      role('grip-text').textContent = `grip ${percent}%`;
    } else if (kind === 'limit'){
      const armHeld = spectate
        ? ['arm.move', 'arm.lift'].flatMap((command) => (driverLit.get(command) || { codes: [] }).codes)
        : [...held].filter((code) => HOLD_KEYS[code][0] === 'arm');
      const codes = a === 'arm' ? armHeld : [LIMIT_KEYS[a]];
      for (const code of codes) flash(keyEls[code], 'is-limit');
    } else if (kind === 'ended'){
      finish(ENDED_TEXT[a] || ENDED_TEXT.job_ended);
    }
  }

  function finish(message){
    if (ended) return;
    ended = true;
    releaseKeys();
    ready = unlocked = false;
    clearTimeout(armTimer);
    root.classList.remove('is-live', 'is-armed');
    statusEl.textContent = message;
    closeEl.textContent = 'Close';
  }

  async function connect(){
    try {
      const res = await fetch('/api/robot/status', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(spectate ? { action: 'teleop-token', watch: true } : { action: 'teleop-token' }), signal: AbortSignal.timeout(10_000),
      });
      if (!open || ended) return;
      if (res.status === 409){ finish(ENDED_TEXT.job_ended); return; }
      if (!res.ok) throw new Error(`teleop token ${res.status}`);
      const { token } = await res.json();
      if (!open || ended) return;

      const socket = new WebSocket(`${TELEOP_URL}?token=${encodeURIComponent(token)}`);
      ws = socket;
      // The robot program holds step 1 until it hears from this view, so the whole sequence is seen.
      socket.onopen = () => {
        reconnects = 0;
        if (!spectate) send({ t: 'ping' });
        if (!ready) statusEl.textContent = spectate ? 'Watching — waiting for the sequence…' : 'Connected — starting the sequence…';
      };
      socket.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.t === 'job.line' && typeof msg.text === 'string') handleUiLine(msg.text);
        else if (msg.t === 'driver.input' && spectate && typeof msg.line === 'string') showDriverLine(msg.line);
        else if (msg.t === 'job.ended') finish(ENDED_TEXT.job_ended);
      };
      socket.onclose = (event) => {
        if (ws !== socket) return;
        ws = null;
        if (!open || ended) return;
        if (event.code === 4008){ finish(ENDED_TEXT.replaced); return; }
        retry();
      };
    } catch (e) {
      if (open && !ended) retry();
    }
  }

  function retry(){
    if (++reconnects > MAX_RECONNECTS){ finish('Lost the control connection to the robot. It stops on its own.'); return; }
    statusEl.textContent = 'Reconnecting to the robot…';
    setTimeout(() => { if (open && !ended) connect(); }, RECONNECT_DELAY_MS);
  }

  function close(){
    if (!open) return;
    open = null;
    if (!spectate) send({ t: 'session.end' });
    driverLit.forEach(({ timer }) => clearTimeout(timer));
    clearInterval(moveTimer);
    clearInterval(pingTimer);
    clearTimeout(armTimer);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', releaseKeys);
    if (ws){ const socket = ws; ws = null; setTimeout(() => socket.close(), 200); }
    video.unmount();
    root.remove();
  }

  if (!spectate){
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', releaseKeys);
    pingTimer = setInterval(() => send({ t: 'ping' }), PING_INTERVAL_MS);
  }
  closeEl.addEventListener('click', close);

  open = { close, jobEnded(){ finish(ENDED_TEXT.job_ended); } };
  connect();
  return open;
}
