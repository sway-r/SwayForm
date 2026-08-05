import { icon } from '../../../icons.js';
import { isModified } from './mock-fs.js';

export class EditorTabs {
  constructor(container, { onSelect, onClose } = {}){
    this.container = container;
    this.onSelect = onSelect;
    this.onClose = onClose;
    this.tabs = []; // array of paths, order = open order
    this.activePath = null;
  }

  open(path){
    if (!this.tabs.includes(path)) this.tabs.push(path);
    this.activePath = path;
    this.render();
  }

  close(path){
    const idx = this.tabs.indexOf(path);
    if (idx === -1) return;
    this.tabs.splice(idx, 1);
    if (this.activePath === path){
      const next = this.tabs[idx] || this.tabs[idx - 1] || null;
      this.activePath = next;
    }
    this.render();
    if (this.onClose) this.onClose(path, this.activePath);
  }

  setActive(path){
    this.activePath = path;
    this.render();
  }

  render(){
    this.container.innerHTML = '';
    this.tabs.forEach((path) => {
      const name = path.split('/').pop();
      const tab = document.createElement('div');
      tab.className = 'ed-tab' + (path === this.activePath ? ' active' : '');
      tab.innerHTML = `<span class="ed-tab-name">${name}</span>${isModified(path) ? '<span class="ed-tab-dot"></span>' : ''}<button type="button" class="ed-tab-close" aria-label="Close ${name}">${icon('close')}</button>`;
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.ed-tab-close')) return;
        this.onSelect && this.onSelect(path);
      });
      tab.querySelector('.ed-tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        this.close(path);
      });
      this.container.appendChild(tab);
    });
  }

  refreshDirtyState(){
    this.container.querySelectorAll('.ed-tab').forEach((tabEl, i) => {
      const path = this.tabs[i];
      const hasDot = !!tabEl.querySelector('.ed-tab-dot');
      const shouldHaveDot = isModified(path);
      if (hasDot !== shouldHaveDot) this.render();
    });
  }
}
