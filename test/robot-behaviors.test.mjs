import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { CANONICAL_ROBOT_PATHS } from '../portal/apps/learn/workspace/ros-paths.js';

/**
 * These files are not just lesson content: api/robot/queue.js queues the
 * canonical variant of them, the bridge ships it to the Pi, and that is what
 * physically runs. Two ways a run can report success without the robot
 * moving, both of which shipped and were only caught by watching the robot:
 *   - the node defaults use_mock_hardware to True, so `ros2 run swayform_robot
 *     wave` (the command the lesson itself prints) prints a full, convincing
 *     motion transcript and drives nothing;
 *   - the node catches every exception from the motion and still exits 0, and
 *     api/robot/agent.js maps exit 0 to 'succeeded'.
 * Guard both, for every behavior a job can run.
 */
// target_lock.py is hash-pinned by the Pi agent (variant_mismatch), so it only changes in lockstep with the robot.
const PINNED = 'behaviors/target_lock.py';
const ALL = [...CANONICAL_ROBOT_PATHS].map((path) => ({ path, source: WORKSPACE_FILES[path] }));
const BEHAVIORS = ALL.filter(({ path }) => !path.endsWith(PINNED));

test('every canonical robot path actually has source behind it', () => {
  assert.ok(ALL.length >= 7);
  for (const { path, source } of ALL){
    assert.equal(typeof source, 'string', `${path} has no source`);
  }
});

test('no behavior defaults to mock hardware — a dispatched job must drive real servos', () => {
  for (const { path, source } of BEHAVIORS){
    for (const line of source.split('\n')){
      const m = line.match(/declare_parameter\("use_mock_hardware",\s*(\w+)\)/);
      if (!m) continue;
      assert.equal(m[1], 'False',
        `${path} declares use_mock_hardware default ${m[1]}: a run with no parameter override would move nothing and still exit 0`);
    }
  }
});

test('a behavior that defaults its own mock kwarg defaults it to real hardware too', () => {
  for (const { path, source } of BEHAVIORS){
    for (const line of source.split('\n')){
      const m = line.match(/^def perform_\w+\(.*\bmock=(\w+)/);
      if (!m) continue;
      assert.equal(m[1], 'False', `${path}: ${line.trim()} silently no-ops when a caller omits mock`);
    }
  }
});

test('a behavior whose motion raises exits non-zero, so the queue cannot call it succeeded', () => {
  for (const { path, source } of BEHAVIORS){
    if (!/except Exception as e:/.test(source)) continue; // no swallowing, nothing to guard
    assert.match(source, /except Exception as e:\n(?:[ \t]+print\([^\n]*\n)?\s+self\.failed = True\n/,
      `${path} swallows the motion's exception without recording it`);
    assert.match(source, /\n {4}if node\.failed:\n {8}(?:raise SystemExit\(1\)|sys\.exit\(1\))\n/,
      `${path}'s main() returns normally after a failed motion, which the queue reads as exit 0 / succeeded`);
  }
});

test('a mock run says so on stdout, where the job output the admin sees can show it', () => {
  for (const { path, source } of BEHAVIORS){
    if (!/declare_parameter\("use_mock_hardware"/.test(source)) continue;
    assert.match(source, /print\("\[MOCK\] use_mock_hardware is true[^"]*", flush=True\)/,
      `${path} can run in mock mode without ever saying so in the output`);
  }
});
