/* SwayForm Learning Portal — mock seed data for the frontend-only Projects app.
   Entirely fictional / mocked: there is no backend, no real student, and no
   real submission history behind this data. Dates are relative to "today" =
   2026-08-05 and spread across the preceding ~3 weeks. */

export const MOCK_PROJECTS = [
  {
    id: "joint-control-basics",
    title: "Joint Control Basics",
    lastEdited: "2026-08-03T16:10:00",
    associatedLessonId: "lab-01",
    associatedCourseChapter: "labs",
    status: "in-progress",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_01_hello_motion.py",
    summary: "Commands individual servo joints to safe positions using the motion client's basic pose interface.",
  },
  {
    id: "sensor-reading-lab",
    title: "Sensor Reading Lab",
    lastEdited: "2026-07-30T11:05:00",
    associatedLessonId: "lab-02",
    associatedCourseChapter: "labs",
    status: "submitted",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_02_realsense_zone.py",
    summary: "Reads RealSense depth data to detect whether an object is inside a defined target zone.",
  },
  {
    id: "custom-robot-motion",
    title: "Custom Robot Motion",
    lastEdited: "2026-07-24T09:40:00",
    associatedLessonId: "lab-03",
    associatedCourseChapter: "labs",
    status: "needs-changes",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_03_custom_pose_sequence.py",
    summary: "Builds a custom multi-step arm gesture sequence beyond the built-in demo poses.",
  },
  {
    id: "ros2-publisher-exercise",
    title: "ROS 2 Publisher Exercise",
    lastEdited: "2026-07-19T15:00:00",
    associatedLessonId: "lab-04",
    associatedCourseChapter: "labs",
    status: "draft",
    workspaceFile: "ros2_ws/src/swayform_labs/lab_04_publisher_basics.py",
    summary: "Publishes simple status messages on a custom ROS 2 topic to practice publisher/subscriber basics.",
  },
];
