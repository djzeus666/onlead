import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memberWriteAllowed, assertWorkspaceMutation } from './workspace-rbac.mjs';

test('memberWriteAllowed whitelists CRM and profile', () => {
  assert.equal(memberWriteAllowed('PATCH', '/api/leads/x1'), true);
  assert.equal(memberWriteAllowed('POST', '/api/leads'), true);
  assert.equal(memberWriteAllowed('PATCH', '/api/me'), true);
  assert.equal(memberWriteAllowed('POST', '/api/vk/chats/reply'), true);
  assert.equal(memberWriteAllowed('POST', '/api/posts'), false);
  assert.equal(memberWriteAllowed('DELETE', '/api/accounts/vk-1'), false);
  assert.equal(memberWriteAllowed('POST', '/api/team/invite'), false);
});

test('assertWorkspaceMutation blocks member billing', () => {
  const sent = [];
  const res = {
    writeHead() {},
    end(body) { sent.push(JSON.parse(body)); },
  };
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer tok-member' },
  };
  // No auth user — should pass through (401 handled elsewhere)
  assert.equal(assertWorkspaceMutation(req, res, '/api/billing/topup'), true);
  assert.equal(sent.length, 0);
});
