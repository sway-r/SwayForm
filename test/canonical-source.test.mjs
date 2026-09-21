import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { validateAgainstCanonicalSource, canonicalVariantFor } from '../api/_lib/canonical-source.js';

const WAVE_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const HANDSHAKE_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/handshake.py';
const FIST_BUMP_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/fist_bump.py';
const FINGER_COUNT_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/finger_count.py';
const canonicalWave = WORKSPACE_FILES[WAVE_PATH];
const canonicalHandshake = WORKSPACE_FILES[HANDSHAKE_PATH];
const canonicalFistBump = WORKSPACE_FILES[FIST_BUMP_PATH];
const canonicalFingerCount = WORKSPACE_FILES[FINGER_COUNT_PATH];

test('the untouched default is not_started, not complete', () => {
  const result = validateAgainstCanonicalSource(WAVE_PATH, canonicalWave);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'not_started');
  assert.deepEqual(result.tunable, { name: 'WAVE_CYCLES', from: '1', to: '5' });
});

test('only the target value (5) is complete/queueable', () => {
  const edited = canonicalWave.replace('WAVE_CYCLES = 1', 'WAVE_CYCLES = 5');
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.deepEqual(result, { valid: true, status: 'complete' });
});

test('WAVE_CYCLES set to anything else (in-between values included) is tampered, not accepted', () => {
  for (const n of [0, 2, 3, 4, 6, -1, 100]){
    const edited = canonicalWave.replace('WAVE_CYCLES = 1', `WAVE_CYCLES = ${n}`);
    const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
    assert.equal(result.valid, false, `WAVE_CYCLES = ${n} should not be queueable`);
    assert.equal(result.status, 'tampered');
  }
});

test('tampered reports every differing line, not just the first', () => {
  const edited = canonicalWave
    .replace('WAVE_CYCLES = 1', 'WAVE_CYCLES = 2')
    .replace('SHOULDER_PITCH_WAVE = 260', 'SHOULDER_PITCH_WAVE = 999');
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.equal(result.status, 'tampered');
  assert.equal(result.diffs.length, 2);
  assert.equal(result.diffs[0].kind, 'changed');
  assert.equal(result.diffs[0].expected, 'SHOULDER_PITCH_WAVE = 260');
  assert.equal(result.diffs[1].expected, 'WAVE_CYCLES = 5');
});

test('a non-tunable constant (SPEED_SCALE) is still byte-exact only', () => {
  const edited = canonicalWave.replace('SPEED_SCALE = 0.3', 'SPEED_SCALE = 0.5');
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'tampered');
});

test('a file with no canonical source at all is rejected', () => {
  const result = validateAgainstCanonicalSource('swayform_ws/src/swayform_labs/lab_08_wave.py', 'anything');
  assert.deepEqual(result, { valid: false, status: 'no_canonical_source' });
});

test('tunable substitution requires the same line count (no restructuring)', () => {
  const edited = canonicalWave.replace('WAVE_CYCLES = 1', 'WAVE_CYCLES = 5\nEXTRA = 1');
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'tampered');
});

test('trailing whitespace and a trailing blank line do not count as tampering', () => {
  const edited = canonicalWave.replace('WAVE_CYCLES = 1', 'WAVE_CYCLES = 5') + '\n\n  \n';
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.deepEqual(result, { valid: true, status: 'complete' });
});

test('removing or adding empty lines does not block an otherwise correct submission', () => {
  const solved = canonicalHandshake.replace('SHAKE_CYCLES = 1', 'SHAKE_CYCLES = 7');
  const withoutEmptyLines = solved.split('\n').filter((line) => line.trim() !== '').join('\n');
  const withExtraEmptyLines = solved.replace('SHAKE_CYCLES = 7', 'SHAKE_CYCLES = 7\n\n   \n');
  assert.deepEqual(validateAgainstCanonicalSource(HANDSHAKE_PATH, withoutEmptyLines), { valid: true, status: 'complete' });
  assert.deepEqual(validateAgainstCanonicalSource(HANDSHAKE_PATH, withExtraEmptyLines), { valid: true, status: 'complete' });
});

