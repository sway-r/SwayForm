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
    const timer = setTimeout(() => reject(new Error('Monaco load timed out')), LOAD_TIMEOUT_MS);

    const finish = (val, err) => { clearTimeout(timer); err ? reject(err) : resolve(val); };

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
  }

  async mount(){
    try {
      this.monaco = await loadMonaco();
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
      if (!model){
        model = this.monaco.editor.createModel(content, language || 'plaintext');
        this.models.set(path, model);
      }
      this.editor.setModel(model);
      this.editor.focus();
    } else if (this.mode === 'textarea'){
      this.textarea.value = content;
      this.textarea.focus();
    }
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
    if (this.mode === 'monaco' && this.editor) this.editor.dispose();
    this.models.forEach((m) => m.dispose());
    this.models.clear();
  }
}
