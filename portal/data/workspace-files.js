/* Seed contents of the mock Swayform ROS 2 workspace, keyed by path.
   mock-fs.js loads this map once per browser session; after that, edits
   live in localStorage and this module is never re-read for an edited file.
   Paths follow the convention already used in the real Getting Started docs:
   ~/swayform_ws/src/<package>/<file>.py — represented here without the leading ~. */

const PACKAGE_XML = (name, description) => `<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>${name}</name>
  <version>0.1.0</version>
  <description>${description}</description>
  <maintainer email="contact@swayform.net">SwayForm</maintainer>
  <license>Proprietary</license>

  <depend>rclpy</depend>
  <depend>swayform_motion</depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>
`;

const SETUP_PY = (name) => `from setuptools import find_packages, setup

package_name = "${name}"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["test"]),
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="SwayForm",
    maintainer_email="contact@swayform.net",
    description="SwayForm classroom package: ${name}",
    license="Proprietary",
    entry_points={
        "console_scripts": [],
    },
)
`;

export const WORKSPACE_FILES = {
  /* === REAL ROBOT SOURCE (agent-authored, synced from the swayform_ws repo,
     public-src branch, src/swayform_robot/swayform_robot/): this is the
     actual code running on the robot for wave/handshake/idle/finger_wave —
     not a teaching simplification. See swayform_demos/ below for the
     planned-but-not-yet-real demos (pick and place, rock paper scissors,
     interactive exchange), which stay separate until they're real too. === */

  "swayform_ws/src/swayform_robot/package.xml": `<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>swayform_robot</name>
  <version>0.1.0</version>
  <description>SwayForm's real, running behaviors: wave, handshake, idle, and finger_wave — direct PCA9685 servo control, plus the shared hardware and config layers they're built on.</description>
  <maintainer email="contact@swayform.net">SwayForm</maintainer>
  <license>Proprietary</license>

  <depend>rclpy</depend>
  <depend>python3-yaml</depend>
  <exec_depend>ament_index_python</exec_depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>
`,
  "swayform_ws/src/swayform_robot/setup.py": `from setuptools import find_packages, setup

package_name = "swayform_robot"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["test"]),
    data_files=[
        ("share/" + package_name + "/config", ["swayform_robot/config/robot.yaml"]),
    ],
    install_requires=["setuptools", "pyyaml"],
    zip_safe=True,
    maintainer="SwayForm",
    maintainer_email="contact@swayform.net",
    description="SwayForm's real, running behaviors — direct PCA9685 servo control.",
    license="Proprietary",
    entry_points={
        "console_scripts": [
            "wave = swayform_robot.behaviors.wave:main",
            "handshake = swayform_robot.behaviors.handshake:main",
            "idle = swayform_robot.behaviors.idle:main",
            "finger_wave = swayform_robot.behaviors.finger_wave:main",
            "torso_control = swayform_robot.hardware.torso_motor:main",
        ],
    },
)
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py": `"""
wave.py

Wave behavior — direct PCA9685 control. Source of truth for the right-arm
wave motion: channels, centers, limits.

Run directly:
    ros2 run swayform_robot wave                                 # mock by default
    ros2 run swayform_robot wave --ros-args -p use_mock_hardware:=false
    ros2 launch swayform_bringup wave_demo.launch.py
    ros2 launch swayform_bringup wave_demo.launch.py use_mock_hardware:=false

Or import and trigger a single bounded wave programmatically (e.g. from the
wave-detector vision program):
    from swayform_robot.behaviors.wave import perform_wave
    perform_wave()

Importing this module never touches hardware — all I2C/PCA9685 setup happens
inside perform_wave()/wave_forever() themselves, so it's safe to import in a
dry-run context.

Servo pulse-math and threaded smooth-move logic live in
swayform_robot.hardware.servo_control, shared with handshake.py and idle.py.

This module is both the real implementation (perform_wave/wave_forever, the
functions the wave-detector and every other caller use) and the ROS2 node
(WaveNode/main()) that runs it via \`ros2 run\`/\`ros2 launch\`.
"""

import time
import math
import threading

import rclpy
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc

PCA_HAND = 0x40
PCA_REACH = 0x60

THUMB = 0
FINGERS = [1, 2, 3, 4]
WRIST = 5
ELBOW = 6
SHOULDER_ROLL = 7
SHOULDER_PITCH = 1

# Wave pose
SHOULDER_ROLL_WAVE = 40
SHOULDER_PITCH_WAVE = 260
ELBOW_WAVE_BENT = 40
ELBOW_WAVE_OPEN = 70
WRIST_CENTER = 100

# Finger ripple, run continuously in the background for the duration of
# elbow_wave() — see finger_wave.py, which this is copied from verbatim
# (same constants, confirmed good on hardware there first). Each finger follows a
# sine curve staggered a quarter cycle (90°) behind the previous one, so
# finger 1 hits full-open right as finger 3 (two fingers/half a cycle later)
# hits its most-curled point — a rolling ripple down the hand. THUMB is set
# once in wave_ready_pose() and never touched by the ripple.
FINGER_OPEN = 135
RIPPLE_AMPLITUDE = 40   # 40° (~47% of the fingers' full 85° range) is the
                        # smallest amplitude confirmed visible on hardware —
                        # string-driven fingers eat smaller deltas as cable
                        # slack before producing any real motion.
RIPPLE_SPEED = 3.0      # radians/sec the wave rolls at
PHASE_OFFSET = math.pi / 2
RIPPLE_TICK = 0.02      # seconds between position updates (~50Hz)

WAVE_CYCLES = 3
SPEED_SCALE = 0.3

CENTERS = {
    (PCA_HAND, THUMB): 50,
    (PCA_HAND, 1): 135,
    (PCA_HAND, 2): 135,
    (PCA_HAND, 3): 135,
    (PCA_HAND, 4): 135,
    (PCA_HAND, WRIST): 100,
    (PCA_HAND, ELBOW): 130,
    (PCA_HAND, SHOULDER_ROLL): 160,
    (PCA_REACH, SHOULDER_PITCH): 170,
}

LIMITS = {
    (PCA_HAND, THUMB): (50, 135),
    (PCA_HAND, 1): (50, 135),
    (PCA_HAND, 2): (50, 135),
    (PCA_HAND, 3): (50, 135),
    (PCA_HAND, 4): (50, 135),
    (PCA_HAND, WRIST): (60, 160),
    (PCA_HAND, ELBOW): (40, 140),
    (PCA_HAND, SHOULDER_ROLL): (40, 170),
    (PCA_REACH, SHOULDER_PITCH): (150, 260),
}

# ELBOW and SHOULDER_ROLL/SHOULDER_PITCH are 270 ROM servos (elbow: 60kgcm
# replacement; both shoulder axes: 270 from the start) — see robot.yaml.
# CENTERS/LIMITS above re-tested on real hardware 2026-08-14 against this
# mapping via servo_tester.py (jogged with a matching 270 divisor per channel).
SERVO_RANGES = {
    (PCA_HAND, ELBOW): 270.0,
    (PCA_HAND, SHOULDER_ROLL): 270.0,
    (PCA_REACH, SHOULDER_PITCH): 270.0,
}


def _mv(addr, ch, target, steps, delay):
    """Build a servo_control.ServoController.run_threads() move, scaled by
    SPEED_SCALE exactly as the original inline smooth_move() did."""
    return {
        "addr": addr, "ch": ch, "target": target,
        "limits": LIMITS[(addr, ch)],
        "steps": steps, "delay": delay / SPEED_SCALE,
        "servo_range": SERVO_RANGES.get((addr, ch), 180.0),
    }


def center_all(ctrl):
    moves = [_mv(addr, ch, target, 70, 0.01) for (addr, ch), target in CENTERS.items()]
    ctrl.run_threads(moves)


def open_hand(ctrl):
    ctrl.run_threads([
        _mv(PCA_HAND, THUMB, 50, 50, 0.01),
        _mv(PCA_HAND, 1, 135, 50, 0.01),
        _mv(PCA_HAND, 2, 135, 50, 0.01),
        _mv(PCA_HAND, 3, 135, 50, 0.01),
        _mv(PCA_HAND, 4, 135, 50, 0.01),
    ])


def wave_ready_pose(ctrl):
    ctrl.run_threads([
        _mv(PCA_HAND, SHOULDER_ROLL, SHOULDER_ROLL_WAVE, 85, 0.01),
        _mv(PCA_REACH, SHOULDER_PITCH, SHOULDER_PITCH_WAVE, 85, 0.01),
        _mv(PCA_HAND, ELBOW, ELBOW_WAVE_BENT, 65, 0.009),
        _mv(PCA_HAND, WRIST, WRIST_CENTER, 60, 0.01),
        _mv(PCA_HAND, THUMB, 50, 55, 0.01),
        _mv(PCA_HAND, 1, 135, 55, 0.01),
        _mv(PCA_HAND, 2, 135, 55, 0.01),
        _mv(PCA_HAND, 3, 135, 55, 0.01),
        _mv(PCA_HAND, 4, 135, 55, 0.01),
    ])


def _ripple_tick(ctrl, t):
    """Write each finger's ripple position for time \`t\` (seconds since the
    ripple started). Direct set_servo() writes, not smooth_move — the sine
    curve itself is already the smooth motion. THUMB is untouched."""
    for i, ch in enumerate(FINGERS):
        theta = t * RIPPLE_SPEED - i * PHASE_OFFSET
        angle = FINGER_OPEN - RIPPLE_AMPLITUDE * (0.5 + 0.5 * math.sin(theta))
        ctrl.set_servo(PCA_HAND, ch, angle, LIMITS[(PCA_HAND, ch)])


def _finger_ripple_worker(ctrl, stop_event):
    start = time.monotonic()
    while not stop_event.is_set():
        _ripple_tick(ctrl, time.monotonic() - start)
        time.sleep(RIPPLE_TICK)


def elbow_wave(ctrl, cycles=WAVE_CYCLES):
    """Runs \`cycles\` open/bent elbow oscillations, or forever if cycles is None.

    Fingers ripple continuously in the background (see finger_wave.py) for the
    whole call, on a separate thread from the elbow/wrist moves — the
    ripple thread is always stopped and joined before returning, even on
    KeyboardInterrupt, so nothing keeps writing to \`ctrl\` after the caller
    moves on (e.g. wave_ready_pose()'s settle move, or ctrl.close()).
    """
    stop_ripple = threading.Event()
    ripple_thread = threading.Thread(
        target=_finger_ripple_worker, args=(ctrl, stop_ripple), daemon=True
    )
    ripple_thread.start()
    try:
        i = 0
        while cycles is None or i < cycles:
            i += 1
            label = f"{i}/{cycles}" if cycles is not None else str(i)

            print(f"Wave {label}: elbow -> {ELBOW_WAVE_OPEN}")
            ctrl.run_threads([
                _mv(PCA_HAND, ELBOW, ELBOW_WAVE_OPEN, 35, 0.008),
                _mv(PCA_HAND, WRIST, WRIST_CENTER, 20, 0.008),
            ])

            print(f"Wave {label}: elbow -> {ELBOW_WAVE_BENT}")
            ctrl.run_threads([
                _mv(PCA_HAND, ELBOW, ELBOW_WAVE_BENT, 35, 0.008),
                _mv(PCA_HAND, WRIST, WRIST_CENTER, 20, 0.008),
            ])
    finally:
        stop_ripple.set()
        ripple_thread.join()


def perform_wave(mock=False):
    """Run the full wave sequence on real hardware (or mock, if mock=True).

    Sequence: center -> open hand -> wave-ready pose -> elbow wave -> center.
    Holds the cross-process hardware_lock() for the whole sequence, and
    always closes its PCA9685 handles before returning, even on error.
    """
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_REACH], mock=mock)
        ctrl.current = CENTERS.copy()
        try:
            print("Centering...")
            center_all(ctrl)
            time.sleep(0.4)

            print("Opening hand...")
            open_hand(ctrl)
            time.sleep(0.2)

            print("Moving to wave pose...")
            wave_ready_pose(ctrl)
            time.sleep(0.5)

            print("Waving...")
            elbow_wave(ctrl)
            time.sleep(0.4)

            print("Returning to center...")
            center_all(ctrl)

        finally:
            ctrl.close()


