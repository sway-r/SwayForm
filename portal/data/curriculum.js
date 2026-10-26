/* SwayForm Learning Portal, curriculum data model v3 (information architecture pass).
 *
 * Single source of truth for ALL learning navigation: Learning Home, the
 * Curriculum Index drawer, Section pages, search, and progress counting all
 * read from CURRICULUM below. Nothing else should hand-roll a second copy
 * of this structure.
 *
 * Curriculum -> Section -> Item -> (Notebook) Step -> Block.
 *
 * The curriculum-shape and writing-style spec (~20 foundational labs, then
 * ~10-lab sections that shed the training wheels toward a from-scratch
 * finale, Notebook-style writing) lives once, at the top of
 * portal/data/learning-path.js, read it there, don't restate it here.
 *
 * This is a reorganization, not a rewrite of content: every real activity's
 * steps/blocks are pulled BY REFERENCE from the existing, unchanged
 * portal/data/learning-path.js content store (findActivity(id).activity),
 * nothing here retypes lesson content. Only the grouping/numbering/labeling
 * around that content is new.
 *
 * Five sections:
 *   1. Getting Started   , orientation, safety, and how the portal works (5 items, active)
 *   2. Introduction to ROS 2, the software ideas behind the labs (9 items, active)
 *   3. Pre-Installed Demos, explore existing behaviors (5 items, all built)
 *   4. Foundation Labs   , 20 labs, one behavior or task each: labs 1-10
 *        available, labs 11-20 planned placeholders
 *   5. Behavior Sections , labs 21+, about 10 sections of 10-12 labs each
 *        built around one behavior; Planned, nothing authored yet
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
 * swayform.net/learning-path, it does not touch the underlying Notebook
 * step/block content in learning-path.js, only what's shown in headers,
 * lists, and the curriculum index. */
function real(id, sectionId, number, overrides) {
  return { ...pull(id), ...overrides, sectionId, number };
}

/** A finished swayform_demos/ program, reclassified from 'activity' to 'demo',
 * same content, different framing (study existing code, not write it from scratch). */
function demo(id, sectionId, number) {
  return { ...pull(id), kind: 'demo', sectionId, number };
}

/** An honest "not written yet" slot, never rendered as if it were real curriculum. */
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
  real('welcome', 'getting-started', '1.01'),
  real('safety-first', 'getting-started', '1.02'),
  real('how-the-hub-works', 'getting-started', '1.03'),
  real('connect-to-your-robot', 'getting-started', '1.04'),
  real('your-project-and-updates', 'getting-started', '1.05'),
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

// Wave, Handshake, Fist Bump, and Finger Count are confirmed working demos
// with authored pages. Target Lock (live keyboard driving from the camera view)
// took the 3.05 slot from the Rock Paper Scissors placeholder, whose
// learning-path.js content stays, unlisted. Hand Mimic (formerly this
// slot) was replaced outright by Finger Count, a real confirmed behavior,
// rather than kept alongside it as a second placeholder. Pick and Place was
// removed from this section entirely (its learning-path.js content stays,
// unlisted, same as Rock Paper Scissors); interactive-exchange was removed
// entirely earlier (it's not one of the 5 demos and had no content worth
// keeping).
const s3 = [
  demo('wave', 'demos', '3.01'),
  demo('handshake', 'demos', '3.02'),
  real('fist-bump', 'demos', '3.03'),
  real('finger-count', 'demos', '3.04'),
  real('target-lock', 'demos', '3.05'),
];

// Foundation labs 1-10 are built; 11-20 are the planned titles published on
// swayform.net/learning-path. Content for retired labs stays, unlisted, in
// learning-path.js (recoverable via git history).
const s4 = [
  real('finger-curl', 'foundation', '4.01'),
  real('nod-yes', 'foundation', '4.02'),
  real('timed-torso-rotation', 'foundation', '4.03'),
  real('basic-handshake', 'foundation', '4.04'),
  real('keyboard-torso-control', 'foundation', '4.05'),
  real('keyboard-head-control', 'foundation', '4.06'),
  real('full-handshake', 'foundation', '4.07'),
  real('wave-lab', 'foundation', '4.08', { title: 'Wave Gesture' }),
  real('rps-lab', 'foundation', '4.09', { title: 'Rock Paper Scissors Game' }),
  real('combined-keyboard-control', 'foundation', '4.10'),
  placeholder('foundation-11', 'foundation', '4.11', 'Thumbs Up'),
  placeholder('foundation-12', 'foundation', '4.12', 'Salute'),
  placeholder('foundation-13', 'foundation', '4.13', 'High Five'),
  placeholder('foundation-14', 'foundation', '4.14', 'Shrug'),
  placeholder('foundation-15', 'foundation', '4.15', 'Bow'),
  placeholder('foundation-16', 'foundation', '4.16', 'Point at a Target'),
  placeholder('foundation-17', 'foundation', '4.17', 'Grab and Release'),
  placeholder('foundation-18', 'foundation', '4.18', 'Peace Sign'),
  placeholder('foundation-19', 'foundation', '4.19', 'Look Around'),
  placeholder('foundation-20', 'foundation', '4.20', 'Simple Dance Routine'),
];

// Behavior sections: about 10 sections of 10-12 labs each, starting at lab 21.
// No individual lab titles are published yet, so one honest placeholder.
const s5 = [
  placeholder('behavior-sections-21', 'behavior-sections', '5.01', 'Labs 21+: Coming Soon',
    'About 10 sections of 10-12 labs, each built around one behavior. Students write more of the code in each section, from about 25% in the first to about 75% by the tenth. Exact section and lab titles will be finalized as development continues.'),
];

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
      id: 'foundation', number: 4, title: 'Foundation Labs', type: 'lab', icon: 'terminal',
      description: 'One new behavior or task per lab, from a single finger curl to rock paper scissors.',
      items: s4,
    },
    {
      id: 'behavior-sections', number: 5, title: 'Behavior Sections', type: 'lab', icon: 'projects',
      description: 'After the foundation labs: about 10 sections of 10–12 labs, each built around one behavior. Planned.',
      items: s5,
    },
  ],
};

/* ---- Lookup helpers: the single source of truth for every Learn view ---- */

/** Sections 4-5 only: the lab sections. Getting Started / ROS 2 / Demos are
 * NOT part of the lab count. */
export const LAB_SECTION_IDS = ['foundation', 'behavior-sections'];

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

/** Next item in curriculum order after itemId, used for the Notebook's
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
    const p = sectionProgress(id, [...done]);
    total += p.total;
    complete += p.complete;
  });
  return { complete, total };
}

export function sectionProgress(sectionId, completedIds) {
  const section = findSection(sectionId);
  if (!section) return { complete: 0, total: 0 };
  const done = new Set(completedIds);
  const real = section.items.filter((i) => i.kind !== 'placeholder');
  // Planned labs count toward the total once a section has any built lab; a section with none built reports 0.
  return { complete: real.filter((i) => done.has(i.id)).length, total: real.length ? section.items.length : 0 };
}

/** Simple metadata search across section/item titles and related concepts,
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
