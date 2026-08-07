/* Small Output/Problems strip inside the Code Editor window — diagnostics
 * only (Check results, save confirmations). The primary terminal experience
 * now lives in its own standalone application:
 * portal/apps/learn/workspace/terminal-app.js + mock-shell.js. */
import { icon } from '../../../icons.js';

const TABS = [
  { id: 'output', label: 'Output', icon: 'file' },
  { id: 'problems', label: 'Problems', icon: 'warning' },
];

export class OutputPanel {
  constructor(container){
    this.container = container;
    this.active = 'output';
    this.lines = { output: [], problems: [] };
    this.collapsed = false;
    this._build();
  }

  _build(){
    this.container.innerHTML = `
      <div class="term-bar">
        <div class="term-tabs"></div>
        <div class="term-bar-spacer"></div>
        <button type="button" class="term-clear p-btn ghost">Clear</button>
        <button type="button" class="term-collapse win-ctrl" aria-label="Collapse panel">${icon('minimize')}</button>
      </div>
      <div class="term-body p-scroll"></div>`;
    this.tabsEl = this.container.querySelector('.term-tabs');
    this.bodyEl = this.container.querySelector('.term-body');
    TABS.forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'term-tab' + (t.id === this.active ? ' active' : '');
      btn.dataset.tab = t.id;
      btn.innerHTML = `${icon(t.icon)}<span>${t.label}</span><span class="term-tab-count" data-count="${t.id}"></span>`;
      btn.addEventListener('click', () => this.setActive(t.id));
      this.tabsEl.appendChild(btn);
    });
    this.container.querySelector('.term-clear').addEventListener('click', () => this.clear(this.active));
    this.container.querySelector('.term-collapse').addEventListener('click', () => this.toggleCollapse());
    this._renderBody();
    this._renderCounts();
  }

  setActive(tabId){
    this.active = tabId;
    this.tabsEl.querySelectorAll('.term-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    this._renderBody();
  }

  appendLine(text, cls, tab){
    tab = tab || 'output';
    this.lines[tab].push({ text, cls: cls || '' });
    if (tab === this.active) this._renderBody();
    this._renderCounts();
  }

  clear(tab){
    tab = tab || this.active;
    this.lines[tab] = [];
    this._renderBody();
    this._renderCounts();
  }

  _renderBody(){
    this.bodyEl.innerHTML = '';
    this.lines[this.active].forEach((l) => {
      const row = document.createElement('div');
      row.className = 'term-line ' + l.cls;
      row.textContent = l.text;
      this.bodyEl.appendChild(row);
    });
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  }

  _renderCounts(){
    TABS.forEach((t) => {
      const el = this.tabsEl.querySelector(`[data-count="${t.id}"]`);
      const n = this.lines[t.id].length;
      el.textContent = n && t.id === 'problems' ? String(n) : '';
    });
  }

  toggleCollapse(force){
    this.collapsed = typeof force === 'boolean' ? force : !this.collapsed;
    this.container.classList.toggle('collapsed', this.collapsed);
  }
}
