/* Getting Started (section 1) and Introduction to ROS 2 (section 2) lessons written for the current portal.
   safety-first, what-is-ros2 and nodes-topics-pubsub stay in learning-path.js; the older lessons there are unlisted. */

const REAL_WAVE = 'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py';
const ROBOT_YAML = 'swayform_ws/src/swayform_robot/swayform_robot/config/robot.yaml';

const summary = (time, text, items) => ({
  id: 'summary', title: 'Summary',
  blocks: [
    { type: 'p', text: `**Estimated time to completion:** ${time}` },
    { type: 'p', text },
    ...(items ? [{ type: 'list', items }] : []),
  ],
});

export const GETTING_STARTED_ACTIVITIES = [
  {
    id: 'welcome', title: 'Welcome to SwayForm', kind: 'reading', estimatedTime: '8 minutes',
    summary: 'What SwayForm is, what you will build, and how the course is laid out.',
    relatedConcepts: ['Orientation'],
    steps: [
      summary('8 minutes', 'In this lesson, you are going to meet SwayForm and see how the whole course fits together. You will learn:', [
        'What the robot is, and what you will make it do.',
        'The five sections of the course, and what each one is for.',
        'How code you write turns into motion on a real robot.',
      ]),
      {
        id: 'meet-swayform', title: 'Meet SwayForm',
        blocks: [
          { type: 'p', text: "SwayForm is a real humanoid robot, with a head, a torso and two arms with working hands. Every joint is turned by a small motor called a servo, and every servo is controlled by Python code running on the robot's own computer." },
          { type: 'p', text: "In this course, you are going to write that code. You will start by changing one number in a program, and by the end, you will plan and write whole behaviors on your own. And every behavior you build ends the same way: running on the real robot, in front of your class." },
        ],
      },
      {
        id: 'the-course', title: 'How the Course Is Laid Out',
        blocks: [
          { type: 'p', text: "The course has five sections. Have a look:" },
          { type: 'table', headers: ['Section', 'What it is for'], rows: [
            ['1. Getting Started', 'How to use this portal, and how to stay safe around the robot. You are here.'],
            ['2. Introduction to ROS 2', 'The software ideas behind every robot program: nodes, packages, behavior files, joints and limits.'],
            ['3. Pre-Installed Demos', 'The behaviors already on the robot. You watch them, read their code, and run them.'],
            ['4. Foundation Labs', 'Short labs, one small behavior or task each.'],
            ['5. Behavior Sections', 'The main course. Each behavior section builds full robot behaviors, a little more on your own every time.'],
          ] },
          { type: 'p', text: "As you can see, sections 1 and 2 are short readings. They give you everything you need for the labs, and nothing you don't." },
        ],
      },
      {
        id: 'code-to-motion', title: 'From Code to Motion',
        blocks: [
          { type: 'p', text: "In simple terms, this is what happens every time your code runs on the robot:" },
          { type: 'steps', items: [
            'You change or write code in the Code Editor, right here in the portal.',
            'You click **Queue on Robot**. Your run waits in line.',
            'Your teacher **approves** it. Nothing moves without that.',
            'The robot runs your program, and you watch it move. What the program prints shows up in your Code Editor.',
          ] },
          { type: 'p', text: "Next, let's go over the rules that keep everyone safe while that happens." },
        ],
      },
    ],
    completionSummary: { text: 'You know what SwayForm is, how the course is laid out, and how code becomes motion.', conceptsUsed: [] },
  },
  {
    id: 'using-the-portal', title: 'Using the Learning Portal', kind: 'reading', estimatedTime: '8 minutes',
    summary: 'The desktop, its apps, and how to find your way around the lessons.',
    relatedConcepts: ['Learning Portal'],
    steps: [
      summary('8 minutes', 'In this lesson, you are going to learn your way around the Learning Portal. You will learn:', [
        'What each app on the desktop does.',
        'How windows work.',
        'How to find a lesson, and how your progress is saved.',
      ]),
      {
        id: 'the-desktop', title: 'The Desktop and Its Apps',
        blocks: [
          { type: 'p', text: "The portal works like a computer desktop. Each icon opens an app in its own window:" },
          { type: 'terms', items: [
            { term: 'Learn', def: 'The course itself: every section, lesson and lab.' },
            { term: 'Robot', def: "Your class robot: whether it is online, and its live camera." },
            { term: 'Grades', def: 'Your quiz scores and the labs you have finished.' },
            { term: 'Account', def: 'Your name, your certificates, and your settings, like the light or dark theme.' },
          ] },
          { type: 'p', text: "Teachers see two more apps: **Admin**, to manage students and approve robot runs, and **Workspace**, to edit the robot's files directly." },
        ],
      },
      {
        id: 'windows', title: 'Windows',
        blocks: [
          { type: 'list', items: [
            'Click an icon to open its app. Click it again, or its button on the taskbar at the bottom, to bring it back to the front.',
            'Drag a window by its title bar to move it, and drag its edges to resize it.',
            'Use the buttons in the title bar to minimize, maximize or close it.',
            'The full screen button on the taskbar hides your browser around the portal, so the labs get more room.',
          ] },
        ],
      },
      {
        id: 'finding-a-lesson', title: 'Finding a Lesson',
        blocks: [
          { type: 'p', text: "Open **Learn** and you land on Learning Home, with all five sections and how far you are in each. Click a section to see its lessons, and click a lesson to open it." },
          { type: 'p', text: "Every lesson has a number. `1.03` is section 1, lesson 3. Behavior Sections hold more than one group of labs, so the number tells you the group: `5.03` is lab 3 of Wave, and `6.03` is lab 3 of Greeting Gestures." },
          { type: 'p', text: "The **Curriculum Index** on the left lists every lesson, with a search box at the top. Pretty useful when you remember a topic but not where it was!" },
        ],
      },
      {
        id: 'progress-is-saved', title: 'Your Progress Is Saved',
        blocks: [
          { type: 'p', text: "Your progress belongs to your account, not to the computer. The lessons you finish, the lab you are on, and the code you write are saved as you go. So, you can sign in on any computer in your class and pick up exactly where you left off." },
          { type: 'mcq', question: 'Where do you find your quiz scores?', options: ['In the Grades app', 'In the Robot app', 'In the Workspace app', 'Only your teacher can see them'], answer: 0, explain: 'Grades shows your quiz scores and the labs you have finished.' },
        ],
      },
    ],
    completionSummary: { text: 'You know the apps on the desktop, how windows work, and how to find any lesson.', conceptsUsed: [] },
  },
  {
    id: 'how-a-lab-works', title: 'How a Lab Works', kind: 'reading', estimatedTime: '10 minutes',
    summary: 'The Notebook and the Code Editor, every button you will use, and how a run reaches the robot.',
    relatedConcepts: ['Learning Portal', 'Code Editor'],
    steps: [
      summary('10 minutes', 'In this lesson, you are going to learn how every lab works, from the first step to the robot run. You will learn:', [
        'How the Notebook and the Code Editor work together.',
        'What Check, Run, Reset and Show Solution do.',
        'How a run gets onto the robot, and how you finish a lab.',
      ]),
      {
        id: 'two-windows', title: 'Two Windows, Side by Side',
        blocks: [
          { type: 'p', text: "When you open a lab, two windows open next to each other. On the left, the **Notebook**: the lab text, step by step. On the right, the **Code Editor**: the file that you are working on." },
          { type: 'p', text: "Code in the Notebook has a caption that tells you what to do with it. For instance:" },
          { type: 'table', headers: ['Caption', 'What it means'], rows: [
            ['Example', 'Just read it.'],
            ['Find this in wave_builder.py', 'Look for this part in your file. Click the code to jump to it.'],
            ['Write in wave_builder.py', 'Type this into your file, in the place the lab says.'],
            ['Edit in wave.py', 'Change this one line in the real robot file.'],
          ] },
        ],
      },
      {
        id: 'the-buttons', title: 'The Code Editor Buttons',
        blocks: [
          { type: 'terms', items: [
            { term: 'Check', def: 'Counts the `# TODO` notes left in your file, and shows a progress bar of the pieces you have written.' },
            { term: 'Run', def: 'Runs your file. For a practice file, it checks that everything is filled in. For a real robot file, it also checks that you changed only what the lab asks for.' },
            { term: 'Queue on Robot', def: 'Sends a real robot file to the robot. It unlocks once Run says the file is right.' },
            { term: 'Reset', def: 'Puts the whole file back the way it started. Use Ctrl+Z (Cmd+Z on a Mac) to undo one change instead.' },
          ] },
          { type: 'p', text: "After Check or Run, the result shows up under the code. You should get something similar to this:" },
          { type: 'terminal', label: 'Output', lines: ['Progress on wave_builder.py: ▰▱▱▱▱▱▱  1 of 7 pieces done', 'Nice work :)'] },
          { type: 'p', text: "As you can see, it tells you exactly how far you are. And if something is wrong, the **Problems** tab next to Output lists what to fix." },
        ],
      },
      {
        id: 'hints', title: 'Stuck? Hints and Solutions',
        blocks: [
          { type: 'p', text: "Most coding steps end with **Show Hint**. Try the hint first! After that, **Show Solution** shows the answer for that step. There's no penalty for looking, but you learn a lot more by trying first." },
        ],
      },
      {
        id: 'robot-runs', title: 'Running on the Real Robot',
        blocks: [
          { type: 'p', text: "Every section ends with a run on the real robot. Once you click **Queue on Robot**, the run goes through these stages, and the output panel shows each one:" },
          { type: 'terminal', label: 'Output', lines: [
            'Queued, position 1 in line. An admin will review and approve it before it runs on the real robot.',
            'An admin approved it, waiting for the robot to pick it up.',
            'Running on the real robot now…',
            'Succeeded.',
          ] },
          { type: 'p', text: "Some runs also need you to pass the section's quiz first. If anything is missing, Run tells you exactly what." },
          { type: 'callout', tone: 'safety', label: 'Safety', text: 'Only run on the robot with your teacher in the room, and keep your hands clear while it moves.' },
        ],
      },
      {
        id: 'finishing', title: 'Finishing a Lab',
        blocks: [
          { type: 'p', text: "Questions in a lab have to be answered before you can finish it. If you pick a wrong answer, it greys out and you try again. Then, click **Mark Complete** at the end of the lab, and **Next** takes you to the next one." },
          { type: 'mcq', question: 'Which button tells you how many pieces of your file are still missing?', options: ['Check', 'Reset', 'Queue on Robot', 'Mark Complete'], answer: 0, explain: 'Check counts the # TODO notes left in your file.' },
          { type: 'mcq', question: 'You want to undo your last change, not start the whole file over. What do you do?', options: ['Press Ctrl+Z (Cmd+Z on a Mac)', 'Click Reset', 'Close the Code Editor', 'Click Run'], answer: 0, explain: 'Reset puts back the whole file. Ctrl+Z undoes one change.' },
        ],
      },
    ],
    completionSummary: { text: 'You know how the Notebook and Code Editor work, and how a run gets onto the robot.', conceptsUsed: [] },
  },
  {
    id: 'quizzes-and-grades', title: 'Quizzes and Grades', kind: 'reading', estimatedTime: '5 minutes',
    summary: 'How quizzes work, the 15-minute wait between tries, and where to see your scores.',
    relatedConcepts: ['Learning Portal', 'Quizzes'],
    steps: [
      summary('5 minutes', 'In this lesson, you are going to learn how quizzes work. You will learn:', [
        'What happens when you start a quiz.',
        'What you need to pass, and what happens if you do not.',
        'Where to see your scores.',
      ]),
      {
        id: 'taking-a-quiz', title: 'Taking a Quiz',
        blocks: [
          { type: 'p', text: "A quiz first shows you what to prepare. When you click **Start quiz**, it asks if you have prepared, and then it fills the whole screen. You can't open anything else until you submit, so get ready first." },
          { type: 'list', items: [
            'You need **80% or better** to pass.',
            'Each try picks its questions at random, so a second try is a different mix.',
            'After every try, you wait **15 minutes** before the next one. Leaving the page in the middle still counts as a try.',
            'The results show what you missed, with a link to the lab that explains it.',
          ] },
          { type: 'p', text: "Once you pass a quiz, it stays passed." },
        ],
      },
      {
        id: 'your-grades', title: 'Your Grades',
        blocks: [
          { type: 'p', text: "Open the **Grades** app to see every quiz you have taken: your best score, your last score, and how many tries. It also shows which labs you have finished. Your teacher sees the same scores for the whole class." },
          { type: 'mcq', question: "You didn't pass a quiz. When can you try again?", options: ['After 15 minutes', 'Right away', 'Tomorrow', 'Only after your teacher resets it'], answer: 0, explain: 'There is a 15-minute wait after every try.' },
        ],
      },
    ],
    completionSummary: { text: 'You know how quizzes work and where to see your grades.', conceptsUsed: [] },
  },
];

