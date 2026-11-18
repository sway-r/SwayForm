import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findSection } from '../portal/data/curriculum.js';
import { findActivity } from '../portal/data/learning-path.js';
import { WORKSPACE_FILES } from '../portal/data/workspace-files.js';

const EM_DASH = String.fromCharCode(0x2014);

test('Getting Started teaches the portal, and drops the robot-connection and project lessons', () => {
  const ids = findSection('getting-started').items.map((i) => i.id);
  assert.deepEqual(ids, ['welcome', 'safety-first', 'using-the-portal', 'how-a-lab-works', 'quizzes-and-grades']);
  assert.ok(!ids.includes('connect-to-your-robot') && !ids.includes('your-project-and-updates'));
});

test('Introduction to ROS 2 covers what the labs rely on', () => {
  const ids = findSection('ros2-intro').items.map((i) => i.id);
  assert.deepEqual(ids, ['what-is-ros2', 'nodes-topics-pubsub', 'ros2-on-swayform', 'packages-and-ros2-run', 'inside-a-behavior-file', 'joints-servos-and-limits', 'output-and-errors']);
  ids.forEach((id) => assert.ok(findActivity(id), id));
});

test('the new lessons open with a Summary, point at real lines, and have no em dashes', () => {
  const src = readFileSync(new URL('../portal/data/orientation-section.js', import.meta.url), 'utf8');
  assert.ok(!src.includes(EM_DASH));
  ['welcome', 'using-the-portal', 'how-a-lab-works', 'quizzes-and-grades', 'ros2-on-swayform', 'packages-and-ros2-run', 'inside-a-behavior-file', 'joints-servos-and-limits', 'output-and-errors'].forEach((id) => {
    const a = findActivity(id).activity;
    assert.equal(a.steps[0].id, 'summary', id);
    assert.ok(a.steps[0].blocks[0].text.includes(a.estimatedTime), id);
    a.steps.flatMap((s) => s.blocks).filter((b) => b.type === 'code' && b.workspaceFile && b.line).forEach((b) => {
      assert.equal(WORKSPACE_FILES[b.workspaceFile].split('\n')[b.line - 1], b.code.split('\n')[0], `${id} line ${b.line}`);
    });
  });
});
