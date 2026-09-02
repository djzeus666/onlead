/** RSS Autopilot — sources, fetch, import to content posts. */
import { randomBytes } from 'node:crypto';
import { parseRssFeed, assertSafeExternalUrl, buildRssTextBody, buildRewrittenPostBody } from './rss-parser.mjs';
import { createPost, updatePost } from './posts.mjs';
import { generateAiChat } from './ai.mjs';

function id(prefix) {
  return `${prefix}-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

export function listRssSources(store, userId) {
  return (store.rssSources || [])
    .filter((s) => s.userId === userId)
    .map(publicRssSource)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getRssSource(store, userId, sourceId) {
  const row = (store.rssSources || []).find((s) => s.id === sourceId && s.userId === userId);
  return row ? publicRssSource(row) : null;
}

function sourceMutable(store, userId, sourceId) {
  return (store.rssSources || []).find((s) => s.id === sourceId && s.userId === userId) || null;
}

export function publicRssSource(s) {
  if (!s) return null;
  const items = (s._itemsCount != null)
    ? s._itemsCount
    : undefined;
  return {
    id: s.id,
    name: s.name,
    url: s.url,
    enabled: s.enabled !== false,
    onlineMode: Boolean(s.onlineMode),
    aiRewrite: s.aiRewrite !== false,
    pollIntervalSec: Math.max(60, Number(s.pollIntervalSec) || 300),
    accountId: s.accountId || '',
    ownerId: s.ownerId ?? null,
    ownerLabel: s.ownerLabel || '',
    lastFetchedAt: s.lastFetchedAt || null,
    lastError: s.lastError || null,
    itemCount: items,
    createdAt: s.createdAt,
  };
}

export async function createRssSource(store, userId, body = {}) {
  const url = (await assertSafeExternalUrl(String(body.url || '').trim())).toString();
  const dup = (store.rssSources || []).find((s) => s.userId === userId && s.url === url);
  if (dup) throw new Error('Этот RSS уже добавлен');

  let feedTitle = String(body.name || '').trim();
  let feed;
  try {
    feed = await parseRssFeed(url);
    feedTitle = feedTitle || feed.title;
  } catch (err) {
    throw new Error(`Не удалось прочитать RSS: ${err instanceof Error ? err.message : String(err)}`);
  }

  const now = Date.now();
  const source = {
    id: id('rss'),
    userId,
    url,
    name: feedTitle || new URL(url).hostname,
    enabled: true,
    onlineMode: Boolean(body.onlineMode),
    aiRewrite: body.aiRewrite !== false,
    pollIntervalSec: Math.max(60, Number(body.pollIntervalSec) || 300),
    accountId: String(body.accountId || ''),
    ownerId: body.ownerId != null && body.ownerId !== '' ? Number(body.ownerId) : null,
    ownerLabel: String(body.ownerLabel || ''),
    lastFetchedAt: null,
    lastError: null,
    createdAt: now,
  };
  store.rssSources = store.rssSources || [];
  store.rssSources.unshift(source);
  return { source: publicRssSource(source), feedPreview: feed.items.length };
}

export function updateRssSource(store, userId, sourceId, patch = {}) {
  const s = sourceMutable(store, userId, sourceId);
  if (!s) return null;
  if (patch.name != null) s.name = String(patch.name).slice(0, 200);
  if (patch.enabled != null) s.enabled = Boolean(patch.enabled);
  if (patch.onlineMode != null) s.onlineMode = Boolean(patch.onlineMode);
  if (patch.aiRewrite != null) s.aiRewrite = Boolean(patch.aiRewrite);
  if (patch.pollIntervalSec != null) s.pollIntervalSec = Math.max(60, Number(patch.pollIntervalSec) || 300);
  if (patch.accountId != null) s.accountId = String(patch.accountId);
  if (patch.ownerId !== undefined) s.ownerId = patch.ownerId != null && patch.ownerId !== '' ? Number(patch.ownerId) : null;
  if (patch.ownerLabel != null) s.ownerLabel = String(patch.ownerLabel).slice(0, 120);
  return publicRssSource(s);
}

export function deleteRssSource(store, userId, sourceId) {
  const idx = (store.rssSources || []).findIndex((s) => s.id === sourceId && s.userId === userId);
  if (idx < 0) return false;
  store.rssSources.splice(idx, 1);
  store.rssItems = (store.rssItems || []).filter((i) => i.sourceId !== sourceId);
  return true;
}

export function listRssItems(store, userId, sourceId, opts = {}) {
  const status = opts.status ? String(opts.status) : null;
  return (store.rssItems || [])
    .filter((i) => i.userId === userId && i.sourceId === sourceId && (!status || i.status === status))
    .sort((a, b) => (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0))
    .slice(0, Math.min(Math.max(Number(opts.take) || 100, 1), 200))
    .map(publicRssItem);
}

function itemMutable(store, userId, itemId) {
  return (store.rssItems || []).find((i) => i.id === itemId && i.userId === userId) || null;
}

export function publicRssItem(i) {
  return {
    id: i.id,
    sourceId: i.sourceId,
    title: i.title,
    link: i.link || null,
    summary: i.summary ? String(i.summary).slice(0, 300) : null,
    imageUrl: i.imageUrl || null,
    publishedAt: i.publishedAt || null,
    status: i.status || 'new',
    postId: i.postId || null,
    createdAt: i.createdAt,
  };
}

function upsertFeedItem(store, userId, sourceId, parsed) {
  const guid = String(parsed.guid || '').slice(0, 500);
  const existing = (store.rssItems || []).find((i) => i.sourceId === sourceId && i.guid === guid);
  const row = {
    title: parsed.title,
    link: parsed.link,
    summary: parsed.summary,
    content: parsed.content,
    imageUrl: parsed.imageUrl,
    publishedAt: parsed.publishedAt || null,
  };
  if (existing) {
    Object.assign(existing, row);
    return { created: false, item: existing };
  }
  const item = {
    id: id('rsi'),
    userId,
    sourceId,
    guid,
    ...row,
    status: 'new',
    postId: null,
    createdAt: Date.now(),
  };
  store.rssItems = store.rssItems || [];
  store.rssItems.unshift(item);
  return { created: true, item };
}

export async function fetchRssSource(store, userId, sourceId) {
  const source = sourceMutable(store, userId, sourceId);
  if (!source) throw new Error('Источник не найден');
  try {
    const feed = await parseRssFeed(source.url);
    let created = 0;
    let updated = 0;
    for (const parsed of feed.items.slice(0, 100)) {
      const r = upsertFeedItem(store, userId, source.id, parsed);
      if (r.created) created += 1;
      else updated += 1;
    }
    source.lastFetchedAt = Date.now();
    source.lastError = null;
    if (!source.name || source.name === 'RSS') source.name = feed.title || source.name;
    return { created, updated, total: feed.items.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    source.lastError = msg;
    source.lastFetchedAt = Date.now();
    throw new Error(`Ошибка загрузки RSS: ${msg}`);
  }
}

async function maybeRewriteItem(source, item, aiConfig) {
  const fallbackBody = buildRssTextBody(item);
  const fallbackTitle = String(item.title || '').slice(0, 200);
  if (source.aiRewrite === false || !aiConfig?.apiKey) {
    return { title: fallbackTitle, text: fallbackBody, aiRewritten: false };
  }
  try {
    const raw = [item.title, (item.content || item.summary || '').trim().slice(0, 6000)].filter(Boolean).join('\n\n');
    const { text } = await generateAiChat([
      { role: 'system', content: 'Перепиши RSS-статью для поста VK на русском. Ответ: JSON {"title":"...","body":"..."} без markdown-обёртки.' },
      { role: 'user', content: raw },
    ], aiConfig, { maxTokens: 500 });
    let title = fallbackTitle;
    let body = fallbackBody;
    try {
      const j = JSON.parse(text.replace(/^```json?\s*|\s*```$/g, ''));
      if (j.title) title = String(j.title).slice(0, 200);
      if (j.body) body = String(j.body).slice(0, 16384);
    } catch {
      body = text.slice(0, 16384);
    }
    return {
      title,
      text: buildRewrittenPostBody(body, item.link),
      aiRewritten: true,
    };
  } catch {
    return { title: fallbackTitle, text: fallbackBody, aiRewritten: false };
  }
}

export async function importRssItems(store, userId, sourceId, rows, { aiConfig } = {}) {
  const source = sourceMutable(store, userId, sourceId);
  if (!source) throw new Error('Источник не найден');
  const results = [];
  for (const row of rows || []) {
    const item = itemMutable(store, userId, row.itemId);
    if (!item || item.sourceId !== sourceId) throw new Error(`Статья не найдена: ${row.itemId}`);
    if (item.status === 'imported' && item.postId) {
      results.push({ itemId: item.id, postId: item.postId });
      continue;
    }
    const rewritten = await maybeRewriteItem(source, item, aiConfig);
    const scheduledAt = row.scheduledAt ? Number(row.scheduledAt) : null;
    const post = createPost(store, userId, {
      title: rewritten.title,
      text: rewritten.text,
      accountId: source.accountId,
      ownerId: source.ownerId,
      ownerLabel: source.ownerLabel,
      scheduledAt: scheduledAt && scheduledAt > Date.now() ? scheduledAt : null,
      status: scheduledAt && scheduledAt > Date.now() ? 'scheduled' : 'draft',
      niche: 'rss',
    });
    if (item.imageUrl) {
      updatePost(store, userId, post.id, { mediaUrls: [item.imageUrl] });
    }
    item.status = 'imported';
    item.postId = post.id;
    results.push({ itemId: item.id, postId: post.id });
  }
  return { imported: results.length, posts: results };
}

export async function pollOnlineRssSources(store, deps = {}) {
  const now = Date.now();
  const due = (store.rssSources || []).filter((s) => {
    if (!s.enabled || !s.onlineMode) return false;
    const interval = Math.max(60, Number(s.pollIntervalSec) || 300) * 1000;
    return !s.lastFetchedAt || s.lastFetchedAt + interval <= now;
  }).slice(0, 5);

  let created = 0;
  let imported = 0;
  for (const source of due) {
    try {
      const r = await fetchRssSource(store, source.userId, source.id);
      created += r.created;
      const newItems = (store.rssItems || [])
        .filter((i) => i.sourceId === source.id && i.status === 'new')
        .slice(0, 10);
      if (newItems.length && source.accountId) {
        const imp = await importRssItems(store, source.userId, source.id, newItems.map((i) => ({ itemId: i.id })), deps);
        imported += imp.imported;
      }
    } catch { /* lastError set in fetch */ }
  }
  return { polled: due.length, created, imported };
}

export function rssSourceItemCounts(store, userId) {
  const counts = {};
  for (const i of store.rssItems || []) {
    if (i.userId !== userId) continue;
    counts[i.sourceId] = (counts[i.sourceId] || 0) + 1;
  }
  return counts;
}
