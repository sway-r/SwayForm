/* Code Editor application — file explorer + tabs + Monaco + toolbar, wrapping
 * the existing editor components exactly as the old fixed-pane layout did.
 * Run/Check/Queue all report through the bottom Output/Problems strip
 * (portal/apps/learn/editor/terminal-panel.js, OutputPanel) — a student never
 * has to open the standalone Terminal app to do a lab. */
import { CodeEditor } from '../editor/code-editor.js';
import { FileExplorer } from '../editor/file-explorer.js';
import { EditorTabs } from '../editor/editor-tabs.js';
import { OutputPanel } from '../editor/terminal-panel.js';
import { WorkspaceToolbar } from '../editor/workspace-toolbar.js';
import * as fs from '../editor/mock-fs.js';
import { isReadOnlyFile, defaultOpenFileFor } from '../../../data/workspace-config.js';
import { packageAndEntry, isCanonicalRobotPath } from './ros-paths.js';
import { buildRunSequence } from './mock-shell.js';
import { getSession } from '../../../services/auth-service.js';

export const meta = { id: 'codeEditor', title: 'Code Editor', icon: 'learn' };

/** One-line summary of why a validate check failed — used by Queue on
 * Robot's own defense-in-depth re-check. Run itself shows the detailed,
 * line-by-line breakdown in Problems (see formatDiff below); this is just
 * enough context for the rarer case where Queue on Robot's own re-validate
 * (right before submit) disagrees with Run's last result. */
function describeMismatch(data){
  if (data.status === 'no_canonical_source'){
    return "there's no verified working version of this file to check against yet.";
  }
  if (data.status === 'not_started'){
    return data.tunable
      ? `still at the default — change \`${data.tunable.name}\` to ${data.tunable.to}.`
      : "this lab hasn't been changed yet.";
  }
  return "this doesn't match the target solution — click Run to see exactly what changed.";
}

/** Formats one canonical-source diff entry (api/_lib/canonical-source.js's
 * allLineDifferences) as a single Problems-tab line. */
function formatDiff(d){
  if (d.kind === 'changed') return `Line ${d.line}: expected \`${d.expected}\`, found \`${d.yours}\``;
  if (d.kind === 'missing') return `Line ${d.line}: missing — expected \`${d.expected}\``;
  return `Line ${d.line}: extra line not in the solution — \`${d.yours}\``;
}

