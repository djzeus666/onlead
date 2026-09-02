import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlanTimes, postsCalendar, normalizeContentPlan } from './content-plan.mjs';

test('parsePlanTimes reads comma list', () => {
  const t = parsePlanTimes('10:00, 14:00, 18:00');
  assert.deepEqual(t, ['10:00', '14:00', '18:00']);
});

test('postsCalendar groups by day', () => {
  const ts = new Date('2026-06-15T12:00:00').getTime();
  const db = {
    contentPosts: [{
      id: 'p1', userId: 'u1', status: 'scheduled', title: 'T', text: 'x', scheduledAt: ts,
    }],
  };
  const cal = postsCalendar(db, 'u1', ts - 86400000, ts + 86400000);
  assert.ok(cal.days.length >= 1);
  assert.equal(cal.days[0].scheduled.length, 1);
});

test('normalizeContentPlan clamps slots', () => {
  const c = normalizeContentPlan({ slotsPerDay: 99 });
  assert.equal(c.slotsPerDay, 24);
});
