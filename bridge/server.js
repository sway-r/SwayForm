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
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function getApi(path){
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-bridge-secret': SERVICE_SECRET },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function readJsonBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (Buffer.byteLength(data) > 16 * 1024){ reject(new Error('body_too_large')); req.destroy(); }
    });
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
      const { payload } = await jwtVerify(token || '', JWT_SECRET_KEY, { algorithms: ['HS256'], requiredClaims: ['exp', 'iat'] });
      if (payload.purpose !== 'video-viewer' || payload.serial !== path) throw new Error('serial_mismatch');
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
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, { algorithms: ['HS256'], requiredClaims: ['exp', 'iat', 'jti'] });
    if (payload.purpose !== 'code-server' || !process.env.CODE_SERVER_ROBOT_ID || String(payload.robotId) !== process.env.CODE_SERVER_ROBOT_ID) throw new Error('wrong_purpose');

    pruneExpired(usedExchangeJtis);
    if (usedExchangeJtis.has(payload.jti)) throw new Error('token_already_used');
    usedExchangeJtis.set(payload.jti, (payload.exp || 0) * 1000);

    const sessionId = crypto.randomBytes(24).toString('hex');
    codeSessions.set(sessionId, { expiresAt: Date.now() + CODE_SESSION_TTL_MS });

    res.writeHead(302, {
      'set-cookie': `swayform_code_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${CODE_SESSION_TTL_MS / 1000}; Path=/`,
      location: '/',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
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
  if (req.method === 'GET' && new URL(req.url, 'http://internal').pathname === '/_exchange'){
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
const wss = new WebSocketServer({ server, path: '/agent', maxPayload: 128 * 1024 });
const connectedRobots = new Map();

wss.on('connection', (ws, req) => {
  console.log(`raw connection opened from ${req.socket.remoteAddress}:${req.socket.remotePort}`);
  let robotId = null;
  let agentVersion = null;
  let heartbeatTimer = null;
  let dispatchTimer = null;
  let alive = true;
  let messageTail = Promise.resolve();
  let pendingMessages = 0;
  const authTimer = setTimeout(() => ws.close(4001, 'auth_timeout'), 10_000);
  ws.on('error', (e) => console.error('agent socket error:', e.message));
  ws.on('pong', () => { alive = true; });
  // jobIds already sent as job.run this connection — avoids re-sending the
  // same approved job on every poll tick. Cleared on reconnect (a fresh
  // connection re-polls the dispatch-queue action fresh, which is also how a job
  // approved while the agent was briefly offline still gets delivered).
  const dispatchedJobIds = new Set();

  ws.on('message', (raw) => {
    if (++pendingMessages > 32){ ws.close(1008, 'message_backlog'); return; }
    messageTail = messageTail.then(async () => {
    if (ws.readyState !== ws.OPEN) return;
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.t !== 'string') return;
    if (!robotId && msg.t !== 'hello'){ ws.close(4001, 'authenticate_first'); return; }
    if (msg.t === 'hello'){
      if (robotId){ ws.close(4001, 'already_authenticated'); return; }
      try {
        const auth = await callApi('/api/robot/agent', { action: 'auth', token: msg.token, serial: msg.serial });
        if (ws.readyState !== ws.OPEN) return;
        if (connectedRobots.has(auth.robotId)){ ws.close(4009, 'robot_already_connected'); return; }
        robotId = auth.robotId;
        connectedRobots.set(robotId, ws);
        clearTimeout(authTimer);
        agentVersion = msg.agentVersion || null;

        await callApi('/api/robot/agent', { action: 'heartbeat', robotId, online: true, agentVersion });
        if (ws.readyState !== ws.OPEN) return;
        ws.send(JSON.stringify({ t: 'hello.ok', robotId, heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS }));
        console.log(`agent connected: serial=${msg.serial} robotId=${robotId} agentVersion=${agentVersion}`);

        heartbeatTimer = setInterval(() => {
          if (!alive){ ws.terminate(); return; }
          alive = false;
          ws.ping();
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

    if (msg.t.startsWith('job.') && (!Number.isSafeInteger(msg.jobId) || !dispatchedJobIds.has(msg.jobId))){
      ws.close(4003, 'job_not_dispatched'); return;
    }
    if (msg.t === 'job.accepted'){
      // Dispatch already claimed this job in the database before sending code.
      // Acceptance confirms the claim; it never starts an unclaimed job.
      await callApi('/api/robot/agent', { action: 'job-started', robotId, jobId: msg.jobId }).catch((e) => {
        console.error('job-started failed:', e.message, '— telling agent to cancel');
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: 'job.cancel', robotId, jobId: msg.jobId }));
      });
      return;
    }

    if (msg.t === 'job.output'){
      await callApi('/api/robot/agent', { action: 'job-output', robotId, jobId: msg.jobId, text: msg.text || '' }).catch((e) => {
        console.error('job-output failed:', e.message);
      });
      return;
    }

    if (msg.t === 'job.exit'){
      await callApi('/api/robot/agent', { action: 'job-finished', robotId, jobId: msg.jobId, exitCode: msg.exitCode }).catch((e) => {
        console.error('job-finished failed:', e.message);
      });
      return;
    }

    if (msg.t === 'job.error'){
      console.error(`agent reported job.error for job ${msg.jobId}: ${msg.code} — ${msg.message}`);
      await callApi('/api/robot/agent', { action: 'job-finished', robotId, jobId: msg.jobId, exitCode: 1 }).catch((e) => {
        console.error('job-finished(error) failed:', e.message);
      });
      return;
    }

    // Ping/pong detects dead sockets independently of agent application frames.
    }).catch((e) => { console.error('agent message failed:', e.message); ws.close(1011, 'message_failed'); })
      .finally(() => { pendingMessages--; });
  });

  ws.on('close', (code, reason) => {
    console.log(`connection closed (robotId=${robotId}) code=${code} reason=${reason}`);
    clearTimeout(authTimer);
    if (connectedRobots.get(robotId) === ws) connectedRobots.delete(robotId);
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
  if (ws.readyState !== ws.OPEN || ws.dispatchPending) return;
  ws.dispatchPending = true;
  try {
    const { jobs } = await getApi(`/api/robot/agent?action=dispatch-queue&robotId=${robotId}`);
    if (ws.readyState !== ws.OPEN) return;
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
  } finally { ws.dispatchPending = false; }
}

server.listen(PORT, () => console.log(`swayform-bridge listening on :${PORT}`));
