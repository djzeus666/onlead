/** Neurocomments — from post2post packages/integrations/src/vk/neurocomment.ts */
import { vkCall, isMock, normalizeVkScreenRef } from './call.mjs';

function mapWallItem(item) {
  return {
    ownerId: item.owner_id,
    postId: item.id,
    itemId: item.id,
    type: 'post',
    authorId: item.from_id ?? item.owner_id,
    text: (item.text || '').trim(),
    date: item.date,
    liked: item.likes?.user_likes === 1,
    url: `https://vk.com/wall${item.owner_id}_${item.id}`,
  };
}

function mapNewsfeedPost(item) {
  return {
    ownerId: item.source_id,
    postId: item.post_id,
    itemId: item.post_id,
    type: 'post',
    authorId: item.source_id,
    text: (item.text || '').trim(),
    date: item.date ?? Math.floor(Date.now() / 1000),
    liked: item.likes?.user_likes === 1,
    url: `https://vk.com/wall${item.source_id}_${item.post_id}`,
  };
}

export async function vkDiscoverFriendsPosts(accessToken, limit = 30) {
  if (isMock(accessToken)) {
    const t = Math.floor(Date.now() / 1000);
    return [1, 2, 3].map((n) => ({
      ownerId: 10000 + n, postId: n, itemId: n, type: 'post', authorId: 10000 + n,
      text: `Пост друга ${n}`, date: t - n * 120, liked: false,
      url: `https://vk.com/wall${10000 + n}_${n}`,
    }));
  }
  const res = await vkCall('newsfeed.get', { filters: 'post', count: Math.min(50, limit) }, accessToken);
  const out = [];
  for (const item of res.items ?? []) {
    if (item.post) out.push(mapWallItem(item.post));
    else if (item.post_id && item.source_id) out.push(mapNewsfeedPost(item));
    if (out.length >= limit) break;
  }
  return out;
}

