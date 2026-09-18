import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from '../bridge/node_modules/ws/wrapper.mjs';
import { SignJWT } from 'jose';
const calls = [];
let api, child, base;
const sockets = new Set();
const secret = 'synthetic-bridge-test-secret';
// Stand-in API state; `claims` counts dispatch-queue requests.
const apiState = { claims: 0, claimDelayMs: 0, jobs: [], hasApproved: false, failFinish: 0, finishDelayMs: 0 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
before(async () => {
  api = http.createServer(async (req,res) => {
    let raw=''; for await(const chunk of req) raw+=chunk;
    const body=raw?JSON.parse(raw):{}; calls.push(body);
    res.setHeader('content-type','application/json');
    if(body.action==='auth') res.end(JSON.stringify({robotId:1}));
    else if(req.method==='GET'){
      apiState.claims++;
      if(apiState.claimDelayMs) await sleep(apiState.claimDelayMs);
      res.end(JSON.stringify({jobs:apiState.jobs}));
    }
    else if(body.action==='job-finished'&&apiState.failFinish>0){apiState.failFinish--;res.statusCode=500;res.end('{}');}
    else if(body.action==='job-finished'&&apiState.finishDelayMs){await sleep(apiState.finishDelayMs);res.end(JSON.stringify({ok:true}));}
    else if(body.action==='heartbeat') res.end(JSON.stringify({ok:true,hasApproved:apiState.hasApproved}));
    else res.end(JSON.stringify({ok:true}));
  });
  api.listen(0,'127.0.0.1'); await once(api,'listening');
  const holder=http.createServer(); holder.listen(0,'127.0.0.1'); await once(holder,'listening');
  const port=holder.address().port; await new Promise(r=>holder.close(r));
  base=`http://127.0.0.1:${port}`;
  child=spawn(process.execPath,['bridge/server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),VERCEL_API_BASE:`http://127.0.0.1:${api.address().port}`,BRIDGE_SERVICE_SECRET:secret,CODE_SERVER_ROBOT_ID:'1',PRESENCE_WRITE_INTERVAL_MS:'400',FINISH_RETRY_BASE_MS:'200'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('bridge startup timeout')),5000);
    child.stdout.on('data',data=>{if(String(data).includes('listening')){clearTimeout(timer);resolve();}});
    child.once('exit',()=>{clearTimeout(timer);reject(Error('bridge exited'));});
  });
});
after(async()=>{for(const ws of sockets)ws.terminate(); if(child){child.kill();await once(child,'exit');} await new Promise(r=>api.close(r));});
async function connect(){const ws=new WebSocket(base.replace('http:','ws:')+'/agent');sockets.add(ws);await once(ws,'open');return ws;}
test('unauthenticated socket cannot send job updates to the privileged API',{timeout:5000},async()=>{
  const ws=await connect(); const closed=once(ws,'close');
  ws.send(JSON.stringify({t:'job.exit',jobId:1,exitCode:0}));
  assert.equal((await closed)[0],4001);
  assert.equal(calls.some(x=>x.action==='job-finished'),false);
});
test('authenticated socket cannot update a job that was not dispatched to it',{timeout:5000},async()=>{
  const ws=await connect();const hello=once(ws,'message');
  ws.send(JSON.stringify({t:'hello',token:'synthetic',serial:'synthetic'}));await hello;
  const closed=once(ws,'close');ws.send(JSON.stringify({t:'job.output',jobId:999,text:'injected'}));
  assert.equal((await closed)[0],4003);
  assert.equal(calls.some(x=>x.action==='job-output'),false);
});
test('video-request requires the bridge secret, only pings the agent on 0->1/1->0 transitions',{timeout:5000},async()=>{
  const post=async(action,key)=>fetch(base+'/video-request',{method:'POST',headers:{'content-type':'application/json','x-bridge-secret':key},body:JSON.stringify({robotId:1,action})});
  assert.equal((await post('start','wrong')).status,401);

  const ws=await connect();const hello=once(ws,'message');
  ws.send(JSON.stringify({t:'hello',token:'synthetic',serial:'synthetic'}));await hello;

  const frame=()=>new Promise((resolve)=>ws.once('message',(raw)=>resolve(JSON.parse(raw.toString()))));

  let next=frame();
  let r=await post('start',secret); assert.equal((await r.json()).delivered,true);
  assert.deepEqual(await next,{t:'video.start'});

  // Second viewer joining sends no additional frame — refcount is now 2.
  const noFrame=Promise.race([frame().then(()=>'frame'),new Promise((resolve)=>setTimeout(()=>resolve('timeout'),300))]);
  r=await post('start',secret); assert.equal((await r.json()).delivered,true);
  assert.equal(await noFrame,'timeout');

  // First stop (2->1) sends nothing either — someone's still watching.
  const noFrame2=Promise.race([frame().then(()=>'frame'),new Promise((resolve)=>setTimeout(()=>resolve('timeout'),300))]);
  r=await post('stop',secret); assert.equal((await r.json()).delivered,true);
  assert.equal(await noFrame2,'timeout');

  // Final stop (1->0) actually pings the agent.
  next=frame();
  r=await post('stop',secret); assert.equal((await r.json()).delivered,true);
  assert.deepEqual(await next,{t:'video.stop'});
  ws.close(); // free the one-socket-per-robot slot for the next test
});
test('idle-request requires the bridge secret and relays start/stop to the connected agent',{timeout:5000},async()=>{
  const post=async(action,key)=>fetch(base+'/idle-request',{method:'POST',headers:{'content-type':'application/json','x-bridge-secret':key},body:JSON.stringify({robotId:1,action})});
  assert.equal((await post('start','wrong')).status,401);

  const ws=await connect();const hello=once(ws,'message');
  ws.send(JSON.stringify({t:'hello',token:'synthetic',serial:'synthetic'}));await hello;

  const frame=()=>new Promise((resolve)=>ws.once('message',(raw)=>resolve(JSON.parse(raw.toString()))));

  let next=frame();
  let r=await post('start',secret); assert.equal((await r.json()).delivered,true);
  assert.deepEqual(await next,{t:'idle.start'});

  next=frame();
  r=await post('stop',secret); assert.equal((await r.json()).delivered,true);
  assert.deepEqual(await next,{t:'idle.stop'});
  ws.close();
});
test('viewer JWTs require the video purpose, and editor tokens are robot-bound and single use',async()=>{
  async function token(payload){return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('60s').sign(new TextEncoder().encode(secret));}
  const post=async t=>fetch(base+'/mediamtx-auth',{method:'POST',body:JSON.stringify({action:'read',path:'synthetic',token:t})});
  assert.equal((await post(await token({serial:'synthetic',purpose:'code-server'}))).status,401);
  assert.equal((await post(await token({serial:'synthetic',purpose:'video-viewer'}))).status,200);
  const exchange=async t=>fetch(base+'/_exchange?token='+t,{redirect:'manual'});
  assert.equal((await exchange(await token({purpose:'code-server',robotId:2,jti:'other'}))).status,401);
  const t=await token({purpose:'code-server',robotId:1,jti:'once'});
  assert.equal((await exchange(t)).status,302);assert.equal((await exchange(t)).status,401);
});

// One robot slot (the stand-in API always answers robotId 1): each test disconnects before the next.
async function agentSession(){
  apiState.claims = 0; apiState.claimDelayMs = 0; apiState.jobs = []; apiState.hasApproved = false; apiState.finishDelayMs = 0;
  calls.length = 0;
  const ws = await connect();
  const frames = [];
  ws.on('message', (raw) => frames.push(JSON.parse(raw.toString())));
  ws.send(JSON.stringify({ t: 'hello', token: 'synthetic', serial: 'synthetic' }));
  while (!frames.some((f) => f.t === 'hello.ok')) await sleep(10);
  await sleep(100); // let the connect-time claim finish
  return {
    ws, frames,
    runs: () => frames.filter((f) => f.t === 'job.run'),
    async end(){ const closed = once(ws, 'close'); ws.close(); await closed; await sleep(150); },
  };
}
const notify = (key, robotId = 1) => fetch(base + '/dispatch-notify', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-bridge-secret': key }, body: JSON.stringify({ robotId }),
});
const job = (jobId) => ({ jobId, package: 'test', executable: 'lab', path: 'lab.py', code: 'pass', sha256: 'hash' });