export const ROS2_ACTIVITIES = [
  {
    id: 'ros2-on-swayform', title: 'How SwayForm Uses ROS 2', kind: 'reading', estimatedTime: '8 minutes',
    summary: 'The real path from your Queue on Robot click to a moving servo, and where ROS 2 sits in it.',
    relatedConcepts: ['ROS 2', 'Nodes', 'Topics'],
    steps: [
      summary('8 minutes', 'In this lesson, you are going to follow a robot run all the way from the portal to a servo. You will learn:', [
        'Which parts of SwayForm are ROS 2, and which are not.',
        'What happens on the robot when your behavior runs.',
        'Where topics show up on SwayForm.',
      ]),
      {
        id: 'the-path', title: 'From the Portal to a Servo',
        blocks: [
          { type: 'p', text: "Let's follow one run of the wave. Have a look:" },
          { type: 'code', lang: 'text', filename: 'One robot run, start to finish', copy: false, code: 'You click Queue on Robot in the portal\n  ↓\nYour teacher approves the run\n  ↓\nThe robot\'s computer receives wave.py\n  ↓\nros2 run swayform_robot wave starts a ROS 2 node\n  ↓\nThe node sends angles to the servo boards\n  ↓\nThe servos turn, and the arm waves' },
          { type: 'p', text: "As you can see, ROS 2 is the part that runs on the robot: your behavior runs as a ROS 2 **node**, started with `ros2 run`. Everything before that is the portal getting your file safely to the robot." },
        ],
      },
      {
        id: 'topics-on-swayform', title: 'Where Topics Show Up',
        blocks: [
          { type: 'p', text: "The behaviors in the first sections move the servos directly, so they don't need topics. Topics matter once the robot uses its camera: the camera node **publishes** pictures on a topic, and other nodes, like the live video and Target Lock, **subscribe** to it. That's the publisher and subscriber idea from the last lesson, on the real robot." },
          { type: 'mcq', question: 'When your wave runs on the robot, what is it, in ROS 2 terms?', options: ['A node', 'A topic', 'A message', 'A package manager'], answer: 0, explain: 'ros2 run starts your behavior as a node.' },
        ],
      },
    ],
    completionSummary: { text: 'You can follow a run from the portal to a servo, and you know where topics come in.', conceptsUsed: ['ROS 2', 'Nodes'] },
  },
  {
    id: 'packages-and-ros2-run', title: 'Packages and ros2 run', kind: 'reading', estimatedTime: '8 minutes',
    summary: 'How the robot workspace is organized into packages, and what ros2 run does.',
    relatedConcepts: ['ROS 2', 'Packages', 'Workspace'],
    steps: [
      summary('8 minutes', 'In this lesson, you are going to learn how the robot code is organized. You will learn:', [
        'What the workspace and its packages are.',
        'Which package holds the real behaviors, and which holds your practice files.',
        'How to read a `ros2 run` line.',
      ]),
      {
        id: 'the-workspace', title: 'The Workspace',
        blocks: [
          { type: 'p', text: "All of the robot's code lives in one folder called a **workspace**, `swayform_ws`. Inside its `src` folder, the code is split into **packages**. A package is a folder of code that belongs together. Have a look:" },
          { type: 'code', lang: 'text', filename: 'swayform_ws/src', copy: false, code: 'swayform_ws/src/\n├── swayform_robot/      the real robot code\n│   └── swayform_robot/\n│       ├── behaviors/   wave.py, handshake.py, fist_bump.py, beckon.py, ...\n│       ├── config/      robot.yaml\n│       └── hardware/    servo_control.py, torso_motor.py\n└── swayform_labs/       your practice files, like wave_builder.py' },
          { type: 'p', text: "As you can see, there are two kinds of files. The real behaviors in `swayform_robot` are what the robot runs. The practice files in `swayform_labs` are where you build your own version first." },
        ],
      },
      {
        id: 'ros2-run', title: 'Reading a ros2 run Line',
        blocks: [
          { type: 'p', text: "Every time a program starts, the first line of its output is a `ros2 run` command. It always has the same shape:" },
          { type: 'code', lang: 'text', filename: 'Example', copy: false, code: 'ros2 run swayform_robot wave\n         └── package ──┘ └ program ┘' },
          { type: 'p', text: "So, `ros2 run swayform_robot wave` means: in the `swayform_robot` package, start the program called `wave`. And `ros2 run swayform_labs wave_builder` starts your practice file." },
          { type: 'mcq', question: 'In `ros2 run swayform_robot handshake`, what is `swayform_robot`?', options: ['The package', 'The program', 'The topic', 'The robot\'s name'], answer: 0, explain: 'The shape is ros2 run <package> <program>.' },
          { type: 'mcq', question: 'Which package holds the real behaviors the robot runs?', options: ['swayform_robot', 'swayform_labs', 'swayform_ws', 'behaviors'], answer: 0, explain: 'swayform_labs holds the practice files. swayform_ws is the whole workspace.' },
        ],
      },
    ],
    completionSummary: { text: 'You know how the workspace is split into packages, and how to read a ros2 run line.', conceptsUsed: ['Packages', 'Workspace'] },
  },
  {
    id: 'inside-a-behavior-file', title: 'Inside a Behavior File', kind: 'reading', estimatedTime: '12 minutes',
    summary: 'A tour of the real wave.py: settings, functions, the ROS 2 node, and the one line you are allowed to change.',
    workspaceFile: REAL_WAVE,
    relatedConcepts: ['ROS 2', 'Nodes', 'Python'],
    steps: [
      summary('12 minutes', 'In this lesson, you are going to take a tour of a real behavior file, `wave.py`. You will learn:', [
        'The four parts that every behavior file has.',
        'Which line is the student setting, and why you only change that one.',
        'What the ROS 2 part at the bottom does.',
      ]),
      {
        id: 'four-parts', title: 'Four Parts, Top to Bottom',
        blocks: [
          { type: 'p', text: "Open `wave.py` from the explorer. It looks long, but every behavior file has the same four parts:" },
          { type: 'table', headers: ['Part', 'What it holds'], rows: [
            ['1. Imports', 'The tools the file uses, like `time` and `rclpy`, the ROS 2 library for Python.'],
            ['2. Settings', 'Names in CAPITAL LETTERS: which servo board and channel each joint uses, angles, limits, and timing.'],
            ['3. Functions', 'Small named moves, like `open_hand` and `elbow_wave`, and one function that runs them in order, `perform_wave`.'],
            ['4. The ROS 2 node', 'A class and a `main` function at the bottom that turn the file into a node `ros2 run` can start.'],
          ] },
        ],
      },
      {
        id: 'the-student-setting', title: 'The Student Setting',
        blocks: [
          { type: 'p', text: "Each behavior file has **one** setting that a lab lets you change. In `wave.py`, it is `WAVE_CYCLES`:" },
          { type: 'code', lang: 'python', filename: 'From wave.py', workspaceFile: REAL_WAVE, line: 41, copy: false, code: 'WAVE_CYCLES = 1' },
          { type: 'p', text: "Why only one? Because every other number in the file, like the angles and the limits, is tested on the real robot. When you click Run on a real robot file, the portal checks that you changed only the line the lab asks for." },
        ],
      },
      {
        id: 'the-recipe', title: 'The Recipe Function',
        blocks: [
          { type: 'p', text: "`perform_wave` runs the moves in order, inside `try` and `finally`, so the robot always ends in a safe pose. Here is its shape:" },
          { type: 'code', lang: 'python', filename: 'The shape of perform_wave', copy: false, code: 'def perform_wave(mock=False):\n    ...\n    try:\n        center_all(ctrl)\n        open_hand(ctrl)\n        wave_ready_pose(ctrl)\n        elbow_wave(ctrl)\n    finally:\n        ...  # back to the rest pose, no matter what' },
          { type: 'p', text: "You are going to build this exact shape yourself in the Wave section." },
        ],
      },
      {
        id: 'the-node', title: 'The ROS 2 Node',
        blocks: [
          { type: 'p', text: "At the bottom of the file, the `WaveNode` class makes the behavior a ROS 2 node. In simple terms, it does three things:" },
          { type: 'list', items: [
            'It reads a **parameter**, `use_mock_hardware`. When it is true, the program only prints its moves and nothing moves. On the robot, it is false.',
            'It starts `perform_wave` once the node is up.',
            'It shuts the node down when the wave is done, and reports a failure if something went wrong.',
          ] },
          { type: 'p', text: "And `main` is where it all starts: `rclpy.init()` starts ROS 2, `rclpy.spin(node)` keeps the node running, and at the end, ROS 2 shuts down." },
          { type: 'mcq', question: 'Which line in `wave.py` does the Wave robot run let you change?', options: ['`WAVE_CYCLES = 1`', '`LIMITS = {...}`', '`PCA_HAND = 0x40`', '`def perform_wave(mock=False):`'], answer: 0, explain: 'Each behavior file has one student setting. Everything else is tested on the robot.' },
          { type: 'mcq', question: 'What does `use_mock_hardware` set to true do?', options: ['Prints the moves without moving the robot', 'Makes the robot move faster', 'Turns off the safety limits', 'Starts the camera'], answer: 0, explain: 'Mock mode is for testing without hardware. On the robot, it is false.' },
        ],
      },
    ],
    completionSummary: { text: 'You know the four parts of a behavior file, the student setting, and what the ROS 2 node does.', conceptsUsed: ['Nodes', 'Parameters'] },
  },
  {
    id: 'joints-servos-and-limits', title: 'Joints, Servos and Limits', kind: 'reading', estimatedTime: '10 minutes',
    summary: 'How the robot moves: servo boards and channels, angles, limits, the rest pose, and robot.yaml.',
    workspaceFile: ROBOT_YAML,
    relatedConcepts: ['Joints', 'Servos', 'Limits', 'Safety'],
    steps: [
      summary('10 minutes', 'In this lesson, you are going to learn how the robot actually moves. You will learn:', [
        'What a servo is, and how the code finds each one.',
        'What angles, limits and the rest pose are.',
        'What `robot.yaml` holds, and why you never edit it.',
      ]),
      {
        id: 'servos', title: 'Servos, Boards and Channels',
        blocks: [
          { type: 'p', text: "Each joint is turned by a **servo**: a small motor that turns to the angle you give it, and holds it there. The servos plug into **servo boards**, and each board has numbered **channels**. So, to move a joint, the code needs two things: the board, and the channel." },
          { type: 'code', lang: 'python', filename: 'From wave.py', copy: false, code: 'PCA_HAND = 0x40   # the board for the right hand and arm\nWRIST = 5         # channel 5 on that board\nELBOW = 6         # channel 6' },
          { type: 'p', text: "`0x40` is the board's address. It is written in hexadecimal, a way of writing numbers that computers use for addresses. You don't need to do math with it, just recognize it." },
        ],
      },
      {
        id: 'angles-and-limits', title: 'Angles, Limits and the Rest Pose',
        blocks: [
          { type: 'list', items: [
            '**Angle**: where the servo turns to, in degrees.',
            '**Center**: the angle where a joint is straight.',
            '**Limits**: the smallest and largest angle a joint may reach. The code keeps every move inside them.',
            '**Rest pose**: the safe pose every behavior starts from and goes back to, with the elbows bent.',
          ] },
          { type: 'p', text: "Limits are what keep the robot from hurting itself, or someone near it. A joint pushed past its limit can hit the table, its own body, or a person." },
        ],
      },
      {
        id: 'robot-yaml', title: 'robot.yaml: the Map of the Body',
        blocks: [
          { type: 'p', text: "`robot.yaml` is the robot's central settings file. For every joint, it records the board, the channel, the center and the limits. Have a look at one entry:" },
          { type: 'code', lang: 'yaml', filename: 'From robot.yaml', copy: false, code: 'wrist:\n  ...\n  notes: "Wrist. Center 100. Range 60-170 (raised from 160 for palm-up)."' },
          { type: 'p', text: "As you can see, the notes even explain why a limit changed. Before every run, the robot checks the angles a behavior asks for against these limits." },
          { type: 'callout', tone: 'safety', label: 'Safety', text: 'You read robot.yaml, but you never edit it. Its numbers are measured on the real robot.' },
          { type: 'mcq', question: 'What do a joint\'s limits do?', options: ['Keep every move inside the angles the joint can safely reach', 'Make the joint move faster', 'Count how many times it moves', 'Turn the joint off'], answer: 0, explain: 'Limits are the safe range for each joint.' },
          { type: 'mcq', question: 'Where does every behavior start and end?', options: ['The rest pose', 'The largest angle of every joint', 'Wherever the last run stopped', 'The center of every joint'], answer: 0, explain: 'Every behavior starts from and returns to the rest pose.' },
        ],
      },
    ],
    completionSummary: { text: 'You know how servos, boards, channels, angles and limits work, and what robot.yaml is for.', conceptsUsed: ['Servos', 'Limits'] },
  },
  {
    id: 'output-and-errors', title: 'Reading Output and Errors', kind: 'reading', estimatedTime: '8 minutes',
    summary: 'What a program prints while it runs, how to read an error, and a checklist for when something goes wrong.',
    relatedConcepts: ['Debugging'],
    steps: [
      summary('8 minutes', 'In this lesson, you are going to learn how to read what a program tells you. You will learn:', [
        'What normal output looks like.',
        'How to read an error message.',
        'A checklist for when something goes wrong.',
      ]),
      {
        id: 'normal-output', title: 'Normal Output',
        blocks: [
          { type: 'p', text: "A running program prints what it is doing. Lines that start with `[INFO]` are normal, and `[WARN]` means something needs your attention. You should get something similar to this when you run a practice file:" },
          { type: 'terminal', label: 'Output', lines: ['$ ros2 run swayform_labs wave_builder', '[INFO] [wave_builder]: node started', '[INFO] Connecting to motion controller...', '[WARN] [wave_builder]: one or more # TODO sections are still unfinished'] },
          { type: 'p', text: "As you can see, the warning tells you exactly what is wrong: some `# TODO` notes are still in the file." },
        ],
      },
      {
        id: 'reading-an-error', title: 'Reading an Error',
        blocks: [
          { type: 'p', text: "When Python stops with an error, it tells you three things: the file, the line, and the reason. Have a look:" },
          { type: 'terminal', label: 'Output', lines: ['File "wave_builder.py", line 27', "NameError: name 'sleep' is not defined"] },
          { type: 'p', text: "Read it from the bottom up. The last line is the reason: Python has never heard of `sleep`. The line above tells you where. Here, the import is missing! These are the errors you will meet most:" },
          { type: 'table', headers: ['Error', 'Usually means'], rows: [
            ['NameError', 'A name is misspelled, or was never imported or set.'],
            ['IndentationError', 'A line is indented wrong, or a block has nothing indented under it.'],
            ['SyntaxError', 'A typo in the code itself, like a missing colon or bracket.'],
          ] },
        ],
      },
      {
        id: 'checklist', title: 'When Something Goes Wrong',
        blocks: [
          { type: 'checklist', items: [
            'Read the output and the Problems tab. The answer is usually there.',
            'Check the spelling of every name, and the capital letters.',
            'Check the indents.',
            'Compare with the lab text, or use Show Hint.',
            'On the robot: if anything looks wrong, tell your teacher and keep your hands clear.',
          ] },
          { type: 'mcq', question: '`NameError: name \'WAVE_CYCLES\' is not defined`. What is the most likely cause?', options: ['The setting was never written, or is misspelled', 'The robot is offline', 'The servo hit its limit', 'The quiz was not passed'], answer: 0, explain: 'A NameError means Python has never seen that name.' },
        ],
      },
    ],
    completionSummary: { text: 'You can read normal output and errors, and you know what to check when something goes wrong.', conceptsUsed: ['Debugging'] },
  },
];

export const ORIENTATION_LEVEL = {
  id: 'orientation', number: 0, title: 'Getting Started and Introduction to ROS 2',
  description: 'The lessons in sections 1 and 2 written for the current portal.',
  sections: [
    { id: 'orientation-getting-started', title: 'Getting Started', activities: GETTING_STARTED_ACTIVITIES },
    { id: 'orientation-ros2', title: 'Introduction to ROS 2', activities: ROS2_ACTIVITIES },
  ],
};
