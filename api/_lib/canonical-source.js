import { WORKSPACE_FILES } from '../../portal/data/workspace-files.js';
import { packageAndEntry, isCanonicalRobotPath } from '../../portal/apps/learn/workspace/ros-paths.js';

export { packageAndEntry, isCanonicalRobotPath };

/**
 * Every canonical robot file ships with exactly one starting/default
 * version (WORKSPACE_FILES[path] — the same content the Code Editor opens
 * with) and exactly one named constant a student is meant to change to reach
 * one of that constant's acceptable target values. Most files have exactly
 * one target (the historical behavior); finger_count.py's NUMBER is the
 * first with several (1-5 are all valid "solutions" — the lab is "pick a
 * number to show," not "reach one specific number"). Everything else in the
 * file must match byte-for-byte (modulo trailing whitespace and blank-line
 * placement — see
 * normalize()), always, regardless of how many targets a tunable has.
 * `pattern` must match the constant's canonical line and capture the
 * current value in group 1. Keep in sync with the "Safe Things to Change"/
 * "Look at This Part" copy in portal/data/learning-path.js.
 */
const TUNABLES = {
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/wave.py': [
    { name: 'WAVE_CYCLES', pattern: /^WAVE_CYCLES = (\d+)$/, targets: ['5'] },
  ],
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/handshake.py': [
    { name: 'SHAKE_CYCLES', pattern: /^SHAKE_CYCLES = (\d+)$/, targets: ['2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  ],
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/fist_bump.py': [
    { name: 'ENABLE_HEAD_NOD', pattern: /^ENABLE_HEAD_NOD = (True|False)\b.*$/, targets: ['True'] },
  ],
  'swayform_ws/src/swayform_robot/swayform_robot/behaviors/finger_count.py': [
    { name: 'NUMBER', pattern: /^NUMBER = (None|[1-5])$/, targets: ['1', '2', '3', '4', '5'] },
  ],
};

/** "5" -> "5"; ["True"] -> "True"; ["1".."5"] -> "1, 2, 3, 4, or 5". */
function formatTargets(targets){
  if (targets.length === 1) return targets[0];
  if (targets.length === 2) return `${targets[0]} or ${targets[1]}`;
  return `${targets.slice(0, -1).join(', ')}, or ${targets[targets.length - 1]}`;
}

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
  const variants = allCompleteVariants(canonical, tunables);
  const normalizedCode = normalize(code);

  if (variants.some((v) => normalizedCode === normalize(v))) return { valid: true, status: 'complete' };

  if (normalizedCode === normalize(canonical)){
    const t = tunables[0];
    return {
      valid: false,
      status: 'not_started',
      tunable: t ? { name: t.name, from: currentTunableValue(canonical, t), to: formatTargets(t.targets) } : null,
    };
  }

  // Diff against whichever acceptable variant is closest to what was
  // submitted, so a student who set NUMBER = 3 sees a diff against the
  // NUMBER = 3 variant, not one that happens to compare against NUMBER = 1.
  // With a single-target tunable (the historical case) there's only one
  // variant, so this is unchanged from before.
  const diffs = variants
    .map((v) => allLineDifferences(code, v))
    .reduce((best, d) => (d.length < best.length ? d : best));
  return { valid: false, status: 'tampered', diffs };
}

/** The byte-exact variant a 'complete' submission matched (or null): what gets queued, so the robot can re-derive its sha256. */
export function canonicalVariantFor(path, code){
  if (!isCanonicalRobotPath(path) || typeof WORKSPACE_FILES[path] !== 'string') return null;
  const normalizedCode = normalize(code);
  const match = allCompleteVariants(WORKSPACE_FILES[path], TUNABLES[path] || []).find((v) => normalizedCode === normalize(v));
  return match === undefined ? null : match;
}

/** Blank or whitespace-only lines do not change Python behavior in these
 * controlled files, so students may add or remove them. Trailing whitespace
 * on nonblank lines is incidental too. The canonical variant is still what
 * gets queued, so formatting differences never reach the physical robot. */
function normalize(text){
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .filter((line) => line.trim() !== '')
    .join('\n');
}

function currentTunableValue(canonical, tunable){
  for (const line of canonical.split('\n')){
    const m = line.match(tunable.pattern);
    if (m) return m[1];
  }
  return null;
}

/** Substitutes one specific value for one tunable into canonical, line for line. */
function applyTunableValue(canonical, tunable, value){
  return canonical.split('\n').map((line) => {
    if (!tunable.pattern.test(line)) return line;
    const m = line.match(tunable.pattern);
    const valueStart = line.indexOf(m[1]);
    return line.slice(0, valueStart) + value + line.slice(valueStart + m[1].length);
  }).join('\n');
}

/** Every acceptable "complete" version of this file — one combination per
 * tunable-target pairing. With zero tunables that's just [canonical]; with
 * one tunable and one target (the historical case, e.g. wave.py) it's a
 * single variant, same as before; with one tunable and several targets
 * (finger_count.py's NUMBER) it's one variant per target. Multiple distinct
 * tunables in one file would multiply out combinatorially — no current file
 * needs that, but the loop is written to not silently break if one ever does. */
function allCompleteVariants(canonical, tunables){
  let variants = [canonical];
  for (const tunable of tunables){
    variants = variants.flatMap((base) => tunable.targets.map((value) => applyTunableValue(base, tunable, value)));
  }
  return variants;
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
  // Align significant lines so adding/removing a blank line does not make
  // every subsequent line look changed in the student's error report.
  const significantLines = (text) => text.split('\n')
    .map((line, index) => ({ text: line.replace(/[ \t]+$/, ''), line: index + 1 }))
    .filter((entry) => entry.text.trim() !== '');
  const yoursLines = significantLines(code);
  const targetLines = significantLines(target);
  const max = Math.max(yoursLines.length, targetLines.length);
  const diffs = [];
  for (let i = 0; i < max; i++){
    const yours = yoursLines[i];
    const expected = targetLines[i];
    if (yours?.text === expected?.text) continue;
    if (yours === undefined) diffs.push({ line: expected.line, kind: 'missing', expected: expected.text });
    else if (expected === undefined) diffs.push({ line: yours.line, kind: 'extra', yours: yours.text });
    else diffs.push({ line: yours.line, kind: 'changed', yours: yours.text, expected: expected.text });
  }
  return diffs;
}
