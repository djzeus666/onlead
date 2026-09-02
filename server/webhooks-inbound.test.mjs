import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureInboundWebhookToken, rotateInboundWebhookToken, findUserByInboundToken,
  handleInboundWebhook, inboundWebhookUrl,
} from './webhooks-inbound.mjs';

test('ensureInboundWebhookToken creates stable token', () => {
  const db = { users: [{ id: 'u1' }] };
  const t1 = ensureInboundWebhookToken(db, 'u1');
  const t2 = ensureInboundWebhookToken(db, 'u1');
  assert.equal(t1, t2);
  assert.ok(t1.length >= 32);
});

test('rotateInboundWebhookToken changes token', () => {
  const db = { users: [{ id: 'u1', inboundWebhookToken: 'old' }] };
  const t = rotateInboundWebhookToken(db, 'u1');
  assert.notEqual(t, 'old');
  assert.equal(db.users[0].inboundWebhookToken, t);
});

test('findUserByInboundToken resolves user', () => {
  const db = { users: [{ id: 'u1', inboundWebhookToken: 'abc' }] };
  assert.equal(findUserByInboundToken(db, 'abc')?.id, 'u1');
  assert.equal(findUserByInboundToken(db, 'x'), null);
});

test('handleInboundWebhook creates draft post', () => {
  const db = { users: [{ id: 'u1' }], contentPosts: [], accounts: [] };
  const r = handleInboundWebhook(db, 'u1', { title: 'Hi', body: 'Text here' });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'draft');
  assert.equal(db.contentPosts.length, 1);
  assert.equal(db.contentPosts[0].title, 'Hi');
  assert.equal(db.contentPosts[0].text, 'Text here');
});

test('handleInboundWebhook schedules when scheduledAt in future', () => {
  const db = { users: [{ id: 'u1' }], contentPosts: [], accounts: [] };
  const at = Date.now() + 3600000;
  const r = handleInboundWebhook(db, 'u1', { text: 'Later', scheduledAt: at });
  assert.equal(r.status, 'scheduled');
  assert.equal(db.contentPosts[0].scheduledAt, at);
});

test('handleInboundWebhook rejects missing text', () => {
  const db = { users: [{ id: 'u1' }], contentPosts: [], accounts: [] };
  assert.throws(() => handleInboundWebhook(db, 'u1', {}), (e) => e.status === 400);
});

test('inboundWebhookUrl builds path', () => {
  const url = inboundWebhookUrl('tok123');
  assert.ok(url.includes('/api/webhooks/inbound/tok123'));
});
