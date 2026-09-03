import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCabinet, patchCabinet, analyticsReport, listTeamMembers, addCabinetItem,
  inviteTeamMember, patchTeamMember, removeTeamMember, teamPayload, findPendingTeamInvite,
} from './cabinet.mjs';

test('normalizeCabinet fills defaults', () => {
  const c = normalizeCabinet({});
  assert.equal(c.timezone, 'Europe/Moscow');
  assert.equal(c.notifications.emailLeadgen, true);
  assert.deepEqual(c.rubrics, []);
  assert.deepEqual(c.watermarks, []);
});

test('patchCabinet merges rubrics', () => {
  const c = patchCabinet({ cabinet: {} }, { rubrics: [{ id: 'r1', name: 'A', text: 'Hi' }] });
  assert.equal(c.rubrics.length, 1);
  assert.equal(c.rubrics[0].name, 'A');
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

test('inviteTeamMember adds pending invite', () => {
  const db = { users: [{ id: 'u1', email: 'o@t.ru', name: 'Owner' }] };
  const r = inviteTeamMember(db, 'u1', { email: 'm@t.ru', role: 'admin' });
  assert.equal(r.ok, true);
  assert.equal(r.added, false);
  assert.equal(db.users[0].teamInvites.length, 1);
  const payload = teamPayload(db, 'u1');
  assert.equal(payload.members.length, 2);
  assert.equal(payload.members[1].status, 'pending');
});

test('inviteTeamMember attaches existing user', () => {
  const db = {
    users: [
      { id: 'u1', email: 'o@t.ru', name: 'Owner' },
      { id: 'u2', email: 'm@t.ru', name: 'Member' },
    ],
  };
  const r = inviteTeamMember(db, 'u1', { email: 'm@t.ru', role: 'member' });
  assert.equal(r.ok, true);
  assert.equal(r.added, true);
  assert.equal(db.users[1].teamOwnerId, 'u1');
});

test('patch and remove team member', () => {
  const db = {
    users: [
      { id: 'u1', email: 'o@t.ru' },
      { id: 'u2', email: 'm@t.ru', teamOwnerId: 'u1', teamRole: 'member' },
    ],
  };
  const patched = patchTeamMember(db, 'u1', 'u2', { role: 'admin' });
  assert.equal(patched.ok, true);
  assert.equal(db.users[1].teamRole, 'admin');
  const removed = removeTeamMember(db, 'u1', 'u2');
  assert.equal(removed.ok, true);
  assert.equal(db.users[1].teamOwnerId, undefined);
});

test('findPendingTeamInvite validates email', () => {
  const db = {
    users: [{
      id: 'u1',
      email: 'o@t.ru',
      teamInvites: [{ id: 'ti1', email: 'm@t.ru', role: 'member', token: 'abc', status: 'pending' }],
    }],
  };
  assert.equal(findPendingTeamInvite(db, 'abc', 'm@t.ru').ok, true);
  assert.equal(findPendingTeamInvite(db, 'abc', 'x@t.ru').ok, false);
});

test('addCabinetItem appends signature', () => {
  const list = addCabinetItem([], { name: 'Sig', text: '— Команда' });
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Sig');
});
