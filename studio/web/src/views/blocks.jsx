/* Notebook block preview + editors. The type set mirrors the REAL renderer
 * (portal/apps/learn/lesson-renderer.js) exactly — no invented block types,
 * and text formatting is the renderer's actual inline grammar
 * (**bold**, `code`, [label](url)), inserted via the toolbar. Pixel-true
 * rendering lives in the student preview iframe; these previews are for
 * editing ergonomics.
 */
import React, { useRef, useState } from 'react';
import { store } from '../api.js';
import { Icon, Field } from '../common.jsx';

export const BLOCK_TYPES = [
  { type: 'lead', label: 'Lead' },
  { type: 'heading', label: 'Heading' },
  { type: 'p', label: 'Paragraph' },
  { type: 'code', label: 'Code' },
  { type: 'callout', label: 'Callout' },
  { type: 'list', label: 'Bullets' },
  { type: 'steps', label: 'Numbered' },
  { type: 'checklist', label: 'Checklist' },
  { type: 'terminal', label: 'Terminal' },
  { type: 'table', label: 'Table' },
  { type: 'terms', label: 'Terms' },
  { type: 'troubleshoot', label: 'Troubleshoot' },
  { type: 'reveal', label: 'Hint/Solution' },
  { type: 'image', label: 'Image' },
  { type: 'video', label: 'Video' },
  { type: 'divider', label: 'Divider' },
];

export function defaultBlock(type) {
  switch (type) {
    case 'lead': return { type, text: 'Lead paragraph — set up what this step is about.' };
    case 'heading': return { type, text: 'Heading', level: 2 };
    case 'p': return { type, text: 'Paragraph text.' };
    case 'code': return { type, lang: 'python', filename: '', code: '# code here\n' };
    case 'callout': return { type, tone: 'note', label: '', text: 'Callout text.' };
    case 'list': return { type, items: ['First point'] };
    case 'steps': return { type, items: ['First step'] };
    case 'checklist': return { type, items: ['First check'] };
    case 'terminal': return { type, lines: ['$ ros2 run swayform_demos wave_demo'] };
    case 'table': return { type, headers: ['Column A', 'Column B'], rows: [['', '']] };
    case 'terms': return { type, items: [{ term: 'Term', def: 'Definition' }] };
    case 'troubleshoot': return { type, items: [{ symptom: 'Something looks wrong', cause: '', fix: 'How to fix it' }] };
    case 'reveal': return { type, hint: 'A nudge in the right direction.', solution: { text: '' } };
    case 'image': return { type, src: '/images/RobotOverview.png', alt: '', caption: '' };
    case 'video': return { type, src: '/videos/demo-video.mp4', caption: '' };
    case 'divider': return { type };
    default: return { type: 'p', text: '' };
  }
}

/* ---------------------------------------------------------------- preview */

function inline(text) {
  // Editing preview of the renderer's inline grammar (escaped, simplified).
  const esc = String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:var(--accent)">$1</a>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-hover);padding:0 4px;border-radius:3px;font-size:.92em">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--ink)">$1</strong>');
}

