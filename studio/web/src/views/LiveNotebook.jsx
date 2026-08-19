/* The live lesson view: an iframe onto the REAL student portal (preview
 * server, real components/CSS/renderer) with the edit-overlay script
 * (studio/preview/edit-overlay.js) doing the in-page editing affordances.
 *
 * This component is the postMessage bridge, nothing more — every content
 * change still goes op -> sendOp -> draft -> adapters, exactly like every
 * other Studio view. It never writes source files directly. The bridge:
 *
 *   overlay "studio:hello"    -> we send the current activity + edit mode
 *   overlay "studio:op"       -> sendOp(op)
 *   overlay "studio:insert"   -> sendOp(block.insert) + open the inspector
 *   overlay "studio:selected" -> open the inspector on that block
 *   store updates (any tab)   -> we push the fresh activity back in
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { sendOp, PREVIEW_BASE } from '../api.js';
import { Icon } from '../common.jsx';
import { BlockForm, defaultBlock } from './blocks.jsx';

const PREVIEW_ORIGIN = new URL(PREVIEW_BASE).origin;

export default function LiveNotebook({ activity, mode, focus }) {
  const iframeRef = useRef(null);
  const frameReadyRef = useRef(false);
  const lastPostedRef = useRef('');
  const pendingSelectRef = useRef(null);
  const debounceRef = useRef(null);
  const activityRef = useRef(activity);
  activityRef.current = activity;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const [selected, setSelected] = useState(null); // { step, block }
  const [draftBlock, setDraftBlock] = useState(null);

  const post = useCallback((msg) => {
    iframeRef.current?.contentWindow?.postMessage(msg, PREVIEW_ORIGIN);
  }, []);

  const flushDraft = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    setSelected((sel) => {
      if (sel) {
        setDraftBlock((db) => {
          const current = activityRef.current.steps[sel.step]?.blocks?.[sel.block];
          if (current && db && JSON.stringify(current) !== JSON.stringify(db)) {
            sendOp({ type: 'block.set', activityId: activityRef.current.id, stepIndex: sel.step, blockIndex: sel.block, block: db });
          }
          return db;
        });
      }
      return sel;
    });
  }, []);

  const closeInspector = useCallback(() => {
    flushDraft();
    setSelected(null);
    setDraftBlock(null);
    post({ type: 'studio:deselect' });
  }, [flushDraft, post]);

  /* -------------------------------------------------------------- bridge */
  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== PREVIEW_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      const msg = e.data || {};
      if (msg.type === 'studio:hello') {
        frameReadyRef.current = true;
        lastPostedRef.current = JSON.stringify(activityRef.current);
        post({ type: 'studio:init', activity: activityRef.current, editMode: mode === 'edit' });
        const f = focusRef.current;
        if (f && typeof f.stepIndex === 'number') {
          const block = activityRef.current.steps[f.stepIndex]?.blocks?.[f.blockIndex];
          if (typeof f.blockIndex === 'number' && block) {
            setSelected({ step: f.stepIndex, block: f.blockIndex });
            setDraftBlock(block);
          }
          post({ type: 'studio:scrollTo', step: f.stepIndex });
        }
      } else if (msg.type === 'studio:op') {
        sendOp(msg.op);
      } else if (msg.type === 'studio:insert') {
        const block = defaultBlock(msg.blockType);
        pendingSelectRef.current = { step: msg.step, block: msg.index };
        setSelected({ step: msg.step, block: msg.index });
        setDraftBlock(block);
        sendOp({ type: 'block.insert', activityId: activityRef.current.id, stepIndex: msg.step, blockIndex: msg.index, block });
      } else if (msg.type === 'studio:selected') {
        flushDraft();
        setSelected({ step: msg.step, block: msg.block });
        setDraftBlock(msg.blockData);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [mode, post, flushDraft]);

  /* Switching lessons: the iframe remounts (key={activity.id}); reset the
   * handshake state that belongs to the old document. */
  useEffect(() => {
    frameReadyRef.current = false;
    lastPostedRef.current = '';
    setSelected(null);
    setDraftBlock(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  /* Push fresh content whenever the draft model changes (from ANY source —
   * this tab's own edits, or another Studio tab touching the same lesson). */
  useEffect(() => {
    if (!frameReadyRef.current) return;
    const json = JSON.stringify(activity);
    if (json === lastPostedRef.current) return;
    lastPostedRef.current = json;
    const select = pendingSelectRef.current;
    pendingSelectRef.current = null;
    post({ type: 'studio:activity', activity, select });
    // Re-sync the inspector's draft with ground truth once no local edit is
    // in flight, so e.g. a revert-from-Changes-view is reflected here too.
    if (selected && !debounceRef.current) {
      const fresh = activity.steps[selected.step]?.blocks?.[selected.block];
      if (fresh) setDraftBlock(fresh); else setSelected(null);
    }
  }, [activity, post, selected]);

  /* Edit <-> Preview toggle. */
  useEffect(() => {
    if (!frameReadyRef.current) return;
    if (mode !== 'edit') closeInspector();
    post({ type: 'studio:init', activity: activityRef.current, editMode: mode === 'edit' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function handleInspectorChange(next) {
    setDraftBlock(next);
    if (selected) {
      const patched = {
        ...activityRef.current,
        steps: activityRef.current.steps.map((s, i) => (i !== selected.step ? s : {
          ...s, blocks: s.blocks.map((b, j) => (j !== selected.block ? b : next)),
        })),
      };
      post({ type: 'studio:activity', activity: patched, select: selected }); // optimistic, instant
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (selected) sendOp({ type: 'block.set', activityId: activityRef.current.id, stepIndex: selected.step, blockIndex: selected.block, block: next });
    }, 500);
  }

  function deleteSelected() {
    if (!selected || !window.confirm(`Delete this ${draftBlock.type} block?`)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    sendOp({ type: 'block.remove', activityId: activity.id, stepIndex: selected.step, blockIndex: selected.block });
    setSelected(null);
    setDraftBlock(null);
    post({ type: 'studio:deselect' });
  }

  return (
    <div className="live-nb-wrap">
      {mode === 'edit' && <StepsBar activity={activity} onJump={(i) => post({ type: 'studio:scrollTo', step: i })} />}
      <div className="live-nb-body">
        <iframe
          ref={iframeRef}
          key={activity.id}
          src={`${PREVIEW_BASE}/learn/activity/${activity.id}`}
          title="Lesson"
          className="live-nb-frame"
        />
        {selected && draftBlock && (
          <div className="inspector-panel">
            <div className="inspector-head">
              <span className="chip blue">{draftBlock.type}</span>
              <span className="small muted">step {selected.step + 1} · block {selected.block + 1}</span>
              <div style={{ flex: 1 }} />
              <button className="btn ghost btn-icon" onClick={closeInspector} title="Close"><Icon name="close" size={13} /></button>
            </div>
            <div className="inspector-body">
              <BlockForm block={draftBlock} onChange={handleInspectorChange} />
            </div>
            <div className="inspector-foot">
              <button className="btn danger" onClick={deleteSelected}><Icon name="trash" size={12} /> Delete block</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepsBar({ activity, onJump }) {
  const ids = activity.steps.map((s) => s.id);
  return (
    <div className="steps-bar">
      {activity.steps.map((s, i) => (
        <div className="steps-bar-chip" key={s.id}>
          <button className="steps-bar-jump" onClick={() => onJump(i)} title="Scroll to this step">{i + 1}. {s.title}</button>
          <button className="btn ghost btn-icon" disabled={i === 0} title="Move step up"
            onClick={() => sendOp({ type: 'step.reorder', activityId: activity.id, order: arrayMove(ids, i, i - 1) })}>↑</button>
          <button className="btn ghost btn-icon" disabled={i === activity.steps.length - 1} title="Move step down"
            onClick={() => sendOp({ type: 'step.reorder', activityId: activity.id, order: arrayMove(ids, i, i + 1) })}>↓</button>
          <button className="btn ghost btn-icon danger" disabled={activity.steps.length <= 1} title="Delete step"
            onClick={() => {
              if (window.confirm(`Delete step "${s.title}" and its ${s.blocks.length} block(s)?`)) {
                sendOp({ type: 'step.remove', activityId: activity.id, stepIndex: i });
              }
            }}><Icon name="trash" size={11} /></button>
        </div>
      ))}
      <button className="btn" onClick={() => sendOp({ type: 'step.add', activityId: activity.id, step: { title: 'New Step' } })}>
        <Icon name="plus" size={11} /> Step
      </button>
      <span className="small muted" style={{ marginLeft: 'auto' }}>Click text to edit in place · ☰ or + to insert · ⋮⋮ to drag</span>
    </div>
  );
}
