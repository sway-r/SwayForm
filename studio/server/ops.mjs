/* Edit operations over the normalized content model.
 *
 * Every change the Studio UI can make is one of these ops. Ops are applied
 * to a CLONE of the base model (never the base itself); the draft is an op
 * log replayed over base, which gives undo/redo, human-readable change
 * summaries, and crash-safe persistence for free. The AST writers never see
 * ops — they reconcile base-state vs final-state — so there is exactly one
 * implementation of each op's semantics (this file).
 */
import { assertSlug, assertWorkspacePath } from './repo.mjs';
import { deepEqual } from './ast-utils.mjs';

/* ------------------------------------------------------------- helpers */

function findSection(model, sectionId) {
  const s = model.curriculum.sections.find((x) => x.id === sectionId);
  if (!s) throw new Error(`No section "${sectionId}"`);
  return s;
}

function findListing(model, itemId) {
  for (const s of model.curriculum.sections) {
    const idx = s.items.findIndex((i) => i.id === itemId);
    if (idx !== -1) return { section: s, index: idx, item: s.items[idx] };
  }
  return null;
}

function requireListing(model, itemId) {
  const found = findListing(model, itemId);
  if (!found) throw new Error(`Item "${itemId}" is not listed in the curriculum`);
  return found;
}

function findActivity(model, activityId) {
  const a = model.activities[activityId];
  if (!a) throw new Error(`No activity "${activityId}"`);
  return a;
}

function step(model, activityId, stepIndex) {
  const a = findActivity(model, activityId);
  const st = a.steps[stepIndex];
  if (!st) throw new Error(`Activity "${activityId}" has no step ${stepIndex}`);
  return st;
}

/** Display title of a listing item (override > placeholder title > activity title). */
export function itemTitle(model, item) {
  if (item.overrides && item.overrides.title) return item.overrides.title;
  if (item.form === 'placeholder') return item.title || item.id;
  const a = model.activities[item.id];
  return a ? a.title : item.id;
}

/** Renumbers a section's items in place, preserving its pad style. */
export function renumberSection(section) {
  section.items.forEach((item, i) => {
    const n = i + 1;
    const dec = section.padStyle === 'padded' ? String(n).padStart(2, '0') : String(n);
    item.number = `${section.number}.${dec}`;
  });
}

function renumberAllSections(model) {
  model.curriculum.sections.forEach((s, i) => {
    s.number = i + 1;
    renumberSection(s);
  });
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
}

export function uniqueId(model, base) {
  const taken = new Set([
    ...Object.keys(model.activities),
    ...model.curriculum.sections.flatMap((s) => s.items.map((i) => i.id)),
    ...model.curriculum.sections.map((s) => s.id),
  ]);
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not generate a unique id');
}

export function uniqueStepId(activity, base) {
  const taken = new Set(activity.steps.map((s) => s.id));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
  throw new Error('Could not generate a unique step id');
}

/* ------------------------------------------------------------- op registry */