export function BlockPreview({ block }) {
  const b = block;
  switch (b.type) {
    case 'lead': return <div className="b-lead" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
    case 'heading': return b.level === 3
      ? <div className="b-h3" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />
      : <div className="b-h2" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
    case 'p': return <div dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
    case 'list': return <ul>{(b.items || []).map((it, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />)}</ul>;
    case 'steps': return <ol>{(b.items || []).map((it, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />)}</ol>;
    case 'checklist': return (
      <div>{(b.items || []).map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 6 }}>
          <Icon name="checkCircle" size={13} className="icn" />
          <span dangerouslySetInnerHTML={{ __html: inline(it) }} />
        </div>
      ))}</div>
    );
    case 'callout': return (
      <div className={`b-callout ${b.tone || 'note'}`}>
        <div className="lbl">{b.label || b.tone || 'note'}</div>
        <span dangerouslySetInnerHTML={{ __html: inline(b.text) }} />
      </div>
    );
    case 'divider': return <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />;
    case 'terminal': return <pre>{(b.lines || []).join('\n')}</pre>;
    case 'code': return (
      <div>
        <div className="small muted mono" style={{ marginBottom: 3 }}>
          {b.filename || b.lang || 'code'}
          {b.workspaceFile && <span> · opens {b.workspaceFile.split('/').pop()}</span>}
          {b.insertable && <span> · insertable</span>}
        </div>
        <pre>{b.code}</pre>
      </div>
    );
    case 'table': return (
      <table>
        <thead><tr>{(b.headers || []).map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{(b.rows || []).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    );
    case 'terms': return (
      <div>{(b.items || []).map((t, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <strong style={{ color: 'var(--ink)' }}>{t.term}</strong>
          <span> — </span><span dangerouslySetInnerHTML={{ __html: inline(t.def) }} />
        </div>
      ))}</div>
    );
    case 'troubleshoot': return (
      <div>{(b.items || []).map((t, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <strong style={{ color: 'var(--amber)' }}>{t.symptom}</strong>
          {t.cause && <div className="small muted">Cause: {t.cause}</div>}
          <div className="small" dangerouslySetInnerHTML={{ __html: 'Fix: ' + inline(t.fix) }} />
        </div>
      ))}</div>
    );
    case 'reveal': return (
      <div>
        <div><strong style={{ color: 'var(--green)' }}>Hint:</strong> <span dangerouslySetInnerHTML={{ __html: inline(b.hint) }} /></div>
        {b.solution && (b.solution.text || b.solution.code) && (
          <div className="small muted" style={{ marginTop: 3 }}>
            Solution: {b.solution.text ? b.solution.text.slice(0, 80) : ''}{b.solution.code ? ` [code: ${b.solution.code.filename || b.solution.code.lang}]` : ''}
          </div>
        )}
      </div>
    );
    case 'image': return (
      <div>
        <img src={b.src} alt={b.alt || ''} style={b.width ? { width: `${b.width}%` } : undefined} />
        {b.caption && <div className="small muted" dangerouslySetInnerHTML={{ __html: inline(b.caption) }} />}
      </div>
    );
    case 'video': return (
      <div>
        <div className="small mono muted">
          <Icon name="play" size={12} /> {b.youtubeId ? `YouTube: ${b.youtubeId}` : (b.src || 'no source')}
          {b.ratio && b.ratio !== '16:9' ? ` · ${b.ratio}` : ''}
        </div>
        {b.caption && <div className="small muted" dangerouslySetInnerHTML={{ __html: inline(b.caption) }} />}
      </div>
    );
    default: return <div className="muted">[{b.type}]</div>;
  }
}

/* ---------------------------------------------------------------- editors */

/** Textarea with the renderer's inline-format toolbar (wraps selection). */
function FormatTextarea({ value, onChange, rows = 3, mono }) {
  const ref = useRef(null);
  const wrap = (before, after, placeholder) => {
    const ta = ref.current;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };
  return (
    <div>
      <div className="fmt-bar">
        <button type="button" className="btn" onClick={() => wrap('**', '**', 'bold')}><b>B</b></button>
        <button type="button" className="btn mono" onClick={() => wrap('`', '`', 'code')}>{'</>'}</button>
        <button type="button" className="btn" onClick={() => wrap('[', '](https://)', 'link text')}>Link</button>
        <span className="small muted" style={{ alignSelf: 'center', marginLeft: 4 }}>
          Portal design-system formatting: <b>**bold**</b>, `code`, [link](url)
        </span>
      </div>
      <textarea ref={ref} className={mono ? 'code' : ''} rows={rows} value={value ?? ''}
        onChange={(e) => onChange(e.target.value)} style={{ width: '100%' }} />
    </div>
  );
}

