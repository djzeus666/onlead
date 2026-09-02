import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vkCall } from './call.mjs';

test('vkCall retries flood control then returns the response', async () => {
  let n = 0;
  const fetch = async () => {
    n += 1;
    if (n < 3) {
      return { json: async () => ({ error: { error_code: 6, error_msg: 'Too many requests per second' } }) };
    }
    return { json: async () => ({ response: { id: 42 } }) };
  };
  const out = await vkCall('users.get', {}, 'tok', { fetch, sleep: async () => {}, attempts: 3 });
  assert.equal(n, 3);
  assert.equal(out.id, 42);
});

test('vkCall does not retry invalid token', async () => {
  let n = 0;
  const fetch = async () => {
    n += 1;
    return { json: async () => ({ error: { error_code: 5, error_msg: 'User authorization failed' } }) };
  };
  await assert.rejects(
    () => vkCall('users.get', {}, 'bad', { fetch, sleep: async () => {}, attempts: 3 }),
    /authorization failed/,
  );
  assert.equal(n, 1);
});

test('vkCall retries network errors then gives up', async () => {
  let n = 0;
  const fetch = async () => {
    n += 1;
    throw new Error('ECONNRESET');
  };
  await assert.rejects(
    () => vkCall('users.get', {}, 'tok', { fetch, sleep: async () => {}, attempts: 3 }),
    (err) => err.code === 'VK_NETWORK' && err.retryable === true,
  );
  assert.equal(n, 3);
});
