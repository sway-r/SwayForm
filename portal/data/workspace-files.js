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
     planned-but-not-yet-real demos (pick and place, rock paper scissors),
     which stay separate until they're real too. === */

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

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py": `"""Wave behavior: source of truth for the right-arm wave motion, with a slight left-arm lift (channels, centers, limits)."""

import time
import math
import threading

import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc

PCA_HAND = 0x40
PCA_HAND_LEFT = 0x50
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

# Left arm lift (elbow stays bent)
LEFT_SHOULDER_ROLL_LIFT = 150
LEFT_ELBOW_BENT = 65

FINGER_OPEN = 135
RIPPLE_AMPLITUDE = 40   # degrees of finger travel
RIPPLE_SPEED = 3.0      # radians/sec the wave rolls at
PHASE_OFFSET = math.pi / 2
RIPPLE_TICK = 0.02      # seconds between position updates (~50Hz)

WAVE_CYCLES = 1
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
    (PCA_HAND_LEFT, ELBOW): 155,
    (PCA_HAND_LEFT, SHOULDER_ROLL): 120,
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
    (PCA_HAND_LEFT, ELBOW): (65, 165),
    (PCA_HAND_LEFT, SHOULDER_ROLL): (110, 250),
    (PCA_REACH, SHOULDER_PITCH): (150, 260),
}

SERVO_RANGES = {
    (PCA_HAND, ELBOW): 270.0,
    (PCA_HAND, SHOULDER_ROLL): 270.0,
    (PCA_HAND_LEFT, ELBOW): 270.0,
    (PCA_HAND_LEFT, SHOULDER_ROLL): 270.0,
    (PCA_REACH, SHOULDER_PITCH): 270.0,
}

REST = {key: sc.REST_POSE[key] for key in CENTERS}  # start and end pose: elbow bent, shoulder slightly back


def _mv(addr, ch, target, steps, delay):
    """Build a ServoController.run_threads() move scaled by SPEED_SCALE."""
    return {
        "addr": addr, "ch": ch, "target": target,
        "limits": LIMITS[(addr, ch)],
        "steps": steps, "delay": delay / SPEED_SCALE,
        "servo_range": SERVO_RANGES.get((addr, ch), 180.0),
    }


def center_all(ctrl):
    moves = [_mv(addr, ch, target, 70, 0.01) for (addr, ch), target in REST.items()]
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
        _mv(PCA_HAND_LEFT, SHOULDER_ROLL, LEFT_SHOULDER_ROLL_LIFT, 85, 0.01),
        _mv(PCA_HAND_LEFT, ELBOW, LEFT_ELBOW_BENT, 65, 0.009),
        _mv(PCA_HAND, THUMB, 50, 55, 0.01),
        _mv(PCA_HAND, 1, 135, 55, 0.01),
        _mv(PCA_HAND, 2, 135, 55, 0.01),
        _mv(PCA_HAND, 3, 135, 55, 0.01),
        _mv(PCA_HAND, 4, 135, 55, 0.01),
    ])


def _ripple_tick(ctrl, t):
    """Write each finger's ripple position for time \`t\`; THUMB is untouched."""
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
    """Run \`cycles\` elbow oscillations (forever if None) with the fingers rippling in the background."""
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
    """Run the full sequence: rest pose -> open hand -> wave-ready pose -> elbow wave -> rest pose."""
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_HAND_LEFT, PCA_REACH], mock=mock)
        ctrl.current = REST.copy()
        try:
            print("Moving to the rest pose...")
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

            print("Returning to the rest pose...")
            center_all(ctrl)

        finally:
            ctrl.close()


def wave_forever(mock=False, center_on_stop=False):
    """Go to the wave-ready pose and keep waving until Ctrl+C, then settle the arm."""
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_HAND_LEFT, PCA_REACH], mock=mock)
        ctrl.current = REST.copy()
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
                print("Moving to the rest pose...")
                center_all(ctrl)
            else:
                print("Returning to wave-ready position...")
                wave_ready_pose(ctrl)
            raise

        finally:
            ctrl.close()


# ── ROS2 node ────────────────────────────────────────────────────────────
class WaveNode(Node):
    def __init__(self):
        super().__init__("wave")
        self.declare_parameter("use_mock_hardware", False)
        self._mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        self._started = False
        self.failed = False
        self.create_timer(1.0, self._start)

    def _start(self):
        if self._started:
            return
        self._started = True
        if self._mock:
            print("[MOCK] use_mock_hardware is true: this run prints moves only, the robot will not move.", flush=True)
            self.get_logger().warning("use_mock_hardware is true: this run will not move the robot.")
        self.get_logger().info("Wave starting.")
        threading.Thread(target=self._run, daemon=False).start()

    def _run(self):
        try:
            perform_wave(mock=self._mock)
            self.get_logger().info("Wave complete.")
        except Exception as e:
            self.failed = True
            self.get_logger().error(f"Wave failed: {e}")
        finally:
            if rclpy.ok():
                rclpy.shutdown()


def main(args=None):
    rclpy.init(args=args)
    node = WaveNode()
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
    if node.failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/handshake.py": `"""Handshake behavior: reach forward while the left arm swings back, grip, shake, then open the hand and return to the rest pose."""

import time
import threading

import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc

PCA_HAND = 0x40
PCA_REACH = 0x60

THUMB = 0
FINGERS = [1, 2, 3, 4]
WRIST = 5
ELBOW = 6
SHOULDER_ROLL = 7
SHOULDER_PITCH = 1  # on PCA_REACH
SHOULDER_PITCH_LEFT = 0  # on PCA_REACH

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
    (PCA_REACH, SHOULDER_PITCH_LEFT): 215,
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
    (PCA_REACH, SHOULDER_PITCH_LEFT): (125, 255),
}

SERVO_RANGES = {
    (PCA_HAND, ELBOW): 270.0,
    (PCA_HAND, SHOULDER_ROLL): 270.0,
    (PCA_REACH, SHOULDER_PITCH): 270.0,
    (PCA_REACH, SHOULDER_PITCH_LEFT): 270.0,
}

REST = {key: sc.REST_POSE[key] for key in CENTERS}  # start and end pose: elbow bent, shoulder slightly back

# Reach pose: shoulder pitch swings forward from center by this many degrees.
REACH_PITCH_OFFSET = 50
ELBOW_BENT_IN = LIMITS[(PCA_HAND, ELBOW)][0] + 20  # backed off 20° from the full-bend limit

# Left arm swings back while the right arm reaches.
LEFT_PITCH_SWING_BACK = 255

# Shake offset (degrees) and number of up-down cycles.
SHAKE_OFFSET = 5
SHAKE_CYCLES = 1

REACH_DURATION = 1.5
HOLD_BEFORE_GRIP = 2.0  # pause at the reach pose before closing the hand
GRIP_DURATION = 2.0
FINGER_CURL_AMOUNT = 40  # degrees fingers curl in from open — thumb still curls all the way
SHAKE_STEP_DURATION = 0.3
RETURN_DURATION = 2.0

TICK_DELAY = 0.02  # matches the old motion_server's ~20ms interpolation tick


def _mv(addr, ch, target, duration):
    steps = max(1, round(duration / TICK_DELAY))
    return {"addr": addr, "ch": ch, "target": target, "limits": LIMITS[(addr, ch)],
            "steps": steps, "delay": TICK_DELAY,
            "servo_range": SERVO_RANGES.get((addr, ch), 180.0)}


def reach_forward(ctrl):
    """Shoulder pitch swings forward and the elbow bends all the way in; hand stays open; the left arm swings back."""
    reach_target = CENTERS[(PCA_REACH, SHOULDER_PITCH)] + REACH_PITCH_OFFSET
    ctrl.run_threads([
        _mv(PCA_REACH, SHOULDER_PITCH, reach_target, REACH_DURATION),
        _mv(PCA_REACH, SHOULDER_PITCH_LEFT, LEFT_PITCH_SWING_BACK, REACH_DURATION),
        _mv(PCA_HAND, ELBOW, ELBOW_BENT_IN, REACH_DURATION),
        _mv(PCA_HAND, SHOULDER_ROLL, CENTERS[(PCA_HAND, SHOULDER_ROLL)], REACH_DURATION),
        _mv(PCA_HAND, WRIST, CENTERS[(PCA_HAND, WRIST)], REACH_DURATION),
        _mv(PCA_HAND, THUMB, CENTERS[(PCA_HAND, THUMB)], REACH_DURATION),
        _mv(PCA_HAND, 1, CENTERS[(PCA_HAND, 1)], REACH_DURATION),
        _mv(PCA_HAND, 2, CENTERS[(PCA_HAND, 2)], REACH_DURATION),
        _mv(PCA_HAND, 3, CENTERS[(PCA_HAND, 3)], REACH_DURATION),
        _mv(PCA_HAND, 4, CENTERS[(PCA_HAND, 4)], REACH_DURATION),
    ])


def grip(ctrl):
    """Thumb curls to its limit; fingers curl FINGER_CURL_AMOUNT degrees from open over GRIP_DURATION."""
    ctrl.run_threads([
        _mv(PCA_HAND, THUMB, LIMITS[(PCA_HAND, THUMB)][1], GRIP_DURATION),
        _mv(PCA_HAND, 1, CENTERS[(PCA_HAND, 1)] - FINGER_CURL_AMOUNT, GRIP_DURATION),
        _mv(PCA_HAND, 2, CENTERS[(PCA_HAND, 2)] - FINGER_CURL_AMOUNT, GRIP_DURATION),
        _mv(PCA_HAND, 3, CENTERS[(PCA_HAND, 3)] - FINGER_CURL_AMOUNT, GRIP_DURATION),
        _mv(PCA_HAND, 4, CENTERS[(PCA_HAND, 4)] - FINGER_CURL_AMOUNT, GRIP_DURATION),
    ])


def shake(ctrl, elbow_base):
    """Pump the elbow ±SHAKE_OFFSET degrees around \`elbow_base\` for SHAKE_CYCLES cycles, then settle."""
    for _ in range(SHAKE_CYCLES):
        ctrl.run_threads([_mv(PCA_HAND, ELBOW, elbow_base + SHAKE_OFFSET, SHAKE_STEP_DURATION)])
        ctrl.run_threads([_mv(PCA_HAND, ELBOW, elbow_base - SHAKE_OFFSET, SHAKE_STEP_DURATION)])
    ctrl.run_threads([_mv(PCA_HAND, ELBOW, elbow_base, SHAKE_STEP_DURATION)])


def open_and_return(ctrl):
    """Open the hand and bring every joint back to the rest pose."""
    ctrl.run_threads([_mv(addr, ch, target, RETURN_DURATION) for (addr, ch), target in REST.items()])


def perform_handshake(mock=False):
    """Run the full sequence: reach forward -> hold -> grip -> shake -> open hand and return to the rest pose."""
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_REACH], mock=mock)
        ctrl.current = REST.copy()
        try:
            print("Reaching forward...")
            reach_forward(ctrl)
            time.sleep(HOLD_BEFORE_GRIP)

            print("Gripping...")
            grip(ctrl)
            time.sleep(0.1)

            print("Shaking...")
            shake(ctrl, ELBOW_BENT_IN)
            time.sleep(0.1)

            print("Opening hand and returning to the rest pose...")
            open_and_return(ctrl)

        finally:
            ctrl.close()


# ── ROS2 node ────────────────────────────────────────────────────────────
class HandshakeNode(Node):
    def __init__(self):
        super().__init__("handshake")
        self.declare_parameter("use_mock_hardware", False)
        self._mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        self._started = False
        self.failed = False
        self.create_timer(1.0, self._start)

    def _start(self):
        if self._started:
            return
        self._started = True
        if self._mock:
            print("[MOCK] use_mock_hardware is true: this run prints moves only, the robot will not move.", flush=True)
            self.get_logger().warning("use_mock_hardware is true: this run will not move the robot.")
        self.get_logger().info("Handshake starting.")
        threading.Thread(target=self._run, daemon=False).start()

    def _run(self):
        try:
            perform_handshake(mock=self._mock)
            self.get_logger().info("Handshake complete.")
        except Exception as e:
            self.failed = True
            self.get_logger().error(f"Handshake failed: {e}")
        finally:
            if rclpy.ok():
                rclpy.shutdown()


def main(args=None):
    rclpy.init(args=args)
    node = HandshakeNode()
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
    if node.failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/fist_bump.py": `"""Fist bump behavior: raise the right arm with a curled fist while the left arm swings back, punch forward, then return to the rest pose."""

