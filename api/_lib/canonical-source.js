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

  if (code === canonical) return { valid: true };
  return { valid: false, reason: 'mismatch', diff: firstLineDifference(code, canonical) };
}

/**
 * A simple line-index diff — not a real LCS-based diff, just enough to
 * point a student at roughly where their code first stops matching (a
 * typo, stray whitespace, one changed line). The canonical file's content
 * is not secret — it's the same read-only reference already shown in the
 * lesson — so surfacing "expected" text back to the student is fine.
 * Known limitation: if a line was inserted/deleted earlier, everything
 * after that point will look "different" even though it's really just
 * shifted by one line — acceptable since these files are meant to be
 * copied exactly, not restructured.
 */
function firstLineDifference(code, canonical){
  const yoursLines = code.split('\n');
  const expectedLines = canonical.split('\n');
  const max = Math.max(yoursLines.length, expectedLines.length);

  for (let i = 0; i < max; i++){
    const yours = yoursLines[i];
    const expected = expectedLines[i];
    if (yours === expected) continue;

    if (yours === undefined) return { line: i + 1, kind: 'missing', expected };
    if (expected === undefined) return { line: i + 1, kind: 'extra', yours };
    return { line: i + 1, kind: 'changed', yours, expected };
  }
  return null; // unreachable if code !== canonical, but stay safe
}
