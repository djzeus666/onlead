import assert from 'node:assert/strict';
import { test } from 'node:test';
import { liveTgPlan } from './api-helpers.mjs';

test('liveTgPlan hydrates missing lite/pro from catalog', () => {
  const until = Date.now() + 86400000;
  const plan = liveTgPlan({ tgPlan: { id: 'business', lite: 0, pro: 0, until } });
  assert.equal(plan.id, 'business');
  assert.equal(plan.lite, 3);
  assert.equal(plan.pro, 0);
  assert.equal(plan.until, until);
});

test('liveTgPlan accepts ISO until strings', () => {
  const until = new Date(Date.now() + 2 * 86400000).toISOString();
  const plan = liveTgPlan({ tgPlan: { id: 'start', lite: 1, pro: 0, until } });
  assert.equal(plan.id, 'start');
  assert.equal(plan.lite, 1);
  assert.ok(plan.until > Date.now());
});
