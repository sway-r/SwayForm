/* Shared test infrastructure.
 *
 * materialize(changes) writes candidate file contents into a temp copy of
 * portal/data so tests can LIVE-IMPORT the generated sources — the same
 * "does it actually load and contain what we said" verification the save
 * pipeline performs, without touching the real repo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { register } from 'node:module';
import { REPO_ROOT } from '../server/repo.mjs';

register('../server/esm-loader.mjs', import.meta.url);

let tmpCounter = 0;

/** Copies portal/data into a fresh temp dir, applies { path -> content }
 * overrides, returns { dir, importData(name) }. */
export function materializeDataDir(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swayform-studio-test-'));
  const dataDir = path.join(dir, 'portal', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const srcData = path.join(REPO_ROOT, 'portal', 'data');
  for (const f of fs.readdirSync(srcData)) {
    fs.copyFileSync(path.join(srcData, f), path.join(dataDir, f));
  }
  for (const [rel, content] of Object.entries(overrides)) {
    const abs = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  tmpCounter += 1;
  const gen = tmpCounter;
  return {
    dir,
    importData: (name) => import(pathToFileURL(path.join(dataDir, name)).href + '?t=' + gen),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

export function changesByPath(changes) {
  return Object.fromEntries(changes.map((c) => [c.path, c]));
}
