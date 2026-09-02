/** AES-256-GCM token encryption — from post2post packages/integrations/src/crypto/token-crypto.ts */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function keyFromEnv(keyHex) {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex || '')) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encryptToken(plaintext, keyHex) {
  const key = keyFromEnv(keyHex);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptToken(payload, keyHex) {
  const [ivB64, tagB64, dataB64] = String(payload || '').split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted token format');
  const key = keyFromEnv(keyHex);
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const check = scryptSync(password, salt, 32);
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), check);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString('hex');
}

export function maskToken(token) {
  const t = String(token || '');
  if (t.length < 10) return '••••';
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}
