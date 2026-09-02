import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureLandingDns, landingDnsTarget } from './landing-dns.mjs';
import { splitLandingHost } from './landing-hosts.mjs';

test('splitLandingHost parses subdomain under managed zone', () => {
  const split = splitLandingHost('promo.m360-ural.online', ['m360-ural.online']);
  assert.deepEqual(split, { zone: 'm360-ural.online', subdomain: 'promo', fqdn: 'promo.m360-ural.online' });
});

test('ensureLandingDns creates A record when missing', async () => {
  const prev = {
    t: process.env.CLOUDFLARE_API_TOKEN,
    z: process.env.CLOUDFLARE_ZONE_ID,
    e: process.env.LANDING_DNS_ENABLED,
    target: process.env.LANDING_DNS_TARGET,
  };
  process.env.CLOUDFLARE_API_TOKEN = 'tok';
  process.env.CLOUDFLARE_ZONE_ID = 'zone';
  process.env.LANDING_DNS_ENABLED = '1';
  process.env.LANDING_DNS_TARGET = '66.151.42.48';

  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null });
    if (init?.method === 'POST') {
      return { json: async () => ({ success: true, result: { id: 'new1', ...JSON.parse(init.body) } }) };
    }
    return { json: async () => ({ success: true, result: [] }) };
  };

  const r = await ensureLandingDns('promo.m360-ural.online', { fetchFn });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'ok');
  assert.equal(calls.filter((c) => c.method === 'POST').length, 1);
  assert.equal(calls.find((c) => c.method === 'POST')?.body?.content, landingDnsTarget());

  process.env.CLOUDFLARE_API_TOKEN = prev.t;
  process.env.CLOUDFLARE_ZONE_ID = prev.z;
  process.env.LANDING_DNS_ENABLED = prev.e;
  process.env.LANDING_DNS_TARGET = prev.target;
});

test('ensureLandingDns skips when automation off', async () => {
  const prev = { t: process.env.CLOUDFLARE_API_TOKEN, z: process.env.CLOUDFLARE_ZONE_ID };
  process.env.CLOUDFLARE_API_TOKEN = '';
  process.env.CLOUDFLARE_ZONE_ID = '';
  const r = await ensureLandingDns('leadgen.m360-ural.online');
  assert.equal(r.skipped, true);
  process.env.CLOUDFLARE_API_TOKEN = prev.t;
  process.env.CLOUDFLARE_ZONE_ID = prev.z;
});
