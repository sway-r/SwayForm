/* Draft state: an op log replayed over the base content model.
 *
 * The log (with an undo pointer) is the single source of draft truth:
 *  - merged model  = replay(base, ops[0..pointer])
 *  - undo/redo     = move pointer
 *  - change list   = op summaries
 *  - revert one op = drop it and re-replay (refused if later ops depended on it)
 *  - crash safety  = log persisted to studio/.draft.json on every change
 *
 * Base is reloaded from the real repo files after every save/discard, and
 * base file hashes detect out-of-band edits (file changed outside Studio).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, fileHash, CONTENT_FILES } from './content-load.mjs';
import { replay } from './ops.mjs';

const DRAFT_FILE = path.resolve(import.meta.dirname, '..', '.draft.json');

export class DraftStore {
  constructor() {
    this.base = null;
    this.ops = [];          // [{ op, summary: {text, before, after}, at }]
    this.pointer = 0;       // ops[0..pointer) are active
    this.revision = 0;
    this._merged = null;    // cache of the replayed model at `pointer`
  }

  async init() {
    this.base = await loadContent();
    this._restoreLog();
    this._merged = null;
  }

  /** Reload base from disk (after save/discard/external change). Replays the
   * active log on the new base; ops that no longer apply are dropped with a
   * report so the user knows exactly what was lost. */
  async reloadBase() {
    this.base = await loadContent();
    const dropped = [];
    let kept = this.ops.slice(0, this.pointer);
    for (;;) {
      try {
        replay(this.base, kept.map((e) => e.op));
        break;
      } catch (err) {
        if (typeof err.opIndex !== 'number') throw err;
        dropped.push({ entry: kept[err.opIndex], reason: err.message });
        kept = kept.filter((_, i) => i !== err.opIndex);
      }
    }
    this.ops = kept;
    this.pointer = kept.length;
    this._merged = null;
    this.revision += 1;
    this._persistLog();
    return dropped.map((d) => ({ text: d.entry.summary.text, reason: d.reason }));
  }

  merged() {
    if (!this._merged) {
      const { model } = replay(this.base, this.activeOps().map((e) => e.op));
      this._merged = model;
    }
    return this._merged;
  }

  activeOps() { return this.ops.slice(0, this.pointer); }

  apply(op) {
    // Validate against current merged state by replaying just this op.
    const { summaries } = replay(this.merged(), [op]);
    // Truncate redo tail, append.
    this.ops = this.ops.slice(0, this.pointer);
    this.ops.push({ op, summary: summaries[0], at: Date.now() });
    this.pointer = this.ops.length;
    this._merged = null;
    this.revision += 1;
    this._persistLog();
    return summaries[0];
  }

  undo() {
    if (this.pointer === 0) return false;
    this.pointer -= 1;
    this._merged = null;
    this.revision += 1;
    this._persistLog();
    return true;
  }

  redo() {
    if (this.pointer >= this.ops.length) return false;
    this.pointer += 1;
    this._merged = null;
    this.revision += 1;
    this._persistLog();
    return true;
  }

  discard() {
    this.ops = [];
    this.pointer = 0;
    this._merged = null;
    this.revision += 1;
    this._persistLog();
  }

  /** Remove one op from the active log. Succeeds only if the remaining ops
   * still replay cleanly (later ops may depend on the reverted one). */
  revertOp(index) {
    if (index < 0 || index >= this.pointer) throw new Error('No such change');
    const remaining = this.activeOps().filter((_, i) => i !== index);
    try {
      replay(this.base, remaining.map((e) => e.op));
    } catch (err) {
      throw new Error(`Cannot revert this change — a later change depends on it (${err.message}). Undo back to it instead.`);
    }
    this.ops = remaining;
    this.pointer = remaining.length;
    this._merged = null;
    this.revision += 1;
    this._persistLog();
  }

  /** True if any tracked repo file changed on disk since base was loaded. */
  staleFiles() {
    const stale = [];
    for (const rel of CONTENT_FILES) {
      if ((this.base.fileHashes[rel] || null) !== fileHash(rel)) stale.push(rel);
    }
    return stale;
  }

  changeCount() { return this.pointer; }

  changeList() {
    return this.activeOps().map((e, i) => ({
      index: i,
      type: e.op.type,
      text: e.summary.text,
      before: e.summary.before,
      after: e.summary.after,
      at: e.at,
    }));
  }

  /* ---------------- persistence ---------------- */

  _persistLog() {
    try {
      fs.writeFileSync(DRAFT_FILE, JSON.stringify({
        version: 1,
        ops: this.ops.map((e) => ({ op: e.op, at: e.at })),
        pointer: this.pointer,
      }));
    } catch (err) { /* non-fatal: draft just won't survive a crash */ }
  }

  _restoreLog() {
    let saved = null;
    try { saved = JSON.parse(fs.readFileSync(DRAFT_FILE, 'utf8')); } catch (err) { return; }
    if (!saved || saved.version !== 1 || !Array.isArray(saved.ops)) return;
    // Re-derive summaries by replaying; drop anything that no longer applies.
    const entries = [];
    for (const { op, at } of saved.ops) {
      try {
        const current = replay(this.base, entries.map((e) => e.op));
        const { summaries } = replay(current.model, [op]);
        entries.push({ op, summary: summaries[0], at });
      } catch (err) { /* stale op from an old draft — skip */ }
    }
    this.ops = entries;
    this.pointer = Math.min(saved.pointer ?? entries.length, entries.length);
  }
}
