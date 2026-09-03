/* Virtual ROS 2 workspace filesystem. Seeds from the static WORKSPACE_FILES
   map and persists any edits to localStorage for the current browser —
   there is no backend yet, so "save" just means "survives a reload". */
import { WORKSPACE_FILES } from '../../../data/workspace-files.js';

const STORAGE_KEY = 'swayform.portal.fs.overrides';

let overrides = {};
try { overrides = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { overrides = {}; }

function persist(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch (e) { /* storage unavailable */ }
}

export function listPaths(){
  const set = new Set([...Object.keys(WORKSPACE_FILES), ...Object.keys(overrides)]);
  return Array.from(set).sort();
}

export function readFile(path){
  if (Object.prototype.hasOwnProperty.call(overrides, path)) return overrides[path];
  if (Object.prototype.hasOwnProperty.call(WORKSPACE_FILES, path)) return WORKSPACE_FILES[path];
  return null;
}

export function writeFile(path, content){
  overrides[path] = content;
  persist();
}

export function isModified(path){
  return Object.prototype.hasOwnProperty.call(overrides, path)
    && overrides[path] !== WORKSPACE_FILES[path];
}

export function resetFile(path){
  delete overrides[path];
  persist();
}

export function resetAll(){
  overrides = {};
  persist();
}

/** Builds a nested tree from the flat path list for the file explorer.
 *  { type:'folder', name, path, children:[...] } | { type:'file', name, path } */
export function buildTree(){
  const root = { type: 'folder', name: 'swayform_ws', path: 'swayform_ws', children: [] };
  const folders = { 'swayform_ws': root };

  listPaths().forEach((path) => {
    const parts = path.split('/');
    let parentPath = parts[0];
    for (let i = 1; i < parts.length; i++){
      const isFile = i === parts.length - 1;
      const currentPath = parentPath + '/' + parts[i];
      if (isFile){
        folders[parentPath].children.push({ type: 'file', name: parts[i], path: currentPath });
      } else {
        if (!folders[currentPath]){
          const folderNode = { type: 'folder', name: parts[i], path: currentPath, children: [] };
          folders[parentPath].children.push(folderNode);
          folders[currentPath] = folderNode;
        }
      }
      parentPath = currentPath;
    }
  });

  const sortNode = (node) => {
    if (node.type !== 'folder') return;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortNode);
  };
  sortNode(root);
  return root;
}

export function languageForPath(path){
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.xml')) return 'xml';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.json')) return 'json';
  return 'plaintext';
}