export async function vkDiscoverFeedPhotos(accessToken, limit = 20) {
  if (isMock(accessToken)) {
    return [1, 2].map((n) => ({
      ownerId: 10000 + n, postId: 500 + n, itemId: 500 + n, type: 'photo',
      text: '', liked: false, url: `https://vk.com/photo${10000 + n}_${500 + n}`,
    }));
  }
  const res = await vkCall('newsfeed.get', { filters: 'photo,wall_photo', count: Math.min(50, limit) }, accessToken);
  const out = [];
  for (const item of res.items ?? []) {
    const photos = item.photos?.items || [];
    for (const ph of photos) {
      if (!ph?.id || ph.owner_id == null) continue;
      out.push({
        ownerId: ph.owner_id,
        postId: ph.id,
        itemId: ph.id,
        type: 'photo',
        text: '',
        date: ph.date || item.date,
        liked: ph.likes?.user_likes === 1,
        url: `https://vk.com/photo${ph.owner_id}_${ph.id}`,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export async function vkDiscoverWallPosts(accessToken, ownerId, limit = 10) {
  if (isMock(accessToken)) {
    const postId = 10 + (Math.abs(Number(ownerId)) % 50);
    return [{
      ownerId, postId, itemId: postId, type: 'post', authorId: ownerId, liked: false,
      text: 'Новый пост целевой страницы',
      date: Math.floor(Date.now() / 1000) - 300, url: `https://vk.com/wall${ownerId}_${postId}`,
    }];
  }
  const res = await vkCall('wall.get', { owner_id: ownerId, count: Math.min(20, limit), filter: 'owner' }, accessToken);
  return (res.items ?? []).slice(0, limit).map(mapWallItem);
}

export async function vkDiscoverPostComments(accessToken, ownerId, postId, limit = 10) {
  const pid = Number(postId);
  if (!Number.isFinite(pid) || !pid) return [];
  if (isMock(accessToken)) {
    const commentId = 900 + (Math.abs(Number(ownerId)) % 50);
    return [{
      type: 'comment',
      ownerId,
      postId: pid,
      itemId: commentId,
      text: 'Согласен с автором, полезный пост',
      liked: false,
      url: `https://vk.com/wall${ownerId}_${pid}?reply=${commentId}`,
    }];
  }
  const res = await vkCall('wall.getComments', {
    owner_id: ownerId,
    post_id: pid,
    count: Math.min(20, limit),
    sort: 'desc',
    preview_length: 180,
    need_likes: 1,
  }, accessToken);
  return (res.items ?? []).filter((c) => c && c.id && !c.deleted).map((c) => ({
    type: 'comment',
    ownerId,
    postId: pid,
    itemId: c.id,
    text: (c.text || '').trim(),
    liked: c.likes?.user_likes === 1,
    url: `https://vk.com/wall${ownerId}_${pid}?reply=${c.id}`,
  }));
}

export async function vkResolveOwnerId(accessToken, raw) {
  const trimmed = normalizeVkScreenRef(raw);
  if (!trimmed) return null;
  if (isMock(accessToken)) {
    const n = Number(trimmed.replace(/^(club|public|event|id)/i, '').replace(/^-/, ''));
    return {
      id: Number.isFinite(n) && n > 0 ? (trimmed.toLowerCase().startsWith('id') ? n : -n) : -1,
      type: trimmed.toLowerCase().startsWith('id') ? 'user' : 'group',
      name: trimmed, screenName: trimmed,
    };
  }
  const wallOwner = trimmed.match(/^wall(-?\d+)_\d+$/i);
  if (wallOwner) {
    const id = Number(wallOwner[1]);
    if (Number.isFinite(id) && id !== 0) return { id, type: id < 0 ? 'group' : 'user', screenName: trimmed };
  }
  const prefixed = trimmed.match(/^(club|public|event|id)(\d+)$/i);
  if (prefixed) {
    const n = Number(prefixed[2]);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (prefixed[1].toLowerCase() === 'id') return { id: n, type: 'user', screenName: trimmed };
    return { id: -n, type: 'group', screenName: trimmed };
  }
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric !== 0) {
    return numeric < 0 ? { id: numeric, type: 'group' } : { id: numeric, type: 'user' };
  }
  try {
    const res = await vkCall('utils.resolveScreenName', { screen_name: trimmed }, accessToken);
    if (res && res.object_id) {
      const t = (res.type || '').toLowerCase();
      if (t === 'user' || t === 'profile') return { id: res.object_id, type: 'user', screenName: trimmed };
      if (t === 'group' || t === 'page' || t === 'event') {
        return { id: -Math.abs(res.object_id), type: 'group', screenName: trimmed };
      }
    }
  } catch { /* fall through */ }
  try {
    const groups = await vkCall('groups.getById', { group_id: trimmed }, accessToken);
    const list = Array.isArray(groups) ? groups : groups.groups ?? [];
    const g = list[0];
    if (g?.id) return { id: -Math.abs(g.id), type: 'group', name: g.name, screenName: g.screen_name || trimmed };
  } catch { /* fall through */ }
  try {
    const wall = await vkCall('wall.get', { domain: trimmed, count: 1 }, accessToken);
    const ownerId = wall.items?.[0]?.owner_id;
    if (ownerId) return { id: ownerId, type: ownerId < 0 ? 'group' : 'user', screenName: trimmed };
  } catch { /* fall through */ }
  return null;
}

export async function vkCreateNeuroComment(accessToken, ownerId, postId, message) {
  if (isMock(accessToken)) return { ok: true, commentId: `mock-${Date.now()}` };
  try {
    const res = await vkCall('wall.createComment', { owner_id: ownerId, post_id: postId, message }, accessToken);
    return { ok: true, commentId: String(res.comment_id) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'VK comment failed' };
  }
}

export async function vkLikeItem(accessToken, { type, ownerId, itemId }) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('likes.add', {
      type: type || 'post',
      owner_id: ownerId,
      item_id: itemId,
    }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'VK like failed' };
  }
}

export async function vkLikePost(accessToken, ownerId, postId) {
  return vkLikeItem(accessToken, { type: 'post', ownerId, itemId: postId });
}

export async function vkListCommentReplies(accessToken, ownerId, postId, commentId) {
  if (isMock(accessToken)) return [];
  const mapItems = (items) => (items ?? []).map((c) => ({
    id: String(c.id), fromId: String(c.from_id), text: c.text || '', date: c.date,
  }));
  const res = await vkCall('wall.getComments', {
    owner_id: ownerId, post_id: postId, comment_id: commentId, count: 100, sort: 'asc', preview_length: 0,
  }, accessToken);
  return mapItems(res.items);
}
