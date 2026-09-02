/** PRO landing subdomains — proxied by Caddy to onlead (see scripts/patch-caddy-landing-hosts.sh). */
export const LANDING_HOSTS = [
  'leadgen.m360-ural.online',
  'smm.m360-ural.online',
  'agents.m360-ural.online',
  'media.m360-ural.online',
  'za.m360-ural.online',
];

/** Поддомены, которые нельзя выдавать под лендинги. */
export const RESERVED_LANDING_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'onlead', 'mail', 'ftp', 'smtp', 'pop', 'imap',
  'ns', 'ns1', 'ns2', 'mx', 'cdn', 'dev', 'staging', 'test',
]);

export function normalizeHost(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export function managedDnsZones() {
  return String(process.env.LANDING_DNS_ZONES || 'm360-ural.online')
    .split(/[,;\s]+/)
    .map(normalizeHost)
    .filter(Boolean);
}

export function isDnsAutomationEnabled() {
  if (process.env.LANDING_DNS_ENABLED === '0') return false;
  return !!(process.env.CLOUDFLARE_API_TOKEN?.trim() && process.env.CLOUDFLARE_ZONE_ID?.trim());
}

export function splitLandingHost(host, zones = managedDnsZones()) {
  const h = normalizeHost(host);
  if (!h) return null;
  const sorted = [...zones].sort((a, b) => b.length - a.length);
  for (const zone of sorted) {
    if (h === zone) return { zone, subdomain: '@', fqdn: h };
    const suffix = `.${zone}`;
    if (h.endsWith(suffix)) {
      const sub = h.slice(0, -suffix.length);
      if (!sub || sub.includes('.')) continue;
      return { zone, subdomain: sub, fqdn: h };
    }
  }
  return null;
}

export function allowedLandingHosts() {
  const extra = String(process.env.LANDING_HOSTS_EXTRA || '')
    .split(/[,;\s]+/)
    .map(normalizeHost)
    .filter(Boolean);
  return [...new Set([...LANDING_HOSTS, ...extra])];
}

export function isAllowedLandingHost(host) {
  const h = normalizeHost(host);
  if (!h) return false;
  if (allowedLandingHosts().includes(h)) return true;
  if (!isDnsAutomationEnabled()) return false;
  const split = splitLandingHost(h);
  if (!split || split.subdomain === '@') return false;
  if (RESERVED_LANDING_SUBDOMAINS.has(split.subdomain)) return false;
  return true;
}

export function requestHost(req) {
  return normalizeHost(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '');
}

export function buildLandingHost(subdomain, zone = managedDnsZones()[0]) {
  const slug = String(subdomain || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const z = normalizeHost(zone);
  if (!slug || !z || RESERVED_LANDING_SUBDOMAINS.has(slug)) return '';
  return `${slug}.${z}`;
}
