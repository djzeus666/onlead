/** Masslike: one like per worker tick, with window / hourly / daily caps and no re-likes. */
import { vkDiscoverFriendsPosts, vkDiscoverWallPosts, vkDiscoverFeedPhotos, vkDiscoverPostComments, vkLikeItem, vkResolveOwnerId } from './neurocomment.mjs';
import { vkGrowthErrorHint } from './growth.mjs';
import { isMock } from './call.mjs';

const TZ = 'Europe/Moscow';

export function itemKey(p) {
  const type = p.type || 'post';
  const id = p.itemId ?? p.postId;
  return `${type}:${p.ownerId}_${id}`;
}

export function asLikeTarget(p, type = 'post') {
  const t = p.type || type;
  const itemId = p.itemId ?? p.postId;
  return {
    type: t,
    ownerId: p.ownerId,
    itemId,
    postId: p.postId ?? (t === 'post' ? itemId : undefined),
    url: p.url,
    text: p.text || '',
    liked: !!p.liked,
  };
}

export function likedItemFromTarget(p) {
  const type = p.type || 'post';
  return {
    type,
    url: p.url,
    text: String(p.text || '').replace(/\s+/g, ' ').trim().slice(0, 220),
    ownerId: p.ownerId,
    itemId: p.itemId,
    postId: p.postId,
  };
}

export function parseMasslikeMode(target) {
  const t = String(target || '').trim().toLowerCase();
  if (t === 'communities' || t.includes('сообществ')) return 'communities';
  if (t === 'photos' || t === 'photo' || t.includes('фото')) return 'photos';
  if (t === 'comments' || t === 'comment' || t.includes('коммент')) return 'comments';
  if (t === 'list' || t.includes('список')) return 'list';
  return 'friends';
}

export function parseMasslikeWindow(raw) {
  const s = String(raw || '').trim();
  if (!s || /кругл/i.test(s)) return null;
  const m = s.match(/(\d{1,2})\s*:\s*\d{2}\s*[-–—]\s*(\d{1,2})\s*:\s*\d{2}/);
  if (!m) return null;
  return { fromH: Number(m[1]), toH: Number(m[2]), label: s };
}

export function moscowParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = Number(parts.hour);
  return { day, hour, hourKey: `${day}T${String(hour).padStart(2, '0')}` };
}

export function masslikeInWindow(window, now = new Date()) {
  if (!window) return true;
  const { hour } = moscowParts(now);
  if (window.fromH === window.toH) return true;
  if (window.fromH < window.toH) return hour >= window.fromH && hour < window.toH;
  return hour >= window.fromH || hour < window.toH;
}

