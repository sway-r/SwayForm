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
 *   4-7. Foundation / Sensors / Expression / Projects — the 40-lab program.
 *        10 real labs exist today (swayform_labs/lab_01..lab_10); the other
 *        30 slots are honest "Coming Soon" placeholders, not invented content.
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

/** A real lab/reading activity, unmodified except for sectionId/number bookkeeping. */
function real(id, sectionId, number) {
  return { ...pull(id), sectionId, number };
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

const s4 = [
  real('hello-robot-motion', 'foundation', '4.1'),
  real('safe-joint-limits', 'foundation', '4.2'),
  real('gesture-sequence', 'foundation', '4.3'),
  real('base-rotation', 'foundation', '4.4'),
  placeholder('foundation-4-5', 'foundation', '4.5', 'Lab 4.5 — Coming Soon'),
  placeholder('foundation-4-6', 'foundation', '4.6', 'Lab 4.6 — Coming Soon'),
  placeholder('foundation-4-7', 'foundation', '4.7', 'Lab 4.7 — Coming Soon'),
  placeholder('foundation-4-8', 'foundation', '4.8', 'Lab 4.8 — Coming Soon'),
  placeholder('foundation-4-9', 'foundation', '4.9', 'Lab 4.9 — Coming Soon'),
  placeholder('foundation-4-10', 'foundation', '4.10', 'Lab 4.10 — Coming Soon'),
];

const s5 = [
  real('button-to-motion-control', 'sensors', '5.1'),
  real('head-tracking', 'sensors', '5.2'),
  real('realsense-detection-basics', 'sensors', '5.3'),
  placeholder('sensors-5-4', 'sensors', '5.4', 'Camera-Based Interaction', 'Greeting a user by camera and mapping detected object positions.'),
  placeholder('sensors-5-5', 'sensors', '5.5', 'Lab 5.5 — Coming Soon'),
  placeholder('sensors-5-6', 'sensors', '5.6', 'Lab 5.6 — Coming Soon'),
  placeholder('sensors-5-7', 'sensors', '5.7', 'Lab 5.7 — Coming Soon'),
  placeholder('sensors-5-8', 'sensors', '5.8', 'Lab 5.8 — Coming Soon'),
  placeholder('sensors-5-9', 'sensors', '5.9', 'Lab 5.9 — Coming Soon'),
  placeholder('sensors-5-10', 'sensors', '5.10', 'Lab 5.10 — Coming Soon'),
];

const s6 = [
  real('hand-pose-timing', 'expression', '6.1'),
  placeholder('expression-6-2', 'expression', '6.2', 'Speaker Prompts & Timing', 'Using speaker output alongside timed motion.'),
  placeholder('expression-6-3', 'expression', '6.3', 'Two-Arm Coordination', 'Coordinating both arms in a single behavior.'),
  placeholder('expression-6-4', 'expression', '6.4', 'Lab 6.4 — Coming Soon'),
  placeholder('expression-6-5', 'expression', '6.5', 'Lab 6.5 — Coming Soon'),
  placeholder('expression-6-6', 'expression', '6.6', 'Lab 6.6 — Coming Soon'),
  placeholder('expression-6-7', 'expression', '6.7', 'Lab 6.7 — Coming Soon'),
  placeholder('expression-6-8', 'expression', '6.8', 'Lab 6.8 — Coming Soon'),
  placeholder('expression-6-9', 'expression', '6.9', 'Lab 6.9 — Coming Soon'),
  placeholder('expression-6-10', 'expression', '6.10', 'Lab 6.10 — Coming Soon'),
];

const s7 = [
  real('behavior-priority-motion-locking', 'projects', '7.1'),
  placeholder('projects-7-2', 'projects', '7.2', 'State Machines & Motion Presets', 'Simple state machines and reusable custom motion presets.'),
  placeholder('projects-7-3', 'projects', '7.3', 'Classroom Challenges & Showcase Demos', 'Open-ended classroom challenges and a final showcase demo.'),
  placeholder('projects-7-4', 'projects', '7.4', 'Lab 7.4 — Coming Soon'),
  placeholder('projects-7-5', 'projects', '7.5', 'Lab 7.5 — Coming Soon'),
  placeholder('projects-7-6', 'projects', '7.6', 'Lab 7.6 — Coming Soon'),
  placeholder('projects-7-7', 'projects', '7.7', 'Lab 7.7 — Coming Soon'),
  placeholder('projects-7-8', 'projects', '7.8', 'Lab 7.8 — Coming Soon'),
  placeholder('projects-7-9', 'projects', '7.9', 'Lab 7.9 — Coming Soon'),
  real('mini-demo-challenge', 'projects', '7.10'),
];

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
      id: 'foundation', number: 4, title: 'Foundation', type: 'lab', icon: 'building', levelLabel: 'Level 1',
      description: '10 structured labs establishing the core programming patterns used throughout SwayForm.',
      items: s4,
    },
    {
      id: 'sensors', number: 5, title: 'Sensors', type: 'lab', icon: 'search', levelLabel: 'Level 2',
      description: '10 labs connecting the robot to what it can detect in its environment.',
      items: s5,
    },
    {
      id: 'expression', number: 6, title: 'Expression', type: 'lab', icon: 'user', levelLabel: 'Level 3',
      description: '10 labs composing gesture, pose, and timing into expressive behavior.',
      items: s6,
    },
    {
      id: 'projects', number: 7, title: 'Projects', type: 'lab', icon: 'projects', levelLabel: 'Level 4',
      description: '10 labs combining earlier skills into original, higher-level behaviors.',
      items: s7,
    },
  ],
};

/* ---- Lookup helpers — the single source of truth for every Learn view ---- */

/** Sections 4-7 only — the "40 structured labs" the portal advertises.
 * Getting Started / Essentials / Demos are NOT part of that count. */
export const LAB_SECTION_IDS = ['foundation', 'sensors', 'expression', 'projects'];

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