def wave_forever(mock=False, center_on_stop=False):
    """Move straight to the wave-ready pose (hand open, arm lifted) and keep
    waving from there forever, until interrupted with Ctrl+C.

    On Ctrl+C, settles the arm before closing: back to the wave-ready pose
    by default, or fully centered if center_on_stop=True.

    Unlike perform_wave(), this never centers first — the hand stays
    lifted for the whole run. Holds the cross-process hardware_lock() for
    the entire run, and always closes its PCA9685 handles on exit, even on
    error. Note the lock being held the whole time means nothing else
    (handshake, idle, another wave) can move the robot while this is
    running.
    """
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_REACH], mock=mock)
        ctrl.current = CENTERS.copy()
        try:
            print("Opening hand...")
            open_hand(ctrl)
            time.sleep(0.2)

            print("Moving to wave pose...")
            wave_ready_pose(ctrl)
            time.sleep(0.5)

            print("Waving forever (Ctrl+C to stop)...")
            elbow_wave(ctrl, cycles=None)

        except KeyboardInterrupt:
            if center_on_stop:
                print("Centering...")
                center_all(ctrl)
            else:
                print("Returning to wave-ready position...")
                wave_ready_pose(ctrl)
            raise

        finally:
            ctrl.close()


# ── ROS2 node ────────────────────────────────────────────────────────────
#
# Thin wrapper: on startup, runs perform_wave() once in a background thread
# and reports success/failure — no action server, no motion_server, no
# topics.
#
# Parameters:
#     use_mock_hardware (bool): print instead of moving real servos. Default True.

class WaveNode(Node):
    def __init__(self):
        super().__init__("wave")
        self.declare_parameter("use_mock_hardware", True)
        self._mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        self._started = False
        self.create_timer(1.0, self._start)

    def _start(self):
        if self._started:
            return
        self._started = True
        self.get_logger().info("Wave starting.")
        threading.Thread(target=self._run, daemon=False).start()

    def _run(self):
        try:
            perform_wave(mock=self._mock)
            self.get_logger().info("Wave complete.")
        except Exception as e:
            self.get_logger().error(f"Wave failed: {e}")


def main(args=None):
    rclpy.init(args=args)
    node = WaveNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        # Ctrl+C already triggers rclpy's own SIGINT handler, which shuts
        # the context down before this finally block runs — calling
        # shutdown() again raises RCLError, so only do it if still needed.
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/handshake.py": `"""
handshake.py

Handshake behavior — direct PCA9685 control. Extends the arm, opens the
hand, shakes, then returns to center.

Run:
    ros2 run swayform_robot handshake                                 # mock by default
    ros2 run swayform_robot handshake --ros-args -p use_mock_hardware:=false
    ros2 launch swayform_bringup handshake_demo.launch.py
    ros2 launch swayform_bringup handshake_demo.launch.py use_mock_hardware:=false

Or import and trigger it programmatically:
    from swayform_robot.behaviors.handshake import perform_handshake
    perform_handshake()

Importing this module never touches hardware — all I2C/PCA9685 setup
happens inside perform_handshake() itself.

Choreography and joint values are ported 1:1 from the pre-2026-08-12
version of this file (retargeted to that recalibration) — see
docs/legacy/handshake_reference.md for how the original (pre-recalibration)
choreography was preserved before its old joint values were retired.

This module is both the real implementation (perform_handshake, the
function anything else calls) and the ROS2 node (HandshakeNode/main()) that
runs it via \`ros2 run\`/\`ros2 launch\`.
"""

import time
import threading

import rclpy
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc

PCA_HAND = 0x40
PCA_REACH = 0x60

THUMB = 0
FINGERS = [1, 2, 3, 4]
WRIST = 5
ELBOW = 6
SHOULDER_ROLL = 7
SHOULDER_REACH = 1  # on PCA_REACH

CENTERS = {
    (PCA_HAND, THUMB): 50,
    (PCA_HAND, 1): 135,
    (PCA_HAND, 2): 135,
    (PCA_HAND, 3): 135,
    (PCA_HAND, 4): 135,
    (PCA_HAND, WRIST): 100,
    (PCA_HAND, ELBOW): 90,
    (PCA_HAND, SHOULDER_ROLL): 110,
    (PCA_REACH, SHOULDER_REACH): 115,
}

LIMITS = {
    (PCA_HAND, THUMB): (50, 135),
    (PCA_HAND, 1): (50, 135),
    (PCA_HAND, 2): (50, 135),
    (PCA_HAND, 3): (50, 135),
    (PCA_HAND, 4): (50, 135),
    (PCA_HAND, WRIST): (60, 160),
    (PCA_HAND, ELBOW): (20, 110),
    (PCA_HAND, SHOULDER_ROLL): (50, 120),
    (PCA_REACH, SHOULDER_REACH): (80, 160),
}

# ELBOW and SHOULDER_ROLL/SHOULDER_REACH are 270 ROM servos (elbow: 60kgcm
# replacement; both shoulder axes: 270 from the start) — see robot.yaml.
# CENTERS/LIMITS above are UNVERIFIED against this mapping and need
# re-testing on real hardware.
SERVO_RANGES = {
    (PCA_HAND, ELBOW): 270.0,
    (PCA_HAND, SHOULDER_ROLL): 270.0,
    (PCA_REACH, SHOULDER_REACH): 270.0,
}

TICK_DELAY = 0.02  # matches the old motion_server's ~20ms interpolation tick


def _mv(addr, ch, target, duration):
    steps = max(1, round(duration / TICK_DELAY))
    return {"addr": addr, "ch": ch, "target": target, "limits": LIMITS[(addr, ch)],
            "steps": steps, "delay": TICK_DELAY,
            "servo_range": SERVO_RANGES.get((addr, ch), 180.0)}


def extend_and_open(ctrl):
    """Extend arm forward and open hand together (2.5s)."""
    ctrl.run_threads([
        _mv(PCA_REACH, SHOULDER_REACH, 150.0, 2.5),
        _mv(PCA_HAND, ELBOW, 110.0, 2.5),
        _mv(PCA_HAND, SHOULDER_ROLL, 75.0, 2.5),
        _mv(PCA_HAND, WRIST, 110.0, 2.5),
        _mv(PCA_HAND, THUMB, 50.0, 2.5),
        _mv(PCA_HAND, 1, 135.0, 2.5),
        _mv(PCA_HAND, 2, 135.0, 2.5),
        _mv(PCA_HAND, 3, 135.0, 2.5),
        _mv(PCA_HAND, 4, 135.0, 2.5),
    ])


def shake(ctrl):
    """Shake oscillation — shoulder_reach only, fast."""
    for target, duration in [(155.0, 0.35), (145.0, 0.35), (155.0, 0.30), (145.0, 0.30), (150.0, 0.30)]:
        ctrl.run_threads([_mv(PCA_REACH, SHOULDER_REACH, target, duration)])


def return_home(ctrl):
    """Hand open, arm centered (2.0s)."""
    ctrl.run_threads([
        _mv(PCA_REACH, SHOULDER_REACH, 110.0, 2.0),
        _mv(PCA_HAND, ELBOW, 90.0, 2.0),
        _mv(PCA_HAND, SHOULDER_ROLL, 75.0, 2.0),
        _mv(PCA_HAND, WRIST, 110.0, 2.0),
        _mv(PCA_HAND, THUMB, 50.0, 2.0),
        _mv(PCA_HAND, 1, 135.0, 2.0),
        _mv(PCA_HAND, 2, 135.0, 2.0),
        _mv(PCA_HAND, 3, 135.0, 2.0),
        _mv(PCA_HAND, 4, 135.0, 2.0),
    ])


def perform_handshake(mock=True):
    """Run the full handshake sequence: extend+open -> shake -> return home.

    Holds the cross-process hardware_lock() for the whole sequence, and
    always closes its PCA9685 handles before returning, even on error.
    """
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_REACH], mock=mock)
        ctrl.current = CENTERS.copy()
        try:
            print("Extending arm and opening hand...")
            extend_and_open(ctrl)
            time.sleep(0.1)

            print("Shaking...")
            shake(ctrl)
            time.sleep(0.1)

            print("Returning home...")
            return_home(ctrl)

        finally:
            ctrl.close()


# ── ROS2 node ────────────────────────────────────────────────────────────
#
# Thin wrapper: on startup, runs perform_handshake() once in a background
# thread and reports success/failure — no action server, no motion_server,
# no topics.
#
# Parameters:
#     use_mock_hardware (bool): print instead of moving real servos. Default True.

class HandshakeNode(Node):
    def __init__(self):
        super().__init__("handshake")
        self.declare_parameter("use_mock_hardware", True)
        self._mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        self._started = False
        self.create_timer(1.0, self._start)

    def _start(self):
        if self._started:
            return
        self._started = True
        self.get_logger().info("Handshake starting.")
        threading.Thread(target=self._run, daemon=False).start()

    def _run(self):
        try:
            perform_handshake(mock=self._mock)
            self.get_logger().info("Handshake complete.")
        except Exception as e:
            self.get_logger().error(f"Handshake failed: {e}")


def main(args=None):
    rclpy.init(args=args)
    node = HandshakeNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        # Ctrl+C already triggers rclpy's own SIGINT handler, which shuts
        # the context down before this finally block runs — calling
        # shutdown() again raises RCLError, so only do it if still needed.
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/finger_wave.py": `"""
finger_wave.py

Makes SwayForm's fingers wave — right hand. The fingers move one after
another instead of all at once, so the motion looks like a little wave
traveling across the hand.

Run:
    ros2 run swayform_robot finger_wave

Or import and trigger a bounded run programmatically:
    from swayform_robot.behaviors.finger_wave import perform_finger_wave
    perform_finger_wave(seconds=5)

Importing this module never touches hardware — all I2C/PCA9685 setup happens
inside perform_finger_wave()/finger_wave_forever() themselves, so it's safe
to import in a dry-run context.

Same channels as wave.py's finger ripple (right_arm_pca/0x40, channels 0-4)
— kept standalone here rather than imported, matching this workspace's
existing pattern of each direct-hardware behavior hardcoding its own
CENTERS/LIMITS (see servo_control.py's docstring).

Motion: each finger follows a continuous sine curve, staggered a quarter
cycle (90°) behind the previous one — channel 1 leads, 2/3/4 follow in turn.
That quarter-cycle stagger is what makes finger 1 hit its peak (fully open)
at the exact moment finger 3 hits its trough (most curled) two fingers
later — a rolling wave down the hand, on a continuous loop. THUMB is set
once during open_hand() and never touched again.

Safe things to change:
    speed   — how fast the wave rolls (radians/sec). Lower = slower, higher
              = faster. Try 1.5 (slower) or 5.0 (faster) instead of the
              default 3.0.
    seconds — how many seconds perform_finger_wave() keeps waving before
              stopping. Try 10.0 to let it run about twice as long.
    reverse — True flips which finger leads, so the wave appears to travel
              the other direction across the hand.
"""

