/* SwayForm Learning Portal — curriculum data model v3 (information architecture pass).
 *
 * Single source of truth for ALL learning navigation: Learning Home, the
 * Curriculum Index drawer, Section pages, search, and progress counting all
 * read from CURRICULUM below. Nothing else should hand-roll a second copy
 * of this structure.
 *
 * Curriculum -> Section -> Item -> (Notebook) Step -> Block.
 *
 * This is a reorganization, not a rewrite of content: every real activity's
 * steps/blocks are pulled BY REFERENCE from the existing, unchanged
 * portal/data/learning-path.js content store (findActivity(id).activity) —
 * nothing here retypes lesson content. Only the grouping/numbering/labeling
 * around that content is new.
 *
 * Seven sections:
 *   1. Getting Started   — orientation/setup reading (real content: 5 items)
 *   2. Essentials        — practical fundamentals (not authored yet: placeholders)
 *   3. Pre-Installed Demos — code walkthroughs of the real swayform_demos/ files
 *   4-7. Control / React / Perceive / Create — the 40-lab program, matching
 *        the canonical public curriculum at swayform.net/learning-path
 *        (4 levels of 10 labs). Level 1 — Control is fully built (the 10
 *        real labs in swayform_labs/lab_01..lab_10); Levels 2-4 are planned
 *        — Level 2's working titles are the real ones published on that
 *        page, Levels 3-4 are theme-only placeholders because no specific
 *        lab titles have been published for them yet. Do not resplit the
 *        Level 1 labs across levels or rename them beyond matching that
 *        page — swayform.net is the canonical source for this structure.
 *
 * Item shape (superset of the learning-path.js activity shape):
 *   { id, sectionId, number: '4.3', title, kind: 'reading'|'demo'|'activity'|'placeholder',
 *     status?: 'planned', difficulty?, estimatedTime?, summary?,
 *     workspaceFile?, relatedConcepts?: [string],
 *     steps: [ { id, title, blocks: [Block] } ],
 *     completionSummary?: { text, conceptsUsed?: [string] } }
 */
import { findActivity } from './learning-path.js';

function pull(id) {
  const found = findActivity(id);
  if (!found) throw new Error(`curriculum.js: no activity "${id}" in learning-path.js`);
  return found.activity;
}

/** A real lab/reading activity. `overrides` corrects display metadata (title/
 * difficulty/estimatedTime) to match the canonical copy already published on
 * swayform.net/learning-path — it does not touch the underlying Notebook
 * step/block content in learning-path.js, only what's shown in headers,
 * lists, and the curriculum index. */
function real(id, sectionId, number, overrides) {
  return { ...pull(id), ...overrides, sectionId, number };
}

/** A finished swayform_demos/ program, reclassified from 'activity' to 'demo' —
 * same content, different framing (study existing code, not write it from scratch). */
function demo(id, sectionId, number) {
  return { ...pull(id), kind: 'demo', sectionId, number };
}

/** An honest "not written yet" slot — never rendered as if it were real curriculum. */
function placeholder(id, sectionId, number, title, note) {
  return {
    id, sectionId, number, title, kind: 'placeholder', status: 'planned',
    difficulty: null, estimatedTime: null,
    summary: note || 'This entry is planned but not yet available.',
    steps: [{
      id: 'coming-soon',
      title: 'Coming Soon',
      blocks: [
        { type: 'callout', tone: 'note', label: 'Planned', text: note || `${title} is planned for a future update and is not available yet.` },
      ],
    }],
  };
}

const s1 = [
  real('welcome', 'getting-started', '1.1'),
  real('safety-first', 'getting-started', '1.2'),
  real('how-submissions-work', 'getting-started', '1.3'),
  real('vscode-ssh-setup', 'getting-started', '1.4'),
  real('create-student-project', 'getting-started', '1.5'),
];

