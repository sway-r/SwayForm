/* Generic content-block renderer — shared by the Learn app's lesson pane
   and the Help app's reference viewer. Renders plain-data "blocks" (see
   portal/data/learning-path.js and portal/data/reference.js for the schema)
   into DOM nodes. No HTML strings are built from untrusted content — every
   text field is escaped, and only a small whitelist of inline markup
   (**bold**, `code`, [label](url)) is turned into real elements.

   'reveal' block: { type:'reveal', hint: string, solution?: { text?: string,
   code?: {lang, filename, code} } } — hint is always visible, solution is
   gated behind a Show Solution toggle (same accordion pattern as
   'troubleshoot'). Used by Control lab "Need Help?" sections. */
import { icon } from '../../icons.js';

function el(tag, cls, html){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function escapeHtml(s){
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Turns escaped text containing **bold**, `code`, [label](url) into HTML. */
function inlineHtml(raw){
  let s = escapeHtml(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}

function renderBlock(block, ctx){
  switch (block.type){
    case 'lead':
      return el('p', 'cb-lead', inlineHtml(block.text));

    case 'heading': {
      const h = el(block.level === 3 ? 'h4' : 'h3', block.level === 3 ? 'cb-h3' : 'cb-h2', inlineHtml(block.text));
      if (block.id) h.id = block.id;
      return h;
    }

    case 'p':
      return el('p', 'cb-p', inlineHtml(block.text));

    case 'list': {
      const ul = el('ul', 'cb-list');
      (block.items || []).forEach((it) => ul.appendChild(el('li', 'cb-li', inlineHtml(it))));
      return ul;
    }

    case 'steps': {
      const ol = el('ol', 'cb-steps');
      (block.items || []).forEach((it) => ol.appendChild(el('li', 'cb-step', inlineHtml(it))));
      return ol;
    }

    case 'checklist': {
      const wrap = el('div', 'cb-checklist');
      (block.items || []).forEach((it) => {
        const row = el('div', 'cb-check');
        row.innerHTML = `<span class="cb-check-icon">${icon('check')}</span><span></span>`;
        row.lastChild.innerHTML = inlineHtml(it);
        wrap.appendChild(row);
      });
      return wrap;
    }

    case 'callout': {
      const tone = block.tone || 'note';
      const iconName = tone === 'safety' ? 'shield' : tone === 'warn' ? 'warning' : tone === 'tip' ? 'tip' : 'info';
      const label = block.label || (tone === 'safety' ? 'Safety' : tone === 'warn' ? 'Warning' : tone === 'tip' ? 'Tip' : 'Note');
      const wrap = el('div', `cb-callout ${tone}`);
      wrap.innerHTML = `<div class="cb-callout-lbl">${icon(iconName)}${escapeHtml(label)}</div><p>${inlineHtml(block.text)}</p>`;
      return wrap;
    }

    case 'divider':
      return el('div', 'cb-divider');

    case 'terminal': {
      const wrap = el('div', 'cb-term');
      wrap.innerHTML = `<div class="cb-term-bar"><span class="cb-term-dot r"></span><span class="cb-term-dot y"></span><span class="cb-term-dot g"></span><span class="cb-term-lbl">Terminal</span></div><div class="cb-term-body"></div>`;
      wrap.querySelector('.cb-term-body').textContent = (block.lines || []).join('\n');
      return wrap;
    }

    case 'table': {
      const scroller = el('div', 'cb-table-scroll');
      const table = el('table', 'cb-table');
      const thead = el('thead');
      const trh = el('tr');
      (block.headers || []).forEach((h) => trh.appendChild(el('th', null, escapeHtml(h))));
      thead.appendChild(trh);
      const tbody = el('tbody');
      (block.rows || []).forEach((row) => {
        const tr = el('tr');
        row.forEach((cell) => tr.appendChild(el('td', null, escapeHtml(cell))));
        tbody.appendChild(tr);
      });
      table.appendChild(thead); table.appendChild(tbody);
      scroller.appendChild(table);
      return scroller;
    }

    case 'terms': {
      const wrap = el('div', 'cb-terms');
      (block.items || []).forEach((t) => {
        const item = el('div', 'cb-term-item');
        item.innerHTML = `<div class="cb-term-word">${escapeHtml(t.term)}</div><div class="cb-term-def">${inlineHtml(t.def)}</div>`;
        wrap.appendChild(item);
      });
      return wrap;
    }

    case 'troubleshoot': {
      const wrap = el('div');
      (block.items || []).forEach((t) => {
        const item = el('div', 'cb-tr-item');
        item.innerHTML = `
          <button type="button" class="cb-tr-hdr"><span class="cb-tr-symp">${escapeHtml(t.symptom)}</span><span class="cb-tr-plus">+</span></button>
          <div class="cb-tr-body">
            ${t.cause ? `<div class="cb-tr-row"><div class="cb-tr-lbl">Likely cause</div><div class="cb-tr-val">${inlineHtml(t.cause)}</div></div>` : ''}
            <div class="cb-tr-row"><div class="cb-tr-lbl">Fix</div><div class="cb-tr-fix">${inlineHtml(t.fix)}</div></div>
          </div>`;
        item.querySelector('.cb-tr-hdr').addEventListener('click', () => item.classList.toggle('open'));
        wrap.appendChild(item);
      });
      return wrap;
    }

    /* Hint always visible; Show Solution gated behind the same collapsible
       accordion pattern as 'troubleshoot' — reuses its CSS/toggle classes. */
    case 'reveal': {
      const wrap = el('div', 'cb-reveal-item');
      const hint = el('div', 'cb-reveal-hint');
      hint.innerHTML = `<div class="cb-tr-lbl">Hint</div><p>${inlineHtml(block.hint || '')}</p>`;
      wrap.appendChild(hint);

      const btn = el('button', 'cb-tr-hdr');
      btn.type = 'button';
      btn.innerHTML = `<span class="cb-tr-symp">Show Solution</span><span class="cb-tr-plus">+</span>`;
      const body = el('div', 'cb-tr-body');
      if (block.solution && block.solution.text) body.appendChild(el('p', 'cb-p', inlineHtml(block.solution.text)));
      if (block.solution && block.solution.code) body.appendChild(renderBlock({ type: 'code', ...block.solution.code }, ctx));
      btn.addEventListener('click', () => wrap.classList.toggle('open'));

      wrap.appendChild(btn);
      wrap.appendChild(body);
      return wrap;
    }

    case 'image': {
      const wrap = el('figure', 'cb-image');
      wrap.innerHTML = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || '')}" loading="lazy">${block.caption ? `<figcaption class="cb-image-caption">${inlineHtml(block.caption)}</figcaption>` : ''}`;
      return wrap;
    }

    case 'code': {
      const wrap = el('div', 'cb-code');
      const hdr = el('div', 'cb-code-hdr');
      hdr.innerHTML = `<span class="cb-code-lang">${escapeHtml(block.filename || block.lang || 'code')}</span>`;
      const actions = el('div', 'cb-code-actions');

      const copyBtn = el('button', 'cb-code-btn');
      copyBtn.type = 'button';
      copyBtn.innerHTML = `${icon('file')}<span>Copy</span>`;
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(block.code || '').then(() => {
          copyBtn.classList.add('ok');
          copyBtn.querySelector('span').textContent = 'Copied';
          setTimeout(() => { copyBtn.classList.remove('ok'); copyBtn.querySelector('span').textContent = 'Copy'; }, 1500);
        });
      });
      actions.appendChild(copyBtn);

      if (block.workspaceFile && ctx && ctx.openFile){
        const openBtn = el('button', 'cb-code-btn');
        openBtn.type = 'button';
        openBtn.innerHTML = `${icon('file')}<span>Open ${escapeHtml(block.workspaceFile.split('/').pop())}</span>`;
        openBtn.addEventListener('click', () => ctx.openFile(block.workspaceFile));
        actions.appendChild(openBtn);
      }
      if (block.insertable && ctx && ctx.insertCode){
        const insBtn = el('button', 'cb-code-btn');
        insBtn.type = 'button';
        insBtn.innerHTML = `${icon('plus')}<span>Insert into editor</span>`;
        insBtn.addEventListener('click', () => ctx.insertCode(block.code || ''));
        actions.appendChild(insBtn);
      }

      hdr.appendChild(actions);
      const pre = el('pre');
      const codeEl = el('code');
      codeEl.textContent = block.code || '';
      pre.appendChild(codeEl);
      wrap.appendChild(hdr);
      wrap.appendChild(pre);
      return wrap;
    }

    default:
      return el('div');
  }
}

/** Renders `blocks` into `container` (cleared first). `ctx` is optional:
 *  { openFile(path), insertCode(code) } — omit to render read-only (Help app). */
export function renderBlocks(container, blocks, ctx){
  container.innerHTML = '';
  (blocks || []).forEach((b) => container.appendChild(renderBlock(b, ctx)));
}
