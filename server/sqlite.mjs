/** SQLite WAL — docs table per entity, kv blob only as rollback copy. No npm. */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_FILE = join(ROOT, 'data', 'onlead.sqlite');

let db = null;
let filePath = DEFAULT_FILE;

export function sqliteFile() {
  return filePath;
}

export function sqliteReady() {
  return Boolean(db);
}

export function sqliteHandle() {
  if (!db) openSqlite(filePath);
  return db;
}

export function openSqlite(file = DEFAULT_FILE) {
  filePath = file;
  mkdirSync(dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
  db.exec(`CREATE TABLE IF NOT EXISTS docs (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    user_id TEXT,
    body TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (collection, id)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS docs_user ON docs(collection, user_id)');
  db.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    banned INTEGER NOT NULL DEFAULT 0,
    body TEXT NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exp INTEGER NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    status TEXT,
    amount INTEGER,
    kind TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS payments_user ON payments(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    stage TEXT,
    source TEXT,
    created_at INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS leads_user ON leads(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS leads_stage ON leads(stage)');
  db.exec(`CREATE TABLE IF NOT EXISTS landings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    slug TEXT,
    status TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS landings_user ON landings(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS landings_status ON landings(status)');
  db.exec(`CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    vk_id TEXT,
    status TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS accounts_user ON accounts(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    status TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS bots_user ON bots(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS tg_funnels (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    bot_id TEXT,
    status TEXT,
    kind TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS tg_funnels_user ON tg_funnels(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS tg_channels (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    bot_id TEXT,
    chat_id TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS tg_channels_user ON tg_channels(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    slug TEXT,
    status TEXT,
    created_at INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS campaigns_user ON campaigns(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS campaigns_status ON campaigns(status)');
  db.exec(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    campaign_id TEXT,
    ok INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS jobs_user ON jobs(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS ops (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    amount INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS ops_user ON ops(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS lists_user ON lists(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    level TEXT,
    created_at INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS logs_user ON logs(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS leadgen (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS leadgen_user ON leadgen(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS leadgen_matches (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS leadgen_matches_user ON leadgen_matches(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS email_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    expires_at INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS email_tokens_user ON email_tokens(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS tg_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    bot_id TEXT,
    chat_id TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS tg_sessions_user ON tg_sessions(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS neurocomments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS neurocomments_user ON neurocomments(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS content_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    status TEXT,
    scheduled_at INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS content_posts_user ON content_posts(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS pub_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    created_at INTEGER,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS pub_logs_user ON pub_logs(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS rss_sources (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS rss_sources_user ON rss_sources(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS rss_items (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    source_id TEXT,
    status TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS rss_items_source ON rss_items(source_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS repost_sources (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS repost_sources_user ON repost_sources(user_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS repost_items (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    source_id TEXT,
    status TEXT,
    body TEXT NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS repost_items_source ON repost_items(source_id)');
  return db;
}

export function closeSqlite() {
  if (db) {
    try { db.close(); } catch { /* ignore */ }
    db = null;
  }
}

export function checkpointWal(mode = 'PASSIVE') {
  if (!db) return;
  const allowed = new Set(['PASSIVE', 'FULL', 'TRUNCATE', 'RESTART']);
  const m = allowed.has(String(mode || '').toUpperCase()) ? String(mode).toUpperCase() : 'PASSIVE';
  try { db.exec(`PRAGMA wal_checkpoint(${m})`); } catch { /* ignore */ }
}

export function readStoreBlob() {
  if (!db) openSqlite(filePath);
  const row = db.prepare('SELECT v FROM kv WHERE k = ?').get('store');
  return row?.v || null;
}

export function writeStoreBlob(json) {
  if (!db) openSqlite(filePath);
  const text = typeof json === 'string' ? json : JSON.stringify(json);
  db.prepare('INSERT INTO kv(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('store', text);
}
