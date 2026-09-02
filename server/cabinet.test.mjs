import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCabinet, patchCabinet, analyticsReport, listTeamMembers, addCabinetItem,
} from './cabinet.mjs';

test('normalizeCabinet fills defaults', () => {
  const c = normalizeCabinet({});
  assert.equal(c.timezone, 'Europe/Moscow');
  assert.equal(c.notifications.emailLeadgen, true);
});

test('patchCabinet merges notifications', () => {
  const c = patchCabinet({ cabinet: {} }, { notifications: { emailPublish: true } });
  assert.equal(c.notifications.emailPublish, true);
  assert.equal(c.notifications.emailLeadgen, true);
});

test('analyticsReport aggregates user data', () => {
  const now = Date.now();
  const db = {
    users: [{ id: 'u1', name: 'A', email: 'a@b.c' }],
    accounts: [{ id: 'vk1', userId: 'u1', status: 'active' }],
    jobs: [{ userId: 'u1', ok: true, at: new Date(now).toISOString(), campaignId: 'c1' }],
    campaigns: [{ id: 'c1', userId: 'u1', slug: 'leadgen-vk', status: 'running' }],
    leads: [{ userId: 'u1', createdAt: now }],
    contentPosts: [{ userId: 'u1', status: 'draft' }],
    pubLogs: [{ userId: 'u1', status: 'ok', createdAt: now }],
    leadgenMatches: [],
  };
  const r = analyticsReport(db, 'u1', 7);
  assert.equal(r.summary.connectedAccounts, 1);
  assert.equal(r.summary.actions, 1);
  assert.equal(r.summary.publishOk, 1);
  assert.ok(r.series.length >= 7);
});

test('listTeamMembers returns owner', () => {
  const db = { users: [{ id: 'u1', name: 'Owner', email: 'o@t.ru' }] };
  const rows = listTeamMembers(db, 'u1');
  assert.equal(rows[0].role, 'owner');
});

test('addCabinetItem appends signature', () => {
  const list = addCabinetItem([], { name: 'Sig', text: '— Команда' });
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Sig');
});
