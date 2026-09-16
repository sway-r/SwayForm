/* Monaco Editor wrapper. Loaded from a CDN via Monaco's own AMD loader
   (this repo has no bundler, so there's no npm-installed copy) — with a
   plain-<textarea> fallback if the CDN can't be reached, so the Learn app
   still works offline / with a slow network instead of hard-failing. */

const MONACO_VERSION = '0.47.0';
const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;
const LOAD_TIMEOUT_MS = 7000;

let monacoPromise = null;

function loadMonaco(){
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    if (window.monaco) { resolve(window.monaco); return; }
    const timer = setTimeout(() => finish(null, new Error('Monaco load timed out')), LOAD_TIMEOUT_MS);

    // Don't cache a failed load — a transient CDN/network hiccup would
    // otherwise permanently strand every future CodeEditor in textarea
    // fallback mode for the rest of the session, since monacoPromise is
    // module-level and loadMonaco() short-circuits to it once set.
    const finish = (val, err) => { clearTimeout(timer); if (err) { monacoPromise = null; reject(err); } else resolve(val); };

    const loaderScript = document.createElement('script');
    loaderScript.src = `${MONACO_BASE}/loader.js`;
    loaderScript.onload = () => {
      try {
        window.require.config({ paths: { vs: MONACO_BASE } });
        window.require(['vs/editor/editor.main'], () => finish(window.monaco));
      } catch (err) { finish(null, err); }
    };
    loaderScript.onerror = () => finish(null, new Error('Monaco script failed to load'));
    document.head.appendChild(loaderScript);
  });
  return monacoPromise;
}

/** A single editor surface that can switch between open files (Monaco models),
 *  preserving per-file cursor/scroll/undo state while it's alive. */
export class CodeEditor {
  constructor(container, { theme = 'vs-dark', onChange, onCursor } = {}){
    this.container = container;
    this.theme = theme;
    this.onChangeCb = onChange;
    this.onCursorCb = onCursor;
    this.monaco = null;
    this.editor = null;
    this.models = new Map(); // path -> monaco.editor.ITextModel
    this.mode = 'loading';
    this.textarea = null;
    this.activePath = null;
    this.disposed = false;
  }

  async mount(){
    try {
      const monaco = await loadMonaco();
      // dispose() can run while the CDN load above is still in flight (the
      // window/tab was closed before Monaco finished loading) — without this,
      // mount() would go on to create a live editor bound to a container
      // nobody will ever dispose, on a model nobody asked for anymore.
      if (this.disposed) return;
      this.monaco = monaco;
      this.mode = 'monaco';
      this.editor = this.monaco.editor.create(this.container, {
        theme: this.theme,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        lineHeight: 21,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderLineHighlight: 'line',
        padding: { top: 14 },
        tabSize: 4,
      });
      this.editor.onDidChangeModelContent(() => {
        if (this.onChangeCb && this.activePath) this.onChangeCb(this.activePath, this.editor.getValue());
      });
      this.editor.onDidChangeCursorPosition((e) => {
        if (this.onCursorCb) this.onCursorCb(e.position);
      });
    } catch (err){
      if (this.disposed) return;
      this.mode = 'textarea';
      this.textarea = document.createElement('textarea');
      this.textarea.className = 'fallback-editor';
      this.textarea.spellcheck = false;
      this.container.appendChild(this.textarea);
      this.textarea.addEventListener('input', () => {
        if (this.onChangeCb && this.activePath) this.onChangeCb(this.activePath, this.textarea.value);
      });
    }
  }

  openFile(path, content, language){
    this.activePath = path;
    if (this.mode === 'monaco'){
      let model = this.models.get(path);
      let isNewModel = false;
      if (!model){
        model = this.monaco.editor.createModel(content, language || 'plaintext');
        this.models.set(path, model);
        isNewModel = true;
      }
      this.editor.setModel(model);
      this.editor.focus();
      if (isNewModel) this._foldAllExceptTodos();
    } else if (this.mode === 'textarea'){
      this.textarea.value = content;
      this.textarea.focus();
    }
  }

  /** First time a file is opened this session, collapse every top-level
   *  function/class so students see the shape of the file first, then
   *  re-expand only the one(s) containing a `# TODO` — the part they
   *  actually need to change. Files with no TODO (read-only demos like
   *  wave.py) just stay fully folded. Only runs once per model so a
   *  student's own fold/unfold choices persist across switching files. */
  _foldAllExceptTodos(){
    const { editor, monaco } = this;
    const model = editor.getModel();
    if (!editor || !model) return;
    const foldAll = editor.getAction('editor.foldAll');
    if (!foldAll) return;
    foldAll.run().then(() => {
      const todoLines = [];
      for (let i = 1; i <= model.getLineCount(); i++){
        if (/#\s*TODO/.test(model.getLineContent(i))) todoLines.push(i);
      }
      if (!todoLines.length) return;
      editor.setSelections(todoLines.map((line) => new monaco.Selection(line, 1, line, 1)));
      const unfold = editor.getAction('editor.unfoldRecursively');
      if (unfold) unfold.run();
      const first = todoLines[0];
      editor.revealLineInCenter(first);
      editor.setSelection(new monaco.Selection(first, 1, first, 1));
    });
  }

  /** Sync a model's text to `content` without touching undo history of other files
   *  (used when a file is reset or externally changed, e.g. Reset button). */
  setValue(path, content){
    if (this.mode === 'monaco'){
      const model = this.models.get(path);
      if (model) model.setValue(content);
    } else if (this.mode === 'textarea' && this.activePath === path){
      this.textarea.value = content;
    }
  }

  getValue(){
    if (this.mode === 'monaco') return this.editor ? this.editor.getValue() : '';
    return this.textarea ? this.textarea.value : '';
  }

  /** Read-only is per-open-file (workspace-config.js decides which), so it's
   *  set on every openFile rather than once at construction. */
  setReadOnly(readOnly){
    if (this.mode === 'monaco' && this.editor) this.editor.updateOptions({ readOnly: !!readOnly });
    else if (this.textarea) this.textarea.readOnly = !!readOnly;
  }

  insertAtCursor(text){
    if (this.mode === 'monaco' && this.editor){
      const sel = this.editor.getSelection();
      this.editor.executeEdits('insert-from-lesson', [{ range: sel, text, forceMoveMarkers: true }]);
      this.editor.focus();
    } else if (this.textarea){
      const ta = this.textarea;
      const start = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.focus();
      if (this.onChangeCb && this.activePath) this.onChangeCb(this.activePath, ta.value);
    }
  }

  closeFile(path){
    if (this.mode === 'monaco'){
      const model = this.models.get(path);
      if (model){ model.dispose(); this.models.delete(path); }
    }
  }

  dispose(){
    this.disposed = true;
    if (this.mode === 'monaco' && this.editor) this.editor.dispose();
    this.models.forEach((m) => m.dispose());
    this.models.clear();
  }
}
