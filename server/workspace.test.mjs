import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveUserId, workspaceUser, scopeUser } from './workspace.mjs';

test('effectiveUserId returns owner for team members', () => {
  const member = { id: 'u2', teamOwnerId: 'u1' };
  assert.equal(effectiveUserId(member), 'u1');
  assert.equal(effectiveUserId({ id: 'u1' }), 'u1');
});

test('scopeUser maps id to workspace', () => {
  const scoped = scopeUser({ id: 'u2', email: 'm@t.ru', teamOwnerId: 'u1', teamRole: 'admin' });
  assert.equal(scoped.id, 'u1');
  assert.equal(scoped.actorId, 'u2');
  assert.equal(scoped.teamOwnerId, 'u1');
});

test('workspaceUser resolves owner row', () => {
  const db = {
    users: [
      { id: 'u1', name: 'Owner' },
      { id: 'u2', teamOwnerId: 'u1', name: 'Member' },
    ],
  };
  assert.equal(workspaceUser(db, db.users[1]).id, 'u1');
});