import time
import math

from swayform_robot.hardware import servo_control as sc

PCA_HAND = 0x40

THUMB = 0
FINGERS = [1, 2, 3, 4]  # index, middle, ring, pinky — ripple order

FINGER_OPEN = 135  # fully open reference; curling decreases from here

# Fingers span a full 85° (50-135) open<->curled range. 40° (~47% of that)
# is the smallest amplitude confirmed visible on hardware — these are
# string/tendon-driven, so smaller deltas get absorbed as cable slack before
# producing any real motion (see wave.py).
RIPPLE_AMPLITUDE = 40

RIPPLE_SPEED = 3.0            # radians/sec the wave rolls at
PHASE_OFFSET = math.pi / 2    # stagger between adjacent fingers (quarter cycle)
TICK = 0.02                   # seconds between position updates (~50Hz)

CENTERS = {
    (PCA_HAND, THUMB): 50,
    (PCA_HAND, 1): 135,
    (PCA_HAND, 2): 135,
    (PCA_HAND, 3): 135,
    (PCA_HAND, 4): 135,
}

LIMITS = {
    (PCA_HAND, THUMB): (50, 135),
    (PCA_HAND, 1): (50, 135),
    (PCA_HAND, 2): (50, 135),
    (PCA_HAND, 3): (50, 135),
    (PCA_HAND, 4): (50, 135),
}


def _mv(ch, target, steps=50, delay=0.01):
    return {
        "addr": PCA_HAND, "ch": ch, "target": target,
        "limits": LIMITS[(PCA_HAND, ch)],
        "steps": steps, "delay": delay,
        "servo_range": 180.0,
    }


def open_hand(ctrl):
    ctrl.run_threads([_mv(ch, target) for (_, ch), target in CENTERS.items()])


def _ripple_tick(ctrl, t, speed=RIPPLE_SPEED, reverse=False):
    """Write each finger's position for time \`t\` (seconds since the wave
    started). Direct set_servo() writes, not smooth_move — the sine curve
    itself is already the smooth motion."""
    order = list(reversed(FINGERS)) if reverse else FINGERS
    for i, ch in enumerate(order):
        theta = t * speed - i * PHASE_OFFSET
        angle = FINGER_OPEN - RIPPLE_AMPLITUDE * (0.5 + 0.5 * math.sin(theta))
        ctrl.set_servo(PCA_HAND, ch, angle, LIMITS[(PCA_HAND, ch)])


def finger_wave_forever(mock=False, speed=RIPPLE_SPEED, reverse=False):
    """Open the hand, then wave the 4 fingers forever until Ctrl+C.
    Settles back to fully open before closing, even on error.

    Holds the cross-process hardware_lock() for the entire run — nothing
    else (wave, handshake, idle) can move the robot while this runs.
    """
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND], mock=mock)
        ctrl.current = CENTERS.copy()
        try:
            print("Opening hand...")
            open_hand(ctrl)
            time.sleep(0.2)

            print("Waving fingers (Ctrl+C to stop)... thumb stays put")
            start = time.monotonic()
            while True:
                _ripple_tick(ctrl, time.monotonic() - start, speed, reverse)
                time.sleep(TICK)

        except KeyboardInterrupt:
            print("Returning to open hand...")
            open_hand(ctrl)
            raise

        finally:
            ctrl.close()


def perform_finger_wave(mock=False, seconds=5.0, speed=RIPPLE_SPEED, reverse=False):
    """Run the finger wave for a bounded duration, then return to open.
    Holds hardware_lock() for the whole run."""
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND], mock=mock)
        ctrl.current = CENTERS.copy()
        try:
            print("Opening hand...")
            open_hand(ctrl)
            time.sleep(0.2)

            print(f"Waving fingers for {seconds}s... thumb stays put")
            start = time.monotonic()
            while time.monotonic() - start < seconds:
                _ripple_tick(ctrl, time.monotonic() - start, speed, reverse)
                time.sleep(TICK)

            print("Returning to open hand...")
            open_hand(ctrl)

        finally:
            ctrl.close()


def main(args=None):
    """Console entry point (ros2 run swayform_robot finger_wave) — plain
    function call, no rclpy node needed for this behavior."""
    try:
        finger_wave_forever()
    except KeyboardInterrupt:
        print("\\nStopped.")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/idle.py": `"""
idle.py

Idle behavior — direct PCA9685 control. Makes the robot feel alive with
very subtle, slow fidgeting: each cycle nudges a handful of random joints
(head, arms, fingers — anything in robot.yaml) a few degrees off their
configured center.

Run:
    ros2 run swayform_robot idle                                 # mock by default
    ros2 run swayform_robot idle --ros-args -p use_mock_hardware:=false
    ros2 launch swayform_bringup idle_demo.launch.py
    ros2 launch swayform_bringup idle_demo.launch.py use_mock_hardware:=false

Or import and trigger single cycles programmatically:
    from swayform_robot.behaviors.idle import run_idle_cycle

Importing this module never touches hardware — all I2C/PCA9685 setup
happens inside perform_idle()/run_idle_cycle() themselves.

Lowest priority by convention: each cycle tries to acquire the shared
hardware_lock() (see swayform_robot.hardware.servo_control) WITHOUT
blocking, so it naturally backs off whenever wave/handshake is actively
moving the robot.

