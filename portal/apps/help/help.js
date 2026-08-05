import { icon } from '../../icons.js';
import { REFERENCE } from '../../data/reference.js';
import { renderBlocks } from '../learn/lesson-renderer.js';
import { applyReadingTheme } from '../../theme.js';

export const meta = {
  id: 'help',
  title: 'Help',
  icon: 'help',
  defaultSize: { w: 960, h: 680 },
};

function blockText(block){
  switch (block.type){
    case 'lead': case 'p': return block.text;
    case 'heading': return block.text;
    case 'list': case 'steps': case 'checklist': return (block.items || []).join(' ');
    case 'callout': return block.text;
    case 'table': return (block.rows || []).flat().join(' ');
    case 'terms': return (block.items || []).map((i) => i.term + ' ' + i.def).join(' ');
    case 'troubleshoot': return (block.items || []).map((i) => `${i.symptom} ${i.cause || ''} ${i.fix}`).join(' ');
    default: return '';
  }
}

export function mount(container, ctx){
  const index = REFERENCE.sections.map((s) => ({
    id: s.id,
    title: s.title,
    corpus: (s.title + ' ' + s.blocks.map(blockText).join(' ')).toLowerCase(),
  }));

  let activeId = REFERENCE.sections[0].id;

  container.innerHTML = `
    <div class="help-root">
      <aside class="help-nav">
        <div class="help-search-wrap">
          <span class="help-search-icon">${icon('search')}</span>
          <input type="text" class="help-search-input" placeholder="Search reference…" autocomplete="off" spellcheck="false">
        </div>
        <div class="help-nav-list" data-nav-list></div>
      </aside>
      <main class="help-content p-scroll content-surface" data-help-content></main>
    </div>`;

  const navListEl = container.querySelector('[data-nav-list]');
  const contentEl = container.querySelector('[data-help-content]');
  const searchInput = container.querySelector('.help-search-input');
  applyReadingTheme(contentEl);

  function renderNav(filter){
    const q = (filter || '').trim().toLowerCase();
    navListEl.innerHTML = '';
    REFERENCE.sections.forEach((s) => {
      const match = !q || index.find((i) => i.id === s.id).corpus.includes(q);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'help-nav-item' + (s.id === activeId ? ' active' : '') + (match ? '' : ' dim');
      btn.innerHTML = `${icon(s.icon || 'book')}<span>${s.title}</span>`;
      btn.addEventListener('click', () => { activeId = s.id; renderNav(searchInput.value); renderContent(); });
      navListEl.appendChild(btn);
    });
  }

  function renderContent(){
    const section = REFERENCE.sections.find((s) => s.id === activeId);
    contentEl.innerHTML = '';
    const head = document.createElement('h1');
    head.className = 'help-section-title';
    head.textContent = section.title;
    contentEl.appendChild(head);
    const blocksEl = document.createElement('div');
    contentEl.appendChild(blocksEl);
    renderBlocks(blocksEl, section.blocks, null);
    contentEl.scrollTop = 0;
  }

  searchInput.addEventListener('input', () => renderNav(searchInput.value));

  ctx.setAppTitle && ctx.setAppTitle('Help');
  renderNav('');
  renderContent();

  return {
    onParams(params){
      if (params && params.topic && REFERENCE.sections.some((s) => s.id === params.topic)){
        activeId = params.topic;
        renderNav(searchInput.value);
        renderContent();
      }
    },
  };
}
