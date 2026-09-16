import { WORKSPACE_FILES } from '../../portal/data/workspace-files.js';
import { packageAndEntry, isCanonicalRobotPath } from '../../portal/apps/learn/workspace/ros-paths.js';

export { packageAndEntry, isCanonicalRobotPath };

/**
 * Every canonical robot file ships with exactly one starting/default
 * version (WORKSPACE_FILES[path] — the same content the Code Editor opens
 * with) and exactly one named constant a student is meant to change to
 * reach exactly one correct target value. There is no longer a range of
 * "acceptable" values for that constant — only its target counts as the
 * lab's objective being complete. Everything else in the file must match
 * byte-for-byte (modulo incidental whitespace — see normalize()), always.
 * `pattern` must match the constant's canonical line and capture the
 * current value in group 1. Keep in sync with the "Safe Things to Change"/
 * "Look at This Part" copy in portal/data/learning-path.js.
 */
const TUNABLES = {
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py': [
    { name: 'WAVE_CYCLES', pattern: /^WAVE_CYCLES = (\d+)$/, target: '5' },
  ],
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/fist_bump.py': [
    { name: 'ENABLE_HEAD_NOD', pattern: /^ENABLE_HEAD_NOD = (True|False)\b.*$/, target: 'True' },
  ],
};

/**
 * Classifies submitted code against this file's default/target pair.
 * Returns one of:
 *   { valid: false, status: 'no_canonical_source' }                — not a real robot file
 *   { valid: true,  status: 'complete' }                            — exactly the target
 *   { valid: false, status: 'not_started', tunable: {name,from,to} } — exactly the untouched default
 *   { valid: false, status: 'tampered', diffs: [...] }              — anything else, diffed against the target
 * `valid` is a plain boolean for callers that only need a queue/no-queue
 * gate (only 'complete' may ever be queued onto the physical robot).
 */
export function validateAgainstCanonicalSource(path, code){
  if (!isCanonicalRobotPath(path)) return { valid: false, status: 'no_canonical_source' };

  const canonical = WORKSPACE_FILES[path];
  if (typeof canonical !== 'string') return { valid: false, status: 'no_canonical_source' };

  const tunables = TUNABLES[path] || [];
  const target = applyTunableTargets(canonical, tunables);

  if (normalize(code) === normalize(target)) return { valid: true, status: 'complete' };

  if (normalize(code) === normalize(canonical)){
    const t = tunables[0];
    return {
      valid: false,
      status: 'not_started',
      tunable: t ? { name: t.name, from: currentTunableValue(canonical, t), to: t.target } : null,
    };
  }

  return { valid: false, status: 'tampered', diffs: allLineDifferences(code, target) };
}

/** Trailing whitespace per line and a trailing run of blank lines are the
 * only things a submission may differ on incidentally — everything else
 * that matters is a real content difference. */
function normalize(text){
  return text.split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '\n');
}

function currentTunableValue(canonical, tunable){
  for (const line of canonical.split('\n')){
    const m = line.match(tunable.pattern);
    if (m) return m[1];
  }
  return null;
}

/** Substitutes each tunable's target value into canonical, line for line —
 * this IS the definition of "the one correct solution" for this file. */
function applyTunableTargets(canonical, tunables){
  if (!tunables.length) return canonical;
  return canonical.split('\n').map((line) => {
    const tunable = tunables.find((t) => t.pattern.test(line));
    if (!tunable) return line;
    const m = line.match(tunable.pattern);
    const valueStart = line.indexOf(m[1]);
    return line.slice(0, valueStart) + tunable.target + line.slice(valueStart + m[1].length);
  }).join('\n');
}

/**
 * A simple line-index diff — not a real LCS-based diff, just enough to
 * point a student at every line that differs from the target (a typo,
 * stray whitespace, an unauthorized edit). The target content is not
 * secret — it's the same read-only reference already shown in the lesson —
 * so surfacing "expected" text back to the student is fine.
 * Known limitation: an earlier inserted/deleted line shifts everything
 * after it, so later "changed" lines may really just be shifted by one —
 * acceptable since these files are meant to be copied exactly, not
 * restructured.
 */
function allLineDifferences(code, target){
  const yoursLines = code.split('\n');
  const targetLines = target.split('\n');
  const max = Math.max(yoursLines.length, targetLines.length);
  const diffs = [];
  for (let i = 0; i < max; i++){
    const yours = yoursLines[i];
    const expected = targetLines[i];
    if (yours === expected) continue;
    if (yours === undefined) diffs.push({ line: i + 1, kind: 'missing', expected });
    else if (expected === undefined) diffs.push({ line: i + 1, kind: 'extra', yours });
    else diffs.push({ line: i + 1, kind: 'changed', yours, expected });
  }
  return diffs;
}
