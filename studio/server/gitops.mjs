/* Git operations, always spawned with argument arrays (never shell strings)
 * and always scoped to explicit paths — Studio must not be able to sweep
 * unrelated working-tree changes (e.g. the user's own in-progress edits)
 * into a commit.
 */
import { execFile } from 'node:child_process';
import { REPO_ROOT } from './repo.mjs';

function git(args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: REPO_ROOT, maxBuffer: 32 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error(`git ${args.join(' ')} failed: ${stderr || err.message}`));
      else resolve(stdout);
    });
  });
}

export async function gitStatus() {
  const out = await git(['status', '--porcelain']);
  return out.split('\n').filter(Boolean).map((line) => ({
    status: line.slice(0, 2).trim(),
    path: line.slice(3).replace(/^"|"$/g, ''),
  }));
}

/** Diff of specific paths in the working tree vs HEAD. */
export async function gitDiffPaths(paths) {
  if (!paths.length) return '';
  return git(['diff', '--', ...paths]);
}

export async function gitDiffStat(paths) {
  if (!paths.length) return '';
  return git(['diff', '--stat', '--', ...paths]);
}

/** Stage ONLY the given paths and commit. Returns the new commit hash.
 * Uses a pathspec-scoped commit so nothing else staged/unstaged is included. */
export async function gitCommitPaths(paths, message) {
  if (!paths.length) throw new Error('Nothing to commit');
  await git(['add', '--', ...paths]);
  await git(['commit', '-m', message, '--', ...paths]);
  return (await git(['rev-parse', 'HEAD'])).trim();
}

/** Recent commits touching the given paths. */
export async function gitLog(paths, limit = 20) {
  const args = ['log', `-n`, String(limit), '--pretty=format:%H%x1f%h%x1f%an%x1f%aI%x1f%s'];
  if (paths && paths.length) args.push('--', ...paths);
  const out = await git(args);
  return out.split('\n').filter(Boolean).map((line) => {
    const [hash, short, author, date, subject] = line.split('\x1f');
    return { hash, short, author, date, subject };
  });
}

export async function gitShow(hash) {
  if (!/^[0-9a-f]{7,40}$/i.test(hash)) throw new Error('Invalid commit hash');
  return git(['show', '--stat', '--patch', hash]);
}

/** True when `path` has uncommitted working-tree changes. */
export async function gitPathDirty(path) {
  const out = await git(['status', '--porcelain', '--', path]);
  return out.trim().length > 0;
}
