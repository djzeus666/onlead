import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDnsRecord, isCloudflareDnsConfigured, listDnsRecords } from './cloudflare-dns.mjs';

test('isCloudflareDnsConfigured requires token and zone id', () => {
  const prev = { t: process.env.CLOUDFLARE_API_TOKEN, z: process.env.CLOUDFLARE_ZONE_ID };
  process.env.CLOUDFLARE_API_TOKEN = '';
  process.env.CLOUDFLARE_ZONE_ID = '';
  assert.equal(isCloudflareDnsConfigured(), false);
  process.env.CLOUDFLARE_API_TOKEN = 'tok';
  process.env.CLOUDFLARE_ZONE_ID = 'zone';
  assert.equal(isCloudflareDnsConfigured(), true);
  process.env.CLOUDFLARE_API_TOKEN = prev.t;
  process.env.CLOUDFLARE_ZONE_ID = prev.z;
});

test('createDnsRecord posts to Cloudflare API', async () => {
  const prev = { t: process.env.CLOUDFLARE_API_TOKEN, z: process.env.CLOUDFLARE_ZONE_ID };
  process.env.CLOUDFLARE_API_TOKEN = 'tok';
  process.env.CLOUDFLARE_ZONE_ID = 'zone123';
  let captured;
  const fetchFn = async (url, init) => {
    captured = { url, body: JSON.parse(init.body) };
    return {
      json: async () => ({ success: true, result: { id: 'rec1', ...captured.body } }),
    };
  };
  const row = await createDnsRecord({
    type: 'A',
    name: 'leadgen.m360-ural.online',
    content: '66.151.42.48',
    proxied: true,
    ttl: 1,
  }, { fetchFn });
  assert.match(captured.url, /zone123\/dns_records$/);
  assert.equal(row.id, 'rec1');
  process.env.CLOUDFLARE_API_TOKEN = prev.t;
  process.env.CLOUDFLARE_ZONE_ID = prev.z;
});

test('listDnsRecords filters by name', async () => {
  const prev = { t: process.env.CLOUDFLARE_API_TOKEN, z: process.env.CLOUDFLARE_ZONE_ID };
  process.env.CLOUDFLARE_API_TOKEN = 'tok';
  process.env.CLOUDFLARE_ZONE_ID = 'zone123';
  const fetchFn = async (url) => {
    assert.match(url, /name=leadgen\.m360-ural\.online/);
    return { json: async () => ({ success: true, result: [{ id: '1', type: 'A' }] }) };
  };
  const rows = await listDnsRecords('leadgen.m360-ural.online', { fetchFn });
  assert.equal(rows.length, 1);
  process.env.CLOUDFLARE_API_TOKEN = prev.t;
  process.env.CLOUDFLARE_ZONE_ID = prev.z;
});
