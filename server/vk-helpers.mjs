import { decryptToken } from './crypto.mjs';
import { load } from './db.mjs';

export function resolveVkAccount(u, accountId) {
  const list = load().accounts.filter((a) => a.userId === u.id);
  return list.find((a) => a.id === accountId) || list[0] || null;
}

export function tokenOf(acc, opts = {}) {
  if (!acc) return null;
  if (opts.messages && acc.messagesTokenEnc) {
    return String(acc.messagesTokenEnc).startsWith('mock:')
      ? acc.messagesTokenEnc
      : decryptToken(acc.messagesTokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
  }
  if (!acc.tokenEnc) return null;
  return String(acc.tokenEnc).startsWith('mock:') ? acc.tokenEnc : decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
}

export function normalizeChannels(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => ({
    externalId: String(c.externalId || c.id || ''),
    name: String(c.name || c.externalId || 'VK'),
    type: c.type || 'community',
    avatarUrl: c.avatarUrl || c.photo || undefined,
    screenName: c.screenName || undefined,
  })).filter((c) => c.externalId);
}

export function mergeChannels(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const c of normalizeChannels(list)) {
      map.set(c.externalId, c);
    }
  }
  return [...map.values()];
}

export function channelsHaveGroups(channels) {
  return channels.some((c) => c.type !== 'personal');
}

export function resolveVkRedirectUri(forMessages) {
  const explicit = String(process.env.VK_REDIRECT_URI || '').trim();
  if (explicit) return explicit;
  if (forMessages) {
    const msgExplicit = String(process.env.VK_MESSAGES_REDIRECT_URI || '').trim();
    if (msgExplicit) return msgExplicit;
  }
  return 'https://oauth.vk.com/blank.html';
}

export function resolveVkBaseAppId(settings) {
  const fromSettings = String(settings?.vkAppId || '').trim();
  const fromEnv = String(process.env.VK_APP_ID || '5530956').trim() || '5530956';
  return fromSettings || fromEnv;
}
