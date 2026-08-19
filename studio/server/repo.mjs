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
export const VIDEO_DIR = 'videos';

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

/* Asset uploads land in a directory chosen by extension: images -> /images,
 * videos -> /videos. Both are static dirs served as-is on both hosts. */
const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|svg|webp)$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|m4v|mov)$/i;
const BASENAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_\-. ]*$/;

export function assetKindFor(filename) {
  if (IMAGE_EXT_RE.test(filename)) return 'image';
  if (VIDEO_EXT_RE.test(filename)) return 'video';
  return null;
}

/** Validates an asset filename for upload: plain basename, known image or
 * video extension, no traversal. Returns the repo-relative path. */
export function assetPathFor(filename) {
  const base = path.basename(filename);
  const kind = assetKindFor(base);
  if (base !== filename || !BASENAME_RE.test(base) || !kind) {
    throw new Error(`Invalid asset filename: "${filename}"`);
  }
  return `${kind === 'video' ? VIDEO_DIR : ASSET_DIR}/${base}`;
}

function assertAssetRel(rel) {
  const inImages = rel.startsWith(ASSET_DIR + '/');
  const inVideos = rel.startsWith(VIDEO_DIR + '/');
  if (!inImages && !inVideos) throw new Error(`Asset paths must stay inside /${ASSET_DIR} or /${VIDEO_DIR}`);
  // Re-validate the basename — never trust a caller-supplied path.
  const base = rel.slice(rel.indexOf('/') + 1);
  if (assetPathFor(base) !== rel) throw new Error(`Asset path/extension mismatch: "${rel}"`);
}

export function writeAssetFile(rel, buffer) {
  assertAssetRel(rel);
  fs.writeFileSync(absPath(rel), buffer);
}

export function deleteAssetFile(rel) {
  assertAssetRel(rel);
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
