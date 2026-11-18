import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, findSection, findItem } from '../portal/data/curriculum.js';
import { findActivity } from '../portal/data/learning-path.js';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { WAVE_QUIZ_ID, WAVE_FINAL_QUIZ_ID } from '../portal/data/wave-section.js';
import { setQuizAccount, recordQuizPass, hasPassedQuiz, startQuizTry, finishQuizTry, lastQuizTry, nextQuizTryAt, QUIZ_WAIT_MINUTES } from '../portal/services/quiz-passes.js';
import { isCanonicalRobotPath } from '../portal/apps/learn/workspace/ros-paths.js';
import { validateAgainstCanonicalSource } from '../api/_lib/canonical-source.js';
import { unmetRobotGates } from '../portal/apps/learn/workspace/robot-gate.js';
import { readFileSync } from 'node:fs';

// quiz-passes.js keeps the final-quiz pass in localStorage, which node has no
// business having; the smallest stub that lets the real module run unchanged.
function storage(){
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
globalThis.localStorage = storage();
// Passes are stored per account, so switching accounts is how a test gets a
// student who has not passed the final quiz yet.
const finalQuizPassed = (passed) => {
  setQuizAccount({ email: passed ? 'passed@example.test' : 'fresh@example.test' });
  if (passed) recordQuizPass(WAVE_FINAL_QUIZ_ID);
};

const BUILDER = 'swayform_ws/src/swayform_labs/wave_builder.py';
const REAL_WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const wave = { items: findSection('behavior-sections').items.filter((i) => i.group && i.group.id === 'wave') };
const lab = (n) => wave.items[n - 1];
const blocksOf = (item) => item.steps.flatMap((s) => s.blocks);
const typesOf = (item) => new Set(blocksOf(item).map((b) => b.type));

// What a student writes for each marked gap, in lab order (the finished program).
const FILLS = [
  ['# TODO lab 2: import sleep from the time module so the wave can pause', 'from time import sleep'],
  ['# TODO lab 2: set WAVE_CYCLES (how many waves) and WAVE_DELAY_SECONDS (seconds per swing)', 'WAVE_CYCLES = 3\nWAVE_DELAY_SECONDS = 0.3'],
  ['# TODO lab 3: write open_hand(motion), it sets "right_hand" to the "open" pose',
    'def open_hand(motion: MotionClient) -> None:\n    motion.set_hand_pose("right_hand", "open")'],
  ['# TODO lab 3: write raise_arm(motion), it moves the "right_arm" group to RAISED_ARM',
    'def raise_arm(motion: MotionClient) -> None:\n    motion.move_joint_group("right_arm", RAISED_ARM)'],
  ['    # TODO lab 4: use a for loop to call wave_once(motion) WAVE_CYCLES times\n    pass',
    '    for _ in range(WAVE_CYCLES):\n        wave_once(motion)'],
  ['    # TODO lab 5: call open_hand, raise_arm, then wave, in that order\n    # TODO lab 5: wrap those calls in try and finally, and in finally move "right_arm" to HOME_ARM\n    pass',
    '    try:\n        open_hand(motion)\n        raise_arm(motion)\n        wave(motion)\n    finally:\n        motion.move_joint_group("right_arm", HOME_ARM)'],
];
const EM_DASH = String.fromCharCode(0x2014);
const todos = (text) => (text.match(/#\s*TODO/gi) || []).length;
const codeLines = (text) => text.split('\n').filter((l) => l.trim() !== '');

test('Wave is group 5.1 of Behavior Sections, with 6 labs in the agreed format', () => {
  assert.equal(CURRICULUM.sections[4].id, 'behavior-sections');
  assert.equal(wave.items.length, 6);
  wave.items.forEach((item, i) => assert.equal(item.number, `5.1.${String(i + 1).padStart(2, '0')}`));
  assert.equal(findSection('behavior-sections').number, 5);
  assert.ok(lab(1).kind === 'reading' && !typesOf(lab(1)).has('mcq') && !typesOf(lab(1)).has('quiz'), 'lab 1 is a plain intro');
  [2, 4, 5].forEach((n) => assert.ok(typesOf(lab(n)).has('mcq'), `lab ${n} has mcq checks`));
  [4, 5].forEach((n) => assert.ok(typesOf(lab(n)).has('troubleshoot') && typesOf(lab(n)).has('reveal'), `lab ${n} keeps its bug hunts and reveals`));
  assert.ok(!typesOf(lab(6)).has('mcq'), 'lab 6 opens with a review, not questions');
  assert.ok(typesOf(lab(3)).has('quiz') && typesOf(lab(6)).has('quiz'), 'labs 3 and 6 each have a quiz');
  [2, 3, 4, 5].forEach((n) => assert.ok(lab(n).kind === 'activity' && lab(n).workspaceFile === BUILDER, `lab ${n} edits the builder`));
});

test('every activity resolves server-side, so progress writes are accepted', () => {
  wave.items.forEach((item) => assert.ok(findActivity(item.id), item.id));
  assert.equal(findItem(WAVE_QUIZ_ID).item.number, '5.1.03');
});

test('lab 3 quiz needs 80% and lab 6 is gated on it plus a finished builder', () => {
  const quiz = blocksOf(lab(3)).find((b) => b.type === 'quiz');
  assert.equal(quiz.passPercent, 80);
  assert.equal(quiz.count, 10);
  assert.ok(quiz.questions.length > quiz.count, 'the bank is bigger than one try, so a retry is a different mix');
  const gate = lab(6).robotGate;
  assert.deepEqual(gate.needsComplete.map((g) => g.id), [lab(3).id]);
  assert.deepEqual(gate.needsQuiz.map((g) => g.id), [WAVE_FINAL_QUIZ_ID]);
  assert.deepEqual(gate.needsNoTodos.map((g) => g.path), [BUILDER]);
  assert.equal(lab(6).workspaceFile, REAL_WAVE);
  assert.ok(isCanonicalRobotPath(REAL_WAVE));
});

test('lab 6 stays locked until the quiz lab, the final quiz and the builder are all done', async () => {
  const starter = WORKSPACE_FILES[BUILDER];
  const finished = FILLS.reduce((text, [from, to]) => text.replace(from, to), starter);
  const read = (text) => () => text;
  const completed = (ids) => async () => ids;

  finalQuizPassed(false);
  assert.equal((await unmetRobotGates(lab(6), read(starter), completed([]))).length, 3, 'nothing done yet');
  assert.equal((await unmetRobotGates(lab(6), read(finished), completed([WAVE_QUIZ_ID]))).length, 1, 'final quiz alone keeps it shut');

  finalQuizPassed(true);
  assert.equal((await unmetRobotGates(lab(6), read(finished), completed([]))).length, 1, 'quiz lab missing');
  assert.equal((await unmetRobotGates(lab(6), read(starter), completed([WAVE_QUIZ_ID]))).length, 1, 'TODO left');
  assert.deepEqual(await unmetRobotGates(lab(6), read(finished), completed([WAVE_QUIZ_ID])), [], 'all three met');
  assert.equal((await unmetRobotGates(lab(6), read(finished), async () => { throw new Error('offline'); })).length, 1, 'unreadable progress keeps it shut');
  assert.deepEqual(await unmetRobotGates(lab(2), read(starter), completed([])), [], 'ordinary labs have no gate');
});

test('lab 6 queues the real wave.py: only WAVE_CYCLES = 5 is accepted', () => {
  const real = WORKSPACE_FILES[REAL_WAVE];
  assert.equal(validateAgainstCanonicalSource(REAL_WAVE, real.replace('WAVE_CYCLES = 1', 'WAVE_CYCLES = 5')).status, 'complete');
  assert.notEqual(validateAgainstCanonicalSource(REAL_WAVE, real).status, 'complete');
});

test('interactive blocks are well formed', () => {
  const unique = (list) => new Set(list).size === list.length;
  // Quiz questions and mcq blocks are all multiple choice.
  const checkQuestion = (q, where) => {
    assert.ok(!q.type || q.type === 'mcq', `${where}: quizzes hold multiple choice only`);
    assert.ok(Array.isArray(q.options) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${where}: answer index`);
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
    if (b.type === 'quiz'){
      b.questions.forEach((q, qi) => {
        checkQuestion(q, `${where} q${qi}`);
        assert.ok(q.review && findActivity(q.review.id) && q.review.label, `${where} q${qi}: review must point at a real lab`);
      });
      assert.ok(unique(b.questions.map((q) => q.question)), `${where}: repeated question`);
      assert.ok(b.count < b.questions.length, `${where}: the bank must be bigger than one try`);
      assert.ok(b.id && b.title && b.prepare, `${where}: a quiz needs an id, a title and what to prepare`);
      seen++;
    }
  }));
  assert.ok(seen >= 10);
});

test('wave_builder.py starts with 7 TODO notes and loses them lab by lab', () => {
  let text = WORKSPACE_FILES[BUILDER];
  assert.equal(todos(text), 7);
  assert.ok([...text.matchAll(/# TODO lab (\d+)/g)].every((m) => [2, 3, 4, 5].includes(Number(m[1]))));
  const expectedLeft = [6, 5, 3, 2, 0];
  const left = [];
  FILLS.forEach(([from, to]) => {
    assert.ok(text.includes(from), `starter changed, update FILLS: ${from.slice(0, 40)}`);
    text = text.replace(from, to);
    left.push(todos(text));
  });
  assert.deepEqual([left[0], left[1], left[3], left[4], left[5]], expectedLeft, 'counts the lessons promise after each Your Turn step in labs 2 to 5');
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
  ['portal/data/wave-section.js', 'portal/apps/learn/interactive-blocks.js', 'portal/services/quiz-passes.js'].forEach((file) => {
    assert.ok(!readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').includes(EM_DASH), `${file} has an em dash`);
  });
  assert.ok(!WORKSPACE_FILES[BUILDER].includes(EM_DASH));
});

test('with LABS_LOCKED on (at launch), Wave labs open one at a time', async () => {
  const { blockingItem, itemStatus, prevInSection, nextInSection } = await import('../portal/data/curriculum.js');
  const ids = wave.items.map((i) => i.id);
  const on = true;
  assert.equal(blockingItem(ids[0], [], on), null, 'lab 1 is always open');
  assert.equal(blockingItem(ids[1], [], on).id, ids[0], 'lab 2 waits on lab 1');
  assert.equal(blockingItem(ids[3], ids.slice(0, 2), on).id, ids[2], 'a gap anywhere before keeps it locked');
  assert.equal(blockingItem(ids[3], ids.slice(0, 3), on), null);
  assert.equal(blockingItem(ids[5], [ids[5]], on), null, 'a lab already complete stays open');
  assert.equal(itemStatus(lab(1), [], null, on), 'open');
  assert.equal(itemStatus(lab(1), [], { activityId: ids[0] }, on), 'progress');
  assert.equal(itemStatus(lab(2), [ids[0]], null, on), 'progress', 'the open, unfinished lab after a finished one is in progress');
  assert.equal(itemStatus(lab(3), [ids[0]], null, on), 'locked');
  assert.equal(itemStatus(lab(1), [ids[0]], null, on), 'done');
  assert.equal(prevInSection(ids[0]), null);
  assert.equal(prevInSection(ids[1]).id, ids[0]);
  assert.equal(nextInSection(ids[5]).id, 'hs-01-meet-the-handshake', 'Next goes on to the next behavior section');
  assert.equal(blockingItem('timed-torso-rotation', [], on), null, 'sections without locks are unchanged');
});

test('with LABS_LOCKED off (until launch), every lab is open to everyone', async () => {
  const { blockingItem, itemStatus, LABS_LOCKED } = await import('../portal/data/curriculum.js');
  const ids = wave.items.map((i) => i.id);
  ids.forEach((id) => assert.equal(blockingItem(id, [], false), null, id));
  assert.equal(itemStatus(lab(3), [ids[0]], null, false), 'open', 'nothing shows as locked');
  assert.equal(itemStatus(lab(2), [ids[0]], null, false), 'open', 'only the lab being worked on shows in progress');
  assert.equal(itemStatus(lab(2), [ids[0]], { activityId: ids[1] }, false), 'progress');
  assert.equal(blockingItem(ids[5], []) === null, !LABS_LOCKED, 'the default follows the switch');
});

test('match distractors are wrong answers, never a copy of a right one', () => {
  wave.items.forEach((item) => blocksOf(item).filter((b) => b.type === 'match' && b.distractors).forEach((b) => {
    const rights = new Set(b.pairs.map((p) => p[1]));
    b.distractors.forEach((d) => assert.ok(!rights.has(d), `${item.id}: ${d}`));
  }));
  assert.ok(!JSON.stringify(lab(2)).includes('move_joint'), 'lab 2 no longer asks about move_joint');
});

test('every Wave lab opens with an unnumbered Summary that gives the estimated time', () => {
  wave.items.forEach((item) => {
    const [first, ...rest] = item.steps;
    assert.equal(first.id, 'summary', `${item.id} opens with its Summary`);
    assert.ok(first.blocks[0].text.includes(item.estimatedTime), `${item.id}: Summary time matches the lab`);
    assert.ok(rest.every((s) => s.id !== 'summary'), `${item.id}: only one Summary`);
  });
});

test('a quiz try means a wait before the next one, and a pass is kept', () => {
  setQuizAccount({ email: 'tries@example.test' });
  const id = WAVE_QUIZ_ID;
  const min = 60000;
  assert.equal(nextQuizTryAt(id), 0, 'no try yet, no wait');
  startQuizTry(id, 1000);
  assert.equal(nextQuizTryAt(id), 1000 + QUIZ_WAIT_MINUTES * min, 'a try left without submitting counts from its start');
  assert.equal(lastQuizTry(id).endedAt, undefined);
  finishQuizTry(id, 60, 1000 + 7 * min);
  assert.equal(nextQuizTryAt(id), 1000 + (7 + QUIZ_WAIT_MINUTES) * min, 'a submitted try counts from the submit');
  assert.deepEqual(lastQuizTry(id), { startedAt: 1000, endedAt: 1000 + 7 * min, percent: 60 });
  assert.equal(QUIZ_WAIT_MINUTES, 15);
  assert.ok(!hasPassedQuiz(id));
  recordQuizPass(id);
  assert.ok(hasPassedQuiz(id));
  setQuizAccount({ email: 'someone-else@example.test' });
  assert.ok(!hasPassedQuiz(id) && nextQuizTryAt(id) === 0, 'tries and passes are per account');
});
