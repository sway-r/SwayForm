import { icon } from '../../icons.js';
import { CURRICULUM } from '../../data/curriculum.js';
import { renderBlocks } from './lesson-renderer.js';
import { CodeEditor } from './editor/code-editor.js';
import { FileExplorer } from './editor/file-explorer.js';
import { EditorTabs } from './editor/editor-tabs.js';
import { TerminalPanel } from './editor/terminal-panel.js';
import { WorkspaceToolbar } from './editor/workspace-toolbar.js';
import * as fs from './editor/mock-fs.js';
import { applyReadingTheme } from '../../theme.js';

export const meta = {
  id: 'learn',
  title: 'Learn',
  icon: 'learn',
  defaultSize: { w: 1180, h: 760 },
};

const PROGRESS_KEY = 'swayform.portal.progress';
const LAST_LESSON_KEY = 'swayform.portal.learn.lastLesson';
const SPLIT_KEY = 'swayform.portal.learn.splitPct';

function loadProgress(){
  try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function saveProgress(set){
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(Array.from(set))); } catch (e) { /* noop */ }
}

function flattenLessons(){
  const flat = [];
  CURRICULUM.chapters.forEach((ch) => ch.lessons.forEach((ls) => flat.push({ chapterId: ch.id, chapterTitle: ch.title, lesson: ls })));
  return flat;
}

function findLesson(lessonId){
  for (const ch of CURRICULUM.chapters){
    const ls = ch.lessons.find((l) => l.id === lessonId);
    if (ls) return { chapter: ch, lesson: ls };
  }
  return null;
}

const STATUS_ICON = { ready: 'dot', planned: 'lock' };

