import test from 'node:test';
import assert from 'node:assert/strict';
import { activitySeries, activityTotals } from './stats.mjs';

test('activity buckets count jobs and leads by day', () => {
  const today = new Date().toISOString().slice(0, 10);
  const db = {
    jobs: [
      { userId: 'u1', ok: true, at: new Date().toISOString(), message: 'Лайк поста' },
      { userId: 'u1', ok: true, at: new Date().toISOString(), message: 'Касание Иван' },
      { userId: 'u2', ok: true, at: new Date().toISOString(), message: 'Лайк' },
    ],
    leads: [{ userId: 'u1', createdAt: Date.now() }],
  };
  const series = activitySeries(db, 'u1', 7);
  const row = series.find((r) => r.date === today);
  assert.equal(row.actions, 2);
  assert.equal(row.likes, 1);
  assert.equal(row.messages, 1);
  assert.equal(row.leads, 1);
  assert.equal(activityTotals(series).actions, 2);
});
