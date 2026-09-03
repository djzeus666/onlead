/** Production guards: headers, CORS, rate limit, mock tokens, encryption key. */
import { timingSafeEqual } from 'node:crypto';
import { isValidInn } from './inn.mjs';
import { isAllowedLandingHost } from './landing-hosts.mjs';

const EXAMPLE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const FALLBACK_KEY = 'a'.repeat(64);

const buckets = new Map();

export function isProd() {
  return String(process.env.NODE_ENV || '').trim() === 'production';
}

export function publicUrl() {
  return String(process.env.PUBLIC_URL || 'https://onlead.m360-ural.online').replace(/\/$/, '');
}

export function isHttpsPublic() {
  return publicUrl().startsWith('https://');
}

export function allowMocks() {
  if (String(process.env.ALLOW_MOCK_TOKENS || '').trim() === '1') return true;
  if (String(process.env.ALLOW_MOCK_TOKENS || '').trim() === '0') return false;
  return !isProd();
}

export function isTelegramLive() {
  return String(process.env.TELEGRAM_LIVE || '').trim() === '1';
}

export function isMockToken(raw) {
  return String(raw || '').trim().toLowerCase().startsWith('mock:');
}

export function mockBlockedMessage(kind = 'Токен') {
  return `${kind}: демо-значение mock: на рабочем контуре отключено. Подключите живой ключ.`;
}

export function encryptionKeyStatus(keyHex = process.env.TOKEN_ENCRYPTION_KEY) {
  const key = String(keyHex || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(key)) return { ok: false, reason: 'missing-or-malformed' };
  if (key === FALLBACK_KEY || key === EXAMPLE_KEY) return { ok: false, reason: 'well-known' };
  return { ok: true, reason: 'set' };
}

export function resolveEncryptionKey() {
  const raw = String(process.env.TOKEN_ENCRYPTION_KEY || '').trim();
  const status = encryptionKeyStatus(raw);
  if (isProd() && !status.ok) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY: в production нужен случайный 64-символьный hex, не пример из .env.example и не пустое значение.',
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    if (!status.ok) {
      console.warn('[hardening] TOKEN_ENCRYPTION_KEY из примера/fallback — только для локальной разработки.');
    }
    return raw;
  }
  process.env.TOKEN_ENCRYPTION_KEY = FALLBACK_KEY;
  console.warn('[hardening] TOKEN_ENCRYPTION_KEY не задан — локальный fallback. Не используйте это в production.');
  return FALLBACK_KEY;
}

export function legalPublic() {
  const operator = String(process.env.LEGAL_OPERATOR || '').trim();
  const email = String(process.env.LEGAL_EMAIL || process.env.SMTP_FROM || process.env.SMTP_REPLY_TO || '').trim();
  const inn = String(process.env.LEGAL_INN || '').trim();
  const address = String(process.env.LEGAL_ADDRESS || '').trim();
  return {
    operator: operator || 'OnLead',
    email: email || '',
    inn,
    address,
    site: publicUrl(),
    requisitesReady: Boolean(operator && email && isValidInn(inn)),
  };
}

export function clientIp(req) {
  const xf = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  if (xf) return xf.slice(0, 64);
  return String(req?.socket?.remoteAddress || '0.0.0.0').slice(0, 64);
}

export function resetRateLimits() {
  buckets.clear();
}

export function rateLimitHit(key, max, windowMs, now = Date.now()) {
  const k = String(key);
  let hits = buckets.get(k);
  if (!hits) {
    hits = [];
    buckets.set(k, hits);
  }
  const from = now - windowMs;
  while (hits.length && hits[0] <= from) hits.shift();
  if (hits.length >= max) {
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  hits.push(now);
  if (buckets.size > 4000) {
    for (const [id, arr] of buckets) {
      if (!arr.length || arr[arr.length - 1] < from) buckets.delete(id);
    }
  }
  return { ok: true, retryAfter: 0 };
}

export function corsOrigin(req) {
  if (!isProd()) return '*';
  const pub = publicUrl();
  const origin = String(req?.headers?.origin || '').trim();
  if (!origin) return pub;
  try {
    const o = new URL(origin);
    if (o.origin === new URL(pub).origin) return origin;
    if (isAllowedLandingHost(o.hostname)) return origin;
  } catch { /* ignore */ }
  return pub;
}

export function securityHeaders(req, extra = {}) {
  const origin = corsOrigin(req);
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://api.vk.com https://api.vk.ru",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS',
    Vary: 'Origin',
    ...extra,
  };
  if (isHttpsPublic()) {
    headers['Strict-Transport-Security'] = 'max-age=15552000; includeSubDomains';
  }
  return headers;
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  try { return timingSafeEqual(left, right); }
  catch { return false; }
}

export const RATE = {
  login: { max: 8, windowMs: 10 * 60 * 1000 },
  register: { max: 5, windowMs: 60 * 60 * 1000 },
  forgot: { max: 5, windowMs: 60 * 60 * 1000 },
  verify: { max: 10, windowMs: 15 * 60 * 1000 },
  reset: { max: 8, windowMs: 15 * 60 * 1000 },
  resend: { max: 5, windowMs: 60 * 60 * 1000 },
  lead: { max: 12, windowMs: 10 * 60 * 1000 },
  webhook: { max: 80, windowMs: 60 * 1000 },
  ai: { max: 20, windowMs: 60 * 1000 },
};
