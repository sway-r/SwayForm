/* One cloud simulation session per signed-in student, shared by every lab window. Talks to sim/orchestrator over one WebSocket. */

const RECONNECT_DELAYS_MS = [1000, 3000, 8000];

let ws = null;
let link = 'offline'; // offline | connecting | online | unconfigured | denied
let status = { type: 'status', state: 'none' };
let reconnectAttempt = 0;
let wantOpen = false;
const listeners = new Set();

export function getLink(){ return link; }
export function getStatus(){ return status; }

// cb(msg) for every message, plus { type: 'link', link } on connection changes. Returns unsubscribe.
export function subscribe(cb){
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(msg){
  listeners.forEach((cb) => { try { cb(msg); } catch (e) { console.error('sim listener failed', e); } });
}

function setLink(next){
  if (link === next) return;
  link = next;
  emit({ type: 'link', link });
}

async function fetchToken(){
  const res = await fetch('/api/robot/status', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'sim-token' }),
  });
  if (res.status === 503) return { unconfigured: true };
  if (res.status === 401 || res.status === 403) return { denied: true };
  if (!res.ok) throw new Error(`sim-token ${res.status}`);
  return res.json();
}

export async function connect(){
  wantOpen = true;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  setLink('connecting');
  let grant;
  try { grant = await fetchToken(); }
  catch { setLink('offline'); scheduleReconnect(); return; }
  if (grant.unconfigured){ setLink('unconfigured'); return; }
  if (grant.denied){ setLink('denied'); return; }

  const sock = new WebSocket(`${grant.url}/session`);
  ws = sock;
  sock.addEventListener('open', () => {
    sock.send(JSON.stringify({ type: 'hello', token: grant.token }));
    reconnectAttempt = 0;
    setLink('online');
  });
  sock.addEventListener('message', (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type === 'status') status = msg;
    emit(msg);
  });
  sock.addEventListener('close', (e) => {
    if (ws !== sock) return;
    ws = null;
    // 4000: opened in another tab; 4003: token refused. Neither gets better by retrying.
    if (e.code === 4000 || e.code === 4003){ wantOpen = false; setLink('offline'); return; }
    setLink('offline');
    scheduleReconnect();
  });
}

function scheduleReconnect(){
  if (!wantOpen || reconnectAttempt >= RECONNECT_DELAYS_MS.length) return;
  setTimeout(() => { if (wantOpen) connect(); }, RECONNECT_DELAYS_MS[reconnectAttempt++]);
}

export function disconnect(){
  wantOpen = false;
  if (ws){ const s = ws; ws = null; s.close(1000); }
  setLink('offline');
}

function send(msg){
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

export const startSession = () => send({ type: 'start' });
export const endSession = () => send({ type: 'end' });
export const runFile = (path, code) => send({ type: 'run', path, code });
export const stopRun = () => send({ type: 'stop' });
export const resetWorld = () => send({ type: 'reset' });
