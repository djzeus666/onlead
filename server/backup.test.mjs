import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { listBackups, runBackup } from './backup.mjs';

test('runBackup copies store and rotates extras', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-bak-'));
  const dataFile = join(dir, 'store.json');
  const bak = join(dir, 'backups');
  writeFileSync(dataFile, '{"users":[]}');
  const first = runBackup({ dataFile, dir: bak, keep: 2, minIntervalMs: 0, force: true });
  assert.equal(first.ok, true);
  assert.equal(first.skipped, '');
  writeFileSync(dataFile, '{"users":[{"id":"u1"}]}');
  const second = runBackup({ dataFile, dir: bak, keep: 2, minIntervalMs: 0, force: true });
  assert.equal(second.ok, true);
  writeFileSync(dataFile, '{"users":[{"id":"u1"},{"id":"u2"}]}');
  runBackup({ dataFile, dir: bak, keep: 2, minIntervalMs: 0, force: true });
  const kept = listBackups(bak);
  assert.equal(kept.length, 2);
  const off = join(dir, 'offsite');
  writeFileSync(dataFile, '{"users":[{"id":"u1"},{"id":"u2"},{"id":"u3"}]}');
  runBackup({ dataFile, dir: bak, keep: 2, minIntervalMs: 0, force: true, offsiteDir: off });
  assert.equal(listBackups(off).length >= 1, true);
  rmSync(dir, { recursive: true, force: true });
});
