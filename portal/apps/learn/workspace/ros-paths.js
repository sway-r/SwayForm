/* Shared between the browser (code-editor-app.js, mock-shell.js) and the
   backend (api/_lib/canonical-source.js) — single source of truth for how a
   workspace path maps to a ROS 2 (package, executable) pair, and for which
   paths have real, verified robot source behind them worth validating
   against. Keep in sync with swayform_ws/src/swayform_robot/setup.py's
   entry_points if new real behaviors are added. */

export function packageAndEntry(path){
  const parts = path.split('/');
  return { pkg: parts[2] || 'swayform_demos', file: parts[parts.length - 1].replace(/\.py$/, '') };
}

// Paths with real, verified robot source behind them (see
// portal/data/workspace-files.js's "REAL ROBOT SOURCE" block) — eligible for
// the Run on Robot queue. Everything else (labs' simplified MotionClient
// exercises, not-yet-real demos) has no canonical answer to validate
// against, so that option simply isn't offered there.
export const CANONICAL_ROBOT_PATHS = new Set([
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py',
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/handshake.py',
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/idle.py',
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/finger_wave.py',
]);

export function isCanonicalRobotPath(path){
  return CANONICAL_ROBOT_PATHS.has(path);
}
