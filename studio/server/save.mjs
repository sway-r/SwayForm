/* The Save Changes pipeline (brief §12): generate → inspect → validate →
 * reimport-verify → review → commit, with full rollback on any failure.
 * Nothing is committed unless every gate passes; nothing outside the files
 * Studio generated is ever staged.
 */
import fs from 'node:fs';
import { absPath, writeRepoFile } from './repo.mjs';
import { loadContent } from './content-load.mjs';
import { generateChanges } from './writers.mjs';
import { validateModel } from './validate.mjs';
import { deepEqual } from './ast-utils.mjs';
import { gitCommitPaths, gitDiffStat } from './gitops.mjs';

/** Compares the semantically-meaningful parts of two models (base hashes and
 * bookkeeping fields excluded). */
function modelsEquivalent(a, b) {
  const strip = (m) => ({
    curriculum: {
      ...m.curriculum,
      // generated flag can legitimately flip when a generated section is
      // materialized into an explicit array; padStyle is derived formatting.
      sections: m.curriculum.sections.map(({ generated, padStyle, ...s }) => s),
    },
    activities: m.activities,
    workspaceFiles: m.workspaceFiles,
    workspaceConfig: m.workspaceConfig,
    portalHome: m.portalHome,
  });
  return deepEqual(strip(a), strip(b));
}

function reviewChecks(changes, ops) {
  const findings = [];
  const opTypes = new Set(ops.map((o) => o.type));
  const deleteish = ['activity.remove', 'file.remove', 'item.hide', 'step.remove', 'block.remove', 'section.remove', 'app.enable'];
  const hasDeleteOps = deleteish.some((t) => opTypes.has(t));

  for (const c of changes) {
    const beforeLines = c.before.split('\n').length;
    const afterLines = c.after.split('\n').length;
    const shrink = beforeLines - afterLines;
    if (shrink > 50 && !hasDeleteOps) {
      findings.push({ level: 'error', where: c.path, msg: `File shrank by ${shrink} lines but no deletion-type change was made — refusing to proceed.` });
    } else if (shrink > 20 && !hasDeleteOps) {
      findings.push({ level: 'warn', where: c.path, msg: `File shrank by ${shrink} lines without an explicit delete operation — review the diff.` });
    }
    if (/\bundefined\b/.test(c.after) && !/\bundefined\b/.test(c.before)) {
      findings.push({ level: 'warn', where: c.path, msg: 'Generated source introduces the token "undefined" — check for a serialization bug.' });
    }
  }
  return findings;
}

function commitMessage(ops, changes) {
  const texts = ops.map((e) => e.summary.text);
  const targets = new Set(ops.map((e) => e.op.type.split('.')[0]));
  const scope = targets.size === 1
    ? { section: 'curriculum', item: 'curriculum', placeholder: 'curriculum', activity: 'learning', step: 'learning', block: 'learning', file: 'workspace', config: 'workspace', app: 'desktop' }[[...targets][0]] || 'learning'
    : 'learning';
  const title = texts.length === 1
    ? `content(${scope}): ${texts[0].charAt(0).toLowerCase()}${texts[0].slice(1)}`
    : `content(${scope}): ${texts.length} Studio content edits`;
  const body = [
    '',
    ...texts.slice(0, 30).map((t) => `- ${t}`),
    ...(texts.length > 30 ? [`- … and ${texts.length - 30} more`] : []),
    '',
    'Files:',
    ...changes.map((c) => `- ${c.path}`),
    '',
    'Saved via SwayForm Learning Portal Studio (validated: syntax, reimport,',
    'structural curriculum checks, automated review).',
  ].join('\n');
  return title + '\n' + body;
}

/**
 * Runs the full save. Returns { ok, steps: [{id,label,ok,detail,errors}],
 * commit?, message? }. On failure everything written is rolled back.
 */
