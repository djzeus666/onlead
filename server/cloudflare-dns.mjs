/** Cloudflare DNS API v4 — см. https://developers.cloudflare.com/api/resources/dns/subresources/records/ */

const API = 'https://api.cloudflare.com/client/v4';

export function isCloudflareDnsConfigured() {
  return !!(process.env.CLOUDFLARE_API_TOKEN?.trim() && process.env.CLOUDFLARE_ZONE_ID?.trim());
}

async function cfFetch(path, { method = 'GET', body, fetchFn = globalThis.fetch.bind(globalThis) } = {}) {
  const token = String(process.env.CLOUDFLARE_API_TOKEN || '').trim();
  const res = await fetchFn(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Cloudflare: неверный ответ (${res.status})`);
  }
  if (!data?.success) {
    const msg = (data?.errors || [])
      .map((e) => e.message || e.code)
      .filter(Boolean)
      .join('; ') || `HTTP ${res.status}`;
    throw new Error(`Cloudflare: ${msg}`);
  }
  return data;
}

export async function listDnsRecords(name, { type, fetchFn } = {}) {
  const zoneId = String(process.env.CLOUDFLARE_ZONE_ID || '').trim();
  const params = new URLSearchParams({ per_page: '100' });
  if (name) params.set('name', name);
  if (type) params.set('type', type);
  const data = await cfFetch(`/zones/${zoneId}/dns_records?${params.toString()}`, { fetchFn });
  return data.result || [];
}

export async function createDnsRecord(record, { fetchFn } = {}) {
  const zoneId = String(process.env.CLOUDFLARE_ZONE_ID || '').trim();
  const data = await cfFetch(`/zones/${zoneId}/dns_records`, { method: 'POST', body: record, fetchFn });
  return data.result;
}

export async function updateDnsRecord(id, record, { fetchFn } = {}) {
  const zoneId = String(process.env.CLOUDFLARE_ZONE_ID || '').trim();
  const data = await cfFetch(`/zones/${zoneId}/dns_records/${id}`, { method: 'PATCH', body: record, fetchFn });
  return data.result;
}

export async function deleteDnsRecord(id, { fetchFn } = {}) {
  const zoneId = String(process.env.CLOUDFLARE_ZONE_ID || '').trim();
  await cfFetch(`/zones/${zoneId}/dns_records/${id}`, { method: 'DELETE', fetchFn });
}
