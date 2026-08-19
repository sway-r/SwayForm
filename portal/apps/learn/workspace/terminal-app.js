/* Terminal application — multiple independent shell tabs (Shell 1 | Shell 2 | +),
 * not a tab bolted onto the Code Editor. Command parsing lives entirely in
 * mock-shell.js; this file only renders tabs/panes and schedules output.
 *
 * Each tab is a fully independent session: its own scrollback, its own
 * command history, its own createShellState() (own cwd/prompt). That
 * per-session state object is deliberately the ONLY thing a session needs
 * to run a command (`execute(input, session.state)`) — see mock-shell.js's
 * own header comment. A future real backend swaps that one call for a
 * WebSocket message keyed by `session.id` (student cloud container -> real
 * PTY -> shared ROS 2 workspace); everything above this file (tab UI,
 * window management, Code Editor's "Run" hook) does not need to change.
 */
import { icon } from '../../../icons.js';
import { createShellState, promptFor, execute, buildRunSequence } from './mock-shell.js';
import { terminalConfigFor } from '../../../data/workspace-config.js';

export const meta = { id: 'terminal', title: 'Terminal', icon: 'terminal' };

export function mount(bodyEl, winApi, opts) {
  // Terminal bounds come from workspace-config.js (Studio-managed): a
  // workspace opens with `default` tabs, students can never close below
  // `min` or open beyond `max` (1/3/5 globally unless a lesson overrides).
  const config = terminalConfigFor(opts && opts.activity ? opts.activity.id : null);
  let sessionCounter = 0;
  const sessions = []; // ordered = tab order
  let activeId = null;

  bodyEl.innerHTML = `
    <div class="term-app">
      <div class="term-shell-tabbar" data-tabbar></div>
      <div class="term-shell-panes" data-panes></div>
    </div>`;

  const tabbarEl = bodyEl.querySelector('[data-tabbar]');
  const panesEl = bodyEl.querySelector('[data-panes]');

  /* ---------------------------------------------------------------- sessions */
  function createSession() {
    sessionCounter += 1;
    return {
      id: 'shell-' + sessionCounter,
      label: config.namePrefix + ' ' + sessionCounter,
      state: createShellState(),
      history: [],
      historyIndex: -1,
      closed: false,
      scrollEl: null,
      promptEl: null,
      inputEl: null,
    };
  }

  function addSession() {
    if (sessions.length >= config.max) return; // hard cap from workspace-config
    const session = createSession();
    sessions.push(session);
    buildPane(session);
    renderTabbar();
    activate(session.id);
  }

  function closeSession(id) {
    if (sessions.length <= config.min) return; // never close below the configured floor
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const [session] = sessions.splice(idx, 1);
    session.closed = true; // lets any in-flight runStream() timeouts bail out quietly
    if (session.paneEl) session.paneEl.remove();
    if (activeId === id) {
      const next = sessions[idx] || sessions[idx - 1];
      activate(next.id);
    } else {
      renderTabbar();
    }
  }

  function activate(id) {
    activeId = id;
    sessions.forEach((s) => {
      if (s.paneEl) s.paneEl.classList.toggle('active', s.id === id);
    });
    renderTabbar();
    const active = sessions.find((s) => s.id === id);
    if (active) requestAnimationFrame(() => active.inputEl.focus());
  }

  function activeSession() {
    return sessions.find((s) => s.id === activeId) || null;
  }

  /* ---------------------------------------------------------------- tab bar */
  function renderTabbar() {
    tabbarEl.innerHTML = '';
    sessions.forEach((s) => {
      const tab = document.createElement('div');
      tab.className = 'term-shell-tab' + (s.id === activeId ? ' active' : '');
      tab.title = s.label + ' — double-click to rename';
      tab.innerHTML = `<span class="term-shell-tab-label"></span>` +
        (sessions.length > config.min ? `<button type="button" class="term-shell-tab-close" aria-label="Close ${s.label}">${icon('close')}</button>` : '');
      tab.querySelector('.term-shell-tab-label').textContent = s.label;
      tab.addEventListener('click', () => activate(s.id));
      tab.addEventListener('dblclick', (e) => {
        if (e.target.closest('.term-shell-tab-close')) return;
        const next = window.prompt('Rename terminal', s.label);
        if (next && next.trim()) { s.label = next.trim().slice(0, 24); renderTabbar(); }
      });
      const closeBtn = tab.querySelector('.term-shell-tab-close');
      if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeSession(s.id); });
      tabbarEl.appendChild(tab);
    });
    // + button: hidden entirely when the lesson disables terminal creation,
    // disabled (but visible, so the limit is discoverable) at the max.
    if (config.allowCreate) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'term-shell-tab-add';
      addBtn.setAttribute('aria-label', 'New terminal');
      addBtn.title = sessions.length >= config.max ? `Terminal limit (${config.max}) reached` : 'New terminal';
      addBtn.disabled = sessions.length >= config.max;
      addBtn.innerHTML = icon('plus');
      addBtn.addEventListener('click', () => addSession());
      tabbarEl.appendChild(addBtn);
    }
  }

  /* ---------------------------------------------------------------- pane DOM */
  function buildPane(session) {
    const pane = document.createElement('div');
    pane.className = 'term-shell-pane';
    pane.innerHTML = `
      <div class="term-app-scroll p-scroll" data-scroll></div>
      <div class="term-app-inputrow">
        <span class="term-app-prompt" data-prompt></span>
        <input type="text" class="term-app-input" data-input autocomplete="off" spellcheck="false" autocapitalize="off">
      </div>`;
    panesEl.appendChild(pane);
    session.paneEl = pane;
    session.scrollEl = pane.querySelector('[data-scroll]');
    session.promptEl = pane.querySelector('[data-prompt]');
    session.inputEl = pane.querySelector('[data-input]');

    updatePrompt(session);
    appendLine(session, 'SwayForm mock shell — type "help" to see available commands.', 'term-app-banner');
    wireInput(session);
  }

  function updatePrompt(session) { session.promptEl.textContent = promptFor(session.state); }

  function appendLine(session, text, cls) {
    if (session.closed) return;
    const row = document.createElement('div');
    row.className = 'term-app-line ' + (cls || '');
    row.textContent = text;
    session.scrollEl.appendChild(row);
    session.scrollEl.scrollTop = session.scrollEl.scrollHeight;
  }

  function appendCommandEcho(session, cmdText) {
    if (session.closed) return;
    const row = document.createElement('div');
    row.className = 'term-app-line term-app-echo';
    row.innerHTML = `<span class="term-app-echo-prompt"></span><span></span>`;
    row.firstChild.textContent = promptFor(session.state);
    row.lastChild.textContent = ' ' + cmdText;
    session.scrollEl.appendChild(row);
    session.scrollEl.scrollTop = session.scrollEl.scrollHeight;
  }

  function runStream(session, stream) {
    stream.forEach((s) => setTimeout(() => appendLine(session, s.text, s.cls), s.t));
    return stream.length ? stream[stream.length - 1].t + 150 : 0;
  }

  function handleSubmit(session) {
    const raw = session.inputEl.value;
    session.inputEl.value = '';
    appendCommandEcho(session, raw);
    if (raw.trim()) { session.history.push(raw); session.historyIndex = session.history.length; }
    const result = execute(raw, session.state);
    if (result.clear) { session.scrollEl.innerHTML = ''; }
    (result.lines || []).forEach((l) => appendLine(session, l.text, l.cls));
    if (result.stream) runStream(session, result.stream);
    updatePrompt(session);
  }

  function wireInput(session) {
    const { inputEl } = session;
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { handleSubmit(session); }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (session.historyIndex > 0) { session.historyIndex -= 1; inputEl.value = session.history[session.historyIndex] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (session.historyIndex < session.history.length - 1) { session.historyIndex += 1; inputEl.value = session.history[session.historyIndex] || ''; }
        else { session.historyIndex = session.history.length; inputEl.value = ''; }
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        session.scrollEl.innerHTML = '';
      }
    });
  }

  bodyEl.addEventListener('mousedown', (e) => {
    const active = activeSession();
    if (active && e.target !== active.inputEl) setTimeout(() => active.inputEl.focus(), 0);
  });

  /* ---------------------------------------------------------------- boot */
  // Open the configured default number of tabs (3 globally); the first one
  // ends up active since activate() runs per addSession and we re-activate
  // the first tab after the loop for a predictable starting focus.
  for (let i = 0; i < config.default; i++) addSession();
  if (sessions.length > 1) activate(sessions[0].id);

  return {
    /** Cross-window integration point: Code Editor's Run button calls this
     *  to make it look like the command was typed directly into the shell —
     *  runs in whichever tab is currently active/visible. */
    appendRunSequence(pkg, file, content) {
      winApi.focus();
      const session = activeSession();
      if (!session) return;
      // buildRunSequence's own first line is the "$ ros2 run …" command echo —
      // no separate appendCommandEcho here, matching how a typed command looks.
      runStream(session, buildRunSequence(pkg, file, content));
      session.inputEl.focus();
    },
    focusInput() { const s = activeSession(); if (s) s.inputEl.focus(); },
    dispose() { sessions.forEach((s) => { s.closed = true; }); },
  };
}
