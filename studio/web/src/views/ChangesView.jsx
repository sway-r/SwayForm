/* Changes & History — the unsaved-changes list (human summaries with
 * old → new), the Advanced git-style diff, validation status, the Save
 * Changes pipeline modal, and recent Studio commits.
 */
import React, { useEffect, useState } from 'react';
import { api, store, toast, refreshState } from '../api.js';
import { Icon, Modal } from '../common.jsx';

function fmtVal(v) {
  if (v === undefined) return '—';
  if (typeof v === 'string') return v.length > 120 ? v.slice(0, 120) + '…' : v;
  const s = JSON.stringify(v);
  return s.length > 120 ? s.slice(0, 120) + '…' : s;
}

export default function ChangesView({ params }) {
  const [tab, setTab] = useState('changes');
  const [data, setData] = useState(null);
  const [diffs, setDiffs] = useState(null);
  const [validation, setValidation] = useState(null);
  const [commits, setCommits] = useState(null);
  const [commitPatch, setCommitPatch] = useState(null);
  const [saving, setSaving] = useState(!!params.save);
  const [openDiffs, setOpenDiffs] = useState({});

  const load = async () => {
    const [c, v] = await Promise.all([api.get('/changes'), api.get('/validate')]);
    setData(c); setValidation(v);
  };
  useEffect(() => { load().catch((e) => toast(e.message, 'error')); }, [store.revision]);
  useEffect(() => {
    if (tab === 'diff') api.get('/diff').then((r) => setDiffs(r.patches)).catch((e) => toast(e.message, 'error'));
    if (tab === 'history') api.get('/git/log').then((r) => setCommits(r.commits)).catch((e) => toast(e.message, 'error'));
  }, [tab, store.revision]);

  if (!data) return <div className="empty">Loading…</div>;

  return (
    <div className="view">
      <div className="view-scroll" style={{ maxWidth: 860 }}>
        <div className="view-head">
          <div>
            <div className="view-title">Changes & History</div>
            <div className="view-sub">
              {data.ops.length ? `${data.ops.length} unsaved change(s) → ${data.files.length} file(s)` : 'No unsaved changes'}
              {validation && validation.errors.length > 0 && <span style={{ color: 'var(--red)' }}> · {validation.errors.length} validation error(s)</span>}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="lesson-tabs">
            {[['changes', 'Changes'], ['diff', 'Advanced diff'], ['history', 'Commit history']].map(([id, label]) => (
              <button key={id} className={`lesson-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <button className="btn danger" disabled={!data.ops.length} onClick={async () => {
            if (window.confirm(`Discard all ${data.ops.length} unsaved change(s)? This cannot be undone.`)) {
              await api.post('/discard'); await refreshState();
            }
          }}>Discard all</button>
          <button className="btn primary" disabled={!data.ops.length} onClick={() => setSaving(true)}>
            <Icon name="save" size={12} /> Save Changes
          </button>
        </div>

        {validation && validation.errors.length > 0 && (
          <div style={{ border: '1px solid var(--red)', borderRadius: 8, padding: 10, marginBottom: 12, background: 'rgba(229,83,75,0.06)' }}>
            <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>Validation errors (saving is blocked)</div>
            {validation.errors.map((e, i) => <div key={i} className="small"><b>{e.where}:</b> {e.msg}</div>)}
          </div>
        )}

        {tab === 'changes' && (
          data.ops.length === 0 ? <div className="empty">Nothing modified in this session.</div> : (
            <>
              {data.ops.map((op) => (
                <div className="change-op" key={op.index}>
                  <span className="idx">{op.index + 1}</span>
                  <div className="txt">
                    {op.text}
                    {(op.before !== undefined || op.after !== undefined) && (
                      <div className="detail">
                        {op.before !== undefined && <span className="old">{fmtVal(op.before)}</span>}
                        {op.before !== undefined && op.after !== undefined && ' → '}
                        {op.after !== undefined && <span className="new">{fmtVal(op.after)}</span>}
                      </div>
                    )}
                  </div>
                  <button className="btn" title="Revert just this change (refused if later changes depend on it)"
                    onClick={async () => {
                      try { await api.post('/revert', { index: op.index }); await refreshState(); }
                      catch (err) { toast(err.message, 'error', 6000); }
                    }}><Icon name="undo" size={11} /> Revert</button>
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <div className="view-sub" style={{ marginBottom: 6 }}>Files that will change</div>
                {data.files.map((f) => (
                  <div key={f.path} className="small mono" style={{ padding: '3px 0' }}>
                    {f.created && <span className="chip green" style={{ marginRight: 6 }}>new</span>}
                    {f.path} <span className="adds" style={{ color: 'var(--green)' }}>+{f.adds}</span>{' '}
                    <span style={{ color: 'var(--red)' }}>−{f.dels}</span>
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {tab === 'diff' && (
          !diffs ? <div className="empty">Computing diffs…</div> :
          diffs.length === 0 ? <div className="empty">No file changes.</div> :
          diffs.map((d) => (
            <div className="diff-file" key={d.path}>
              <div className="diff-file-head" onClick={() => setOpenDiffs((o) => ({ ...o, [d.path]: !o[d.path] }))}>
                <Icon name={openDiffs[d.path] === false ? 'chevronRight' : 'chevronDown'} size={12} />
                {d.path}
              </div>
              {openDiffs[d.path] !== false && (
                <div className="diff-body">
                  <pre>{d.patch.split('\n').slice(4).map((line, i) => (
                    <div key={i} className={`diff-line ${line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : 'ctx'}`}>{line || ' '}</div>
                  ))}</pre>
                </div>
              )}
            </div>
          ))
        )}

        {tab === 'history' && (
          !commits ? <div className="empty">Loading history…</div> :
          <>
            <div className="view-sub" style={{ marginBottom: 8 }}>Recent commits touching Studio-managed files. Studio never rewrites history — use git directly for rollbacks.</div>
            {commits.map((c) => (
              <div className="change-op" key={c.hash} style={{ cursor: 'pointer' }}
                onClick={() => api.get('/git/show?hash=' + c.hash).then((r) => setCommitPatch({ commit: c, patch: r.patch }))}>
                <span className="idx mono">{c.short}</span>
                <div className="txt">
                  {c.subject}
                  <div className="small muted">{c.author} · {new Date(c.date).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {saving && <SaveModal onClose={() => setSaving(false)} />}
      {commitPatch && (
        <Modal wide title={`${commitPatch.commit.short} — ${commitPatch.commit.subject}`} onClose={() => setCommitPatch(null)}>
          <div className="diff-body" style={{ maxHeight: '60vh' }}>
            <pre>{commitPatch.patch.split('\n').map((line, i) => (
              <div key={i} className={`diff-line ${line.startsWith('+') && !line.startsWith('+++') ? 'add' : line.startsWith('-') && !line.startsWith('---') ? 'del' : line.startsWith('@@') ? 'hunk' : 'ctx'}`}>{line || ' '}</div>
            ))}</pre>
          </div>
        </Modal>
      )}
    </div>
  );
}

const STEP_LABELS = {
  stale: 'Sources unchanged outside Studio',
  generate: 'Generate source changes',
  validate: 'Curriculum validation',
  review: 'Automated review checks',
  write: 'Write source files',
  reimport: 'Reload + verify round-trip',
  commit: 'Git commit',
};

function SaveModal({ onClose }) {
  const [phase, setPhase] = useState('confirm'); // confirm | running | done
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/changes').then(setSummary).catch(() => {});
  }, []);

  async function run() {
    setPhase('running');
    try {
      const r = await api.post('/save');
      setResult(r);
      setPhase('done');
      await refreshState();
      if (r.ok) toast(`Committed ${r.commit.slice(0, 10)}`, 'success', 5000);
    } catch (err) {
      setResult({ ok: false, steps: [], message: err.message });
      setPhase('done');
    }
  }

  return (
    <Modal title="Save Changes" onClose={phase === 'running' ? () => {} : onClose} footer={
      phase === 'confirm' ? (
        <>
          <button className="btn" onClick={onClose}>Keep editing</button>
          <button className="btn primary" onClick={run}><Icon name="save" size={12} /> Validate & commit</button>
        </>
      ) : phase === 'done' ? (
        <button className="btn primary" onClick={onClose}>{result?.ok ? 'Done' : 'Return to editing'}</button>
      ) : null
    }>
      {phase === 'confirm' && summary && (
        <>
          <div className="view-sub" style={{ marginBottom: 8 }}>
            {summary.ops.length} change(s) will be validated and committed locally (no push):
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 10 }}>
            {summary.ops.map((op) => <div key={op.index} className="small" style={{ padding: '2px 0' }}>• {op.text}</div>)}
          </div>
          <div className="small muted">
            Files: {summary.files.map((f) => f.path.split('/').pop()).join(', ') || '(none)'}
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            Pipeline: syntax check → curriculum validation → automated review → write → reload-and-verify → commit.
            If anything fails, every file is rolled back and nothing is committed.
          </div>
        </>
      )}
      {phase === 'running' && <div className="empty">Running validation pipeline…</div>}
      {phase === 'done' && result && (
        <>
          {(result.steps || []).map((s) => (
            <div className="save-step" key={s.id}>
              <span className={`mark ${s.ok ? 'ok' : s.errors?.length ? 'fail' : 'pend'}`}>
                <Icon name={s.ok ? 'check' : 'close'} size={11} />
              </span>
              <div>
                <div className="lbl">{STEP_LABELS[s.id] || s.label}</div>
                {s.detail && <div className="det">{s.detail}</div>}
                {s.errors?.length > 0 && (
                  <div className="errs">
                    {s.errors.map((e, i) => <div key={i}>{e.where ? `${e.where}: ` : ''}{e.msg}</div>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {result.message && <div className="small muted" style={{ marginTop: 8 }}>{result.message}</div>}
          {result.ok && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 7, background: 'rgba(52,192,124,0.08)', border: '1px solid var(--green)' }}>
              <b>Committed {result.commit.slice(0, 10)}</b>
              <div className="small muted" style={{ marginTop: 3 }}>Local commit only — push manually when ready.</div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