const s2 = [
  placeholder('navigating-the-workspace', 'essentials', '2.1', 'Navigating the SwayForm Workspace', 'A practical tour of the file explorer, editor, and terminal — finding your way around before writing code.'),
  placeholder('editing-and-running-python', 'essentials', '2.2', 'Editing and Running Python', 'The practical edit → save → run loop you will use for every lab.'),
  placeholder('terminal-basics', 'essentials', '2.3', 'Terminal Basics', 'Enough of the terminal to run programs and read their output with confidence.'),
  placeholder('joint-commands-and-motion-safety', 'essentials', '2.4', 'Joint Commands & Motion Safety', 'How a joint command becomes physical motion, and why safe ranges matter before you touch a real lab.'),
  placeholder('debugging-basics', 'essentials', '2.5', 'Debugging Basics', 'Reading an error, finding the line it points to, and fixing it — the practical loop behind every lab.'),
];

const s3 = [
  demo('wave', 'demos', '3.1'),
  demo('handshake', 'demos', '3.2'),
  demo('pick-and-place', 'demos', '3.3'),
  demo('rock-paper-scissors', 'demos', '3.4'),
  demo('interactive-exchange', 'demos', '3.5'),
];

// Level 1 — Control: all 10 currently-available labs, in the exact order,
// titles, and difficulty published on swayform.net/learning-path (the
// canonical public curriculum). Do not resplit these across levels or
// rename them beyond matching that page — see file header.
const s4 = [
  real('hello-robot-motion', 'control', '4.01'),
  real('safe-joint-limits', 'control', '4.02', { title: 'Servo Angles and Safe Limits' }),
  real('gesture-sequence', 'control', '4.03'),
  real('head-tracking', 'control', '4.04', { title: 'Head Tracking Basics', difficulty: 'intermediate' }),
  real('button-to-motion-control', 'control', '4.05', { difficulty: 'intermediate' }),
  real('realsense-detection-basics', 'control', '4.06'),
  real('hand-pose-timing', 'control', '4.07'),
  real('base-rotation', 'control', '4.08', { title: 'Base Rotation Basics' }),
  real('behavior-priority-motion-locking', 'control', '4.09', { title: 'Behavior Priority and Motion Locking' }),
  real('mini-demo-challenge', 'control', '4.10', { difficulty: 'advanced' }),
];

// Level 2 — React: not built yet. Titles below are the actual planned
// working titles published on swayform.net/learning-path ("Labs 11–20"),
// not invented — kept as honest placeholders until each lab is authored.
const s5 = [
  placeholder('react-11', 'react', '5.01', 'Simple State Machines'),
  placeholder('react-12', 'react', '5.02', 'Custom Motion Presets'),
  placeholder('react-13', 'react', '5.03', 'Camera-Based User Greeting'),
  placeholder('react-14', 'react', '5.04', 'Object Position Mapping'),
  placeholder('react-15', 'react', '5.05', 'Two-Arm Coordination'),
  placeholder('react-16', 'react', '5.06', 'Speaker Prompts and Timing'),
  placeholder('react-17', 'react', '5.07', 'Classroom Challenge: Helpful Robot'),
  placeholder('react-18', 'react', '5.08', 'Intro to Robot Debug Logs'),
  placeholder('react-19', 'react', '5.09', 'Build Your Own Interaction'),
  placeholder('react-20', 'react', '5.10', 'Final Showcase Demo'),
];

// Level 3 — Perceive: theme only on the public site ("Vision pipelines,
// depth-based tracking, state-machine design, and multi-sensor
// integration") — no individual lab titles published yet, so these stay
// generic placeholders rather than inventing specific ones.
const s6 = Array.from({ length: 10 }, (_, i) =>
  placeholder(`perceive-${21 + i}`, 'perceive', `6.${String(i + 1).padStart(2, '0')}`, `Lab ${21 + i} — Coming Soon`,
    'Level 3 builds toward a student project track: vision pipelines, depth-based tracking, state-machine design, and multi-sensor integration. Exact lab titles will be finalized as development continues.'));

// Level 4 — Create: theme only on the public site ("Original ROS 2 package
// design, multi-node architecture, and a final showcase demo") — the
// project track, no individual lab titles published yet.
const s7 = Array.from({ length: 10 }, (_, i) =>
  placeholder(`create-${31 + i}`, 'create', `7.${String(i + 1).padStart(2, '0')}`, `Lab ${31 + i} — Coming Soon`,
    'Level 4 is the project track: fully student-authored programs, original ROS 2 package design, multi-node architecture, and a final showcase demo. Exact lab titles will be finalized as development continues.'));

