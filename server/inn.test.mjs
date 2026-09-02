import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inn10FromNine, isValidInn } from './inn.mjs';

test('generated 10-digit INN passes checksum, garbage does not', () => {
  const inn = inn10FromNine('123456789');
  assert.equal(inn.length, 10);
  assert.equal(isValidInn(inn), true);
  assert.equal(isValidInn(inn.slice(0, 9) + ((Number(inn[9]) + 1) % 10)), false);
  assert.equal(isValidInn(''), false);
  assert.equal(isValidInn('0000000000'), false);
  assert.equal(isValidInn('123'), false);
});
