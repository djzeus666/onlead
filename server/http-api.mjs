/** Shared HTTP helpers for API route modules. */
import { AsyncLocalStorage } from 'node:async_hooks';
import { load } from './db.mjs';
import {
  allowMocks, clientIp, encryptionKeyStatus, isProd, isTelegramLive,
  legalPublic, RATE, rateLimitHit, securityHeaders,
} from './hardening.mjs';
import { publicCabinetError } from './user-error.mjs';
import { backupStatus } from './backup.mjs';
import { isMailConfigured } from './mail.mjs';
import { isValidInn } from './inn.mjs';
import { isLivePayments } from './billing.mjs';
import { storageEngine, storageSchema } from './db.mjs';
import { scopeUser } from './workspace.mjs';

export const requestAls = new AsyncLocalStorage();

export function send(res, status, body, headers = {}) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  const req = requestAls.getStore();
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' && !headers['Content-Type'] ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    ...securityHeaders(req),
    ...headers,
  });
  res.end(typeof body === 'string' ? body : json);
}

export function sendFail(res, err, fallback = 'Не получилось выполнить запрос. Попробуйте ещё раз.') {
  console.warn('[api]', err?.code || '', String(err?.message || err).slice(0, 200));
  return send(res, 400, { error: publicCabinetError(err, fallback) });
}

export function readBody(req, maxBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error('Слишком большое тело запроса'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
    });
    req.on('error', reject);
  });
}

export function enforceRate(req, res, kind) {
  const rule = RATE[kind];
  if (!rule) return true;
  const hit = rateLimitHit(`${kind}:${clientIp(req)}`, rule.max, rule.windowMs);
  if (hit.ok) return true;
  send(res, 429, { error: 'Слишком много попыток. Подождите и повторите.' }, { 'Retry-After': String(hit.retryAfter) });
  return false;
}

export function mergedLegal() {
  const env = legalPublic();
  const s = load().settings?.legal || {};
  const operator = String(s.operator || process.env.LEGAL_OPERATOR || '').trim();
  const email = String(s.email || env.email || '').trim();
  const inn = String(s.inn || env.inn || '').replace(/\D/g, '');
  const ogrn = String(s.ogrn || process.env.LEGAL_OGRN || '').replace(/\D/g, '');
  const address = String(s.address || env.address || '').trim();
  return {
    operator: operator || 'OnLead',
    email,
    inn,
    ogrn,
    address,
    site: env.site,
    requisitesReady: Boolean(operator && email && isValidInn(inn)),
  };
}

export function healthPayload() {
  const key = encryptionKeyStatus();
  const bak = backupStatus();
  return {
    ok: true,
    service: 'onlead',
    paymentsLive: isLivePayments(),
    mailConfigured: isMailConfigured(),
    mocksAllowed: allowMocks(),
    telegramLive: isTelegramLive(),
    encryptionKey: key.ok,
    storage: storageEngine(),
    storageSchema: storageSchema(),
    backups: {
      count: bak.count || 0,
      lastAt: bak.lastAt || 0,
      offsiteCount: bak.offsiteCount || 0,
      remoteConfigured: Boolean(bak.remote?.configured),
      remoteOk: Boolean(bak.remote?.ok),
      geoConfigured: Boolean(bak.remote?.geoConfigured),
      geoOk: Boolean(bak.remote?.geoOk),
    },
    legal: mergedLegal(),
  };
}

export function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export function authUser(req) {
  const token = bearer(req);
  if (!token) return null;
  const db = load();
  const s = db.sessions.find((x) => x.token === token && x.exp > Date.now());
  if (!s) return null;
  const user = db.users.find((u) => u.id === s.userId && !u.banned);
  return user || null;
}

export function requireUser(req, res) {
  const actor = authUser(req);
  if (!actor) { send(res, 401, { error: 'Нужна авторизация' }); return null; }
  return scopeUser(actor);
}

export function requireAdmin(req, res) {
  const u = authUser(req);
  if (!u) { send(res, 401, { error: 'Нужна авторизация' }); return null; }
  if (u.role !== 'admin') { send(res, 403, { error: 'Только администратор' }); return null; }
  return u;
}

export function publicOrigin(req) {
  const fromEnv = String(process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const xfProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = xfProto || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'onlead.m360-ural.online').split(',')[0].trim();
  return `${proto}://${host}`;
}

export function createApiContext(req, res, url) {
  return { req, res, url, method: req.method, path: url.pathname, searchParams: url.searchParams };
}
