/* Round-trip coverage for the ops introduced by the live-editor overlay
 * work: block.transfer (cross-step drag), video blocks, and the extended
 * code/image presentation fields — through the SAME writer/validate/reimport
 * pipeline as every other Studio edit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('../server/esm-loader.mjs', import.meta.url);

import { loadContent } from '../server/content-load.mjs';
import { replay } from '../server/ops.mjs';
import { generateChanges } from '../server/writers.mjs';
import { validateModel } from '../server/validate.mjs';
import { materializeDataDir } from './_helpers.mjs';

const base = await loadContent();

test('block.transfer moves a block across steps and validates', async () => {
  const a = base.activities['finger-curl'];
  const fromStep = 0, toStep = 1;
  const fromLen = a.steps[fromStep].blocks.length;
  const toLen = a.steps[toStep].blocks.length;
  const { model } = replay(base, [{
    type: 'block.transfer', activityId: 'finger-curl',
    fromStepIndex: fromStep, fromIndex: 0, toStepIndex: toStep, toIndex: 0,
  }]);
  assert.equal(model.activities['finger-curl'].steps[fromStep].blocks.length, fromLen - 1);
  assert.equal(model.activities['finger-curl'].steps[toStep].blocks.length, toLen + 1);
  assert.deepEqual(model.activities['finger-curl'].steps[toStep].blocks[0], a.steps[fromStep].blocks[0]);
  assert.deepEqual(validateModel(model).errors, []);

  const changes = generateChanges(base, model);
  assert.deepEqual(changes.map((c) => c.path), ['portal/data/learning-path.js']);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const lp = await importData('learning-path.js');
    const act = lp.findActivity('finger-curl').activity;
    assert.equal(act.steps[toStep].blocks[0].type, a.steps[fromStep].blocks[0].type);
  } finally { cleanup(); }
});

test('block.transfer rejects same-step (use block.move instead)', () => {
  assert.throws(() => replay(base, [{
    type: 'block.transfer', activityId: 'finger-curl', fromStepIndex: 0, fromIndex: 0, toStepIndex: 0, toIndex: 1,
  }]), /use block\.move/);
});

test('video block (local file) round-trips and renders via generated source', async () => {
  const { model } = replay(base, [{
    type: 'block.insert', activityId: 'finger-curl', stepIndex: 0,
    block: { type: 'video', src: '/videos/demo-video.mp4', caption: 'Watch the motion.', ratio: '4:3' },
  }]);
  assert.deepEqual(validateModel(model).errors, []);
  const changes = generateChanges(base, model);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const lp = await importData('learning-path.js');
    const blk = lp.findActivity('finger-curl').activity.steps[0].blocks.at(-1);
    assert.equal(blk.type, 'video');
    assert.equal(blk.src, '/videos/demo-video.mp4');
    assert.equal(blk.ratio, '4:3');
  } finally { cleanup(); }
});

test('video block validation: youtube id format, https-only external src', () => {
  const bad1 = replay(base, [{ type: 'block.insert', activityId: 'finger-curl', stepIndex: 0, block: { type: 'video', youtubeId: '!!!' } }]).model;
  assert.ok(validateModel(bad1).errors.some((e) => e.msg.includes('YouTube')));

  const bad2 = replay(base, [{ type: 'block.insert', activityId: 'finger-curl', stepIndex: 0, block: { type: 'video', src: 'http://insecure.example.com/x.mp4' } }]).model;
  assert.ok(validateModel(bad2).errors.some((e) => e.msg.includes('https')));

  const bad3 = replay(base, [{ type: 'block.insert', activityId: 'finger-curl', stepIndex: 0, block: { type: 'video' } }]).model;
  assert.ok(validateModel(bad3).errors.some((e) => e.msg.includes('src or a youtubeId')));

  const good = replay(base, [{ type: 'block.insert', activityId: 'finger-curl', stepIndex: 0, block: { type: 'video', youtubeId: 'dQw4w9WgXcQ' } }]).model;
  assert.deepEqual(validateModel(good).errors, []);
});

test('code block presentation fields (lines/lineNumbers/copy) round-trip', async () => {
  const { model } = replay(base, [{
    type: 'block.insert', activityId: 'finger-curl', stepIndex: 0,
    block: { type: 'code', lang: 'python', code: 'print(1)\n', lines: 10, lineNumbers: true, copy: false },
  }]);
  assert.deepEqual(validateModel(model).errors, []);
  const changes = generateChanges(base, model);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const blk = (await importData('learning-path.js')).findActivity('finger-curl').activity.steps[0].blocks.at(-1);
    assert.equal(blk.lines, 10);
    assert.equal(blk.lineNumbers, true);
    assert.equal(blk.copy, false);
  } finally { cleanup(); }
});

test('code block lines bound rejected outside 3-80', () => {
  const model = replay(base, [{ type: 'block.insert', activityId: 'finger-curl', stepIndex: 0, block: { type: 'code', code: 'x', lines: 2 } }]).model;
  assert.ok(validateModel(model).errors.some((e) => e.msg.includes('visible lines')));
});

test('image presentation fields (width/align/rounded/expand) round-trip', async () => {
  const { model } = replay(base, [{
    type: 'block.insert', activityId: 'finger-curl', stepIndex: 0,
    block: { type: 'image', src: '/images/RobotOverview.png', alt: 'x', width: 50, align: 'center', rounded: false, expand: true },
  }]);
  assert.deepEqual(validateModel(model).errors, []);
  const changes = generateChanges(base, model);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const blk = (await importData('learning-path.js')).findActivity('finger-curl').activity.steps[0].blocks.at(-1);
    assert.equal(blk.width, 50);
    assert.equal(blk.align, 'center');
    assert.equal(blk.rounded, false);
    assert.equal(blk.expand, true);
  } finally { cleanup(); }
});

test('image width out of 25-100 range is rejected', () => {
  const model = replay(base, [{ type: 'block.insert', activityId: 'finger-curl', stepIndex: 0, block: { type: 'image', src: '/images/RobotOverview.png', width: 5 } }]).model;
  assert.ok(validateModel(model).errors.some((e) => e.msg.includes('width')));
});

test('inline *italic* and ==highlight== do not break existing **bold**/`code` content', () => {
  const { model } = replay(base, [{
    type: 'block.set', activityId: 'finger-curl', stepIndex: 0, blockIndex: 0,
    block: { type: 'lead', text: 'Mix **bold**, *italic*, `code`, and ==highlight== together.' },
  }]);
  assert.deepEqual(validateModel(model).errors, []);
});
