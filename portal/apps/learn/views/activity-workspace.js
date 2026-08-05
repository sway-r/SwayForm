import { icon } from '../../../icons.js';
import { findActivity, flattenActivities } from '../../../data/learning-path.js';
import { renderBlocks } from '../lesson-renderer.js';
import { CodeEditor } from '../editor/code-editor.js';
import { FileExplorer } from '../editor/file-explorer.js';
import { EditorTabs } from '../editor/editor-tabs.js';
import { TerminalPanel } from '../editor/terminal-panel.js';
import { WorkspaceToolbar } from '../editor/workspace-toolbar.js';
import * as fs from '../editor/mock-fs.js';
import { applyReadingTheme } from '../../../theme.js';
import { markComplete, setCurrentActivity } from '../../../services/progress-service.js';

const SPLIT_KEY = 'swayform.portal.learn.splitPct';
const DEFAULT_SPLIT = 40;

function diffTag(difficulty){
  if (!difficulty) return '';
  return `<span class="diff-tag ${difficulty}">${difficulty}</span>`;
}

export function mount(container, params, nav, ctx){
  const found = findActivity(params.activityId);
  if (!found){ nav.home(); return { unmount(){} }; }
  const { section, activity } = found;
  const isReading = activity.kind === 'reading';
  const totalSteps = activity.steps.length;
  let stepIndex = Math.min(Math.max(params.stepIndex || 0, 0), totalSteps - 1);
  let editor = null;
  let editorReady = false;
  let pendingOpenPath = null;

  container.innerHTML = `
    <div class="aw-root">
      <div class="aw-header">
        <button type="button" class="aw-back" data-back>${icon('arrowLeft')}<span></span></button>
        <div class="aw-crumb">${section.title} / <strong>${activity.title}</strong></div>
        <div class="aw-header-spacer"></div>
        <div class="aw-step-indicator" data-step-indicator></div>
        ${isReading ? '' : '<div class="aw-header-actions" data-focus-actions></div>'}
      </div>
      <div class="aw-body ${isReading ? 'reading-mode' : ''}" data-body>
        <div class="aw-left" data-left>
          <div class="aw-notebook p-scroll content-surface" data-notebook></div>
          <div class="step-nav" data-step-nav></div>
        </div>
        ${isReading ? '' : '<div class="aw-resizer" data-resizer></div>'}
        ${isReading ? '' : `
        <div class="aw-right" data-right>
          <div class="learn-toolbar" data-toolbar></div>
          <div class="learn-editor-area">
            <div class="learn-explorer p-scroll" data-explorer></div>
            <div class="learn-editor-main">
              <div class="learn-tabs" data-tabs></div>
              <div class="learn-editor-surface" data-editor-surface></div>
              <div class="learn-terminal collapsed" data-terminal></div>
            </div>
          </div>
        </div>`}
      </div>
    </div>`;

  container.querySelector('[data-back]').addEventListener('click', () => nav.section(section.id));

  const notebookEl = container.querySelector('[data-notebook]');
  const stepNavEl = container.querySelector('[data-step-nav]');
  const stepIndicatorEl = container.querySelector('[data-step-indicator]');
  const bodyEl = container.querySelector('[data-body]');
  const leftEl = container.querySelector('[data-left]');
  applyReadingTheme(notebookEl);

  ctx.setTitle && ctx.setTitle(activity.title);

  /* ---------------------------------------------------------------- Editor (code activities only) */
  let tabs = null, explorer = null, terminal = null, toolbar = null, disposeResizer = () => {};

  const lessonCtx = {
    openFile: (path) => openWorkspaceFile(path),
    insertCode: (code) => { if (editor) editor.insertAtCursor(code); },
  };

  if (!isReading){
    const explorerEl = container.querySelector('[data-explorer]');
    const tabsEl = container.querySelector('[data-tabs]');
    const editorSurfaceEl = container.querySelector('[data-editor-surface]');
    const terminalEl = container.querySelector('[data-terminal]');
    const toolbarEl = container.querySelector('[data-toolbar]');
    const resizerEl = container.querySelector('[data-resizer]');
    const focusActionsEl = container.querySelector('[data-focus-actions]');

    explorer = new FileExplorer(explorerEl, { onSelect: (path) => openWorkspaceFile(path) });
    tabs = new EditorTabs(tabsEl, {
      onSelect: (path) => openWorkspaceFile(path, { fromTab: true }),
      onClose: (closedPath, nextActive) => {
        if (editor) editor.closeFile(closedPath);
        if (nextActive) openWorkspaceFile(nextActive, { fromTab: true });
        else toolbar.setFileStatus('No file open');
      },
    });
    terminal = new TerminalPanel(terminalEl);
    terminal.toggleCollapse(true);
    toolbar = new WorkspaceToolbar(toolbarEl, {
      onRun: runActiveFile, onCheck: checkActiveFile, onSave: saveActiveFile, onReset: resetActiveFile,
    });

    editorSurfaceEl.innerHTML = '<div class="editor-loading">Loading editor…</div>';
    editor = new CodeEditor(editorSurfaceEl, {
      onChange: (path, value) => {
        fs.writeFile(path, value);
        tabs.refreshDirtyState();
        refreshExplorer();
      },
    });
    editorSurfaceEl.innerHTML = '';
    editor.mount().then(() => {
      editorReady = true;
      if (pendingOpenPath){ const p = pendingOpenPath; pendingOpenPath = null; openWorkspaceFile(p); }
      else if (activity.workspaceFile) openWorkspaceFile(activity.workspaceFile);
    });

    refreshExplorer();
    toolbar.setFileStatus('No file open');

    /* Focus Lesson / Focus Code */
    focusActionsEl.innerHTML = `
      <button type="button" class="p-btn ghost aw-focus-btn" data-focus-lesson>Focus Lesson</button>
      <button type="button" class="p-btn ghost aw-focus-btn" data-focus-code>Focus Code</button>`;
    const focusLessonBtn = focusActionsEl.querySelector('[data-focus-lesson]');
    const focusCodeBtn = focusActionsEl.querySelector('[data-focus-code]');
    focusLessonBtn.addEventListener('click', () => {
      const active = focusLessonBtn.classList.contains('active');
      focusLessonBtn.classList.toggle('active', !active);
      focusCodeBtn.classList.remove('active');
      applySplit(active ? DEFAULT_SPLIT : 86);
    });
    focusCodeBtn.addEventListener('click', () => {
      const active = focusCodeBtn.classList.contains('active');
      focusCodeBtn.classList.toggle('active', !active);
      focusLessonBtn.classList.remove('active');
      applySplit(active ? DEFAULT_SPLIT : 14);
    });

    /* Resizer */
    let currentPct = DEFAULT_SPLIT;
    try { const saved = parseFloat(localStorage.getItem(SPLIT_KEY)); if (saved >= 20 && saved <= 70) currentPct = saved; } catch (e) { /* noop */ }
    applySplit(currentPct);

    let dragging = false;
    const onDown = () => { dragging = true; document.body.style.cursor = 'col-resize'; };
    const onMove = (e) => {
      if (!dragging) return;
      const rect = bodyEl.getBoundingClientRect();
      let p = ((e.clientX - rect.left) / rect.width) * 100;
      p = Math.max(24, Math.min(66, p));
      applySplit(p);
      focusLessonBtn.classList.remove('active');
      focusCodeBtn.classList.remove('active');
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = '';
      try { localStorage.setItem(SPLIT_KEY, String(currentPct)); } catch (e) { /* noop */ }
    };
    resizerEl.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    disposeResizer = () => {
      resizerEl.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    function applySplit(p){
      currentPct = p;
      leftEl.style.width = p + '%';
    }
  }

  function refreshExplorer(){
    if (explorer) explorer.render(fs.buildTree(), tabs.activePath);
  }

  function openWorkspaceFile(path, opts){
    opts = opts || {};
    const content = fs.readFile(path);
    if (content === null) return;
    if (!editorReady){ pendingOpenPath = path; tabs.open(path); refreshExplorer(); return; }
    editor.openFile(path, content, fs.languageForPath(path));
    if (!opts.fromTab) tabs.open(path);
    tabs.setActive(path);
    explorer.setActive(path);
    toolbar.setFileStatus(path.replace(/^ros2_ws\//, '~/ros2_ws/'));
  }

  function packageAndEntry(path){
    const parts = path.split('/');
    return { pkg: parts[2] || 'swayform_demos', file: parts[parts.length - 1].replace(/\.py$/, '') };
  }

  function runActiveFile(){
    const path = tabs.activePath;
    terminal.toggleCollapse(false);
    terminal.setActive('terminal');
    if (!path){ terminal.appendLine('No file is open. Open a file from the workspace to run it.', 'term-warn'); return; }
    toolbar.setBusy(true);
    const { pkg, file } = packageAndEntry(path);
    const content = fs.readFile(path) || '';
    const hasTodo = /#\s*TODO/i.test(content);
    const steps = [
      { t: 200, text: `$ ros2 run ${pkg} ${file}`, cls: 'term-cmd' },
      { t: 500, text: 'Sourcing ~/ros2_ws/install/setup.bash', cls: '' },
      { t: 700, text: `Building ${pkg}... done`, cls: 'term-ok' },
      { t: 950, text: `[INFO] [${file}]: node started`, cls: '' },
      { t: 1250, text: '[INFO] Connecting to motion controller (mock)…', cls: '' },
      { t: 1600, text: hasTodo ? `[WARN] [${file}]: one or more # TODO sections are still unfinished — behavior may be incomplete` : `[INFO] [${file}]: all required values are set`, cls: hasTodo ? 'term-warn' : '' },
      { t: 1950, text: '[INFO] Simulation infrastructure coming in a later phase — this run is a mocked preview of terminal output only.', cls: 'term-accent' },
    ];
    steps.forEach((s) => setTimeout(() => terminal.appendLine(s.text, s.cls), s.t));
    setTimeout(() => toolbar.setBusy(false), steps[steps.length - 1].t + 150);
  }

  function checkActiveFile(){
    const path = tabs.activePath;
    terminal.toggleCollapse(false);
    if (!path){ terminal.appendLine('No file is open to check.', 'term-warn', 'problems'); terminal.setActive('problems'); return; }
    const content = fs.readFile(path) || '';
    const todoMatches = content.match(/#\s*TODO[^\n]*/gi) || [];
    terminal.clear('problems');
    terminal.clear('output');
    if (todoMatches.length){
      terminal.appendLine(`Check: ${todoMatches.length} TODO item${todoMatches.length > 1 ? 's' : ''} remaining in ${path.split('/').pop()}`, 'term-warn', 'output');
      todoMatches.forEach((m) => terminal.appendLine(m.trim(), 'term-warn', 'problems'));
      terminal.setActive('problems');
    } else {
      terminal.appendLine(`Check passed — no TODO markers remain in ${path.split('/').pop()}. Nice work.`, 'term-ok', 'output');
      terminal.setActive('output');
    }
  }

  function saveActiveFile(){
    const path = tabs.activePath;
    if (!path) return;
    fs.writeFile(path, editor.getValue());
    tabs.refreshDirtyState();
    refreshExplorer();
    toolbar.setFileStatus('Saved locally · ' + path.replace(/^ros2_ws\//, '~/ros2_ws/'));
    setTimeout(() => { if (tabs.activePath === path) toolbar.setFileStatus(path.replace(/^ros2_ws\//, '~/ros2_ws/')); }, 1800);
  }

  function resetActiveFile(){
    const path = tabs.activePath;
    if (!path) return;
    fs.resetFile(path);
    const original = fs.readFile(path);
    editor.setValue(path, original);
    tabs.refreshDirtyState();
    refreshExplorer();
  }

  /* ---------------------------------------------------------------- Steps */
  function renderStep(){
    setCurrentActivity(activity.id, stepIndex);
    const step = activity.steps[stepIndex];
    notebookEl.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'step-head';
    head.innerHTML = `
      <div class="step-sub">${diffTag(activity.difficulty) || (isReading ? '<span class="diff-tag reading">Reading</span>' : '')} · ${activity.estimatedTime}</div>
      <h1 class="step-title">${step.title}</h1>`;
    notebookEl.appendChild(head);

    const blocksEl = document.createElement('div');
    notebookEl.appendChild(blocksEl);
    renderBlocks(blocksEl, step.blocks, lessonCtx);
    notebookEl.scrollTop = 0;

    stepIndicatorEl.textContent = `Step ${stepIndex + 1} of ${totalSteps}`;
    renderStepNav(step);
  }

  function renderStepNav(){
    stepNavEl.innerHTML = '';
    const dots = document.createElement('div');
    dots.className = 'step-dots';
    activity.steps.forEach((s, i) => {
      const d = document.createElement('span');
      d.className = 'step-dot' + (i === stepIndex ? ' active' : i < stepIndex ? ' done' : '');
      dots.appendChild(d);
    });

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'p-btn ghost';
    prevBtn.innerHTML = `${icon('arrowLeft')}<span>${stepIndex > 0 ? activity.steps[stepIndex - 1].title : 'Back'}</span>`;
    prevBtn.addEventListener('click', () => {
      if (stepIndex > 0){ stepIndex -= 1; renderStep(); }
      else nav.section(section.id);
    });

    const isLast = stepIndex === totalSteps - 1;
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'p-btn primary';
    nextBtn.innerHTML = isLast
      ? `<span>Finish Activity</span>${icon('checkCircle')}`
      : `<span>${activity.steps[stepIndex + 1].title}</span>${icon('arrowRight')}`;
    nextBtn.addEventListener('click', async () => {
      if (isLast){ await finishActivity(); }
      else { stepIndex += 1; renderStep(); }
    });

    stepNavEl.appendChild(prevBtn);
    stepNavEl.appendChild(dots);
    stepNavEl.appendChild(nextBtn);
  }

  async function finishActivity(){
    await markComplete(activity.id);
    ctx.refreshDesktop && ctx.refreshDesktop();

    const flat = flattenActivities();
    const idx = flat.findIndex((e) => e.activity.id === activity.id);
    const next = flat[idx + 1];

    notebookEl.innerHTML = `
      <div class="aw-complete">
        <div class="aw-complete-icon">${icon('checkCircle')}</div>
        <h2>${activity.title} complete.</h2>
        <p>${(activity.completionSummary && activity.completionSummary.text) || ''}</p>
        ${(activity.completionSummary && activity.completionSummary.conceptsUsed && activity.completionSummary.conceptsUsed.length)
          ? `<div class="aw-complete-concepts">${activity.completionSummary.conceptsUsed.map((c) => `<span class="aw-complete-chip">${c}</span>`).join('')}</div>` : ''}
        <div style="display:flex;gap:10px;justify-content:center">
          ${next ? `<button type="button" class="p-btn primary" data-next-activity>${icon('arrowRight')}<span>${next.activity.title}</span></button>` : ''}
          <button type="button" class="p-btn ghost" data-back-section><span>Back to ${section.title}</span></button>
        </div>
      </div>`;
    stepNavEl.innerHTML = '';
    const nextBtn = notebookEl.querySelector('[data-next-activity]');
    if (nextBtn) nextBtn.addEventListener('click', () => nav.activity(next.activity.id));
    notebookEl.querySelector('[data-back-section]').addEventListener('click', () => nav.section(section.id));
  }

  renderStep();

  return {
    unmount(){
      if (editor) editor.dispose();
      disposeResizer();
    },
  };
}
