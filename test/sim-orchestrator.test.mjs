import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import WebSocket from '../bridge/node_modules/ws/wrapper.mjs';
import { SessionManager } from '../sim/orchestrator/sessions.js';
import { createFakeDriver } from '../sim/orchestrator/drivers/fake.js';
import { createDisabledDriver } from '../sim/orchestrator/drivers/disabled.js';
import { networkSpecs, simContainerSpec, runnerContainerSpec, runnerEnv, entryName } from '../sim/orchestrator/drivers/docker-specs.js';
import { demux } from '../sim/orchestrator/drivers/docker.js';
import { verifySimToken } from '../sim/orchestrator/auth.js';
import { mintSimToken, simOrchestratorUrl } from '../api/_lib/sim.js';

const SECRET = 'test-sim-secret-0123456789abcdef';
const SID = '3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f';
const WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';

const LIMITS = {
  maxSessions: 1, idleMs: 5_000, maxLifetimeMs: 10_000, disconnectGraceMs: 5_000, startTimeoutMs: 2_000,
  runTimeoutMs: 1_000, stopGraceMs: 20, minRunIntervalMs: 0, maxCodeBytes: 1024, maxOutputChars: 64, maxFramesPerSec: 3,
};

function client(){
  const msgs = [];
  return {
    msgs, closed: false,
    send(m){ msgs.push(m); },
    close(){ this.closed = true; },
    last(type){ return [...msgs].reverse().find((m) => m.type === type); },
    waitFor(pred, ms = 1500){
      return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const tick = () => {
          const hit = msgs.find(pred);
          if (hit) return resolve(hit);
          if (Date.now() - t0 > ms) return reject(new Error('timed out waiting; got ' + JSON.stringify(msgs)));
          setTimeout(tick, 5);
        };
        tick();
      });
    },
  };
}

function manager(overrides = {}){
  const driver = overrides.driver || createFakeDriver({ runMs: overrides.runMs ?? 30 });
  return { driver, m: new SessionManager({ driver, limits: { ...LIMITS, ...overrides.limits }, connectGateway: overrides.connectGateway || null }) };
}

test('start boots a session to ready, and a second start reuses it', async () => {
  const { m, driver } = manager();
  const c = client();
  m.attach('a@x.org', c);
  assert.deepEqual(c.msgs[0], { type: 'status', state: 'none' });
  await m.handle('a@x.org', { type: 'start' }, c);
  assert.equal(c.last('status').state, 'ready');
  await m.handle('a@x.org', { type: 'start' }, c);
  assert.equal(driver.live.size, 1);
  await m.endAll('test');
  assert.equal(driver.live.size, 0);
});

test('capacity is enforced across students', async () => {
  const { m } = manager();
  const a = client(), b = client();
  m.attach('a@x.org', a); m.attach('b@x.org', b);
  await m.handle('a@x.org', { type: 'start' }, a);
  await m.handle('b@x.org', { type: 'start' }, b);
  assert.equal(b.last('error').code, 'at_capacity');
  await m.endAll('test');
});

test('the disabled driver refuses to start with a reason', async () => {
  const { m } = manager({ driver: createDisabledDriver() });
  const c = client();
  m.attach('a@x.org', c);
  await m.handle('a@x.org', { type: 'start' }, c);
  assert.equal(c.last('error').code, 'unavailable');
  assert.equal(m.stats().sessions, 0);
});

test('run is validated before anything reaches the driver', async () => {
  const { m } = manager();
  const c = client();
  m.attach('a@x.org', c);
  await m.handle('a@x.org', { type: 'run', path: WAVE, code: 'x=1' }, c);
  assert.equal(c.last('error').code, 'no_session');
  await m.handle('a@x.org', { type: 'start' }, c);
  for (const [path, code, err] of [
    ['../../etc/passwd', 'x=1', 'bad_path'],
    ['swayform_ws/src/../../x.py', 'x=1', 'bad_path'],
    ['swayform_ws/src/a.sh', 'x=1', 'bad_path'],
    [WAVE, '   ', 'empty_code'],
    [WAVE, 'x'.repeat(2000), 'code_too_large'],
  ]){
    await m.handle('a@x.org', { type: 'run', path, code }, c);
    assert.equal(c.last('error').code, err, path);
  }
  await m.endAll('test');
});