test('blank-line changes do not shift the line reported for a real code error', () => {
  const edited = canonicalHandshake
    .replace('SHAKE_CYCLES = 1', 'SHAKE_CYCLES = 7')
    .replace(/\n\s*\n/g, '\n')
    .replace('SHAKE_OFFSET = 5', 'SHAKE_OFFSET = 999');
  const result = validateAgainstCanonicalSource(HANDSHAKE_PATH, edited);
  assert.equal(result.status, 'tampered');
  assert.equal(result.diffs.length, 1);
  assert.equal(result.diffs[0].yours, 'SHAKE_OFFSET = 999');
  assert.equal(result.diffs[0].expected, 'SHAKE_OFFSET = 5');
});

test('Handshake: the untouched default (SHAKE_CYCLES = 1) is not_started', () => {
  const result = validateAgainstCanonicalSource(HANDSHAKE_PATH, canonicalHandshake);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'not_started');
  assert.deepEqual(result.tunable, { name: 'SHAKE_CYCLES', from: '1', to: '2, 3, 4, 5, 6, 7, 8, 9, or 10' });
});

test('Handshake: every SHAKE_CYCLES value from 2 through 10 is complete/queueable', () => {
  for (let n = 2; n <= 10; n++){
    const edited = canonicalHandshake.replace('SHAKE_CYCLES = 1', `SHAKE_CYCLES = ${n}`);
    const result = validateAgainstCanonicalSource(HANDSHAKE_PATH, edited);
    assert.deepEqual(result, { valid: true, status: 'complete' });
  }
});

test('Handshake: SHAKE_CYCLES set to anything else is tampered, not accepted', () => {
  for (const n of [0, 11, 20, -1]){
    const edited = canonicalHandshake.replace('SHAKE_CYCLES = 1', `SHAKE_CYCLES = ${n}`);
    const result = validateAgainstCanonicalSource(HANDSHAKE_PATH, edited);
    assert.equal(result.valid, false, `SHAKE_CYCLES = ${n} should not be queueable`);
    assert.equal(result.status, 'tampered');
  }
});

test('Fist Bump: the untouched default (ENABLE_HEAD_NOD = False) is not_started', () => {
  const result = validateAgainstCanonicalSource(FIST_BUMP_PATH, canonicalFistBump);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'not_started');
  assert.deepEqual(result.tunable, { name: 'ENABLE_HEAD_NOD', from: 'False', to: 'True' });
});

test('Finger Count: the untouched default (NUMBER = None) is not_started, listing all 5 acceptable values', () => {
  const result = validateAgainstCanonicalSource(FINGER_COUNT_PATH, canonicalFingerCount);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'not_started');
  assert.deepEqual(result.tunable, { name: 'NUMBER', from: 'None', to: '1, 2, 3, 4, or 5' });
});

test('Finger Count: any of NUMBER = 1 through 5 is complete/queueable, not just one target', () => {
  for (const n of [1, 2, 3, 4, 5]){
    const edited = canonicalFingerCount.replace('NUMBER = None', `NUMBER = ${n}`);
    const result = validateAgainstCanonicalSource(FINGER_COUNT_PATH, edited);
    assert.deepEqual(result, { valid: true, status: 'complete' }, `NUMBER = ${n} should be queueable`);
  }
});

test('Finger Count: NUMBER outside 1-5 (including 0) is tampered, not accepted', () => {
  for (const n of [0, 6, -1, 100]){
    const edited = canonicalFingerCount.replace('NUMBER = None', `NUMBER = ${n}`);
    const result = validateAgainstCanonicalSource(FINGER_COUNT_PATH, edited);
    assert.equal(result.valid, false, `NUMBER = ${n} should not be queueable`);
    assert.equal(result.status, 'tampered');
  }
});

test('Finger Count: tampering elsewhere is caught even with a valid NUMBER, diffed against the closest matching variant', () => {
  const edited = canonicalFingerCount
    .replace('NUMBER = None', 'NUMBER = 3')
    .replace('HOLD_SECONDS = 4.0', 'HOLD_SECONDS = 999.0');
  const result = validateAgainstCanonicalSource(FINGER_COUNT_PATH, edited);
  assert.equal(result.status, 'tampered');
  assert.equal(result.diffs.length, 1);
  assert.equal(result.diffs[0].expected, 'HOLD_SECONDS = 4.0');
});

