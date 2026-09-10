import './load-env.js';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 9000;
const API_BASE = process.env.VERCEL_API_BASE;
const SERVICE_SECRET = process.env.BRIDGE_SERVICE_SECRET;
if (!API_BASE) throw new Error('VERCEL_API_BASE is not set');
if (!SERVICE_SECRET) throw new Error('BRIDGE_SERVICE_SECRET is not set');

const HEARTBEAT_INTERVAL_MS = 10_000;

async function callApi(path, body){
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bridge-secret': SERVICE_SECRET },
    body: JSON.stringify(body),
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
      } catch (e) {
        console.error('agent auth failed:', e.message);
        ws.close(4001, 'auth_failed');
      }
      return;
    }

    // Phase 2+ frames (job.output, video signaling, etc.) get handled here
    // once those pieces exist. For now the agent's own heartbeat frames are
    // a no-op — the interval above already keeps is_online fresh.
  });

  ws.on('close', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (robotId){
      callApi('/api/robot/heartbeat', { robotId, online: false }).catch((e) => {
        console.error('offline heartbeat write failed:', e.message);
      });
    }
  });
});

server.listen(PORT, () => console.log(`swayform-bridge listening on :${PORT}`));
