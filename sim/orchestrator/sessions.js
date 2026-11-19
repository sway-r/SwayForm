import crypto from 'node:crypto';

// Lifecycle of one student's simulation: none -> starting -> ready <-> running, resetting, ending.
// The driver owns containers; this file owns rules (one per student, capacity, timeouts, caps).

const STUDENT_PATH = /^swayform_ws\/src\/[A-Za-z0-9_\-/]+\.py$/;
// Only these gateway messages ever reach the browser.
const FORWARDED = new Set(['joints', 'poses', 'stats']);

export function validateRun(msg, limits){
  const path = typeof msg.path === 'string' ? msg.path : '';
  const code = typeof msg.code === 'string' ? msg.code : '';
  if (!STUDENT_PATH.test(path) || path.split('/').includes('..')) return 'bad_path';
  if (!code.trim()) return 'empty_code';
  if (Buffer.byteLength(code, 'utf8') > limits.maxCodeBytes) return 'code_too_large';
  return null;
}

export class SessionManager {
  constructor({ driver, limits, connectGateway = null, now = Date.now, timers = globalThis, log = () => {} }){
    this.driver = driver;
    this.limits = limits;
    this.connectGateway = connectGateway;
    this.now = now;
    this.timers = timers;
    this.log = log;
    this.sessions = new Map(); // owner -> session
  }

  stats(){
    return { sessions: this.sessions.size, capacity: this.limits.maxSessions, driver: this.driver.name };
  }

  // A newer tab replaces the older one, the older one is told why and closed.
  attach(owner, client){
    const s = this.sessions.get(owner);
    if (s){
      if (s.client && s.client !== client){
        s.client.send({ type: 'error', code: 'replaced', message: 'This simulation was opened in another tab.' });
        s.client.close();
      }
      s.client = client;
      this._clear(s, 'graceTimer');
      this._touch(s);
    }
    client.send(this._status(s));
  }

  detach(owner, client){
    const s = this.sessions.get(owner);
    if (!s || s.client !== client) return;
    s.client = null;
    s.graceTimer = this.timers.setTimeout(() => this.end(owner, 'disconnected'), this.limits.disconnectGraceMs);
  }

  async handle(owner, msg, client){
    const s = this.sessions.get(owner);
    if (s) this._touch(s);
    switch (msg && msg.type){
      case 'start': return this.start(owner, client);
      case 'run': return this.run(owner, msg, client);
      case 'stop': return this.stop(owner, 'stopped');
      case 'reset': return this.reset(owner);
      case 'end': return this.end(owner, 'ended');
      case 'ping': return client.send({ type: 'pong' });
      default: return client.send({ type: 'error', code: 'unknown_message' });
    }
  }

  async start(owner, client){
    if (this.sessions.has(owner)){ client.send(this._status(this.sessions.get(owner))); return; }
    const avail = this.driver.available();
    if (!avail.ok){ client.send({ type: 'error', code: 'unavailable', message: avail.reason }); return; }
    if (this.sessions.size >= this.limits.maxSessions){
      client.send({ type: 'error', code: 'at_capacity', message: 'All simulation servers are busy. Try again in a few minutes.' });
      return;
    }
    const s = {
      id: crypto.randomUUID(), owner, client, state: 'starting', handle: null, gateway: null,
      run: null, lastRunAt: 0, createdAt: this.now(), lastActivity: this.now(),
    };
    this.sessions.set(owner, s);
    s.lifeTimer = this.timers.setTimeout(() => this.end(owner, 'max_lifetime'), this.limits.maxLifetimeMs);
    this._touch(s);
    this._send(s, this._status(s));
    try {
      await this._boot(s);
      if (this.sessions.get(owner) !== s) return;
      this._setState(s, 'ready');
    } catch (e){
      this.log({ evt: 'sim_start_failed', session: s.id, error: String(e && e.message || e) });
      this._send(s, { type: 'error', code: 'start_failed', message: 'The simulation could not start.' });
      await this.end(owner, 'start_failed');
    }
  }

  async run(owner, msg, client){
    const s = this.sessions.get(owner);
    if (!s){ client.send({ type: 'error', code: 'no_session' }); return; }
    if (s.state !== 'ready'){ client.send({ type: 'error', code: 'not_ready', state: s.state }); return; }
    const bad = validateRun(msg, this.limits);
    if (bad){ client.send({ type: 'error', code: bad }); return; }
    const wait = s.lastRunAt + this.limits.minRunIntervalMs - this.now();
    if (wait > 0){ client.send({ type: 'error', code: 'cooldown', retryAfterMs: wait }); return; }

    s.lastRunAt = this.now();
    const run = { id: crypto.randomUUID(), outputLen: 0, truncated: false, endReason: null, ctl: null };
    s.run = run;
    this._setState(s, 'running', { runId: run.id, path: msg.path });
    const onOutput = (stream, text) => this._output(s, run, stream, text);
    try {
      run.ctl = await this.driver.runCode(s.handle, { runId: run.id, path: msg.path, code: msg.code, onOutput });
    } catch (e){
      this.log({ evt: 'sim_run_failed', session: s.id, error: String(e && e.message || e) });
      s.run = null;
      this._send(s, { type: 'exit', runId: run.id, code: null, reason: 'error' });
      if (s.state === 'running') this._setState(s, 'ready');
      return;
    }
    run.timer = this.timers.setTimeout(() => this.stop(owner, 'timeout'), this.limits.runTimeoutMs);
    const result = await run.ctl.done.catch(() => ({ exitCode: null }));
    this._clear(run, 'timer');
    if (s.run !== run) return;
    s.run = null;
    this._send(s, { type: 'exit', runId: run.id, code: result.exitCode, reason: run.endReason || 'finished' });
    if (s.state === 'running') this._setState(s, 'ready');
  }

