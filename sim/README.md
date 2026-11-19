# SwayForm Simulation (Model S1)

Cloud simulation of Model S1 for the Learning Portal: ROS 2 Jazzy, Gazebo Harmonic, run on demand on our own servers, viewed in the student's browser.

Status on 2026-11-19: the control plane, the browser window, the security design and the container images are written. Nothing is deployed and no paid server exists. The simulator cannot run a robot until two things arrive: the Model S1 URDF/Xacro (founder) and the shared joint contract (Raspberry Pi software). See [HANDOFF.md](HANDOFF.md).

## The goal, and the one rule that follows from it

A student writes one Python file and runs it on the real robot or the simulated one. Joint targets, timing and behavior must match as closely as physics allows.

So the simulator never gets its own movement code. The student's file, the SwayForm Python library under it, and the ROS 2 controllers are the same in both places. Only the lowest layer differs:

```
student file (same)
  -> swayform_robot library (same commit as the Pi)
    -> ROS 2 controllers, same controller YAML (same)
      -> hardware layer:   real robot: PCA9685 servo boards and the torso motor
                           simulation: gz_ros2_control inside Gazebo, real physics
```

Today the behaviors call `servo_control.py` directly with PCA9685 (board, channel) keys and servo degrees, so there is no ROS 2 joint layer to swap yet. Building that layer is the Pi Claude's job. This design waits for it instead of guessing joint names or writing a second motion system.

## How it fits together

```
 Student's browser (learning.swayform.net)
   | 1. POST /api/robot/status {action:'sim-token'}  -> 60 s signed token + orchestrator URL (Vercel)
   | 2. WSS /session, first frame {type:'hello', token}
   v
 Orchestrator (sim/orchestrator, Node)           one per simulation host
   | Docker Engine API (local socket)
   v
 Per student session, created on Start, destroyed on End or timeout:
   network ros  (internal, no way out)     network ctl (no NAT, no internet)
   +-----------------------------+         +--------------------------------------+
   | runner container            |<--DDS-->| sim container                         |
   | student's file, gVisor,     |         | gz sim (headless) + ros2_control      |
   | read-only, no capabilities  |         | robot_state_publisher, controllers    |
   +-----------------------------+         | gateway: reads Gazebo's own state  ---+--> orchestrator --> browser
                                           +--------------------------------------+
```

