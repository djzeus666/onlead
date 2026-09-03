import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { findOwnedLanding } from './landings.mjs';
import { publicHealthPayload } from './health-public.mjs';
import { RATE } from './hardening.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));

test('findOwnedLanding returns only the owner row', () => {
  const u = { id: 'u1' };
  const d = {
    landings: [
      { id: 'p1', userId: 'u1', name: 'Mine' },
      { id: 'p2', userId: 'u2', name: 'Other' },
      { id: 'p3', userId: null, name: 'Seed' },
    ],
  };
  assert.equal(findOwnedLanding(d, u, 'p1').name, 'Mine');
  assert.equal(findOwnedLanding(d, u, 'p2'), null);
  assert.equal(findOwnedLanding(d, u, 'p3'), null);
  assert.equal(findOwnedLanding(d, u, 'missing'), null);
  assert.equal(findOwnedLanding(d, {}, 'p1'), null);
});

test('index.mjs wires dispatch; landings in server/routes', () => {
  const indexSrc = readFileSync(join(ROOT, 'index.mjs'), 'utf8');
  const authSrc = readFileSync(join(ROOT, 'routes', 'auth.mjs'), 'utf8');
  const healthSrc = readFileSync(join(ROOT, 'routes', 'health.mjs'), 'utf8');
  const landingsSrc = readFileSync(join(ROOT, 'routes', 'landings-routes.mjs'), 'utf8');
  const dispatchSrc = readFileSync(join(ROOT, 'routes', 'dispatch.mjs'), 'utf8');
  assert.match(indexSrc, /dispatchRoutes/);
  assert.match(dispatchSrc, /vk-routes/);
  assert.match(dispatchSrc, /leadgen-routes/);
  assert.match(dispatchSrc, /neuro-routes/);
  assert.match(dispatchSrc, /tg-routes/);
  assert.match(dispatchSrc, /admin-routes/);
  assert.match(dispatchSrc, /workflow-routes/);
  assert.match(dispatchSrc, /headersSent/);
  assert.match(authSrc, /enforceRate\(req, res, 'verify'\)/);
  assert.match(healthSrc, /publicHealthPayload\(healthPayload\(\)\)/);
  assert.match(landingsSrc, /findOwnedLanding/);
  const billingSrc = readFileSync(join(ROOT, 'routes', 'billing-routes.mjs'), 'utf8');
  assert.match(billingSrc, /handleYookassaWebhook/);
});

test('public health drops encryptionKey and backup internals', () => {
  const pub = publicHealthPayload({
    ok: true,
    service: 'onlead',
    paymentsLive: true,
    mailConfigured: true,
    mocksAllowed: false,
    telegramLive: true,
    encryptionKey: true,
    storage: 'sqlite-schema',
    storageSchema: 6,
    backups: {
      count: 18,
      lastAt: 1,
      offsiteCount: 15,
      remoteConfigured: true,
      remoteOk: true,
      geoConfigured: false,
      geoOk: false,
    },
    legal: { inn: '', requisitesReady: false },
  });
  assert.equal(pub.encryptionKey, undefined);
  assert.equal(pub.backups.count, undefined);
  assert.equal(pub.backups.lastAt, undefined);
  assert.equal(pub.backups.offsiteCount, undefined);
  assert.equal(pub.backups.remoteOk, true);
  assert.equal(pub.legal.requisitesReady, false);
  assert.equal(pub.telegramLive, true);
});

test('auth code endpoints have rate windows', () => {
  assert.ok(RATE.verify.max >= 5);
  assert.ok(RATE.reset.max >= 5);
  assert.ok(RATE.resend.max >= 3);
});
