/* Asset manager backend: list /images with usage references, upload,
 * replace, and reference-guarded delete. Usage is computed against BOTH the
 * draft-merged content model (image blocks) and the static site files that
 * reference /images/* (HTML pages, CSS, JS at repo root + portal).
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, absPath, assetPathFor, assetKindFor, writeAssetFile, deleteAssetFile } from './repo.mjs';
import { listImageAssets, listVideoAssets } from './content-load.mjs';

function* walkStaticFiles() {
  const roots = ['.', 'portal'];
  const exts = new Set(['.html', '.css', '.js']);
  for (const root of roots) {
    const dir = absPath(root === '.' ? '' : root);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: root === 'portal' })) {
      if (!entry.isFile()) continue;
      if (!exts.has(path.extname(entry.name))) continue;
      const full = path.join(entry.parentPath ?? entry.path ?? dir, entry.name);
      if (full.includes('node_modules') || full.includes(`${path.sep}studio${path.sep}`)) continue;
      if (root === '.' && path.dirname(full) !== dir) continue; // top level only for '.'
      yield full;
    }
  }
}

export function assetUsage(model) {
  const usage = {}; // filename -> [references]
  const note = (file, ref) => {
    (usage[file] ||= []).push(ref);
  };

  // Content model image/video blocks (src + poster references).
  for (const [id, a] of Object.entries(model.activities)) {
    a.steps.forEach((st) => st.blocks.forEach((blk) => {
      const refs = [];
      if (blk.type === 'image' && blk.src) refs.push(blk.src);
      if (blk.type === 'video') {
        if (blk.src) refs.push(blk.src);
        if (blk.poster) refs.push(blk.poster);
      }
      for (const ref of refs) {
        const m = /\/?(?:images|videos)\/([^/?#]+)/.exec(ref);
        if (m) note(m[1], { kind: 'lesson', activityId: id, title: `${a.title} · ${st.title}` });
      }
    }));
  }

  // Static site files.
  for (const file of walkStaticFiles()) {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const re = /(?:images|videos)\/([A-Za-z0-9_\-. ]+\.(?:png|jpe?g|gif|svg|webp|mp4|webm|m4v|mov))/gi;
    const seen = new Set();
    let m;
    while ((m = re.exec(text))) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        note(m[1], { kind: 'source', file: rel });
      }
    }
  }
  return usage;
}

export function listAssetsWithUsage(model) {
  const usage = assetUsage(model);
  return [...listImageAssets(), ...listVideoAssets()].map((a) => ({ ...a, usedBy: usage[a.name] || [] }));
}

export function uploadAsset(name, base64, { overwrite = false } = {}) {
  const rel = assetPathFor(name);
  const kind = assetKindFor(name);
  const exists = fs.existsSync(absPath(rel));
  if (exists && !overwrite) throw new Error(`"${name}" already exists — use replace to overwrite it.`);
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('Empty upload');
  const cap = kind === 'video' ? 200 : 20;
  if (buffer.length > cap * 1024 * 1024) throw new Error(`${kind === 'video' ? 'Video' : 'Image'} larger than ${cap} MB`);
  writeAssetFile(rel, buffer);
  return { path: rel, size: buffer.length, replaced: exists, kind };
}

export function deleteAsset(model, name) {
  const rel = assetPathFor(name);
  const usage = assetUsage(model)[name] || [];
  if (usage.length) {
    throw new Error(`"${name}" is still referenced by: ${usage.map((u) => u.title || u.file).join(', ')}`);
  }
  deleteAssetFile(rel);
  return { deleted: rel };
}
