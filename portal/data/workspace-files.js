/* Seed contents of the mock Swayform ROS 2 workspace, keyed by path.
   mock-fs.js loads this map once per browser session; after that, edits
   live in localStorage and this module is never re-read for an edited file.
   Paths follow the convention already used in the real Getting Started docs:
   ~/ros2_ws/src/<package>/<file>.py — represented here without the leading ~. */

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
  "ros2_ws/src/swayform_demos/package.xml": PACKAGE_XML("swayform_demos", "Finished reference demos: Wave, Handshake, Pick and Place, Rock Paper Scissors, Interactive Exchange."),
  "ros2_ws/src/swayform_demos/setup.py": SETUP_PY("swayform_demos"),

  "ros2_ws/src/swayform_demos/wave_demo.py": `"""
Demo: Wave

Purpose:
Run a simple waving behavior using safe arm poses.

What this teaches:
- How a behavior script connects to the motion layer
- How joint targets create physical motion
- Why safe poses and delays matter
- How to return the robot to idle after a demo
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

WAVE_CYCLES = 3
WAVE_DELAY_SECONDS = 0.35

RIGHT_ARM_RAISED = {
    "shoulder_pitch": 42,
    "shoulder_roll": 18,
    "elbow_pitch": 70,
}

WRIST_LEFT = -25
WRIST_RIGHT = 25


def move_to_wave_start(motion: MotionClient) -> None:
    """
    Move the robot from idle into a safe raised-arm position.
    This should happen before the wrist starts waving.
    """
    motion.safe_pose("idle")
    sleep(0.5)

    motion.move_joint_group("right_arm", RIGHT_ARM_RAISED)
    sleep(0.8)


def perform_wave(motion: MotionClient, cycles: int) -> None:
    """
    Move the wrist left and right several times.
    The arm stays raised while the wrist creates the wave motion.
    """
    for _ in range(cycles):
        motion.move_joint("right_wrist_yaw", WRIST_LEFT)
        sleep(WAVE_DELAY_SECONDS)

        motion.move_joint("right_wrist_yaw", WRIST_RIGHT)
        sleep(WAVE_DELAY_SECONDS)


def return_to_idle(motion: MotionClient) -> None:
    """
    Always return the robot to a known safe pose after the demo.
    """
    motion.safe_pose("idle")


def main() -> None:
    motion = MotionClient()

    try:
        motion.lock_behavior("wave_demo")
        move_to_wave_start(motion)
        perform_wave(motion, WAVE_CYCLES)
    finally:
        return_to_idle(motion)
        motion.unlock_behavior("wave_demo")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_demos/handshake_demo.py": `"""
Demo: Handshake

Purpose:
Use a simple RealSense-based presence check to trigger a handshake pose.

Important:
This is a vision-assisted classroom demo. It does not claim perfect hand
detection or human-level understanding.
"""

from time import sleep, time
from swayform.motion import MotionClient
from swayform.vision import RealSenseInput


DETECTION_TIMEOUT_SECONDS = 10
HANDSHAKE_HOLD_SECONDS = 2.0

HANDSHAKE_POSE = {
    "shoulder_pitch": 38,
    "shoulder_roll": 10,
    "elbow_pitch": 82,
    "wrist_yaw": 0,
}


def wait_for_user(camera: RealSenseInput, timeout: float) -> bool:
    """
    Wait until the camera reports a user inside the interaction zone.
    Returns True if a user is found, otherwise False.
    """
    start_time = time()

    while time() - start_time < timeout:
        if camera.user_in_interaction_zone():
            return True

        sleep(0.1)

    return False


def run_handshake(motion: MotionClient) -> None:
    """
    Move into a conservative handshake pose, wait briefly,
    then return to idle.
    """
    motion.move_joint_group("right_arm", HANDSHAKE_POSE)
    sleep(HANDSHAKE_HOLD_SECONDS)
    motion.safe_pose("idle")


