import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { validateAgainstCanonicalSource } from '../api/_lib/canonical-source.js';

const WAVE_PATH = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const canonicalWave = WORKSPACE_FILES[WAVE_PATH];

test('unmodified canonical source is valid', () => {
  assert.deepEqual(validateAgainstCanonicalSource(WAVE_PATH, canonicalWave), { valid: true });
});

test('WAVE_CYCLES may be set to any of 1-5', () => {
  for (const n of [1, 2, 3, 4, 5]){
    const edited = canonicalWave.replace('WAVE_CYCLES = 3', `WAVE_CYCLES = ${n}`);
    assert.equal(validateAgainstCanonicalSource(WAVE_PATH, edited).valid, true, `WAVE_CYCLES = ${n} should validate`);
  }
});

test('WAVE_CYCLES outside 1-5 is rejected', () => {
  for (const n of [0, 6, -1, 100]){
    const edited = canonicalWave.replace('WAVE_CYCLES = 3', `WAVE_CYCLES = ${n}`);
    const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
    assert.equal(result.valid, false, `WAVE_CYCLES = ${n} should be rejected`);
    assert.equal(result.reason, 'mismatch');
  }
});

test('a non-tunable constant (SPEED_SCALE) is still byte-exact only', () => {
  const edited = canonicalWave.replace('SPEED_SCALE = 0.3', 'SPEED_SCALE = 0.5');
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'mismatch');
});

test('changing WAVE_CYCLES does not open the door to unrelated edits on other lines', () => {
  const edited = canonicalWave
    .replace('WAVE_CYCLES = 3', 'WAVE_CYCLES = 2')
    .replace('SHOULDER_PITCH_WAVE = 260', 'SHOULDER_PITCH_WAVE = 999');
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'mismatch');
});

test('a file with no canonical source at all is rejected', () => {
  const result = validateAgainstCanonicalSource('swayform_ws/src/swayform_labs/lab_08_wave.py', 'anything');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'no_canonical_source');
});

test('tunable substitution requires the same line count (no restructuring)', () => {
  const edited = canonicalWave.replace('WAVE_CYCLES = 3', 'WAVE_CYCLES = 2\nEXTRA = 1');
  const result = validateAgainstCanonicalSource(WAVE_PATH, edited);
  assert.equal(result.valid, false);
});
