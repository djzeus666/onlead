/** Optional copy of a backup file to S3-compatible storage or HTTP PUT. No npm. */
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

let lastRemote = { configured: false, ok: false, at: 0, error: '', geoConfigured: false, geoOk: false, geoError: '' };
const bucketsReady = new Set();

export function remoteBackupStatus() {
  return {
    ...lastRemote,
    configured: remoteBackupConfigured(),
    geoConfigured: geoBackupConfigured(),
  };
}

export function remoteBackupConfigured() {
  return s3Ready(s3Env()) || Boolean(String(process.env.BACKUP_REMOTE_URL || '').trim());
}

export function geoBackupConfigured() {
  return s3Ready(geoEnv());
}

function readS3Env(prefix) {
  return {
    endpoint: String(process.env[`${prefix}_ENDPOINT`] || '').replace(/\/$/, ''),
    bucket: String(process.env[`${prefix}_BUCKET`] || '').trim(),
    region: String(process.env[`${prefix}_REGION`] || 'us-east-1').trim() || 'us-east-1',
    access: String(process.env[`${prefix}_ACCESS_KEY`] || '').trim(),
    secret: String(process.env[`${prefix}_SECRET_KEY`] || '').trim(),
    keyPrefix: String(process.env[`${prefix}_PREFIX`] || process.env.S3_BACKUP_PREFIX || 'onlead/').replace(/^\/+/, ''),
  };
}

function s3Env() {
  return readS3Env('S3_BACKUP');
}

function geoEnv() {
  return readS3Env('S3_GEO_BACKUP');
}

function s3Ready(cfg) {
  return Boolean(cfg.endpoint && cfg.bucket && cfg.access && cfg.secret);
}

function sha256hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest();
}

function amzNow(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

async function s3Put(cfg, uri, body, contentType, allowed = []) {
  const { endpoint, region, access, secret } = cfg;
  const host = new URL(endpoint).host;
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payloadHash = sha256hex(payload);
  const amzDate = amzNow();
  const dateStamp = amzDate.slice(0, 8);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', uri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256hex(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${access}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(`${endpoint}${uri}`, {
    method: 'PUT',
    headers: {
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
      'Content-Type': contentType,
      'Content-Length': String(payload.length),
    },
    body: payload,
  });
  if (!res.ok && !allowed.includes(res.status)) {
    const text = await res.text().catch(() => '');
    throw new Error(`s3 ${res.status} ${text.slice(0, 180)}`);
  }
  return res;
}

export async function putS3Object(key, body, contentType = 'application/octet-stream', cfg = s3Env()) {
  const uri = `/${encodeURIComponent(cfg.bucket)}/${key.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;
  await s3Put(cfg, uri, body, contentType);
}

export async function ensureS3Bucket(cfg = s3Env()) {
  const uri = `/${encodeURIComponent(cfg.bucket)}`;
  await s3Put(cfg, uri, Buffer.alloc(0), 'application/xml', [200, 204, 409]);
}

async function putHttp(url, body, name) {
  const token = String(process.env.BACKUP_REMOTE_TOKEN || '').trim();
  const headers = { 'Content-Type': 'application/octet-stream', 'X-Backup-Name': name };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: 'PUT', headers, body });
  if (!res.ok) throw new Error(`remote ${res.status}`);
}

async function putToS3(cfg, objectName, buf, type) {
  const key = `${cfg.keyPrefix}${objectName}`.replace(/\/+/g, '/');
  const mark = `${cfg.endpoint}|${cfg.bucket}`;
  if (!bucketsReady.has(mark)) {
    try {
      await ensureS3Bucket(cfg);
      bucketsReady.add(mark);
    } catch (err) {
      console.warn('[backup] s3 bucket', String(err.message || err).slice(0, 180));
    }
  }
  try {
    await putS3Object(key, buf, type, cfg);
  } catch (err) {
    const msg = String(err.message || '');
    if (/\b(404|NoSuchBucket)\b/.test(msg)) {
      await ensureS3Bucket(cfg);
      bucketsReady.add(mark);
      await putS3Object(key, buf, type, cfg);
    } else {
      throw err;
    }
  }
}

export async function uploadBackupFile(filePath, objectName) {
  const buf = readFileSync(filePath);
  const type = objectName.endsWith('.json') ? 'application/json' : 'application/octet-stream';
  const primary = s3Env();
  if (s3Ready(primary)) {
    await putToS3(primary, objectName, buf, type);
    const geo = geoEnv();
    if (s3Ready(geo)) {
      try {
        await putToS3(geo, objectName, buf, type);
        lastRemote.geoOk = true;
        lastRemote.geoError = '';
      } catch (err) {
        lastRemote.geoOk = false;
        lastRemote.geoError = String(err.message || err).slice(0, 180);
        console.warn('[backup] geo', lastRemote.geoError);
      }
    }
    return { ok: true, via: 's3' };
  }
  const url = String(process.env.BACKUP_REMOTE_URL || '').trim();
  if (!url) return { ok: false, reason: 'not-configured' };
  const dest = url.endsWith('/') ? url + objectName : `${url}/${objectName}`;
  await putHttp(dest, buf, objectName);
  return { ok: true, via: 'http' };
}

/**
 * Live round-trip to the bucket, for health checks that run outside the server
 * process where `lastRemote` is always empty. Creating an existing bucket is a
 * no-op (409), so this is safe to call at any time.
 */
export async function probeRemoteBackup() {
  const out = { configured: remoteBackupConfigured(), ok: false, error: '', geoConfigured: geoBackupConfigured(), geoOk: false, geoError: '' };
  const primary = s3Env();
  if (s3Ready(primary)) {
    try { await ensureS3Bucket(primary); out.ok = true; }
    catch (err) { out.error = String(err.message || err).slice(0, 180); }
  } else if (out.configured) {
    out.ok = true;
    out.error = 'настроен HTTP-приёмник, проверка отложена до первой выгрузки';
  }
  const geo = geoEnv();
  if (s3Ready(geo)) {
    try { await ensureS3Bucket(geo); out.geoOk = true; }
    catch (err) { out.geoError = String(err.message || err).slice(0, 180); }
  }
  return out;
}

export function scheduleRemoteBackup(files = []) {
  lastRemote.configured = remoteBackupConfigured();
  lastRemote.geoConfigured = geoBackupConfigured();
  if (!lastRemote.configured || !files.length) return;
  Promise.resolve()
    .then(async () => {
      for (const f of files) {
        if (!f?.path || !f?.name) continue;
        await uploadBackupFile(f.path, f.name);
      }
      lastRemote = {
        ...lastRemote,
        configured: true,
        ok: true,
        at: Date.now(),
        error: '',
        geoConfigured: geoBackupConfigured(),
      };
    })
    .catch((err) => {
      lastRemote = {
        ...lastRemote,
        configured: true,
        ok: false,
        at: Date.now(),
        error: String(err.message || err).slice(0, 180),
        geoConfigured: geoBackupConfigured(),
      };
      console.warn('[backup] remote', lastRemote.error);
    });
}
