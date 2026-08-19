/* Reconciles the desktop/home model into source edits across portal.js
 * (icon order + which icons show) and each app module's `meta` export
 * (title / icon / default window size).
 *
 * REGISTRY (the app map used by the router) is deliberately NOT touched:
 * a hidden desktop icon must not break deep links like /account, so hiding
 * an app only removes it from REGISTRY_ORDER(), the desktop's display list.
 */
import { parse, print, b, findExportConst, objPropValue, setObjProp, deepEqual } from '../ast-utils.mjs';

const APP_IDENT = {
  learn: 'LearnApp', projects: 'ProjectsApp', account: 'AccountApp',
  help: 'HelpApp', settings: 'SettingsApp',
};

export const APP_FILES = {
  learn: 'portal/apps/learn/learn.js',
  projects: 'portal/apps/projects/projects.js',
  account: 'portal/apps/account/account.js',
  help: 'portal/apps/help/help.js',
  settings: 'portal/apps/settings/settings.js',
};

/** portal.js — rewrite the REGISTRY_ORDER() return array to the final
 * enabled apps, in order. Returns null when unchanged. */
export function writePortalOrder(source, baseModel, finalModel) {
  const baseOrder = baseModel.portalHome.apps.filter((a) => a.enabled).map((a) => a.id);
  const finalOrder = finalModel.portalHome.apps.filter((a) => a.enabled).map((a) => a.id);
  if (deepEqual(baseOrder, finalOrder)) return null;

  const ast = parse(source);
  let patched = false;
  for (const stmt of ast.program.body) {
    if (stmt.type === 'FunctionDeclaration' && stmt.id && stmt.id.name === 'REGISTRY_ORDER') {
      const ret = stmt.body.body.find((s) => s.type === 'ReturnStatement');
      if (ret && ret.argument.type === 'ArrayExpression') {
        ret.argument.elements = finalOrder.map((id) => {
          if (!APP_IDENT[id]) throw new Error(`Unknown app id "${id}"`);
          return b.identifier(APP_IDENT[id]);
        });
        patched = true;
      }
    }
  }
  if (!patched) throw new Error('portal.js: could not locate REGISTRY_ORDER()');
  return print(ast);
}

/** One app module — patch meta.title / meta.icon / meta.defaultSize.
 * Returns null when unchanged. */
export function writeAppMeta(source, baseApp, finalApp) {
  const changed = baseApp.title !== finalApp.title
    || baseApp.icon !== finalApp.icon
    || !deepEqual(baseApp.defaultSize, finalApp.defaultSize);
  if (!changed) return null;

  const ast = parse(source);
  const metaExpr = findExportConst(ast, 'meta');
  if (!metaExpr) throw new Error('app module: could not locate `export const meta`');
  if (baseApp.title !== finalApp.title) setObjProp(metaExpr, 'title', finalApp.title);
  if (baseApp.icon !== finalApp.icon) setObjProp(metaExpr, 'icon', finalApp.icon);
  if (!deepEqual(baseApp.defaultSize, finalApp.defaultSize)) {
    setObjProp(metaExpr, 'defaultSize', finalApp.defaultSize
      ? { w: finalApp.defaultSize.w, h: finalApp.defaultSize.h } : undefined);
  }
  return print(ast);
}
