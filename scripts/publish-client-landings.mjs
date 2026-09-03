/**
 * Publish remaining draft landings and attach PRO customHosts for client demos.
 * Run with app stopped (or compose run) so in-memory cache cannot overwrite SQLite.
 *
 *   docker compose run --rm --no-deps -v ... --entrypoint node app --experimental-sqlite scripts/publish-client-landings.mjs
 */
import { mutate, load } from '../server/db.mjs';
import { LANDING_HOSTS, isDnsAutomationEnabled } from '../server/landing-hosts.mjs';
import { ensureLandingDns, applyLandingDnsMeta } from '../server/landing-dns.mjs';

const plan = [
  { id: 'p1', host: 'leadgen.m360-ural.online', slug: 'consult' },
  { id: 'p1788349852575', host: 'smm.m360-ural.online', slug: 'kurs' },
  { id: 'p1788340880769', host: 'agents.m360-ural.online', slug: 'webinar' },
];

for (const h of plan.map((p) => p.host)) {
  if (!LANDING_HOSTS.includes(h)) {
    console.error('host not in LANDING_HOSTS', h);
    process.exit(1);
  }
}

const published = [];
mutate((d) => {
  const usedHosts = new Set(
    (d.landings || [])
      .filter((l) => l.customHost && l.status === 'published')
      .map((l) => String(l.customHost).toLowerCase()),
  );
  for (const row of plan) {
    const l = (d.landings || []).find((x) => x.id === row.id);
    if (!l) {
      console.warn('missing', row.id);
      continue;
    }
    const host = row.host.toLowerCase();
    if (usedHosts.has(host) && String(l.customHost || '').toLowerCase() !== host) {
      console.warn('host taken, skip', host, row.id);
      continue;
    }
    l.status = 'published';
    l.publishedAt = l.publishedAt || Date.now();
    l.customHost = host;
    if (!String(l.slug || '').trim()) l.slug = row.slug;
    usedHosts.add(host);
    published.push({ id: l.id, host, slug: l.slug, headline: l.headline });
  }
});

console.log('published', JSON.stringify(published, null, 2));

if (isDnsAutomationEnabled()) {
  for (const row of published) {
    try {
      const dns = await ensureLandingDns(row.host);
      mutate((d) => {
        const l = (d.landings || []).find((x) => x.id === row.id);
        if (l) applyLandingDnsMeta(l, dns);
      });
      console.log('dns', row.host, dns?.ok ? 'ok' : dns);
    } catch (err) {
      console.error('dns fail', row.host, err instanceof Error ? err.message : err);
      mutate((d) => {
        const l = (d.landings || []).find((x) => x.id === row.id);
        if (l) {
          l.dnsStatus = 'error';
          l.dnsMessage = (err instanceof Error ? err.message : String(err)).slice(0, 240);
        }
      });
    }
  }
} else {
  console.log('dns automation off — customHost set, Caddy wildcard may still route');
}

const final = load().landings || [];
console.log('summary', final.map((l) => ({
  id: l.id, status: l.status, host: l.customHost || '', dns: l.dnsStatus || '',
})));
