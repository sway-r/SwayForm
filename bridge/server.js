import './load-env.js';
import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { jwtVerify } from 'jose';

const PORT = process.env.PORT || 9000;
const API_BASE = process.env.VERCEL_API_BASE;
const SERVICE_SECRET = process.env.BRIDGE_SERVICE_SECRET;
if (!API_BASE) throw new Error('VERCEL_API_BASE is not set');
if (!SERVICE_SECRET) throw new Error('BRIDGE_SERVICE_SECRET is not set');
const JWT_SECRET_KEY = new TextEncoder().encode(SERVICE_SECRET);

const HEARTBEAT_INTERVAL_MS = 10_000;
const DISPATCH_POLL_INTERVAL_MS = 4_000;

async function callApi(path, body){
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bridge-secret': SERVICE_SECRET },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function getApi(path){
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-bridge-secret': SERVICE_SECRET },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function readJsonBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// MediaMTX's authHTTPAddress webhook. A WHIP/WHEP client's Authorization:
// Bearer header arrives here as `token`; `path` is the MediaMTX path name,
// which we use as the robot serial. Publish reuses the same token the Pi
// agent already authenticates its WebSocket connection with — no new
// Pi-side credential. Read uses a short-lived viewer JWT minted by
// api/robot/status.js, verified locally (no Vercel round-trip per viewer).
async function handleMediamtxAuth(req, res){
  let body;
  try { body = await readJsonBody(req); }
  catch { res.writeHead(400); res.end(); return; }

  const { action, path, token } = body || {};

  if (action === 'publish'){
    try {
      await callApi('/api/robot/agent', { action: 'auth', token, serial: path });
      res.writeHead(200); res.end();
    } catch (e) {
      console.error('mediamtx publish auth failed:', e.message);
      res.writeHead(401); res.end();
    }
    return;
  }

  if (action === 'read'){
    try {
      const { payload } = await jwtVerify(token || '', JWT_SECRET_KEY);
      if (payload.serial !== path) throw new Error('serial_mismatch');
      res.writeHead(200); res.end();
    } catch (e) {
      console.error('mediamtx read auth failed:', e.message);
      res.writeHead(401); res.end();
    }
    return;
  }

  // Deny by default — nothing else (api/metrics/pprof/playback) is needed here.
  res.writeHead(401); res.end();
}

// ── code-server access: single-use JWT (minted by api/admin.js, admin-only)
// exchanged here for a 30-min httpOnly cookie on code.bridge.swayform.net.
// Two small in-memory maps — fine at this scale, this process already
// tracks per-connection state the same way (see dispatchedJobIds below).
const CODE_SESSION_TTL_MS = 30 * 60 * 1000;
const usedExchangeJtis = new Map(); // jti -> expiryMs, so a stolen/replayed link can't be reused
const codeSessions = new Map(); // opaque session id -> { expiresAt }

function pruneExpired(map){
  const now = Date.now();
  for (const [key, val] of map){
    const exp = typeof val === 'number' ? val : val.expiresAt;
    if (exp < now) map.delete(key);
  }
}

function parseCookies(req){
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')){
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

async function handleCodeExchange(req, res){
  const url = new URL(req.url, 'http://internal');
  const token = url.searchParams.get('token') || '';

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    if (payload.purpose !== 'code-server') throw new Error('wrong_purpose');

    pruneExpired(usedExchangeJtis);
    if (usedExchangeJtis.has(payload.jti)) throw new Error('token_already_used');
    usedExchangeJtis.set(payload.jti, (payload.exp || 0) * 1000);

    const sessionId = crypto.randomBytes(24).toString('hex');
    codeSessions.set(sessionId, { expiresAt: Date.now() + CODE_SESSION_TTL_MS });

    res.writeHead(302, {
      'set-cookie': `swayform_code_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${CODE_SESSION_TTL_MS / 1000}; Path=/`,
      location: '/',
    });
    res.end();
  } catch (e) {
    console.error('code-server exchange failed:', e.message);
    res.writeHead(401, { 'content-type': 'text/plain' });
    res.end('invalid or expired link');
  }
}

function handleCodeAuthCheck(req, res){
  pruneExpired(codeSessions);
  const sessionId = parseCookies(req).swayform_code_session;
  const session = sessionId && codeSessions.get(sessionId);
  res.writeHead(session ? 200 : 401);
  res.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/mediamtx-auth'){
    handleMediamtxAuth(req, res);
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/_exchange')){
    handleCodeExchange(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/code-auth-check'){
    handleCodeAuthCheck(req, res);
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('swayform-bridge ok');
});
const wss = new WebSocketServer({ server, path: '/agent' });

wss.on('connection', (ws, req) => {
  console.log(`raw connection opened from ${req.socket.remoteAddress}:${req.socket.remotePort}`);
  let robotId = null;
  let agentVersion = null;
  let heartbeatTimer = null;
  let dispatchTimer = null;
  // jobIds already sent as job.run this connection — avoids re-sending the
  // same approved job on every poll tick. Cleared on reconnect (a fresh
  // connection re-polls the dispatch-queue action fresh, which is also how a job
  // approved while the agent was briefly offline still gets delivered).
  const dispatchedJobIds = new Set();

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    if (msg.t === 'hello'){
      try {
        const auth = await callApi('/api/robot/agent', { action: 'auth', token: msg.token, serial: msg.serial });
        robotId = auth.robotId;
        agentVersion = msg.agentVersion || null;

        await callApi('/api/robot/agent', { action: 'heartbeat', robotId, online: true, agentVersion });
        ws.send(JSON.stringify({ t: 'hello.ok', robotId, heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS }));
        console.log(`agent connected: serial=${msg.serial} robotId=${robotId} agentVersion=${agentVersion}`);

        heartbeatTimer = setInterval(() => {
          callApi('/api/robot/agent', { action: 'heartbeat', robotId, online: true, agentVersion }).catch((e) => {
            console.error('heartbeat write failed:', e.message);
          });
        }, HEARTBEAT_INTERVAL_MS);

        dispatchTimer = setInterval(() => pollDispatchQueue(ws, robotId, dispatchedJobIds), DISPATCH_POLL_INTERVAL_MS);
        pollDispatchQueue(ws, robotId, dispatchedJobIds);
      } catch (e) {
        console.error('agent auth failed:', e.message);
        ws.close(4001, 'auth_failed');
      }
      return;
    }

    if (msg.t === 'job.accepted'){
      // If this fails (e.g. the DB's one-job-at-a-time constraint conflicts
      // with a stale 'running' row — see docs/robot-connectivity.md), the
      // agent has typically already started running the job locally
      // (job.accepted is sent before the bridge round-trip completes) — its
      // eventual job.output/job.exit would then silently no-op forever,
      // since those UPDATEs only match rows already in 'running'. Telling
      // the agent to cancel is a best-effort mitigation, not a full fix —
      // a real fix means the agent waiting for bridge confirmation before
      // it runs anything, which is a Pi-side change, not made here.
      callApi('/api/robot/agent', { action: 'job-started', jobId: msg.jobId }).catch((e) => {
        console.error('job-started failed:', e.message, '— telling agent to cancel');
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: 'job.cancel', jobId: msg.jobId }));
      });
      return;
    }

    if (msg.t === 'job.output'){
      callApi('/api/robot/agent', { action: 'job-output', jobId: msg.jobId, text: msg.text || '' }).catch((e) => {
        console.error('job-output failed:', e.message);
      });
      return;
    }

    if (msg.t === 'job.exit'){
      callApi('/api/robot/agent', { action: 'job-finished', jobId: msg.jobId, exitCode: msg.exitCode }).catch((e) => {
        console.error('job-finished failed:', e.message);
      });
      return;
    }

    if (msg.t === 'job.error'){
      console.error(`agent reported job.error for job ${msg.jobId}: ${msg.code} — ${msg.message}`);
      callApi('/api/robot/agent', { action: 'job-finished', jobId: msg.jobId, exitCode: 1 }).catch((e) => {
        console.error('job-finished(error) failed:', e.message);
      });
      return;
    }

    // The agent's own periodic 'heartbeat' frames are a no-op here — the
    // interval above already keeps is_online fresh from the bridge's side.
  });

  ws.on('close', (code, reason) => {
    console.log(`connection closed (robotId=${robotId}) code=${code} reason=${reason}`);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (dispatchTimer) clearInterval(dispatchTimer);
    if (robotId){
      callApi('/api/robot/agent', { action: 'heartbeat', robotId, online: false }).catch((e) => {
        console.error('offline heartbeat write failed:', e.message);
      });
    }
  });
});

async function pollDispatchQueue(ws, robotId, dispatchedJobIds){
  if (ws.readyState !== ws.OPEN) return;
  try {
    const { jobs } = await getApi(`/api/robot/agent?action=dispatch-queue&robotId=${robotId}`);
    for (const job of jobs){
      if (dispatchedJobIds.has(job.jobId)) continue;
      dispatchedJobIds.add(job.jobId);
      ws.send(JSON.stringify({
        t: 'job.run',
        jobId: job.jobId,
        package: job.package,
        executable: job.executable,
        path: job.path,
        code: job.code,
        sha256: job.sha256,
        timeoutMs: 60_000,
      }));
    }
  } catch (e) {
    console.error('dispatch-queue poll failed:', e.message);
  }
}

server.listen(PORT, () => console.log(`swayform-bridge listening on :${PORT}`));
