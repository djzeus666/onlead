/** Rotate copies of store.json; optional off-volume dir via BACKUP_OFFSITE_DIR. */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkpointWal } from './sqlite.mjs';
import { remoteBackupStatus, scheduleRemoteBackup } from './backup-remote.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_FILE = join(ROOT, 'data', 'store.json');
const DEFAULT_DIR = join(ROOT, 'data', 'backups');

let lastRun = 0;
let lastMeta = { count: 0, lastAt: 0, lastFile: '', offsiteCount: 0 };

export function backupPaths({ dataFile = DEFAULT_FILE, dir = DEFAULT_DIR } = {}) {
  return { dataFile, dir };
}

export function offsiteBackupDir(explicit) {
  if (explicit) return explicit;
  return String(process.env.BACKUP_OFFSITE_DIR || '').trim();
}

/**
 * Counts come from disk, not from `lastMeta`: ops scripts and the audit run in
 * their own process, and the server itself reports zeroes until the first tick
 * after a restart.
 */
export function backupStatus(opts = {}) {
  const { dir } = backupPaths(opts);
  const off = offsiteBackupDir(opts.offsiteDir);
  const local = listBackups(dir);
  const offsite = off && existsSync(off) ? listBackups(off) : [];
  const newest = local[0] || offsite[0] || null;
  return {
    ...lastMeta,
    count: local.length,
    lastAt: newest ? newest.mtime : lastMeta.lastAt,
    lastFile: newest ? newest.name : lastMeta.lastFile,
    offsiteCount: offsite.length,
    intervalMs: 30 * 60 * 1000,
    remote: remoteBackupStatus(),
  };
}

function stamp(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  return `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}-${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}${ms}`;
}

export function listBackups(dir = DEFAULT_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^store-\d{8}-\d{9}(?:-\d+)?\.json$/.test(name))
    .map((name) => {
      const file = join(dir, name);
      const st = statSync(file);
      return { name, file, mtime: st.mtimeMs, size: st.size };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function copySqliteTwin(dataFile, dir, jsonName) {
  const sqliteSrc = join(dirname(dataFile), 'onlead.sqlite');
  if (!existsSync(sqliteSrc)) return;
  try {
    checkpointWal('FULL');
    copyFileSync(sqliteSrc, join(dir, jsonName.replace(/^store-/, 'sqlite-').replace(/\.json$/, '.sqlite')));
  } catch (err) {
    console.warn('[backup] sqlite copy', err.message);
  }
}

function rotateExtras(dir, keep) {
  const after = listBackups(dir);
  for (const extra of after.slice(keep)) {
    try { unlinkSync(extra.file); } catch { /* ignore */ }
    const sqlTwin = join(dir, extra.name.replace(/^store-/, 'sqlite-').replace(/\.json$/, '.sqlite'));
    try { unlinkSync(sqlTwin); } catch { /* ignore */ }
  }
}

export function runBackup(opts = {}) {
  const keep = Math.max(1, Number(opts.keep || 48));
  const minInterval = Number(opts.minIntervalMs ?? 30 * 60 * 1000);
  const now = Date.now();
  if (!opts.force && lastRun && now - lastRun < minInterval) {
    return { ok: true, skipped: 'interval', ...backupStatus(opts) };
  }
  const { dataFile, dir } = backupPaths(opts);
  if (!existsSync(dataFile)) return { ok: false, reason: 'no-store' };
  const src = statSync(dataFile);
  const existing = listBackups(dir);
  const newest = existing[0];
  if (!opts.force && newest && newest.size === src.size && Math.abs(newest.mtime - src.mtimeMs) < 2000) {
    lastRun = now;
    lastMeta = { count: existing.length, lastAt: newest.mtime, lastFile: newest.name, offsiteCount: 0 };
    return { ok: true, skipped: 'unchanged', ...backupStatus(opts) };
  }
  mkdirSync(dir, { recursive: true });
  let name = `store-${stamp(new Date(now))}.json`;
  let dest = join(dir, name);
  let n = 0;
  while (existsSync(dest)) {
    n += 1;
    name = `store-${stamp(new Date(now))}-${n}.json`;
    dest = join(dir, name);
  }
  copyFileSync(dataFile, dest);
  copySqliteTwin(dataFile, dir, name);
  rotateExtras(dir, keep);
  const off = offsiteBackupDir(opts.offsiteDir);
  if (off && off !== dir) {
    try {
      mkdirSync(off, { recursive: true });
      copyFileSync(dest, join(off, name));
      copySqliteTwin(dataFile, off, name);
      rotateExtras(off, keep);
    } catch (err) {
      console.warn('[backup] offsite', err.message);
    }
  }
  const kept = listBackups(dir);
  lastRun = now;
  lastMeta = { count: kept.length, lastAt: now, lastFile: name, offsiteCount: 0 };
  const sqliteName = name.replace(/^store-/, 'sqlite-').replace(/\.json$/, '.sqlite');
  const sqliteDest = join(dir, sqliteName);
  const remoteFiles = [{ path: dest, name }];
  if (existsSync(sqliteDest)) remoteFiles.push({ path: sqliteDest, name: sqliteName });
  if (off && off !== dir) {
    const offJson = join(off, name);
    if (existsSync(offJson)) remoteFiles[0] = { path: offJson, name };
  }
  scheduleRemoteBackup(remoteFiles);
  return { ok: true, skipped: '', ...backupStatus(opts) };
}

export function tickBackup() {
  try {
    return runBackup();
  } catch (err) {
    console.error('[backup]', err.message);
    return { ok: false, reason: err.message };
  }
}
