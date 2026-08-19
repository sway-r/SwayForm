/* Workspace Files — the students' virtual ROS 2 filesystem (the seed map in
 * workspace-files.js): IDE-style tree, Monaco editing, add/rename/delete,
 * with per-file usage shown (which lessons open it).
 */
import React, { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { store, sendOp } from '../api.js';
import { Icon, Modal, Field } from '../common.jsx';

function buildTree(paths) {
  const root = {};
  for (const p of paths) {
    const parts = p.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node = node.children ??= {};
      node = node[parts[i]] ??= {};
    }
    (node.children ??= {})[parts[parts.length - 1]] = { file: p };
  }
  return root;
}

function langFor(path) {
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.xml')) return 'xml';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  return 'plaintext';
}

function TreeLevel({ node, depth, active, onOpen, roFiles }) {
  const entries = Object.entries(node.children || {}).sort(([a, av], [b, bv]) => {
    const af = !!av.file, bf = !!bv.file;
    if (af !== bf) return af ? 1 : -1;
    return a.localeCompare(b);
  });
  return entries.map(([name, child]) => child.file ? (
    <button key={name} className={`ws-tree-file${active === child.file ? ' active' : ''}`}
      style={{ paddingLeft: 14 + depth * 12 }} onClick={() => onOpen(child.file)}>
      <Icon name="file" size={12} /> {name}
      {roFiles.has(child.file) && <Icon name="lock" size={11} className="ro" />}
    </button>
  ) : (
    <div key={name}>
      <div className="ws-tree-folder" style={{ paddingLeft: 6 + depth * 12 }}>
        <Icon name="folderOpen" size={12} /> {name}
      </div>
      <TreeLevel node={child} depth={depth + 1} active={active} onOpen={onOpen} roFiles={roFiles} />
    </div>
  ));
}

export default function WorkspaceView({ nav, params }) {
  const model = store.content;
  const paths = Object.keys(model.workspaceFiles).sort();
  const [active, setActive] = useState(params.path || paths[0]);
  const [dirty, setDirty] = useState(null);
  const [modal, setModal] = useState(null);
  const tree = useMemo(() => buildTree(paths), [paths.join('\n')]);
  const roFiles = new Set(model.workspaceConfig.readOnlyFiles || []);

  const usage = useMemo(() => {
    const map = {};
    for (const a of Object.values(model.activities)) {
      if (a.workspaceFile) (map[a.workspaceFile] ??= []).push(a.title);
    }
    return map;
  }, [model]);

  const content = active ? model.workspaceFiles[active] : null;

  return (
    <div className="view">
      <div className="ws-layout">
        <div className="ws-tree">
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setModal({ type: 'add' })}><Icon name="plus" size={11} /> File</button>
            <button className="btn" disabled={!active} onClick={() => setModal({ type: 'rename', path: active })} title="Rename"><Icon name="edit" size={11} /></button>
            <button className="btn danger" disabled={!active} title="Delete file" onClick={async () => {
              if (window.confirm(`Delete workspace file ${active}?\n${usage[active] ? `\nUsed by: ${usage[active].join(', ')} — deletion will be refused.` : ''}`)) {
                if (await sendOp({ type: 'file.remove', path: active })) {
                  setActive(paths.find((p) => p !== active) || null);
                  setDirty(null);
                }
              }
            }}><Icon name="trash" size={11} /></button>
          </div>
          <TreeLevel node={tree} depth={0} active={active} onOpen={(p) => { setActive(p); setDirty(null); }} roFiles={roFiles} />
        </div>
        <div className="ws-editor">
          {active && content !== undefined ? (
            <>
              <div className="ws-editor-bar">
                <Icon name="file" size={13} /> {active}
                {usage[active] && <span className="chip blue" title={usage[active].join('\n')}>starter for {usage[active].length} lesson(s)</span>}
                {roFiles.has(active) && <span className="chip amber">read-only for students</span>}
                <div style={{ flex: 1 }} />
                {dirty !== null && dirty !== content && (
                  <>
                    <span className="chip amber">unapplied edits</span>
                    <button className="btn primary" onClick={async () => {
                      if (await sendOp({ type: 'file.set', path: active, content: dirty })) setDirty(null);
                    }}><Icon name="check" size={12} /> Apply changes</button>
                    <button className="btn" onClick={() => setDirty(null)}>Discard</button>
                  </>
                )}
              </div>
              <div className="ws-editor-surface">
                <Editor height="100%" language={langFor(active)} theme="vs-dark"
                  path={active}
                  value={dirty ?? content}
                  onChange={(v) => setDirty(v ?? '')}
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4 }} />
              </div>
            </>
          ) : (
            <div className="empty">Select a file.</div>
          )}
        </div>
      </div>

      {modal?.type === 'add' && (
        <PathModal title="New workspace file" initial="ros2_ws/src/swayform_labs/" cta="Create"
          onClose={() => setModal(null)}
          onSubmit={async (p) => {
            if (await sendOp({ type: 'file.add', path: p, content: '' })) { setActive(p); setDirty(null); return true; }
            return false;
          }} />
      )}
      {modal?.type === 'rename' && (
        <PathModal title={`Rename ${modal.path}`} initial={modal.path} cta="Rename"
          hint="Lessons and notebook code blocks pointing at the old path are retargeted automatically."
          onClose={() => setModal(null)}
          onSubmit={async (p) => {
            if (await sendOp({ type: 'file.rename', oldPath: modal.path, newPath: p })) { setActive(p); return true; }
            return false;
          }} />
      )}
    </div>
  );
}

function PathModal({ title, initial, cta, hint, onClose, onSubmit }) {
  const [path, setPath] = useState(initial);
  return (
    <Modal title={title} onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={async () => { if (await onSubmit(path)) onClose(); }}>{cta}</button>
      </>
    }>
      <Field label="Path" hint={hint || 'Must stay inside ros2_ws/.'}>
        <input className="mono" value={path} onChange={(e) => setPath(e.target.value)} autoFocus
          onKeyDown={async (e) => { if (e.key === 'Enter' && await onSubmit(path)) onClose(); }} />
      </Field>
    </Modal>
  );
}
