/* Checks the shape of the shared joint contract published by the robot software (sim/HANDOFF.md). It never supplies joint data itself. */

export const CONTRACT_VERSION = 1;
const JOINT_TYPES = new Set(['revolute', 'prismatic', 'continuous']);
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENV_KEY = /^[A-Z][A-Z0-9_]*$/;
const SIM_STRINGS = ['model', 'descriptionPackage', 'xacroFile', 'controllersPackage', 'controllersFile'];

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export function validateJointContract(c){
  const errors = [];
  const err = (m) => errors.push(m);
  if (!c || typeof c !== 'object') return { ok: false, errors: ['contract is not an object'] };
  if (c.contractVersion !== CONTRACT_VERSION) err(`contractVersion must be ${CONTRACT_VERSION}`);
  if (typeof c.robot !== 'string' || !c.robot) err('robot is required');
  if (!c.source || typeof c.source.repo !== 'string' || !/^[0-9a-f]{7,40}$/.test(String(c.source.commit || ''))) err('source.repo and source.commit (a git sha) are required');
  if (typeof c.jointStateTopic !== 'string' || !c.jointStateTopic.startsWith('/')) err('jointStateTopic must be an absolute ROS topic');

  const joints = Array.isArray(c.joints) ? c.joints : [];
  if (!joints.length) err('joints must be a non-empty list');
  const byName = new Map();
  joints.forEach((j, i) => {
    const at = `joints[${i}]`;
    if (!j || !NAME.test(String(j.name || ''))){ err(`${at}.name is missing or not a valid identifier`); return; }
    if (byName.has(j.name)) err(`${at}.name "${j.name}" is listed twice`);
    byName.set(j.name, j);
    if (!JOINT_TYPES.has(j.type)) err(`${j.name}: type must be revolute, prismatic or continuous`);
    const l = j.limits || {};
    if (j.type !== 'continuous'){
      if (!finite(l.lower) || !finite(l.upper) || !(l.lower < l.upper)) err(`${j.name}: limits.lower must be below limits.upper`);
    }
    if (!finite(l.velocity) || l.velocity <= 0) err(`${j.name}: limits.velocity must be positive`);
    if (!finite(l.effort) || l.effort <= 0) err(`${j.name}: limits.effort must be positive`);
    if (!finite(j.rest)) err(`${j.name}: rest is required`);
    else if (!withinLimits(j, j.rest)) err(`${j.name}: rest is outside its limits`);
    if (!j.hardware || typeof j.hardware !== 'object') err(`${j.name}: hardware mapping is required`);
  });

  Object.entries(c.poses || {}).forEach(([pose, values]) => {
    Object.entries(values || {}).forEach(([name, v]) => {
      const j = byName.get(name);
      if (!j) err(`pose ${pose}: unknown joint "${name}"`);
      else if (!finite(v) || !withinLimits(j, v)) err(`pose ${pose}: ${name} is outside its limits`);
    });
  });

  const sim = c.sim || {};
  SIM_STRINGS.forEach((k) => { if (typeof sim[k] !== 'string' || !sim[k]) err(`sim.${k} is required`); });
  if (!Array.isArray(sim.controllers) || !sim.controllers.length || !sim.controllers.every((n) => typeof n === 'string' && NAME.test(n))) err('sim.controllers must list controller names');
  Object.keys(sim.runnerEnv || {}).forEach((k) => { if (!ENV_KEY.test(k)) err(`sim.runnerEnv.${k} is not an upper-case env name`); });
  if (sim.trackedModels !== undefined && !(Array.isArray(sim.trackedModels) && sim.trackedModels.every((n) => typeof n === 'string' && n))) err('sim.trackedModels must be a list of model names');

  return { ok: errors.length === 0, errors };
}

function withinLimits(j, v){
  if (j.type === 'continuous') return true;
  const l = j.limits || {};
  return v >= l.lower && v <= l.upper;
}

/** Contract joints the URDF lacks, and moving URDF joints the contract lacks. Both must be empty before a model ships. */
export function crossCheckUrdf(contract, urdfJoints){
  const contractNames = new Set((contract.joints || []).map((j) => j.name));
  const urdfNames = new Set(urdfJoints.map((j) => j.name));
  // Mimic joints follow a driven joint, so only independently moving joints need a contract entry.
  const moving = urdfJoints.filter((j) => j.type !== 'fixed' && !j.mimic).map((j) => j.name);
  return {
    missingInUrdf: [...contractNames].filter((n) => !urdfNames.has(n)),
    missingInContract: moving.filter((n) => !contractNames.has(n)),
  };
}
