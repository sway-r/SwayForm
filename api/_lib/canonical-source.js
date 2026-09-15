import { WORKSPACE_FILES } from '../../portal/data/workspace-files.js';
import { packageAndEntry, isCanonicalRobotPath } from '../../portal/apps/learn/workspace/ros-paths.js';

export { packageAndEntry, isCanonicalRobotPath };

/**
 * Named, explicitly-tested-safe constants a student is allowed to change on
 * an otherwise byte-exact canonical file — everything else on the line's
 * file still has to match exactly. Each entry's `pattern` must match the
 * canonical line itself (so the line is found regardless of position) and
 * capture the value in group 1; `allowed` is the closed set of values the
 * edited line may use instead. Keep in sync with the "Safe Things to
 * Change" copy in portal/data/learning-path.js's Wave lesson.
 */
const TUNABLE_CONSTANTS = {
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py': [
    { name: 'WAVE_CYCLES', pattern: /^WAVE_CYCLES = (\d+)$/, allowed: [1, 2, 3, 4, 5] },
  ],
};

/**
 * Byte-exact comparison against the verified working source for this path
 * (the same real, synced-from-swayform_ws content the mock workspace ships
 * — see portal/data/workspace-files.js), with one deliberate carve-out: the
 * named TUNABLE_CONSTANTS above may differ from canonical as long as the new
 * value is in that constant's allowed set. Every other line — including
 * whitespace — still has to match exactly; "exactly what's running on the
 * robot" still means exactly, just with a couple of named knobs. Returns
 * { valid, reason? }.
 */
export function validateAgainstCanonicalSource(path, code){
  if (!isCanonicalRobotPath(path)) return { valid: false, reason: 'no_canonical_source' };

  const canonical = WORKSPACE_FILES[path];
  if (typeof canonical !== 'string') return { valid: false, reason: 'no_canonical_source' };

  if (code === canonical) return { valid: true };

  const tunables = TUNABLE_CONSTANTS[path];
  if (tunables && matchesWithTunables(code, canonical, tunables)) return { valid: true };

  return { valid: false, reason: 'mismatch', diff: firstLineDifference(code, canonical) };
}

/** True if `code` differs from `canonical` only on lines that a tunable
 * constant's pattern matches in the canonical version, and only by
 * substituting one of that constant's allowed values. Line count must match
 * — this permits a value swap, not restructuring. */
function matchesWithTunables(code, canonical, tunables){
  const yoursLines = code.split('\n');
  const expectedLines = canonical.split('\n');
  if (yoursLines.length !== expectedLines.length) return false;

  for (let i = 0; i < expectedLines.length; i++){
    if (yoursLines[i] === expectedLines[i]) continue;

    const tunable = tunables.find((t) => t.pattern.test(expectedLines[i]));
    if (!tunable) return false;

    const match = yoursLines[i].match(tunable.pattern);
    if (!match) return false;

    if (!tunable.allowed.includes(Number(match[1]))) return false;
  }
  return true;
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