import time
import threading

import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc

ENABLE_HEAD_NOD = False

PCA_HAND = 0x40
PCA_REACH = 0x60

THUMB = 0
FINGERS = [1, 2, 3, 4]
WRIST = 5
ELBOW = 6
SHOULDER_ROLL = 7
SHOULDER_PITCH = 1  # on PCA_REACH
SHOULDER_PITCH_LEFT = 0  # on PCA_REACH
NECK_PITCH = 3      # on PCA_REACH — head nod

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
    (PCA_REACH, SHOULDER_PITCH_LEFT): 215,
    (PCA_REACH, NECK_PITCH): 161,  # head re-centered 2026-09-20
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
    (PCA_REACH, SHOULDER_PITCH_LEFT): (125, 265),
    (PCA_REACH, NECK_PITCH): (130, 180),  # re-tested on hardware 2026-09-15, was (95, 125)
}

# ELBOW, SHOULDER_ROLL, SHOULDER_PITCH and NECK_PITCH are 270 ROM servos (see robot.yaml).
SERVO_RANGES = {
    (PCA_HAND, ELBOW): 270.0,
    (PCA_HAND, SHOULDER_ROLL): 270.0,
    (PCA_REACH, SHOULDER_PITCH): 270.0,
    (PCA_REACH, SHOULDER_PITCH_LEFT): 270.0,
    (PCA_REACH, NECK_PITCH): 270.0,
}

REST = {key: sc.REST_POSE[key] for key in CENTERS}  # start and end pose: elbow bent, shoulder slightly back

FISTBUMP_PITCH_OFFSET = 35   # was 50 (handshake-matched)
ELBOW_BENT_IN = LIMITS[(PCA_HAND, ELBOW)][0] + 20  # used to derive JERK_ELBOW_PEAK
FIST_ELBOW_BASE = ELBOW_BENT_IN - 10   # 50, was ELBOW_BENT_IN itself (60, handshake-matched) — bent in 10 more

# Left arm swings back while the right arm raises.
LEFT_PITCH_SWING_BACK = 265

JERK_PITCH_PEAK = 245   # 15deg short of the 260 ceiling
JERK_ELBOW_PEAK = 90    # 50deg short of the 140 ceiling
JERK_OUT_DURATION = 0.144   # 20% slower than the original 0.12
JERK_BACK_DURATION = 0.3    # 20% slower than the original 0.25
JERK_CYCLES = 1

NOD_UP_OFFSET = 10
NOD_OUT_DURATION = JERK_OUT_DURATION * 1.2
NOD_BACK_DURATION = JERK_BACK_DURATION * 1.2

RAISE_DURATION = 1.5   # arm raise and hand curl run together, both finish at once
HOLD_BEFORE_BUMP = 2.0   # beat held as a raised fist before the jerk
RETURN_DURATION = 2.0

TICK_DELAY = 0.02  # ~20ms interpolation tick

TORSO_LEAN_DIRECTION = "right"
TORSO_RETURN_DIRECTION = "left"
TORSO_SPEED_PERCENT = 40  # above default_speed_percent (35); clamped at runtime to max_speed_percent
TORSO_LEAN_DURATION = 0.3    # gentle lean while the arm raises+curls
TORSO_SNAP_DURATION = JERK_OUT_DURATION  # timed with the punch
TORSO_RETURN_DURATION = TORSO_LEAN_DURATION + TORSO_SNAP_DURATION


def _mv(addr, ch, target, duration):
    steps = max(1, round(duration / TICK_DELAY))
    return {"addr": addr, "ch": ch, "target": target, "limits": LIMITS[(addr, ch)],
            "steps": steps, "delay": TICK_DELAY,
            "servo_range": SERVO_RANGES.get((addr, ch), 180.0)}


def raise_and_curl(ctrl):
    """Swing shoulder pitch and elbow to the pre-jerk pose while the thumb and fingers curl into a fist; the left arm swings back."""
    pitch_target = CENTERS[(PCA_REACH, SHOULDER_PITCH)] + FISTBUMP_PITCH_OFFSET
    elbow_target = FIST_ELBOW_BASE
    ctrl.run_threads([
        _mv(PCA_REACH, SHOULDER_PITCH, pitch_target, RAISE_DURATION),
        _mv(PCA_REACH, SHOULDER_PITCH_LEFT, LEFT_PITCH_SWING_BACK, RAISE_DURATION),
        _mv(PCA_HAND, ELBOW, elbow_target, RAISE_DURATION),
        _mv(PCA_HAND, SHOULDER_ROLL, CENTERS[(PCA_HAND, SHOULDER_ROLL)], RAISE_DURATION),
        _mv(PCA_HAND, WRIST, CENTERS[(PCA_HAND, WRIST)], RAISE_DURATION),
        _mv(PCA_HAND, THUMB, LIMITS[(PCA_HAND, THUMB)][1], RAISE_DURATION),
        _mv(PCA_HAND, 1, LIMITS[(PCA_HAND, 1)][0], RAISE_DURATION),
        _mv(PCA_HAND, 2, LIMITS[(PCA_HAND, 2)][0], RAISE_DURATION),
        _mv(PCA_HAND, 3, LIMITS[(PCA_HAND, 3)][0], RAISE_DURATION),
        _mv(PCA_HAND, 4, LIMITS[(PCA_HAND, 4)][0], RAISE_DURATION),
    ])
    return pitch_target, elbow_target


def bump_jerk(ctrl, pitch_base, elbow_base):
    """One quick forward punch to JERK_PITCH_PEAK/JERK_ELBOW_PEAK, then recoil to the raised pose."""
    moves_out = [
        _mv(PCA_REACH, SHOULDER_PITCH, JERK_PITCH_PEAK, JERK_OUT_DURATION),
        _mv(PCA_HAND, ELBOW, JERK_ELBOW_PEAK, JERK_OUT_DURATION),
    ]
    moves_back = [
        _mv(PCA_REACH, SHOULDER_PITCH, pitch_base, JERK_BACK_DURATION),
        _mv(PCA_HAND, ELBOW, elbow_base, JERK_BACK_DURATION),
    ]

    if ENABLE_HEAD_NOD:
        nod_up = CENTERS[(PCA_REACH, NECK_PITCH)] + NOD_UP_OFFSET
        nod_center = CENTERS[(PCA_REACH, NECK_PITCH)]
        moves_out.append(_mv(PCA_REACH, NECK_PITCH, nod_up, NOD_OUT_DURATION))
        moves_back.append(_mv(PCA_REACH, NECK_PITCH, nod_center, NOD_BACK_DURATION))

    for _ in range(JERK_CYCLES):
        ctrl.run_threads(moves_out)
        ctrl.run_threads(moves_back)


def open_and_return(ctrl):
    """Open the hand and bring every joint back to the rest pose."""
    ctrl.run_threads([_mv(addr, ch, target, RETURN_DURATION) for (addr, ch), target in REST.items()])


