/* Adapter-layer tests: round-trip fidelity of the AST writers against the
 * REAL portal source files (read-only — candidates go to a temp dir).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('../server/esm-loader.mjs', import.meta.url);

import { loadContent } from '../server/content-load.mjs';
import { replay } from '../server/ops.mjs';
import { generateChanges } from '../server/writers.mjs';
import { validateModel } from '../server/validate.mjs';
import { materializeDataDir, changesByPath } from './_helpers.mjs';

const base = await loadContent();

function applied(ops) {
  const { model } = replay(base, ops);
  return model;
}

test('no-op draft produces zero file changes (byte-identical reprint)', () => {
  const changes = generateChanges(base, structuredClone(base));
  assert.deepEqual(changes.map((c) => c.path), []);
});

test('base model passes structural validation with no errors', () => {
  const { errors } = validateModel(base);
  assert.deepEqual(errors, []);
});

test('section rename touches only curriculum.js, preserving comments', async () => {
  const final = applied([{ type: 'section.rename', sectionId: 'getting-started', title: 'Getting Started!' }]);
  const changes = generateChanges(base, final);
  assert.deepEqual(changes.map((c) => c.path), ['portal/data/curriculum.js']);
  const c = changes[0];
  // The file's big header comment must survive verbatim.
  assert.ok(c.after.includes('Single source of truth for ALL learning navigation'));
  // Exactly one line differs.
  const diffCount = c.before.split('\n').filter((line, i) => line !== c.after.split('\n')[i]).length;
  assert.equal(diffCount, 1);

  const { importData, cleanup } = materializeDataDir({ [c.path]: c.after });
  try {
    const mod = await importData('curriculum.js');
    assert.equal(mod.CURRICULUM.sections[0].title, 'Getting Started!');
    assert.equal(mod.CURRICULUM.sections[0].items.length, 5);
  } finally { cleanup(); }
});

test('item reorder renumbers and imports correctly', async () => {
  const control = base.curriculum.sections.find((s) => s.id === 'control');
  const order = control.items.map((i) => i.id);
  // Move last to first.
  order.unshift(order.pop());
  const final = applied([{ type: 'item.reorder', sectionId: 'control', order }]);
  const changes = generateChanges(base, final);
  assert.deepEqual(changes.map((c) => c.path), ['portal/data/curriculum.js']);

  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const mod = await importData('curriculum.js');
    const items = mod.CURRICULUM.sections.find((s) => s.id === 'control').items;
    assert.equal(items[0].id, 'combined-keyboard-control');
    assert.equal(items[0].number, '4.01');
    assert.equal(items[1].number, '4.02');
    assert.equal(items.length, 10);
    // Preserved padded style.
    assert.ok(items.every((i) => /^4\.\d{2}$/.test(i.number)));
  } finally { cleanup(); }
});

test('hide item unlists it while learning-path content survives', async () => {
  const final = applied([{ type: 'item.hide', itemId: 'nod-yes' }]);
  const changes = generateChanges(base, final);
  assert.deepEqual(changes.map((c) => c.path), ['portal/data/curriculum.js']);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const cur = await importData('curriculum.js');
    const control = cur.CURRICULUM.sections.find((s) => s.id === 'control');
    assert.equal(control.items.length, 9);
    assert.ok(!control.items.some((i) => i.id === 'nod-yes'));
    const lp = await importData('learning-path.js');
    assert.ok(lp.findActivity('nod-yes'), 'content must remain in learning-path.js');
  } finally { cleanup(); }
});

test('move item between sections updates sectionId arg and renumbers both', async () => {
  const final = applied([{ type: 'item.move', itemId: 'wave', toSectionId: 'control', toIndex: 0 }]);
  const changes = generateChanges(base, final);
  assert.deepEqual(changes.map((c) => c.path), ['portal/data/curriculum.js']);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const cur = await importData('curriculum.js');
    const demos = cur.CURRICULUM.sections.find((s) => s.id === 'demos');
    const control = cur.CURRICULUM.sections.find((s) => s.id === 'control');
    assert.equal(demos.items.length, 4);
    assert.equal(control.items.length, 11);
    assert.equal(control.items[0].id, 'wave');
    assert.equal(control.items[0].sectionId, 'control');
    assert.equal(control.items[0].number, '4.01');
    assert.equal(demos.items[0].number, '3.1'); // renumbered, plain style kept
  } finally { cleanup(); }
});

test('block edit rewrites only that block; step comments/nodes stay', async () => {
  const a = base.activities['finger-curl'];
  const newBlock = { ...a.steps[0].blocks[0], text: 'EDITED lead text for testing.' };
  const final = applied([{ type: 'block.set', activityId: 'finger-curl', stepIndex: 0, blockIndex: 0, block: newBlock }]);
  const changes = generateChanges(base, final);
  assert.deepEqual(changes.map((c) => c.path), ['portal/data/learning-path.js']);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const lp = await importData('learning-path.js');
    const act = lp.findActivity('finger-curl').activity;
    assert.equal(act.steps[0].blocks[0].text, 'EDITED lead text for testing.');
    // Sibling step untouched.
    assert.deepEqual(act.steps[1], a.steps[1]);
  } finally { cleanup(); }
});

test('block reorder moves nodes without content loss', async () => {
  const a = base.activities['finger-curl'];
  const stepIdx = a.steps.findIndex((s) => s.blocks.length >= 3);
  const blocks = a.steps[stepIdx].blocks;
  const final = applied([{ type: 'block.move', activityId: 'finger-curl', stepIndex: stepIdx, fromIndex: 0, toIndex: blocks.length - 1 }]);
  const changes = generateChanges(base, final);
  const { importData, cleanup } = materializeDataDir({ [changes[0].path]: changes[0].after });
  try {
    const lp = await importData('learning-path.js');
    const got = lp.findActivity('finger-curl').activity.steps[stepIdx].blocks;
    assert.equal(got.length, blocks.length);
    assert.deepEqual(got[got.length - 1], blocks[0]);
    assert.deepEqual(got[0], blocks[1]);
  } finally { cleanup(); }
});

test('new lesson: content + listing + import round-trip', async () => {
  const final = applied([{
    type: 'activity.add',
    activity: {
      id: 'test-new-lab', title: 'Test New Lab', kind: 'activity',
      difficulty: 'beginner', estimatedTime: '10 minutes',
      summary: 'A lab created by the Studio test suite.',
      steps: [{ id: 'intro', title: 'Introduction', blocks: [{ type: 'lead', text: 'Hello from Studio.' }] }],
    },
    listing: { sectionId: 'control', index: 2 },
  }]);
  const changes = generateChanges(base, final);
  assert.deepEqual(changes.map((c) => c.path).sort(),
    ['portal/data/curriculum.js', 'portal/data/learning-path.js']);
  const byPath = changesByPath(changes);
  const { importData, cleanup } = materializeDataDir({
    'portal/data/curriculum.js': byPath['portal/data/curriculum.js'].after,
    'portal/data/learning-path.js': byPath['portal/data/learning-path.js'].after,
  });
  try {
    const cur = await importData('curriculum.js');
    const control = cur.CURRICULUM.sections.find((s) => s.id === 'control');
    assert.equal(control.items.length, 11);
    assert.equal(control.items[2].id, 'test-new-lab');
    assert.equal(control.items[2].title, 'Test New Lab');
    assert.equal(control.items[2].number, '4.03');
    const lp = await importData('learning-path.js');
    const found = lp.findActivity('test-new-lab');
    assert.ok(found);
    assert.equal(found.activity.steps[0].blocks[0].text, 'Hello from Studio.');
  } finally { cleanup(); }
});

test('duplicate lesson copies steps and workspace file', async () => {
  const final = applied([{ type: 'activity.duplicate', activityId: 'finger-curl', newId: 'finger-curl-v2', newTitle: 'Finger Curl V2' }]);
  const changes = generateChanges(base, final);
  const paths = changes.map((c) => c.path).sort();
  assert.deepEqual(paths, ['portal/data/curriculum.js', 'portal/data/learning-path.js', 'portal/data/workspace-files.js']);
  const byPath = changesByPath(changes);
  const { importData, cleanup } = materializeDataDir(Object.fromEntries(changes.map((c) => [c.path, c.after])));
  try {
    const lp = await importData('learning-path.js');
    const dup = lp.findActivity('finger-curl-v2');
    assert.ok(dup);
    assert.equal(dup.activity.title, 'Finger Curl V2');
    assert.equal(dup.activity.steps.length, base.activities['finger-curl'].steps.length);
    const wf = await importData('workspace-files.js');
    assert.ok(Object.keys(wf.WORKSPACE_FILES).some((k) => k.includes('finger_curl_v2')));
    void byPath;
  } finally { cleanup(); }
});

test('workspace file edit/add/rename round-trip; unrelated entries untouched', async () => {
  const somePath = 'ros2_ws/src/swayform_demos/wave_demo.py';
  const final = applied([
    { type: 'file.set', path: somePath, content: base.workspaceFiles[somePath] + '\n# studio test\n' },
    { type: 'file.add', path: 'ros2_ws/src/swayform_labs/studio_test.py', content: 'print("hi")\n' },
  ]);
  const changes = generateChanges(base, final);
  assert.deepEqual(changes.map((c) => c.path), ['portal/data/workspace-files.js']);
  const c = changes[0];
  // Helper-call entries (PACKAGE_XML/SETUP_PY) must survive as calls.
  assert.ok(c.after.includes('PACKAGE_XML('), 'untouched helper calls preserved');
  const { importData, cleanup } = materializeDataDir({ [c.path]: c.after });
  try {
    const wf = await importData('workspace-files.js');
    assert.ok(wf.WORKSPACE_FILES[somePath].endsWith('# studio test\n'));
    assert.equal(wf.WORKSPACE_FILES['ros2_ws/src/swayform_labs/studio_test.py'], 'print("hi")\n');
    assert.equal(Object.keys(wf.WORKSPACE_FILES).length, Object.keys(base.workspaceFiles).length + 1);
  } finally { cleanup(); }
});

test('validation catches broken references and bad terminal bounds', () => {
  const broken = structuredClone(base);
  broken.activities['finger-curl'].workspaceFile = 'ros2_ws/src/missing.py';
  broken.workspaceConfig.terminals = { min: 0, default: 9, max: 5, allowCreate: true, namePrefix: 'Shell' };
  const { errors } = validateModel(broken);
  assert.ok(errors.some((e) => e.msg.includes('missing.py')));
  assert.ok(errors.some((e) => e.where === 'terminal settings' && e.msg.includes('min')));
  assert.ok(errors.some((e) => e.where === 'terminal settings' && e.msg.includes('default')));
});

test('validation catches duplicate item ids', () => {
  const broken = structuredClone(base);
  const s = broken.curriculum.sections[0];
  s.items.push({ ...s.items[0] });
  const { errors } = validateModel(broken);
  assert.ok(errors.some((e) => e.msg.includes('duplicate item id')));
});