export function masslikeSkipWords(raw) {
  return String(raw || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((w) => w.length > 1 && !/^\d+\s*[-–—]\s*\d+$/.test(w) && !/активн/i.test(w) && !/^\d+$/.test(w));
}

export function masslikeSkipText(text, words) {
  if (!words?.length) return false;
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  return words.some((w) => t.includes(w));
}

export function masslikeLimits(payload, { mock } = {}) {
  const perHour = Math.min(40, Math.max(1, Number(payload?.perHour) || 15));
  const perDay = Math.min(80, Math.max(1, Number(payload?.perDay) || 40));
  const minGapMs = mock ? 800 : Math.max(45_000, Math.floor(3_600_000 / perHour));
  return { perHour, perDay, minGapMs };
}

export function masslikePace(stats, payload, now = new Date(), extras = {}) {
  const { day, hourKey } = moscowParts(now);
  const { perHour, perDay, minGapMs } = masslikeLimits(payload, extras);
  const sentToday = stats?.sentTodayDate === day ? Number(stats.sentToday || 0) : 0;
  const sentHour = stats?.hourKey === hourKey ? Number(stats.sentHour || 0) : 0;
  const window = parseMasslikeWindow(payload?.window);
  if (!masslikeInWindow(window, now)) {
    return { skip: true, message: `Вне окна ${window.label}` };
  }
  if (sentToday >= perDay) {
    return { skip: true, message: `Дневной лимит ${perDay} лайков — продолжим завтра` };
  }
  if (sentHour >= perHour) {
    return { skip: true, message: `Часовой лимит ${perHour} — пауза до следующего часа` };
  }
  const last = stats?.lastLikeAt ? Date.parse(stats.lastLikeAt) : 0;
  if (last && now.getTime() - last < minGapMs) {
    return { skip: true, quiet: true, message: 'Пауза между лайками' };
  }
  return { skip: false, day, hourKey, perHour, perDay, minGapMs, sentToday, sentHour };
}

export function pickMasslikeItem(items, likedKeys, skipWords) {
  const seen = new Set(likedKeys || []);
  for (const raw of items || []) {
    const p = asLikeTarget(raw, raw.type);
    if (!p.ownerId || !p.itemId) continue;
    if (p.liked) continue;
    if (seen.has(itemKey(p))) continue;
    if (masslikeSkipText(p.text, skipWords)) continue;
    return p;
  }
  return null;
}

async function resolveOwnerIds(token, raw, resolveOwner) {
  const lines = String(raw || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s && /vk\.com|vk\.ru|club|public|event|id\d+|wall-?\d|^-?\d+$/i.test(s));
  const ids = [];
  for (const line of lines.slice(0, 10)) {
    const r = await resolveOwner(token, line);
    if (r?.id) ids.push(r.id);
  }
  return [...new Set(ids)];
}

export async function collectMasslikeItems(opts) {
  const {
    mode, payload, token, lists,
    discoverFriends = vkDiscoverFriendsPosts,
    discoverWall = vkDiscoverWallPosts,
    discoverPhotos = vkDiscoverFeedPhotos,
    discoverComments = vkDiscoverPostComments,
    resolveOwner = vkResolveOwnerId,
  } = opts;
  if (mode === 'photos') {
    return (await discoverPhotos(token, 30)).map((p) => asLikeTarget(p, 'photo'));
  }
  if (mode === 'comments') {
    const raw = [payload.sources, payload.groups].filter(Boolean).join('\n');
    const ids = raw.trim() ? await resolveOwnerIds(token, raw, resolveOwner) : [];
    const posts = ids.length
      ? (await Promise.all(ids.slice(0, 6).map((id) => discoverWall(token, id, 4)))).flat()
      : await discoverFriends(token, 12);
    const out = [];
    for (const p of posts.slice(0, 10).map((x) => asLikeTarget(x, 'post'))) {
      if (!p.itemId) continue;
      out.push(...(await discoverComments(token, p.ownerId, p.itemId, 8)).map((c) => asLikeTarget(c, 'comment')));
    }
    return out;
  }
  if (mode === 'communities') {
    const raw = [payload.sources, payload.groups].filter(Boolean).join('\n');
    const ids = await resolveOwnerIds(token, raw, resolveOwner);
    if (!ids.length) {
      return { error: 'Для постов сообществ укажите ссылки VK — по одной на строку.' };
    }
    const out = [];
    for (const id of ids.slice(0, 8)) {
      out.push(...(await discoverWall(token, id, 6)).map((p) => asLikeTarget(p, 'post')));
    }
    return out;
  }
  if (mode === 'list') {
    const list = (lists || []).find((l) => l.id === payload.listId)
      || (lists || []).find((l) => l.id === payload.list)
      || (lists || [])[0];
    const people = (list?.items || []).filter((x) => x && x.id).slice(0, 12);
    if (!people.length) {
      return { error: 'Сначала соберите людей в «Мои списки» и выберите список.' };
    }
    const out = [];
    for (const u of people) {
      out.push(...(await discoverWall(token, Number(u.id), 3)).map((p) => asLikeTarget(p, 'post')));
    }
    return out;
  }
  return (await discoverFriends(token, 40)).map((p) => asLikeTarget(p, 'post'));
}

export async function runMasslikeStep(ctx) {
  const {
    payload = {},
    stats = {},
    lists = [],
    token,
    now = new Date(),
    like = vkLikeItem,
  } = ctx;
  const pace = masslikePace(stats, payload, now, { mock: isMock(token) });
  if (pace.skip) return { ok: true, skip: true, quiet: !!pace.quiet, message: pace.message };

  const mode = parseMasslikeMode(payload.target);
  let items;
  try {
    items = await collectMasslikeItems({ mode, payload, token, lists, ...ctx });
  } catch (err) {
    return { ok: false, message: vkGrowthErrorHint(err instanceof Error ? err.message : String(err)) };
  }
  if (items?.error) return { ok: true, skip: true, message: items.error };

  const words = masslikeSkipWords(payload.filters);
  const emptyMsg = mode === 'comments'
    ? 'Пока нет новых комментариев — подождите ленту или смените цель'
    : 'Пока нет новых постов — подождите ленту или смените цель';
  const post = pickMasslikeItem(items, stats.likedKeys, words);
  if (!post) {
    return { ok: true, skip: true, message: emptyMsg };
  }

  const key = itemKey(post);
  const r = await like(token, { type: post.type || 'post', ownerId: post.ownerId, itemId: post.itemId });
  const meta = {
    likedKey: key,
    dayKey: pace.day,
    hourKey: pace.hourKey,
    url: post.url,
    likedItem: likedItemFromTarget(post),
  };
  if (r.ok) {
    return { ok: true, message: `Лайк ${post.url}`, meta };
  }
  return {
    ok: false,
    message: vkGrowthErrorHint(r.message || 'Не получилось поставить лайк'),
    meta,
  };
}
