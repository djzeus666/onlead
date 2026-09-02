import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { closeSqlite, openSqlite, readStoreBlob, writeStoreBlob } from './sqlite.mjs';

test('sqlite kv roundtrip with WAL', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-sql-'));
  const file = join(dir, 'onlead.sqlite');
  openSqlite(file);
  writeStoreBlob({ users: [{ id: 'u1' }] });
  const raw = readStoreBlob();
  assert.ok(raw);
  assert.equal(JSON.parse(raw).users[0].id, 'u1');
  writeStoreBlob({ users: [{ id: 'u1' }, { id: 'u2' }] });
  assert.equal(JSON.parse(readStoreBlob()).users.length, 2);
  closeSqlite();
  rmSync(dir, { recursive: true, force: true });
});
