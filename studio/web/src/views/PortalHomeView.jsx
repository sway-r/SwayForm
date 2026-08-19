/* Portal Home (desktop) editor — the icon canvas mirrors the real desktop's
 * flex-flow layout (portal.css .desktop-icons), so ordering is the honest
 * positioning model: drag to reorder, click to edit. The live preview below
 * is the real portal desktop.
 *
 * The desktop lays icons out responsively (flex wrap) by design — Studio
 * deliberately does NOT introduce absolute pixel positions (brief §7).
 */
import React, { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { store, sendOp } from '../api.js';
import { Icon, Field, CommitInput, IconPicker } from '../common.jsx';
import PreviewPane from './PreviewPane.jsx';

function SortableDeskIcon({ app, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`desk-icon${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect(app.id)}>
      <span className="glyph"><Icon name={app.icon} size={21} /></span>
      <span className="lbl">{app.title}</span>
    </div>
  );
}

export default function PortalHomeView() {
  const model = store.content;
  const apps = model.portalHome.apps;
  const enabled = apps.filter((a) => a.enabled);
  const disabled = apps.filter((a) => !a.enabled);
  const [selectedId, setSelectedId] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selected = apps.find((a) => a.id === selectedId);

  return (
    <div className="view">
      <div className="view-scroll">
        <div className="view-head">
          <div>
            <div className="view-title">Portal Home</div>
            <div className="view-sub">The desktop students see after login — drag icons to reorder, click to edit. Layout stays responsive (no pixel positioning).</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className={`btn${showPreview ? ' primary' : ''}`} onClick={() => setShowPreview(!showPreview)}>
            <Icon name="eye" size={13} /> Live preview
          </button>
        </div>

        <div className="desk-canvas">
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;
              const ids = enabled.map((a) => a.id);
              const order = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
              sendOp({ type: 'app.order', order: [...order, ...disabled.map((a) => a.id)] });
            }}>
            <SortableContext items={enabled.map((a) => a.id)} strategy={rectSortingStrategy}>
              <div className="desk-icons">
                {enabled.map((app) => (
                  <SortableDeskIcon key={app.id} app={app} selected={selectedId === app.id} onSelect={setSelectedId} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {disabled.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="view-sub" style={{ marginBottom: 6 }}>Hidden icons (app still reachable by URL, icon not shown)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {disabled.map((app) => (
                <div key={app.id} className="desk-icon disabled" style={{ cursor: 'pointer' }} onClick={() => setSelectedId(app.id)}>
                  <span className="glyph"><Icon name={app.icon} size={21} /></span>
                  <span className="lbl">{app.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div style={{ marginTop: 18, maxWidth: 560, border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--bg-raised)' }}>
            <div className="view-head" style={{ marginBottom: 8 }}>
              <div className="view-title" style={{ fontSize: 14 }}>{selected.title}</div>
              <span className="chip gray mono">{selected.id}</span>
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={() => sendOp({ type: 'app.enable', appId: selected.id, enabled: !selected.enabled })}>
                {selected.enabled ? <><Icon name="eyeOff" size={12} /> Hide icon</> : <><Icon name="eye" size={12} /> Show icon</>}
              </button>
            </div>
            <div className="field-row">
              <Field label="Label" hint="Shown under the icon, in the window title bar, and the taskbar.">
                <CommitInput value={selected.title} onCommit={(title) => sendOp({ type: 'app.rename', appId: selected.id, title })} />
              </Field>
              <Field label="Default window size">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <CommitInput type="number" style={{ width: 80 }} value={String(selected.defaultSize?.w || 900)}
                    onCommit={(w) => sendOp({ type: 'app.size', appId: selected.id, w: Number(w), h: selected.defaultSize?.h || 620 })} />
                  ×
                  <CommitInput type="number" style={{ width: 80 }} value={String(selected.defaultSize?.h || 620)}
                    onCommit={(h) => sendOp({ type: 'app.size', appId: selected.id, w: selected.defaultSize?.w || 900, h: Number(h) })} />
                </div>
              </Field>
            </div>
            <Field label="Icon (portal icon set)">
              <IconPicker iconNames={store.iconNames} value={selected.icon}
                onChange={(icon) => sendOp({ type: 'app.icon', appId: selected.id, icon })} />
            </Field>
            <div className="small muted">
              What this icon opens is the app module itself ({selected.id}) — new desktop apps are code, created in the repo rather than in Studio.
            </div>
          </div>
        )}
      </div>
      {showPreview && <PreviewPane path="/" width={560} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
