import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedLandingHosts, isAllowedLandingHost, normalizeHost } from './landing-hosts.mjs';
import { findPublishedLandingByHost, landingHostTaken } from './landings.mjs';

test('landing host pool includes product subdomains', () => {
  assert.equal(isAllowedLandingHost('leadgen.m360-ural.online'), true);
  assert.equal(isAllowedLandingHost('onlead.m360-ural.online'), false);
  assert.ok(allowedLandingHosts().length >= 5);
});

test('normalizeHost strips scheme and port', () => {
  assert.equal(normalizeHost('https://SMM.m360-ural.online/path'), 'smm.m360-ural.online');
});

test('dynamic subdomains allowed when DNS automation enabled', () => {
  const prev = {
    t: process.env.CLOUDFLARE_API_TOKEN,
    z: process.env.CLOUDFLARE_ZONE_ID,
    e: process.env.LANDING_DNS_ENABLED,
  };
  process.env.CLOUDFLARE_API_TOKEN = 'tok';
  process.env.CLOUDFLARE_ZONE_ID = 'zone';
  process.env.LANDING_DNS_ENABLED = '1';
  assert.equal(isAllowedLandingHost('promo.m360-ural.online'), true);
  assert.equal(isAllowedLandingHost('www.m360-ural.online'), false);
  assert.equal(isAllowedLandingHost('onlead.m360-ural.online'), false);
  process.env.CLOUDFLARE_API_TOKEN = prev.t;
  process.env.CLOUDFLARE_ZONE_ID = prev.z;
  process.env.LANDING_DNS_ENABLED = prev.e;
});

test('dynamic subdomains blocked without DNS automation', () => {
  const prev = { t: process.env.CLOUDFLARE_API_TOKEN, z: process.env.CLOUDFLARE_ZONE_ID };
  process.env.CLOUDFLARE_API_TOKEN = '';
  process.env.CLOUDFLARE_ZONE_ID = '';
  assert.equal(isAllowedLandingHost('promo.m360-ural.online'), false);
  process.env.CLOUDFLARE_API_TOKEN = prev.t;
  process.env.CLOUDFLARE_ZONE_ID = prev.z;
});

test('published landing resolves by custom host', () => {
  const d = {
    landings: [
      { id: 'p1', status: 'published', customHost: 'leadgen.m360-ural.online' },
      { id: 'p2', status: 'draft', customHost: 'smm.m360-ural.online' },
    ],
  };
  assert.equal(findPublishedLandingByHost(d, 'leadgen.m360-ural.online')?.id, 'p1');
  assert.equal(findPublishedLandingByHost(d, 'smm.m360-ural.online'), null);
  assert.equal(landingHostTaken(d, 'leadgen.m360-ural.online'), true);
  assert.equal(landingHostTaken(d, 'leadgen.m360-ural.online', 'p1'), false);
});
