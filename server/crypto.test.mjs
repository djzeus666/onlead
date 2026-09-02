import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from './crypto.mjs';

test('password hash verifies and rejects a wrong secret', () => {
  const stored = hashPassword('correct horse');
  assert.equal(verifyPassword('correct horse', stored), true);
  assert.equal(verifyPassword('wrong', stored), false);
  assert.equal(verifyPassword('correct horse', 'not-a-hash'), false);
});

test('same password gets a unique salt', () => {
  const a = hashPassword('demo1234');
  const b = hashPassword('demo1234');
  assert.notEqual(a, b);
  assert.equal(verifyPassword('demo1234', a), true);
  assert.equal(verifyPassword('demo1234', b), true);
});
