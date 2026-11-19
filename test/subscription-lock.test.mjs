import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, needsSubscription, SUBSCRIPTION_NOTE } from '../portal/data/curriculum.js';

const real = (id) => CURRICULUM.sections.find((s) => s.id === id).items.filter((i) => i.kind !== 'placeholder');

test('only Behavior Sections need a subscription', () => {
  assert.deepEqual(CURRICULUM.sections.filter((s) => s.subscription).map((s) => s.id), ['behavior-sections']);
});

test('demos, foundation labs and readings stay open without a subscription', () => {
  ['getting-started', 'ros2-intro', 'demos', 'foundation'].forEach((id) => {
    real(id).forEach((item) => assert.equal(needsSubscription(item.id, false), false, item.id));
  });
});

test('behavior labs are locked without full access and open with it', () => {
  const labs = real('behavior-sections');
  assert.ok(labs.length > 0);
  labs.forEach((item) => {
    assert.equal(needsSubscription(item.id, false), true, item.id);
    assert.equal(needsSubscription(item.id, true), false, item.id);
  });
});

test('the lock note names the launch and the trial, with no em dashes', () => {
  assert.match(SUBSCRIPTION_NOTE, /Fall 2027/);
  assert.match(SUBSCRIPTION_NOTE, /7-day free trial/);
  assert.ok(!SUBSCRIPTION_NOTE.includes('—'));
});
