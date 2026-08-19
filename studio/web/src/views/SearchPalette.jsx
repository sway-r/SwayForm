/* Ctrl+K search across lessons, notebook text, code, and workspace files. */
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../common.jsx';

const TYPE_ICON = { section: 'layers', activity: 'book', step: 'menu', block: 'edit', file: 'file' };

export default function SearchPalette({ nav, onClose }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) { setHits([]); return; }
    timer.current = setTimeout(() => {
      api.get('/search?q=' + encodeURIComponent(q)).then((r) => { setHits(r.hits); setSel(0); });
    }, 150);
  }, [q]);

  function open(hit) {
    onClose();
    if (hit.type === 'section') nav.setView({ page: 'curriculum', params: {} });
    else if (hit.type === 'activity') nav.openLesson(hit.activityId);
    else if (hit.type === 'step' || hit.type === 'block') {
      nav.openLesson(hit.activityId, 'notebook', { stepIndex: hit.stepIndex, blockIndex: hit.blockIndex });
    } else if (hit.type === 'file') nav.setView({ page: 'workspace', params: { path: hit.path } });
  }

  return (
    <>
      <div className="modal-backdrop" onMouseDown={onClose} style={{ background: 'rgba(8,10,14,0.5)' }} />
      <div className="palette">
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search lesson names, notebook text, code, files…"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            else if (e.key === 'Enter' && hits[sel]) open(hits[sel]);
          }} />
        {hits.length > 0 && (
          <div className="palette-hits">
            {hits.map((h, i) => (
              <button key={i} className={`palette-hit${i === sel ? ' active' : ''}`} onClick={() => open(h)}>
                <div className="t"><Icon name={TYPE_ICON[h.type] || 'dot'} size={13} /> {h.title}
                  <span className="chip gray">{h.type}</span></div>
                <div className="s">{h.snippet}</div>
              </button>
            ))}
          </div>
        )}
        {q.trim() && hits.length === 0 && <div className="empty" style={{ padding: 20 }}>No matches.</div>}
      </div>
    </>
  );
}
