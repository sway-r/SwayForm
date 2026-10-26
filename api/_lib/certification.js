/* Certificate rules: which labs are required, what counts as having done a
 * lab, and how the assessment questions are built. Everything here runs on
 * the server; correct answers never leave it. */
import { randomInt, randomBytes } from 'node:crypto';
import { CURRICULUM } from '../../portal/data/curriculum.js';

export const CERTIFICATES = {
  foundation: {
    key: 'foundation',
    code: 'FL',
    sectionId: 'foundation',
    program: 'Foundations of Humanoid Robotics',
  },
};

export const QUESTION_COUNT = 10;
export const PASS_MARK = 8;
export const SECONDS_PER_QUESTION = 50;
export const GRACE_SECONDS = 3;
export const RETRY_WAIT_MINUTES = 60;

/** Every lab in the certificate's section. Placeholders can never be finished, so they keep it locked. */
export function requiredLabs(key){
  const cert = CERTIFICATES[key];
  const section = cert && CURRICULUM.sections.find((s) => s.id === cert.sectionId);
  if (!section) return [];
  return section.items.map((item) => ({
    id: item.id,
    number: item.number,
    title: item.title,
    workspaceFile: item.workspaceFile || null,
    placeholder: item.kind === 'placeholder',
  }));
}

/**
 * A lab counts only if it was marked complete AND its own file ran
 * successfully on the robot. `completedIds` is a Set of activity ids,
 * `ranPaths` a Set of workspace paths with a succeeded robot job.
 */
export function evaluateLabs(key, completedIds, ranPaths){
  return requiredLabs(key).map((lab) => ({
    ...lab,
    done: !lab.placeholder && completedIds.has(lab.id),
    ran: !lab.placeholder && !!lab.workspaceFile && ranPaths.has(lab.workspaceFile),
  }));
}

export function labsUnlocked(labs){
  return labs.length > 0 && labs.every((lab) => lab.done && lab.ran);
}

/* ------------------------------------------------------------ question building */