This module is both the real implementation (perform_idle/run_idle_cycle)
and the ROS2 node (IdleNode/main()) that runs it via \`ros2 run\`/
\`ros2 launch\`.
"""

import random
import time
import threading

import rclpy
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc
from swayform_robot.config import load_config

IDLE_REST_SECONDS = 4.0
IDLE_MOVE_DURATION = 2.0  # base seconds per move, before IDLE_SPEED slows it down
IDLE_SPEED = 0.3  # matches the original speed=0.3 goal param — deliberately slow/subtle
TICK_DELAY = 0.02  # matches the old motion_server's ~20ms interpolation tick

IDLE_OFFSET_RANGE = (2.0, 5.0)  # degrees off center, magnitude before random sign
IDLE_JOINTS_PER_CYCLE = (1, 3)  # inclusive random.randint range — keeps cycles subtle


def _load_idle_joints():
    """Read robot.yaml once and return (joints, board_addresses) — joints is
    {name: {board: <address>, channel, center_angle, min_angle, max_angle,
    servo_range}} for every joint in the config, addresses resolved from
    pca_boards so callers don't need to know board names."""
    cfg = load_config()
    board_addrs = {name: b["address"] for name, b in cfg["pca_boards"].items()}
    joints = {
        name: {
            "board": board_addrs[j["board"]],
            "channel": j["channel"],
            "center_angle": j["center_angle"],
            "min_angle": j["min_angle"],
            "max_angle": j["max_angle"],
            "servo_range": j.get("servo_range", 180.0),
        }
        for name, j in cfg["joints"].items()
    }
    return joints, sorted(set(board_addrs.values()))


def run_idle_cycle(ctrl, joints):
    """Nudge a small random handful of joints a few degrees off their
    robot.yaml center, all at once (threaded) — no automatic return to
    center; future cycles' random picks are what bring things back.
    Returns True if it moved, False if it skipped (hardware_lock held by
    something else more important right now)."""
    count = random.randint(*IDLE_JOINTS_PER_CYCLE)
    names = random.sample(list(joints), k=min(count, len(joints)))

    actual_duration = IDLE_MOVE_DURATION / IDLE_SPEED
    steps = max(1, round(actual_duration / TICK_DELAY))

    moves = []
    for name in names:
        j = joints[name]
        offset = random.uniform(*IDLE_OFFSET_RANGE) * random.choice((1, -1))
        moves.append({
            "addr": j["board"],
            "ch": j["channel"],
            "target": j["center_angle"] + offset,
            "limits": (j["min_angle"], j["max_angle"]),
            "steps": steps,
            "delay": TICK_DELAY,
            "servo_range": j["servo_range"],
        })

    try:
        with sc.hardware_lock(blocking=False):
            ctrl.run_threads(moves)
        return True
    except BlockingIOError:
        return False  # something else is moving the robot right now — skip


def perform_idle(cycles=None, mock=False, stop_event=None):
    """Run idle movements forever (cycles=None) or for a fixed number of
    cycles, pausing IDLE_REST_SECONDS between each. Ctrl+C to stop when run
    standalone; pass a threading.Event as stop_event to stop it from
    another thread (e.g. a ROS2 node shutting down) instead.
    """
    joints, board_addresses = _load_idle_joints()
    ctrl = sc.ServoController(board_addresses, mock=mock)
    ctrl.current = {
        (j["board"], j["channel"]): j["center_angle"] for j in joints.values()
    }
    try:
        i = 0
        while cycles is None or i < cycles:
            if stop_event is not None and stop_event.is_set():
                break
            run_idle_cycle(ctrl, joints)
            if stop_event is not None:
                stop_event.wait(IDLE_REST_SECONDS)
            else:
                time.sleep(IDLE_REST_SECONDS)
            i += 1
    finally:
        ctrl.close()


# ── ROS2 node ────────────────────────────────────────────────────────────
#
# Runs perform_idle() continuously on a background thread until the node
# shuts down — no action server, no motion_server, no RobotState topic.
#
# Parameters:
#     use_mock_hardware (bool): print instead of moving real servos. Default True.

class IdleNode(Node):
    def __init__(self):
        super().__init__("idle")
        self.declare_parameter("use_mock_hardware", True)
        mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value

        self._stop_event = threading.Event()
        self._thread = threading.Thread(
            target=perform_idle,
            kwargs={"mock": mock, "stop_event": self._stop_event},
            daemon=False,
        )
        self._thread.start()
        self.get_logger().info("Idle running (lowest priority — yields via hardware_lock).")

    def destroy_node(self):
        self._stop_event.set()
        self._thread.join(timeout=10.0)
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = IdleNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        # Ctrl+C already triggers rclpy's own SIGINT handler, which shuts
        # the context down before this finally block runs — calling
        # shutdown() again raises RCLError, so only do it if still needed.
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/config/__init__.py": `"""
config/__init__.py

Loads robot.yaml from the installed package share directory.
All nodes that need robot configuration call load_config() from here.
"""

import os
import yaml
from ament_index_python.packages import get_package_share_directory


def load_config(config_file: str = "robot.yaml") -> dict:
    """
    Load a robot config YAML from the installed share directory.

    The config file lives at:
        src/swayform_robot/swayform_robot/config/robot.yaml

    After building, it is installed to:
        install/swayform_robot/share/swayform_robot/config/robot.yaml
    """
    share_dir = get_package_share_directory("swayform_robot")
    path = os.path.join(share_dir, "config", config_file)

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Config file not found: {path}\\n"
            f"Did you run 'colcon build' and 'source install/setup.bash'?"
        )

    with open(path, "r") as f:
        return yaml.safe_load(f)


def load_pose(pose_name: str, config_file: str = "robot.yaml") -> dict:
    """Return {joint_name: angle_degrees} for a named pose from robot.yaml poses section."""
    cfg = load_config(config_file)
    poses = cfg.get("poses", {})
    if pose_name not in poses:
        available = list(poses.keys())
        raise KeyError(
            f"Pose '{pose_name}' not found in config. Available poses: {available}"
        )
    return dict(poses[pose_name])
`,

  "swayform_ws/src/swayform_robot/swayform_robot/config/robot.yaml": `# robot.yaml
#
# Central servo and hardware configuration for SwayForm.
# Edit this file to:
#   - Calibrate servo positions (home_angle, center_angle, min_angle, max_angle)
#   - Change I2C addresses after reflashing a PCA9685 board
#   - Add new joints
#   - Adjust named poses
#
# After editing, rebuild and re-source for changes to take effect:
#   cd ~/ros2_ws && colcon build && source install/setup.bash
#
# See docs/servo_guide.md for full calibration and testing instructions.

# ─────────────────────────────────────────────────
# HARDWARE MODE
# ─────────────────────────────────────────────────
# Set mock_mode: false when PCA9685 boards are physically connected.
# In mock mode all servo commands are logged to the terminal only.
hardware:
  mock_mode: true
  i2c_bus: 1

# ─────────────────────────────────────────────────
# PCA9685 BOARDS
# ─────────────────────────────────────────────────
# Verify addresses with:  i2cdetect -y 1
#
# IMPORTANT: 0x70 is the PCA9685 all-call broadcast address.
# Never configure 0x70 as an individual board address.
#
# Address quick reference (solder-pad combinations):
#   No pads: 0x40   A0: 0x41   A1: 0x42   A0+A1: 0x43
#   A2: 0x44   A0+A2: 0x45   A1+A2: 0x46   A0+A1+A2: 0x47
#   A3: 0x48   ...  A3+A2+A1+A0: 0x4F   (then skip 0x70, use 0x60-0x6F range)
pca_boards:
  right_arm_pca:
    address: 0x40
    frequency_hz: 50
    notes: "Right hand fingers (ch0-4), wrist (ch5), elbow (ch6), shoulder_roll (ch7)"

  reach_pca:
    address: 0x60
    frequency_hz: 50
    notes: "Shoulder pitch for both arms (ch0=left, ch1=right) and head (ch2=turn/yaw, ch3=nod/pitch)"

  left_arm_pca:
    address: 0x50
    frequency_hz: 50
    notes: "Left hand fingers (ch0-4), wrist (ch5), elbow (ch6), shoulder_roll (ch7)"

# ─────────────────────────────────────────────────
# JOINTS
# ─────────────────────────────────────────────────
# Fields:
#   board:        PCA board key (must match a key in pca_boards above)
#   channel:      PCA9685 channel 0-15
#   home_angle:   Safe starting / resting position (degrees)
#   center_angle: Neutral reference used for direction inversion
#   min_angle:    Hardware minimum — software enforces this limit
#   max_angle:    Hardware maximum — software enforces this limit
#   direction:    1 = normal,  -1 = inverted (mirrors around center_angle)
#   servo_range:  Pulse-width mapping range in degrees.
#                 Use 180 for standard 180° servos (500–2500µs mapped over 0–180°).
#                 Use 270 for wide-range servos (500–2500µs mapped over 0–270°).
#   notes:        Human-readable description