const TARGET_LOCK_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/target_lock.py';
const canonicalTargetLock = WORKSPACE_FILES[TARGET_LOCK_PATH];
const TARGET_LOCK_ORDER = ['activate_crosshair', 'load_controls', 'run_system_check', 'unlock_movement', 'unlock_arm'];
const fillSteps = (names, open = '(', close = ')') => names.reduce(
  (code, name, i) => code.replace(`STEP_${i + 1} = ()`, `STEP_${i + 1} = ${open}${name}${close}`), canonicalTargetLock);

// The Pi agent re-derives these from its own copy (sway-r/swayform_ws 9e5de54); any drift is a variant_mismatch on the robot.
test('Target Lock: the mirrored file and the queued variant hash to what the robot agent expects', () => {
  const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
  assert.equal(sha256(canonicalTargetLock), '1331369bb3eadc0f7e76b18eff9563adda32549e5c11b8393935994dcee2394d');
  assert.equal(sha256(canonicalVariantFor(TARGET_LOCK_PATH, fillSteps(TARGET_LOCK_ORDER))), 'cfd5054dbf2359cf8e24e8393463a4b364c8eec00602975da66f3ed744df332d');
});

test('Target Lock: the untouched file is not_started and says nothing about the answer', () => {
  const result = validateAgainstCanonicalSource(TARGET_LOCK_PATH, canonicalTargetLock);
  assert.deepEqual(result, { valid: false, status: 'not_started', tunable: null, blanks: 5 });
});

test('Target Lock: only the one correct order is complete, spacing inside the blanks aside', () => {
  assert.deepEqual(validateAgainstCanonicalSource(TARGET_LOCK_PATH, fillSteps(TARGET_LOCK_ORDER)), { valid: true, status: 'complete' });
  assert.deepEqual(validateAgainstCanonicalSource(TARGET_LOCK_PATH, fillSteps(TARGET_LOCK_ORDER, '( ', ' )')), { valid: true, status: 'complete' });
  assert.equal(canonicalVariantFor(TARGET_LOCK_PATH, fillSteps(TARGET_LOCK_ORDER, '( ', ' )')), fillSteps(TARGET_LOCK_ORDER), 'what gets queued is the byte-exact variant');
});

test('Target Lock: a wrong or partial order reports counts only, never a function name', () => {
  const swapped = ['load_controls', 'activate_crosshair', 'run_system_check', 'unlock_movement', 'unlock_arm'];
  const wrong = validateAgainstCanonicalSource(TARGET_LOCK_PATH, fillSteps(swapped));
  assert.deepEqual(wrong, { valid: false, status: 'wrong_order', filled: 5, correct: 3, total: 5 });

  const partial = validateAgainstCanonicalSource(TARGET_LOCK_PATH, fillSteps(TARGET_LOCK_ORDER.slice(0, 2)));
  assert.deepEqual(partial, { valid: false, status: 'wrong_order', filled: 2, correct: 2, total: 5 });

  const called = validateAgainstCanonicalSource(TARGET_LOCK_PATH, fillSteps(TARGET_LOCK_ORDER, '(', '())'));
  assert.deepEqual(called, { valid: false, status: 'wrong_order', filled: 5, correct: 0, total: 5 });
  assert.equal(canonicalVariantFor(TARGET_LOCK_PATH, fillSteps(swapped)), null);
});

test('Target Lock: tampering elsewhere is diffed without leaking the order', () => {
  const edited = fillSteps(TARGET_LOCK_ORDER).replace('if not step(session):', 'if step(session):');
  const result = validateAgainstCanonicalSource(TARGET_LOCK_PATH, edited);
  assert.equal(result.status, 'tampered');
  assert.equal(result.diffs.length, 1);
  assert.equal(result.diffs[0].expected.trim(), 'if not step(session):');
  const leaked = JSON.stringify(result);
  // The function names appear in the import block either way; the blanks themselves must come back empty.
  assert.equal(/STEP_\d = \(\w+\)/.test(leaked), false);
});