def main() -> None:
    motion = MotionClient()
    camera = RealSenseInput()

    motion.safe_pose("idle")
    print("Waiting for user...")

    user_detected = wait_for_user(camera, DETECTION_TIMEOUT_SECONDS)

    if not user_detected:
        print("No user detected. Returning to idle.")
        motion.safe_pose("idle")
        return

    try:
        motion.lock_behavior("handshake_demo")
        run_handshake(motion)
    finally:
        motion.unlock_behavior("handshake_demo")
        motion.safe_pose("idle")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_demos/pick_and_place.py": `"""
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

  "ros2_ws/src/swayform_demos/rock_paper_scissors.py": `"""
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

  "ros2_ws/src/swayform_demos/interactive_exchange.py": `"""
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

  "ros2_ws/src/swayform_labs/package.xml": PACKAGE_XML("swayform_labs", "The 10 available student labs, Level 1 — Control."),
  "ros2_ws/src/swayform_labs/setup.py": SETUP_PY("swayform_labs"),

  /* === LAB FILES (agent-authored) — insert lab_01..lab_10 entries below, each keyed
     "ros2_ws/src/swayform_labs/lab_NN_slug.py", before the closing brace. === */

  "ros2_ws/src/swayform_labs/lab_01_hello_motion.py": `"""
Lab 01: Hello Robot Motion

Goal:
Run your first safe robot motion and understand that code sends target
positions to robot joints.

Concepts:
- Motion commands
- Neutral pose
- Safe movement
- Terminal command
- Observation before editing

What to edit:
Change HOLD_SECONDS or the target angle below, then run the lab again
and observe what changes physically.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

# TODO: Change HOLD_SECONDS to make the raised pose last longer or shorter.
HOLD_SECONDS = 1.5

RIGHT_ARM_RAISED = {
    "shoulder_pitch": 30,
    "shoulder_roll": 10,
    "elbow_pitch": 45,
}


def move_to_raised_pose(motion: MotionClient) -> None:
    """
    Move from idle into a single safe raised-arm pose.
    """
    motion.safe_pose("idle")
    sleep(0.5)

    motion.move_joint_group("right_arm", RIGHT_ARM_RAISED)
    sleep(HOLD_SECONDS)


def return_to_idle(motion: MotionClient) -> None:
    """
    Always return the robot to a known safe pose when finished.
    """
    motion.safe_pose("idle")


def main() -> None:
    motion = MotionClient()

    try:
        motion.lock_behavior("lab_01_hello_motion")
        move_to_raised_pose(motion)
    finally:
        return_to_idle(motion)
        motion.unlock_behavior("lab_01_hello_motion")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_02_servo_limits.py": `"""
Lab 02: Servo Angles and Safe Limits

Goal:
Understand that each joint has safe angle limits and that robot motion
should stay inside tested ranges.

Concepts:
- Servo range
- Joint limits
- Mechanical safety
- Angle values
- Safe testing

What to edit:
Adjust TARGET_SHOULDER_PITCH within the safe range shown below, then
finish the clamp_to_safe_range() helper so out-of-range values are
rejected instead of sent to the joint.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

# Safe, tested range for this joint. Do not exceed these values.
SHOULDER_PITCH_MIN = 0
SHOULDER_PITCH_MAX = 60

# TODO: Try a few different values inside the safe range and compare them.
TARGET_SHOULDER_PITCH = 40

HOLD_SECONDS = 1.0


def clamp_to_safe_range(value: int, minimum: int, maximum: int) -> int:
    """
    Return value, clamped so it never falls outside [minimum, maximum].
    """
    # TODO: Replace this with real clamping logic instead of returning
    # the value unchanged. A safe program should never trust a raw value.
    return value


def move_shoulder(motion: MotionClient, pitch: int) -> None:
    """Move only the shoulder pitch joint to a safe, clamped angle."""
    safe_pitch = clamp_to_safe_range(pitch, SHOULDER_PITCH_MIN, SHOULDER_PITCH_MAX)
    motion.move_joint("shoulder_pitch", safe_pitch)
    sleep(HOLD_SECONDS)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_02_servo_limits")
        move_shoulder(motion, TARGET_SHOULDER_PITCH)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_02_servo_limits")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_03_gesture_sequence.py": `"""
Lab 03: Build a Gesture Sequence

Goal:
Create a small gesture by combining multiple safe poses with timing
delays.

Concepts:
- Sequences
- Timing
- Poses
- Reusable functions
- Human-readable robot behavior

What to edit:
Reorder the poses in GESTURE_SEQUENCE, adjust POSE_DELAY_SECONDS, or add
one extra pose from the safe pose list below.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

# TODO: Add one more pose to GESTURE_SEQUENCE below, using a pose from
# SAFE_POSES or one you define in the same shape.
POSE_DELAY_SECONDS = 0.6

SAFE_POSES = {
    "greet_raise": {"shoulder_pitch": 35, "shoulder_roll": 15, "elbow_pitch": 60},
    "greet_hold":  {"shoulder_pitch": 35, "shoulder_roll": 15, "elbow_pitch": 60, "wrist_yaw": 15},
    "greet_lower": {"shoulder_pitch": 15, "shoulder_roll": 5,  "elbow_pitch": 30},
}

GESTURE_SEQUENCE = ["greet_raise", "greet_hold", "greet_lower"]


def run_sequence(motion: MotionClient, sequence: list) -> None:
    """
    Move through each named pose in order, pausing between poses.
    """
    for pose_name in sequence:
        motion.move_joint_group("right_arm", SAFE_POSES[pose_name])
        sleep(POSE_DELAY_SECONDS)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_03_gesture_sequence")
        run_sequence(motion, GESTURE_SEQUENCE)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_03_gesture_sequence")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_04_head_tracking.py": `"""
Lab 04: Head Tracking Basics

Goal:
Move the robot head left, center, or right based on a simple target
position from the camera.

Concepts:
- Neck yaw
- Neck pitch
- Camera target position
- Mapping input to motion
- Simple tracking behavior

What to edit:
Adjust the zone thresholds and the head yaw values used for each zone.
"""