test('an idle connection claims once on connect and then never again, while presence writes continue', { timeout: 10000 }, async () => {
  const session = await agentSession();
  assert.equal(apiState.claims, 1, 'the connect-time check for a job approved while offline');
  await sleep(1500); // several presence intervals (400ms in this test; 60s in production)
  assert.equal(apiState.claims, 1, 'no fixed-interval dispatch polling while nothing is approved');
  const beats = calls.filter((c) => c.action === 'heartbeat');
  assert.ok(beats.length >= 3, `presence is still written periodically (saw ${beats.length})`);
  assert.ok(beats.every((c) => c.online === true && c.robotId === 1));
  assert.equal(session.frames.find((f) => f.t === 'hello.ok').heartbeatIntervalMs, 10000, 'the agent-facing protocol is unchanged');
  await session.end();
});

test('disconnecting writes offline presence immediately', { timeout: 10000 }, async () => {
  const session = await agentSession();
  await session.end();
  const last = calls.filter((c) => c.action === 'heartbeat').pop();
  assert.equal(last.online, false);
  const settled = calls.length;
  await sleep(900);
  assert.equal(calls.length, settled, 'nothing keeps calling the API after the agent is gone');
});

test('dispatch-notify requires the bridge secret and causes exactly one claim for a connected robot', { timeout: 10000 }, async () => {
  const session = await agentSession();
  assert.equal((await notify('wrong')).status, 401);
  assert.equal((await notify(undefined)).status, 401);
  await sleep(100);
  assert.equal(apiState.claims, 1, 'an unauthenticated notification triggers nothing');

  apiState.jobs = [job(41)];
  const delivered = await (await notify(secret)).json();
  assert.deepEqual(delivered, { ok: true, delivered: true });
  await sleep(200);
  assert.equal(apiState.claims, 2);
  assert.deepEqual(session.runs().map((f) => f.jobId), [41]);

  // Not connected, or not a robot id at all: reported, and nothing is claimed.
  assert.deepEqual(await (await notify(secret, 999)).json(), { ok: true, delivered: false });
  assert.equal((await notify(secret, 'one')).status, 400);
  assert.equal(apiState.claims, 2);
  await session.end();
});

