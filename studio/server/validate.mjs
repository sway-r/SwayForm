/* Structural validation of a normalized content model — the SwayForm
 * curriculum-specific checks the Save pipeline runs (and the UI can run
 * live). Returns { errors: [...], warnings: [...] }; errors block a save.
 */
import { repoFileExists } from './repo.mjs';

const BLOCK_TYPES = new Set([
  'lead', 'heading', 'p', 'list', 'steps', 'checklist', 'callout', 'divider',
  'terminal', 'table', 'terms', 'troubleshoot', 'reveal', 'image', 'code',
]);
const CALLOUT_TONES = new Set(['note', 'tip', 'warn', 'safety']);
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export function validateModel(model) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push({ where, msg });
  const warn = (where, msg) => warnings.push({ where, msg });

  /* ---- curriculum listing ---- */
  const sectionIds = new Set();
  const itemIds = new Set();
  model.curriculum.sections.forEach((s, si) => {
    const where = `section "${s.id}"`;
    if (!ID_RE.test(s.id)) err(where, 'section id must be kebab-case');
    if (sectionIds.has(s.id)) err(where, 'duplicate section id');
    sectionIds.add(s.id);
    if (!s.title || !s.title.trim()) err(where, 'section title is empty');
    if (s.number !== si + 1) err(where, `section number ${s.number} does not match position ${si + 1}`);

    const seenNumbers = new Set();
    s.items.forEach((item, ii) => {
      const iwhere = `item "${item.id}" in ${where}`;
      if (!item.id || !ID_RE.test(item.id)) err(iwhere, 'item id must be kebab-case');
      if (itemIds.has(item.id)) err(iwhere, 'duplicate item id across curriculum');
      itemIds.add(item.id);
      if (seenNumbers.has(item.number)) err(iwhere, `duplicate item number ${item.number}`);
      seenNumbers.add(item.number);
      const expectedPrefix = `${s.number}.`;
      if (!String(item.number).startsWith(expectedPrefix)) {
        err(iwhere, `item number ${item.number} not in section ${s.number}`);
      }
      if (item.form === 'placeholder') {
        if (!item.title || !item.title.trim()) err(iwhere, 'placeholder has no title');
      } else {
        if (!model.activities[item.id]) {
          err(iwhere, `listed as ${item.form} but no activity with this id exists in learning-path content`);
        }
      }
    });
  });

  /* ---- activities (content layer) ---- */
  for (const [id, a] of Object.entries(model.activities)) {
    const where = `activity "${id}"`;
    if (!ID_RE.test(id)) err(where, 'activity id must be kebab-case');
    if (a.id !== id) err(where, `id field "${a.id}" does not match key`);
    if (!a.title || !a.title.trim()) err(where, 'title is empty');
    if (!['reading', 'activity'].includes(a.kind)) err(where, `invalid kind "${a.kind}"`);
    if (!Array.isArray(a.steps) || a.steps.length === 0) {
      err(where, 'must have at least one step');
      continue;
    }
    if (a.workspaceFile && model.workspaceFiles[a.workspaceFile] === undefined) {
      err(where, `workspaceFile "${a.workspaceFile}" does not exist in workspace-files`);
    }
    const stepIds = new Set();
    a.steps.forEach((st, sti) => {
      const swhere = `${where} step ${sti + 1} ("${st.title}")`;
      if (!st.id) err(swhere, 'step has no id');
      if (stepIds.has(st.id)) err(swhere, `duplicate step id "${st.id}"`);
      stepIds.add(st.id);
      if (!st.title || !st.title.trim()) err(swhere, 'step title is empty');
      if (!Array.isArray(st.blocks)) { err(swhere, 'blocks is not an array'); return; }
      st.blocks.forEach((blk, bi) => validateBlock(blk, `${swhere} block ${bi + 1}`, model, err, warn));
    });
  }

  /* ---- unlisted activities (hidden but preserved) — informational ---- */
  const listedIds = new Set(itemIds);
  for (const id of Object.keys(model.activities)) {
    if (!listedIds.has(id)) warn(`activity "${id}"`, 'exists in learning-path content but is not listed in any curriculum section (hidden)');
  }

  /* ---- workspace files ---- */
  for (const p of Object.keys(model.workspaceFiles)) {
    if (!/^ros2_ws\//.test(p) || p.includes('..')) err(`workspace file "${p}"`, 'invalid path');
    if (typeof model.workspaceFiles[p] !== 'string') err(`workspace file "${p}"`, 'content is not a string');
  }

  /* ---- workspace config ---- */
  const t = model.workspaceConfig.terminals;
  const twhere = 'terminal settings';
  if (!(Number.isInteger(t.min) && t.min >= 1)) err(twhere, `min must be an integer >= 1 (got ${t.min})`);
  if (!(Number.isInteger(t.max) && t.max <= 8)) err(twhere, `max must be an integer <= 8 (got ${t.max})`);
  if (Number.isInteger(t.min) && Number.isInteger(t.max) && t.min > t.max) err(twhere, `min ${t.min} > max ${t.max}`);
  if (!(Number.isInteger(t.default) && t.default >= t.min && t.default <= t.max)) {
    err(twhere, `default ${t.default} must be between min ${t.min} and max ${t.max}`);
  }
  for (const [actId, per] of Object.entries(model.workspaceConfig.perActivity)) {
    const pwhere = `workspace override for "${actId}"`;
    if (!model.activities[actId]) err(pwhere, 'no such activity');
    if (per.terminals) {
      const pt = { ...t, ...per.terminals };
      if (pt.min < 1 || pt.max > 8 || pt.min > pt.max || pt.default < pt.min || pt.default > pt.max) {
        err(pwhere, `terminal bounds invalid (min ${pt.min}, default ${pt.default}, max ${pt.max})`);
      }
    }
    for (const f of per.readOnlyFiles || []) {
      if (model.workspaceFiles[f] === undefined) err(pwhere, `read-only file "${f}" does not exist`);
    }
    if (per.defaultOpenFile && model.workspaceFiles[per.defaultOpenFile] === undefined) {
      err(pwhere, `defaultOpenFile "${per.defaultOpenFile}" does not exist`);
    }
  }
  for (const f of model.workspaceConfig.readOnlyFiles || []) {
    if (model.workspaceFiles[f] === undefined) err('global read-only files', `"${f}" does not exist`);
  }

  /* ---- portal home ---- */
  const enabledApps = model.portalHome.apps.filter((a) => a.enabled);
  if (!enabledApps.length) err('desktop', 'no desktop icons enabled');
  model.portalHome.apps.forEach((a) => {
    if (!a.title || !a.title.trim()) err(`app "${a.id}"`, 'title is empty');
    if (a.defaultSize && !(a.defaultSize.w >= 320 && a.defaultSize.h >= 240)) {
      err(`app "${a.id}"`, `default size ${a.defaultSize.w}×${a.defaultSize.h} below minimum 320×240`);
    }
  });

  return { errors, warnings };
}

