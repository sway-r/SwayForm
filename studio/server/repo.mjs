/* Repo location + write-safety. Every file write Studio ever performs goes
 * through writeAllowed() — a hard allowlist, not a denylist, so a bug in an
 * adapter can't wander outside the handful of content files Studio owns.
 */
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

/** Files Studio is allowed to modify, relative to repo root, forward slashes. */
export const WRITABLE_FILES = [
  'portal/data/curriculum.js',
  'portal/data/learning-path.js',
  'portal/data/workspace-files.js',
  'portal/data/workspace-config.js',
  'portal/portal.js',
  'portal/apps/learn/learn.js',
  'portal/apps/projects/projects.js',
  'portal/apps/account/account.js',
  'portal/apps/help/help.js',
  'portal/apps/settings/settings.js',
];

/** Directory Studio may add image assets into. */
export const ASSET_DIR = 'images';

export function absPath(rel) {
  return path.join(REPO_ROOT, ...rel.split('/'));
}

export function fileUrl(rel) {
  return pathToFileURL(absPath(rel)).href;
}

export function readRepoFile(rel) {
  return fs.readFileSync(absPath(rel), 'utf8');
}

export function repoFileExists(rel) {
  return fs.existsSync(absPath(rel));
}

/** Throws unless `rel` is one of the explicitly writable content files. */
export function assertWritable(rel) {
  if (!WRITABLE_FILES.includes(rel)) {
    throw new Error(`Refusing to write "${rel}" — not on Studio's writable-file allowlist.`);
  }
}

export function writeRepoFile(rel, content) {
  assertWritable(rel);
  fs.writeFileSync(absPath(rel), content, 'utf8');
}

/** Validates an asset filename for upload: plain basename, image extension,
 * no traversal. Returns the repo-relative path. */
export function assetPathFor(filename) {
  const base = path.basename(filename);
  if (base !== filename || !/^[A-Za-z0-9_][A-Za-z0-9_\-. ]*\.(png|jpg|jpeg|gif|svg|webp)$/i.test(base)) {
    throw new Error(`Invalid asset filename: "${filename}"`);
  }
  return `${ASSET_DIR}/${base}`;
}

export function writeAssetFile(rel, buffer) {
  if (!rel.startsWith(ASSET_DIR + '/')) throw new Error(`Asset writes must stay inside /${ASSET_DIR}`);
  // Re-validate the basename — never trust a caller-supplied path.
  assetPathFor(rel.slice(ASSET_DIR.length + 1));
  fs.writeFileSync(absPath(rel), buffer);
}

export function deleteAssetFile(rel) {
  if (!rel.startsWith(ASSET_DIR + '/')) throw new Error(`Asset deletes must stay inside /${ASSET_DIR}`);
  assetPathFor(rel.slice(ASSET_DIR.length + 1));
  fs.unlinkSync(absPath(rel));
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
export function assertSlug(id, what) {
  if (typeof id !== 'string' || !SLUG_RE.test(id) || id.length > 80) {
    throw new Error(`Invalid ${what || 'id'}: "${id}" — must be lowercase kebab-case.`);
  }
}

const WS_PATH_RE = /^ros2_ws\/[A-Za-z0-9_\-.]+(\/[A-Za-z0-9_\-.]+)*$/;
export function assertWorkspacePath(p) {
  if (typeof p !== 'string' || !WS_PATH_RE.test(p) || p.includes('..')) {
    throw new Error(`Invalid workspace file path: "${p}"`);
  }
}