export async function runSave(draft) {
  const steps = [];
  const step = (id, label) => {
    const s = { id, label, ok: false, detail: '', errors: [] };
    steps.push(s);
    return s;
  };
  const fail = (s, errors) => {
    s.ok = false;
    s.errors = Array.isArray(errors) ? errors : [{ msg: String(errors.message || errors) }];
    return { ok: false, steps };
  };

  const ops = draft.activeOps();
  if (!ops.length) return { ok: false, steps, message: 'No unsaved changes.' };

  /* 1 — stale check (files changed outside Studio since base load?) */
  {
    const s = step('stale', 'Verify source files unchanged outside Studio');
    const stale = draft.staleFiles();
    if (stale.length) {
      return fail(s, stale.map((f) => ({ where: f, msg: 'File changed on disk since Studio loaded it. Reload Studio (your draft is preserved) and try again.' })));
    }
    s.ok = true;
    s.detail = 'All tracked files match their loaded state.';
  }

  /* 2 — generate candidate sources (includes per-file syntax check) */
  let changes;
  const merged = draft.merged();
  {
    const s = step('generate', 'Generate source changes');
    try {
      changes = generateChanges(draft.base, merged);
    } catch (err) {
      return fail(s, err);
    }
    if (!changes.length) {
      s.ok = true;
      s.detail = 'Draft operations produced no net source change.';
      return { ok: false, steps, message: 'Nothing to save — the draft has no net effect.' };
    }
    s.ok = true;
    s.detail = `${changes.length} file(s): ${changes.map((c) => c.path).join(', ')}`;
  }

  /* 3 — validate final model structurally (pre-write) */
  {
    const s = step('validate', 'Curriculum validation');
    const { errors, warnings } = validateModel(merged);
    if (errors.length) return fail(s, errors);
    s.ok = true;
    s.detail = warnings.length ? `${warnings.length} warning(s): ${warnings.slice(0, 5).map((w) => `${w.where}: ${w.msg}`).join(' · ')}` : 'No structural problems.';
  }

  /* 4 — automated review of the diffs */
  {
    const s = step('review', 'Automated review checks');
    const findings = reviewChecks(changes, ops.map((e) => e.op));
    const errors = findings.filter((f) => f.level === 'error');
    if (errors.length) return fail(s, errors);
    s.ok = true;
    s.detail = findings.length ? findings.map((f) => `${f.where}: ${f.msg}`).join(' · ') : 'No suspicious patterns in the generated diffs.';
  }

  /* 5 — write files (snapshot originals for rollback) */
  const written = [];
  const rollback = () => {
    for (const c of written) {
      if (c.existedBefore) fs.writeFileSync(absPath(c.path), c.before, 'utf8');
      else fs.rmSync(absPath(c.path), { force: true });
    }
  };
  {
    const s = step('write', 'Write source files');
    try {
      for (const c of changes) {
        const existedBefore = fs.existsSync(absPath(c.path));
        writeRepoFile(c.path, c.after);
        written.push({ ...c, existedBefore });
      }
    } catch (err) {
      rollback();
      return fail(s, err);
    }
    s.ok = true;
    s.detail = `${written.length} file(s) written.`;
  }

  /* 6 — reimport the written files and prove the round trip */
  {
    const s = step('reimport', 'Reload written sources and verify content');
    try {
      const reloaded = await loadContent();
      if (!modelsEquivalent(reloaded, merged)) {
        rollback();
        return fail(s, [{ msg: 'Reimported content does not match the draft — writer round-trip mismatch. All files rolled back; nothing was committed.' }]);
      }
      const { errors } = validateModel(reloaded);
      if (errors.length) {
        rollback();
        return fail(s, errors);
      }
      s.ok = true;
      s.detail = 'Written sources load correctly and match the draft exactly.';
    } catch (err) {
      rollback();
      return fail(s, err);
    }
  }

  /* 7 — commit (scoped to exactly the written paths) */
  let commit;
  {
    const s = step('commit', 'Git commit');
    try {
      const stat = await gitDiffStat(changes.map((c) => c.path));
      commit = await gitCommitPaths(changes.map((c) => c.path), commitMessage(ops, changes));
      s.ok = true;
      s.detail = `Committed ${commit.slice(0, 10)}\n${stat.trim()}`;
    } catch (err) {
      // Files are written and verified; a commit failure leaves the working
      // tree intact for manual inspection rather than destroying good work.
      return fail(s, [{ msg: `Commit failed: ${err.message}. The written files are VALID and remain in the working tree — inspect with git status.` }]);
    }
  }

  /* 8 — reset draft onto the new base */
  draft.discard();
  await draft.reloadBase();

  return { ok: true, steps, commit };
}