- **Vercel** only mints a short token (folded into `api/robot/status.js`, since `api/` is at the Hobby plan's 12-function cap). It never talks to Gazebo.
- **Orchestrator** owns the rules: one session per student, a capacity cap, idle and lifetime limits, run timeouts and output caps. Drivers do the container work: `disabled` (the default), `docker`, and `fake` (tests only, executes nothing and sends no joint data).
- **Sim container** is trusted: it is our image, built once per robot-model version and never at session start.
- **Runner container** is untrusted: it holds the student's code and nothing else.
- **Browser** draws the same URDF with three.js. Joint positions and object poses come from Gazebo's physics, streamed at 20 Hz, so what students see is what the physics engine computed, never an animation.

## Session lifecycle

| Limit | Value | Why |
|---|---|---|
| Sessions per student | 1 | a second tab takes over the first |
| Sessions per host | `SIM_MAX_SESSIONS` (2) | Gazebo needs about 2 CPU cores and 3 GB per session; confirm with a load test |
| Idle | 10 min without a message | ended and containers removed |
| Lifetime | 45 min | ended even if active |
| Browser gone | 2 min grace for a reload | then ended |
| One run | 60 s | same as the real robot's job timeout |
| Code size / output | 64 KB / 64 KB | same caps as the robot queue |
| Between runs | 3 s | |

States: `none -> starting -> ready <-> running`, plus `resetting` and `ending`. **Reset world** is a hard reset for now: the sim container is replaced with a fresh one (about 15 to 30 s), which is slower than resetting Gazebo in place but can never leave the controllers and physics out of step. A faster in-place reset can come later once it is proven with gz_ros2_control.

On start-up the orchestrator removes every container and network carrying its session label, so a crash can never leave a paid simulation running unattended.

## Student code isolation

Unlike the real robot, which only accepts the hash-pinned canonical variants plus admin approval, the simulator runs whatever the student wrote. That code is treated as hostile:

- Separate container from Gazebo, under gVisor (`runsc`), as uid 10001, with every Linux capability dropped, `no-new-privileges`, a read-only root filesystem, a 32 MB tmpfs, 512 MB of memory with no swap, 1 CPU, 128 processes and 256 open files.
- Code is passed in as an environment value and written to tmpfs by `runner/run-student.sh`. Nothing from the host is mounted.
- Network: only the session's internal Docker network, which has no gateway. No internet, no cloud metadata endpoint, no other students, no orchestrator.
- ROS 2 is the only thing it can reach. Gazebo's own transport is bound to `127.0.0.1` inside the sim container (`GZ_IP`), so student code cannot call Gazebo services to move objects or teleport the robot. It has to move the robot through the controllers, like on the Pi.
- The viewer reads joint states from Gazebo's transport, not from the ROS `/joint_states` topic, so a student publishing fake joint states cannot change what the screen shows.
- Each session has its own networks, so one student's code can only ever disturb their own simulation.
- The real-robot path is untouched: Queue on Robot still requires a canonical match and admin approval.

These settings are pinned by `test/sim-orchestrator.test.mjs`.

## Timing parity

Student code sleeps on the wall clock. Gazebo's controllers run on simulation time. They only agree while the real-time factor (RTF) stays near 1.0, so:

- the physics step is 1 ms with a target RTF of 1.0 (`runtime/worlds/classroom.sdf`);
- the browser shows the live RTF next to the sim time;
- hosts are sized so RTF stays at or above 0.95 under load, which is what the load test has to confirm before students use it.

Servo speed is the other half. On the robot a servo moves at its own rated speed under load. In Gazebo the same comes from the joint's `velocity` and `effort` limits and the controller gains, which is why HANDOFF.md asks for the servo model behind each joint.

## Browser window

In any code lab, the Code Editor's **Simulation** button opens a Simulation window beside it and runs the open file. The window has Start, Run, Stop, Reset world and End session, camera presets (Front, Side, Top, Angle) plus orbit, pan and zoom, the program's output, and a table of the joint positions Gazebo measured. It is visible to admins only (`portal/data/sim-config.js` `visibleTo`, `api/_lib/sim.js` `SIM_ROLES`) until launch.

three.js 0.170.0 and urdf-loader 0.13.1 load from jsDelivr through the import map in `portal/index.html`, and only when the window opens. Model files will be served as static files from this site, under one folder per robot-source commit.

## Wire protocol

Browser to orchestrator: `hello {token}`, `start`, `run {path, code}`, `stop`, `reset`, `end`, `ping`.

Orchestrator to browser: `status {state, sessionId, expiresAt, reason?}`, `output {runId, stream, text}`, `exit {runId, code, reason: finished|stopped|timeout|reset|ended|error}`, `joints {t, name[], position[], velocity[], effort[]}`, `poses {t, models[{name, p, q}]}`, `stats {rtf, simTime, paused}`, `error {code, message?}`.

Gateway to orchestrator: `ready`, then `joints`, `poses` and `stats`. The orchestrator forwards only those three types, at most 30 per second.

## Deploying, once approved

Nothing below has been done. It needs a paid Linux host, and that needs your approval first.

1. Host: Ubuntu 24.04, 4 or more vCPU and 8 GB or more per two sessions, Docker Engine, and gVisor registered as the `runsc` runtime. No GPU is needed until a simulated camera is added.
2. Build `swayform/sim-host` and `swayform/sim-runner` from `sim/runtime` with `build-context/ws` set to the swayform_ws commit the Pi runs, and `build-context/joint-contract.json`.
3. Run the orchestrator on the host (not in a container) with `SIM_DRIVER=docker`, `SIM_SERVICE_SECRET`, `SIM_HOST_IMAGE`, `SIM_RUNNER_IMAGE`, `SIM_RUNNER_ENV` (from the contract), behind TLS at a `wss://` name.
4. In Vercel: `SIM_SERVICE_SECRET` (a new secret, not the bridge one) and `SIM_ORCHESTRATOR_URL`. Add that origin to `connect-src` in the CSP in `vercel.json`.
5. Load test: two sessions running the wave behavior, RTF at or above 0.95, then raise `SIM_MAX_SESSIONS` only as far as the numbers allow.

Install for tests: `npm ci` in `bridge/` and in `sim/orchestrator/`, then `npm test` at the root.

## What is verified and what is not

- Verified here: the orchestrator's session rules, the container isolation settings, the token round trip with the portal API, and a full WebSocket session with the fake driver (`npm test`). Python files compile.
- Not run yet, because it needs a Linux host with Docker: the Docker driver against a real engine, both images, the launch file, the gateway's gz-transport imports, and gVisor networking with DDS. The first build on a host will flush these out.
- The Simulation window has not been opened in a browser yet. Use `node preview-portal.mjs --admin` and open any code lab to see it.

## Files

| Path | What |
|---|---|
| `orchestrator/` | control plane: `server.js`, `sessions.js`, `auth.js`, `drivers/` |
| `runtime/Dockerfile.sim`, `Dockerfile.runner` | the two images |
| `runtime/launch/sim.launch.py` | headless Gazebo, ros2_control, spawners, gateway; reads the joint contract |
| `runtime/urdf/sim_wrapper.urdf.xacro` | adds only the Gazebo plugins to the founder's model |
| `runtime/worlds/classroom.sdf` | gravity, 1 ms physics, ground (table once measured) |
| `runtime/gateway/sim_gateway.py` | Gazebo state to the orchestrator |
| `runtime/runner/run-student.sh` | runs the student's file |
| `../portal/apps/learn/workspace/simulation/` | Simulation window, 3D viewer, contract checker |
| `../portal/services/sim-service.js` | one session per student across labs |
| `../api/_lib/sim.js` | token minting, roles, configuration |
| `HANDOFF.md` | what is needed from the robot software and the URDF |
