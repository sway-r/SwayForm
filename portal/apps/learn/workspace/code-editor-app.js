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
import { isReadOnlyFile, defaultOpenFileFor } from '../../../data/workspace-config.js';
import { packageAndEntry, isCanonicalRobotPath } from './ros-paths.js';
import { getSession } from '../../../services/auth-service.js';

export const meta = { id: 'codeEditor', title: 'Code Editor', icon: 'learn' };

export function mount(bodyEl, winApi, opts) {
  const { activity, onRun } = opts;
  let editor = null, editorReady = false, pendingOpenPath = null;
  let saveTimer = null;
  let hasRobot = false;
  let jobPollTimer = null;

  getSession().then((session) => {
    hasRobot = !!(session && session.robotId);
    if (tabs.activePath) toolbar.setRobotEligible(hasRobot && isCanonicalRobotPath(tabs.activePath));
  });

  // Scope the explorer to this activity's own file — a student working
  // through the Wave demo (or any one lab) doesn't need every other demo/lab
  // in the workspace competing for attention in the tree. But swayform_robot's
  // real behavior files (wave.py, handshake.py, ...) actually `import` from
  // its config/ and hardware/ folders — scoping those out hid files the open
  // code depends on. swayform_labs/swayform_demos files use the separate,
  // simplified swayform.motion.MotionClient API and never touch config/
  // hardware, so they don't get the same expansion.
  const explorerScope = computeExplorerScope(activity.workspaceFile);

  function computeExplorerScope(workspaceFile){
    if (!workspaceFile) return null;
    const scope = [workspaceFile];

    const robotPkgSrcRoot = 'swayform_ws/src/swayform_robot/';
    if (workspaceFile.startsWith(robotPkgSrcRoot)){
      const robotPkgRoot = robotPkgSrcRoot + 'swayform_robot/';
      fs.listPaths().forEach((path) => {
        if (path.startsWith(robotPkgRoot + 'config/') || path.startsWith(robotPkgRoot + 'hardware/')){
          scope.push(path);
        }
      });
      scope.push(robotPkgSrcRoot + 'setup.py');
    }

    return scope;
  }

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
    onQueueOnRobot: queueOnRobot,
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
    else {
      // workspace-config.js may override which file opens first for this
      // lesson; the activity's own starter file stays the fallback.
      const first = defaultOpenFileFor(activity.id) || activity.workspaceFile;
      if (first) openFile(first);
    }
  });

  refreshExplorer();
  toolbar.setFileStatus('No file open');

  function refreshExplorer(){
    explorer.render(fs.buildTree(explorerScope), tabs.activePath);
  }

  function openFile(path, fileOpts){
    fileOpts = fileOpts || {};
    const content = fs.readFile(path);
    if (content === null) return;
    if (!editorReady){ pendingOpenPath = path; tabs.open(path); refreshExplorer(); return; }
    editor.openFile(path, content, fs.languageForPath(path));
    const readOnly = isReadOnlyFile(activity.id, path);
    editor.setReadOnly(readOnly);
    if (!fileOpts.fromTab) tabs.open(path);
    tabs.setActive(path);
    explorer.setActive(path);
    toolbar.setFileStatus(path.replace(/^swayform_ws\//, '~/swayform_ws/') + (readOnly ? '  ·  read-only' : ''));
    toolbar.setRobotEligible(hasRobot && isCanonicalRobotPath(path));
    winApi.setTitle(path.split('/').pop());
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

  /** One button, one click: validates against the real verified source and,
   * only if it matches exactly, immediately submits it to the queue. No
   * separate "test it, then a second button unlocks" step — the server
   * still re-validates on submit regardless, so this is purely a UX
   * simplification, not a safety change. */
  async function queueOnRobot(){
    const path = tabs.activePath;
    if (!path) return;
    output.toggleCollapse(false);
    toolbar.setQueueRobotBusy(true);
    const content = fs.readFile(path) || '';

    try {
      const validateRes = await fetch('/api/robot/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', path, code: content }),
      });
      const validateData = await validateRes.json();
      output.clear('output');

      if (!validateRes.ok || !validateData.valid){
        const reason = validateData.reason === 'no_canonical_source'
          ? "There's no verified working version of this file to check against yet."
          : "This doesn't exactly match the verified working version — even a single character or whitespace difference fails this check.";
        output.appendLine(`Couldn't queue — ${reason}`, 'term-err', 'output');
        output.setActive('output');
        toolbar.setQueueRobotBusy(false);
        return;
      }

      const submitRes = await fetch('/api/robot/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', path, code: content }),
      });
      const submitData = await submitRes.json();

      if (submitRes.ok && submitData.ok){
        output.appendLine(`Queued — position ${submitData.queuePosition} in line. An admin will review and approve it before it runs on the real robot.`, 'term-ok', 'output');
        watchJob(submitData.jobId);
      } else if (submitData.error === 'cooldown'){
        const seconds = Math.ceil((submitData.retryAfterMs || 0) / 1000);
        output.appendLine(`Please wait ${seconds}s before queueing again.`, 'term-warn', 'output');
      } else {
        output.appendLine(`Couldn't queue: ${submitData.message || submitData.error || 'unknown error'}`, 'term-err', 'output');
      }
      output.setActive('output');
    } catch (e) {
      output.appendLine('Could not reach the server. Try again.', 'term-err', 'output');
      output.setActive('output');
    }
    toolbar.setQueueRobotBusy(false);
  }

  const JOB_STATUS_LINE = {
    approved: ['An admin approved it — waiting for the robot to pick it up.', 'term-ok'],
    running: ['Running on the real robot now…', 'term-ok'],
    succeeded: ['Succeeded.', 'term-ok'],
    failed: ['Failed.', 'term-err'],
    rejected: ['An admin rejected this submission.', 'term-err'],
    cancelled: ['Cancelled.', 'term-warn'],
  };

  /** Polls this job's status after queueing and appends a line to the
   * output panel each time it changes, so a student watching sees real
   * progress (approved -> running -> succeeded/failed) without needing a
   * separate app. Stops once the job reaches a terminal status. */
  function watchJob(jobId){
    clearInterval(jobPollTimer);
    let lastSeenStatus = 'pending';
    let lastOutputLen = 0;
    jobPollTimer = setInterval(async () => {
      let jobs;
      try {
        const res = await fetch('/api/robot/queue');
        if (!res.ok) return;
        ({ jobs } = await res.json());
      } catch (e) { return; }

      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      if (job.status !== lastSeenStatus){
        lastSeenStatus = job.status;
        const [text, cls] = JOB_STATUS_LINE[job.status] || [job.status, 'term-warn'];
        output.appendLine(text, cls, 'output');
        output.setActive('output');
      }
      if (job.output && job.output.length > lastOutputLen){
        output.appendLine(job.output.slice(lastOutputLen), '', 'output');
        lastOutputLen = job.output.length;
      }
      if (['succeeded', 'failed', 'rejected', 'cancelled'].includes(job.status)){
        clearInterval(jobPollTimer);
        jobPollTimer = null;
      }
    }, 3000);
  }

  // Shared by both the debounced autosave and the explicit Save button, so
  // "Save" isn't a no-op that merely repeats work autosave already did —
  // it flushes any pending debounce and gives the same honest Saved status.
  function persist(path, value){
    fs.writeFile(path, value);
    tabs.refreshDirtyState();
    refreshExplorer();
    if (tabs.activePath === path){
      toolbar.setFileStatus('Saved · ' + path.replace(/^swayform_ws\//, '~/swayform_ws/'));
      setTimeout(() => { if (tabs.activePath === path) toolbar.setFileStatus(path.replace(/^swayform_ws\//, '~/swayform_ws/')); }, 1200);
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
    toolbar.setFileStatus(path.replace(/^swayform_ws\//, '~/swayform_ws/'));
  }

  return {
    openFile,
    insertCode(code){ if (editor) editor.insertAtCursor(code); },
    save: saveActiveFile,
    dispose(){ clearTimeout(saveTimer); clearInterval(jobPollTimer); if (editor) editor.dispose(); },
  };
}
