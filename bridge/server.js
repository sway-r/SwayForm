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

// Two different clocks that used to be one. The WebSocket ping is local
// liveness (is this socket dead?) and costs nothing; the presence write is a
// database UPDATE through Vercel into Neon. Tying them together meant 8,640
// database writes per robot per day to say "still here".
const WS_PING_INTERVAL_MS = 10_000;
// Presence is also written on connect and on disconnect, so this only bounds
// how stale last_seen_at gets while connected. api/_lib/limits.js's
// ROBOT_ONLINE_CUTOFF_MS must stay above 2x this. (Env override is for tests.)
const PRESENCE_WRITE_INTERVAL_MS = Number(process.env.PRESENCE_WRITE_INTERVAL_MS) || 60_000;
// Dispatch is event-driven now (see requestDispatch). These two holds keep
// the physical pacing at least as relaxed as the old 4s poll produced, rather
// than letting "instant" become the norm on real hardware: a job never
// starts sooner than this after the previous job's exit, or after an idle
// session was told to stop (the agent escalates SIGINT to SIGKILL at 3s).
const POST_JOB_SETTLE_MS = 2_000;
const IDLE_STOP_SETTLE_MS = 4_000;
const DISPATCH_RETRY_MS = 5_000;
const METRICS_LOG_INTERVAL_MS = 10 * 60_000;

// How many calls this process made into the API (each is at least one Neon
// query), by action, per 10 minutes. This is the number to watch after a
// deploy: an idle connected robot should show ~10 heartbeats and ~0
// dispatch-queue calls per window. Counts only — never tokens or payloads.
const apiCallCounts = new Map();
function countApiCall(name){ apiCallCounts.set(name, (apiCallCounts.get(name) || 0) + 1); }

async function callApi(path, body){
  countApiCall(body && body.action ? body.action : path);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bridge-secret': SERVICE_SECRET },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function getApi(path, name){
  countApiCall(name);
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

// Admin-triggered stop request, called by api/robot/queue.js (the only
// direction that runs api/ -> bridge instead of bridge -> api/, so it's
// gated the same way as every other machine-to-machine call: a shared
// secret header, checked here since this route is reachable over the
// public internet, not just from localhost like /mediamtx-auth.
//
// This delivers a job.stop frame to whichever agent is currently connected
// for that robotId — it does NOT touch the database (the run-queue's
// physical-execution-lock principle: a browser action can request a stop,
// but only the agent's own eventual job.exit/job.error, reporting what
// actually happened on the hardware, may change a running row's status).
// Delivery only confirms the message reached a connected agent — whether
// the agent acts on it depends on that agent's own implementation of the
// job.stop frame (see docs/robot-connectivity.md).
/** Constant-time secret comparison — hashing first means both sides compare
 *  as fixed-size buffers, avoiding both a length-based timingSafeEqual throw
 *  and any timing signal a plain `===` on the raw secret would leak. */
function secureEqual(a, b){
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

async function handleAdminStop(req, res){
  const provided = req.headers['x-bridge-secret'];
  if (typeof provided !== 'string' || !secureEqual(provided, SERVICE_SECRET)){ res.writeHead(401); res.end(); return; }
  let body;
  try { body = await readJsonBody(req); }
  catch { res.writeHead(400); res.end(); return; }

  const robotId = Number(body.robotId);
  const jobId = Number(body.jobId);
  if (!Number.isSafeInteger(robotId) || !Number.isSafeInteger(jobId)){
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_fields' }));
    return;
  }

  const ws = connectedRobots.get(robotId);
  const delivered = !!(ws && ws.readyState === ws.OPEN);
  if (delivered) ws.send(JSON.stringify({ t: 'job.stop', jobId }));

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, delivered }));
}

// Admin's "Live Robot Session" toggle, mirroring /admin-stop's shape: api/
// calls this (server-to-server, secret-gated) when an admin flips the idle
// switch on the Robot tab, or when api/robot/queue.js's approve action turns
// it off to make way for a real job. Unlike /video-request, no refcounting —
// this is a single admin-controlled on/off per robot, not a multi-viewer
// concern. See docs/robot-connectivity.md for the idle.start/idle.stop wire
// protocol entries.
async function handleIdleRequest(req, res){
  const provided = req.headers['x-bridge-secret'];
  if (typeof provided !== 'string' || !secureEqual(provided, SERVICE_SECRET)){ res.writeHead(401); res.end(); return; }
  let body;
  try { body = await readJsonBody(req); }
  catch { res.writeHead(400); res.end(); return; }

  const robotId = Number(body.robotId);
  if (!Number.isSafeInteger(robotId) || (body.action !== 'start' && body.action !== 'stop')){
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_fields' }));
    return;
  }

  const ws = connectedRobots.get(robotId);
  const delivered = !!(ws && ws.readyState === ws.OPEN);
  if (delivered){
    ws.send(JSON.stringify({ t: body.action === 'start' ? 'idle.start' : 'idle.stop' }));
    // Approving a job stops idle and then notifies dispatch back to back.
    // Give the idle process time to actually exit before a job.run follows.
    if (body.action === 'stop' && ws.dispatch) ws.dispatch.hold(IDLE_STOP_SETTLE_MS);
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, delivered }));
}