test('a job is sent to the robot once, even if it is notified again and the API were to return it again', { timeout: 10000 }, async () => {
  const session = await agentSession();
  apiState.jobs = [job(52)]; // a misbehaving API that keeps returning the same job
  for (let i = 0; i < 3; i++){ await notify(secret); await sleep(150); }
  assert.ok(apiState.claims >= 3);
  assert.deepEqual(session.runs().map((f) => f.jobId), [52], 'job.run is never repeated on a connection');
  await session.end();
});

test('notifications that arrive during a claim coalesce into one follow-up, never parallel claims', { timeout: 10000 }, async () => {
  const session = await agentSession();
  apiState.claimDelayMs = 400;
  await Promise.all([notify(secret), notify(secret), notify(secret), notify(secret)]);
  await sleep(1300);
  // 1 on connect + 1 in flight + exactly 1 follow-up for everything that arrived meanwhile.
  assert.equal(apiState.claims, 3);
  await session.end();
});

test('a missed notification is recovered by the presence write reporting an approved job', { timeout: 10000 }, async () => {
  const session = await agentSession();
  assert.equal(apiState.claims, 1);
  // The admin approved, but the notification never reached this process.
  apiState.jobs = [job(63)];
  apiState.hasApproved = true;
  await sleep(900); // at least one presence interval
  assert.ok(apiState.claims >= 2, 'presence-driven claim happened without any notification');
  assert.deepEqual(session.runs().map((f) => f.jobId), [63]);
  await session.end();
});

