/* Wave, behavior section 1 (6 labs). Listed as section 5 in curriculum.js; see README.md, "The Wave section". */

const BUILDER = 'swayform_ws/src/swayform_labs/wave_builder.py';
const REAL_WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
// The quiz sits at the end of lab 3, so the robot run is gated on that lab.
export const WAVE_QUIZ_ID = 'wv-03-functions';
export const WAVE_QUIZ_PASS = 80;
// Lab 6 opens with a final quiz. Queue on Robot stays locked until it is passed
// (robotGate.needsQuiz, remembered in this browser by quiz-passes.js).
const WAVE_FINAL_QUIZ_ID = 'wv-06-final-quiz';
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

// Every lab opens with a Goals step: what the student will learn and do.
const goals = (items) => ({
  id: 'goals', title: 'Goals',
  blocks: [
    { type: 'p', text: 'Here is what this lab covers:' },
    { type: 'list', items },
  ],
});

// Reminder in each coding lab: undo first, Reset only to start the whole file over.
const RESET_TIP = { type: 'callout', tone: 'tip', label: 'Deleted too much?', text: 'Press Ctrl+Z (Cmd+Z on a Mac) to undo. To start over completely, click **Reset** above the code. Reset puts the whole file back the way it was before lab 2, so you would fill in the earlier pieces again. The Show Solution in each lab has its piece.' };

