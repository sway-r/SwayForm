// Every limit in one place; env overrides are for operators and tests.
const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const LIMITS = {
  maxSessions: num('SIM_MAX_SESSIONS', 2),
  idleMs: num('SIM_IDLE_MS', 10 * 60_000),
  maxLifetimeMs: num('SIM_MAX_LIFETIME_MS', 45 * 60_000),
  disconnectGraceMs: num('SIM_DISCONNECT_GRACE_MS', 2 * 60_000),
  startTimeoutMs: num('SIM_START_TIMEOUT_MS', 120_000),
  // Same as the real robot's job timeout (bridge/server.js JOB_TIMEOUT_MS).
  runTimeoutMs: num('SIM_RUN_TIMEOUT_MS', 60_000),
  stopGraceMs: num('SIM_STOP_GRACE_MS', 2_000),
  minRunIntervalMs: num('SIM_MIN_RUN_INTERVAL_MS', 3_000),
  // Same caps as api/robot/queue.js MAX_CODE_BYTES and the bridge's job output buffer.
  maxCodeBytes: 64 * 1024,
  maxOutputChars: 64 * 1024,
  maxFramesPerSec: 30,
};

export function readConfig(){
  const secret = process.env.SIM_SERVICE_SECRET;
  if (!secret) throw new Error('SIM_SERVICE_SECRET is not set');
  return {
    port: num('PORT', 9100),
    secret,
    driver: process.env.SIM_DRIVER || 'disabled',
    allowedOrigins: (process.env.SIM_ALLOWED_ORIGINS || 'https://learning.swayform.net').split(',').map((s) => s.trim()).filter(Boolean),
    docker: {
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
      simImage: process.env.SIM_HOST_IMAGE || '',
      runnerImage: process.env.SIM_RUNNER_IMAGE || '',
      // gVisor for untrusted student code; set SIM_RUNNER_RUNTIME=runc only on a dev box.
      runnerRuntime: process.env.SIM_RUNNER_RUNTIME || 'runsc',
      runnerEnv: parseJsonEnv('SIM_RUNNER_ENV', {}),
    },
  };
}

function parseJsonEnv(name, fallback){
  if (!process.env[name]) return fallback;
  try { return JSON.parse(process.env[name]); } catch { throw new Error(`${name} is not valid JSON`); }
}
