/* SwayForm Learning Portal — mock seed data for the frontend-only Projects app.
   Entirely fictional / mocked: there is no backend, no real student, and no
   real submission history behind this data. Dates are relative to "today" =
   2026-08-05 and spread across the preceding ~3 weeks.
   `associatedActivityId` must match an activity id in portal/data/learning-path.js —
   opening a project resolves directly into that activity's workspace. */

export const MOCK_PROJECTS = [
  {
    id: "joint-control-basics",
    title: "Joint Control Basics",
    lastEdited: "2026-08-03T16:10:00",
    associatedActivityId: "hello-robot-motion",
    status: "in-progress",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_01_hello_motion.py",
    summary: "Commands individual servo joints to safe positions using the motion client's basic pose interface.",
  },
  {
    id: "sensor-reading-lab",
    title: "Sensor Reading Lab",
    lastEdited: "2026-07-30T11:05:00",
    associatedActivityId: "realsense-detection-basics",
    status: "submitted",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_06_realsense_detection.py",
    summary: "Reads RealSense depth data to detect whether an object is inside a defined target zone.",
  },
  {
    id: "custom-robot-motion",
    title: "Custom Robot Motion",
    lastEdited: "2026-07-24T09:40:00",
    associatedActivityId: "gesture-sequence",
    status: "needs-changes",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_03_gesture_sequence.py",
    summary: "Builds a custom multi-step arm gesture sequence beyond the built-in demo poses.",
  },
  {
    id: "behavior-state-machine",
    title: "Behavior State Machine",
    lastEdited: "2026-07-19T15:00:00",
    associatedActivityId: "behavior-priority-motion-locking",
    status: "draft",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_09_motion_locking.py",
    summary: "Tests how a motion lock protects a running behavior from a competing command.",
  },
];
