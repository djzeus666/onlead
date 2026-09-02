import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pruneStore } from './housekeep.mjs';

test('pruneStore drops expired sessions and email tokens', () => {
  const now = 1_000_000;
  const d = {
    sessions: [
      { token: 'live', userId: 'u1', exp: now + 1 },
      { token: 'dead', userId: 'u1', exp: now - 1 },
    ],
    emailTokens: [
      { id: 'et1', expiresAt: now + 10 },
      { id: 'et2', expiresAt: now - 10 },
    ],
  };
  const stats = pruneStore(d, now);
  assert.equal(stats.sessions, 1);
  assert.equal(stats.emailTokens, 1);
  assert.equal(d.sessions.length, 1);
  assert.equal(d.sessions[0].token, 'live');
  assert.equal(d.emailTokens[0].id, 'et1');
});