class _TorsoPulse:
    """Timed wrapper around hardware/torso_motor.py for the fist bump's lean, snap and recenter."""

    def __init__(self, mock):
        self.mock = mock
        self.tm = None
        self.cfg = None
        self.speed = TORSO_SPEED_PERCENT
        if not mock:
            from swayform_robot.hardware import torso_motor as tm
            self.tm = tm
            self.cfg = tm.load_config()
            self.tm.setup_gpio(self.cfg)
            self.speed = min(TORSO_SPEED_PERCENT, self.cfg["max_speed_percent"])

    def pulse(self, direction, duration):
        if self.mock:
            print(f"[MOCK] torso {direction} @ {self.speed}% for {duration}s")
            time.sleep(duration)
            return
        move = self.tm.rotate_right if direction == "right" else self.tm.rotate_left
        move(self.cfg, self.speed)
        time.sleep(duration)
        self.tm.stop_motor(self.cfg)

    def close(self):
        if self.mock:
            return
        self.tm.stop_motor(self.cfg)
        self.tm.cleanup_gpio(self.cfg)


def perform_fist_bump(mock=False):
    """Run the full sequence: raise and curl -> hold -> bump jerk -> open hand and return to the rest pose."""
    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_REACH], mock=mock)
        ctrl.current = REST.copy()
        torso = None
        try:
            torso = _TorsoPulse(mock)

            print("Raising fist...")
            lean = threading.Thread(target=torso.pulse, args=(TORSO_LEAN_DIRECTION, TORSO_LEAN_DURATION))
            lean.start()
            pitch_base, elbow_base = raise_and_curl(ctrl)
            lean.join()
            time.sleep(HOLD_BEFORE_BUMP)

            print("Bump!")
            snap = threading.Thread(target=torso.pulse, args=(TORSO_LEAN_DIRECTION, TORSO_SNAP_DURATION))
            snap.start()
            bump_jerk(ctrl, pitch_base, elbow_base)
            snap.join()
            time.sleep(0.1)

            print("Opening hand and returning to the rest pose...")
            recenter = threading.Thread(target=torso.pulse, args=(TORSO_RETURN_DIRECTION, TORSO_RETURN_DURATION))
            recenter.start()
            open_and_return(ctrl)
            recenter.join()

        finally:
            if torso is not None:
                torso.close()
            ctrl.close()


# ── ROS2 node ────────────────────────────────────────────────────────────
class FistBumpNode(Node):
    def __init__(self):
        super().__init__("fist_bump")
        self.declare_parameter("use_mock_hardware", False)
        self._mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        self._started = False
        self.failed = False
        self.create_timer(1.0, self._start)

    def _start(self):
        if self._started:
            return
        self._started = True
        if self._mock:
            print("[MOCK] use_mock_hardware is true: this run prints moves only, the robot will not move.", flush=True)
            self.get_logger().warning("use_mock_hardware is true: this run will not move the robot.")
        self.get_logger().info("Fist bump starting.")
        threading.Thread(target=self._run, daemon=False).start()

    def _run(self):
        try:
            perform_fist_bump(mock=self._mock)
            self.get_logger().info("Fist bump complete.")
        except Exception as e:
            self.failed = True
            self.get_logger().error(f"Fist bump failed: {e}")
        finally:
            if rclpy.ok():
                rclpy.shutdown()


def main(args=None):
    rclpy.init(args=args)
    node = FistBumpNode()
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
    if node.failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/finger_count.py": `"""Finger-count behavior: raise the right arm (with a slight left-arm lift), hold a fist or show NUMBER fingers, then return to center."""

import time
import threading

import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc

NUMBER = None

PCA_HAND = 0x40
PCA_HAND_LEFT = 0x50
PCA_REACH = 0x60

THUMB = 0
FINGER_ORDER = [1, 2, 3, 4]  # index, middle, ring, pinky — the order they extend in for counting
WRIST = 5
ELBOW = 6
SHOULDER_ROLL = 7
SHOULDER_PITCH = 1  # on PCA_REACH

SHOULDER_ROLL_WAVE = 40
SHOULDER_PITCH_WAVE = 260
ELBOW_WAVE_BENT = 40
WRIST_CENTER = 100

# Left arm lift (elbow stays bent)
LEFT_SHOULDER_ROLL_LIFT = 150
LEFT_ELBOW_BENT = 65

FINGER_EXTENDED = 135  # fully open
FINGER_CURLED = 50     # fully curled (fist)
THUMB_EXTENDED = 50    # fully open
THUMB_CURLED = 135     # fully curled; thumb range is reversed vs. the fingers

HOLD_SECONDS = 4.0

CENTERS = {
    (PCA_HAND, THUMB): 50,
    (PCA_HAND, 1): 135,
    (PCA_HAND, 2): 135,
    (PCA_HAND, 3): 135,
    (PCA_HAND, 4): 135,
    (PCA_HAND, WRIST): 100,
    (PCA_HAND, ELBOW): 130,
    (PCA_HAND, SHOULDER_ROLL): 160,
    (PCA_HAND_LEFT, ELBOW): 155,
    (PCA_HAND_LEFT, SHOULDER_ROLL): 120,
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
    (PCA_HAND_LEFT, ELBOW): (65, 165),
    (PCA_HAND_LEFT, SHOULDER_ROLL): (110, 250),
    (PCA_REACH, SHOULDER_PITCH): (150, 260),
}

# ELBOW, SHOULDER_ROLL and SHOULDER_PITCH are 270 ROM servos (see robot.yaml).
SERVO_RANGES = {
    (PCA_HAND, ELBOW): 270.0,
    (PCA_HAND, SHOULDER_ROLL): 270.0,
    (PCA_HAND_LEFT, ELBOW): 270.0,
    (PCA_HAND_LEFT, SHOULDER_ROLL): 270.0,
    (PCA_REACH, SHOULDER_PITCH): 270.0,
}

REST = {key: sc.REST_POSE[key] for key in CENTERS}  # start and end pose: elbow bent, shoulder slightly back

RAISE_DURATION = 1.5
RETURN_DURATION = 2.0
TICK_DELAY = 0.02


def _mv(addr, ch, target, duration):
    steps = max(1, round(duration / TICK_DELAY))
    return {"addr": addr, "ch": ch, "target": target, "limits": LIMITS[(addr, ch)],
            "steps": steps, "delay": TICK_DELAY,
            "servo_range": SERVO_RANGES.get((addr, ch), 180.0)}


def _finger_targets(number):
    """Angles for THUMB and FINGER_ORDER to show \`number\`: None/0 is a fist, 1-5 extends that many fingers."""
    if not number:
        targets = {THUMB: THUMB_CURLED}
        targets.update({ch: FINGER_CURLED for ch in FINGER_ORDER})
        return targets

    extended = set(FINGER_ORDER[:min(number, 4)])
    targets = {ch: (FINGER_EXTENDED if ch in extended else FINGER_CURLED) for ch in FINGER_ORDER}
    targets[THUMB] = THUMB_EXTENDED if number >= 5 else THUMB_CURLED
    return targets


def close_fist(ctrl):
    """Curl the whole hand into a fist before the arm raises."""
    targets = _finger_targets(None)
    ctrl.run_threads([_mv(PCA_HAND, ch, target, RAISE_DURATION) for ch, target in targets.items()])


def raise_arm(ctrl):
    """Swing shoulder roll/pitch, elbow and wrist up to the wave-ready pose; fingers untouched."""
    ctrl.run_threads([
        _mv(PCA_HAND, SHOULDER_ROLL, SHOULDER_ROLL_WAVE, RAISE_DURATION),
        _mv(PCA_REACH, SHOULDER_PITCH, SHOULDER_PITCH_WAVE, RAISE_DURATION),
        _mv(PCA_HAND, ELBOW, ELBOW_WAVE_BENT, RAISE_DURATION),
        _mv(PCA_HAND, WRIST, WRIST_CENTER, RAISE_DURATION),
        _mv(PCA_HAND_LEFT, SHOULDER_ROLL, LEFT_SHOULDER_ROLL_LIFT, RAISE_DURATION),
        _mv(PCA_HAND_LEFT, ELBOW, LEFT_ELBOW_BENT, RAISE_DURATION),
    ])


def show_number(ctrl, number):
    """Extend fingers/thumb to show \`number\`."""
    targets = _finger_targets(number)
    ctrl.run_threads([_mv(PCA_HAND, ch, target, RAISE_DURATION) for ch, target in targets.items()])


def open_and_return(ctrl):
    """Open the hand and bring every joint back to the rest pose."""
    ctrl.run_threads([_mv(addr, ch, target, RETURN_DURATION) for (addr, ch), target in REST.items()])


def perform_finger_count(mock=False):
    """Run the full sequence: fist -> raise -> show NUMBER -> hold -> open hand and return to the rest pose."""
    if NUMBER is not None and NUMBER not in (1, 2, 3, 4, 5):
        raise ValueError(f"NUMBER must be None or a whole number 1-5, got {NUMBER!r}")

    with sc.hardware_lock():
        ctrl = sc.ServoController([PCA_HAND, PCA_HAND_LEFT, PCA_REACH], mock=mock)
        ctrl.current = REST.copy()
        try:
            print("Closing fist...")
            close_fist(ctrl)
            time.sleep(0.2)

            print("Raising arm...")
            raise_arm(ctrl)
            time.sleep(0.3)

            if NUMBER is None:
                print("Holding fist...")
            else:
                print(f"Showing {NUMBER}...")
                show_number(ctrl, NUMBER)
            time.sleep(HOLD_SECONDS)

            print("Opening hand and returning to the rest pose...")
            open_and_return(ctrl)

        finally:
            ctrl.close()


# ── ROS2 node ────────────────────────────────────────────────────────────
class FingerCountNode(Node):
    def __init__(self):
        super().__init__("finger_count")
        self.declare_parameter("use_mock_hardware", False)
        self._mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        self._started = False
        self.failed = False
        self.create_timer(1.0, self._start)

    def _start(self):
        if self._started:
            return
        self._started = True
        if self._mock:
            print("[MOCK] use_mock_hardware is true: this run prints moves only, the robot will not move.", flush=True)
            self.get_logger().warning("use_mock_hardware is true: this run will not move the robot.")
        self.get_logger().info("Finger count starting.")
        threading.Thread(target=self._run, daemon=False).start()

    def _run(self):
        try:
            perform_finger_count(mock=self._mock)
            self.get_logger().info("Finger count complete.")
        except Exception as e:
            self.failed = True
            self.get_logger().error(f"Finger count failed: {e}")
        finally:
            if rclpy.ok():
                rclpy.shutdown()


def main(args=None):
    rclpy.init(args=args)
    node = FingerCountNode()
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
    if node.failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/target_lock.py": `"""Target Lock: put the five steps in the right order, then steer the robot to grab an object and lift it."""

