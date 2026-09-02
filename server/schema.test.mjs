import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { columnBotsCount, columnJobsCount, columnLandingsCount, columnLeadsCount, columnUsersCount, docsCount, readStoreFromTables, schemaVersion, writeStoreToTables } from './schema.mjs';
import { closeSqlite, openSqlite, sqliteHandle } from './sqlite.mjs';

function baseStore(extra = {}) {
  return {
    users: [{ id: 'u1', email: 'a@b.c', role: 'user', passwordHash: 'h', name: 'A' }],
    sessions: [{ token: 'tok', userId: 'u1', exp: 1 }],
    accounts: [{ id: 'vk-1', userId: 'u1', vkId: '100', status: 'active', tokenEnc: 'enc-vk' }],
    campaigns: [{ id: 't1', userId: 'u1', slug: 'lead-vk', status: 'running', created: '2026-01-01T00:00:00.000Z' }],
    jobs: [{ id: 'j1', userId: 'u1', campaignId: 't1', ok: true, message: 'ok' }],
    leads: [{ id: 'l1', userId: 'u1', name: 'Иван', stage: 'new', source: 'Вручную', createdAt: 20 }],
    lists: [],
    landings: [{ id: 'p1', userId: 'u1', slug: 'consult', status: 'published', name: 'Консультация' }],
    bots: [{ id: 'b1', userId: 'u1', username: '@demo', status: 'on', tokenEnc: 'enc' }],
    tgChannels: [{ id: 'ch1', userId: 'u1', chatId: '-100', botId: 'b1' }],
    tgFunnels: [{ id: 'fn1', userId: 'u1', botId: 'b1', status: 'on', kind: 'lite', name: 'Старт' }],
    ops: [{ id: 'op1', userId: 'u1', title: 'Пополнение', amount: 100 }],
    logs: [],
    leadgen: [],
    leadgenMatches: [],
    neurocomments: [],
    rssSources: [],
    rssItems: [],
    payments: [{ id: 'pay1', userId: 'u1', amount: 390, status: 'pending', kind: 'package' }],
    emailTokens: [],
    tgSessions: [],
    settings: { trialHours: 72, legal: { inn: '' } },
    createdAt: 10,
    ...extra,
  };
}

test('v10 column tables hold repost and earlier entities', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-schema-'));
  openSqlite(join(dir, 'onlead.sqlite'));
  const store = baseStore({
    neurocomments: [{ userId: 'u1', enabled: true, tasks: [] }],
    contentPosts: [{ id: 'post-1', userId: 'u1', status: 'draft', text: 'Hi', createdAt: 1 }],
    pubLogs: [{ id: 'plog-1', userId: 'u1', status: 'ok', createdAt: 2 }],
    rssSources: [{ id: 'rs1', userId: 'u1', url: 'https://x/rss', name: 'X' }],
    rssItems: [{ id: 'ri1', userId: 'u1', sourceId: 'rs1', guid: 'g', title: 'T', status: 'new' }],
    repostSources: [{ id: 'rps1', userId: 'u1', externalOwnerId: -1, name: 'VK' }],
    repostItems: [{ id: 'rpi1', userId: 'u1', sourceId: 'rps1', guid: 'g2', status: 'new' }],
  });
  writeStoreToTables(store);
  assert.equal(schemaVersion(), 10);
  assert.equal(columnUsersCount(), 1);
  assert.equal(columnLeadsCount(), 1);
  assert.equal(columnLandingsCount(), 1);
  assert.equal(columnBotsCount(), 1);
  assert.equal(columnJobsCount(), 1);
  assert.equal(docsCount(), 0);
  const back = readStoreFromTables();
  assert.equal(back.bots[0].tokenEnc, 'enc');
  assert.equal(back.jobs[0].ok, true);
  assert.equal(back.ops[0].amount, 100);
  assert.equal(back.campaigns[0].slug, 'lead-vk');
  assert.equal(back.neurocomments[0].userId, 'u1');
  assert.equal(back.contentPosts[0].text, 'Hi');
  assert.equal(back.pubLogs[0].status, 'ok');
  assert.equal(back.rssSources[0].name, 'X');
  assert.equal(back.rssItems[0].title, 'T');
  assert.equal(back.repostSources[0].name, 'VK');
  assert.equal(back.repostItems[0].status, 'new');
  closeSqlite();
  rmSync(dir, { recursive: true, force: true });
});