const OPS = {
  /* ---------------- curriculum listing ---------------- */

  'section.rename': {
    apply(model, op) {
      const s = findSection(model, op.sectionId);
      const before = s.title;
      s.title = String(op.title);
      return { text: `Renamed section "${before}" → "${s.title}"`, before, after: s.title };
    },
  },

  'section.describe': {
    apply(model, op) {
      const s = findSection(model, op.sectionId);
      const before = s.description;
      s.description = String(op.description);
      return { text: `Updated description of section "${s.title}"`, before, after: s.description };
    },
  },

  'section.icon': {
    apply(model, op) {
      const s = findSection(model, op.sectionId);
      const before = s.icon;
      s.icon = String(op.icon);
      return { text: `Changed icon of section "${s.title}" (${before} → ${s.icon})`, before, after: s.icon };
    },
  },

  'section.levelLabel': {
    apply(model, op) {
      const s = findSection(model, op.sectionId);
      const before = s.levelLabel;
      s.levelLabel = op.levelLabel ? String(op.levelLabel) : undefined;
      return { text: `Changed level label of section "${s.title}"`, before, after: s.levelLabel };
    },
  },

  'section.reorder': {
    apply(model, op) {
      const byId = new Map(model.curriculum.sections.map((s) => [s.id, s]));
      if (op.order.length !== byId.size || op.order.some((id) => !byId.has(id))) {
        throw new Error('section.reorder: order must list every section exactly once');
      }
      const before = model.curriculum.sections.map((s) => s.title).join(', ');
      model.curriculum.sections = op.order.map((id) => byId.get(id));
      renumberAllSections(model);
      return { text: 'Reordered sections', before, after: model.curriculum.sections.map((s) => s.title).join(', ') };
    },
  },

  'section.add': {
    apply(model, op) {
      assertSlug(op.section.id, 'section id');
      if (model.curriculum.sections.some((s) => s.id === op.section.id)) {
        throw new Error(`Section id "${op.section.id}" already exists`);
      }
      model.curriculum.sections.push({
        id: op.section.id,
        number: model.curriculum.sections.length + 1,
        title: String(op.section.title || op.section.id),
        type: op.section.type || 'lab',
        icon: op.section.icon || 'layers',
        levelLabel: op.section.levelLabel || undefined,
        description: String(op.section.description || ''),
        generated: false,
        padStyle: 'padded',
        items: [],
      });
      return { text: `Added section "${op.section.title}"`, after: op.section.title };
    },
  },

  'section.remove': {
    apply(model, op) {
      const s = findSection(model, op.sectionId);
      const realItems = s.items.filter((i) => i.form !== 'placeholder');
      if (realItems.length) {
        throw new Error(`Section "${s.title}" still lists ${realItems.length} real item(s) — move or hide them first`);
      }
      model.curriculum.sections = model.curriculum.sections.filter((x) => x !== s);
      renumberAllSections(model);
      return { text: `Removed section "${s.title}" (${s.items.length} placeholder(s) unlisted)`, before: s.title };
    },
  },

  'item.reorder': {
    apply(model, op) {
      const s = findSection(model, op.sectionId);
      const byId = new Map(s.items.map((i) => [i.id, i]));
      if (op.order.length !== byId.size || op.order.some((id) => !byId.has(id))) {
        throw new Error('item.reorder: order must list every item in the section exactly once');
      }
      s.items = op.order.map((id) => byId.get(id));
      renumberSection(s);
      return { text: `Reordered items in "${s.title}"` };
    },
  },

  'item.move': {
    apply(model, op) {
      const from = requireListing(model, op.itemId);
      const to = findSection(model, op.toSectionId);
      const [item] = from.section.items.splice(from.index, 1);
      const idx = Math.max(0, Math.min(op.toIndex ?? to.items.length, to.items.length));
      to.items.splice(idx, 0, item);
      renumberSection(from.section);
      if (to !== from.section) renumberSection(to);
      const title = itemTitle(model, item);
      return {
        text: from.section === to
          ? `Moved "${title}" within "${to.title}"`
          : `Moved "${title}" from "${from.section.title}" to "${to.title}"`,
      };
    },
  },

  'item.hide': {
    apply(model, op) {
      const found = requireListing(model, op.itemId);
      const title = itemTitle(model, found.item);
      found.section.items.splice(found.index, 1);
      renumberSection(found.section);
      return {
        text: `Unlisted "${title}" from "${found.section.title}" (content preserved in learning-path.js)`,
        before: title,
      };
    },
  },

  'item.restore': {
    apply(model, op) {
      if (findListing(model, op.itemId)) throw new Error(`"${op.itemId}" is already listed`);
      const form = op.form || 'real';
      if (form !== 'placeholder') findActivity(model, op.itemId); // must exist in content store
      const s = findSection(model, op.sectionId);
      const idx = Math.max(0, Math.min(op.index ?? s.items.length, s.items.length));
      const entry = { id: op.itemId, form, number: '0.0' };
      if (form === 'placeholder') { entry.title = op.title || op.itemId; entry.note = op.note; }
      s.items.splice(idx, 0, entry);
      renumberSection(s);
      return { text: `Listed "${itemTitle(model, entry)}" in "${s.title}"` };
    },
  },

  'item.overrides': {
    apply(model, op) {
      const found = requireListing(model, op.itemId);
      if (found.item.form !== 'real') throw new Error('Display overrides only apply to real() items');
      const before = found.item.overrides;
      found.item.overrides = op.overrides && Object.keys(op.overrides).length ? op.overrides : undefined;
      return { text: `Changed display overrides of "${itemTitle(model, found.item)}"`, before, after: found.item.overrides };
    },
  },

  'item.convertForm': {
    apply(model, op) {
      const found = requireListing(model, op.itemId);
      if (!['real', 'demo'].includes(op.form)) throw new Error('form must be "real" or "demo"');
      findActivity(model, op.itemId);
      const before = found.item.form;
      found.item.form = op.form;
      if (op.form === 'demo') delete found.item.overrides;
      delete found.item.title; delete found.item.note;
      return { text: `Changed "${itemTitle(model, found.item)}" listing from ${before} to ${op.form}` };
    },
  },

  'placeholder.add': {
    apply(model, op) {
      assertSlug(op.item.id, 'item id');
      if (findListing(model, op.item.id)) throw new Error(`Item id "${op.item.id}" already listed`);
      const s = findSection(model, op.sectionId);
      const idx = Math.max(0, Math.min(op.index ?? s.items.length, s.items.length));
      s.items.splice(idx, 0, {
        id: op.item.id, form: 'placeholder', number: '0.0',
        title: String(op.item.title || op.item.id), note: op.item.note ? String(op.item.note) : undefined,
      });
      renumberSection(s);
      return { text: `Added planned placeholder "${op.item.title}" to "${s.title}"` };
    },
  },

  'placeholder.edit': {
    apply(model, op) {
      const found = requireListing(model, op.itemId);
      if (found.item.form !== 'placeholder') throw new Error(`"${op.itemId}" is not a placeholder`);
      const before = { title: found.item.title, note: found.item.note };
      if (op.title !== undefined) found.item.title = String(op.title);
      if (op.note !== undefined) found.item.note = op.note ? String(op.note) : undefined;
      return { text: `Edited placeholder "${found.item.title}"`, before, after: { title: found.item.title, note: found.item.note } };
    },
  },

  /* ---------------- learning-path content ---------------- */

  'activity.setMeta': {
    apply(model, op) {
      const a = findActivity(model, op.activityId);
      const allowed = ['title', 'summary', 'difficulty', 'estimatedTime', 'workspaceFile', 'kind', 'relatedConcepts'];
      const before = {}, after = {};
      for (const key of Object.keys(op.fields)) {
        if (!allowed.includes(key)) throw new Error(`activity.setMeta: field "${key}" is not editable`);
        if (key === 'workspaceFile' && op.fields[key]) assertWorkspacePath(op.fields[key]);
        if (key === 'kind' && !['reading', 'activity'].includes(op.fields[key])) {
          throw new Error('kind must be "reading" or "activity"');
        }
        before[key] = a[key];
        a[key] = op.fields[key] === null ? undefined : op.fields[key];
        after[key] = a[key];
      }
      const what = Object.keys(op.fields).join(', ');
      return { text: `Updated ${what} of "${a.title}"`, before, after };
    },
  },

  'activity.setCompletion': {
    apply(model, op) {
      const a = findActivity(model, op.activityId);
      const before = a.completionSummary;
      a.completionSummary = op.completionSummary || undefined;
      return { text: `Updated completion summary of "${a.title}"`, before, after: a.completionSummary };
    },
  },

  'activity.add': {
    apply(model, op) {
      const a = op.activity;
      assertSlug(a.id, 'activity id');
      if (model.activities[a.id]) throw new Error(`Activity id "${a.id}" already exists`);
      if (findListing(model, a.id)) throw new Error(`Item id "${a.id}" already listed`);
      if (a.workspaceFile) assertWorkspacePath(a.workspaceFile);
      model.activities[a.id] = {
        id: a.id,
        title: String(a.title || a.id),
        kind: a.kind === 'reading' ? 'reading' : 'activity',
        difficulty: a.difficulty || undefined,
        estimatedTime: a.estimatedTime || undefined,
        summary: a.summary || undefined,
        workspaceFile: a.workspaceFile || undefined,
        relatedConcepts: a.relatedConcepts || undefined,
        steps: (a.steps && a.steps.length) ? a.steps : [{
          id: 'overview', title: 'Overview',
          blocks: [{ type: 'lead', text: a.summary || `${a.title || a.id} — new lesson.` }],
        }],
        completionSummary: a.completionSummary || undefined,
      };
      model.activityLocations[a.id] = op.location || null; // null = writer decides from listing neighbors
      const listing = op.listing;
      const s = findSection(model, listing.sectionId);
      const idx = Math.max(0, Math.min(listing.index ?? s.items.length, s.items.length));
      s.items.splice(idx, 0, { id: a.id, form: listing.form === 'demo' ? 'demo' : 'real', number: '0.0' });
      renumberSection(s);
      return { text: `Added new lesson "${model.activities[a.id].title}" to "${s.title}"` };
    },
  },

  'activity.remove': {
    apply(model, op) {
      const a = findActivity(model, op.activityId);
      const listed = findListing(model, op.activityId);
      if (listed) {
        listed.section.items.splice(listed.index, 1);
        renumberSection(listed.section);
      }
      delete model.activities[op.activityId];
      delete model.activityLocations[op.activityId];
      return {
        text: `Permanently deleted lesson "${a.title}" (${a.steps.length} step(s))${listed ? ` and unlisted it from "${listed.section.title}"` : ''}`,
        before: a.title,
      };
    },
  },

  'activity.duplicate': {
    apply(model, op) {
      const src = findActivity(model, op.activityId);
      const newId = op.newId || uniqueId(model, `${src.id}-copy`);
      assertSlug(newId, 'new activity id');
      if (model.activities[newId] || findListing(model, newId)) throw new Error(`Id "${newId}" already in use`);
      const copy = structuredClone(src);
      copy.id = newId;
      copy.title = op.newTitle || `${src.title} (Copy)`;
      if (copy.workspaceFile && op.copyWorkspaceFile !== false) {
        const srcPath = copy.workspaceFile;
        const newPath = srcPath.replace(/(\.[a-z0-9]+)$/i, `_${newId.replace(/[^a-z0-9]+/g, '_')}$1`);
        assertWorkspacePath(newPath);
        if (model.workspaceFiles[newPath] !== undefined) throw new Error(`Workspace file "${newPath}" already exists`);
        const srcContent = model.workspaceFiles[srcPath];
        if (srcContent !== undefined) {
          model.workspaceFiles[newPath] = srcContent;
          copy.workspaceFile = newPath;
        }
      }
      model.activities[newId] = copy;
      model.activityLocations[newId] = model.activityLocations[op.activityId] || null;
      const srcListing = findListing(model, op.activityId);
      const listing = op.listing || (srcListing
        ? { sectionId: srcListing.section.id, index: srcListing.index + 1, form: srcListing.item.form }
        : null);
      if (listing) {
        const s = findSection(model, listing.sectionId);
        const idx = Math.max(0, Math.min(listing.index ?? s.items.length, s.items.length));
        s.items.splice(idx, 0, { id: newId, form: listing.form === 'demo' ? 'demo' : 'real', number: '0.0' });
        renumberSection(s);
      }
      return { text: `Duplicated "${src.title}" as "${copy.title}"`, after: newId };
    },
  },

  'step.add': {
    apply(model, op) {
      const a = findActivity(model, op.activityId);
      const st = op.step || {};
      const id = uniqueStepId(a, st.id || slugify(st.title || 'new-step'));
      const idx = Math.max(0, Math.min(op.index ?? a.steps.length, a.steps.length));
      a.steps.splice(idx, 0, {
        id, title: String(st.title || 'New Step'),
        blocks: st.blocks || [{ type: 'p', text: 'Write this step…' }],
      });
      return { text: `Added step "${st.title || 'New Step'}" to "${a.title}"` };
    },
  },

  'step.remove': {
    apply(model, op) {
      const a = findActivity(model, op.activityId);
      const st = step(model, op.activityId, op.stepIndex);
      if (a.steps.length <= 1) throw new Error('An activity must keep at least one step');
      a.steps.splice(op.stepIndex, 1);
      return { text: `Removed step "${st.title}" from "${a.title}" (${st.blocks.length} block(s))`, before: st.title };
    },
  },

  'step.rename': {
    apply(model, op) {
      const st = step(model, op.activityId, op.stepIndex);
      const before = st.title;
      st.title = String(op.title);
      return { text: `Renamed step "${before}" → "${st.title}"`, before, after: st.title };
    },
  },

  'step.reorder': {
    apply(model, op) {
      const a = findActivity(model, op.activityId);
      const byId = new Map(a.steps.map((s) => [s.id, s]));
      if (op.order.length !== byId.size || op.order.some((id) => !byId.has(id))) {
        throw new Error('step.reorder: order must list every step exactly once');
      }
      a.steps = op.order.map((id) => byId.get(id));
      return { text: `Reordered steps of "${a.title}"` };
    },
  },

  'block.set': {
    apply(model, op) {
      const st = step(model, op.activityId, op.stepIndex);
      if (op.blockIndex < 0 || op.blockIndex >= st.blocks.length) throw new Error('block.set: index out of range');
      const before = st.blocks[op.blockIndex];
      st.blocks[op.blockIndex] = op.block;
      const a = findActivity(model, op.activityId);
      return { text: `Edited ${op.block.type} block in "${a.title}" · ${st.title}`, before, after: op.block };
    },
  },

  'block.insert': {
    apply(model, op) {
      const st = step(model, op.activityId, op.stepIndex);
      const idx = Math.max(0, Math.min(op.blockIndex ?? st.blocks.length, st.blocks.length));
      st.blocks.splice(idx, 0, op.block);
      const a = findActivity(model, op.activityId);
      return { text: `Added ${op.block.type} block to "${a.title}" · ${st.title}` };
    },
  },

  'block.remove': {
    apply(model, op) {
      const st = step(model, op.activityId, op.stepIndex);
      if (op.blockIndex < 0 || op.blockIndex >= st.blocks.length) throw new Error('block.remove: index out of range');
      const [removed] = st.blocks.splice(op.blockIndex, 1);
      const a = findActivity(model, op.activityId);
      return { text: `Removed ${removed.type} block from "${a.title}" · ${st.title}`, before: removed };
    },
  },

  'block.move': {
    apply(model, op) {
      const st = step(model, op.activityId, op.stepIndex);
      const { fromIndex, toIndex } = op;
      if (fromIndex < 0 || fromIndex >= st.blocks.length) throw new Error('block.move: from index out of range');
      const [blk] = st.blocks.splice(fromIndex, 1);
      const idx = Math.max(0, Math.min(toIndex, st.blocks.length));
      st.blocks.splice(idx, 0, blk);
      const a = findActivity(model, op.activityId);
      return { text: `Moved ${blk.type} block in "${a.title}" · ${st.title}` };
    },
  },

  /* Drag a block from one step into another (the visual editor's cross-step
   * drop). Within-step moves stay block.move so summaries read naturally. */
  'block.transfer': {
    apply(model, op) {
      const from = step(model, op.activityId, op.fromStepIndex);
      const to = step(model, op.activityId, op.toStepIndex);
      if (op.fromStepIndex === op.toStepIndex) throw new Error('block.transfer: same step — use block.move');
      if (op.fromIndex < 0 || op.fromIndex >= from.blocks.length) throw new Error('block.transfer: from index out of range');
      const [blk] = from.blocks.splice(op.fromIndex, 1);
      const idx = Math.max(0, Math.min(op.toIndex ?? to.blocks.length, to.blocks.length));
      to.blocks.splice(idx, 0, blk);
      const a = findActivity(model, op.activityId);
      return { text: `Moved ${blk.type} block from "${from.title}" to "${to.title}" in "${a.title}"` };
    },
  },

  /* ---------------- workspace files ---------------- */

  'file.set': {
    apply(model, op) {
      assertWorkspacePath(op.path);
      if (model.workspaceFiles[op.path] === undefined) throw new Error(`No workspace file "${op.path}"`);
      const before = model.workspaceFiles[op.path];
      model.workspaceFiles[op.path] = String(op.content);
      return { text: `Edited starter code ${op.path}`, before, after: op.content };
    },
  },

  'file.add': {
    apply(model, op) {
      assertWorkspacePath(op.path);
      if (model.workspaceFiles[op.path] !== undefined) throw new Error(`Workspace file "${op.path}" already exists`);
      model.workspaceFiles[op.path] = String(op.content || '');
      return { text: `Added workspace file ${op.path}` };
    },
  },

  'file.remove': {
    apply(model, op) {
      if (model.workspaceFiles[op.path] === undefined) throw new Error(`No workspace file "${op.path}"`);
      const users = Object.values(model.activities).filter((a) => a.workspaceFile === op.path);
      if (users.length) {
        throw new Error(`Cannot delete ${op.path} — still the starter file of: ${users.map((a) => a.title).join(', ')}`);
      }
      const before = model.workspaceFiles[op.path];
      delete model.workspaceFiles[op.path];
      return { text: `Deleted workspace file ${op.path}`, before };
    },
  },

  'file.rename': {
    apply(model, op) {
      assertWorkspacePath(op.newPath);
      if (model.workspaceFiles[op.oldPath] === undefined) throw new Error(`No workspace file "${op.oldPath}"`);
      if (model.workspaceFiles[op.newPath] !== undefined) throw new Error(`"${op.newPath}" already exists`);
      model.workspaceFiles[op.newPath] = model.workspaceFiles[op.oldPath];
      delete model.workspaceFiles[op.oldPath];
      // Retarget every activity + code block that referenced the old path.
      const retargeted = [];
      Object.values(model.activities).forEach((a) => {
        if (a.workspaceFile === op.oldPath) { a.workspaceFile = op.newPath; retargeted.push(a.title); }
        a.steps.forEach((st) => st.blocks.forEach((blk) => {
          if (blk.type === 'code' && blk.workspaceFile === op.oldPath) blk.workspaceFile = op.newPath;
        }));
      });
      return {
        text: `Renamed workspace file ${op.oldPath} → ${op.newPath}${retargeted.length ? ` (retargeted: ${retargeted.join(', ')})` : ''}`,
        before: op.oldPath, after: op.newPath,
      };
    },
  },

  /* ---------------- workspace config ---------------- */

  'config.setTerminals': {
    apply(model, op) {
      const t = op.terminals;
      const before = { ...model.workspaceConfig.terminals };
      model.workspaceConfig.terminals = {
        min: t.min, default: t.default, max: t.max,
        allowCreate: t.allowCreate !== false,
        namePrefix: t.namePrefix || 'Shell',
      };
      return { text: `Changed global terminal settings (min ${t.min}, default ${t.default}, max ${t.max})`, before, after: model.workspaceConfig.terminals };
    },
  },

  'config.setActivityOverride': {
    apply(model, op) {
      findActivity(model, op.activityId);
      const before = model.workspaceConfig.perActivity[op.activityId];
      if (op.override === null || op.override === undefined) {
        delete model.workspaceConfig.perActivity[op.activityId];
      } else {
        if (op.override.readOnlyFiles) op.override.readOnlyFiles.forEach(assertWorkspacePath);
        if (op.override.defaultOpenFile) assertWorkspacePath(op.override.defaultOpenFile);
        model.workspaceConfig.perActivity[op.activityId] = op.override;
      }
      return { text: `Changed workspace overrides for "${findActivity(model, op.activityId).title}"`, before, after: op.override || undefined };
    },
  },

  'config.setReadOnlyFiles': {
    apply(model, op) {
      op.paths.forEach(assertWorkspacePath);
      const before = model.workspaceConfig.readOnlyFiles;
      model.workspaceConfig.readOnlyFiles = [...op.paths];
      return { text: `Changed global read-only files (${op.paths.length})`, before, after: op.paths };
    },
  },

  /* ---------------- portal home (desktop) ---------------- */

  'app.rename': {
    apply(model, op) {
      const app = model.portalHome.apps.find((a) => a.id === op.appId);
      if (!app) throw new Error(`No app "${op.appId}"`);
      const before = app.title;
      app.title = String(op.title);
      return { text: `Renamed desktop app "${before}" → "${app.title}"`, before, after: app.title };
    },
  },

  'app.icon': {
    apply(model, op) {
      const app = model.portalHome.apps.find((a) => a.id === op.appId);
      if (!app) throw new Error(`No app "${op.appId}"`);
      const before = app.icon;
      app.icon = String(op.icon);
      return { text: `Changed icon of "${app.title}" (${before} → ${app.icon})`, before, after: app.icon };
    },
  },

  'app.size': {
    apply(model, op) {
      const app = model.portalHome.apps.find((a) => a.id === op.appId);
      if (!app) throw new Error(`No app "${op.appId}"`);
      const before = app.defaultSize;
      app.defaultSize = { w: Number(op.w), h: Number(op.h) };
      return { text: `Changed default window size of "${app.title}" to ${op.w}×${op.h}`, before, after: app.defaultSize };
    },
  },

  'app.enable': {
    apply(model, op) {
      const app = model.portalHome.apps.find((a) => a.id === op.appId);
      if (!app) throw new Error(`No app "${op.appId}"`);
      if (!op.enabled && model.portalHome.apps.filter((a) => a.enabled).length <= 1 && app.enabled) {
        throw new Error('At least one desktop icon must stay enabled');
      }
      const before = app.enabled;
      app.enabled = !!op.enabled;
      return { text: `${app.enabled ? 'Showed' : 'Hid'} desktop icon "${app.title}"`, before, after: app.enabled };
    },
  },

  'app.order': {
    apply(model, op) {
      const byId = new Map(model.portalHome.apps.map((a) => [a.id, a]));
      if (op.order.length !== byId.size || op.order.some((id) => !byId.has(id))) {
        throw new Error('app.order: order must list every app exactly once');
      }
      model.portalHome.apps = op.order.map((id) => byId.get(id));
      return { text: 'Reordered desktop icons' };
    },
  },
};

/* ------------------------------------------------------------- public API */

export function applyOp(model, op) {
  const def = OPS[op.type];
  if (!def) throw new Error(`Unknown op type "${op.type}"`);
  const result = def.apply(model, op) || {};
  return { text: result.text || op.type, before: result.before, after: result.after };
}

export function knownOpTypes() { return Object.keys(OPS); }

/** Replays ops over a deep clone of base; throws (with index) on failure. */
export function replay(base, ops) {
  const model = structuredClone(base);
  const summaries = [];
  ops.forEach((op, i) => {
    try {
      summaries.push(applyOp(model, op));
    } catch (err) {
      const e = new Error(`Op ${i} (${op.type}) failed on replay: ${err.message}`);
      e.opIndex = i;
      throw e;
    }
  });
  return { model, summaries };
}

export { deepEqual };
