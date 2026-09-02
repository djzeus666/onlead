/** IPv4 CIDR / exact match. Strips :ffff: mapped addresses. */

export function normalizeIp(raw) {
  let ip = String(raw || '').trim().replace(/^::ffff:/i, '');
  if (ip.includes('%')) ip = ip.split('%')[0];
  return ip;
}

function ipv4ToInt(ip) {
  const p = String(ip).split('.');
  if (p.length !== 4) return null;
  const n = p.map((x) => Number(x));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return ((n[0] << 24) >>> 0) + (n[1] << 16) + (n[2] << 8) + n[3];
}

export function ipInCidr(ip, cidr) {
  const addr = normalizeIp(ip);
  const spec = String(cidr || '').trim();
  if (!spec) return false;
  if (!spec.includes('/')) return addr === normalizeIp(spec);
  const [net, bitsRaw] = spec.split('/');
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const a = ipv4ToInt(addr);
  const b = ipv4ToInt(net);
  if (a == null || b == null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (a & mask) === (b & mask);
}

export function ipInList(ip, list) {
  return (list || []).some((c) => ipInCidr(ip, c));
}

/** Published YooKassa webhook networks (IPv4). */
export const YOOKASSA_CIDRS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.154.128/25',
  '77.75.156.11',
  '77.75.156.35',
];

export function yookassaAllowlistMode(raw = process.env.YOOKASSA_IP_ALLOWLIST) {
  const v = String(raw || '').trim();
  if (!v || v === '0' || /^false$/i.test(v) || /^off$/i.test(v)) return { on: false, cidrs: [] };
  if (v === '1' || /^true$/i.test(v) || /^default$/i.test(v)) return { on: true, cidrs: YOOKASSA_CIDRS };
  return { on: true, cidrs: v.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean) };
}

export function yookassaIpAllowed(ip, env = process.env.YOOKASSA_IP_ALLOWLIST) {
  const mode = yookassaAllowlistMode(env);
  if (!mode.on) return true;
  const addr = normalizeIp(ip);
  if (addr.includes(':')) return addr.toLowerCase().startsWith('2a02:5180');
  return ipInList(addr, mode.cidrs);
}
