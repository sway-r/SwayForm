/* Greeting Gestures, behavior section 2 (12 labs): handshake, fist bump and beckon. Group 6 (Greeting Gestures) of Behavior Sections in curriculum.js; see README.md, "Section 2: Greeting Gestures". */

const HS_BUILDER = 'swayform_ws/src/swayform_labs/handshake_builder.py';
const FB_BUILDER = 'swayform_ws/src/swayform_labs/fist_bump_builder.py';
const BK_BUILDER = 'swayform_ws/src/swayform_labs/beckon_builder.py';
const BEHAVIORS = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/';
const REAL_HANDSHAKE = `${BEHAVIORS}handshake.py`;
const REAL_FIST_BUMP = `${BEHAVIORS}fist_bump.py`;
const REAL_BECKON = `${BEHAVIORS}beckon.py`;

// Each behavior's last lab has a 5-question quiz; Queue on Robot stays locked until it is passed.
export const HANDSHAKE_QUIZ_ID = 'hs-05-quiz';
export const FIST_BUMP_QUIZ_ID = 'fb-10-quiz';
const QUIZ_PASS = 80;

const REVIEW = {
  meet: { id: 'hs-01-meet-the-handshake', label: 'Lab 1, Meet the Handshake' },
  joints: { id: 'hs-02-joint-control', label: 'Lab 2, Joint Control' },
  sequence: { id: 'hs-03-sequencing', label: 'Lab 3, Movement Sequencing' },
  coordination: { id: 'hs-04-coordination', label: 'Lab 4, Coordination' },
  realHandshake: { id: 'hs-05-run', label: 'Lab 5, Your Program and the Real One' },
  reuse: { id: 'fb-06-from-handshake', label: 'Lab 6, From Handshake to Fist Bump' },
  positions: { id: 'fb-07-positions', label: 'Lab 7, New Joint Positions' },
  timing: { id: 'fb-08-timing', label: 'Lab 8, Timing' },
  finish: { id: 'fb-09-finish', label: 'Lab 9, The Finishing Move' },
  realFistBump: { id: 'fb-10-run', label: 'Lab 10, Your Program and the Real One' },
  safety: { id: 'safety-first', label: 'Safety and Ground Rules' },
};

// Every lab opens with an unnumbered Summary: how long it takes and what it covers.
const summary = (time, text, items) => ({
  id: 'summary', title: 'Summary',
  blocks: [
    { type: 'p', text: `**Estimated time to completion:** ${time}` },
    { type: 'p', text },
    ...(items ? [{ type: 'list', items }] : []),
  ],
});

// What Check prints with `done` of a file's `total` pieces written (checkActiveFile in code-editor-app.js).
const checkOutput = (file, total, done) => ({
  type: 'terminal', label: 'Output', lines: done < total
    ? [`Progress on ${file}: ${'▰'.repeat(done)}${'▱'.repeat(total - done)}  ${done} of ${total} pieces done`, 'Nice work :)']
    : [`Progress on ${file}: ${'▰'.repeat(total)}  ${total} of ${total} pieces done`, `Check passed: no TODO markers remain in ${file}. Nice work.`],
});
const hsCheck = (done) => checkOutput('handshake_builder.py', 7, done);
const fbCheck = (done) => checkOutput('fist_bump_builder.py', 6, done);
const bkCheck = (done) => checkOutput('beckon_builder.py', 4, done);

// What Run prints for a builder file (buildRunSequence in mock-shell.js).
const runOutput = (name, finished) => ({
  type: 'terminal', label: 'Output', lines: [
    `$ ros2 run swayform_labs ${name}`,
    `[INFO] [${name}]: node started`,
    '[INFO] Connecting to motion controller...',
    finished ? `[INFO] [${name}]: all required values are set` : `[WARN] [${name}]: one or more # TODO sections are still unfinished`,
  ],
});

// What the output panel shows for an approved robot run, with the behavior's own prints in the middle.
const queueOutput = (prints) => ({
  type: 'terminal', label: 'Output', lines: [
    'Queued, position 1 in line. An admin will review and approve it before it runs on the real robot.',
    'An admin approved it, waiting for the robot to pick it up.',
    'Running on the real robot now…',
    ...prints,
    'Succeeded.',
  ],
});

const resetTip = (file, firstLab) => ({ type: 'callout', tone: 'tip', label: 'Deleted too much?', text: `Don't worry. Press Ctrl+Z (Cmd+Z on a Mac) to undo. If you want to start over completely, click **Reset** above the code, but keep in mind that Reset puts the whole of \`${file}\` back the way it was before lab ${firstLab}, so you would fill in the earlier pieces again. The Show Solution in each lab has its piece.` });
const HS_RESET = resetTip('handshake_builder.py', 1);
const FB_RESET = resetTip('fist_bump_builder.py', 6);
const BK_RESET = resetTip('beckon_builder.py', 11);

const ROBOT_SAFETY = { type: 'callout', tone: 'safety', label: 'Safety', text: 'A real arm is about to move. Never touch, hold or push a powered arm. If anything looks wrong, stop the program and keep your hands clear. Only run it with an instructor in the room.' };

const STUCK = (builder) => ({
  type: 'troubleshoot', items: [
    { symptom: 'Queue on Robot stays locked', cause: 'One of the gates is not met yet.', fix: `Click Run. It names what is missing: the quiz in this lab, or a TODO still in ${builder}.` },
    { symptom: 'Run says the code does not match', cause: 'Something other than the one setting was changed.', fix: 'Click Reset to put the file back, then change only the line this lab asks for.' },
    { symptom: 'It sits in the queue for a long time', cause: 'An admin has not approved it yet.', fix: 'Tell your instructor it is waiting. The robot will not move until it is approved.' },
  ],
});

