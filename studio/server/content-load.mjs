/* Reads the Learning Portal's real source into Studio's normalized content
 * model. Two complementary readers, both over the same files:
 *
 *  - LIVE IMPORT (node --import of the actual modules): gives the exact
 *    runtime data the portal renders — always accurate, catches load errors.
 *  - AST PARSE of curriculum.js: gives source-structure facts the runtime
 *    can't (which builder call each item uses — real()/demo()/placeholder()
 *    — its overrides argument, and each section's number-padding style),
 *    which the writers need to reproduce the file's conventions.
 *
 * The normalized model mirrors the REAL architecture on purpose:
 * curriculum.js is a listing layer over learning-path.js's content store,
 * so Studio's model keeps `curriculum` (listing) and `activities` (content)
 * separate, exactly as the source does.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { REPO_ROOT, absPath, fileUrl, readRepoFile, repoFileExists } from './repo.mjs';
import { parse, findExportConst, findTopLevelConst, objPropValue, staticString, nodeToValue } from './ast-utils.mjs';

let importGen = 0;

async function liveImport(rel) {
  importGen += 1;
  return import(fileUrl(rel) + '?v=' + importGen);
}

export function fileHash(rel) {
  if (!repoFileExists(rel)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath(rel))).digest('hex');
}

/* ------------------------------------------------- curriculum source parse */

function parseCurriculumSource(source) {
  const ast = parse(source);
  const curriculumNode = findExportConst(ast, 'CURRICULUM');
  const sectionsNode = objPropValue(curriculumNode, 'sections');
  const sections = [];

  for (const sectionNode of sectionsNode.elements) {
    const id = staticString(objPropValue(sectionNode, 'id'));
    const itemsVal = objPropValue(sectionNode, 'items');
    let itemsArr = null;
    let itemsVarName = null;
    if (itemsVal.type === 'Identifier') {
      itemsVarName = itemsVal.name;
      itemsArr = findTopLevelConst(ast, itemsVarName);
    } else if (itemsVal.type === 'ArrayExpression') {
      itemsArr = itemsVal;
    }
    // Sections whose items are GENERATED (s6/s7 use Array.from(...)) have no
    // per-item source nodes to parse — mark the whole section generated; the
    // runtime import still supplies its item data, and the writer knows to
    // leave (or fully materialize) such sections rather than patch elements.
    const generated = !itemsArr || itemsArr.type !== 'ArrayExpression';
    const items = [];
    if (!generated) {
      for (const el of itemsArr.elements) {
        items.push(parseItemCall(el, id));
      }
    }
    sections.push({ id, itemsVarName, items, generated });
  }
  return sections;
}

/** One element of an sN array: real(...) / demo(...) / placeholder(...) call
 * (or, defensively, a generated-array element like Array.from output —
 * those sections are represented as opaque). */
function parseItemCall(el, sectionId) {
  if (el.type === 'CallExpression' && el.callee.type === 'Identifier') {
    const fn = el.callee.name;
    const args = el.arguments;
    const id = staticString(args[0]);
    const number = staticString(args[2]);
    if (fn === 'real') {
      const overridesNode = args[3];
      const overrides = overridesNode ? nodeToValue(overridesNode) : { ok: true, value: undefined };
      return { form: 'real', id, sectionId, number, overrides: overrides.ok ? overrides.value : undefined };
    }
    if (fn === 'demo') return { form: 'demo', id, sectionId, number };
    if (fn === 'placeholder') {
      return {
        form: 'placeholder', id, sectionId, number,
        title: staticString(args[3]),
        note: args[4] ? staticString(args[4]) : undefined,
      };
    }
  }
  return { form: 'opaque', id: null, sectionId };
}

/** Detects a section's number-padding convention ('4.01' padded vs '3.1'
 * plain) so renumbering preserves the existing style. */