test('v3 docs leads migrate into v5 columns', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-schema-'));
  openSqlite(join(dir, 'onlead.sqlite'));
  const db = sqliteHandle();
  db.prepare('INSERT INTO docs(collection, id, user_id, body, updated_at) VALUES(?, ?, ?, ?, ?)').run(
    'leads',
    'old-l',
    'u1',
    JSON.stringify({ id: 'old-l', userId: 'u1', name: 'Старый', stage: 'hot' }),
    1,
  );
  db.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('schema', '3');
  const back = readStoreFromTables();
  assert.equal(back.leads[0].name, 'Старый');
  writeStoreToTables(back);
  assert.equal(schemaVersion(), 10);
  assert.equal(columnLeadsCount(), 1);
  assert.equal(docsCount(), 0);
  assert.equal(readStoreFromTables().leads[0].stage, 'hot');
  closeSqlite();
  rmSync(dir, { recursive: true, force: true });
});

test('v4 docs bots migrate into bots table', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-schema-'));
  openSqlite(join(dir, 'onlead.sqlite'));
  const db = sqliteHandle();
  db.prepare('INSERT INTO docs(collection, id, user_id, body, updated_at) VALUES(?, ?, ?, ?, ?)').run(
    'bots',
    'old-b',
    'u1',
    JSON.stringify({ id: 'old-b', userId: 'u1', username: '@old', tokenEnc: 'secret' }),
    1,
  );
  db.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('schema', '4');
  const back = readStoreFromTables();
  assert.equal(back.bots[0].username, '@old');
  writeStoreToTables(back);
  assert.equal(schemaVersion(), 10);
  assert.equal(columnBotsCount(), 1);
  assert.equal(docsCount(), 0);
  assert.equal(readStoreFromTables().bots[0].tokenEnc, 'secret');
  closeSqlite();
  rmSync(dir, { recursive: true, force: true });
});

test('v5 docs jobs migrate into jobs table', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-schema-'));
  openSqlite(join(dir, 'onlead.sqlite'));
  const db = sqliteHandle();
  db.prepare('INSERT INTO docs(collection, id, user_id, body, updated_at) VALUES(?, ?, ?, ?, ?)').run(
    'jobs',
    'old-j',
    'u1',
    JSON.stringify({ id: 'old-j', userId: 'u1', ok: true, message: 'шаг' }),
    1,
  );
  db.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('schema', '5');
  const back = readStoreFromTables();
  assert.equal(back.jobs[0].message, 'шаг');
  writeStoreToTables(back);
  assert.equal(schemaVersion(), 10);
  assert.equal(columnJobsCount(), 1);
  assert.equal(docsCount(), 0);
  assert.equal(readStoreFromTables().jobs[0].ok, true);
  closeSqlite();
  rmSync(dir, { recursive: true, force: true });
});

test('duplicate emails get a unique column and keep body email', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-schema-'));
  openSqlite(join(dir, 'onlead.sqlite'));
  const store = baseStore();
  store.users.push({ id: 'u2', email: 'a@b.c', role: 'user', passwordHash: 'h2', name: 'B' });
  writeStoreToTables(store);
  const cols = sqliteHandle().prepare('SELECT email FROM users ORDER BY id').all().map((r) => r.email);
  assert.equal(new Set(cols).size, 2);
  assert.ok(cols.some((e) => e.startsWith('dup:')));
  const back = readStoreFromTables();
  assert.equal(back.users.length, 2);
  assert.equal(back.users.filter((u) => u.email === 'a@b.c').length, 2);
  closeSqlite();
  rmSync(dir, { recursive: true, force: true });
});

test('duplicate ops ids still persist', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlead-schema-'));
  openSqlite(join(dir, 'onlead.sqlite'));
  const store = baseStore();
  store.ops = [{ id: 'op-dup', title: 'a' }, { id: 'op-dup', title: 'b' }];
  writeStoreToTables(store);
  assert.equal(readStoreFromTables().ops.length, 2);
  closeSqlite();
  rmSync(dir, { recursive: true, force: true });
});
