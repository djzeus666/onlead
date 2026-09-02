import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { publicHealthPayload } from './health-public.mjs';
import { SCHEMA_VERSION } from './schema.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));

test('public health exposes SPA-safe flags', () => {
  const pub = publicHealthPayload({
    ok: true,
    service: 'onlead',
    paymentsLive: true,
    mailConfigured: true,
    mocksAllowed: false,
    telegramLive: true,
    storage: 'sqlite-schema',
    storageSchema: SCHEMA_VERSION,
    legal: { inn: '123', requisitesReady: true },
    backups: { remoteOk: true, geoConfigured: false, count: 3 },
    encryptionKey: true,
  });
  assert.equal(pub.ok, true);
  assert.equal(pub.storageSchema, SCHEMA_VERSION);
  assert.equal(pub.encryptionKey, undefined);
  assert.equal(pub.backups.count, undefined);
});

test('index.mjs wires route dispatcher and snapshot module', () => {
  const src = readFileSync(join(ROOT, 'index.mjs'), 'utf8');
  assert.match(src, /dispatchRoutes/);
  assert.match(src, /from '\.\/snapshot\.mjs'/);
  assert.match(src, /from '\.\/routes\/dispatch\.mjs'/);
});

test('package test script includes route and api smoke suites', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'));
  assert.match(pkg.scripts.test, /route-hash\.test\.mjs/);
  assert.match(pkg.scripts.test, /api-smoke\.test\.mjs/);
});
