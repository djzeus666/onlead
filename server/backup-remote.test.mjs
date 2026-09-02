import assert from 'node:assert/strict';
import { test } from 'node:test';
import { geoBackupConfigured, putS3Object } from './backup-remote.mjs';

test('putS3Object signs a path-style PUT', async () => {
  const prev = {
    endpoint: process.env.S3_BACKUP_ENDPOINT,
    bucket: process.env.S3_BACKUP_BUCKET,
    region: process.env.S3_BACKUP_REGION,
    access: process.env.S3_BACKUP_ACCESS_KEY,
    secret: process.env.S3_BACKUP_SECRET_KEY,
  };
  process.env.S3_BACKUP_ENDPOINT = 'http://minio:9000';
  process.env.S3_BACKUP_BUCKET = 'onlead-backups';
  process.env.S3_BACKUP_REGION = 'us-east-1';
  process.env.S3_BACKUP_ACCESS_KEY = 'minioadmin';
  process.env.S3_BACKUP_SECRET_KEY = 'minioadmin';
  const orig = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, opts) => {
    captured = { url: String(url), opts };
    return { ok: true, status: 200, text: async () => '' };
  };
  try {
    await putS3Object('onlead/store.json', Buffer.from('{}'), 'application/json');
    assert.equal(captured.url, 'http://minio:9000/onlead-backups/onlead/store.json');
    assert.match(captured.opts.headers.Authorization, /^AWS4-HMAC-SHA256 Credential=minioadmin\//);
    assert.equal(captured.opts.headers['Content-Length'], '2');
    assert.equal(captured.opts.headers['Content-Type'], 'application/json');
  } finally {
    globalThis.fetch = orig;
    for (const [k, v] of Object.entries({
      S3_BACKUP_ENDPOINT: prev.endpoint,
      S3_BACKUP_BUCKET: prev.bucket,
      S3_BACKUP_REGION: prev.region,
      S3_BACKUP_ACCESS_KEY: prev.access,
      S3_BACKUP_SECRET_KEY: prev.secret,
    })) {
      if (v == null) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('geo backup is off without S3_GEO_BACKUP keys', () => {
  const prev = process.env.S3_GEO_BACKUP_ENDPOINT;
  delete process.env.S3_GEO_BACKUP_ENDPOINT;
  try {
    assert.equal(geoBackupConfigured(), false);
  } finally {
    if (prev == null) delete process.env.S3_GEO_BACKUP_ENDPOINT;
    else process.env.S3_GEO_BACKUP_ENDPOINT = prev;
  }
});
