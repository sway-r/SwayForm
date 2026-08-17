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
 *   1. Getting Started    — orientation, safety, and how the portal works (5 items, active)
 *   2. Introduction to ROS 2 — the software ideas behind Control (9 items, active)
 *   3. Pre-Installed Demos — explore existing behaviors (5 items: Wave and
 *        Handshake are built; Hand Flex, Rock Paper Scissors, and Pick and
 *        Place are honest Planned placeholders, not faked)
 *   4. Control (Level 1)  — 10 guided labs, first joint to keyboard capstone (active)
 *   5-7. React / Perceive / Create — Levels 2-4, all Planned, no lesson
 *        content authored yet (working titles only for React).
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
  real('how-the-hub-works', 'getting-started', '1.3'),
  real('connect-to-your-robot', 'getting-started', '1.4'),
  real('your-project-and-updates', 'getting-started', '1.5'),
];

const s2 = [
  real('what-is-ros2', 'ros2-intro', '2.01'),
  real('nodes-topics-pubsub', 'ros2-intro', '2.02'),
  real('how-swayform-uses-ros2', 'ros2-intro', '2.03'),
  real('editing-and-running-python', 'ros2-intro', '2.04'),
  real('terminal-basics', 'ros2-intro', '2.05'),
  real('meet-robot-yaml', 'ros2-intro', '2.06'),
  real('joint-commands-and-motion-safety', 'ros2-intro', '2.07'),
  real('debugging-basics', 'ros2-intro', '2.08'),
  real('navigating-the-workspace', 'ros2-intro', '2.09'),
];

// Only Wave and Handshake are confirmed working demos with authored pages.
// Hand Flex, Rock Paper Scissors, and Pick and Place are marked Planned —
// honest placeholders, not faked content — until their production robot
// behavior is confirmed. Rock Paper Scissors / Pick and Place keep their
// learning-path.js ids (content preserved, unlisted) in case they're
// promoted back to full demos later; interactive-exchange is dropped from
// this 5-item list entirely (content preserved, not deleted).
const s3 = [
  placeholder('hand-flex', 'demos', '3.1', 'Hand Flex', 'A simple hand open/close/flex motion. Planned — not yet available.'),
  demo('wave', 'demos', '3.2'),
  demo('handshake', 'demos', '3.3'),
  placeholder('rock-paper-scissors', 'demos', '3.4', 'Rock Paper Scissors', 'A timed rock/paper/scissors gesture. Planned — not yet available.'),
  placeholder('pick-and-place', 'demos', '3.5', 'Pick and Place', 'A full pick-and-place sequence. Planned — not yet available.'),
];

// Level 1 — Control: 10 guided labs, first-joint-to-capstone progression.
// The 10 activities previously listed here (hello-robot-motion,
// safe-joint-limits, gesture-sequence, head-tracking,
// button-to-motion-control, realsense-detection-basics, hand-pose-timing,
// base-rotation, behavior-priority-motion-locking, mini-demo-challenge)
// were replaced by this curriculum pass — their content is preserved,
// unlisted, in learning-path.js (recoverable via git history), several are
// good future React/Perceive material.
const s4 = [
  real('finger-curl', 'control', '4.01'),
  real('nod-yes', 'control', '4.02'),
  real('timed-torso-rotation', 'control', '4.03'),
  real('basic-handshake', 'control', '4.04'),
  real('keyboard-torso-control', 'control', '4.05'),
  real('keyboard-head-control', 'control', '4.06'),
  real('full-handshake', 'control', '4.07'),
  real('wave-lab', 'control', '4.08', { title: 'Wave' }),
  real('rps-lab', 'control', '4.09', { title: 'Rock Paper Scissors' }),
  real('combined-keyboard-control', 'control', '4.10'),
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
      description: 'Orientation, safety, and getting ready to use SwayForm.',
      items: s1,
    },
    {
      id: 'ros2-intro', number: 2, title: 'Introduction to ROS 2', type: 'reading', icon: 'layers',
      description: "Understand the software ideas you'll use to control SwayForm.",
      items: s2,
    },
    {
      id: 'demos', number: 3, title: 'Pre-Installed Demos', type: 'demo', icon: 'play',
      description: 'Explore and understand the programs already running on SwayForm.',
      items: s3,
    },
    {
      id: 'control', number: 4, title: 'Control', type: 'lab', icon: 'terminal', levelLabel: 'Level 1',
      description: "Program SwayForm's movement and build your first robot behaviors.",
      items: s4,
    },
    {
      id: 'react', number: 5, title: 'React', type: 'lab', icon: 'search', levelLabel: 'Level 2',
      description: 'Add real-time reactions to the world around the robot. Planned.',
      items: s5,
    },
    {
      id: 'perceive', number: 6, title: 'Perceive', type: 'lab', icon: 'eye', levelLabel: 'Level 3',
      description: 'Build perception and vision-based robot behaviors. Planned.',
      items: s6,
    },
    {
      id: 'create', number: 7, title: 'Create', type: 'lab', icon: 'projects', levelLabel: 'Level 4',
      description: 'Combine everything into complete robot projects. Planned.',
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
