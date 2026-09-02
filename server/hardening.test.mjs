import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  allowMocks, corsOrigin, encryptionKeyStatus, isMockToken, isProd, isTelegramLive,
  RATE, rateLimitHit, resetRateLimits, securityHeaders,
} from './hardening.mjs';

test('mock tokens are detected', () => {
  assert.equal(isMockToken('mock:vk'), true);
  assert.equal(isMockToken(' vk1.a.real '), false);
});

test('well-known encryption keys are rejected', () => {
  assert.equal(encryptionKeyStatus('a'.repeat(64)).ok, false);
  assert.equal(encryptionKeyStatus('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef').ok, false);
  assert.equal(encryptionKeyStatus('').ok, false);
  assert.equal(encryptionKeyStatus('deadbeef'.repeat(8)).ok, true);
});

test('verify reset and resend have dedicated rate windows', () => {
  assert.equal(RATE.verify.max, 10);
  assert.equal(RATE.reset.max, 8);
  assert.equal(RATE.resend.max, 5);
});

test('rate limit blocks after max hits', () => {
  resetRateLimits();
  const now = 1_000_000;
  for (let i = 0; i < 8; i++) {
    assert.equal(rateLimitHit('login:1.1.1.1', 8, 60_000, now + i).ok, true);
  }
  const blocked = rateLimitHit('login:1.1.1.1', 8, 60_000, now + 9);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1);
  assert.equal(rateLimitHit('login:2.2.2.2', 8, 60_000, now).ok, true);
});

test('security headers include nosniff and CSP', () => {
  const h = securityHeaders({ headers: {} });
  assert.equal(h['X-Content-Type-Options'], 'nosniff');
  assert.equal(h['X-Frame-Options'], 'SAMEORIGIN');
  assert.match(h['Content-Security-Policy'], /default-src 'self'/);
  assert.ok(h['Access-Control-Allow-Origin']);
});

test('prod CORS does not reflect a foreign origin', () => {
  const prev = process.env.NODE_ENV;
  const pub = process.env.PUBLIC_URL;
  process.env.NODE_ENV = 'production';
  process.env.PUBLIC_URL = 'https://onlead.m360-ural.online';
  try {
    assert.equal(isProd(), true);
    const origin = corsOrigin({ headers: { origin: 'https://evil.example' } });
    assert.equal(origin, 'https://onlead.m360-ural.online');
  } finally {
    process.env.NODE_ENV = prev;
    process.env.PUBLIC_URL = pub;
  }
});

test('telegram checkout is off unless TELEGRAM_LIVE=1', () => {
  const prev = process.env.TELEGRAM_LIVE;
  delete process.env.TELEGRAM_LIVE;
  assert.equal(isTelegramLive(), false);
  process.env.TELEGRAM_LIVE = '1';
  assert.equal(isTelegramLive(), true);
  process.env.TELEGRAM_LIVE = prev || '';
});

test('mocks follow NODE_ENV unless ALLOW_MOCK_TOKENS overrides', () => {
  const env = process.env.NODE_ENV;
  const allow = process.env.ALLOW_MOCK_TOKENS;
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_MOCK_TOKENS;
  assert.equal(allowMocks(), false);
  process.env.ALLOW_MOCK_TOKENS = '1';
  assert.equal(allowMocks(), true);
  process.env.NODE_ENV = env;
  process.env.ALLOW_MOCK_TOKENS = allow || '';
});
