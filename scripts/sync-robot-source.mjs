// Sync the Code Editor's real-robot files from sway-r/swayform_ws master.
// node scripts/sync-robot-source.mjs           check only, exits 1 on drift
// node scripts/sync-robot-source.mjs --write   update workspace-files.js and lesson line refs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES_JS = ROOT + 'portal/data/workspace-files.js';
const LESSON_FILES = ['portal/data/learning-path.js', 'portal/data/wave-section.js', 'portal/data/handshake-section.js', 'portal/data/orientation-section.js'].map((p) => ROOT + p);
const REPO = 'https://api.github.com/repos/sway-r/swayform_ws';
const PREFIX = 'swayform_ws/';
const MIRRORED = 'swayform_ws/src/swayform_robot/';

export function githubToken(){
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const out = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return (out.match(/^password=(.*)$/m) || [])[1] || null;
  } catch { return null; }
}

async function gh(path, token, raw){
  const res = await fetch(REPO + path, { headers: { Authorization: `Bearer ${token}`, Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return raw ? res.text() : res.json();
}

// Locates each `"path": \`...\`` entry, returning its decoded content and source span.
export function parseEntries(src){
  const entries = {};
  const keyRe = /^ {2}"([^"]+)": `/gm;
  let m;
  while ((m = keyRe.exec(src))){
    const start = m.index + m[0].length;
    let i = start;
    while (src[i] !== '`'){ if (src[i] === '\\') i++; i++; }
    entries[m[1]] = { start, end: i, content: decode(src.slice(start, i)) };
  }
  return entries;
}

const decode = (s) => s.replace(/\\([\\`$])/g, '$1');
const encode = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

// The start of a setting or def line, so a ref can follow `NAME = 1` when it becomes `NAME = 3`.
const lineKey = (line) => ((line || '').match(/^\s*(?:def\s+\w+|class\s+\w+|[A-Za-z_]\w*\s*=)/) || [])[0];

// Moves `workspaceFile: '<path>', line: N` refs so they keep pointing at the same line text.
export function moveLineRefs(lessonSrc, path, oldText, newText){
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const notes = [];
  const re = new RegExp(`(workspaceFile: ['"]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"], line: )(\\d+)`, 'g');
  const out = lessonSrc.replace(re, (all, head, n) => {
    const line = oldLines[Number(n) - 1];
    let hits = newLines.flatMap((l, i) => (l === line ? [i + 1] : []));
    const key = lineKey(line);
    if (hits.length !== 1 && key) hits = newLines.flatMap((l, i) => (lineKey(l) === key ? [i + 1] : []));
    if (hits.length === 1){
      if (hits[0] !== Number(n)) notes.push(`${path}: line ref ${n} -> ${hits[0]}`);
      return head + hits[0];
    }
    notes.push(`CHECK BY HAND ${path}: line ref ${n} ("${(line || '').trim()}") ${hits.length ? 'is ambiguous' : 'no longer exists'}`);
    return all;
  });
  return { out, notes };
}

async function main(){
  const write = process.argv.includes('--write');
  const token = githubToken();
  if (!token) throw new Error('No GitHub token: set GITHUB_TOKEN or sign git in to github.com');

  const head = await gh('/commits/master', token);
  const tree = await gh(`/git/trees/${head.sha}?recursive=1`, token);
  const onMaster = new Set(tree.tree.map((t) => t.path));

  let src = readFileSync(FILES_JS, 'utf8');
  const entries = parseEntries(src);
  const changed = [];
  for (const [path, entry] of Object.entries(entries)){
    if (!path.startsWith(MIRRORED)) continue;
    const repoPath = path.slice(PREFIX.length);
    if (!onMaster.has(repoPath)){ console.log(`MISSING ON MASTER  ${repoPath}`); changed.push({ path, missing: true }); continue; }
    const remote = await gh(`/contents/${repoPath}?ref=${head.sha}`, token, true);
    if (remote !== entry.content) changed.push({ path, entry, remote });
  }

  console.log(`master @ ${head.sha.slice(0, 7)} (${head.commit.author.date}): ${changed.length ? changed.length + ' file(s) differ' : 'portal is up to date'}`);
  for (const c of changed) if (!c.missing) console.log(`  differs  ${c.path.slice(MIRRORED.length)}`);
  if (!write) return changed.length ? 1 : 0;

  const notes = [];
  for (const c of [...changed].filter((c) => !c.missing).sort((a, b) => b.entry.start - a.entry.start)){
    src = src.slice(0, c.entry.start) + encode(c.remote) + src.slice(c.entry.end);
  }
  const reparsed = parseEntries(src);
  for (const c of changed) if (!c.missing && reparsed[c.path].content !== c.remote) throw new Error(`round-trip mismatch on ${c.path}`);
  writeFileSync(FILES_JS, src);

  for (const file of LESSON_FILES){
    const before = readFileSync(file, 'utf8');
    let lesson = before;
    for (const c of changed) if (!c.missing){
      const r = moveLineRefs(lesson, c.path, c.entry.content, c.remote);
      lesson = r.out; notes.push(...r.notes);
    }
    if (lesson !== before) writeFileSync(file, lesson);
  }
  notes.forEach((n) => console.log('  ' + n));
  console.log(`Synced to ${head.sha.slice(0, 7)}. Check any "(line N)" mentions in lesson prose, then run npm test.`);
  if (changed.some((c) => c.missing) || notes.some((n) => n.startsWith('CHECK BY HAND'))) return 3;
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  main().then((code) => process.exit(code), (e) => { console.error(e.message); process.exit(2); });
}
