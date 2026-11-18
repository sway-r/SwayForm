/* Wave, behavior section 1 (6 labs). Group 5.1 of Behavior Sections in curriculum.js; see README.md, "The Wave section". */

const BUILDER = 'swayform_ws/src/swayform_labs/wave_builder.py';
const REAL_WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
// The quiz sits at the end of lab 3, so the robot run is gated on that lab.
export const WAVE_QUIZ_ID = 'wv-03-functions';
export const WAVE_QUIZ_PASS = 80;
// Lab 6 has a final quiz; Queue on Robot stays locked until it is passed (robotGate.needsQuiz).
export const WAVE_FINAL_QUIZ_ID = 'wv-06-final-quiz';
const REVIEW = {
  intro: { id: 'wv-01-intro', label: 'Lab 1, Meet the Wave' },
  imports: { id: 'wv-02-imports-settings', label: 'Lab 2, Imports' },
  settings: { id: 'wv-02-imports-settings', label: 'Lab 2, Settings' },
  functions: { id: 'wv-03-functions', label: 'Lab 3, Functions' },
  loops: { id: 'wv-04-loops', label: 'Lab 4, Loops' },
  order: { id: 'wv-05-order-cleanup', label: 'Lab 5, Order' },
  cleanup: { id: 'wv-05-order-cleanup', label: 'Lab 5, Cleanup' },
  realWave: { id: 'wv-06-run', label: 'Lab 6, Your Program and the Real One' },
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

// What Check prints for wave_builder.py with `done` of its 7 pieces written (checkActiveFile in code-editor-app.js).
const checkOutput = (done) => ({
  type: 'terminal', label: 'Output', lines: done < 7
    ? [`Progress on wave_builder.py: ${'▰'.repeat(done)}${'▱'.repeat(7 - done)}  ${done} of 7 pieces done`, 'Nice work :)']
    : ['Progress on wave_builder.py: ▰▰▰▰▰▰▰  7 of 7 pieces done', 'Check passed: no TODO markers remain in wave_builder.py. Nice work.'],
});

// Reminder in each coding lab: undo first, Reset only to start the whole file over.
const RESET_TIP = { type: 'callout', tone: 'tip', label: 'Deleted too much?', text: "Don't worry. Press Ctrl+Z (Cmd+Z on a Mac) to undo. If you want to start over completely, click **Reset** above the code, but keep in mind that Reset puts the whole file back the way it was before lab 2, so you would fill in the earlier pieces again. The Show Solution in each lab has its piece." };

const openBuilder = (line) => ({
  type: 'code', lang: 'python', filename: 'The top of wave_builder.py', workspaceFile: BUILDER, line, copy: false,
  code: 'from swayform.motion import MotionClient\n# TODO lab 2: import sleep from the time module so the wave can pause\n\n# TODO lab 2: set WAVE_CYCLES (how many waves) and WAVE_DELAY_SECONDS (seconds per swing)\nRAISED_ARM = {"right_shoulder": 42, "right_elbow": 70}\n...',
});

export const WAVE_LEVEL = {
  id: 'wave-section', number: 9, title: 'Wave',
  description: 'The first behavior section: finish a wave program one piece at a time, then send it to the robot.',
  sections: [
    {
      id: 'wave-labs', title: 'Wave', difficulty: 'beginner', estimatedTime: '2 to 3 hours',
      description: 'Six short labs. You write about 30% of the program, learn what the rest does, and run it on SwayForm.',
      activities: [

        // Lab 1
        {
          id: 'wv-01-intro', title: 'Meet the Wave', kind: 'reading', tagLabel: 'Intro', estimatedTime: '5 minutes',
          summary: 'What you are going to build, how the 6 labs work, and what it takes to run on the real robot.',
          relatedConcepts: ['Behaviors', 'Planning'],
          steps: [
            summary('5 minutes', 'In this lab, you are going to learn what you will build in the Wave section, how its six labs fit together, and what has to happen before the real robot waves.'),
            {
              id: 'the-goal', title: 'What You Will Build',
              blocks: [
                { type: 'p', text: "By the end of this section, SwayForm will wave at the room. And the program that makes it wave will be one that you finished yourself!" },
                { type: 'p', text: "You already watched the Wave demo. Now, you are going to build the same behavior from the inside. You will not start from a blank page, though. A program called `wave_builder.py` is already waiting for you, with most of the code written. Your job is to fill in the missing parts, one lab at a time." },
              ],
            },
            {
              id: 'the-70-30-idea', title: 'The 70 / 30 Idea',
              blocks: [
                { type: 'p', text: "About **70%** of `wave_builder.py` is already written for you. The other **30%** is yours. But don't worry, you are not going to guess at it. Each lab first teaches you one idea, and then asks you to use it." },
                { type: 'p', text: "Every spot that you have to write is marked in the file with a one-line note that starts with `# TODO`. The note also tells you in which lab you fill it in. For instance, this is the first one:" },
                { type: 'code', lang: 'python', filename: 'Example', code: '# TODO lab 2: import sleep from the time module so the wave can pause', copy: false },
                { type: 'p', text: "The **Check** button counts how many of these notes are left, so you can watch the program fill up as you go. Here is the plan:" },
                { type: 'table', headers: ['Lab', 'You learn', 'You write'], rows: [
                  ['2', 'Imports and settings (variables)', 'The import for sleep, and two settings'],
                  ['3', 'Functions', 'Two small functions'],
                  ['4', 'Loops', 'A loop that repeats the wave'],
                  ['5', 'Order of steps, and cleanup (try / finally)', 'The three steps in order, and a safe way to end'],
                ] },
                { type: 'p', text: "This lab has no code to write. Labs 2, 4 and 5 have a few quick questions, and lab 3 ends with a quiz. Lab 6 has the final quiz, and then the robot run, where you change just one number." },
              ],
            },
            {
              id: 'the-recipe', title: 'The Recipe',
              blocks: [
                { type: 'p', text: "In simple terms, a wave is a short list of steps. The robot does them from top to bottom, exactly as they are written. Have a look:" },
                { type: 'code', lang: 'text', filename: 'The recipe for a wave', code: 'go home\n  ↓\nopen the hand\n  ↓\nraise the arm\n  ↓\nswing the wrist back and forth, a few times\n  ↓\ngo home', copy: false },
                { type: 'p', text: "Each one of these steps becomes a small function in your program. By the end of lab 5, you will have written some of them, and you will know what the rest of them do." },
              ],
            },
            {
              id: 'how-it-ends', title: 'How It Ends',
              blocks: [
                { type: 'p', text: "In lab 6, you send your wave to the real robot. But before that, three things have to be true:" },
                { type: 'checklist', items: [
                  'Your program is finished, with no `# TODO` notes left (labs 2 to 5).',
                  'You scored **80% or better** on the quiz in lab 3, and on the final quiz in lab 6.',
                  'An **admin approves** the run. Nobody can start the robot moving without that.',
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'A real arm moves in lab 6. Keep your hands clear, and only run it with an instructor in the room.' },
                { type: 'p', text: "That's it for the introduction. Let's start building!" },
              ],
            },
          ],
          completionSummary: { text: 'You know what you are building, how the 6 labs fit together, and what has to happen before the robot waves.', conceptsUsed: [] },
        },

        // Lab 2
        {
          id: 'wv-02-imports-settings', title: 'Imports and Settings', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 to 30 minutes',
          summary: 'Add the missing import, then set two settings that control how the wave behaves.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Imports', 'Modules', 'Variables', 'Constants'],
          steps: [
            summary('25 to 30 minutes', 'In this lab, you are going to learn about imports and settings, the first two pieces that your wave program is missing. By the end of it, you will have:', [
              'Added the import for `sleep`, the tool that makes the program wait.',
              'Set `WAVE_CYCLES` and `WAVE_DELAY_SECONDS`, the two settings that control the wave.',
            ]),
            {
              id: 'open-the-file', title: 'Open the File',
              blocks: [
                { type: 'p', text: "First of all, let's open the file that you are going to work on during this whole section. Click **Open wave_builder.py** below, or find it in the explorer of the Code Editor." },
                openBuilder(1),
                { type: 'p', text: "About 70% of the program is already there. Take a minute to scroll through it before you change anything. Don't worry if you don't understand every line yet. That's exactly what the next labs are for." },
              ],
            },
            {
              id: 'what-an-import-does', title: 'What an Import Does',
              blocks: [
                { type: 'p', text: "Python knows how to do a few things on its own, like adding numbers. For everything else, it borrows tools that other people wrote. An **import** line tells Python which tool you want to use. It is like grabbing a screwdriver from the toolbox before you start a job." },
                { type: 'p', text: "Have a look at how the top of `wave_builder.py` looks once it is finished:" },
                { type: 'code', lang: 'python', filename: 'Example', code: 'from time import sleep\nfrom swayform.motion import MotionClient', copy: false },
                { type: 'p', text: "As you can see, there are two imports here:" },
                { type: 'list', items: [
                  '`from time import sleep` brings in `sleep`, a tool that makes the program wait.',
                  '`from swayform.motion import MotionClient` brings in `MotionClient`, the tool that sends moves to the robot.',
                ] },
                { type: 'p', text: "The shape is always the same: `from <where it lives> import <the tool>`. Also, imports always go at the **top** of the file, because the code below them is what uses them." },
                { type: 'p', text: "By the way, the number inside `sleep(...)` is always in **seconds**. So `sleep(1)` waits one second, and `sleep(0.3)` waits less than half a second." },
              ],
            },
            {
              id: 'match-the-tool', title: 'Match the Tool to the Job',
              blocks: [
                { type: 'p', text: "Let's make sure this is clear. Pick what each line does. But be careful, there are more answers than lines!" },
                { type: 'match', prompt: 'Pick what each line does.', pairs: [
                  ['`from time import sleep`', 'Brings in the tool that pauses the program'],
                  ['`from swayform.motion import MotionClient`', 'Brings in the tool that talks to the robot'],
                  ['`sleep(0.3)`', 'Pauses the program for 0.3 seconds'],
                  ['`sleep(3)`', 'Pauses the program for 3 seconds'],
                ], distractors: [
                  'Pauses the program for 0.3 minutes',
                  'Moves the robot for 3 seconds',
                ], explain: 'Import lines bring tools in. A line like sleep(0.3) uses one, and the number is always in seconds.' },
              ],
            },
            {
              id: 'add-the-import', title: 'Your Turn: Add the Import',
              blocks: [
                { type: 'p', text: "Now, have a look at the `wave_once` function in your file. It calls `sleep(...)`, but nothing imports `sleep`. So, what do you think would happen if Python ran the file as it is? It would stop with an error, because it has no idea what `sleep` means!" },
                { type: 'p', text: "Let's fix that. Find the first `# TODO lab 2` note near the top of the file, and replace that whole line with the import for `sleep`:" },
                { type: 'code', lang: 'python', filename: 'Write in wave_builder.py', workspaceFile: BUILDER, line: 2, code: 'from time import sleep', copy: false },
                { type: 'p', text: "Now, click **Check** in the Code Editor. You should get something similar to this:" },
                checkOutput(1),
                { type: 'p', text: "As you can see, the program has **7** pieces for you to write across these labs, and you have just written the first one. Still says 0 of 7? Then make sure the whole `# TODO lab 2` line is gone, because Check counts any line that still has TODO in it." },
                { type: 'reveal', hint: 'The line is `from time import sleep`. It starts with the word `from`, and `time` and `sleep` are lowercase.', solution: { text: 'The top of the file after this step:', code: { lang: 'python', filename: 'wave_builder.py', code: 'from time import sleep\nfrom swayform.motion import MotionClient' } } },
              ],
            },
            {
              id: 'import-questions', title: 'Quick Questions: Imports',
              blocks: [
                { type: 'p', text: "Before moving on, let's check the imports part. Pick an answer for each question. If it is wrong, it greys out and you can try another one. Nothing here is graded." },
                { type: 'mcq', question: 'Which line lets your program pause for a moment?', options: ['`from time import sleep`', '`from sleep import time`', '`import sleep from time`', '`from motion import sleep`'], answer: 0, explain: '`sleep` comes from the `time` tool, and it is what waits between swings.' },
                { type: 'mcq', question: 'You use `sleep(0.3)` but forget to import `sleep`. What happens when Python reaches that line?', options: ['Python stops with a NameError', 'Python waits 0.3 seconds anyway', 'Python skips that line and keeps going', 'Python imports sleep for you'], answer: 0, explain: "Python only knows names you have defined or imported, so it stops and tells you it has never heard of sleep." },
                { type: 'mcq', question: 'How long does `sleep(2)` pause the program?', options: ['2 seconds', '2 tenths of a second', '2 milliseconds', '2 minutes'], answer: 0, explain: 'The number in sleep is always in seconds. For less than a second, use a decimal like 0.3.' },
                { type: 'mcq', question: 'Which tool does `wave_builder.py` use to send moves to the robot?', options: ['`MotionClient`', '`sleep`', '`time`', '`say`'], answer: 0, explain: 'Every move goes through the MotionClient. sleep only waits, and say only prints a message.' },
                { type: 'mcq', question: 'Where do import lines go?', options: ['At the top of the file', 'Right above the line that uses them', 'Inside the function that uses them', 'At the bottom, after main'], answer: 0, explain: 'The code below uses what the imports bring in, so they come first, all together at the top.' },
              ],
            },
            {
              id: 'a-name-for-a-value', title: 'A Name for a Value',
              blocks: [
                { type: 'p', text: "Now, let's move on to the second piece: settings. But first of all, what is a variable?" },
                { type: 'p', text: "A **variable** is a name stuck on a value. For instance, after the line `WAVE_CYCLES = 3`, every time the program says `WAVE_CYCLES`, it means 3." },
                { type: 'p', text: "Settings are variables written in CAPITAL LETTERS. That is a habit, not a rule of Python, and it tells anyone who reads the code: this is a number that you are allowed to change." },
              ],
            },
            {
              id: 'why-bother', title: 'Why Bother With a Name?',
              blocks: [
                { type: 'p', text: "You may be wondering: why not just type the number wherever it is needed? Well, let's compare these two versions:" },
                { type: 'code', lang: 'python', filename: 'Without a setting', code: 'sleep(0.3)\n...\nsleep(0.3)\n...\nsleep(0.3)', copy: false },
                { type: 'code', lang: 'python', filename: 'With a setting', code: 'WAVE_DELAY_SECONDS = 0.3\n\nsleep(WAVE_DELAY_SECONDS)\n...\nsleep(WAVE_DELAY_SECONDS)\n...\nsleep(WAVE_DELAY_SECONDS)', copy: false },
                { type: 'p', text: "In the first version, if you want a slower wave, you have to find and edit every single `0.3`. In the second one, you change one line, and the whole program follows. Pretty useful, right?" },
              ],
            },
            {
              id: 'settings-already-there', title: 'Settings Already There',
              blocks: [
                { type: 'p', text: "Some settings are already written for you. They describe the arm positions for this wave:" },
                { type: 'table', headers: ['Setting', 'What it holds'], rows: [
                  ['RAISED_ARM', 'Shoulder and elbow angles for a raised arm'],
                  ['HOME_ARM', 'Shoulder and elbow angles for a resting arm'],
                  ['WRIST_LEFT / WRIST_RIGHT', 'How far the wrist swings each way'],
                  ['WRIST_CENTER', 'The wrist when it is straight'],
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'These angles are tested, so leave them as they are. You only change the two settings that this lab asks for.' },
                { type: 'mcq', required: false, question: 'If `WAVE_DELAY_SECONDS` changes from 0.3 to 0.1, how does the wave change?', options: ['It gets faster', 'It gets slower', 'It waves more times', 'Nothing changes'], answer: 0, explain: 'It is the pause between swings, so a smaller pause means a quicker wave.' },
              ],
            },
            {
              id: 'add-the-settings', title: 'Your Turn: Add the Settings',
              blocks: [
                { type: 'p', text: "Now, it's your turn. Find the other `# TODO lab 2` note in the file, and replace that line with two settings:" },
                { type: 'list', items: [
                  '`WAVE_CYCLES`: how many times the wrist swings. Use **3**.',
                  '`WAVE_DELAY_SECONDS`: the pause between swings, in seconds. Use **0.3**.',
                ] },
                { type: 'p', text: "Each one goes on its own line: the name, an equals sign, and the number. Once you're done, click **Check** again. You should get something similar to this:" },
                checkOutput(2),
                RESET_TIP,
                { type: 'reveal', hint: 'The pattern is `NAME = value`. Cycles is a whole number, seconds can have a decimal point.', solution: { text: 'The two settings:', code: { lang: 'python', filename: 'wave_builder.py', code: 'WAVE_CYCLES = 3\nWAVE_DELAY_SECONDS = 0.3' } } },
              ],
            },
          ],
          completionSummary: { text: 'You added the import your wave needs and set the number of waves and the pause between swings.', conceptsUsed: ['Imports', 'Variables'] },
        },

        // Lab 3
        {
          id: 'wv-03-functions', title: 'Functions and the Quiz', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 minutes',
          summary: 'Write open_hand and raise_arm, then pass the quiz on imports, settings, and functions. Score 80% or better. Lab 6 needs this.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Functions', 'Parameters', 'Imports', 'Variables'],
          steps: [
            summary('25 minutes', "In this lab, you are going to learn about functions, and write the first two functions of the wave. At the end, there's a quiz on everything from labs 2 and 3. You will:", [
              'Learn what `def` does, and the difference between defining a function and calling it.',
              'Write `open_hand` and `raise_arm`.',
              'Pass the quiz with 80% or better. The robot run in lab 6 needs it.',
            ]),
            {
              id: 'a-named-recipe', title: 'A Named Recipe',
              blocks: [
                { type: 'p', text: "A **function** gives a list of steps one name, so that you can run the whole list just by saying that name. In fact, your file already has a few functions. Have a look at this one:" },
                { type: 'code', lang: 'python', filename: 'From wave_builder.py', code: 'def go_home(motion: MotionClient) -> None:\n    motion.safe_pose("idle")', copy: false },
                { type: 'p', text: "Let's go through it, piece by piece:" },
                { type: 'terms', items: [
                  { term: 'def', def: 'Starts a new function.' },
                  { term: 'go_home', def: 'The name. Pick names that say what the function does.' },
                  { term: '(motion)', def: 'What the function needs to be handed. Here it is the robot connection.' },
                  { term: 'indented lines', def: 'The steps inside the function. The indent shows which lines belong to it.' },
                ] },
              ],
            },
            {
              id: 'match-the-function', title: 'Match the Function to Its Job',
              blocks: [
                { type: 'p', text: "Your file has more functions like this one, and you are about to write two of them yourself. Let's see if you can tell what each one does:" },
                { type: 'match', prompt: 'Match each function to what it does.', pairs: [
                  ['`go_home(motion)`', 'Sends the robot to its resting pose'],
                  ['`say("swing")`', 'Prints a message in the output'],
                  ['`wave_once(motion)`', 'Swings the wrist left, right, and back to center'],
                  ['`open_hand(motion)`', 'Opens the right hand (you write this)'],
                  ['`raise_arm(motion)`', 'Lifts the right arm up to wave (you write this)'],
                ], explain: 'Small functions with clear names make a big behavior easy to read.' },
              ],
            },
            {
              id: 'define-versus-call', title: 'Define Versus Call',
              blocks: [
                { type: 'p', text: "Now, here comes something very important. Writing a function with `def` only **teaches** the robot a move. Nothing moves yet! The move happens later, when something **calls** the function by writing its name followed by brackets. Have a look:" },
                { type: 'code', lang: 'python', filename: 'Example', code: 'def go_home(motion: MotionClient) -> None:   # defines it, nothing moves yet\n    motion.safe_pose("idle")\n\ngo_home(motion)   # calls it, and the robot goes home now', copy: false },
                { type: 'p', text: "In fact, `main` at the bottom of your file does exactly this: it calls `go_home(motion)`. You will do your own calling in lab 5. For now, let's focus on defining." },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn: Write Two Functions',
              blocks: [
                { type: 'p', text: "Let's write some functions! Find the two `# TODO lab 3` notes in your file. You are going to replace them with two functions that follow the same shape as `go_home`. Here is that shape, with blanks for you to fill in:" },
                { type: 'code', lang: 'python', filename: 'Write in wave_builder.py (fill in the blanks)', workspaceFile: BUILDER, line: 21, code: 'def open_hand(motion: MotionClient) -> None:\n    motion.set_hand_pose("right_hand", "____")\n\n\ndef raise_arm(motion: MotionClient) -> None:\n    motion.move_joint_group("right_arm", ____)', copy: false },
                { type: 'list', items: [
                  'The hand pose that you want is named `"open"`.',
                  'The arm positions are already stored in a setting. Look at the settings near the top of the file for the one that means a raised arm.',
                ] },
                { type: 'p', text: "Once you have written both of them, click **Check**. You should get something similar to this:" },
                checkOutput(4),
                RESET_TIP,
                { type: 'reveal', hint: 'Both functions have one line inside. The second blank is a setting name, not a number.', solution: { text: 'Both functions:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def open_hand(motion: MotionClient) -> None:\n    motion.set_hand_pose("right_hand", "open")\n\n\ndef raise_arm(motion: MotionClient) -> None:\n    motion.move_joint_group("right_arm", RAISED_ARM)' } } },
              ],
            },
            {
              id: 'quick-review', title: 'Before the Quiz: Quick Review',
              blocks: [
                { type: 'p', text: "Before you take the quiz, let's go over the key words from labs 2 and 3 one more time:" },
                { type: 'terms', items: [
                  { term: 'import', def: 'Brings a tool into your program. Goes at the top of the file.' },
                  { term: 'variable', def: 'A name stuck on a value, like `WAVE_CYCLES = 3`.' },
                  { term: 'function', def: 'A named recipe of steps. `def` defines it, a call runs it.' },
                  { term: 'MotionClient', def: 'The tool that sends moves to the robot.' },
                  { term: 'sleep', def: 'Makes the program wait for a number of seconds.' },
                ] },
                { type: 'p', text: "If any of these doesn't ring a bell, go back to that part of the lab before you start the quiz. Remember that if you don't pass, you have to wait 15 minutes before you can try again!" },
              ],
            },
            {
              id: 'the-quiz', title: 'The Quiz',
              blocks: [
                { type: 'p', text: "And now, it's time for the quiz! It covers imports, settings and functions from labs 2 and 3. You need 80% or better to pass, and the robot run in lab 6 stays locked until you do." },
                { type: 'quiz', id: WAVE_QUIZ_ID, title: 'Building Blocks Quiz', passPercent: WAVE_QUIZ_PASS, count: 10, prepare: 'Go over imports and settings (lab 2) and functions (this lab). The Quick Review above has the key words.', questions: [
                  { question: 'What does `from time import sleep` give your program?', options: ['The ability to pause', 'The ability to move the arm', 'A faster wave', 'A copy of the robot'], answer: 0, explain: 'It brings in sleep, which makes the program wait.', review: REVIEW.imports },
                  { question: 'Where do import lines normally go?', options: ['At the top of the file', 'At the bottom of the file', 'Inside the last function', 'They can be left out'], answer: 0, explain: 'The code below uses what is imported, so imports come first.', review: REVIEW.imports },
                  { question: 'What is `WAVE_CYCLES = 3`?', options: ['A variable named WAVE_CYCLES that holds 3', 'A function that waves 3 times', 'An import', 'A comment'], answer: 0, explain: 'The name on the left holds the value on the right.', review: REVIEW.settings },
                  { question: 'Why use a named setting instead of typing the number everywhere?', options: ['Change it once and the whole program follows', 'Python refuses plain numbers', 'It makes the robot stronger', 'It is required for imports'], answer: 0, explain: 'One setting means one place to change.', review: REVIEW.settings },
                  { question: 'What does `def` do in `def open_hand(motion):`?', options: ['Starts a new function', 'Runs the hand', 'Imports a tool', 'Ends the program'], answer: 0, explain: 'def defines a function. It does not run it.', review: REVIEW.functions },
                  { question: 'In `open_hand(motion)`, what is `motion`?', options: ['The robot connection handed to the function', 'The name of the wave', 'A setting for speed', 'A comment'], answer: 0, explain: 'The function needs the connection so it can send moves.', review: REVIEW.functions },
                  { question: 'What is `MotionClient` used for?', options: ['Sending moves to the robot', 'Counting waves', 'Saving files', 'Pausing the program'], answer: 0, explain: 'Every move goes through it.', review: REVIEW.imports },
                  { question: 'An arm starts moving in a way you did not expect. What do you do first?', options: ['Stop the program and keep your hands off the robot', 'Hold the arm still', 'Push it back by hand', 'Run the program again'], answer: 0, explain: 'Never grab or resist a powered arm. Stop the program.', review: REVIEW.safety },
                  { question: 'What does `sleep(0.3)` do?', options: ['Waits 0.3 seconds before the next line', 'Moves the wrist 0.3 degrees', 'Runs 0.3 waves', 'Turns the robot off'], answer: 0, explain: 'It is a pause, measured in seconds.', review: REVIEW.imports },
                  { question: 'You see "NameError: name sleep is not defined". What is the most likely fix?', options: ['Import sleep at the top of the file', 'Restart the robot', 'Change WAVE_CYCLES', 'Delete the wave_once function'], answer: 0, explain: 'A NameError on a tool name usually means the import is missing.', review: REVIEW.imports },
                  { question: 'Which of these lines is an import?', options: ['`from time import sleep`', '`WAVE_CYCLES = 3`', '`def go_home(motion):`', '`say("swing")`'], answer: 0, explain: 'An import line starts with from or import and names a tool to bring in.', review: REVIEW.imports },
                  { question: 'Which of these is a setting in `wave_builder.py`?', options: ['`WAVE_DELAY_SECONDS = 0.3`', '`from time import sleep`', '`def wave(motion):`', '`say("swing")`'], answer: 0, explain: 'A setting is a name on the left of an equals sign, holding a value.', review: REVIEW.settings },
                  { question: '`WAVE_DELAY_SECONDS` changes from 0.3 to 0.6. What happens to the wave?', options: ['Each swing takes longer, so the wave is slower', 'The wave gets faster', 'The wrist swings more times', 'Nothing changes'], answer: 0, explain: 'It is the pause between swings, so a bigger number is a slower wave.', review: REVIEW.settings },
                  { question: 'Which line calls the function `open_hand`?', options: ['`open_hand(motion)`', '`def open_hand(motion):`', '`import open_hand`', '`open_hand = motion`'], answer: 0, explain: 'A call is the name plus what you hand it. The def line only teaches the move.', review: REVIEW.functions },
                  { question: 'What does `motion.safe_pose("idle")` do inside `go_home`?', options: ['Sends the robot to its resting pose', 'Starts the wave', 'Imports a pose', 'Pauses the program'], answer: 0, explain: 'go_home uses it to put the robot back in its neutral resting pose.', review: REVIEW.functions },
                  { question: 'Why are the lines inside a function indented?', options: ['The indent shows which lines belong to the function', 'It makes the robot move slower', 'Python skips indented lines', 'It turns them into comments'], answer: 0, explain: 'Indentation is how Python knows where a function, or a loop, begins and ends.', review: REVIEW.functions },
                  { question: 'A line starts with `#`. What does Python do with it?', options: ['Ignores it, it is a note for people', 'Runs it as a robot move', 'Imports it', 'Repeats it'], answer: 0, explain: 'A # note is for the reader. The # TODO lab N notes in your file work this way.', review: REVIEW.intro },
                  { question: 'Who should be in the room when a program runs on the real robot?', options: ['An instructor or supervisor', 'Nobody, it is safer to run it alone', 'Only other students', 'It does not matter'], answer: 0, explain: 'Never run a program on the physical robot without an instructor or supervisor present.', review: REVIEW.safety },
                ] },
              ],
            },
          ],
          completionSummary: { text: 'You wrote two functions that teach the robot to open its hand and raise its arm, and passed the Wave quiz. This unlocks the robot run in lab 6.', conceptsUsed: ['Functions', 'Imports', 'Variables'] },
        },

        // Lab 4
        {
          id: 'wv-04-loops', title: 'Loops: Wave Again and Again', kind: 'activity', difficulty: 'beginner', estimatedTime: '20 minutes',
          summary: 'Learn the two kinds of loop, then use a for loop to repeat one swing as many times as a setting says.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Loops', 'Repetition'],
          steps: [
            summary('20 minutes', 'In this lab, you are going to learn about loops: how to make the robot repeat a move without writing the same line again and again. You will:', [
              'Learn the two kinds of loops, `for` and `while`, and when to use each one.',
              'See why the indent decides which lines repeat.',
              'Write the loop in `wave` that repeats the swing `WAVE_CYCLES` times.',
            ]),
            {
              id: 'repeat-without-copy-paste', title: 'Repeat Without Copy and Paste',
              blocks: [
                { type: 'p', text: "One swing of the wrist is not much of a wave, right? You want several. So, one way of doing it would be to write the same call again and again:" },
                { type: 'code', lang: 'python', filename: 'The slow way', code: 'wave_once(motion)\nwave_once(motion)\nwave_once(motion)', copy: false },
                { type: 'p', text: "This works. But what if you want 5 waves? Or 10? You would have to keep adding lines. And this is exactly where loops come in." },
                { type: 'p', text: "A **loop** repeats lines for you. Think of a coach at practice: they say \"Ten jumping jacks!\", not \"jumping jack\" ten times in a row. And if you hook the number of repeats to a setting, you only have to change one number, instead of changing the code. Have a look:" },
                { type: 'code', lang: 'python', filename: 'The loop way', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)', copy: false },
              ],
            },
            {
              id: 'two-kinds-of-loops', title: 'Two Kinds of Loops',
              blocks: [
                { type: 'p', text: "Python has two kinds of loops. Both of them repeat the indented lines under them. The difference is how they decide when to stop:" },
                { type: 'list', items: [
                  'A `for` loop repeats a set number of times. It is like "run 5 laps" in gym class: you know the number before you start.',
                  'A `while` loop repeats as long as a condition is true. It is like "keep running until the whistle blows": you keep going until something changes.',
                ] },
                { type: 'p', text: "Let's see both of them doing exactly the same thing:" },
                { type: 'code', lang: 'python', filename: 'A for loop', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)', copy: false },
                { type: 'code', lang: 'python', filename: 'A while loop that does the same thing', code: 'count = 0\nwhile count < WAVE_CYCLES:\n    wave_once(motion)\n    count = count + 1', copy: false },
                { type: 'p', text: "Both versions wave `WAVE_CYCLES` times. As you can see, the `while` loop keeps its own counter, called `count`. Before each repeat, it checks `count < WAVE_CYCLES`. Each time through, `count` goes up by one. And once `count` reaches `WAVE_CYCLES`, the check is false, so the loop stops." },
                { type: 'p', text: "But careful! A `while` loop has to change something each time through, like `count = count + 1`. Otherwise... well, let's find out. Have a look at this loop:" },
                { type: 'code', lang: 'python', filename: 'Bug hunt: something is missing', code: 'count = 0\nwhile count < WAVE_CYCLES:\n    wave_once(motion)', copy: false },
                { type: 'p', text: "Can you spot what is missing? Make a guess, and then open the box below to check." },
                { type: 'troubleshoot', items: [
                  { symptom: 'The robot waves forever and never stops', cause: 'Nothing inside the loop changes `count`, so it stays 0 and `count < WAVE_CYCLES` is true forever. Someone would have to stop the program by hand. This bug is called an **infinite loop**.', fix: 'Add `count = count + 1` as the last indented line inside the loop.' },
                ] },
                { type: 'p', text: "In this lab, you are going to write a `for` loop, because you know exactly how many waves you want. But you will meet a `while` loop again in lab 6, inside the real `wave.py`." },
              ],
            },
            {
              id: 'anatomy-of-a-loop', title: 'Anatomy of a For Loop',
              blocks: [
                { type: 'p', text: "Now, let's have a closer look at the `for` loop, piece by piece:" },
                { type: 'code', lang: 'python', filename: 'A for loop', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)', copy: false },
                { type: 'terms', items: [
                  { term: 'for', def: 'Starts the loop.' },
                  { term: '_', def: 'A throwaway name for the counter. We do not need to know which repeat it is, only that it repeats.' },
                  { term: 'range(WAVE_CYCLES)', def: 'How many times to repeat. With WAVE_CYCLES = 3, that is three times.' },
                  { term: ':', def: 'Ends the first line and says the loop body comes next.' },
                  { term: 'indented line', def: 'The line that repeats. Only indented lines are inside the loop.' },
                ] },
                { type: 'p', text: "So basically, `range(4)` repeats four times, `range(10)` repeats ten times, and `range(WAVE_CYCLES)` repeats as many times as the setting says." },
              ],
            },
            {
              id: 'the-indent-decides', title: 'The Indent Decides What Repeats',
              blocks: [
                { type: 'p', text: "Here's something very important about loops: only the lines indented under `for` are inside the loop. A line that is not indented runs only once, after the loop is done. Let's compare these two versions:" },
                { type: 'code', lang: 'python', filename: 'Right: the swing is inside the loop', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)', copy: false },
                { type: 'p', text: "Here, `wave_once` is indented, so it runs `WAVE_CYCLES` times. That's what we want." },
                { type: 'code', lang: 'python', filename: 'Wrong: the swing is outside the loop', code: 'for _ in range(WAVE_CYCLES):\n    sleep(WAVE_DELAY_SECONDS)\nwave_once(motion)', copy: false },
                { type: 'p', text: "And here, only the `sleep` is inside the loop. So the robot pauses `WAVE_CYCLES` times, and then swings the wrist only once. One missing indent, and most of the wave is gone!" },
              ],
            },
            {
              id: 'trace-it', title: 'Predict the Swings',
              blocks: [
                { type: 'p', text: "Time to think like the robot! Each loop below has `wave_once(motion)` indented under it. Before you read the second column, try to guess how many swings each one gives:" },
                { type: 'table', headers: ['Loop', 'Swings', 'What you see'], rows: [
                  ['`for _ in range(2):`', '2', 'A quick hello'],
                  ['`for _ in range(WAVE_CYCLES):` with `WAVE_CYCLES = 4`', '4', 'A big friendly wave'],
                  ['`for _ in range(10):`', '10, not 11', 'A very excited robot'],
                  ['`for _ in range(0):`', '0', 'The arm lifts and never swings'],
                ] },
                { type: 'p', text: "As you can see, `range(n)` repeats exactly n times. And `range(0)` repeats zero times, so the line inside the loop never runs." },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn: Write the Loop',
              blocks: [
                { type: 'p', text: "Now, let's write the real thing. Open the `wave` function in your file. This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in wave_builder.py', workspaceFile: BUILDER, line: 36, code: 'def wave(motion: MotionClient) -> None:\n    # TODO lab 4: use a for loop to call wave_once(motion) WAVE_CYCLES times\n    pass', copy: false },
                { type: 'p', text: "Replace the `# TODO lab 4` note, and the `pass` line below it, with a `for` loop that calls `wave_once(motion)` once for each cycle. Remember: the call must be indented under the `for` line. If it is not indented, it is not inside the loop!" },
                { type: 'p', text: "When you're done, click **Check**. You should get something similar to this:" },
                checkOutput(5),
                RESET_TIP,
                { type: 'reveal', hint: 'It is the same two lines from the loop way above: `for _ in range(WAVE_CYCLES):` and an indented `wave_once(motion)`.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def wave(motion: MotionClient) -> None:\n    for _ in range(WAVE_CYCLES):\n        wave_once(motion)' } } },
              ],
            },
            {
              id: 'try-changing-this', title: 'Give Your Wave a Personality',
              blocks: [
                { type: 'p', text: "But there's more! Your loop reads both settings, so you can change how the wave feels without touching the loop at all. Have a look at these combinations:" },
                { type: 'table', headers: ['Personality', 'WAVE_CYCLES', 'WAVE_DELAY_SECONDS', 'What it looks like'], rows: [
                  ['Shy', '1', '0.6', 'One slow little wave'],
                  ['Sleepy', '2', '0.8', 'Two very slow swings'],
                  ['Friendly', '3', '0.3', 'The wave you are building'],
                  ['Excited', '6', '0.15', 'Lots of quick swings'],
                ] },
                { type: 'p', text: "So basically, a bigger `WAVE_CYCLES` means more swings, and a smaller `WAVE_DELAY_SECONDS` means a shorter pause between swings, so a faster wave. Which one would you pick for SwayForm when the class walks in?" },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep `WAVE_CYCLES` at 10 or less and `WAVE_DELAY_SECONDS` at 0.1 or more. Never change `WRIST_LEFT` or `WRIST_RIGHT`. Those angles are tested.' },
              ],
            },
            {
              id: 'bug-hunt', title: 'Bug Hunt: Indent Edition',
              blocks: [
                { type: 'p', text: "Let's finish with two bugs. Each of these programs has one indent in the wrong place. Read the code, guess what goes wrong, and then open the boxes below to check." },
                { type: 'code', lang: 'python', filename: 'Bug 1', code: 'for _ in range(3):\n    wave_once(motion)\n    say("done")', copy: false },
                { type: 'code', lang: 'python', filename: 'Bug 2', code: 'for _ in range(WAVE_CYCLES):\nwave_once(motion)', copy: false },
                { type: 'troubleshoot', items: [
                  { symptom: 'Bug 1: "done" shows up three times instead of once', cause: '`say("done")` is indented, so it is inside the loop and repeats with every swing.', fix: 'Move `say("done")` all the way to the left so it runs once, after the loop.' },
                  { symptom: 'Bug 2: Python stops with an IndentationError before the robot moves', cause: 'Nothing is indented under the `for` line, so the loop has no body and Python refuses to run it.', fix: 'Indent `wave_once(motion)` under the `for` line.' },
                ] },
              ],
            },
            {
              id: 'loop-questions', title: 'Quick Questions: Loops',
              blocks: [
                { type: 'p', text: "Finally, let's check what you learned about loops. Pick an answer for each question. If it is wrong, it greys out and you can try another one." },
                { type: 'mcq', question: 'With `WAVE_CYCLES = 5`, how many times does `wave_once` run inside `for _ in range(WAVE_CYCLES):`?', options: ['5', '1', '4', '6'], answer: 0, explain: '`range(WAVE_CYCLES)` repeats once for each cycle, so 5 cycles means 5 swings.' },
                { type: 'code', lang: 'python', filename: 'A loop with a line after it', code: 'for _ in range(3):\n    wave_once(motion)\nsay("done")', copy: false },
                { type: 'mcq', question: 'In the code above, how many times does `say("done")` run?', options: ['Once, after the loop is done', 'Three times', 'Never', 'Four times'], answer: 0, explain: 'It is not indented, so it is outside the loop. It runs one time, after the three swings.' },
                { type: 'mcq', question: 'You want the robot to keep waving until someone presses stop, and you do not know how many waves that will be. Which loop fits best?', options: ['A `while` loop', 'A `for` loop with `range(0)`', 'No loop, copy the line many times', 'A `try` and `finally`'], answer: 0, explain: 'A `while` loop keeps going as long as its condition is true, so it fits when you do not know the count up front. A `for` loop is for a set number of times.' },
              ],
            },
          ],
          completionSummary: { text: 'You wrote the loop that repeats the wave, and you know why the indent matters.', conceptsUsed: ['Loops', 'Repetition'] },
        },

        // Lab 5
        {
          id: 'wv-05-order-cleanup', title: 'Order and Cleanup', kind: 'activity', difficulty: 'beginner', estimatedTime: '25 to 30 minutes',
          summary: 'Call the wave steps in the right order, then use try and finally so the arm always comes home. This finishes the program.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Sequences', 'Function calls', 'try / finally', 'Safety'],
          steps: [
            summary('25 to 30 minutes', 'In this lab, you are going to put the wave steps in the right order, and add the cleanup that brings the arm home. By the end of it, your program will be complete! You will:', [
              'See why order matters: the robot does exactly what you wrote, from top to bottom.',
              'Call the three wave steps in order.',
              'Use `try` and `finally` so the arm always comes home.',
            ]),
            {
              id: 'top-to-bottom', title: 'Top to Bottom',
              blocks: [
                { type: 'p', text: "A program runs one line at a time, starting from the top. The robot does not know what you meant. It only knows what you wrote, and in the order you wrote it." },
                { type: 'p', text: "Try this with a friend: tell them how to put on a jacket, one step at a time, and ask them to do exactly what you say. If you say \"zip it up\" before \"put your arms in the sleeves\", you get a very confused friend. Well, a robot is that friend, every single time." },
                { type: 'p', text: "Let's see it in code. Have a look at these two lines:" },
                { type: 'code', lang: 'python', filename: 'Right order', code: 'raise_arm(motion)\nwave(motion)', copy: false },
                { type: 'p', text: "The arm goes up, and then the wrist swings. That's a wave! Now, what happens if we swap them?" },
                { type: 'code', lang: 'python', filename: 'Wrong order', code: 'wave(motion)\nraise_arm(motion)', copy: false },
                { type: 'p', text: "The wrist swings while the arm is still down, so the robot waves at the floor. Then, it lifts the arm when the wave is already over. Same two lines, very different result!" },
              ],
            },
            {
              id: 'the-wave-order', title: 'The Wave Order',
              blocks: [
                { type: 'p', text: "A wave has three steps, always in this order:" },
                { type: 'steps', items: [
                  '**Open the hand**, so the robot waves with an open palm, the way a person does.',
                  '**Raise the arm**, so the hand is up where people can see it.',
                  '**Swing the wrist**. This is the wave itself, repeated `WAVE_CYCLES` times by your loop from lab 4.',
                ] },
                { type: 'p', text: "Before step 1, the robot has already gone home, because `main` calls `go_home` first. And the real wave on the robot uses this same order." },
                { type: 'p', text: "Now, let's see if you can spot what went wrong here. Three robots got their orders mixed up. Read what each one did, guess which call is missing or in the wrong place, and then open the box to check:" },
                { type: 'troubleshoot', items: [
                  { symptom: 'Robot 1 waved at the floor, then lifted its arm after the wave was over', cause: 'Its calls were `wave`, then `raise_arm`. Right steps, wrong order.', fix: 'Call `raise_arm(motion)` before `wave(motion)`.' },
                  { symptom: 'Robot 2 waved with a closed fist', cause: '`open_hand(motion)` was never called, so the hand stayed closed.', fix: 'Call `open_hand(motion)` first, before the arm goes up.' },
                  { symptom: 'Robot 3 opened its hand and waved, but its arm never went up', cause: '`raise_arm(motion)` was never called.', fix: 'Call `raise_arm(motion)` after `open_hand` and before `wave`.' },
                ] },
              ],
            },
            {
              id: 'calling-a-function', title: 'Calling a Function',
              blocks: [
                { type: 'p', text: "In lab 3, you wrote `open_hand` and `raise_arm`. But remember: writing a function with `def` only teaches the robot a move. Nothing happens until you **call** it." },
                { type: 'table', headers: ['Code', 'What it is', 'What it does'], rows: [
                  ['`def open_hand(motion):`', 'Defining', 'Teaches the robot the steps. Nothing moves yet.'],
                  ['`open_hand(motion)`', 'Calling', 'Runs those steps, right now.'],
                ] },
                { type: 'p', text: "A call is the function name, followed by brackets with what you hand it. Every function here needs `motion`, the robot connection, so each call looks like `name(motion)`. You define a function once, and then you can call it as many times as you want." },
              ],
            },
            {
              id: 'add-the-calls', title: 'Your Turn: Call the Steps',
              blocks: [
                { type: 'p', text: "Let's put it into practice. Open `perform_wave` in your file. This is what you should find:" },
                { type: 'code', lang: 'python', filename: 'Find this in wave_builder.py', workspaceFile: BUILDER, line: 41, code: 'def perform_wave(motion: MotionClient) -> None:\n    # TODO lab 5: call open_hand, raise_arm, then wave, in that order\n    # TODO lab 5: wrap those calls in try and finally, and in finally move "right_arm" to HOME_ARM\n    pass', copy: false },
                { type: 'p', text: "Replace the first `# TODO lab 5` note with three calls, in the wave order: `open_hand`, `raise_arm`, and then `wave`. Each one of them takes `motion`. Leave the second `# TODO lab 5` note, and the `pass` line, alone for now. They are for the cleanup, later in this lab." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                checkOutput(6),
                { type: 'p', text: "As you can see, only one piece is left: the cleanup." },
                RESET_TIP,
                { type: 'reveal', hint: 'Three lines, each one a name followed by (motion).', solution: { text: 'The three calls:', code: { lang: 'python', filename: 'wave_builder.py', code: 'open_hand(motion)\nraise_arm(motion)\nwave(motion)' } } },
              ],
            },
            {
              id: 'what-if-it-goes-wrong', title: 'Cleanup: What If It Goes Wrong?',
              blocks: [
                { type: 'p', text: "So far, so good. But what would happen if something failed halfway through the wave, with the arm still up? If the program just stopped there, the arm would stay raised. And a robot should always end in a safe place." },
                { type: 'p', text: "Think about leaving a room: whether you finished your work or got called away halfway through, you switch the lights off on your way out. In Python, `try` and `finally` work like that rule. You put the main steps under `try:`, and the cleanup under `finally:`. Have a look:" },
                { type: 'code', lang: 'python', filename: 'Example', code: 'try:\n    open_hand(motion)\n    raise_arm(motion)\n    wave(motion)\nfinally:\n    motion.move_joint_group("right_arm", HOME_ARM)', copy: false },
                { type: 'list', items: [
                  '`try:` runs the main steps, from top to bottom.',
                  '`finally:` runs the cleanup **no matter what**: after a normal finish, or after a crash.',
                  'Here, the cleanup sends the arm back to `HOME_ARM`, its resting position.',
                ] },
                { type: 'p', text: "Also, notice the indent. The lines that belong to `try` or `finally` sit one level to the right, the same way as the lines inside a function or a loop." },
              ],
            },
            {
              id: 'add-the-cleanup', title: 'Your Turn: Add the Cleanup',
              blocks: [
                { type: 'p', text: "Now, open `perform_wave` one more time. Wrap your three calls in `try:`, and add a `finally:` that sends `right_arm` back to `HOME_ARM`. You can do it the same way you sent it to `RAISED_ARM` in lab 3. Finally, delete the last `# TODO lab 5` note and the `pass` line." },
                { type: 'p', text: "Click **Check**. You should get something similar to this:" },
                checkOutput(7),
                { type: 'reveal', hint: 'The calls move one level to the right, under try. The finally block has one line, and it uses move_joint_group.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def perform_wave(motion: MotionClient) -> None:\n    try:\n        open_hand(motion)\n        raise_arm(motion)\n        wave(motion)\n    finally:\n        motion.move_joint_group("right_arm", HOME_ARM)' } } },
              ],
            },
            {
              id: 'run-the-finished-program', title: 'Run the Finished Program',
              blocks: [
                { type: 'p', text: "7 of 7! Your wave program is complete. So, let's run it! Click **Run** in the Code Editor. You should get something similar to this:" },
                { type: 'terminal', label: 'Output', lines: ['$ ros2 run swayform_labs wave_builder', '[INFO] [wave_builder]: node started', '[INFO] Connecting to motion controller...', '[INFO] [wave_builder]: all required values are set'] },
                { type: 'p', text: "As you can see, every required value is set. Keep in mind that this Run is a simulation: it checks your file, but it does not move the robot. That happens in lab 6." },
                { type: 'p', text: "About 70% of the file was there when you started. The other 30% is yours! Scroll through the file and find every piece that you wrote:" },
                { type: 'checklist', items: [
                  'The `sleep` import (lab 2)',
                  'The two settings, `WAVE_CYCLES` and `WAVE_DELAY_SECONDS` (lab 2)',
                  '`open_hand` and `raise_arm` (lab 3)',
                  'The loop in `wave` (lab 4)',
                  'The three calls in `perform_wave` (lab 5)',
                  'The `try` / `finally` cleanup (lab 5)',
                ] },
              ],
            },
            {
              id: 'bug-hunt', title: 'Bug Hunt: Cleanup Edition',
              blocks: [
                { type: 'p', text: "One last bug before the robot. This program looks almost right. So, what happens if the wave crashes halfway? Read it, make a guess, and then open the box to check." },
                { type: 'code', lang: 'python', filename: 'Bug: something is in the wrong place', code: 'try:\n    open_hand(motion)\n    raise_arm(motion)\n    wave(motion)\n    motion.move_joint_group("right_arm", HOME_ARM)\nfinally:\n    say("all done")', copy: false },
                { type: 'troubleshoot', items: [
                  { symptom: 'The wave crashed halfway, and the arm stayed up in the air', cause: 'The line that sends the arm home is under `try`. When the wave crashed, Python skipped the rest of `try`, and the line home with it.', fix: 'Move the home line under `finally:`, which runs no matter what.' },
                ] },
                { type: 'p', text: "By the way, a common mistake is to think that `finally` only runs after a crash. It runs every time, after a normal finish too. That is why the arm always comes home." },
              ],
            },
            {
              id: 'order-questions', title: 'Quick Questions: Order and Cleanup',
              blocks: [
                { type: 'p', text: "Finally, let's check what you learned in this lab. Pick an answer for each question. If it is wrong, it greys out and you can try another one." },
                { type: 'code', lang: 'python', filename: 'A mixed-up perform_wave', code: 'raise_arm(motion)\nwave(motion)\nopen_hand(motion)', copy: false },
                { type: 'mcq', question: 'A student put the calls in the order above. What does the robot do?', options: ['It waves with a closed hand, then opens the hand at the end', 'The same wave as before, order does not matter', 'Python stops with an error', 'It opens the hand first anyway'], answer: 0, explain: 'The robot does exactly what is written, from top to bottom. The hand only opens after the wave is over.' },
                { type: 'mcq', question: 'Everything works and the wave finishes normally. Does the `finally` block still run?', options: ['Yes, it runs after a normal finish too', 'No, it only runs after a crash', 'Only if WAVE_CYCLES is more than 1', 'Only when an admin approves it'], answer: 0, explain: '`finally` runs every time, after a normal finish or after a crash. That is why the arm always comes home.' },
                { type: 'mcq', question: 'What is the difference between `def raise_arm(motion):` and `raise_arm(motion)`?', options: ['The first defines the move, the second runs it', 'They do the same thing', 'The first runs the move, the second defines it', 'The second one imports it'], answer: 0, explain: '`def` teaches the robot the move. A call, the name followed by brackets, runs it right now.' },
              ],
            },
          ],
          completionSummary: { text: 'You called your functions in the order that makes a wave and finished the program, including the cleanup that brings the arm home.', conceptsUsed: ['Sequences', 'Function calls', 'try / finally', 'Safety'] },
        },

        // Lab 6
        {
          id: 'wv-06-run', title: 'Wave Behavior Review and Robot Run', kind: 'activity', difficulty: 'beginner', estimatedTime: '15 to 25 minutes',
          summary: 'A quick review of labs 2 to 5, a final quiz, then run the real wave on SwayForm. Needs a finished builder, 80% on the lab 3 quiz and on the final quiz, and an admin to approve.',
          workspaceFile: REAL_WAVE,
          extraFiles: [BUILDER],
          robotGate: {
            needsComplete: [{ id: WAVE_QUIZ_ID, text: `Pass the lab 3 quiz with ${WAVE_QUIZ_PASS}% or better and mark that lab complete.` }],
            needsQuiz: [{ id: WAVE_FINAL_QUIZ_ID, text: `Pass the final quiz in this lab with ${WAVE_QUIZ_PASS}% or better.` }],
            needsNoTodos: [{ path: BUILDER, text: 'Finish wave_builder.py. It still has # TODO notes (labs 2 to 5).' }],
          },
          relatedConcepts: ['Behaviors', 'Safety', 'Review'],
          steps: [
            summary('15 to 25 minutes', 'In this lab, you are going to review everything from labs 2 to 5, pass the final quiz, and then send your wave to the real robot. You will:', [
              'See how your `wave_builder.py` lines up with the real `wave.py` that the robot runs.',
              'Pass the final quiz with 80% or better.',
              'Change one setting in `wave.py`, and queue the wave on SwayForm.',
            ]),
            {
              id: 'last-minute-review', title: 'Last-Minute Review',
              blocks: [
                { type: 'p', text: "Before you send your wave, let's do a quick refresher on labs 2 to 5. In this lab, you are going to open the real `wave.py`, which is the file that the robot actually runs. It is longer than yours, but it is built from the same ideas:" },
                { type: 'table', headers: ['Idea', 'What to remember', 'Where you see it in wave.py'], rows: [
                  ['Imports (lab 2)', 'Tools come in at the top of the file, before the code that uses them.', 'The first lines, including `import time`, which gives the real wave its pauses.'],
                  ['Settings (lab 2)', 'A name in CAPITAL LETTERS holds a value you are allowed to change. Change it once and the whole program follows.', '`WAVE_CYCLES`, the one line you change in this lab.'],
                  ['Functions (lab 3)', '`def` teaches a move. A call, the name followed by brackets, runs it.', 'Small named functions such as `open_hand` and `wave_ready_pose`.'],
                  ['Loops (lab 4)', 'A loop repeats its indented lines, as many times as a setting says.', '`elbow_wave` repeats the wave `WAVE_CYCLES` times, with a `while` loop.'],
                  ['Order (lab 5)', 'Lines run top to bottom, so the steps have to be in the right order.', 'The same recipe as yours: open the hand, raise the arm, then wave.'],
                  ['Cleanup (lab 5)', '`finally` runs no matter what, so the robot always ends in a safe state.', '`perform_wave` uses `try` and `finally`, just like yours.'],
                ] },
                { type: 'p', text: "Your job in this lab is small: find `WAVE_CYCLES` in `wave.py`, and change it from 1 to 5. Because it is a setting, that one change is all it takes. The loop reads it, and waves five times instead of once." },
              ],
            },
            {
              id: 'before-you-send-it', title: 'Before You Send It',
              blocks: [
                { type: 'p', text: "Four gates stand between your code and a moving robot:" },
                { type: 'checklist', items: [
                  '`wave_builder.py` is finished, with no `# TODO` notes left.',
                  'You scored 80% or better on the lab 3 quiz and marked that lab complete.',
                  'You pass the final quiz, coming up next, with 80% or better.',
                  'An admin approves the run after you queue it.',
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'A real arm is about to move. Never touch, hold or push a powered arm. If anything looks wrong, stop the program and keep your hands clear. Only run it with an instructor in the room.' },
              ],
            },
            {
              id: 'your-program-and-the-real-one', title: 'Your Program and the Real One',
              blocks: [
                { type: 'p', text: "Now, let's compare. The robot does not run `wave_builder.py`. It runs the real `wave.py`, which follows the same recipe, with all the motor details filled in. Here is how the pieces line up:" },
                { type: 'table', headers: ['Your wave_builder.py', 'The real wave.py'], rows: [
                  ['go_home', 'center_all'],
                  ['open_hand', 'open_hand'],
                  ['raise_arm', 'wave_ready_pose'],
                  ['wave_once + wave (your loop)', 'elbow_wave'],
                  ['perform_wave (try / finally)', 'perform_wave (try / finally)'],
                ] },
                { type: 'p', text: "The real wave swings the elbow, and ripples the fingers while it does, where yours swings the wrist. But the recipe is the same! Open the real file from the explorer and read through it. You will recognize the shape." },
                { type: 'p', text: "By the way, in `elbow_wave` you will find `while cycles is None or i < cycles:`, where your program had a `for` loop. Yes, it's a `while` loop! Read it as: keep waving while the count `i` is below the number of `cycles`. The `cycles is None` part lets the robot wave forever in a different mode, so you can ignore it here. If you need a refresher, go back to \"Two Kinds of Loops\" in lab 4." },
              ],
            },
            {
              id: 'final-quiz', title: 'The Final Quiz',
              blocks: [
                { type: 'p', text: "Now, it's time for the final quiz. It covers everything from labs 2 to 5, and you need 80% or better to unlock the robot run." },
                { type: 'quiz', id: WAVE_FINAL_QUIZ_ID, title: 'Final Wave Quiz', passPercent: WAVE_QUIZ_PASS, count: 10, prepare: 'Go over loops (lab 4), order and cleanup (lab 5), and the review table at the top of this lab. A few questions also come from labs 2 and 3, and from robot safety.', questions: [
                  { question: 'With `WAVE_CYCLES = 4`, how many times does `wave_once` run inside `for _ in range(WAVE_CYCLES):`?', options: ['4', '1', '3', '5'], answer: 0, explain: 'range(WAVE_CYCLES) repeats once for each cycle.', review: REVIEW.loops },
                  { question: 'With `for _ in range(2):` and `wave_once(motion)` indented under it, how many swings do you get?', options: ['2', '1', '3', '0'], answer: 0, explain: 'range(2) repeats exactly 2 times.', review: REVIEW.loops },
                  { question: 'You know exactly how many times you want to repeat something. Which loop fits best?', options: ['A `for` loop', 'A `while` loop', 'An import', 'A `finally` block'], answer: 0, explain: 'A for loop repeats a set number of times. A while loop keeps going until a condition changes.', review: REVIEW.loops },
                  { question: 'What happens with `for _ in range(0):` and `wave_once(motion)` indented under it?', options: ['The line inside never runs', 'It runs once', 'It runs forever', 'Python stops with an error'], answer: 0, explain: 'range(0) repeats zero times, so the arm lifts and never swings.', review: REVIEW.loops },
                  { question: 'A `while` loop never changes its counter. What happens?', options: ['It never stops, an infinite loop', 'It stops after one repeat', 'Python changes the counter for you', 'Python skips the loop'], answer: 0, explain: 'If nothing changes, the condition stays true forever.', review: REVIEW.loops },
                  { question: 'A `say("done")` line sits right after a `for` loop and is **not** indented. When does it run?', options: ['Once, after the loop is done', 'Once for every repeat', 'Never', 'Before the loop starts'], answer: 0, explain: 'Only indented lines are inside the loop. A line that is not indented runs once, after it.', review: REVIEW.loops },
                  { question: 'Which lines repeat in a `for` loop?', options: ['Only the lines indented under it', 'Every line in the file', 'The line above the loop', 'Only lines that start with #'], answer: 0, explain: 'The indent shows which lines belong to the loop.', review: REVIEW.loops },
                  { question: '`WAVE_DELAY_SECONDS` changes from 0.3 to 0.15. What happens to the wave?', options: ['It gets faster', 'It gets slower', 'It waves more times', 'Nothing changes'], answer: 0, explain: 'It is the pause between swings, so a smaller number means quicker swings.', review: REVIEW.settings },
                  { question: 'The calls are in this order: `wave`, then `raise_arm`. What does the robot do?', options: ['Swings first, then lifts the arm after the wave is over', 'A normal wave, order does not matter', 'Python stops with an error', 'It skips the wave'], answer: 0, explain: 'The robot does exactly what is written, top to bottom.', review: REVIEW.order },
                  { question: 'The calls are `open_hand`, then `wave`, and `raise_arm` is never called. What does the robot do?', options: ['It waves without ever raising the arm', 'A normal, friendly wave', 'It waves with a closed fist', 'Python stops with an error'], answer: 0, explain: 'A step that is never called never happens, so the arm stays down.', review: REVIEW.order },
                  { question: 'You forget to call `open_hand(motion)`. What happens?', options: ['The robot waves with a closed hand', 'Python opens the hand for you', 'The robot skips the wave', 'Python stops with a NameError'], answer: 0, explain: 'A function only runs when it is called. No call, no open hand.', review: REVIEW.order },
                  { question: 'What is the right order for the wave?', options: ['Open the hand, raise the arm, then wave', 'Wave, raise the arm, then open the hand', 'Raise the arm, wave, then open the hand', 'Open the hand, wave, then raise the arm'], answer: 0, explain: 'Open palm first, then the arm goes up, then the wrist swings.', review: REVIEW.order },
                  { question: 'Which line **calls** a function?', options: ['`raise_arm(motion)`', '`def raise_arm(motion):`', '`from time import sleep`', '`# TODO lab 3`'], answer: 0, explain: 'A call is the name followed by brackets. The def line only teaches the move.', review: REVIEW.order },
                  { question: 'What kind of line is `def open_hand(motion):`?', options: ['It defines a function', 'It calls a function', 'It is an import', 'It is a setting'], answer: 0, explain: 'def teaches a move. A call, like open_hand(motion), runs it.', review: REVIEW.functions },
                  { question: 'You wrote `def open_hand(motion):` but nothing ever calls it. What happens?', options: ['The hand never opens', 'The hand opens on its own', 'Python stops with an error', 'The hand opens twice'], answer: 0, explain: 'Defining a function teaches the move. Only a call runs it.', review: REVIEW.functions },
                  { question: 'When does a `finally` block run?', options: ['Every time, after a normal finish or a crash', 'Only after a crash', 'Only when everything works', 'Only when an admin approves'], answer: 0, explain: 'finally always runs. That is what makes it good for cleanup.', review: REVIEW.cleanup },
                  { question: 'An error stops the program in the middle of the lines under `try:`. What happens to the rest of those lines?', options: ['They are skipped, and then finally runs', 'They still run', 'They run after finally', 'Python runs them twice'], answer: 0, explain: 'A crash skips the rest of try, but finally always runs. That is where the cleanup goes.', review: REVIEW.cleanup },
                  { question: 'Where should the line that sends the arm back to `HOME_ARM` go?', options: ['Under `finally:`', 'Under `try:`, after `wave(motion)`', 'Before `try:`', 'Inside `wave_once`'], answer: 0, explain: 'Under try, a crash would skip it. Under finally, it runs no matter what.', review: REVIEW.cleanup },
                  { question: 'Why does a robot program need cleanup code?', options: ['So the robot always ends in a safe place', 'To make the wave faster', 'To import tools', 'To count the waves'], answer: 0, explain: 'If something fails halfway, cleanup still brings the arm home.', review: REVIEW.cleanup },
                  { question: 'Which line brings in `sleep`?', options: ['`from time import sleep`', '`from sleep import time`', '`import sleep from time`', '`sleep = time`'], answer: 0, explain: 'The shape is from <where it lives> import <the tool>.', review: REVIEW.imports },
                  { question: 'Why put a number in a setting like `WAVE_CYCLES` instead of typing it everywhere?', options: ['Change it once and the whole program follows', 'Python only accepts capital letters', 'It makes the robot stronger', 'Imports need it'], answer: 0, explain: 'One setting means one place to change.', review: REVIEW.settings },
                  { question: 'Which function in the real `wave.py` does the same job as your `raise_arm`?', options: ['`wave_ready_pose`', '`center_all`', '`elbow_wave`', '`wave_forever`'], answer: 0, explain: 'The real wave.py follows the same recipe as yours, with different names. wave_ready_pose lifts the arm into the wave pose.', review: REVIEW.realWave },
                  { question: 'In this lab you change `WAVE_CYCLES` in `wave.py` from 1 to 5. Why does that one change give five waves?', options: ['The loop in `elbow_wave` reads the setting', 'Python copies the wave five times', 'The admin sets the number', '`wave.py` ignores the setting'], answer: 0, explain: 'Same idea as your own loop: the loop reads the setting, so one number controls it.', review: REVIEW.realWave },
                  { question: 'An arm starts moving in a way you did not expect. What do you do first?', options: ['Stop the program and keep your hands clear', 'Grab the arm and hold it still', 'Push it back by hand', 'Run the program again'], answer: 0, explain: 'Never grab or resist a powered arm. Stop the program.', review: REVIEW.safety },
                  { question: 'Who should be in the room when your wave runs on the real robot?', options: ['An instructor or supervisor', 'Nobody, it is safer to run it alone', 'Only other students', 'It does not matter'], answer: 0, explain: 'Never run a program on the physical robot without an instructor or supervisor present.', review: REVIEW.safety },
                ] },
              ],
            },
            {
              id: 'set-it-up', title: 'Set It Up',
              blocks: [
                { type: 'p', text: "Let's set up the run. In the real `wave.py`, find the setting that controls how many times the arm waves. It is the same idea as your `WAVE_CYCLES`. Change it from 1 to **5**:" },
                { type: 'code', lang: 'python', filename: 'Edit in wave.py', workspaceFile: REAL_WAVE, line: 41, code: 'WAVE_CYCLES = 5' },
                { type: 'p', text: "Now, click **Run**. Run checks that you changed exactly that line, and nothing else. If everything is ready, you should get something similar to this:" },
                { type: 'terminal', label: 'Output', lines: ['$ ros2 run swayform_robot wave', '[INFO] [wave]: node started', '[INFO] Connecting to motion controller...', '[INFO] [wave]: all required values are set', 'Objective complete: this matches the target solution. Queue on Robot is now available.'] },
                { type: 'p', text: "If one of the gates is not met yet, Run tells you exactly which one, so you can go back and finish it." },
              ],
            },
            {
              id: 'queue-it', title: 'Queue It',
              blocks: [
                { type: 'p', text: "And now, the moment you've been waiting for!" },
                { type: 'steps', items: [
                  'Click **Queue on Robot**.',
                  'Wait for an admin to approve it.',
                  'When it says it is running, watch the robot wave.',
                  'When it says succeeded, mark the lab complete.',
                ] },
                { type: 'p', text: "While it runs, the output panel shows each change of status, and also what the robot prints. You should get something similar to this:" },
                { type: 'terminal', label: 'Output', lines: [
                  'Queued, position 1 in line. An admin will review and approve it before it runs on the real robot.',
                  'An admin approved it, waiting for the robot to pick it up.',
                  'Running on the real robot now…',
                  'Moving to the rest pose...',
                  'Opening hand...',
                  'Moving to wave pose...',
                  'Waving...',
                  'Wave 1/5: elbow -> 70',
                  'Wave 1/5: elbow -> 40',
                  '...',
                  'Wave 5/5: elbow -> 40',
                  'Returning to the rest pose...',
                  'Succeeded.',
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'The arm really moves. Keep your hands clear, stay back from it, and only run with an instructor in the room. If anything looks wrong, stop and tell them.' },
              ],
            },
            {
              id: 'robot-spotter', title: 'Robot Spotter',
              blocks: [
                { type: 'p', text: "While the robot runs, be a spotter! Watch for each step of the recipe you built, and count the waves out loud with your class:" },
                { type: 'checklist', items: [
                  'It goes to its rest pose (`center_all`).',
                  'The hand opens (`open_hand`).',
                  'The arm lifts into the wave pose (`wave_ready_pose`).',
                  'The elbow waves **5 times** while the fingers ripple (`elbow_wave`).',
                  'It goes back to its rest pose at the end.',
                ] },
                { type: 'p', text: "That's it! You built a robot behavior piece by piece, learned what every line does, and sent it to a real robot. Wave back!" },
              ],
            },
            {
              id: 'if-it-is-stuck', title: 'If It Is Stuck',
              blocks: [
                { type: 'p', text: "Something not working? Here are the most common problems, and how to fix them:" },
                { type: 'troubleshoot', items: [
                  { symptom: 'Queue on Robot stays locked', cause: 'One of the gates is not met yet.', fix: 'Click Run. The Problems tab names what is missing: the lab 3 quiz, the final quiz in this lab, or a TODO still in wave_builder.py.' },
                  { symptom: 'Run says the code does not match', cause: 'Something other than the number was changed in wave.py.', fix: 'Click Reset to put the file back, then change only the WAVE_CYCLES line.' },
                  { symptom: 'It sits in the queue for a long time', cause: 'An admin has not approved it yet.', fix: 'Tell your instructor it is waiting. The robot will not move until it is approved.' },
                ] },
              ],
            },
          ],
          completionSummary: { text: 'You finished the Wave section: you built the program and sent a wave to the real robot.', conceptsUsed: ['Behaviors', 'Safety'] },
        },
      ],
    },
  ],
};
