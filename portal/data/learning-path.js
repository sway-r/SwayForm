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
      description: 'Get oriented, learn the safety rules, and understand the ROS 2 ideas behind SwayForm before you write any code.',
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
                    { type: 'callout', tone: 'safety', label: 'Next', text: 'Before you touch the robot, read Safety and Ground Rules — the next lesson.' },
                  ],
                },
              ],
              completionSummary: { text: 'You know what SwayForm teaches, how the Learning Path is organized, and how the workspace on the physical robot is laid out.', conceptsUsed: [] },
            },
            {
              id: 'safety-first', title: 'Safety and Ground Rules', kind: 'reading', estimatedTime: '8 minutes',
              summary: 'The one rule that matters most, what to do if something looks wrong, and the core safety checklist.',
              steps: [
                {
                  id: 'a-physical-robot', title: 'A Physical Robot, Not a Simulation',
                  blocks: [
                    { type: 'lead', text: 'SwayForm is designed for classroom robotics learning, but it is still a physical robot with real motors. Treat every moving part with care. For the full protected motion-control architecture and layered emergency-stop system, see the public Safety page and the Robot Safety and Acceptable Use Policy.' },
                    { type: 'callout', tone: 'safety', label: 'The one rule', text: 'Never touch SwayForm while it is powered, enabled, or moving.' },
                  ],
                },
                {
                  id: 'never-touch-a-moving-robot', title: 'Never Touch a Moving Robot',
                  blocks: [
                    { type: 'p', text: 'A servo holding a position or mid-motion is actively working to get where it was told to go. Pushing against it does not gently stop it — it fights back, and neither the servo nor your hand wins that.' },
                    { type: 'checklist', items: [
                      "Don't grab an arm or hold a moving finger still.",
                      "Don't manually reposition a powered joint.",
                      "Don't twist the head or the torso.",
                      "Don't physically resist the servos, even lightly.",
                      "Don't try to stop movement with your hands.",
                    ] },
                    { type: 'callout', tone: 'safety', label: 'If something goes wrong', text: 'Stop the program. Do not grab the robot.' },
                    { type: 'p', text: 'Powered off is different — you may be shown how to gently move a joint by hand for setup, but only when specifically instructed, and never while the robot could power on unexpectedly.' },
                  ],
                },
                {
                  id: 'safety-checklist', title: 'The Core Safety Checklist',
                  blocks: [
                    { type: 'p', text: 'These rules apply to every lesson and lab in the Learning Path, from your first motion command to the last Control lab.' },
                    { type: 'checklist', items: [
                      'Keep hands clear while a program or demo is running.',
                      'Stop the running program before repositioning objects near the robot.',
                      "Do not force the robot's arms, hands, head, or base by hand.",
                      'Trust the safe joint limits instead of testing values outside what a lesson gives you.',
                      'Keep tabletop objects light and easy to move.',
                      'Make sure the robot is stable before running arm or base motions.',
                      'If a motion looks wrong, stop the program before trying again.',
                      'Know where the power/servo cutoff is before running any program.',
                      'Never run a program on the physical robot without an instructor or supervisor present.',
                    ] },
                  ],
                },
              ],
              completionSummary: { text: 'You know the one rule that matters most — never touch a powered or moving robot — and the checklist behind it.', conceptsUsed: [] },
            },
            {
              id: 'how-the-hub-works', title: 'How the Learning Hub Works', kind: 'reading', estimatedTime: '8 minutes',
              summary: 'The loop you will use for every lesson, and why there is no submission or grading system.',
              steps: [
                {
                  id: 'the-loop', title: 'The Loop',
                  blocks: [
                    { type: 'lead', text: 'Every lesson and lab in this portal follows the same loop, whether you are reading your first page or writing your tenth Control lab.' },
                    { type: 'steps', items: [
                      '**Learn** — read a short explanation before you see any code.',
                      '**Write** — type a small, guided piece of a real program.',
                      '**Run** — send it to the robot (or the simulated run experience, where a live connection is not available yet).',
                      '**Observe** — watch what actually happens.',
                      '**Modify** — change one thing on purpose.',
                      '**Run Again** — see what changed, and why.',
                    ] },
                    { type: 'p', text: 'Later lessons open the same three-pane workspace — your instructions on the left, a real code editor and terminal on the right — every time.' },
                  ],
                },
                {
                  id: 'no-submission-system', title: 'There Is No Submission System',
                  blocks: [
                    { type: 'p', text: 'You will not submit assignments, upload work for grading, or wait for approval before you can try something. Marking a lesson complete just tracks where you are — it is not a submission, and nobody reviews it before you can move on.' },
                    { type: 'callout', tone: 'note', label: 'Completion is not submission', text: 'Finishing a lesson means the portal remembers you have seen it. It does not send anything anywhere.' },
                  ],
                },
                {
                  id: 'you-dont-need-to-memorize', title: 'You Do Not Need to Memorize Everything',
                  blocks: [
                    { type: 'p', text: 'Every lesson explains an idea before showing you the code pattern behind it, then gives you a small piece to write yourself. If you get stuck, a hint is always available, and the full solution is always one click away after that — using it is not cheating, it is part of how the loop works.' },
                    { type: 'callout', tone: 'tip', label: 'Key idea', text: "You are not expected to guess. You are expected to run things, watch what happens, and change them on purpose." },
                  ],
                },
              ],
              completionSummary: { text: 'You know the Learn → Write → Run → Observe → Modify → Run Again loop, and that nothing here is submitted or graded.', conceptsUsed: [] },
            },
          ],
        },
        {
          id: 'connect-to-robot', title: 'Connect to Your Robot', difficulty: null, estimatedTime: '25 minutes',
          description: 'Get your laptop talking to the robot and set up your own student project.',
          activities: [
            {
              id: 'connect-to-your-robot', title: 'Connect to Your Robot', kind: 'reading', estimatedTime: '6 minutes',
              summary: 'How your browser reaches the physical robot — no laptop setup required.',
              steps: [
                {
                  id: 'the-path-to-the-robot', title: 'The Path to the Robot',
                  blocks: [
                    { type: 'lead', text: 'Everything you do happens in this browser. You never install anything or set up a terminal on your own laptop.' },
                    { type: 'code', lang: 'text', filename: 'How a lesson reaches SwayForm', code: 'Your Browser\n     ↓\nSwayForm Learning Portal\n     ↓\nRobot Connection\n     ↓\nSwayForm' },
                    { type: 'p', text: 'The Learning Portal is where you read lessons, write code, and see output. The Robot Connection is the bridge between the portal and the physical robot in your classroom.' },
                  ],
                },
                {
                  id: 'robot-connection-status', title: 'Robot Connection — Coming Soon',
                  blocks: [
                    { type: 'callout', tone: 'note', label: 'Robot Connection — Coming Soon', text: 'The live browser-to-robot bridge is still being built. Until it is finished, Run shows a realistic simulated result instead of moving the physical robot, and demo/lab pages are clear about which one you are seeing.' },
                    { type: 'p', text: 'Nothing about this page is faked to look like a working connection — when it is ready, this lesson (and the Run button across the portal) will be updated to match.' },
                  ],
                },
                {
                  id: 'what-you-wont-need', title: "What You Won't Need",
                  blocks: [
                    { type: 'p', text: "You will not use SSH, VS Code's Remote-SSH, or any manual terminal login to reach the robot. Those are internal engineering tools, not part of how students work here." },
                    { type: 'checklist', items: [
                      'No SSH client or terminal setup on your laptop.',
                      'No VS Code installation or Remote-SSH configuration.',
                      'No manually typed hostnames, usernames, or passwords for the robot.',
                    ] },
                  ],
                },
              ],
              completionSummary: { text: 'You understand how the portal reaches the robot, and that you never need SSH or VS Code to do it.', conceptsUsed: [] },
            },
            {
              id: 'your-project-and-updates', title: 'Your Project and Robot Updates', kind: 'reading', estimatedTime: '5 minutes',
              summary: 'What your own work area will look like, and how the robot stays up to date.',
              steps: [
                {
                  id: 'your-own-work-area', title: 'Your Own Work Area',
                  blocks: [
                    { type: 'lead', text: "As you move further through the Learning Path, you'll get your own project space tied to your account — a place your in-progress code and progress live between sessions." },
                    { type: 'p', text: "Early lessons and Control labs work inside a shared, guided workspace. A fully open-ended project space — where you design something of your own from scratch — arrives later, in Create (Level 4)." },
                  ],
                },
                {
                  id: 'keeping-things-up-to-date', title: 'Keeping Things Up to Date',
                  blocks: [
                    { type: 'p', text: "SwayForm's software and this portal's lessons will both improve over time — new labs, fixes, and safety improvements. The website manages rolling those updates out; you don't need to manually update anything yourself." },
                    { type: 'callout', tone: 'note', label: 'Note', text: 'If a lesson or lab changes after you have started it, your progress on the parts that stayed the same is kept — only the parts that actually changed reset.' },
                  ],
                },
                {
                  id: 'for-now', title: 'For Now',
                  blocks: [
                    { type: 'p', text: 'Focus on the guided lessons and labs ahead of you. When your own project space is ready, this page will be the place that explains how to use it.' },
                  ],
                },
              ],
              completionSummary: { text: 'You know that your own project space and robot updates are handled by the portal, and are coming later in the path.', conceptsUsed: [] },
            },
          ],
        },
        {
          id: 'ros2-ideas', title: 'ROS 2 Ideas', difficulty: null, estimatedTime: '20 minutes',
          description: 'The small set of ROS 2 ideas you need before writing robot code.',
          activities: [
            {
              id: 'what-is-ros2', title: 'What Is ROS 2?', kind: 'reading', estimatedTime: '6 minutes',
              summary: 'Python is what you write. ROS 2 is how different robot programs talk to each other.',
              steps: [
                {
                  id: 'python-and-ros2', title: 'Python and ROS 2',
                  blocks: [
                    { type: 'lead', text: 'Almost everything you write in this portal is plain Python. ROS 2 is the layer underneath that lets separate robot programs — camera code, motion code, behavior code — send information to each other without being wired directly together.' },
                    { type: 'p', text: "Without something like ROS 2, every program would need to know exactly how every other program works. With it, a program just sends data out under a name, and any other program that cares can listen for it." },
                  ],
                },
                {
                  id: 'a-visual-example', title: 'A Visual Example',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'Camera to behavior', code: 'Camera\n   ↓\nROS 2\n   ↓\nVision Program\n   ↓\nROS 2\n   ↓\nRobot Behavior' },
                    { type: 'p', text: 'The camera program never talks to the behavior program directly — both talk through ROS 2. That separation is what lets you replace or restart one piece without breaking the others.' },
                  ],
                },
              ],
              completionSummary: { text: 'You know that Python is what you write, and ROS 2 is how robot programs talk to each other.', conceptsUsed: ['ROS 2'] },
            },
            {
              id: 'nodes-topics-pubsub', title: 'Nodes, Topics, Publishers, Subscribers', kind: 'reading', estimatedTime: '8 minutes',
              summary: 'The four ROS 2 ideas you actually need, and nothing more.',
              steps: [
                {
                  id: 'the-four-ideas', title: 'The Four Ideas',
                  blocks: [
                    { type: 'lead', text: 'ROS 2 has a lot of vocabulary. You only need four words to get started.' },
                    { type: 'terms', items: [
                      { term: 'Node', def: 'One running robot program.' },
                      { term: 'Topic', def: 'A named communication channel.' },
                      { term: 'Publisher', def: 'Sends data onto a topic.' },
                      { term: 'Subscriber', def: 'Receives, or listens for, data on a topic.' },
                    ] },
                    { type: 'callout', tone: 'tip', label: 'Key idea', text: 'You do not need to memorize this. You will learn it by using it.' },
                  ],
                },
                {
                  id: 'a-swayform-example', title: 'A SwayForm Example',
                  blocks: [
                    { type: 'p', text: 'When a lab tells the robot to wave, your program is a node. It publishes a motion request onto a topic. The motion controller — a separate node — subscribes to that same topic, receives the request, and moves the arm.' },
                    { type: 'p', text: "Your program never touches a servo directly. It just publishes what it wants, and the right node picks it up." },
                  ],
                },
              ],
              completionSummary: { text: 'You know what a node, topic, publisher, and subscriber are.', conceptsUsed: ['Node', 'Topic', 'Publisher', 'Subscriber'] },
            },
            {
              id: 'how-swayform-uses-ros2', title: 'How SwayForm Uses ROS 2', kind: 'reading', estimatedTime: '6 minutes',
              summary: 'The real shape of communication between SwayForm’s camera, perception, and motion.',
              steps: [
                {
                  id: 'the-big-picture', title: 'The Big Picture',
                  blocks: [
                    { type: 'lead', text: "SwayForm's own software follows the same camera-to-behavior shape you just saw, with real pieces in place of the generic labels." },
                    { type: 'code', lang: 'text', filename: 'SwayForm’s perception-to-motion path', code: 'RealSense Camera\n   ↓\nROS 2\n   ↓\nPerception Node\n   ↓\nROS 2\n   ↓\nMotion Controller\n   ↓\nRobot' },
                    { type: 'callout', tone: 'note', label: 'Honest note', text: "The exact node and topic names are part of the real robot software, and you will meet the ones that matter inside the labs that use them — not as a list to memorize now." },
                  ],
                },
              ],
              completionSummary: { text: 'You can picture how SwayForm’s camera, perception, and motion pieces talk to each other through ROS 2.', conceptsUsed: ['ROS 2', 'Nodes'] },
            },
          ],
        },
        {
          id: 'working-in-the-hub', title: 'Working in the Hub', difficulty: null, estimatedTime: '18 minutes',
          description: 'The practical loop for editing, running, and reading output inside a lesson.',
          activities: [
            {
              id: 'editing-and-running-python', title: 'Editing and Running Programs', kind: 'reading', estimatedTime: '6 minutes',
              summary: 'The website workflow for every lesson that involves code.',
              steps: [
                {
                  id: 'the-workflow', title: 'The Workflow',
                  blocks: [
                    { type: 'lead', text: 'Every code-based lesson works the same way, entirely inside the browser.' },
                    { type: 'steps', items: [
                      '**Open the lab** from your Learning Path.',
                      '**Edit the code** in the editor pane — usually just a small marked section.',
                      '**Run it** using the Run button in the toolbar.',
                      '**View the output** in the panel below.',
                      '**Watch the robot respond** — live once Robot Connection is available, simulated until then.',
                    ] },
                  ],
                },
                {
                  id: 'inside-a-lab', title: 'Inside a Lab',
                  blocks: [
                    { type: 'p', text: 'A lab opens a three-pane workspace: your instructions on the left, a file explorer and code editor in the middle, and a terminal/output panel on the right. Editable sections are clearly marked — you are never expected to write boilerplate you have not learned yet.' },
                    { type: 'callout', tone: 'note', label: 'Note', text: 'The portal starts the program for you when you press Run. You do not need to write a launch file to get started.' },
                  ],
                },
              ],
              completionSummary: { text: 'You know the Open → Edit → Run → Output → Respond loop used by every lab.', conceptsUsed: ['Edit-run loop'] },
            },
            {
              id: 'terminal-basics', title: 'Terminal Basics', kind: 'reading', estimatedTime: '5 minutes',
              summary: 'The handful of terminal ideas you actually need inside the portal.',
              steps: [
                {
                  id: 'what-youll-actually-use', title: "What You'll Actually Use",
                  blocks: [
                    { type: 'lead', text: 'The terminal panel is where a running program prints what it is doing. You need to recognize a few things, not master Linux.' },
                    { type: 'list', items: [
                      '**Run** starts your program and streams its output here.',
                      '**Stop** (Ctrl+C, or the Stop button) ends a running program safely.',
                      '**Output** is normal — lines telling you what the program is doing.',
                      '**Errors** usually point at a line number and a short message.',
                      '**Restart** just means Run again, after stopping the previous run.',
                    ] },
                  ],
                },
                {
                  id: 'an-example', title: 'An Example',
                  blocks: [
                    { type: 'terminal', lines: ['[INFO] Starting lab_01_finger_curl', '[INFO] Moving to safe start pose', '[INFO] Curling finger…', '[INFO] Done. Returning to rest.'] },
                    { type: 'callout', tone: 'note', label: 'Not a Linux course', text: 'You will never need file-system commands, permissions, or shell scripting to complete a lesson here.' },
                  ],
                },
              ],
              completionSummary: { text: 'You can read terminal output and know how to stop and restart a program.', conceptsUsed: ['Run', 'Stop', 'Output'] },
            },
            {
              id: 'navigating-the-workspace', title: 'Navigating SwayForm', kind: 'reading', estimatedTime: '5 minutes',
              summary: 'The main parts of the workspace you need to recognize — not the whole repository.',
              steps: [
                {
                  id: 'the-parts-you-need', title: 'The Parts You Need',
                  blocks: [
                    { type: 'p', text: "You don't need to memorize SwayForm's entire codebase. Inside a lab, you only need to recognize three panels — the file explorer, the code editor, and the terminal — and two kinds of folders: finished demos you read, and lab starter files you edit." },
                    { type: 'callout', tone: 'note', label: 'Note', text: "This page will be updated with the finalized workspace layout once it's published." },
                  ],
                },
              ],
              completionSummary: { text: 'You can find the file explorer, editor, and terminal inside a lab without help.', conceptsUsed: ['Workspace layout'] },
            },
          ],
        },
        {
          id: 'robot-configuration', title: 'Robot Configuration and Safety', difficulty: null, estimatedTime: '20 minutes',
          description: 'How SwayForm knows its own body, and how that keeps motion safe.',
          activities: [
            {
              id: 'meet-robot-yaml', title: 'Meet robot.yaml', kind: 'reading', estimatedTime: '8 minutes',
              summary: 'SwayForm’s map of its own body — where joint limits and centers live.',
              steps: [
                {
                  id: 'a-map-of-the-body', title: 'A Map of the Body',
                  blocks: [
                    { type: 'lead', text: "SwayForm keeps a single configuration file that describes every joint on the robot — think of it as SwayForm's map of its own body." },
                    { type: 'callout', tone: 'note', label: 'Illustrative example', text: "The example below shows the shape of a robot.yaml entry, not SwayForm's real calibration values." },
                    { type: 'code', lang: 'yaml', filename: 'robot.yaml (illustrative example)', code: '# Example structure only — not real SwayForm values\njoints:\n  example_joint:\n    board: right_arm\n    channel: 3\n    home: 90\n    min: 40\n    max: 140' },
                  ],
                },
                {
                  id: 'reading-an-entry', title: 'Reading an Entry',
                  blocks: [
                    { type: 'terms', items: [
                      { term: 'board', def: 'Which servo board controls this joint.' },
                      { term: 'channel', def: 'Which connection on that board this joint uses.' },
                      { term: 'home', def: 'The resting/center position for this joint.' },
                      { term: 'min / max', def: 'How far the joint is allowed to move in either direction.' },
                    ] },
                    { type: 'code', lang: 'text', filename: 'From file to motion', code: 'robot.yaml\n    ↓\nneck_pitch\n    ↓\nWhich board? Which channel?\nWhere is center? How far can it move?' },
                  ],
                },
                {
                  id: 'not-yours-to-edit-yet', title: 'Not Yours to Edit Yet',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: "You are not editing robot calibration at this stage. robot.yaml is a read-only reference for understanding how the robot is set up, not something a lesson asks you to change." },
                  ],
                },
              ],
              completionSummary: { text: 'You know what robot.yaml describes, and that it stays read-only for now.', conceptsUsed: ['robot.yaml', 'Joint limits'] },
            },
            {
              id: 'joint-commands-and-motion-safety', title: 'Joint Commands and Motion Safety', kind: 'reading', estimatedTime: '6 minutes',
              summary: 'Why your program never talks to a servo directly.',
              steps: [
                {
                  id: 'the-protected-path', title: 'The Protected Path',
                  blocks: [
                    { type: 'lead', text: 'A motion command you write passes through several protective layers before it ever reaches a motor.' },
                    { type: 'code', lang: 'text', filename: 'From your code to the motor', code: 'Student Program\n      ↓\nSwayForm Control Interface\n      ↓\nSafety Checks\n      ↓\nrobot.yaml Limits\n      ↓\nRobot Hardware' },
                  ],
                },
                {
                  id: 'why-the-layers-exist', title: 'Why the Layers Exist',
                  blocks: [
                    { type: 'p', text: "Your beginner programs call safe, named motion functions — never PCA9685, I2C, raw PWM, or GPIO directly. That lower-level hardware layer exists specifically to protect the robot: a typo in your program should never be able to send a dangerous signal straight to a motor." },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Every joint command you send is checked against the limits in robot.yaml before it can move anything.' },
                  ],
                },
              ],
              completionSummary: { text: 'You know your programs move the robot through safe motion functions, not raw hardware access.', conceptsUsed: ['Motion safety', 'Hardware abstraction'] },
            },
            {
              id: 'debugging-basics', title: 'Debugging Basics', kind: 'reading', estimatedTime: '6 minutes',
              summary: 'A simple checklist for when a program doesn’t do what you expected.',
              steps: [
                {
                  id: 'the-checklist', title: 'The Checklist',
                  blocks: [
                    { type: 'p', text: 'Most problems in a lab are answered by one of these questions.' },
                    { type: 'checklist', items: [
                      'Did my program actually run?',
                      'Is there an error message?',
                      'Did I type the name correctly?',
                      'Did the robot reject the command?',
                      'Is the movement outside its allowed range?',
                      'Did I stop the previous program before running this one?',
                    ] },
                  ],
                },
                {
                  id: 'reading-an-error', title: 'Reading an Error',
                  blocks: [
                    { type: 'terminal', lines: ['[ERROR] lab_02_nod_yes.py, line 14', "NameError: name 'HEAD_PITCH_UP' is not defined"] },
                    { type: 'p', text: "An error almost always names a file, a line number, and a short reason. Start there — in this example, a variable name was typed differently than it was defined." },
                  ],
                },
              ],
              completionSummary: { text: 'You have a simple checklist to work through when a program doesn’t behave as expected.', conceptsUsed: ['Debugging'] },
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
                  id: 'what-it-does', title: 'What It Does',
                  blocks: [
                    { type: 'lead', text: "SwayForm raises one arm and waves the wrist side to side — a short, deliberate greeting gesture built from a handful of joint targets and a loop." },
                  ],
                },
                {
                  id: 'what-to-watch', title: 'What to Watch',
                  blocks: [
                    { type: 'heading', level: 3, text: 'Hardware used' },
                    { type: 'list', items: ['Shoulder servo', 'Elbow servo', 'Wrist servo', 'Motion controller node'] },
                    { type: 'callout', tone: 'note', label: 'Expected behavior', text: 'The robot raises its right arm to a safe height, waves the wrist left and right three times, then returns to idle.' },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep hands clear of the arm while the demo is running.' },
                  ],
                },
                {
                  id: 'how-it-works', title: 'How It Works',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'The shape of every SwayForm gesture', code: 'idle\n  ↓\nraise arm to start pose\n  ↓\nwave wrist, repeat a few times\n  ↓\nreturn to idle' },
                    { type: 'p', text: 'Starting from a known position (idle) before raising the arm means the wave always starts from the same safe place, no matter what the robot was doing before. A `for` loop then turns one small wrist motion into a recognizable gesture — define one step, repeat it.' },
                    { type: 'p', text: '`motion.lock_behavior("wave_demo")` prevents another program from grabbing the same arm mid-wave, and the matching `unlock_behavior` in a `finally` block guarantees that lock always releases, even if something goes wrong.' },
                  ],
                },
                {
                  id: 'look-at-this-part', title: 'Look at This Part',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'wave_demo.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef move_to_wave_start(motion): ...\ndef perform_wave(motion, cycles): ...\ndef return_to_idle(motion): ...', workspaceFile: 'ros2_ws/src/swayform_demos/wave_demo.py' },
                    { type: 'p', text: 'Three functions, in order: move into position, perform the wave, return to idle. That shape — **setup → behavior → cleanup** — repeats in almost every SwayForm program you will write.' },
                  ],
                },
                {
                  id: 'safe-things-to-change', title: 'Safe Things to Change',
                  blocks: [
                    { type: 'list', items: [
                      'Change `WAVE_CYCLES` to wave more or fewer times.',
                      'Change `WAVE_DELAY_SECONDS` to make the wave faster or slower.',
                      'Try the left arm instead of the right arm.',
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Only change the values already defined at the top of the file. Do not test new shoulder or elbow angles outside the provided pose — stay inside tested ranges.' },
                  ],
                },
                {
                  id: 'try-it', title: 'Try It',
                  blocks: [
                    { type: 'p', text: 'Change `WAVE_CYCLES` to 1, predict how the gesture will feel, then run it and see if you were right.' },
                  ],
                },
                {
                  id: 'full-code', title: 'Full Code',
                  blocks: [
                    { type: 'p', text: 'Run the demo from the toolbar above, or open the file to read the complete, real source.' },
                    { type: 'terminal', lines: ['ros2 run swayform_demos wave_demo'] },
                    { type: 'p', text: 'Watch the terminal panel for the run sequence, then move on when you are ready.' },
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
                  id: 'what-it-does', title: 'What It Does',
                  blocks: [
                    { type: 'lead', text: 'SwayForm uses the RealSense camera to detect that a user is in front of it, moves its arm into a handshake pose, waits briefly, then returns to idle.' },
                    { type: 'callout', tone: 'note', label: 'Honest note', text: 'This is a vision-assisted classroom demo, not perfect hand detection or full human understanding. It uses simple user presence in an approximate interaction zone to trigger the behavior.' },
                  ],
                },
                {
                  id: 'what-to-watch', title: 'What to Watch',
                  blocks: [
                    { type: 'heading', level: 3, text: 'Hardware used' },
                    { type: 'list', items: ['RealSense camera', 'Arm servos', 'Optional hand servo', 'Motion node'] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep hands clear of the arm, and never grab it mid-motion — even during a handshake demo.' },
                  ],
                },
                {
                  id: 'how-it-works', title: 'How It Works',
                  blocks: [
                    { type: 'p', text: '`wait_for_user` polls `camera.user_in_interaction_zone()` every `0.1` seconds until it returns `True`, or until `DETECTION_TIMEOUT_SECONDS` (`10`) runs out. The robot should not wait forever — a timeout keeps the demo predictable: if no user is detected, `main()` prints a message and returns the robot to idle instead of hanging.' },
                    { type: 'p', text: '`run_handshake` then moves the right arm into `HANDSHAKE_POSE` — a controlled position, not a fast reach — holds it for `HANDSHAKE_HOLD_SECONDS` (`2.0`), then calls `motion.safe_pose("idle")`.' },
                  ],
                },
                {
                  id: 'look-at-this-part', title: 'Look at This Part',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'handshake_demo.py', code: '# Open the file to see the full, real source —\n# this preview intentionally shows only the shape.\n\ndef wait_for_user(camera, timeout): ...\ndef run_handshake(motion): ...', workspaceFile: 'ros2_ws/src/swayform_demos/handshake_demo.py' },
                    { type: 'p', text: 'As in Wave, `motion.lock_behavior("handshake_demo")` and the matching `unlock_behavior` in the `finally` block guarantee the lock always releases, even if something interrupts the script.' },
                  ],
                },
                {
                  id: 'safe-things-to-change', title: 'Safe Things to Change',
                  blocks: [
                    { type: 'list', items: [
                      'Change how long the robot holds the handshake pose.',
                      'Add a small head nod before the arm moves.',
                      'Adjust the detection timeout.',
                    ] },
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep the handshake motion slow and predictable. Do not make the arm snap toward the user.' },
                  ],
                },
                {
                  id: 'try-it', title: 'Try It',
                  blocks: [
                    { type: 'p', text: 'Change `HANDSHAKE_HOLD_SECONDS` and predict whether a longer hold feels more natural or less — then run it and check.' },
                  ],
                },
                {
                  id: 'full-code', title: 'Full Code',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_demos handshake_demo'] },
                    { type: 'p', text: 'Watch the terminal panel for the run sequence, then move on when you are ready.' },
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

    // ============================================================ CONTROL — LEVEL 1
    // Ten guided labs, in order: from moving one finger to combining
    // keyboard input across the whole robot. Every angle/timing value below
    // is an illustrative Python-level constant, in the same style already
    // used by the demos above — not a real robot.yaml calibration value.
    {
      id: 'control-level-1', number: 8, title: 'Control — Level 1',
      description: 'Ten guided labs: from moving one finger to combining keyboard input across the whole robot.',
      sections: [
        {
          id: 'first-movements', title: 'First Movements', difficulty: 'beginner', estimatedTime: '20–30 minutes',
          description: 'One joint, one sequence, one predictable motion at a time.',
          activities: [
            {
              id: 'finger-curl', title: 'Finger Curl', kind: 'activity', difficulty: 'beginner', estimatedTime: '15–20 minutes',
              summary: 'Your first robot-control program — curl one finger, then return it.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_01_finger_curl.py',
              relatedConcepts: ['Choosing a joint', 'Sending a movement', 'Waiting', 'Returning to start'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'A small program that curls one finger, holds it, then returns it to its starting position — the smallest possible robot-control program, and the shape every later lab builds on.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: 'A joint is just a name your program can send a target angle to. `time.sleep()` pauses your program so the servo has time to physically get there — Python can compute the next instruction almost instantly, but the arm cannot move instantly.' },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep your own fingers clear of the robot hand while this runs. Never hold a finger still while the program is moving it.' },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'Every joint-movement lab follows this shape', code: 'move to target angle\n  ↓\nwait for the servo to arrive\n  ↓\nmove back to the starting angle' },
                    { type: 'p', text: 'Move → wait → return. You will see this exact shape again in almost every lab from here on.' },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_01_finger_curl.py', code: 'FINGER_JOINT = "right_index_finger"\nSTART_ANGLE = 10\nCURL_ANGLE = 80\nHOLD_SECONDS = 1.0\n\ndef curl_finger(motion):\n    motion.move_joint(FINGER_JOINT, CURL_ANGLE)\n    time.sleep(HOLD_SECONDS)\n    # TODO: move FINGER_JOINT back to START_ANGLE', workspaceFile: 'ros2_ws/src/swayform_labs/lab_01_finger_curl.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Fill in the `# TODO` — send `FINGER_JOINT` back to `START_ANGLE` after the pause, using the same `motion.move_joint(...)` call you already saw above.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_01_finger_curl'] },
                    { type: 'p', text: 'You should see the finger curl inward, pause for about a second, then straighten back out.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['HOLD_SECONDS', 'Yes', 'The finger holds its curl for a shorter or longer time.'],
                      ['CURL_ANGLE', 'Yes, within the given range', 'The finger curls more or less.'],
                      ['FINGER_JOINT', 'No, not yet', 'Picks a different physical joint — save this for later labs.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Curl a second finger right after the first one, using the same three-line pattern.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'The return move uses the exact same function call as the curl — just with `START_ANGLE` instead of `CURL_ANGLE`.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_01_finger_curl.py', code: 'def curl_finger(motion):\n    motion.move_joint(FINGER_JOINT, CURL_ANGLE)\n    time.sleep(HOLD_SECONDS)\n    motion.move_joint(FINGER_JOINT, START_ANGLE)' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['A joint command is a name plus a target angle.', '`time.sleep()` gives hardware time to catch up with software.', 'Every motion has a shape: move, wait, return.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You sent your first real motion command and watched code become physical movement.', conceptsUsed: ['Joint commands', 'Timing', 'Safe return'] },
            },
            {
              id: 'nod-yes', title: 'Nod Yes', kind: 'activity', difficulty: 'beginner', estimatedTime: '15�20 minutes',
              summary: 'Make the head nod yes — a small sequence with two directions and a return to center.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_02_nod_yes.py',
              relatedConcepts: ['Sequences', 'Timing', 'Symmetric motion'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'A head-nod behavior: center, tilt down, tilt up, back to center — a short sequence instead of one single move.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: 'A sequence is just multiple joint commands run one after another, with a pause between each so every step is visible.' }
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: "Don't touch or twist the head while this program is running, even to help it along." },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'The nod sequence', code: 'center\n  ↓\ntilt down\n  ↓\ntilt up\n  ↓\ncenter' },
                    { type: 'p', text: 'Notice the shape is symmetric — the down and up angles are the same distance from center in opposite directions, which is what makes the motion read as a "nod" rather than a random head tilt.' },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_02_nod_yes.py', code: 'HEAD_PITCH = "head_pitch"\nCENTER = 0\nNOD_DOWN = -20\nNOD_UP = 20\nNOD_HOLD_SECONDS = 0.4\n\ndef nod_yes(motion):\n    motion.move_joint(HEAD_PITCH, NOD_DOWN)\n    time.sleep(NOD_HOLD_SECONDS)\n    # TODO: move HEAD_PITCH to NOD_UP, then wait NOD_HOLD_SECONDS\n    motion.move_joint(HEAD_PITCH, CENTER)', workspaceFile: 'ros2_ws/src/swayform_labs/lab_02_nod_yes.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Fill in the middle step — move `HEAD_PITCH` to `NOD_UP` and wait `NOD_HOLD_SECONDS`, matching the pattern of the line above it.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_02_nod_yes'] },
                    { type: 'p', text: 'You should see the head dip down, rise up past center, then settle back at center.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['NOD_HOLD_SECONDS', 'Yes', 'The nod feels slower or snappier.'],
                      ['NOD_DOWN / NOD_UP', 'Yes, within the given range', 'The nod feels bigger or smaller.'],
                      ['HEAD_PITCH', 'No, not yet', 'Targets a different joint entirely.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Wrap the whole nod in a loop so it nods twice in a row.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'Copy the line above it, then swap `NOD_DOWN` for `NOD_UP`.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_02_nod_yes.py', code: 'def nod_yes(motion):\n    motion.move_joint(HEAD_PITCH, NOD_DOWN)\n    time.sleep(NOD_HOLD_SECONDS)\n    motion.move_joint(HEAD_PITCH, NOD_UP)\n    time.sleep(NOD_HOLD_SECONDS)\n    motion.move_joint(HEAD_PITCH, CENTER)' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['A sequence is several moves in a row, each given time to complete.', 'Symmetric angles around center make motion read as intentional.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You built a short sequence out of multiple joint commands.', conceptsUsed: ['Sequences', 'Timing'] },
            },
            {
              id: 'timed-torso-rotation', title: 'Timed Torso Rotation', kind: 'activity', difficulty: 'beginner', estimatedTime: '15–20 minutes',
              summary: 'Rotate the torso through a predictable center → right → left → center sequence.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_03_timed_torso_rotation.py',
              relatedConcepts: ['Sequences', 'Pauses', 'Predictable motion'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'A torso rotation that always passes back through center: center, right, pause, left, pause, center.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: 'A pause between steps is not wasted time — it is what makes the motion readable instead of a blur.' },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Make sure the robot is stable and nothing is resting against the base before running any torso motion.' },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'The rotation sequence', code: 'center\n  ↓\nright\n  ↓  (pause)\nleft\n  ↓  (pause)\ncenter' },
                    { type: 'p', text: "Going right → left directly, without returning through center, is a much bigger and less predictable jump — that's why every step in this lab returns through a known position first." },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_03_timed_torso_rotation.py', code: 'TORSO_YAW = "torso_yaw"\nCENTER = 0\nROTATE_RIGHT = 30\nROTATE_LEFT = -30\nPAUSE_SECONDS = 0.6\n\ndef rotate_torso(motion):\n    motion.move_joint(TORSO_YAW, ROTATE_RIGHT)\n    time.sleep(PAUSE_SECONDS)\n    motion.move_joint(TORSO_YAW, ROTATE_LEFT)\n    # TODO: wait PAUSE_SECONDS, then move TORSO_YAW back to CENTER', workspaceFile: 'ros2_ws/src/swayform_labs/lab_03_timed_torso_rotation.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Fill in the `# TODO` — pause for `PAUSE_SECONDS`, then return `TORSO_YAW` to `CENTER`.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_03_timed_torso_rotation'] },
                    { type: 'p', text: 'You should see the torso swing right, pause, swing left, pause, then settle back at center.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['PAUSE_SECONDS', 'Yes', 'Longer or shorter pause between turns.'],
                      ['ROTATE_RIGHT / ROTATE_LEFT', 'Yes, within the given range', 'Bigger or smaller rotation.'],
                      ['TORSO_YAW', 'No, not yet', 'Targets a different joint entirely.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Add a second full right-pause-left-pause-center cycle after the first.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'You already have a `time.sleep(PAUSE_SECONDS)` line elsewhere in the file — the ending needs the same shape.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_03_timed_torso_rotation.py', code: 'def rotate_torso(motion):\n    motion.move_joint(TORSO_YAW, ROTATE_RIGHT)\n    time.sleep(PAUSE_SECONDS)\n    motion.move_joint(TORSO_YAW, ROTATE_LEFT)\n    time.sleep(PAUSE_SECONDS)\n    motion.move_joint(TORSO_YAW, CENTER)' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['Passing back through a known position keeps motion predictable.', 'Pauses are part of the design, not dead time.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You built a predictable rotation sequence that always returns through center.', conceptsUsed: ['Sequences', 'Pauses'] },
            },
          ],
        },
        {
          id: 'combining-motion', title: 'Combining Motion and Input', difficulty: 'beginner', estimatedTime: '30–40 minutes',
          description: 'Move more than one joint at once, then drive motion from the keyboard.',
          activities: [
            {
              id: 'basic-handshake', title: 'Basic Handshake', kind: 'activity', difficulty: 'beginner', estimatedTime: '15–20 minutes',
              summary: 'Combine two joints — bend the elbow and curl the fingers together.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_04_basic_handshake.py',
              relatedConcepts: ['Combining joints', 'Hand poses'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'A partial handshake motion: the elbow bends, then the hand closes. Just those two moves — no camera, no waiting for a person, no arm-raise. Full Handshake, later in this level, builds the complete version.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: '`motion.set_hand_pose(hand, pose_name)` moves every finger at once into a named pose, the same call the Handshake and Wave demos use — a hand pose is just a joint command for several finger joints together.' },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: "Never place your own hand where the robot's hand is closing." },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'p', text: "The elbow moves into position first, and only then does the hand close — closing the hand before the elbow finishes moving could catch something on the way." },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_04_basic_handshake.py', code: 'RIGHT_ELBOW = "right_elbow"\nELBOW_BEND = 60\nELBOW_START = 0\nHOLD_SECONDS = 1.5\n\ndef basic_handshake(motion):\n    motion.move_joint(RIGHT_ELBOW, ELBOW_BEND)\n    # TODO: close the hand — motion.set_hand_pose("right_hand", "gentle_close")\n    time.sleep(HOLD_SECONDS)\n    motion.set_hand_pose("right_hand", "open")\n    motion.move_joint(RIGHT_ELBOW, ELBOW_START)', workspaceFile: 'ros2_ws/src/swayform_labs/lab_04_basic_handshake.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Fill in the `# TODO` — call `motion.set_hand_pose("right_hand", "gentle_close")` right after the elbow bends.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_04_basic_handshake'] },
                    { type: 'p', text: 'You should see the elbow bend, the hand close, a short hold, then the hand open and the elbow return.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['HOLD_SECONDS', 'Yes', 'A shorter or longer handshake hold.'],
                      ['ELBOW_BEND', 'Yes, within the given range', 'A more or less bent elbow.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Try a different comfortable ELBOW_BEND angle and see how it changes the feel.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'Same call the Handshake demo used — just moved one line earlier, right after the elbow bend.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_04_basic_handshake.py', code: 'def basic_handshake(motion):\n    motion.move_joint(RIGHT_ELBOW, ELBOW_BEND)\n    motion.set_hand_pose("right_hand", "gentle_close")\n    time.sleep(HOLD_SECONDS)\n    motion.set_hand_pose("right_hand", "open")\n    motion.move_joint(RIGHT_ELBOW, ELBOW_START)' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['Combining joints means calling more than one motion command in the right order.', 'Order matters — position first, then grip.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You combined two joints into one small, ordered behavior.', conceptsUsed: ['Combining joints', 'Hand poses'] },
            },
            {
              id: 'keyboard-torso-control', title: 'Keyboard Torso Control', kind: 'activity', difficulty: 'intermediate', estimatedTime: '20–25 minutes',
              summary: 'Drive the torso left and right from live keyboard input, safely clamped.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_05_keyboard_torso_control.py',
              relatedConcepts: ['Keyboard input', 'Clamping', 'Safe limits'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'Press LEFT or RIGHT to rotate the torso a little each time, with the angle always kept inside a safe range no matter how many keys you press.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: '**Clamping** means forcing a number to stay between a minimum and a maximum: `max(min(value, MAX), MIN)`. It is the difference between a program that trusts its own math and one that trusts tested physical limits.' },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'This lab responds to your keypresses in real time — keep hands clear of the base while testing it.' },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'p', text: 'Every keypress nudges a stored `current_angle` by `TORSO_STEP`, in one direction or the other — the program never jumps straight to an arbitrary angle, only steps from where it already is.' },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_05_keyboard_torso_control.py', code: 'TORSO_YAW = "torso_yaw"\nTORSO_STEP = 10\nTORSO_MIN = -45\nTORSO_MAX = 45\nSTOP_KEY = "q"\n\ndef handle_key(motion, key, current_angle):\n    if key == "LEFT":\n        current_angle -= TORSO_STEP\n    elif key == "RIGHT":\n        current_angle += TORSO_STEP\n    # TODO: clamp current_angle between TORSO_MIN and TORSO_MAX\n    motion.move_joint(TORSO_YAW, current_angle)\n    return current_angle', workspaceFile: 'ros2_ws/src/swayform_labs/lab_05_keyboard_torso_control.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Fill in the `# TODO` — clamp `current_angle` using `max(min(current_angle, TORSO_MAX), TORSO_MIN)` before it gets sent to the joint.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_05_keyboard_torso_control'] },
                    { type: 'p', text: 'Press LEFT and RIGHT repeatedly. The torso should step further each time, then stop advancing once it hits the safe limit — instead of continuing past it. Press `q` to stop.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['TORSO_STEP', 'Yes', 'Bigger or smaller steps per keypress.'],
                      ['TORSO_MIN / TORSO_MAX', 'No, not yet', 'Changes the safe range itself — this stays fixed for now.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Add a center key ("c") that resets `current_angle` straight back to 0.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: '`max(min(x, MAX), MIN)` — the inner `min` keeps it from going too high, the outer `max` keeps it from going too low.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_05_keyboard_torso_control.py', code: 'def handle_key(motion, key, current_angle):\n    if key == "LEFT":\n        current_angle -= TORSO_STEP\n    elif key == "RIGHT":\n        current_angle += TORSO_STEP\n    current_angle = max(min(current_angle, TORSO_MAX), TORSO_MIN)\n    motion.move_joint(TORSO_YAW, current_angle)\n    return current_angle' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['Live input drives motion one small step at a time, not one big jump.', 'Clamping keeps software-level mistakes from becoming physical ones.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You wired live keyboard input to torso motion, kept safely inside range by clamping.', conceptsUsed: ['Keyboard input', 'Clamping', 'Safe limits'] },
            },
            {
              id: 'keyboard-head-control', title: 'Keyboard Head Control', kind: 'activity', difficulty: 'intermediate', estimatedTime: '20–25 minutes',
              summary: 'Drive head pitch and yaw from the keyboard for Yes/No-style control.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_06_keyboard_head_control.py',
              relatedConcepts: ['Keyboard input', 'Two independent axes'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'UP/DOWN tilts the head (pitch), LEFT/RIGHT turns it (yaw) — the same clamped-stepping idea as the last lab, applied to two joints instead of one.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: 'Pitch and yaw are two separate joints, so they need two separate current-angle variables — moving one should never reset the other.' },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: "Don't hold or twist the head while this program is responding to keys." },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'p', text: 'UP/DOWN only ever change `current_pitch`. LEFT/RIGHT only ever change `current_yaw`. Each is clamped and sent to its own joint independently.' },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_06_keyboard_head_control.py', code: 'HEAD_PITCH = "head_pitch"\nHEAD_YAW = "head_yaw"\nSTEP = 8\nPITCH_MIN, PITCH_MAX = -20, 20\nYAW_MIN, YAW_MAX = -35, 35\n\ndef handle_key(motion, key, current_pitch, current_yaw):\n    if key == "UP":\n        current_pitch = max(min(current_pitch + STEP, PITCH_MAX), PITCH_MIN)\n        motion.move_joint(HEAD_PITCH, current_pitch)\n    elif key == "DOWN":\n        current_pitch = max(min(current_pitch - STEP, PITCH_MAX), PITCH_MIN)\n        motion.move_joint(HEAD_PITCH, current_pitch)\n    # TODO: handle "LEFT" and "RIGHT" the same way, using current_yaw and HEAD_YAW\n    return current_pitch, current_yaw', workspaceFile: 'ros2_ws/src/swayform_labs/lab_06_keyboard_head_control.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Fill in the `# TODO` — add `elif` branches for `"LEFT"` and `"RIGHT"` that clamp and update `current_yaw`, mirroring the UP/DOWN branches above.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_06_keyboard_head_control'] },
                    { type: 'p', text: 'UP/DOWN should tilt the head, LEFT/RIGHT should turn it — and moving one axis should not disturb the other.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['STEP', 'Yes', 'Bigger or smaller movement per keypress.'],
                      ['PITCH_MIN/MAX, YAW_MIN/MAX', 'No, not yet', 'These stay fixed as the tested safe range.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Use a different STEP size for pitch than for yaw.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'Copy the UP/DOWN block, then swap `current_pitch`/`HEAD_PITCH`/`PITCH_MIN`/`PITCH_MAX` for their yaw equivalents.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_06_keyboard_head_control.py', code: 'def handle_key(motion, key, current_pitch, current_yaw):\n    if key == "UP":\n        current_pitch = max(min(current_pitch + STEP, PITCH_MAX), PITCH_MIN)\n        motion.move_joint(HEAD_PITCH, current_pitch)\n    elif key == "DOWN":\n        current_pitch = max(min(current_pitch - STEP, PITCH_MAX), PITCH_MIN)\n        motion.move_joint(HEAD_PITCH, current_pitch)\n    elif key == "LEFT":\n        current_yaw = max(min(current_yaw - STEP, YAW_MAX), YAW_MIN)\n        motion.move_joint(HEAD_YAW, current_yaw)\n    elif key == "RIGHT":\n        current_yaw = max(min(current_yaw + STEP, YAW_MAX), YAW_MIN)\n        motion.move_joint(HEAD_YAW, current_yaw)\n    return current_pitch, current_yaw' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['Independent joints need independent state.', 'The same clamped-stepping pattern scales to more than one axis.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You controlled two independent joints from the keyboard without them interfering with each other.', conceptsUsed: ['Keyboard input', 'Independent state'] },
            },
          ],
        },
        {
          id: 'full-behaviors', title: 'Full Behaviors', difficulty: 'intermediate', estimatedTime: '35–45 minutes',
          description: 'Command complete, recognizable behaviors directly through code — no camera yet.',
          activities: [
            {
              id: 'full-handshake', title: 'Full Handshake', kind: 'activity', difficulty: 'intermediate', estimatedTime: '15–20 minutes',
              summary: 'Command the complete handshake behavior directly, no camera involved.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_07_full_handshake.py',
              relatedConcepts: ['Setup → behavior → cleanup', 'finally blocks'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'The full handshake motion — raise the arm, bend the elbow, close the hand, hold, release, and return home — triggered directly by running your program, not by the camera.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: 'This is the same **setup → behavior → cleanup** shape you saw in the Wave demo, just with a bigger behavior in the middle.' },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep hands clear of the arm for the entire sequence, including the return-home step at the end.' },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'Setup → behavior → cleanup', code: 'raise arm\n  ↓\nclose hand, hold\n  ↓\nopen hand\n  ↓\nreturn arm home  ← always runs, even if something fails' },
                    { type: 'p', text: "Putting the return-home step inside a `finally` block guarantees it runs even if an earlier step raises an error — the robot should never get stuck mid-reach." },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_07_full_handshake.py', code: 'RIGHT_ARM_RAISED = {"right_shoulder": 45, "right_elbow": 60}\nRIGHT_ARM_HOME = {"right_shoulder": 0, "right_elbow": 0}\nHOLD_SECONDS = 1.5\n\ndef full_handshake(motion):\n    try:\n        motion.move_joint_group("right_arm", RIGHT_ARM_RAISED)\n        motion.set_hand_pose("right_hand", "gentle_close")\n        time.sleep(HOLD_SECONDS)\n        motion.set_hand_pose("right_hand", "open")\n    finally:\n        # TODO: return the arm home using motion.move_joint_group\n        pass', workspaceFile: 'ros2_ws/src/swayform_labs/lab_07_full_handshake.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Replace `pass` in the `finally` block with `motion.move_joint_group("right_arm", RIGHT_ARM_HOME)`, so the arm always returns home — even if something above it fails.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_07_full_handshake'] },
                    { type: 'p', text: 'You should see the full sequence: arm raises, hand closes, holds, opens, then the arm returns home.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['HOLD_SECONDS', 'Yes', 'A shorter or longer handshake hold.'],
                      ['RIGHT_ARM_RAISED angles', 'Yes, within the given range', 'A different raised-arm pose.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Add a small head nod right after the hand opens, before the arm returns home.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'Remember why Wave\'s cleanup mattered — the same call you used to raise the arm works to lower it, just with RIGHT_ARM_HOME instead.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_07_full_handshake.py', code: 'def full_handshake(motion):\n    try:\n        motion.move_joint_group("right_arm", RIGHT_ARM_RAISED)\n        motion.set_hand_pose("right_hand", "gentle_close")\n        time.sleep(HOLD_SECONDS)\n        motion.set_hand_pose("right_hand", "open")\n    finally:\n        motion.move_joint_group("right_arm", RIGHT_ARM_HOME)' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['A `finally` block guarantees cleanup runs no matter what happens above it.', 'Bigger behaviors are still just the same setup → behavior → cleanup shape.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You commanded the full handshake behavior directly through code, with guaranteed cleanup.', conceptsUsed: ['Setup → behavior → cleanup', 'finally blocks'] },
            },
            {
              id: 'wave-lab', title: 'Wave', kind: 'activity', difficulty: 'intermediate', estimatedTime: '15–20 minutes',
              summary: 'Write the repeating loop behind SwayForm’s wave yourself.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_08_wave.py',
              relatedConcepts: ['Loops', 'Repetition'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'You studied the Wave demo earlier — now you write the loop that makes the wrist actually wave, yourself, directly through code.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: 'Repeating a motion by copy-pasting the same two lines several times works, but a `for` loop says the same thing once and repeats it exactly as many times as you ask.' },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep hands clear of the arm for the whole wave, not just the first cycle.' },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'The problem with copy-paste', code: 'wave_once()\nwave_once()\nwave_once()' },
                    { type: 'code', lang: 'python', filename: 'The same thing, as a loop', code: 'for _ in range(WAVE_CYCLES):\n    wave_once()' },
                    { type: 'p', text: 'Both do the same thing, but the loop version changes its behavior just by changing `WAVE_CYCLES` — nothing else in the program has to move.' },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_08_wave.py', code: 'WAVE_CYCLES = 3\nWAVE_DELAY_SECONDS = 0.3\n\ndef wave_once(motion):\n    motion.move_joint("right_wrist", -20)\n    time.sleep(WAVE_DELAY_SECONDS)\n    motion.move_joint("right_wrist", 20)\n    time.sleep(WAVE_DELAY_SECONDS)\n\ndef wave(motion):\n    # TODO: call wave_once() WAVE_CYCLES times, using a for loop\n    pass', workspaceFile: 'ros2_ws/src/swayform_labs/lab_08_wave.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Replace `pass` in `wave()` with a `for` loop that calls `wave_once(motion)` `WAVE_CYCLES` times.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_08_wave'] },
                    { type: 'p', text: 'The wrist should wave back and forth `WAVE_CYCLES` times, then stop.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['WAVE_CYCLES', 'Yes', 'More or fewer waves.'],
                      ['WAVE_DELAY_SECONDS', 'Yes', 'A faster or slower wave.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Wave with the left arm instead of the right.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'This is the exact loop pattern from Understand the Pattern above — `for _ in range(WAVE_CYCLES):` then call `wave_once(motion)` on the indented line underneath.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_08_wave.py', code: 'def wave(motion):\n    for _ in range(WAVE_CYCLES):\n        wave_once(motion)' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['A `for` loop repeats an action without repeating code.', 'Loops make behavior tunable through one variable instead of many copy-pasted lines.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You wrote the loop behind a wave gesture yourself.', conceptsUsed: ['Loops', 'Repetition'] },
            },
            {
              id: 'rps-lab', title: 'Rock Paper Scissors', kind: 'activity', difficulty: 'intermediate', estimatedTime: '15–20 minutes',
              summary: 'A timed rock-paper-scissors reveal: ready, countdown, selected hand pose.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_09_rock_paper_scissors.py',
              relatedConcepts: ['Timing', 'Randomness'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: 'A timed reveal: the robot counts down, then shows a randomly chosen rock, paper, or scissors hand pose — no camera, no scoring against a person.' },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: "`random.choice(a_list)` picks one item from a list at random — call it again and you may get a different answer, which is exactly what makes this feel like a real choice each run." },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep hands well clear of the robot hand as it moves into its chosen pose.' },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'The reveal sequence', code: 'ready\n  ↓\ncountdown (3, 2, 1)\n  ↓\nselected hand pose' },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_09_rock_paper_scissors.py', code: 'CHOICES = ["rock", "paper", "scissors"]\nCOUNTDOWN_SECONDS = 1.0\n\ndef countdown():\n    for number in [3, 2, 1]:\n        print(number)\n        # TODO: pause COUNTDOWN_SECONDS after printing each number\n\ndef play(motion):\n    choice = random.choice(CHOICES)\n    countdown()\n    motion.set_hand_pose("right_hand", choice)\n    print(f"SwayForm chose: {choice}")', workspaceFile: 'ros2_ws/src/swayform_labs/lab_09_rock_paper_scissors.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Fill in the `# TODO` inside `countdown()` — add `time.sleep(COUNTDOWN_SECONDS)` after each printed number.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_09_rock_paper_scissors'] },
                    { type: 'p', text: 'You should see "3, 2, 1" print with a pause between each, then the hand move into a random pose.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['COUNTDOWN_SECONDS', 'Yes', 'A faster or slower countdown.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Run the program several times in a row and confirm the choice really does change.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: '`time.sleep(...)` is the same pause call you have used in every earlier lab — it belongs right after `print(number)`, still inside the loop.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_09_rock_paper_scissors.py', code: 'def countdown():\n    for number in [3, 2, 1]:\n        print(number)\n        time.sleep(COUNTDOWN_SECONDS)' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['random.choice() picks a different result from the same list each time you call it.', 'A countdown is just a loop with a pause inside it.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You built a timed random reveal using the same loop and pause ideas from earlier labs.', conceptsUsed: ['Timing', 'Randomness'] },
            },
          ],
        },
        {
          id: 'capstone', title: 'Capstone', difficulty: 'advanced', estimatedTime: '25–35 minutes',
          description: 'Combine everything from this level into one keyboard-driven behavior.',
          activities: [
            {
              id: 'combined-keyboard-control', title: 'Combined Keyboard Control', kind: 'activity', difficulty: 'advanced', estimatedTime: '25–35 minutes',
              summary: 'Control the head and torso from the keyboard at the same time — the Control Level 1 capstone.',
              workspaceFile: 'ros2_ws/src/swayform_labs/lab_10_combined_keyboard_control.py',
              relatedConcepts: ['Combining systems', 'Input routing'],
              steps: [
                {
                  id: 'what-youre-building', title: "What You're Building",
                  blocks: [
                    { type: 'lead', text: "This is not a graded submission — it's a challenge that combines Keyboard Torso Control and Keyboard Head Control into one program: W A S D moves the head, arrow keys move the torso." },
                    { type: 'heading', level: 3, text: 'What you need to know' },
                    { type: 'p', text: "Earlier labs both used the arrow keys. Combining them means giving the head its own set of keys (WASD) so the two systems never fight over the same key." },
                  ],
                },
                {
                  id: 'safety-before-running', title: 'Safety Before Running',
                  blocks: [
                    { type: 'callout', tone: 'safety', label: 'Safety', text: 'Two joints can now move from the same session — keep hands clear of both the head and the base while testing.' },
                  ],
                },
                {
                  id: 'understand-the-pattern', title: 'Understand the Pattern',
                  blocks: [
                    { type: 'code', lang: 'text', filename: 'Two independent systems, one router', code: 'W A S D  →  HEAD\nARROW KEYS  →  TORSO' },
                    { type: 'p', text: 'One function checks which set the pressed key belongs to, then hands it off to the matching handler — the head and torso code from the earlier labs barely change.' },
                  ],
                },
                {
                  id: 'build-it', title: 'Build It',
                  blocks: [
                    { type: 'code', lang: 'python', filename: 'lab_10_combined_keyboard_control.py', code: 'HEAD_KEYS = {"w", "a", "s", "d"}\nTORSO_KEYS = {"LEFT", "RIGHT"}\n\ndef handle_key(motion, key, state):\n    if key in HEAD_KEYS:\n        state["head"] = handle_head_key(motion, key, state["head"])\n    # TODO: add an elif for TORSO_KEYS that calls handle_torso_key(...)\n    return state', workspaceFile: 'ros2_ws/src/swayform_labs/lab_10_combined_keyboard_control.py' },
                  ],
                },
                {
                  id: 'your-turn', title: 'Your Turn',
                  blocks: [
                    { type: 'p', text: 'Add an `elif key in TORSO_KEYS:` branch that calls `handle_torso_key(motion, key, state["torso"])` and stores the result back into `state["torso"]`, mirroring the head branch above it.' },
                  ],
                },
                {
                  id: 'run-it', title: 'Run It',
                  blocks: [
                    { type: 'terminal', lines: ['ros2 run swayform_labs lab_10_combined_keyboard_control'] },
                    { type: 'p', text: 'WASD should move the head, arrow keys should move the torso, and using one should never disturb the other.' },
                  ],
                },
                {
                  id: 'try-changing-this', title: 'Try Changing This',
                  blocks: [
                    { type: 'table', headers: ['Thing', 'Safe to change?', 'What happens'], rows: [
                      ['Step sizes in either handler', 'Yes', 'Faster or slower response per key.'],
                    ] },
                    { type: 'callout', tone: 'note', label: 'Challenge', text: 'Add a single "0" key that centers both the head and the torso at once.' },
                  ],
                },
                {
                  id: 'need-help', title: 'Need Help?',
                  blocks: [
                    { type: 'reveal', hint: 'You only need `if key in HEAD_KEYS:` / `elif key in TORSO_KEYS:` — checking a key against a set is enough, no long if/elif chain of individual keys required.', solution: { text: 'The completed function:', code: { lang: 'python', filename: 'lab_10_combined_keyboard_control.py', code: 'def handle_key(motion, key, state):\n    if key in HEAD_KEYS:\n        state["head"] = handle_head_key(motion, key, state["head"])\n    elif key in TORSO_KEYS:\n        state["torso"] = handle_torso_key(motion, key, state["torso"])\n    return state' } } },
                  ],
                },
                {
                  id: 'what-you-learned', title: 'What You Learned',
                  blocks: [
                    { type: 'list', items: ['Combining two working systems is mostly about routing input, not rewriting either one.', 'Giving each system its own keys avoids collisions on purpose, by design.', 'Every idea from this level — sequences, loops, clamping, hand poses, finally blocks — shows up again here.'] },
                  ],
                },
              ],
              completionSummary: { text: 'You combined independent keyboard-controlled systems into one program — the Control Level 1 capstone.', conceptsUsed: ['Combining systems', 'Input routing'] },
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