// "This robot's dispatch queue may have work" — sent by api/robot/queue.js
// when an admin approves a job (or reconciles a stuck one), replacing the
// fixed 4s poll that asked Neon the same question 21,600 times a day per
// robot. It names a robot and nothing else: no job id, no code. All it can do
// is make this process run the same atomic claim (api/robot/agent.js's
// dispatch-queue) slightly sooner, so a replayed or forged notification can
// never dispatch anything that a poll wouldn't have dispatched anyway.
async function handleDispatchNotify(req, res){
  const provided = req.headers['x-bridge-secret'];
  if (typeof provided !== 'string' || !secureEqual(provided, SERVICE_SECRET)){ res.writeHead(401); res.end(); return; }
  let body;
  try { body = await readJsonBody(req); }
  catch { res.writeHead(400); res.end(); return; }

  const robotId = Number(body.robotId);
  if (!Number.isSafeInteger(robotId)){
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_fields' }));
    return;
  }

  const ws = connectedRobots.get(robotId);
  const delivered = !!(ws && ws.readyState === ws.OPEN && ws.dispatch);
  if (delivered) ws.dispatch.request('notify');

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, delivered }));
}

// On-demand live video, mirroring /admin-stop's shape: api/ calls this
// (server-to-server, secret-gated) when a browser viewer opens/closes the
// "Show feed" panel, instead of the Pi encoding around the clock. Refcounted
// per robot so one viewer closing early doesn't cut the feed for another
// still watching — the agent only gets a real video.stop once the count
// drops back to zero. See docs/robot-connectivity.md for the video.start/
// video.stop frames themselves; the real agent doesn't handle them yet,
// same NOT YET HANDLED status job.stop shipped with.
//
// Each "viewer" is an expiry timestamp, not a bare count: a 'stop' can be
// lost (tab crash, network drop, notifyBridgeStop's best-effort fetch never
// landing) with nothing upstream ever retrying it, which would otherwise
// wedge the count above zero forever — silently skipping every future
// video.start on this process until it's restarted (see the incident this
// was found from, in project_video_on_demand memory). Pruning expired
// entries before every read bounds that wedge to VIEWER_TTL_MS instead.
const VIEWER_TTL_MS = 60_000; // generous margin over the client's 30s FEED_DURATION_MS plus WHEP connect/retry time
const activeViewers = new Map(); // robotId -> expiry timestamps (ms epoch), oldest first

function pruneViewers(robotId){
  const list = activeViewers.get(robotId);
  if (!list) return [];
  const kept = list.filter((exp) => exp > Date.now());
  if (kept.length) activeViewers.set(robotId, kept); else activeViewers.delete(robotId);
  return kept;
}

async function handleVideoRequest(req, res){
  const provided = req.headers['x-bridge-secret'];
  if (typeof provided !== 'string' || !secureEqual(provided, SERVICE_SECRET)){ res.writeHead(401); res.end(); return; }
  let body;
  try { body = await readJsonBody(req); }
  catch { res.writeHead(400); res.end(); return; }

  const robotId = Number(body.robotId);
  if (!Number.isSafeInteger(robotId) || (body.action !== 'start' && body.action !== 'stop')){
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_fields' }));
    return;
  }

  const current = pruneViewers(robotId);
  const wasZero = current.length === 0;
  if (body.action === 'start'){
    current.push(Date.now() + VIEWER_TTL_MS);
    activeViewers.set(robotId, current);
  } else if (current.length){
    current.shift();
    if (current.length) activeViewers.set(robotId, current); else activeViewers.delete(robotId);
  }
  const nowZero = !activeViewers.get(robotId)?.length;

  const ws = connectedRobots.get(robotId);
  let delivered = false;
  if (ws && ws.readyState === ws.OPEN){
    if (body.action === 'start' && wasZero){
      ws.send(JSON.stringify({ t: 'video.start' }));
      delivered = true;
    } else if (body.action === 'stop' && !wasZero && nowZero){
      ws.send(JSON.stringify({ t: 'video.stop' }));
      delivered = true;
    } else {
      delivered = true; // already in the requested state — no frame needed
    }
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, delivered }));
}

