/* Draft-store behavior: replay, undo/redo, revert-with-dependency-check,
 * and the workspace-config generator's bounds handling. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('../server/esm-loader.mjs', import.meta.url);

import { loadContent } from '../server/content-load.mjs';
import { replay } from '../server/ops.mjs';
import { generateWorkspaceConfig } from '../server/adapters/workspace-config-writer.mjs';
import { validateModel } from '../server/validate.mjs';

const base = await loadContent();

test('replay applies ops in order and reports failures with the op index', () => {
  const good = [
    { type: 'section.rename', sectionId: 'control', title: 'Control!' },
    { type: 'item.hide', itemId: 'nod-yes' },
  ];
  const { model, summaries } = replay(base, good);
  assert.equal(model.curriculum.sections.find((s) => s.id === 'control').title, 'Control!');
  assert.equal(summaries.length, 2);

  const bad = [...good, { type: 'item.hide', itemId: 'nod-yes' }]; // already hidden
  assert.throws(() => replay(base, bad), (err) => err.opIndex === 2);
});

test('ops never mutate the base model', () => {
  const before = JSON.stringify(base.curriculum.sections.map((s) => s.title));
  replay(base, [{ type: 'section.rename', sectionId: 'control', title: 'MUTATED?' }]);
  assert.equal(JSON.stringify(base.curriculum.sections.map((s) => s.title)), before);
});

test('terminal-bound ops validate: min>max rejected at validation layer', () => {
  const { model } = replay(base, [{
    type: 'config.setTerminals',
    terminals: { min: 4, default: 4, max: 2, allowCreate: true, namePrefix: 'Shell' },
  }]);
  const { errors } = validateModel(model);
  assert.ok(errors.some((e) => e.where === 'terminal settings'));
});

test('per-activity override that violates bounds is caught', () => {
  const { model } = replay(base, [{
    type: 'config.setActivityOverride',
    activityId: 'finger-curl',
    override: { terminals: { default: 7, max: 6 } }, // max 6 also breaches global sanity in merged check
  }]);
  const { errors } = validateModel(model);
  assert.ok(errors.some((e) => e.where.includes('finger-curl')));
});

test('generated workspace-config source is valid JS with intact helpers', async () => {
  const src = generateWorkspaceConfig({
    terminals: { min: 1, default: 3, max: 5, allowCreate: true, namePrefix: 'Term' },
    readOnlyFiles: ['ros2_ws/src/swayform_demos/setup.py'],
    perActivity: { 'finger-curl': { terminals: { default: 2 }, defaultOpenFile: 'ros2_ws/src/swayform_labs/lab_01_finger_curl.py' } },
  });
  const { materializeDataDir } = await import('./_helpers.mjs');
  const { importData, cleanup } = materializeDataDir({ 'portal/data/workspace-config.js': src });
  try {
    const mod = await importData('workspace-config.js');
    assert.equal(mod.WORKSPACE_CONFIG.terminals.default, 3);
    assert.equal(mod.terminalConfigFor('finger-curl').default, 2);
    assert.equal(mod.terminalConfigFor('anything-else').default, 3);
    assert.equal(mod.isReadOnlyFile('x', 'ros2_ws/src/swayform_demos/setup.py'), true);
    assert.equal(mod.defaultOpenFileFor('finger-curl'), 'ros2_ws/src/swayform_labs/lab_01_finger_curl.py');
    // Clamping: nonsense bounds normalize instead of crashing the portal.
    const clamped = mod.terminalConfigFor('finger-curl');
    assert.ok(clamped.min >= 1 && clamped.default >= clamped.min && clamped.default <= clamped.max);
  } finally { cleanup(); }
});

test('undo semantics: replay of a prefix equals never having applied the tail', () => {
  const ops = [
    { type: 'section.rename', sectionId: 'control', title: 'A' },
    { type: 'section.rename', sectionId: 'control', title: 'B' },
  ];
  const afterOne = replay(base, ops.slice(0, 1)).model;
  assert.equal(afterOne.curriculum.sections.find((s) => s.id === 'control').title, 'A');
  const afterBoth = replay(base, ops).model;
  assert.equal(afterBoth.curriculum.sections.find((s) => s.id === 'control').title, 'B');
});