test('a run streams output and reports how it ended', async () => {
  const { m } = manager();
  const c = client();
  m.attach('a@x.org', c);
  await m.handle('a@x.org', { type: 'start' }, c);
  await m.handle('a@x.org', { type: 'run', path: WAVE, code: 'print(1)' }, c);
  assert.match(c.last('output').text, /nothing was executed/);
  assert.equal(c.last('exit').reason, 'finished');
  assert.equal(c.last('status').state, 'ready');
  await m.endAll('test');
});

test('stop and the run timeout both end the program with their own reason', async () => {
  const { m } = manager({ runMs: 5_000, limits: { runTimeoutMs: 60 } });
  const c = client();
  m.attach('a@x.org', c);
  await m.handle('a@x.org', { type: 'start' }, c);
  const running = m.handle('a@x.org', { type: 'run', path: WAVE, code: 'x' }, c);
  await c.waitFor((x) => x.type === 'status' && x.state === 'running');
  await m.handle('a@x.org', { type: 'stop' }, c);
  await running;
  assert.equal(c.last('exit').reason, 'stopped');
  await m.handle('a@x.org', { type: 'run', path: WAVE, code: 'x' }, c);
  assert.equal(c.last('exit').reason, 'timeout');
  await m.endAll('test');
});

test('output past the cap is cut with one notice', async () => {
  const driver = createFakeDriver();
  driver.runCode = async (h, { onOutput }) => {
    for (let i = 0; i < 10; i++) onOutput('stdout', 'x'.repeat(20));
    return { done: Promise.resolve({ exitCode: 0 }), stop: async () => {} };
  };
  const { m } = manager({ driver });
  const c = client();
  m.attach('a@x.org', c);
  await m.handle('a@x.org', { type: 'start' }, c);
  await m.handle('a@x.org', { type: 'run', path: WAVE, code: 'x' }, c);
  const out = c.msgs.filter((x) => x.type === 'output');
  assert.equal(out.filter((x) => x.stream === 'stdout').map((x) => x.text).join('').length, LIMITS.maxOutputChars);
  assert.equal(out.filter((x) => /output limit/.test(x.text)).length, 1);
  await m.endAll('test');
});

test('idle sessions and abandoned sessions are torn down', async () => {
  const { m, driver } = manager({ limits: { idleMs: 40, disconnectGraceMs: 40 } });
  const a = client();
  m.attach('a@x.org', a);
  await m.handle('a@x.org', { type: 'start' }, a);
  await a.waitFor((x) => x.type === 'status' && x.state === 'none' && x.reason === 'idle');
  assert.equal(driver.live.size, 0);

  const { m: m2, driver: d2 } = manager({ limits: { disconnectGraceMs: 40 } });
  const b = client();
  m2.attach('b@x.org', b);
  await m2.handle('b@x.org', { type: 'start' }, b);
  m2.detach('b@x.org', b);
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(d2.live.size, 0);
});

test('a second tab replaces the first, which is told and closed', async () => {
  const { m } = manager();
  const a = client(), b = client();
  m.attach('a@x.org', a);
  await m.handle('a@x.org', { type: 'start' }, a);
  m.attach('a@x.org', b);
  assert.equal(a.last('error').code, 'replaced');
  assert.equal(a.closed, true);
  assert.equal(b.last('status').state, 'ready');
  await m.endAll('test');
});

test('a failed start is cleaned up by session id', async () => {
  const driver = createFakeDriver();
  const destroyed = [];
  driver.createSession = async () => { throw new Error('boom'); };
  driver.destroySession = async (h) => { destroyed.push(h.sessionId); };
  const { m } = manager({ driver });
  const c = client();
  m.attach('a@x.org', c);
  await m.handle('a@x.org', { type: 'start' }, c);
  assert.equal(c.last('error').code, 'start_failed');
  assert.equal(destroyed.length, 1);
  assert.equal(m.stats().sessions, 0);
});