const connectedRobots = new Map();

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
  if (req.method === 'POST' && req.url === '/admin-stop'){
    handleAdminStop(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/idle-request'){
    handleIdleRequest(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/video-request'){
    handleVideoRequest(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/dispatch-notify'){
    handleDispatchNotify(req, res);
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('swayform-bridge ok');
});
// noServer + a manual 'upgrade' handler, rather than { server, path: '/agent' }
// -- the ws library's own path-matching rejects any non-matching upgrade
// with a bare abortHandshake(socket, 400), and Caddy's forward_auth (gating
// code.bridge.swayform.net) sends its /code-auth-check subrequest carrying
// the real client's Connection/Upgrade headers straight through. That 400
// was never reaching a browser directly -- forward_auth treated it as "auth
// denied" and relayed it to whoever was opening the code-server websocket,
// breaking every Live Code Editor connection with a generic "WebSocket
// close 1006" while the plain (non-upgrade) auth checks for the page itself
// kept working fine. See project_video_on_demand memory for the sibling
// incident this was found alongside.
const wss = new WebSocketServer({ noServer: true, maxPayload: 128 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://internal');
  if (pathname === '/agent'){
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    return;
  }
  if (pathname === '/code-auth-check'){
    pruneExpired(codeSessions);
    const sessionId = parseCookies(req).swayform_code_session;
    const ok = !!(sessionId && codeSessions.get(sessionId));
    socket.write(`HTTP/1.1 ${ok ? '200 OK' : '401 Unauthorized'}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    socket.destroy();
    return;
  }
  socket.destroy();
});

wss.on('connection', (ws, req) => {
  console.log(`raw connection opened from ${req.socket.remoteAddress}:${req.socket.remotePort}`);
  let robotId = null;
  let agentVersion = null;
  let pingTimer = null;
  let presenceTimer = null;
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

        await writePresence(robotId, { online: true, agentVersion });
        if (ws.readyState !== ws.OPEN) return;
        ws.send(JSON.stringify({ t: 'hello.ok', robotId, heartbeatIntervalMs: WS_PING_INTERVAL_MS }));
        console.log(`agent connected: serial=${msg.serial} robotId=${robotId} agentVersion=${agentVersion}`);

        ws.dispatch = createDispatcher(ws, robotId, dispatchedJobIds);

        // Socket liveness: local, every 10s, no database involved.
        pingTimer = setInterval(() => {
          if (!alive){ ws.terminate(); return; }
          alive = false;
          ws.ping();
        }, WS_PING_INTERVAL_MS);

        // Database presence: once a minute. Its response also says whether
        // an approved job is waiting, which is the safety net for a dispatch
        // notification that never arrived (bridge restart, network blip).
        // `!== false` on purpose: an API that predates hasApproved returns
        // no such field, and "unknown" must mean "go check", not "no work".
        presenceTimer = setInterval(() => {
          writePresence(robotId, { online: true, agentVersion })
            .then((result) => { if (result.hasApproved !== false) ws.dispatch.request('presence'); })
            .catch((e) => console.error('presence write failed:', e.message));
        }, PRESENCE_WRITE_INTERVAL_MS);

        // A job approved while the agent was offline is picked up here.
        ws.dispatch.request('connect');
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
      // The execution lock just released — the next approved job, if any,
      // can go. Nothing else would announce that; no admin action happens
      // between two already-approved jobs.
      ws.dispatch.hold(POST_JOB_SETTLE_MS);
      ws.dispatch.request('job-finished');
      return;
    }

    if (msg.t === 'job.error'){
      console.error(`agent reported job.error for job ${msg.jobId}: ${msg.code} — ${msg.message}`);
      // Surface the agent's reason through the same job-output pipe a normal
      // run's stdout uses — otherwise a rejection (bad hash, joint-limit
      // violation, anything) reaches the student/admin as a bare "Exit code:
      // 1" with no explanation at all.
      const line = `[agent error] ${msg.code || 'error'}: ${msg.message || 'unknown error'}\n`;
      await callApi('/api/robot/agent', { action: 'job-output', robotId, jobId: msg.jobId, text: line }).catch((e) => {
        console.error('job-output(error) failed:', e.message);
      });
      await callApi('/api/robot/agent', { action: 'job-finished', robotId, jobId: msg.jobId, exitCode: 1 }).catch((e) => {
        console.error('job-finished(error) failed:', e.message);
      });
      ws.dispatch.hold(POST_JOB_SETTLE_MS);
      ws.dispatch.request('job-finished');
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
    activeViewers.delete(robotId);
    if (pingTimer) clearInterval(pingTimer);
    if (presenceTimer) clearInterval(presenceTimer);
    if (ws.dispatch) ws.dispatch.stop();
    if (robotId){
      // Written immediately, so a normal disconnect shows as offline right
      // away — the longer online cutoff only matters if this process dies.
      writePresence(robotId, { online: false }).catch((e) => {
        console.error('offline presence write failed:', e.message);
      });
    }
  });
});

// Presence writes for one robot are applied in the order they were issued.
// With a write every 10s, an "offline" landing after the "online" of a quick
// reconnect corrected itself within seconds; at once a minute it would leave
// a connected robot showing offline for up to a minute.
const presenceTails = new Map(); // robotId -> the last queued write, settled
function writePresence(robotId, fields){
  const previous = presenceTails.get(robotId) || Promise.resolve();
  const write = previous.then(() => callApi('/api/robot/agent', { action: 'heartbeat', robotId, ...fields }));
  const settled = write.catch(() => {});
  presenceTails.set(robotId, settled);
  settled.then(() => { if (presenceTails.get(robotId) === settled) presenceTails.delete(robotId); });
  return write;
}

/**
 * Per-connection dispatch trigger. Asking the API to claim the next approved
 * job used to happen on a 4s timer forever; now it happens when something
 * suggests there may be one:
 *   connect       — a job may have been approved while the agent was away
 *   notify        — an admin just approved (or reconciled) a job
 *   job-finished  — the execution lock just released
 *   presence      — the once-a-minute presence write saw an approved job
 *                   (the fallback for a notification that never arrived)
 *
 * Every safety property still lives where it always did, in the claim
 * itself (one 'running' job per robot, claimed atomically before any code is
 * sent, never re-sent). This only decides WHEN to ask, and asking too often
 * or twice is harmless — which is why triggers are allowed to be lossy.
 */
function createDispatcher(ws, robotId, dispatchedJobIds){
  let inFlight = false;
  let again = false;      // a trigger arrived mid-request: ask once more after it
  let notBefore = 0;      // earliest time the next job.run may be sent (see hold)
  let timer = null;
  let retried = false;
  let stopped = false;

  function request(reason){
    if (stopped || ws.readyState !== ws.OPEN) return;
    if (inFlight){ again = true; return; }
    const wait = notBefore - Date.now();
    if (wait > 0){
      if (!timer) timer = setTimeout(() => { timer = null; request(reason); }, wait);
      return;
    }
    run(reason);
  }

  async function run(reason){
    inFlight = true;
    let failed = false;
    try {
      const { jobs } = await getApi(`/api/robot/agent?action=dispatch-queue&robotId=${robotId}`, 'dispatch-queue');
      retried = false;
      if (stopped || ws.readyState !== ws.OPEN) return;
      for (const job of jobs){
        // Belt and braces: the API can't return an already-running job, and
        // this makes sure that even if it somehow did, this connection would
        // not send the same job's code to the robot twice.
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
        console.log(`dispatched job ${job.jobId} to robotId=${robotId} (trigger: ${reason})`);
      }
    } catch (e) {
      failed = true;
      console.error(`dispatch-queue request failed (trigger: ${reason}):`, e.message);
    } finally {
      inFlight = false;
    }
    if (again){ again = false; request('coalesced'); }
    else if (failed && !retried){
      // One prompt retry for a transient failure; after that the presence
      // write picks it up, so a down API isn't hammered.
      retried = true;
      hold(DISPATCH_RETRY_MS);
      request('retry');
    }
  }

  function hold(ms){ notBefore = Math.max(notBefore, Date.now() + ms); }

  function stop(){
    stopped = true;
    if (timer){ clearTimeout(timer); timer = null; }
  }

  return { request, hold, stop };
}

setInterval(() => {
  console.log(JSON.stringify({
    evt: 'bridge_api_calls',
    windowSec: METRICS_LOG_INTERVAL_MS / 1000,
    connectedRobots: connectedRobots.size,
    calls: Object.fromEntries(apiCallCounts),
  }));
  apiCallCounts.clear();
}, METRICS_LOG_INTERVAL_MS).unref();

server.listen(PORT, () => console.log(`swayform-bridge listening on :${PORT}`));
