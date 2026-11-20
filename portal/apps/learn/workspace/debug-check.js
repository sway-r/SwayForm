/* Debugging labs: what Run and Check show for a file with planted bugs.
 *
 * An activity opts in with `debugging: { path, bugs, workingRun }` (see wv-07-debugging in wave-section.js).
 * Each bug:
 *   id, name          short label shown in Problems ("Bug 1: It won't start")
 *   brokenWhen        RegExp that matches while the bug is still in the file (also locates its line)
 *   fixedWhen         RegExp that must match once it is fixed
 *   error             optional { kind: 'syntax' | 'runtime', where, message }: what Python prints.
 *                     syntax errors stop the program before it starts; runtime ones after it has started.
 *   runLines          optional: what the program prints when this (error-free) bug is the one left
 *   clues             clues from gentle to specific; each Check while the bug is still there shows the next one
 * Pure functions: code-editor-app.js does the printing, test/wave-section.test.mjs pins the behaviour. */

export function isFixed(bug, text){
  return !bug.brokenWhen.test(text) && (!bug.fixedWhen || bug.fixedWhen.test(text));
}

/** The 1-based line a bug is on, and that line's text, or null once it is gone. */
export function bugLocation(bug, text){
  const m = bug.brokenWhen.exec(text);
  if (!m) return null;
  const line = text.slice(0, m.index).split('\n').length;
  return { line, code: text.split('\n')[line - 1] };
}

const fileName = (debugging) => debugging.path.split('/').pop();

/** The error lines Python would print for a bug, pointing at where it is now. */
export function errorLines(debugging, bug, text){
  const at = bugLocation(bug, text) || { line: '?', code: '' };
  const where = bug.error.kind === 'runtime' ? `, in ${bug.error.where}` : '';
  return [
    ...(bug.error.kind === 'runtime' ? ['Traceback (most recent call last):'] : []),
    `  File "${fileName(debugging)}", line ${at.line}${where}`,
    `    ${at.code.trim()}`,
    bug.error.message,
  ];
}

/** Run: { t, text, cls, problems }[] in the same shape as buildRunSequence (mock-shell.js). */
export function debugRunSequence(debugging, text, pkg, file){
  const left = debugging.bugs.filter((b) => !isFixed(b, text));
  const started = [`[INFO] [${file}]: node started`, '[INFO] Connecting to motion controller...', '[wave] starting'];
  const lines = [{ text: `$ ros2 run ${pkg} ${file}`, cls: 'term-cmd' }];
  const syntax = left.find((b) => b.error && b.error.kind === 'syntax');
  const runtime = left.find((b) => b.error && b.error.kind === 'runtime');
  const logic = left.find((b) => !b.error);
  if (syntax){
    errorLines(debugging, syntax, text).forEach((l) => lines.push({ text: l, cls: 'term-err', problems: true }));
    lines.push({ text: 'Tip: Python found this before it even started. Read the error from the bottom up: the last line says what is wrong, the line above shows where.', cls: 'term-warn' });
  } else if (runtime){
    started.forEach((l) => lines.push({ text: l, cls: '' }));
    (runtime.runLines || []).forEach((l) => lines.push({ text: l, cls: '' }));
    errorLines(debugging, runtime, text).forEach((l) => lines.push({ text: l, cls: 'term-err', problems: true }));
    lines.push({ text: 'Tip: the program started, then crashed when it reached this line. The last line says what is wrong.', cls: 'term-warn' });
  } else if (logic){
    started.forEach((l) => lines.push({ text: l, cls: '' }));
    (logic.runLines || []).forEach((l) => lines.push({ text: l, cls: '' }));
    lines.push({ text: 'Tip: no error this time! But read the steps the program printed, from top to bottom. Is that how a wave goes?', cls: 'term-warn', problems: true });
  } else {
    started.forEach((l) => lines.push({ text: l, cls: '' }));
    (debugging.workingRun || []).forEach((l) => lines.push({ text: l, cls: '' }));
    lines.push({ text: `All ${debugging.bugs.length} bugs fixed. The wave runs the way it should. Nice debugging!`, cls: 'term-ok' });
  }
  return lines.map((l, i) => ({ ...l, t: 200 + i * 220 }));
}

/** Check: progress plus one clue per bug still in the file. `seen` (a Map) counts Checks per bug, so clues grow more specific. */
export function debugCheck(debugging, text, seen){
  const total = debugging.bugs.length;
  const left = debugging.bugs.filter((b) => !isFixed(b, text));
  const done = total - left.length;
  const output = [{ text: `Bugs fixed in ${fileName(debugging)}: ${'▰'.repeat(done)}${'▱'.repeat(total - done)}  ${done} of ${total}`, cls: done ? 'term-ok' : '' }];
  if (!left.length){
    output.push({ text: 'Check passed: every bug is fixed. Click Run to watch the wave work.', cls: 'term-ok' });
    return { done, total, output, problems: [] };
  }
  output.push({ text: `${left.length} to go. The Problems tab has a clue for each one. Check as often as you like: every Check gives a more specific clue.`, cls: 'term-warn' });
  const problems = left.map((b) => {
    const n = (seen.get(b.id) || 0) + 1;
    seen.set(b.id, n);
    const clue = b.clues[Math.min(n, b.clues.length) - 1];
    return { text: `${b.name} (clue ${Math.min(n, b.clues.length)} of ${b.clues.length}): ${clue}`, cls: 'term-warn' };
  });
  return { done, total, output, problems };
}