  async stop(owner, reason){
    const s = this.sessions.get(owner);
    if (!s || !s.run || !s.run.ctl) return;
    s.run.endReason = s.run.endReason || reason;
    await s.run.ctl.stop(this.limits.stopGraceMs).catch(() => {});
  }

  async reset(owner){
    const s = this.sessions.get(owner);
    if (!s || (s.state !== 'ready' && s.state !== 'running')) return;
    if (s.run) await this.stop(owner, 'reset');
    this._setState(s, 'resetting');
    try {
      this._closeGateway(s);
      s.handle = await this.driver.resetWorld(s.handle);
      await this._linkGateway(s);
      if (this.sessions.get(owner) === s) this._setState(s, 'ready');
    } catch (e){
      this.log({ evt: 'sim_reset_failed', session: s.id, error: String(e && e.message || e) });
      this._send(s, { type: 'error', code: 'reset_failed', message: 'The simulation could not be reset.' });
      await this.end(owner, 'reset_failed');
    }
  }

  async end(owner, reason){
    const s = this.sessions.get(owner);
    if (!s || s.state === 'ending') return;
    s.state = 'ending';
    ['lifeTimer', 'idleTimer', 'graceTimer'].forEach((k) => this._clear(s, k));
    if (s.run && s.run.ctl){ s.run.endReason = 'ended'; await s.run.ctl.stop(this.limits.stopGraceMs).catch(() => {}); }
    this._closeGateway(s);
    // By session id, so a start that timed out mid-create still gets torn down.
    try { await this.driver.destroySession(s.handle || { sessionId: s.id }); }
    catch (e){ this.log({ evt: 'sim_destroy_failed', session: s.id, error: String(e && e.message || e) }); }
    this.sessions.delete(owner);
    this.log({ evt: 'sim_session_end', session: s.id, reason, ms: this.now() - s.createdAt });
    this._send(s, { type: 'status', state: 'none', reason });
  }

  async endAll(reason){
    await Promise.all([...this.sessions.keys()].map((owner) => this.end(owner, reason)));
  }

  async _boot(s){
    s.handle = await withTimeout(this.driver.createSession({ sessionId: s.id, owner: s.owner }), this.limits.startTimeoutMs, 'start_timeout');
    await this._linkGateway(s);
  }

  // handle.gateway is { url, token } on a real worker, null on the fake driver.
  async _linkGateway(s){
    const info = s.handle && s.handle.gateway;
    if (!info || !this.connectGateway) return;
    const frameBudget = { windowStart: 0, count: 0 };
    s.gateway = this.connectGateway(info, {
      onMessage: (msg) => {
        if (!msg || !FORWARDED.has(msg.type)) return;
        const t = this.now();
        if (t - frameBudget.windowStart >= 1000){ frameBudget.windowStart = t; frameBudget.count = 0; }
        if (++frameBudget.count > this.limits.maxFramesPerSec) return;
        this._send(s, msg);
      },
      onClose: () => {
        if (this.sessions.get(s.owner) !== s || s.state === 'resetting' || s.state === 'ending') return;
        this._send(s, { type: 'error', code: 'sim_lost', message: 'The simulation stopped responding.' });
        this.end(s.owner, 'gateway_lost');
      },
    });
    await withTimeout(s.gateway.ready, this.limits.startTimeoutMs, 'gateway_timeout');
  }

  _closeGateway(s){
    if (s.gateway){ const g = s.gateway; s.gateway = null; try { g.close(); } catch {} }
  }

  _output(s, run, stream, text){
    if (s.run !== run || run.truncated) return;
    const room = this.limits.maxOutputChars - run.outputLen;
    if (text.length > room){
      text = text.slice(0, Math.max(room, 0));
      run.truncated = true;
    }
    run.outputLen += text.length;
    if (text) this._send(s, { type: 'output', runId: run.id, stream: stream === 'stderr' ? 'stderr' : 'stdout', text });
    if (run.truncated) this._send(s, { type: 'output', runId: run.id, stream: 'stderr', text: '\n[output limit reached, the rest is not shown]\n' });
  }

  _touch(s){
    s.lastActivity = this.now();
    this._clear(s, 'idleTimer');
    s.idleTimer = this.timers.setTimeout(() => this.end(s.owner, 'idle'), this.limits.idleMs);
  }

  _setState(s, state, extra){
    s.state = state;
    this._send(s, { ...this._status(s), ...extra });
  }

  _status(s){
    if (!s) return { type: 'status', state: 'none' };
    return {
      type: 'status', state: s.state, sessionId: s.id,
      expiresAt: new Date(s.createdAt + this.limits.maxLifetimeMs).toISOString(),
      idleTimeoutMs: this.limits.idleMs,
    };
  }

  _send(s, msg){
    if (s.client) s.client.send(msg);
  }

  _clear(obj, key){
    if (obj[key]){ this.timers.clearTimeout(obj[key]); obj[key] = null; }
  }
}

function withTimeout(promise, ms, code){
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(code)), ms); }),
  ]).finally(() => clearTimeout(timer));
}