function StringListEditor({ items, onChange, placeholder }) {
  const list = items || [];
  return (
    <div>
      {list.map((it, i) => (
        <div className="list-item-edit" key={i}>
          <textarea rows={1} value={it} placeholder={placeholder}
            onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
          <button className="btn btn-icon" disabled={i === 0} title="Move up"
            onClick={() => { const n = [...list]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}>↑</button>
          <button className="btn btn-icon" disabled={i === list.length - 1} title="Move down"
            onClick={() => { const n = [...list]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; onChange(n); }}>↓</button>
          <button className="btn btn-icon danger" disabled={list.length <= 1} title="Remove"
            onClick={() => onChange(list.filter((_, j) => j !== i))}><Icon name="trash" size={11} /></button>
        </div>
      ))}
      <button className="btn" onClick={() => onChange([...list, ''])}><Icon name="plus" size={11} /> Item</button>
    </div>
  );
}

function ObjectListEditor({ items, fields, onChange }) {
  const list = items || [];
  return (
    <div>
      {list.map((it, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8, marginBottom: 6 }}>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              <textarea rows={1} value={it[f.key] || ''}
                onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
            </Field>
          ))}
          <button className="btn danger" disabled={list.length <= 1}
            onClick={() => onChange(list.filter((_, j) => j !== i))}><Icon name="trash" size={11} /> Remove</button>
        </div>
      ))}
      <button className="btn" onClick={() => onChange([...list, Object.fromEntries(fields.map((f) => [f.key, '']))])}>
        <Icon name="plus" size={11} /> Item
      </button>
    </div>
  );
}

