import { icon } from '../../../icons.js';
import { findActivity, flattenActivities } from '../../../data/learning-path.js';
import { WorkspaceWindowManager } from '../workspace/window-manager.js';
import * as NotebookApp from '../workspace/notebook-app.js';
import * as CodeEditorApp from '../workspace/code-editor-app.js';
import * as TerminalApp from '../workspace/terminal-app.js';
import { markComplete, setCurrentActivity, getCurrentActivity, isActivityComplete } from '../../../services/progress-service.js';

const LAYOUT_STORAGE_KEY = 'swayform.portal.workspace.layout';

// Default tiled workstation: Notebook fills the left column at full height;
// Code Editor and Terminal stack on the right (Code taller than Terminal).
// Tight percentage gaps (~0.3-0.4%) read as a thin divider at any screen
// width rather than a fixed-px value that would look enormous on some
// screens and cramped on others.
const DEFAULT_LAYOUT = {
  notebook:   { xPct: 0.3,  yPct: 0.5, wPct: 37,   hPct: 99 },
  codeEditor: { xPct: 37.6, yPct: 0.5, wPct: 62.1, hPct: 66 },
  terminal:   { xPct: 37.6, yPct: 66.9, wPct: 62.1, hPct: 32.6 },
};

// "Learn + Code" preset: the old two-pane arrangement, Terminal minimized.
// Its stored bounds (used if the student un-minimizes it without dragging)
// match the tiled default's bottom-right tile, not a centered float.
const LEARN_CODE_LAYOUT = {
  notebook:   { xPct: 3,  yPct: 4,  wPct: 38, hPct: 90 },
  codeEditor: { xPct: 43, yPct: 4,  wPct: 54, hPct: 90 },
  terminal:   { xPct: 37.6, yPct: 66.9, wPct: 62.1, hPct: 32.6, minimized: true },
};

const READING_DEFAULT_LAYOUT = {
  notebook: { xPct: 0.3, yPct: 0.5, wPct: 99.4, hPct: 99 },
};

const PRESETS = [
  { id: 'default', label: 'Workspace' },
  { id: 'learnCode', label: 'Learn + Code' },
  { id: 'code', label: 'Code Focus' },
  { id: 'learn', label: 'Learn Focus' },
  { id: 'terminal', label: 'Terminal Focus' },
];

