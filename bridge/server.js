import './load-env.js';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 9000;
const API_BASE = process.env.VERCEL_API_BASE;
const SERVICE_SECRET = process.env.BRIDGE_SERVICE_SECRET;
if (!API_BASE) throw new Error('VERCEL_API_BASE is not set');
if (!SERVICE_SECRET) throw new Error('BRIDGE_SERVICE_SECRET is not set');

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

const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/agent' });

wss.on('connection', (ws) => {
  let robotId = null;
  let agentVersion = null;
  let heartbeatTimer = null;
  let dispatchTimer = null;
  // jobIds already sent as job.run this connection — avoids re-sending the
  // same approved job on every poll tick. Cleared on reconnect (a fresh
  // connection re-polls dispatch-queue.js fresh, which is also how a job
  // approved while the agent was briefly offline still gets delivered).
  const dispatchedJobIds = new Set();

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    if (msg.t === 'hello'){
      try {
        const auth = await callApi('/api/robot/agent-auth', { token: msg.token, serial: msg.serial });
        robotId = auth.robotId;
        agentVersion = msg.agentVersion || null;

        await callApi('/api/robot/heartbeat', { robotId, online: true, agentVersion });
        ws.send(JSON.stringify({ t: 'hello.ok', robotId, heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS }));

        heartbeatTimer = setInterval(() => {
          callApi('/api/robot/heartbeat', { robotId, online: true, agentVersion }).catch((e) => {
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
      callApi('/api/robot/job-update', { jobId: msg.jobId, phase: 'started' }).catch((e) => {
        console.error('job-update(started) failed:', e.message);
      });
      return;
    }

    if (msg.t === 'job.output'){
      callApi('/api/robot/job-update', { jobId: msg.jobId, phase: 'output', text: msg.text || '' }).catch((e) => {
        console.error('job-update(output) failed:', e.message);
      });
      return;
    }

    if (msg.t === 'job.exit'){
      callApi('/api/robot/job-update', { jobId: msg.jobId, phase: 'finished', exitCode: msg.exitCode }).catch((e) => {
        console.error('job-update(finished) failed:', e.message);
      });
      return;
    }

    if (msg.t === 'job.error'){
      console.error(`agent reported job.error for job ${msg.jobId}: ${msg.code} — ${msg.message}`);
      callApi('/api/robot/job-update', { jobId: msg.jobId, phase: 'finished', exitCode: 1 }).catch((e) => {
        console.error('job-update(finished/error) failed:', e.message);
      });
      return;
    }

    // The agent's own periodic 'heartbeat' frames are a no-op here — the
    // interval above already keeps is_online fresh from the bridge's side.
  });

  ws.on('close', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (dispatchTimer) clearInterval(dispatchTimer);
    if (robotId){
      callApi('/api/robot/heartbeat', { robotId, online: false }).catch((e) => {
        console.error('offline heartbeat write failed:', e.message);
      });
    }
  });
});

async function pollDispatchQueue(ws, robotId, dispatchedJobIds){
  if (ws.readyState !== ws.OPEN) return;
  try {
    const { jobs } = await getApi(`/api/robot/dispatch-queue?robotId=${robotId}`);
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