from time import sleep
from swayform.motion import MotionClient
from swayform.vision import RealSenseInput


# -----------------------------
# Student-adjustable settings
# -----------------------------

# Horizontal target position (0.0 = far left, 1.0 = far right) that
# separates the left / center / right zones.
# TODO: Adjust these thresholds if the head reacts too early or too late.
LEFT_ZONE_MAX = 0.35
RIGHT_ZONE_MIN = 0.65

HEAD_YAW_LEFT = -30
HEAD_YAW_CENTER = 0
HEAD_YAW_RIGHT = 30

TRACK_HOLD_SECONDS = 0.4


def zone_for_position(position: float) -> str:
    """Classify a horizontal target position into left, center, or right."""
    if position <= LEFT_ZONE_MAX:
        return "left"
    if position >= RIGHT_ZONE_MIN:
        return "right"
    return "center"


def yaw_for_zone(zone: str) -> int:
    """Map a zone name to a safe head yaw angle."""
    return {
        "left": HEAD_YAW_LEFT,
        "center": HEAD_YAW_CENTER,
        "right": HEAD_YAW_RIGHT,
    }[zone]


def track_target(motion: MotionClient, camera: RealSenseInput) -> None:
    """Read one target position and move the head to match its zone."""
    # TODO: camera.target_zone() is a stand-in for the real perception
    # call — replace with the actual RealSenseInput method once available.
    position = camera.target_zone()
    zone = zone_for_position(position)

    motion.move_joint("neck_yaw", yaw_for_zone(zone))
    sleep(TRACK_HOLD_SECONDS)


def main() -> None:
    motion = MotionClient()
    camera = RealSenseInput()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_04_head_tracking")
        track_target(motion, camera)
    finally:
        motion.move_joint("neck_yaw", HEAD_YAW_CENTER)
        motion.unlock_behavior("lab_04_head_tracking")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_05_button_motion.py": `"""
Lab 05: Button-to-Motion Control

Goal:
Connect a keyboard input or simple button event to a robot motion.

Concepts:
- Events
- Input handling
- Calling robot actions
- Safety stop
- Simple control interface

What to edit:
Add a second input key and map it to a different safe pose.
"""

from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

STOP_KEY = "q"

# TODO: Add a second entry to INPUT_TO_POSE (for example key "2") mapped
# to a different safe pose name.
INPUT_TO_POSE = {
    "1": "greeting_raise",
}


def handle_input(motion: MotionClient, key: str) -> bool:
    """
    Run the pose mapped to key, if any. Return False when the stop key
    is pressed so the caller knows to end the loop.
    """
    if key == STOP_KEY:
        return False

    pose_name = INPUT_TO_POSE.get(key)
    if pose_name is not None:
        motion.safe_pose(pose_name)

    return True


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    print(f"Press a mapped key to trigger a motion, or '{STOP_KEY}' to stop.")

    try:
        motion.lock_behavior("lab_05_button_motion")
        running = True
        while running:
            key = input("Key: ").strip().lower()
            running = handle_input(motion, key)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_05_button_motion")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_06_realsense_detection.py": `"""
Lab 06: RealSense Detection Basics

Goal:
Use RealSense camera data as a trigger for a simple robot behavior.

Concepts:
- Camera input
- Detection zones
- Depth and distance
- Perception-triggered motion
- False positives

