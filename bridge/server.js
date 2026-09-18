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

const WS_PING_INTERVAL_MS = 10_000; // socket liveness only, no database
// api/_lib/limits.js ROBOT_ONLINE_CUTOFF_MS must stay above 2x this. Env override is for tests.
const PRESENCE_WRITE_INTERVAL_MS = Number(process.env.PRESENCE_WRITE_INTERVAL_MS) || 60_000;
// Minimum gaps before the next job.run, so event-driven dispatch is never tighter than the old 4s poll.
const POST_JOB_SETTLE_MS = 2_000;
const IDLE_STOP_SETTLE_MS = 4_000;
const DISPATCH_RETRY_MS = 5_000;
const METRICS_LOG_INTERVAL_MS = 10 * 60_000;
// A lost job-finished leaves the row 'running' and blocks the whole queue, so it is retried. Env override is for tests.
const FINISH_RETRY_BASE_MS = Number(process.env.FINISH_RETRY_BASE_MS) || 1_000;
const FINISH_RETRY_MAX_MS = 60_000;
const FINISH_RETRY_GIVE_UP_MS = 30 * 60_000;
// How long a dispatched job blocks idle.start: the 60s job timeout plus kill grace and build time.
const JOB_GUARD_MS = 90_000;

// API calls by action per window; counts only.
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
  if (!res.ok) throw Object.assign(new Error(`${path} -> ${res.status}`), { status: res.status });
  return res.json();
}

// A 4xx means the API understood and refused; retrying can't change that.
function isPermanentApiError(e){
  return !!(e && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429);
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

  // Last-hop guard: a delayed idle.start must never land on top of a dispatched job.
  if (body.action === 'start' && jobGuardActive(robotId)){
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, delivered: false, reason: 'job_running' }));
    return;
  }

  const ws = connectedRobots.get(robotId);
  const delivered = !!(ws && ws.readyState === ws.OPEN);
  if (delivered){
    ws.send(JSON.stringify({ t: body.action === 'start' ? 'idle.start' : 'idle.stop' }));
    if (body.action === 'start') idleStopped.delete(robotId);
    else {
      idleStopped.add(robotId);
      if (ws.dispatch) ws.dispatch.hold(IDLE_STOP_SETTLE_MS);
    }
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, delivered }));
}

// Robots this process has stopped idle on since last starting it; any other may be idling. Survives reconnects.
const idleStopped = new Set();
const runningJobs = new Map(); // robotId -> { jobId, since }

function jobGuardActive(robotId){
  const running = runningJobs.get(robotId);
  return !!running && Date.now() - running.since < JOB_GUARD_MS;
}

function clearRunningJob(robotId, jobId){
  const running = runningJobs.get(robotId);
  if (running && running.jobId === jobId) runningJobs.delete(robotId);
}

// Reports a job's end to the API, retrying until it lands; the dispatcher is nudged once it does.
async function finishJob(robotId, jobId, exitCode){
  const started = Date.now();
  for (let attempt = 0; ; attempt++){
    try {
      await callApi('/api/robot/agent', { action: 'job-finished', robotId, jobId, exitCode });
      if (attempt > 0) console.log(`job-finished for job ${jobId} landed after ${attempt} retries`);
      return true;
    } catch (e) {
      console.error(`job-finished failed for job ${jobId} (attempt ${attempt + 1}):`, e.message);
      if (isPermanentApiError(e)) return false;
      if (Date.now() - started > FINISH_RETRY_GIVE_UP_MS){
        console.error(`giving up on job-finished for job ${jobId}: reconcile it in the Admin app`);
        return false;
      }
      await new Promise((r) => setTimeout(r, Math.min(FINISH_RETRY_BASE_MS * 2 ** attempt, FINISH_RETRY_MAX_MS)));
    }
  }
}

// Runs off the message queue so a long retry never backs up the agent's other frames.
function reportJobEnd(robotId, jobId, exitCode){
  clearRunningJob(robotId, jobId);
  // Held from the job's real end: a notify can arrive while the report below is still in flight.
  const current = connectedRobots.get(robotId);
  if (current && current.dispatch) current.dispatch.hold(POST_JOB_SETTLE_MS);
  finishJob(robotId, jobId, exitCode).then(() => {
    const ws = connectedRobots.get(robotId);
    if (ws && ws.dispatch) ws.dispatch.request('job-finished');
  });
}

// Sent by api/robot/queue.js on approve/reconcile. Only triggers the normal claim.
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
const VIEWER_TTL_MS = 60_000; // must stay above the client's CONNECT_BUDGET_MS + FEED_DURATION_MS (25s + 30s)
// robotId -> Map(viewerId -> expiry ms epoch), oldest first; a stop only removes its own viewer.
const activeViewers = new Map();

