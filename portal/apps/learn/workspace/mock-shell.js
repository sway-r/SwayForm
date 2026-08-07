/* Mock shell — command interpreter for the standalone Terminal app.
 * Deliberately its own module (no DOM, no window-manager knowledge) so it
 * can later be swapped for a real backend/websocket terminal without
 * touching terminal-app.js's rendering. Operates on the SAME shared
 * mock filesystem the Code Editor uses (portal/apps/learn/editor/mock-fs.js)
 * — one workspace, not a second fake copy. */
import * as fs from '../editor/mock-fs.js';

const ROOT = 'ros2_ws';

export function createShellState() {
  return { cwd: ROOT };
}

export function promptFor(state) {
  return `swayform@learning:~/${state.cwd.replace(/^ros2_ws/, 'ros2_ws')}$`;
}

function normalizePath(cwd, arg) {
  if (!arg || arg === '~') return ROOT;
  const parts = (arg.startsWith('/') ? arg.slice(1) : `${cwd}/${arg}`).split('/').filter(Boolean);
  const out = [];
  parts.forEach((p) => {
    if (p === '.') return;
    if (p === '..') { if (out.length > 1) out.pop(); return; }
    out.push(p);
  });
  const joined = out.join('/') || ROOT;
  return joined.startsWith(ROOT) ? joined : ROOT;
}

function findNode(tree, path) {
  if (path === tree.path) return tree;
  const parts = path.split('/');
  let node = tree;
  for (let i = 1; i < parts.length; i++) {
    if (!node || node.type !== 'folder') return null;
    node = node.children.find((c) => c.name === parts[i]);
  }
  return node || null;
}

/** The same staged mocked run sequence used by both `ros2 run` / `python3`
 *  in the Terminal and the Code Editor's Run button — one source of truth. */
export function buildRunSequence(pkg, file, content) {
  const hasTodo = /#\s*TODO/i.test(content || '');
  return [
    { t: 200, text: `$ ros2 run ${pkg} ${file}`, cls: 'term-cmd' },
    { t: 500, text: 'Sourcing ~/ros2_ws/install/setup.bash', cls: '' },
    { t: 700, text: `Building ${pkg}... done`, cls: 'term-ok' },
    { t: 950, text: `[INFO] [${file}]: node started`, cls: '' },
    { t: 1250, text: '[INFO] Connecting to motion controller (mock)…', cls: '' },
    { t: 1600, text: hasTodo ? `[WARN] [${file}]: one or more # TODO sections are still unfinished — behavior may be incomplete` : `[INFO] [${file}]: all required values are set`, cls: hasTodo ? 'term-warn' : '' },
    { t: 1950, text: '[INFO] Simulation infrastructure coming in a later phase — this run is a mocked preview of terminal output only.', cls: 'term-accent' },
  ];
}

const HELP_TEXT = [
  'Available commands:',
  '  pwd                     print working directory',
  '  ls [path]                list files',
  '  cd <path>                change directory',
  '  cat <file>                print a file\'s contents',
  '  echo <text>               print text',
  '  clear                    clear the terminal',
  '  colcon build              build the workspace (mocked)',
  '  ros2 run <pkg> <file>     run a node (mocked)',
  '  python3 <file>.py         run a file directly (mocked)',
  '  help                     show this message',
];

/** Executes one command line. Returns { lines, stream, clear }.
 *  `lines` prints immediately; `stream` (if present) is a delayed sequence
 *  the caller should schedule with setTimeout, same shape as buildRunSequence. */
export function execute(input, state) {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [] };
  const [cmd, ...args] = trimmed.split(/\s+/);

  switch (cmd) {
    case 'clear':
      return { lines: [], clear: true };

    case 'help':
      return { lines: HELP_TEXT.map((t) => ({ text: t, cls: '' })) };

    case 'pwd':
      return { lines: [{ text: `~/${state.cwd}`, cls: '' }] };

    case 'echo':
      return { lines: [{ text: args.join(' '), cls: '' }] };

    case 'cd': {
      const target = normalizePath(state.cwd, args[0]);
      const node = findNode(fs.buildTree(), target);
      if (!node || node.type !== 'folder') {
        return { lines: [{ text: `cd: no such directory: ${args[0] || ''}`, cls: 'term-warn' }] };
      }
      state.cwd = target;
      return { lines: [] };
    }

    case 'ls': {
      const target = args[0] ? normalizePath(state.cwd, args[0]) : state.cwd;
      const node = findNode(fs.buildTree(), target);
      if (!node) return { lines: [{ text: `ls: no such file or directory: ${args[0]}`, cls: 'term-warn' }] };
      if (node.type === 'file') return { lines: [{ text: node.name, cls: '' }] };
      const names = node.children.map((c) => c.type === 'folder' ? `${c.name}/` : c.name);
      return { lines: [{ text: names.join('  ') || '(empty)', cls: '' }] };
    }

    case 'cat': {
      if (!args[0]) return { lines: [{ text: 'cat: missing file operand', cls: 'term-warn' }] };
      const target = normalizePath(state.cwd, args[0]);
      const content = fs.readFile(target);
      if (content === null) return { lines: [{ text: `cat: ${args[0]}: No such file or directory`, cls: 'term-warn' }] };
      return { lines: content.split('\n').map((t) => ({ text: t, cls: '' })) };
    }

    case 'colcon': {
      if (args[0] !== 'build') return { lines: [{ text: `colcon: unknown subcommand '${args[0] || ''}'`, cls: 'term-warn' }] };
      return {
        lines: [{ text: '$ colcon build', cls: 'term-cmd' }],
        stream: [
          { t: 250, text: 'Starting >>> swayform_demos', cls: '' },
          { t: 450, text: 'Starting >>> swayform_labs', cls: '' },
          { t: 900, text: 'Finished <<< swayform_demos [0.6s]', cls: 'term-ok' },
          { t: 1050, text: 'Finished <<< swayform_labs [0.7s]', cls: 'term-ok' },
          { t: 1150, text: 'Summary: 2 packages finished [0.9s]', cls: 'term-accent' },
        ],
      };
    }

    case 'python3':
    case 'ros2': {
      let pkg, file, path;
      if (cmd === 'python3') {
        if (!args[0]) return { lines: [{ text: 'python3: missing file operand', cls: 'term-warn' }] };
        path = normalizePath(state.cwd, args[0]);
        const parts = path.split('/');
        pkg = parts[2] || 'swayform_demos';
        file = parts[parts.length - 1].replace(/\.py$/, '');
      } else {
        if (args[0] !== 'run' || !args[1] || !args[2]) {
          return { lines: [{ text: 'usage: ros2 run <package> <executable>', cls: 'term-warn' }] };
        }
        pkg = args[1]; file = args[2];
        path = `${ROOT}/src/${pkg}/${file}.py`;
      }
      const content = fs.readFile(path);
      if (content === null) {
        return { lines: [{ text: `No such file: ${path.replace(ROOT + '/', '')}`, cls: 'term-warn' }] };
      }
      return { lines: [], stream: buildRunSequence(pkg, file, content) };
    }

    default:
      return { lines: [{ text: `${cmd}: command not found. Type 'help' for a list of commands.`, cls: 'term-warn' }] };
  }
}
