#!/usr/bin/env node
/** Синхронизировать DNS Cloudflare для всех опубликованных PRO-лендингов. */
import { load, mutate } from '../server/db.mjs';
import { applyLandingDnsMeta, syncPublishedLandingDns } from '../server/landing-dns.mjs';
import { isDnsAutomationEnabled } from '../server/landing-hosts.mjs';

if (!isDnsAutomationEnabled()) {
  console.error('DNS automation off: задайте CLOUDFLARE_API_TOKEN и CLOUDFLARE_ZONE_ID');
  process.exit(1);
}

const results = await syncPublishedLandingDns(load());
mutate((d) => {
  for (const row of results) {
    if (!row.host || row.status !== 'ok') continue;
    const landing = (d.landings || []).find(
      (l) => l.status === 'published' && String(l.customHost || '').toLowerCase() === row.host,
    );
    if (landing) applyLandingDnsMeta(landing, row);
  }
});

console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.status === 'error');
process.exit(failed.length ? 1 : 0);
