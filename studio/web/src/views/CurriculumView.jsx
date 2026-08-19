/* Curriculum manager — the real Section → Item hierarchy with drag-and-drop
 * reordering and cross-section moves, matching the live curriculum.js
 * architecture (real/demo/placeholder listing forms; hide = unlist, content
 * preserved — same pattern the file already documents).
 */
import React, { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { store, sendOp, sendOps, toast } from '../api.js';
import { Icon, Modal, Field, CommitInput, IconPicker } from '../common.jsx';

function itemDisplay(model, item) {
  if (item.form === 'placeholder') return { title: item.title || item.id, chip: 'planned', kind: 'placeholder' };
  const a = model.activities[item.id];
  const title = (item.overrides && item.overrides.title) || (a ? a.title : item.id);
  return { title, chip: item.form === 'demo' ? 'demo' : (a && a.kind === 'reading' ? 'reading' : 'lab'), kind: a ? a.kind : '?' };
}

function SortableItemRow({ item, section, nav, model, onAction }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { sectionId: section.id } });
  const d = itemDisplay(model, item);
  const chipCls = { planned: 'gray', demo: 'purple', reading: 'green', lab: 'blue' }[d.chip] || 'gray';
  return (
    <div ref={setNodeRef} className={`item-row${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      <span className="grip" {...attributes} {...listeners}><Icon name="grip" size={13} /></span>
      <span className="item-num">{item.number}</span>
      <span className="item-title" onClick={() => item.form !== 'placeholder' && nav.openLesson(item.id)}>
        {d.title}
      </span>
      <span className={`chip ${chipCls}`}>{d.chip}</span>
      <div className="item-actions">
        {item.form !== 'placeholder' && (
          <button className="btn" onClick={() => nav.openLesson(item.id)} title="Edit lesson"><Icon name="edit" size={12} /></button>
        )}
        <button className="btn" onClick={() => onAction('duplicate', item)} title="Duplicate"
          disabled={item.form === 'placeholder'}><Icon name="copy" size={12} /></button>
        <button className="btn" onClick={() => onAction('hide', item)} title="Hide (unlist — content preserved)"><Icon name="eyeOff" size={12} /></button>
        <button className="btn danger" onClick={() => onAction('delete', item)} title="Delete permanently"><Icon name="trash" size={12} /></button>
      </div>
    </div>
  );
}

export default function CurriculumView({ nav }) {
  const model = store.content;
  const [collapsed, setCollapsed] = useState({});
  const [activeDrag, setActiveDrag] = useState(null);
  const [modal, setModal] = useState(null); // {type, ...}
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sections = model.curriculum.sections;
  const hiddenActivities = useMemo(() => {
    const listed = new Set(sections.flatMap((s) => s.items.map((i) => i.id)));
    return Object.values(model.activities).filter((a) => !listed.has(a.id));
  }, [model, sections]);

  const findItemSection = (itemId) => sections.find((s) => s.items.some((i) => i.id === itemId));

  async function onDragEnd({ active, over }) {
    setActiveDrag(null);
    if (!over || active.id === over.id) return;
    const fromSection = findItemSection(active.id);
    let toSection = findItemSection(over.id);
    let toIndex;
    if (toSection) {
      toIndex = toSection.items.findIndex((i) => i.id === over.id);
    } else if (String(over.id).startsWith('sectionDrop:')) {
      toSection = sections.find((s) => s.id === String(over.id).slice('sectionDrop:'.length));
      toIndex = toSection ? toSection.items.length : 0;
    }
    if (!fromSection || !toSection) return;
    if (fromSection.id === toSection.id) {
      const oldIndex = fromSection.items.findIndex((i) => i.id === active.id);
      const order = arrayMove(fromSection.items.map((i) => i.id), oldIndex, toIndex);
      await sendOp({ type: 'item.reorder', sectionId: fromSection.id, order });
    } else {
      await sendOp({ type: 'item.move', itemId: active.id, toSectionId: toSection.id, toIndex });
    }
  }

  async function onItemAction(action, item) {
    const d = itemDisplay(model, item);
    if (action === 'duplicate') {
      setModal({ type: 'duplicate', item, title: `${d.title} (Copy)` });
    } else if (action === 'hide') {
      if (window.confirm(`Hide "${d.title}" from the curriculum?\n\nIts content stays in learning-path.js (the existing unlisted-content pattern) and it can be restored later from the Hidden list.`)) {
        await sendOp({ type: 'item.hide', itemId: item.id });
      }
    } else if (action === 'delete') {
      if (item.form === 'placeholder') {
        if (window.confirm(`Remove planned placeholder "${d.title}"?`)) {
          await sendOp({ type: 'item.hide', itemId: item.id });
        }
        return;
      }
      const a = model.activities[item.id];
      if (window.confirm(`PERMANENTLY DELETE "${d.title}"?\n\nThis removes the lesson content (${a.steps.length} step(s)) from learning-path.js — recoverable only through Git history.`)
        && window.confirm(`Really delete "${d.title}" permanently? This is the destructive one.`)) {
        await sendOp({ type: 'activity.remove', activityId: item.id });
      }
    }
  }

  const dragItem = activeDrag ? sections.flatMap((s) => s.items).find((i) => i.id === activeDrag) : null;

  return (
    <div className="view">
      <div className="view-scroll">
        <div className="view-head">
          <div>
            <div className="view-title">{model.curriculum.title}</div>
            <div className="view-sub">{sections.length} sections · {sections.reduce((n, s) => n + s.items.length, 0)} items · drag to reorder or move between sections</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setModal({ type: 'addSection' })}><Icon name="plus" size={12} /> Section</button>
          <button className="btn primary" onClick={() => setModal({ type: 'newLesson' })}><Icon name="plus" size={12} /> New Lesson</button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveDrag(active.id)} onDragEnd={onDragEnd} onDragCancel={() => setActiveDrag(null)}>
          {sections.map((section, si) => (
            <div className="section-card" key={section.id}>
              <div className="section-head" onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}>
                <Icon name={collapsed[section.id] ? 'chevronRight' : 'chevronDown'} size={13} />
                <span className="section-num">{section.number}</span>
                <Icon name={section.icon} size={15} />
                <span className="section-title">{section.title}</span>
                {section.levelLabel && <span className="chip blue">{section.levelLabel}</span>}
                <span className="chip gray">{section.items.length}</span>
                <div className="section-meta" onClick={(e) => e.stopPropagation()}>
                  <button className="btn ghost btn-icon" disabled={si === 0} title="Move section up"
                    onClick={() => sendOp({ type: 'section.reorder', order: arrayMove(sections.map((s) => s.id), si, si - 1) })}>↑</button>
                  <button className="btn ghost btn-icon" disabled={si === sections.length - 1} title="Move section down"
                    onClick={() => sendOp({ type: 'section.reorder', order: arrayMove(sections.map((s) => s.id), si, si + 1) })}>↓</button>
                  <button className="btn ghost btn-icon" title="Section settings"
                    onClick={() => setModal({ type: 'editSection', section })}><Icon name="edit" size={12} /></button>
                </div>
              </div>
              {!collapsed[section.id] && (
                <SortableContext items={section.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {section.items.map((item) => (
                    <SortableItemRow key={item.id} item={item} section={section} nav={nav} model={model} onAction={onItemAction} />
                  ))}
                  {section.items.length === 0 && (
                    <DropZone id={`sectionDrop:${section.id}`} />
                  )}
                </SortableContext>
              )}
            </div>
          ))}
          <DragOverlay>
            {dragItem && (
              <div className="item-row" style={{ background: 'var(--bg-active)', border: '1px solid var(--accent)', borderRadius: 6 }}>
                <span className="item-num">{dragItem.number}</span>
                <span className="item-title">{itemDisplay(model, dragItem).title}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {hiddenActivities.length > 0 && (
          <div className="section-card">
            <div className="section-head" style={{ cursor: 'default' }}>
              <Icon name="eyeOff" size={14} />
              <span className="section-title">Hidden content</span>
              <span className="chip gray">{hiddenActivities.length}</span>
              <span className="view-sub" style={{ marginLeft: 8 }}>in learning-path.js but not listed — restore or leave as archive</span>
            </div>
            {hiddenActivities.map((a) => (
              <div className="item-row" key={a.id}>
                <span className="item-num mono" style={{ width: 'auto' }}>{a.id}</span>
                <span className="item-title" onClick={() => nav.openLesson(a.id)}>{a.title}</span>
                <div className="item-actions" style={{ opacity: 1 }}>
                  <button className="btn" onClick={() => setModal({ type: 'restore', activity: a })}>Restore</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal?.type === 'editSection' && <EditSectionModal section={modal.section} onClose={() => setModal(null)} />}
      {modal?.type === 'addSection' && <AddSectionModal onClose={() => setModal(null)} />}
      {modal?.type === 'newLesson' && <NewLessonModal onClose={() => setModal(null)} nav={nav} />}
      {modal?.type === 'duplicate' && <DuplicateModal item={modal.item} onClose={() => setModal(null)} />}
      {modal?.type === 'restore' && <RestoreModal activity={modal.activity} onClose={() => setModal(null)} />}
    </div>
  );
}

function DropZone({ id }) {
  const { setNodeRef } = useSortable({ id, disabled: true });
  return <div ref={setNodeRef} className="item-row" style={{ color: 'var(--faint)', fontSize: 11.5 }}>Drop items here</div>;
}

function EditSectionModal({ section, onClose }) {
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description || '');
  const [icon, setIcon] = useState(section.icon);
  const [levelLabel, setLevelLabel] = useState(section.levelLabel || '');
  const realCount = section.items.filter((i) => i.form !== 'placeholder').length;
  return (
    <Modal title={`Section — ${section.title}`} onClose={onClose} footer={
      <>
        <button className="btn danger" disabled={realCount > 0}
          title={realCount ? `${realCount} real item(s) still listed — move or hide them first` : 'Remove this section'}
          onClick={async () => {
            if (window.confirm(`Remove section "${section.title}"?`)) {
              if (await sendOp({ type: 'section.remove', sectionId: section.id })) onClose();
            }
          }}>Delete section</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={async () => {
          const ops = [];
          if (title !== section.title) ops.push({ type: 'section.rename', sectionId: section.id, title });
          if (description !== (section.description || '')) ops.push({ type: 'section.describe', sectionId: section.id, description });
          if (icon !== section.icon) ops.push({ type: 'section.icon', sectionId: section.id, icon });
          if (levelLabel !== (section.levelLabel || '')) ops.push({ type: 'section.levelLabel', sectionId: section.id, levelLabel: levelLabel || null });
          if (ops.length) await sendOps(ops);
          onClose();
        }}>Apply</button>
      </>
    }>
      <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Level label" hint="Shown as a chip, e.g. “Level 1”. Leave empty for none.">
        <input value={levelLabel} onChange={(e) => setLevelLabel(e.target.value)} placeholder="(none)" />
      </Field>
      <Field label="Icon"><IconPicker iconNames={store.iconNames} value={icon} onChange={setIcon} /></Field>
    </Modal>
  );
}

function AddSectionModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('lab');
  const [icon, setIcon] = useState('layers');
  const autoId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (
    <Modal title="Add section" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!title.trim()} onClick={async () => {
          if (await sendOp({ type: 'section.add', section: { id: id || autoId, title, description, type, icon } })) onClose();
        }}>Add section</button>
      </>
    }>
      <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <Field label="ID" hint="Used in URLs (/learn/section/<id>). Auto-generated from the title.">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder={autoId || 'section-id'} className="mono" />
      </Field>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="field-row">
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="reading">reading</option><option value="demo">demo</option><option value="lab">lab</option>
          </select>
        </Field>
      </div>
      <Field label="Icon"><IconPicker iconNames={store.iconNames} value={icon} onChange={setIcon} /></Field>
    </Modal>
  );
}

const NOTEBOOK_TEMPLATES = {
  blank: { label: 'Blank (single overview step)', steps: null },
  lab: {
    label: 'Guided lab (Goal → Build → Run → Recap)',
    steps: (title) => [
      { id: 'goal', title: 'The Goal', blocks: [{ type: 'lead', text: `What you will build in ${title}, and why it matters.` }] },
      { id: 'build', title: 'Build It', blocks: [{ type: 'p', text: 'Step-by-step instructions go here.' }] },
      { id: 'run', title: 'Run and Test', blocks: [{ type: 'p', text: 'How to run the program and what you should see.' }] },
      { id: 'recap', title: 'Recap', blocks: [{ type: 'p', text: 'What the student just used and learned.' }] },
    ],
  },
  reading: {
    label: 'Reading (two sections)',
    steps: () => [
      { id: 'main', title: 'Overview', blocks: [{ type: 'lead', text: 'Introduce the idea.' }] },
      { id: 'details', title: 'Details', blocks: [{ type: 'p', text: 'Explain the details.' }] },
    ],
  },
};

const STARTER_TEMPLATE = (title) => `"""
Lab: ${title}

Purpose:
Describe what this starter file is for.
"""

from time import sleep
from swayform.motion import MotionClient


def main():
    client = MotionClient()
    # TODO: student work goes here
    client.idle()


if __name__ == "__main__":
    main()
`;

function NewLessonModal({ onClose, nav }) {
  const model = store.content;
  const [title, setTitle] = useState('');
  const [id, setId] = useState('');
  const [sectionId, setSectionId] = useState(model.curriculum.sections[0].id);
  const [kind, setKind] = useState('activity');
  const [difficulty, setDifficulty] = useState('beginner');
  const [estimatedTime, setEstimatedTime] = useState('25 minutes');
  const [summary, setSummary] = useState('');
  const [template, setTemplate] = useState('lab');
  const [starter, setStarter] = useState('new');
  const [starterExisting, setStarterExisting] = useState('');
  const autoId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const finalId = id || autoId;

  return (
    <Modal title="New lesson" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!title.trim() || !finalId} onClick={async () => {
          const ops = [];
          let workspaceFile;
          if (kind === 'activity' && starter === 'new') {
            workspaceFile = `ros2_ws/src/swayform_labs/${finalId.replace(/-/g, '_')}.py`;
            if (model.workspaceFiles[workspaceFile] !== undefined) {
              toast(`Workspace file ${workspaceFile} already exists`, 'error');
              return;
            }
            ops.push({ type: 'file.add', path: workspaceFile, content: STARTER_TEMPLATE(title) });
          } else if (kind === 'activity' && starter === 'existing' && starterExisting) {
            workspaceFile = starterExisting;
          }
          const tmpl = NOTEBOOK_TEMPLATES[template];
          ops.push({
            type: 'activity.add',
            activity: {
              id: finalId, title, kind, summary: summary || undefined,
              difficulty: kind === 'activity' ? difficulty : undefined,
              estimatedTime, workspaceFile,
              steps: tmpl.steps ? tmpl.steps(title) : undefined,
            },
            listing: { sectionId, form: 'real' },
          });
          if (await sendOps(ops)) {
            onClose();
            nav.openLesson(finalId);
          }
        }}>Create lesson</button>
      </>
    }>
      <Field label="Lesson name"><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <div className="field-row">
        <Field label="ID" hint={`Route: /learn/activity/${finalId || '…'}`}>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder={autoId || 'lesson-id'} className="mono" />
        </Field>
        <Field label="Section">
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {model.curriculum.sections.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}
          </select>
        </Field>
      </div>
      <div className="field-row">
        <Field label="Type" hint="reading = Notebook only; activity = full workspace">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="activity">activity (lab)</option>
            <option value="reading">reading</option>
          </select>
        </Field>
        {kind === 'activity' && (
          <Field label="Difficulty">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>beginner</option><option>intermediate</option><option>advanced</option>
            </select>
          </Field>
        )}
        <Field label="Estimated time"><input value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} /></Field>
      </div>
      <Field label="Description / summary"><textarea value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
      <Field label="Notebook template">
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          {Object.entries(NOTEBOOK_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
      </Field>
      {kind === 'activity' && (
        <div className="field-row">
          <Field label="Starter code">
            <select value={starter} onChange={(e) => setStarter(e.target.value)}>
              <option value="new">Create new starter file</option>
              <option value="existing">Use existing file</option>
              <option value="none">No starter file</option>
            </select>
          </Field>
          {starter === 'existing' && (
            <Field label="File">
              <select value={starterExisting} onChange={(e) => setStarterExisting(e.target.value)}>
                <option value="">— choose —</option>
                {Object.keys(model.workspaceFiles).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}

function DuplicateModal({ item, onClose }) {
  const model = store.content;
  const src = model.activities[item.id];
  const [title, setTitle] = useState(`${src.title} (Copy)`);
  const [newId, setNewId] = useState('');
  const autoId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (
    <Modal title={`Duplicate — ${src.title}`} onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={async () => {
          if (await sendOp({ type: 'activity.duplicate', activityId: item.id, newId: newId || autoId, newTitle: title })) onClose();
        }}>Duplicate</button>
      </>
    }>
      <Field label="New title"><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <Field label="New ID" hint="Notebook, starter code, files, metadata and workspace settings are copied; the starter file is copied to a new path.">
        <input className="mono" value={newId} onChange={(e) => setNewId(e.target.value)} placeholder={autoId} />
      </Field>
    </Modal>
  );
}

function RestoreModal({ activity, onClose }) {
  const model = store.content;
  const [sectionId, setSectionId] = useState(model.curriculum.sections[0].id);
  const [form, setForm] = useState('real');
  return (
    <Modal title={`Restore — ${activity.title}`} onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={async () => {
          if (await sendOp({ type: 'item.restore', itemId: activity.id, sectionId, form })) onClose();
        }}>Restore to curriculum</button>
      </>
    }>
      <Field label="Section">
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {model.curriculum.sections.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}
        </select>
      </Field>
      <Field label="List as">
        <select value={form} onChange={(e) => setForm(e.target.value)}>
          <option value="real">real (normal lesson)</option>
          <option value="demo">demo (study walkthrough)</option>
        </select>
      </Field>
    </Modal>
  );
}
