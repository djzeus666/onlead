import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ipInCidr, yookassaIpAllowed, YOOKASSA_CIDRS } from './ip-allow.mjs';

test('YooKassa /27 contains 185.71.76.1 and not 8.8.8.8', () => {
  assert.equal(ipInCidr('185.71.76.1', '185.71.76.0/27'), true);
  assert.equal(ipInCidr('::ffff:185.71.76.1', '185.71.76.0/27'), true);
  assert.equal(ipInCidr('185.71.76.40', '185.71.76.0/27'), false);
  assert.equal(ipInCidr('8.8.8.8', YOOKASSA_CIDRS[0]), false);
});

test('allowlist off accepts any IP; on rejects localhost', () => {
  assert.equal(yookassaIpAllowed('1.2.3.4', ''), true);
  assert.equal(yookassaIpAllowed('1.2.3.4', '0'), true);
  assert.equal(yookassaIpAllowed('127.0.0.1', '1'), false);
  assert.equal(yookassaIpAllowed('185.71.76.2', '1'), true);
  assert.equal(yookassaIpAllowed('2a02:5180::1', '1'), true);
  assert.equal(yookassaIpAllowed('2001:db8::1', '1'), false);
  assert.equal(yookassaIpAllowed('10.0.0.8', '10.0.0.0/8'), true);
});
