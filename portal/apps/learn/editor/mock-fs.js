/* Virtual ROS 2 workspace. Drafts are account-scoped in this browser's
   localStorage: they survive reloads, closed tabs and browser restarts, and are
   cleared at sign-out (see auth-service.js). They are not cloud backups. */
import { WORKSPACE_FILES } from '../../../data/workspace-files.js';

const FS_PREFIX = 'swayform.portal.fs.';

let storageKey = null;
let overrides = Object.create(null);

export function workspaceStorageKey(email){
  return FS_PREFIX + encodeURIComponent(email || 'guest');
}

function parseDrafts(raw){
  const drafts = Object.create(null);
  let saved = null;
  try { saved = JSON.parse(raw || '{}'); } catch { /* corrupt entry: start clean */ }
  if (saved && !Array.isArray(saved) && typeof saved === 'object'){
    for (const [path, content] of Object.entries(saved)){
      if (path.startsWith('swayform_ws/') && typeof content === 'string') drafts[path] = content;
    }
  }
  return drafts;
}

export function setWorkspaceAccount(session){
  storageKey = workspaceStorageKey(session?.email);
  overrides = Object.create(null);
  try {
    // Unattributed legacy drafts cannot safely be assigned to the next login.
    localStorage.removeItem('swayform.portal.fs.overrides');
    // Drafts used to live in this tab's sessionStorage; adopt them once, the saved copy winning.
    const legacy = parseDrafts(sessionStorage.getItem(storageKey));
    overrides = Object.assign(legacy, parseDrafts(localStorage.getItem(storageKey)));
    if (sessionStorage.getItem(storageKey) !== null){
      localStorage.setItem(storageKey, JSON.stringify(overrides));
      sessionStorage.removeItem(storageKey);
    }
  } catch { /* start with a clean, in-memory workspace */ }
}

// Another tab of the same account saved: keep this tab's copy of the drafts current.
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (storageKey && event.key === storageKey) overrides = parseDrafts(event.newValue);
});

// Read-modify-write, so two tabs editing different files never overwrite each other's drafts.
function persist(change){
  change(overrides);
  try {
    if (!storageKey) throw new Error('Workspace account is not initialized');
    const stored = parseDrafts(localStorage.getItem(storageKey));
    change(stored);
    localStorage.setItem(storageKey, JSON.stringify(stored));
    overrides = stored;
    return true;
  } catch (e) {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('swayform:save-error', {
      detail: 'Your draft is only in memory because browser storage is unavailable or full. Copy your code before closing this page.',
    }));
    return false;
  }
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
  if (!storageKey || typeof path !== 'string' || !path.startsWith('swayform_ws/') || typeof content !== 'string') throw new Error('Invalid workspace write');
  return persist((drafts) => { drafts[path] = content; });
}

export function isModified(path){
  return Object.prototype.hasOwnProperty.call(overrides, path)
    && overrides[path] !== WORKSPACE_FILES[path];
}

export function resetFile(path){
  persist((drafts) => { delete drafts[path]; });
}

export function resetAll(){
  persist((drafts) => { for (const path of Object.keys(drafts)) delete drafts[path]; });
}

/** Builds a nested tree from the flat path list for the file explorer.
 *  { type:'folder', name, path, children:[...] } | { type:'file', name, path } */
export function buildTree(scopePaths){
  const root = { type: 'folder', name: 'swayform_ws', path: 'swayform_ws', children: [] };
  const folders = { 'swayform_ws': root };

  // scopePaths (when given) restricts the tree to just those files — e.g. an
  // activity's own workspaceFile, so a student reading one demo or lab isn't
  // faced with every package/lab in the whole workspace at once. Folders
  // along the way to a scoped file still render (for orientation), just with
  // nothing else inside them.
  const paths = scopePaths ? listPaths().filter((p) => scopePaths.includes(p)) : listPaths();

  paths.forEach((path) => {
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
