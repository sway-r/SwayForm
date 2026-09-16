import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { validateAgainstCanonicalSource } from '../api/_lib/canonical-source.js';

const WAVE_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const FIST_BUMP_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/fist_bump.py';
const canonicalWave = WORKSPACE_FILES[WAVE_PATH];
const canonicalFistBump = WORKSPACE_FILES[FIST_BUMP_PATH];

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

test('Fist Bump: the untouched default (ENABLE_HEAD_NOD = False) is not_started', () => {
  const result = validateAgainstCanonicalSource(FIST_BUMP_PATH, canonicalFistBump);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'not_started');
  assert.deepEqual(result.tunable, { name: 'ENABLE_HEAD_NOD', from: 'False', to: 'True' });
});
