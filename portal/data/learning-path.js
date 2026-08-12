/* SwayForm Learning Portal — content model v2.
 *
 * Learning Path -> Level -> Section -> Activity -> Step -> Block.
 *
 * Replaces the old Course -> Chapter -> Lesson -> Block model. The change is
 * pedagogical, not just structural: activities are organized around a ROBOT
 * BEHAVIOR the student builds ("Wave", "Handshake", "Hello Robot Motion"),
 * not around a ROS 2 topic ("Publishers"). Concepts are taught inline,
 * inside the step where the student needs them.
 *
 * Block schema is rendered by portal/apps/learn/lesson-renderer.js:
 *   lead / heading / p / list / steps / callout / code / terminal / table /
 *   checklist / image / divider
 *
 * Activity shape:
 *   { id, title, kind: 'reading' | 'activity', difficulty?, estimatedTime,
 *     workspaceFile?, relatedConcepts?: [string],
 *     steps: [ { id, title, blocks: [Block] } ],
 *     completionSummary?: { text, conceptsUsed?: [string] } }
 */

export const LEARNING_PATH = {
  id: 'swayform-fundamentals',
  title: 'SwayForm Fundamentals',
  levels: [
    // ============================================================ LEVEL 1
    {
      id: 'foundations', number: 1, title: 'Foundations',
      description: 'Get oriented, connect to your robot, and understand how classroom submissions work before you write any code.',
      sections: [
        {
          id: 'orientation', title: 'Orientation', difficulty: null, estimatedTime: '20 minutes',
          description: 'What SwayForm teaches, how the portal works, and the safety rules every session starts with.',
          activities: [
            {
              id: 'welcome', title: 'Welcome to SwayForm', kind: 'reading', estimatedTime: '8 minutes',
              summary: 'What SwayForm teaches, how the portal is organized, and how your workspace is laid out.',
              steps: [
                {
                  id: 'what-swayform-teaches', title: 'What SwayForm Teaches',
                  blocks: [
                    { type: 'lead', text: 'SwayForm is built around the idea that robotics makes more sense when you can see code turn into physical motion. Everything in this portal — every activity, every level — is built around one goal: making the robot do something.' },
                    { type: 'p', text: '**Programming through robot behavior.** You will use Python to define poses, trigger motions, adjust timing, and create behavior sequences — code that moves a physical system, not just a terminal.' },
                    { type: 'p', text: '**ROS 2, as you need it.** You will meet nodes, topics, publishers, and motion commands inside real activities, at the moment you need them to make something move — not as a wall of theory before you touch any code.' },
                    { type: 'p', text: '**Safe motion by default.** Robot joints are never commanded randomly. Every activity works inside tested safe limits, and you will learn why those limits exist as you use them.' },
                    { type: 'p', text: '**Vision and interaction, later.** Later levels use a RealSense camera to connect what the robot sees to what it does — simple presence and zone detection, not perfect human-level understanding.' },
                    { type: 'callout', tone: 'note', label: 'Key idea', text: 'You will build a behavior first, and understand the concept behind it as part of building it. Theory shows up when you need it, not before.' },
                  ],
                },
                {
                  id: 'how-the-portal-works', title: 'How the Portal Works',
                  blocks: [
                    { type: 'p', text: 'The Learning Path is organized into Levels. Each Level has one or more Sections, and each Section has a small number of Activities. Every activity that involves code opens the same two-pane workspace: your instructions on the left, a real ROS 2 workspace and editor on the right.' },
                    { type: 'steps', items: [
                      '**Pick an activity** from your Learning Path. Difficulty and estimated time are shown up front.',
                      '**Read the first step.** Early steps explain what you are about to build and why it matters.',
                      '**Open the file** the step references — it opens directly in the editor next to your instructions.',
                      '**Make the change** the step describes, then move to the next step.',
                      '**Run or Check** your work using the toolbar above the editor.',
                      '**Finish the activity** and see a short summary of what you just used — then move to the next one.',
                    ] },
                    { type: 'callout', tone: 'tip', label: 'Important', text: "You are not expected to guess. Early activities give you almost-complete starter code with one or two things to change. Later activities give you more responsibility as your skills grow." },
                  ],
                },
                {
                  id: 'your-workspace', title: 'Your ROS 2 Workspace',
                  blocks: [
                    { type: 'p', text: 'Every activity that involves code works inside a real SwayForm ROS 2 workspace layout — the same structure you will use when programming the physical robot later.' },
                    { type: 'code', lang: 'bash', filename: 'Finished reference demos', code: '~/ros2_ws/src/swayform_demos/\n├── wave_demo.py\n├── handshake_demo.py\n├── pick_and_place.py\n├── rock_paper_scissors.py\n└── interactive_exchange.py' },
                    { type: 'code', lang: 'bash', filename: 'Guided activity starter files', code: '~/ros2_ws/src/swayform_labs/\n├── lab_01_hello_motion.py\n├── lab_02_servo_limits.py\n├── lab_03_gesture_sequence.py\n└── … (one file per hands-on activity)' },
                    { type: 'p', text: 'Finished demos are read-first, run-second — a complete, working behavior to study before you build your own. Activity starter files are partly finished on purpose: you will fill in the parts that teach you something.' },
                  ],
                },
                {
                  id: 'ground-rules', title: 'Ground Rules',
                  blocks: [
                    { type: 'p', text: 'Two habits will serve you throughout the whole Learning Path.' },
                    { type: 'checklist', items: [
                      "Run a finished demo before editing anything — see it work first, then change it.",
                      "Never test an untested angle or value directly on hardware — stay inside the ranges an activity gives you.",
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Next', text: 'Before you touch the robot, read Safety First — the next activity.' },
                  ],
                },
              ],
              completionSummary: { text: 'You know what SwayForm teaches, how the Learning Path is organized, and how the workspace on the physical robot is laid out.', conceptsUsed: [] },
            },
            {
              id: 'safety-first', title: 'Safety First', kind: 'reading', estimatedTime: '6 minutes',
              summary: 'Why every submission is reviewed before the robot moves, and the core safety checklist.',
              steps: [
                {
                  id: 'a-physical-robot', title: 'A Physical Robot, Not a Simulation',
                  blocks: [
                    { type: 'lead', text: 'SwayForm is designed for classroom robotics learning, but it is still a physical robot. Treat every moving part with care. For the full protected motion-control architecture and layered emergency-stop system, see the public Safety page and the Robot Safety and Acceptable Use Policy.' },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'The goal of every activity is controlled learning, not seeing how far the robot can be pushed.' },
                  ],
                },
                {
                  id: 'safety-checklist', title: 'The Core Safety Checklist',
                  blocks: [
                    { type: 'p', text: 'These rules apply to every activity in the Learning Path, from your first motion command to the capstone.' },
                    { type: 'checklist', items: [
                      'Keep hands clear while a demo or approved program is running.',
                      'Stop the running script before repositioning objects near the robot.',
                      "Do not force the robot's arms, hands, head, or base by hand.",
                      'Use safe joint limits instead of testing random servo angles.',
                      'Keep tabletop objects light and easy to move.',
                      'Make sure the robot is stable before running arm or base motions.',
                      'If a motion looks wrong, stop the script before trying again.',
                      'Know where the emergency stop / servo-power cutoff is before running any program.',
                      'Never run a program on the physical robot without an instructor or supervisor present.',
                    ] },
                  ],
                },
                {
                  id: 'why-review-first', title: 'Why Review Happens Before Motion',
                  blocks: [
                    { type: 'p', text: 'Every program you write is validated and instructor-approved before it can move the robot — the next activity, How Submissions Work, covers that full path. That review step exists specifically so unsafe or malformed code is caught before it ever reaches a motor.' },
                  ],
                },
              ],
              completionSummary: { text: 'You understand why every submission is reviewed before it reaches the robot.', conceptsUsed: [] },
            },
            {
              id: 'how-submissions-work', title: 'How Submissions Work', kind: 'reading', estimatedTime: '10 minutes',
              summary: 'The full path from writing code to an instructor-approved robot behavior.',
              steps: [
                {
                  id: 'the-full-sequence', title: 'The Full Submission Sequence',
                  blocks: [
                    { type: 'lead', text: 'You write real ROS 2 code, but you never send commands straight to the motors. Every submission moves through the same protected path before the robot moves.' },
                    { type: 'steps', items: [
                      'The instructor introduces the lesson or objective.',
                      'You open the free Learning Portal.',
                      'You follow the explanation and examples in an activity.',
                      "You connect to the robot's Raspberry Pi through SSH using the shared student environment.",
                      'You create a named ROS 2 project using the SwayForm project-creation tool.',
                      'The tool generates the appropriate folder structure and starter files.',
                      'You modify a partially completed starter file, or write your own program.',
                      'You submit your program to the SwayForm execution queue.',
                      'The system performs automated validation — syntax, build, and safety checks.',
                      'The instructor reviews the program and its source code.',
                      'The instructor approves or rejects the submission, with feedback if needed.',
                      'An approved program sends requests through the protected motion-control system.',
                      'The robot performs the approved behavior.',
                      'You observe, debug, revise, and resubmit.',
                    ] },
                  ],
                },
                {
                  id: 'why-the-queue-exists', title: 'Why the Queue Exists',
                  blocks: [
                    { type: 'p', text: 'Because the review step is real, instructors do not need to watch every keystroke. They review the source once, before it can move the robot, which keeps the classroom open for real experimentation without needing constant supervision of the code itself — physical supervision of the robot is still required, as covered in Safety First.' },
                    { type: 'callout', tone: 'safety', label: 'What this is not', text: 'You do not press Run and immediately control the hardware. Nothing reaches a motor without passing through validation, the queue, and instructor approval first.' },
                  ],
                },
                {
                  id: 'automated-checks', title: 'What Gets Checked Automatically',
                  blocks: [
                    { type: 'p', text: 'Before a submission reaches an instructor, it runs through automated checks. This list reflects planned architecture — some checks are further along than others, and none of this replaces instructor review.' },
                    { type: 'list', items: [
                      'Python syntax validation',
                      'ROS 2 package build checks',
                      'Required dependency validation',
                      'Valid message structure',
                      'Supported node configuration',
                      'Valid joint names',
                      'Joint-angle bounds',
                      'Requested speed limits',
                      'Command-duration limits',
                      'Missing-file detection',
                      'Unsupported hardware access',
                      'Direct motor-controller access attempts',
                    ] },
                    { type: 'callout', tone: 'note', label: 'Honest note', text: 'These are planned checks, not a claim of complete behavioral simulation or a guarantee that every approved program is perfectly safe. Physical limits are still enforced by the protected motion-control node regardless of what the queue catches.' },
                  ],
                },
                {
                  id: 'instructor-review', title: 'Instructor Review',
                  blocks: [
                    { type: 'p', text: 'The queue is meant to give an instructor everything needed to make a fast, informed decision:' },
                    { type: 'list', items: [
                      'Student or team name and project name',
                      'Requested program',
                      'Submission time and queue position',
                      'Build status and validation status',
                      'Error messages, if any',
                      'Instructor decision and current execution status',
                    ] },
                    { type: 'p', text: 'The instructor opens a queued submission, reads the source, checks the validation results, and approves or rejects it. A rejection can include feedback so you can fix the issue and resubmit. Only an approved submission can send requests through the protected motion-control system.' },
                  ],
                },
              ],
              completionSummary: { text: 'You understand the full path from writing code to the robot performing an approved behavior.', conceptsUsed: [] },
            },
          ],
        },
        {
          id: 'connect-to-robot', title: 'Connect to Your Robot', difficulty: null, estimatedTime: '25 minutes',
          description: 'Get your laptop talking to the robot and set up your own student project.',
          activities: [
            {
              id: 'vscode-ssh-setup', title: 'VS Code & SSH Setup', kind: 'reading', estimatedTime: '15 minutes',
              summary: 'Connect to the robot from VS Code over SSH, run a demo, and stop motion safely.',
              steps: [
                {
                  id: 'why-vscode-and-ssh', title: 'Why VS Code and SSH',
                  blocks: [
                    { type: 'lead', text: 'You use VS Code and SSH so you can work with the robot like a real development system. Code runs on the robot, but you edit and launch it from your own laptop.' },
                    { type: 'p', text: "SSH lets your laptop open a secure terminal session on the robot's Raspberry Pi. VS Code adds a familiar editor, file browser, and terminal on top of that connection, so you can open the robot workspace, inspect files, edit code, and run commands without switching tools constantly." },
                  ],
                },
                {
                  id: 'student-vs-administrator', title: 'Shared Student Account vs. Administrator Account',
                  blocks: [
                    { type: 'p', text: 'SwayForm uses two Linux access levels on the Raspberry Pi: a shared student account, and an administrator account for the instructor.' },
                    { type: 'terminal', lines: ['ssh student@swayform.local'] },
                    { type: 'p', text: 'You connect through a shared student SSH account. Instead of separate logins per student, everyone in a class reaches the same account and then creates a separately named project — see Create Your Student Project — using a guided command-line tool.' },
                    { type: 'callout', tone: 'warn', label: 'What this is and is not', text: 'Because every student project lives under one shared Linux account, this does not provide true operating-system-level isolation between students. Project names and optional project passwords are a SwayForm classroom-organization feature — they discourage accidental modification and help you find your own work again. They are not a security boundary against a technically advanced student with access to the same shared filesystem.' },
                    { type: 'p', text: 'The instructor holds a separate administrator account with elevated privileges — reviewing queued submissions, approving or rejecting them, and maintaining the robot.' },
                  ],
                },
                {
                  id: 'connecting', title: 'Connecting to the Robot',
                  blocks: [
                    { type: 'p', text: 'Before you run anything:' },
                    { type: 'steps', items: [
                      '**Power on the robot.** Make sure it is stable. Do not place hands or objects near the arms while software is starting.',
                      '**Connect to the correct network.** Laptop and robot need to be able to see each other.',
                      '**Open VS Code** and use Remote-SSH to open a terminal and file browser on the robot.',
                      '**Open the workspace** at `~/ros2_ws`, where demos, labs, and student projects live.',
                      '**Run a safe demo first** — start with Wave, the simplest one.',
                    ] },
                    { type: 'terminal', lines: ['cd ~/ros2_ws', 'source install/setup.bash'] },
                    { type: 'callout', tone: 'note', label: 'Note', text: 'These commands are example defaults. The exact hostname, username, or workspace path can be adjusted for your classroom image.' },
                  ],
                },
                {
                  id: 'running-a-demo', title: 'Running a Demo',
                  blocks: [
                    { type: 'terminal', lines: ['cd ~/ros2_ws', 'source install/setup.bash', 'ros2 run swayform_demos wave_demo'] },
                    { type: 'p', text: 'Before running: confirm the robot is stable, the table area is clear, no one is holding an arm, the correct demo command is being used, and the previous behavior has fully stopped.' },
                  ],
                },
                {
                  id: 'stopping-motion-safely', title: 'Stopping Motion Safely',
                  blocks: [
                    { type: 'p', text: 'Know how to stop a behavior before you start changing code — a safe stop is part of the normal workflow, not an emergency-only action.' },
                    { type: 'terminal', lines: ['Ctrl + C'] },
                    { type: 'checklist', items: [
                      'Wait for the robot to finish or relax its current movement.',
                      'Do not immediately grab the arm or hand.',
                      'Check the terminal output for errors.',
                      'Only restart the demo when the area is clear.',
                    ] },
                    { type: 'p', text: 'Ctrl+C is a normal software stop, not the full safety system — see the public Safety page for the physical emergency stop and protected motion architecture. If the robot does not move correctly, stop the script first, then check whether the correct file was edited, the workspace was sourced, and another behavior is not already controlling the robot.' },
                  ],
                },
              ],
              completionSummary: { text: 'You can connect to the robot from VS Code, run a demo, and stop motion safely.', conceptsUsed: [] },
            },
            {
              id: 'create-student-project', title: 'Create Your Student Project', kind: 'reading', estimatedTime: '10 minutes',
              summary: 'Generate your own named project folder and start working inside it.',
              steps: [
                {
                  id: 'creating-a-project', title: 'Creating a Project',
                  blocks: [
                    { type: 'lead', text: 'Instead of hand-building a ROS 2 package structure from scratch, you create a named project using the SwayForm project-creation tool, which generates the right folders and starter files automatically.' },
                    { type: 'p', text: 'The command-line tool asks a short set of questions:' },
                    { type: 'list', items: [
                      'Project name',
                      'Student or team identifier',
                      'Optional project password',
                      'Selected lab or starter template',
                    ] },
                    { type: 'code', lang: 'bash', filename: 'bash — example session', code: '$ swayform-new-project\nProject name: gesture-club-team3\nStudent or team ID: team3\nOptional project password: ********\nStarter template (blank / lab-01 / lab-03 / demo-wave): lab-03\n\nCreated ~/ros2_ws/src/gesture-club-team3/\n  ├── package.xml\n  ├── setup.py\n  ├── gesture_club_team3/\n  │   └── main.py\n  └── PROJECT_INFO.txt' },
                  ],
                },
                {
                  id: 'what-gets-generated', title: 'What Gets Generated',
                  blocks: [
                    { type: 'list', items: [
                      'A standard ROS 2 package structure',
                      'Starter Python files, matching the chosen template',
                      'Partially completed exercises, comments, and instructions where the template is a lab',
                      'Required configuration (package.xml, setup.py)',
                      'Submission metadata used later by the validation queue',
                    ] },
                    { type: 'callout', tone: 'warn', label: 'About project passwords', text: 'An optional project password is a SwayForm classroom-organization feature that helps you or your team find and protect your own project and discourages accidental changes by someone else. Because every project lives on one shared Linux account, a password here is not a real security boundary — see VS Code & SSH Setup.' },
                  ],
                },
                {
                  id: 'working-in-your-project', title: 'Working in Your Project',
                  blocks: [
                    { type: 'p', text: "Open your generated folder in VS Code, edit `main.py` (or the files listed in `PROJECT_INFO.txt`), and test locally before submitting. When ready, submit through the queue rather than running against the physical robot directly — see How Submissions Work." },
                  ],
                },
              ],
              completionSummary: { text: 'You have your own named project folder, generated and ready to work in.', conceptsUsed: [] },
            },
          ],
        },
      ],
    },

    // ============================================================ LEVEL 2
    {
      id: 'basic-motion', number: 2, title: 'Basic Motion',
      description: 'Move a single joint, understand why safe limits exist, and rotate the robot base.',
      sections: [
        {
          id: 'single-joint-control', title: 'Single Joint Control', difficulty: 'beginner', estimatedTime: '45–65 minutes',
          description: 'Send your first motion command and learn why joints only move inside tested ranges.',
          activities: [
            {
              id: 'hello-robot-motion', title: 'Hello Robot Motion', kind: 'activity', difficulty: 'beginner', estimatedTime: '20–30 minutes',
              summary: 'Send your first motion command and watch code become physical movement.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_01_hello_motion.py',
              relatedConcepts: ['Motion commands', 'Neutral pose', 'Safe movement'],
              steps: [
                {
                  id: 'understand-the-goal', title: 'Understand the Goal',
                  blocks: [
                    { type: 'lead', text: 'Run your first safe robot motion and understand that code sends target positions to robot joints.' },
                    { type: 'p', text: "You are not expected to write this from scratch. `lab_01_hello_motion.py` already runs — your job is to run it once unedited, watch what moves, then change a small value and see how the physical result changes." },
                  ],
                },
                {
                  id: 'open-the-file', title: 'Open lab_01_hello_motion.py',
                  blocks: [
                    { type: 'p', text: 'Open the starter file now.' },
                    { type: 'code', lang: 'python', filename: 'lab_01_hello_motion.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef move_to_raised_pose(motion): ...\ndef return_to_idle(motion): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_01_hello_motion.py' },
                    { type: 'p', text: '`move_to_raised_pose` sends the robot to `idle` first, then moves the right arm into `RIGHT_ARM_RAISED` and holds it for `HOLD_SECONDS`. `return_to_idle` always runs afterward, in the `finally` block of `main()`, so the robot ends every run in a known safe pose.' },
                  ],
                },
                {
                  id: 'change-one-value', title: 'Change One Value',
                  blocks: [
                    { type: 'p', text: 'Near the top of the file you will find this comment:' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Change HOLD_SECONDS to make the raised pose last longer or shorter.` — `HOLD_SECONDS` is currently `1.5`. That single number controls how long the arm stays raised before `return_to_idle` runs.' },
                    { type: 'p', text: "Change `HOLD_SECONDS` to a different value — try something clearly shorter or longer, like `0.5` or `3.0` — so the difference is obvious when you run it again." },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'p', text: 'Run the lab from the toolbar above, or from a real terminal on the robot:' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_01_hello_motion'] },
                    { type: 'p', text: 'Watch the terminal panel for the mocked run sequence, then move on when you are ready.' },
                  ],
                },
                {
                  id: 'reflect', title: 'Reflect',
                  blocks: [
                    { type: 'p', text: 'What changed physically when you changed the code value?' },
                    { type: 'callout', tone: 'tip', label: 'Extension challenge', text: 'Add a second safe motion after the first one, then return the robot to idle.' },
                  ],
                },
              ],
              completionSummary: { text: 'You sent your first motion command and watched code become physical movement.', conceptsUsed: ['Motion commands', 'Neutral pose', 'Terminal commands'] },
            },
            {
              id: 'safe-joint-limits', title: 'Safe Joint Limits', kind: 'activity', difficulty: 'beginner', estimatedTime: '25–35 minutes',
              summary: 'Understand why joints only move inside tested, safe ranges.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_02_servo_limits.py',
              relatedConcepts: ['Servo range', 'Joint limits', 'Mechanical safety'],
              steps: [
                {
                  id: 'why-limits-exist', title: 'Understand Why Limits Exist',
                  blocks: [
                    { type: 'lead', text: 'Understand that each joint has safe angle limits, and that robot motion should stay inside tested ranges.' },
                    { type: 'p', text: 'A servo will physically try to reach whatever angle you send it. Nothing about the hardware stops a program from asking for an unsafe value — the software has to be the thing that says no.' },
                  ],
                },
                {
                  id: 'open-the-file', title: 'Open lab_02_servo_limits.py',
                  blocks: [
                    { type: 'p', text: 'Open the starter file now.' },
                    { type: 'code', lang: 'python', filename: 'lab_02_servo_limits.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef clamp_to_safe_range(value, minimum, maximum): ...\ndef move_shoulder(motion, pitch): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_02_servo_limits.py' },
                    { type: 'p', text: '`SHOULDER_PITCH_MIN` (0) and `SHOULDER_PITCH_MAX` (60) define the safe, tested range for this joint. `TARGET_SHOULDER_PITCH` is currently `40` — inside that range. Try a few different values inside `[0, 60]` and compare the result before changing anything else.' },
                  ],
                },
                {
                  id: 'finish-clamp-to-safe-range', title: 'Finish clamp_to_safe_range()',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: "`clamp_to_safe_range()` currently has a TODO: it returns `value` completely unchanged, which means nothing actually stops an out-of-range angle from reaching the servo. `move_shoulder()` already calls it and trusts its result — the function just doesn't do its job yet." },
                    { type: 'p', text: 'Replace the placeholder `return value` with real clamping logic: if `value` is below `minimum`, return `minimum`; if it is above `maximum`, return `maximum`; otherwise return `value` unchanged. A safe robot program should never trust a raw value — it should guarantee the value it sends.' },
                  ],
                },
                {
                  id: 'run-and-compare', title: 'Run and Compare',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_02_servo_limits'] },
                    { type: 'p', text: 'Run it once with `TARGET_SHOULDER_PITCH` inside the safe range, then try a value outside `[0, 60]` and confirm your finished `clamp_to_safe_range()` actually stops it from reaching the joint. Compare a small change to a larger change.' },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Use safe joint limits instead of testing random servo angles directly on hardware.' },
                  ],
                },
              ],
              completionSummary: { text: 'You saw why a robot program should always clamp values instead of trusting them.', conceptsUsed: ['Safe limits', 'Defensive code'] },
            },
          ],
        },
        {
          id: 'moving-the-base', title: 'Moving the Base', difficulty: 'intermediate', estimatedTime: '30–45 minutes',
          description: 'Command the robot’s rotating base with a clear stop condition.',
          activities: [
            {
              id: 'base-rotation', title: 'Base Rotation', kind: 'activity', difficulty: 'intermediate', estimatedTime: '30–45 minutes',
              summary: 'Command the rotating base with a clear, safe stop condition.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_08_base_rotation.py',
              relatedConcepts: ['Base yaw', 'Motor control', 'Stop conditions'],
              steps: [
                {
                  id: 'clear-the-area', title: 'Clear the Area',
                  blocks: [
                    { type: 'lead', text: "Command the robot's rotating base to turn left or right, safely." },
                    { type: 'checklist', items: [
                      'Make sure the robot base area is clear before running anything.',
                    ] },
                    { type: 'p', text: 'A rotating base sweeps a wider area than an arm — check the full radius, not just what is directly in front of the robot.' },
                  ],
                },
                {
                  id: 'run-the-starter-rotation', title: 'Run the Starter Rotation',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_08_base_rotation.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef rotate_base(motion, direction, angle): ...\ndef stop_base(motion): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_08_base_rotation.py' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_08_base_rotation'] },
                    { type: 'p', text: 'Run it unedited first and observe the direction and stopping behavior.' },
                  ],
                },
                {
                  id: 'change-direction-and-duration', title: 'Change Direction and Duration',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Try "left" and "right", and a smaller or larger ROTATION_ANGLE within the safe range above.` `ROTATION_DIRECTION` is currently `"left"` and `ROTATION_ANGLE` is `30`. `rotate_base()` converts direction and angle into a signed value, then clamps it with `max(BASE_YAW_MIN, min(BASE_YAW_MAX, signed_angle))` so it can never exceed `[-45, 45]`.' },
                    { type: 'p', text: 'Change `ROTATION_DIRECTION` to `"right"`, or change `ROTATION_ANGLE` to a smaller or larger value still inside the safe range, then run the lab again.' },
                  ],
                },
                {
                  id: 'always-send-a-stop-command', title: 'Always Send a Stop Command',
                  blocks: [
                    { type: 'p', text: '`stop_base()` moves the base back to a centered, stopped position at `0`. It runs inside the `finally` block of `main()`, alongside `motion.unlock_behavior(...)`, so the base always returns to center even if something goes wrong mid-rotation.' },
                    { type: 'p', text: 'Why should base motion always include a clear stop condition?' },
                  ],
                },
              ],
              completionSummary: { text: 'You commanded a full robot motor with a clear, safe stop condition.', conceptsUsed: ['Direction', 'Speed', 'Stop command'] },
            },
          ],
        },
      ],
    },

    // ============================================================ LEVEL 3
    {
      id: 'basic-gestures', number: 3, title: 'Basic Gestures',
      description: 'Combine joint motion with timing to build gestures a person can recognize.',
      sections: [
        {
          id: 'first-gesture', title: 'Your First Gesture', difficulty: 'beginner', estimatedTime: '35–50 minutes',
          description: 'Study a finished wave, then build your own gesture sequence from scratch.',
          activities: [
            {
              id: 'wave', title: 'Wave', kind: 'activity', difficulty: 'beginner', estimatedTime: '10–15 minutes',
              summary: 'Study a finished greeting gesture built from joint targets and a timed loop.',
              workspaceFile: 'ros2_ws/src/swayform_demos/wave_demo.py',
              relatedConcepts: ['Joint targets', 'Timed motion', 'Motion lock'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: "SwayForm raises one arm and waves the wrist side to side — a short, deliberate greeting gesture built from a handful of joint targets and a loop." },
                    { type: 'heading', level: 3, text: 'Hardware used' },
                    { type: 'list', items: ['Shoulder servo', 'Elbow servo', 'Wrist servo', 'Motion controller node'] },
                    { type: 'callout', tone: 'note', label: 'Expected behavior', text: 'The robot raises its right arm to a safe height, waves the wrist left and right three times, then returns to idle. (Video preview coming with cloud simulation.)' },
                  ],
                },
                {
                  id: 'open-the-file', title: 'Open the Starter File',
                  blocks: [
                    { type: 'p', text: "Wave is a finished, working demo — the whole point is to read real SwayForm code before you write your own. Open it now." },
                    { type: 'code', lang: 'python', filename: 'wave_demo.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef move_to_wave_start(motion): ...\ndef perform_wave(motion, cycles): ...\ndef return_to_idle(motion): ...', workspaceFile: 'ros2_ws/src/swayform_demos/wave_demo.py' },
                    { type: 'p', text: 'Three functions, in order: move into position, perform the wave, return to idle. That shape — **setup → behavior → cleanup** — repeats in almost every SwayForm program you will write.' },
                  ],
                },
                {
                  id: 'the-start-pose', title: 'Understand the Start Pose',
                  blocks: [
                    { type: 'p', text: '`move_to_wave_start` sends the robot to `idle` first, then raises the shoulder and elbow into `RIGHT_ARM_RAISED` — a dictionary of joint names to angles.' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`motion.move_joint_group(\"right_arm\", RIGHT_ARM_RAISED)` sends several joint targets to the motion controller node at once, as one coordinated group — instead of moving each joint separately and risking an awkward in-between pose.' },
                    { type: 'p', text: 'Starting from a known position (idle) before raising the arm means the wave always starts from the same safe place, no matter what the robot was doing before.' },
                  ],
                },
                {
                  id: 'the-wave-loop', title: 'Understand the Wave Loop',
                  blocks: [
                    { type: 'p', text: '`perform_wave` repeats one motion — wrist left, pause, wrist right, pause — `WAVE_CYCLES` times.' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: 'A `for` loop turns one small motion into a recognizable gesture. This is the same pattern behind almost any repeated robot behavior: define one step, then repeat it.' },
                    { type: 'p', text: '`motion.lock_behavior(\"wave_demo\")` in `main()` prevents another program from grabbing the same arm mid-wave — and `unlock_behavior` in the `finally` block guarantees that lock always releases, even if something goes wrong.' },
                  ],
                },
                {
                  id: 'try-changing-it', title: 'Try Changing It',
                  blocks: [
                    { type: 'p', text: 'Small, safe changes to try before you run it again:' },
                    { type: 'list', items: [
                      'Change `WAVE_CYCLES` to wave more or fewer times.',
                      'Change `WAVE_DELAY_SECONDS` to make the wave faster or slower.',
                      'Try the left arm instead of the right arm.',
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Only change the values already defined at the top of the file. Do not test new shoulder or elbow angles outside the provided pose — stay inside tested ranges.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'p', text: 'Run the demo from the toolbar above, or from a real terminal on the robot:' },
                    { type: 'terminal', lines: ['ros2 run swayform_demos wave_demo'] },
                    { type: 'p', text: 'Watch the terminal panel for the mocked run sequence, then move on when you are ready.' },
                  ],
                },
              ],
              completionSummary: { text: 'You just read a real coordinated gesture and saw how a loop turns one small motion into something a person recognizes.', conceptsUsed: ['Joint targets', 'Joint groups', 'Timed motion', 'Motion lock'] },
            },
            {
              id: 'gesture-sequence', title: 'Build a Gesture Sequence', kind: 'activity', difficulty: 'beginner', estimatedTime: '30–40 minutes',
              summary: 'Build your own custom gesture out of poses and timing delays.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_03_gesture_sequence.py',
              relatedConcepts: ['Sequences', 'Timing', 'Reusable functions'],
              steps: [
                {
                  id: 'run-the-starter-gesture', title: 'Run the Starter Gesture',
                  blocks: [
                    { type: 'lead', text: 'Create a small gesture by combining multiple safe poses with timing delays — the same idea Wave used, but this time you build the sequence.' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_03_gesture_sequence'] },
                    { type: 'p', text: 'Run the unedited starter gesture first and watch how it moves through three poses in a row.' },
                  ],
                },
                {
                  id: 'identify-each-pose', title: 'Identify Each Pose',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_03_gesture_sequence.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\nSAFE_POSES = { "greet_raise": {...}, "greet_hold": {...}, "greet_lower": {...} }\ndef run_sequence(motion, sequence): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_03_gesture_sequence.py' },
                    { type: 'p', text: '`SAFE_POSES` is a dictionary of named poses (`greet_raise`, `greet_hold`, `greet_lower`), and `GESTURE_SEQUENCE` is just a list of those names in order: `["greet_raise", "greet_hold", "greet_lower"]`. `run_sequence()` loops over that list and moves through each pose, pausing `POSE_DELAY_SECONDS` between them.' },
                  ],
                },
                {
                  id: 'change-a-delay', title: 'Change a Delay',
                  blocks: [
                    { type: 'p', text: 'Change `POSE_DELAY_SECONDS` (currently `0.6`) to make the sequence feel slower or snappier, then run the lab again to feel the difference.' },
                  ],
                },
                {
                  id: 'add-a-new-pose', title: 'Add a New Pose',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Add one more pose to GESTURE_SEQUENCE below, using a pose from SAFE_POSES or one you define in the same shape.`' },
                    { type: 'p', text: 'Add a new entry to `SAFE_POSES` — a dictionary of joint names to angles, matching the shape of the existing poses — or reuse one already defined, and insert its name into `GESTURE_SEQUENCE` wherever you want it to play.' },
                  ],
                },
                {
                  id: 'run-again-and-compare', title: 'Run Again and Compare',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_03_gesture_sequence'] },
                    { type: 'p', text: 'Check whether the gesture still looks smooth with your new pose in place. How does timing change the way a robot gesture feels to a person watching it?' },
                    { type: 'callout', tone: 'tip', label: 'Extension challenge', text: 'Create two versions of the same gesture: one that looks calm and one that looks excited.' },
                  ],
                },
              ],
              completionSummary: { text: 'You built a custom gesture out of the same building blocks Wave used.', conceptsUsed: ['Sequences', 'Timing', 'Poses'] },
            },
          ],
        },
        {
          id: 'expressive-timing', title: 'Expressive Timing', difficulty: 'intermediate', estimatedTime: '30–45 minutes',
          description: 'Small timing changes make the same final pose feel completely different.',
          activities: [
            {
              id: 'hand-pose-timing', title: 'Hand Pose Timing', kind: 'activity', difficulty: 'intermediate', estimatedTime: '30–45 minutes',
              summary: 'See how timing alone changes how a gesture feels.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_07_hand_pose_timing.py',
              relatedConcepts: ['Finger poses', 'Timing', 'Gesture realism'],
              steps: [
                {
                  id: 'run-the-starter-hand-pose', title: 'Run the Starter Hand Pose',
                  blocks: [
                    { type: 'lead', text: 'Adjust hand and finger timing to understand how small delays affect a robot gesture, even when the final pose never changes.' },
                    { type: 'code', lang: 'python', filename: 'lab_07_hand_pose_timing.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef close_hand(motion): ...\ndef release_hand(motion): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_07_hand_pose_timing.py' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_07_hand_pose_timing'] },
                    { type: 'p', text: 'Run it unedited and watch how quickly the fingers move from `open` to `gentle_close`.' },
                  ],
                },
                {
                  id: 'change-a-timing-delay', title: 'Change a Timing Delay',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Change this delay and re-run to feel the difference between a snappy grip and a slow, deliberate one.` `OPEN_TO_CLOSE_DELAY_SECONDS` (currently `0.5`) is the pause inside `close_hand()` between `motion.set_hand_pose("right_hand", "open")` and `motion.set_hand_pose("right_hand", "gentle_close")`.' },
                    { type: 'p', text: 'Change `OPEN_TO_CLOSE_DELAY_SECONDS` to a smaller or larger value and run the lab again.' },
                  ],
                },
                {
                  id: 'reorder-two-movements', title: 'Reorder Two Movements',
                  blocks: [
                    { type: 'p', text: '`close_hand()` and `release_hand()` are two separate, small functions — `close_hand` moves open → gentle_close and holds for `HOLD_CLOSED_SECONDS`, while `release_hand` returns the hand to `relaxed`. Try changing `HOLD_CLOSED_SECONDS` or the order the two functions are called in `main()` and see how it changes the feel of the gesture.' },
                  ],
                },
                {
                  id: 'compare-which-feels-natural', title: 'Compare Which Feels More Natural',
                  blocks: [
                    { type: 'p', text: 'Why can timing make a robot motion feel more natural even if the final pose is the same?' },
                    { type: 'callout', tone: 'tip', label: 'Extension challenge', text: 'Create a small hand gesture that looks like a count-in or signal.' },
                  ],
                },
              ],
              completionSummary: { text: 'You saw how timing alone can make a motion feel more natural, even with the same final pose.', conceptsUsed: ['Timing', 'Grip and release'] },
            },
          ],
        },
      ],
    },

    // ============================================================ LEVEL 4
    {
      id: 'coordinated-interactive-motion', number: 4, title: 'Coordinated & Interactive Motion',
      description: 'Respond to a person’s presence and take manual input, safely.',
      sections: [
        {
          id: 'responding-to-people', title: 'Responding to People', difficulty: 'beginner', estimatedTime: '45–60 minutes',
          description: 'Move toward a target and greet a person the robot detects.',
          activities: [
            {
              id: 'head-tracking', title: 'Head Tracking', kind: 'activity', difficulty: 'beginner', estimatedTime: '30–45 minutes',
              summary: 'Map a detected position to a head-motion target.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_04_head_tracking.py',
              relatedConcepts: ['Neck yaw/pitch', 'Mapping input to motion'],
              steps: [
                {
                  id: 'run-the-starter-tracking-script', title: 'Run the Starter Tracking Script',
                  blocks: [
                    { type: 'lead', text: 'Move the robot head left, center, or right based on a simple target position from the camera.' },
                    { type: 'code', lang: 'python', filename: 'lab_04_head_tracking.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef zone_for_position(position): ...\ndef yaw_for_zone(zone): ...\ndef track_target(motion, camera): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_04_head_tracking.py' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_04_head_tracking'] },
                  ],
                },
                {
                  id: 'move-the-target-zone', title: 'Move the Target Zone',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`camera.target_zone()` returns a horizontal position from `0.0` (far left) to `1.0` (far right). `# TODO: camera.target_zone() is a stand-in for the real perception call — replace with the actual RealSenseInput method once available.`' },
                    { type: 'p', text: '`zone_for_position()` turns that raw number into one of three zones — `"left"`, `"center"`, or `"right"` — before anything moves. Detecting *where* something is and deciding *how far the robot should move* are two separate steps on purpose.' },
                  ],
                },
                {
                  id: 'change-a-threshold', title: 'Change a Threshold',
                  blocks: [
                    { type: 'p', text: '`# TODO: Adjust these thresholds if the head reacts too early or too late.` `LEFT_ZONE_MAX` (`0.35`) and `RIGHT_ZONE_MIN` (`0.65`) are the boundaries `zone_for_position()` checks. Try narrowing or widening the center zone and observe how it changes when the head reacts.' },
                  ],
                },
                {
                  id: 'change-a-yaw-value', title: 'Change a Yaw Value',
                  blocks: [
                    { type: 'p', text: '`yaw_for_zone()` maps each zone name to a safe head yaw angle: `HEAD_YAW_LEFT` (`-30`), `HEAD_YAW_CENTER` (`0`), `HEAD_YAW_RIGHT` (`30`). Change one of these values within a safe range and run the script again.' },
                  ],
                },
                {
                  id: 'return-to-center', title: 'Return to Center',
                  blocks: [
                    { type: 'p', text: 'The `finally` block in `main()` always sends `motion.move_joint("neck_yaw", HEAD_YAW_CENTER)` before unlocking the behavior, so the head returns to center no matter what happened during tracking.' },
                    { type: 'p', text: 'What is the difference between detecting where something is and deciding how far the robot should move? This mapping — position in, motion target out — is the core idea behind every perception-driven behavior you will build from here on.' },
                  ],
                },
              ],
              completionSummary: { text: 'You mapped a detected position to a motion target — the core idea behind every perception-driven behavior.', conceptsUsed: ['Camera target position', 'Mapping input to motion'] },
            },
            {
              id: 'handshake', title: 'Handshake', kind: 'activity', difficulty: 'beginner', estimatedTime: '10–15 minutes',
              summary: 'A conservative, camera-triggered greeting with a safe timeout.',
              workspaceFile: 'ros2_ws/src/swayform_demos/handshake_demo.py',
              relatedConcepts: ['Presence detection', 'Timeouts', 'finally blocks'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'SwayForm uses the RealSense camera to detect that a user is in front of it, moves its arm into a handshake pose, waits briefly, then returns to idle.' },
                    { type: 'callout', tone: 'note', label: 'Honest note', text: 'This is a vision-assisted classroom demo, not perfect hand detection or full human understanding. It uses simple user presence in an approximate interaction zone to trigger the behavior.' },
                    { type: 'heading', level: 3, text: 'Hardware used' },
                    { type: 'list', items: ['RealSense camera', 'Arm servos', 'Optional hand servo', 'Motion node'] },
                  ],
                },
                {
                  id: 'open-the-file', title: 'Open the Starter File',
                  blocks: [
                    { type: 'p', text: 'Handshake is a finished, working demo. Open it now.' },
                    { type: 'code', lang: 'python', filename: 'handshake_demo.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef wait_for_user(camera, timeout): ...\ndef run_handshake(motion): ...', workspaceFile: 'ros2_ws/src/swayform_demos/handshake_demo.py' },
                  ],
                },
                {
                  id: 'understand-the-timeout', title: 'Understand wait_for_user and the Timeout',
                  blocks: [
                    { type: 'p', text: '`wait_for_user` polls `camera.user_in_interaction_zone()` every `0.1` seconds until it returns `True`, or until `DETECTION_TIMEOUT_SECONDS` (`10`) runs out.' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: 'The robot should not wait forever. A timeout keeps the demo predictable: if no user is detected, `main()` prints a message and returns the robot to idle instead of hanging.' },
                  ],
                },
                {
                  id: 'understand-the-handshake-pose', title: 'Understand the Handshake Pose',
                  blocks: [
                    { type: 'p', text: '`run_handshake` moves the right arm into `HANDSHAKE_POSE` — a controlled position, not a fast reach — holds it for `HANDSHAKE_HOLD_SECONDS` (`2.0`), then calls `motion.safe_pose("idle")`.' },
                    { type: 'p', text: 'As in Wave, `motion.lock_behavior("handshake_demo")` and the matching `unlock_behavior` in the `finally` block guarantee the lock always releases, even if something interrupts the script.' },
                  ],
                },
                {
                  id: 'try-changing-it', title: 'Try Changing It',
                  blocks: [
                    { type: 'list', items: [
                      'Change how long the robot holds the handshake pose.',
                      'Add a small head nod before the arm moves.',
                      'Adjust the detection distance.',
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep the handshake motion slow and predictable. Do not make the arm snap toward the user.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_demos handshake_demo'] },
                    { type: 'p', text: 'Watch the terminal panel for the mocked run sequence, then move on when you are ready.' },
                  ],
                },
              ],
              completionSummary: { text: 'You saw how a robot behavior waits for a person, but never waits forever.', conceptsUsed: ['RealSense presence detection', 'Timeouts', 'finally blocks'] },
            },
          ],
        },
        {
          id: 'manual-control', title: 'Manual Control', difficulty: 'beginner', estimatedTime: '25–40 minutes',
          description: 'Connect a keyboard input to a safe robot action.',
          activities: [
            {
              id: 'button-to-motion-control', title: 'Button-to-Motion Control', kind: 'activity', difficulty: 'beginner', estimatedTime: '25–40 minutes',
              summary: 'Wire a keyboard input to a safe robot action.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_05_button_motion.py',
              relatedConcepts: ['Input handling', 'Safety stop'],
              steps: [
                {
                  id: 'run-the-starter-script', title: 'Run the Starter Script',
                  blocks: [
                    { type: 'lead', text: 'Connect a keyboard input to a safe robot action.' },
                    { type: 'code', lang: 'python', filename: 'lab_05_button_motion.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef handle_input(motion, key): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_05_button_motion.py' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_05_button_motion'] },
                  ],
                },
                {
                  id: 'trigger-the-provided-key', title: 'Trigger the Provided Key',
                  blocks: [
                    { type: 'p', text: '`INPUT_TO_POSE` currently maps one key to one pose: `{"1": "greeting_raise"}`. `handle_input()` looks up the pressed key in that dictionary and calls `motion.safe_pose(pose_name)` if it finds a match. Press `1` and confirm the mapped pose runs.' },
                  ],
                },
                {
                  id: 'add-a-second-input', title: 'Add a Second Input',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Add a second entry to INPUT_TO_POSE (for example key "2") mapped to a different safe pose name.`' },
                    { type: 'p', text: 'Add a new `"2": "some_other_pose_name"` entry to `INPUT_TO_POSE`, using a safe pose name from another lab or demo you have already seen.' },
                  ],
                },
                {
                  id: 'test-both-inputs', title: 'Test Both Inputs',
                  blocks: [
                    { type: 'p', text: 'Run the lab again and press both keys, confirming each one triggers the correct pose.' },
                  ],
                },
                {
                  id: 'use-the-stop-key', title: 'Use the Stop Key',
                  blocks: [
                    { type: 'p', text: '`STOP_KEY` is `"q"`. `handle_input()` returns `False` when it sees the stop key, which tells the `while running:` loop in `main()` to end — always finish a run this way rather than closing the terminal.' },
                    { type: 'p', text: 'Why is it useful to separate input handling from the actual robot motion function?' },
                  ],
                },
              ],
              completionSummary: { text: 'You separated input handling from the motion it triggers — a pattern you’ll reuse constantly.', conceptsUsed: ['Events', 'Input handling', 'Safety stop'] },
            },
          ],
        },
      ],
    },

    // ============================================================ LEVEL 5
    {
      id: 'perception-driven-behaviors', number: 5, title: 'Perception-Driven Behaviors',
      description: 'Use the camera as a trigger, then combine perception with a playful interaction.',
      sections: [
        {
          id: 'camera-triggered-behavior', title: 'Camera-Triggered Behavior', difficulty: 'intermediate', estimatedTime: '55–75 minutes',
          description: 'Turn RealSense zone data into a conservative, predictable behavior.',
          activities: [
            {
              id: 'realsense-detection-basics', title: 'RealSense Detection Basics', kind: 'activity', difficulty: 'intermediate', estimatedTime: '35–45 minutes',
              summary: 'Turn camera zone data into a conservative, predictable trigger.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_06_realsense_detection.py',
              relatedConcepts: ['Detection zones', 'Depth and distance', 'False positives'],
              steps: [
                {
                  id: 'start-the-camera-based-lab', title: 'Start the Camera-Based Lab',
                  blocks: [
                    { type: 'lead', text: 'Use RealSense camera data as a trigger for a simple robot behavior.' },
                    { type: 'code', lang: 'python', filename: 'lab_06_realsense_detection.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef wait_for_object(camera, zone, timeout): ...\ndef respond(motion): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_06_realsense_detection.py' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_06_realsense_detection'] },
                  ],
                },
                {
                  id: 'place-a-target', title: 'Place a Target',
                  blocks: [
                    { type: 'p', text: '`wait_for_object()` polls `camera.object_in_zone(zone)` every `0.1` seconds until something is detected in `DETECTION_ZONE` (`"interaction_zone"`), or `DETECTION_TIMEOUT_SECONDS` (`8`) runs out. If nothing is detected, the robot prints a message and returns to idle instead of running `respond()`.' },
                  ],
                },
                {
                  id: 'adjust-the-zone-or-distance', title: 'Adjust the Zone or Distance',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Try a narrower or wider zone name / timeout and compare how reliably the robot triggers.`' },
                    { type: 'p', text: 'Change `DETECTION_ZONE` or `DETECTION_TIMEOUT_SECONDS` and run the lab again, placing yourself or an object inside and outside the zone to see how it affects triggering.' },
                  ],
                },
                {
                  id: 'compare-reliable-vs-unreliable', title: 'Compare Reliable vs. Unreliable Triggers',
                  blocks: [
                    { type: 'p', text: 'Why should camera-based triggers be conservative when the robot is near people?' },
                    { type: 'callout', tone: 'tip', label: 'Extension challenge', text: 'Add a timeout so the robot returns to idle if the target disappears.' },
                  ],
                },
              ],
              completionSummary: { text: 'You tuned a perception trigger to be conservative around people, on purpose.', conceptsUsed: ['Detection zones', 'Perception-triggered motion'] },
            },
            {
              id: 'pick-and-place', title: 'Pick and Place', kind: 'activity', difficulty: 'intermediate', estimatedTime: '10–15 minutes',
              summary: 'A full pick-and-place sequence built from four named poses.',
              workspaceFile: 'ros2_ws/src/swayform_demos/pick_and_place.py',
              relatedConcepts: ['Named poses', 'Grasp as a hand pose'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'SwayForm reaches to a fixed pickup zone, closes its hand around a light object, lifts it, moves to a separate place zone, and releases it — sense, reach, grasp, transport, release, the same category of task behind pick-and-place work in real manufacturing and warehouse robotics.' },
                    { type: 'callout', tone: 'note', label: 'Honest note', text: 'The pickup and place positions in this version are fixed, tested poses rather than fully general object localization. This teaches the manipulation sequence without pretending the robot can pick up arbitrary objects anywhere on the table.' },
                    { type: 'heading', level: 3, text: 'Hardware used' },
                    { type: 'list', items: ['Shoulder, elbow, and wrist servos', 'Hand and finger servos', 'Optional RealSense camera for zone detection', 'Motion node'] },
                  ],
                },
                {
                  id: 'open-the-file', title: 'Open the Starter File',
                  blocks: [
                    { type: 'p', text: 'Pick and Place is a finished, working demo. Open it now.' },
                    { type: 'code', lang: 'python', filename: 'pick_and_place.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef approach_object(motion): ...\ndef grasp_object(motion): ...\ndef lift_and_transport(motion): ...\ndef release_object(motion): ...', workspaceFile: 'ros2_ws/src/swayform_demos/pick_and_place.py' },
                    { type: 'p', text: 'Four named poses — `PICKUP_APPROACH`, `PICKUP_GRASP`, `LIFT_POSE`, `PLACE_APPROACH` — drive the whole sequence. You can tune one pose without breaking the rest.' },
                  ],
                },
                {
                  id: 'understand-approach-and-grasp', title: 'Understand Approach and Grasp',
                  blocks: [
                    { type: 'p', text: '`approach_object` moves the arm to `PICKUP_APPROACH`, over the object, before `grasp_object` descends into `PICKUP_GRASP` and calls `motion.set_hand_pose("right_hand", "gentle_close")`.' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: 'Going straight to the grasp pose risks knocking the object away — approaching from above first, then descending, is safer. `set_hand_pose` is the same call used in other demos: grasping is just a hand pose, not a special mechanism.' },
                  ],
                },
                {
                  id: 'understand-lift-transport-release', title: 'Understand Lift, Transport, and Release',
                  blocks: [
                    { type: 'p', text: '`lift_and_transport` moves to `LIFT_POSE` first — clear of the table — before moving sideways to `PLACE_APPROACH`. Rising before moving sideways means the object never drags across the table. `release_object` then opens the hand to let go.' },
                    { type: 'p', text: 'As in every SwayForm demo, the `finally` block in `main()` returns the robot to idle and releases the motion lock even if a step fails mid-sequence.' },
                  ],
                },
                {
                  id: 'try-changing-it', title: 'Try Changing It',
                  blocks: [
                    { type: 'list', items: [
                      'Change the place zone to the other side of the robot.',
                      'Slow down the lift for a heavier object.',
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Use only light, easy-to-grip objects. Do not test grasp poses on fingers or hands — the hand should only ever close around a tested tabletop object.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_demos pick_and_place'] },
                    { type: 'p', text: 'Watch the terminal panel for the mocked run sequence, then move on when you are ready.' },
                  ],
                },
              ],
              completionSummary: { text: 'You saw a full pick-and-place sequence built entirely from four named poses.', conceptsUsed: ['Named poses', 'Sequenced motion', 'Hand pose as grasp'] },
            },
          ],
        },
        {
          id: 'playful-interaction', title: 'Playful Interaction', difficulty: 'intermediate', estimatedTime: '10–15 minutes',
          description: 'A full interaction loop with a human opponent.',
          activities: [
            {
              id: 'rock-paper-scissors', title: 'Rock Paper Scissors', kind: 'activity', difficulty: 'intermediate', estimatedTime: '10–15 minutes',
              summary: 'A complete multi-round interaction loop against a human opponent.',
              workspaceFile: 'ros2_ws/src/swayform_demos/rock_paper_scissors.py',
              relatedConcepts: ['Game loops', 'Random choice'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'SwayForm plays rock-paper-scissors with you. It counts down, chooses rock, paper, or scissors, moves its hand into the selected pose, and compares the result.' },
                    { type: 'callout', tone: 'note', label: 'Honest note', text: 'This demo runs in keyboard mode — you type your choice. A camera-assisted version using gesture detection may be added later; do not describe the current version as hand-gesture recognition.' },
                    { type: 'heading', level: 3, text: 'Hardware used' },
                    { type: 'list', items: ['Hand and finger servos', 'Optional speaker for countdown', 'Optional RealSense camera for a future camera-assisted mode'] },
                  ],
                },
                {
                  id: 'open-the-file', title: 'Open the Starter File',
                  blocks: [
                    { type: 'p', text: 'Rock Paper Scissors is a finished, working demo. Open it now.' },
                    { type: 'code', lang: 'python', filename: 'rock_paper_scissors.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef countdown(audio): ...\ndef get_user_choice(): ...\ndef judge(robot, user): ...\ndef play_round(motion, audio): ...', workspaceFile: 'ros2_ws/src/swayform_demos/rock_paper_scissors.py' },
                  ],
                },
                {
                  id: 'understand-the-round-loop', title: 'Understand the Round Loop',
                  blocks: [
                    { type: 'p', text: '`play_round` picks `robot_choice` with `random.choice(VALID_CHOICES)`, calls `get_user_choice()` — which loops until you type a valid move — runs `countdown`, then moves the hand with `motion.set_hand_pose("right_hand", robot_choice)`.' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`main()` calls `play_round` once per round for `ROUNDS_TO_PLAY` (`3`), collecting each returned winner into a `scores` dictionary and printing a final tally — the same loop pattern behind almost any repeated interaction.' },
                  ],
                },
                {
                  id: 'understand-judge', title: 'Understand judge()',
                  blocks: [
                    { type: 'p', text: '`WINS_AGAINST` is a lookup table — `{"rock": "scissors", "scissors": "paper", "paper": "rock"}` — instead of nested if-statements. `judge(robot, user)` checks it and returns `"robot"`, `"user"`, or `"tie"`.' },
                    { type: 'p', text: 'Separating the win logic into its own function makes it easy to test — you could call `judge("rock", "scissors")` directly and verify the result without running the whole demo.' },
                  ],
                },
                {
                  id: 'try-changing-it', title: 'Try Changing It',
                  blocks: [
                    { type: 'list', items: [
                      'Make the game best of five rounds.',
                      'Add a scoreboard variable that prints after every round, not just at the end.',
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: "Hand poses should use tested finger positions. Do not over-close the fingers around a person's hand." },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_demos rock_paper_scissors'] },
                    { type: 'p', text: 'Watch the terminal panel for the mocked run sequence, then move on when you are ready.' },
                  ],
                },
              ],
              completionSummary: { text: 'You saw a complete multi-round interaction loop, from user input to a scored result.', conceptsUsed: ['Game loops', 'Random choice', 'Hand poses'] },
            },
          ],
        },
      ],
    },

    // ============================================================ LEVEL 6
    {
      id: 'advanced-behaviors', number: 6, title: 'Advanced Behaviors',
      description: 'Manage competing behaviors safely and build a full state-machine interaction.',
      sections: [
        {
          id: 'managing-multiple-behaviors', title: 'Managing Multiple Behaviors', difficulty: 'advanced', estimatedTime: '45–60 minutes',
          description: 'One behavior should never interrupt another at the wrong moment.',
          activities: [
            {
              id: 'behavior-priority-motion-locking', title: 'Behavior Priority & Motion Locking', kind: 'activity', difficulty: 'advanced', estimatedTime: '35–45 minutes',
              summary: 'Protect a running behavior from being interrupted mid-motion.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_09_motion_locking.py',
              relatedConcepts: ['Motion lock', 'Behavior priority', 'State control'],
              steps: [
                {
                  id: 'run-the-starter-behavior', title: 'Run the Starter Behavior',
                  blocks: [
                    { type: 'lead', text: 'Understand why one robot behavior should not interrupt another motion at the wrong time.' },
                    { type: 'code', lang: 'python', filename: 'lab_09_motion_locking.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef run_primary_behavior(motion): ...\ndef try_low_priority_behavior(motion): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_09_motion_locking.py' },
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_09_motion_locking'] },
                  ],
                },
                {
                  id: 'trigger-a-second-behavior-mid-motion', title: 'Trigger a Second Behavior Mid-Motion',
                  blocks: [
                    { type: 'p', text: '`main()` calls `run_primary_behavior()` then `try_low_priority_behavior()` right after. In the starter version, `try_low_priority_behavior` always runs a small neck movement — it does not yet check whether the arm is still busy.' },
                  ],
                },
                {
                  id: 'find-the-lock', title: 'Find the Lock',
                  blocks: [
                    { type: 'p', text: '`run_primary_behavior` calls `motion.lock_behavior(HIGH_PRIORITY_NAME)` before moving, and `motion.unlock_behavior(HIGH_PRIORITY_NAME)` in its `finally` block afterward. That lock is what should stop a competing behavior from moving the same joints mid-motion.' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: 'A motion lock is a flag one behavior sets before it starts moving, and clears when it finishes — anything that checks the flag first can tell whether it is safe to move.' },
                  ],
                },
                {
                  id: 'change-the-priority-check', title: 'Change the Priority Check',
                  blocks: [
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Check whether a higher-priority behavior is currently locked before calling motion.lock_behavior(LOW_PRIORITY_NAME) here, and skip this behavior if it is.`' },
                    { type: 'p', text: 'Update `try_low_priority_behavior()` so it checks whether `HIGH_PRIORITY_NAME` is currently locked before calling `motion.lock_behavior(LOW_PRIORITY_NAME)`, and skips the low-priority motion entirely if the primary behavior is still running.' },
                  ],
                },
                {
                  id: 'run-again', title: 'Run Again',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_09_motion_locking'] },
                    { type: 'p', text: 'What could go wrong if two scripts tried to control the same arm at the same time? Confirm the low-priority behavior now waits for — or skips past — the primary one instead of always running.' },
                    { type: 'callout', tone: 'tip', label: 'Extension challenge', text: 'Add a low-priority idle behavior that pauses when a higher-priority demo starts.' },
                  ],
                },
              ],
              completionSummary: { text: 'You protected a running behavior from being interrupted by a competing command.', conceptsUsed: ['Motion lock', 'Behavior priority', 'Safe cancellation'] },
            },
            {
              id: 'interactive-exchange', title: 'Interactive Exchange', kind: 'activity', difficulty: 'advanced', estimatedTime: '10–15 minutes',
              summary: 'A full state-machine interaction: accept, set aside, and hand back.',
              workspaceFile: 'ros2_ws/src/swayform_demos/interactive_exchange.py',
              relatedConcepts: ['State machines', 'enum.Enum'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'SwayForm accepts an item from you and gives another item back. The reference implementation uses a dollar-bill-to-snack example: you place a bill near the robot, it sets the bill aside, then presents a small snack item.' },
                    { type: 'callout', tone: 'safety', label: 'Classroom demo only', text: 'This demo assumes any received bill is a $1 bill and is only for supervised classroom interaction. It is not real payment processing or currency validation.' },
                    { type: 'p', text: 'The same state machine works for any give-one-item, get-one-item exchange — a token, a card, or a classroom object — the bill and snack are simply the reference example.' },
                    { type: 'heading', level: 3, text: 'Hardware used' },
                    { type: 'list', items: ['RealSense camera', 'Arm servos', 'Hand servos', 'Small tabletop object', 'Optional speaker'] },
                  ],
                },
                {
                  id: 'open-the-file', title: 'Open the Starter File',
                  blocks: [
                    { type: 'p', text: 'Interactive Exchange is a finished, working demo. Open it now.' },
                    { type: 'code', lang: 'python', filename: 'interactive_exchange.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\nclass ExchangeState(enum.Enum): ...\ndef wait_for_item(camera, timeout): ...\ndef run_exchange(motion, audio): ...', workspaceFile: 'ros2_ws/src/swayform_demos/interactive_exchange.py' },
                  ],
                },
                {
                  id: 'understand-the-exchangestate-enum', title: 'Understand the ExchangeState Enum',
                  blocks: [
                    { type: 'p', text: '`ExchangeState` names every stage of the interaction: `WAIT_FOR_ITEM`, `ACCEPT_ITEM`, `PLACE_ITEM_ASIDE`, `PICK_GIVE_ITEM`, `HAND_ITEM_TO_USER`, `RETURN_HOME`.' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: 'Using `enum.Enum` instead of plain strings prevents typos and lets you see the full sequence of states before the code ever runs.' },
                  ],
                },
                {
                  id: 'understand-the-state-machine-loop', title: 'Understand the while-Loop State Machine',
                  blocks: [
                    { type: 'p', text: '`run_exchange` drives a `while state != ExchangeState.RETURN_HOME:` loop. Each iteration handles one state — moving to a pose, setting a hand pose, an `audio.say(...)` checkpoint — then advances `state` to the next one. `print(f"State: {state.value}")` shows the state machine running live.' },
                    { type: 'p', text: 'As in Handshake, the `finally` block in `main()` releases the motion lock and returns the robot to idle even if an error interrupts mid-sequence — never leave a behavior lock open.' },
                  ],
                },
                {
                  id: 'try-changing-it', title: 'Try Changing It',
                  blocks: [
                    { type: 'list', items: [
                      'Change the given-back item.',
                      'Add a thank-you sound after `HAND_ITEM_TO_USER`.',
                      'Change `ITEM_WAIT_TIMEOUT` if no item is detected.',
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Use only light tabletop objects. This demo is for supervised classroom interaction, not real vending, payment, or unattended operation.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_demos interactive_exchange'] },
                    { type: 'p', text: 'Watch the terminal panel for the mocked run sequence, then move on when you are ready.' },
                  ],
                },
              ],
              completionSummary: { text: 'You read a full state-machine behavior, the same pattern behind most multi-step robot interactions.', conceptsUsed: ['State machines', 'enum.Enum', 'Timeouts'] },
            },
          ],
        },
      ],
    },

    // ============================================================ LEVEL 7
    {
      id: 'build-your-own', number: 7, title: 'Build Your Own',
      description: 'Combine everything into a behavior you design yourself.',
      sections: [
        {
          id: 'capstone', title: 'Capstone', difficulty: 'challenge', estimatedTime: '40–60 minutes',
          description: 'One open-ended challenge combining motion, timing, and optionally perception.',
          activities: [
            {
              id: 'mini-demo-challenge', title: 'Mini Demo Challenge', kind: 'activity', difficulty: 'challenge', estimatedTime: '40–60 minutes',
              summary: 'Design and build an original SwayForm behavior from scratch.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_10_mini_demo_challenge.py',
              relatedConcepts: ['Project planning', 'Code reuse', 'Debugging'],
              steps: [
                {
                  id: 'choose-a-demo-idea', title: 'Choose a Demo Idea',
                  blocks: [
                    { type: 'lead', text: 'Combine motion, timing, and optionally perception into a small custom robot demo — your own idea, built from everything you have learned so far.' },
                    { type: 'p', text: 'Sketch a short idea before opening the file: a greeting, a small game, a reaction to presence. Reuse at least one pattern from an earlier demo or lab — a pose sequence, a camera trigger, a countdown.' },
                  ],
                },
                {
                  id: 'pick-robot-parts', title: 'Pick Robot Parts',
                  blocks: [
                    { type: 'p', text: 'Decide which robot parts your demo will move — one arm, the head, the hand, the base — and keep the first version to the smallest set that tells your idea.' },
                  ],
                },
                {
                  id: 'start-from-the-safe-template', title: 'Start From the Safe Template',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_10_mini_demo_challenge.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\nMY_DEMO_SEQUENCE = [ ("right_arm", {...}), ("right_arm", {...}) ]\ndef build_my_demo(motion): ...', workspaceFile: 'ros2_ws/src/swayform_labs/lab_10_mini_demo_challenge.py' },
                    { type: 'callout', tone: 'note', label: "What's happening here?", text: '`# TODO: Replace this starter sequence with your own two-or-more-step demo idea. Reuse a pose pattern from an earlier lab if you\'d like.` `build_my_demo()` loops over `MY_DEMO_SEQUENCE`, where each entry is a `(joint_group, pose_dict)` tuple, and calls `motion.move_joint_group` on each one in turn.' },
                  ],
                },
                {
                  id: 'add-steps-and-timing', title: 'Add Steps and Timing',
                  blocks: [
                    { type: 'p', text: 'Replace `MY_DEMO_SEQUENCE` with your own list of `(joint_group, pose)` steps, and adjust `STEP_HOLD_SECONDS` — or vary the delay between individual steps — so the timing matches what you are trying to express.' },
                  ],
                },
                {
                  id: 'test-incrementally', title: 'Test Incrementally',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_10_mini_demo_challenge'] },
                    { type: 'p', text: 'Test one part of your sequence at a time rather than writing the whole thing before running anything — it is much faster to find which single step is wrong.' },
                  ],
                },
                {
                  id: 'prepare-an-explanation', title: 'Prepare an Explanation',
                  blocks: [
                    { type: 'p', text: 'What part of your demo was easiest to control, and what part needed the most debugging?' },
                    { type: 'callout', tone: 'tip', label: 'Extension challenge', text: 'Add camera input or user input to trigger the demo.' },
                  ],
                },
              ],
              completionSummary: { text: 'You designed and built an original SwayForm behavior from scratch, using skills from every level before this one.', conceptsUsed: ['Project planning', 'Code reuse', 'Debugging'] },
            },
          ],
        },
      ],
    },
  ],
};

/* ---- Small lookup helpers used by the Learn app views ---- */

export function flattenActivities(){
  const out = [];
  LEARNING_PATH.levels.forEach((level) => {
    level.sections.forEach((section) => {
      section.activities.forEach((activity) => {
        out.push({ level, section, activity });
      });
    });
  });
  return out;
}

export function findActivity(activityId){
  return flattenActivities().find((e) => e.activity.id === activityId) || null;
}

