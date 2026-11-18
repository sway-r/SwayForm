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
 *   1. Getting Started   , orientation, safety, and how to use the portal
 *   2. Introduction to ROS 2, the software ideas the labs rely on
 *   3. Pre-Installed Demos, explore existing behaviors (5 items, all built)
 *   4. Foundation Labs   , 20 labs, one behavior or task each: labs 1-10
 *        available, labs 11-20 planned placeholders
 *   5. Behavior Sections , the main course, one group per behavior section
 *        (item.group): 5.1 Wave (wave-section.js), 5.2 Greeting Gestures
 *        (handshake-section.js), then the planned ones
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

// Lessons written for the current portal live in orientation-section.js. Older lessons
// (welcome-original, how-the-hub-works, connect-to-your-robot, your-project-and-updates,
// how-swayform-uses-ros2, editing-and-running-python, terminal-basics, navigating-the-workspace,
// meet-robot-yaml, joint-commands-and-motion-safety, debugging-basics) stay in learning-path.js, unlisted.
const s1 = [
  real('welcome', 'getting-started', '1.01'),
  real('safety-first', 'getting-started', '1.02'),
  real('using-the-portal', 'getting-started', '1.03'),
  real('how-a-lab-works', 'getting-started', '1.04'),
  real('quizzes-and-grades', 'getting-started', '1.05'),
];

const s2 = [
  real('what-is-ros2', 'ros2-intro', '2.01'),
  real('nodes-topics-pubsub', 'ros2-intro', '2.02'),
  real('ros2-on-swayform', 'ros2-intro', '2.03'),
  real('packages-and-ros2-run', 'ros2-intro', '2.04'),
  real('inside-a-behavior-file', 'ros2-intro', '2.05'),
  real('joints-servos-and-limits', 'ros2-intro', '2.06'),
  real('output-and-errors', 'ros2-intro', '2.07'),
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

// Behavior Sections: every behavior section lives in this one category, as numbered groups
// (5.1 Wave, 5.2 Greeting Gestures, ...). Labs are numbered inside their group: 5.1.03.
function grouped(group, ids) {
  return ids.map((id, i) => ({ ...real(id, 'behavior-sections', `${group.number}.${String(i + 1).padStart(2, '0')}`), group }));
}
const WAVE = { id: 'wave', number: '5.1', title: 'Wave', description: 'Finish a wave program one piece at a time, then send it to the robot. 6 labs.' };
const GREETINGS = { id: 'greeting-gestures', number: '5.2', title: 'Greeting Gestures', description: 'One movement structure, three greetings: build a handshake, reuse it for a fist bump, then plan and write a beckon. 12 labs.' };
const NEXT = { id: 'coming-soon', number: '5.3', title: 'More Behavior Sections', description: 'Planned.' };
const s5 = [
  // Content lives in wave-section.js.
  ...grouped(WAVE, ['wv-01-intro', 'wv-02-imports-settings', 'wv-03-functions', 'wv-04-loops', 'wv-05-order-cleanup', 'wv-06-run']),
  // Content lives in handshake-section.js.
  ...grouped(GREETINGS, ['hs-01-meet-the-handshake', 'hs-02-joint-control', 'hs-03-sequencing', 'hs-04-coordination', 'hs-05-run',
    'fb-06-from-handshake', 'fb-07-positions', 'fb-08-timing', 'fb-09-finish', 'fb-10-run', 'bk-11-plan', 'bk-12-challenge']),
  { ...placeholder('behavior-sections-21', 'behavior-sections', '5.3.01', 'More Behavior Sections: Coming Soon',
    'Wave and Greeting Gestures are the first two behavior sections. About 10 in all, each built around robot behaviors, and students write more of the code as they go, from about 30% in the first sections to about 75% by the last. Section and lab titles will be added here as they are built.'), group: NEXT },
];

export const CURRICULUM = {
  id: 'swayform-robotics-path',
  title: 'SwayForm Robotics Path',
  sections: [
    {
      id: 'getting-started', number: 1, title: 'Getting Started', type: 'reading', icon: 'target',
      description: 'Safety, and how to use the Learning Portal: the apps, labs, robot runs, quizzes and grades.',
      items: s1,
    },
    {
      id: 'ros2-intro', number: 2, title: 'Introduction to ROS 2', type: 'reading', icon: 'layers',
      description: 'The ROS 2 ideas every lab relies on: nodes, packages, behavior files, joints and limits, and reading errors.',
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
      id: 'behavior-sections', number: 5, title: 'Behavior Sections', type: 'lab', icon: 'projects', sequential: true,
      description: 'The main course: about 10 sections, each built around robot behaviors. Each section ends with a run on the real robot.',
      items: s5,
    },
  ],
};

/* ---- Lookup helpers: the single source of truth for every Learn view ---- */

/** Sections 4 and 5 only: the lab sections. Getting Started / ROS 2 / Demos are
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

/** The lab before itemId in its own section, for the Back button. */
export function prevInSection(itemId) {
  const found = findItem(itemId);
  if (!found) return null;
  const items = found.section.items;
  const idx = items.indexOf(found.item);
  return idx > 0 ? items[idx - 1] : null;
}

/** The lab after itemId in its own section, for the Next button. */
export function nextInSection(itemId) {
  const found = findItem(itemId);
  if (!found) return null;
  const items = found.section.items;
  const idx = items.indexOf(found.item);
  return items[idx + 1] || null;
}

// Off for everyone until launch: every lab and every step stays open. true brings back labs in order and step locks.
export const LABS_LOCKED = false;

/** In a sequential section, a lab opens only once every lab before it is complete.
 * Returns the first earlier lab still to finish, or null when itemId is open.
 * A lab already marked complete always stays open. */
export function blockingItem(itemId, completedIds, locked = LABS_LOCKED) {
  const found = findItem(itemId);
  if (!locked || !found || !found.section.sequential) return null;
  const done = new Set(completedIds);
  if (done.has(itemId)) return null;
  const items = found.section.items;
  return items.slice(0, items.indexOf(found.item)).find((i) => i.kind !== 'placeholder' && !done.has(i.id)) || null;
}

/** Status of one lab for lists: 'done', 'locked', 'progress' (started, not finished) or 'open'. */
export function itemStatus(item, completedIds, current, locked = LABS_LOCKED) {
  const done = new Set(completedIds);
  if (done.has(item.id)) return 'done';
  if (blockingItem(item.id, completedIds, locked)) return 'locked';
  if (current && current.activityId === item.id) return 'progress';
  // In a locked sequential section the one open, unfinished lab is the one being worked on.
  const found = findItem(item.id);
  if (locked && found && found.section.sequential) {
    const started = found.section.items.some((i) => done.has(i.id) || (current && current.activityId === i.id));
    if (started) return 'progress';
  }
  return 'open';
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
