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
// Handshake labs (1 to 5) show the same opening step as "Learning Targets". The id stays 'summary' so saved progress and tests still match.
const targets = (time, text, items) => ({ ...summary(time, text, items), title: 'Learning Targets' });

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
          id: 'hs-01-meet-the-handshake', title: 'Meet the Handshake', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 to 30 minutes',
          summary: 'What Greeting Gestures builds, a quick review of the Wave ideas, and the first two pieces of the handshake program.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Behaviors', 'Review', 'Imports', 'Variables'],
          steps: [
            targets('25 to 30 minutes', 'In this lab, you are going to start by going over what you learned in Wave, then meet Greeting Gestures, the second behavior section, and start your handshake program. You will:', [
              'Review the six ideas from Wave: imports, settings, functions, loops, order and cleanup.',
              'See the three behaviors of this section, and the one structure they share.',
              'Meet the handshake, and find out why it is a bigger challenge than a wave.',
              'Write the first two pieces of `handshake_builder.py`.',
            ]),
            {
              id: 'wave-review', title: 'Quick Review: What You Learned in Wave',
              blocks: [
                { type: 'p', text: "Welcome back! Before we meet the new behaviors, let's go over the six ideas from Wave. You are going to use every single one of them in this section, so the last column gives you a sneak peek of where:" },
                { type: 'table', headers: ['Idea', 'What to remember', 'Where it shows up in the handshake'], rows: [
                  ['Imports', 'Tools come in at the top of the file, like `from time import sleep`.', 'You add the `sleep` import in this lab.'],
                  ['Settings', 'A name in CAPITAL LETTERS holds a value you are allowed to change.', '`SHAKE_CYCLES`, `HOLD_BEFORE_GRIP`, and the reach angles.'],
                  ['Functions', '`def` teaches a move. A call, the name followed by brackets, runs it.', '`reach_forward`, `grip`, `shake` and `let_go`.'],
                  ['Loops', 'A `for` loop repeats its indented lines a set number of times.', 'The shake repeats `SHAKE_CYCLES` times.'],
                  ['Order', 'Lines run from top to bottom, so the steps have to be in the right order.', 'Reach, wait, grip, shake. Mix them up and things get weird!'],
                  ['Cleanup', '`finally` runs no matter what, so the robot always ends in a safe place.', 'The hand always lets go, and both arms always come home.'],
                ] },
                { type: 'p', text: "If any of these doesn't ring a bell, have a look at the Wave section again before you go on. Then, check yourself with a few quick questions." },
              ],
            },
            {
              id: 'review-questions', title: 'Quick Questions: Wave Review',
              blocks: [
                { type: 'p', text: "Let's make sure everything is fresh. Pick an answer for each question. If it is wrong, it greys out and you can try another one. Nothing here is graded." },
                { type: 'mcq', question: 'What does `from time import sleep` give your program?', options: ['A way to pause', 'A way to move the arm', 'A faster robot', 'A new setting'], answer: 0, explain: 'It brings in sleep, which makes the program wait for a number of seconds.' },
                { type: 'mcq', question: 'Which of these is a setting?', options: ['`SHAKE_CYCLES = 3`', '`from time import sleep`', '`def grip(motion):`', '`grip(motion)`'], answer: 0, explain: 'A setting is a name in capital letters, on the left of an equals sign, holding a value.' },
                { type: 'mcq', question: 'You wrote `def grip(motion):` but nothing calls it. What happens?', options: ['The hand never closes', 'The hand closes on its own', 'Python stops with an error', 'The hand closes twice'], answer: 0, explain: 'Defining a function teaches the move. Only a call runs it.' },
                { type: 'mcq', question: 'With `for _ in range(3):` and one indented line under it, how many times does that line run?', options: ['3', '1', '2', '4'], answer: 0, explain: 'range(3) repeats exactly 3 times.' },
                { type: 'mcq', question: 'Where should the line that sends the arm home go?', options: ['Under `finally:`', 'Under `try:`, at the end', 'Before `try:`', 'Nowhere, the robot goes home on its own'], answer: 0, explain: 'Under finally, it runs even if something goes wrong halfway.' },
                { type: 'p', text: "All fresh? Great! Now, let's meet the new behaviors of this section." },
              ],
            },
            {
              id: 'one-structure', title: 'One Structure, Three Behaviors',
              blocks: [
                { type: 'p', text: "In Wave, you built one behavior. In this section, you are going to build three of them: a **handshake**, a **fist bump** and a **beckon**. But here's the trick: all three are built the same way." },
                { type: 'p', text: "Think about a dance routine. Every dancer gets into position, does the big move, and then takes a bow. The big move changes from one dance to the next, but the shape of the routine stays the same. Robot greetings work exactly like that. Every one of them follows the same three steps:" },
                { type: 'code', lang: 'text', filename: 'The structure of every behavior in this section', code: 'get the arm into a pose\n  ↓\ndo the finishing move\n  ↓\ncome back home', copy: false },
                { type: 'p', text: "What changes from one behavior to the next is the pose, the timing, and the finishing move. Here is the plan:" },
                { type: 'table', headers: ['Labs', 'Behavior', 'You learn'], rows: [
                  ['1 to 5', 'Handshake', 'Joint control, movement sequencing and coordination. Lab 5 has a quiz and the robot run.'],
                  ['6 to 10', 'Fist Bump', 'Reusing the handshake structure with new positions, new timing and a new finishing move. Lab 10 has a quiz and the robot run.'],
                  ['11 and 12', 'Beckon', 'Planning a behavior from its requirements, and then writing it on your own.'],
                ] },
                { type: 'p', text: "Let's see if you can already guess the finishing move of each one. Pick the move that goes with each behavior. But be careful, there are more answers than behaviors!" },
                { type: 'match', prompt: 'Match each behavior to its finishing move.', pairs: [
                  ['Handshake', 'The elbow pumps up and down while the hand holds on'],
                  ['Fist bump', 'A quick punch forward with a closed fist'],
                  ['Beckon', 'The fingers curl in and out, as if to say "come here"'],
                ], distractors: [
                  'The wrist swings left and right with an open hand',
                  'Both arms go straight up in the air',
                ], explain: 'Same structure, different finishing move. The wrist swing was the wave from the last section!' },
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
              id: 'why-it-is-harder', title: 'Why a Handshake Is a Bigger Challenge',
              blocks: [
                { type: 'p', text: "A wave is a solo move. The robot can wave at an empty room and it still looks right. A handshake is different: it needs **another person**. And that changes everything!" },
                { type: 'p', text: "Try it with a friend right now. Shake hands, slowly, and notice everything you do without thinking about it:" },
                { type: 'list', items: [
                  'You reach out with your hand **open**, not as a fist.',
                  'You **wait** for the other person to take your hand before you squeeze.',
                  'You squeeze **gently**. Nobody likes a crushing handshake!',
                  'You shake with **small** moves, not big swings.',
                  'You **let go** before you pull your arm back.',
                ] },
                { type: 'p', text: "The robot has to be told every single one of these. Here is what is new in this section, compared with Wave:" },
                { type: 'table', headers: ['In Wave', 'In the handshake', 'You learn it in'], rows: [
                  ['One group move raised the whole arm', 'You move the shoulder and the elbow one joint at a time', 'Lab 2, Joint Control'],
                  ['Short pauses between swings', 'A longer pause, so the other person can take the hand', 'Lab 3, Movement Sequencing'],
                  ['Only the right arm moved', 'Both arms move: the left one swings back to balance', 'Lab 4, Coordination'],
                  ['The wrist swung wide', 'The elbow pumps just 5 degrees each way', 'Lab 4, Coordination'],
                ] },
              ],
            },
            {
              id: 'open-the-file', title: 'Open the File',
              blocks: [
                { type: 'p', text: "Now, let's open the file that you are going to finish during labs 1 to 4. Click **Open handshake_builder.py** below, or find it in the explorer of the Code Editor." },
                { type: 'code', lang: 'python', filename: 'The top of handshake_builder.py', workspaceFile: HS_BUILDER, line: 1, copy: false, code: 'from swayform.motion import MotionClient\n# TODO lab 1: import sleep from the time module so the handshake can pause\n\n# TODO lab 1: set SHAKE_CYCLES (how many shakes) and HOLD_BEFORE_GRIP (seconds to wait before the grip)\n...' },
                { type: 'p', text: "Just like in Wave, about 70% of the program is already written, and every spot that you have to write starts with `# TODO`. This time, there are **7** of them:" },
                { type: 'table', headers: ['Lab', 'You learn', 'You write'], rows: [
                  ['1', 'A quick review of Wave', 'The import for sleep, and two settings'],
                  ['2', 'Joints and angles', 'The reach angles, and the moves that reach forward'],
                  ['3', 'Sequences and pauses', 'The handshake steps, in order'],
                  ['4', 'Coordination', 'The shake, and the return of both arms'],
                ] },
                { type: 'p', text: "Take a minute to scroll through the file before you change anything. Don't worry if you don't understand every line yet. That's exactly what the next labs are for." },
              ],
            },
            {
              id: 'meet-the-functions', title: 'Meet the Functions',
              blocks: [
                { type: 'p', text: "Your file already has six functions in it, and each one does one small job. The names give away a lot! Let's see if you can tell what each one does just from its name:" },
                { type: 'match', prompt: 'Match each function to its job.', pairs: [
                  ['`say(text)`', 'Prints a message in the output'],
                  ['`go_home(motion)`', 'Sends the robot to its resting pose'],
                  ['`reach_forward(motion)`', 'Opens the hand and swings the arm out toward the other person'],
                  ['`grip(motion)`', 'Closes the hand gently'],
                  ['`shake(motion)`', 'Pumps the elbow up and down a few times'],
                  ['`let_go(motion)`', 'Opens the hand again'],
                ], explain: 'Small functions with clear names make a big behavior easy to read. Some of them are missing a few lines, and you fill those in over the next labs.' },
              ],
            },
            {
              id: 'settings-already-there', title: 'Settings Already There',
              blocks: [
                { type: 'p', text: "Some settings are already written for you, near the top of the file. Here is what they hold:" },
                { type: 'table', headers: ['Setting', 'What it holds'], rows: [
                  ['SHAKE_OFFSET', 'How many degrees the elbow moves up and down during the shake: 5.'],
                  ['SHAKE_STEP_SECONDS', 'The pause after each up or down move of the shake: 0.3 seconds.'],
                  ['HOME_ARM', 'The resting angles for the right shoulder and elbow.'],
                  ['LEFT_ARM_BACK', 'How far the left shoulder swings back while the right arm reaches.'],
                  ['LEFT_ARM_HOME', 'The resting angle for the left shoulder.'],
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'These values are tested on the real robot, so leave them as they are. You only write the settings that each lab asks for.' },
              ],
            },
            {
              id: 'add-the-import', title: 'Your Turn: Add the Import',
              blocks: [
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "Have a look at the recipe again. The handshake has to **wait** before it grips, and it pauses between every shake. Both of those waits use `sleep`. But nothing in the file imports `sleep`! Remember what happens then? Python stops with a `NameError`, because it has no idea what `sleep` means. Your job is to write **one line** that brings `sleep` into the program." },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "Open `handshake_builder.py`, and look at **line 2**, right under the first import. You should find this note:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 2, copy: false, code: '# TODO lab 1: import sleep from the time module so the handshake can pause' },
                { type: 'p', text: "Read the note carefully. It is a clue! It tells you **what** to bring in, and **where** it lives." },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'In the note above, which word is the **tool**, and which word is the **toolbox** it lives in?', options: ['`sleep` is the tool, `time` is the toolbox', '`time` is the tool, `sleep` is the toolbox', 'Both are tools', '`import` is the toolbox'], answer: 0, hint: 'The note says "import sleep from the time module". Which one is the module?', explain: 'You want to use sleep, and it lives in the time module. That decides which word goes where.' },
                { type: 'heading', level: 3, text: 'Fill in the blanks' },
                { type: 'p', text: "Every import of a single tool has the same shape. Here it is with blanks. The line above it, `from swayform.motion import MotionClient`, follows the very same shape, so use it as a model:" },
                { type: 'code', lang: 'python', filename: 'The shape of the line', code: 'from ____ import ____', copy: false },
                { type: 'list', items: [
                  'The **first blank** is where the tool lives: the module.',
                  'The **second blank** is the tool itself.',
                ] },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Click at the very start of line 2, the line that begins with `# TODO lab 1`.',
                  'Select the **whole** line, from the `#` to the last letter, and delete it. The line should now be empty.',
                  'On that same empty line, type your import. Start right at the left edge, with no spaces in front.',
                  'Click **Check** in the Code Editor.',
                ] },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'p', text: "Keep in mind that **Check** only counts how many `# TODO` notes are left. It does not read your code for mistakes. So, before you click it, go through this list yourself:" },
                { type: 'checklist', items: [
                  'The line starts with the word `from`, all lowercase.',
                  'Every word is lowercase. Python sees `Sleep` and `sleep` as two different names.',
                  'There are no spaces in front of the line. Imports sit against the left edge.',
                  'The `# TODO lab 1` note on line 2 is completely gone, `#` and all.',
                ] },
                { type: 'p', text: "If everything is ready, **Check** should give you something similar to this:" },
                hsCheck(1),
                { type: 'heading', level: 3, text: 'If something goes wrong' },
                { type: 'troubleshoot', items: [
                  { symptom: 'Check still says 0 of 7', cause: 'A piece of the `# TODO lab 1` line is still there. Check counts any line that still has TODO in it.', fix: 'Delete what is left of the note, so only your import is on that line.' },
                  { symptom: 'Check says 1 of 7, but the editor underlines the line', cause: 'Probably a typo, like a capital letter (`From`) or the words in the wrong order (`import sleep from time`).', fix: 'Compare your line with `from swayform.motion import MotionClient`, word by word. Same shape, different words.' },
                ] },
                { type: 'reveal', hint: 'It is the same import as in Wave. It starts with the word `from`, and `time` and `sleep` are lowercase.', solution: { text: 'The top of the file after this step:', code: { lang: 'python', filename: 'handshake_builder.py', code: 'from swayform.motion import MotionClient\nfrom time import sleep' } } },
              ],
            },
            {
              id: 'add-the-settings', title: 'Your Turn: Add Two Settings',
              blocks: [
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "Now, you are going to write two **settings**: two names that hold numbers the rest of the program uses. The `shake` function will read one of them to know how many times to shake, and `perform_handshake` will read the other one to know how long to wait before it grips." },
                { type: 'table', headers: ['Setting', 'What it means', 'Value to use', 'Kind of number'], rows: [
                  ['`SHAKE_CYCLES`', 'How many times the hand shakes', '**3**', 'A whole number (you can\'t shake half a time!)'],
                  ['`HOLD_BEFORE_GRIP`', 'How many seconds the open hand waits before it closes', '**2.0**', 'Seconds, so it can have a decimal point'],
                ] },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "Look at **line 4** of `handshake_builder.py`. You should find this note:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 4, copy: false, code: '# TODO lab 1: set SHAKE_CYCLES (how many shakes) and HOLD_BEFORE_GRIP (seconds to wait before the grip)' },
                { type: 'callout', tone: 'warn', label: 'Careful', text: 'Right under it, on line 5, there is another note that starts with `# TODO lab 2`. Leave that one alone! It belongs to the next lab.' },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'Which of these lines correctly makes a setting?', options: ['`SHAKE_CYCLES = 3`', '`3 = SHAKE_CYCLES`', '`SHAKE_CYCLES == 3`', '`SHAKE_CYCLES: 3`'], answer: 0, hint: 'Look at the settings that are already in the file, like SHAKE_OFFSET. Which side is the name on, and how many equals signs are there?', explain: 'The name goes on the left, then one equals sign, then the value. Two equals signs means something else in Python: it asks a question, "are these the same?".' },
                { type: 'heading', level: 3, text: 'Fill in the blanks' },
                { type: 'p', text: "Both settings have the same shape. The settings already in the file, like `SHAKE_OFFSET = 5`, are a great model:" },
                { type: 'code', lang: 'python', filename: 'The shape of the two lines', code: '____ = ____\n____ = ____', copy: false },
                { type: 'list', items: [
                  'On the **left**: the setting name, spelled exactly as in the table, in CAPITAL LETTERS with underscores.',
                  'On the **right**: the number. No quotes around it, because it is a number, not text.',
                ] },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Click on line 4, the `# TODO lab 1` note, select the whole line, and delete it.',
                  'On that empty line, type the first setting, `SHAKE_CYCLES`, with its value.',
                  'Press **Enter** to start a new line, and type the second setting, `HOLD_BEFORE_GRIP`, with its value.',
                  'Make sure the `# TODO lab 2` note is still there, right under your two lines.',
                  'Click **Check**.',
                ] },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'checklist', items: [
                  'Each setting is on its own line.',
                  'The names are spelled exactly right, letter for letter. A typo here means `shake` can\'t find the setting later.',
                  'There is exactly **one** equals sign on each line.',
                  'The numbers have no quotes around them.',
                  'Both lines start at the left edge, with no spaces in front.',
                  'The `# TODO lab 2` note is still there.',
                ] },
                { type: 'p', text: "If everything is ready, **Check** should give you something similar to this:" },
                hsCheck(2),
                { type: 'heading', level: 3, text: 'If something goes wrong' },
                { type: 'troubleshoot', items: [
                  { symptom: 'Check says 3 of 7 instead of 2 of 7', cause: 'You deleted the `# TODO lab 2` note too, so Check thinks that piece is done.', fix: 'Press Ctrl+Z (Cmd+Z on a Mac) until the note comes back.' },
                  { symptom: 'Check still says 1 of 7', cause: 'Part of the `# TODO lab 1` note on line 4 is still there.', fix: 'Delete the rest of that note.' },
                  { symptom: 'You wrote `SHAKE_CYCLES = "3"`', cause: 'The quotes turn the number into text, and the loop in lab 4 can\'t count with text.', fix: 'Remove the quotes: `SHAKE_CYCLES = 3`.' },
                ] },
                HS_RESET,
                { type: 'reveal', hint: 'Two lines, each one `NAME = value`. Seconds can have a decimal point.', solution: { text: 'The import and the two settings:', code: { lang: 'python', filename: 'handshake_builder.py', code: 'from time import sleep\n...\nSHAKE_CYCLES = 3\nHOLD_BEFORE_GRIP = 2.0' } } },
              ],
            },
            {
              id: 'predict-the-wait', title: 'Predict the Wait',
              blocks: [
                { type: 'p', text: "Why 2.0 seconds, and not 0 or 10? Time to think like the person on the other side of the handshake! Before you read the last column, try to guess what each one feels like:" },
                { type: 'table', headers: ['HOLD_BEFORE_GRIP', 'What the person sees'], rows: [
                  ['`0`', 'The hand snaps shut the moment it arrives. Nobody had time to take it, so the robot grips the air!'],
                  ['`0.5`', 'Way too quick. Most people miss it.'],
                  ['`2.0`', 'Just right. Enough time to reach out and take the hand.'],
                  ['`10`', 'An open hand, hanging in the air... for... a... very... long... time. Awkward!'],
                ] },
                { type: 'mcq', required: false, question: 'A friend says the robot keeps closing its hand before they can take it. Which setting would you make bigger?', options: ['`HOLD_BEFORE_GRIP`', '`SHAKE_CYCLES`', '`SHAKE_OFFSET`', '`LEFT_ARM_BACK`'], answer: 0, explain: 'HOLD_BEFORE_GRIP is the wait before the grip, so a bigger number gives your friend more time.' },
                { type: 'p', text: "That's it for the warm-up. In the next lab, you are going to learn how to move one joint at a time!" },
              ],
            },
          ],
          completionSummary: { text: 'You know what this section builds, you went over the Wave ideas, and you wrote the first two pieces of the handshake.', conceptsUsed: ['Imports', 'Variables'] },
        },

        // Lab 2
        {
          id: 'hs-02-joint-control', title: 'Joint Control', kind: 'activity', difficulty: 'beginner', estimatedTime: '30 to 35 minutes',
          summary: 'What a joint is, how angles work, and how to move one joint at a time to make the arm reach forward.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Joints', 'Angles', 'Limits', 'Variables'],
          steps: [
            targets('30 to 35 minutes', 'In this lab, you are going to learn how the robot moves one joint at a time. You will:', [
              'Learn what a joint is, what a servo does, and which joints the handshake uses.',
              'See how angles work, and why every joint has a safe range.',
              'Write the reach angles, and the two moves that make the arm reach forward.',
            ]),
            {
              id: 'what-is-a-joint', title: 'What Is a Joint?',
              blocks: [
                { type: 'p', text: "Let's start with your own arm. Stand up, and slowly reach out as if you were about to shake someone's hand. Which parts of your arm moved?" },
                { type: 'p', text: "Your **shoulder** swung the whole arm forward, and your **elbow** opened up a little. Each of those is a **joint**: a place where the body bends or turns. Well, SwayForm has joints too, in the same places!" },
                { type: 'p', text: "Each joint on SwayForm is turned by a small motor called a **servo**. A servo is a bit like a dial with numbers on it: you tell it a number, an angle, and it turns until it gets there. Then it stays there until you tell it a new number." },
                { type: 'p', text: "The handshake uses these joints:" },
                { type: 'terms', items: [
                  { term: 'right_shoulder', def: 'Swings the whole right arm forward and back.' },
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
                { type: 'p', text: "And what about a negative number? It means the joint moves the **other way** from rest. You will meet one in lab 4: the left shoulder goes to -40, which swings the left arm **back** instead of forward." },
              ],
            },
            {
              id: 'piece-by-piece', title: 'One Move, Piece by Piece',
              blocks: [
                { type: 'p', text: "Let's have a closer look at one `move_joint` call, piece by piece:" },
                { type: 'code', lang: 'python', filename: 'Example', code: 'motion.move_joint("right_shoulder", 50)', copy: false },
                { type: 'terms', items: [
                  { term: 'motion', def: 'The robot connection, the MotionClient. Every move goes through it.' },
                  { term: '.move_joint', def: 'The job you are asking for: move one joint.' },
                  { term: '"right_shoulder"', def: 'Which joint. It is a name, so it goes in quotes.' },
                  { term: '50', def: 'Which angle, in degrees from rest.' },
                ] },
                { type: 'p', text: "So basically, you read it as: \"robot, move the right shoulder to 50 degrees\". Pretty readable, right?" },
              ],
            },
            {
              id: 'predict-the-pose', title: 'Predict the Pose',
              blocks: [
                { type: 'p', text: "Time to think like the robot! Read each pair of moves, and before you read the last column, try to picture where the arm ends up. You can even act it out with your own arm:" },
                { type: 'table', headers: ['Shoulder', 'Elbow', 'What you see'], rows: [
                  ['0', '0', 'The arm is at rest.'],
                  ['25', '0', 'The arm is partway forward, with the forearm still bent.'],
                  ['50', '0', 'The arm is all the way out, but the forearm is still bent. Not very welcoming!'],
                  ['50', '20', 'The arm is out, and the forearm opens up. Ready for a handshake!'],
                ] },
                { type: 'p', text: "As you can see, it takes **both** joints to make a good reach. The shoulder brings the arm out, and the elbow opens the forearm toward the other person." },
              ],
            },
            {
              id: 'safe-ranges', title: 'Every Joint Has a Safe Range',
              blocks: [
                { type: 'p', text: "Your elbow can't bend backwards, right? Well, the robot's joints can't either. Every servo has a smallest and a largest position that it is allowed to reach, called its **limits**. In the real `handshake.py`, they are written down in a setting called `LIMITS`. For instance, the real elbow's limits are written as `(40, 140)`: it never goes below 40 or above 140." },
                { type: 'p', text: "So, what do you think would happen if you asked for an angle past the limit? The robot keeps the joint inside its safe range, so the arm stops at the limit instead of breaking something. But that also means your move would not look the way you planned!" },
                { type: 'p', text: "Think of it like the guard rails on a bowling lane. The ball can't fall off the side, but if you're aiming for a spot outside the rails, you're not getting it either." },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'Use the angles that each lab gives you. They are tested on the real robot.' },
              ],
            },
            {
              id: 'match-the-joint', title: 'Match the Joint to Its Job',
              blocks: [
                { type: 'p', text: "Let's make sure this is clear. Pick what each line does. But be careful, there are more answers than lines!" },
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
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "Before the arm can reach, the program needs to know **how far** each joint should move. You are going to store those two angles in two settings, the same way you stored `SHAKE_CYCLES` in lab 1." },
                { type: 'table', headers: ['Setting', 'Which joint', 'Value to use', 'What it does'], rows: [
                  ['`REACH_SHOULDER`', 'right_shoulder', '**50**', 'Swings the arm forward, out toward the other person'],
                  ['`REACH_ELBOW`', 'right_elbow', '**20**', 'Opens the forearm a little'],
                ] },
                { type: 'p', text: "Why settings, and not just the numbers? Because the elbow angle is used in more than one place. The reach uses it, and in lab 4, the shake goes up and down around it. One setting, one place to change!" },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "Look right under the two settings that you wrote in lab 1, around **line 6** of `handshake_builder.py`. You should find this note:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 5, copy: false, code: '# TODO lab 2: set REACH_SHOULDER and REACH_ELBOW, the reach angles in degrees' },
                { type: 'p', text: "Heads up: line numbers move as you add lines. The original file had this note on line 5, but your two settings from lab 1 pushed it down one line. If you can't spot it, look for the words `# TODO lab 2: set REACH_SHOULDER`." },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'One of the joints needs to move a **long** way, and the other only a little. Which one gets the bigger number, 50?', options: ['The shoulder, it brings the whole arm out', 'The elbow, it opens the forearm', 'Both get 50', 'Neither, angles are always 0'], answer: 0, hint: 'Look back at the Predict the Pose table. Which joint made the arm come all the way out?', explain: 'The shoulder does the big move, 50 degrees. The elbow only opens the forearm a little, 20 degrees.' },
                { type: 'heading', level: 3, text: 'Fill in the blanks' },
                { type: 'code', lang: 'python', filename: 'The shape of the two lines', code: 'REACH_SHOULDER = ____\nREACH_ELBOW = ____', copy: false },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Find the `# TODO lab 2: set REACH_SHOULDER` note, select the whole line, and delete it.',
                  'On that empty line, type `REACH_SHOULDER`, an equals sign, and its angle.',
                  'Press **Enter**, and type `REACH_ELBOW`, an equals sign, and its angle.',
                  'Click **Check**.',
                ] },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'checklist', items: [
                  'Both lines sit with the other settings, at the left edge, with no spaces in front.',
                  'The shoulder gets 50 and the elbow gets 20, not the other way around.',
                  'The angles are plain numbers: no quotes, and no word "degrees" after them.',
                  'The other `# TODO lab 2` note, inside `reach_forward`, is still there. That one is next.',
                ] },
                { type: 'p', text: "If everything is ready, **Check** should give you something similar to this:" },
                hsCheck(3),
                { type: 'heading', level: 3, text: 'If something goes wrong' },
                { type: 'troubleshoot', items: [
                  { symptom: 'Check says 4 of 7 instead of 3 of 7', cause: 'You also deleted the `# TODO lab 2` note inside `reach_forward`.', fix: 'Press Ctrl+Z (Cmd+Z on a Mac) until it comes back.' },
                  { symptom: 'You wrote `REACH_SHOULDER = 50 degrees`', cause: 'Python only wants the number. The word "degrees" confuses it.', fix: 'Remove the word. In this file, every angle is already in degrees.' },
                ] },
                { type: 'reveal', hint: 'Same pattern as lab 1: `NAME = value`, one on each line. Angles are whole numbers here.', solution: { text: 'The two reach angles:', code: { lang: 'python', filename: 'handshake_builder.py', code: 'REACH_SHOULDER = 50\nREACH_ELBOW = 20' } } },
              ],
            },
            {
              id: 'reach-forward', title: 'Your Turn: Reach Forward',
              blocks: [
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "Now, let's use those angles! You are going to finish `reach_forward`, the function that makes the arm reach out toward the other person. You will write **two moves**: one for the shoulder, and one for the elbow." },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "Scroll down to `reach_forward`, a little past **line 21** (the lines you added above it pushed it down a bit). This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 21, copy: false, code: 'def reach_forward(motion: MotionClient) -> None:\n    say("reaching forward")\n    motion.set_hand_pose("right_hand", "open")\n    motion.move_joint_group("left_arm", LEFT_ARM_BACK)\n    # TODO lab 2: move "right_shoulder" to REACH_SHOULDER, then "right_elbow" to REACH_ELBOW, one joint at a time' },
                { type: 'p', text: "Before you change anything, let's read what is already there, line by line:" },
                { type: 'table', headers: ['Line', 'What it does'], rows: [
                  ['`def reach_forward(motion: MotionClient) -> None:`', 'Starts the function. Everything indented under it belongs to it.'],
                  ['`say("reaching forward")`', 'Prints a message, so you can follow along in the output.'],
                  ['`motion.set_hand_pose("right_hand", "open")`', 'Opens the hand. Nobody shakes a fist!'],
                  ['`motion.move_joint_group("left_arm", LEFT_ARM_BACK)`', 'Swings the left arm back, for balance. More about this in lab 4.'],
                  ['`# TODO lab 2: ...`', 'Your spot: the reach itself is missing.'],
                ] },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'The note says to move the shoulder first, then the elbow. Why does that order make sense?', options: ['The shoulder brings the arm out, and then the forearm opens toward the person', 'The elbow can only move after the shoulder is switched on', 'Python always moves shoulders first', 'The order does not matter at all'], answer: 0, hint: 'Reach out with your own arm, slowly. What moves first?', explain: 'Just like your own arm: first the arm swings out, then the forearm opens up.' },
                { type: 'heading', level: 3, text: 'Fill in the blanks' },
                { type: 'p', text: "Each move is one `move_joint` call. Here is the shape, with blanks. Notice the **4 spaces** at the start of each line:" },
                { type: 'code', lang: 'python', filename: 'The shape of the two lines', code: '    motion.move_joint("____", ____)\n    motion.move_joint("____", ____)', copy: false },
                { type: 'list', items: [
                  'The blank **inside the quotes** is the name of the joint. The note tells you both names.',
                  'The blank **after the comma** is the setting that holds its angle, the one you wrote a moment ago. No quotes around it, because it is a setting, not text.',
                ] },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Click on the `# TODO lab 2` line inside `reach_forward`.',
                  'Delete the note, **but keep the 4 spaces** at the start of the line. The easiest way: select from the `#` to the end of the line, and delete only that.',
                  'Type the shoulder move.',
                  'Press **Enter**. The editor should start the new line with the same 4 spaces. If it doesn\'t, add them yourself.',
                  'Type the elbow move.',
                  'Click **Check**.',
                ] },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'checklist', items: [
                  'Both lines start with exactly the same spaces as `motion.set_hand_pose(...)` above them, so they line up.',
                  'Both lines start with `motion.`, the robot connection.',
                  'The joint names are in quotes: `"right_shoulder"` and `"right_elbow"`, spelled exactly like that.',
                  'The settings are **not** in quotes.',
                  'The shoulder gets `REACH_SHOULDER`, and the elbow gets `REACH_ELBOW`.',
                  'Each line ends with a closing bracket `)`.',
                ] },
                { type: 'p', text: "If everything is ready, **Check** should give you something similar to this:" },
                hsCheck(4),
                { type: 'heading', level: 3, text: 'If something goes wrong' },
                { type: 'troubleshoot', items: [
                  { symptom: 'The editor shows an IndentationError', cause: 'Your lines do not line up with the lines above them, so Python can\'t tell they belong to the function.', fix: 'Make sure each of your two lines starts with exactly 4 spaces, like the others.' },
                  { symptom: 'NameError: name right_shoulder is not defined', cause: 'The joint name is missing its quotes.', fix: 'Write it as `"right_shoulder"`, with quotes.' },
                  { symptom: 'NameError: name REACH_SHOULDER is not defined', cause: 'The setting name here does not match the one at the top of the file, letter for letter.', fix: 'Check the spelling in both places. Capital letters and underscores count!' },
                ] },
                HS_RESET,
                { type: 'reveal', hint: 'Each call is `motion.move_joint(...)` with the joint name in quotes and the setting that holds its angle.', solution: { text: 'The two moves:', code: { lang: 'python', filename: 'handshake_builder.py', code: '    motion.move_joint("right_shoulder", REACH_SHOULDER)\n    motion.move_joint("right_elbow", REACH_ELBOW)' } } },
              ],
            },
            {
              id: 'bug-hunt', title: 'Bug Hunt: Joint Edition',
              blocks: [
                { type: 'p', text: "Three students wrote their reach a little differently, and each one has a bug. Be the detective! Read each piece of code carefully, then answer the questions under it. There's no limit on tries: if you pick a wrong answer, it greys out, you get a clue, and you can try again." },
                { type: 'p', text: "**Bug 1.** Remember: `REACH_SHOULDER = 50` and `REACH_ELBOW = 20`." },
                { type: 'code', lang: 'python', filename: 'Bug 1', code: 'motion.move_joint("right_shoulder", REACH_ELBOW)\nmotion.move_joint("right_elbow", REACH_SHOULDER)', copy: false },
                { type: 'mcq', question: 'In Bug 1, which angle does the **shoulder** go to?', options: ['20', '50', '70', '0'], answer: 0, hint: 'Look at which setting is written next to "right_shoulder", then check what number that setting holds.', explain: 'The shoulder was handed `REACH_ELBOW`, which is 20. The settings are swapped!' },
                { type: 'mcq', question: 'So what does the robot do when it runs Bug 1?', options: ['The arm barely comes out, and the forearm opens wide', 'A normal reach, the order of the settings does not matter', 'Python stops with an error', 'Nothing moves at all'], answer: 0, hint: 'The shoulder gets the small number and the elbow gets the big one. Picture that with your own arm.', explain: 'Each joint goes to whatever angle it is given, even the wrong one. Python has no way of knowing you mixed them up.' },
                { type: 'mcq', question: 'How do you fix Bug 1?', options: ['Give the shoulder `REACH_SHOULDER` and the elbow `REACH_ELBOW`', 'Swap the order of the two lines', 'Change `REACH_ELBOW` to 50', 'Add quotes around the settings'], answer: 0, hint: 'Each joint has a setting with its own name in it.', explain: 'Match each joint to its own setting. Swapping the lines would still send the wrong angles.' },
                { type: 'p', text: "**Bug 2.** Look closely at the joint name." },
                { type: 'code', lang: 'python', filename: 'Bug 2', code: 'motion.move_joint(right_shoulder, REACH_SHOULDER)', copy: false },
                { type: 'mcq', question: 'What is missing in Bug 2?', options: ['The quotes around `right_shoulder`', 'The word `motion.`', 'A number instead of `REACH_SHOULDER`', 'Nothing, it is correct'], answer: 0, hint: 'Compare it with the working line: motion.move_joint("right_shoulder", REACH_SHOULDER).', explain: 'A joint name is a piece of text, so it needs quotes.' },
                { type: 'mcq', question: 'Without the quotes, what does Python think `right_shoulder` is?', options: ['A variable, and it cannot find one with that name, so it stops with a NameError', 'A comment, so it skips the line', 'The joint name, it works fine', 'A number'], answer: 0, hint: 'Words without quotes are names Python looks up, like REACH_SHOULDER.', explain: 'Python looks for a variable called right_shoulder, finds none, and stops with a NameError before anything moves.' },
                { type: 'p', text: "**Bug 3.** Look at the very start of the line." },
                { type: 'code', lang: 'python', filename: 'Bug 3', code: 'move_joint("right_shoulder", REACH_SHOULDER)', copy: false },
                { type: 'mcq', question: 'What is missing in Bug 3?', options: ['`motion.` at the front', 'The quotes around the joint name', 'The angle', 'A `sleep` after the move'], answer: 0, hint: 'Every move goes through the robot connection. What is its name in this file?', explain: 'Without `motion.`, Python has no idea which robot to talk to, and it stops with a NameError on move_joint.' },
                { type: 'mcq', question: 'Bug 2 and Bug 3 both stop with a NameError. What does a NameError mean?', options: ['Python found a name it does not know', 'The robot hit a joint limit', 'The angle is too big', 'The robot is switched off'], answer: 0, hint: 'Think back to Wave, when sleep was used without its import.', explain: 'A NameError means Python met a name it has never been told about: a missing import, missing quotes, or a missing `motion.`.' },
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
                { type: 'p', text: "Finally, let's check what you learned about joints. Pick an answer for each question. If it is wrong, it greys out and you can try another one." },
                { type: 'mcq', question: 'In `handshake_builder.py`, what does an angle of 0 mean?', options: ['The joint is at rest', 'The joint is at its limit', 'The joint is switched off', 'The joint turns forever'], answer: 0, explain: 'Every angle is measured from the rest pose, so 0 is rest.' },
                { type: 'mcq', question: 'How many joints does one `move_joint` call move?', options: ['One', 'Two', 'Every joint in the arm', 'None, it only checks the angle'], answer: 0, explain: 'move_joint names one joint and one angle.' },
                { type: 'mcq', question: 'What turns each joint on SwayForm?', options: ['A small motor called a servo', 'A spring', 'The MotionClient import', 'The sleep function'], answer: 0, explain: 'You tell a servo an angle, and it turns until it gets there.' },
                { type: 'mcq', question: 'Why does every joint have limits?', options: ['So it never turns past what it can safely reach', 'To make the robot faster', 'To save battery', 'Python needs them to run'], answer: 0, explain: 'Limits keep each joint inside its safe range.' },
                { type: 'mcq', question: 'Why is the joint name written in quotes, like `"right_elbow"`?', options: ['It is a name, a piece of text, not a variable', 'Quotes make the move faster', 'Quotes turn it into a comment', 'Python ignores quoted words'], answer: 0, explain: 'Without the quotes, Python looks for a variable with that name and stops with a NameError.' },
              ],
            },
          ],
          completionSummary: { text: 'You learned what joints and angles are, and you made the arm reach forward one joint at a time.', conceptsUsed: ['Joints', 'Angles', 'Limits'] },
        },

        // Lab 3
        {
          id: 'hs-03-sequencing', title: 'Movement Sequencing', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 to 30 minutes',
          summary: 'Put the handshake moves in order, with a pause in the right place, inside try and finally.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Sequences', 'Pauses', 'Function calls', 'try / finally'],
          steps: [
            targets('25 to 30 minutes', 'In this lab, you are going to put the moves of the handshake in order. You will:', [
              'See a behavior as a sequence of poses, with pauses between them.',
              'Find out why the pause before the grip matters.',
              'Trace what happens when something goes wrong halfway.',
              'Write the handshake steps, in order, inside `try`.',
            ]),
            {
              id: 'a-sequence', title: 'A Sequence of Poses',
              blocks: [
                { type: 'p', text: "In simple terms, a robot behavior is a **sequence**: a list of poses, done one after the other, with pauses between them. You already met this idea in Wave. The robot does exactly what you wrote, from top to bottom." },
                { type: 'p', text: "Think about making a sandwich. Bread, then filling, then the other slice of bread. Put the top slice on first and you have... well, not a sandwich. A handshake works the same way. Here it is as a sequence:" },
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
              id: 'act-it-out', title: 'Act It Out',
              blocks: [
                { type: 'p', text: "Before you write any code, let's play a game. You need a partner: one of you is the **programmer**, and the other one is the **robot**." },
                { type: 'steps', items: [
                  'The programmer reads the five steps above out loud, one at a time.',
                  'The robot does **exactly** what it hears, and nothing else. No guessing!',
                  'Now, the programmer reads them in a mixed-up order, like grip first, then reach.',
                  'Swap roles, and try leaving the wait out.',
                ] },
                { type: 'p', text: "Pretty funny, right? A robot that grips first reaches out with a fist. And a robot that doesn't wait closes its hand on nothing. That's exactly what the real robot would do, too." },
              ],
            },
            {
              id: 'pauses', title: 'Pauses Are Steps Too',
              blocks: [
                { type: 'p', text: "So, what do you think would happen without the pause? Let's find out. Have a look at this sequence:" },
                { type: 'code', lang: 'python', filename: 'No pause', code: 'reach_forward(motion)\ngrip(motion)', copy: false },
                { type: 'p', text: "The hand closes the very moment the arm arrives. Nobody had time to take it, so the robot grips the air! A pause is a step too, even though nothing moves:" },
                { type: 'code', lang: 'python', filename: 'With a pause', code: 'reach_forward(motion)\nsleep(HOLD_BEFORE_GRIP)\ngrip(motion)', copy: false },
                { type: 'p', text: "As you can see, `sleep` sits between the two moves, exactly where the wait belongs. And because it uses the setting from lab 1, you can make the wait longer or shorter by changing one number." },
              ],
            },
            {
              id: 'unscramble', title: 'Puzzle: The Scrambled Handshake',
              blocks: [
                { type: 'p', text: "Oh no! A cat walked across the keyboard, and now the handshake is all scrambled. Here is what it left behind:" },
                { type: 'code', lang: 'python', filename: 'After the cat', code: 'shake(motion)\nreach_forward(motion)\ngrip(motion)\nsleep(HOLD_BEFORE_GRIP)', copy: false },
                { type: 'p', text: "Before you fix it, think about it for a second: if the robot ran this exactly as it is, it would shake its arm in the air, reach out, grab right away, and then just stand there holding on. Not great!" },
                { type: 'p', text: "Your job is to put the lines back in the right order. Pick which line goes in each spot. Careful, the cat also dragged in a line from the last section! You can press **Check matches** as many times as you need." },
                { type: 'match', prompt: 'Put the handshake back in order.', pairs: [
                  ['1st line', 'reach_forward(motion)'],
                  ['2nd line', 'sleep(HOLD_BEFORE_GRIP)'],
                  ['3rd line', 'grip(motion)'],
                  ['4th line', 'shake(motion)'],
                ], distractors: [
                  'wave(motion)',
                ], explain: 'Reach out, wait for the other person, grip, then shake. And wave(motion) belongs to the Wave section, not to this one!' },
                { type: 'p', text: "Nice work! But the cat wasn't done. Here is a second handshake it messed with. This time, nothing is out of order, but something is **missing**:" },
                { type: 'code', lang: 'python', filename: 'Something is missing', code: 'reach_forward(motion)\nsleep(HOLD_BEFORE_GRIP)\ngrip(motion)', copy: false },
                { type: 'mcq', question: 'Which line did the cat delete?', options: ['`shake(motion)`', '`reach_forward(motion)`', '`grip(motion)`', '`sleep(HOLD_BEFORE_GRIP)`'], answer: 0, hint: 'Say the recipe out loud: reach, wait, grip, ... what comes next?', explain: 'Without the shake, the robot reaches out, holds the hand, and then just lets go. A step that is never called never happens!' },
                { type: 'p', text: "And one last one. Everything is here this time, but the pause wandered off to the wrong spot:" },
                { type: 'code', lang: 'python', filename: 'The pause moved', code: 'reach_forward(motion)\ngrip(motion)\nsleep(HOLD_BEFORE_GRIP)\nshake(motion)', copy: false },
                { type: 'mcq', question: 'What does the person on the other side feel?', options: ['The hand snaps shut on the air, then everything freezes for 2 seconds before a shake', 'A perfect handshake', 'The robot never reaches out', 'Python stops with an error'], answer: 0, hint: 'The grip now happens right after the reach. Did anyone have time to take the hand?', explain: 'The pause only helps if it sits between the reach and the grip. Same lines, different order, very different handshake.' },
              ],
            },
            {
              id: 'what-if-it-fails', title: 'What If Something Fails Halfway?',
              blocks: [
                { type: 'p', text: "Remember `try` and `finally` from Wave? The handshake uses them too. The main steps go under `try:`, and the cleanup goes under `finally:`. But this time, cleanup matters even more. Why? Because someone might be **holding the robot's hand**!" },
                { type: 'p', text: "Let's trace it. Imagine the shake fails halfway because of a loose cable. Here is what runs, line by line:" },
                { type: 'table', headers: ['Line', 'Runs?', 'Why'], rows: [
                  ['`reach_forward(motion)`', 'Yes', 'Under `try`, before the problem.'],
                  ['`sleep(HOLD_BEFORE_GRIP)`', 'Yes', 'Under `try`, before the problem.'],
                  ['`grip(motion)`', 'Yes', 'Under `try`, before the problem.'],
                  ['`shake(motion)`', 'Fails halfway', 'The problem happens here.'],
                  ['`let_go(motion)`', 'Yes!', 'It is under `finally`, which runs no matter what.'],
                ] },
                { type: 'p', text: "So even if the shake goes wrong, the hand still opens and lets go of the person. That's why `let_go` lives under `finally`, and not at the end of `try`." },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn: The Handshake in Order',
              blocks: [
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "All the moves of the handshake already exist as functions. But nothing calls them yet, so the robot would just stand there! Your job is to write the **four lines** that run the handshake, in the right order: reach, wait, grip and shake." },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "Scroll down to `perform_handshake`, a little past **line 44** (your lines from labs 1 and 2 pushed it down a bit). This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 44, copy: false, code: 'def perform_handshake(motion: MotionClient) -> None:\n    try:\n        # TODO lab 3: call reach_forward, wait HOLD_BEFORE_GRIP seconds, then call grip and shake, in that order\n        pass\n    finally:\n        let_go(motion)\n        # TODO lab 4: ...' },
                { type: 'p', text: "Let's read it together:" },
                { type: 'table', headers: ['Line', 'What it means'], rows: [
                  ['`try:`', 'The main steps go under here. Your four lines go here.'],
                  ['`# TODO lab 3: ...`', 'Your spot. You replace this note.'],
                  ['`pass`', 'A placeholder that means "do nothing". Python needs at least one line under `try:`, so `pass` holds the spot until you write real lines. Once you do, delete it.'],
                  ['`finally:`', 'The cleanup, which runs no matter what. Leave it alone.'],
                  ['`let_go(motion)`', 'Already written: the hand lets go.'],
                  ['`# TODO lab 4: ...`', 'For the next lab. Leave it alone.'],
                ] },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'Three of your lines call a function, and one does not. Which one is the odd one out?', options: ['The pause, it uses `sleep` with a setting', 'The grip', 'The reach', 'The shake'], answer: 0, hint: 'Three of the steps are functions in this file that take motion. One step is a wait.', explain: 'reach_forward, grip and shake each take motion. The pause is sleep, and it takes a number of seconds instead: HOLD_BEFORE_GRIP.' },
                { type: 'heading', level: 3, text: 'Fill in the blanks' },
                { type: 'p', text: "Here is the shape. Notice the **8 spaces** at the start of each line: 4 for being inside the function, and 4 more for being inside `try`." },
                { type: 'code', lang: 'python', filename: 'The shape of the four lines', code: '        ____(motion)\n        sleep(____)\n        ____(motion)\n        ____(motion)', copy: false },
                { type: 'list', items: [
                  'The three `____(motion)` blanks are function names. Look at the note, or at the functions higher up in the file: `reach_forward`, `grip` and `shake`. But which goes where?',
                  'The blank inside `sleep(...)` is the setting from lab 1 that holds the wait, in seconds.',
                ] },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Click on the `# TODO lab 3` line, under `try:`.',
                  'Delete the note, but keep the 8 spaces in front of it.',
                  'Type the first step, the reach.',
                  'Press **Enter**, and type the pause.',
                  'Press **Enter**, and type the grip. Then **Enter** again, and the shake.',
                  'Now, delete the whole `pass` line under your four lines. You don\'t need the placeholder anymore.',
                  'Click **Check**.',
                ] },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'checklist', items: [
                  'There are four lines under `try:`, in this order: reach, pause, grip, shake.',
                  'All four lines start with the same 8 spaces, so they line up.',
                  'The three function calls end with `(motion)`.',
                  'The pause is `sleep(...)` with the setting name inside, not a number.',
                  'The `pass` line is gone.',
                  '`finally:`, `let_go(motion)` and the `# TODO lab 4` note are still there, untouched.',
                ] },
                { type: 'p', text: "If everything is ready, **Check** should give you something similar to this:" },
                hsCheck(5),
                { type: 'heading', level: 3, text: 'If something goes wrong' },
                { type: 'troubleshoot', items: [
                  { symptom: 'Check still says 4 of 7', cause: 'Part of the `# TODO lab 3` note is still there.', fix: 'Delete what is left of the note.' },
                  { symptom: 'The editor shows an IndentationError', cause: 'Your four lines don\'t line up with each other, or they are not indented further than `try:`.', fix: 'Give every one of them exactly 8 spaces in front.' },
                  { symptom: 'NameError: name HOLD_BEFORE_GRIP is not defined', cause: 'The setting name inside `sleep` does not match the one from lab 1, letter for letter.', fix: 'Check the spelling against the top of the file.' },
                ] },
                HS_RESET,
                { type: 'reveal', hint: 'Three calls, each one a name followed by (motion), and one sleep between the first two. All four lines are indented under try.', solution: { text: 'The steps, in order:', code: { lang: 'python', filename: 'handshake_builder.py', code: '    try:\n        reach_forward(motion)\n        sleep(HOLD_BEFORE_GRIP)\n        grip(motion)\n        shake(motion)' } } },
              ],
            },
            {
              id: 'run-it', title: 'Run It',
              blocks: [
                { type: 'p', text: "Now, click **Run**. You should get something similar to this:" },
                runOutput('handshake_builder', false),
                { type: 'p', text: "As you can see, Run still warns you, because two pieces are left: the shake itself, and bringing both arms home. That is exactly what the next lab is for." },
              ],
            },
            {
              id: 'sequence-questions', title: 'Quick Questions: Sequencing',
              blocks: [
                { type: 'p', text: "Finally, let's check what you learned about sequences. Pick an answer for each question. If it is wrong, it greys out and you can try another one." },
                { type: 'mcq', question: 'Why does the handshake wait before it grips?', options: ['So the other person has time to take the hand', 'So the servo can cool down', 'Python needs a pause after every move', 'It does not, the pause is optional'], answer: 0, explain: 'Without it, the hand closes the moment it arrives and grips the air.' },
                { type: 'mcq', question: 'The calls are `grip`, then `reach_forward`. What does the robot do?', options: ['It closes the hand, then reaches out with a closed hand', 'A normal handshake', 'Python stops with an error', 'It skips the grip'], answer: 0, explain: 'The robot does exactly what is written, top to bottom.' },
                { type: 'mcq', question: 'What does the robot do during `sleep(HOLD_BEFORE_GRIP)`?', options: ['It holds still, with the hand open, for that many seconds', 'It moves slowly to the next pose', 'It turns its servos off', 'It shakes while it waits'], answer: 0, explain: 'A pause is a step where nothing moves. The arm stays where reach_forward left it.' },
                { type: 'mcq', question: 'Why is `let_go` under `finally`?', options: ['So the hand always opens, even if something fails', 'So it runs first', 'So it runs twice', 'It makes the shake faster'], answer: 0, explain: 'finally runs no matter what, so the robot never stays holding on.' },
                { type: 'mcq', question: 'The shake fails halfway. Which of these still runs?', options: ['`let_go(motion)`, under finally', 'The rest of the shake', 'Nothing at all', 'The whole handshake, from the start'], answer: 0, explain: 'A failure skips the rest of try, but finally always runs.' },
              ],
            },
          ],
          completionSummary: { text: 'You put the handshake steps in order, with the pause where it belongs.', conceptsUsed: ['Sequences', 'Pauses', 'Function calls'] },
        },

        // Lab 4
        {
          id: 'hs-04-coordination', title: 'Coordination', kind: 'activity', difficulty: 'beginner', estimatedTime: '30 to 35 minutes',
          summary: 'Make joints and arms work together: the shake, and the return of both arms. This finishes the handshake program.',
          workspaceFile: HS_BUILDER,
          relatedConcepts: ['Coordination', 'Joint groups', 'Loops', 'Timing'],
          steps: [
            targets('30 to 35 minutes', 'In this lab, you are going to make the joints work together, and finish the handshake program. You will:', [
              'See why the left arm moves while the right arm reaches.',
              'Learn the difference between moving one joint and moving a group of joints.',
              'Trace the shake, one cycle at a time.',
              'Write the shake, and the return of both arms.',
            ]),
            {
              id: 'two-arms', title: 'Two Arms, One Move',
              blocks: [
                { type: 'p', text: "Here's a quick experiment. Stand up, and reach as far forward as you can with your right arm, as if you were grabbing something just out of reach. What did your left arm do?" },
                { type: 'p', text: "It probably swung back a little, all on its own! When you reach far forward, your weight shifts, and your other arm moves back to balance you. You do it without even thinking." },
                { type: 'p', text: "Well, the robot has to be told. Have a look at `reach_forward` again. There is a line in it that moves the **left** arm:" },
                { type: 'code', lang: 'python', filename: 'From handshake_builder.py', code: 'motion.move_joint_group("left_arm", LEFT_ARM_BACK)', copy: false },
                { type: 'p', text: "When the right arm reaches out, the robot's weight shifts forward. The left arm swings back a little to balance it. This is called **coordination**: different parts of the robot moving together for one goal." },
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
                { type: 'p', text: "But what does a group pose look like on the inside? Let's open one up:" },
                { type: 'code', lang: 'python', filename: 'From handshake_builder.py', code: 'HOME_ARM = {"right_shoulder": 0, "right_elbow": 0}\nLEFT_ARM_BACK = {"left_shoulder": -40}', copy: false },
                { type: 'terms', items: [
                  { term: '{ }', def: 'The curly brackets hold a list of joint and angle pairs.' },
                  { term: '"right_shoulder": 0', def: 'One pair: the joint name, a colon, and its angle.' },
                  { term: ',', def: 'A comma separates one pair from the next.' },
                  { term: '-40', def: 'A negative angle: the left shoulder swings back, the other way from forward.' },
                ] },
                { type: 'p', text: "A group move is how you make joints arrive **together**, like a team that moves on the count of three. The real `handshake.py` does the same thing: it starts several joints at once, so the shoulder, the elbow and the left arm all move at the same time." },
              ],
            },
            {
              id: 'the-shake', title: 'The Shake: A Small Move, Repeated',
              blocks: [
                { type: 'p', text: "Now, let's look at the shake. It is a small move, repeated. The elbow goes a little up, a little down, again and again, around its reach angle. In fact, the real elbow only moves **5 degrees** each way. Small, but that is what a handshake is! Nobody wants their arm pumped like a water well." },
                { type: 'p', text: "With `REACH_ELBOW = 20` and `SHAKE_OFFSET = 5`, the elbow goes like this:" },
                { type: 'table', headers: ['Move', 'Angle'], rows: [
                  ['up', '`REACH_ELBOW + SHAKE_OFFSET`, which is 25'],
                  ['down', '`REACH_ELBOW - SHAKE_OFFSET`, which is 15'],
                  ['(repeat `SHAKE_CYCLES` times)', ''],
                  ['settle', '`REACH_ELBOW`, which is 20. This line is already in the file.'],
                ] },
                { type: 'p', text: "And between the moves, a short `sleep(SHAKE_STEP_SECONDS)` gives the shake its rhythm. Without it, the moves would blur into one." },
                { type: 'p', text: "By the way, notice that you never type 25 or 15 anywhere. Python does the math for you: `REACH_ELBOW + SHAKE_OFFSET` is 20 + 5. So if you ever change `REACH_ELBOW`, the shake follows it automatically." },
              ],
            },
            {
              id: 'trace-the-shake', title: 'Trace the Shake',
              blocks: [
                { type: 'p', text: "Time to think like the robot one more time! Here is what happens with `SHAKE_CYCLES = 3`, one line at a time. Follow along with your own elbow if you want:" },
                { type: 'table', headers: ['Cycle', 'Elbow goes to', 'Then'], rows: [
                  ['1', '25 (up)', 'waits 0.3 seconds'],
                  ['1', '15 (down)', 'waits 0.3 seconds'],
                  ['2', '25 (up)', 'waits 0.3 seconds'],
                  ['2', '15 (down)', 'waits 0.3 seconds'],
                  ['3', '25 (up)', 'waits 0.3 seconds'],
                  ['3', '15 (down)', 'waits 0.3 seconds'],
                  ['after the loop', '20 (settle)', 'ready to let go'],
                ] },
                { type: 'p', text: "As you can see, one cycle is one up **and** one down. So 3 cycles means 3 ups and 3 downs, and the waits alone add up to 6 × 0.3 = 1.8 seconds of shaking." },
                { type: 'mcq', required: false, question: 'With `SHAKE_CYCLES = 2`, how many times does the elbow go up?', options: ['2', '1', '4', '3'], answer: 0, explain: 'Each cycle is one up and one down, so 2 cycles means 2 ups and 2 downs.' },
              ],
            },
            {
              id: 'write-the-shake', title: 'Your Turn: Write the Shake',
              blocks: [
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "This is the biggest piece of the handshake! You are going to write the **loop** that makes the elbow pump up and down `SHAKE_CYCLES` times. It is five lines in total: the `for` line, and four lines inside it." },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "Scroll to `shake`, a little past **line 33** (your earlier lines pushed it down a bit). This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 33, copy: false, code: 'def shake(motion: MotionClient) -> None:\n    say("shaking")\n    # TODO lab 4: SHAKE_CYCLES times, move "right_elbow" up by SHAKE_OFFSET and then down by SHAKE_OFFSET, with a sleep after each move\n    motion.move_joint("right_elbow", REACH_ELBOW)' },
                { type: 'p', text: "The last line, the **settle**, is already written. It puts the elbow back at its reach angle once the shake is done. Your loop goes **above** it." },
                { type: 'heading', level: 3, text: 'Plan it in plain words' },
                { type: 'p', text: "Good programmers often write the plan in plain words first, and then turn each line into code. Here is the plan for the shake:" },
                { type: 'code', lang: 'text', filename: 'The plan', code: 'repeat SHAKE_CYCLES times:\n    move the elbow UP to REACH_ELBOW + SHAKE_OFFSET\n    wait SHAKE_STEP_SECONDS\n    move the elbow DOWN to REACH_ELBOW - SHAKE_OFFSET\n    wait SHAKE_STEP_SECONDS', copy: false },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'Which line of the plan becomes `for _ in range(SHAKE_CYCLES):`?', options: ['"repeat SHAKE_CYCLES times"', '"move the elbow UP"', '"wait SHAKE_STEP_SECONDS"', 'None of them'], answer: 0, hint: 'Which line of the plan is about repeating?', explain: 'A for loop with range repeats a set number of times. Everything indented under it in the plan goes inside the loop.' },
                { type: 'mcq', required: false, question: 'How many lines go **inside** the loop?', options: ['4', '1', '2', '5'], answer: 0, hint: 'Count the indented lines in the plan.', explain: 'Up, wait, down, wait. Four lines, all indented under the for line.' },
                { type: 'heading', level: 3, text: 'Fill in the blanks' },
                { type: 'p', text: "Here is the shape, with the settle line at the bottom so you can see where everything sits:" },
                { type: 'code', lang: 'python', filename: 'The shape of the loop', code: '    for _ in range(____):\n        motion.move_joint("right_elbow", ____ + ____)\n        sleep(____)\n        motion.move_joint("right_elbow", ____ - ____)\n        sleep(____)\n    motion.move_joint("right_elbow", REACH_ELBOW)', copy: false },
                { type: 'p', text: "Pay close attention to the spaces at the start of each line. They decide what repeats:" },
                { type: 'table', headers: ['Line', 'Spaces in front', 'Why'], rows: [
                  ['`for _ in range(...):`', '4', 'It is inside the function.'],
                  ['The two moves and the two sleeps', '8', 'They are inside the loop, so they repeat.'],
                  ['The settle line (already there)', '4', 'It is outside the loop, so it runs once, at the end.'],
                ] },
                { type: 'list', items: [
                  'All the blanks are **settings** that already exist: `SHAKE_CYCLES`, `REACH_ELBOW`, `SHAKE_OFFSET` and `SHAKE_STEP_SECONDS`. Use the plan to decide which goes where.',
                  'Don\'t forget the colon `:` at the end of the `for` line.',
                ] },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Click on the `# TODO lab 4` line inside `shake`.',
                  'Delete the note, but keep the 4 spaces in front of it.',
                  'Type the `for` line, ending with a colon. Press **Enter**. The editor should indent the next line by 4 more spaces, to 8.',
                  'Type the up move. Press **Enter**, and type the first sleep.',
                  'Press **Enter**, and type the down move. Press **Enter**, and type the second sleep.',
                  'Make sure the settle line is still there, below your loop, with only 4 spaces in front.',
                  'Click **Check**.',
                ] },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'checklist', items: [
                  'The `for` line ends with a colon `:`.',
                  'The four lines inside the loop all have 8 spaces in front, and line up with each other.',
                  'The up move uses `+`, and the down move uses `-`.',
                  'There is a `sleep(SHAKE_STEP_SECONDS)` after **each** move.',
                  'The settle line is below the loop, with 4 spaces, and you did not change it.',
                ] },
                { type: 'p', text: "If everything is ready, **Check** should give you something similar to this:" },
                hsCheck(6),
                { type: 'heading', level: 3, text: 'If something goes wrong' },
                { type: 'troubleshoot', items: [
                  { symptom: 'SyntaxError: expected \':\'', cause: 'The `for` line is missing its colon at the end.', fix: 'Add `:` at the end of `for _ in range(SHAKE_CYCLES)`.' },
                  { symptom: 'IndentationError: expected an indented block', cause: 'The lines under `for` are not indented further than the `for` line.', fix: 'Give the four lines inside the loop 8 spaces in front.' },
                  { symptom: 'You suspect the elbow would only go down once', cause: 'The down move or its sleep has only 4 spaces, so it is outside the loop.', fix: 'Make sure all four lines inside the loop have 8 spaces.' },
                ] },
                HS_RESET,
                { type: 'reveal', hint: 'The loop is `for _ in range(SHAKE_CYCLES):`, with four indented lines under it. The angles are REACH_ELBOW plus and minus SHAKE_OFFSET.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'handshake_builder.py', code: 'def shake(motion: MotionClient) -> None:\n    say("shaking")\n    for _ in range(SHAKE_CYCLES):\n        motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n        sleep(SHAKE_STEP_SECONDS)\n        motion.move_joint("right_elbow", REACH_ELBOW - SHAKE_OFFSET)\n        sleep(SHAKE_STEP_SECONDS)\n    motion.move_joint("right_elbow", REACH_ELBOW)' } } },
              ],
            },
            {
              id: 'shake-bug-hunt', title: 'Bug Hunt: Shake Edition',
              blocks: [
                { type: 'p', text: "Let's hunt some bugs. Each of these shakes has one mistake. Read the code, guess what the robot does, and then open the boxes below to check." },
                { type: 'code', lang: 'python', filename: 'Bug 1', code: 'for _ in range(SHAKE_CYCLES):\n    motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n    sleep(SHAKE_STEP_SECONDS)\n    motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n    sleep(SHAKE_STEP_SECONDS)', copy: false },
                { type: 'code', lang: 'python', filename: 'Bug 2', code: 'for _ in range(SHAKE_CYCLES):\n    motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n    motion.move_joint("right_elbow", REACH_ELBOW - SHAKE_OFFSET)', copy: false },
                { type: 'code', lang: 'python', filename: 'Bug 3', code: 'for _ in range(SHAKE_CYCLES):\n    motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n    sleep(SHAKE_STEP_SECONDS)\nmotion.move_joint("right_elbow", REACH_ELBOW - SHAKE_OFFSET)\nsleep(SHAKE_STEP_SECONDS)', copy: false },
                { type: 'troubleshoot', items: [
                  { symptom: 'Bug 1: the elbow goes up once, and then just stays there', cause: 'Both moves use `+ SHAKE_OFFSET`, so the "down" move goes to 25 too. The elbow is already there, so nothing moves.', fix: 'The second move should be `REACH_ELBOW - SHAKE_OFFSET`.' },
                  { symptom: 'Bug 2: the elbow just twitches, and there is no real shake', cause: 'There are no pauses, so each new move starts before the last one has finished. The moves blur into one.', fix: 'Add `sleep(SHAKE_STEP_SECONDS)` after each move.' },
                  { symptom: 'Bug 3: the elbow goes up three times, and down only once', cause: 'The down move and its sleep are not indented, so they are outside the loop and run only once, after it.', fix: 'Indent the last two lines so they are inside the loop.' },
                ] },
              ],
            },
            {
              id: 'try-changing-this', title: 'Give Your Handshake a Personality',
              blocks: [
                { type: 'p', text: "But there's more! Your handshake reads two settings from lab 1, so you can change how it feels without touching the rest of the code. Have a look at these combinations:" },
                { type: 'table', headers: ['Personality', 'SHAKE_CYCLES', 'HOLD_BEFORE_GRIP', 'What it feels like'], rows: [
                  ['Shy', '1', '3.0', 'A long, careful wait, then one tiny shake'],
                  ['Polite', '3', '2.0', 'The handshake you are building'],
                  ['Eager', '5', '1.0', 'A quick grab and lots of shaking'],
                  ['Impatient', '3', '0', 'Grips the air before anyone can take the hand. Oops!'],
                ] },
                { type: 'p', text: "Which one would you pick for SwayForm meeting the principal? And which one for meeting a friend? Try one out, click **Run**, and then put the values back to **3** and **2.0** before lab 5." },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep `SHAKE_CYCLES` at 10 or less. Never change `SHAKE_OFFSET`, the reach angles, or the arm poses. Those values are tested.' },
              ],
            },
            {
              id: 'both-arms-home', title: 'Your Turn: Both Arms Home',
              blocks: [
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "One piece left! During the handshake, the right arm reached out and the left arm swung back. So, at the end, **both** of them have to come home. You are going to write **two group moves**, one for each arm, in the cleanup." },
                { type: 'p', text: "Notice that `let_go` comes **first** under `finally`. Why does that matter? Imagine the arm pulling back home while the hand is still closed: it would drag the other person's hand along with it! So the hand opens first, and only then do the arms go home. Your two lines go **after** `let_go`." },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "Go back to `perform_handshake`, and look under `finally:`, around **line 48**. This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake_builder.py', workspaceFile: HS_BUILDER, line: 48, copy: false, code: '    finally:\n        let_go(motion)\n        # TODO lab 4: move the "right_arm" group to HOME_ARM and the "left_arm" group to LEFT_ARM_HOME' },
                { type: 'p', text: "Heads up: since you added lines in lab 3 and in the shake, the line numbers may have moved down a bit. Look for the `# TODO lab 4` note right under `let_go(motion)`." },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'You want every joint of an arm to move back together. Which tool do you use?', options: ['`motion.move_joint_group`', '`motion.move_joint`', '`sleep`', '`say`'], answer: 0, hint: 'One of these moves a single joint. Another moves a whole group at once.', explain: 'move_joint_group sends a whole group, like "right_arm", to a pose that holds an angle for each joint.' },
                { type: 'p', text: "Here are the two arms, and the pose that brings each one home. Both poses are settings near the top of the file:" },
                { type: 'table', headers: ['Group name', 'Pose setting', 'What it holds'], rows: [
                  ['`"right_arm"`', '`HOME_ARM`', 'The resting angles for the right shoulder and elbow'],
                  ['`"left_arm"`', '`LEFT_ARM_HOME`', 'The resting angle for the left shoulder'],
                ] },
                { type: 'heading', level: 3, text: 'Fill in the blanks' },
                { type: 'p', text: "Here is the shape. These lines are inside `finally`, so they have **8 spaces** in front, just like `let_go(motion)`:" },
                { type: 'code', lang: 'python', filename: 'The shape of the two lines', code: '        motion.move_joint_group("____", ____)\n        motion.move_joint_group("____", ____)', copy: false },
                { type: 'list', items: [
                  'The blank **in quotes** is the group name, from the table.',
                  'The blank **after the comma** is the pose setting, with no quotes.',
                  'You have seen this exact shape before: `reach_forward` uses it to swing the left arm back.',
                ] },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Click on the `# TODO lab 4` line under `let_go(motion)`.',
                  'Delete the note, but keep the 8 spaces in front of it.',
                  'Type the move for the right arm.',
                  'Press **Enter**, and type the move for the left arm.',
                  'Click **Check**.',
                ] },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'checklist', items: [
                  '`let_go(motion)` is still the first line under `finally:`.',
                  'Your two lines come right after it, with the same 8 spaces in front.',
                  'The group names are in quotes: `"right_arm"` and `"left_arm"`.',
                  'The pose settings are **not** in quotes.',
                  'The right arm goes to `HOME_ARM`, and the left arm goes to `LEFT_ARM_HOME`.',
                ] },
                { type: 'p', text: "If everything is ready, **Check** should give you something similar to this:" },
                hsCheck(7),
                { type: 'heading', level: 3, text: 'If something goes wrong' },
                { type: 'troubleshoot', items: [
                  { symptom: 'Check says 6 of 7', cause: 'Part of the `# TODO lab 4` note under `let_go` is still there.', fix: 'Delete what is left of the note.' },
                  { symptom: 'The editor shows an IndentationError', cause: 'Your lines don\'t line up with `let_go(motion)`.', fix: 'Give both lines exactly 8 spaces in front.' },
                  { symptom: 'The arms would go to the wrong place', cause: 'The poses are swapped: the right arm got `LEFT_ARM_HOME`, or the other way around.', fix: 'Match each group with its own pose, using the table above.' },
                ] },
                HS_RESET,
                { type: 'reveal', hint: 'Two lines, each one `motion.move_joint_group(...)` with a group name in quotes and the pose setting.', solution: { text: 'The end of perform_handshake:', code: { lang: 'python', filename: 'handshake_builder.py', code: '    finally:\n        let_go(motion)\n        motion.move_joint_group("right_arm", HOME_ARM)\n        motion.move_joint_group("left_arm", LEFT_ARM_HOME)' } } },
              ],
            },
            {
              id: 'run-it', title: 'Run the Finished Program',
              blocks: [
                { type: 'p', text: "7 of 7! Your handshake program is complete. So, let's run it! Click **Run**. You should get something similar to this:" },
                runOutput('handshake_builder', true),
                { type: 'p', text: "As you can see, every required value is set. Keep in mind that this Run is a simulation: it checks your file, but it does not move the robot. That happens in lab 5." },
                { type: 'p', text: "About 70% of the file was there when you started. The other 30% is yours! Scroll through the file and find every piece that you wrote:" },
                { type: 'checklist', items: [
                  'The `sleep` import (lab 1)',
                  'The two settings, `SHAKE_CYCLES` and `HOLD_BEFORE_GRIP` (lab 1)',
                  'The reach angles, `REACH_SHOULDER` and `REACH_ELBOW` (lab 2)',
                  'The two `move_joint` calls in `reach_forward` (lab 2)',
                  'The steps in order, inside `try` (lab 3)',
                  'The loop in `shake` (lab 4)',
                  'Both arms home, under `finally` (lab 4)',
                ] },
              ],
            },
            {
              id: 'coordination-questions', title: 'Quick Questions: Coordination',
              blocks: [
                { type: 'p', text: "Finally, let's check what you learned in this lab. Pick an answer for each question. If it is wrong, it greys out and you can try another one." },
                { type: 'mcq', question: 'With `REACH_ELBOW = 20` and `SHAKE_OFFSET = 5`, which two angles does the shake swing between?', options: ['25 and 15', '20 and 5', '25 and 20', '5 and -5'], answer: 0, explain: 'The elbow goes SHAKE_OFFSET above and below REACH_ELBOW.' },
                { type: 'mcq', question: 'What is the difference between `move_joint` and `move_joint_group`?', options: ['One joint, or several joints that move together', 'There is no difference', 'move_joint is faster', 'move_joint_group only works on the left arm'], answer: 0, explain: 'A group move sends every joint in the group at once.' },
                { type: 'mcq', question: 'Why does the left arm swing back while the right arm reaches?', options: ['To balance the robot', 'To wave at someone', 'Because it has to copy the right arm', 'It does not move at all'], answer: 0, explain: 'Swinging the other arm back keeps the robot steady while it reaches.' },
                { type: 'mcq', question: 'In `LEFT_ARM_BACK = {"left_shoulder": -40}`, what does the minus sign mean?', options: ['The shoulder moves the other way from forward, so the arm swings back', 'The move is skipped', 'The shoulder moves 40 times', 'It is a mistake'], answer: 0, explain: 'A negative angle moves the joint the opposite way from a positive one.' },
                { type: 'mcq', question: 'Why does `let_go` come before the arms go home?', options: ['So the hand opens before the arm pulls back, and never drags the other person\'s hand', 'It does not matter which comes first', 'So the shake can repeat', 'Python needs the hand to move first'], answer: 0, explain: 'Open first, then go home. Otherwise the robot would pull the person along with it!' },
              ],
            },
          ],
          completionSummary: { text: 'You made the joints work together, wrote the shake, and finished the handshake program.', conceptsUsed: ['Coordination', 'Joint groups', 'Loops'] },
        },

        // Lab 5
        {
          id: 'hs-05-run', title: 'Handshake Review, Quiz and Robot Run', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 to 35 minutes',
          summary: 'A review of labs 1 to 4, a ten-question quiz, then the real handshake on SwayForm. Needs a finished handshake_builder.py, 80% on the quiz, and an admin to approve.',
          workspaceFile: REAL_HANDSHAKE,
          extraFiles: [HS_BUILDER],
          robotGate: {
            needsQuiz: [{ id: HANDSHAKE_QUIZ_ID, text: `Pass the quiz in this lab with ${QUIZ_PASS}% or better.` }],
            needsNoTodos: [{ path: HS_BUILDER, text: 'Finish handshake_builder.py. It still has # TODO notes (labs 1 to 4).' }],
          },
          relatedConcepts: ['Behaviors', 'Review', 'Safety'],
          steps: [
            targets('25 to 35 minutes', 'In this lab, you are going to review labs 1 to 4, pass a quiz, and then send a handshake to the real robot. You will:', [
              'See how your `handshake_builder.py` lines up with the real `handshake.py`.',
              'Pass the ten-question quiz with 80% or better.',
              'Change one setting in `handshake.py`, and queue the handshake on SwayForm.',
            ]),
            {
              id: 'review', title: 'Last-Minute Review',
              blocks: [
                { type: 'p', text: "Before you send your handshake, let's do a quick refresher on labs 1 to 4. In this lab, you are going to open the real `handshake.py`, which is the file that the robot actually runs. It is longer than yours, but it is built from the same ideas:" },
                { type: 'table', headers: ['Idea', 'What to remember', 'Where you see it in handshake.py'], rows: [
                  ['Imports and settings (lab 1)', 'Tools come in at the top. A name in CAPITAL LETTERS holds a value you are allowed to change.', '`import time` near the top, and `SHAKE_CYCLES`, the one line you change in this lab.'],
                  ['Joint control (lab 2)', '`move_joint` moves one joint to one angle. Angles are in degrees, and every joint has a safe range.', '`REACH_PITCH_OFFSET = 50`, and the `LIMITS` setting.'],
                  ['Sequencing (lab 3)', 'The moves run in order, and a pause is a step too.', '`perform_handshake`: reach, `time.sleep(HOLD_BEFORE_GRIP)`, grip, shake.'],
                  ['Coordination (lab 4)', 'A group move sends several joints together, and the left arm balances the right one.', '`reach_forward` starts the shoulder, the elbow and the left arm all at once.'],
                  ['The shake (lab 4)', 'A small move, repeated in a `for` loop, `SHAKE_OFFSET` up and down.', '`shake`, with the same loop that you wrote.'],
                  ['Cleanup', '`finally` runs no matter what, so the robot always ends in a safe state.', '`perform_handshake` uses `try` and `finally`, just like yours.'],
                ] },
                { type: 'p', text: "Your job in this lab is small: find `SHAKE_CYCLES` in `handshake.py`, and change it from 1 to 3. Because it is a setting, that one change is all it takes. The loop reads it, and shakes three times instead of once." },
              ],
            },
            {
              id: 'before-you-send-it', title: 'Before You Send It',
              blocks: [
                { type: 'p', text: "Three gates stand between your code and a moving robot:" },
                { type: 'checklist', items: [
                  '`handshake_builder.py` is finished, with no `# TODO` notes left (labs 1 to 4).',
                  'You pass the quiz, coming up below, with 80% or better.',
                  'An admin approves the run after you queue it.',
                ] },
                ROBOT_SAFETY,
              ],
            },
            {
              id: 'your-program-and-the-real-one', title: 'Your Program and the Real One',
              blocks: [
                { type: 'p', text: "Now, let's compare. The robot does not run `handshake_builder.py`. It runs the real `handshake.py`, which follows the same recipe with all the motor details filled in. Here is how the pieces line up:" },
                { type: 'table', headers: ['Your handshake_builder.py', 'The real handshake.py'], rows: [
                  ['reach_forward', 'reach_forward'],
                  ['sleep(HOLD_BEFORE_GRIP)', 'time.sleep(HOLD_BEFORE_GRIP)'],
                  ['grip', 'grip'],
                  ['shake (your loop)', 'shake'],
                  ['let_go + both arms home', 'open_and_return'],
                ] },
                { type: 'p', text: "Notice `time.sleep` in the real file, where yours says just `sleep`. That's because the real file imports the whole toolbox with `import time`, and then picks the tool out of it each time. Yours imports just the one tool, with `from time import sleep`. Both ways work!" },
                { type: 'p', text: "Open the real file from the explorer, and read `shake`. You will find the same `for` loop that you wrote, with `SHAKE_CYCLES` and `SHAKE_OFFSET`:" },
                { type: 'code', lang: 'python', filename: 'From the real handshake.py', workspaceFile: REAL_HANDSHAKE, line: 114, copy: false, code: 'def shake(ctrl, elbow_base):\n    """Pump the elbow ±SHAKE_OFFSET degrees around `elbow_base` for SHAKE_CYCLES cycles, then settle."""\n    for _ in range(SHAKE_CYCLES):\n        ctrl.run_threads([_mv(PCA_HAND, ELBOW, elbow_base + SHAKE_OFFSET, SHAKE_STEP_DURATION)])\n        ctrl.run_threads([_mv(PCA_HAND, ELBOW, elbow_base - SHAKE_OFFSET, SHAKE_STEP_DURATION)])\n    ctrl.run_threads([_mv(PCA_HAND, ELBOW, elbow_base, SHAKE_STEP_DURATION)])' },
                { type: 'p', text: "Up by `SHAKE_OFFSET`, down by `SHAKE_OFFSET`, `SHAKE_CYCLES` times, and then settle. That's your shake! The real one has no separate `sleep`, because each move is told to take `SHAKE_STEP_DURATION` seconds, which gives it the same rhythm." },
              ],
            },
            {
              id: 'the-quiz', title: 'The Quiz',
              blocks: [
                { type: 'p', text: "And now, the quiz! It has ten questions on labs 1 to 4, picked from a bigger bank, so a retry is a different mix. And they come in all shapes: true or false, read the code, fill in the blank, spot the bug, put the steps in order, and real-life situations. You need 80% or better, so 8 out of 10, to unlock the robot run. If you don't pass, you have to wait 15 minutes before you can try again, so go over the review table above first!" },
                { type: 'quiz', id: HANDSHAKE_QUIZ_ID, title: 'Handshake Quiz', passPercent: QUIZ_PASS, count: 10, prepare: 'Go over joints and angles (lab 2), the order of the steps (lab 3), and the shake and the group moves (lab 4). The review table at the top of this lab has the key ideas. Expect a mix: true or false, read the code, fill in the blank, spot the bug, put the steps in order, and real-life situations.', questions: [
                  // True or false
                  { question: 'True or false: `move_joint` can move several joints at the same time.', options: ['True', 'False'], answer: 1, explain: 'move_joint moves one joint to one angle. To move several joints together, use move_joint_group.', review: REVIEW.joints },
                  { question: 'True or false: if you ask a joint for an angle past its limit, the robot keeps it inside its safe range.', options: ['True', 'False'], answer: 0, explain: 'The joint stops at its limit instead of breaking something, so the move will not look the way you planned.', review: REVIEW.joints },
                  { question: 'True or false: the `finally` block runs even when the handshake finishes without any problem.', options: ['True', 'False'], answer: 0, explain: 'finally runs every time, after a normal finish or after a failure. That is why the hand always lets go.', review: REVIEW.sequence },
                  { question: 'True or false: to get 3 shakes from the real `handshake.py`, you have to change `SHAKE_CYCLES` and also rewrite the loop.', options: ['True', 'False'], answer: 1, explain: 'The loop reads the setting, so changing SHAKE_CYCLES is all it takes.', review: REVIEW.realHandshake },
                  // Read the code
                  { question: 'With `SHAKE_CYCLES = 4`, how many times does the elbow move **down** in this loop?', code: 'for _ in range(SHAKE_CYCLES):\n    motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n    sleep(SHAKE_STEP_SECONDS)\n    motion.move_joint("right_elbow", REACH_ELBOW - SHAKE_OFFSET)\n    sleep(SHAKE_STEP_SECONDS)', options: ['4', '8', '2', '1'], answer: 0, explain: 'Each cycle is one up and one down, so 4 cycles means 4 downs.', review: REVIEW.coordination },
                  { question: 'Using these settings, which two angles does the shake swing between?', code: 'REACH_ELBOW = 30\nSHAKE_OFFSET = 5', options: ['35 and 25', '30 and 5', '35 and 30', '25 and 20'], answer: 0, explain: 'The elbow goes SHAKE_OFFSET above and below REACH_ELBOW: 30 + 5 and 30 - 5.', review: REVIEW.coordination },
                  { question: 'What does the person on the other side feel with this order?', code: 'reach_forward(motion)\ngrip(motion)\nsleep(HOLD_BEFORE_GRIP)\nshake(motion)', options: ['The hand snaps shut before they can take it', 'A normal handshake', 'The robot never reaches out', 'Python stops with a NameError'], answer: 0, explain: 'The pause only helps between the reach and the grip. Here the grip comes first, so the robot grips the air.', review: REVIEW.sequence },
                  { question: 'What is the problem with this cleanup?', code: 'finally:\n    motion.move_joint_group("right_arm", HOME_ARM)\n    let_go(motion)', options: ['The arm pulls back before the hand opens, dragging the person\'s hand along', 'Nothing, the order does not matter', '`let_go` never runs', 'Python stops with an IndentationError'], answer: 0, explain: 'The hand has to open first, and only then should the arms go home.', review: REVIEW.coordination },
                  // Fill in the blank
                  { question: 'Fill in the blank to move one joint: `motion.____("right_shoulder", REACH_SHOULDER)`', options: ['`move_joint`', '`move_joint_group`', '`sleep`', '`say`'], answer: 0, explain: 'One joint, one angle: move_joint.', review: REVIEW.joints },
                  { question: 'Fill in the blank so the handshake can pause: `from time import ____`', options: ['`sleep`', '`time`', '`pause`', '`wait`'], answer: 0, explain: 'sleep is the tool, and it lives in the time module.', review: REVIEW.meet },
                  { question: 'Fill in the blank to repeat the shake: `for _ in ____(SHAKE_CYCLES):`', options: ['`range`', '`repeat`', '`loop`', '`times`'], answer: 0, explain: 'range(SHAKE_CYCLES) repeats the loop SHAKE_CYCLES times.', review: REVIEW.coordination },
                  // Spot the bug
                  { question: 'This line stops with a NameError. What is missing?', code: 'motion.move_joint(right_elbow, REACH_ELBOW)', options: ['Quotes around `right_elbow`', '`motion.` at the front', 'A `sleep` after it', 'A colon at the end'], answer: 0, explain: 'A joint name is text, so it needs quotes. Without them, Python looks for a variable called right_elbow.', review: REVIEW.joints },
                  { question: 'Python stops before the robot moves. What is missing?', code: 'for _ in range(SHAKE_CYCLES)\n    motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)', options: ['The colon at the end of the `for` line', 'Quotes around `SHAKE_CYCLES`', 'A `sleep` before the loop', 'The word `motion`'], answer: 0, explain: 'Every for line ends with a colon, to say the loop body comes next.', review: REVIEW.coordination },
                  { question: 'The elbow goes up three times but down only once. Why?', code: 'for _ in range(3):\n    motion.move_joint("right_elbow", REACH_ELBOW + SHAKE_OFFSET)\n    sleep(SHAKE_STEP_SECONDS)\nmotion.move_joint("right_elbow", REACH_ELBOW - SHAKE_OFFSET)', options: ['The down move is not indented, so it is outside the loop', 'range(3) only repeats the first line', 'The sleep stops the loop early', 'SHAKE_OFFSET is too small'], answer: 0, explain: 'Only indented lines are inside the loop. The down move runs once, after it.', review: REVIEW.coordination },
                  // Put it in order
                  { question: 'Which order is right for the handshake steps under `try`?', options: ['Reach, wait, grip, shake', 'Grip, reach, wait, shake', 'Reach, grip, wait, shake', 'Wait, reach, shake, grip'], answer: 0, explain: 'Reach out, wait for the other person, grip gently, then shake.', review: REVIEW.sequence },
                  { question: 'Which order is right for the cleanup under `finally`?', options: ['Let go, then both arms home', 'Both arms home, then let go', 'Shake, then let go', 'Grip, then both arms home'], answer: 0, explain: 'Open the hand first, so the robot never drags the person along.', review: REVIEW.coordination },
                  // Real-life situations
                  { question: 'A visitor says the robot\'s hand closes before they can take it. Which setting would you make bigger?', options: ['`HOLD_BEFORE_GRIP`', '`SHAKE_CYCLES`', '`SHAKE_OFFSET`', '`REACH_SHOULDER`'], answer: 0, explain: 'HOLD_BEFORE_GRIP is the wait before the grip, so a bigger number gives the visitor more time.', review: REVIEW.sequence },
                  { question: 'You want a longer, more enthusiastic handshake. Which setting do you change?', options: ['`SHAKE_CYCLES`', '`HOLD_BEFORE_GRIP`', '`LEFT_ARM_HOME`', '`HOME_ARM`'], answer: 0, explain: 'SHAKE_CYCLES decides how many times the elbow pumps up and down.', review: REVIEW.coordination },
                  { question: 'The robot reaches far forward. What does the left arm do, and why?', options: ['Swings back, to balance the robot', 'Swings forward, to copy the right arm', 'Waves, to say hello', 'Nothing, it stays still'], answer: 0, explain: 'Coordination: the other arm moves back to keep the robot steady, the same way you do.', review: REVIEW.coordination },
                  { question: 'An arm starts moving in a way you did not expect. What do you do first?', options: ['Stop the program and keep your hands clear', 'Hold the arm still', 'Push it back by hand', 'Run the program again'], answer: 0, explain: 'Never grab or resist a powered arm. Stop the program.', review: REVIEW.safety },
                  { question: 'Your handshake is about to run on the real robot. Who must be in the room?', options: ['An instructor or supervisor', 'Nobody, it is safer alone', 'Only other students', 'It does not matter'], answer: 0, explain: 'Never run a program on the physical robot without an instructor or supervisor present.', review: REVIEW.safety },
                  // Your program and the real one
                  { question: 'Which function in the real `handshake.py` does the job of your `let_go` plus both arms home?', options: ['`open_and_return`', '`reach_forward`', '`grip`', '`shake`'], answer: 0, explain: 'open_and_return opens the hand and brings every joint back to rest, in one function.', review: REVIEW.realHandshake },
                ] },
              ],
            },
            {
              id: 'set-it-up', title: 'Set It Up',
              blocks: [
                { type: 'heading', level: 3, text: 'The goal' },
                { type: 'p', text: "Let's set up the run. Right now, the real `handshake.py` only shakes **once**. You are going to change **one number**, so that it shakes **3 times**, just like yours." },
                { type: 'heading', level: 3, text: 'Where to find it' },
                { type: 'p', text: "This lab opens the real `handshake.py` in the Code Editor. If you have another file open, find `handshake.py` in the explorer. Then, scroll to **line 67**, in the block of settings near the top. You should find this line:" },
                { type: 'code', lang: 'python', filename: 'Find this in handshake.py', workspaceFile: REAL_HANDSHAKE, line: 67, copy: false, code: 'SHAKE_CYCLES = 1' },
                { type: 'heading', level: 3, text: 'Think first' },
                { type: 'mcq', required: false, question: 'Why is changing just this one number enough to get 3 shakes?', options: ['The loop in `shake` reads the setting, so it repeats as many times as it says', 'Python copies the shake 3 times on its own', 'The admin changes the number when they approve it', 'It is not enough, you also have to edit the loop'], answer: 0, hint: 'Think about your own shake from lab 4. What did range(...) read?', explain: 'Same idea as your program: the loop reads the setting, so one number controls the whole shake.' },
                { type: 'heading', level: 3, text: 'Step by step' },
                { type: 'steps', items: [
                  'Click right after the `1` in `SHAKE_CYCLES = 1`.',
                  'Delete the `1`, and type **3** in its place.',
                  'Do not change anything else in the file, not even a space. Run compares the whole file with the original.',
                  'Click **Run**.',
                ] },
                { type: 'code', lang: 'python', filename: 'Edit in handshake.py', workspaceFile: REAL_HANDSHAKE, line: 67, code: 'SHAKE_CYCLES = 3' },
                { type: 'heading', level: 3, text: 'Check your own work' },
                { type: 'checklist', items: [
                  'The line now says `SHAKE_CYCLES = 3`.',
                  'Nothing else in `handshake.py` changed.',
                  'You are editing `handshake.py`, the real file, and not your `handshake_builder.py`.',
                ] },
                { type: 'p', text: "Run checks that you changed exactly that line, and nothing else. If everything is ready, you should get something similar to this:" },
                { type: 'terminal', label: 'Output', lines: ['$ ros2 run swayform_robot handshake', '[INFO] [handshake]: node started', '[INFO] Connecting to motion controller...', '[INFO] [handshake]: all required values are set', 'Objective complete: this matches the target solution. Queue on Robot is now available.'] },
                { type: 'p', text: "If one of the gates is not met yet, Run tells you exactly which one, so you can go back and finish it. And if Run says the code does not match, click **Reset** to put the file back, and change only that one number." },
              ],
            },
            {
              id: 'queue-it', title: 'Queue It',
              blocks: [
                { type: 'p', text: "And now, the moment you've been waiting for!" },
                { type: 'steps', items: [
                  'Click **Queue on Robot**.',
                  'Wait for an admin to approve it.',
                  'When it says it is running, watch the robot shake hands.',
                  'When it says succeeded, mark the lab complete.',
                ] },
                { type: 'p', text: "While it runs, the output panel shows each change of status, and also what the robot prints. You should get something similar to this:" },
                queueOutput(['Reaching forward...', 'Gripping...', 'Shaking...', 'Opening hand and returning to the rest pose...']),
                ROBOT_SAFETY,
              ],
            },
            {
              id: 'robot-spotter', title: 'Robot Spotter',
              blocks: [
                { type: 'p', text: "While the robot runs, be a spotter! Watch for each step of the recipe you built, and count the shakes out loud with your class:" },
                { type: 'checklist', items: [
                  'The hand opens and the right arm reaches forward (`reach_forward`).',
                  'At the same time, the left arm swings back to balance it (coordination!).',
                  'The arm holds still for about **2 seconds**, with the hand open (`HOLD_BEFORE_GRIP`).',
                  'The hand closes gently (`grip`).',
                  'The elbow pumps up and down **3 times**, with small moves (`shake`).',
                  'The hand opens, and everything goes back to rest (`open_and_return`).',
                ] },
                { type: 'p', text: "That's the handshake! You taught a robot to reach, wait, grip, shake and let go, and every one of those steps is something you understand line by line. Next, you are going to reuse this exact structure for a fist bump." },
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