test('a job approved while the idle session is running is not dispatched until idle has had time to stop', { timeout: 12000 }, async () => {
  const session = await agentSession();
  apiState.jobs = [job(85)];
  // What api/robot/queue.js's approve action does, in order: stop idle, then notify.
  await fetch(base + '/idle-request', { method: 'POST', headers: { 'content-type': 'application/json', 'x-bridge-secret': secret }, body: JSON.stringify({ robotId: 1, action: 'stop' }) });
  await notify(secret);
  await sleep(2500);
  assert.deepEqual(session.frames.filter((f) => f.t === 'idle.stop' || f.t === 'job.run').map((f) => f.t), ['idle.stop'], 'idle.stop goes out at once; job.run is held back');
  assert.equal(apiState.claims, 1, 'and the job is not even claimed yet, so nothing is stuck if the agent drops now');
  await sleep(2200);
  assert.deepEqual(session.runs().map((f) => f.jobId), [85]);
  await session.end();
});

test('when a job exits, the next claim happens by itself, after the settle delay', { timeout: 10000 }, async () => {
  const session = await agentSession();
  apiState.jobs = [job(74)];
  await notify(secret); await sleep(200);
  assert.deepEqual(session.runs().map((f) => f.jobId), [74]);
  apiState.jobs = [];
  const before = apiState.claims;
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 74, exitCode: 0 }));
  await sleep(1000);
  assert.ok(calls.some((c) => c.action === 'job-finished' && c.jobId === 74));
  assert.equal(apiState.claims, before, 'not immediately: the robot gets a moment between jobs');
  await sleep(1600);
  assert.equal(apiState.claims, before + 1, 'then exactly one claim, with no admin action needed');
  await session.end();
});

test('a notify that lands while job-finished is still in flight waits out the settle delay too', { timeout: 10000 }, async () => {
  const session = await agentSession();
  apiState.jobs = [job(75)];
  await notify(secret); await sleep(200);
  assert.deepEqual(session.runs().map((f) => f.jobId), [75]);
  apiState.jobs = [job(76)];
  apiState.finishDelayMs = 1500;
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 75, exitCode: 0 }));
  await sleep(100);
  await notify(secret);
  await sleep(500);
  assert.deepEqual(session.runs().map((f) => f.jobId), [75], 'the next job is not sent straight after the exit');
  await sleep(1900);
  assert.deepEqual(session.runs().map((f) => f.jobId), [75, 76], 'it goes out once the robot has had its moment');
  apiState.jobs = []; apiState.finishDelayMs = 0;
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 76, exitCode: 0 }));
  await sleep(300);
  await session.end();
});

const idleRequest = async (action) => (await fetch(base + '/idle-request', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-bridge-secret': secret }, body: JSON.stringify({ robotId: 1, action }),
})).json();

test('a failed job-finished is retried until it lands, and the queue moves on afterwards', { timeout: 15000 }, async () => {
  const session = await agentSession();
  apiState.jobs = [job(90)];
  await notify(secret); await sleep(200);
  assert.deepEqual(session.runs().map((f) => f.jobId), [90]);
  apiState.jobs = [];
  apiState.failFinish = 2;
  const before = apiState.claims;
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 90, exitCode: 0 }));
  await sleep(1200);
  assert.equal(calls.filter((c) => c.action === 'job-finished' && c.jobId === 90).length, 3, 'two failures, then the one that landed');
  assert.equal(apiState.failFinish, 0);
  await sleep(2300);
  assert.equal(apiState.claims, before + 1, 'the next claim follows the successful report');
  await session.end();
});

test('an agent that reconnects can still report the end of a job from its previous connection', { timeout: 10000 }, async () => {
  let session = await agentSession();
  apiState.jobs = [job(91)];
  await notify(secret); await sleep(200);
  assert.deepEqual(session.runs().map((f) => f.jobId), [91]);
  apiState.jobs = [];
  await session.end();

  session = await agentSession();
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 91, exitCode: 130 }));
  await sleep(300);
  assert.ok(calls.some((c) => c.action === 'job-finished' && c.jobId === 91 && c.exitCode === 130));
  assert.equal(session.ws.readyState, WebSocket.OPEN, 'and the connection is kept');
  await session.end();
});

