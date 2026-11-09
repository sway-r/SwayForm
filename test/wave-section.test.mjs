import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, findSection, findItem } from '../portal/data/curriculum.js';
import { findActivity } from '../portal/data/learning-path.js';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { WAVE_QUIZ_ID } from '../portal/data/wave-section.js';
import { isCanonicalRobotPath } from '../portal/apps/learn/workspace/ros-paths.js';
import { validateAgainstCanonicalSource } from '../api/_lib/canonical-source.js';
import { unmetRobotGates } from '../portal/apps/learn/workspace/robot-gate.js';
import { readFileSync } from 'node:fs';

const BUILDER = 'swayform_ws/src/swayform_labs/wave_builder.py';
const REAL_WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const wave = findSection('wave');
const lab = (n) => wave.items[n - 1];
const blocksOf = (item) => item.steps.flatMap((s) => s.blocks);
const typesOf = (item) => new Set(blocksOf(item).map((b) => b.type));

// What a student writes for each marked gap, in lab order (the finished program).
const FILLS = [
  ['# TODO lab 2: import sleep from the time module so the wave can pause', 'from time import sleep'],
  ['# TODO lab 4: set WAVE_CYCLES (how many waves) and WAVE_DELAY_SECONDS (seconds per swing)', 'WAVE_CYCLES = 3\nWAVE_DELAY_SECONDS = 0.3'],
  ['# TODO lab 5: write open_hand(motion), it sets "right_hand" to the "open" pose',
    'def open_hand(motion: MotionClient) -> None:\n    motion.set_hand_pose("right_hand", "open")'],
  ['# TODO lab 5: write raise_arm(motion), it moves the "right_arm" group to RAISED_ARM',
    'def raise_arm(motion: MotionClient) -> None:\n    motion.move_joint_group("right_arm", RAISED_ARM)'],
  ['    # TODO lab 7: use a for loop to call wave_once(motion) WAVE_CYCLES times\n    pass',
    '    for _ in range(WAVE_CYCLES):\n        wave_once(motion)'],
  ['    # TODO lab 9: call open_hand, raise_arm, then wave, in that order\n    # TODO lab 10: wrap those calls in try and finally, and in finally move "right_arm" to HOME_ARM\n    pass',
    '    try:\n        open_hand(motion)\n        raise_arm(motion)\n        wave(motion)\n    finally:\n        motion.move_joint_group("right_arm", HOME_ARM)'],
];
const EM_DASH = String.fromCharCode(0x2014);
const todos = (text) => (text.match(/#\s*TODO/gi) || []).length;
const codeLines = (text) => text.split('\n').filter((l) => l.trim() !== '');

test('Wave is section 5 with 12 labs in the agreed format', () => {
  assert.equal(CURRICULUM.sections[4].id, 'wave');
  assert.equal(wave.items.length, 12);
  wave.items.forEach((item, i) => assert.equal(item.number, `5.${String(i + 1).padStart(2, '0')}`));
  assert.equal(findSection('behavior-sections').number, 6);
  assert.ok(lab(1).kind === 'reading' && !typesOf(lab(1)).has('mcq') && !typesOf(lab(1)).has('quiz'), 'lab 1 is a plain intro');
  [3, 8, 11].forEach((n) => assert.ok(typesOf(lab(n)).has('mcq') && lab(n).kind === 'reading', `lab ${n} is an mcq check`));
  assert.ok(typesOf(lab(6)).has('quiz') && lab(6).kind === 'reading');
  [2, 4, 5, 7, 9, 10].forEach((n) => assert.ok(lab(n).kind === 'activity' && lab(n).workspaceFile === BUILDER, `lab ${n} edits the builder`));
});

test('every activity resolves server-side, so progress writes are accepted', () => {
  wave.items.forEach((item) => assert.ok(findActivity(item.id), item.id));
  assert.equal(findItem(WAVE_QUIZ_ID).item.number, '5.06');
});

test('lab 6 quiz needs 80% and lab 12 is gated on it plus a finished builder', () => {
  const quiz = blocksOf(lab(6)).find((b) => b.type === 'quiz');
  assert.equal(quiz.passPercent, 80);
  assert.ok(quiz.questions.length >= 10);
  const gate = lab(12).robotGate;
  assert.deepEqual(gate.needsComplete.map((g) => g.id), [lab(6).id]);
  assert.deepEqual(gate.needsNoTodos.map((g) => g.path), [BUILDER]);
  assert.equal(lab(12).workspaceFile, REAL_WAVE);
  assert.ok(isCanonicalRobotPath(REAL_WAVE));
});

test('lab 12 stays locked until the quiz lab is complete and the builder has no TODO left', async () => {
  const starter = WORKSPACE_FILES[BUILDER];
  const finished = FILLS.reduce((text, [from, to]) => text.replace(from, to), starter);
  const read = (text) => () => text;
  const completed = (ids) => async () => ids;
  assert.equal((await unmetRobotGates(lab(12), read(starter), completed([]))).length, 2);
  assert.equal((await unmetRobotGates(lab(12), read(finished), completed([]))).length, 1, 'quiz missing');
  assert.equal((await unmetRobotGates(lab(12), read(starter), completed([WAVE_QUIZ_ID]))).length, 1, 'TODO left');
  assert.deepEqual(await unmetRobotGates(lab(12), read(finished), completed([WAVE_QUIZ_ID])), []);
  assert.equal((await unmetRobotGates(lab(12), read(finished), async () => { throw new Error('offline'); })).length, 1, 'unreadable progress keeps it shut');
  assert.deepEqual(await unmetRobotGates(lab(2), read(starter), completed([])), [], 'ordinary labs have no gate');
});

test('lab 12 queues the real wave.py: only WAVE_CYCLES = 5 is accepted', () => {
  const real = WORKSPACE_FILES[REAL_WAVE];
  assert.equal(validateAgainstCanonicalSource(REAL_WAVE, real.replace('WAVE_CYCLES = 1', 'WAVE_CYCLES = 5')).status, 'complete');
  assert.notEqual(validateAgainstCanonicalSource(REAL_WAVE, real).status, 'complete');
});

test('interactive blocks are well formed', () => {
  const unique = (list) => new Set(list).size === list.length;
  const checkQuestion = (q, where) => {
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${where}: answer index`);
    assert.ok(q.options.length >= 2 && unique(q.options), `${where}: options`);
    assert.ok(q.explain, `${where}: explain`);
  };
  let seen = 0;
  wave.items.forEach((item) => blocksOf(item).forEach((b, i) => {
    const where = `${item.id} block ${i}`;
    if (b.type === 'mcq'){ checkQuestion(b, where); seen++; }
    if (b.type === 'match'){
      assert.ok(b.pairs.length >= 2, where);
      assert.ok(unique(b.pairs.map((p) => p[1])), `${where}: right-hand texts must be unique`);
      seen++;
    }
    if (b.type === 'quiz'){ b.questions.forEach((q, qi) => checkQuestion(q, `${where} q${qi}`)); seen++; }
  }));
  assert.ok(seen >= 10);
});

test('wave_builder.py starts with 7 TODO notes and loses them lab by lab', () => {
  let text = WORKSPACE_FILES[BUILDER];
  assert.equal(todos(text), 7);
  assert.ok([...text.matchAll(/# TODO lab (\d+)/g)].every((m) => [2, 4, 5, 7, 9, 10].includes(Number(m[1]))));
  const expectedLeft = [6, 5, 3, 2, 0];
  const left = [];
  FILLS.forEach(([from, to]) => {
    assert.ok(text.includes(from), `starter changed, update FILLS: ${from.slice(0, 40)}`);
    text = text.replace(from, to);
    left.push(todos(text));
  });
  assert.deepEqual([left[0], left[1], left[3], left[4], left[5]], expectedLeft, 'counts the lessons promise after labs 2, 4, 5, 7, 10');
  assert.equal(todos(text), 0);
});

test('the student writes about 30% of the finished program', () => {
  const starter = WORKSPACE_FILES[BUILDER];
  let finished = starter;
  FILLS.forEach(([from, to]) => { finished = finished.replace(from, to); });
  const given = new Map();
  codeLines(starter).filter((l) => !/#\s*TODO/.test(l) && l.trim() !== 'pass').forEach((l) => given.set(l, (given.get(l) || 0) + 1));
  const finishedLines = codeLines(finished);
  const written = finishedLines.filter((l) => (given.get(l) > 0 ? (given.set(l, given.get(l) - 1), false) : true));
  const percent = (written.length / finishedLines.length) * 100;
  assert.ok(percent >= 25 && percent <= 35, `student share is ${percent.toFixed(1)}%`);
  assert.ok(finished.includes('def perform_wave') && !finished.includes('pass'));
});

test('new Wave files follow the repo writing rules (no em dashes)', () => {
  ['portal/data/wave-section.js', 'portal/apps/learn/interactive-blocks.js'].forEach((file) => {
    assert.ok(!readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').includes(EM_DASH), `${file} has an em dash`);
  });
  assert.ok(!WORKSPACE_FILES[BUILDER].includes(EM_DASH));
});