What to edit:
Adjust DETECTION_ZONE or DETECTION_TIMEOUT_SECONDS to make the trigger
more or less sensitive.
"""

from time import sleep, time
from swayform.motion import MotionClient
from swayform.vision import RealSenseInput


# -----------------------------
# Student-adjustable settings
# -----------------------------

# TODO: Try a narrower or wider zone name / timeout and compare how
# reliably the robot triggers.
DETECTION_ZONE = "interaction_zone"
DETECTION_TIMEOUT_SECONDS = 8

RESPONSE_POSE = {"shoulder_pitch": 25, "shoulder_roll": 10, "elbow_pitch": 40}
RESPONSE_HOLD_SECONDS = 1.0


def wait_for_object(camera: RealSenseInput, zone: str, timeout: float) -> bool:
    """Poll the camera until something is detected in zone, or timeout."""
    start_time = time()

    while time() - start_time < timeout:
        if camera.object_in_zone(zone):
            return True
        sleep(0.1)

    return False


def respond(motion: MotionClient) -> None:
    """Perform a small, safe response motion."""
    motion.move_joint_group("right_arm", RESPONSE_POSE)
    sleep(RESPONSE_HOLD_SECONDS)


def main() -> None:
    motion = MotionClient()
    camera = RealSenseInput()
    motion.safe_pose("idle")

    detected = wait_for_object(camera, DETECTION_ZONE, DETECTION_TIMEOUT_SECONDS)

    if not detected:
        print("Nothing detected in the zone. Returning to idle.")
        motion.safe_pose("idle")
        return

    try:
        motion.lock_behavior("lab_06_realsense_detection")
        respond(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_06_realsense_detection")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_07_hand_pose_timing.py": `"""
Lab 07: Hand Pose Timing

Goal:
Adjust hand and finger timing to understand how small delays affect
robot gestures.

Concepts:
- Finger servo poses
- Timing
- Grip and release
- Gesture realism
- Small motion changes

What to edit:
Change OPEN_TO_CLOSE_DELAY_SECONDS or the order of the two finger moves
below, then compare how natural the gesture looks.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

# TODO: Change this delay and re-run to feel the difference between a
# snappy grip and a slow, deliberate one.
OPEN_TO_CLOSE_DELAY_SECONDS = 0.5
HOLD_CLOSED_SECONDS = 1.0


def close_hand(motion: MotionClient) -> None:
    """Move from open to gently closed, with a delay in between."""
    motion.set_hand_pose("right_hand", "open")
    sleep(OPEN_TO_CLOSE_DELAY_SECONDS)

    motion.set_hand_pose("right_hand", "gentle_close")
    sleep(HOLD_CLOSED_SECONDS)


def release_hand(motion: MotionClient) -> None:
    """Return the hand to a relaxed, open pose."""
    motion.set_hand_pose("right_hand", "relaxed")


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_07_hand_pose_timing")
        close_hand(motion)
    finally:
        release_hand(motion)
        motion.unlock_behavior("lab_07_hand_pose_timing")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_08_base_rotation.py": `"""
Lab 08: Base Rotation Basics

Goal:
Command the robot's rotating base to turn left or right safely.

Concepts:
- Base yaw
- Motor control
- Direction
- Speed
- Stop command

What to edit:
Change ROTATION_DIRECTION or ROTATION_ANGLE within the safe range, then
confirm the stop command still returns the base to center.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

BASE_YAW_MIN = -45
BASE_YAW_MAX = 45

# TODO: Try "left" and "right", and a smaller or larger ROTATION_ANGLE
# within the safe range above.
ROTATION_DIRECTION = "left"
ROTATION_ANGLE = 30

ROTATION_HOLD_SECONDS = 1.0


def rotate_base(motion: MotionClient, direction: str, angle: int) -> None:
    """Rotate the base toward direction by angle degrees, within safe limits."""
    signed_angle = -angle if direction == "left" else angle
    signed_angle = max(BASE_YAW_MIN, min(BASE_YAW_MAX, signed_angle))

    motion.move_joint("base_yaw", signed_angle)
    sleep(ROTATION_HOLD_SECONDS)


def stop_base(motion: MotionClient) -> None:
    """Return the base to a centered, stopped position."""
    motion.move_joint("base_yaw", 0)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_08_base_rotation")
        rotate_base(motion, ROTATION_DIRECTION, ROTATION_ANGLE)
    finally:
        stop_base(motion)
        motion.unlock_behavior("lab_08_base_rotation")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_09_motion_locking.py": `"""
Lab 09: Behavior Priority and Motion Locking

