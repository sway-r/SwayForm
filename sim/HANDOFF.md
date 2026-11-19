# What the simulator needs

The simulator is built to take its robot from two places and invent nothing: the joint contract from the robot software, and the URDF/Xacro from the founder. Until both exist, `portal/data/sim-config.js` keeps `modelUrl` and `contractUrl` at `null` and the Simulation window says the model has not been imported.

## From the Raspberry Pi Claude (robot software in sway-r/swayform_ws)

### 1. A ROS 2 joint layer that both the Pi and Gazebo sit under

This is the piece everything else depends on. Today every behavior drives PCA9685 channels directly through `hardware/servo_control.py` (`set_servo`, `smooth_move`, `run_threads`) using (board, channel) keys and servo degrees. To get "write once, run on either":

- Student-facing code must reach the hardware only through ROS 2 controllers (topics or actions), never through PCA9685 directly.
- A `<ros2_control>` block for the robot with a switch between hardware plugins: a PCA9685 `SystemInterface` on the Pi, and `gz_ros2_control/GazeboSimSystem` in simulation. Same joint names, same command and state interfaces, same controller YAML in both.
- Easing and interpolation (today `smooth_move`'s smoothstep at a fixed tick) stays in one place that both targets run. Either the Python library keeps interpolating and sends position commands each tick, or the controller does it. Pick one; the simulator follows.
- The torso DC motor (BTS7960 over GPIO): how it is commanded, and what position feedback exists, if any. Without an encoder the simulator can only match it as velocity for a duration.

### 2. The joint contract, one JSON file

Generated from the same source as `robot.yaml`, so it can never disagree with the Pi. Suggested location: `swayform_robot/config/joint_contract.json`, synced to the portal like the rest of the workspace. The portal checks it with `validateJointContract` in `portal/apps/learn/workspace/simulation/joint-contract.js`. The shape:

```json
{
  "contractVersion": 1,
  "robot": "<robot id>",
  "source": { "repo": "sway-r/swayform_ws", "commit": "<git sha this was generated from>" },
  "jointStateTopic": "/joint_states",
  "joints": [
    {
      "name": "<URDF joint name>",
      "type": "revolute | prismatic | continuous",
      "limits": { "lower": 0.0, "upper": 0.0, "velocity": 0.0, "effort": 0.0 },
      "rest": 0.0,
      "hardware": { "kind": "<e.g. pca9685_servo>", "...": "whatever the Pi needs: board, channel, servo range, zero angle, direction" }
    }
  ],
  "poses": { "rest": { "<joint>": 0.0 }, "straight": { "<joint>": 0.0 } },
  "sim": {
    "model": "<model name to spawn in Gazebo>",
    "descriptionPackage": "<package holding the Xacro>",
    "xacroFile": "<path inside that package>",
    "controllersPackage": "<package holding the controller YAML>",
    "controllersFile": "<path inside that package>",
    "controllers": ["<controller names to spawn, in order>"],
    "xacroArgs": { "<arg>": "<value, e.g. the switch that selects the Gazebo hardware plugin>" },
    "runnerEnv": { "<ENV_NAME>": "<value the library reads to know it is in simulation, if it needs one>" },
    "trackedModels": []
  }
}
```

Units are SI: radians, metres, rad/s, N·m. `rest` and `poses` are in joint units, not servo degrees.

### 3. The calibration between servo degrees and joint angles

For each servo joint: the servo angle that equals URDF zero, the direction (+1 or -1), and the servo range (180 or 270). This mapping lives on the Pi side (in `hardware` above) and must match the founder's zero pose. If it is wrong, the simulated arm and the real arm point in different directions for the same command.

### 4. Smaller items

- Which commit is deployed to the Pi. The sim images are built from that exact commit.
- The RMW implementation and `ROS_DOMAIN_ID` the Pi uses, so the simulator matches. The sim already forces Fast DDS onto UDP between containers.
- Whether `swayform.motion.MotionClient`, used by the Foundation Labs files, becomes a real library or the labs move to the shared one. It does not exist on the robot today, so it cannot run in the simulator either until that is settled.
- Anything a behavior does that is not a joint command (the hardware lock file, I2C board scans, the camera) and how it should behave in simulation: skipped, or simulated.

## From the founder (URDF/Xacro of Model S1)

### Package

A ROS 2 package in swayform_ws, conventionally `swayform_description`, holding `urdf/` (the Xacro) and `meshes/`. The simulator includes your Xacro through `sim/runtime/urdf/sim_wrapper.urdf.xacro`, which only adds the two Gazebo plugins, so your files stay free of simulator code.

### Needed for real physics, not just a picture

- **Joint names** exactly as the robot software will use them (agree on these with the Pi Claude first; the contract is checked against your URDF).
- **Limits** in radians for every moving joint, plus `velocity` and `effort` from the servo datasheets at the supply voltage the robot really uses.
- **Inertials** for every link: mass, centre of mass, inertia tensor. Zero or tiny values make Gazebo unstable. Weighing the parts and computing the inertia from CAD is ideal.
- **Collision geometry**: simple shapes or convex meshes, separate from the visual meshes.
- **Fingers**: one servo per finger. If a finger has several hinged segments, mark the followers as `<mimic>` joints with their ratio, or model it as one joint.
- **Mounting**: how the robot is fixed (a fixed joint to the world or the table), the table's size and height, and where the robot sits on its edge. The world needs the table to reproduce the "elbow hits the table" problem `servo_control.py` guards against.
- **Servo models** behind each joint (part numbers), so the controller gains and limits can be tuned until simulated moves take the same time as real ones.
- **Joint damping and friction**, even rough estimates.
- **The zero pose**: what the robot physically looks like with every joint at 0.
- **Camera**: the RealSense mount position, for a simulated camera later.

### For the browser

- Visual meshes as STL or DAE in metres, decimated, about 10 MB total for the whole robot, since every student downloads them.

### Checks before handing it over

- `check_urdf` on the generated URDF, then `gz sdf -p` on it with no errors.
- Spawn it in Gazebo with gravity and confirm it does not explode or drift with the controllers off.

## What happens when they arrive

1. Validate the contract (`validateJointContract`) and cross-check it against the URDF (`crossCheckUrdf`); both lists must be empty.
2. Copy the URDF and meshes to static files under a folder per commit, then set `modelUrl`, `meshPackages` and `contractUrl` in `portal/data/sim-config.js`.
3. Build both images from the same commit as the Pi.
4. Run the wave behavior on the real robot and in the simulator, record joint positions over time on both, and compare peak angles and timing. That comparison is the acceptance test for "behaves the same".
5. Ask for approval before any paid host is provisioned.
