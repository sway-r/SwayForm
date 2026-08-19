/* Studio search across the draft-merged content model: titles, notebook
 * text, code, workspace files. Returns typed hits the UI can jump to.
 */

function snippet(text, q, radius = 60) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

function blockText(blk) {
  const parts = [];
  if (blk.text) parts.push(blk.text);
  if (blk.label) parts.push(blk.label);
  if (blk.code) parts.push(blk.code);
  if (blk.hint) parts.push(blk.hint);
  if (blk.caption) parts.push(blk.caption);
  if (Array.isArray(blk.items)) {
    for (const it of blk.items) {
      if (typeof it === 'string') parts.push(it);
      else if (it && typeof it === 'object') parts.push(...Object.values(it).filter((v) => typeof v === 'string'));
    }
  }
  if (Array.isArray(blk.lines)) parts.push(...blk.lines);
  if (Array.isArray(blk.headers)) parts.push(...blk.headers);
  if (Array.isArray(blk.rows)) blk.rows.forEach((r) => parts.push(...r.map(String)));
  if (blk.solution) {
    if (blk.solution.text) parts.push(blk.solution.text);
    if (blk.solution.code && blk.solution.code.code) parts.push(blk.solution.code.code);
  }
  return parts.join('\n');
}

export function searchContent(model, query, limit = 60) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  const push = (hit) => { if (hits.length < limit) hits.push(hit); };

  for (const s of model.curriculum.sections) {
    if (s.title.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)) {
      push({ type: 'section', sectionId: s.id, title: s.title, snippet: snippet(s.description || s.title, q) });
    }
  }

  for (const [id, a] of Object.entries(model.activities)) {
    const meta = [a.title, a.summary || '', ...(a.relatedConcepts || [])].join(' ');
    if (meta.toLowerCase().includes(q)) {
      push({ type: 'activity', activityId: id, title: a.title, snippet: snippet(meta, q) });
    }
    a.steps.forEach((st, sti) => {
      if (st.title.toLowerCase().includes(q)) {
        push({ type: 'step', activityId: id, stepIndex: sti, title: `${a.title} · ${st.title}`, snippet: st.title });
      }
      st.blocks.forEach((blk, bi) => {
        const text = blockText(blk);
        if (text.toLowerCase().includes(q)) {
          push({
            type: 'block', activityId: id, stepIndex: sti, blockIndex: bi,
            title: `${a.title} · ${st.title} · ${blk.type}`,
            snippet: snippet(text, q),
          });
        }
      });
    });
  }

  for (const [path, content] of Object.entries(model.workspaceFiles)) {
    if (path.toLowerCase().includes(q) || content.toLowerCase().includes(q)) {
      push({ type: 'file', path, title: path, snippet: snippet(content, q, 40) });
    }
  }

  return hits;
}