const pick = (list) => list[randomInt(list.length)];
function shuffle(list){
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--){
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Builds a multiple-choice question with the correct option placed at a random spot. */
function multipleChoice(prompt, correct, distractors, extra = {}){
  const wrong = [...new Set(distractors.map(String))].filter((d) => d !== String(correct)).slice(0, 3);
  const options = shuffle([String(correct), ...wrong]);
  return { prompt, options, correctIndex: options.indexOf(String(correct)), ...extra };
}

const CONCEPT_BANK = [
  () => multipleChoice('In ROS 2, what is a node?',
    'A program that does one job and can talk to other nodes',
    ['A single wire inside the robot', 'A file that stores joint angles', 'A button in the Code Editor']),
  () => multipleChoice('How do ROS 2 nodes pass messages to each other without calling each other directly?',
    'By publishing and subscribing to topics',
    ['By editing each other’s files', 'By restarting the robot between messages', 'By typing commands into each other’s terminals']),
  () => multipleChoice('What does a publisher do?',
    'Sends messages out on a topic',
    ['Saves your code to the cloud', 'Draws the robot on screen', 'Checks your answers']),
  () => multipleChoice('Why do SwayForm labs keep joint angles between a minimum and a maximum?',
    'To keep the robot’s joints inside safe limits',
    ['To make the code run faster', 'To save battery power', 'Because Python cannot use large numbers']),
  () => multipleChoice('In a lab, what does time.sleep(1.0) do?',
    'Pauses the program for one second',
    ['Moves a joint by one degree', 'Turns the robot off for a minute', 'Skips the next line of code']),
  () => multipleChoice('Why is the "return the arm home" step placed in a finally: block?',
    'So it still runs if something goes wrong earlier',
    ['So it runs before everything else', 'So it only runs when the code fails', 'So the robot moves twice as fast']),
  () => multipleChoice('Which Python tool repeats wave_once() a set number of times?',
    'A for loop',
    ['An import statement', 'A comment', 'A function definition with no body']),
  () => multipleChoice('What does motion.move_joint("right_elbow", 60) ask the robot to do?',
    'Move the right elbow to 60 degrees',
    ['Wait 60 seconds', 'Move 60 joints at once', 'Open the right hand 60 percent']),
  () => multipleChoice('Before running code that moves the robot, what should you always do?',
    'Make sure the area around the robot is clear and you know how to stop it',
    ['Turn the volume up', 'Close the Textbook window', 'Reset your progress']),
  () => multipleChoice('A joint’s safe maximum is 45 but your code asks for 90. What should safe code do?',
    'Limit the angle to 45 before moving',
    ['Move to 90 anyway', 'Move to 135 to be sure', 'Ignore the limit when nobody is nearby']),
  () => multipleChoice('What does max(min(angle + STEP, MAX), MIN) accomplish?',
    'It keeps the new angle between MIN and MAX',
    ['It always returns STEP', 'It doubles the angle', 'It removes the angle from memory']),
  () => multipleChoice('In the keyboard labs, what is an if key == "LEFT": block for?',
    'Deciding what to do when the left arrow is pressed',
    ['Closing the program', 'Naming a joint', 'Counting how many keys exist']),
  () => multipleChoice('What does this loop print?\nfor number in [3, 2, 1]:\n    print(number)',
    '3, then 2, then 1',
    ['1, then 2, then 3', 'Only 3', '3 2 1 all on one line with no breaks between runs']),
  () => {
    const step = pick([5, 8, 10, 12]);
    const max = pick([30, 40, 45]);
    const start = max - randomInt(1, step);
    const expected = Math.min(start + step, max);
    return multipleChoice(
      `STEP = ${step}, TORSO_MAX = ${max}, and the angle is ${start}. The RIGHT key is pressed once and the code clamps to TORSO_MAX. What is the new angle?`,
      expected, [start + step, start, max + step, expected - 1],
    );
  },
  () => {
    const bend = pick([40, 50, 60, 70]);
    const hold = pick([1.0, 1.5, 2.0]);
    return multipleChoice(
      `A lab moves right_elbow to ${bend}, waits ${hold} seconds, then moves it back to 0. How long does the elbow stay at ${bend} before moving back?`,
      `${hold} seconds`, [`${bend} seconds`, `${hold * 2} seconds`, 'It never moves back'],
    );
  },
  () => multipleChoice('Where do you write and edit your lab code in the Learning Portal?',
    'In the Code Editor window',
    ['In the Settings window', 'In the Account window', 'In the browser address bar']),
];

const CONSTANT_RE = /^([A-Z][A-Z0-9_]{2,})\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:#.*)?$/gm;

function numericDistractors(value){
  const n = Number(value);
  const isInt = Number.isInteger(n);
  const step = isInt ? Math.max(1, Math.round(Math.abs(n) * 0.25) || 5) : 0.5;
  return [n + step, n - step, n * 2, n + step * 2].map((v) => (isInt ? Math.round(v) : Math.round(v * 10) / 10));
}

/**
 * Questions only this student can answer, built from their own robot runs.
 * `jobs` rows: { workspace_path, status, code, finished_at } newest-first not required.
 */
export function personalQuestions(labs, jobs, want){
  const byPath = new Map(labs.filter((l) => l.workspaceFile).map((l) => [l.workspaceFile, l]));
  const mine = jobs.filter((j) => byPath.has(j.workspace_path));
  const succeeded = mine.filter((j) => j.status === 'succeeded' && j.finished_at)
    .sort((a, b) => new Date(a.finished_at) - new Date(b.finished_at));
  const titles = labs.filter((l) => !l.placeholder).map((l) => l.title);
  const questions = [];

  const lastByLab = new Map();
  succeeded.forEach((j) => lastByLab.set(j.workspace_path, j));
  const distinctRan = [...lastByLab.keys()];

  if (succeeded.length >= 2 && new Set(succeeded.map((j) => j.workspace_path)).size >= 2){
    const latest = byPath.get(succeeded[succeeded.length - 1].workspace_path).title;
    questions.push(() => multipleChoice('Which lab did you run successfully on the robot most recently?', latest, shuffle(titles.filter((t) => t !== latest))));
    const first = byPath.get(succeeded[0].workspace_path).title;
    if (first !== latest) questions.push(() => multipleChoice('Which lab was your very first successful robot run?', first, shuffle(titles.filter((t) => t !== first))));
  }

  const counts = new Map();
  mine.filter((j) => ['succeeded', 'failed'].includes(j.status)).forEach((j) => counts.set(j.workspace_path, (counts.get(j.workspace_path) || 0) + 1));
  if (counts.size >= 2){
    const [topPath, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const unique = [...counts.values()].filter((c) => c === topCount).length === 1;
    if (unique){
      const top = byPath.get(topPath).title;
      questions.push(() => multipleChoice('Which lab took you the most robot runs, counting runs that did not work?', top, shuffle([...counts.keys()].map((p) => byPath.get(p).title).filter((t) => t !== top).concat(shuffle(titles.filter((t) => t !== top))))));
    }
    const [pickPath, pickCount] = pick([...counts.entries()]);
    const pickTitle = byPath.get(pickPath).title;
    questions.push(() => multipleChoice(`How many times did you run ${pickTitle} on the robot, counting runs that did not work?`, pickCount,
      [pickCount + 1, pickCount + 2, Math.max(0, pickCount - 1), pickCount + 3]));
  }

  const constants = [];
  distinctRan.forEach((path) => {
    const code = lastByLab.get(path).code || '';
    for (const m of code.matchAll(CONSTANT_RE)) constants.push({ lab: byPath.get(path).title, name: m[1], value: m[2] });
  });
  shuffle(constants).slice(0, 3).forEach((c) => {
    questions.push(() => multipleChoice(`In the code you last ran successfully for ${c.lab}, what is the value of ${c.name}?`, c.value, numericDistractors(c.value)));
  });

  return shuffle(questions).slice(0, want).map((make) => ({ ...make(), personal: true }));
}

export function buildQuestions(labs, jobs){
  const personal = personalQuestions(labs, jobs, Math.floor(QUESTION_COUNT / 2));
  const concept = shuffle(CONCEPT_BANK).slice(0, QUESTION_COUNT - personal.length).map((make) => make());
  return shuffle([...personal, ...concept]).map((q, i) => ({ ...q, id: i + 1 }));
}

/** What the browser is allowed to see. */
export function publicQuestion(question, index, total, secondsLeft){
  return { index, total, prompt: question.prompt, options: question.options, secondsLeft };
}

/* ------------------------------------------------------------ certificate ids */

const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newCertificateId(key){
  const cert = CERTIFICATES[key];
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
  return `SF-${cert.code}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function validCertificateId(value){
  return typeof value === 'string' && /^SF-[A-Z]{2}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(value);
}

export function cleanHolderName(value){
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  return /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,59}$/u.test(name) ? name : null;
}
