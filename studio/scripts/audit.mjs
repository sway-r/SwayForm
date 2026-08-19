/* Phase 1 proof: read the Learning Portal's real content modules the same
 * way the browser does (live `import`, not a re-parsed copy), and report a
 * structural map + cross-reference check. Read-only — writes nothing.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
register('../server/esm-loader.mjs', import.meta.url);

const dataUrl = (rel) => pathToFileURL(path.join(REPO_ROOT, rel)).href;

const { CURRICULUM, flattenItems, LAB_SECTION_IDS } = await import(dataUrl('portal/data/curriculum.js'));
const { LEARNING_PATH, flattenActivities, findActivity } = await import(dataUrl('portal/data/learning-path.js'));
const { WORKSPACE_FILES } = await import(dataUrl('portal/data/workspace-files.js'));
const { REFERENCE } = await import(dataUrl('portal/data/reference.js'));

console.log('=== SwayForm Learning Portal — content audit (read-only) ===\n');

// ---- curriculum.js -------------------------------------------------------
const items = flattenItems();
console.log(`Curriculum: "${CURRICULUM.title}"`);
console.log(`  Sections: ${CURRICULUM.sections.length}`);
CURRICULUM.sections.forEach((s) => {
  const real = s.items.filter((i) => i.kind !== 'placeholder').length;
  const placeholder = s.items.filter((i) => i.kind === 'placeholder').length;
  console.log(`    ${String(s.number).padStart(2)}. ${s.title.padEnd(24)} items=${s.items.length} (real=${real}, placeholder=${placeholder})`);
});
console.log(`  Total items: ${items.length}`);
console.log(`  Lab section ids: ${LAB_SECTION_IDS.join(', ')}\n`);

// ---- learning-path.js -----------------------------------------------------
const activities = flattenActivities();
console.log(`Learning path: "${LEARNING_PATH.title}"`);
console.log(`  Levels: ${LEARNING_PATH.levels.length}`);
console.log(`  Total authored activities: ${activities.length}\n`);

// ---- cross-reference: every non-placeholder curriculum item must resolve --
let unresolved = 0;
const seenIds = new Map();
items.forEach(({ item }) => {
  if (seenIds.has(item.id)) {
    console.log(`  [DUPLICATE ID] "${item.id}" appears more than once in curriculum.js`);
  }
  seenIds.set(item.id, (seenIds.get(item.id) || 0) + 1);
  if (item.kind === 'placeholder') return;
  const found = findActivity(item.id);
  if (!found) {
    unresolved += 1;
    console.log(`  [BROKEN REF] curriculum item "${item.id}" has no matching activity in learning-path.js`);
  }
});
const realItemCount = items.filter((e) => e.item.kind !== 'placeholder').length;
console.log(`Cross-reference check: ${realItemCount - unresolved}/${realItemCount} real items resolve to learning-path.js content. ${unresolved === 0 ? 'OK.' : `${unresolved} BROKEN.`}\n`);

// ---- workspace-files.js ----------------------------------------------------
const filePaths = Object.keys(WORKSPACE_FILES);
console.log(`Workspace files: ${filePaths.length} seed files`);
const pkgs = new Set(filePaths.map((p) => p.split('/')[2]).filter(Boolean));
console.log(`  Packages: ${Array.from(pkgs).join(', ')}\n`);

// ---- activities referencing a workspaceFile that doesn't exist ------------
let missingFiles = 0;
activities.forEach((a) => {
  if (a.workspaceFile && !Object.prototype.hasOwnProperty.call(WORKSPACE_FILES, a.workspaceFile)) {
    missingFiles += 1;
    console.log(`  [MISSING FILE] activity "${a.id}" references workspaceFile "${a.workspaceFile}" — not in workspace-files.js`);
  }
});
console.log(`Workspace-file reference check: ${missingFiles === 0 ? 'OK — every workspaceFile reference resolves.' : `${missingFiles} BROKEN.`}\n`);

// ---- reference.js -----------------------------------------------------------
console.log(`Reference (Help app): "${REFERENCE.title || REFERENCE.id || '(untitled)'}"`);
console.log(`  Top-level keys: ${Object.keys(REFERENCE).join(', ')}\n`);

console.log('=== Audit complete — no files were modified. ===');