joints:

  # ─── RIGHT HAND  (board: right_arm_pca / 0x40) ───────────────────────────
  # Thumb: increasing angle = curl inward
  thumb:
    board: right_arm_pca
    channel: 0
    home_angle: 50.0
    center_angle: 50.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Thumb. 50=open/straight, 135=fully curled. Increasing angle curls inward."

  # Fingers: decreasing angle = curl inward
  index_finger:
    board: right_arm_pca
    channel: 1
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Index finger. 135=open, 50=fully curled. Decreasing angle curls inward."

  middle_finger:
    board: right_arm_pca
    channel: 2
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Middle finger. 135=open, 50=fully curled. Decreasing angle curls inward."

  ring_finger:
    board: right_arm_pca
    channel: 3
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Ring finger. 135=open, 50=fully curled. Decreasing angle curls inward."

  pinky_finger:
    board: right_arm_pca
    channel: 4
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Pinky finger. 135=open, 50=fully curled. Decreasing angle curls inward."

  # ─── RIGHT ARM  (board: right_arm_pca / 0x40) ────────────────────────────
  wrist:
    board: right_arm_pca
    channel: 5
    home_angle: 100.0
    center_angle: 100.0
    min_angle: 60.0
    max_angle: 160.0
    direction: 1
    servo_range: 180
    notes: "Wrist. Center 100. Range 60-160."

  elbow:
    board: right_arm_pca
    channel: 6
    home_angle: 130.0
    center_angle: 130.0
    min_angle: 40.0
    max_angle: 140.0
    direction: 1
    servo_range: 270
    notes: "Elbow. Center 130. Inward limit 40, backward limit 140. Wave oscillates between 40-70. Wide-range (270) servo — 60kgcm/270 ROM unit. Re-tested on real hardware 2026-08-14 against the 270 mapping via try.py (was 90/20/110, an unverified carryover from the old 180 mapping)."

  shoulder_roll:
    board: right_arm_pca
    channel: 7
    home_angle: 160.0
    center_angle: 160.0
    min_angle: 40.0
    max_angle: 170.0
    direction: 1
    servo_range: 270
    notes: "Shoulder roll. Center 160. Outer limit 40 (also the wave pose target), inner limit 170. Wide-range (270) servo. Re-tested on real hardware 2026-08-14 against the 270 mapping via try.py (was 110/30/120, an unverified carryover from the old 180 mapping)."

  # ─── REACH AXIS  (board: reach_pca / 0x60) ───────────────────────────────
  # ch0 = left arm shoulder pitch
  # ch1 = right arm shoulder pitch
  right_shoulder_pitch:
    board: reach_pca
    channel: 1
    home_angle: 170.0
    center_angle: 170.0
    min_angle: 150.0
    max_angle: 260.0
    direction: 1
    servo_range: 270
    notes: "Right arm shoulder pitch. Center 170. Back limit 150. Forward limit 260 — also the wave pose target, re-tested on real hardware 2026-08-14 via try.py against the 270 mapping (was 115/80/200, itself only a rough estimate before this proper try.py test pass). Handshake pose target (150 in the handshake_ready pose below) now falls on the BACK limit under this calibration and needs its own re-test — it no longer represents a forward reach. Wide-range (270) servo. Renamed from shoulder_reach 2026-08-14 to match left_shoulder_pitch."

  left_shoulder_pitch:
    board: reach_pca
    channel: 0
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 90.0
    max_angle: 170.0
    direction: 1
    servo_range: 270
    notes: "Left shoulder pitch. Center 135. Forward limit ~90, back limit ~170. Wide-range (270) servo — has been 270 from the start, previously mis-documented as 180. servo_range corrected; center/min/max angles are UNVERIFIED against this new mapping and need re-testing on hardware before real use."

  # ─── HEAD  (board: reach_pca / 0x60) ─────────────────────────────────────
  neck_pitch:
    board: reach_pca
    channel: 3
    home_angle: 105.0
    center_angle: 105.0
    min_angle: 95.0
    max_angle: 125.0
    direction: 1
    servo_range: 270
    notes: "Head nod (pitch). Center 105. Down limit 95, back/up limit 125."

  neck_yaw:
    board: reach_pca
    channel: 2
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 100.0
    max_angle: 180.0
    direction: 1
    servo_range: 270
    notes: "Head turn (yaw). Center 135. Left limit 180, right limit 100."

  # ─── LEFT ARM  (board: left_arm_pca / 0x50) ──────────────────────────────
  left_thumb:
    board: left_arm_pca
    channel: 0
    home_angle: 50.0
    center_angle: 50.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left thumb. 50=open/straight, 135=fully curled."

  left_index:
    board: left_arm_pca
    channel: 1
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left index finger. 135=open, 50=fully curled."

  left_middle:
    board: left_arm_pca
    channel: 2
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left middle finger. 135=open, 50=fully curled."

  left_ring:
    board: left_arm_pca
    channel: 3
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left ring finger. 135=open, 50=fully curled."

  left_pinky:
    board: left_arm_pca
    channel: 4
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left pinky finger. 135=open, 50=fully curled."

  left_wrist:
    board: left_arm_pca
    channel: 5
    home_angle: 100.0
    center_angle: 100.0
    min_angle: 60.0
    max_angle: 160.0
    direction: 1
    servo_range: 180
    notes: "Left wrist. Center 100. Range 60-160. Matches right wrist layout (ch5 was previously mislabeled left_elbow_rotate)."

  left_elbow:
    board: left_arm_pca
    channel: 6
    home_angle: 105.0
    center_angle: 105.0
    min_angle: 30.0
    max_angle: 120.0
    direction: 1
    servo_range: 270
    notes: "Left elbow. Center 105. Front (straight) limit 30, back (bent) limit 120. Wide-range (270) servo — upgraded to a 60kgcm/270 ROM unit (not fully used). servo_range corrected from 180; center/min/max angles are UNVERIFIED against this new mapping and need re-testing on hardware before real use."

  left_shoulder_roll:
    board: left_arm_pca
    channel: 7
    home_angle: 130.0
    center_angle: 130.0
    min_angle: 120.0
    max_angle: 190.0
    direction: 1
    servo_range: 270
    notes: "Left shoulder roll. Center 130. Inner limit 120, outer limit ~190. Wide-range (270) servo — do not set servo_range to 180 here or the outer limit will be silently clamped to 180."

# ─────────────────────────────────────────────────
# NAMED POSES
# ─────────────────────────────────────────────────
# Each pose is a dict of {joint_name: angle_degrees}.
# Use load_pose("hand_open") from swayform_robot.config to get the dict.
# All angles must be within the joint's min_angle / max_angle — limits are enforced
# in the motion server regardless, but it's good practice to keep them in range here.
poses:

  hand_open:
    thumb: 50.0
    index_finger: 135.0
    middle_finger: 135.0
    ring_finger: 135.0
    pinky_finger: 135.0

  hand_closed:
    thumb: 135.0
    index_finger: 50.0
    middle_finger: 50.0
    ring_finger: 50.0
    pinky_finger: 50.0

  arm_center:
    wrist: 100.0
    elbow: 130.0
    shoulder_roll: 160.0
    right_shoulder_pitch: 170.0

  # NOTE: elbow/shoulder_roll/right_shoulder_pitch below are UNVERIFIED
  # against the 2026-08-14 recalibration above — they were tuned against the
  # old numbers and have not been re-tested since. right_shoulder_pitch: 150
  # in particular now sits on the BACK limit, not a forward reach. Re-test
  # on hardware before using this pose.
  handshake_ready:
    right_shoulder_pitch: 150.0
    elbow: 110.0
    shoulder_roll: 110.0
    wrist: 100.0
    thumb: 50.0
    index_finger: 135.0
    middle_finger: 135.0
    ring_finger: 135.0
    pinky_finger: 135.0

  left_hand_open:
    left_thumb: 50.0
    left_index: 135.0
    left_middle: 135.0
    left_ring: 135.0
    left_pinky: 135.0

  left_hand_closed:
    left_thumb: 135.0
    left_index: 50.0
    left_middle: 50.0
    left_ring: 50.0
    left_pinky: 50.0

  left_grab_reach:
    left_shoulder_pitch: 100.0

  left_elbow_straight:
    left_elbow: 50.0

  left_elbow_bent_after_grab:
    left_elbow: 90.0

# ─────────────────────────────────────────────────
# TORSO MOTOR (DC motor via BTS7960 / IBT-2)
# ─────────────────────────────────────────────────
# All GPIO numbers use BCM numbering (not physical pin numbers).
# Wiring:
#   RPWM  → GPIO 18    LPWM  → GPIO 19
#   R_EN  → GPIO 23    L_EN  → GPIO 24
#   VCC   → Pi 5V      GND   → Pi GND (common ground)
#   R_IS / L_IS not connected.
#
# Direction logic:
#   Rotate right: RPWM active (PWM), LPWM low
#   Rotate left:  LPWM active (PWM), RPWM low
#   Stop:         both PWM pins low
torso_motor:
  type: dc_motor
  driver: BTS7960 / IBT-2
  gpio_mode: BCM
  enabled: true
  rpwm_gpio: 18
  lpwm_gpio: 19
  ren_gpio: 23
  len_gpio: 24
  vcc: "5V"
  gnd: common_ground_with_pi
  default_speed_percent: 35
  max_speed_percent: 60
  stop_behavior: both_pwm_low
  right_arrow_behavior: "RPWM active, LPWM low"
  left_arrow_behavior: "LPWM active, RPWM low"
  pwm_frequency_hz: 1000
  notes: "Torso rotation DC motor. Controlled by rotate.py."

# ─────────────────────────────────────────────────
# CAMERA
# ─────────────────────────────────────────────────
camera:
  enabled: false
  type: realsense_d435i
  rgb_width: 640
  rgb_height: 480
  rgb_fps: 30
  depth_width: 640
  depth_height: 480
  depth_fps: 30
  web_stream_port: 8080
  notes: "Intel RealSense D435i. Enable when camera is connected."
`,

  "swayform_ws/src/swayform_robot/swayform_robot/hardware/servo_control.py": `"""
servo_control.py

Shared PCA9685 hardware-control layer: pulse-width math, smooth threaded
moves, and a cross-process hardware lock. Used by
swayform_robot.behaviors.wave/handshake/idle/finger_wave and by
swayform_robot.vision.grab.

The pulse-width math below (angle -> 16-bit duty cycle, unclamped to
[0, servo_range]) is copied verbatim from wave.py's original implementation
— that's the one implementation that's actually been validated on real
hardware, so this extraction changes structure, not numbers. In particular
it deliberately does NOT clamp the angle/servo_range fraction to [0, 1] —
kept in case a future target needs to push past the nominal 2500us pulse
ceiling, as the right-arm wave pose's shoulder-pitch target once did under
the old (incorrect) 180-range mapping for that joint. Since that mapping
was corrected to 270 (2026-08-14) the current wave target (260 degrees,
see wave.py) sits well within range and no longer relies on this. Each
behavior's own CENTERS/LIMITS dict is what keeps angles sane before they
ever reach this module.

Cross-process safety: any script that moves servos — a standalone script
run directly, or a thin ROS2 node wrapper — should wrap the move in
hardware_lock() so two things can never write to the same boards at once.
This replaces the old behavior_lock.py, but works across separate OS
processes (behavior_lock only worked within one process), which is what
this workspace actually needs since standalone scripts and ROS2 nodes are
separate processes.
"""

import time
import threading
import fcntl
import contextlib

FREQ = 50
MIN_US = 500
MAX_US = 2500

_LOCK_PATH = "/tmp/swayform_servo.lock"


