import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRICULUM, findSection, findItem, LAB_SECTION_IDS, nextItem } from '../portal/data/curriculum.js';
import { findActivity } from '../portal/data/learning-path.js';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { HANDSHAKE_QUIZ_ID, FIST_BUMP_QUIZ_ID } from '../portal/data/handshake-section.js';
import { setQuizAccount, recordQuizPass } from '../portal/services/quiz-passes.js';
import { isCanonicalRobotPath } from '../portal/apps/learn/workspace/ros-paths.js';
import { validateAgainstCanonicalSource } from '../api/_lib/canonical-source.js';
import { unmetRobotGates } from '../portal/apps/learn/workspace/robot-gate.js';

function storage(){
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
globalThis.localStorage ??= storage();

const LABS = 'swayform_ws/src/swayform_labs/';
const BEHAVIORS = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/';
const HS = `${LABS}handshake_builder.py`;
const FB = `${LABS}fist_bump_builder.py`;
const BK = `${LABS}beckon_builder.py`;
const category = findSection('behavior-sections');
const section = { items: category.items.filter((i) => i.group && i.group.id === 'greeting-gestures') };
const lab = (n) => section.items[n - 1];
const blocksOf = (item) => item.steps.flatMap((s) => s.blocks);
const typesOf = (item) => new Set(blocksOf(item).map((b) => b.type));
const todos = (text) => (text.match(/#\s*TODO/gi) || []).length;
const EM_DASH = String.fromCharCode(0x2014);

// What a student writes for each marked gap, in the order the labs ask for it.
const FILLS = {
  [HS]: [
    ['# TODO lab 1: import sleep from the time module so the handshake can pause', 'from time import sleep'],
    ['# TODO lab 1: set SHAKE_CYCLES (how many shakes) and HOLD_BEFORE_GRIP (seconds to wait before the grip)', 'SHAKE_CYCLES = 3\nHOLD_BEFORE_GRIP = 2.0'],
    ['# TODO lab 2: set REACH_SHOULDER and REACH_ELBOW, the reach angles in degrees', 'REACH_SHOULDER = 50\nREACH_ELBOW = 20'],
    ['    # TODO lab 2: move "right_shoulder" to REACH_SHOULDER, then "right_elbow" to REACH_ELBOW, one joint at a time',
      '    motion.move_joint("right_shoulder", REACH_SHOULDER)\n    motion.move_joint("right_elbow", REACH_ELBOW)'],
    ['        # TODO lab 3: call reach_forward, wait HOLD_BEFORE_GRIP seconds, then call grip and shake, in that order\n        pass',
      '        reach_forward(motion)\n        sleep(HOLD_BEFORE_GRIP)\n        grip(motion)\n        shake(motion)'],
    ['    # TODO lab 4: SHAKE_CYCLES times, move "right_elbow" up by SHAKE_OFFSET and then down by SHAKE_OFFSET, with a sleep after each move',
      '    for _ in range(SHAKE_CYCLES):\n        motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n        sleep(SHAKE_STEP_SECONDS)\n        motion.move_joint("right_elbow", REACH_ELBOW - SHAKE_OFFSET)\n        sleep(SHAKE_STEP_SECONDS)'],
    ['        # TODO lab 4: move the "right_arm" group to HOME_ARM and the "left_arm" group to LEFT_ARM_HOME',
      '        motion.move_joint_group("right_arm", HOME_ARM)\n        motion.move_joint_group("left_arm", LEFT_ARM_HOME)'],
  ],
  [FB]: [
    ['    # TODO lab 6: same shape as perform_handshake: in try, call raise_and_curl, wait HOLD_BEFORE_BUMP, then bump; in finally, call open_and_return\n    pass',
      '    try:\n        raise_and_curl(motion)\n        sleep(HOLD_BEFORE_BUMP)\n        bump(motion)\n    finally:\n        open_and_return(motion)'],
    ['# TODO lab 7: set FIST_ARM, the raised-fist pose: "right_shoulder" at 35 and "right_elbow" at 10', 'FIST_ARM = {"right_shoulder": 35, "right_elbow": 10}'],
    ['    # TODO lab 7: curl "right_hand" into the "fist" pose, then move the "right_arm" group to FIST_ARM over RAISE_SECONDS',
      '    motion.set_hand_pose("right_hand", "fist")\n    motion.move_joint_group("right_arm", FIST_ARM, seconds=RAISE_SECONDS)'],
    ['# TODO lab 8: set HOLD_BEFORE_BUMP, PUNCH_SECONDS and RECOIL_SECONDS, the three timings of the bump', 'HOLD_BEFORE_BUMP = 2.0\nPUNCH_SECONDS = 0.15\nRECOIL_SECONDS = 0.3'],
    ['    # TODO lab 9: move the "right_arm" group to PUNCH_ARM over PUNCH_SECONDS, then back to FIST_ARM over RECOIL_SECONDS',
      '    motion.move_joint_group("right_arm", PUNCH_ARM, seconds=PUNCH_SECONDS)\n    motion.move_joint_group("right_arm", FIST_ARM, seconds=RECOIL_SECONDS)'],
    ['    # TODO lab 9: if ENABLE_HEAD_NOD is True, move "head_pitch" to NOD_UP and then back to 0',
      '    if ENABLE_HEAD_NOD:\n        motion.move_joint("head_pitch", NOD_UP)\n        motion.move_joint("head_pitch", 0)'],
  ],
  [BK]: [
    ['# TODO lab 11: set BECKON_SHOULDER, WRIST_PALM_UP, FINGER_CURL and BECKON_CYCLES from your plan', 'BECKON_SHOULDER = 35\nWRIST_PALM_UP = 70\nFINGER_CURL = 60\nBECKON_CYCLES = 3'],
    ['# TODO lab 12: write raise_arm(motion), it swings the shoulder forward and turns the palm up; the elbow does not move',
      'def raise_arm(motion: MotionClient) -> None:\n    say("raising arm")\n    motion.move_joint("right_shoulder", BECKON_SHOULDER)\n    motion.move_joint("right_wrist", WRIST_PALM_UP)\n\n'],
    ['# TODO lab 12: write beckon(motion), it curls the four fingers in and back open, BECKON_CYCLES times',
      'def beckon(motion: MotionClient) -> None:\n    say("beckoning")\n    for _ in range(BECKON_CYCLES):\n        move_fingers(motion, FINGER_CURL)\n        sleep(CURL_SECONDS)\n        move_fingers(motion, 0)\n        sleep(CURL_SECONDS)\n\n'],
    ['# TODO lab 12: write perform_beckon(motion), it raises the arm and beckons, and in finally opens the fingers and sends the arm home',
      'def perform_beckon(motion: MotionClient) -> None:\n    try:\n        raise_arm(motion)\n        beckon(motion)\n    finally:\n        move_fingers(motion, 0)\n        motion.move_joint_group("right_arm", HOME_ARM)'],
  ],
};
const finished = (path) => FILLS[path].reduce((text, [from, to]) => text.replace(from, to), WORKSPACE_FILES[path]);

// Share of the finished program's code lines that the student wrote.
function studentShare(path){
  const codeLines = (text) => text.split('\n').filter((l) => l.trim() !== '');
  const given = new Map();
  codeLines(WORKSPACE_FILES[path]).filter((l) => !/#\s*TODO/.test(l) && l.trim() !== 'pass').forEach((l) => given.set(l, (given.get(l) || 0) + 1));
  const done = codeLines(finished(path));
  const written = done.filter((l) => (given.get(l) > 0 ? (given.set(l, given.get(l) - 1), false) : true));
  return (written.length / done.length) * 100;
}

test('Greeting Gestures is group 5.2 of Behavior Sections: handshake 1 to 5, fist bump 6 to 10, beckon 11 and 12', () => {
  assert.equal(CURRICULUM.sections.length, 5);
  assert.equal(CURRICULUM.sections[4], category);
  assert.equal(section.items[0].group.number, '5.2');
  assert.ok(category.sequential);
  assert.equal(section.items.length, 12);
  section.items.forEach((item, i) => assert.equal(item.number, `5.2.${String(i + 1).padStart(2, '0')}`));
  assert.deepEqual(section.items.map((i) => i.id.slice(0, 2)), ['hs', 'hs', 'hs', 'hs', 'hs', 'fb', 'fb', 'fb', 'fb', 'fb', 'bk', 'bk']);
  assert.equal(category.number, 5);
  assert.deepEqual(LAB_SECTION_IDS, ['foundation', 'behavior-sections']);
  assert.equal(nextItem('wv-06-run').id, lab(1).id, 'Wave hands over to Greeting Gestures');
  section.items.forEach((item) => assert.ok(findActivity(item.id), `${item.id} resolves server-side`));
});

test('every lab opens with a Summary that gives its estimated time, and is plain text without em dashes', () => {
  section.items.forEach((item) => {
    const [first, ...rest] = item.steps;
    assert.equal(first.id, 'summary', item.id);
    assert.ok(first.blocks[0].text.includes(item.estimatedTime), `${item.id}: Summary time matches the lab`);
    assert.ok(rest.every((s) => s.id !== 'summary'), item.id);
  });
  assert.ok(!readFileSync(new URL('../portal/data/handshake-section.js', import.meta.url), 'utf8').includes(EM_DASH));
  [HS, FB, BK].forEach((p) => assert.ok(!WORKSPACE_FILES[p].includes(EM_DASH), p));
});

test('labs 5 and 10 each hold one five-question quiz with a bigger bank, and no other lab has a quiz', () => {
  section.items.forEach((item, i) => {
    const quizzes = blocksOf(item).filter((b) => b.type === 'quiz');
    if (i + 1 === 5 || i + 1 === 10){
      assert.equal(quizzes.length, 1, item.id);
      const [q] = quizzes;
      assert.equal(q.id, i + 1 === 5 ? HANDSHAKE_QUIZ_ID : FIST_BUMP_QUIZ_ID);
      assert.equal(q.count, 5);
      assert.equal(q.passPercent, 80);
      assert.ok(q.questions.length > q.count, 'a retry is a different mix');
      q.questions.forEach((qq) => assert.ok(qq.review && findActivity(qq.review.id), `${q.id}: review points at a real lab`));
      assert.equal(new Set(q.questions.map((qq) => qq.question)).size, q.questions.length, 'no repeated question');
    } else {
      assert.equal(quizzes.length, 0, item.id);
    }
  });
});

test('questions are well formed multiple choice', () => {
  const unique = (list) => new Set(list).size === list.length;
  const check = (q, where) => {
    assert.ok(Array.isArray(q.options) && q.options.length >= 2 && unique(q.options), where);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, where);
    assert.ok(q.explain, where);
  };
  section.items.forEach((item) => blocksOf(item).forEach((b, i) => {
    if (b.type === 'mcq') check(b, `${item.id} ${i}`);
    if (b.type === 'quiz') b.questions.forEach((q, qi) => check(q, `${item.id} q${qi}`));
    if (b.type === 'match'){
      const rights = b.pairs.map((p) => p[1]);
      assert.ok(unique(rights), item.id);
      (b.distractors || []).forEach((d) => assert.ok(!rights.includes(d), `${item.id}: ${d}`));
    }
  }));
});

test('each builder loses its TODO notes in the order and counts the Check outputs promise', () => {
  const promised = { [HS]: [1, 2, 3, 4, 5, 6, 7], [FB]: [1, 2, 3, 4, 5, 6], [BK]: [1, 2, 3, 4] };
  for (const path of [HS, FB, BK]){
    let text = WORKSPACE_FILES[path];
    const total = todos(text);
    assert.equal(total, FILLS[path].length, path);
    const doneAfterEach = FILLS[path].map(([from, to]) => {
      assert.ok(text.includes(from), `starter changed, update FILLS: ${from.trim().slice(0, 50)}`);
      text = text.replace(from, to);
      return total - todos(text);
    });
    assert.deepEqual(doneAfterEach, promised[path], path);
    assert.ok(!/\bpass$/m.test(text) && todos(text) === 0, `${path} finished`);
  }
  // The lessons print the same counts, in the same order.
  const printed = (file) => section.items.flatMap(blocksOf)
    .filter((b) => b.type === 'terminal' && b.lines[0].startsWith(`Progress on ${file}`))
    .map((b) => Number(b.lines[0].match(/(\d+) of \d+ pieces/)[1]));
  assert.deepEqual(printed('handshake_builder.py'), promised[HS]);
  assert.deepEqual(printed('fist_bump_builder.py'), promised[FB]);
  assert.deepEqual(printed('beckon_builder.py'), promised[BK]);
});

test('students write about 30% of the handshake and fist bump, and more of the beckon challenge', () => {
  const hs = studentShare(HS), fb = studentShare(FB), bk = studentShare(BK);
  assert.ok(hs >= 25 && hs <= 35, `handshake share ${hs.toFixed(1)}%`);
  assert.ok(fb >= 25 && fb <= 35, `fist bump share ${fb.toFixed(1)}%`);
  assert.ok(bk > hs && bk > fb, `beckon share ${bk.toFixed(1)}% should be the biggest`);
});

test('the finished beckon never moves the elbow, as the requirements say', () => {
  const text = finished(BK);
  assert.ok(!/move_joint\("right_elbow"/.test(text));
  const solutions = blocksOf(lab(12)).filter((b) => b.type === 'reveal').map((b) => b.solution.code.code).join('\n');
  assert.ok(!/right_elbow/.test(solutions));
  assert.match(JSON.stringify(lab(11)), /elbow does not move/);
});

test('every line a lesson points at is the line it shows', () => {
  const keyOf = (line) => (line.match(/^\s*([A-Za-z_]\w*)\s*=/) || [])[1];
  section.items.flatMap(blocksOf).filter((b) => b.type === 'code' && b.workspaceFile && b.line).forEach((b) => {
    const fileLine = WORKSPACE_FILES[b.workspaceFile].split('\n')[b.line - 1];
    const first = b.code.split('\n')[0];
    if (b.filename.startsWith('Write in')) assert.match(fileLine, /# TODO lab \d+/, `${b.filename} line ${b.line}`);
    else if (b.filename.startsWith('Edit in')) assert.equal(keyOf(fileLine), keyOf(first), `${b.filename} line ${b.line}`);
    else assert.equal(fileLine, first, `${b.filename} line ${b.line}`);
  });
});

test('labs 5 and 10 queue the real behavior once the quiz is passed and the builder is finished', async () => {
  const read = (text) => () => text;
  const none = async () => [];
  for (const [n, builder, quiz] of [[5, HS, HANDSHAKE_QUIZ_ID], [10, FB, FIST_BUMP_QUIZ_ID]]){
    setQuizAccount({ email: `fresh-${n}@example.test` });
    assert.equal((await unmetRobotGates(lab(n), read(WORKSPACE_FILES[builder]), none)).length, 2, `lab ${n}: nothing done`);
    assert.equal((await unmetRobotGates(lab(n), read(finished(builder)), none)).length, 1, `lab ${n}: quiz still needed`);
    recordQuizPass(quiz);
    assert.deepEqual(await unmetRobotGates(lab(n), read(finished(builder)), none), [], `lab ${n}: clear`);
  }
  assert.deepEqual(await unmetRobotGates(lab(12), read(finished(BK)), none), []);
  assert.equal((await unmetRobotGates(lab(12), read(WORKSPACE_FILES[BK]), none)).length, 1);
});

test('the robot runs accept exactly what the labs ask for', () => {
  const hs = `${BEHAVIORS}handshake.py`, fb = `${BEHAVIORS}fist_bump.py`;
  assert.equal(lab(5).workspaceFile, hs);
  assert.equal(lab(10).workspaceFile, fb);
  assert.ok(isCanonicalRobotPath(hs) && isCanonicalRobotPath(fb));
  assert.equal(validateAgainstCanonicalSource(hs, WORKSPACE_FILES[hs].replace('SHAKE_CYCLES = 1', 'SHAKE_CYCLES = 3')).status, 'complete');
  assert.equal(validateAgainstCanonicalSource(fb, WORKSPACE_FILES[fb].replace('ENABLE_HEAD_NOD = False', 'ENABLE_HEAD_NOD = True')).status, 'complete');
  const bk = `${BEHAVIORS}beckon.py`;
  assert.ok(isCanonicalRobotPath(bk));
  assert.ok(lab(12).extraFiles.includes(bk));
  assert.equal(validateAgainstCanonicalSource(bk, WORKSPACE_FILES[bk].replace(/^BECKON_CYCLES = 1\b/m, 'BECKON_CYCLES = 3')).status, 'complete');
  const untouched = validateAgainstCanonicalSource(bk, WORKSPACE_FILES[bk]);
  assert.deepEqual([untouched.status, untouched.tunable], ['not_started', { name: 'BECKON_CYCLES', from: '1', to: '3' }]);
  assert.equal(validateAgainstCanonicalSource(bk, WORKSPACE_FILES[bk].replace(/^BECKON_CYCLES = 1\b/m, 'BECKON_CYCLES = 9')).status, 'tampered');
});

test('Behavior Sections labs never show a Terminal window', async () => {
  const src = readFileSync(new URL('../portal/apps/learn/views/activity-workspace.js', import.meta.url), 'utf8');
  assert.match(src, /NO_TERMINAL_SECTIONS = new Set\(\['behavior-sections'\]\)/);
  assert.equal(findItem(lab(1).id).section.id, 'behavior-sections');
});
