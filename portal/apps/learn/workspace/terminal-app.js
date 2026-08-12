/* Terminal application — a real shell window (scrollback + prompt input),
 * not a tab bolted onto the Code Editor. Command parsing lives entirely in
 * mock-shell.js; this file only renders and schedules output. */
import { createShellState, promptFor, execute, buildRunSequence } from './mock-shell.js';

export const meta = { id: 'terminal', title: 'Terminal', icon: 'terminal' };

export function mount(bodyEl, winApi) {
  const state = createShellState();
  const history = [];
  let historyIndex = -1;

  bodyEl.innerHTML = `
    <div class="term-app">
      <div class="term-app-scroll p-scroll" data-scroll></div>
      <div class="term-app-inputrow">
        <span class="term-app-prompt" data-prompt></span>
        <input type="text" class="term-app-input" data-input autocomplete="off" spellcheck="false" autocapitalize="off">
      </div>
    </div>`;

  const scrollEl = bodyEl.querySelector('[data-scroll]');
  const promptEl = bodyEl.querySelector('[data-prompt]');
  const inputEl = bodyEl.querySelector('[data-input]');

  function updatePrompt() { promptEl.textContent = promptFor(state); }
  updatePrompt();

  function appendLine(text, cls) {
    const row = document.createElement('div');
    row.className = 'term-app-line ' + (cls || '');
    row.textContent = text;
    scrollEl.appendChild(row);
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function appendCommandEcho(cmdText) {
    const row = document.createElement('div');
    row.className = 'term-app-line term-app-echo';
    row.innerHTML = `<span class="term-app-echo-prompt"></span><span></span>`;
    row.firstChild.textContent = promptFor(state);
    row.lastChild.textContent = ' ' + cmdText;
    scrollEl.appendChild(row);
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function runStream(stream) {
    stream.forEach((s) => setTimeout(() => appendLine(s.text, s.cls), s.t));
    return stream.length ? stream[stream.length - 1].t + 150 : 0;
  }

  appendLine('SwayForm mock shell — type "help" to see available commands.', 'term-app-banner');

  function handleSubmit() {
    const raw = inputEl.value;
    inputEl.value = '';
    appendCommandEcho(raw);
    if (raw.trim()) { history.push(raw); historyIndex = history.length; }
    const result = execute(raw, state);
    if (result.clear) { scrollEl.innerHTML = ''; }
    (result.lines || []).forEach((l) => appendLine(l.text, l.cls));
    if (result.stream) runStream(result.stream);
    updatePrompt();
  }

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { handleSubmit(); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) { historyIndex -= 1; inputEl.value = history[historyIndex] || ''; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) { historyIndex += 1; inputEl.value = history[historyIndex] || ''; }
      else { historyIndex = history.length; inputEl.value = ''; }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      scrollEl.innerHTML = '';
    }
  });

  bodyEl.addEventListener('mousedown', (e) => {
    if (e.target !== inputEl) setTimeout(() => inputEl.focus(), 0);
  });
  requestAnimationFrame(() => inputEl.focus());

  return {
    /** Cross-window integration point: Code Editor's Run button calls this
     *  to make it look like the command was typed directly into the shell. */
    appendRunSequence(pkg, file, content) {
      winApi.focus();
      // buildRunSequence's own first line is the "$ ros2 run …" command echo —
      // no separate appendCommandEcho here, matching how a typed command looks.
      runStream(buildRunSequence(pkg, file, content));
      inputEl.focus();
    },
    focusInput() { inputEl.focus(); },
    dispose() {},
  };
}