@contextlib.contextmanager
def hardware_lock(blocking: bool = True):
    """Cross-process mutex over physical servo access.

    blocking=True (default): wait until the lock is free.
    blocking=False: raise BlockingIOError immediately if something else
    currently holds it — used by low-priority behaviors (idle) that should
    skip a cycle rather than queue up behind a real behavior.
    """
    f = open(_LOCK_PATH, "w")
    try:
        fcntl.flock(f, fcntl.LOCK_EX if blocking else fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        fcntl.flock(f, fcntl.LOCK_UN)
        f.close()


def angle_to_duty(angle: float, servo_range: float = 180.0) -> int:
    """Angle in degrees -> 16-bit PCA9685 duty cycle. Matches wave.py's
    original math exactly for servo_range=180 (the default)."""
    pulse_us = MIN_US + (angle / servo_range) * (MAX_US - MIN_US)
    return int((pulse_us / 20000.0) * 65535)


class ServoController:
    """Owns PCA9685 board handles for one or more boards and moves servos
    smoothly. Each behavior creates its own instance inside its
    perform_*()/run_*() function and closes it when done — mirrors
    wave.py's existing per-call open/close pattern, so nothing holds an
    I2C connection open when it isn't actively moving something.

    CENTERS/LIMITS/SERVO_RANGES are keyed by (board_address, channel),
    matching wave.py's existing style. SERVO_RANGES defaults to 180 for
    any key not present. 270 applies to: the head (neck_yaw, neck_pitch),
    both elbows (60kgcm replacements, 270 ROM though not fully used), and
    all 4 shoulder motors (left/right shoulder_roll, left/right
    shoulder_pitch — these have been 270 servos from the start).
    """

    def __init__(self, board_addresses, mock: bool = False):
        self.mock = mock
        self.current = {}
        self._lock = threading.Lock()
        self._pcas = {}
        if not mock:
            import board
            import busio
            from adafruit_pca9685 import PCA9685
            i2c = busio.I2C(board.SCL, board.SDA)
            for addr in board_addresses:
                pca = PCA9685(i2c, address=addr)
                pca.frequency = FREQ
                self._pcas[addr] = pca

    def set_servo(self, addr, ch, angle, limits, servo_range=180.0):
        low, high = limits
        angle = max(low, min(high, angle))
        with self._lock:
            self.current[(addr, ch)] = angle
            if self.mock:
                print(f"[MOCK] {hex(addr)} ch{ch} -> {angle:.1f}")
                return
            self._pcas[addr].channels[ch].duty_cycle = angle_to_duty(angle, servo_range)

    def smooth_move(self, addr, ch, target, limits, steps=60, delay=0.01, servo_range=180.0):
        start = self.current.get((addr, ch), target)
        low, high = limits
        target = max(low, min(high, target))

        for i in range(steps + 1):
            t = i / steps
            eased = t * t * (3 - 2 * t)
            angle = start + (target - start) * eased
            self.set_servo(addr, ch, angle, limits, servo_range)
            time.sleep(delay)

    def run_threads(self, moves):
        """moves: list of kwargs-dicts for smooth_move, e.g.
        {"addr": 0x40, "ch": 5, "target": 100, "limits": (60, 160)}."""
        threads = [threading.Thread(target=self.smooth_move, kwargs=m) for m in moves]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    def close(self):
        if not self.mock:
            for pca in self._pcas.values():
                pca.deinit()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/hardware/torso_motor.py": `"""
torso_motor.py

Torso DC motor control (BTS7960/IBT-2 over GPIO) — renamed from the
workspace-root rotate.py during the package migration for a clearer name.
Same GPIO logic, same PWM/direction behavior; only the config lookup
changed, from a hand-rolled relative-path YAML read to the package's
regular installed-share-directory loader (see swayform_robot.config),
since this module now lives inside the installed package rather than at
the workspace root.

Run directly for manual arrow-key torso testing:
    ros2 run swayform_robot torso_control
"""

import sys
import tty
import termios
import select
import signal
import lgpio

from swayform_robot.config import load_config as _load_robot_config

PWM_FREQ = 1000  # Hz — works well with BTS7960


# ── Config ────────────────────────────────────────────────────────────────────

def load_config():
    required_fields = [
        "rpwm_gpio", "lpwm_gpio", "ren_gpio", "len_gpio",
        "default_speed_percent", "max_speed_percent",
    ]

    data = _load_robot_config()
    cfg = data.get("torso_motor")
    if cfg is None:
        sys.exit("ERROR: 'torso_motor' section is missing from robot.yaml")

    for field in required_fields:
        if field not in cfg:
            sys.exit(f"ERROR: robot.yaml torso_motor is missing field: '{field}'")

    return cfg


# ── GPIO ──────────────────────────────────────────────────────────────────────

chip = None  # lgpio chip handle — set during setup


def setup_gpio(cfg):
    global chip
    chip = lgpio.gpiochip_open(4)  # Pi 5 GPIO is on gpiochip4

    # Enable pins — set HIGH so the driver is active
    lgpio.gpio_claim_output(chip, cfg["ren_gpio"], 1)
    lgpio.gpio_claim_output(chip, cfg["len_gpio"], 1)

    # PWM pins — start LOW (motor stopped)
    lgpio.gpio_claim_output(chip, cfg["rpwm_gpio"], 0)
    lgpio.gpio_claim_output(chip, cfg["lpwm_gpio"], 0)


def cleanup_gpio(cfg):
    if chip is None:
        return
    # Stop motor: both PWM pins to 0
    lgpio.tx_pwm(chip, cfg["rpwm_gpio"], PWM_FREQ, 0)
    lgpio.tx_pwm(chip, cfg["lpwm_gpio"], PWM_FREQ, 0)
    # Disable the driver
    lgpio.gpio_write(chip, cfg["ren_gpio"], 0)
    lgpio.gpio_write(chip, cfg["len_gpio"], 0)
    lgpio.gpiochip_close(chip)


# ── Motor control ─────────────────────────────────────────────────────────────

def stop_motor(cfg):
    lgpio.tx_pwm(chip, cfg["rpwm_gpio"], PWM_FREQ, 0)
    lgpio.tx_pwm(chip, cfg["lpwm_gpio"], PWM_FREQ, 0)


def rotate_right(cfg, speed_pct):
    # Always kill the opposite side first — never both active at once
    lgpio.tx_pwm(chip, cfg["lpwm_gpio"], PWM_FREQ, 0)
    lgpio.tx_pwm(chip, cfg["rpwm_gpio"], PWM_FREQ, speed_pct)


def rotate_left(cfg, speed_pct):
    lgpio.tx_pwm(chip, cfg["rpwm_gpio"], PWM_FREQ, 0)
    lgpio.tx_pwm(chip, cfg["lpwm_gpio"], PWM_FREQ, speed_pct)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    cfg = load_config()

    # Clamp speed to the configured maximum
    speed = min(cfg["default_speed_percent"], cfg["max_speed_percent"])

    setup_gpio(cfg)

    # Graceful exit on Ctrl+C or kill signal
    def handle_signal(sig, frame):
        print("\\nStopping motor and exiting...")
        stop_motor(cfg)
        cleanup_gpio(cfg)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    print("=== SwayForm Torso Rotation ===")
    print(f"  Speed        : {speed}%  (max {cfg['max_speed_percent']}%)")
    print(f"  RPWM GPIO    : {cfg['rpwm_gpio']}   LPWM GPIO : {cfg['lpwm_gpio']}")
    print(f"  R_EN GPIO    : {cfg['ren_gpio']}   L_EN GPIO : {cfg['len_gpio']}")
    print()
    print("  Right arrow  →  rotate right (RPWM active)")
    print("  Left arrow   →  rotate left  (LPWM active)")
    print("  Release key  →  stop")
    print("  q            →  quit")
    print("================================\\n")

    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    current_state = "stopped"

    try:
        tty.setraw(fd)

        while True:
            # Wait up to 100 ms for a keypress
            ready, _, _ = select.select([sys.stdin], [], [], 0.1)

            if not ready:
                # No key within timeout — key was released, stop motor
                if current_state != "stopped":
                    stop_motor(cfg)
                    current_state = "stopped"
                    print("  Stopped            ", end="\\r", flush=True)
                continue

            ch = sys.stdin.read(1)

            # Quit on q or Ctrl+C
            if ch in ("q", "Q", "\\x03"):
                break

            # Arrow keys arrive as a 3-byte escape sequence: ESC [ C/D
            if ch == "\\x1b":
                more, _, _ = select.select([sys.stdin], [], [], 0.05)
                if more:
                    rest = sys.stdin.read(2)
                    seq = ch + rest

                    if seq == "\\x1b[C":  # Right arrow
                        if current_state != "right":
                            rotate_right(cfg, speed)
                            current_state = "right"
                            print("  → Rotating RIGHT   ", end="\\r", flush=True)

                    elif seq == "\\x1b[D":  # Left arrow
                        if current_state != "left":
                            rotate_left(cfg, speed)
                            current_state = "left"
                            print("  ← Rotating LEFT    ", end="\\r", flush=True)

    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        stop_motor(cfg)
        cleanup_gpio(cfg)
        print("\\nDone.")


if __name__ == "__main__":
    main()
`,


  /* === PLANNED DEMOS (not yet real — no production robot behavior exists
     for these). Kept separate from swayform_robot/ above; promote a demo
     here into swayform_robot/behaviors/ once it has real source to sync. === */
  "swayform_ws/src/swayform_demos/package.xml": PACKAGE_XML("swayform_demos", "Planned demos: Pick and Place, Rock Paper Scissors, Interactive Exchange. Wave and Handshake moved to swayform_robot/ — see the real source there."),
  "swayform_ws/src/swayform_demos/setup.py": SETUP_PY("swayform_demos"),

  "swayform_ws/src/swayform_demos/pick_and_place.py": `"""
Demo: Pick and Place

Purpose:
Pick up a light object from a fixed pickup zone and place it in a
fixed place zone.

Important:
Pickup and place positions are tested, fixed poses in this version,
not general-purpose object localization.
"""

from time import sleep
from swayform.motion import MotionClient


LIFT_HOLD_SECONDS = 0.6
TRANSPORT_HOLD_SECONDS = 0.8

PICKUP_APPROACH = {"shoulder_pitch": 30, "shoulder_roll": 5, "elbow_pitch": 55, "wrist_yaw": 0}
PICKUP_GRASP    = {"shoulder_pitch": 34, "shoulder_roll": 5, "elbow_pitch": 62, "wrist_yaw": 0}
LIFT_POSE       = {"shoulder_pitch": 10, "shoulder_roll": 5, "elbow_pitch": 40, "wrist_yaw": 0}
PLACE_APPROACH  = {"shoulder_pitch": 20, "shoulder_roll": -25, "elbow_pitch": 55, "wrist_yaw": 0}


def approach_object(motion: MotionClient) -> None:
    """Move over the pickup zone before descending to grasp."""
    motion.move_joint_group("right_arm", PICKUP_APPROACH)
    sleep(0.5)


def grasp_object(motion: MotionClient) -> None:
    """Descend to the object and close the hand."""
    motion.move_joint_group("right_arm", PICKUP_GRASP)
    sleep(0.4)
    motion.set_hand_pose("right_hand", "gentle_close")
    sleep(LIFT_HOLD_SECONDS)


def lift_and_transport(motion: MotionClient) -> None:
    """Lift clear of the table before moving sideways to the place zone."""
    motion.move_joint_group("right_arm", LIFT_POSE)
    sleep(LIFT_HOLD_SECONDS)

    motion.move_joint_group("right_arm", PLACE_APPROACH)
    sleep(TRANSPORT_HOLD_SECONDS)


def release_object(motion: MotionClient) -> None:
    """Open the hand to release the object in the place zone."""
    motion.set_hand_pose("right_hand", "open")
    sleep(0.4)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("pick_and_place")
        approach_object(motion)
        grasp_object(motion)
        lift_and_transport(motion)
        release_object(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("pick_and_place")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_demos/rock_paper_scissors.py": `"""
Demo: Rock Paper Scissors

Purpose:
Play a round of rock-paper-scissors with the user. The robot picks randomly.

Important:
This version uses keyboard input for the user's choice.
A camera-assisted version can be added later using gesture detection.
Do not describe this as hand-recognition unless that is implemented.
"""

import random
from time import sleep
from swayform.motion import MotionClient
from swayform.audio import AudioPrompt


VALID_CHOICES = ["rock", "paper", "scissors"]
COUNTDOWN_SECONDS = 1.0
POSE_HOLD_SECONDS = 1.5
ROUNDS_TO_PLAY = 3

WINS_AGAINST = {
    "rock": "scissors",
    "scissors": "paper",
    "paper": "rock",
}


def countdown(audio: AudioPrompt) -> None:
    """Say rock, paper, scissors aloud before the reveal."""
    for word in ["Rock", "Paper", "Scissors", "Shoot!"]:
        audio.say(word)
        sleep(COUNTDOWN_SECONDS)


def get_user_choice() -> str:
    """Prompt the user and validate their choice."""
    while True:
        raw = input("Your move (rock / paper / scissors): ").strip().lower()
        if raw in VALID_CHOICES:
            return raw
        print(f"Please enter one of: {', '.join(VALID_CHOICES)}")


def judge(robot: str, user: str) -> str:
    """Return 'robot', 'user', or 'tie'."""
    if robot == user:
        return "tie"
    if WINS_AGAINST[robot] == user:
        return "robot"
    return "user"


def play_round(motion: MotionClient, audio: AudioPrompt) -> str:
    """Run one complete round. Returns winner: 'robot', 'user', or 'tie'."""
    robot_choice = random.choice(VALID_CHOICES)
    user_choice = get_user_choice()

    countdown(audio)

    motion.set_hand_pose("right_hand", robot_choice)
    sleep(POSE_HOLD_SECONDS)

    result = judge(robot_choice, user_choice)
    print(f"Robot: {robot_choice}  |  You: {user_choice}  |  Result: {result}")

    motion.set_hand_pose("right_hand", "relaxed")
    return result


def main() -> None:
    motion = MotionClient()
    audio = AudioPrompt()

    scores = {"robot": 0, "user": 0, "tie": 0}

    motion.safe_pose("idle")

    for round_num in range(1, ROUNDS_TO_PLAY + 1):
        print(f"\\n--- Round {round_num} ---")
        winner = play_round(motion, audio)
        scores[winner] += 1

    print(f"\\nFinal score — Robot: {scores['robot']}  You: {scores['user']}  Ties: {scores['tie']}")
    motion.safe_pose("idle")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_demos/interactive_exchange.py": `"""
Demo: Interactive Exchange

Purpose:
A classroom interaction demo where the user gives the robot an item,
the robot accepts it, sets it aside, then presents a different item
in return. The reference example uses a $1 bill exchanged for a snack.

Important:
This is not real payment processing or currency validation.
The robot assumes every received bill is a $1 bill.
This demo is for supervised classroom interaction only.
"""

import enum
from time import sleep, time
from swayform.motion import MotionClient
from swayform.vision import RealSenseInput
from swayform.audio import AudioPrompt


ITEM_WAIT_TIMEOUT = 15.0
ITEM_HOLD_SECONDS = 0.6
HANDOFF_HOLD_SECONDS = 1.5


class ExchangeState(enum.Enum):
    WAIT_FOR_ITEM      = "wait_for_item"
    ACCEPT_ITEM        = "accept_item"
    PLACE_ITEM_ASIDE   = "place_item_aside"
    PICK_GIVE_ITEM     = "pick_give_item"
    HAND_ITEM_TO_USER  = "hand_item_to_user"
    RETURN_HOME        = "return_home"


def wait_for_item(camera: RealSenseInput, timeout: float) -> bool:
    """Poll until an item is detected in the exchange area, or timeout."""
    start = time()
    while time() - start < timeout:
        if camera.object_in_zone("exchange_area"):
            return True
        sleep(0.1)
    return False


def run_exchange(motion: MotionClient, audio: AudioPrompt) -> None:
    state = ExchangeState.ACCEPT_ITEM

    while state != ExchangeState.RETURN_HOME:
        print(f"State: {state.value}")

        if state == ExchangeState.ACCEPT_ITEM:
            motion.safe_pose("item_pickup")
            motion.set_hand_pose("right_hand", "gentle_close")
            sleep(ITEM_HOLD_SECONDS)
            state = ExchangeState.PLACE_ITEM_ASIDE

        elif state == ExchangeState.PLACE_ITEM_ASIDE:
            motion.safe_pose("item_side_drop")
            motion.set_hand_pose("right_hand", "open")
            sleep(0.3)
            state = ExchangeState.PICK_GIVE_ITEM

        elif state == ExchangeState.PICK_GIVE_ITEM:
            motion.safe_pose("give_item_pickup")
            sleep(0.4)
            state = ExchangeState.HAND_ITEM_TO_USER

        elif state == ExchangeState.HAND_ITEM_TO_USER:
            motion.safe_pose("give_item_handoff")
            audio.say("Here you go.")
            sleep(HANDOFF_HOLD_SECONDS)
            state = ExchangeState.RETURN_HOME

    motion.safe_pose("idle")


def main() -> None:
    motion = MotionClient()
    camera = RealSenseInput()
    audio  = AudioPrompt()

    motion.safe_pose("idle")
    audio.say("Ready. Place your item on the table.")

    item_detected = wait_for_item(camera, ITEM_WAIT_TIMEOUT)

    if not item_detected:
        audio.say("No item detected. Returning to idle.")
        motion.safe_pose("idle")
        return

    try:
        motion.lock_behavior("interactive_exchange")
        run_exchange(motion, audio)
    finally:
        motion.unlock_behavior("interactive_exchange")
        motion.safe_pose("idle")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/package.xml": PACKAGE_XML("swayform_labs", "The 10 available student labs, Level 1 — Control."),
  "swayform_ws/src/swayform_labs/setup.py": SETUP_PY("swayform_labs"),

  /* === LAB FILES (agent-authored): lab_01_finger_curl.py through
     lab_10_combined_keyboard_control.py, insert further entries below each
     keyed "swayform_ws/src/swayform_labs/lab_NN_slug.py", before the closing
     brace. (The earlier Level 1 curriculum's lab_01_hello_motion.py through
     lab_10_mini_demo_challenge.py have been removed — unlisted from
     CURRICULUM and unreferenced, they only cluttered the File Explorer;
     recoverable via git history if that content is ever revived.) === */

  "swayform_ws/src/swayform_labs/lab_01_finger_curl.py": `"""
Lab 01: Finger Curl

Goal:
Curl one finger, hold it, then return it to its starting position —
the smallest possible robot-control program.

Concepts:
- Choosing a joint
- Sending a movement
- Waiting for the servo to arrive
- Returning to a safe starting position

What to edit:
Finish curl_finger() by sending FINGER_JOINT back to START_ANGLE.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

FINGER_JOINT = "right_index_finger"
START_ANGLE = 10
CURL_ANGLE = 80
HOLD_SECONDS = 1.0


def curl_finger(motion: MotionClient) -> None:
    """
    Curl the finger, hold briefly, then return it to START_ANGLE.
    """
    motion.move_joint(FINGER_JOINT, CURL_ANGLE)
    sleep(HOLD_SECONDS)

    # TODO: move FINGER_JOINT back to START_ANGLE using motion.move_joint(...)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_01_finger_curl")
        curl_finger(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_01_finger_curl")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_02_nod_yes.py": `"""
Lab 02: Nod Yes

Goal:
Move the head through a short center -> down -> up -> center sequence
that reads as a "yes" nod.

Concepts:
- Sequences
- Timing
- Symmetric motion around a center position

What to edit:
Add the missing NOD_UP step in nod_yes(), matching the NOD_DOWN step above it.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

HEAD_PITCH = "head_pitch"
CENTER = 0
NOD_DOWN = -20
NOD_UP = 20
NOD_HOLD_SECONDS = 0.4


def nod_yes(motion: MotionClient) -> None:
    """
    Tilt the head down, then up, then return to center.
    """
    motion.move_joint(HEAD_PITCH, NOD_DOWN)
    sleep(NOD_HOLD_SECONDS)

    # TODO: move HEAD_PITCH to NOD_UP, then sleep(NOD_HOLD_SECONDS)

    motion.move_joint(HEAD_PITCH, CENTER)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_02_nod_yes")
        nod_yes(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_02_nod_yes")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_03_timed_torso_rotation.py": `"""
Lab 03: Timed Torso Rotation

Goal:
Rotate the torso through a predictable center -> right -> left -> center
sequence, always passing back through a known position.

Concepts:
- Sequences
- Pauses between steps
- Predictable motion

What to edit:
Finish rotate_torso() by pausing, then returning TORSO_YAW to CENTER.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

TORSO_YAW = "torso_yaw"
CENTER = 0
ROTATE_RIGHT = 30
ROTATE_LEFT = -30
PAUSE_SECONDS = 0.6


def rotate_torso(motion: MotionClient) -> None:
    """
    Rotate right, pause, rotate left, pause, then return to center.
    """
    motion.move_joint(TORSO_YAW, ROTATE_RIGHT)
    sleep(PAUSE_SECONDS)

    motion.move_joint(TORSO_YAW, ROTATE_LEFT)

    # TODO: sleep(PAUSE_SECONDS), then move TORSO_YAW back to CENTER


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_03_timed_torso_rotation")
        rotate_torso(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_03_timed_torso_rotation")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_04_basic_handshake.py": `"""
Lab 04: Basic Handshake

Goal:
Combine two joints — bend the elbow, then close the hand. Just those
two moves, no camera, no waiting for a person.

Concepts:
- Combining joints
- Hand poses
- Order of operations

What to edit:
Add the hand-close call in basic_handshake(), right after the elbow bends.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

RIGHT_ELBOW = "right_elbow"
ELBOW_BEND = 60
ELBOW_START = 0
HOLD_SECONDS = 1.5


def basic_handshake(motion: MotionClient) -> None:
    """
    Bend the elbow, close the hand, hold, then release and return.
    """
    motion.move_joint(RIGHT_ELBOW, ELBOW_BEND)

    # TODO: close the hand — motion.set_hand_pose("right_hand", "gentle_close")

    sleep(HOLD_SECONDS)
    motion.set_hand_pose("right_hand", "open")
    motion.move_joint(RIGHT_ELBOW, ELBOW_START)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_04_basic_handshake")
        basic_handshake(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_04_basic_handshake")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_05_keyboard_torso_control.py": `"""
Lab 05: Keyboard Torso Control

Goal:
Drive the torso left and right from live keyboard input, with the
angle always clamped inside a safe range.

Concepts:
- Keyboard input
- Clamping
- Safe limits

What to edit:
Clamp current_angle between TORSO_MIN and TORSO_MAX in handle_key().
"""

from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

TORSO_YAW = "torso_yaw"
TORSO_STEP = 10
TORSO_MIN = -45
TORSO_MAX = 45
STOP_KEY = "q"


def handle_key(motion: MotionClient, key: str, current_angle: int) -> int:
    """
    Step current_angle left or right, clamp it to a safe range, then move.
    """
    if key == "LEFT":
        current_angle -= TORSO_STEP
    elif key == "RIGHT":
        current_angle += TORSO_STEP

    # TODO: current_angle = max(min(current_angle, TORSO_MAX), TORSO_MIN)

    motion.move_joint(TORSO_YAW, current_angle)
    return current_angle


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")
    current_angle = 0

    try:
        motion.lock_behavior("lab_05_keyboard_torso_control")
        for key in motion.read_keys(stop_key=STOP_KEY):
            current_angle = handle_key(motion, key, current_angle)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_05_keyboard_torso_control")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_06_keyboard_head_control.py": `"""
Lab 06: Keyboard Head Control

Goal:
Drive head pitch and yaw from the keyboard — UP/DOWN tilts, LEFT/RIGHT
turns — as two independent, clamped axes.

Concepts:
- Keyboard input
- Two independent axes
- Clamping

What to edit:
Add the LEFT/RIGHT branches in handle_key(), mirroring UP/DOWN.
"""

from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

HEAD_PITCH = "head_pitch"
HEAD_YAW = "head_yaw"
STEP = 8
PITCH_MIN, PITCH_MAX = -20, 20
YAW_MIN, YAW_MAX = -35, 35
STOP_KEY = "q"


def handle_key(motion: MotionClient, key: str, current_pitch: int, current_yaw: int):
    """
    Route UP/DOWN to pitch and LEFT/RIGHT to yaw, each clamped independently.
    """
    if key == "UP":
        current_pitch = max(min(current_pitch + STEP, PITCH_MAX), PITCH_MIN)
        motion.move_joint(HEAD_PITCH, current_pitch)
    elif key == "DOWN":
        current_pitch = max(min(current_pitch - STEP, PITCH_MAX), PITCH_MIN)
        motion.move_joint(HEAD_PITCH, current_pitch)
    # TODO: handle "LEFT" and "RIGHT" the same way, using current_yaw and HEAD_YAW

    return current_pitch, current_yaw


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")
    current_pitch, current_yaw = 0, 0

    try:
        motion.lock_behavior("lab_06_keyboard_head_control")
        for key in motion.read_keys(stop_key=STOP_KEY):
            current_pitch, current_yaw = handle_key(motion, key, current_pitch, current_yaw)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_06_keyboard_head_control")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_07_full_handshake.py": `"""
Lab 07: Full Handshake

Goal:
Command the complete handshake behavior directly through code —
raise, close, hold, release, return home — no camera involved.

Concepts:
- Setup -> behavior -> cleanup
- finally blocks

What to edit:
Return the arm home inside the finally block of full_handshake().
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

RIGHT_ARM_RAISED = {"right_shoulder": 45, "right_elbow": 60}
RIGHT_ARM_HOME = {"right_shoulder": 0, "right_elbow": 0}
HOLD_SECONDS = 1.5


def full_handshake(motion: MotionClient) -> None:
    """
    Raise the arm, close the hand, hold, release — always return home.
    """
    try:
        motion.move_joint_group("right_arm", RIGHT_ARM_RAISED)
        motion.set_hand_pose("right_hand", "gentle_close")
        sleep(HOLD_SECONDS)
        motion.set_hand_pose("right_hand", "open")
    finally:
        # TODO: motion.move_joint_group("right_arm", RIGHT_ARM_HOME)
        pass


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_07_full_handshake")
        full_handshake(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_07_full_handshake")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_08_wave.py": `"""
Lab 08: Wave

Goal:
Write the repeating loop behind SwayForm's wave yourself, after
studying the finished Wave demo.

Concepts:
- Loops
- Repetition

What to edit:
Replace the "pass" in wave() with a for loop that calls wave_once()
WAVE_CYCLES times.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

WAVE_CYCLES = 3
WAVE_DELAY_SECONDS = 0.3


def wave_once(motion: MotionClient) -> None:
    """
    One wrist-left, wrist-right cycle.
    """
    motion.move_joint("right_wrist", -20)
    sleep(WAVE_DELAY_SECONDS)
    motion.move_joint("right_wrist", 20)
    sleep(WAVE_DELAY_SECONDS)


def wave(motion: MotionClient) -> None:
    """
    Repeat wave_once() WAVE_CYCLES times.
    """
    # TODO: for _ in range(WAVE_CYCLES): wave_once(motion)
    pass


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_08_wave")
        motion.move_joint_group("right_arm", {"right_shoulder": 42, "right_elbow": 70})
        wave(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_08_wave")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_09_rock_paper_scissors.py": `"""
Lab 09: Rock Paper Scissors

Goal:
A timed reveal: ready, countdown, then a randomly chosen hand pose.
No camera, no scoring against a person — that's the Demos version.

Concepts:
- Timing
- Randomness

What to edit:
Pause COUNTDOWN_SECONDS after each printed number in countdown().
"""

import random
from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

CHOICES = ["rock", "paper", "scissors"]
COUNTDOWN_SECONDS = 1.0


def countdown() -> None:
    """
    Print 3, 2, 1 with a pause between each number.
    """
    for number in (3, 2, 1):
        print(number)
        # TODO: sleep(COUNTDOWN_SECONDS)


def play(motion: MotionClient) -> None:
    """
    Choose randomly, count down, then show the chosen hand pose.
    """
    choice = random.choice(CHOICES)
    countdown()
    motion.set_hand_pose("right_hand", choice)
    print(f"SwayForm chose: {choice}")


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_09_rock_paper_scissors")
        play(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_09_rock_paper_scissors")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_labs/lab_10_combined_keyboard_control.py": `"""
Lab 10: Combined Keyboard Control (Control Level 1 capstone)

Goal:
Control the head and torso from the keyboard at the same time —
W A S D moves the head, arrow keys move the torso. A challenge,
not a graded submission.

Concepts:
- Combining independent systems
- Input routing

What to edit:
Add the TORSO_KEYS branch in handle_key(), mirroring the HEAD_KEYS branch.
"""

from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

HEAD_KEYS = {"w", "a", "s", "d"}
TORSO_KEYS = {"LEFT", "RIGHT"}
STOP_KEY = "q"


def handle_head_key(motion: MotionClient, key: str, current_pitch_yaw):
    # Reuses the same idea as Lab 06 — left as an exercise to extend.
    return current_pitch_yaw


def handle_torso_key(motion: MotionClient, key: str, current_angle: int) -> int:
    # Reuses the same idea as Lab 05 — left as an exercise to extend.
    return current_angle


def handle_key(motion: MotionClient, key: str, state: dict) -> dict:
    """
    Route a keypress to the head or torso handler, based on which set it's in.
    """
    if key in HEAD_KEYS:
        state["head"] = handle_head_key(motion, key, state["head"])
    # TODO: elif key in TORSO_KEYS: state["torso"] = handle_torso_key(motion, key, state["torso"])

    return state


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")
    state = {"head": (0, 0), "torso": 0}

    try:
        motion.lock_behavior("lab_10_combined_keyboard_control")
        for key in motion.read_keys(stop_key=STOP_KEY):
            state = handle_key(motion, key, state)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_10_combined_keyboard_control")


if __name__ == "__main__":
    main()
`,
};