function padStyleOf(items) {
  for (const it of items) {
    if (!it.number) continue;
    const dec = String(it.number).split('.')[1] || '';
    if (dec.length >= 2 && dec.startsWith('0')) return 'padded';
  }
  return 'plain';
}

/* ------------------------------------------------------------- full load */

export const CONTENT_FILES = [
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

const APP_MODULES = {
  learn: 'portal/apps/learn/learn.js',
  projects: 'portal/apps/projects/projects.js',
  account: 'portal/apps/account/account.js',
  help: 'portal/apps/help/help.js',
  settings: 'portal/apps/settings/settings.js',
};

export const DEFAULT_WORKSPACE_CONFIG = {
  terminals: { min: 1, default: 3, max: 5, allowCreate: true, namePrefix: 'Shell' },
  readOnlyFiles: [],
  perActivity: {},
};

/** Parses portal.js for the desktop icon order (REGISTRY_ORDER's array of
 * app-module identifiers) and maps identifiers -> app ids via import names. */
function parsePortalOrder(source) {
  const ast = parse(source);
  const importedApps = {}; // local identifier -> app id (from module path)
  for (const stmt of ast.program.body) {
    if (stmt.type !== 'ImportDeclaration') continue;
    const m = /\.\/apps\/([a-z]+)\//.exec(stmt.source.value);
    if (!m) continue;
    for (const spec of stmt.specifiers) {
      if (spec.type === 'ImportNamespaceSpecifier') importedApps[spec.local.name] = m[1];
    }
  }
  let orderIds = null;
  // REGISTRY_ORDER(){ return [LearnApp, ...]; }
  for (const stmt of ast.program.body) {
    if (stmt.type === 'FunctionDeclaration' && stmt.id && stmt.id.name === 'REGISTRY_ORDER') {
      const ret = stmt.body.body.find((s) => s.type === 'ReturnStatement');
      if (ret && ret.argument.type === 'ArrayExpression') {
        orderIds = ret.argument.elements
          .map((el) => (el.type === 'Identifier' ? importedApps[el.name] : null))
          .filter(Boolean);
      }
    }
  }
  return { orderIds: orderIds || Object.values(importedApps), allIds: Object.values(importedApps) };
}

export async function loadContent() {
  const curriculumMod = await liveImport('portal/data/curriculum.js');
  const learningPathMod = await liveImport('portal/data/learning-path.js');
  const workspaceFilesMod = await liveImport('portal/data/workspace-files.js');

  const CURRICULUM = curriculumMod.CURRICULUM;
  const LEARNING_PATH = learningPathMod.LEARNING_PATH;
  const WORKSPACE_FILES = workspaceFilesMod.WORKSPACE_FILES;

  const curriculumSource = readRepoFile('portal/data/curriculum.js');
  const sourceSections = parseCurriculumSource(curriculumSource);
  const sourceSectionById = new Map(sourceSections.map((s) => [s.id, s]));

  /* ---- activities (content layer) + their learning-path location ---- */
  const activities = {};
  const activityLocations = {};
  LEARNING_PATH.levels.forEach((level) => {
    level.sections.forEach((section) => {
      section.activities.forEach((a) => {
        activities[a.id] = structuredClone({
          id: a.id, title: a.title, kind: a.kind,
          difficulty: a.difficulty, estimatedTime: a.estimatedTime,
          summary: a.summary, workspaceFile: a.workspaceFile,
          relatedConcepts: a.relatedConcepts,
          steps: a.steps || [],
          completionSummary: a.completionSummary,
        });
        activityLocations[a.id] = { levelId: level.id, sectionId: section.id };
      });
    });
  });

  /* ---- curriculum (listing layer) ---- */
  const curriculum = {
    id: CURRICULUM.id,
    title: CURRICULUM.title,
    sections: CURRICULUM.sections.map((s) => {
      const src = sourceSectionById.get(s.id);
      const srcItems = src ? src.items : [];
      const srcItemById = new Map(srcItems.filter((i) => i.id).map((i) => [i.id, i]));
      const runtimeNumbers = s.items.map((i) => i.number).filter(Boolean);
      return {
        id: s.id, number: s.number, title: s.title, type: s.type,
        icon: s.icon, levelLabel: s.levelLabel, description: s.description,
        generated: !!(src && src.generated),
        padStyle: src && src.generated
          ? (runtimeNumbers.some((n) => (String(n).split('.')[1] || '').startsWith('0')) ? 'padded' : 'plain')
          : padStyleOf(srcItems),
        items: s.items.map((item) => {
          const srcItem = srcItemById.get(item.id);
          const form = srcItem ? srcItem.form
            : item.kind === 'placeholder' ? 'placeholder'
            : item.kind === 'demo' ? 'demo' : 'real';
          const entry = { id: item.id, form, number: item.number };
          if (form === 'real' && srcItem && srcItem.overrides !== undefined) entry.overrides = srcItem.overrides;
          if (form === 'placeholder') {
            entry.title = item.title;
            entry.note = srcItem ? srcItem.note : item.summary;
          }
          return entry;
        }),
      };
    }),
  };

  /* ---- workspace files ---- */
  const workspaceFiles = { ...WORKSPACE_FILES };

  /* ---- workspace config (may not exist yet — Phase 7 creates it) ---- */
  let workspaceConfig = structuredClone(DEFAULT_WORKSPACE_CONFIG);
  let workspaceConfigExists = false;
  if (repoFileExists('portal/data/workspace-config.js')) {
    const mod = await liveImport('portal/data/workspace-config.js');
    workspaceConfig = structuredClone(mod.WORKSPACE_CONFIG);
    workspaceConfigExists = true;
  }

  /* ---- portal home (desktop) ---- */
  const portalSource = readRepoFile('portal/portal.js');
  const { orderIds, allIds } = parsePortalOrder(portalSource);
  const apps = [];
  for (const appId of allIds) {
    const mod = await liveImport(APP_MODULES[appId]);
    apps.push({
      id: appId,
      title: mod.meta.title,
      icon: mod.meta.icon,
      defaultSize: mod.meta.defaultSize ? { ...mod.meta.defaultSize } : undefined,
      enabled: orderIds.includes(appId),
    });
  }
  // Desktop shows icons in orderIds order; disabled apps listed after, in import order.
  apps.sort((a, b) => {
    const ia = orderIds.indexOf(a.id), ib = orderIds.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  /* ---- base file hashes (staleness detection at save time) ---- */
  const fileHashes = {};
  for (const rel of CONTENT_FILES) fileHashes[rel] = fileHash(rel);

  return {
    curriculum,
    activities,
    activityLocations,
    workspaceFiles,
    workspaceConfig,
    workspaceConfigExists,
    portalHome: { apps },
    fileHashes,
  };
}

/** Icon names available in portal/icons.js (regex scan — PATHS is not
 * exported and Studio must not modify the portal just to enumerate it). */
export function listIconNames() {
  const src = readRepoFile('portal/icons.js');
  const names = [];
  const re = /^\s{2}([A-Za-z][A-Za-z0-9]*):\s+'/gm;
  let m;
  while ((m = re.exec(src))) names.push(m[1]);
  return names;
}

export function listImageAssets() {
  return listAssetsIn('images', /\.(png|jpg|jpeg|gif|svg|webp)$/i, 'image');
}

export function listVideoAssets() {
  return listAssetsIn('videos', /\.(mp4|webm|m4v|mov)$/i, 'video');
}

function listAssetsIn(dir, extRe, kind) {
  const abs = absPath(dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((f) => extRe.test(f))
    .map((f) => {
      const st = fs.statSync(absPath(dir + '/' + f));
      return { name: f, path: dir + '/' + f, size: st.size, mtime: st.mtimeMs, kind };
    });
}

export { REPO_ROOT };