export const CURRICULUM = {
  id: 'swayform-robotics-path',
  title: 'SwayForm Robotics Path',
  sections: [
    {
      id: 'getting-started', number: 1, title: 'Getting Started', type: 'reading', icon: 'target',
      description: 'Orientation, setup, safety, and connecting to your robot.',
      items: s1,
    },
    {
      id: 'essentials', number: 2, title: 'Essentials', type: 'reading', icon: 'layers',
      description: 'The practical tools required to begin programming SwayForm.',
      items: s2,
    },
    {
      id: 'demos', number: 3, title: 'Pre-Installed Demos', type: 'demo', icon: 'play',
      description: 'Explore and understand the programs already running on SwayForm.',
      items: s3,
    },
    {
      id: 'control', number: 4, title: 'Control', type: 'lab', icon: 'terminal', levelLabel: 'Level 1',
      description: 'Drive the hardware — SSH in, write joint commands, and author motion sequences. Available now.',
      items: s4,
    },
    {
      id: 'react', number: 5, title: 'React', type: 'lab', icon: 'search', levelLabel: 'Level 2',
      description: 'Add sensors — build reactive behaviors that respond to distance, IMU, and face detection in real time. Planned.',
      items: s5,
    },
    {
      id: 'perceive', number: 6, title: 'Perceive', type: 'lab', icon: 'eye', levelLabel: 'Level 3',
      description: 'Build vision systems — OpenCV pipelines, depth-based tracking, and state machine design. Planned; the project track begins here.',
      items: s6,
    },
    {
      id: 'create', number: 7, title: 'Create', type: 'lab', icon: 'projects', levelLabel: 'Level 4',
      description: 'Author full systems — fully student-written programs, multi-node architecture, and a final showcase. Planned.',
      items: s7,
    },
  ],
};

/* ---- Lookup helpers — the single source of truth for every Learn view ---- */

/** Sections 4-7 only — the "40 structured labs" the portal advertises.
 * Getting Started / Essentials / Demos are NOT part of that count. */
export const LAB_SECTION_IDS = ['control', 'react', 'perceive', 'create'];

export function findSection(sectionId) {
  return CURRICULUM.sections.find((s) => s.id === sectionId) || null;
}

export function flattenItems() {
  const out = [];
  CURRICULUM.sections.forEach((section) => {
    section.items.forEach((item) => out.push({ section, item }));
  });
  return out;
}

export function findItem(itemId) {
  return flattenItems().find((e) => e.item.id === itemId) || null;
}

/** Next item in curriculum order after itemId — used for the Notebook's
 * "next activity" action at the end of a lab. */
export function nextItem(itemId) {
  const flat = flattenItems();
  const idx = flat.findIndex((e) => e.item.id === itemId);
  return idx >= 0 && flat[idx + 1] ? flat[idx + 1].item : null;
}

export function labTotals(completedIds) {
  const done = new Set(completedIds);
  let total = 0, complete = 0;
  LAB_SECTION_IDS.forEach((id) => {
    const section = findSection(id);
    section.items.forEach((item) => {
      if (item.kind === 'placeholder') return;
      total += 1;
      if (done.has(item.id)) complete += 1;
    });
  });
  return { complete, total };
}

export function sectionProgress(sectionId, completedIds) {
  const section = findSection(sectionId);
  if (!section) return { complete: 0, total: 0 };
  const done = new Set(completedIds);
  const real = section.items.filter((i) => i.kind !== 'placeholder');
  return { complete: real.filter((i) => done.has(i.id)).length, total: real.length };
}

/** Simple metadata search across section/item titles and related concepts —
 * intentionally not semantic search, see spec: "simple metadata search is enough". */
export function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out = [];
  CURRICULUM.sections.forEach((section) => {
    if (section.title.toLowerCase().includes(q)) out.push({ type: 'section', section, item: null });
    section.items.forEach((item) => {
      if (item.kind === 'placeholder') return;
      const hay = [item.title, item.summary, ...(item.relatedConcepts || [])].join(' ').toLowerCase();
      if (hay.includes(q)) out.push({ type: 'item', section, item });
    });
  });
  return out;
}
