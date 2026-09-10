import { WORKSPACE_FILES } from '../../portal/data/workspace-files.js';
import { packageAndEntry, isCanonicalRobotPath } from '../../portal/apps/learn/workspace/ros-paths.js';

export { packageAndEntry, isCanonicalRobotPath };

/**
 * Byte-exact comparison against the verified working source for this path
 * (the same real, synced-from-swayform_ws content the mock workspace ships
 * — see portal/data/workspace-files.js). Deliberately strict: no trimming,
 * no whitespace normalization — "exactly what's running on the robot" means
 * exactly, not approximately. Returns { valid, reason? }.
 */
export function validateAgainstCanonicalSource(path, code){
  if (!isCanonicalRobotPath(path)) return { valid: false, reason: 'no_canonical_source' };

  const canonical = WORKSPACE_FILES[path];
  if (typeof canonical !== 'string') return { valid: false, reason: 'no_canonical_source' };

  return code === canonical ? { valid: true } : { valid: false, reason: 'mismatch' };
}
