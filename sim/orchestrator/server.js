import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { readConfig, LIMITS } from './config.js';
import { verifySimToken } from './auth.js';
import { SessionManager } from './sessions.js';
import { connectGateway } from './gateway-link.js';
import { createDisabledDriver } from './drivers/disabled.js';
import { createFakeDriver } from './drivers/fake.js';
import { createDockerDriver } from './drivers/docker.js';

const HELLO_TIMEOUT_MS = 10_000;
const PING_MS = 15_000;
// A 64 KB program plus its JSON wrapping.
const MAX_FRAME_BYTES = 160 * 1024;

const log = (obj) => console.log(JSON.stringify({ t: new Date().toISOString(), ...obj }));

function makeDriver(cfg){
  if (cfg.driver === 'docker') return createDockerDriver({ ...cfg.docker, log });
  if (cfg.driver === 'fake') return createFakeDriver();
  return createDisabledDriver();
}

export async function startServer(cfg = readConfig()){
  const driver = makeDriver(cfg);
  const removed = await driver.cleanupOrphans().catch((e) => { log({ evt: 'sim_orphan_cleanup_failed', error: String(e.message || e) }); return 0; });
  if (removed) log({ evt: 'sim_orphans_removed', count: removed });

  const manager = new SessionManager({ driver, limits: LIMITS, connectGateway, log });

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/healthz'){
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...manager.stats(), available: driver.available().ok }));
      return;
    }
    res.writeHead(404); res.end();
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/session' || !cfg.allowedOrigins.includes(req.headers.origin)){
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws));
  });

  function onConnection(ws){
    let owner = null;
    let alive = true;
    const client = {
      send: (msg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); },
      close: () => ws.close(4000, 'replaced'),
    };
    const helloTimer = setTimeout(() => ws.close(4001, 'hello_timeout'), HELLO_TIMEOUT_MS);
    const ping = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, PING_MS);
    ws.on('pong', () => { alive = true; });

    // Messages are handled one at a time per socket, in order.
    let chain = Promise.resolve();
    ws.on('message', (data) => {
      chain = chain.then(() => onMessage(data)).catch((e) => log({ evt: 'sim_message_failed', error: String(e.message || e) }));
    });

    async function onMessage(data){
      let msg;
      try { msg = JSON.parse(data.toString('utf8')); } catch { return client.send({ type: 'error', code: 'bad_json' }); }
      if (!owner){
        if (msg.type !== 'hello') return ws.close(4001, 'hello_required');
        try {
          const who = await verifySimToken(msg.token, cfg.secret);
          owner = who.owner;
          clearTimeout(helloTimer);
          manager.attach(owner, client);
        } catch {
          ws.close(4003, 'bad_token');
        }
        return;
      }
      // start and run await a whole boot or program; stop/reset/end must not queue behind them.
      if (msg.type === 'run' || msg.type === 'start'){ manager.handle(owner, msg, client).catch(() => {}); return; }
      await manager.handle(owner, msg, client);
    }

    ws.on('close', () => {
      clearTimeout(helloTimer);
      clearInterval(ping);
      if (owner) manager.detach(owner, client);
    });
  }

  await new Promise((resolve) => server.listen(cfg.port, resolve));
  log({ evt: 'sim_orchestrator_listening', port: server.address().port, driver: driver.name });

  const shutdown = async () => {
    await manager.endAll('shutdown');
    server.close();
  };
  return { server, manager, shutdown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
  const { shutdown } = await startServer();
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => shutdown().then(() => process.exit(0)));
}
