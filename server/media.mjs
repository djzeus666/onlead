/** User-uploaded media for landings (alongside AI-generated images). */
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MEDIA_ROOT = join(ROOT, 'data', 'media');

export function mediaRoot() {
  return process.env.ONLEAD_MEDIA_ROOT || DEFAULT_MEDIA_ROOT;
}

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function userMediaDir(userId) {
  return join(mediaRoot(), String(userId || '').replace(/[^a-z0-9_-]/gi, ''));
}

export function mediaFileName(userId) {
  const uid = String(userId || '').replace(/[^a-z0-9_-]/gi, '');
  const rand = randomBytes(4).toString('hex');
  return `media-${uid}-${Date.now()}-${rand}`;
}

export function mediaPath(name) {
  const n = String(name || '');
  if (!/^media-[a-z0-9_-]+-\d+-[a-f0-9]+\.(jpg|jpeg|png|webp|gif)$/i.test(n)) return null;
  const uid = n.split('-')[1];
  if (!uid) return null;
  const file = join(userMediaDir(uid), n);
  return existsSync(file) ? file : null;
}

export function saveUserMedia(userId, buf, mime) {
  if (!buf?.length) throw new Error('Пустой файл');
  if (buf.length > MAX_BYTES) throw new Error('Файл больше 5 МБ');
  const ext = MIME_EXT[String(mime || '').toLowerCase()] || extname(String(mime || ''));
  const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
  const name = `${mediaFileName(userId)}${safeExt}`;
  const dir = userMediaDir(userId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), buf);
  return {
    name,
    url: `/api/media/${name}`,
    mime: mime || 'image/jpeg',
    size: buf.length,
    createdAt: Date.now(),
    source: 'upload',
  };
}

export function listUserMedia(userId) {
  const dir = userMediaDir(userId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => mediaPath(f))
    .map((name) => {
      const file = join(dir, name);
      const st = statSync(file);
      const ext = extname(name).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      return { name, url: `/api/media/${name}`, mime, size: st.size, createdAt: st.mtimeMs, source: 'upload' };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteUserMedia(userId, name) {
  const n = String(name || '');
  const uid = String(userId || '').replace(/[^a-z0-9_-]/gi, '');
  if (!uid || !n.startsWith(`media-${uid}-`)) throw new Error('Файл не найден');
  const file = mediaPath(n);
  if (!file) throw new Error('Файл не найден');
  unlinkSync(file);
  return { ok: true, name: n };
}

export function decodeUploadBody(body) {
  const raw = String(body?.data || body?.base64 || '').trim();
  if (!raw) throw new Error('Нет данных файла');
  const b64 = raw.includes(',') ? raw.split(',').pop() : raw;
  return Buffer.from(b64, 'base64');
}