Goal:
Understand why one robot behavior should not interrupt another motion
at the wrong time.

Concepts:
- Motion lock
- Behavior priority
- State control
- Safe cancellation
- Competing commands

What to edit:
Change try_low_priority_behavior() so it checks whether a higher-priority
behavior is locked before it moves, instead of always running.
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

HIGH_PRIORITY_NAME = "lab_09_primary_behavior"
LOW_PRIORITY_NAME = "lab_09_idle_fidget"

PRIMARY_POSE = {"shoulder_pitch": 30, "shoulder_roll": 10, "elbow_pitch": 50}
PRIMARY_HOLD_SECONDS = 2.0


def run_primary_behavior(motion: MotionClient) -> None:
    """
    Lock motion while running the primary behavior so nothing else can
    move the same joints while it is active.
    """
    motion.lock_behavior(HIGH_PRIORITY_NAME)
    try:
        motion.move_joint_group("right_arm", PRIMARY_POSE)
        sleep(PRIMARY_HOLD_SECONDS)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior(HIGH_PRIORITY_NAME)


def try_low_priority_behavior(motion: MotionClient) -> None:
    """
    Attempt a low-priority behavior. In this starter version it always
    runs — the TODO below is to make it respect the active lock instead.
    """
    # TODO: Check whether a higher-priority behavior is currently locked
    # before calling motion.lock_behavior(LOW_PRIORITY_NAME) here, and
    # skip this behavior if it is.
    motion.lock_behavior(LOW_PRIORITY_NAME)
    try:
        motion.move_joint("neck_yaw", 10)
        sleep(0.5)
        motion.move_joint("neck_yaw", 0)
    finally:
        motion.unlock_behavior(LOW_PRIORITY_NAME)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    run_primary_behavior(motion)
    try_low_priority_behavior(motion)

    motion.safe_pose("idle")


if __name__ == "__main__":
    main()
`,

  "ros2_ws/src/swayform_labs/lab_10_mini_demo_challenge.py": `"""
Lab 10: Mini Demo Challenge

Goal:
Combine motion, timing, and optional perception into a small custom
robot demo.

Concepts:
- Project planning
- Code reuse
- Debugging
- Demo presentation
- Behavior design

What to edit:
This is a starter template. Replace MY_DEMO_SEQUENCE and build_my_demo()
with your own idea, reusing at least one pattern from an earlier demo or
lab (a pose sequence, a camera trigger, a countdown).
"""

from time import sleep
from swayform.motion import MotionClient


# -----------------------------
# Student-adjustable settings
# -----------------------------

# TODO: Replace this starter sequence with your own two-or-more-step
# demo idea. Reuse a pose pattern from an earlier lab if you'd like.
MY_DEMO_SEQUENCE = [
    ("right_arm", {"shoulder_pitch": 20, "shoulder_roll": 5, "elbow_pitch": 35}),
    ("right_arm", {"shoulder_pitch": 0,  "shoulder_roll": 0, "elbow_pitch": 0}),
]

STEP_HOLD_SECONDS = 0.8


def build_my_demo(motion: MotionClient) -> None:
    """
    Run through MY_DEMO_SEQUENCE one step at a time.
    Each step is (joint_group_name, pose_dict).
    """
    for joint_group, pose in MY_DEMO_SEQUENCE:
        motion.move_joint_group(joint_group, pose)
        sleep(STEP_HOLD_SECONDS)


def main() -> None:
    motion = MotionClient()
    motion.safe_pose("idle")

    try:
        motion.lock_behavior("lab_10_mini_demo_challenge")
        build_my_demo(motion)
    finally:
        motion.safe_pose("idle")
        motion.unlock_behavior("lab_10_mini_demo_challenge")


if __name__ == "__main__":
    main()
`,

  /* === Control — Level 1 (curriculum rewrite): lab_01_finger_curl.py through
     lab_10_combined_keyboard_control.py. Distinct filenames from the older
     lab_01_hello_motion.py..lab_10_mini_demo_challenge.py above, which are
     preserved but no longer linked from any curriculum section. === */

  "ros2_ws/src/swayform_labs/lab_01_finger_curl.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_02_nod_yes.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_03_timed_torso_rotation.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_04_basic_handshake.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_05_keyboard_torso_control.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_06_keyboard_head_control.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_07_full_handshake.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_08_wave.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_09_rock_paper_scissors.py": `"""
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

  "ros2_ws/src/swayform_labs/lab_10_combined_keyboard_control.py": `"""
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
