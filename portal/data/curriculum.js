// SwayForm Learning Portal — curriculum data.
// Ported from the old Learning Hub static pages (learning-hub/*.html) into the
// desktop-metaphor Learning Portal's block schema. Pure data, no functions.

export const CURRICULUM = {
  id: 'robotics-fundamentals',
  title: 'SwayForm Robotics Fundamentals',
  chapters: [
    // ------------------------------------------------------------------
    // CHAPTER 1: Start Here
    // ------------------------------------------------------------------
    {
      id: 'start-here',
      title: 'Start Here',
      lessons: [
        {
          id: 'getting-started',
          title: 'Getting Started',
          status: 'ready',
          blocks: [
            { type: 'lead', text: 'SwayForm is built around the idea that robotics makes more sense when students can see code turn into physical motion. This page covers what the platform teaches, how students use the hub day to day, and how the files are organized.' },

            { type: 'heading', level: 2, text: 'What SwayForm Teaches', id: 'what-teaches' },
            { type: 'p', text: '**Programming through robot behavior.** Students use Python to define poses, trigger motions, adjust timing, and create behavior sequences — code that moves a physical system, not just a terminal.' },
            { type: 'p', text: '**ROS 2-style system thinking.** The hub introduces nodes, topics, publishers, subscribers, services, launch files, and motion commands through SwayForm examples, not abstract definitions.' },
            { type: 'p', text: '**Motion and safe control.** Robot joints cannot be commanded randomly. Every motion respects safe limits, timing, physical spacing, and the difference between smooth and unsafe movement.' },
            { type: 'p', text: '**Vision and interaction.** SwayForm uses a RealSense camera for demos and labs that connect perception to behavior — simple user detection and target zones, without pretending the robot has perfect human-level understanding.' },
            { type: 'p', text: '**Debugging real systems.** Students learn to read terminal output, check whether a process is running, source a workspace, stop a motion safely, and understand why hardware may not behave exactly as expected.' },
            { type: 'callout', tone: 'note', label: 'Key idea', text: 'SwayForm teaches robotics as a connected system: code, motion, sensors, timing, safety, and debugging all working together.' },

            { type: 'heading', level: 2, text: 'How Students Use This Hub', id: 'how-students' },
            { type: 'p', text: 'The Learning Hub is meant to be used directly by students. A teacher or club lead introduces the activity, but students should be able to open the hub, follow the steps, and understand what they are changing.' },
            { type: 'steps', items: [
              '**Open the Learning Hub.** Students begin here instead of searching through the public website.',
              '**Connect to the robot.** Students use VS Code and SSH to open the shared robot workspace from their laptop.',
              '**Run a provided demo.** The first step is usually running a finished demo, such as Wave or Handshake.',
              '**Read the walkthrough.** Each ready demo includes a code walkthrough explaining what the script does and what hardware is involved.',
              '**Modify a small part.** Students change one controlled part of the code — a delay value, a target angle, a pose name.',
              '**Complete a guided lab.** Labs ask students to edit code, test a result, answer a reflection question, and try an extension challenge.',
              '**Submit for execution.** Finished code goes through the validation queue and instructor approval — see Classroom Workflow.',
            ] },
            { type: 'callout', tone: 'tip', label: 'Important', text: 'Students should not be guessing randomly. The hub is designed to move them from running code, to reading code, to editing code, to designing behavior.' },

            { type: 'heading', level: 2, text: 'File Structure', id: 'file-structure' },
            { type: 'p', text: 'SwayForm examples are organized so students can tell the difference between official demo programs, editable lab files, and their own project code.' },
            { type: 'code', lang: 'bash', filename: 'Example demo folder', code: '~/ros2_ws/src/swayform_demos/\n├── wave_demo.py\n├── handshake_demo.py\n├── pick_and_place.py\n├── rock_paper_scissors.py\n└── interactive_exchange.py' },
            { type: 'code', lang: 'bash', filename: 'Example lab folder', code: '~/ros2_ws/src/swayform_labs/\n├── lab_01_hello_motion.py\n├── lab_02_servo_limits.py\n├── lab_03_gesture_sequence.py\n├── lab_04_head_tracking.py\n├── lab_05_button_motion.py\n├── lab_06_realsense_detection.py\n├── lab_07_hand_pose_timing.py\n├── lab_08_base_rotation.py\n├── lab_09_motion_locking.py\n└── lab_10_mini_demo_challenge.py' },
            { type: 'p', text: "Student-authored work lives in a separately named project folder created with the SwayForm project tool — see Student Projects." },

            { type: 'heading', level: 2, text: 'Recommended editing rule' },
            { type: 'p', text: 'Students should not rewrite official demos during the first session. Run the demo first, read the code, then copy the important idea into a lab file or a new student project.' },
          ],
        },

        {
          id: 'classroom-workflow',
          title: 'Classroom Workflow',
          status: 'ready',
          blocks: [
            { type: 'lead', text: 'Students write real ROS 2 code, but they never send commands straight to the motors. Every submission moves through the same protected path before the robot moves.' },

            { type: 'list', items: [
              '1. Lesson intro',
              '2–4. Learning Hub + code',
              '5–6. SSH + project',
              '7–8. Submit + validate',
              '9–10. Instructor review',
              '11–14. Run + revise',
            ] },

            { type: 'heading', level: 2, text: 'The full sequence' },
            { type: 'steps', items: [
              'The instructor introduces the lesson or objective.',
              'Students open the free Learning Hub.',
              'Students follow the lesson explanation and examples in a demo or lab.',
              'Students connect to the Raspberry Pi through SSH using the shared student environment.',
              'Students create a named ROS 2 project using the SwayForm project-creation tool.',
              'The tool generates the appropriate folder structure and starter files.',
              'Students modify a partially completed lab template, or write their own program.',
              'Students submit their program to the SwayForm execution queue.',
              'The system performs automated validation — syntax, build, and safety checks.',
              'The instructor reviews the program and its source code.',
              'The instructor approves or rejects the submission, with feedback if needed.',
              'An approved program sends requests through the protected motion-control system.',
              'The robot performs the approved behavior.',
              'Students observe, debug, revise, and resubmit.',
            ] },

            { type: 'callout', tone: 'safety', label: 'What this is not', text: 'A student does not press Run and immediately control the hardware. Nothing reaches a motor without passing through validation, the queue, and instructor approval first — see the public Safety page for the full protected motion-control architecture.' },

            { type: 'heading', level: 2, text: 'Why the queue exists' },
            { type: 'p', text: 'Because the review step is real, instructors do not need to watch every keystroke. They review the source once, before it can move the robot, which keeps the classroom open for real experimentation without needing constant supervision of the code itself — physical supervision of the robot is still required, see Safety Notes.' },
          ],
        },

        {
          id: 'safety-notes',
          title: 'Safety Notes',
          status: 'ready',
          blocks: [
            { type: 'lead', text: 'SwayForm is designed for classroom robotics learning, but it is still a physical robot. Students should treat every moving part with care. For the full protected motion-control architecture and layered emergency-stop system, see the public Safety page and the Robot Safety and Acceptable Use Policy.' },

            { type: 'callout', tone: 'safety', label: 'Safety', text: 'The goal of the labs is controlled learning, not seeing how far the robot can be pushed.' },

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

            { type: 'heading', level: 2, text: 'Why review happens before motion' },
            { type: 'p', text: 'Every program a student writes is validated and instructor-approved before it can move the robot — see Classroom Workflow. That review step exists specifically so unsafe or malformed code is caught before it ever reaches a motor.' },
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // CHAPTER 2: Setup
    // ------------------------------------------------------------------
    {
      id: 'setup',
      title: 'Setup',
      lessons: [
        {
          id: 'setup-vscode',
          title: 'VS Code, Running & Stopping',
          status: 'ready',
          blocks: [
            { type: 'lead', text: 'Students use VS Code and SSH so they can work with the robot like a real development system. Code runs on the robot, but students edit and launch it from their own laptop.' },

            { type: 'heading', level: 2, text: 'Why VS Code and SSH' },
            { type: 'p', text: "SSH lets a laptop open a secure terminal session on the robot's Raspberry Pi. VS Code adds a familiar editor, file browser, and terminal on top of that connection, so students can open the robot workspace, inspect files, edit code, and run commands without switching tools constantly. Account-level detail is covered in SSH & Student Accounts." },

            { type: 'heading', level: 2, text: 'Example connection' },
            { type: 'terminal', lines: ['ssh student@swayform.local'] },

            { type: 'heading', level: 2, text: 'Open and source the workspace' },
            { type: 'terminal', lines: ['cd ~/ros2_ws', 'source install/setup.bash'] },
            { type: 'callout', tone: 'note', label: 'Note', text: 'These commands are example defaults. The exact hostname, username, or workspace path can be adjusted for the final classroom image.' },

            { type: 'heading', level: 2, text: 'Connecting to the robot — before you run anything' },
            { type: 'steps', items: [
              '**Power on the robot.** Make sure it is stable. Do not place hands or objects near the arms while software is starting.',
              '**Connect to the correct network.** Laptop and robot need to be able to see each other.',
              '**Open VS Code** and use Remote-SSH to open a terminal and file browser on the robot.',
              '**Open the workspace** at `~/ros2_ws`, where demos, labs, and student projects live.',
              '**Run a safe demo first** — start with Wave, the simplest one.',
            ] },

            { type: 'heading', level: 2, text: 'Running a demo' },
            { type: 'terminal', lines: ['cd ~/ros2_ws', 'source install/setup.bash', 'ros2 run swayform_demos wave_demo'] },
            { type: 'p', text: 'Before running: confirm the robot is stable, the table area is clear, no one is holding an arm, the correct demo command is being used, and the previous behavior has fully stopped.' },

            { type: 'heading', level: 2, text: 'Stopping motion safely' },
            { type: 'p', text: 'Students should know how to stop a behavior before they start changing code — a safe stop is part of the normal workflow, not an emergency-only action.' },
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

        {
          id: 'ssh-accounts',
          title: 'SSH & Student Accounts',
          status: 'ready',
          blocks: [
            { type: 'lead', text: "SwayForm is planned to use two Linux access levels on the Raspberry Pi: a shared student account, and an administrator account for the instructor." },

            { type: 'heading', level: 2, text: 'The shared student account' },
            { type: 'p', text: 'Students connect through a shared student SSH account. Instead of separate logins per student, everyone in a class reaches the same account and then creates a separately named project — see Student Projects — using a guided command-line tool.' },
            { type: 'terminal', lines: ['ssh student@swayform.local'] },
            { type: 'callout', tone: 'warn', label: 'What this is and is not', text: 'Because every student project lives under one shared Linux account, this does not provide true operating-system-level isolation between students. Project names and optional project passwords are a SwayForm classroom-organization feature — they discourage accidental modification and help students find their own work again. They are not a security boundary against a technically advanced student with access to the same shared filesystem, and ROS 2 itself has no concept of a "password-protected package."' },

            { type: 'heading', level: 2, text: 'The administrator account' },
            { type: 'p', text: 'The instructor holds an administrator account with elevated privileges. From it, an instructor can:' },
            { type: 'list', items: [
              'View every queued student submission',
              'Identify the student or team',
              'Open and review submitted source code',
              'Review automated validation results',
              'Approve or reject a submission, with feedback',
              'Start or stop approved code',
              'Access system configuration and manage protected services',
              'Maintain the robot',
            ] },
            { type: 'p', text: 'See Validation & Queue for how a submission moves from student account to instructor review to the robot.' },
          ],
        },

        {
          id: 'student-projects',
          title: 'Student Projects',
          status: 'ready',
          blocks: [
            { type: 'lead', text: 'Instead of hand-building a ROS 2 package structure from scratch, students create a named project using the SwayForm project-creation tool, which generates the right folders and starter files automatically.' },

            { type: 'heading', level: 2, text: 'Creating a project' },
            { type: 'p', text: 'The command-line tool asks a short set of questions:' },
            { type: 'list', items: [
              'Project name',
              'Student or team identifier',
              'Optional project password',
              'Selected lab or starter template',
            ] },
            { type: 'code', lang: 'bash', filename: 'bash — example session', code: '$ swayform-new-project\nProject name: gesture-club-team3\nStudent or team ID: team3\nOptional project password: ********\nStarter template (blank / lab-01 / lab-03 / demo-wave): lab-03\n\nCreated ~/ros2_ws/src/gesture-club-team3/\n  ├── package.xml\n  ├── setup.py\n  ├── gesture_club_team3/\n  │   └── main.py\n  └── PROJECT_INFO.txt' },

            { type: 'heading', level: 2, text: 'What gets generated' },
            { type: 'list', items: [
              'A standard ROS 2 package structure',
              'Starter Python files, matching the chosen template',
              'Partially completed exercises, comments, and instructions where the template is a lab',
              'Required configuration (package.xml, setup.py)',
              'Submission metadata used later by the validation queue',
            ] },

            { type: 'callout', tone: 'warn', label: 'About project passwords', text: 'An optional project password is a SwayForm classroom-organization feature that helps a student or team find and protect their own project and discourages accidental changes by someone else. ROS 2 itself has no concept of password-protected packages, and because every project lives on one shared Linux account, a password here is not a real security boundary — see SSH & Student Accounts.' },

            { type: 'heading', level: 2, text: 'Working in your project' },
            { type: 'p', text: 'Open your generated folder in VS Code, edit `main.py` (or the files listed in `PROJECT_INFO.txt`), and test locally before submitting. When ready, submit through the queue rather than running against the physical robot directly — see Validation & Queue.' },
          ],
        },

        {
          id: 'validation-queue',
          title: 'Validation & Queue',
          status: 'ready',
          blocks: [
            { type: 'lead', text: 'Students write real ROS 2 code. SwayForm checks and queues each submission so an instructor can review the source before allowing it to move the robot.' },

            { type: 'heading', level: 2, text: 'What gets checked automatically' },
            { type: 'p', text: 'Before a submission reaches an instructor, it runs through automated checks. The list below reflects planned architecture — some checks are further along than others, and none of this replaces instructor review.' },
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
            { type: 'callout', tone: 'note', label: 'Honest note', text: 'These are planned checks, not a claim of complete behavioral simulation or a guarantee that every approved program is perfectly safe. Physical limits are still enforced by the protected motion-control node regardless of what the queue catches — see the public Safety page.' },

            { type: 'heading', level: 2, text: 'What the queue interface shows' },
            { type: 'p', text: 'The queue is meant to give an instructor everything needed to make a fast, informed decision:' },
            { type: 'list', items: [
              'Student or team name and project name',
              'Requested program',
              'Submission time and queue position',
              'Build status and validation status',
              'Error messages, if any',
              'Instructor decision and current execution status',
            ] },

            { type: 'heading', level: 2, text: 'Instructor review' },
            { type: 'p', text: 'The instructor opens a queued submission, reads the source, checks the validation results, and approves or rejects it. A rejection can include feedback so the student can fix the issue and resubmit. Only an approved submission can send requests through the protected motion-control system — see Classroom Workflow for the full sequence.' },
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // CHAPTER 3: Demo Code Library
    // ------------------------------------------------------------------
    {
      id: 'demos',
      title: 'Demo Code Library',
      lessons: [
        {
          id: 'demo-wave',
          title: 'Wave',
          level: 'beginner',
          time: '5–10 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_demos/wave_demo.py',
          blocks: [
            { type: 'lead', text: 'The robot performs a coordinated greeting gesture: one arm raises and the wrist waves side to side using a timed servo sequence. The behavior is simple on purpose, so students can clearly see how a few target positions become a physical gesture.' },

            { type: 'heading', level: 2, text: 'What it does' },
            { type: 'p', text: 'Students learn how a script can move a joint group, pause between poses, repeat a motion, and return the robot to a neutral position.' },

            { type: 'heading', level: 2, text: 'Hardware used' },
            { type: 'list', items: ['Shoulder servo', 'Elbow servo', 'Wrist servo', 'Motion controller node'] },

            { type: 'heading', level: 2, text: 'Concepts covered' },
            { type: 'list', items: ['Joint targets', 'Servo angles', 'Timed motion', 'Smooth movement', 'Safe limits', 'Running a script from terminal'] },

            { type: 'heading', level: 2, text: 'Run command' },
            { type: 'terminal', lines: ['ros2 run swayform_demos wave_demo'] },

            { type: 'heading', level: 2, text: 'Starter code' },
            { type: 'code', lang: 'python', filename: 'wave_demo.py', code: '# see ros2_ws/src/swayform_demos/wave_demo.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_demos/wave_demo.py' },

            { type: 'heading', level: 2, text: 'Code walkthrough' },
            { type: 'list', items: [
              '**Student-adjustable settings:** The values at the top are the safest place for beginners to start experimenting. Students can change the number of wave cycles or the delay without rewriting the entire behavior.',
              '**Wave start pose:** The robot moves to idle first, then raises the arm. This prevents the wave from starting from an unknown or awkward position.',
              '**Wave loop:** The loop repeats the same wrist movement several times. This shows how a small repeated motion can become a recognizable gesture.',
              '**Return to idle:** Every demo should end by returning to a known safe pose. This makes the next test easier and safer.',
              '**Motion lock:** The motion lock prevents another behavior from trying to control the same robot parts while the wave is running.',
            ] },

            { type: 'heading', level: 2, text: 'Try changing this' },
            { type: 'list', items: [
              'Change the number of wave cycles.',
              'Make the wave slower or faster.',
              'Try the left arm instead of the right arm.',
              'Add a small head turn during the wave.',
            ] },

            { type: 'callout', tone: 'safety', label: 'Safety', text: 'Do not test random shoulder or elbow angles. Use the provided safe ranges and return to idle before trying a new version.' },
            { type: 'callout', tone: 'tip', label: 'Next step', text: 'After running Wave, open Lab 01: Hello Robot Motion.' },
          ],
        },

        {
          id: 'demo-handshake',
          title: 'Handshake',
          level: 'beginner-plus',
          time: '10–15 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_demos/handshake_demo.py',
          blocks: [
            { type: 'lead', text: 'The robot uses the RealSense camera to detect that a user is in front of it, moves its arm into a handshake pose, waits briefly, and then returns to idle.' },

            { type: 'callout', tone: 'note', label: 'Honest note', text: 'This is a vision-assisted classroom demo. It should not be described as perfect hand detection or full human understanding. The first version uses simple user presence in an approximate interaction zone while students learn how perception can start a behavior.' },

            { type: 'heading', level: 2, text: 'What students learn' },
            { type: 'p', text: 'Students learn how camera input can trigger robot motion and why robots need conservative movement when interacting near people.' },

            { type: 'heading', level: 2, text: 'Hardware used' },
            { type: 'list', items: ['RealSense camera', 'Arm servos', 'Optional hand servo', 'Motion node'] },

            { type: 'heading', level: 2, text: 'Concepts covered' },
            { type: 'list', items: ['RealSense camera input', 'User presence detection', 'Perception-triggered behavior', 'Human-robot interaction', 'Motion locking', 'Returning to neutral pose'] },

            { type: 'heading', level: 2, text: 'Run command' },
            { type: 'terminal', lines: ['ros2 run swayform_demos handshake_demo'] },

            { type: 'heading', level: 2, text: 'Starter code' },
            { type: 'code', lang: 'python', filename: 'handshake_demo.py', code: '# see ros2_ws/src/swayform_demos/handshake_demo.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_demos/handshake_demo.py' },

            { type: 'heading', level: 2, text: 'Code walkthrough' },
            { type: 'list', items: [
              '**Detection timeout:** The robot should not wait forever. A timeout keeps the demo predictable and helps students understand that robot behaviors need exit conditions.',
              '**wait_for_user:** This function checks the camera repeatedly until a user is detected or the timeout ends. Students can adjust the detection distance later.',
              '**Handshake pose:** The handshake pose is a controlled arm position, not a fast reach. Human-facing demos should move slowly and conservatively.',
              '**Failure path:** If no user is detected, the robot does nothing dramatic. It prints a message and stays safe.',
              '**finally block:** The `finally` block makes sure the robot unlocks the behavior and returns to idle even if something interrupts the script.',
            ] },

            { type: 'heading', level: 2, text: 'Try changing this' },
            { type: 'list', items: [
              'Change how long the robot holds the handshake pose.',
              'Add a small head nod before the arm moves.',
              'Add a spoken prompt if speakers are connected.',
              'Adjust the detection distance.',
            ] },

            { type: 'callout', tone: 'safety', label: 'Safety', text: 'Keep the handshake motion slow and predictable. Do not make the arm snap toward the user.' },
            { type: 'callout', tone: 'tip', label: 'Next step', text: 'After Handshake, try Lab 06: RealSense Detection Basics.' },
          ],
        },

        {
          id: 'demo-pick-and-place',
          title: 'Pick and Place',
          level: 'beginner-plus',
          time: '15–20 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_demos/pick_and_place.py',
          blocks: [
            { type: 'lead', text: 'The robot reaches to a fixed pickup zone, closes its hand around a light object, lifts it, moves to a separate place zone, and releases it. This is the same category of task — sense, reach, grasp, transport, release — behind pick-and-place work in real manufacturing and warehouse robotics.' },

            { type: 'callout', tone: 'note', label: 'Honest note', text: 'The pickup and place positions in this version are fixed, tested poses rather than fully general object localization. This teaches the manipulation sequence — approach, grasp, lift, transport, release — without pretending the robot can pick up arbitrary objects anywhere on the table.' },

            { type: 'heading', level: 2, text: 'What students learn' },
            { type: 'p', text: 'Students learn how a manipulation task breaks into stages, why lift height matters before a horizontal move, and how grasp and release are just hand-pose commands like any other.' },

            { type: 'heading', level: 2, text: 'Hardware used' },
            { type: 'list', items: ['Shoulder, elbow, and wrist servos', 'Hand and finger servos', 'Optional RealSense camera for zone detection', 'Motion node'] },

            { type: 'heading', level: 2, text: 'Concepts covered' },
            { type: 'list', items: ['Approach and grasp poses', 'Lift-before-move sequencing', 'Hand open/close as a pose command', 'Transport between two fixed poses', 'Behavior sequencing'] },

            { type: 'heading', level: 2, text: 'Run command' },
            { type: 'terminal', lines: ['ros2 run swayform_demos pick_and_place'] },

            { type: 'heading', level: 2, text: 'Starter code' },
            { type: 'code', lang: 'python', filename: 'pick_and_place.py', code: '# see ros2_ws/src/swayform_demos/pick_and_place.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_demos/pick_and_place.py' },

            { type: 'heading', level: 2, text: 'Code walkthrough' },
            { type: 'list', items: [
              '**Four named poses:** Approach, grasp, lift, and place are each a named dictionary. Students can tune one pose without breaking the rest of the sequence.',
              '**Approach before grasp:** The arm moves over the object first, then descends. Going straight to the grasp pose risks knocking the object away.',
              '**Lift before transport:** The arm rises to a clear height before moving sideways, so the object does not drag across the table.',
              '**Hand pose as grasp/release:** `set_hand_pose` is the same call used in other demos. Grasping is just a hand pose, not a special mechanism.',
              '**finally block:** Returns the robot to idle and releases the motion lock even if a step fails mid-sequence.',
            ] },

            { type: 'heading', level: 2, text: 'Try changing this' },
            { type: 'list', items: [
              'Change the place zone to the other side of the robot.',
              'Add a second object and a second place zone.',
              'Slow down the lift for a heavier object.',
              'Add a RealSense check that the pickup zone is occupied before starting.',
            ] },

            { type: 'callout', tone: 'safety', label: 'Safety', text: 'Use only light, easy-to-grip objects. Do not test grasp poses on fingers or hands — the hand should only ever close around a tested tabletop object.' },
            { type: 'callout', tone: 'tip', label: 'Next step', text: 'After Pick and Place, try Lab 04: Head Tracking Basics.' },
          ],
        },

        {
          id: 'demo-rock-paper-scissors',
          title: 'Rock Paper Scissors',
          level: 'intermediate',
          time: '15–20 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_demos/rock_paper_scissors.py',
          blocks: [
            { type: 'lead', text: 'The robot plays rock-paper-scissors with the user. It counts down, chooses rock, paper, or scissors, moves its hand into the selected pose, and compares the result.' },

            { type: 'callout', tone: 'note', label: 'Honest note', text: 'This demo runs in keyboard mode first, where the user enters their choice. A camera-assisted version using gesture detection may be added later. Do not describe the current version as hand-gesture recognition unless that is actually implemented.' },

            { type: 'heading', level: 2, text: 'What students learn' },
            { type: 'p', text: 'Students learn how robot behaviors can include randomness, user input, hand pose presets, branching logic, and a repeated game loop.' },

            { type: 'heading', level: 2, text: 'Hardware used' },
            { type: 'list', items: ['Hand and finger servos', 'Optional speaker for countdown', 'Optional RealSense camera for a future camera-assisted mode'] },

            { type: 'heading', level: 2, text: 'Concepts covered' },
            { type: 'list', items: ['Random choice', 'Hand pose presets', 'Branching logic', 'User interaction', 'Game loop', 'Optional vision classification'] },

            { type: 'heading', level: 2, text: 'Run command' },
            { type: 'terminal', lines: ['ros2 run swayform_demos rock_paper_scissors'] },

            { type: 'heading', level: 2, text: 'Starter code' },
            { type: 'code', lang: 'python', filename: 'rock_paper_scissors.py', code: '# see ros2_ws/src/swayform_demos/rock_paper_scissors.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_demos/rock_paper_scissors.py' },

            { type: 'heading', level: 2, text: 'Code walkthrough' },
            { type: 'list', items: [
              '**WINS_AGAINST dictionary:** The win rule is stored as a lookup table instead of nested if-statements. This makes the logic easier to read and change.',
              '**Input validation loop:** `get_user_choice` loops until the user enters a valid move. This prevents the demo from crashing on a typo.',
              '**countdown function:** The countdown says each word aloud before the reveal. Students can replace this with a visual LED countdown or a different audio cue.',
              '**play_round returns the winner:** Each round returns who won. The main loop collects these and prints a final score, making it easy to extend into best-of-five.',
              '**judge function:** Separating the win logic into its own function makes it easy to test. Students can call `judge("rock","scissors")` in the Python shell and verify the result without running the full demo.',
            ] },

            { type: 'heading', level: 2, text: 'Try changing this' },
            { type: 'list', items: [
              'Make the game best of three rounds.',
              'Add sound effects or a countdown.',
              'Add head movement when the robot wins or loses.',
              'Add a scoreboard variable.',
            ] },

            { type: 'callout', tone: 'safety', label: 'Safety', text: "Hand poses should use tested finger positions. Do not over-close the fingers around a person's hand." },
            { type: 'callout', tone: 'tip', label: 'Next step', text: 'After Rock Paper Scissors, try Lab 07: Hand Pose Timing.' },
          ],
        },

        {
          id: 'demo-interactive-exchange',
          title: 'Interactive Exchange',
          level: 'intermediate',
          time: '15–20 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_demos/interactive_exchange.py',
          blocks: [
            { type: 'lead', text: 'The robot accepts an item from a user and gives another item back. The reference implementation uses a dollar-bill-to-snack example: the user places a bill near the robot, the robot sets it aside, then presents a small snack item.' },

            { type: 'callout', tone: 'safety', label: 'Classroom demo only', text: 'This demo assumes any received bill is a $1 bill and is only for supervised classroom interaction. It is not real payment processing or currency validation.' },

            { type: 'heading', level: 2, text: 'Example setup' },
            { type: 'p', text: 'Place a light snack item, such as a small chip packet, on the table near the robot. The user places a bill in front of the robot. The robot moves the bill to one side, reaches toward the snack item, and presents or pushes it toward the user. The same state machine works for any give-one-item, get-one-item exchange — a token, a card, or a classroom object — the bill and snack are simply the reference example.' },

            { type: 'heading', level: 2, text: 'What students learn' },
            { type: 'p', text: 'Students learn how a larger robot behavior can be broken into states. The robot is not doing one magic action; it is moving through a controlled sequence.' },

            { type: 'heading', level: 2, text: 'Hardware used' },
            { type: 'list', items: ['RealSense camera', 'Arm servos', 'Hand servos', 'Small tabletop object', 'Optional speaker'] },

            { type: 'heading', level: 2, text: 'Concepts covered' },
            { type: 'list', items: ['Human-robot interaction', 'Sequenced manipulation', 'Simple object handoff', 'Vision or manual trigger', 'Safe arm movement', 'State machine thinking'] },

            { type: 'heading', level: 2, text: 'Run command' },
            { type: 'terminal', lines: ['ros2 run swayform_demos interactive_exchange'] },

            { type: 'heading', level: 2, text: 'State machine' },
            { type: 'list', items: ['IDLE', 'WAIT_FOR_ITEM', 'ACCEPT_ITEM', 'PLACE_ITEM_ASIDE', 'PICK_GIVE_ITEM', 'HAND_ITEM_TO_USER', 'RETURN_HOME'] },

            { type: 'heading', level: 2, text: 'Starter code' },
            { type: 'code', lang: 'python', filename: 'interactive_exchange.py', code: '# see ros2_ws/src/swayform_demos/interactive_exchange.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_demos/interactive_exchange.py' },

            { type: 'heading', level: 2, text: 'Code walkthrough' },
            { type: 'list', items: [
              '**ExchangeState enum:** Each stage of the interaction is a named state. Using an enum prevents typos and lets students see the full sequence before the code runs.',
              '**wait_for_item:** Same timeout pattern as Handshake. The robot waits a fixed window, then gives up cleanly if nothing is detected.',
              '**while loop drives the sequence:** Each iteration handles one state, then advances to the next. The `print(f"State: {state.value}")` line shows students the state machine running live.',
              '**audio.say checkpoints:** Spoken words mark each major step, making the demo easier for observers to follow and helping students identify which state is executing.',
              '**finally block:** The motion lock releases and the robot returns to idle even if an error interrupts mid-sequence. Never leave a behavior lock open.',
            ] },

            { type: 'heading', level: 2, text: 'Try changing this' },
            { type: 'list', items: [
              'Change the given-back item.',
              'Add a thank-you sound.',
              'Change the timeout if no item is detected.',
              'Make the robot wave after completing the exchange.',
            ] },

            { type: 'callout', tone: 'safety', label: 'Safety', text: 'Use only light tabletop objects. This demo is for supervised classroom interaction, not real vending, payment, or unattended operation.' },
            { type: 'callout', tone: 'tip', label: 'Next step', text: 'After Interactive Exchange, try Lab 09: Behavior Priority and Motion Locking.' },
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // CHAPTER 4: Student Labs
    // ------------------------------------------------------------------
    {
      id: 'labs',
      title: 'Student Labs',
      lessons: [
        {
          id: 'lab-01',
          title: 'Hello Robot Motion',
          level: 'beginner',
          time: '20–30 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_01_hello_motion.py',
          blocks: [
            { type: 'lead', text: 'Run your first safe robot motion and understand that code sends target positions to robot joints.' },
            { type: 'p', text: '**What students edit:** Students change a small motion value or timing value after running the starter version.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Motion commands', 'Neutral pose', 'Safe movement', 'Terminal command', 'Observation before editing'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_01_hello_motion'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Connect to the robot through VS Code and SSH.',
              'Open the lab file in your student project.',
              'Run the starter command without editing anything.',
              'Observe which part of the robot moves.',
              'Change one allowed value.',
              'Submit through the queue and wait for approval.',
              'Return the robot to idle.',
            ] },
            { type: 'heading', level: 3, text: 'Expected result' },
            { type: 'p', text: 'The robot performs a small safe motion, such as moving an arm or head, then returns to a neutral pose.' },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'What changed physically when you changed the code value?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Add a second safe motion after the first one, then return the robot to idle.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_01_hello_motion.py', code: '# see ros2_ws/src/swayform_labs/lab_01_hello_motion.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_01_hello_motion.py' },
          ],
        },

        {
          id: 'lab-02',
          title: 'Servo Angles and Safe Limits',
          level: 'beginner',
          time: '25–35 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_02_servo_limits.py',
          blocks: [
            { type: 'lead', text: 'Understand that each joint has safe angle limits and that robot motion should stay inside tested ranges.' },
            { type: 'p', text: '**What students edit:** Students adjust allowed servo target values inside a provided safe range.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Servo range', 'Joint limits', 'Mechanical safety', 'Angle values', 'Safe testing'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_02_servo_limits'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Open the lab file and find the safe angle range.',
              'Run the starter motion.',
              'Change the angle slightly within the allowed range.',
              'Run the motion again.',
              'Compare small changes to larger changes.',
              'Return the joint to neutral.',
              'Write down why random angles are unsafe.',
            ] },
            { type: 'heading', level: 3, text: 'Expected result' },
            { type: 'p', text: 'Students see that small code changes can create visible joint movement, but only within safe mechanical limits.' },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'Why should a robot program use safe limits instead of sending any angle directly to a servo?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Create a helper function that rejects values outside the safe range.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_02_servo_limits.py', code: '# see ros2_ws/src/swayform_labs/lab_02_servo_limits.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_02_servo_limits.py' },
          ],
        },

        {
          id: 'lab-03',
          title: 'Build a Gesture Sequence',
          level: 'beginner-plus',
          time: '30–40 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_03_gesture_sequence.py',
          blocks: [
            { type: 'lead', text: 'Create a small gesture by combining multiple safe poses with timing delays.' },
            { type: 'p', text: '**What students edit:** Students reorder poses, adjust delays, and add one extra gesture step.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Sequences', 'Timing', 'Poses', 'Reusable functions', 'Human-readable robot behavior'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_03_gesture_sequence'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Run the starter gesture.',
              'Identify each pose in the sequence.',
              'Change one delay value.',
              'Add one new pose from the provided safe pose list.',
              'Run the new sequence.',
              'Check whether the gesture still looks smooth.',
              'Return the robot to idle.',
            ] },
            { type: 'heading', level: 3, text: 'Expected result' },
            { type: 'p', text: 'The robot performs a short custom gesture using multiple poses.' },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'How does timing change the way a robot gesture feels to a person watching it?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Create two versions of the same gesture: one that looks calm and one that looks excited.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_03_gesture_sequence.py', code: '# see ros2_ws/src/swayform_labs/lab_03_gesture_sequence.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_03_gesture_sequence.py' },
          ],
        },

        {
          id: 'lab-04',
          title: 'Head Tracking Basics',
          level: 'beginner-plus',
          time: '30–45 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_04_head_tracking.py',
          blocks: [
            { type: 'lead', text: 'Move the robot head left, center, or right based on a simple target position.' },
            { type: 'p', text: '**What students edit:** Students adjust zone thresholds and head yaw values.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Neck yaw', 'Neck pitch', 'Camera target position', 'Mapping input to motion', 'Simple tracking behavior'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_04_head_tracking'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Run the starter head tracking script.',
              'Move the target between left, center, and right zones.',
              'Observe how the head responds.',
              'Change one threshold value.',
              'Change one head yaw value within the safe range.',
              'Run the script again.',
              'Return the head to center.',
            ] },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'What is the difference between detecting where something is and deciding how far the robot should move?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Add a small delay so the head movement feels smoother and less twitchy.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_04_head_tracking.py', code: '# see ros2_ws/src/swayform_labs/lab_04_head_tracking.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_04_head_tracking.py' },
          ],
        },

        {
          id: 'lab-05',
          title: 'Button-to-Motion Control',
          level: 'beginner-plus',
          time: '25–40 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_05_button_motion.py',
          blocks: [
            { type: 'lead', text: 'Connect a keyboard input or simple button event to a robot motion.' },
            { type: 'p', text: '**What students edit:** Students map different inputs to different safe robot actions.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Events', 'Input handling', 'Calling robot actions', 'Safety stop', 'Simple control interface'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_05_button_motion'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Run the starter input script.',
              'Press the provided key to trigger a motion.',
              'Find where the input is checked in the code.',
              'Add a second input option.',
              'Map the second input to a different safe pose.',
              'Test both inputs.',
              'Use the stop key before ending the lab.',
            ] },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'Why is it useful to separate input handling from the actual robot motion function?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Add a simple menu that shows which keys trigger which motions.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_05_button_motion.py', code: '# see ros2_ws/src/swayform_labs/lab_05_button_motion.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_05_button_motion.py' },
          ],
        },

        {
          id: 'lab-06',
          title: 'RealSense Detection Basics',
          level: 'intermediate',
          time: '35–45 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_06_realsense_detection.py',
          blocks: [
            { type: 'lead', text: 'Use RealSense camera data as a trigger for a simple robot behavior.' },
            { type: 'p', text: '**What students edit:** Students adjust a detection zone or distance threshold.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Camera input', 'Detection zones', 'Depth and distance', 'Perception-triggered motion', 'False positives'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_06_realsense_detection'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Start the camera-based lab.',
              'Place a target or user inside the detection area.',
              'Observe when the robot triggers a response.',
              'Adjust the detection distance or zone.',
              'Run the test again.',
              'Compare reliable and unreliable trigger conditions.',
              'Return the robot to idle.',
            ] },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'Why should camera-based triggers be conservative when the robot is near people?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Add a timeout so the robot returns to idle if the target disappears.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_06_realsense_detection.py', code: '# see ros2_ws/src/swayform_labs/lab_06_realsense_detection.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_06_realsense_detection.py' },
          ],
        },

        {
          id: 'lab-07',
          title: 'Hand Pose Timing',
          level: 'intermediate',
          time: '30–45 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_07_hand_pose_timing.py',
          blocks: [
            { type: 'lead', text: 'Adjust hand and finger timing to understand how small delays affect robot gestures.' },
            { type: 'p', text: '**What students edit:** Students change finger pose timing, open/close delays, or gesture order.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Finger servo poses', 'Timing', 'Grip and release', 'Gesture realism', 'Small motion changes'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_07_hand_pose_timing'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Run the starter hand pose.',
              'Observe how quickly the fingers move.',
              'Change one timing delay.',
              'Run the gesture again.',
              'Change the order of two finger movements.',
              'Compare which version looks more natural.',
              'Return the hand to relaxed pose.',
            ] },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'Why can timing make a robot motion feel more natural even if the final pose is the same?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Create a small hand gesture that looks like a count-in or signal.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_07_hand_pose_timing.py', code: '# see ros2_ws/src/swayform_labs/lab_07_hand_pose_timing.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_07_hand_pose_timing.py' },
          ],
        },

        {
          id: 'lab-08',
          title: 'Base Rotation Basics',
          level: 'intermediate',
          time: '30–45 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_08_base_rotation.py',
          blocks: [
            { type: 'lead', text: "Command the robot's rotating base to turn left or right safely." },
            { type: 'p', text: '**What students edit:** Students adjust direction, duration, or speed values inside safe limits.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Base yaw', 'Motor control', 'Direction', 'Speed', 'Stop command'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_08_base_rotation'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Make sure the robot base area is clear.',
              'Run the starter base rotation command.',
              'Observe direction and stopping behavior.',
              'Change the direction.',
              'Change the duration slightly.',
              'Run the test again.',
              'Send the stop command.',
            ] },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'Why should base motion always include a clear stop condition?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Create a turn-left, pause, turn-right sequence.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_08_base_rotation.py', code: '# see ros2_ws/src/swayform_labs/lab_08_base_rotation.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_08_base_rotation.py' },
          ],
        },

        {
          id: 'lab-09',
          title: 'Behavior Priority and Motion Locking',
          level: 'intermediate',
          time: '35–45 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_09_motion_locking.py',
          blocks: [
            { type: 'lead', text: 'Understand why one robot behavior should not interrupt another motion at the wrong time.' },
            { type: 'p', text: '**What students edit:** Students test simple behavior priority rules and see how a motion lock protects a running action.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Motion lock', 'Behavior priority', 'State control', 'Safe cancellation', 'Competing commands'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_09_motion_locking'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Run the starter behavior.',
              'Trigger a second behavior while the first is active.',
              'Observe whether the second behavior is blocked or delayed.',
              'Find the motion lock in the code.',
              'Change the priority of one behavior.',
              'Run the test again.',
              'Return the robot to idle.',
            ] },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'What could go wrong if two scripts tried to control the same arm at the same time?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Add a low-priority idle behavior that pauses when a higher-priority demo starts.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_09_motion_locking.py', code: '# see ros2_ws/src/swayform_labs/lab_09_motion_locking.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_09_motion_locking.py' },
          ],
        },

        {
          id: 'lab-10',
          title: 'Mini Demo Challenge',
          level: 'intermediate',
          time: '40–60 minutes',
          status: 'ready',
          workspaceFile: 'ros2_ws/src/swayform_labs/lab_10_mini_demo_challenge.py',
          blocks: [
            { type: 'lead', text: 'Combine motion, timing, and optional perception into a small custom robot demo.' },
            { type: 'p', text: '**What students edit:** Students create their own short behavior using safe poses and at least one idea from earlier labs.' },
            { type: 'heading', level: 3, text: 'Concepts' },
            { type: 'list', items: ['Project planning', 'Code reuse', 'Debugging', 'Demo presentation', 'Behavior design'] },
            { type: 'heading', level: 3, text: 'Starter command' },
            { type: 'terminal', lines: ['ros2 run swayform_labs lab_10_mini_demo_challenge'] },
            { type: 'heading', level: 3, text: 'Steps' },
            { type: 'steps', items: [
              'Choose a simple demo idea.',
              'Pick which robot parts will move.',
              'Start from a provided safe template.',
              'Add two or more motion steps.',
              'Add timing between steps.',
              'Test one part at a time.',
              'Prepare a short explanation of how the demo works.',
            ] },
            { type: 'heading', level: 3, text: 'Expected result' },
            { type: 'p', text: 'Students build and run a short custom robot behavior that they can explain.' },
            { type: 'heading', level: 3, text: 'Reflection question' },
            { type: 'p', text: 'What part of your demo was easiest to control, and what part needed the most debugging?' },
            { type: 'heading', level: 3, text: 'Extension challenge' },
            { type: 'p', text: 'Add camera input or user input to trigger the demo.' },
            { type: 'heading', level: 3, text: 'Starter file' },
            { type: 'code', lang: 'python', filename: 'lab_10_mini_demo_challenge.py', code: '# see ros2_ws/src/swayform_labs/lab_10_mini_demo_challenge.py in the workspace', workspaceFile: 'ros2_ws/src/swayform_labs/lab_10_mini_demo_challenge.py' },
          ],
        },

        // -- Planned Level 2 (working titles) --------------------------
        { id: 'lab-11', title: 'Simple State Machines', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-12', title: 'Custom Motion Presets', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-13', title: 'Camera-Based User Greeting', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-14', title: 'Object Position Mapping', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-15', title: 'Two-Arm Coordination', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-16', title: 'Speaker Prompts and Timing', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-17', title: 'Classroom Challenge: Helpful Robot', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-18', title: 'Intro to Robot Debug Logs', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-19', title: 'Build Your Own Interaction', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },
        { id: 'lab-20', title: 'Final Showcase Demo', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 2 lab. Working title only — full lab content has not been written yet.' },
        ] },

        // -- Planned Level 3 — Perceive: vision, tracking, state design --
        { id: 'lab-21', title: 'Level 3 Lab 21', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-22', title: 'Level 3 Lab 22', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-23', title: 'Level 3 Lab 23', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-24', title: 'Level 3 Lab 24', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-25', title: 'Level 3 Lab 25', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-26', title: 'Level 3 Lab 26', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-27', title: 'Level 3 Lab 27', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-28', title: 'Level 3 Lab 28', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-29', title: 'Level 3 Lab 29', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },
        { id: 'lab-30', title: 'Level 3 Lab 30', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 3 lab. Theme: Perceive — vision, tracking, state design.' },
        ] },

        // -- Planned Level 4 — Create: original project, final showcase --
        { id: 'lab-31', title: 'Level 4 Lab 31', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-32', title: 'Level 4 Lab 32', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-33', title: 'Level 4 Lab 33', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-34', title: 'Level 4 Lab 34', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-35', title: 'Level 4 Lab 35', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-36', title: 'Level 4 Lab 36', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-37', title: 'Level 4 Lab 37', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-38', title: 'Level 4 Lab 38', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-39', title: 'Level 4 Lab 39', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
        { id: 'lab-40', title: 'Level 4 Lab 40', status: 'planned', locked: true, blocks: [
          { type: 'p', text: 'Planned Level 4 lab. Theme: Create — original project, final showcase.' },
        ] },
      ],
    },
  ],
};
