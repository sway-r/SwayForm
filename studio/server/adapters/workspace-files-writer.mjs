/* Reconciles the normalized workspace-file map (base vs final) into
 * portal/data/workspace-files.js source edits.
 *
 * Untouched entries keep their exact source form — including entries whose
 * value is a helper CALL like PACKAGE_XML("swayform_demos", ...). An entry
 * whose CONTENT was edited is rewritten as a template literal of the new
 * text (if it was a helper call before, the diff honestly shows that
 * indirection being replaced by the literal result). A pure rename keeps
 * the value node and only rewrites the key.
 */
import { parse, print, b, findExportConst, staticString, templateLiteral, deepEqual } from '../ast-utils.mjs';

export function writeWorkspaceFiles(source, baseModel, finalModel) {
  const base = baseModel.workspaceFiles;
  const final = finalModel.workspaceFiles;
  if (deepEqual(base, final)) return source;

  const ast = parse(source);
  const filesExpr = findExportConst(ast, 'WORKSPACE_FILES');
  if (!filesExpr || filesExpr.type !== 'ObjectExpression') {
    throw new Error('workspace-files.js: could not locate WORKSPACE_FILES object literal');
  }

  const propByPath = new Map();
  for (const p of filesExpr.properties) {
    if (p.type !== 'ObjectProperty') continue;
    const key = p.key.type === 'StringLiteral' ? p.key.value
      : p.key.type === 'Identifier' ? p.key.name : null;
    if (key) propByPath.set(key, p);
  }

  const baseKeys = Object.keys(base);
  const finalKeys = Object.keys(final);
  const removed = baseKeys.filter((k) => !(k in final));
  const added = finalKeys.filter((k) => !(k in base));

  /* Detect renames: removed key + added key with identical content — keep
   * the property node, swap the key only. */
  const renamedFrom = new Map(); // newKey -> oldKey
  for (const newKey of added) {
    const oldKey = removed.find((k) => base[k] === final[newKey] && !([...renamedFrom.values()].includes(k)));
    if (oldKey) renamedFrom.set(newKey, oldKey);
  }

  for (const [newKey, oldKey] of renamedFrom) {
    const prop = propByPath.get(oldKey);
    if (prop) {
      prop.key = b.stringLiteral(newKey);
      propByPath.set(newKey, prop);
      propByPath.delete(oldKey);
    }
  }

  /* Removals (true deletions, not rename sources). */
  const renameSources = new Set(renamedFrom.values());
  for (const key of removed) {
    if (renameSources.has(key)) continue;
    const prop = propByPath.get(key);
    if (prop) filesExpr.properties = filesExpr.properties.filter((p) => p !== prop);
  }

  /* Content edits on surviving keys. */
  for (const key of finalKeys) {
    if (renamedFrom.has(key)) continue; // value unchanged by definition
    const prop = propByPath.get(key);
    if (!prop) continue; // handled below as addition
    if (key in base && base[key] !== final[key]) {
      prop.value = templateLiteral(final[key]);
    }
  }

  /* Additions (that weren't renames). */
  for (const key of added) {
    if (renamedFrom.has(key)) continue;
    filesExpr.properties.push(
      b.objectProperty(b.stringLiteral(key), templateLiteral(final[key])));
  }

  return print(ast);
}

/** Sanity reader used by tests: keys present in the source object literal. */
export function listSourceKeys(source) {
  const ast = parse(source);
  const filesExpr = findExportConst(ast, 'WORKSPACE_FILES');
  return filesExpr.properties
    .filter((p) => p.type === 'ObjectProperty')
    .map((p) => (p.key.type === 'StringLiteral' ? p.key.value : p.key.name));
}