test('only joint, pose and stats frames reach the browser, rate-limited', async () => {
  const driver = createFakeDriver();
  driver.createSession = async ({ sessionId }) => ({ sessionId, gateway: { url: 'ws://gw', token: 't' } });
  let hooks;
  const connectGateway = (info, h) => { hooks = h; return { ready: Promise.resolve(), close(){} }; };
  const { m } = manager({ driver, connectGateway });
  const c = client();
  m.attach('a@x.org', c);
  await m.handle('a@x.org', { type: 'start' }, c);
  hooks.onMessage({ type: 'exec', cmd: 'rm -rf /' });
  hooks.onMessage({ type: 'status', state: 'ready' });
  for (let i = 0; i < 10; i++) hooks.onMessage({ type: 'joints', name: ['j'], position: [i] });
  assert.equal(c.msgs.filter((x) => x.type === 'exec').length, 0);
  assert.equal(c.msgs.filter((x) => x.type === 'joints').length, LIMITS.maxFramesPerSec);
  hooks.onClose();
  await c.waitFor((x) => x.type === 'status' && x.state === 'none' && x.reason === 'gateway_lost');
});

test('student containers are locked down', () => {
  const spec = runnerContainerSpec({ sessionId: SID, runId: SID, image: 'runner:1', runtime: 'runsc', path: WAVE, code: 'print(1)', env: { SWAYFORM_TARGET: 'x' } });
  const h = spec.HostConfig;
  assert.equal(h.Runtime, 'runsc');
  assert.deepEqual(h.CapDrop, ['ALL']);
  assert.ok(h.SecurityOpt.includes('no-new-privileges:true'));
  assert.equal(h.ReadonlyRootfs, true);
  assert.equal(h.Privileged, false);
  assert.equal(h.Binds, undefined);
  assert.equal(h.Mounts, undefined);
  assert.equal(h.NetworkMode, networkSpecs(SID)[0].Name);
  assert.ok(h.PidsLimit > 0 && h.Memory > 0 && h.MemorySwap === h.Memory && h.NanoCpus > 0);
  assert.notEqual(spec.User.split(':')[0], '0');
  assert.ok(spec.Env.includes('SWAYFORM_ENTRY=wave.py'));
  assert.ok(spec.Env.includes(`SWAYFORM_CODE_B64=${Buffer.from('print(1)').toString('base64')}`));
  assert.ok(!spec.Env.some((e) => e.startsWith('SWAYFORM_GATEWAY_TOKEN=')));
});

test('session networks have no way out and Gazebo transport stays inside its container', () => {
  const [ros, ctl] = networkSpecs(SID);
  assert.equal(ros.Internal, true);
  assert.equal(ctl.Options['com.docker.network.bridge.enable_ip_masquerade'], 'false');
  const sim = simContainerSpec({ sessionId: SID, image: 'sim:1', gatewayToken: 'tok' });
  assert.ok(sim.Env.includes('GZ_IP=127.0.0.1'));
  assert.deepEqual(sim.HostConfig.CapDrop, ['ALL']);
  assert.equal(sim.HostConfig.NetworkMode, ctl.Name);
});

test('runner env and entry names cannot smuggle anything in', () => {
  for (const bad of [{ LD_PRELOAD: '/x' }, { SWAYFORM_CODE_B64: 'x' }, { 'lower': '1' }, { 'A=B': '1' }]){
    assert.throws(() => runnerEnv(bad));
  }
  // Traversal is refused earlier by validateRun; here only the basename matters.
  for (const bad of ['dir/.hidden.py', 'x.sh', 'we ird.py', 'a;b.py', 'x.py.sh']) assert.throws(() => entryName(bad));
  assert.equal(entryName('swayform_ws/src/pkg/lab-01_x.py'), 'lab-01_x.py');
});

test('docker log demux splits stdout and stderr across chunk boundaries', () => {
  const frame = (type, text) => { const b = Buffer.from(text); const h = Buffer.alloc(8); h[0] = type; h.writeUInt32BE(b.length, 4); return Buffer.concat([h, b]); };
  const all = Buffer.concat([frame(1, 'hello\n'), frame(2, 'oops\n')]);
  const got = [];
  const feed = demux((s, t) => got.push([s, t]));
  feed(all.subarray(0, 5)); feed(all.subarray(5, 17)); feed(all.subarray(17));
  assert.deepEqual(got, [['stdout', 'hello\n'], ['stderr', 'oops\n']]);
});