import threading

import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node

from swayform_robot.targeting.steps import (
    TargetLockSession,
    activate_crosshair,
    load_controls,
    run_system_check,
    unlock_arm,
    unlock_movement,
)

# Put one function name inside each pair of parentheses.
STEP_1 = ()
STEP_2 = ()
STEP_3 = ()
STEP_4 = ()
STEP_5 = ()


def perform_target_lock(mock=False):
    steps = [STEP_1, STEP_2, STEP_3, STEP_4, STEP_5]
    with TargetLockSession(mock=mock) as session:
        for number, step in enumerate(steps, start=1):
            if not callable(step):
                print(f"Step {number} is empty.", flush=True)
                return
            if not step(session):
                return


class TargetLockNode(Node):
    def __init__(self):
        super().__init__("target_lock")
        self.declare_parameter("use_mock_hardware", True)
        self._mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        self._started = False
        self.create_timer(1.0, self._start)

    def _start(self):
        if self._started:
            return
        self._started = True
        self.get_logger().info("Target Lock starting.")
        threading.Thread(target=self._run, daemon=False).start()

    def _run(self):
        try:
            perform_target_lock(mock=self._mock)
            self.get_logger().info("Target Lock complete.")
        except Exception as e:
            self.get_logger().error(f"Target Lock failed: {e}")
        finally:
            if rclpy.ok():
                rclpy.shutdown()


def main(args=None):
    rclpy.init(args=args)
    node = TargetLockNode()
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/finger_wave.py": `"""Finger wave behavior: the right hand's fingers ripple one after another."""

import time
import math

from swayform_robot.hardware import servo_control as sc

PCA_HAND = 0x40

THUMB = 0
FINGERS = [1, 2, 3, 4]  # index, middle, ring, pinky — ripple order

FINGER_OPEN = 135  # fully open reference; curling decreases from here

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
    """Write each finger's position for time \`t\` (seconds since the wave started)."""
    order = list(reversed(FINGERS)) if reverse else FINGERS
    for i, ch in enumerate(order):
        theta = t * speed - i * PHASE_OFFSET
        angle = FINGER_OPEN - RIPPLE_AMPLITUDE * (0.5 + 0.5 * math.sin(theta))
        ctrl.set_servo(PCA_HAND, ch, angle, LIMITS[(PCA_HAND, ch)])