export function BlockForm({ block, onChange }) {
  const model = store.content;
  const set = (patch) => onChange({ ...block, ...patch });
  const filePaths = Object.keys(model.workspaceFiles);
  const assets = null; // image src typed or picked from known /images names via datalist

  switch (block.type) {
    case 'lead':
    case 'p':
      return <FormatTextarea value={block.text} onChange={(text) => set({ text })} rows={block.type === 'lead' ? 3 : 4} />;
    case 'heading':
      return (
        <div className="field-row">
          <Field label="Text"><input value={block.text || ''} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Level">
            <select value={block.level === 3 ? 3 : 2} onChange={(e) => set({ level: Number(e.target.value) })}>
              <option value={2}>Section (H2)</option>
              <option value={3}>Sub-heading (H3)</option>
            </select>
          </Field>
        </div>
      );
    case 'callout':
      return (
        <div>
          <div className="field-row">
            <Field label="Tone">
              <select value={block.tone || 'note'} onChange={(e) => set({ tone: e.target.value })}>
                <option value="note">note</option><option value="tip">tip</option>
                <option value="warn">warning</option><option value="safety">safety</option>
              </select>
            </Field>
            <Field label="Label (optional)"><input value={block.label || ''} onChange={(e) => set({ label: e.target.value || undefined })} placeholder="auto" /></Field>
          </div>
          <FormatTextarea value={block.text} onChange={(text) => set({ text })} />
        </div>
      );
    case 'list': case 'steps': case 'checklist':
      return <StringListEditor items={block.items} onChange={(items) => set({ items })} placeholder="Item text (supports **bold**, `code`)" />;
    case 'terminal':
      return (
        <Field label="Lines (one per row)">
          <textarea className="code" rows={4} value={(block.lines || []).join('\n')}
            onChange={(e) => set({ lines: e.target.value.split('\n') })} />
        </Field>
      );
    case 'code':
      return (
        <div>
          <div className="field-row">
            <Field label="Language">
              <select value={block.lang || 'python'} onChange={(e) => set({ lang: e.target.value })}>
                <option>python</option><option>bash</option><option>yaml</option>
                <option>xml</option><option>json</option><option>text</option>
              </select>
            </Field>
            <Field label="Filename label (optional)"><input className="mono" value={block.filename || ''} onChange={(e) => set({ filename: e.target.value || undefined })} /></Field>
          </div>
          <Field label="Code">
            <textarea className="code" rows={Math.min(18, Math.max(4, (block.code || '').split('\n').length + 1))}
              value={block.code || ''} onChange={(e) => set({ code: e.target.value })} spellCheck={false} />
          </Field>
          <div className="field-row">
            <Field label="“Open file” button target" hint="Student can jump to this workspace file from the block.">
              <select value={block.workspaceFile || ''} onChange={(e) => set({ workspaceFile: e.target.value || undefined })}>
                <option value="">(none)</option>
                {filePaths.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Insertable">
              <select value={block.insertable ? '1' : ''} onChange={(e) => set({ insertable: e.target.value ? true : undefined })}>
                <option value="">Students copy manually / type it</option>
                <option value="1">Show “Insert into editor” button</option>
              </select>
            </Field>
          </div>
          <div className="field-row">
            <Field label="Copy button">
              <select value={block.copy === false ? '0' : '1'} onChange={(e) => set({ copy: e.target.value === '0' ? false : undefined })}>
                <option value="1">Shown (default)</option>
                <option value="0">Hidden (type-it-yourself)</option>
              </select>
            </Field>
            <Field label="Line numbers">
              <select value={block.lineNumbers ? '1' : ''} onChange={(e) => set({ lineNumbers: e.target.value ? true : undefined })}>
                <option value="">Off (default)</option>
                <option value="1">On</option>
              </select>
            </Field>
            <Field label="Height" hint="Auto grows with the code; or cap at N visible lines (scrolls).">
              <select value={block.lines || ''} onChange={(e) => set({ lines: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Auto</option>
                {[6, 10, 14, 20, 30].map((n) => <option key={n} value={n}>{n} lines</option>)}
              </select>
            </Field>
          </div>
        </div>
      );
    case 'table':
      return (
        <div>
          <Field label="Headers (comma-separated)">
            <input value={(block.headers || []).join(', ')}
              onChange={(e) => {
                const headers = e.target.value.split(',').map((s) => s.trim());
                const rows = (block.rows || []).map((r) => {
                  const n = [...r];
                  while (n.length < headers.length) n.push('');
                  return n.slice(0, headers.length);
                });
                set({ headers, rows });
              }} />
          </Field>
          <Field label="Rows (one per line, cells separated by |)">
            <textarea className="code" rows={5}
              value={(block.rows || []).map((r) => r.join(' | ')).join('\n')}
              onChange={(e) => set({
                rows: e.target.value.split('\n').map((line) => {
                  const cells = line.split('|').map((s) => s.trim());
                  while (cells.length < (block.headers || []).length) cells.push('');
                  return cells.slice(0, (block.headers || []).length);
                }),
              })} />
          </Field>
        </div>
      );
    case 'terms':
      return <ObjectListEditor items={block.items} onChange={(items) => set({ items })}
        fields={[{ key: 'term', label: 'Term' }, { key: 'def', label: 'Definition' }]} />;
    case 'troubleshoot':
      return <ObjectListEditor items={block.items} onChange={(items) => set({ items })}
        fields={[{ key: 'symptom', label: 'Symptom' }, { key: 'cause', label: 'Likely cause (optional)' }, { key: 'fix', label: 'Fix' }]} />;
    case 'reveal':
      return (
        <div>
          <Field label="Hint (always visible)">
            <FormatTextarea value={block.hint} onChange={(hint) => set({ hint })} rows={2} />
          </Field>
          <Field label="Solution text (behind “Show Solution”)">
            <FormatTextarea value={block.solution?.text || ''} onChange={(text) => set({ solution: { ...block.solution, text: text || undefined } })} rows={2} />
          </Field>
          <Field label="Solution code (optional)">
            <textarea className="code" rows={4} value={block.solution?.code?.code || ''}
              placeholder="Leave empty for no code"
              onChange={(e) => {
                const code = e.target.value;
                set({
                  solution: {
                    ...block.solution,
                    code: code ? { lang: block.solution?.code?.lang || 'python', filename: block.solution?.code?.filename, code } : undefined,
                  },
                });
              }} />
          </Field>
        </div>
      );
    case 'image': {
      void assets;
      return (
        <div>
          <Field label="Image path" hint="Site-absolute, e.g. /images/RobotOverview.png — upload new files in Assets.">
            <input className="mono" list="studio-image-list" value={block.src || ''} onChange={(e) => set({ src: e.target.value })} />
          </Field>
          <div className="field-row">
            <Field label="Alt text"><input value={block.alt || ''} onChange={(e) => set({ alt: e.target.value })} /></Field>
            <Field label="Caption (optional)"><input value={block.caption || ''} onChange={(e) => set({ caption: e.target.value || undefined })} /></Field>
          </div>
          <div className="field-row">
            <Field label="Width">
              <select value={block.width || ''} onChange={(e) => {
                const width = e.target.value ? Number(e.target.value) : undefined;
                set({ width, align: width ? block.align : undefined });
              }}>
                <option value="">Full column</option>
                {[25, 40, 50, 60, 75].map((n) => <option key={n} value={n}>{n}%</option>)}
              </select>
            </Field>
            <Field label="Alignment">
              <select value={block.align || 'left'} disabled={!block.width}
                onChange={(e) => set({ align: e.target.value === 'center' ? 'center' : undefined })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </Field>
            <Field label="Corners">
              <select value={block.rounded === false ? '0' : '1'} onChange={(e) => set({ rounded: e.target.value === '0' ? false : undefined })}>
                <option value="1">Rounded (default)</option>
                <option value="0">Square</option>
              </select>
            </Field>
            <Field label="Click to expand">
              <select value={block.expand ? '1' : ''} onChange={(e) => set({ expand: e.target.value ? true : undefined })}>
                <option value="">Off</option>
                <option value="1">On (lightbox)</option>
              </select>
            </Field>
          </div>
        </div>
      );
    }
    case 'video': {
      const mode = block.youtubeId !== undefined ? 'youtube' : 'file';
      return (
        <div>
          <Field label="Source type">
            <select value={mode} onChange={(e) => {
              if (e.target.value === 'youtube') set({ youtubeId: '', src: undefined, poster: undefined });
              else set({ youtubeId: undefined, src: block.src || '/videos/demo-video.mp4' });
            }}>
              <option value="file">Video file (local /videos or https URL)</option>
              <option value="youtube">YouTube embed (privacy-enhanced)</option>
            </select>
          </Field>
          {mode === 'youtube' ? (
            <Field label="YouTube video ID" hint="The 11-character id from the watch URL, e.g. dQw4w9WgXcQ.">
              <input className="mono" value={block.youtubeId || ''} onChange={(e) => set({ youtubeId: e.target.value.trim() })} />
            </Field>
          ) : (
            <>
              <Field label="Video path or URL" hint="Upload .mp4/.webm files in Assets; they land in /videos.">
                <input className="mono" value={block.src || ''} onChange={(e) => set({ src: e.target.value })} />
              </Field>
              <Field label="Poster image (optional)" hint="Shown before playback starts.">
                <input className="mono" value={block.poster || ''} placeholder="/images/…"
                  onChange={(e) => set({ poster: e.target.value || undefined })} />
              </Field>
            </>
          )}
          <div className="field-row">
            <Field label="Aspect ratio">
              <select value={block.ratio || '16:9'} onChange={(e) => set({ ratio: e.target.value === '16:9' ? undefined : e.target.value })}>
                <option value="16:9">16:9 (default)</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
              </select>
            </Field>
            <Field label="Caption (optional)">
              <input value={block.caption || ''} onChange={(e) => set({ caption: e.target.value || undefined })} />
            </Field>
          </div>
          <div className="small muted">Controls are always on; autoplay is always off.</div>
        </div>
      );
    }
    case 'divider':
      return <div className="small muted">A horizontal rule — nothing to configure.</div>;
    default:
      return <div className="small muted">No editor for “{block.type}”.</div>;
  }
}
