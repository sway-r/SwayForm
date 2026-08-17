/* SwayForm Learning Portal — Help / Documentation reference content.
   Ported from the static learning-hub pages (glossary, technical-reference,
   troubleshooting, repair). Plain data only — the Help app renders these
   blocks; this module has no logic and no imports. */

export const REFERENCE = {
  sections: [
    {
      id: "glossary",
      title: "Glossary",
      icon: "book",
      blocks: [
        { type: "lead", text: "Quick definitions for terms used throughout the Learning Portal." },
        {
          type: "terms",
          items: [
            { term: "Behavior", def: "A robot action or interaction made from code, motion, timing, and sometimes sensor input." },
            { term: "Demo", def: "A finished example behavior that students can run and inspect." },
            { term: "Lab", def: "A guided activity where students edit code, test the robot, and answer a reflection question." },
            { term: "Joint", def: "A part of the robot that can move, such as an elbow, shoulder, neck, hand, or base rotation." },
            { term: "Servo", def: "A motor used to move a robot joint to a commanded position." },
            { term: "Pose", def: "A saved set of joint positions that creates a specific robot position or gesture." },
            { term: "Safe limit", def: "A tested range that keeps a joint from moving too far." },
            { term: "RealSense", def: "A camera used for visual input, depth information, and camera-assisted demos." },
            { term: "Robot Connection", def: "The bridge between the Learning Portal and the physical robot. Coming soon — Run currently shows a simulated result." },
            { term: "Workspace", def: "The folder where robot code, packages, demos, and labs are organized." },
            { term: "ROS 2", def: "A robotics software framework that helps organize robot programs into nodes, topics, services, and launch files." },
            { term: "Motion lock", def: "A software rule that prevents two behaviors from trying to control the same robot part at the same time." },
            { term: "Neutral pose", def: "A safe resting position the robot can return to before or after a behavior." },
            { term: "Motion-control node", def: "The single protected software layer permitted to send final commands to the servo controllers and base motor." },
          ],
        },
      ],
    },

    {
      id: "technical-reference",
      title: "Technical Reference",
      icon: "layers",
      blocks: [
        {
          type: "lead",
          text: "Deep technical detail for instructors and technically knowledgeable reviewers: ROS 2 concepts, the motion node, full servo controller mapping, power architecture, audio architecture, and RealSense reference. For a lighter overview see the public [Robot](https://swayform.net/robot) page.",
        },

        { type: "heading", level: 2, id: "ros2", text: "ROS 2 concepts" },
        {
          type: "list",
          items: [
            "**Node** — a program that does one part of the robot's work: a camera node reads vision data, a motion node controls joint movement, a demo script decides what behavior to run.",
            "**Topic** — a named stream of information that one part of the robot publishes and another subscribes to.",
            "**Publisher / Subscriber** — a publisher sends information onto a topic; a subscriber listens for it and reacts.",
            "**Service** — a request-and-response interaction, such as requesting a safe motion or checking system status.",
            "**Launch file** — starts multiple nodes together in one workflow instead of many manual terminals.",
            "**Behavior script** — decides what the robot should do, such as the Wave demo sending a sequence of arm movements to the motion system.",
          ],
        },

        { type: "heading", level: 2, id: "motion-node", text: "Motion node" },
        {
          type: "p",
          text: "The motion node is the single software layer permitted to send final commands to the servo controllers and base motor system — see the full architecture on the [Safety](https://swayform.net/safety) page. A behavior does not throw raw values at every servo; it requests safe poses, joint groups, or controlled movement sequences, and the motion node enforces limits before anything moves.",
        },
        {
          type: "p",
          text: "If two behaviors try to control the same arm at once, motion can become confusing or unsafe. A **motion lock** prevents this: a Wave script can request the right arm; a Handshake script can request the same arm; the system does not allow both to command it at the same time.",
        },

        { type: "heading", level: 2, id: "servo-mapping", text: "Servo controller mapping" },
        {
          type: "p",
          text: "SwayForm uses two Adafruit PCA9685 16-channel PWM controllers on the I²C bus (12-bit resolution, 50Hz default). Controller `0x40` uses all 16 of its channels; controller `0x41` uses 4 of its 16, leaving 12 free for future expansion. The waist rotation is not a PCA9685 channel — it is a DC motor with encoder feedback, powered directly from the 12V bus.",
        },
        {
          type: "table",
          headers: ["Joint", "ROS name", "Controller", "Ch", "Min", "Max", "Neutral", "Servo"],
          rows: [
            ["Neck Yaw", "neck_yaw", "0x40", "0", "−45°", "+45°", "0°", "MG996R"],
            ["Neck Pitch", "neck_pitch", "0x40", "1", "−20°", "+25°", "0°", "MG90S"],
            ["R. Shoulder Pitch", "right_shoulder_pitch", "0x40", "2", "−10°", "+90°", "0°", "MG996R"],
            ["R. Shoulder Roll", "right_shoulder_roll", "0x40", "3", "−30°", "+20°", "0°", "MG996R"],
            ["R. Elbow", "right_elbow", "0x40", "4", "−120°", "0°", "−10°", "MG996R"],
            ["R. Wrist", "right_wrist", "0x40", "5", "−45°", "+45°", "0°", "MG90S"],
            ["R. Thumb", "right_thumb", "0x40", "6", "0°", "+70°", "15°", "MG90S"],
            ["R. Index", "right_index", "0x40", "7", "0°", "+90°", "15°", "MG90S"],
            ["R. Middle", "right_middle", "0x40", "8", "0°", "+90°", "15°", "MG90S"],
            ["R. Ring", "right_ring", "0x40", "9", "0°", "+90°", "15°", "MG90S"],
            ["R. Pinky", "right_pinky", "0x40", "10", "0°", "+80°", "15°", "MG90S"],
            ["L. Shoulder Pitch", "left_shoulder_pitch", "0x40", "11", "−10°", "+90°", "0°", "MG996R"],
            ["L. Shoulder Roll", "left_shoulder_roll", "0x40", "12", "−20°", "+30°", "0°", "MG996R"],
            ["L. Elbow", "left_elbow", "0x40", "13", "0°", "+120°", "10°", "MG996R"],
            ["L. Wrist", "left_wrist", "0x40", "14", "−45°", "+45°", "0°", "MG90S"],
            ["L. Thumb", "left_thumb", "0x40", "15", "0°", "+70°", "15°", "MG90S"],
            ["L. Index", "left_index", "0x41", "0", "0°", "+90°", "15°", "MG90S"],
            ["L. Middle", "left_middle", "0x41", "1", "0°", "+90°", "15°", "MG90S"],
            ["L. Ring", "left_ring", "0x41", "2", "0°", "+90°", "15°", "MG90S"],
            ["L. Pinky", "left_pinky", "0x41", "3", "0°", "+80°", "15°", "MG90S"],
            ["Waist Rotation", "waist_yaw", "— (12V direct)", "—", "−60°", "+60°", "0°", "DC+encoder"],
          ],
        },
        {
          type: "callout",
          tone: "warn",
          label: "Caution",
          text: "A wrong mapping can make the wrong joint move — edit servo mapping carefully, and re-verify against this table after any repair.",
        },

        { type: "heading", level: 2, id: "power", text: "Power architecture" },
        { type: "p", text: "One 12V/50A power supply feeds a central bus bar with four outgoing paths:" },
        {
          type: "steps",
          items: [
            "A buck converter stepping down to 5V for the Raspberry Pi",
            "A direct 12V line to the base-rotation DC motor (no converter)",
            "A buck converter to 6V servo rail A (includes the neck motors)",
            "A buck converter to 6V servo rail B",
          ],
        },
        {
          type: "p",
          text: "The two 6V servo rails are separately regulated — not galvanically isolated — so current spikes from motors are dampened before they reach the Pi's dedicated 5V rail. Both PCA9685 controllers draw power from the two 6V rails and receive position commands over a separate I²C signal path.",
        },
        {
          type: "callout",
          tone: "warn",
          label: "Under validation",
          text: "Final current protection, fuse sizing, and conductor ratings will be validated before classroom release. This is not yet an absolute current-safety claim.",
        },

        { type: "heading", level: 2, id: "audio", text: "Audio architecture" },
        {
          type: "p",
          text: "The Raspberry Pi 5 has no built-in analog audio output. The signal path is: Raspberry Pi 5 → USB audio adapter → 3.5mm analog connection → PAM8403 amplifier (separately powered) → 3W speaker. Software uses `pyttsx3` for text-to-speech and `pygame.mixer` for clips, triggered via the `/swayform/audio_command` topic.",
        },

        { type: "heading", level: 2, id: "realsense", text: "RealSense camera" },
        {
          type: "p",
          text: "The Intel RealSense D435i publishes synchronized color and depth image streams (color at 640×480, depth per pixel in millimeters, minimum range roughly 0.3m) over USB. Learning Portal use cases: detecting that someone is in front of the robot, checking whether an object is in a target zone, turning the head toward a left/center/right region, and starting a behavior when a condition is met.",
        },
        {
          type: "callout",
          tone: "note",
          label: "Honest note",
          text: "Camera-assisted does not mean perfect. Students should learn how vision can fail, why thresholds matter, and why robots should move conservatively near people.",
        },
      ],
    },

    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: "warning",
      blocks: [
        {
          type: "lead",
          text: "Robotics debugging is part software, part hardware, and part workflow. Most beginner issues come from connection problems, workspace setup, wrong commands, or another process already running.",
        },
        {
          type: "troubleshoot",
          items: [
            {
              symptom: "Demo command not found",
              cause: "The workspace was not sourced or the package name is wrong.",
              fix: "Run `source install/setup.bash` from the workspace, then try the command again.",
            },
            {
              symptom: "Robot does not move",
              cause: "The motion node is not running, power is not enabled, or the behavior is blocked by a safety condition.",
              fix: "Check terminal output, confirm the robot is powered, and verify the motion system is active. If Robot Connection is still pending, Run shows a simulated result instead of physical motion — that's expected, not an error.",
            },
            {
              symptom: "Camera not detected",
              cause: "The RealSense camera is not connected, the camera process is not running, or another process is already using the camera.",
              fix: "Check the camera connection and restart the camera-related node or demo.",
            },
            {
              symptom: "Motion stopped halfway",
              cause: "A safety stop, software error, motion lock, or timeout interrupted the behavior.",
              fix: "Read the terminal output before restarting. Do not immediately rerun the same script without checking why it stopped.",
            },
            {
              symptom: "Permission denied",
              cause: "The file is not executable or the user does not have permission for that command.",
              fix: "Check file permissions and confirm the command is being run from the correct environment.",
            },
            {
              symptom: "Wrong file edited",
              cause: "The student edited a copy, a demo file, or a file outside their own project.",
              fix: "Check the file path and confirm the command is running the same file the student edited — see [Student Projects](https://learning.swayform.net/projects).",
            },
          ],
        },
      ],
    },

    {
      id: "repair",
      title: "Repair",
      icon: "settings",
      blocks: [
        {
          type: "lead",
          text: "SwayForm combines commercially available electronics and actuators with custom, replaceable 3D-printed structural parts. When something breaks, schools replace the affected part rather than the whole robot — and many repairs are a supervised student learning opportunity, not a service ticket.",
        },

        { type: "heading", level: 2, text: "Component identification" },
        { type: "p", text: "Before repairing anything, identify what actually failed:" },
        {
          type: "list",
          items: [
            "**Structural / printed part** — a cracked bracket, broken mount, or worn joint housing. Usually a 3D-printed part.",
            "**Servo** — MG996R (large joints) or MG90S (small joints, fingers). See the joint table on the [Robot](https://swayform.net/robot) page for which servo drives which joint.",
            "**Electronics** — Raspberry Pi, PCA9685 controller, power converter, camera, or wiring. See [Technical Reference](https://learning.swayform.net/technical-reference).",
          ],
        },

        { type: "heading", level: 2, text: "Diagnostic procedure" },
        {
          type: "callout",
          tone: "safety",
          label: "Safety",
          text: "Power off and disconnect the robot before touching any wiring or opening an enclosure.",
        },
        {
          type: "steps",
          items: [
            "Power off and disconnect before touching any wiring.",
            "Check for visible damage: cracked plastic, loose screws, disconnected cables, burnt smell.",
            "If a joint won't move, check [Troubleshooting](https://learning.swayform.net/troubleshooting) first — many 'broken' joints are a software or power issue, not a physical one.",
            "If a joint moves but grinds or catches, suspect a mechanical/structural issue.",
            "If a joint doesn't respond to any command but others on the same controller do, suspect the individual servo.",
            "If an entire side or group of joints doesn't respond, suspect that PCA9685 controller or its power rail — see Technical Reference for which controller and rail serve which joints.",
          ],
        },

        { type: "heading", level: 2, text: "Disassembly & reassembly" },
        {
          type: "p",
          text: "Structural parts are held with standard M3 hardware wherever possible. General approach: power off, remove the minimum number of fasteners needed to access the failed part, note servo horn orientation with a photo before removing it, replace the part, and reassemble in reverse order.",
        },
        {
          type: "callout",
          tone: "warn",
          label: "Note",
          text: "Step-by-step disassembly instructions with photos for each subsystem (head, arm, hand, base) are being finalized and will be added here before commercial release.",
        },

        { type: "heading", level: 2, text: "Calibration after a repair" },
        {
          type: "p",
          text: "After replacing a servo or reassembling a joint, re-check its neutral position and range against the values in the [Technical Reference](https://learning.swayform.net/technical-reference) joint table before running any demo or lab. A servo installed a spline tooth off from neutral will hit its safe-limit clamp in the wrong place.",
        },

        { type: "heading", level: 2, text: "Required tools" },
        {
          type: "list",
          items: [
            "Small Phillips screwdriver (M3 hardware)",
            "Hex key set, if included with your unit",
            "Multimeter (for electrical diagnosis)",
            "i2cdetect / terminal access (for I²C controller diagnosis)",
          ],
        },

        { type: "heading", level: 2, text: "Replacement parts" },
        {
          type: "p",
          text: "Every individual 3D-printed replacement part is priced below $20. Schools may download the available print files and produce replacement structural parts themselves. Electronic and mechanical replacement costs vary by component — when a larger assembly is damaged, schools replace only the affected printed or electronic components rather than purchasing a new robot.",
        },
        {
          type: "callout",
          tone: "note",
          label: "Where to get parts",
          text: "Contact [SwayForm Sales](https://swayform.net/contact) for current replacement part ordering and print-file availability.",
        },

        { type: "heading", level: 2, text: "Post-repair test" },
        {
          type: "p",
          text: "After any repair, before returning the robot to classroom use: power on, verify the repaired joint reaches its neutral pose correctly, run [Demo: Wave](https://learning.swayform.net/demos/wave) as a general motion check, and confirm no unusual noise, heat, or resistance.",
        },
      ],
    },

    {
      id: "safety",
      title: "Safety",
      icon: "shield",
      blocks: [
        {
          type: "lead",
          text: "SwayForm is designed for classroom robotics learning, but it is still a physical robot. This is a quick-reference summary — the full protected motion-control architecture and layered emergency-stop system are documented on the public [Safety](https://swayform.net/safety) page and the [Robot Safety and Acceptable Use Policy](https://swayform.net/robot-safety). The in-portal [Safety First](https://learning.swayform.net/learn/activity/safety-first) activity covers this in lesson form.",
        },
        { type: "heading", level: 2, text: "Core safety checklist" },
        {
          type: "checklist",
          items: [
            "Keep hands clear while a demo or approved program is running.",
            "Stop the running script before repositioning objects near the robot.",
            "Do not force the robot's arms, hands, head, or base by hand.",
            "Use safe joint limits instead of testing random servo angles.",
            "Keep tabletop objects light and easy to move.",
            "Make sure the robot is stable before running arm or base motions.",
            "If a motion looks wrong, stop the script before trying again.",
            "Know where the emergency stop / servo-power cutoff is before running any program.",
            "Never run a program on the physical robot without an instructor or supervisor present.",
          ],
        },
        {
          type: "callout",
          tone: "safety",
          label: "Safety",
          text: "Never touch SwayForm while it is powered, enabled, or moving. If something goes wrong: stop the program, don't grab the robot — see Safety and Ground Rules in Getting Started.",
        },
        { type: "heading", level: 2, text: "Working on the physical robot" },
        {
          type: "p",
          text: "Repairs, part swaps, and anything involving wiring or an open enclosure follow the procedure in Repair, including powering off and disconnecting the robot first.",
        },
      ],
    },

    {
      id: "keyboard-shortcuts",
      title: "Keyboard Shortcuts",
      icon: "info",
      blocks: [
        {
          type: "lead",
          text: "Shortcuts available inside an Activity Workspace (Notebook, Code Editor, Terminal) and the Curriculum Index.",
        },
        {
          type: "table",
          headers: ["Shortcut", "Action", "Where"],
          rows: [
            ["Ctrl / Cmd + S", "Save the active file", "Code Editor"],
            ["Ctrl / Cmd + `", "Open and focus the Terminal", "Activity Workspace"],
            ["Ctrl + L", "Clear the screen", "Terminal"],
            ["↑ / ↓", "Previous / next command in history", "Terminal"],
            ["Enter", "Run the typed command", "Terminal"],
            ["Escape", "Close the Curriculum Index", "Curriculum Index drawer"],
          ],
        },
        {
          type: "callout",
          tone: "note",
          label: "Note",
          text: "Files also autosave a short moment after you stop typing — Ctrl/Cmd+S is for saving immediately, not the only way your work is kept.",
        },
      ],
    },

    {
      id: "getting-help",
      title: "Getting Help",
      icon: "help",
      blocks: [
        {
          type: "lead",
          text: "There's no live chat or support-ticket system inside the Learning Portal yet — here's what actually works today.",
        },
        { type: "heading", level: 2, text: "Stuck on a lab or demo" },
        {
          type: "steps",
          items: [
            "Re-read the Notebook's Expected Behavior for that step — most mismatches are a small, specific difference from what's described.",
            "Check Troubleshooting for the symptom you're seeing.",
            "Check Glossary if a term in the instructions is unfamiliar.",
            "Ask your instructor — they can help directly in the classroom.",
          ],
        },
        { type: "heading", level: 2, text: "Something in the Learning Portal itself is broken" },
        {
          type: "p",
          text: "Guest progress and workspace files are stored locally in your browser — clearing site data or switching browsers will lose them. For a bug in the portal itself (not your lab code), contact [SwayForm](https://swayform.net/contact).",
        },
      ],
    },
  ],
};