export const HANDSHAKE_LEVEL = {
  id: 'handshake-section', number: 10, title: 'Greeting Gestures',
  description: 'The second behavior section: three arm behaviors built on one movement structure.',
  sections: [
    {
      id: 'handshake-labs', title: 'Greeting Gestures', difficulty: 'beginner', estimatedTime: '5 to 6 hours',
      description: 'Twelve labs. Build a handshake, reuse its structure for a fist bump, then plan and write a beckon on your own.',
      activities: [

        // Lab 1
        {
          id: 'hs-01-meet-the-handshake', title: 'Meet the Handshake', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 to 25 minutes',
          summary: 'What Greeting Gestures builds, a quick review of the Wave ideas, and the first two pieces of the handshake program.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Behaviors', 'Review', 'Imports', 'Variables'],
          steps: [
            summary('20 to 25 minutes', 'In this lab, you are going to meet Greeting Gestures, the second behavior section, go over what you learned in Wave, and start your handshake program. You will:', [
              'See the three behaviors of this section, and the one structure they share.',
              'Review the six ideas from Wave: imports, settings, functions, loops, order and cleanup.',
              'Write the first two pieces of `handshake_builder.py`.',
            ]),
            {
              id: 'one-structure', title: 'One Structure, Three Behaviors',
              blocks: [
                { type: 'p', text: "In Wave, you built one behavior. In this section, you are going to build three of them: a **handshake**, a **fist bump** and a **beckon**. But here's the trick: all three are built the same way." },
                { type: 'p', text: "In simple terms, every one of them follows the same three steps:" },
                { type: 'code', lang: 'text', filename: 'The structure of every behavior in this section', code: 'get the arm into a pose\n  ↓\ndo the finishing move\n  ↓\ncome back home', copy: false },
                { type: 'p', text: "What changes from one behavior to the next is the pose, the timing, and the finishing move. Here is the plan:" },
                { type: 'table', headers: ['Labs', 'Behavior', 'You learn'], rows: [
                  ['1 to 5', 'Handshake', 'Joint control, movement sequencing and coordination. Lab 5 has a quiz and the robot run.'],
                  ['6 to 10', 'Fist Bump', 'Reusing the handshake structure with new positions, new timing and a new finishing move. Lab 10 has a quiz and the robot run.'],
                  ['11 and 12', 'Beckon', 'Planning a behavior from its requirements, and then writing it on your own.'],
                ] },
              ],
            },
            {
              id: 'the-handshake', title: 'The Handshake',
              blocks: [
                { type: 'p', text: "Let's start with the handshake. Have a look at it on the real robot:" },
                { type: 'video', src: '/videos/vertical-handshake.mp4', poster: '/images/vertical-handshake-poster.jpg', ratio: '1:1', caption: 'SwayForm shaking hands.' },
                { type: 'p', text: "As you can see, the arm reaches out, waits a moment, closes the hand, shakes, and then lets go. Written as a recipe, it looks like this:" },
                { type: 'code', lang: 'text', filename: 'The recipe for a handshake', code: 'go home\n  ↓\nopen the hand and reach forward\n  ↓\nwait a moment\n  ↓\nclose the hand gently\n  ↓\nshake\n  ↓\nlet go and go home', copy: false },
                { type: 'p', text: "By the end of lab 4, every one of these steps will be a working part of your program." },
              ],
            },
            {
              id: 'wave-review', title: 'Quick Review: What You Learned in Wave',
              blocks: [
                { type: 'p', text: "Before we write anything new, let's go over the six ideas from Wave. You are going to use every single one of them in this section:" },
                { type: 'table', headers: ['Idea', 'What to remember'], rows: [
                  ['Imports', 'Tools come in at the top of the file, like `from time import sleep`.'],
                  ['Settings', 'A name in CAPITAL LETTERS holds a value you are allowed to change.'],
                  ['Functions', '`def` teaches a move. A call, the name followed by brackets, runs it.'],
                  ['Loops', 'A `for` loop repeats its indented lines a set number of times.'],
                  ['Order', 'Lines run from top to bottom, so the steps have to be in the right order.'],
                  ['Cleanup', '`finally` runs no matter what, so the robot always ends in a safe place.'],
                ] },
                { type: 'p', text: "If any of these doesn't ring a bell, have a look at the Wave section again before you go on." },
              ],
            },
            {
              id: 'review-questions', title: 'Quick Questions: Wave Review',
              blocks: [
                { type: 'p', text: "Let's make sure everything is fresh. Pick an answer for each question. If it is wrong, it greys out and you can try another one." },
                { type: 'mcq', question: 'What does `from time import sleep` give your program?', options: ['A way to pause', 'A way to move the arm', 'A faster robot', 'A new setting'], answer: 0, explain: 'It brings in sleep, which makes the program wait for a number of seconds.' },
                { type: 'mcq', question: 'You wrote `def grip(motion):` but nothing calls it. What happens?', options: ['The hand never closes', 'The hand closes on its own', 'Python stops with an error', 'The hand closes twice'], answer: 0, explain: 'Defining a function teaches the move. Only a call runs it.' },
                { type: 'mcq', question: 'With `for _ in range(3):` and one indented line under it, how many times does that line run?', options: ['3', '1', '2', '4'], answer: 0, explain: 'range(3) repeats exactly 3 times.' },
                { type: 'mcq', question: 'Where should the line that sends the arm home go?', options: ['Under `finally:`', 'Under `try:`, at the end', 'Before `try:`', 'Nowhere, the robot goes home on its own'], answer: 0, explain: 'Under finally, it runs even if something goes wrong halfway.' },
              ],
            },
            {
              id: 'open-the-file', title: 'Open the File',
              blocks: [
                { type: 'p', text: "Now, let's open the file that you are going to finish during labs 1 to 4. Click **Open handshake_builder.py** below, or find it in the explorer of the Code Editor." },
                { type: 'code', lang: 'python', filename: 'The top of handshake_builder.py', workspaceFile: HS_BUILDER, line: 1, copy: false, code: 'from swayform.motion import MotionClient\n# TODO lab 1: import sleep from the time module so the handshake can pause\n\n# TODO lab 1: set SHAKE_CYCLES (how many shakes) and HOLD_BEFORE_GRIP (seconds to wait before the grip)\n...' },
                { type: 'p', text: "Just like in Wave, about 70% of the program is already written, and every spot that you have to write starts with `# TODO`. This time, there are **7** of them:" },
                { type: 'table', headers: ['Lab', 'You write'], rows: [
                  ['1', 'The import for sleep, and two settings'],
                  ['2', 'The reach angles, and the moves that reach forward'],
                  ['3', 'The handshake steps, in order'],
                  ['4', 'The shake, and the return of both arms'],
                ] },
              ],
            },
            {
              id: 'add-the-import', title: 'Your Turn: Add the Import',
              blocks: [
                { type: 'p', text: "Have a look at the file. The handshake needs to wait before it grips, but nothing imports `sleep`. Let's fix that first. Replace the first `# TODO lab 1` line with the import:" },
                { type: 'code', lang: 'python', filename: 'Write in handshake_builder.py', workspaceFile: HS_BUILDER, line: 2, code: 'from time import sleep', copy: false },
                { type: 'p', text: "Now, click **Check** in the Code Editor. You should get something similar to this:" },
                hsCheck(1),
                { type: 'p', text: "As you can see, you have written 1 of the 7 pieces. Still says 0? Make sure the whole `# TODO lab 1` line is gone." },
              ],
            },
            {
              id: 'add-the-settings', title: 'Your Turn: Add Two Settings',
              blocks: [
                { type: 'p', text: "Now, find the other `# TODO lab 1` note, and replace that line with two settings:" },
                { type: 'list', items: [
                  '`SHAKE_CYCLES`: how many times the hand shakes. Use **3**.',
                  '`HOLD_BEFORE_GRIP`: how many seconds the hand waits, open, before it closes. Use **2.0**.',
                ] },
                { type: 'p', text: "Click **Check** again. You should get something similar to this:" },
                hsCheck(2),
                HS_RESET,
                { type: 'reveal', hint: 'Two lines, each one `NAME = value`. Seconds can have a decimal point.', solution: { text: 'The import and the two settings:', code: { lang: 'python', filename: 'handshake_builder.py', code: 'from time import sleep\n...\nSHAKE_CYCLES = 3\nHOLD_BEFORE_GRIP = 2.0' } } },
                { type: 'p', text: "That's it for the warm-up. In the next lab, you are going to learn how to move one joint at a time!" },
              ],
            },
          ],
          completionSummary: { text: 'You know what this section builds, you went over the Wave ideas, and you wrote the first two pieces of the handshake.', conceptsUsed: ['Imports', 'Variables'] },
        },

        // Lab 2
        {
          id: 'hs-02-joint-control', title: 'Joint Control', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 minutes',
          summary: 'What a joint is, how angles work, and how to move one joint at a time to make the arm reach forward.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Joints', 'Angles', 'Limits', 'Variables'],
          steps: [
            summary('25 minutes', 'In this lab, you are going to learn how the robot moves one joint at a time. You will:', [
              'Learn what a joint is, and which joints the handshake uses.',
              'See how angles work, and why every joint has a safe range.',
              'Write the reach angles, and the two moves that make the arm reach forward.',
            ]),
            {
              id: 'what-is-a-joint', title: 'What Is a Joint?',
              blocks: [
                { type: 'p', text: "A **joint** is a place where the robot bends or turns, just like your shoulder or your elbow. Each joint on SwayForm is turned by a small motor called a **servo**. You tell a servo an angle, and it turns until it gets there." },
                { type: 'p', text: "The handshake uses these joints of the right arm:" },
                { type: 'terms', items: [
                  { term: 'right_shoulder', def: 'Swings the whole arm forward and back.' },
                  { term: 'right_elbow', def: 'Bends and opens the forearm.' },
                  { term: 'right_hand', def: 'The fingers and the thumb, moved together as a hand pose, like "open".' },
                  { term: 'left_shoulder', def: 'The other arm. It swings back while the right arm reaches.' },
                ] },
              ],
            },
            {
              id: 'angles', title: 'Angles, in Degrees',
              blocks: [
                { type: 'p', text: "In `handshake_builder.py`, every angle is measured in **degrees** away from the rest pose. So 0 means the joint is resting, and a bigger number means it has moved further away from rest." },
                { type: 'table', headers: ['Code', 'What the robot does'], rows: [
                  ['`motion.move_joint("right_shoulder", 0)`', 'The shoulder goes back to rest.'],
                  ['`motion.move_joint("right_shoulder", 50)`', 'The arm swings 50 degrees forward, a reach.'],
                  ['`motion.move_joint("right_elbow", 20)`', 'The forearm opens up 20 degrees from rest.'],
                ] },
                { type: 'p', text: "As you can see, `move_joint` takes two things: the name of the joint, and the angle that it should go to. One call, one joint." },
              ],
            },
            {
              id: 'safe-ranges', title: 'Every Joint Has a Safe Range',
              blocks: [
                { type: 'p', text: "Your elbow can't bend backwards, right? Well, the robot's joints can't either. Every servo has a smallest and a largest angle that it is allowed to reach, called its **limits**. In the real `handshake.py`, they are written down in a setting called `LIMITS`." },
                { type: 'p', text: "So, what do you think would happen if you asked for an angle past the limit? The robot keeps the joint inside its safe range, so the arm stops at the limit instead of breaking something. But that also means your move would not look the way you planned!" },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'Use the angles that each lab gives you. They are tested on the real robot.' },
              ],
            },
            {
              id: 'match-the-joint', title: 'Match the Joint to Its Job',
              blocks: [
                { type: 'p', text: "Let's make sure this is clear. Pick what each line does:" },
                { type: 'match', prompt: 'Pick what each line does.', pairs: [
                  ['`move_joint("right_shoulder", 50)`', 'Swings the right arm forward'],
                  ['`move_joint("right_elbow", 20)`', 'Opens the forearm a little'],
                  ['`move_joint("right_shoulder", 0)`', 'Brings the shoulder back to rest'],
                  ['`set_hand_pose("right_hand", "open")`', 'Opens the fingers and the thumb'],
                ], distractors: [
                  'Swings the left arm forward',
                  'Moves the arm for 50 seconds',
                ], explain: 'move_joint names one joint and one angle. A hand pose moves the whole hand at once.' },
              ],
            },
            {
              id: 'add-the-angles', title: 'Your Turn: The Reach Angles',
              blocks: [
                { type: 'p', text: "Now, it's your turn. Find the `# TODO lab 2` note near the top of the file, and replace it with two settings:" },
                { type: 'list', items: [
                  '`REACH_SHOULDER`: how far the shoulder swings forward. Use **50**.',
                  '`REACH_ELBOW`: how far the elbow opens. Use **20**.',
                ] },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                hsCheck(3),
              ],
            },
            {
              id: 'reach-forward', title: 'Your Turn: Reach Forward',
              blocks: [
                { type: 'p', text: "Now, let's use those angles. Open `reach_forward` in your file. This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 21, copy: false, code: 'def reach_forward(motion: MotionClient) -> None:\n    say("reaching forward")\n    motion.set_hand_pose("right_hand", "open")\n    motion.move_joint_group("left_arm", LEFT_ARM_BACK)\n    # TODO lab 2: move "right_shoulder" to REACH_SHOULDER, then "right_elbow" to REACH_ELBOW, one joint at a time' },
                { type: 'p', text: "Replace the `# TODO lab 2` line with two `move_joint` calls: first the shoulder, then the elbow. Keep them indented, so they stay inside the function. Then, click **Check**. You should get something similar to this:" },
                hsCheck(4),
                HS_RESET,
                { type: 'reveal', hint: 'Each call is `motion.move_joint(...)` with the joint name in quotes and the setting that holds its angle.', solution: { text: 'The two angles, and the two moves:', code: { lang: 'python', filename: 'handshake_builder.py', code: 'REACH_SHOULDER = 50\nREACH_ELBOW = 20\n...\n    motion.move_joint("right_shoulder", REACH_SHOULDER)\n    motion.move_joint("right_elbow", REACH_ELBOW)' } } },
              ],
            },
            {
              id: 'in-the-real-file', title: 'In the Real handshake.py',
              blocks: [
                { type: 'p', text: "By the way, the real `handshake.py` reaches forward the same way, just with more detail. Have a look at `reach_forward` in the real file:" },
                { type: 'code', lang: 'python', filename: 'From the real handshake.py', workspaceFile: REAL_HANDSHAKE, line: 86, copy: false, code: 'def reach_forward(ctrl):\n    reach_target = CENTERS[(PCA_REACH, SHOULDER_PITCH)] + REACH_PITCH_OFFSET\n    ...' },
                { type: 'p', text: "As you can see, it also swings the shoulder forward by a setting, `REACH_PITCH_OFFSET`, which is **50**. Same idea, same number!" },
              ],
            },
            {
              id: 'joint-questions', title: 'Quick Questions: Joints',
              blocks: [
                { type: 'p', text: "Finally, let's check what you learned about joints." },
                { type: 'mcq', question: 'In `handshake_builder.py`, what does an angle of 0 mean?', options: ['The joint is at rest', 'The joint is at its limit', 'The joint is switched off', 'The joint turns forever'], answer: 0, explain: 'Every angle is measured from the rest pose, so 0 is rest.' },
                { type: 'mcq', question: 'How many joints does one `move_joint` call move?', options: ['One', 'Two', 'Every joint in the arm', 'None, it only checks the angle'], answer: 0, explain: 'move_joint names one joint and one angle.' },
                { type: 'mcq', question: 'Why does every joint have limits?', options: ['So it never turns past what it can safely reach', 'To make the robot faster', 'To save battery', 'Python needs them to run'], answer: 0, explain: 'Limits keep each joint inside its safe range.' },
              ],
            },
          ],
          completionSummary: { text: 'You learned what joints and angles are, and you made the arm reach forward one joint at a time.', conceptsUsed: ['Joints', 'Angles', 'Limits'] },
        },

        // Lab 3
        {
          id: 'hs-03-sequencing', title: 'Movement Sequencing', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 to 25 minutes',
          summary: 'Put the handshake moves in order, with a pause in the right place, inside try and finally.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Sequences', 'Pauses', 'Function calls', 'try / finally'],
          steps: [
            summary('20 to 25 minutes', 'In this lab, you are going to put the moves of the handshake in order. You will:', [
              'See a behavior as a sequence of poses, with pauses between them.',
              'Find out why the pause before the grip matters.',
              'Write the handshake steps, in order, inside `try`.',
            ]),
            {
              id: 'a-sequence', title: 'A Sequence of Poses',
              blocks: [
                { type: 'p', text: "In simple terms, a robot behavior is a **sequence**: a list of poses, done one after the other, with pauses between them. You already met this idea in Wave. The robot does exactly what you wrote, from top to bottom." },
                { type: 'p', text: "Here is the handshake as a sequence:" },
                { type: 'steps', items: [
                  '**Reach forward** with an open hand (`reach_forward`).',
                  '**Wait** `HOLD_BEFORE_GRIP` seconds, so the other person can take the hand.',
                  '**Grip** gently (`grip`).',
                  '**Shake** (`shake`).',
                  '**Let go** and go home. This one goes under `finally`, and it is already written for you.',
                ] },
              ],
            },
            {
              id: 'pauses', title: 'Pauses Are Steps Too',
              blocks: [
                { type: 'p', text: "So, what do you think would happen without the pause? Let's find out. Have a look at this sequence:" },
                { type: 'code', lang: 'python', filename: 'No pause', code: 'reach_forward(motion)\ngrip(motion)', copy: false },
                { type: 'p', text: "The hand closes the very moment the arm arrives. Nobody had time to take it, so the robot grips the air! A pause is a step too, even though nothing moves:" },
                { type: 'code', lang: 'python', filename: 'With a pause', code: 'reach_forward(motion)\nsleep(HOLD_BEFORE_GRIP)\ngrip(motion)', copy: false },
                { type: 'p', text: "As you can see, `sleep` sits between the two moves, exactly where the wait belongs." },
              ],
            },
            {
              id: 'order-bug-hunt', title: 'Bug Hunt: Order Edition',
              blocks: [
                { type: 'p', text: "Three robots got their handshake mixed up. Read what each one did, guess what went wrong, and then open the box to check:" },
                { type: 'troubleshoot', items: [
                  { symptom: 'Robot 1 reached forward with a closed hand', cause: '`grip` came before `reach_forward`.', fix: 'Call `reach_forward` first, then wait, then `grip`.' },
                  { symptom: 'Robot 2 shook its arm before closing the hand', cause: '`shake` came before `grip`.', fix: 'Grip first, then shake.' },
                  { symptom: 'Robot 3 gripped the air', cause: 'There was no `sleep(HOLD_BEFORE_GRIP)` between the reach and the grip.', fix: 'Add the pause right after `reach_forward`.' },
                ] },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn: The Handshake in Order',
              blocks: [
                { type: 'p', text: "Let's put it into practice. Open `perform_handshake` in your file. This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 44, copy: false, code: 'def perform_handshake(motion: MotionClient) -> None:\n    try:\n        # TODO lab 3: call reach_forward, wait HOLD_BEFORE_GRIP seconds, then call grip and shake, in that order\n        pass\n    finally:\n        let_go(motion)\n        # TODO lab 4: ...' },
                { type: 'p', text: "Replace the `# TODO lab 3` line, and the `pass` below it, with four lines under `try`: the reach, the pause, the grip and the shake. Leave the `# TODO lab 4` line alone, that one is for the next lab." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                hsCheck(5),
                HS_RESET,
                { type: 'reveal', hint: 'Three calls, each one a name followed by (motion), and one sleep between the first two.', solution: { text: 'The steps, in order:', code: { lang: 'python', filename: 'handshake_builder.py', code: '    try:\n        reach_forward(motion)\n        sleep(HOLD_BEFORE_GRIP)\n        grip(motion)\n        shake(motion)' } } },
              ],
            },
            {
              id: 'run-it', title: 'Run It',
              blocks: [
                { type: 'p', text: "Now, click **Run**. You should get something similar to this:" },
                runOutput('handshake_builder', false),
                { type: 'p', text: "As you can see, Run still warns you, because two pieces are left. That is exactly what the next lab is for." },
              ],
            },
            {
              id: 'sequence-questions', title: 'Quick Questions: Sequencing',
              blocks: [
                { type: 'mcq', question: 'Why does the handshake wait before it grips?', options: ['So the other person has time to take the hand', 'So the servo can cool down', 'Python needs a pause after every move', 'It does not, the pause is optional'], answer: 0, explain: 'Without it, the hand closes the moment it arrives and grips the air.' },
                { type: 'mcq', question: 'The calls are `grip`, then `reach_forward`. What does the robot do?', options: ['It closes the hand, then reaches out with a closed hand', 'A normal handshake', 'Python stops with an error', 'It skips the grip'], answer: 0, explain: 'The robot does exactly what is written, top to bottom.' },
                { type: 'mcq', question: 'Why is `let_go` under `finally`?', options: ['So the hand always opens, even if something fails', 'So it runs first', 'So it runs twice', 'It makes the shake faster'], answer: 0, explain: 'finally runs no matter what, so the robot never stays holding on.' },
              ],
            },
          ],
          completionSummary: { text: 'You put the handshake steps in order, with the pause where it belongs.', conceptsUsed: ['Sequences', 'Pauses', 'Function calls'] },
        },

        // Lab 4
        {
          id: 'hs-04-coordination', title: 'Coordination', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 to 30 minutes',
          summary: 'Make joints and arms work together: the shake, and the return of both arms. This finishes the handshake program.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Coordination', 'Joint groups', 'Loops', 'Timing'],
          steps: [
            summary('25 to 30 minutes', 'In this lab, you are going to make the joints work together, and finish the handshake program. You will:', [
              'See why the left arm moves while the right arm reaches.',
              'Learn the difference between moving one joint and moving a group of joints.',
              'Write the shake, and the return of both arms.',
            ]),
            {
              id: 'two-arms', title: 'Two Arms, One Move',
              blocks: [
                { type: 'p', text: "Have a look at `reach_forward` again. There is a line in it that moves the **left** arm:" },
                { type: 'code', lang: 'python', filename: 'From handshake_builder.py', code: 'motion.move_joint_group("left_arm", LEFT_ARM_BACK)', copy: false },
                { type: 'p', text: "Why would a handshake move the other arm? Well, when the right arm reaches out, the robot's weight shifts forward. The left arm swings back a little to balance it, the same way you swing one arm back when you reach far with the other one. This is called **coordination**: different parts of the robot moving together for one goal." },
              ],
            },
            {
              id: 'groups', title: 'One Joint or a Group',
              blocks: [
                { type: 'p', text: "So far, you used two ways of moving the arm:" },
                { type: 'table', headers: ['Code', 'What it moves'], rows: [
                  ['`motion.move_joint("right_elbow", 20)`', 'One joint, to one angle.'],
                  ['`motion.move_joint_group("right_arm", HOME_ARM)`', 'Every joint in the group, together. `HOME_ARM` holds an angle for each one.'],
                ] },
                { type: 'p', text: "A group move is how you make joints arrive **together**. The real `handshake.py` does the same thing: it starts several joints at once, so the shoulder, the elbow and the left arm all move at the same time." },
              ],
            },
            {
              id: 'the-shake', title: 'The Shake: A Small Move, Repeated',
              blocks: [
                { type: 'p', text: "Now, let's look at the shake. It is a small move, repeated. The elbow goes a little up, a little down, again and again, around its reach angle. In fact, the real elbow only moves **5 degrees** each way. Small, but that is what a handshake is!" },
                { type: 'p', text: "With `REACH_ELBOW = 20` and `SHAKE_OFFSET = 5`, the elbow goes like this:" },
                { type: 'table', headers: ['Move', 'Angle'], rows: [
                  ['up', '`REACH_ELBOW + SHAKE_OFFSET`, which is 25'],
                  ['down', '`REACH_ELBOW - SHAKE_OFFSET`, which is 15'],
                  ['(repeat `SHAKE_CYCLES` times)', ''],
                  ['settle', '`REACH_ELBOW`, which is 20. This line is already in the file.'],
                ] },
                { type: 'p', text: "And between the moves, a short `sleep(SHAKE_STEP_SECONDS)` gives the shake its rhythm. Without it, the moves would blur into one." },
              ],
            },
            {
              id: 'write-the-shake', title: 'Your Turn: Write the Shake',
              blocks: [
                { type: 'p', text: "Open `shake` in your file, and replace the `# TODO lab 4` line with a `for` loop that repeats `SHAKE_CYCLES` times. Inside the loop, move the elbow up, sleep, move it down, and sleep again." },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 33, copy: false, code: 'def shake(motion: MotionClient) -> None:\n    say("shaking")\n    # TODO lab 4: SHAKE_CYCLES times, move "right_elbow" up by SHAKE_OFFSET and then down by SHAKE_OFFSET, with a sleep after each move\n    motion.move_joint("right_elbow", REACH_ELBOW)' },
                { type: 'p', text: "Remember, only the indented lines are inside the loop. Click **Check**. You should get something similar to this:" },
                hsCheck(6),
                { type: 'reveal', hint: 'The loop is `for _ in range(SHAKE_CYCLES):`, with four indented lines under it. The angles are REACH_ELBOW plus and minus SHAKE_OFFSET.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'handshake_builder.py', code: 'def shake(motion: MotionClient) -> None:\n    say("shaking")\n    for _ in range(SHAKE_CYCLES):\n        motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n        sleep(SHAKE_STEP_SECONDS)\n        motion.move_joint("right_elbow", REACH_ELBOW - SHAKE_OFFSET)\n        sleep(SHAKE_STEP_SECONDS)\n    motion.move_joint("right_elbow", REACH_ELBOW)' } } },
              ],
            },
            {
              id: 'both-arms-home', title: 'Your Turn: Both Arms Home',
              blocks: [
                { type: 'p', text: "One piece left! The right arm reached out, and the left arm swung back. So, at the end, **both** of them have to come home. Find the last `# TODO lab 4` line, under `finally` in `perform_handshake`, and replace it with two group moves: the right arm to `HOME_ARM`, and the left arm to `LEFT_ARM_HOME`." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                hsCheck(7),
                HS_RESET,
                { type: 'reveal', hint: 'Two lines, each one `motion.move_joint_group(...)` with a group name in quotes and the pose setting.', solution: { text: 'The end of perform_handshake:', code: { lang: 'python', filename: 'handshake_builder.py', code: '    finally:\n        let_go(motion)\n        motion.move_joint_group("right_arm", HOME_ARM)\n        motion.move_joint_group("left_arm", LEFT_ARM_HOME)' } } },
              ],
            },
            {
              id: 'run-it', title: 'Run the Finished Program',
              blocks: [
                { type: 'p', text: "7 of 7! Your handshake program is complete. Click **Run**. You should get something similar to this:" },
                runOutput('handshake_builder', true),
                { type: 'p', text: "As you can see, every required value is set. Keep in mind that this Run is a simulation. The real robot runs in lab 5." },
              ],
            },
            {
              id: 'coordination-questions', title: 'Quick Questions: Coordination',
              blocks: [
                { type: 'mcq', question: 'With `REACH_ELBOW = 20` and `SHAKE_OFFSET = 5`, which two angles does the shake swing between?', options: ['25 and 15', '20 and 5', '25 and 20', '5 and -5'], answer: 0, explain: 'The elbow goes SHAKE_OFFSET above and below REACH_ELBOW.' },
                { type: 'mcq', question: 'What is the difference between `move_joint` and `move_joint_group`?', options: ['One joint, or several joints that move together', 'There is no difference', 'move_joint is faster', 'move_joint_group only works on the left arm'], answer: 0, explain: 'A group move sends every joint in the group at once.' },
                { type: 'mcq', question: 'Why does the left arm swing back while the right arm reaches?', options: ['To balance the robot', 'To wave at someone', 'Because it has to copy the right arm', 'It does not move at all'], answer: 0, explain: 'Swinging the other arm back keeps the robot steady while it reaches.' },
              ],
            },
          ],
          completionSummary: { text: 'You made the joints work together, wrote the shake, and finished the handshake program.', conceptsUsed: ['Coordination', 'Joint groups', 'Loops'] },
        },

        // Lab 5
        {
          id: 'hs-05-run', title: 'Handshake Review, Quiz and Robot Run', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 to 30 minutes',
          summary: 'A review of labs 1 to 4, a five-question quiz, then the real handshake on SwayForm. Needs a finished handshake_builder.py, 80% on the quiz, and an admin to approve.',
          workspaceFile: REAL_HANDSHAKE,
          extraFiles: [HS_BUILDER],
          robotGate: {
            needsQuiz: [{ id: HANDSHAKE_QUIZ_ID, text: `Pass the quiz in this lab with ${QUIZ_PASS}% or better.` }],
            needsNoTodos: [{ path: HS_BUILDER, text: 'Finish handshake_builder.py. It still has # TODO notes (labs 1 to 4).' }],
          },
          relatedConcepts: ['Behaviors', 'Review', 'Safety'],
          steps: [
            summary('20 to 30 minutes', 'In this lab, you are going to review labs 1 to 4, pass a short quiz, and then send a handshake to the real robot. You will:', [
              'See how your `handshake_builder.py` lines up with the real `handshake.py`.',
              'Pass the five-question quiz with 80% or better.',
              'Change one setting in `handshake.py`, and queue the handshake on SwayForm.',
            ]),
            {
              id: 'review', title: 'Last-Minute Review',
              blocks: [
                { type: 'table', headers: ['Idea', 'What to remember'], rows: [
                  ['Joint control (lab 2)', '`move_joint` moves one joint to one angle. Angles are in degrees, and every joint has a safe range.'],
                  ['Sequencing (lab 3)', 'The moves run in order, and a pause is a step too.'],
                  ['Coordination (lab 4)', 'A group move sends several joints together, and the left arm balances the right one.'],
                  ['Cleanup', 'Under `finally`, the hand lets go and both arms come home, no matter what.'],
                ] },
              ],
            },
            {
              id: 'your-program-and-the-real-one', title: 'Your Program and the Real One',
              blocks: [
                { type: 'p', text: "The robot does not run `handshake_builder.py`. It runs the real `handshake.py`, which follows the same recipe with all the motor details filled in. Here is how the pieces line up:" },
                { type: 'table', headers: ['Your handshake_builder.py', 'The real handshake.py'], rows: [
                  ['reach_forward', 'reach_forward'],
                  ['sleep(HOLD_BEFORE_GRIP)', 'time.sleep(HOLD_BEFORE_GRIP)'],
                  ['grip', 'grip'],
                  ['shake (your loop)', 'shake'],
                  ['let_go + both arms home', 'open_and_return'],
                ] },
                { type: 'p', text: "Open the real file from the explorer, and read `shake`. You will find the same `for` loop that you wrote, with `SHAKE_CYCLES` and `SHAKE_OFFSET`." },
              ],
            },
            {
              id: 'the-quiz', title: 'The Quiz',
              blocks: [
                { type: 'p', text: "And now, the quiz! It has five questions on labs 1 to 4. You need 80% or better, so 4 out of 5, to unlock the robot run." },
                { type: 'quiz', id: HANDSHAKE_QUIZ_ID, title: 'Handshake Quiz', passPercent: QUIZ_PASS, count: 5, prepare: 'Go over joints and angles (lab 2), the order of the steps (lab 3), and the shake and the group moves (lab 4). The review table at the top of this lab has the key ideas.', questions: [
                  { question: 'What does `motion.move_joint("right_elbow", 20)` do?', options: ['Moves the right elbow to 20 degrees from rest', 'Moves every joint 20 degrees', 'Bends the elbow for 20 seconds', 'Moves the right elbow 20 times'], answer: 0, explain: 'One joint, one angle, in degrees from rest.', review: REVIEW.joints },
                  { question: 'In `handshake_builder.py`, what does an angle of 0 mean?', options: ['The joint is at rest', 'The joint is at its limit', 'The joint is off', 'The joint turns forever'], answer: 0, explain: 'Every angle is measured from the rest pose.', review: REVIEW.joints },
                  { question: 'Why does every joint have limits?', options: ['So it never turns past what it can safely reach', 'To make it faster', 'To save battery', 'Python needs them'], answer: 0, explain: 'Limits keep every joint in its safe range.', review: REVIEW.joints },
                  { question: 'Why does the handshake wait `HOLD_BEFORE_GRIP` seconds before it grips?', options: ['So the other person can take the hand', 'So the servos can cool down', 'Python pauses after every move', 'It makes the shake longer'], answer: 0, explain: 'Without the pause, the hand closes on the air.', review: REVIEW.sequence },
                  { question: 'The calls are `grip`, then `reach_forward`. What happens?', options: ['The hand closes first, then the arm reaches out with a closed hand', 'A normal handshake', 'Python stops with an error', 'The robot skips the reach'], answer: 0, explain: 'The robot does exactly what is written, top to bottom.', review: REVIEW.sequence },
                  { question: 'With `SHAKE_CYCLES = 3`, how many times does the elbow go up and down?', options: ['3', '1', '6', '5'], answer: 0, explain: 'The loop runs once for each cycle, and each cycle is one up and one down.', review: REVIEW.coordination },
                  { question: 'With `REACH_ELBOW = 20` and `SHAKE_OFFSET = 5`, which angles does the shake swing between?', options: ['25 and 15', '20 and 5', '25 and 20', '15 and 5'], answer: 0, explain: 'It goes SHAKE_OFFSET above and below the reach angle.', review: REVIEW.coordination },
                  { question: 'What does `move_joint_group` do that `move_joint` does not?', options: ['Moves several joints together', 'Moves faster', 'Ignores the limits', 'Moves the robot forward on the floor'], answer: 0, explain: 'A group move sends every joint in the group at once.', review: REVIEW.coordination },
                  { question: 'Why do both arms go home under `finally`?', options: ['So the robot always ends in a safe pose, even after a crash', 'So they go home first', 'So the shake repeats', 'It makes no difference where they go'], answer: 0, explain: 'finally runs no matter what, so both arms always come home.', review: REVIEW.coordination },
                  { question: 'An arm starts moving in a way you did not expect. What do you do first?', options: ['Stop the program and keep your hands clear', 'Hold the arm still', 'Push it back by hand', 'Run the program again'], answer: 0, explain: 'Never grab or resist a powered arm. Stop the program.', review: REVIEW.safety },
                ] },
              ],
            },
            {
              id: 'set-it-up', title: 'Set It Up',
              blocks: [
                { type: 'p', text: "Let's set up the run. In the real `handshake.py`, find `SHAKE_CYCLES`. It is the same idea as your own setting. Change it from 1 to **3**:" },
                { type: 'code', lang: 'python', filename: 'Edit in handshake.py', workspaceFile: REAL_HANDSHAKE, line: 67, code: 'SHAKE_CYCLES = 3' },
                { type: 'p', text: "Now, click **Run**. Run checks that you changed only that line. If everything is ready, you should get something similar to this:" },
                { type: 'terminal', label: 'Output', lines: ['$ ros2 run swayform_robot handshake', '[INFO] [handshake]: node started', '[INFO] Connecting to motion controller...', '[INFO] [handshake]: all required values are set', 'Objective complete: this matches the target solution. Queue on Robot is now available.'] },
              ],
            },
            {
              id: 'queue-it', title: 'Queue It',
              blocks: [
                { type: 'steps', items: [
                  'Click **Queue on Robot**.',
                  'Wait for an admin to approve it.',
                  'When it says it is running, watch the robot shake hands.',
                  'When it says succeeded, mark the lab complete.',
                ] },
                { type: 'p', text: "While it runs, you should get something similar to this:" },
                queueOutput(['Reaching forward...', 'Gripping...', 'Shaking...', 'Opening hand and returning to the rest pose...']),
                ROBOT_SAFETY,
                { type: 'p', text: "That's the handshake! Next, you are going to reuse this exact structure for a fist bump." },
              ],
            },
            { id: 'if-it-is-stuck', title: 'If It Is Stuck', blocks: [STUCK('handshake_builder.py')] },
          ],
          completionSummary: { text: 'You finished the handshake: you built the program, passed the quiz, and sent a handshake to the real robot.', conceptsUsed: ['Behaviors', 'Safety'] },
        },

        // Lab 6
        {
          id: 'fb-06-from-handshake', title: 'From Handshake to Fist Bump', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 minutes',
          summary: 'See how the fist bump reuses the handshake structure, and write its main function in the same shape.',
          workspaceFile: FB_BUILDER,
          relatedConcepts: ['Reuse', 'Program structure', 'try / finally'],
          steps: [
            summary('20 minutes', 'In this lab, you are going to start the fist bump by reusing what you built for the handshake. You will:', [
              'Compare the handshake and the fist bump, piece by piece.',
              'Find the three things that change: positions, timing and the finishing move.',
              'Write `perform_fist_bump` in the same shape as `perform_handshake`.',
            ]),
            {
              id: 'same-shape', title: 'Same Shape, Different Move',
              blocks: [
                { type: 'p', text: "Remember the structure from lab 1? Get into a pose, do the finishing move, come back home. The fist bump follows it too. In fact, you can line it up with the handshake, function by function:" },
                { type: 'table', headers: ['Step', 'Handshake', 'Fist bump'], rows: [
                  ['Get into a pose', '`reach_forward` with an open hand', '`raise_and_curl` with a fist'],
                  ['Wait', '`HOLD_BEFORE_GRIP`', '`HOLD_BEFORE_BUMP`'],
                  ['Finishing move', '`grip` and `shake`', '`bump`'],
                  ['Come back home', '`let_go` and both arms home', '`open_and_return`'],
                ] },
                { type: 'p', text: "As you can see, the shape is the same. So, what changes? Only three things, and each one gets its own lab:" },
                { type: 'list', items: [
                  '**Joint positions** (lab 7): a raised fist instead of a reach.',
                  '**Timing** (lab 8): a fast punch instead of a slow, gentle shake.',
                  '**The finishing move** (lab 9): one bump, and maybe a nod.',
                ] },
              ],
            },
            {
              id: 'open-the-file', title: 'Open the File',
              blocks: [
                { type: 'p', text: "Click **Open fist_bump_builder.py** below. Scroll through it, and look for the parts that you already know from the handshake: the imports, `say`, `go_home`, and `main`." },
                { type: 'code', lang: 'python', filename: 'The top of fist_bump_builder.py', workspaceFile: FB_BUILDER, line: 1, copy: false, code: 'from time import sleep\nfrom swayform.motion import MotionClient\n\n# TODO lab 7: set FIST_ARM, the raised-fist pose: "right_shoulder" at 35 and "right_elbow" at 10\n...' },
                { type: 'p', text: "This file has **6** pieces for you to write, in labs 6 to 9." },
              ],
            },
            {
              id: 'match-the-parts', title: 'Match the Parts',
              blocks: [
                { type: 'p', text: "Let's see if you can match each handshake function to the fist bump function that does the same job:" },
                { type: 'match', prompt: 'Match each handshake function to its fist bump partner.', pairs: [
                  ['`reach_forward`', '`raise_and_curl`'],
                  ['`shake`', '`bump`'],
                  ['`perform_handshake`', '`perform_fist_bump`'],
                ], distractors: ['`grip_and_shake`'], explain: 'Same job, new move. That is the whole idea of this section.' },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn: Same Shape as perform_handshake',
              blocks: [
                { type: 'p', text: "Here comes the reuse. Open `perform_fist_bump`, and write it in the same shape as `perform_handshake`: the steps under `try`, and the way home under `finally`." },
                { type: 'code', lang: 'python', filename: 'Find this in fist_bump_builder.py', workspaceFile: FB_BUILDER, line: 42, copy: false, code: 'def perform_fist_bump(motion: MotionClient) -> None:\n    # TODO lab 6: same shape as perform_handshake: in try, call raise_and_curl, wait HOLD_BEFORE_BUMP, then bump; in finally, call open_and_return\n    pass' },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                fbCheck(1),
                FB_RESET,
                { type: 'reveal', hint: 'Look at your perform_handshake: a try with the steps, a finally with the way home. Only the names change.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'fist_bump_builder.py', code: 'def perform_fist_bump(motion: MotionClient) -> None:\n    try:\n        raise_and_curl(motion)\n        sleep(HOLD_BEFORE_BUMP)\n        bump(motion)\n    finally:\n        open_and_return(motion)' } } },
                { type: 'p', text: "As you can see, you wrote a whole new behavior's main function in a few lines, because you already knew its shape. Pretty useful, right?" },
              ],
            },
          ],
          completionSummary: { text: 'You saw how the fist bump reuses the handshake structure, and wrote its main function.', conceptsUsed: ['Reuse', 'try / finally'] },
        },

        // Lab 7
        {
          id: 'fb-07-positions', title: 'New Joint Positions', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 to 25 minutes',
          summary: 'Set the raised-fist pose and write the move that gets the arm there.',
          workspaceFile: FB_BUILDER,
          relatedConcepts: ['Poses', 'Joint groups', 'Hand poses'],
          steps: [
            summary('20 to 25 minutes', 'In this lab, you are going to change the first of the three things: the joint positions. You will:', [
              'Compare the reach, the raised fist and the punch, angle by angle.',
              'Set `FIST_ARM`, the raised-fist pose.',
              'Write `raise_and_curl`.',
            ]),
            {
              id: 'a-new-pose', title: 'A New Pose',
              blocks: [
                { type: 'p', text: "A **pose** is a set of angles, one for each joint. In the handshake, the arm reached far forward with the elbow open. For a fist bump, the arm comes up less, with the elbow more bent, so the fist is ready to punch. Have a look at the three poses side by side:" },
                { type: 'table', headers: ['Pose', 'right_shoulder', 'right_elbow'], rows: [
                  ['Handshake reach', '50', '20'],
                  ['Raised fist (`FIST_ARM`)', '35', '10'],
                  ['Punch (`PUNCH_ARM`)', '75', '50'],
                ] },
                { type: 'p', text: "As you can see, the raised fist is a smaller move than the reach. The big move comes later, in the punch." },
              ],
            },
            {
              id: 'hand-poses', title: 'Hand Poses',
              blocks: [
                { type: 'p', text: "The hand has its own poses, named in quotes. You already used two of them:" },
                { type: 'terms', items: [
                  { term: '"open"', def: 'Fingers and thumb straight. Used to reach, and to let go.' },
                  { term: '"gentle_close"', def: 'A soft grip. Used in the handshake.' },
                  { term: '"fist"', def: 'Every finger curled in, with the thumb closed. Used for the fist bump.' },
                ] },
              ],
            },
            {
              id: 'add-the-pose', title: 'Your Turn: The Raised-Fist Pose',
              blocks: [
                { type: 'p', text: "Find the `# TODO lab 7` note near the top of the file. Replace it with `FIST_ARM`, a pose with `\"right_shoulder\"` at **35** and `\"right_elbow\"` at **10**. Use the same shape as `PUNCH_ARM` right below it." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                fbCheck(2),
                { type: 'reveal', hint: 'Copy the shape of PUNCH_ARM: curly brackets, the joint names in quotes, a colon, then the angle.', solution: { text: 'The pose:', code: { lang: 'python', filename: 'fist_bump_builder.py', code: 'FIST_ARM = {"right_shoulder": 35, "right_elbow": 10}' } } },
              ],
            },
            {
              id: 'raise-and-curl', title: 'Your Turn: raise_and_curl',
              blocks: [
                { type: 'p', text: "Now, open `raise_and_curl`. The left arm already swings back, just like in the handshake. Replace the `# TODO lab 7` line with two lines: curl the right hand into the `\"fist\"` pose, and then move the `\"right_arm\"` group to `FIST_ARM`, over `RAISE_SECONDS`." },
                { type: 'code', lang: 'python', filename: 'Find this in fist_bump_builder.py', workspaceFile: FB_BUILDER, line: 23, copy: false, code: 'def raise_and_curl(motion: MotionClient) -> None:\n    say("raising fist")\n    motion.move_joint_group("left_arm", LEFT_ARM_BACK, seconds=RAISE_SECONDS)\n    # TODO lab 7: curl "right_hand" into the "fist" pose, then move the "right_arm" group to FIST_ARM over RAISE_SECONDS' },
                { type: 'p', text: "Notice the `seconds=RAISE_SECONDS` at the end of the left arm's line. It says how long the move takes. You are going to learn all about it in the next lab, so for now, copy it the same way." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                fbCheck(3),
                FB_RESET,
                { type: 'reveal', hint: 'One set_hand_pose line, and one move_joint_group line that ends with seconds=RAISE_SECONDS.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'fist_bump_builder.py', code: 'def raise_and_curl(motion: MotionClient) -> None:\n    say("raising fist")\n    motion.move_joint_group("left_arm", LEFT_ARM_BACK, seconds=RAISE_SECONDS)\n    motion.set_hand_pose("right_hand", "fist")\n    motion.move_joint_group("right_arm", FIST_ARM, seconds=RAISE_SECONDS)' } } },
              ],
            },
            {
              id: 'position-questions', title: 'Quick Questions: Positions',
              blocks: [
                { type: 'mcq', question: 'What is a pose?', options: ['A set of angles, one for each joint', 'A single move of one joint', 'A pause between moves', 'A kind of loop'], answer: 0, explain: 'A pose like FIST_ARM holds an angle for each joint in the group.' },
                { type: 'mcq', question: 'Which pose has the shoulder furthest forward?', options: ['The punch', 'The raised fist', 'The handshake reach', 'Home'], answer: 0, explain: 'PUNCH_ARM has the shoulder at 75, the biggest of the three.' },
                { type: 'mcq', question: 'Which hand pose does the fist bump use?', options: ['"fist"', '"open"', '"gentle_close"', '"relaxed"'], answer: 0, explain: 'Every finger curls in, with the thumb closed.' },
              ],
            },
          ],
          completionSummary: { text: 'You set the raised-fist pose and wrote the move that gets the arm there.', conceptsUsed: ['Poses', 'Hand poses'] },
        },

        // Lab 8
        {
          id: 'fb-08-timing', title: 'Timing', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 minutes',
          summary: 'Pauses and move durations: what makes a punch snappy, and the three timings of the bump.',
          workspaceFile: FB_BUILDER,
          relatedConcepts: ['Timing', 'Speed', 'Keyword arguments'],
          steps: [
            summary('20 minutes', 'In this lab, you are going to change the second of the three things: the timing. You will:', [
              'Learn the two kinds of time in a robot program: pauses and move durations.',
              'See why a punch goes out fast and comes back slower.',
              'Set the three timings of the bump.',
            ]),
            {
              id: 'two-kinds-of-time', title: 'Two Kinds of Time',
              blocks: [
                { type: 'p', text: "There are two kinds of time in a robot program, and they are easy to mix up:" },
                { type: 'table', headers: ['Code', 'What it means'], rows: [
                  ['`sleep(2.0)`', 'A **pause**. Nothing moves for 2 seconds.'],
                  ['`seconds=0.15` on a move', 'A **duration**. The move itself takes 0.15 seconds from start to finish.'],
                ] },
                { type: 'p', text: "In the handshake, you only used pauses. For a fist bump, the duration matters a lot. A slow punch is not a punch at all!" },
              ],
            },
            {
              id: 'fast-out-slow-back', title: 'Fast Out, Slower Back',
              blocks: [
                { type: 'p', text: "In simple terms, speed is how far you move divided by how long it takes. The punch goes from the raised fist to `PUNCH_ARM`, which is 40 degrees at the shoulder. So:" },
                { type: 'table', headers: ['Duration', 'Speed at the shoulder'], rows: [
                  ['0.15 seconds', 'About 270 degrees per second, a snappy punch'],
                  ['0.3 seconds', 'About 130 degrees per second, a softer push'],
                  ['1.5 seconds', 'About 27 degrees per second, a slow reach'],
                ] },
                { type: 'p', text: "The real `fist_bump.py` punches out in about 0.15 seconds, and comes back in 0.3. Fast out, slower back. That is what makes it look like a bump, and not like a robot falling forward." },
              ],
            },
            {
              id: 'the-seconds-option', title: 'The seconds Option',
              blocks: [
                { type: 'p', text: "Have a look at this line again:" },
                { type: 'code', lang: 'python', filename: 'From fist_bump_builder.py', code: 'motion.move_joint_group("left_arm", LEFT_ARM_BACK, seconds=RAISE_SECONDS)', copy: false },
                { type: 'p', text: "`seconds=` is a **keyword argument**: an extra piece of information, passed by name. Without it, the robot picks its own normal speed. With it, you decide how long the move takes." },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn: The Three Timings',
              blocks: [
                { type: 'p', text: "Find the `# TODO lab 8` note near the top of the file, and replace it with three settings:" },
                { type: 'list', items: [
                  '`HOLD_BEFORE_BUMP`: the pause with the fist raised, before the punch. Use **2.0**.',
                  '`PUNCH_SECONDS`: how long the punch out takes. Use **0.15**.',
                  '`RECOIL_SECONDS`: how long the way back takes. Use **0.3**.',
                ] },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                fbCheck(4),
                FB_RESET,
                { type: 'reveal', hint: 'Three lines, NAME = value, all in seconds.', solution: { text: 'The three timings:', code: { lang: 'python', filename: 'fist_bump_builder.py', code: 'HOLD_BEFORE_BUMP = 2.0\nPUNCH_SECONDS = 0.15\nRECOIL_SECONDS = 0.3' } } },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep `PUNCH_SECONDS` at 0.1 or more. A faster move than that is hard on the servos.' },
              ],
            },
            {
              id: 'timing-questions', title: 'Quick Questions: Timing',
              blocks: [
                { type: 'mcq', question: 'What is the difference between `sleep(2.0)` and `seconds=2.0` on a move?', options: ['sleep pauses with nothing moving; seconds sets how long the move takes', 'They are the same', 'sleep moves the arm for 2 seconds', 'seconds pauses before the move'], answer: 0, explain: 'One is a pause, the other is a duration.' },
                { type: 'mcq', question: '`PUNCH_SECONDS` changes from 0.15 to 0.3. What happens to the punch?', options: ['It gets slower', 'It gets faster', 'It punches twice', 'Nothing changes'], answer: 0, explain: 'Same distance in more time means a slower move.' },
                { type: 'mcq', question: 'Why does the punch come back slower than it goes out?', options: ['A quick hit and a calm return look like a real bump', 'The servo cannot move back fast', 'Python needs it', 'It does not, both take the same time'], answer: 0, explain: 'Fast out, slower back. That is the feel of a fist bump.' },
              ],
            },
          ],
          completionSummary: { text: 'You learned the difference between pauses and move durations, and set the timing of the bump.', conceptsUsed: ['Timing', 'Speed'] },
        },

        // Lab 9
        {
          id: 'fb-09-finish', title: 'The Finishing Move', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 minutes',
          summary: 'Write the bump itself, and an optional head nod with an if statement. This finishes the fist bump program.',
          workspaceFile: FB_BUILDER,
          relatedConcepts: ['Finishing moves', 'Booleans', 'if statements'],
          steps: [
            summary('25 minutes', 'In this lab, you are going to change the last of the three things: the finishing move. You will:', [
              'Write the bump: out to the punch, and back to the raised fist.',
              'Learn about `True`, `False` and the `if` statement.',
              'Add a head nod that only happens when a setting says so.',
            ]),
            {
              id: 'the-finish', title: 'Every Behavior Has a Finish',
              blocks: [
                { type: 'p', text: "The finishing move is what makes a behavior what it is. In the handshake, it was the shake: a small move, repeated. In the fist bump, it is one quick bump: out to `PUNCH_ARM`, and straight back to `FIST_ARM`." },
                { type: 'p', text: "Why back to `FIST_ARM`, and not all the way home? Because going home is already the job of `open_and_return`, under `finally`. The bump only does the bump." },
              ],
            },
            {
              id: 'write-the-bump', title: 'Your Turn: The Bump',
              blocks: [
                { type: 'p', text: "Open `bump` in your file. Replace the first `# TODO lab 9` line with two group moves, using the timings from lab 8:" },
                { type: 'code', lang: 'python', filename: 'Find this in fist_bump_builder.py', workspaceFile: FB_BUILDER, line: 29, copy: false, code: 'def bump(motion: MotionClient) -> None:\n    say("bump!")\n    # TODO lab 9: move the "right_arm" group to PUNCH_ARM over PUNCH_SECONDS, then back to FIST_ARM over RECOIL_SECONDS\n    # TODO lab 9: if ENABLE_HEAD_NOD is True, move "head_pitch" to NOD_UP and then back to 0' },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                fbCheck(5),
                { type: 'reveal', hint: 'Two move_joint_group lines on "right_arm", each with its own seconds=.', solution: { text: 'The bump:', code: { lang: 'python', filename: 'fist_bump_builder.py', code: '    motion.move_joint_group("right_arm", PUNCH_ARM, seconds=PUNCH_SECONDS)\n    motion.move_joint_group("right_arm", FIST_ARM, seconds=RECOIL_SECONDS)' } } },
              ],
            },
            {
              id: 'true-or-false', title: 'True or False',
              blocks: [
                { type: 'p', text: "Have a look at this setting near the top of the file:" },
                { type: 'code', lang: 'python', filename: 'From fist_bump_builder.py', code: 'ENABLE_HEAD_NOD = False', copy: false },
                { type: 'p', text: "`False` is not a number, and it is not text in quotes either. It is a **boolean**: a value that can only be `True` or `False`, like a light switch that is either on or off. Notice the capital letter: `True` and `False`, never `true`." },
              ],
            },
            {
              id: 'if-statements', title: 'Doing Something Only Sometimes',
              blocks: [
                { type: 'p', text: "An `if` statement runs its indented lines **only when** its condition is true. Otherwise, Python skips them. Have a look:" },
                { type: 'code', lang: 'python', filename: 'Example', code: 'if ENABLE_HEAD_NOD:\n    say("nodding")\nsay("done")', copy: false },
                { type: 'p', text: "So, what do you think would happen with `ENABLE_HEAD_NOD = False`? Let's find out: Python skips the indented line, so you only see \"done\". Switch it to `True`, and you see \"nodding\" and then \"done\"." },
                { type: 'p', text: "As you can see, the indent works just like in a loop or a function: it decides which lines belong to the `if`." },
              ],
            },
            {
              id: 'write-the-nod', title: 'Your Turn: The Nod',
              blocks: [
                { type: 'p', text: "Now, replace the last `# TODO lab 9` line with an `if` that checks `ENABLE_HEAD_NOD`. Inside it, move `\"head_pitch\"` up to `NOD_UP`, and then back to 0." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                fbCheck(6),
                FB_RESET,
                { type: 'reveal', hint: 'Start with `if ENABLE_HEAD_NOD:`, then two indented move_joint lines on "head_pitch".', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'fist_bump_builder.py', code: 'def bump(motion: MotionClient) -> None:\n    say("bump!")\n    motion.move_joint_group("right_arm", PUNCH_ARM, seconds=PUNCH_SECONDS)\n    motion.move_joint_group("right_arm", FIST_ARM, seconds=RECOIL_SECONDS)\n    if ENABLE_HEAD_NOD:\n        motion.move_joint("head_pitch", NOD_UP)\n        motion.move_joint("head_pitch", 0)' } } },
              ],
            },
            {
              id: 'run-it', title: 'Run the Finished Program',
              blocks: [
                { type: 'p', text: "6 of 6! Click **Run**. You should get something similar to this:" },
                runOutput('fist_bump_builder', true),
                { type: 'p', text: "As you can see, every required value is set. The real fist bump runs in lab 10." },
              ],
            },
            {
              id: 'finish-questions', title: 'Quick Questions: The Finish',
              blocks: [
                { type: 'mcq', question: 'With `ENABLE_HEAD_NOD = False`, what happens to the lines inside `if ENABLE_HEAD_NOD:`?', options: ['They are skipped', 'They run once', 'They run twice', 'Python stops with an error'], answer: 0, explain: 'An if only runs its lines when the condition is True.' },
                { type: 'mcq', question: 'Which of these is a boolean?', options: ['`True`', '`"True"`', '`1.5`', '`FIST_ARM`'], answer: 0, explain: 'True and False, with a capital letter and no quotes, are booleans.' },
                { type: 'mcq', question: 'Why does the bump go back to `FIST_ARM` and not home?', options: ['Going home is the job of open_and_return, under finally', 'The arm cannot go home', 'FIST_ARM is the same as home', 'It is a mistake'], answer: 0, explain: 'Each function does one job. The way home is in finally.' },
              ],
            },
          ],
          completionSummary: { text: 'You wrote the bump and the optional nod, and finished the fist bump program.', conceptsUsed: ['Booleans', 'if statements'] },
        },

        // Lab 10
        {
          id: 'fb-10-run', title: 'Fist Bump Review, Quiz and Robot Run', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 to 30 minutes',
          summary: 'A review of labs 6 to 9, a five-question quiz, then the real fist bump on SwayForm, with the head nod switched on.',
          workspaceFile: REAL_FIST_BUMP,
          extraFiles: [FB_BUILDER],
          robotGate: {
            needsQuiz: [{ id: FIST_BUMP_QUIZ_ID, text: `Pass the quiz in this lab with ${QUIZ_PASS}% or better.` }],
            needsNoTodos: [{ path: FB_BUILDER, text: 'Finish fist_bump_builder.py. It still has # TODO notes (labs 6 to 9).' }],
          },
          relatedConcepts: ['Behaviors', 'Review', 'Safety'],
          steps: [
            summary('20 to 30 minutes', 'In this lab, you are going to review labs 6 to 9, pass a short quiz, and then send a fist bump to the real robot. You will:', [
              'See how your `fist_bump_builder.py` lines up with the real `fist_bump.py`.',
              'Pass the five-question quiz with 80% or better.',
              'Switch on the head nod in `fist_bump.py`, and queue the fist bump.',
            ]),
            {
              id: 'review', title: 'Last-Minute Review',
              blocks: [
                { type: 'table', headers: ['Idea', 'What to remember'], rows: [
                  ['Reuse (lab 6)', 'Same structure as the handshake: a pose, a finishing move, and home under `finally`.'],
                  ['Positions (lab 7)', 'A pose holds an angle for each joint. The raised fist is smaller than the reach.'],
                  ['Timing (lab 8)', '`sleep` is a pause. `seconds=` is how long a move takes. Fast out, slower back.'],
                  ['The finish (lab 9)', 'One bump out and back, and an `if` that only nods when the setting is `True`.'],
                ] },
              ],
            },
            {
              id: 'your-program-and-the-real-one', title: 'Your Program and the Real One',
              blocks: [
                { type: 'table', headers: ['Your fist_bump_builder.py', 'The real fist_bump.py'], rows: [
                  ['raise_and_curl', 'raise_and_curl'],
                  ['bump', 'bump_jerk'],
                  ['ENABLE_HEAD_NOD and the if', 'ENABLE_HEAD_NOD and the same if'],
                  ['open_and_return', 'open_and_return'],
                ] },
                { type: 'p', text: "The real fist bump also leans the torso into the punch, which yours does not. Open the real file and find `if ENABLE_HEAD_NOD:` in `bump_jerk`. It is the same idea that you wrote!" },
              ],
            },
            {
              id: 'the-quiz', title: 'The Quiz',
              blocks: [
                { type: 'p', text: "Time for the quiz! Five questions on labs 6 to 9. You need 4 out of 5 to unlock the robot run." },
                { type: 'quiz', id: FIST_BUMP_QUIZ_ID, title: 'Fist Bump Quiz', passPercent: QUIZ_PASS, count: 5, prepare: 'Go over reuse (lab 6), poses (lab 7), timing (lab 8), and booleans and if (lab 9). The review table at the top of this lab has the key ideas.', questions: [
                  { question: 'Which three things change from the handshake to the fist bump?', options: ['Positions, timing and the finishing move', 'The imports, the loops and main', 'Nothing, they are the same behavior', 'Only the name'], answer: 0, explain: 'The structure stays, those three change.', review: REVIEW.reuse },
                  { question: 'Which function does the same job in the fist bump as `reach_forward` in the handshake?', options: ['`raise_and_curl`', '`bump`', '`open_and_return`', '`go_home`'], answer: 0, explain: 'Both get the arm into the pose before the finishing move.', review: REVIEW.reuse },
                  { question: 'What is a pose, like `FIST_ARM`?', options: ['A set of angles, one for each joint', 'A pause', 'A loop', 'A hand gesture only'], answer: 0, explain: 'A pose holds an angle for each joint in the group.', review: REVIEW.positions },
                  { question: 'Which hand pose does the fist bump use?', options: ['"fist"', '"open"', '"gentle_close"', '"relaxed"'], answer: 0, explain: 'All fingers curled, with the thumb closed.', review: REVIEW.positions },
                  { question: 'What does `seconds=PUNCH_SECONDS` on a move change?', options: ['How long the move takes', 'How long to wait before it', 'How many times it repeats', 'The angle'], answer: 0, explain: 'It is the duration of the move itself.', review: REVIEW.timing },
                  { question: '`PUNCH_SECONDS` goes from 0.15 to 0.3. What happens?', options: ['The punch gets slower', 'The punch gets faster', 'It punches twice', 'Nothing'], answer: 0, explain: 'Same distance, more time, lower speed.', review: REVIEW.timing },
                  { question: 'What does `sleep(HOLD_BEFORE_BUMP)` do?', options: ['Pauses with the fist raised, nothing moves', 'Makes the punch slower', 'Moves the arm for that long', 'Repeats the bump'], answer: 0, explain: 'sleep is a pause.', review: REVIEW.timing },
                  { question: 'With `ENABLE_HEAD_NOD = False`, what happens to the lines inside `if ENABLE_HEAD_NOD:`?', options: ['They are skipped', 'They run', 'They run twice', 'Python stops'], answer: 0, explain: 'An if only runs its lines when the condition is True.', review: REVIEW.finish },
                  { question: 'Which of these is a boolean?', options: ['`False`', '`"False"`', '`0.15`', '`NOD_UP`'], answer: 0, explain: 'True and False, with a capital letter and no quotes.', review: REVIEW.finish },
                  { question: 'Who should be in the room when your fist bump runs on the real robot?', options: ['An instructor or supervisor', 'Nobody', 'Only other students', 'It does not matter'], answer: 0, explain: 'Never run a program on the physical robot without an instructor present.', review: REVIEW.safety },
                ] },
              ],
            },
            {
              id: 'set-it-up', title: 'Set It Up',
              blocks: [
                { type: 'p', text: "In the real `fist_bump.py`, find `ENABLE_HEAD_NOD`, near the top. Switch it from `False` to **True**:" },
                { type: 'code', lang: 'python', filename: 'Edit in fist_bump.py', workspaceFile: REAL_FIST_BUMP, line: 12, code: 'ENABLE_HEAD_NOD = True' },
                { type: 'p', text: "Click **Run**. If everything is ready, you should get something similar to this:" },
                { type: 'terminal', label: 'Output', lines: ['$ ros2 run swayform_robot fist_bump', '[INFO] [fist_bump]: node started', '[INFO] Connecting to motion controller...', '[INFO] [fist_bump]: all required values are set', 'Objective complete: this matches the target solution. Queue on Robot is now available.'] },
              ],
            },
            {
              id: 'queue-it', title: 'Queue It',
              blocks: [
                { type: 'steps', items: [
                  'Click **Queue on Robot**.',
                  'Wait for an admin to approve it.',
                  'When it says it is running, watch the bump, and the nod.',
                  'When it says succeeded, mark the lab complete.',
                ] },
                { type: 'p', text: "While it runs, you should get something similar to this:" },
                queueOutput(['Raising fist...', 'Bump!', 'Opening hand and returning to the rest pose...']),
                ROBOT_SAFETY,
              ],
            },
            { id: 'if-it-is-stuck', title: 'If It Is Stuck', blocks: [STUCK('fist_bump_builder.py')] },
          ],
          completionSummary: { text: 'You finished the fist bump: you reused the handshake structure, passed the quiz, and sent a fist bump to the real robot.', conceptsUsed: ['Behaviors', 'Safety'] },
        },

        // Lab 11
        {
          id: 'bk-11-plan', title: 'Beckon: Plan It', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 minutes',
          summary: 'Watch the beckon, read its requirements, get to know the starter code, and plan the behavior before writing it.',
          workspaceFile: BK_BUILDER,
          relatedConcepts: ['Planning', 'Requirements', 'Lists', 'Loops'],
          steps: [
            summary('25 minutes', 'In this lab, you are going to plan your third behavior, the beckon, before you write it on your own in lab 12. You will:', [
              'Watch the beckon, and read its requirements.',
              'Get to know the starter code, including a loop over a list.',
              'Plan the behavior, and write its settings.',
            ]),
            {
              id: 'watch-the-beckon', title: 'Watch the Beckon',
              blocks: [
                { type: 'p', text: "A beckon is the \"come here\" gesture: the palm turns up, and the fingers curl in and out. Have a look at SwayForm doing it:" },
                { type: 'video', caption: 'SwayForm beckoning.' },
              ],
            },
            {
              id: 'the-requirements', title: 'The Requirements',
              blocks: [
                { type: 'p', text: "Here is exactly what your beckon has to do:" },
                { type: 'checklist', items: [
                  'Start from the rest pose.',
                  'Swing the right shoulder **35 degrees** forward.',
                  'Turn the wrist **70 degrees**, so the palm faces up.',
                  'Curl the four fingers in by **60 degrees**, and open them back up. Do it **3 times**.',
                  'Go back to the rest pose at the end, no matter what.',
                ] },
                { type: 'p', text: "And here's something important: in the beckon, the **elbow does not move**, and neither does the thumb. Only the shoulder, the wrist and the four fingers move. So, if you catch yourself writing a line for the elbow, stop. The beckon does not need one!" },
              ],
            },
            {
              id: 'same-and-new', title: 'What Is the Same, What Is New',
              blocks: [
                { type: 'table', headers: ['', 'Handshake', 'Fist bump', 'Beckon'], rows: [
                  ['The pose', 'Reach forward, hand open', 'Raised fist', 'Shoulder forward, palm up'],
                  ['The finishing move', 'The elbow shakes', 'One bump', 'The fingers curl in and out'],
                  ['Repeated', '`SHAKE_CYCLES` times', 'Once', '`BECKON_CYCLES` times'],
                  ['Home', 'Under `finally`', 'Under `finally`', 'Under `finally`'],
                ] },
                { type: 'p', text: "As you can see, it is the same structure one more time. What's new is the part that moves: this time, it is the fingers." },
              ],
            },
            {
              id: 'the-starter-code', title: 'The Starter Code',
              blocks: [
                { type: 'p', text: "Click **Open beckon_builder.py** below. This time, much less is written for you. Have a look at this part:" },
                { type: 'code', lang: 'python', filename: 'From beckon_builder.py', workspaceFile: BK_BUILDER, line: 6, copy: false, code: 'FINGERS = ["right_index_finger", "right_middle_finger", "right_ring_finger", "right_pinky_finger"]\n...\ndef move_fingers(motion: MotionClient, angle: int) -> None:\n    for finger in FINGERS:\n        motion.move_joint(finger, angle)' },
                { type: 'p', text: "Two new things here. `FINGERS` is a **list**: several values in square brackets, in order. And `for finger in FINGERS:` is a loop over that list. Each time through, `finger` holds the next name, so the loop moves all four fingers to the same angle." },
                { type: 'p', text: "So, `move_fingers(motion, 60)` curls all four fingers in, and `move_fingers(motion, 0)` opens them back up. You are going to use this helper in lab 12." },
              ],
            },
            {
              id: 'plan-it', title: 'Plan It',
              blocks: [
                { type: 'p', text: "Before you write a single line, let's plan. Good programmers write the recipe first. On paper, or in your head, fill in this plan:" },
                { type: 'table', headers: ['Function', 'What it does', 'Joints it moves'], rows: [
                  ['`raise_arm`', 'Gets into the beckon pose', 'The shoulder and the wrist'],
                  ['`beckon`', 'Curls the fingers in and out, `BECKON_CYCLES` times', 'The four fingers'],
                  ['`perform_beckon`', 'Runs the two above, and goes home under `finally`', 'Everything, on the way home'],
                ] },
                { type: 'p', text: "Notice that the elbow is not in the plan at all. That's right!" },
              ],
            },
            {
              id: 'add-the-settings', title: 'Your Turn: The Settings',
              blocks: [
                { type: 'p', text: "Now, turn the requirements into settings. Replace the `# TODO lab 11` line with four of them:" },
                { type: 'list', items: [
                  '`BECKON_SHOULDER`: how far the shoulder swings forward. Use **35**.',
                  '`WRIST_PALM_UP`: how far the wrist turns. Use **70**.',
                  '`FINGER_CURL`: how far the fingers curl in. Use **60**.',
                  '`BECKON_CYCLES`: how many times the fingers curl. Use **3**.',
                ] },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                bkCheck(1),
                BK_RESET,
                { type: 'reveal', hint: 'Four lines, NAME = value. Every number comes from the requirements.', solution: { text: 'The four settings:', code: { lang: 'python', filename: 'beckon_builder.py', code: 'BECKON_SHOULDER = 35\nWRIST_PALM_UP = 70\nFINGER_CURL = 60\nBECKON_CYCLES = 3' } } },
              ],
            },
            {
              id: 'plan-questions', title: 'Quick Questions: The Plan',
              blocks: [
                { type: 'mcq', question: 'Which joint does not move at all in the beckon?', options: ['The elbow', 'The shoulder', 'The wrist', 'The fingers'], answer: 0, explain: 'Only the shoulder, the wrist and the four fingers move.' },
                { type: 'mcq', question: 'What does `for finger in FINGERS:` do?', options: ['Runs its lines once for each name in the list', 'Moves only the first finger', 'Makes a new list', 'Repeats forever'], answer: 0, explain: 'Each time through, finger holds the next name in the list.' },
                { type: 'mcq', question: 'How many times do the fingers curl in the beckon?', options: ['3', '1', '4', '60'], answer: 0, explain: 'BECKON_CYCLES is 3. 60 is the angle, and 4 is the number of fingers.' },
              ],
            },
          ],
          completionSummary: { text: 'You read the beckon requirements, got to know the starter code, and turned the plan into settings.', conceptsUsed: ['Planning', 'Lists'] },
        },

        // Lab 12
        {
          id: 'bk-12-challenge', title: 'Beckon Challenge', kind: 'activity', difficulty: 'beginner', estimatedTime: '35 to 45 minutes',
          summary: 'Write the beckon on your own: raise the arm, beckon three times, and return to rest. Then run the real beckon on SwayForm.',
          workspaceFile: BK_BUILDER,
          extraFiles: [REAL_BECKON],
          robotGate: {
            needsNoTodos: [{ path: BK_BUILDER, text: 'Finish beckon_builder.py. It still has # TODO notes (labs 11 and 12).' }],
          },
          relatedConcepts: ['Behaviors', 'Functions', 'Loops', 'try / finally'],
          steps: [
            summary('35 to 45 minutes', 'In this lab, you are going to write the beckon on your own, using everything from this section. You will:', [
              'Write `raise_arm`, `beckon` and `perform_beckon` from the plan.',
              'Check your program against the requirements.',
              'Run the real beckon on SwayForm.',
            ]),
            {
              id: 'the-challenge', title: 'The Challenge',
              blocks: [
                { type: 'p', text: "This time, there is no code to copy. You have the requirements and the plan from lab 11, and you have written every kind of line that you need already. Each part below has a hint and a solution, but try it on your own first. You can do it!" },
              ],
            },
            {
              id: 'raise-arm', title: 'Part 1: raise_arm',
              blocks: [
                { type: 'p', text: "Replace the first `# TODO lab 12` line with a function called `raise_arm`. It moves the shoulder to `BECKON_SHOULDER`, and the wrist to `WRIST_PALM_UP`. Remember, the elbow does not move!" },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                bkCheck(2),
                { type: 'reveal', hint: 'Two move_joint lines: "right_shoulder" and "right_wrist".', solution: { text: 'One way to write it:', code: { lang: 'python', filename: 'beckon_builder.py', code: 'def raise_arm(motion: MotionClient) -> None:\n    say("raising arm")\n    motion.move_joint("right_shoulder", BECKON_SHOULDER)\n    motion.move_joint("right_wrist", WRIST_PALM_UP)' } } },
              ],
            },
            {
              id: 'beckon', title: 'Part 2: beckon',
              blocks: [
                { type: 'p', text: "Now, replace the next `# TODO lab 12` line with `beckon`. It repeats `BECKON_CYCLES` times: curl the fingers in with `move_fingers`, wait `CURL_SECONDS`, open them back to 0, and wait again." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                bkCheck(3),
                { type: 'reveal', hint: 'A for loop with range(BECKON_CYCLES), and four indented lines: two move_fingers calls and two sleeps.', solution: { text: 'One way to write it:', code: { lang: 'python', filename: 'beckon_builder.py', code: 'def beckon(motion: MotionClient) -> None:\n    say("beckoning")\n    for _ in range(BECKON_CYCLES):\n        move_fingers(motion, FINGER_CURL)\n        sleep(CURL_SECONDS)\n        move_fingers(motion, 0)\n        sleep(CURL_SECONDS)' } } },
              ],
            },
            {
              id: 'perform-beckon', title: 'Part 3: perform_beckon',
              blocks: [
                { type: 'p', text: "Last one! Replace the final `# TODO lab 12` line with `perform_beckon`. Same shape as the other two behaviors: the steps under `try`, and the way home under `finally`. On the way home, open the fingers and send the right arm to `HOME_ARM`." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                bkCheck(4),
                BK_RESET,
                { type: 'reveal', hint: 'try: raise_arm and beckon. finally: move_fingers back to 0, and a group move to HOME_ARM.', solution: { text: 'One way to write it:', code: { lang: 'python', filename: 'beckon_builder.py', code: 'def perform_beckon(motion: MotionClient) -> None:\n    try:\n        raise_arm(motion)\n        beckon(motion)\n    finally:\n        move_fingers(motion, 0)\n        motion.move_joint_group("right_arm", HOME_ARM)' } } },
              ],
            },
            {
              id: 'run-it', title: 'Run It and Check the Requirements',
              blocks: [
                { type: 'p', text: "Click **Run**. You should get something similar to this:" },
                runOutput('beckon_builder', true),
                { type: 'p', text: "Now, go through the requirements one more time, and find the line in your program that does each one:" },
                { type: 'checklist', items: [
                  'The shoulder swings to `BECKON_SHOULDER` (`raise_arm`).',
                  'The wrist turns to `WRIST_PALM_UP` (`raise_arm`).',
                  'The fingers curl in and out `BECKON_CYCLES` times (`beckon`).',
                  'No line moves the elbow.',
                  'The fingers open and the arm goes home under `finally` (`perform_beckon`).',
                ] },
              ],
            },
            {
              id: 'the-real-beckon', title: 'Your Program and the Real One',
              blocks: [
                { type: 'table', headers: ['Your beckon_builder.py', 'The real beckon.py'], rows: [
                  ['raise_arm', 'raise_arm'],
                  ['beckon (your loop)', 'beckon'],
                  ['the finally in perform_beckon', 'return_to_rest'],
                ] },
                { type: 'p', text: "Open the real `beckon.py` from the explorer and read `beckon`. You will find a loop over `BECKON_CYCLES`, just like yours." },
              ],
            },
            {
              id: 'robot-run', title: 'Run the Real Beckon',
              blocks: [
                { type: 'p', text: "Now, let's send it to the robot. In the real `beckon.py`, find `BECKON_CYCLES`. It starts at 1, so the robot would only beckon once. Change it from 1 to **3**, so it beckons three times, just like your program:" },
                { type: 'code', lang: 'python', filename: 'Edit in beckon.py', workspaceFile: REAL_BECKON, line: 63, code: 'BECKON_CYCLES = 3' },
                { type: 'p', text: "Click **Run**. If your `beckon_builder.py` is finished and only that line changed, you should get something similar to this:" },
                { type: 'terminal', label: 'Output', lines: ['$ ros2 run swayform_robot beckon', '[INFO] [beckon]: node started', '[INFO] Connecting to motion controller...', '[INFO] [beckon]: all required values are set', 'Objective complete: this matches the target solution. Queue on Robot is now available.'] },
                { type: 'p', text: "Click **Queue on Robot**, and wait for an admin to approve it. While it runs, you should get something similar to this:" },
                queueOutput(['Raising arm...', 'Beckoning...', 'Beckoning 1/3: curling in...', 'Beckoning 1/3: opening back up...', '...', 'Beckoning 3/3: opening back up...', 'Returning to the rest pose...']),
                ROBOT_SAFETY,
              ],
            },
            {
              id: 'that-is-the-section', title: 'One Structure, Three Behaviors',
              blocks: [
                { type: 'p', text: "That's it! You built a handshake, turned it into a fist bump, and then planned and wrote a beckon on your own. Three different behaviors, one structure: get into a pose, do the finishing move, come back home. You are going to use this structure again and again." },
              ],
            },
          ],
          completionSummary: { text: 'You wrote the beckon on your own and finished Greeting Gestures.', conceptsUsed: ['Behaviors', 'Functions', 'Loops', 'try / finally'] },
        },
      ],
    },
  ],
};
