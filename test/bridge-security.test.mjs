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
before(async () => {
  api = http.createServer(async (req,res) => {
    let raw=''; for await(const chunk of req) raw+=chunk;
    const body=raw?JSON.parse(raw):{}; calls.push(body);
    res.setHeader('content-type','application/json');
    if(body.action==='auth') res.end(JSON.stringify({robotId:1}));
    else if(req.method==='GET') res.end(JSON.stringify({jobs:[]}));
    else res.end(JSON.stringify({ok:true}));
  });
  api.listen(0,'127.0.0.1'); await once(api,'listening');
  const holder=http.createServer(); holder.listen(0,'127.0.0.1'); await once(holder,'listening');
  const port=holder.address().port; await new Promise(r=>holder.close(r));
  base=`http://127.0.0.1:${port}`;
  child=spawn(process.execPath,['bridge/server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),VERCEL_API_BASE:`http://127.0.0.1:${api.address().port}`,BRIDGE_SERVICE_SECRET:secret,CODE_SERVER_ROBOT_ID:'1'},stdio:['ignore','pipe','pipe']});
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
