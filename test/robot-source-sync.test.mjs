import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';
import { parseEntries, moveLineRefs, githubToken } from '../scripts/sync-robot-source.mjs';

test('the sync parser reads every literal entry exactly as the module does', () => {
  const entries = parseEntries(readFileSync(new URL('../portal/data/workspace-files.js', import.meta.url), 'utf8'));
  assert.ok(Object.keys(entries).length > 10);
  for (const [path, e] of Object.entries(entries)) assert.equal(e.content, WORKSPACE_FILES[path], path);
});

test('line refs follow their line when code moves, and flag a line that vanished', () => {
  const path = 'swayform_ws/src/x.py';
  const lesson = `{ workspaceFile: '${path}', line: 2 }, { workspaceFile: '${path}', line: 3 }`;
  const r = moveLineRefs(lesson, path, 'a\nb\nc', 'new\na\nb\nz');
  assert.equal(r.out, `{ workspaceFile: '${path}', line: 3 }, { workspaceFile: '${path}', line: 3 }`);
  assert.equal(r.notes.length, 2);
  assert.match(r.notes[1], /CHECK BY HAND/);
});

test('the portal matches swayform_ws master', { skip: !(process.env.CHECK_ROBOT_SOURCE && githubToken()) && 'set CHECK_ROBOT_SOURCE=1 to check against GitHub' }, () => {
  try {
    execFileSync('node', ['scripts/sync-robot-source.mjs'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  } catch (e) {
    assert.fail(`${e.stdout}\nThe Pi pushed new robot code: run node scripts/sync-robot-source.mjs --write`);
  }
});
