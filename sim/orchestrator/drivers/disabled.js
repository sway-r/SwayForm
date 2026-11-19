// Default driver: no simulation hosts are provisioned, every start is refused with a clear reason.
export function createDisabledDriver(){
  const unavailable = () => Promise.reject(new Error('sim_disabled'));
  return {
    name: 'disabled',
    available: () => ({ ok: false, reason: 'Simulation servers are not running yet.' }),
    createSession: unavailable,
    runCode: unavailable,
    resetWorld: unavailable,
    destroySession: async () => {},
    cleanupOrphans: async () => 0,
  };
}
