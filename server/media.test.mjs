import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { saveUserMedia, mediaPath, listUserMedia, decodeUploadBody, mediaRoot } from './media.mjs';

test('saveUserMedia writes file and mediaPath resolves it', () => {
  const prev = process.env.ONLEAD_MEDIA_ROOT;
  const dir = mkdtempSync(join(tmpdir(), 'onlead-media-'));
  process.env.ONLEAD_MEDIA_ROOT = dir;
  try {
    const buf = Buffer.from('fake-png');
    const row = saveUserMedia('u1', buf, 'image/png');
    assert.match(row.url, /^\/api\/media\/media-u1-/);
    assert.ok(mediaPath(row.name));
    assert.equal(listUserMedia('u1').length, 1);
  } finally {
    process.env.ONLEAD_MEDIA_ROOT = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('decodeUploadBody accepts raw base64 and data URLs', () => {
  const buf = Buffer.from('hello');
  assert.equal(decodeUploadBody({ data: buf.toString('base64') }).toString(), 'hello');
  assert.equal(decodeUploadBody({ data: `data:image/png;base64,${buf.toString('base64')}` }).toString(), 'hello');
});