def finger_wave_forever(mock=False, speed=RIPPLE_SPEED, reverse=False):
    """Open the hand, then ripple the four fingers until Ctrl+C; holds hardware_lock() for the run."""
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
    """Run the finger wave for a bounded duration, then return to open."""
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
    """Console entry point (ros2 run swayform_robot finger_wave); no rclpy node needed."""
    try:
        finger_wave_forever()
    except KeyboardInterrupt:
        print("\\nStopped.")


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/behaviors/idle.py": `"""Idle behavior: holds the rest pose, and runs random ambient gestures on the arms and head while movement is on."""

import random
import sys
import time
import math
import threading

import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node

from swayform_robot.hardware import servo_control as sc

PCA_HAND = 0x40
PCA_HAND_LEFT = 0x50
PCA_REACH = 0x60

THUMB = 0
INDEX = 1
MIDDLE = 2
RING = 3
PINKY = 4
WRIST = 5
ELBOW = 6
SHOULDER_ROLL = 7
SHOULDER_PITCH = 1
SHOULDER_PITCH_LEFT = 0
NECK_YAW = 2
NECK_PITCH = 3

FINGER_CHANNELS = [INDEX, MIDDLE, RING, PINKY]

LIMITS = {
    (PCA_HAND, THUMB): (50, 135),
    (PCA_HAND, INDEX): (50, 135),
    (PCA_HAND, MIDDLE): (50, 135),
    (PCA_HAND, RING): (50, 135),
    (PCA_HAND, PINKY): (50, 135),
    (PCA_HAND, WRIST): (60, 160),
    (PCA_HAND, ELBOW): (40, 140),
    (PCA_HAND, SHOULDER_ROLL): (40, 170),
    (PCA_HAND_LEFT, THUMB): (50, 135),
    (PCA_HAND_LEFT, INDEX): (50, 135),
    (PCA_HAND_LEFT, MIDDLE): (50, 135),
    (PCA_HAND_LEFT, RING): (50, 135),
    (PCA_HAND_LEFT, PINKY): (50, 135),
    (PCA_HAND_LEFT, WRIST): (60, 160),
    (PCA_HAND_LEFT, ELBOW): (65, 165),
    (PCA_HAND_LEFT, SHOULDER_ROLL): (110, 250),
    (PCA_REACH, SHOULDER_PITCH): (150, 260),
    (PCA_REACH, SHOULDER_PITCH_LEFT): (125, 235),
    (PCA_REACH, NECK_YAW): (120, 260),
    (PCA_REACH, NECK_PITCH): (130, 180),
}

SERVO_RANGES = {
    (PCA_HAND, ELBOW): 270.0,
    (PCA_HAND, SHOULDER_ROLL): 270.0,
    (PCA_HAND_LEFT, ELBOW): 270.0,
    (PCA_HAND_LEFT, SHOULDER_ROLL): 270.0,
    (PCA_REACH, SHOULDER_PITCH): 270.0,
    (PCA_REACH, SHOULDER_PITCH_LEFT): 270.0,
    (PCA_REACH, NECK_YAW): 270.0,
    (PCA_REACH, NECK_PITCH): 270.0,
}

REST_POSE = {key: sc.REST_POSE[key] for key in LIMITS}


class _RightArm:
    name = "right"
    hand = PCA_HAND
    pitch = SHOULDER_PITCH
    finger_open = 135
    finger_curled = 50
    curl_sign = -1
    thumb_open = 50
    thumb_curled = 135
    wave_roll = 40
    wave_pitch = 260
    wave_elbow_bent = 40
    wave_elbow_open = 70
    counter_roll = 130   # shoulder roll while the other arm gestures: 30 outward of rest, mirrors the labs' 150
    look_yaw_offset = -15
    torso_out = "right"
    torso_back = "left"


class _LeftArm:
    name = "left"
    hand = PCA_HAND_LEFT
    pitch = SHOULDER_PITCH_LEFT
    finger_open = 50
    finger_curled = 135
    curl_sign = 1
    thumb_open = 135
    thumb_curled = 50
    wave_roll = 250
    wave_pitch = 125
    wave_elbow_bent = 65
    wave_elbow_open = 95
    counter_roll = 150   # LEFT_SHOULDER_ROLL_LIFT in wave.py / finger_count.py
    look_yaw_offset = 15
    torso_out = "left"
    torso_back = "right"


RIGHT = _RightArm
LEFT = _LeftArm
ARMS = [RIGHT, LEFT]

_active_arms = list(ARMS)


def _counterweight(arms):
    """The arm that lifts against a one-arm gesture, or None (both arms gesturing, or its board is missing)."""
    if len(arms) != 1:
        return None
    other = LEFT if arms[0] is RIGHT else RIGHT
    return other if other in _active_arms else None


def _arm_keys(arm):
    hand_channels = [THUMB, INDEX, MIDDLE, RING, PINKY, WRIST, ELBOW, SHOULDER_ROLL]
    return [(arm.hand, ch) for ch in hand_channels] + [(PCA_REACH, arm.pitch)]


TICK_DELAY = 0.02

IDLE_REST_SECONDS = (3.0, 12.0)

HEAD_SPEED_DEG_PER_SEC = 33.0
HEAD_HOLD_SECONDS = 2.0

ELBOW_LIMIT_DURATION = 1.5
ARM_RAISE_DURATION = 2.5
ARM_RETURN_DURATION = 3.0
CENTER_DURATION = 3.0

WAVE_STROKE_DURATION = 1.2

RIPPLE_AMPLITUDE = 40
RIPPLE_SPEED = 3.0
PHASE_OFFSET = math.pi / 2
RIPPLE_TICK = 0.02
FINGER_CURL_SECONDS = 3.0

HAND_DURATION = 1.5
PEACE_NUMBER = 2
PEACE_HOLD_SECONDS = 2.5
PEACE_TORSO_SPEED_PERCENT = 30
PEACE_TORSO_SECONDS = 0.8


class _Stopped(Exception):
    pass


_stop_event = threading.Event()
_movement_event = threading.Event()


def _check_stop():
    if _stop_event.is_set() or not _movement_event.is_set():
        raise _Stopped


def _hold(seconds):
    deadline = time.monotonic() + seconds
    while True:
        _check_stop()
        left = deadline - time.monotonic()
        if left <= 0:
            return
        _stop_event.wait(min(0.1, left))


def _mv(addr, ch, target, duration):
    steps = max(1, round(duration / TICK_DELAY))
    return {
        "addr": addr, "ch": ch, "target": target, "limits": LIMITS[(addr, ch)],
        "steps": steps, "delay": TICK_DELAY,
        "servo_range": SERVO_RANGES.get((addr, ch), 180.0),
    }


def _arm_to_rest(ctrl, duration, *arms):
    _check_stop()
    other = _counterweight(arms)
    if other is not None:
        arms = (*arms, other)
    keys = [key for arm in arms for key in _arm_keys(arm)]
    ctrl.run_threads([_mv(addr, ch, REST_POSE[(addr, ch)], duration) for (addr, ch) in keys])


def _head_move(ctrl, targets):
    starts = {ch: ctrl.current[(PCA_REACH, ch)] for ch in targets}
    travel = max(abs(targets[ch] - starts[ch]) for ch in targets)
    steps = max(1, round(travel / HEAD_SPEED_DEG_PER_SEC / TICK_DELAY))
    for i in range(1, steps + 1):
        t = i / steps
        for ch, target in targets.items():
            angle = starts[ch] + (target - starts[ch]) * t
            ctrl.set_servo(PCA_REACH, ch, angle, LIMITS[(PCA_REACH, ch)], SERVO_RANGES[(PCA_REACH, ch)])
        time.sleep(TICK_DELAY)


def _head_to_rest(ctrl):
    _check_stop()
    _head_move(ctrl, {ch: REST_POSE[(PCA_REACH, ch)] for ch in (NECK_YAW, NECK_PITCH)})


def _rest_all(ctrl):
    keys = [key for arm in _active_arms for key in _arm_keys(arm)]
    arms = threading.Thread(target=sc.go_to_rest, args=(ctrl, keys, CENTER_DURATION))
    arms.start()
    for ch in (NECK_YAW, NECK_PITCH):
        ctrl.current[(PCA_REACH, ch)] = ctrl.position(PCA_REACH, ch, SERVO_RANGES[(PCA_REACH, ch)])
    _head_move(ctrl, {ch: REST_POSE[(PCA_REACH, ch)] for ch in (NECK_YAW, NECK_PITCH)})
    arms.join()


def _finger_curl_wave(ctrl, arm, seconds):
    _check_stop()
    start = time.monotonic()
    while time.monotonic() - start < seconds and not _stop_event.is_set():
        t = time.monotonic() - start
        for i, ch in enumerate(FINGER_CHANNELS):
            theta = t * RIPPLE_SPEED - i * PHASE_OFFSET
            angle = arm.finger_open + arm.curl_sign * RIPPLE_AMPLITUDE * (0.5 + 0.5 * math.sin(theta))
            ctrl.set_servo(arm.hand, ch, angle, LIMITS[(arm.hand, ch)])
        time.sleep(RIPPLE_TICK)


def _run_concurrently(*calls):
    _check_stop()

    def guarded(fn, args):
        try:
            fn(*args)
        except _Stopped:
            pass

    threads = [threading.Thread(target=guarded, args=(fn, args)) for fn, args in calls]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    _check_stop()


def _finger_targets(arm, number):
    if not number:
        targets = {THUMB: arm.thumb_curled}
        targets.update({ch: arm.finger_curled for ch in FINGER_CHANNELS})
        return targets
    extended = set(FINGER_CHANNELS[:min(number, 4)])
    targets = {ch: (arm.finger_open if ch in extended else arm.finger_curled) for ch in FINGER_CHANNELS}
    targets[THUMB] = arm.thumb_open if number >= 5 else arm.thumb_curled
    return targets


def _show_fingers(ctrl, arm, number):
    _check_stop()
    ctrl.run_threads([_mv(arm.hand, ch, t, HAND_DURATION) for ch, t in _finger_targets(arm, number).items()])


def _raise_arm(ctrl, *arms):
    _check_stop()
    moves = []
    for arm in arms:
        moves += [
            _mv(arm.hand, SHOULDER_ROLL, arm.wave_roll, ARM_RAISE_DURATION),
            _mv(PCA_REACH, arm.pitch, arm.wave_pitch, ARM_RAISE_DURATION),
            _mv(arm.hand, ELBOW, arm.wave_elbow_bent, ARM_RAISE_DURATION),
            _mv(arm.hand, WRIST, REST_POSE[(arm.hand, WRIST)], ARM_RAISE_DURATION),
        ]
    other = _counterweight(arms)
    if other is not None:
        moves += [
            _mv(other.hand, SHOULDER_ROLL, other.counter_roll, ARM_RAISE_DURATION),
            _mv(other.hand, ELBOW, REST_POSE[(other.hand, ELBOW)], ARM_RAISE_DURATION),
        ]
    ctrl.run_threads(moves)


def _wave_stroke(ctrl, *arms):
    _check_stop()
    ctrl.run_threads([_mv(arm.hand, ELBOW, arm.wave_elbow_open, WAVE_STROKE_DURATION) for arm in arms])
    _check_stop()
    ctrl.run_threads([_mv(arm.hand, ELBOW, arm.wave_elbow_bent, WAVE_STROKE_DURATION) for arm in arms])


def _pick_arm():
    arm = random.choice(_active_arms)
    print(f"      {arm.name} arm")
    return arm


class _TorsoPulse:
    def __init__(self, mock):
        self.mock = mock
        self.tm = None
        self.cfg = None
        self.speed = PEACE_TORSO_SPEED_PERCENT
        self.net = 0.0
        if not mock:
            from swayform_robot.hardware import torso_motor as tm
            self.tm = tm
            self.cfg = tm.load_config()
            self.tm.setup_gpio(self.cfg)
            self.speed = min(PEACE_TORSO_SPEED_PERCENT, self.cfg["max_speed_percent"])

    def pulse(self, direction, duration, checked=True):
        if checked:
            _check_stop()
        sign = 1.0 if direction == "right" else -1.0
        began = time.monotonic()
        try:
            if self.mock:
                print(f"[MOCK] torso {direction} @ {self.speed}% for {duration:.1f}s")
                if checked:
                    _hold(duration)
                else:
                    time.sleep(duration)
                return
            move = self.tm.rotate_right if direction == "right" else self.tm.rotate_left
            move(self.cfg, self.speed)
            try:
                if checked:
                    _hold(duration)
                else:
                    time.sleep(duration)
            finally:
                self.tm.stop_motor(self.cfg)
        finally:
            self.net += sign * (time.monotonic() - began)

    def recenter(self):
        if abs(self.net) > 0.1:
            self.pulse("left" if self.net > 0 else "right", min(abs(self.net), 3.0), checked=False)
        self.net = 0.0

    def close(self):
        if self.mock:
            return
        self.tm.stop_motor(self.cfg)
        self.tm.cleanup_gpio(self.cfg)


def _head_glance(ctrl, first_offset, second_offset):
    _check_stop()
    yaw_center = REST_POSE[(PCA_REACH, NECK_YAW)]
    _head_move(ctrl, {NECK_YAW: yaw_center + first_offset})
    _hold(HEAD_HOLD_SECONDS)
    _head_move(ctrl, {NECK_YAW: yaw_center + second_offset})
    _hold(HEAD_HOLD_SECONDS)
    _head_to_rest(ctrl)


def action_head_glance_right_15_5(ctrl, torso):
    _head_glance(ctrl, -15, +5)


def action_head_glance_right_8_12(ctrl, torso):
    _head_glance(ctrl, -8, +12)


def action_head_glance_left_15_5(ctrl, torso):
    _head_glance(ctrl, +15, -5)


def action_head_glance_left_8_12(ctrl, torso):
    _head_glance(ctrl, +8, -12)


_HEAD_GLANCE_ACTIONS = [
    action_head_glance_right_15_5,
    action_head_glance_right_8_12,
    action_head_glance_left_15_5,
    action_head_glance_left_8_12,
]


def action_head_glance(ctrl, torso):
    glance = random.choice(_HEAD_GLANCE_ACTIONS)
    print(f"      {glance.__name__}")
    glance(ctrl, torso)


def action_wave_once(ctrl, torso):
    arm = _pick_arm()
    _raise_arm(ctrl, arm)
    _wave_stroke(ctrl, arm)
    _arm_to_rest(ctrl, ARM_RETURN_DURATION, arm)


def action_wave_both(ctrl, torso):
    _raise_arm(ctrl, RIGHT, LEFT)
    _wave_stroke(ctrl, RIGHT, LEFT)
    _arm_to_rest(ctrl, ARM_RETURN_DURATION, RIGHT, LEFT)


def action_finger_curl(ctrl, torso):
    arm = _pick_arm()
    _finger_curl_wave(ctrl, arm, FINGER_CURL_SECONDS)
    _arm_to_rest(ctrl, ARM_RETURN_DURATION, arm)


def action_look_and_curl(ctrl, torso):
    arm = _pick_arm()
    head_targets = {
        NECK_YAW: REST_POSE[(PCA_REACH, NECK_YAW)] + arm.look_yaw_offset,
        NECK_PITCH: LIMITS[(PCA_REACH, NECK_PITCH)][0],
    }
    elbow_in = [_mv(arm.hand, ELBOW, LIMITS[(arm.hand, ELBOW)][0], ELBOW_LIMIT_DURATION)]
    _run_concurrently((ctrl.run_threads, (elbow_in,)), (_head_move, (ctrl, head_targets)))
    _finger_curl_wave(ctrl, arm, FINGER_CURL_SECONDS)
    _run_concurrently((_arm_to_rest, (ctrl, ARM_RETURN_DURATION, arm)), (_head_to_rest, (ctrl,)))


def action_mix_wave_and_head(ctrl, torso):
    head_action = random.choice(_HEAD_GLANCE_ACTIONS)
    _run_concurrently((action_wave_once, (ctrl, torso)), (head_action, (ctrl, torso)))


def action_peace_and_wave(ctrl, torso):
    arm = _pick_arm()
    torso.pulse(arm.torso_out, PEACE_TORSO_SECONDS)
    _show_fingers(ctrl, arm, None)
    _raise_arm(ctrl, arm)
    _show_fingers(ctrl, arm, PEACE_NUMBER)
    _hold(PEACE_HOLD_SECONDS)
    torso.pulse(arm.torso_back, 2 * PEACE_TORSO_SECONDS)
    _show_fingers(ctrl, arm, 5)
    _wave_stroke(ctrl, arm)
    _run_concurrently(
        (_arm_to_rest, (ctrl, ARM_RETURN_DURATION, arm)),
        (torso.pulse, (arm.torso_out, PEACE_TORSO_SECONDS)),
    )


IDLE_ACTIONS = [
    action_head_glance,
    action_wave_once,
    action_wave_both,
    action_finger_curl,
    action_look_and_curl,
    action_mix_wave_and_head,
    action_peace_and_wave,
]

ARMS_NEEDED = {action_head_glance: 0, action_wave_both: 2}

BOARD_SCAN_ATTEMPTS = 5
BOARD_SCAN_INTERVAL = 0.5


def _find_boards(wanted, mock):
    """Boards that answer on the bus; a missing one is retried for ~2 s before it counts as absent."""
    for attempt in range(1, BOARD_SCAN_ATTEMPTS + 1):
        found = sc.present_boards(wanted, mock=mock)
        missing = [hex(addr) for addr in wanted if addr not in found]
        if not missing:
            return found
        print(f"Idle: board {', '.join(missing)} not answering (scan {attempt}/{BOARD_SCAN_ATTEMPTS})")
        time.sleep(BOARD_SCAN_INTERVAL)
    return found


def perform_idle(seconds=None, mock=False, stop_event=None, movement_event=None, stay=True, straighten=False):
    global _stop_event, _movement_event, _active_arms
    _stop_event = stop_event if stop_event is not None else threading.Event()
    if movement_event is None:
        movement_event = threading.Event()
        movement_event.set()
    _movement_event = movement_event

    wanted = [PCA_REACH] + [arm.hand for arm in ARMS]
    boards = _find_boards(wanted, mock)
    missing = [hex(addr) for addr in wanted if addr not in boards]
    # A park (stay off) has to reach every joint in the pose; a session can carry on without one arm.
    if PCA_REACH not in boards or (missing and not stay):
        raise RuntimeError(f"board {', '.join(missing)} not found; the robot was not moved")
    _active_arms = [arm for arm in ARMS if arm.hand in boards]
    for arm in ARMS:
        if arm not in _active_arms:
            print(f"Idle: {arm.name} arm board not found, skipping its gestures")
    actions = [a for a in IDLE_ACTIONS if ARMS_NEEDED.get(a, 1) <= len(_active_arms)]

    ctrl = sc.ServoController(boards, mock=mock)
    ctrl.current = dict(REST_POSE)
    torso = _TorsoPulse(mock)

    def rest(label):
        try:
            with sc.hardware_lock(blocking=False):
                print(f"Idle: {label}")
                torso.recenter()
                _rest_all(ctrl)
        except BlockingIOError:
            pass

    start = time.monotonic()
    deck = []
    last = None
    moving = False
    try:
        rest("moving to the rest pose")
        while stay and not _stop_event.is_set():
            if seconds is not None and time.monotonic() - start >= seconds:
                break
            if not _movement_event.is_set():
                if moving:
                    moving = False
                    rest("movement off, back to the rest pose")
                _stop_event.wait(0.2)
                continue
            if not moving:
                moving = True
                print("Idle: movement on")

            if not deck:
                deck = random.sample(actions, len(actions))
                if deck[0] is last and len(deck) > 1:
                    deck.append(deck.pop(0))
            action = deck.pop(0)
            try:
                with sc.hardware_lock(blocking=False):
                    print(f"Idle: {action.__name__}")
                    action(ctrl, torso)
                last = action
            except BlockingIOError:
                deck.insert(0, action)
            except _Stopped:
                continue

            pause_until = time.monotonic() + random.uniform(*IDLE_REST_SECONDS)
            while time.monotonic() < pause_until and _movement_event.is_set() and not _stop_event.is_set():
                _stop_event.wait(0.2)
    except BlockingIOError:
        pass
    finally:
        rest("back to the rest pose")
        if straighten:
            try:
                with sc.hardware_lock(blocking=False):
                    print("Idle: straightening the arms")
                    sc.go_to_straight(ctrl)
            except BlockingIOError:
                pass
        torso.close()
        ctrl.close()


class IdleNode(Node):
    def __init__(self):
        super().__init__("idle")
        self.declare_parameter("use_mock_hardware", False)
        self.declare_parameter("movement", True)
        self.declare_parameter("stay", True)
        self.declare_parameter("straighten", False)
        mock = self.get_parameter("use_mock_hardware").get_parameter_value().bool_value
        stay = self.get_parameter("stay").get_parameter_value().bool_value
        straighten = self.get_parameter("straighten").get_parameter_value().bool_value
        if mock:
            print("[MOCK] use_mock_hardware is true: this run prints moves only, the robot will not move.", flush=True)
            self.get_logger().warning("use_mock_hardware is true: this run will not move the robot.")

        self.done = False
        self.failed = False
        self._stop_event = threading.Event()
        self._movement_event = threading.Event()
        if self.get_parameter("movement").get_parameter_value().bool_value:
            self._movement_event.set()
        self._thread = threading.Thread(target=self._run, args=(mock, stay, straighten), daemon=False)
        self._thread.start()
        threading.Thread(target=self._read_commands, daemon=True).start()
        self.get_logger().info("Idle running.")

    def _run(self, mock, stay, straighten):
        try:
            perform_idle(mock=mock, stop_event=self._stop_event, movement_event=self._movement_event, stay=stay,
                         straighten=straighten)
        except Exception as e:
            print(f"Idle: ERROR {e}", file=sys.stderr, flush=True)
            self.failed = True
        finally:
            self.done = True

    def _read_commands(self):
        try:
            for line in sys.stdin:
                command = line.strip().lower()
                if command == "movement on":
                    self._movement_event.set()
                elif command == "movement off":
                    self._movement_event.clear()
        except (OSError, ValueError):
            pass

    def destroy_node(self):
        self._stop_event.set()
        self._thread.join(timeout=20.0)
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = IdleNode()
    try:
        while rclpy.ok() and not node.done:
            rclpy.spin_once(node, timeout_sec=0.2)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
    if node.failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
`,

  "swayform_ws/src/swayform_robot/swayform_robot/config/__init__.py": `"""Loads robot.yaml from the installed package share directory."""

import os
import yaml
from ament_index_python.packages import get_package_share_directory


def load_config(config_file: str = "robot.yaml") -> dict:
    """Load a robot config YAML from the installed share directory."""
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

  "swayform_ws/src/swayform_robot/swayform_robot/config/robot.yaml": `# Central servo and hardware configuration for SwayForm. Rebuild + re-source after editing.

# ─── HARDWARE MODE ───
# mock_mode: false once the PCA9685 boards are connected.
hardware:
  mock_mode: true
  i2c_bus: 1

# ─── PCA9685 BOARDS ───
# Verify with \`i2cdetect -y 1\`; never use 0x70 (all-call broadcast).
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

# ─── JOINTS ───
# servo_range: 180 for standard servos, 270 for wide-range units.
# home_angle is the rest pose every behavior starts and ends in (elbows bent, shoulders slightly back): the robot
# sits at a table edge and a straight elbow near the shoulder's centre hits the table. center_angle is calibration.
# The rest pose the code uses lives in hardware/servo_control.py (REST_POSE); keep home_angle equal to it.

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
    home_angle: 40.0
    center_angle: 130.0
    min_angle: 40.0
    max_angle: 140.0
    direction: 1
    servo_range: 270
    notes: "Elbow. Center 130. Inward limit 40, backward limit 140. Wide-range (270) servo."

  shoulder_roll:
    board: right_arm_pca
    channel: 7
    home_angle: 160.0
    center_angle: 160.0
    min_angle: 40.0
    max_angle: 170.0
    direction: 1
    servo_range: 270
    notes: "Shoulder roll. Center 160. Outer limit 40, inner limit 170. Wide-range (270) servo."

  # ─── REACH AXIS  (board: reach_pca / 0x60) ───────────────────────────────
  # ch0 = left shoulder pitch, ch1 = right shoulder pitch
  right_shoulder_pitch:
    board: reach_pca
    channel: 1
    home_angle: 150.0
    center_angle: 170.0
    min_angle: 150.0
    max_angle: 260.0
    direction: 1
    servo_range: 270
    notes: "Right arm shoulder pitch. Center 170. Back limit 150, forward limit 260. Wide-range (270) servo."

  left_shoulder_pitch:
    board: reach_pca
    channel: 0
    home_angle: 235.0
    center_angle: 215.0
    min_angle: 95.0
    max_angle: 265.0
    direction: 1
    servo_range: 270
    notes: "Left shoulder pitch. Center 215. Front/up limit 95 (raised from 125, 2026-09-20), backward limit 265 (raised from 235, 2026-09-21). Wide-range (270) servo."

  # ─── HEAD  (board: reach_pca / 0x60) ─────────────────────────────────────
  neck_pitch:
    board: reach_pca
    channel: 3
    home_angle: 161.0
    center_angle: 161.0
    min_angle: 130.0
    max_angle: 180.0
    direction: 1
    servo_range: 270
    notes: "Head nod (pitch). Center 161 (camera level by its accelerometer, 2026-09-20). Down limit 130, up limit 180. Wide-range (270) servo."

  neck_yaw:
    board: reach_pca
    channel: 2
    home_angle: 195.0
    center_angle: 195.0
    min_angle: 120.0
    max_angle: 260.0
    direction: 1
    servo_range: 270
    notes: "Head turn (yaw). Center 195 (re-centered by eye 2026-09-20). Right limit 120, left limit 260. Wide-range (270) servo."

  # ─── LEFT ARM  (board: left_arm_pca / 0x50) ──────────────────────────────
  left_thumb:
    board: left_arm_pca
    channel: 0
    home_angle: 135.0
    center_angle: 135.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left thumb. 135=open/straight, 50=fully curled. Reversed from the right thumb."

  left_index:
    board: left_arm_pca
    channel: 1
    home_angle: 50.0
    center_angle: 50.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left index finger. 50=open, 135=fully curled. Reversed from the right hand."

  left_middle:
    board: left_arm_pca
    channel: 2
    home_angle: 50.0
    center_angle: 50.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left middle finger. 50=open, 135=fully curled. Reversed from the right hand."

  left_ring:
    board: left_arm_pca
    channel: 3
    home_angle: 50.0
    center_angle: 50.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left ring finger. 50=open, 135=fully curled. Reversed from the right hand."

  left_pinky:
    board: left_arm_pca
    channel: 4
    home_angle: 50.0
    center_angle: 50.0
    min_angle: 50.0
    max_angle: 135.0
    direction: 1
    servo_range: 180
    notes: "Left pinky finger. 50=open, 135=fully curled. Reversed from the right hand."

  left_wrist:
    board: left_arm_pca
    channel: 5
    home_angle: 100.0
    center_angle: 100.0
    min_angle: 60.0
    max_angle: 160.0
    direction: 1
    servo_range: 180
    notes: "Left wrist. Center 100. Range 60-160."

  left_elbow:
    board: left_arm_pca
    channel: 6
    home_angle: 65.0
    center_angle: 155.0
    min_angle: 65.0
    max_angle: 165.0
    direction: 1
    servo_range: 270
    notes: "Left elbow. Center 155. Front limit 65, backward limit 165. Wide-range (270) servo."

  left_shoulder_roll:
    board: left_arm_pca
    channel: 7
    home_angle: 120.0
    center_angle: 120.0
    min_angle: 110.0
    max_angle: 250.0
    direction: 1
    servo_range: 270
    notes: "Left shoulder roll. Center 120. Inner limit 110, outer limit 250. Increasing angle moves outward. Wide-range (270) servo."

# ─── NAMED POSES ───
# {joint_name: angle_degrees}; load with load_pose("name") from swayform_robot.config.
poses:

  rest:
    elbow: 40.0
    right_shoulder_pitch: 150.0
    shoulder_roll: 160.0
    wrist: 100.0
    left_elbow: 65.0
    left_shoulder_pitch: 235.0
    left_shoulder_roll: 120.0
    left_wrist: 100.0
    neck_yaw: 195.0
    neck_pitch: 161.0

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

  # Unverified against the current arm calibration; re-test on hardware before use.
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
    left_thumb: 135.0
    left_index: 50.0
    left_middle: 50.0
    left_ring: 50.0
    left_pinky: 50.0

  left_hand_closed:
    left_thumb: 50.0
    left_index: 135.0
    left_middle: 135.0
    left_ring: 135.0
    left_pinky: 135.0

  left_arm_center:
    left_wrist: 100.0
    left_elbow: 155.0
    left_shoulder_roll: 120.0
    left_shoulder_pitch: 215.0

  # Remapped to the 2026-09-20 left-arm calibration; not yet run on hardware.
  left_grab_reach:
    left_shoulder_pitch: 180.0

  left_elbow_straight:
    left_elbow: 155.0

  left_elbow_bent_after_grab:
    left_elbow: 90.0

# ─── TORSO MOTOR (DC motor via BTS7960 / IBT-2) ───
# GPIO numbers are BCM.
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

# ─── CAMERA ───
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

  "swayform_ws/src/swayform_robot/swayform_robot/hardware/servo_control.py": `"""Shared PCA9685 control layer: pulse-width math, smooth threaded moves, and the cross-process hardware lock."""

import time
import threading
import fcntl
import contextlib

FREQ = 50
MIN_US = 500
MAX_US = 2500

_LOCK_PATH = "/tmp/swayform_servo.lock"

# The robot's one rest / home pose: elbows bent, shoulders slightly back, hands open, head centred.
# The robot sits at the edge of a table, and a straight elbow with the shoulder near its centre hits the table,
# so every behavior starts and ends here. (board, channel): (rest, low limit, high limit, servo range)
_JOINTS = {
    (0x40, 0): (50, 50, 135, 180.0),     # right thumb, open
    (0x40, 1): (135, 50, 135, 180.0),    # right fingers, open
    (0x40, 2): (135, 50, 135, 180.0),
    (0x40, 3): (135, 50, 135, 180.0),
    (0x40, 4): (135, 50, 135, 180.0),
    (0x40, 5): (100, 60, 160, 180.0),    # right wrist
    (0x40, 6): (40, 40, 140, 270.0),     # right elbow, bent
    (0x40, 7): (160, 40, 170, 270.0),    # right shoulder roll
    (0x50, 0): (135, 50, 135, 180.0),    # left thumb, open
    (0x50, 1): (50, 50, 135, 180.0),     # left fingers, open
    (0x50, 2): (50, 50, 135, 180.0),
    (0x50, 3): (50, 50, 135, 180.0),
    (0x50, 4): (50, 50, 135, 180.0),
    (0x50, 5): (100, 60, 160, 180.0),    # left wrist
    (0x50, 6): (65, 65, 165, 270.0),     # left elbow, bent
    (0x50, 7): (120, 110, 250, 270.0),   # left shoulder roll
    (0x60, 0): (235, 95, 265, 270.0),    # left shoulder pitch, slightly back
    (0x60, 1): (150, 150, 260, 270.0),   # right shoulder pitch, slightly back
    (0x60, 2): (195, 120, 260, 270.0),   # neck yaw
    (0x60, 3): (161, 130, 180, 270.0),   # neck pitch
}
REST_POSE = {key: float(joint[0]) for key, joint in _JOINTS.items()}
# Session-off pose: elbows straight, everything else at its centre. A straight elbow with the shoulder at its centre
# puts the forearm into the table, so the shoulders sit 15 forward of centre. go_to_straight() moves the elbows last.
STRAIGHT_POSE = {
    **REST_POSE,
    (0x40, 6): 130.0,   # right elbow, centre
    (0x50, 6): 155.0,   # left elbow, centre
    (0x60, 0): 200.0,   # left shoulder pitch, 15 forward of centre (215)
    (0x60, 1): 185.0,   # right shoulder pitch, 15 forward of centre (170)
}
SHOULDER_PITCH_KEYS = {(0x60, 0), (0x60, 1)}
ELBOW_KEYS = {(0x40, 6), (0x50, 6)}
REST_TOLERANCE_DEG = 0.7


@contextlib.contextmanager
def hardware_lock(blocking: bool = True):
    """Cross-process mutex over physical servo access; blocking=False raises BlockingIOError if held."""
    f = open(_LOCK_PATH, "w")
    try:
        fcntl.flock(f, fcntl.LOCK_EX if blocking else fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        fcntl.flock(f, fcntl.LOCK_UN)
        f.close()


def present_boards(board_addresses, mock: bool = False):
    """Subset of board_addresses that answer on the I2C bus; all of them in mock."""
    if mock:
        return list(board_addresses)
    import board
    import busio
    i2c = busio.I2C(board.SCL, board.SDA)
    while not i2c.try_lock():
        time.sleep(0.01)
    try:
        found = set(i2c.scan())
    finally:
        i2c.unlock()
        i2c.deinit()
    return [addr for addr in board_addresses if addr in found]


def angle_to_duty(angle: float, servo_range: float = 180.0) -> int:
    """Angle in degrees -> 16-bit PCA9685 duty cycle."""
    pulse_us = MIN_US + (angle / servo_range) * (MAX_US - MIN_US)
    return int((pulse_us / 20000.0) * 65535)


class ServoController:
    """Owns PCA9685 board handles for one or more boards and moves servos smoothly."""

    def __init__(self, board_addresses, mock: bool = False):
        self.mock = mock
        self.boards = list(board_addresses)
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

    def commanded_angle(self, addr, ch, servo_range=180.0):
        """The angle the board is currently outputting on a channel, or None (mock, or never driven)."""
        if self.mock or addr not in self._pcas:
            return None
        with self._lock:
            duty = self._pcas[addr].channels[ch].duty_cycle
        if duty == 0:
            return None
        pulse_us = (duty + 8) / 65535 * 20000
        return (pulse_us - MIN_US) / (MAX_US - MIN_US) * servo_range

    def position(self, addr, ch, servo_range=180.0):
        """Where a joint is now: what the board is outputting, else the last value set here, else the rest pose."""
        commanded = self.commanded_angle(addr, ch, servo_range)
        if commanded is not None:
            return commanded
        return self.current.get((addr, ch), REST_POSE.get((addr, ch)))

    def smooth_move(self, addr, ch, target, limits, steps=60, delay=0.01, servo_range=180.0):
        start = self.position(addr, ch, servo_range)
        if start is None:
            start = target
        low, high = limits
        target = max(low, min(high, target))

        for i in range(steps + 1):
            t = i / steps
            eased = t * t * (3 - 2 * t)
            angle = start + (target - start) * eased
            self.set_servo(addr, ch, angle, limits, servo_range)
            time.sleep(delay)

    def run_threads(self, moves):
        """Run several smooth_move() calls concurrently; \`moves\` is a list of smooth_move kwargs dicts."""
        threads = [threading.Thread(target=self.smooth_move, kwargs=m) for m in moves]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    def close(self):
        if not self.mock:
            for pca in self._pcas.values():
                pca.deinit()


def _go_to_pose(ctrl, pose, keys, last_keys, seconds, tick, last_scale):
    keys = [key for key in keys if key in pose and key[0] in ctrl.boards]

    def away(key):
        now = ctrl.position(*key, _JOINTS[key][3])
        return now is None or abs(now - pose[key]) > REST_TOLERANCE_DEG

    def move(key, duration):
        _, low, high, servo_range = _JOINTS[key]
        return {"addr": key[0], "ch": key[1], "target": pose[key], "limits": (low, high),
                "steps": max(1, round(duration / tick)), "delay": tick, "servo_range": servo_range}

    first = [key for key in keys if key not in last_keys and away(key)]
    if first:
        ctrl.run_threads([move(key, seconds) for key in first])
    last = [key for key in keys if key in last_keys and away(key)]
    if last:
        ctrl.run_threads([move(key, seconds * last_scale) for key in last])


def go_to_rest(ctrl, keys=None, seconds=2.0, tick=0.02):
    """Move joints to REST_POSE from wherever they are: elbows, hands and head first, shoulders back last.

    \`keys\` defaults to every joint on the controller's boards. Joints already at rest are left alone, so
    calling this on a resting robot does nothing.
    """
    _go_to_pose(ctrl, REST_POSE, REST_POSE if keys is None else keys, SHOULDER_PITCH_KEYS, seconds, tick, 0.6)


def go_to_straight(ctrl, seconds=1.5, tick=0.02):
    """Move joints to STRAIGHT_POSE: shoulders forward and everything else centred first, then the elbows straight."""
    _go_to_pose(ctrl, STRAIGHT_POSE, STRAIGHT_POSE, ELBOW_KEYS, seconds, tick, 2.0)
`,

  "swayform_ws/src/swayform_robot/swayform_robot/hardware/torso_motor.py": `"""Torso DC motor control (BTS7960/IBT-2 over GPIO)."""

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
  "swayform_ws/src/swayform_demos/package.xml": PACKAGE_XML("swayform_demos", "Planned demos: Pick and Place, Rock Paper Scissors. Wave and Handshake moved to swayform_robot/ — see the real source there."),
  "swayform_ws/src/swayform_demos/setup.py": SETUP_PY("swayform_demos"),

  "swayform_ws/src/swayform_demos/pick_and_place.py": `from time import sleep
