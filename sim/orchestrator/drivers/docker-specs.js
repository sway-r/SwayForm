// Docker Engine API request bodies for one session. Pure, so tests can pin every isolation setting.

export const SESSION_LABEL = 'net.swayform.sim.session';
export const ROLE_LABEL = 'net.swayform.sim.role';
export const GATEWAY_PORT = 8765;

const MiB = 1024 * 1024;
export const RUNNER_LIMITS = { memoryBytes: 512 * MiB, nanoCpus: 1_000_000_000, pids: 128 };
export const SIM_LIMITS = { memoryBytes: 3072 * MiB, nanoCpus: 2_000_000_000, pids: 2048 };

// Names the runner script and the shared env may not override.
const RESERVED_ENV = new Set(['SWAYFORM_CODE_B64', 'SWAYFORM_ENTRY', 'SWAYFORM_GATEWAY_TOKEN', 'HOME', 'PATH', 'LD_PRELOAD', 'PYTHONPATH']);
const ENTRY = /^[A-Za-z0-9_-]+\.py$/;

export function shortId(id){
  return String(id).replace(/[^a-f0-9]/gi, '').slice(0, 12).toLowerCase();
}

export function networkNames(sessionId){
  const s = shortId(sessionId);
  return { ros: `sfsim-${s}-ros`, ctl: `sfsim-${s}-ctl` };
}

// ros: student runner <-> sim only, no route out. ctl: orchestrator -> gateway, no NAT so no internet either.
export function networkSpecs(sessionId){
  const names = networkNames(sessionId);
  const labels = { [SESSION_LABEL]: sessionId };
  return [
    { Name: names.ros, Driver: 'bridge', Internal: true, Attachable: false, Labels: { ...labels, [ROLE_LABEL]: 'ros' } },
    {
      Name: names.ctl, Driver: 'bridge', Internal: false, Attachable: false,
      Options: { 'com.docker.network.bridge.enable_ip_masquerade': 'false', 'com.docker.network.bridge.enable_icc': 'false' },
      Labels: { ...labels, [ROLE_LABEL]: 'ctl' },
    },
  ];
}

const sharedRosEnv = [
  // Separate /dev/shm per container, so Fast DDS must not try shared memory between them.
  'FASTDDS_BUILTIN_TRANSPORTS=UDPv4',
  'ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET',
];

export function simContainerSpec({ sessionId, image, gatewayToken }){
  if (!image) throw new Error('SIM_HOST_IMAGE is not set');
  const names = networkNames(sessionId);
  return {
    Image: image,
    Env: [
      ...sharedRosEnv,
      `SWAYFORM_GATEWAY_TOKEN=${gatewayToken}`,
      `SWAYFORM_GATEWAY_PORT=${GATEWAY_PORT}`,
      // Gazebo's own transport stays inside this container: student code can read ROS topics, never call gz services.
      'GZ_IP=127.0.0.1',
      `GZ_PARTITION=sfsim-${shortId(sessionId)}`,
    ],
    Labels: { [SESSION_LABEL]: sessionId, [ROLE_LABEL]: 'sim' },
    ExposedPorts: { [`${GATEWAY_PORT}/tcp`]: {} },
    HostConfig: {
      NetworkMode: names.ctl,
      Memory: SIM_LIMITS.memoryBytes,
      MemorySwap: SIM_LIMITS.memoryBytes,
      NanoCpus: SIM_LIMITS.nanoCpus,
      PidsLimit: SIM_LIMITS.pids,
      ShmSize: 256 * MiB,
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges:true'],
      RestartPolicy: { Name: 'no' },
      LogConfig: { Type: 'local', Config: { 'max-size': '5m', 'max-file': '1' } },
    },
  };
}

export function entryName(path){
  const base = String(path).split('/').pop();
  if (!ENTRY.test(base)) throw new Error('bad_entry');
  return base;
}

export function runnerEnv(extra){
  const out = [];
  for (const [k, v] of Object.entries(extra || {})){
    if (!/^[A-Z][A-Z0-9_]*$/.test(k) || RESERVED_ENV.has(k)) throw new Error(`runner env ${k} is not allowed`);
    out.push(`${k}=${String(v)}`);
  }
  return out;
}

// Student code: gVisor, no capabilities, read-only root, tmpfs scratch, no network but the session's ROS net.
export function runnerContainerSpec({ sessionId, runId, image, runtime, path, code, env }){
  if (!image) throw new Error('SIM_RUNNER_IMAGE is not set');
  const names = networkNames(sessionId);
  return {
    Image: image,
    User: '10001:10001',
    WorkingDir: '/tmp/run',
    Env: [
      ...sharedRosEnv,
      ...runnerEnv(env),
      `SWAYFORM_ENTRY=${entryName(path)}`,
      `SWAYFORM_CODE_B64=${Buffer.from(code, 'utf8').toString('base64')}`,
      'PYTHONDONTWRITEBYTECODE=1',
      'PYTHONUNBUFFERED=1',
    ],
    Labels: { [SESSION_LABEL]: sessionId, [ROLE_LABEL]: 'runner', 'net.swayform.sim.run': runId },
    AttachStdin: false,
    OpenStdin: false,
    Tty: false,
    NetworkDisabled: false,
    StopSignal: 'SIGINT',
    HostConfig: {
      Runtime: runtime || 'runsc',
      NetworkMode: names.ros,
      ReadonlyRootfs: true,
      Tmpfs: { '/tmp': 'rw,nosuid,nodev,size=32m' },
      Memory: RUNNER_LIMITS.memoryBytes,
      MemorySwap: RUNNER_LIMITS.memoryBytes,
      NanoCpus: RUNNER_LIMITS.nanoCpus,
      PidsLimit: RUNNER_LIMITS.pids,
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges:true'],
      Ulimits: [{ Name: 'nofile', Soft: 256, Hard: 256 }, { Name: 'nproc', Soft: 128, Hard: 128 }],
      IpcMode: 'private',
      Privileged: false,
      RestartPolicy: { Name: 'no' },
      LogConfig: { Type: 'local', Config: { 'max-size': '1m', 'max-file': '1' } },
    },
  };
}
