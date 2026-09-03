/** Shared helpers for worker job modules. */
import { decryptToken } from './crypto.mjs';
import { load, mutate } from './db.mjs';
import { vkListManagedGroups } from './vk/growth.mjs';
import { replaceGrabberLinks } from './vk/grabber.mjs';
import { vkResolveOwnerId } from './vk/neurocomment.mjs';

export function log(db, entry) {
  db.logs.unshift({ id: 'log-' + Date.now() + Math.random().toString(16).slice(2), at: new Date().toISOString(), ...entry });
  db.logs = db.logs.slice(0, 2000);
}

export function accountToken(db, account) {
  if (!account?.tokenEnc) return null;
  if (String(account.tokenEnc).startsWith('mock:')) return account.tokenEnc;
  return decryptToken(account.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
}

/** Token with messages scope (Kate Mobile), falls back to base if absent. */
export function accountMessagesToken(account) {
  if (!account) return null;
  if (account.messagesTokenEnc) {
    if (String(account.messagesTokenEnc).startsWith('mock:')) return account.messagesTokenEnc;
    return decryptToken(account.messagesTokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
  }
  return accountToken(null, account);
}

export function firstLine(payload, keys) {
  for (const k of keys) {
    const v = payload?.[k];
    if (v) return String(v).split('\n').map((s) => s.trim()).filter(Boolean)[0];
  }
  return '';
}

/** Wall to publish to: own page by default, first managed community on request. */
export async function grabberDestination(token, account, dest) {
  if (/сообществ/.test(dest)) {
    const groups = await vkListManagedGroups(token);
    if (groups[0]) return -groups[0].id;
  }
  return Number(account.externalId) || Number(account.vkId);
}

/**
 * The queue is an ordinary cabinet list, so the client can open «Мои списки»
 * and see exactly what autoposting is about to publish.
 */
const POST_QUEUE_SOURCE = 'Очередь автопостинга';

function findQueueList(db, userId) {
  return (db.lists || []).find((l) => l.userId === userId && l.source === POST_QUEUE_SOURCE) || null;
}

export function queueGrabbedPosts(campaign, posts, replaceUrl) {
  let added = 0;
  mutate((d) => {
    let list = findQueueList(d, campaign.userId);
    if (!list) {
      list = {
        id: 'queue-' + campaign.userId,
        userId: campaign.userId,
        name: POST_QUEUE_SOURCE,
        source: POST_QUEUE_SOURCE,
        created: new Date().toLocaleDateString('ru-RU'),
        items: [],
        count: 0,
      };
      d.lists.unshift(list);
    }
    const seen = new Set((list.items || []).map((it) => `${it.text}|${(it.attachments || []).join(',')}`));
    for (const post of posts) {
      const text = replaceGrabberLinks(post.text || '', replaceUrl);
      const attachments = (post.attachments || []).filter(Boolean).slice(0, 10);
      if (text.length <= 40 && !attachments.length) continue;
      const key = `${text}|${attachments.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.items.push({
        id: 'q' + Date.now() + Math.random().toString(16).slice(2, 6),
        text,
        attachments,
        status: 'queued',
        createdAt: Date.now(),
      });
      added += 1;
      if (added >= 20) break;
    }
    list.items = list.items.slice(-200);
    list.count = list.items.filter((it) => it.status === 'queued').length;
  });
  return added;
}

export function parseInviteBlacklist(raw) {
  const ids = new Set();
  for (const part of String(raw || '').split(/[\n,;]+/)) {
    const line = part.trim();
    if (!line) continue;
    const m = line.match(/(?:https?:\/\/vk\.com\/)?(?:id|club|public)?(\d+)/i) || line.match(/^(\d{5,})$/);
    if (m) ids.add(Number(m[1]));
  }
  return ids;
}

export function parseStoryCaptions(raw) {
  return String(raw || '')
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function appendUtm(text, payload = {}) {
  const body = String(text || '');
  if (/utm_[a-z]+=/i.test(body)) return body;
  const urlMatch = body.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) return body;
  const src = encodeURIComponent(payload.utmSource || 'onlead');
  const med = encodeURIComponent(payload.utmMedium || 'vk');
  const camp = encodeURIComponent(payload.utmCampaign || payload.title || 'autopost');
  const url = urlMatch[0];
  const sep = url.includes('?') ? '&' : '?';
  return body.replace(url, `${url}${sep}utm_source=${src}&utm_medium=${med}&utm_campaign=${camp}`);
}

export function takeQueuedPost(userId) {
  const list = findQueueList(load(), userId);
  return (list?.items || []).find((it) => it.status === 'queued') || null;
}

export function markQueuedPost(userId, itemId, status) {
  mutate((d) => {
    const list = findQueueList(d, userId);
    const row = (list?.items || []).find((it) => it.id === itemId);
    if (!row) return;
    row.status = status;
    row.postedAt = Date.now();
    list.count = list.items.filter((it) => it.status === 'queued').length;
  });
}

export function findUserList(db, userId, nameOrId) {
  const key = String(nameOrId || '').trim();
  if (!key) return null;
  return (db.lists || []).find((l) => l.userId === userId && (l.id === key || l.name === key));
}

export async function resolveOwners(token, raw) {
  const lines = String(raw || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const ids = [];
  for (const line of lines.slice(0, 8)) {
    const r = await vkResolveOwnerId(token, line);
    if (r?.id) ids.push(r.id);
  }
  return ids;
}