from swayform.motion import MotionClient


LIFT_HOLD_SECONDS = 0.6
TRANSPORT_HOLD_SECONDS = 0.8

# fixed, tested poses — not object localization
PICKUP_APPROACH = {"shoulder_pitch": 30, "shoulder_roll": 5, "elbow_pitch": 55, "wrist_yaw": 0}
PICKUP_GRASP    = {"shoulder_pitch": 34, "shoulder_roll": 5, "elbow_pitch": 62, "wrist_yaw": 0}
LIFT_POSE       = {"shoulder_pitch": 10, "shoulder_roll": 5, "elbow_pitch": 40, "wrist_yaw": 0}
PLACE_APPROACH  = {"shoulder_pitch": 20, "shoulder_roll": -25, "elbow_pitch": 55, "wrist_yaw": 0}


def approach_object(motion: MotionClient) -> None:
    motion.move_joint_group("right_arm", PICKUP_APPROACH)
    sleep(0.5)


def grasp_object(motion: MotionClient) -> None:
    motion.move_joint_group("right_arm", PICKUP_GRASP)
    sleep(0.4)
    motion.set_hand_pose("right_hand", "gentle_close")
    sleep(LIFT_HOLD_SECONDS)


def lift_and_transport(motion: MotionClient) -> None:
    # lift clear of the table before moving sideways
    motion.move_joint_group("right_arm", LIFT_POSE)
    sleep(LIFT_HOLD_SECONDS)

    motion.move_joint_group("right_arm", PLACE_APPROACH)
    sleep(TRANSPORT_HOLD_SECONDS)