export function mount(bodyEl, winApi, opts) {
  const { activity } = opts;
  let editor = null, editorReady = false, pendingOpenPath = null;
  let saveTimer = null;
  let hasRobot = false;
  let jobPollTimer = null;
  // Path whose current (on-disk/mock-fs) content Run has most recently
  // confirmed valid against the canonical source — cleared on any edit to
  // that file, so Queue on Robot always reflects the content actually in
  // the editor, never a stale pass from before a change.
  let robotValidatedPath = null;

  getSession().then((session) => {
    hasRobot = !!(session && session.robotId);
    if (tabs.activePath){
      toolbar.setRobotEligible(hasRobot && isCanonicalRobotPath(tabs.activePath));
      toolbar.setQueueRobotReady(robotValidatedPath === tabs.activePath);
    }
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
    // Debounced autosave: writing to tab storage + rebuilding the whole
    // File Explorer tree on every single keystroke was real, unnecessary
    // work and I/O. A short debounce also gives room for an honest
    // Unsaved/Saved status instead of claiming to be saved before it is.
    onChange: (path, value) => {
      if (tabs.activePath === path) toolbar.setFileStatus('Unsaved changes…');
      if (robotValidatedPath === path){
        robotValidatedPath = null;
        if (tabs.activePath === path) toolbar.setQueueRobotReady(false);
      }
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
    toolbar.setQueueRobotReady(robotValidatedPath === path);
    winApi.setTitle(path.split('/').pop());
  }

  /** Streams the same mocked run sequence a `ros2 run`/`python3` in the
   *  standalone Terminal would produce, straight into this window's own
   *  Output tab — Run no longer opens/focuses the Terminal app. Any warning
   *  line (e.g. unfinished # TODOs) also lands in Problems, so that tab's
   *  count badge reflects Run the same way it already does for Check.
   *
   *  For canonical robot files, Run additionally asks the server (the same
   *  validate check Queue on Robot itself re-runs before submit) whether the
   *  current content is a working version — only a confirmed pass unlocks
   *  Queue on Robot, and only for that exact content (see the onChange
   *  handler above, which clears this the moment the file is edited again). */
  async function runActiveFile(){
    const path = tabs.activePath;
    if (!path){
      output.toggleCollapse(false);
      output.appendLine('No file is open. Open a file from the workspace to run it.', 'term-warn', 'output');
      output.setActive('output');
      return;
    }
    toolbar.setBusy(true);
    output.toggleCollapse(false);
    output.clear('output');
    output.clear('problems');
    output.setActive('output');
    const { pkg, file } = packageAndEntry(path);
    const content = fs.readFile(path) || '';
    const stream = buildRunSequence(pkg, file, content);
    stream.forEach((s) => setTimeout(() => {
      output.appendLine(s.text, s.cls, 'output');
      if (s.cls === 'term-warn') output.appendLine(s.text, s.cls, 'problems');
    }, s.t));
    const runDuration = stream.length ? stream[stream.length - 1].t + 150 : 400;

    if (isCanonicalRobotPath(path)){
      try {
        const res = await fetch('/api/robot/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'validate', path, code: content }),
        });
        const data = await res.json();
        robotValidatedPath = null;
        if (tabs.activePath === path) toolbar.setQueueRobotReady(false);

        if (data.status === 'complete'){
          robotValidatedPath = path;
          if (tabs.activePath === path) toolbar.setQueueRobotReady(true);
          output.appendLine('Objective complete — this matches the target solution. Queue on Robot is now available.', 'term-ok', 'output');
        } else if (data.status === 'not_started'){
          const hint = data.tunable
            ? `Change \`${data.tunable.name}\` from ${data.tunable.from} to ${data.tunable.to}.`
            : "This lab hasn't been changed yet.";
          output.appendLine(`This runs, but the lab isn't done yet. ${hint}`, 'term-err', 'output');
          output.appendLine(hint, 'term-err', 'problems');
          output.setActive('problems');
        } else if (data.status === 'tampered'){
          output.appendLine("This code doesn't match the target solution — see Problems for exactly what changed.", 'term-err', 'output');
          (data.diffs || []).forEach((d) => output.appendLine(formatDiff(d), 'term-err', 'problems'));
          output.setActive('problems');
        } else {
          output.appendLine("There's no verified working version of this file to check against yet.", 'term-warn', 'output');
        }
      } catch (e) {
        robotValidatedPath = null;
        if (tabs.activePath === path) toolbar.setQueueRobotReady(false);
        output.appendLine('Could not reach the server to confirm this run. Try again.', 'term-err', 'output');
      }
    }

    setTimeout(() => toolbar.setBusy(false), runDuration);
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
    // The button is disabled until this is true, but guard the handler too
    // in case of a stale click already in flight when state changed.
    if (robotValidatedPath !== path){
      output.appendLine('Click Run first to confirm your code before queueing it on the robot.', 'term-warn', 'output');
      output.setActive('output');
      return;
    }
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
        output.appendLine(`Couldn't queue — ${describeMismatch(validateData)}`, 'term-err', 'output');
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
    const stored = fs.writeFile(path, value);
    tabs.refreshDirtyState();
    refreshExplorer();
    if (tabs.activePath === path){
      if (!stored){ toolbar.setFileStatus('Not saved to browser · copy your code'); return; }
      toolbar.setFileStatus('Saved for this tab · ' + path.replace(/^swayform_ws\//, '~/swayform_ws/'));
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
    if (robotValidatedPath === path){ robotValidatedPath = null; toolbar.setQueueRobotReady(false); }
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