const openBuilder = (line) => ({
  type: 'code', lang: 'python', filename: 'wave_builder.py', workspaceFile: BUILDER, line, copy: false,
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
            goals(['What you will build: a wave program that runs on SwayForm.', 'The 70 / 30 idea: most of the program is written, and you fill in the marked parts.', 'The three things that must be true before the robot runs your wave.']),
            {
              id: 'the-goal', title: 'What You Will Build',
              blocks: [
                { type: 'lead', text: "By the end of this section SwayForm will wave at the room, and the program that makes it wave will be one you finished yourself." },
                { type: 'p', text: "You already watched the Wave demo. Now you build the same idea from the inside. You will not start from a blank page. A program is waiting for you with most of it written, and your job is to fill in the missing parts, one lab at a time." },
              ],
            },
            {
              id: 'the-70-30-idea', title: 'The 70 / 30 Idea',
              blocks: [
                { type: 'p', text: "About **70%** of the code is already written for you. The other **30%** is yours to write. You will not guess at it. Each lab teaches one idea first, then asks you to use it." },
                { type: 'p', text: "Every spot you will write is marked in the file with a one-line note that starts with `# TODO` and names the lab where you fill it in. The **Check** button counts how many are left, so you can watch the program fill up." },
                { type: 'table', headers: ['Lab', 'You learn', 'You write'], rows: [
                  ['2', 'Imports and settings (variables)', 'The import for sleep, and two settings'],
                  ['3', 'Functions', 'Two small functions'],
                  ['4', 'Loops', 'A loop that repeats the wave'],
                  ['5', 'Order of steps, and cleanup (try / finally)', 'The three steps in order, and a safe way to end'],
                ] },
                { type: 'p', text: "Lab 1 has no code to write. Labs 2 and 3 include a few quick questions, and lab 3 ends with a quiz. Labs 4 and 5 have bug hunts, where you find out what went wrong. Lab 6 starts with a final quiz, then the robot run, where you change one number." },
              ],
            },
            {
              id: 'the-recipe', title: 'The Recipe',
              blocks: [
                { type: 'p', text: "A wave is a short list of steps. The robot does them top to bottom, exactly as written." },
                { type: 'code', lang: 'text', filename: 'The recipe for a wave', code: 'go home\n  ↓\nopen the hand\n  ↓\nraise the arm\n  ↓\nswing the wrist back and forth, a few times\n  ↓\ngo home' },
                { type: 'p', text: "Each step becomes a small function in your program. By lab 5 you will have written some of them and read the rest." },
              ],
            },
            {
              id: 'how-it-ends', title: 'How It Ends',
              blocks: [
                { type: 'p', text: "Lab 6 sends your wave to the real robot. Three things have to be true first:" },
                { type: 'checklist', items: [
                  'Your program is finished, with no `# TODO` notes left (labs 2 to 5).',
                  'You scored **80% or better** on the quiz in lab 3, and on the final quiz in lab 6.',
                  'An **admin approves** the run. Nobody can start the robot moving without that.',
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'A real arm moves in lab 6. Keep your hands clear, and only run it with an instructor in the room.' },
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
            goals(['What an import line does: it brings a tool into your program.', 'What `sleep` and `MotionClient` do.', 'What a variable is, and why settings are written in CAPITAL LETTERS.', 'Add the import for `sleep`, then set `WAVE_CYCLES` and `WAVE_DELAY_SECONDS` in `wave_builder.py`.']),
            {
              id: 'open-the-file', title: 'Open the File',
              blocks: [
                { type: 'p', text: "Open `wave_builder.py`. About 70% of the program is already there, so spend a minute scrolling through it before you change anything. Do not worry about understanding every line yet." },
                openBuilder(1),
              ],
            },
            {
              id: 'what-an-import-does', title: 'What an Import Does',
              blocks: [
                { type: 'p', text: "Python knows a few things on its own, like how to add numbers. For everything else it borrows tools that other people wrote. An **import** line says which tool you want, the way you grab a screwdriver from a toolbox before a job." },
                { type: 'code', lang: 'python', filename: 'The top of wave_builder.py', code: 'from time import sleep\nfrom swayform.motion import MotionClient' },
                { type: 'list', items: [
                  '`from time import sleep` brings in `sleep`, a tool that makes the program wait.',
                  '`from swayform.motion import MotionClient` brings in `MotionClient`, the tool that sends moves to the robot.',
                ] },
                { type: 'p', text: "The shape is always `from <where it lives> import <the tool>`. Imports go at the **top** of the file, because the code below uses them." },
              ],
            },
            {
              id: 'match-the-tool', title: 'Match the Tool to the Job',
              blocks: [
                { type: 'match', prompt: 'Pick what each line does. There are more answers than lines, so read each one carefully.', pairs: [
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
                { type: 'p', text: "Look at `wave_once` in the file. It calls `sleep(...)`, but nothing imports `sleep`. Run the program as it is and Python would stop with an error, because it has no idea what `sleep` means." },
                { type: 'p', text: "Find the first `# TODO lab 2` note near the top. Replace that whole line with the import for `sleep`. Remember, the number inside `sleep(...)` is in **seconds**, so `sleep(1)` waits one second and `sleep(0.3)` waits less than half a second:" },
                { type: 'code', lang: 'python', filename: 'wave_builder.py', code: 'from time import sleep', copy: false },
                { type: 'callout', tone: 'tip', label: 'Tip', text: 'Delete the whole TODO line and type the import in its place. Check counts any line that still has TODO in it.' },
                { type: 'p', text: "Click **Check**. The output shows a progress bar for the whole program. The program has **7** pieces for you to write across these labs, and you just wrote the first one, so it should say **1 of 7 pieces done**. Still says 0 of 7? Make sure the whole `# TODO lab 2` line is gone." },
                { type: 'reveal', hint: 'The line is `from time import sleep`. It starts with the word `from`, and `time` and `sleep` are lowercase.', solution: { text: 'The top of the file after this step:', code: { lang: 'python', filename: 'wave_builder.py', code: 'from time import sleep\nfrom swayform.motion import MotionClient' } } },
              ],
            },
            {
              id: 'import-questions', title: 'Quick Questions: Imports',
              blocks: [
                { type: 'p', text: "Pick an answer. If it is wrong, it greys out and you can try another. Nothing here is graded." },
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
                { type: 'p', text: "A **variable** is a name stuck on a value. After `WAVE_CYCLES = 3`, every time the program says `WAVE_CYCLES` it means 3." },
                { type: 'p', text: "Settings are written in CAPITAL LETTERS. That is a habit, not a rule, and it tells every reader: this is a number you are allowed to change." },
              ],
            },
            {
              id: 'why-bother', title: 'Why Bother With a Name',
              blocks: [
                { type: 'code', lang: 'python', filename: 'Without a setting', code: 'sleep(0.3)\n...\nsleep(0.3)\n...\nsleep(0.3)' },
                { type: 'code', lang: 'python', filename: 'With a setting', code: 'WAVE_DELAY_SECONDS = 0.3\n\nsleep(WAVE_DELAY_SECONDS)\n...\nsleep(WAVE_DELAY_SECONDS)\n...\nsleep(WAVE_DELAY_SECONDS)' },
                { type: 'p', text: "In the first version, a slower wave means finding and editing every `0.3`. In the second, you change one line and the whole program follows." },
              ],
            },
            {
              id: 'settings-already-there', title: 'Settings Already There',
              blocks: [
                { type: 'p', text: "Some settings are already written for you. They describe the arm positions for this wave." },
                { type: 'table', headers: ['Setting', 'What it holds'], rows: [
                  ['RAISED_ARM', 'Shoulder and elbow angles for a raised arm'],
                  ['HOME_ARM', 'Shoulder and elbow angles for a resting arm'],
                  ['WRIST_LEFT / WRIST_RIGHT', 'How far the wrist swings each way'],
                  ['WRIST_CENTER', 'The wrist when it is straight'],
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'These angles are tested. Leave them as they are. You only change the two settings this lab asks for.' },
                { type: 'mcq', required: false, question: 'If `WAVE_DELAY_SECONDS` changes from 0.3 to 0.1, how does the wave change?', options: ['It gets faster', 'It gets slower', 'It waves more times', 'Nothing changes'], answer: 0, explain: 'It is the pause between swings, so a smaller pause means a quicker wave.' },
              ],
            },
            {
              id: 'add-the-settings', title: 'Your Turn: Add the Settings',
              blocks: [
                { type: 'p', text: "Find the other `# TODO lab 2` note. Replace that line with two settings:" },
                { type: 'list', items: [
                  '`WAVE_CYCLES`: how many times the wrist swings. Use **3**.',
                  '`WAVE_DELAY_SECONDS`: the pause between swings, in seconds. Use **0.3**.',
                ] },
                { type: 'p', text: "Each one goes on its own line, with the name, an equals sign, and the number." },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 2 of 7 pieces done.' },
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
            goals(['What `def` does: it gives a list of steps one name.', 'The difference between defining a function and calling it.', 'Write `open_hand` and `raise_arm`.', 'Pass the quiz with 80% or better to unlock the robot run in lab 6.']),
            {
              id: 'a-named-recipe', title: 'A Named Recipe',
              blocks: [
                { type: 'p', text: "A **function** gives a list of steps one name, so you can run the whole list by saying the name. Here is one that is already in your file:" },
                { type: 'code', lang: 'python', filename: 'wave_builder.py', code: 'def go_home(motion: MotionClient) -> None:\n    motion.safe_pose("idle")' },
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
                { type: 'p', text: "Writing `def open_hand(motion):` only **teaches** the robot a move. Nothing moves yet. The move happens when something later **calls** it by writing `open_hand(motion)`. You will do the calling in lab 5." },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn',
              blocks: [
                { type: 'p', text: "Find the two `# TODO lab 3` notes. Replace them with two functions that follow the same shape as `go_home`:" },
                { type: 'code', lang: 'python', filename: 'The shape (fill in the blanks)', code: 'def open_hand(motion: MotionClient) -> None:\n    motion.set_hand_pose("right_hand", "____")\n\n\ndef raise_arm(motion: MotionClient) -> None:\n    motion.move_joint_group("right_arm", ____)', copy: false },
                { type: 'list', items: [
                  'The hand pose you want is named `"open"`.',
                  'The arm positions are already stored in a setting. Look at the settings near the top for the one that means a raised arm.',
                ] },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 4 of 7 pieces done.' },
                RESET_TIP,
                { type: 'reveal', hint: 'Both functions have one line inside. The second blank is a setting name, not a number.', solution: { text: 'Both functions:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def open_hand(motion: MotionClient) -> None:\n    motion.set_hand_pose("right_hand", "open")\n\n\ndef raise_arm(motion: MotionClient) -> None:\n    motion.move_joint_group("right_arm", RAISED_ARM)' } } },
              ],
            },
            {
              id: 'quick-review', title: 'Before the Quiz: Quick Review',
              blocks: [
                { type: 'terms', items: [
                  { term: 'import', def: 'Brings a tool into your program. Goes at the top of the file.' },
                  { term: 'variable', def: 'A name stuck on a value, like `WAVE_CYCLES = 3`.' },
                  { term: 'function', def: 'A named recipe of steps. `def` defines it, a call runs it.' },
                  { term: 'MotionClient', def: 'The tool that sends moves to the robot.' },
                  { term: 'sleep', def: 'Makes the program wait for a number of seconds.' },
                ] },
              ],
            },
            {
              id: 'the-quiz', title: 'The Quiz',
              blocks: [
                { type: 'quiz', id: WAVE_QUIZ_ID, title: 'Building Blocks Quiz', passPercent: WAVE_QUIZ_PASS, count: 10, questions: [
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
            goals(['What a loop does: it repeats lines so you do not have to copy and paste them.', 'The two kinds of loop, `for` and `while`, and when to use each one.', 'Why the indent decides which lines repeat.', 'Write the loop in `wave` that repeats the swing `WAVE_CYCLES` times.', 'Give your wave a personality by changing two numbers.']),
            {
              id: 'repeat-without-copy-paste', title: 'Repeat Without Copy and Paste',
              blocks: [
                { type: 'lead', text: 'A coach at practice says "Ten jumping jacks!" They do not say "jumping jack" ten times in a row. A loop is how you give a robot that kind of instruction.' },
                { type: 'p', text: "One swing of the wrist is not much of a wave. You want several. You could write the same call again and again:" },
                { type: 'code', lang: 'python', filename: 'The slow way', code: 'wave_once(motion)\nwave_once(motion)\nwave_once(motion)' },
                { type: 'p', text: "That works, but for 5 waves you would have to add more lines. A **loop** repeats lines for you. The number of repeats comes from a setting, so you change one number instead of the code." },
                { type: 'code', lang: 'python', filename: 'The loop way', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)' },
              ],
            },
            {
              id: 'two-kinds-of-loops', title: 'Two Kinds of Loops',
              blocks: [
                { type: 'p', text: "Python has two kinds of loop. Both repeat the indented lines under them. The difference is how they decide when to stop." },
                { type: 'p', text: "Think of gym class. **\"Run 5 laps\"** is a `for` loop: you know the number before you start. **\"Keep running until the whistle blows\"** is a `while` loop: you keep going until something changes." },
                { type: 'table', headers: ['Loop', 'Repeats', 'Use it when'], rows: [
                  ['`for`', 'A set number of times', 'You know how many times up front, like `WAVE_CYCLES`'],
                  ['`while`', 'As long as a condition is true', 'You want to keep going until something changes'],
                ] },
                { type: 'code', lang: 'python', filename: 'A for loop', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)', copy: false },
                { type: 'code', lang: 'python', filename: 'A while loop that does the same thing', code: 'count = 0\nwhile count < WAVE_CYCLES:\n    wave_once(motion)\n    count = count + 1', copy: false },
                { type: 'p', text: "Both wave `WAVE_CYCLES` times. The `while` loop keeps its own counter, `count`. Before each repeat it checks `count < WAVE_CYCLES`. Each time through, `count` goes up by one. Once `count` reaches `WAVE_CYCLES`, the check is false and the loop stops." },
                { type: 'callout', tone: 'tip', label: 'Tip', text: 'A `while` loop has to change something each time through, like `count = count + 1`. If nothing changes, the condition stays true and the loop never stops.' },
                { type: 'code', lang: 'python', filename: 'Bug hunt: something is missing', code: 'count = 0\nwhile count < WAVE_CYCLES:\n    wave_once(motion)', copy: false },
                { type: 'p', text: "Can you spot what is missing? Make a guess, then open the box to check." },
                { type: 'troubleshoot', items: [
                  { symptom: 'Bug hunt: the robot waves forever and never stops', cause: 'Nothing inside the loop changes `count`, so it stays 0 and `count < WAVE_CYCLES` is true forever. Someone would have to stop the program by hand. This bug is called an **infinite loop**.', fix: 'Add `count = count + 1` as the last indented line inside the loop.' },
                ] },
                { type: 'p', text: "In this lab you write a `for` loop, because you know exactly how many waves you want. You will see a `while` loop again in lab 6, in the real `wave.py`." },
              ],
            },
            {
              id: 'anatomy-of-a-loop', title: 'Anatomy of a For Loop',
              blocks: [
                { type: 'code', lang: 'python', filename: 'A for loop', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)', copy: false },
                { type: 'terms', items: [
                  { term: 'for', def: 'Starts the loop.' },
                  { term: '_', def: 'A throwaway name for the counter. We do not need to know which repeat it is, only that it repeats.' },
                  { term: 'range(WAVE_CYCLES)', def: 'How many times to repeat. With WAVE_CYCLES = 3, that is three times.' },
                  { term: ':', def: 'Ends the first line and says the loop body comes next.' },
                  { term: 'indented line', def: 'The line that repeats. Only indented lines are inside the loop.' },
                ] },
                { type: 'p', text: "So `range(4)` repeats four times, `range(10)` repeats ten times, and `range(WAVE_CYCLES)` repeats as many times as the setting says." },
              ],
            },
            {
              id: 'the-indent-decides', title: 'The Indent Decides What Repeats',
              blocks: [
                { type: 'p', text: "Only the lines indented under `for` are inside the loop. A line that is not indented runs once, after the loop is done." },
                { type: 'code', lang: 'python', filename: 'Right: the swing is inside the loop', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)', copy: false },
                { type: 'p', text: "`wave_once` is indented, so it runs `WAVE_CYCLES` times." },
                { type: 'code', lang: 'python', filename: 'Wrong: the swing is outside the loop', code: 'for _ in range(WAVE_CYCLES):\n    sleep(WAVE_DELAY_SECONDS)\nwave_once(motion)', copy: false },
                { type: 'p', text: "Here only the `sleep` is inside the loop. The robot pauses `WAVE_CYCLES` times, then swings the wrist once. One missing indent, and most of the wave is gone." },
              ],
            },
            {
              id: 'trace-it', title: 'Predict the Swings',
              blocks: [
                { type: 'p', text: "Time to think like the robot. Each loop below has `wave_once(motion)` indented under it. Cover the right side of the table, guess how many swings each one gives, then check yourself." },
                { type: 'table', headers: ['Loop', 'Swings', 'What you see'], rows: [
                  ['`for _ in range(2):`', '2', 'A quick hello'],
                  ['`for _ in range(WAVE_CYCLES):` with `WAVE_CYCLES = 4`', '4', 'A big friendly wave'],
                  ['`for _ in range(10):`', '10, not 11', 'A very excited robot'],
                  ['`for _ in range(0):`', '0', 'The arm lifts and never swings. Awkward!'],
                ] },
                { type: 'p', text: "`range(n)` repeats exactly n times. `range(0)` repeats zero times, so the line inside the loop never runs." },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn: Write the Loop',
              blocks: [
                { type: 'p', text: "Open the `wave` function. Replace the `# TODO lab 4` note and the `pass` below it with a `for` loop that calls `wave_once(motion)` once for each cycle." },
                { type: 'callout', tone: 'tip', label: 'Tip', text: 'The call must be indented under the for line. If it is not indented, it is not inside the loop.' },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 5 of 7 pieces done.' },
                RESET_TIP,
                { type: 'reveal', hint: 'It is the same two lines from the loop way above: `for _ in range(WAVE_CYCLES):` and an indented `wave_once(motion)`.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def wave(motion: MotionClient) -> None:\n    for _ in range(WAVE_CYCLES):\n        wave_once(motion)' } } },
              ],
            },
            {
              id: 'try-changing-this', title: 'Give Your Wave a Personality',
              blocks: [
                { type: 'p', text: "Same loop, different settings, different mood. Your loop reads both settings, so you can change how the wave feels without touching the loop itself." },
                { type: 'table', headers: ['Personality', 'WAVE_CYCLES', 'WAVE_DELAY_SECONDS', 'What it looks like'], rows: [
                  ['Shy', '1', '0.6', 'One slow little wave'],
                  ['Sleepy', '2', '0.8', 'Two very slow swings'],
                  ['Friendly', '3', '0.3', 'The wave you are building'],
                  ['Excited', '6', '0.15', 'Lots of quick swings'],
                ] },
                { type: 'p', text: "A bigger `WAVE_CYCLES` means more swings. A smaller `WAVE_DELAY_SECONDS` means a shorter pause between swings, so the wave is faster." },
                { type: 'p', text: "Which personality would you give SwayForm when the class walks in? Pick one and tell the person next to you why." },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep `WAVE_CYCLES` at 10 or less and `WAVE_DELAY_SECONDS` at 0.1 or more. Never change `WRIST_LEFT` or `WRIST_RIGHT`. Those angles are tested.' },
              ],
            },
            {
              id: 'bug-hunt', title: 'Bug Hunt: Indent Edition',
              blocks: [
                { type: 'p', text: "Each of these programs has one indent in the wrong place. Read the code, guess what goes wrong, then open the box to check." },
                { type: 'code', lang: 'python', filename: 'Bug 1', code: 'for _ in range(3):\n    wave_once(motion)\n    say("done")', copy: false },
                { type: 'code', lang: 'python', filename: 'Bug 2', code: 'for _ in range(WAVE_CYCLES):\nwave_once(motion)', copy: false },
                { type: 'troubleshoot', items: [
                  { symptom: 'Bug 1: "done" shows up three times instead of once', cause: '`say("done")` is indented, so it is inside the loop and repeats with every swing.', fix: 'Move `say("done")` all the way to the left so it runs once, after the loop.' },
                  { symptom: 'Bug 2: Python stops with an IndentationError before the robot moves', cause: 'Nothing is indented under the `for` line, so the loop has no body and Python refuses to run it.', fix: 'Indent `wave_once(motion)` under the `for` line.' },
                ] },
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
            goals(['Why order matters: the robot does exactly what you wrote, top to bottom.', 'The difference between defining a function and calling it.', 'How `try` and `finally` make sure the arm always comes home.', 'Call the three wave steps in order, then add the cleanup. This finishes your program.']),
            {
              id: 'top-to-bottom', title: 'Top to Bottom',
              blocks: [
                { type: 'lead', text: 'Try this with a friend. Tell them how to put on a jacket, one step at a time, and have them do exactly what you say. Say "zip it up" before "put your arms in the sleeves" and you get a very confused friend. A robot is that friend, every single time.' },
                { type: 'p', text: "A program runs one line at a time, starting at the top. The robot does not know what you meant. It only knows what you wrote, in the order you wrote it." },
                { type: 'code', lang: 'python', filename: 'Right order', code: 'raise_arm(motion)\nwave(motion)', copy: false },
                { type: 'p', text: "The arm goes up, then the wrist swings. That is a wave." },
                { type: 'code', lang: 'python', filename: 'Wrong order', code: 'wave(motion)\nraise_arm(motion)', copy: false },
                { type: 'p', text: "Same two lines, swapped. Now the wrist swings while the arm is still down, so the robot waves at the floor. Then it lifts the arm when the wave is already over." },
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
                { type: 'p', text: "The robot has already gone home before step 1, because `main` calls `go_home` first. The real wave on the robot uses this same order." },
                { type: 'p', text: "**What went wrong?** Three robots got their orders mixed up. Read what each one did, guess which call is missing or in the wrong place, then open the box to check." },
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
                { type: 'p', text: "In lab 3 you wrote `open_hand` and `raise_arm`. Writing a function with `def` only teaches the robot a move. Nothing happens until you **call** it." },
                { type: 'table', headers: ['Code', 'What it is', 'What it does'], rows: [
                  ['`def open_hand(motion):`', 'Defining', 'Teaches the robot the steps. Nothing moves yet.'],
                  ['`open_hand(motion)`', 'Calling', 'Runs those steps, right now.'],
                ] },
                { type: 'p', text: "A call is the function name, then brackets with what you hand it. Every function here needs `motion`, the robot connection, so each call looks like `name(motion)`. You define a function once, and you can call it as many times as you like." },
              ],
            },
            {
              id: 'add-the-calls', title: 'Your Turn: Call the Steps',
              blocks: [
                { type: 'p', text: "Open `perform_wave`. Replace the first `# TODO lab 5` note with three calls, in the wave order above: `open_hand`, `raise_arm`, then `wave`. Each takes `motion`." },
                { type: 'p', text: "Leave the second `# TODO lab 5` note and the `pass` line alone for now. They are for the cleanup, later in this lab." },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 6 of 7 pieces done. The last piece is the cleanup, later in this lab.' },
                RESET_TIP,
                { type: 'reveal', hint: 'Three lines, each one a name followed by (motion).', solution: { text: 'The three calls:', code: { lang: 'python', filename: 'wave_builder.py', code: 'open_hand(motion)\nraise_arm(motion)\nwave(motion)' } } },
              ],
            },
            {
              id: 'what-if-it-goes-wrong', title: 'Cleanup: What If It Goes Wrong',
              blocks: [
                { type: 'p', text: "Say something fails halfway through the wave, with the arm still up. If the program just stops there, the arm stays raised. A robot should always end in a safe place." },
                { type: 'p', text: "Think about leaving a room. Whether you finished your work or got called away halfway through, you switch the lights off on your way out. `finally` is that rule for robots." },
                { type: 'p', text: "`try` and `finally` fix this. Put the main steps under `try:`, and the cleanup under `finally:`." },
                { type: 'code', lang: 'python', filename: 'try and finally', code: 'try:\n    open_hand(motion)\n    raise_arm(motion)\n    wave(motion)\nfinally:\n    motion.move_joint_group("right_arm", HOME_ARM)', copy: false },
                { type: 'list', items: [
                  '`try:` runs the main steps, top to bottom.',
                  '`finally:` runs the cleanup **no matter what**: after a normal finish, or after a crash.',
                  'Here the cleanup sends the arm back to `HOME_ARM`, its resting position.',
                ] },
                { type: 'table', headers: ['What happens in try', 'Does finally run?'], rows: [
                  ['Everything works', 'Yes'],
                  ['An error stops the program in the middle', 'Yes'],
                ] },
                { type: 'p', text: "Look at the indent. The lines that belong to `try` or `finally` sit one level to the right, the same way the lines inside a function or a loop do." },
              ],
            },
            {
              id: 'add-the-cleanup', title: 'Your Turn: Add the Cleanup',
              blocks: [
                { type: 'p', text: "Open `perform_wave` one more time. Wrap your three calls in `try:`, and add a `finally:` that sends `right_arm` back to `HOME_ARM`, the same way you sent it to `RAISED_ARM` in lab 3. Delete the last `# TODO lab 5` note and the `pass` line." },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 7 of 7 pieces done, with no TODO notes left.' },
                { type: 'reveal', hint: 'The calls move one level to the right, under try. The finally block has one line, and it uses move_joint_group.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def perform_wave(motion: MotionClient) -> None:\n    try:\n        open_hand(motion)\n        raise_arm(motion)\n        wave(motion)\n    finally:\n        motion.move_joint_group("right_arm", HOME_ARM)' } } },
              ],
            },
            {
              id: 'run-the-finished-program', title: 'Run the Finished Program',
              blocks: [
                { type: 'lead', text: 'This is the big moment: 7 of 7. Your wave program is complete.' },
                { type: 'p', text: "Click **Run**. With no TODO notes left, the output says every required value is set. In this lab the Run is a simulation. It checks your file, it does not move the robot. That happens in lab 6." },
                { type: 'p', text: "About 70% of the file was there when you started. The other 30% is yours. Scroll through and find every piece you wrote:" },
                { type: 'checklist', items: [
                  'The `sleep` import (lab 2)',
                  'The two settings, `WAVE_CYCLES` and `WAVE_DELAY_SECONDS` (lab 2)',
                  '`open_hand` and `raise_arm` (lab 3)',
                  'The loop in `wave` (lab 4)',
                  'The three calls in `perform_wave` (lab 5)',
                  'The `try` / `finally` cleanup (lab 5)',
                ] },
                { type: 'p', text: "You now know what every line in this file does. Next stop: the real robot." },
              ],
            },
            {
              id: 'bug-hunt', title: 'Bug Hunt: Cleanup Edition',
              blocks: [
                { type: 'p', text: "One last bug before the robot. This program looks almost right. Read it, guess what goes wrong when the wave crashes halfway, then open the box to check." },
                { type: 'code', lang: 'python', filename: 'Bug: something is in the wrong place', code: 'try:\n    open_hand(motion)\n    raise_arm(motion)\n    wave(motion)\n    motion.move_joint_group("right_arm", HOME_ARM)\nfinally:\n    say("all done")', copy: false },
                { type: 'troubleshoot', items: [
                  { symptom: 'The wave crashed halfway, and the arm stayed up in the air', cause: 'The line that sends the arm home is under `try`. When the wave crashed, Python skipped the rest of `try`, and the line home with it.', fix: 'Move the home line under `finally:`, which runs no matter what.' },
                ] },
                { type: 'callout', tone: 'note', label: 'Myth or fact?', text: '**Myth:** `finally` only runs after a crash. **Fact:** it runs every time, after a normal finish too. That is why the arm always comes home.' },
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
            goals(['A quick warm-up on everything from labs 2 to 5.', 'How your `wave_builder.py` lines up with the real `wave.py` the robot runs.', 'Change one setting in `wave.py`, then send your wave to SwayForm.', 'Watch the robot do each step of the recipe you built.']),
            {
              id: 'last-minute-review', title: 'Last-Minute Review',
              blocks: [
                { type: 'p', text: "Before you send your wave, here is a quick refresher on labs 2 to 5. In this lab you open the real `wave.py`, the file the robot actually runs. It is longer than yours, but it is built from the same ideas." },
                { type: 'table', headers: ['Idea', 'What to remember', 'Where you see it in wave.py'], rows: [
                  ['Imports (lab 2)', 'Tools come in at the top of the file, before the code that uses them.', 'The first lines, including `import time`, which gives the real wave its pauses.'],
                  ['Settings (lab 2)', 'A name in CAPITAL LETTERS holds a value you are allowed to change. Change it once and the whole program follows.', '`WAVE_CYCLES`, the one line you change in this lab.'],
                  ['Functions (lab 3)', '`def` teaches a move. A call, the name followed by brackets, runs it.', 'Small named functions such as `open_hand` and `wave_ready_pose`.'],
                  ['Loops (lab 4)', 'A loop repeats its indented lines, as many times as a setting says.', '`elbow_wave` repeats the wave `WAVE_CYCLES` times. Note: this is a `while` loop. See "Two Kinds of Loops" in lab 4 if you need a refresher.'],
                  ['Order (lab 5)', 'Lines run top to bottom, so the steps have to be in the right order.', 'The same recipe as yours: open the hand, raise the arm, then wave.'],
                  ['Cleanup (lab 5)', '`finally` runs no matter what, so the arm always ends in a safe place.', '`perform_wave` uses `try` and `finally`, just like yours.'],
                ] },
                { type: 'p', text: "Your job in this lab is small: find `WAVE_CYCLES` and change it from 1 to 5. Because it is a setting, that one change is all it takes. The loop reads it and waves five times instead of once." },
                { type: 'callout', tone: 'safety', label: 'Remember', text: 'A real arm is about to move. Never touch, hold or push a powered arm. If anything looks wrong, stop the program and keep your hands clear. Only run it with an instructor in the room.' },
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
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'The arm really moves. Keep your hands clear, stay back from it, and only run with an instructor in the room. If anything looks wrong, stop and tell them.' },
              ],
            },
            {
              id: 'your-program-and-the-real-one', title: 'Your Program and the Real One',
              blocks: [
                { type: 'p', text: "The robot does not run `wave_builder.py`. It runs the real `wave.py`, which has the same recipe with all the motor details filled in. Here is how the pieces line up:" },
                { type: 'table', headers: ['Your wave_builder.py', 'The real wave.py'], rows: [
                  ['go_home', 'center_all'],
                  ['open_hand', 'open_hand'],
                  ['raise_arm', 'wave_ready_pose'],
                  ['wave_once + wave (your loop)', 'elbow_wave'],
                  ['perform_wave (try / finally)', 'perform_wave (try / finally)'],
                ] },
                { type: 'p', text: "The real wave swings the elbow and ripples the fingers while it does, where yours swings the wrist, but the recipe is the same. Open the real file from the explorer and read through it. You will recognize the shape." },
                { type: 'callout', tone: 'note', label: 'Note: this is a while loop', text: 'In `elbow_wave` you will find `while cycles is None or i < cycles:` where your program had a `for` loop. Read it as: keep waving while the count `i` is below the number of `cycles`. The `cycles is None` part lets the robot wave forever in a different mode, so you can ignore it here. See "Two Kinds of Loops" in lab 4 if you need a refresher.' },
              ],
            },
            {
              id: 'final-quiz', title: 'The Final Quiz',
              blocks: [
                { type: 'lead', text: 'One last challenge before the robot moves. This quiz covers everything from labs 2 to 5.' },
                { type: 'p', text: "There are 10 questions: 7 multiple choice and 3 matching. On a matching question you get credit for every pair you get right, so 2 of 3 pairs still earns most of the point. Pass with 80% or better to unlock the robot run. Each try draws a fresh mix, and if you miss one, the note under it links back to the lab that explains it." },
                { type: 'quiz', id: WAVE_FINAL_QUIZ_ID, savePass: true, title: 'Final Wave Quiz', passPercent: WAVE_QUIZ_PASS, count: 10, matchCount: 3, questions: [
                  { type: 'match', question: 'Match each loop to how many times `wave_once` runs inside it.', pairs: [
                    ['`for _ in range(2):`', '2 times'],
                    ['`for _ in range(0):`', 'Never'],
                    ['`for _ in range(WAVE_CYCLES):` with `WAVE_CYCLES = 5`', '5 times'],
                  ], distractors: ['6 times', 'Forever'], explain: '`range(n)` repeats exactly n times, and `range(0)` never runs the line inside.', review: REVIEW.loops },
                  { type: 'match', question: 'Match each mixed-up order of calls to what the robot does.', pairs: [
                    ['`wave`, then `raise_arm`', 'Swings first and lifts the arm too late'],
                    ['`raise_arm`, then `wave`', 'Waves with a closed fist'],
                    ['`open_hand`, then `wave`', 'Waves without ever raising the arm'],
                  ], distractors: ['A normal, friendly wave', 'Python stops with an error'], explain: 'The robot does exactly what is written, top to bottom. A step that is never called never happens.', review: REVIEW.order },
                  { type: 'match', question: 'Match each line to the kind of line it is.', pairs: [
                    ['`from time import sleep`', 'An import'],
                    ['`WAVE_CYCLES = 3`', 'A setting'],
                    ['`def open_hand(motion):`', 'Defines a function'],
                    ['`open_hand(motion)`', 'Calls a function'],
                  ], distractors: ['A loop'], explain: 'Imports bring tools in, settings hold values, def teaches a move, and a call runs it.', review: REVIEW.functions },
                  { type: 'match', question: 'Match each part of `perform_wave` to when it runs.', pairs: [
                    ['The lines under `try:`', 'First, top to bottom'],
                    ['The lines under `finally:`', 'Every time, even after a crash'],
                    ['Lines in `try:` after a crash', 'Skipped'],
                  ], distractors: ['Only when an admin approves'], explain: 'A crash skips the rest of try, but finally always runs. That is where the cleanup goes.', review: REVIEW.cleanup },
                  { type: 'match', question: 'Match each function in your `wave_builder.py` to its partner in the real `wave.py`.', pairs: [
                    ['`go_home`', 'center_all'],
                    ['`raise_arm`', 'wave_ready_pose'],
                    ['`wave_once` and your loop in `wave`', 'elbow_wave'],
                  ], distractors: ['wave_forever'], explain: 'The real wave.py follows the same recipe as yours, with different names and all the motor details filled in.', review: REVIEW.realWave },
                  { question: 'With `WAVE_CYCLES = 4`, how many times does `wave_once` run inside `for _ in range(WAVE_CYCLES):`?', options: ['4', '1', '3', '5'], answer: 0, explain: 'range(WAVE_CYCLES) repeats once for each cycle.', review: REVIEW.loops },
                  { question: 'You know exactly how many times you want to repeat something. Which loop fits best?', options: ['A `for` loop', 'A `while` loop', 'An import', 'A `finally` block'], answer: 0, explain: 'A for loop repeats a set number of times. A while loop keeps going until a condition changes.', review: REVIEW.loops },
                  { question: 'What happens with `for _ in range(0):` and `wave_once(motion)` indented under it?', options: ['The line inside never runs', 'It runs once', 'It runs forever', 'Python stops with an error'], answer: 0, explain: 'range(0) repeats zero times, so the arm lifts and never swings.', review: REVIEW.loops },
                  { question: 'A `while` loop never changes its counter. What happens?', options: ['It never stops, an infinite loop', 'It stops after one repeat', 'Python changes the counter for you', 'Python skips the loop'], answer: 0, explain: 'If nothing changes, the condition stays true forever.', review: REVIEW.loops },
                  { question: 'A `say("done")` line sits right after a `for` loop and is **not** indented. When does it run?', options: ['Once, after the loop is done', 'Once for every repeat', 'Never', 'Before the loop starts'], answer: 0, explain: 'Only indented lines are inside the loop. A line that is not indented runs once, after it.', review: REVIEW.loops },
                  { question: 'Which lines repeat in a `for` loop?', options: ['Only the lines indented under it', 'Every line in the file', 'The line above the loop', 'Only lines that start with #'], answer: 0, explain: 'The indent shows which lines belong to the loop.', review: REVIEW.loops },
                  { question: '`WAVE_DELAY_SECONDS` changes from 0.3 to 0.15. What happens to the wave?', options: ['It gets faster', 'It gets slower', 'It waves more times', 'Nothing changes'], answer: 0, explain: 'It is the pause between swings, so a smaller number means quicker swings.', review: REVIEW.settings },
                  { question: 'The calls are in this order: `wave`, then `raise_arm`. What does the robot do?', options: ['Swings first, then lifts the arm after the wave is over', 'A normal wave, order does not matter', 'Python stops with an error', 'It skips the wave'], answer: 0, explain: 'The robot does exactly what is written, top to bottom.', review: REVIEW.order },
                  { question: 'You forget to call `open_hand(motion)`. What happens?', options: ['The robot waves with a closed hand', 'Python opens the hand for you', 'The robot skips the wave', 'Python stops with a NameError'], answer: 0, explain: 'A function only runs when it is called. No call, no open hand.', review: REVIEW.order },
                  { question: 'What is the right order for the wave?', options: ['Open the hand, raise the arm, then wave', 'Wave, raise the arm, then open the hand', 'Raise the arm, wave, then open the hand', 'Open the hand, wave, then raise the arm'], answer: 0, explain: 'Open palm first, then the arm goes up, then the wrist swings.', review: REVIEW.order },
                  { question: 'Which line **calls** a function?', options: ['`raise_arm(motion)`', '`def raise_arm(motion):`', '`from time import sleep`', '`# TODO lab 3`'], answer: 0, explain: 'A call is the name followed by brackets. The def line only teaches the move.', review: REVIEW.order },
                  { question: 'You wrote `def open_hand(motion):` but nothing ever calls it. What happens?', options: ['The hand never opens', 'The hand opens on its own', 'Python stops with an error', 'The hand opens twice'], answer: 0, explain: 'Defining a function teaches the move. Only a call runs it.', review: REVIEW.functions },
                  { question: 'When does a `finally` block run?', options: ['Every time, after a normal finish or a crash', 'Only after a crash', 'Only when everything works', 'Only when an admin approves'], answer: 0, explain: 'finally always runs. That is what makes it good for cleanup.', review: REVIEW.cleanup },
                  { question: 'Where should the line that sends the arm back to `HOME_ARM` go?', options: ['Under `finally:`', 'Under `try:`, after `wave(motion)`', 'Before `try:`', 'Inside `wave_once`'], answer: 0, explain: 'Under try, a crash would skip it. Under finally, it runs no matter what.', review: REVIEW.cleanup },
                  { question: 'Why does a robot program need cleanup code?', options: ['So the robot always ends in a safe place', 'To make the wave faster', 'To import tools', 'To count the waves'], answer: 0, explain: 'If something fails halfway, cleanup still brings the arm home.', review: REVIEW.cleanup },
                  { question: 'Which line brings in `sleep`?', options: ['`from time import sleep`', '`from sleep import time`', '`import sleep from time`', '`sleep = time`'], answer: 0, explain: 'The shape is from <where it lives> import <the tool>.', review: REVIEW.imports },
                  { question: 'Why put a number in a setting like `WAVE_CYCLES` instead of typing it everywhere?', options: ['Change it once and the whole program follows', 'Python only accepts capital letters', 'It makes the robot stronger', 'Imports need it'], answer: 0, explain: 'One setting means one place to change.', review: REVIEW.settings },
                  { question: 'In this lab you change `WAVE_CYCLES` in `wave.py` from 1 to 5. Why does that one change give five waves?', options: ['The loop in `elbow_wave` reads the setting', 'Python copies the wave five times', 'The admin sets the number', '`wave.py` ignores the setting'], answer: 0, explain: 'Same idea as your own loop: the loop reads the setting, so one number controls it.', review: REVIEW.realWave },
                  { question: 'An arm starts moving in a way you did not expect. What do you do first?', options: ['Stop the program and keep your hands clear', 'Grab the arm and hold it still', 'Push it back by hand', 'Run the program again'], answer: 0, explain: 'Never grab or resist a powered arm. Stop the program.', review: REVIEW.safety },
                  { question: 'Who should be in the room when your wave runs on the real robot?', options: ['An instructor or supervisor', 'Nobody, it is safer to run it alone', 'Only other students', 'It does not matter'], answer: 0, explain: 'Never run a program on the physical robot without an instructor or supervisor present.', review: REVIEW.safety },
                ] },
              ],
            },
            {
              id: 'set-it-up', title: 'Set It Up',
              blocks: [
                { type: 'p', text: "In the real `wave.py`, find the setting that controls how many times the arm waves. It is the same idea as your `WAVE_CYCLES`. Change it to **5**." },
                { type: 'code', lang: 'python', filename: 'wave.py', workspaceFile: REAL_WAVE, line: 41, code: 'WAVE_CYCLES = 5' },
                { type: 'p', text: "Click **Run**. Run checks that you changed exactly that and nothing else. When it passes, and the gates above are met, **Queue on Robot** unlocks." },
              ],
            },
            {
              id: 'queue-it', title: 'Queue It',
              blocks: [
                { type: 'steps', items: [
                  'Click **Queue on Robot**.',
                  'Wait for an admin to approve it. The output panel shows each change of status.',
                  'When it says it is running, watch the robot wave.',
                  'When it says succeeded, mark the lab complete.',
                ] },
              ],
            },
            {
              id: 'robot-spotter', title: 'Robot Spotter',
              blocks: [
                { type: 'p', text: "While the robot runs, be a spotter. Watch for each step of the recipe you built, and count the waves out loud with your class:" },
                { type: 'checklist', items: [
                  'It goes to its rest pose (`center_all`).',
                  'The hand opens (`open_hand`).',
                  'The arm lifts into the wave pose (`wave_ready_pose`).',
                  'The elbow waves **5 times** while the fingers ripple (`elbow_wave`).',
                  'It goes back to its rest pose at the end.',
                ] },
                { type: 'callout', tone: 'note', label: 'You did it', text: 'You built a robot behavior piece by piece, learned what every line does, and sent it to a real robot. Wave back!' },
              ],
            },
            {
              id: 'if-it-is-stuck', title: 'If It Is Stuck',
              blocks: [
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