def release_object(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_demos/rock_paper_scissors.py": `import random
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
    for word in ["Rock", "Paper", "Scissors", "Shoot!"]:
        audio.say(word)
        sleep(COUNTDOWN_SECONDS)


def get_user_choice() -> str:
    # keyboard input — no camera/gesture detection in this version
    while True:
        raw = input("Your move (rock / paper / scissors): ").strip().lower()
        if raw in VALID_CHOICES:
            return raw
        print(f"Please enter one of: {', '.join(VALID_CHOICES)}")


def judge(robot: str, user: str) -> str:
    # returns 'robot', 'user', or 'tie'
    if robot == user:
        return "tie"
    if WINS_AGAINST[robot] == user:
        return "robot"
    return "user"


def play_round(motion: MotionClient, audio: AudioPrompt) -> str:
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
  "swayform_ws/src/swayform_labs/package.xml": PACKAGE_XML("swayform_labs", "The 10 available student labs, Level 1 — Control."),
  "swayform_ws/src/swayform_labs/setup.py": SETUP_PY("swayform_labs"),

  /* === LAB FILES (agent-authored): lab_01_finger_curl.py through
     lab_10_combined_keyboard_control.py, insert further entries below each
     keyed "swayform_ws/src/swayform_labs/lab_NN_slug.py", before the closing
     brace. (The earlier Level 1 curriculum's lab_01_hello_motion.py through
     lab_10_mini_demo_challenge.py have been removed — unlisted from
     CURRICULUM and unreferenced, they only cluttered the File Explorer;
     recoverable via git history if that content is ever revived.) === */

  "swayform_ws/src/swayform_labs/lab_01_finger_curl.py": `from time import sleep
from swayform.motion import MotionClient


# Student-adjustable settings
FINGER_JOINT = "right_index_finger"
START_ANGLE = 10
CURL_ANGLE = 80
HOLD_SECONDS = 1.0


def curl_finger(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_labs/lab_02_nod_yes.py": `from time import sleep
from swayform.motion import MotionClient


# Student-adjustable settings
HEAD_PITCH = "head_pitch"
CENTER = 0
NOD_DOWN = -20
NOD_UP = 20
NOD_HOLD_SECONDS = 0.4


def nod_yes(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_labs/lab_03_timed_torso_rotation.py": `from time import sleep
from swayform.motion import MotionClient


# Student-adjustable settings
TORSO_YAW = "torso_yaw"
CENTER = 0
ROTATE_RIGHT = 30
ROTATE_LEFT = -30
PAUSE_SECONDS = 0.6


def rotate_torso(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_labs/lab_04_basic_handshake.py": `from time import sleep
from swayform.motion import MotionClient


# Student-adjustable settings
RIGHT_ELBOW = "right_elbow"
ELBOW_BEND = 60
ELBOW_START = 0
HOLD_SECONDS = 1.5


def basic_handshake(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_labs/lab_05_keyboard_torso_control.py": `from swayform.motion import MotionClient


# Student-adjustable settings
TORSO_YAW = "torso_yaw"
TORSO_STEP = 10
TORSO_MIN = -45
TORSO_MAX = 45
STOP_KEY = "q"


def handle_key(motion: MotionClient, key: str, current_angle: int) -> int:
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

  "swayform_ws/src/swayform_labs/lab_06_keyboard_head_control.py": `from swayform.motion import MotionClient


# Student-adjustable settings
HEAD_PITCH = "head_pitch"
HEAD_YAW = "head_yaw"
STEP = 8
PITCH_MIN, PITCH_MAX = -20, 20
YAW_MIN, YAW_MAX = -35, 35
STOP_KEY = "q"


def handle_key(motion: MotionClient, key: str, current_pitch: int, current_yaw: int):
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

  "swayform_ws/src/swayform_labs/lab_07_full_handshake.py": `from time import sleep
from swayform.motion import MotionClient


# Student-adjustable settings
RIGHT_ARM_RAISED = {"right_shoulder": 45, "right_elbow": 60}
RIGHT_ARM_HOME = {"right_shoulder": 0, "right_elbow": 0}
HOLD_SECONDS = 1.5


def full_handshake(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_labs/lab_08_wave.py": `from time import sleep
from swayform.motion import MotionClient


# Student-adjustable settings
WAVE_CYCLES = 3
WAVE_DELAY_SECONDS = 0.3


def wave_once(motion: MotionClient) -> None:
    motion.move_joint("right_wrist", -20)
    sleep(WAVE_DELAY_SECONDS)
    motion.move_joint("right_wrist", 20)
    sleep(WAVE_DELAY_SECONDS)


def wave(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_labs/lab_09_rock_paper_scissors.py": `import random
from time import sleep
from swayform.motion import MotionClient


# Student-adjustable settings
CHOICES = ["rock", "paper", "scissors"]
COUNTDOWN_SECONDS = 1.0


def countdown() -> None:
    for number in (3, 2, 1):
        print(number)
        # TODO: sleep(COUNTDOWN_SECONDS)


def play(motion: MotionClient) -> None:
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

  "swayform_ws/src/swayform_labs/lab_10_combined_keyboard_control.py": `from swayform.motion import MotionClient


# Student-adjustable settings
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
