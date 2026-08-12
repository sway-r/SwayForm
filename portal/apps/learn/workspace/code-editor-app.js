/* Code Editor application — file explorer + tabs + Monaco + toolbar, wrapping
 * the existing editor components exactly as the old fixed-pane layout did.
 * The only real change from before: the bottom strip is Output/Problems only
 * (portal/apps/learn/editor/terminal-panel.js, now OutputPanel) — Run streams
 * its mocked sequence into the standalone Terminal app instead of a local
 * panel, via the `onRun` hook the controller supplies. */
import { CodeEditor } from '../editor/code-editor.js';
import { FileExplorer } from '../editor/file-explorer.js';
import { EditorTabs } from '../editor/editor-tabs.js';
import { OutputPanel } from '../editor/terminal-panel.js';
import { WorkspaceToolbar } from '../editor/workspace-toolbar.js';
import * as fs from '../editor/mock-fs.js';

export const meta = { id: 'codeEditor', title: 'Code Editor', icon: 'learn' };

export function mount(bodyEl, winApi, opts) {
  const { activity, onRun } = opts;
  let editor = null, editorReady = false, pendingOpenPath = null;
  let saveTimer = null;

  bodyEl.innerHTML = `
    <div class="ce-root">
      <div class="learn-toolbar" data-toolbar></div>
      <div class="learn-editor-area">
        <div class="learn-explorer p-scroll" data-explorer></div>
        <div class="learn-editor-main">
          <div class="learn-tabs" data-tabs></div>
          <div class="learn-editor-surface" data-editor-surface></div>
          <div class="learn-terminal collapsed" data-output></div>
        </div>
      </div>
    </div>`;

  const explorerEl = bodyEl.querySelector('[data-explorer]');
  const tabsEl = bodyEl.querySelector('[data-tabs]');
  const editorSurfaceEl = bodyEl.querySelector('[data-editor-surface]');
  const outputEl = bodyEl.querySelector('[data-output]');
  const toolbarEl = bodyEl.querySelector('[data-toolbar]');

  const explorer = new FileExplorer(explorerEl, { onSelect: (path) => openFile(path) });
  const tabs = new EditorTabs(tabsEl, {
    onSelect: (path) => openFile(path, { fromTab: true }),
    onClose: (closedPath, nextActive) => {
      if (editor) editor.closeFile(closedPath);
      if (nextActive) openFile(nextActive, { fromTab: true });
      else toolbar.setFileStatus('No file open');
    },
  });
  const output = new OutputPanel(outputEl);
  output.toggleCollapse(true);
  const toolbar = new WorkspaceToolbar(toolbarEl, {
    onRun: runActiveFile, onCheck: checkActiveFile, onSave: saveActiveFile, onReset: resetActiveFile,
  });

  editorSurfaceEl.innerHTML = '<div class="editor-loading">Loading editor…</div>';
  editor = new CodeEditor(editorSurfaceEl, {
    // Debounced autosave: writing to localStorage + rebuilding the whole
    // File Explorer tree on every single keystroke was real, unnecessary
    // work and I/O. A short debounce also gives room for an honest
    // Unsaved/Saved status instead of claiming to be saved before it is.
    onChange: (path, value) => {
      if (tabs.activePath === path) toolbar.setFileStatus('Unsaved changes…');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => persist(path, value), 500);
    },
  });
  editorSurfaceEl.innerHTML = '';
  editor.mount().then(() => {
    editorReady = true;
    if (pendingOpenPath) { const p = pendingOpenPath; pendingOpenPath = null; openFile(p); }
    else if (activity.workspaceFile) openFile(activity.workspaceFile);
  });

  refreshExplorer();
  toolbar.setFileStatus('No file open');

  function refreshExplorer(){
    explorer.render(fs.buildTree(), tabs.activePath);
  }

  function openFile(path, fileOpts){
    fileOpts = fileOpts || {};
    const content = fs.readFile(path);
    if (content === null) return;
    if (!editorReady){ pendingOpenPath = path; tabs.open(path); refreshExplorer(); return; }
    editor.openFile(path, content, fs.languageForPath(path));
    if (!fileOpts.fromTab) tabs.open(path);
    tabs.setActive(path);
    explorer.setActive(path);
    toolbar.setFileStatus(path.replace(/^ros2_ws\//, '~/ros2_ws/'));
    winApi.setTitle(path.split('/').pop());
  }

  function packageAndEntry(path){
    const parts = path.split('/');
    return { pkg: parts[2] || 'swayform_demos', file: parts[parts.length - 1].replace(/\.py$/, '') };
  }

  function runActiveFile(){
    const path = tabs.activePath;
    if (!path){
      output.toggleCollapse(false);
      output.appendLine('No file is open. Open a file from the workspace to run it.', 'term-warn', 'output');
      output.setActive('output');
      return;
    }
    toolbar.setBusy(true);
    const { pkg, file } = packageAndEntry(path);
    const content = fs.readFile(path) || '';
    onRun(pkg, file, content);
    setTimeout(() => toolbar.setBusy(false), 400);
  }

  function checkActiveFile(){
    const path = tabs.activePath;
    output.toggleCollapse(false);
    if (!path){ output.appendLine('No file is open to check.', 'term-warn', 'problems'); output.setActive('problems'); return; }
    const content = fs.readFile(path) || '';
    const todoMatches = content.match(/#\s*TODO[^\n]*/gi) || [];
    output.clear('problems');
    output.clear('output');
    if (todoMatches.length){
      output.appendLine(`Check: ${todoMatches.length} TODO item${todoMatches.length > 1 ? 's' : ''} remaining in ${path.split('/').pop()}`, 'term-warn', 'output');
      todoMatches.forEach((m) => output.appendLine(m.trim(), 'term-warn', 'problems'));
      output.setActive('problems');
    } else {
      output.appendLine(`Check passed — no TODO markers remain in ${path.split('/').pop()}. Nice work.`, 'term-ok', 'output');
      output.setActive('output');
    }
  }

  // Shared by both the debounced autosave and the explicit Save button, so
  // "Save" isn't a no-op that merely repeats work autosave already did —
  // it flushes any pending debounce and gives the same honest Saved status.
  function persist(path, value){
    fs.writeFile(path, value);
    tabs.refreshDirtyState();
    refreshExplorer();
    if (tabs.activePath === path){
      toolbar.setFileStatus('Saved · ' + path.replace(/^ros2_ws\//, '~/ros2_ws/'));
      setTimeout(() => { if (tabs.activePath === path) toolbar.setFileStatus(path.replace(/^ros2_ws\//, '~/ros2_ws/')); }, 1200);
    }
  }

  function saveActiveFile(){
    const path = tabs.activePath;
    if (!path) return;
    clearTimeout(saveTimer);
    persist(path, editor.getValue());
  }

  function resetActiveFile(){
    const path = tabs.activePath;
    if (!path) return;
    if (!window.confirm(`Reset ${path.split('/').pop()} to its starter version? Your changes to this file will be lost. This cannot be undone.`)) return;
    clearTimeout(saveTimer);
    fs.resetFile(path);
    const original = fs.readFile(path);
    editor.setValue(path, original);
    tabs.refreshDirtyState();
    refreshExplorer();
    toolbar.setFileStatus(path.replace(/^ros2_ws\//, '~/ros2_ws/'));
  }

  return {
    openFile,
    insertCode(code){ if (editor) editor.insertAtCursor(code); },
    save: saveActiveFile,
    dispose(){ clearTimeout(saveTimer); if (editor) editor.dispose(); },
  };
}
