/* Wave, behavior section 1 (12 labs). Listed as section 5 in curriculum.js; see README.md, "The Wave section". */

const BUILDER = 'swayform_ws/src/swayform_labs/wave_builder.py';
const REAL_WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
export const WAVE_QUIZ_ID = 'wv-06-quiz';
export const WAVE_QUIZ_PASS = 80;
const REVIEW = {
  intro: { id: 'wv-01-intro', label: 'Lab 1, Meet the Wave' },
  imports: { id: 'wv-02-imports', label: 'Lab 2, Imports' },
  settings: { id: 'wv-04-settings', label: 'Lab 4, Settings' },
  functions: { id: 'wv-05-functions', label: 'Lab 5, Functions' },
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
  code: 'from swayform.motion import MotionClient\n# TODO lab 2: import sleep from the time module so the wave can pause\n\n# TODO lab 4: set WAVE_CYCLES (how many waves) and WAVE_DELAY_SECONDS (seconds per swing)\nRAISED_ARM = {"right_shoulder": 42, "right_elbow": 70}\n...',
});

export const WAVE_LEVEL = {
  id: 'wave-section', number: 9, title: 'Wave',
  description: 'The first behavior section: finish a wave program one piece at a time, then send it to the robot.',
  sections: [
    {
      id: 'wave-labs', title: 'Wave', difficulty: 'beginner', estimatedTime: '2 to 3 hours',
      description: 'Twelve short labs. You write about 30% of the program, learn what the rest does, and run it on SwayForm.',
      activities: [

        // Lab 1
        {
          id: 'wv-01-intro', title: 'Meet the Wave', kind: 'reading', tagLabel: 'Intro', estimatedTime: '5 minutes',
          summary: 'What you are going to build, how the 12 labs work, and what it takes to run on the real robot.',
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
                  ['2', 'Imports', 'The import for sleep'],
                  ['4', 'Settings (variables)', 'Two settings'],
                  ['5', 'Functions', 'Two small functions'],
                  ['7', 'Loops', 'A loop that repeats the wave'],
                  ['9', 'Order of steps', 'The three steps, in order'],
                  ['10', 'Cleanup (try / finally)', 'A safe way to end'],
                ] },
                { type: 'p', text: "Labs 1, 3, 6, 8 and 11 have no code to write. They give you the big picture and check what you know. Lab 12 is the robot run, where you change one number." },
              ],
            },
            {
              id: 'the-recipe', title: 'The Recipe',
              blocks: [
                { type: 'p', text: "A wave is a short list of steps. The robot does them top to bottom, exactly as written." },
                { type: 'code', lang: 'text', filename: 'The recipe for a wave', code: 'go home\n  ↓\nopen the hand\n  ↓\nraise the arm\n  ↓\nswing the wrist back and forth, a few times\n  ↓\ngo home' },
                { type: 'p', text: "Each step becomes a small function in your program. By lab 10 you will have written some of them and read the rest." },
              ],
            },
            {
              id: 'how-it-ends', title: 'How It Ends',
              blocks: [
                { type: 'p', text: "Lab 12 sends your wave to the real robot. Three things have to be true first:" },
                { type: 'checklist', items: [
                  'Your program is finished, with no `# TODO` notes left (labs 2 to 10).',
                  'You scored **80% or better** on the quiz in lab 6.',
                  'An **admin approves** the run. Nobody can start the robot moving without that.',
                ] },
                { type: 'callout', tone: 'safety', label: 'Safety', text: 'A real arm moves in lab 12. Keep your hands clear, and only run it with an instructor in the room.' },
              ],
            },
          ],
          completionSummary: { text: 'You know what you are building, how the 12 labs fit together, and what has to happen before the robot waves.', conceptsUsed: [] },
        },

        // Lab 2
        {
          id: 'wv-02-imports', title: 'Imports: Your Toolbox', kind: 'activity', difficulty: 'beginner', estimatedTime: '10 to 15 minutes',
          summary: 'Learn what the import lines at the top of a program do, then add the one that is missing.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Imports', 'Modules'],
          steps: [
            goals(['What an import line does: it brings a tool into your program.', 'What `sleep` does: it pauses the program for a number of seconds.', 'What `MotionClient` does: it sends moves to the robot.', 'Write the import for `sleep` in `wave_builder.py`.']),
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
              id: 'your-turn', title: 'Your Turn',
              blocks: [
                { type: 'p', text: "Now take a look at `wave_once` in the file. It calls `sleep(WAVE_DELAY_SECONDS)` between swings, but two things are missing. `WAVE_DELAY_SECONDS` has no value yet, and nothing at the top of the file imports `sleep`, so Python has no idea what `sleep` means." },
                { type: 'p', text: "Remember, the number inside `sleep(...)` is in **seconds**. `sleep(1)` waits one second and `sleep(0.3)` waits less than half a second. A friendly wave pauses a fraction of a second between swings. You will choose that value for `WAVE_DELAY_SECONDS` in lab 4." },
                { type: 'p', text: "For now, bring in the tool. Find the note `# TODO lab 2` near the top and replace that whole line with the import for `sleep`:" },
                { type: 'code', lang: 'python', filename: 'wave_builder.py', code: 'from time import sleep', copy: false },
                { type: 'callout', tone: 'tip', label: 'Tip', text: 'Delete the whole TODO line and type the import in its place. Check counts any line that still has TODO in it.' },
                { type: 'callout', tone: 'note', label: 'If you delete the wrong thing', text: 'It happens to everyone. Press Ctrl+Z (Cmd+Z on a Mac) to undo, as many times as you need. If the file is a mess, click **Reset** above the code to put the whole file back the way it started.' },
              ],
            },
            {
              id: 'check-it', title: 'Check It',
              blocks: [
                { type: 'p', text: "Click **Check**. The output shows a progress bar for the whole program. The program has **7** pieces for you to write across these labs, and you just wrote the first one, so it should say **1 of 7 pieces done**." },
                { type: 'p', text: "Still says 0 of 7? Make sure the whole `# TODO lab 2` line is gone. The Problems tab lists every piece that is left." },
                { type: 'reveal', hint: 'The line is `from time import sleep`. It starts with the word `from`, and `time` and `sleep` are lowercase.', solution: { text: 'The top of the file after this lab:', code: { lang: 'python', filename: 'wave_builder.py', code: 'from time import sleep\nfrom swayform.motion import MotionClient' } } },
              ],
            },
          ],
          completionSummary: { text: 'You know what imports do and added the one your wave needs.', conceptsUsed: ['Imports'] },
        },

        // Lab 3
        {
          id: 'wv-03-toolbox-check', title: 'Check: Toolbox', kind: 'reading', tagLabel: 'Check', estimatedTime: '5 minutes',
          summary: 'Five quick questions on imports and sleep. Wrong answers are fine, you just try again.',
          relatedConcepts: ['Imports'],
          steps: [
            goals(['Show you can pick out a correct import line.', 'Explain what happens when an import is missing.', 'Remember that the number in `sleep` is in seconds.']),
            {
              id: 'questions', title: 'Quick Questions',
              blocks: [
                { type: 'p', text: "Pick an answer. If it is wrong, it greys out and you can try another. Nothing here is graded." },
                { type: 'mcq', question: 'Which line lets your program pause for a moment?', options: ['`from time import sleep`', '`from sleep import time`', '`import sleep from time`', '`from motion import sleep`'], answer: 0, explain: '`sleep` comes from the `time` tool, and it is what waits between swings.' },
                { type: 'mcq', question: 'You use `sleep(0.3)` but forget to import `sleep`. What happens when Python reaches that line?', options: ['Python stops with a NameError', 'Python waits 0.3 seconds anyway', 'Python skips that line and keeps going', 'Python imports sleep for you'], answer: 0, explain: "Python only knows names you have defined or imported, so it stops and tells you it has never heard of sleep." },
                { type: 'mcq', question: 'How long does `sleep(2)` pause the program?', options: ['2 seconds', '2 tenths of a second', '2 milliseconds', '2 minutes'], answer: 0, explain: 'The number in sleep is always in seconds. For less than a second, use a decimal like 0.3.' },
                { type: 'mcq', question: 'Which tool does `wave_builder.py` use to send moves to the robot?', options: ['`MotionClient`', '`sleep`', '`time`', '`say`'], answer: 0, explain: 'Every move goes through the MotionClient. sleep only waits, and say only prints a message.' },
                { type: 'mcq', question: 'Where do import lines go?', options: ['At the top of the file', 'Right above the line that uses them', 'Inside the function that uses them', 'At the bottom, after main'], answer: 0, explain: 'The code below uses what the imports bring in, so they come first, all together at the top.' },
              ],
            },
          ],
          completionSummary: { text: 'You can say what an import does and where it goes.', conceptsUsed: ['Imports'] },
        },

        // Lab 4
        {
          id: 'wv-04-settings', title: 'Settings: Knobs You Can Turn', kind: 'activity', difficulty: 'beginner', estimatedTime: '10 to 15 minutes',
          summary: 'Meet variables, the named settings that control how the wave behaves, and set two of them.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Variables', 'Constants'],
          steps: [
            goals(['What a variable is: a name stuck on a value.', 'Why settings are written in CAPITAL LETTERS.', 'Why one named setting beats the same number typed in many places.', 'Set `WAVE_CYCLES` and `WAVE_DELAY_SECONDS`.']),
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
              id: 'your-turn', title: 'Your Turn',
              blocks: [
                { type: 'p', text: "Find `# TODO lab 4`. Replace that line with two settings:" },
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
          completionSummary: { text: 'You set the number of waves and the pause between swings.', conceptsUsed: ['Variables'] },
        },

        // Lab 5
        {
          id: 'wv-05-functions', title: 'Functions: Teach the Robot a Move', kind: 'activity', difficulty: 'beginner', estimatedTime: '15 minutes',
          summary: 'A function is a named recipe. Read the ones that are written, then write open_hand and raise_arm.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Functions', 'Parameters'],
          steps: [
            goals(['What `def` does: it gives a list of steps one name.', 'What `motion` is inside a function: the robot connection it is handed.', 'The difference between defining a function and calling it.', 'Write `open_hand` and `raise_arm`.']),
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
                { type: 'p', text: "Writing `def open_hand(motion):` only **teaches** the robot a move. Nothing moves yet. The move happens when something later **calls** it by writing `open_hand(motion)`. You will do the calling in lab 9." },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn',
              blocks: [
                { type: 'p', text: "Find the two `# TODO lab 5` notes. Replace them with two functions that follow the same shape as `go_home`:" },
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
          ],
          completionSummary: { text: 'You wrote two functions that teach the robot to open its hand and raise its arm.', conceptsUsed: ['Functions'] },
        },

        // Lab 6
        {
          id: WAVE_QUIZ_ID, title: 'Quiz: Building Blocks', kind: 'reading', tagLabel: 'Quiz', estimatedTime: '10 minutes',
          summary: 'Ten questions on imports, settings, and functions. Score 80% or better to pass. Lab 12 needs this.',
          relatedConcepts: ['Imports', 'Variables', 'Functions'],
          steps: [
            goals(['Review imports, settings, and functions from labs 2 to 5.', 'Score 80% or better to unlock the robot run in lab 12.']),
            {
              id: 'quick-review', title: 'Quick Review',
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
          completionSummary: { text: 'You passed the Wave quiz. This unlocks the robot run in lab 12.', conceptsUsed: ['Imports', 'Variables', 'Functions'] },
        },

        // Lab 7
        {
          id: 'wv-07-loops', title: 'Loops: Wave Again and Again', kind: 'activity', difficulty: 'beginner', estimatedTime: '15 minutes',
          summary: 'Use a for loop to repeat one swing as many times as a setting says.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Loops', 'Repetition'],
          steps: [
            goals(['What a `for` loop does: it repeats the indented lines under it.', 'What `range(n)` does: it sets how many times.', 'Why the indent decides which lines repeat.', 'Write the loop that repeats `wave_once`.']),
            {
              id: 'repeat-without-copy-paste', title: 'Repeat Without Copy and Paste',
              blocks: [
                { type: 'p', text: "One swing of the wrist is not much of a wave. You want it to swing several times. You could write the call over and over:" },
                { type: 'code', lang: 'python', filename: 'The slow way', code: 'wave_once(motion)\nwave_once(motion)\nwave_once(motion)' },
                { type: 'p', text: "That works, but changing to 5 waves means editing the code. A **loop** repeats the lines inside it, and the number comes from a setting." },
                { type: 'code', lang: 'python', filename: 'The loop way', code: 'for _ in range(WAVE_CYCLES):\n    wave_once(motion)' },
              ],
            },
            {
              id: 'anatomy-of-a-loop', title: 'Anatomy of a For Loop',
              blocks: [
                { type: 'terms', items: [
                  { term: 'for', def: 'Starts the loop.' },
                  { term: '_', def: 'A throwaway name for the counter. We do not need the number, only the repeating.' },
                  { term: 'range(WAVE_CYCLES)', def: 'How many times to repeat. With WAVE_CYCLES = 3, that is three times.' },
                  { term: ':', def: 'Ends the first line and says the loop body comes next.' },
                  { term: 'indented line', def: 'The line that repeats. Only indented lines are inside the loop.' },
                ] },
                { type: 'mcq', required: false, question: 'How many times does this print "hi"? `for _ in range(4):` then an indented `print("hi")`.', options: ['4', '3', '5', '1'], answer: 0, explain: 'range(4) repeats the indented lines four times.' },
              ],
            },
            {
              id: 'trace-it', title: 'Trace It',
              blocks: [
                { type: 'p', text: "Here is what the loop does for different settings:" },
                { type: 'table', headers: ['WAVE_CYCLES', 'Times wave_once runs', 'What you see'], rows: [
                  ['1', '1', 'One quick swing'],
                  ['3', '3', 'A friendly wave'],
                  ['5', '5', 'A long wave'],
                  ['0', '0', 'The arm lifts but never swings'],
                ] },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn',
              blocks: [
                { type: 'p', text: "Open the `wave` function. Replace the `# TODO lab 7` note and the `pass` below it with a `for` loop that calls `wave_once(motion)` once for each cycle." },
                { type: 'callout', tone: 'tip', label: 'Tip', text: 'The call must be indented under the for line. If it is not indented, it is not inside the loop.' },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 5 of 7 pieces done.' },
                RESET_TIP,
                { type: 'reveal', hint: 'It is the same two lines from the loop way above: `for _ in range(WAVE_CYCLES):` and an indented `wave_once(motion)`.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def wave(motion: MotionClient) -> None:\n    for _ in range(WAVE_CYCLES):\n        wave_once(motion)' } } },
              ],
            },
            {
              id: 'try-changing-this', title: 'Try Changing This',
              blocks: [
                { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                  ['WAVE_CYCLES', 'Yes, up to about 10', 'More or fewer swings'],
                  ['WAVE_DELAY_SECONDS', 'Yes, keep it at 0.1 or more', 'A faster or slower wave'],
                  ['WRIST_LEFT / WRIST_RIGHT', 'No', 'These are tested angles'],
                ] },
              ],
            },
          ],
          completionSummary: { text: 'You wrote the loop that repeats the wave.', conceptsUsed: ['Loops', 'Repetition'] },
        },

        // Lab 8
        {
          id: 'wv-08-loops-check', title: 'Check: Loops and Settings', kind: 'reading', tagLabel: 'Check', estimatedTime: '5 minutes',
          summary: 'Predict what loops and settings do. Wrong answers are fine, you just try again.',
          relatedConcepts: ['Loops', 'Variables'],
          steps: [
            goals(['Predict how many times a loop runs.', 'Predict how changing a setting changes the wave.', 'Spot a loop bug caused by a missing indent.']),
            {
              id: 'predict-it', title: 'Predict It',
              blocks: [
                { type: 'mcq', question: 'With `WAVE_CYCLES = 5`, how many times does `wave_once` run?', options: ['5', '1', '3', '0'], answer: 0, explain: 'The loop repeats once for each cycle.' },
                { type: 'mcq', question: 'Which change makes the wave faster?', options: ['Lower `WAVE_DELAY_SECONDS`', 'Raise `WAVE_DELAY_SECONDS`', 'Lower `WAVE_CYCLES`', 'Change `HOME_ARM`'], answer: 0, explain: 'A shorter pause between swings is a quicker wave.' },
                { type: 'p', text: "Now find the bug. A student wrote this:" },
                { type: 'code', lang: 'python', filename: 'A buggy wave', code: 'def wave(motion):\n    for _ in range(WAVE_CYCLES):\n        sleep(WAVE_DELAY_SECONDS)\n    wave_once(motion)', copy: false },
                { type: 'mcq', question: 'The student wanted three full waves. What actually happens?', options: ['It pauses three times, then swings the wrist once', 'It swings the wrist three times', 'It swings the wrist once, then pauses three times', 'Python stops with an error'], answer: 0, explain: 'Only indented lines are inside the loop. wave_once is dedented, so it runs one time, after the loop is done.' },
                { type: 'mcq', question: 'What does the `_` in `for _ in range(3)` mean?', options: ['A throwaway name for the counter we do not need', 'An empty setting', 'The robot connection', 'A comment'], answer: 0, explain: 'We only care about repeating, not about which repeat it is.' },
                { type: 'mcq', question: 'With `WAVE_CYCLES = 0`, what does the robot do?', options: ['Raises its arm but never swings the wrist', 'Swings forever', 'Crashes', 'Swings once'], answer: 0, explain: 'range(0) repeats zero times, so wave_once never runs.' },
              ],
            },
          ],
          completionSummary: { text: 'You can predict what a loop does and spot a loop that is missing its indent.', conceptsUsed: ['Loops'] },
        },

        // Lab 9
        {
          id: 'wv-09-order', title: 'Order of Operations', kind: 'activity', difficulty: 'beginner', estimatedTime: '10 to 15 minutes',
          summary: 'The robot does what you write, top to bottom. Put the wave steps in order, then call them.',
          workspaceFile: BUILDER,
          relatedConcepts: ['Sequences', 'Function calls'],
          steps: [
            goals(['Why order matters: a program runs top to bottom.', 'How to call a function you already wrote.', 'Call `open_hand`, `raise_arm`, and `wave` in the right order.']),
            {
              id: 'top-to-bottom', title: 'Top to Bottom',
              blocks: [
                { type: 'p', text: "A program runs one line at a time, from the top. The robot has no idea what you meant to do, only what you wrote. Raise the arm after you wave and you get a wave at the floor." },
              ],
            },
            {
              id: 'put-it-in-order', title: 'Put It in Order',
              blocks: [
                { type: 'match', prompt: 'Which position does each step take in a wave? (The robot has already gone home before the first one.)', pairs: [
                  ['Open the hand', '1st'],
                  ['Raise the arm', '2nd'],
                  ['Swing the wrist (the wave)', '3rd'],
                ], explain: 'The hand opens first, the arm lifts, then the wrist swings. This is the same order the real wave uses.' },
              ],
            },
            {
              id: 'calling-a-function', title: 'Calling a Function',
              blocks: [
                { type: 'p', text: "In lab 5 you wrote `open_hand` and `raise_arm`. Now you call them. A call is the function name followed by what you hand it:" },
                { type: 'code', lang: 'python', filename: 'A call', code: 'open_hand(motion)', copy: false },
                { type: 'mcq', required: false, question: 'What is the difference between `def open_hand(motion):` and `open_hand(motion)`?', options: ['def teaches the move, the call performs it', 'They are the same thing', 'def performs the move, the call teaches it', 'The call only works in loops'], answer: 0, explain: 'You define a function once and can call it as many times as you like.' },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn',
              blocks: [
                { type: 'p', text: "Open `perform_wave`. Replace the `# TODO lab 9` note with three calls, in the order you just matched: `open_hand`, `raise_arm`, then `wave`. Each takes `motion`." },
                { type: 'p', text: "Leave the `# TODO lab 10` note and the `pass` line alone for now. They are for the next lab." },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 6 of 7 pieces done. The last piece is the next lab.' },
                RESET_TIP,
                { type: 'reveal', hint: 'Three lines, each one a name followed by (motion).', solution: { text: 'The three calls:', code: { lang: 'python', filename: 'wave_builder.py', code: 'open_hand(motion)\nraise_arm(motion)\nwave(motion)' } } },
              ],
            },
          ],
          completionSummary: { text: 'You called your functions in the order that makes a wave.', conceptsUsed: ['Sequences', 'Function calls'] },
        },

        // Lab 10
        {
          id: 'wv-10-cleanup', title: 'Cleanup: Always Come Home', kind: 'activity', difficulty: 'beginner', estimatedTime: '15 minutes',
          summary: 'Use try and finally so the arm returns home even if something goes wrong. Then finish the program.',
          workspaceFile: BUILDER,
          relatedConcepts: ['try / finally', 'Safety'],
          steps: [
            goals(['What `try` and `finally` do.', 'Why `finally` always runs, even after an error.', 'Use `finally` to send the arm home, and finish the program.']),
            {
              id: 'what-if-it-goes-wrong', title: 'What If It Goes Wrong',
              blocks: [
                { type: 'p', text: "Say something fails halfway through the wave, with the arm still up. If the program just stops, the arm stays raised. A robot should always end in a safe place." },
                { type: 'code', lang: 'python', filename: 'try and finally', code: 'try:\n    open_hand(motion)\n    raise_arm(motion)\n    wave(motion)\nfinally:\n    motion.move_joint_group("right_arm", HOME_ARM)', copy: false },
                { type: 'p', text: "Python runs the lines under `try` first. The lines under `finally` run **no matter what**: after a normal finish, or after a crash." },
                { type: 'table', headers: ['What happens in try', 'Does finally run?'], rows: [
                  ['Everything works', 'Yes'],
                  ['An error stops the program in the middle', 'Yes'],
                ] },
                { type: 'mcq', required: false, question: 'The program crashes in the middle of `wave(motion)`. Does the code in `finally` run?', options: ['Yes, it always runs', 'No, the crash skips it', 'Only if the crash was small', 'Only if the arm is raised'], answer: 0, explain: 'That is the whole point of finally: the cleanup is guaranteed.' },
              ],
            },
            {
              id: 'your-turn', title: 'Your Turn',
              blocks: [
                { type: 'p', text: "Open `perform_wave` one more time. Wrap your three calls in `try:`, and add a `finally:` that sends `right_arm` back to `HOME_ARM`, the same way you sent it to `RAISED_ARM` in lab 5. Delete the `# TODO lab 10` note and the `pass` line." },
                { type: 'callout', tone: 'note', label: 'Check', text: 'Click Check. It should say 7 of 7 pieces done, with no TODO notes left.' },
                RESET_TIP,
                { type: 'reveal', hint: 'The calls move one level to the right, under try. The finally block has one line, and it uses move_joint_group.', solution: { text: 'The finished function:', code: { lang: 'python', filename: 'wave_builder.py', code: 'def perform_wave(motion: MotionClient) -> None:\n    try:\n        open_hand(motion)\n        raise_arm(motion)\n        wave(motion)\n    finally:\n        motion.move_joint_group("right_arm", HOME_ARM)' } } },
              ],
            },
            {
              id: 'run-the-finished-program', title: 'Run the Finished Program',
              blocks: [
                { type: 'p', text: "Click **Run**. With no TODO notes left, the output says every required value is set. In this lab the Run is a simulation. It checks your file, it does not move the robot." },
                { type: 'p', text: "Take a moment to look at the whole file. About 70% of it was there when you started and about 30% is yours, and you now know what every line does." },
              ],
            },
          ],
          completionSummary: { text: 'You finished the wave program, including the cleanup that brings the arm home.', conceptsUsed: ['try / finally', 'Safety'] },
        },

        // Lab 11
        {
          id: 'wv-11-preflight', title: 'Pre-Flight Check', kind: 'reading', tagLabel: 'Check', estimatedTime: '5 minutes',
          summary: 'Before the robot moves: five questions on the finished program and the safe way to run it.',
          relatedConcepts: ['Safety', 'Sequences'],
          steps: [
            goals(['Check the order your finished program runs in.', 'Check which part keeps the robot safe if something fails.', 'Know the safe way to queue and watch a robot run.']),
            {
              id: 'ready-to-fly', title: 'Ready to Run?',
              blocks: [
                { type: 'mcq', question: 'When `perform_wave` runs, what happens first?', options: ['The hand opens', 'The wrist swings', 'The arm goes home', 'The robot says done'], answer: 0, explain: 'The calls run top to bottom: open_hand, raise_arm, then wave.' },
                { type: 'mcq', question: 'Which part of the program runs even if the wave fails partway?', options: ['The `finally` block', 'The `for` loop', 'The imports', 'The `say` calls'], answer: 0, explain: 'finally is the cleanup that always runs.' },
                { type: 'mcq', question: 'What has to be true before Queue on Robot unlocks in lab 12?', options: ['Your program is finished and you passed the lab 6 quiz', 'You have run the program ten times', 'The robot is already waving', 'Nothing, it is always unlocked'], answer: 0, explain: 'A finished builder and 80% on the quiz. Then an admin still has to approve the run.' },
                { type: 'mcq', question: 'You queue your wave. What happens next?', options: ['It waits in line until an admin approves it', 'The robot starts moving immediately', 'It runs on your laptop', 'It is deleted'], answer: 0, explain: 'The robot only moves after an admin approves the job.' },
                { type: 'mcq', question: 'The arm is waving. Where should your hands be?', options: ['Clear of the robot', 'On the arm to steady it', 'In front of the hand', 'Holding the wrist'], answer: 0, explain: 'Never touch a powered or moving robot.' },
              ],
            },
          ],
          completionSummary: { text: 'You are ready to send your wave to the robot.', conceptsUsed: ['Safety'] },
        },

        // Lab 12
        {
          id: 'wv-12-run', title: 'Send It to the Robot', kind: 'activity', difficulty: 'beginner', estimatedTime: '10 to 20 minutes',
          summary: 'Run the real wave on SwayForm. Needs a finished builder, 80% on the quiz, and an admin to approve.',
          workspaceFile: REAL_WAVE,
          extraFiles: [BUILDER],
          robotGate: {
            needsComplete: [{ id: WAVE_QUIZ_ID, text: `Pass the lab 6 quiz with ${WAVE_QUIZ_PASS}% or better and mark that lab complete.` }],
            needsNoTodos: [{ path: BUILDER, text: 'Finish wave_builder.py. It still has # TODO notes (labs 2 to 10).' }],
          },
          relatedConcepts: ['Behaviors', 'Safety'],
          steps: [
            goals(['See how your `wave_builder.py` lines up with the real `wave.py`.', 'Change one setting in the real program.', 'Queue it, get an admin to approve it, and watch SwayForm wave.']),
            {
              id: 'before-you-send-it', title: 'Before You Send It',
              blocks: [
                { type: 'p', text: "Three gates stand between your code and a moving robot:" },
                { type: 'checklist', items: [
                  '`wave_builder.py` is finished, with no `# TODO` notes left.',
                  'You scored 80% or better on the lab 6 quiz and marked it complete.',
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
              id: 'if-it-is-stuck', title: 'If It Is Stuck',
              blocks: [
                { type: 'troubleshoot', items: [
                  { symptom: 'Queue on Robot stays locked', cause: 'One of the gates is not met yet.', fix: 'Click Run. The Problems tab names what is missing: the quiz, or a TODO still in wave_builder.py.' },
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
