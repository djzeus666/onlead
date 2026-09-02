/** Автоматизация DNS для PRO-лендингов через Cloudflare. */
import { isDnsAutomationEnabled, normalizeHost, splitLandingHost } from './landing-hosts.mjs';
import {
  createDnsRecord,
  deleteDnsRecord,
  listDnsRecords,
  updateDnsRecord,
} from './cloudflare-dns.mjs';

export function landingDnsTarget() {
  return String(process.env.LANDING_DNS_TARGET || '66.151.42.48').trim();
}

export function landingDnsProxied() {
  return process.env.LANDING_DNS_PROXIED !== '0';
}

function isIpv4(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(String(value || '').trim());
}

function desiredRecord(fqdn, target, proxied) {
  if (isIpv4(target)) {
    return { type: 'A', name: fqdn, content: target, ttl: 1, proxied: !!proxied };
  }
  return {
    type: 'CNAME',
    name: fqdn,
    content: normalizeHost(target),
    ttl: 1,
    proxied: !!proxied,
  };
}

function recordMatches(existing, desired) {
  return existing.type === desired.type
    && normalizeHost(existing.content) === normalizeHost(desired.content)
    && !!existing.proxied === !!desired.proxied;
}

/** Idempotent: создаёт или обновляет A/CNAME для поддомена лендинга. */
export async function ensureLandingDns(host, opts = {}) {
  if (!isDnsAutomationEnabled()) {
    return { ok: true, skipped: true, status: 'off', message: 'DNS automation выключена' };
  }
  const fqdn = normalizeHost(host);
  const split = splitLandingHost(fqdn);
  if (!split || split.subdomain === '@') {
    return { ok: false, status: 'error', message: 'Поддомен вне управляемой зоны Cloudflare' };
  }

  const target = landingDnsTarget();
  const desired = desiredRecord(fqdn, target, landingDnsProxied());
  const existing = (await listDnsRecords(fqdn, opts))
    .filter((r) => r.type === 'A' || r.type === 'CNAME');

  const exact = existing.find((r) => recordMatches(r, desired));
  if (exact) {
    return {
      ok: true,
      status: 'ok',
      message: 'DNS уже настроен',
      fqdn,
      recordId: exact.id,
    };
  }

  if (existing.length === 1) {
    const updated = await updateDnsRecord(existing[0].id, desired, opts);
    return {
      ok: true,
      status: 'ok',
      message: `DNS обновлён: ${fqdn} → ${desired.content}`,
      fqdn,
      recordId: updated.id,
    };
  }

  for (const row of existing) {
    await deleteDnsRecord(row.id, opts);
  }
  const created = await createDnsRecord(desired, opts);
  return {
    ok: true,
    status: 'ok',
    message: `DNS создан: ${fqdn} → ${desired.content}`,
    fqdn,
    recordId: created.id,
  };
}

export async function removeLandingDns(host, opts = {}) {
  if (!isDnsAutomationEnabled()) {
    return { ok: true, skipped: true, status: 'off' };
  }
  const fqdn = normalizeHost(host);
  const rows = (await listDnsRecords(fqdn, opts)).filter((r) => r.type === 'A' || r.type === 'CNAME');
  for (const row of rows) await deleteDnsRecord(row.id, opts);
  return { ok: true, status: 'ok', message: rows.length ? `Удалено записей: ${rows.length}` : 'Записей не было', fqdn };
}

export function applyLandingDnsMeta(landing, dnsResult) {
  if (!landing || !dnsResult) return landing;
  landing.dnsStatus = dnsResult.status || (dnsResult.ok ? 'ok' : 'error');
  landing.dnsMessage = String(dnsResult.message || '').slice(0, 240);
  landing.dnsSyncedAt = Date.now();
  if (dnsResult.recordId) landing.dnsRecordId = dnsResult.recordId;
  return landing;
}

export async function syncPublishedLandingDns(db, opts = {}) {
  const hosts = [...new Set(
    (db.landings || [])
      .filter((l) => l.status === 'published' && l.customHost)
      .map((l) => normalizeHost(l.customHost))
      .filter(Boolean),
  )];
  const results = [];
  for (const host of hosts) {
    try {
      results.push({ host, ...(await ensureLandingDns(host, opts)) });
    } catch (err) {
      results.push({
        host,
        ok: false,
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
