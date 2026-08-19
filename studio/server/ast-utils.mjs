/* Shared recast/AST helpers for all content adapters.
 *
 * Printing rules learned in the Phase 1 POC (see scripts/recast-poc.mjs):
 * recast's auto-detection injects \r\n on this repo's pure-\n files and
 * defaults new strings to double quotes — both must be forced explicitly or
 * every save would carry spurious whitespace/quote churn.
 */
import * as recast from 'recast';
import babelParser from 'recast/parsers/babel.js';

const b = recast.types.builders;
export { recast, b };

export function parse(source) {
  return recast.parse(source, { parser: babelParser });
}

export function print(ast) {
  // trailingComma matches the repo's house style — without it, any reprinted
  // array/object gets a one-line spurious diff at its final element.
  return recast.print(ast, { lineTerminator: '\n', quote: 'single', tabWidth: 2, trailingComma: true }).code;
}

/** Parse-check a candidate source (throws on syntax error). */
export function syntaxCheck(source, filename) {
  try {
    parse(source);
  } catch (err) {
    throw new Error(`Syntax error in generated ${filename}: ${err.message}`);
  }
}

/* ---------------------------------------------------------- node navigation */

export function isObject(node) { return node && node.type === 'ObjectExpression'; }
export function isArray(node) { return node && node.type === 'ArrayExpression'; }

/** Property of an object literal by key name (Identifier or StringLiteral key). */
export function objProp(objExpr, name) {
  if (!isObject(objExpr)) return null;
  return objExpr.properties.find((p) =>
    p.type === 'ObjectProperty' &&
    ((p.key.type === 'Identifier' && p.key.name === name) ||
     (p.key.type === 'StringLiteral' && p.key.value === name))) || null;
}

export function objPropValue(objExpr, name) {
  const p = objProp(objExpr, name);
  return p ? p.value : null;
}

/** Static string value of a node (StringLiteral or no-substitution template). */
export function staticString(node) {
  if (!node) return undefined;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked).join('');
  }
  return undefined;
}

/** Top-level `export const NAME = <expr>` in a program AST. */
export function findExportConst(ast, name) {
  for (const stmt of ast.program.body) {
    if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration &&
        stmt.declaration.type === 'VariableDeclaration') {
      for (const d of stmt.declaration.declarations) {
        if (d.id.type === 'Identifier' && d.id.name === name) return d.init;
      }
    }
  }
  return null;
}

/** Top-level `const NAME = <expr>` (not exported). */
export function findTopLevelConst(ast, name) {
  for (const stmt of ast.program.body) {
    if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        if (d.id.type === 'Identifier' && d.id.name === name) return d.init;
      }
    }
  }
  return null;
}

/* ---------------------------------------------------------- value building */

/** Build an AST literal from a plain JS value. Strings containing newlines
 * become template literals (matching how workspace-files.js and long code
 * blocks are authored); single-line strings become normal string literals. */
export function valueToNode(v) {
  if (v === null) return b.nullLiteral();
  if (v === undefined) return b.identifier('undefined');
  switch (typeof v) {
    case 'string':
      return v.includes('\n') ? templateLiteral(v) : b.stringLiteral(v);
    case 'number': return b.numericLiteral(v);
    case 'boolean': return b.booleanLiteral(v);
    case 'object': break;
    default: throw new Error(`valueToNode: unsupported type ${typeof v}`);
  }
  if (Array.isArray(v)) return b.arrayExpression(v.map(valueToNode));
  return b.objectExpression(Object.entries(v)
    .filter(([, val]) => val !== undefined)
    .map(([k, val]) => b.objectProperty(propKey(k), valueToNode(val))));
}

function propKey(k) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? b.identifier(k) : b.stringLiteral(k);
}

/** Multi-line string -> template literal, escaping backticks and ${. */
export function templateLiteral(str) {
  const normalized = String(str).replace(/\r\n?/g, '\n');
  const raw = normalized.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return b.templateLiteral([b.templateElement({ cooked: normalized, raw }, true)], []);
}

/** Replace an object property's value with a freshly built node (adds the
 * property if missing; removes it when value is undefined). */
export function setObjProp(objExpr, name, value) {
  const existing = objProp(objExpr, name);
  if (value === undefined) {
    if (existing) objExpr.properties = objExpr.properties.filter((p) => p !== existing);
    return;
  }
  if (existing) existing.value = valueToNode(value);
  else objExpr.properties.push(b.objectProperty(propKey(name), valueToNode(value)));
}

/* ---------------------------------------------------------- deep equality */

export function deepEqual(a, b2) {
  if (a === b2) return true;
  if (typeof a !== typeof b2) return false;
  if (a === null || b2 === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b2) || a.length !== b2.length) return false;
    return a.every((v, i) => deepEqual(v, b2[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b2).filter((k) => b2[k] !== undefined);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b2[k]));
  }
  return false;
}

/** Evaluate a pure-literal AST node back to a JS value (strings, numbers,
 * booleans, null, arrays, objects, no-substitution templates). Returns
 * { ok:false } for anything dynamic (call expressions, identifiers, spreads)
 * so callers can fall back to runtime-imported values. */
export function nodeToValue(node) {
  if (!node) return { ok: false };
  switch (node.type) {
    case 'StringLiteral': case 'NumericLiteral': case 'BooleanLiteral':
      return { ok: true, value: node.value };
    case 'NullLiteral': return { ok: true, value: null };
    case 'TemplateLiteral': {
      const s = staticString(node);
      return s === undefined ? { ok: false } : { ok: true, value: s };
    }
    case 'UnaryExpression':
      if (node.operator === '-' && node.argument.type === 'NumericLiteral') {
        return { ok: true, value: -node.argument.value };
      }
      return { ok: false };
    case 'ArrayExpression': {
      const out = [];
      for (const el of node.elements) {
        const r = nodeToValue(el);
        if (!r.ok) return { ok: false };
        out.push(r.value);
      }
      return { ok: true, value: out };
    }
    case 'ObjectExpression': {
      const out = {};
      for (const p of node.properties) {
        if (p.type !== 'ObjectProperty') return { ok: false };
        const key = p.key.type === 'Identifier' ? p.key.name
          : p.key.type === 'StringLiteral' ? p.key.value : null;
        if (key === null) return { ok: false };
        const r = nodeToValue(p.value);
        if (!r.ok) return { ok: false };
        out[key] = r.value;
      }
      return { ok: true, value: out };
    }
    default: return { ok: false };
  }
}