export function mount(container, ctx){
  const progress = loadProgress();
  const flat = flattenLessons();
  let currentLessonId = null;
  let editor = null;
  let editorReady = false;
  let pendingOpenPath = null;

  container.innerHTML = `
    <div class="learn-root">
      <div class="learn-topbar">
        <button type="button" class="learn-rail-toggle p-btn ghost" aria-label="Toggle curriculum" data-rail-toggle>${icon('layers')}</button>
        <div class="learn-breadcrumb"></div>
        <div class="learn-topbar-spacer"></div>
        <div class="learn-progress"></div>
      </div>
      <div class="learn-body">
        <div class="learn-left">
          <div class="learn-curriculum-rail" data-rail>
            <div class="learn-rail-scroll p-scroll"></div>
          </div>
          <div class="learn-notebook p-scroll content-surface"></div>
        </div>
        <div class="learn-resizer" data-resizer></div>
        <div class="learn-right">
          <div class="learn-toolbar" data-toolbar></div>
          <div class="learn-editor-area">
            <div class="learn-explorer p-scroll" data-explorer></div>
            <div class="learn-editor-main">
              <div class="learn-tabs" data-tabs></div>
              <div class="learn-editor-surface" data-editor-surface><div class="editor-loading">Loading editor…</div></div>
              <div class="learn-terminal" data-terminal></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const railEl = container.querySelector('[data-rail]');
  const railScroll = container.querySelector('.learn-rail-scroll');
  const notebookEl = container.querySelector('.learn-notebook');
  const breadcrumbEl = container.querySelector('.learn-breadcrumb');
  const progressEl = container.querySelector('.learn-progress');
  const explorerEl = container.querySelector('[data-explorer]');
  const tabsEl = container.querySelector('[data-tabs]');
  const editorSurfaceEl = container.querySelector('[data-editor-surface]');
  const terminalEl = container.querySelector('[data-terminal]');
  const toolbarEl = container.querySelector('[data-toolbar]');
  const leftEl = container.querySelector('.learn-left');
  const resizerEl = container.querySelector('[data-resizer]');
  const bodyEl = container.querySelector('.learn-body');
  applyReadingTheme(notebookEl);

  /* ---------------------------------------------------------------- Editor workspace */
  const explorer = new FileExplorer(explorerEl, { onSelect: (path) => openWorkspaceFile(path) });
  const tabs = new EditorTabs(tabsEl, {
    onSelect: (path) => openWorkspaceFile(path, { fromTab: true }),
    onClose: (closedPath, nextActive) => {
      if (editor) editor.closeFile(closedPath);
      if (nextActive) openWorkspaceFile(nextActive, { fromTab: true });
      else showEditorEmptyState();
    },
  });
  const terminal = new TerminalPanel(terminalEl);
  const toolbar = new WorkspaceToolbar(toolbarEl, {
    onRun: runActiveFile,
    onCheck: checkActiveFile,
    onSave: saveActiveFile,
    onReset: resetActiveFile,
  });

  function refreshExplorer(){
    explorer.render(fs.buildTree(), tabs.activePath);
  }
  refreshExplorer();

  function showEditorEmptyState(){
    toolbar.setFileStatus('No file open');
  }
  showEditorEmptyState();

  editor = new CodeEditor(editorSurfaceEl.parentElement ? editorSurfaceEl : editorSurfaceEl, {
    onChange: (path, value) => {
      fs.writeFile(path, value);
      tabs.refreshDirtyState();
      refreshExplorer();
    },
  });
  editorSurfaceEl.innerHTML = '';
  editor.mount().then(() => {
    editorReady = true;
    if (pendingOpenPath) { const p = pendingOpenPath; pendingOpenPath = null; openWorkspaceFile(p); }
  });

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

  ctx.setAppTitle && ctx.setAppTitle('Learn');

  /* ---------------------------------------------------------------- Mock Run / Check */
  function packageAndEntry(path){
    const parts = path.split('/');
    const pkg = parts[2] || 'swayform_demos';
    const file = parts[parts.length - 1].replace(/\.py$/, '');
    return { pkg, file };
  }

  function runActiveFile(){
    const path = tabs.activePath;
    if (!path){ terminal.appendLine('No file is open. Open a file from the workspace to run it.', 'term-warn'); terminal.setActive('terminal'); return; }
    terminal.setActive('terminal');
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

  /* ---------------------------------------------------------------- Lesson blocks -> editor bridge */
  const lessonCtx = {
    openFile: (path) => openWorkspaceFile(path),
    insertCode: (code) => { if (editor) editor.insertAtCursor(code); },
  };

  /* ---------------------------------------------------------------- Curriculum rail */
  function renderRail(){
    railScroll.innerHTML = '';
    CURRICULUM.chapters.forEach((ch) => {
      const chWrap = document.createElement('div');
      chWrap.className = 'rail-chapter';
      const chHdr = document.createElement('button');
      chHdr.type = 'button';
      const containsActive = ch.lessons.some((l) => l.id === currentLessonId);
      chHdr.className = 'rail-chapter-hdr' + (containsActive ? ' open' : '');
      chHdr.innerHTML = `<span>${ch.title}</span><span class="rail-chapter-caret">${icon('chevronDown')}</span>`;
      const list = document.createElement('div');
      list.className = 'rail-lessons' + (containsActive ? ' open' : '');
      ch.lessons.forEach((ls) => {
        const item = document.createElement('button');
        item.type = 'button';
        const done = progress.has(ls.id);
        const isActive = ls.id === currentLessonId;
        item.className = 'rail-lesson' + (isActive ? ' active' : '') + (ls.locked ? ' locked' : '');
        item.innerHTML = `<span class="rail-lesson-status ${done ? 'done' : ls.status}">${done ? icon('check') : (ls.locked ? icon('lock') : '')}</span><span class="rail-lesson-title">${ls.title}</span>`;
        item.addEventListener('click', () => { if (!ls.locked) selectLesson(ch.id, ls.id); });
        list.appendChild(item);
      });
      chHdr.addEventListener('click', () => {
        chHdr.classList.toggle('open');
        list.classList.toggle('open');
      });
      chWrap.appendChild(chHdr);
      chWrap.appendChild(list);
      railScroll.appendChild(chWrap);
    });
  }

  container.querySelector('[data-rail-toggle]').addEventListener('click', () => {
    railEl.classList.toggle('collapsed');
  });
  let wasNarrow = null;
  const narrowObserver = new ResizeObserver(() => {
    const isNarrow = container.clientWidth < 900;
    if (isNarrow !== wasNarrow){
      railEl.classList.toggle('collapsed', isNarrow);
      wasNarrow = isNarrow;
    }
  });
  narrowObserver.observe(container);

  /* ---------------------------------------------------------------- Lesson selection */
  function selectLesson(chapterId, lessonId){
    const found = findLesson(lessonId);
    if (!found) return;
    currentLessonId = lessonId;
    try { localStorage.setItem(LAST_LESSON_KEY, lessonId); } catch (e) { /* noop */ }

    breadcrumbEl.innerHTML = `<span class="crumb-course">${CURRICULUM.title}</span><span class="crumb-sep">/</span><span class="crumb-chapter">${found.chapter.title}</span><span class="crumb-sep">/</span><span class="crumb-lesson">${found.lesson.title}</span>`;

    renderRail();
    renderLessonBody(found.chapter, found.lesson);

    if (found.lesson.workspaceFile){
      openWorkspaceFile(found.lesson.workspaceFile);
    }

    ctx.setTitle && ctx.setTitle(found.lesson.title);
    ctx.navigate && ctx.navigate(null, { courseId: CURRICULUM.id, lessonId });
  }

  function renderLessonBody(chapter, lesson){
    notebookEl.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'lesson-head';
    const metaChips = [];
    if (lesson.level) metaChips.push(`<span class="lesson-chip level-${lesson.level}">${lesson.level.replace('-', ' ')}</span>`);
    if (lesson.time) metaChips.push(`<span class="lesson-chip">${lesson.time}</span>`);
    metaChips.push(`<span class="lesson-chip status-${lesson.status}">${lesson.status === 'ready' ? 'Available' : 'Planned'}</span>`);
    head.innerHTML = `<h1 class="lesson-title">${lesson.title}</h1><div class="lesson-meta">${metaChips.join('')}</div>`;
    notebookEl.appendChild(head);

    const blocksEl = document.createElement('div');
    notebookEl.appendChild(blocksEl);
    renderBlocks(blocksEl, lesson.blocks, lessonCtx);

    const navRow = document.createElement('div');
    navRow.className = 'lesson-nav-row';
    const idx = flat.findIndex((f) => f.lesson.id === lesson.id);
    const prev = flat[idx - 1];
    const next = flat[idx + 1];
    const done = progress.has(lesson.id);
    navRow.innerHTML = `
      <button type="button" class="p-btn ghost" data-prev ${prev ? '' : 'disabled'}>${icon('arrowLeft')}<span>${prev ? prev.lesson.title : 'Start'}</span></button>
      <button type="button" class="p-btn ${done ? '' : 'primary'} lesson-complete-btn">${icon('checkCircle')}<span>${done ? 'Completed' : 'Mark complete'}</span></button>
      <button type="button" class="p-btn ghost" data-next ${next ? '' : 'disabled'}>${next ? '' : ''}<span>${next ? next.lesson.title : 'End'}</span>${icon('arrowRight')}</button>`;
    if (prev) navRow.querySelector('[data-prev]').addEventListener('click', () => selectLesson(prev.chapterId, prev.lesson.id));
    if (next) navRow.querySelector('[data-next]').addEventListener('click', () => selectLesson(next.chapterId, next.lesson.id));
    navRow.querySelector('.lesson-complete-btn').addEventListener('click', () => {
      if (progress.has(lesson.id)) progress.delete(lesson.id); else progress.add(lesson.id);
      saveProgress(progress);
      renderRail();
      renderProgress();
      renderLessonBody(chapter, lesson);
    });
    notebookEl.appendChild(navRow);
    notebookEl.scrollTop = 0;
  }

  function renderProgress(){
    const readyLessons = flat.filter((f) => f.lesson.status === 'ready');
    const done = readyLessons.filter((f) => progress.has(f.lesson.id)).length;
    progressEl.innerHTML = `<span class="learn-progress-text">${done} / ${readyLessons.length} complete</span><span class="learn-progress-bar"><span style="width:${readyLessons.length ? (done / readyLessons.length * 100) : 0}%"></span></span>`;
  }
  renderProgress();

  /* ---------------------------------------------------------------- Split resizer */
  const disposeResizer = (function initResizer(){
    let pct;
    try { pct = parseFloat(localStorage.getItem(SPLIT_KEY)); } catch (e) { pct = NaN; }
    if (!pct || pct < 20 || pct > 70) pct = 40;
    let currentPct = pct;
    applySplit(pct);

    let dragging = false;
    const onDown = () => { dragging = true; document.body.style.cursor = 'col-resize'; };
    const onMove = (e) => {
      if (!dragging) return;
      const rect = bodyEl.getBoundingClientRect();
      let p = ((e.clientX - rect.left) / rect.width) * 100;
      p = Math.max(24, Math.min(66, p));
      applySplit(p);
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
    return () => {
      resizerEl.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    function applySplit(p){
      currentPct = p;
      leftEl.style.width = p + '%';
    }
  })();

  /* ---------------------------------------------------------------- Boot */
  function initialLesson(params){
    if (params && params.lessonId && findLesson(params.lessonId)) return params.lessonId;
    try {
      const last = localStorage.getItem(LAST_LESSON_KEY);
      if (last && findLesson(last)) return last;
    } catch (e) { /* noop */ }
    return flat[0].lesson.id;
  }

  const startId = initialLesson(null);
  const startFound = findLesson(startId);
  selectLesson(startFound.chapter.id, startId);

  return {
    onParams(params){
      if (params && params.lessonId && params.lessonId !== currentLessonId){
        const f = findLesson(params.lessonId);
        if (f) selectLesson(f.chapter.id, f.lesson.id);
      }
    },
    unmount(){
      if (editor) editor.dispose();
      narrowObserver.disconnect();
      disposeResizer();
    },
  };
}
