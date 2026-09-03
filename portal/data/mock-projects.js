/* SwayForm Learning Portal — mock seed data for the frontend-only Projects app.
   Entirely fictional / mocked: there is no backend, no real student, and no
   real submission history behind this data. Dates are relative to "today" =
   2026-08-05 and spread across the preceding ~3 weeks.
   `associatedActivityId` must match an item id currently listed in
   portal/data/curriculum.js (projects.js resolves it via findItem, not the
   raw learning-path.js content store) — opening a project resolves directly
   into that item's workspace. */

export const MOCK_PROJECTS = [
  {
    id: "joint-control-basics",
    title: "Joint Control Basics",
    lastEdited: "2026-08-03T16:10:00",
    associatedActivityId: "finger-curl",
    status: "in-progress",
    workspaceFile: "swayform_ws/src/swayform_labs/lab_01_finger_curl.py",
    summary: "Commands individual servo joints to safe positions using the motion client's basic pose interface.",
  },
  {
    id: "keyboard-head-practice",
    title: "Keyboard Head Control Practice",
    lastEdited: "2026-07-30T11:05:00",
    associatedActivityId: "keyboard-head-control",
    status: "submitted",
    workspaceFile: "swayform_ws/src/swayform_labs/lab_06_keyboard_head_control.py",
    summary: "Drives head pitch and yaw from live keyboard input, clamped inside a safe range on both axes.",
  },
  {
    id: "custom-robot-motion",
    title: "Custom Robot Motion",
    lastEdited: "2026-07-24T09:40:00",
    associatedActivityId: "full-handshake",
    status: "needs-changes",
    workspaceFile: "swayform_ws/src/swayform_labs/lab_07_full_handshake.py",
    summary: "Builds a custom multi-step arm sequence — raise, grip, hold, release, return — beyond the built-in demo poses.",
  },
  {
    id: "combined-control-prototype",
    title: "Combined Control Prototype",
    lastEdited: "2026-07-19T15:00:00",
    associatedActivityId: "combined-keyboard-control",
    status: "draft",
    workspaceFile: "swayform_ws/src/swayform_labs/lab_10_combined_keyboard_control.py",
    summary: "Routes keyboard input to either the head or torso handler, combining two independent control systems into one program.",
  },
];
