import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateJointContract, crossCheckUrdf } from '../portal/apps/learn/workspace/simulation/joint-contract.js';
import { SIM_CONFIG, simVisible } from '../portal/data/sim-config.js';

// Synthetic names on purpose: the real joints come from the robot software, never from the portal.
function sample(){
  return {
    contractVersion: 1,
    robot: 'test_robot',
    source: { repo: 'example/test_ws', commit: 'abc1234' },
    jointStateTopic: '/joint_states',
    joints: [
      { name: 'test_joint_a', type: 'revolute', limits: { lower: -1, upper: 1, velocity: 2, effort: 1 }, rest: 0, hardware: { kind: 'test' } },
      { name: 'test_joint_b', type: 'continuous', limits: { velocity: 2, effort: 1 }, rest: 5, hardware: { kind: 'test' } },
    ],
    poses: { rest: { test_joint_a: 0.5 } },
    sim: {
      model: 'test_robot', descriptionPackage: 'test_description', xacroFile: 'urdf/test.urdf.xacro',
      controllersPackage: 'test_bringup', controllersFile: 'config/controllers.yaml', controllers: ['joint_state_broadcaster'],
      runnerEnv: { TEST_BACKEND: 'sim' },
    },
  };
}

test('a complete contract passes', () => {
  assert.deepEqual(validateJointContract(sample()), { ok: true, errors: [] });
});

test('each structural problem is reported', () => {
  const cases = [
    [(c) => { c.contractVersion = 2; }, /contractVersion/],
    [(c) => { c.source.commit = 'main'; }, /source/],
    [(c) => { c.joints[1].name = 'test_joint_a'; }, /twice/],
    [(c) => { c.joints[0].limits.lower = 2; }, /below/],
    [(c) => { c.joints[0].rest = 3; }, /rest is outside/],
    [(c) => { delete c.joints[0].hardware; }, /hardware/],
    [(c) => { c.poses.rest.nope = 0; }, /unknown joint/],
    [(c) => { c.poses.rest.test_joint_a = 9; }, /outside its limits/],
    [(c) => { c.sim.controllers = []; }, /controllers/],
    [(c) => { c.sim.runnerEnv = { lower: 'x' }; }, /runnerEnv/],
    [(c) => { c.joints = []; }, /non-empty/],
  ];
  for (const [mutate, pattern] of cases){
    const c = sample();
    mutate(c);
    const r = validateJointContract(c);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => pattern.test(e)), `${pattern} not in ${JSON.stringify(r.errors)}`);
  }
});

test('the URDF cross-check finds joints on either side only, ignoring fixed and mimic joints', () => {
  const r = crossCheckUrdf(sample(), [
    { name: 'test_joint_a', type: 'revolute' },
    { name: 'test_joint_c', type: 'revolute' },
    { name: 'test_joint_d', type: 'revolute', mimic: 'test_joint_a' },
    { name: 'test_mount', type: 'fixed' },
  ]);
  assert.deepEqual(r, { missingInUrdf: ['test_joint_b'], missingInContract: ['test_joint_c'] });
});

test('nothing about the robot model is filled in until the real files arrive', () => {
  assert.equal(SIM_CONFIG.modelUrl, null);
  assert.equal(SIM_CONFIG.contractUrl, null);
  assert.equal(SIM_CONFIG.visibleTo, 'admins');
  assert.equal(simVisible({ admin: true, fullAccess: true }), true);
  assert.equal(simVisible({ admin: false, fullAccess: true }), false);
});
