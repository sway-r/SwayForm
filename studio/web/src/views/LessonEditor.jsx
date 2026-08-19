/* Lesson editor: Notebook (block editor) / Starter Code / Workspace config /
 * Metadata tabs, with the live student preview beside the editor.
 * EDIT and PREVIEW are simultaneous — the preview iframe is the real portal
 * rendering the current draft, reloading on every committed change.
 */
import React, { useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Editor from '@monaco-editor/react';
import { store, sendOp, sendOps, toast } from '../api.js';
import { Icon, Field, CommitInput } from '../common.jsx';
import { BlockPreview, BlockForm, BLOCK_TYPES, defaultBlock } from './blocks.jsx';
import PreviewPane from './PreviewPane.jsx';

export default function LessonEditor({ nav, params }) {
  const model = store.content;
  const activity = model.activities[params.activityId];
  const [tab, setTab] = useState(params.tab || 'notebook');
  const [showPreview, setShowPreview] = useState(true);

  if (!activity) {
    return <div className="empty">Lesson “{params.activityId}” not found (it may have been deleted in this draft). <button className="btn" onClick={() => nav.setView({ page: 'curriculum', params: {} })}>Back to curriculum</button></div>;
  }

  const listing = model.curriculum.sections.flatMap((s) => s.items.map((i) => ({ section: s, item: i })))
    .find((e) => e.item.id === activity.id);

  return (
    <div className="lesson-editor">
      <div className="lesson-header">
        <button className="btn ghost" onClick={() => nav.setView({ page: 'curriculum', params: {} })}>
          <Icon name="arrowLeft" size={13} /> Curriculum
        </button>
        <h2>{activity.title}</h2>
        {listing
          ? <span className="chip blue">{listing.item.number} · {listing.section.title}</span>
          : <span className="chip gray">hidden</span>}
        <span className="chip gray">{activity.kind}</span>
        <div className="lesson-tabs">
          {[['notebook', 'Notebook'], ['code', 'Starter Code'], ['workspace', 'Workspace'], ['meta', 'Metadata']].map(([id, label]) => (
            <button key={id} className={`lesson-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className={`btn${showPreview ? ' primary' : ''}`} onClick={() => setShowPreview(!showPreview)}>
          <Icon name="eye" size={13} /> Preview as Student
        </button>
      </div>
      <div className="lesson-body">
        <div className="lesson-main">
          {tab === 'notebook' && <NotebookEditor activity={activity} focus={params.focus} />}
          {tab === 'code' && <StarterCodeTab activity={activity} />}
          {tab === 'workspace' && <WorkspaceTab activity={activity} />}
          {tab === 'meta' && <MetadataTab activity={activity} listing={listing} />}
        </div>
        {showPreview && (
          <PreviewPane path={`/learn/activity/${activity.id}`} width={540} onClose={() => setShowPreview(false)} />
        )}
      </div>
    </div>
  );
}

/* ================================================================ notebook */

function SortableBlockRow({ id, block, editing, onEdit, onChange, onDone, onRemove, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} className={`block-row${editing ? ' editing' : ''}${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className="block-side">
        <span className="grip" {...attributes} {...listeners}><Icon name="grip" size={13} /></span>
        <span className="block-type-tag">{block.type}</span>
      </div>
      <div className="block-content" onClick={() => !editing && onEdit()}>
        {editing ? (
          <div className="block-form">
            <BlockForm block={block} onChange={onChange} />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="btn primary" onClick={onDone}><Icon name="check" size={12} /> Done</button>
            </div>
          </div>
        ) : (
          <BlockPreview block={block} />
        )}
      </div>
      <div className="block-actions">
        <button className="btn" title="Duplicate block" onClick={onDuplicate}><Icon name="copy" size={11} /></button>
        <button className="btn danger" title="Remove block" onClick={onRemove}><Icon name="trash" size={11} /></button>
      </div>
    </div>
  );
}

function NotebookEditor({ activity, focus }) {
  const [editing, setEditing] = useState(focus && typeof focus.stepIndex === 'number'
    ? { step: focus.stepIndex, block: focus.blockIndex ?? null } : null);
  const [draftBlock, setDraftBlock] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const commitDraft = async () => {
    if (editing && draftBlock) {
      await sendOp({ type: 'block.set', activityId: activity.id, stepIndex: editing.step, blockIndex: editing.block, block: draftBlock });
    }
    setEditing(null);
    setDraftBlock(null);
  };

  return (
    <div className="nb-editor">
      {activity.steps.map((step, si) => (
        <div className="step-card" key={step.id}>
          <div className="step-head">
            <span className="num">{si + 1}</span>
            <CommitInput value={step.title}
              onCommit={(title) => sendOp({ type: 'step.rename', activityId: activity.id, stepIndex: si, title })} />
            <button className="btn ghost btn-icon" disabled={si === 0} title="Move step up"
              onClick={() => sendOp({ type: 'step.reorder', activityId: activity.id, order: arrayMove(activity.steps.map((s) => s.id), si, si - 1) })}>↑</button>
            <button className="btn ghost btn-icon" disabled={si === activity.steps.length - 1} title="Move step down"
              onClick={() => sendOp({ type: 'step.reorder', activityId: activity.id, order: arrayMove(activity.steps.map((s) => s.id), si, si + 1) })}>↓</button>
            <button className="btn ghost btn-icon danger" disabled={activity.steps.length <= 1} title="Delete step"
              onClick={() => {
                if (window.confirm(`Delete step "${step.title}" and its ${step.blocks.length} block(s)?`)) {
                  sendOp({ type: 'step.remove', activityId: activity.id, stepIndex: si });
                }
              }}><Icon name="trash" size={12} /></button>
          </div>
          <div className="step-blocks">
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) return;
                const from = Number(String(active.id).split(':')[1]);
                const to = Number(String(over.id).split(':')[1]);
                sendOp({ type: 'block.move', activityId: activity.id, stepIndex: si, fromIndex: from, toIndex: to });
              }}>
              <SortableContext items={step.blocks.map((_, bi) => `${si}:${bi}`)} strategy={verticalListSortingStrategy}>
                {step.blocks.map((block, bi) => {
                  const isEditing = editing && editing.step === si && editing.block === bi;
                  return (
                    <SortableBlockRow key={`${si}:${bi}:${block.type}`} id={`${si}:${bi}`}
                      block={isEditing && draftBlock ? draftBlock : block}
                      editing={isEditing}
                      onEdit={() => { commitDraft(); setEditing({ step: si, block: bi }); setDraftBlock(block); }}
                      onChange={setDraftBlock}
                      onDone={commitDraft}
                      onDuplicate={() => sendOp({ type: 'block.insert', activityId: activity.id, stepIndex: si, blockIndex: bi + 1, block })}
                      onRemove={() => {
                        if (window.confirm(`Remove this ${block.type} block?`)) {
                          if (editing && editing.step === si && editing.block === bi) { setEditing(null); setDraftBlock(null); }
                          sendOp({ type: 'block.remove', activityId: activity.id, stepIndex: si, blockIndex: bi });
                        }
                      }} />
                  );
                })}
              </SortableContext>
            </DndContext>
            <div className="add-block-bar">
              <span className="lbl">Add</span>
              {BLOCK_TYPES.map((bt) => (
                <button key={bt.type} className="btn" onClick={async () => {
                  const block = defaultBlock(bt.type);
                  if (await sendOp({ type: 'block.insert', activityId: activity.id, stepIndex: si, block })) {
                    setEditing({ step: si, block: step.blocks.length });
                    setDraftBlock(block);
                  }
                }}>{bt.label}</button>
              ))}
            </div>
          </div>
        </div>
      ))}
      <button className="btn" onClick={() => sendOp({ type: 'step.add', activityId: activity.id, step: { title: 'New Step' } })}>
        <Icon name="plus" size={12} /> Add step
      </button>

      <div style={{ marginTop: 24 }}>
        <div className="view-sub" style={{ marginBottom: 6 }}>Completion summary (shown when the student finishes)</div>
        <CommitInput textarea rows={2} style={{ width: '100%' }} className="field-input"
          value={activity.completionSummary?.text || ''}
          onCommit={(text) => sendOp({
            type: 'activity.setCompletion', activityId: activity.id,
            completionSummary: text ? { ...activity.completionSummary, text } : undefined,
          })} />
        <div className="small muted" style={{ marginTop: 6 }}>Concept chips (comma-separated)</div>
        <CommitInput style={{ width: '100%' }}
          value={(activity.completionSummary?.conceptsUsed || []).join(', ')}
          onCommit={(v) => sendOp({
            type: 'activity.setCompletion', activityId: activity.id,
            completionSummary: {
              ...(activity.completionSummary || { text: '' }),
              conceptsUsed: v.split(',').map((s) => s.trim()).filter(Boolean),
            },
          })} />
      </div>
    </div>
  );
}

/* ================================================================ code tab */

function StarterCodeTab({ activity }) {
  const model = store.content;
  const path = activity.workspaceFile;
  const [dirty, setDirty] = useState(null);

  if (!path) {
    return (
      <div className="empty">
        This lesson has no starter file.
        <div style={{ marginTop: 10 }}>
          <span className="small muted">Assign one in the Workspace tab, or manage files in Workspace Files.</span>
        </div>
      </div>
    );
  }
  const content = model.workspaceFiles[path];
  return (
    <div className="ws-editor" style={{ height: '100%' }}>
      <div className="ws-editor-bar">
        <Icon name="file" size={13} /> {path}
        <div style={{ flex: 1 }} />
        {dirty !== null && dirty !== content && (
          <>
            <span className="chip amber">unapplied edits</span>
            <button className="btn primary" onClick={async () => {
              if (await sendOp({ type: 'file.set', path, content: dirty })) setDirty(null);
            }}><Icon name="check" size={12} /> Apply changes</button>
            <button className="btn" onClick={() => setDirty(null)}>Discard</button>
          </>
        )}
      </div>
      <div className="ws-editor-surface">
        <Editor
          height="100%"
          language={path.endsWith('.py') ? 'python' : path.endsWith('.xml') ? 'xml' : 'plaintext'}
          theme="vs-dark"
          value={dirty ?? content}
          onChange={(v) => setDirty(v ?? '')}
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4 }}
        />
      </div>
    </div>
  );
}

/* ================================================================ workspace tab */

function WorkspaceTab({ activity }) {
  const model = store.content;
  const cfg = model.workspaceConfig;
  const per = cfg.perActivity[activity.id] || {};
  const globalT = cfg.terminals;
  const t = { ...globalT, ...(per.terminals || {}) };
  const hasTermOverride = !!per.terminals;
  const filePaths = Object.keys(model.workspaceFiles);

  const setOverride = (override) => sendOp({
    type: 'config.setActivityOverride', activityId: activity.id,
    override: Object.keys(override).length ? override : null,
  });

  const patchTerminals = (patch) => {
    const terminals = { ...(per.terminals || {}), ...patch };
    setOverride({ ...per, terminals });
  };

  return (
    <div className="view-scroll" style={{ maxWidth: 640 }}>
      <div className="view-head"><div className="view-title" style={{ fontSize: 14 }}>Starter file</div></div>
      <Field label="Workspace file the lesson opens" hint="The file referenced by the Notebook and opened in the Code Editor.">
        <select value={activity.workspaceFile || ''}
          onChange={(e) => sendOp({ type: 'activity.setMeta', activityId: activity.id, fields: { workspaceFile: e.target.value || null } })}>
          <option value="">(none — reading lesson)</option>
          {filePaths.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Default open file (optional override)" hint="If set, the Code Editor opens this file first instead of the starter file.">
        <select value={per.defaultOpenFile || ''}
          onChange={(e) => setOverride({ ...per, defaultOpenFile: e.target.value || undefined })}>
          <option value="">(same as starter file)</option>
          {filePaths.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <div className="view-head" style={{ marginTop: 20 }}>
        <div className="view-title" style={{ fontSize: 14 }}>Terminals for this lesson</div>
        {hasTermOverride
          ? <button className="btn" onClick={() => { const { terminals, ...rest } = per; setOverride(rest); }}>Reset to global</button>
          : <span className="chip gray">using global defaults</span>}
      </div>
      <div className="field-row">
        <Field label="Minimum"><input type="number" min={1} max={8} value={t.min}
          onChange={(e) => patchTerminals({ min: Number(e.target.value) })} /></Field>
        <Field label="Default"><input type="number" min={1} max={8} value={t.default}
          onChange={(e) => patchTerminals({ default: Number(e.target.value) })} /></Field>
        <Field label="Maximum"><input type="number" min={1} max={8} value={t.max}
          onChange={(e) => patchTerminals({ max: Number(e.target.value) })} /></Field>
        <Field label="Students can add">
          <select value={t.allowCreate === false ? '0' : '1'} onChange={(e) => patchTerminals({ allowCreate: e.target.value === '1' })}>
            <option value="1">Yes</option><option value="0">No</option>
          </select>
        </Field>
      </div>
      <div className="small muted">Global defaults: min {globalT.min} · default {globalT.default} · max {globalT.max}. Change them in Global Settings.</div>

      <div className="view-head" style={{ marginTop: 20 }}><div className="view-title" style={{ fontSize: 14 }}>Read-only files</div></div>
      <Field label="Files students can open but not edit in this lesson" hint="Global read-only files (Global Settings) also apply.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filePaths.map((p) => {
            const globalRo = (cfg.readOnlyFiles || []).includes(p);
            const localRo = (per.readOnlyFiles || []).includes(p);
            return (
              <label key={p} className="ro-file-row">
                <input type="checkbox" checked={localRo || globalRo} disabled={globalRo}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...(per.readOnlyFiles || []), p]
                      : (per.readOnlyFiles || []).filter((x) => x !== p);
                    setOverride({ ...per, readOnlyFiles: next.length ? next : undefined });
                  }} />
                {p}{globalRo && <span className="chip amber">global</span>}
              </label>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

/* ================================================================ metadata */

function MetadataTab({ activity, listing }) {
  const model = store.content;
  const meta = (fields) => sendOp({ type: 'activity.setMeta', activityId: activity.id, fields });
  return (
    <div className="view-scroll" style={{ maxWidth: 640 }}>
      <Field label="Title">
        <CommitInput value={activity.title} onCommit={(title) => meta({ title })} />
      </Field>
      <Field label="Summary" hint="Shown in section listings and search.">
        <CommitInput textarea value={activity.summary || ''} onCommit={(summary) => meta({ summary: summary || null })} />
      </Field>
      <div className="field-row">
        <Field label="Kind" hint="reading = Notebook only · activity = Notebook + Code Editor + Terminal">
          <select value={activity.kind} onChange={(e) => meta({ kind: e.target.value })}>
            <option value="activity">activity</option><option value="reading">reading</option>
          </select>
        </Field>
        <Field label="Difficulty">
          <select value={activity.difficulty || ''} onChange={(e) => meta({ difficulty: e.target.value || null })}>
            <option value="">(none)</option>
            <option>beginner</option><option>intermediate</option><option>advanced</option>
          </select>
        </Field>
        <Field label="Estimated time">
          <CommitInput value={activity.estimatedTime || ''} onCommit={(estimatedTime) => meta({ estimatedTime: estimatedTime || null })} />
        </Field>
      </div>
      <Field label="Related concepts (comma-separated)" hint="Used by search and the completion screen.">
        <CommitInput value={(activity.relatedConcepts || []).join(', ')}
          onCommit={(v) => meta({ relatedConcepts: v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null })} />
      </Field>

      {listing && listing.item.form !== 'placeholder' && (
        <>
          <div className="view-head" style={{ marginTop: 16 }}><div className="view-title" style={{ fontSize: 14 }}>Curriculum listing</div></div>
          <div className="field-row">
            <Field label="Listed as" hint="demo = “study this program”; real = normal lesson.">
              <select value={listing.item.form}
                onChange={(e) => sendOp({ type: 'item.convertForm', itemId: activity.id, form: e.target.value })}>
                <option value="real">real</option><option value="demo">demo</option>
              </select>
            </Field>
            <Field label="Display title override" hint="Listing-only title (e.g. “Wave” for wave-lab). Empty = use lesson title.">
              <CommitInput value={listing.item.overrides?.title || ''}
                onCommit={(v) => sendOp({
                  type: 'item.overrides', itemId: activity.id,
                  overrides: v ? { ...listing.item.overrides, title: v } : (() => { const { title, ...rest } = listing.item.overrides || {}; return rest; })(),
                })}
                disabled={listing.item.form !== 'real'} />
            </Field>
          </div>
        </>
      )}

      <div className="view-head" style={{ marginTop: 16 }}><div className="view-title" style={{ fontSize: 14 }}>Identifiers</div></div>
      <div className="small mono muted">id: {activity.id} · route: /learn/activity/{activity.id}</div>
      <div className="small muted" style={{ marginTop: 4 }}>IDs are stable once created (routes and progress records point at them), so Studio does not rename them.</div>
    </div>
  );
}
