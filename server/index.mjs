/**
 * OnLead API + static host.
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, mutate, storageEngine, storageSchema } from './db.mjs';
import {
  allowMocks, encryptionKeyStatus, isProd, isTelegramLive,
  resolveEncryptionKey, securityHeaders,
} from './hardening.mjs';
import { publicCabinetError } from './user-error.mjs';
import { tickBackup } from './backup.mjs';
import { startWorker } from './jobs.mjs';
import { ensureBotWebhookSecret, registerBotWebhook } from './tg-worker.mjs';
import { requestAls, send, createApiContext } from './http-api.mjs';
import { dispatchRoutes } from './routes/dispatch.mjs';
import { assertWorkspaceMutation } from './workspace-rbac.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const name of ['.env', '.env.example']) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
loadEnv();
resolveEncryptionKey();

const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function handleApi(req, res, url) {
  if (await dispatchRoutes(createApiContext(req, res, url))) return;
  if (res.headersSent) return;
  if (!assertWorkspaceMutation(req, res, url.pathname)) return;
  if (!res.headersSent) send(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]).replace(/\\/g, '/');
  if (rel === '/') rel = '/index.html';
  if (rel === '/admin' || rel === '/admin/') rel = '/admin/index.html';
  rel = rel.replace(/^\//, '');
  if (/^r\/[A-Za-z0-9_-]+\/?$/.test(rel)) rel = 'index.html';
  const blocked = rel.startsWith('data') || rel.startsWith('server') || rel.includes('..');
  const file = normalize(join(ROOT, rel));
  const rootNorm = normalize(ROOT).toLowerCase();
  if (blocked || !file.toLowerCase().startsWith(rootNorm) || !existsSync(file) || statSync(file).isDirectory()) {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }
  const type = MIME[extname(file)] || 'application/octet-stream';
  const extra = {};
  if (rel.startsWith('admin')) extra['X-Robots-Tag'] = 'noindex, nofollow';
  res.writeHead(200, { ...securityHeaders(req), 'Content-Type': type, 'Cache-Control': 'no-cache', ...extra });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  requestAls.run(req, async () => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, securityHeaders(req));
      return res.end();
    }
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    try {
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      return serveStatic(req, res, url.pathname);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: isProd() ? 'Сервис временно недоступен' : publicCabinetError(err, 'Server error') });
    }
  });
});

load();
tickBackup();
startWorker();

function bootWebhooks() {
  const bots = mutate((d) => {
    for (const b of d.bots || []) {
      if (b.status === 'off') continue;
      ensureBotWebhookSecret(b);
    }
    return (d.bots || []).filter((b) => b.status !== 'off');
  });
  for (const b of bots) {
    registerBotWebhook(b).catch((err) => console.error('[tg webhook]', b.id, err.message));
  }
}

const PUBLIC_URL = String(process.env.PUBLIC_URL || 'https://onlead.m360-ural.online').replace(/\/$/, '');
server.listen(PORT, '0.0.0.0', () => {
  const key = encryptionKeyStatus();
  console.log(`OnLead API http://0.0.0.0:${PORT}`);
  console.log(`Кабинет  ${PUBLIC_URL}/`);
  console.log(`Админка  ${PUBLIC_URL}/admin`);
  console.log(`Prod     ${isProd() ? 'yes' : 'no'} · mocks ${allowMocks() ? 'on' : 'off'} · telegramLive ${isTelegramLive() ? 'yes' : 'no'} · encKey ${key.ok ? 'ok' : key.reason} · storage ${storageEngine()} v${storageSchema()}`);
  bootWebhooks();
});
