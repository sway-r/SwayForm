import { icon } from '../../../icons.js';
import { isModified } from './mock-fs.js';

const EXT_LABEL = { py: 'PY', xml: 'XML', md: 'MD', json: 'JSON' };

function extOf(name){
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

export class FileExplorer {
  constructor(container, { onSelect } = {}){
    this.container = container;
    this.onSelect = onSelect;
    this.expanded = new Set();
    this.activePath = null;
    this.tree = null;
  }

  render(tree, activePath){
    this.tree = tree;
    if (activePath) this.activePath = activePath;
    if (this.expanded.size === 0) this._expandDefaults(tree);
    this.container.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'fx-tree';
    tree.children.forEach((child) => root.appendChild(this._renderNode(child, 0)));
    this.container.appendChild(root);
  }

  setActive(path){
    this.activePath = path;
    this.container.querySelectorAll('.fx-file').forEach((n) => {
      n.classList.toggle('active', n.dataset.path === path);
    });
  }

  _expandDefaults(node, depth = 0){
    if (node.type !== 'folder') return;
    if (depth < 3) this.expanded.add(node.path);
    node.children.forEach((c) => this._expandDefaults(c, depth + 1));
  }

  _renderNode(node, depth){
    if (node.type === 'folder'){
      const isOpen = this.expanded.has(node.path);
      const wrap = document.createElement('div');
      wrap.className = 'fx-folder';

      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'fx-row fx-folder-row';
      row.style.paddingLeft = (10 + depth * 14) + 'px';
      row.innerHTML = `<span class="fx-caret ${isOpen ? 'open' : ''}">${icon('chevronRight')}</span><span class="fx-icon">${icon(isOpen ? 'folderOpen' : 'folder')}</span><span class="fx-name">${node.name}</span>`;
      row.addEventListener('click', () => {
        if (this.expanded.has(node.path)) this.expanded.delete(node.path);
        else this.expanded.add(node.path);
        this.render(this.tree, this.activePath);
      });
      wrap.appendChild(row);

      if (isOpen){
        const childrenWrap = document.createElement('div');
        childrenWrap.className = 'fx-children';
        node.children.forEach((c) => childrenWrap.appendChild(this._renderNode(c, depth + 1)));
        wrap.appendChild(childrenWrap);
      }
      return wrap;
    }

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'fx-row fx-file' + (node.path === this.activePath ? ' active' : '');
    row.dataset.path = node.path;
    row.style.paddingLeft = (10 + depth * 14 + 18) + 'px';
    const ext = extOf(node.name);
    row.innerHTML = `<span class="fx-icon fx-icon-file ext-${ext}">${EXT_LABEL[ext] ? '' : icon('file')}${EXT_LABEL[ext] ? `<span class="fx-ext">${EXT_LABEL[ext]}</span>` : ''}</span><span class="fx-name">${node.name}</span>${isModified(node.path) ? '<span class="fx-dot" title="Modified"></span>' : ''}`;
    row.addEventListener('click', () => this.onSelect && this.onSelect(node.path));
    return row;
  }
}
