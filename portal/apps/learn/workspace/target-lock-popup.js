// Target Lock's live view: camera feed with a centre reticle; arrow keys steer the head over the bridge's /teleop socket.
import { mountVideoPlayer } from '../../robot/video-player.js';

const TELEOP_URL = 'wss://bridge.swayform.net/teleop';
const MOVE_REPEAT_MS = 100;  // held keys are re-sent; the robot stops on its own 300ms after the last one
const PING_INTERVAL_MS = 10_000;
const RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECTS = 3;

const KEY_AXES = { ArrowLeft: ['dx', -1], ArrowRight: ['dx', 1], ArrowUp: ['dy', 1], ArrowDown: ['dy', -1] };
const LIMIT_KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
const CHECK_LABELS ={ camera: 'Camera', robot: 'Robot', motion: 'Motion' };
const ENDED_TEXT = {
  user: 'Session ended.',
  abandoned: 'Session ended — no input for a while.',
  max_time: 'Session ended — time limit reached.',
  error: 'The robot stopped the session because a check failed.',
  job_ended: 'The program finished.',
  replaced: 'This session was opened somewhere else.',
};

let open = null; // one popup at a time

export function openTargetLockPopup(){
  if (open) return open;

  const root = document.createElement('div');
  root.className = 'tl-backdrop';
  root.innerHTML = `
    <div class="tl-popup" role="dialog" aria-modal="true" aria-label="Target Lock live view">
      <div class="tl-head">
        <span class="tl-title">Target Lock — robot's eyes</span>
        <button type="button" class="tl-close" data-role="close" aria-label="End session">End session</button>
      </div>
      <div class="tl-stage">
        <div class="tl-video" data-role="video"></div>
        <div class="tl-reticle" aria-hidden="true"></div>
        <ul class="tl-checks" data-role="checks"></ul>
        <div class="tl-readout" data-role="readout"></div>
        <div class="tl-keys" aria-hidden="true">
          <span class="tl-key" data-key="ArrowUp">▲</span>
          <span class="tl-key" data-key="ArrowLeft">◀</span>
          <span class="tl-key" data-key="ArrowDown">▼</span>
          <span class="tl-key" data-key="ArrowRight">▶</span>
        </div>
      </div>
      <p class="tl-status" data-role="status">Connecting to the robot…</p>
    </div>`;
  document.body.appendChild(root);

  const statusEl = root.querySelector('[data-role="status"]');
  const checksEl = root.querySelector('[data-role="checks"]');
  const readoutEl = root.querySelector('[data-role="readout"]');
  const keyEls = Object.fromEntries([...root.querySelectorAll('.tl-key')].map((el) => [el.dataset.key, el]));
  const video = mountVideoPlayer(root.querySelector('[data-role="video"]'), { autoStart: true, keepOpen: true });

  let ws = null;
  let ready = false;
  let ended = false;
  let reconnects = 0;
  let moveTimer = null;
  let pingTimer = null;
  const held = new Set();

  function send(frame){
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
  }

  function currentMove(){
    const move = { dx: 0, dy: 0 };
    for (const key of held){ const [axis, dir] = KEY_AXES[key]; move[axis] += dir; }
    return move;
  }

  function sendMove(){
    if (ready) send({ t: 'head.move', ...currentMove() });
  }

  function syncMoveTimer(){
    if (held.size && !moveTimer) moveTimer = setInterval(sendMove, MOVE_REPEAT_MS);
    if (!held.size && moveTimer){ clearInterval(moveTimer); moveTimer = null; }
  }

  function releaseKeys(){
    if (!held.size) return;
    held.clear();
    for (const el of Object.values(keyEls)) el.classList.remove('is-held');
    syncMoveTimer();
    sendMove();
  }

  function onKeyDown(event){
    if (event.key === 'Escape'){ event.preventDefault(); if (ready) send({ t: 'head.center' }); return; }
    if (!KEY_AXES[event.key]) return;
    event.preventDefault();
    if (held.has(event.key)) return;
    held.add(event.key);
    keyEls[event.key].classList.add('is-held');
    syncMoveTimer();
    sendMove();
  }

  function onKeyUp(event){
    if (!held.delete(event.key)) return;
    keyEls[event.key].classList.remove('is-held');
    syncMoveTimer();
    sendMove();
  }

  function handleUiLine(text){
    const [, kind, a, b] = text.match(/^ui:(\S+)(?:\s+(\S+))?(?:\s+(\S+))?/) || [];
    if (kind === 'check' && CHECK_LABELS[a]){
      let row = checksEl.querySelector(`[data-check="${a}"]`);
      if (!row){ row = document.createElement('li'); row.dataset.check = a; checksEl.appendChild(row); }
      row.textContent = `${CHECK_LABELS[a]} ${b === 'ok' ? '✓' : '✕'}`;
      row.className = b === 'ok' ? 'is-ok' : 'is-fail';
    } else if (kind === 'ready'){
      ready = true;
      root.classList.add('is-live');
      statusEl.textContent = 'Movement unlocked — arrow keys turn the head, Esc re-centres.';
    } else if (kind === 'head'){
      readoutEl.textContent = `pan ${a}°  tilt ${b}°`;
    } else if (kind === 'limit' && LIMIT_KEYS[a]){
      const el = keyEls[LIMIT_KEYS[a]];
      el.classList.add('is-limit');
      setTimeout(() => el.classList.remove('is-limit'), 400);
    } else if (kind === 'ended'){
      finish(ENDED_TEXT[a] || ENDED_TEXT.job_ended);
    }
  }

  function finish(message){
    if (ended) return;
    ended = true;
    ready = false;
    root.classList.remove('is-live');
    statusEl.textContent = message;
    releaseKeys();
  }

  async function connect(){
    try {
      const res = await fetch('/api/robot/status', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'teleop-token' }), signal: AbortSignal.timeout(10_000),
      });
      if (!open || ended) return;
      if (res.status === 409){ finish(ENDED_TEXT.job_ended); return; }
      if (!res.ok) throw new Error(`teleop token ${res.status}`);
      const { token } = await res.json();
      if (!open || ended) return;

      const socket = new WebSocket(`${TELEOP_URL}?token=${encodeURIComponent(token)}`);
      ws = socket;
      socket.onopen = () => { reconnects = 0; if (!ready) statusEl.textContent = 'Connected — running system check…'; };
      socket.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.t === 'job.line' && typeof msg.text === 'string') handleUiLine(msg.text);
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
    if (++reconnects > MAX_RECONNECTS){ finish("Lost the control connection to the robot. The head stops on its own."); return; }
    statusEl.textContent = 'Reconnecting to the robot…';
    setTimeout(() => { if (open && !ended) connect(); }, RECONNECT_DELAY_MS);
  }

  function close(){
    if (!open) return;
    open = null;
    send({ t: 'session.end' });
    clearInterval(moveTimer);
    clearInterval(pingTimer);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', releaseKeys);
    if (ws){ const socket = ws; ws = null; setTimeout(() => socket.close(), 200); }
    video.unmount();
    root.remove();
  }

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', releaseKeys);
  root.querySelector('[data-role="close"]').addEventListener('click', close);
  pingTimer = setInterval(() => send({ t: 'ping' }), PING_INTERVAL_MS);

  open = { close, jobEnded(){ finish(ENDED_TEXT.job_ended); } };
  connect();
  return open;
}
