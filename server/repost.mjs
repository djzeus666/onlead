/** VK/OK repost sources — fetch wall posts → content drafts (online-lead.ru parity). */
import { randomBytes } from 'node:crypto';
import { vkFetchWallPosts } from './vk/growth.mjs';
import { parseKeywords, filterPostsByKeywords, stripSourceLinks } from './vk/grabber.mjs';
import { createPost, updatePost } from './posts.mjs';

function id(prefix) {
  return `${prefix}-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

export function parseVkOwnerRef(ref) {
  const s = String(ref || '').trim();
  const wall = s.match(/wall(-?\d+)_/i);
  if (wall) return Number(wall[1]);
  const club = s.match(/(?:club|public|event)(\d+)/i);
  if (club) return -Number(club[1]);
  if (/^-?\d+$/.test(s)) return Number(s);
  const num = Number(s.replace(/[^\d-]/g, ''));
  return Number.isFinite(num) && num !== 0 ? (s.includes('-') || club ? -Math.abs(num) : num) : null;
}

export function listRepostSources(store, userId) {
  return (store.repostSources || [])
    .filter((s) => s.userId === userId)
    .map(publicRepostSource)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getRepostSource(store, userId, sourceId) {
  const row = (store.repostSources || []).find((s) => s.id === sourceId && s.userId === userId);
  return row ? publicRepostSource(row) : null;
}

function sourceMutable(store, userId, sourceId) {
  return (store.repostSources || []).find((s) => s.id === sourceId && s.userId === userId) || null;
}

export function publicRepostSource(s) {
  return {
    id: s.id,
    platform: s.platform || 'vk',
    name: s.name,
    externalRef: s.externalRef,
    externalOwnerId: s.externalOwnerId,
    enabled: s.enabled !== false,
    onlineMode: Boolean(s.onlineMode),
    includeKeywords: s.includeKeywords || [],
    excludeKeywords: s.excludeKeywords || [],
    attachmentFilter: s.attachmentFilter || 'any',
    accountId: s.accountId || '',
    ownerId: s.ownerId ?? null,
    ownerLabel: s.ownerLabel || '',
    maxPerPoll: Math.min(10, Math.max(1, Number(s.maxPerPoll) || 3)),
    pollIntervalSec: Math.max(300, Number(s.pollIntervalSec) || 900),
    lastFetchedAt: s.lastFetchedAt || null,
    lastError: s.lastError || null,
    itemCount: s._itemsCount,
    createdAt: s.createdAt,
  };
}

export function publicRepostItem(i) {
  return {
    id: i.id,
    sourceId: i.sourceId,
    title: i.title || '',
    text: String(i.text || '').slice(0, 300),
    link: i.link || null,
    imageUrl: i.imageUrl || null,
    attachments: i.attachments || [],
    publishedAt: i.publishedAt || null,
    status: i.status || 'new',
    postId: i.postId || null,
    createdAt: i.createdAt,
  };
}

export function createRepostSource(store, userId, body = {}) {
  const externalRef = String(body.externalRef || body.url || '').trim();
  const ownerId = parseVkOwnerRef(body.externalOwnerId ?? externalRef);
  if (!ownerId) throw new Error('Укажите ссылку или ID группы VK');

  const dup = (store.repostSources || []).find(
    (s) => s.userId === userId && s.externalOwnerId === ownerId,
  );
  if (dup) throw new Error('Этот источник уже добавлен');

  const now = Date.now();
  const source = {
    id: id('rps'),
    userId,
    platform: 'vk',
    name: String(body.name || '').trim() || `VK ${ownerId}`,
    externalRef,
    externalOwnerId: ownerId,
    enabled: true,
    onlineMode: Boolean(body.onlineMode),
    includeKeywords: parseKeywords(body.includeKeywords || body.keys),
    excludeKeywords: parseKeywords(body.excludeKeywords),
    attachmentFilter: String(body.attachmentFilter || 'any'),
    accountId: String(body.accountId || ''),
    ownerId: body.ownerId != null && body.ownerId !== '' ? Number(body.ownerId) : null,
    ownerLabel: String(body.ownerLabel || ''),
    maxPerPoll: Math.min(10, Math.max(1, Number(body.maxPerPoll) || 3)),
    pollIntervalSec: Math.max(300, Number(body.pollIntervalSec) || 900),
    lastFetchedAt: null,
    lastError: null,
    createdAt: now,
  };
  store.repostSources = store.repostSources || [];
  store.repostSources.unshift(source);
  return publicRepostSource(source);
}

export function updateRepostSource(store, userId, sourceId, patch = {}) {
  const s = sourceMutable(store, userId, sourceId);
  if (!s) return null;
  if (patch.name != null) s.name = String(patch.name).slice(0, 200);
  if (patch.enabled != null) s.enabled = Boolean(patch.enabled);
  if (patch.onlineMode != null) s.onlineMode = Boolean(patch.onlineMode);
  if (patch.includeKeywords != null) s.includeKeywords = parseKeywords(patch.includeKeywords);
  if (patch.excludeKeywords != null) s.excludeKeywords = parseKeywords(patch.excludeKeywords);
  if (patch.attachmentFilter != null) s.attachmentFilter = String(patch.attachmentFilter);
  if (patch.accountId != null) s.accountId = String(patch.accountId);
  if (patch.ownerId !== undefined) s.ownerId = patch.ownerId != null && patch.ownerId !== '' ? Number(patch.ownerId) : null;
  if (patch.ownerLabel != null) s.ownerLabel = String(patch.ownerLabel).slice(0, 120);
  if (patch.maxPerPoll != null) s.maxPerPoll = Math.min(10, Math.max(1, Number(patch.maxPerPoll) || 3));
  return publicRepostSource(s);
}

export function deleteRepostSource(store, userId, sourceId) {
  const idx = (store.repostSources || []).findIndex((s) => s.id === sourceId && s.userId === userId);
  if (idx < 0) return false;
  store.repostSources.splice(idx, 1);
  store.repostItems = (store.repostItems || []).filter((i) => i.sourceId !== sourceId);
  return true;
}

function matchesAttachmentFilter(post, filter) {
  const f = String(filter || 'any');
  if (f === 'any') return true;
  if (f === 'text_only') return !post.hasPhoto && !(post.attachments || []).length;
  if (f === 'with_media') return post.hasPhoto || (post.attachments || []).length > 0;
  if (f === 'photo') return post.hasPhoto || (post.attachments || []).some((a) => String(a).startsWith('photo'));
  return true;
}

function matchesExclude(text, keys) {
  if (!keys.length) return false;
  const t = String(text || '').toLowerCase();
  return keys.some((k) => t.includes(k));
}

function upsertRepostItem(store, userId, sourceId, post) {
  const guid = `${post.ownerId}_${post.postId}`;
  const existing = (store.repostItems || []).find((i) => i.sourceId === sourceId && i.guid === guid);
  const row = {
    title: String(post.text || '').slice(0, 120),
    text: post.text || '',
    link: post.url || null,
    attachments: post.attachments || [],
    imageUrl: post.hasPhoto ? (post.attachments?.[0] || null) : null,
    publishedAt: post.date ? post.date * 1000 : null,
  };
  if (existing) {
    Object.assign(existing, row);
    return { created: false, item: existing };
  }
  const item = {
    id: id('rpi'),
    userId,
    sourceId,
    guid,
    ...row,
    status: 'new',
    postId: null,
    createdAt: Date.now(),
  };
  store.repostItems = store.repostItems || [];
  store.repostItems.unshift(item);
  return { created: true, item };
}

export async function fetchRepostSource(store, userId, sourceId, token) {
  const source = sourceMutable(store, userId, sourceId);
  if (!source) throw new Error('Источник не найден');
  if (!token) throw new Error('Нужен токен VK');

  try {
    const raw = await vkFetchWallPosts(token, source.externalOwnerId, source.maxPerPoll || 3);
    let created = 0;
    let updated = 0;
    let skippedFilter = 0;

    for (const post of raw) {
      if (!matchesAttachmentFilter(post, source.attachmentFilter)) {
        skippedFilter += 1;
        continue;
      }
      const include = source.includeKeywords?.length
        ? filterPostsByKeywords([post], source.includeKeywords).length > 0
        : true;
      if (!include) {
        skippedFilter += 1;
        continue;
      }
      if (matchesExclude(post.text, source.excludeKeywords || [])) {
        skippedFilter += 1;
        continue;
      }
      const r = upsertRepostItem(store, userId, source.id, post);
      if (r.created) created += 1;
      else updated += 1;
    }

    source.lastFetchedAt = Date.now();
    source.lastError = null;
    return { created, updated, skippedFilter, total: raw.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    source.lastError = msg;
    source.lastFetchedAt = Date.now();
    throw new Error(`Ошибка сканирования: ${msg}`);
  }
}

export function listRepostItems(store, userId, sourceId, opts = {}) {
  const status = opts.status ? String(opts.status) : null;
  return (store.repostItems || [])
    .filter((i) => i.userId === userId && i.sourceId === sourceId && (!status || i.status === status))
    .sort((a, b) => (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0))
    .slice(0, Math.min(Math.max(Number(opts.take) || 100, 1), 200))
    .map(publicRepostItem);
}

export function importRepostItems(store, userId, sourceId, rows = [], sourceRow) {
  const source = sourceRow || sourceMutable(store, userId, sourceId);
  if (!source) throw new Error('Источник не найден');

  const results = [];
  for (const row of rows) {
    const item = (store.repostItems || []).find(
      (i) => i.id === row.itemId && i.userId === userId && i.sourceId === sourceId,
    );
    if (!item || item.status === 'imported') continue;

    const text = stripSourceLinks(item.text || item.title || '');
    if (!text.trim()) continue;

    const scheduledAt = row.scheduledAt ? Number(row.scheduledAt) : null;
    const post = createPost(store, userId, {
      title: String(item.title || text.slice(0, 80)).slice(0, 200),
      text,
      accountId: source.accountId,
      ownerId: source.ownerId,
      ownerLabel: source.ownerLabel,
      vkAttachments: (item.attachments || []).slice(0, 10),
      scheduledAt: scheduledAt && scheduledAt > Date.now() ? scheduledAt : null,
      status: scheduledAt && scheduledAt > Date.now() ? 'scheduled' : 'draft',
      niche: 'repost',
    });
    item.status = 'imported';
    item.postId = post.id;
    results.push({ itemId: item.id, postId: post.id });
  }
  return { imported: results.length, posts: results };
}

export function repostSourceItemCounts(store, userId) {
  const counts = {};
  for (const i of store.repostItems || []) {
    if (i.userId !== userId) continue;
    counts[i.sourceId] = (counts[i.sourceId] || 0) + 1;
  }
  return counts;
}

export async function pollOnlineRepostSources(store, tokenByUserId = {}) {
  const now = Date.now();
  const due = (store.repostSources || []).filter((s) => {
    if (!s.enabled || !s.onlineMode) return false;
    const interval = Math.max(300, Number(s.pollIntervalSec) || 900) * 1000;
    return !s.lastFetchedAt || s.lastFetchedAt + interval <= now;
  }).slice(0, 3);

  let created = 0;
  for (const source of due) {
    const token = tokenByUserId[source.userId];
    if (!token) continue;
    try {
      const r = await fetchRepostSource(store, source.userId, source.id, token);
      created += r.created;
    } catch { /* lastError set */ }
  }
  return { polled: due.length, created };
}