test('tokens minted by the portal API verify at the orchestrator, and nothing else does', async () => {
  process.env.SIM_SERVICE_SECRET = SECRET;
  const token = await mintSimToken({ email: 'Admin@School.org', role: 'admin', robotId: 7 });
  assert.deepEqual(await verifySimToken(token, SECRET), { owner: 'admin@school.org', role: 'admin', robotId: 7 });
  await assert.rejects(verifySimToken(token, 'another-secret-0123456789abcdef'));
  const key = new TextEncoder().encode(SECRET);
  const videoToken = await new SignJWT({ purpose: 'video-viewer' }).setProtectedHeader({ alg: 'HS256' })
    .setSubject('a@x.org').setAudience('swayform-sim').setIssuedAt().setExpirationTime('60s').sign(key);
  await assert.rejects(verifySimToken(videoToken, SECRET), /wrong_purpose/);
  const expired = await new SignJWT({ purpose: 'sim-session' }).setProtectedHeader({ alg: 'HS256' })
    .setSubject('a@x.org').setAudience('swayform-sim').setIssuedAt(Math.floor(Date.now() / 1000) - 120).setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(key);
  await assert.rejects(verifySimToken(expired, SECRET));
});

test('the portal API reports the simulator as not configured until both env values are set', () => {
  const saved = { url: process.env.SIM_ORCHESTRATOR_URL, secret: process.env.SIM_SERVICE_SECRET };
  delete process.env.SIM_ORCHESTRATOR_URL;
  assert.equal(simOrchestratorUrl(), null);
  process.env.SIM_ORCHESTRATOR_URL = 'http://plain.example';
  assert.equal(simOrchestratorUrl(), null);
  process.env.SIM_ORCHESTRATOR_URL = 'wss://sim.example.net';
  delete process.env.SIM_SERVICE_SECRET;
  assert.equal(simOrchestratorUrl(), null);
  process.env.SIM_SERVICE_SECRET = SECRET;
  assert.equal(simOrchestratorUrl(), 'wss://sim.example.net');
  if (saved.url === undefined) delete process.env.SIM_ORCHESTRATOR_URL; else process.env.SIM_ORCHESTRATOR_URL = saved.url;
  if (saved.secret === undefined) delete process.env.SIM_SERVICE_SECRET; else process.env.SIM_SERVICE_SECRET = saved.secret;
});

test('end to end over WebSocket with the fake driver', async (t) => {
  process.env.SIM_SERVICE_SECRET = SECRET;
  const { startServer } = await import('../sim/orchestrator/server.js');
  const origin = 'https://learning.swayform.net';
  const { server, shutdown } = await startServer({ port: 0, secret: SECRET, driver: 'fake', allowedOrigins: [origin], docker: {} });
  t.after(shutdown);
  const url = `ws://127.0.0.1:${server.address().port}/session`;

  const refused = new WebSocket(url, { headers: { origin: 'https://evil.example' } });
  await new Promise((resolve) => refused.on('error', resolve));

  const bad = new WebSocket(url, { headers: { origin } });
  await new Promise((r) => bad.on('open', r));
  bad.send(JSON.stringify({ type: 'hello', token: 'nope' }));
  const [code] = await new Promise((r) => bad.on('close', (...a) => r(a)));
  assert.equal(code, 4003);

  const ws = new WebSocket(url, { headers: { origin } });
  const msgs = [];
  ws.on('message', (d) => msgs.push(JSON.parse(d.toString())));
  await new Promise((r) => ws.on('open', r));
  const waitFor = (pred) => new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => { const hit = msgs.find(pred); if (hit) return resolve(hit); if (Date.now() - t0 > 3000) return reject(new Error(JSON.stringify(msgs))); setTimeout(tick, 10); };
    tick();
  });
  ws.send(JSON.stringify({ type: 'hello', token: await mintSimToken({ email: 'a@x.org', role: 'admin', robotId: 1 }) }));
  await waitFor((m) => m.type === 'status' && m.state === 'none');
  ws.send(JSON.stringify({ type: 'start' }));
  await waitFor((m) => m.type === 'status' && m.state === 'ready');
  ws.send(JSON.stringify({ type: 'run', path: WAVE, code: 'print(1)' }));
  const exit = await waitFor((m) => m.type === 'exit');
  assert.equal(exit.reason, 'finished');
  ws.send(JSON.stringify({ type: 'end' }));
  await waitFor((m) => m.type === 'status' && m.state === 'none' && m.reason === 'ended');
  ws.close();
});