test('idle.start is refused while a job is dispatched, and idle is always stopped before job.run', { timeout: 15000 }, async () => {
  const session = await agentSession();
  apiState.jobs = [job(92)];
  await notify(secret); await sleep(200);
  assert.deepEqual(session.runs().map((f) => f.jobId), [92]);
  apiState.jobs = [];
  assert.deepEqual(await idleRequest('start'), { ok: true, delivered: false, reason: 'job_running' });
  assert.equal(session.frames.some((f) => f.t === 'idle.start'), false);
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 92, exitCode: 0 }));
  await sleep(300);

  // Idle on, then a job shows up without the API's idle.stop relay ever arriving.
  assert.deepEqual(await idleRequest('start'), { ok: true, delivered: true });
  apiState.jobs = [job(93)];
  await sleep(2000); // past the post-job settle hold
  await notify(secret); await sleep(1500);
  const order = () => session.frames.filter((f) => ['idle.start', 'idle.stop', 'job.run'].includes(f.t)).map((f) => f.t);
  assert.deepEqual(order(), ['job.run', 'idle.start', 'idle.stop'], 'the bridge stops idle itself and holds job.run back');
  await sleep(3200);
  assert.deepEqual(order(), ['job.run', 'idle.start', 'idle.stop', 'job.run']);
  apiState.jobs = [];
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 93, exitCode: 0 }));
  await sleep(300);
  await session.end();
});

test('a job claimed for a robot that drops before delivery is failed instead of blocking the queue', { timeout: 15000 }, async () => {
  const session = await agentSession();
  assert.deepEqual(await idleRequest('start'), { ok: true, delivered: true });
  apiState.jobs = [job(94)];
  await sleep(2000);
  await notify(secret); await sleep(500);
  apiState.jobs = [];
  await session.end(); // drops during the idle settle wait, before job.run
  await sleep(4200);
  assert.equal(session.runs().some((f) => f.jobId === 94), false);
  assert.ok(calls.some((c) => c.action === 'job-finished' && c.jobId === 94 && c.exitCode === 1));
});

test('a video stop only ever removes the viewer that sent it', { timeout: 5000 }, async () => {
  const post = async (action, viewerId) => (await fetch(base + '/video-request', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-bridge-secret': secret }, body: JSON.stringify({ robotId: 1, action, viewerId }),
  })).json();
  const session = await agentSession();
  const video = () => session.frames.filter((f) => f.t.startsWith('video.')).map((f) => f.t);
  await post('start', 'viewer-aaaa');
  // A second viewer whose start never landed sends its stop anyway.
  await post('stop', 'viewer-bbbb');
  await sleep(100);
  assert.deepEqual(video(), ['video.start'], 'the first viewer keeps the feed');
  await post('start', 'viewer-aaaa'); // repeated start renews, it does not count twice
  await post('stop', 'viewer-aaaa');
  await sleep(100);
  assert.deepEqual(video(), ['video.start', 'video.stop']);
  await session.end();
});

test('an idle.stop that arrives while a claim is in flight still delays that claim\'s job.run', { timeout: 15000 }, async () => {
  const session = await agentSession();
  const at = {};
  session.ws.on('message', (raw) => { const f = JSON.parse(raw.toString()); if (!(f.t in at)) at[f.t] = Date.now(); });
  apiState.jobs = [job(95)];
  apiState.claimDelayMs = 500;
  await notify(secret); // the claim is now waiting on the API
  await sleep(100);
  assert.equal((await idleRequest('stop')).delivered, true);
  await sleep(1500);
  assert.equal(session.runs().length, 0, 'the claim came back, but job.run is held');
  await sleep(3200);
  assert.deepEqual(session.runs().map((f) => f.jobId), [95], 'the claimed job is kept and sent once the hold is over');
  assert.ok(at['job.run'] - at['idle.stop'] >= 3900, `job.run came ${at['job.run'] - at['idle.stop']}ms after idle.stop`);
  apiState.jobs = []; apiState.claimDelayMs = 0;
  session.ws.send(JSON.stringify({ t: 'job.exit', jobId: 95, exitCode: 0 }));
  await sleep(300);
  await session.end();
});
