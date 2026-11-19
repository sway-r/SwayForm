// Tests and local UI work only: real lifecycle, no physics and no joint data, so nothing here can pass for a simulation.
export function createFakeDriver({ startDelayMs = 0, runMs = 50 } = {}){
  const live = new Set();
  return {
    name: 'fake',
    live,
    available: () => ({ ok: true }),
    async createSession({ sessionId }){
      await delay(startDelayMs);
      live.add(sessionId);
      return { sessionId, gateway: null };
    },
    async runCode(handle, { code, onOutput }){
      let finish;
      const done = new Promise((resolve) => { finish = resolve; });
      onOutput('stdout', `fake driver: received ${Buffer.byteLength(code, 'utf8')} bytes, nothing was executed\n`);
      const timer = setTimeout(() => finish({ exitCode: 0 }), runMs);
      return {
        done,
        stop: async () => { clearTimeout(timer); finish({ exitCode: -2 }); },
      };
    },
    async resetWorld(handle){ return handle; },
    async destroySession(handle){ live.delete(handle.sessionId); },
    async cleanupOrphans(){ return 0; },
  };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