function validateBlock(blk, where, model, err, warn) {
  if (!blk || typeof blk !== 'object') { err(where, 'block is not an object'); return; }
  if (!BLOCK_TYPES.has(blk.type)) { err(where, `unknown block type "${blk.type}"`); return; }
  const needText = ['lead', 'heading', 'p', 'callout'];
  if (needText.includes(blk.type) && (!blk.text || !String(blk.text).trim())) {
    err(where, `${blk.type} block has no text`);
  }
  if (['list', 'steps', 'checklist'].includes(blk.type)) {
    if (!Array.isArray(blk.items) || !blk.items.length) err(where, `${blk.type} block has no items`);
  }
  if (blk.type === 'callout' && blk.tone && !CALLOUT_TONES.has(blk.tone)) {
    err(where, `invalid callout tone "${blk.tone}"`);
  }
  if (blk.type === 'heading' && blk.level !== undefined && ![2, 3].includes(blk.level)) {
    warn(where, `heading level ${blk.level} — renderer only distinguishes 2 and 3`);
  }
  if (blk.type === 'code') {
    if (typeof blk.code !== 'string') err(where, 'code block has no code string');
    if (blk.workspaceFile && model.workspaceFiles[blk.workspaceFile] === undefined) {
      err(where, `code block "Open file" target "${blk.workspaceFile}" does not exist`);
    }
  }
  if (blk.type === 'terminal' && (!Array.isArray(blk.lines) || !blk.lines.length)) {
    err(where, 'terminal block has no lines');
  }
  if (blk.type === 'table') {
    if (!Array.isArray(blk.headers) || !Array.isArray(blk.rows)) err(where, 'table block needs headers and rows');
    else if (blk.rows.some((r) => !Array.isArray(r) || r.length !== blk.headers.length)) {
      err(where, 'table row width does not match headers');
    }
  }
  if (blk.type === 'terms' && (!Array.isArray(blk.items) || blk.items.some((x) => !x.term || !x.def))) {
    err(where, 'terms block items need term + def');
  }
  if (blk.type === 'troubleshoot' && (!Array.isArray(blk.items) || blk.items.some((x) => !x.symptom || !x.fix))) {
    err(where, 'troubleshoot items need symptom + fix');
  }
  if (blk.type === 'reveal' && !blk.hint) warn(where, 'reveal block has no hint');
  if (blk.type === 'image') {
    if (!blk.src) err(where, 'image block has no src');
    else if (blk.src.startsWith('/')) {
      const rel = blk.src.slice(1);
      if (!repoFileExists(rel)) err(where, `image "${blk.src}" not found in repo`);
    }
  }
}