function pruneViewers(robotId){
  const viewers = activeViewers.get(robotId);
  if (!viewers) return new Map();
  for (const [id, exp] of viewers) if (exp <= Date.now()) viewers.delete(id);
  if (!viewers.size) activeViewers.delete(robotId);
  return viewers;
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

  const viewerId = typeof body.viewerId === 'string' && body.viewerId ? body.viewerId.slice(0, 64) : null;
  const current = pruneViewers(robotId);
  const wasZero = current.size === 0;
  if (body.action === 'start'){
    const id = viewerId || crypto.randomUUID();
    current.delete(id); // a repeated start renews, and moves to the back
    current.set(id, Date.now() + VIEWER_TTL_MS);
    activeViewers.set(robotId, current);
  } else if (viewerId){
    current.delete(viewerId); // unknown id: that viewer's start never landed, nothing to undo
  } else if (current.size){
    current.delete(current.keys().next().value); // older API with no viewerId: drop the oldest
  }
  if (!current.size) activeViewers.delete(robotId);
  const nowZero = current.size === 0;

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

        pingTimer = setInterval(() => {
          if (!alive){ ws.terminate(); return; }
          alive = false;
          ws.ping();
        }, WS_PING_INTERVAL_MS);

        // `!== false`: an older API returns no hasApproved, and unknown must mean "check".
        presenceTimer = setInterval(() => {
          writePresence(robotId, { online: true, agentVersion })
            .then((result) => { if (result.hasApproved !== false) ws.dispatch.request('presence'); })
            .catch((e) => console.error('presence write failed:', e.message));
        }, PRESENCE_WRITE_INTERVAL_MS);

        ws.dispatch.request('connect');
      } catch (e) {
        console.error('agent auth failed:', e.message);
        ws.close(4001, 'auth_failed');
      }
      return;
    }

    if (msg.t.startsWith('job.')){
      if (!Number.isSafeInteger(msg.jobId)){ ws.close(4003, 'job_not_dispatched'); return; }
      // A job's end may arrive on a later connection; the API only finishes this robot's own running row.
      const lateEnd = msg.t === 'job.exit' || msg.t === 'job.error';
      if (!dispatchedJobIds.has(msg.jobId) && !lateEnd){ ws.close(4003, 'job_not_dispatched'); return; }
    }
    if (msg.t === 'job.accepted'){
      // Dispatch already claimed this job in the database before sending code.
      // Acceptance confirms the claim; it never starts an unclaimed job.
      await callApi('/api/robot/agent', { action: 'job-started', robotId, jobId: msg.jobId }).catch((e) => {
        // Only a refusal (the row is no longer running) cancels; an API blip must not kill a claimed job.
        if (!isPermanentApiError(e)){ console.error('job-started failed:', e.message); return; }
        console.error('job-started refused:', e.message, '— telling agent to cancel');
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
      reportJobEnd(robotId, msg.jobId, msg.exitCode);
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
      reportJobEnd(robotId, msg.jobId, 1);
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
      writePresence(robotId, { online: false }).catch((e) => {
        console.error('offline presence write failed:', e.message);
      });
    }
  });
});

// Presence writes per robot are applied in order, so a reconnect's "online" can't be overtaken by the old "offline".
const presenceTails = new Map();
function writePresence(robotId, fields){
  const previous = presenceTails.get(robotId) || Promise.resolve();
  const write = previous.then(() => callApi('/api/robot/agent', { action: 'heartbeat', robotId, ...fields }));
  const settled = write.catch(() => {});
  presenceTails.set(robotId, settled);
  settled.then(() => { if (presenceTails.get(robotId) === settled) presenceTails.delete(robotId); });
  return write;
}

// Decides when to ask the API for the next job (connect, notify, job-finished, presence).
// Asking too often is harmless; the claim itself is what's atomic.
function createDispatcher(ws, robotId, dispatchedJobIds){
  let inFlight = false;
  let again = false;
  let notBefore = 0;
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
      const open = () => !stopped && ws.readyState === ws.OPEN;
      for (const job of jobs){
        if (dispatchedJobIds.has(job.jobId)) continue;
        dispatchedJobIds.add(job.jobId);
        runningJobs.set(robotId, { jobId: job.jobId, since: Date.now() });
        // Never job.run unless this process itself stopped idle, whatever the API's relay delivered.
        if (open() && !idleStopped.has(robotId)){
          ws.send(JSON.stringify({ t: 'idle.stop' }));
          idleStopped.add(robotId);
          hold(IDLE_STOP_SETTLE_MS);
        }
        // A hold can start while the claim is in flight: keep the claim, delay the send.
        while (open() && notBefore > Date.now()){
          await new Promise((r) => setTimeout(r, notBefore - Date.now()));
        }
        if (!open()){
          // Claimed but never sent, so nothing moved: fail it rather than leave it blocking the queue.
          console.error(`job ${job.jobId} was claimed but robotId=${robotId} disconnected before delivery`);
          await callApi('/api/robot/agent', { action: 'job-output', robotId, jobId: job.jobId, text: '[bridge] The robot disconnected before this job could be delivered. Nothing ran — submit it again.\n' }).catch(() => {});
          reportJobEnd(robotId, job.jobId, 1);
          continue;
        }
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
      // One retry; after that the presence write picks it up.
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
