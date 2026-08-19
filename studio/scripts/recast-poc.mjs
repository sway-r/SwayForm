/* Phase 1 proof-of-concept: can Studio edit the Learning Portal's real,
 * hand-authored source files WITHOUT disturbing the prose comments and
 * formatting around the edit?
 *
 * This is the load-bearing technical assumption for the whole project — if
 * it doesn't hold, Studio can't safely write to curriculum.js /
 * learning-path.js / workspace-files.js / reference.js at all, and the
 * "Studio edits the actual source" requirement needs a different approach.
 *
 * This script parses portal/data/curriculum.js with recast (which tracks
 * which AST nodes were actually touched), renames one section's title in
 * memory, reprints the source, and diffs old vs new — WITHOUT writing
 * anything back to disk. A correct result: only the one string literal
 * changes; every comment, blank line, and untouched section is identical.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as recast from 'recast';
import babelParser from 'recast/parsers/babel.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const TARGET = path.join(REPO_ROOT, 'portal', 'data', 'curriculum.js');

const original = fs.readFileSync(TARGET, 'utf8');
const ast = recast.parse(original, { parser: babelParser });

// Find CURRICULUM.sections[].title === 'Getting Started' and rename it —
// an arbitrary, safe, in-memory-only edit that exercises string-literal
// mutation inside a nested object literal, the core operation the Section
// Manager needs (renaming a section).
let edited = false;
recast.types.visit(ast, {
  visitObjectProperty(p) {
    if (
      p.node.key.type === 'Identifier' && p.node.key.name === 'title' &&
      p.node.value.type === 'StringLiteral' && p.node.value.value === 'Getting Started'
    ) {
      p.node.value.value = 'Getting Started (POC EDIT)';
      edited = true;
      return false;
    }
    this.traverse(p);
  },
});

if (!edited) {
  console.error('POC FAILED: could not find the "Getting Started" section title to edit.');
  process.exit(1);
}

// recast's line-terminator auto-detection is unreliable on this file (it
// injects \r\n even though the source is pure \n) — force it explicitly to
// match the source, or every line would show as "changed" by a trailing \r.
// `quote: 'single'` matches this codebase's convention — without it, a
// freshly-printed string literal (any node whose value actually changed)
// defaults to double quotes, which would make every content edit carry a
// spurious quote-style diff alongside the real change.
const output = recast.print(ast, { lineTerminator: '\n', quote: 'single' }).code;

// Diff old vs new line-by-line.
const oldLines = original.split('\n');
const newLines = output.split('\n');
let changedLines = 0;
const maxLen = Math.max(oldLines.length, newLines.length);
console.log('=== recast surgical-edit proof of concept (nothing written to disk) ===\n');
for (let i = 0; i < maxLen; i++) {
  if (oldLines[i] !== newLines[i]) {
    changedLines += 1;
    console.log(`  line ${i + 1}:`);
    console.log(`    - ${oldLines[i] ?? '(none)'}`);
    console.log(`    + ${newLines[i] ?? '(none)'}`);
  }
}

console.log(`\nTotal lines in file: ${oldLines.length}`);
console.log(`Lines changed: ${changedLines}`);
console.log(changedLines === 1
  ? 'PASS — exactly one line changed. Every comment and all other formatting preserved byte-for-byte.'
  : `FAIL — expected exactly 1 changed line, got ${changedLines}.`);