export function mount(container, params, nav, ctx){
  const found = findActivity(params.activityId);
  if (!found){ nav.home(); return { unmount(){} }; }
  const { level, section, activity } = found;
  const isReading = activity.kind === 'reading';

  container.innerHTML = `
    <div class="aw-root">
      <div class="aw-header">
        <button type="button" class="aw-back" data-back>${icon('arrowLeft')}<span></span></button>
        <div class="aw-crumb">${section.title} / <strong>${activity.title}</strong></div>
        <div class="aw-header-spacer"></div>
        ${isReading ? '' : `<div class="aw-presets" data-presets></div>`}
        <button type="button" class="aw-reset-btn" data-reset-layout title="Reset Layout">${icon('refresh')}</button>
      </div>
      <div class="aw-desktop" data-desktop></div>
      <div class="aw-dock" data-dock></div>
    </div>`;

  container.querySelector('[data-back]').addEventListener('click', () => nav.section(section.id));

  const desktopEl = container.querySelector('[data-desktop]');
  const dockEl = container.querySelector('[data-dock]');
  const presetsEl = container.querySelector('[data-presets]');

  ctx.setTitle && ctx.setTitle(activity.title);

  const flat = flattenActivities();
  const idx = flat.findIndex((e) => e.activity.id === activity.id);
  const nextActivity = flat[idx + 1] ? flat[idx + 1].activity : null;

  const wm = new WorkspaceWindowManager(desktopEl, {
    storageKey: LAYOUT_STORAGE_KEY,
    defaultLayout: isReading ? READING_DEFAULT_LAYOUT : DEFAULT_LAYOUT,
  });

  async function finish(){
    await markComplete(activity.id);
    ctx.refreshDesktop && ctx.refreshDesktop();
  }

  let resumeStep = 0;
  let resumeDone = false;

  wm.registerApp('notebook', {
    title: NotebookApp.meta.title, icon: NotebookApp.meta.icon, minWidth: 320, minHeight: 260,
    render: (bodyEl, winApi) => NotebookApp.mount(bodyEl, winApi, {
      activity, section, level, nextActivity,
      initialStepIndex: resumeStep,
      isDone: resumeDone,
      lessonCtx: {
        openFile: (path) => openInCodeEditor(path),
        insertCode: (code) => { const ed = wm.getInstance('codeEditor'); if (ed) ed.insertCode(code); },
      },
      onSectionChange: (i) => { resumeStep = i; setCurrentActivity(activity.id, i); },
      onFinish: async (mode) => {
        resumeDone = true;
        await finish();
        if (mode === 'next' && nextActivity) nav.activity(nextActivity.id);
      },
    }),
  });

  function openInCodeEditor(path){
    wm.open('codeEditor');
    const inst = wm.getInstance('codeEditor');
    if (inst) inst.openFile(path);
  }

  if (!isReading){
    wm.registerApp('codeEditor', {
      title: CodeEditorApp.meta.title, icon: CodeEditorApp.meta.icon, minWidth: 420, minHeight: 300,
      render: (bodyEl, winApi) => CodeEditorApp.mount(bodyEl, winApi, {
        activity,
        onRun: (pkg, file, content) => {
          wm.open('terminal');
          const term = wm.getInstance('terminal');
          if (term) term.appendRunSequence(pkg, file, content);
        },
      }),
    });

    wm.registerApp('terminal', {
      title: TerminalApp.meta.title, icon: TerminalApp.meta.icon, minWidth: 320, minHeight: 200,
      render: (bodyEl, winApi) => TerminalApp.mount(bodyEl, winApi),
    });
  }

  /* ---------------------------------------------------------------- dock */
  function renderDock(){
    dockEl.innerHTML = '';
    const order = isReading ? ['notebook'] : ['notebook', 'codeEditor', 'terminal'];
    order.forEach((id) => {
      const cfg = { notebook: NotebookApp.meta, codeEditor: CodeEditorApp.meta, terminal: TerminalApp.meta }[id];
      const state = wm.getState(id);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'aw-dock-item' + (state.open ? ' is-open' : '') + (state.active ? ' is-active' : '') + (state.minimized ? ' is-minimized' : '');
      item.innerHTML = `<span class="aw-dock-dot"></span><span class="aw-dock-icon">${icon(cfg.icon)}</span><span class="aw-dock-label">${cfg.title}</span>`;
      item.addEventListener('click', () => wm.toggle(id));
      dockEl.appendChild(item);
    });
  }
  wm.onChange(renderDock);

  /* ---------------------------------------------------------------- presets */
  if (presetsEl){
    presetsEl.innerHTML = PRESETS.map((p) => `<button type="button" class="aw-preset-btn" data-preset="${p.id}">${p.label}</button>`).join('');
    presetsEl.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });
  }

  function applyPreset(name){
    if (name === 'default'){ wm.resetLayout(); return; }
    if (name === 'learnCode'){ wm.applyLayout(LEARN_CODE_LAYOUT); return; }
    if (name === 'code'){ wm.open('codeEditor'); wm.maximize('codeEditor'); return; }
    if (name === 'learn'){ wm.open('notebook'); wm.maximize('notebook'); return; }
    if (name === 'terminal'){ wm.open('terminal'); wm.maximize('terminal'); return; }
  }

  container.querySelector('[data-reset-layout]').addEventListener('click', () => wm.resetLayout());

  /* ---------------------------------------------------------------- boot */
  function bootDefault(){
    // Open order matters: the last one opened ends up focused/on top, so
    // Code Editor (the primary work surface) is opened last.
    wm.open('notebook', { silent: true });
    if (!isReading){
      wm.open('terminal', { silent: true });
      wm.open('codeEditor', { silent: true });
    }
    renderDock();
  }

  Promise.all([getCurrentActivity(), isActivityComplete(activity.id)]).then(([current, done]) => {
    resumeStep = (current && current.activityId === activity.id) ? (current.stepIndex || 0) : 0;
    resumeDone = done;
    setCurrentActivity(activity.id, resumeStep);
    bootDefault();
  });

  return {
    unmount(){
      wm.apps.forEach((cfg, id) => wm.close(id));
      wm.destroy();
    },
  };
}
