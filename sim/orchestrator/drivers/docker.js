import http from 'node:http';
import crypto from 'node:crypto';
import {
  SESSION_LABEL, GATEWAY_PORT, networkNames, networkSpecs, simContainerSpec, runnerContainerSpec, shortId,
} from './docker-specs.js';

const API = '/v1.43';

// One worker host: Docker Engine on the same machine as the orchestrator, reached over its unix socket.
export function createDockerDriver({ socketPath, simImage, runnerImage, runnerRuntime, runnerEnv, log = () => {} }){
  const docker = engineClient(socketPath);

  async function startSim(sessionId){
    const gatewayToken = crypto.randomBytes(32).toString('hex');
    const names = networkNames(sessionId);
    const created = await docker.json('POST', `/containers/create?name=sfsim-${shortId(sessionId)}-sim`, simContainerSpec({ sessionId, image: simImage, gatewayToken }));
    await docker.json('POST', `/networks/${names.ros}/connect`, { Container: created.Id });
    await docker.json('POST', `/containers/${created.Id}/start`);
    const info = await docker.json('GET', `/containers/${created.Id}/json`);
    const ip = info.NetworkSettings.Networks[names.ctl] && info.NetworkSettings.Networks[names.ctl].IPAddress;
    if (!ip) throw new Error('sim_no_ctl_ip');
    return { simId: created.Id, gateway: { url: `ws://${ip}:${GATEWAY_PORT}`, token: gatewayToken } };
  }

  return {
    name: 'docker',
    available: () => (simImage && runnerImage ? { ok: true } : { ok: false, reason: 'Simulation images are not configured.' }),

    async createSession({ sessionId }){
      for (const spec of networkSpecs(sessionId)) await docker.json('POST', '/networks/create', spec);
      return { sessionId, ...(await startSim(sessionId)) };
    },

    async runCode(handle, { runId, path, code, onOutput }){
      const spec = runnerContainerSpec({ sessionId: handle.sessionId, runId, image: runnerImage, runtime: runnerRuntime, path, code, env: runnerEnv });
      const created = await docker.json('POST', `/containers/create?name=sfsim-${shortId(handle.sessionId)}-run-${shortId(runId)}`, spec);
      const id = created.Id;
      const remove = () => docker.json('DELETE', `/containers/${id}?force=true`).catch(() => {});
      try {
        await docker.json('POST', `/containers/${id}/start`);
      } catch (e){ await remove(); throw e; }
      docker.stream(`/containers/${id}/logs?follow=1&stdout=1&stderr=1`, demux(onOutput)).catch((e) => log({ evt: 'sim_logs_failed', error: String(e.message || e) }));
      const done = docker.json('POST', `/containers/${id}/wait`)
        .then((r) => ({ exitCode: typeof r.StatusCode === 'number' ? r.StatusCode : null }))
        .finally(remove);
      return {
        done,
        async stop(graceMs){
          await docker.json('POST', `/containers/${id}/kill?signal=SIGINT`).catch(() => {});
          const killed = await Promise.race([done.then(() => true), delay(graceMs).then(() => false)]);
          if (!killed) await docker.json('POST', `/containers/${id}/kill?signal=SIGKILL`).catch(() => {});
        },
      };
    },

    // Hard reset: a fresh Gazebo process from the same image, same networks. Slower than a soft reset, never inconsistent.
    async resetWorld(handle){
      await docker.json('DELETE', `/containers/${handle.simId}?force=true`).catch(() => {});
      return { sessionId: handle.sessionId, ...(await startSim(handle.sessionId)) };
    },

    async destroySession({ sessionId }){
      await removeLabelled(docker, `${SESSION_LABEL}=${sessionId}`);
    },

    // After a crash or restart nothing may keep running (or billing) unattended.
    async cleanupOrphans(){
      return removeLabelled(docker, SESSION_LABEL);
    },
  };
}

async function removeLabelled(docker, label){
  const filters = encodeURIComponent(JSON.stringify({ label: [label] }));
  const containers = await docker.json('GET', `/containers/json?all=1&filters=${filters}`);
  await Promise.all(containers.map((c) => docker.json('DELETE', `/containers/${c.Id}?force=true`).catch(() => {})));
  const networks = await docker.json('GET', `/networks?filters=${filters}`);
  await Promise.all(networks.map((n) => docker.json('DELETE', `/networks/${n.Id}`).catch(() => {})));
  return containers.length;
}

// Docker multiplexes stdout/stderr on one stream when there is no TTY: 8-byte header, then the payload.
export function demux(onOutput){
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 8){
      const size = buf.readUInt32BE(4);
      if (buf.length < 8 + size) break;
      const stream = buf[0] === 2 ? 'stderr' : 'stdout';
      onOutput(stream, buf.subarray(8, 8 + size).toString('utf8'));
      buf = buf.subarray(8 + size);
    }
  };
}

function engineClient(socketPath){
  function request(method, path, body, onData){
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
      const req = http.request({
        socketPath, method, path: API + path,
        headers: payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {},
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => (onData && res.statusCode < 300 ? onData(c) : chunks.push(c)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 300) return reject(Object.assign(new Error(`docker ${method} ${path} -> ${res.statusCode} ${text.slice(0, 200)}`), { status: res.statusCode }));
          try { resolve(text ? JSON.parse(text) : {}); } catch { resolve({}); }
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
  return {
    json: (method, path, body) => request(method, path, body),
    stream: (path, onData) => request('GET', path, undefined, onData),
  };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
