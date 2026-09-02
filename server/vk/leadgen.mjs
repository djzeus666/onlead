/** Leadgen scan — from post2post packages/integrations/src/vk/leadgen.ts */
import { vkCall, isMock, sleep } from './call.mjs';

function scanPosts(target) {
  return target === 'all' || target === 'posts';
}
function scanComments(target) {
  return target === 'all' || target === 'comments';
}
function normalize(s, caseInsensitive) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return caseInsensitive ? t.toLowerCase() : t;
}

export function matchPhrases(text, phrases) {
  const raw = text || '';
  if (!raw.trim()) return null;
  for (const p of phrases) {
    const needle = (p.phrase || '').trim();
    if (!needle) continue;
    const ci = p.caseInsensitive !== false;
    if (normalize(raw, ci).includes(normalize(needle, ci))) return needle;
  }
  return null;
}

function indexProfiles(profiles) {
  const map = new Map();
  for (const p of profiles ?? []) map.set(p.id, p);
  return map;
}
function indexGroups(groups) {
  const map = new Map();
  for (const g of groups ?? []) map.set(g.id, g);
  return map;
}

export function resolveVkAuthor(fromId, profiles, groups) {
  if (fromId == null || !Number.isFinite(fromId) || fromId === 0) return {};
  if (fromId > 0) {
    const p = profiles.get(fromId);
    const name = p
      ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || `id${fromId}`
      : `id${fromId}`;
    const url = p?.screen_name ? `https://vk.com/${p.screen_name}` : `https://vk.com/id${fromId}`;
    return { authorId: String(fromId), authorName: name, authorUrl: url };
  }
  const gid = Math.abs(fromId);
  const g = groups.get(gid);
  const name = g?.name?.trim() || `club${gid}`;
  const url = g?.screen_name ? `https://vk.com/${g.screen_name}` : `https://vk.com/club${gid}`;
  return { authorId: String(-gid), authorName: name, authorUrl: url };
}

/** Never fall back to owner_id — that is the wall host, not the writer. */
export function pickVkPostAuthorId(post) {
  if (post.signer_id && post.signer_id > 0) return post.signer_id;
  if (post.from_id && post.from_id > 0) return post.from_id;
  if (post.created_by && post.created_by > 0) return post.created_by;
  if (post.from_id && post.from_id < 0) return post.from_id;
  return undefined;
}

export function resolveVkPostAuthor(post, profiles, groups) {
  const authorId = pickVkPostAuthorId(post);
  if (authorId == null) return {};
  return resolveVkAuthor(authorId, profiles, groups);
}

async function fetchVkUserProfiles(accessToken, ids, into) {
  const missing = [...new Set(ids.filter((id) => id > 0 && !into.has(id)))];
  if (!missing.length || isMock(accessToken)) return;
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    try {
      const users = await vkCall('users.get', { user_ids: chunk.join(','), fields: 'screen_name' }, accessToken);
      for (const p of users ?? []) {
        if (p?.id) into.set(p.id, p);
      }
    } catch { /* best-effort */ }
    if (i + 100 < missing.length) await sleep(200);
  }
}

export async function vkListMemberGroups(accessToken, opts = {}) {
  if (isMock(accessToken)) {
    return [
      { id: '1001', name: 'Mock VK Group', screenName: 'mock_vk_group' },
      { id: '1002', name: 'Mock Jobs Board', screenName: 'mock_jobs' },
    ];
  }
  const res = await vkCall('groups.get', { extended: 1, count: Math.min(1000, opts.count ?? 200) }, accessToken);
  return (res.items ?? []).map((g) => ({
    id: String(g.id),
    name: g.name?.trim() || `Группа ${g.id}`,
    screenName: g.screen_name,
    avatarUrl: g.photo_100,
  }));
}

export async function vkScanGroupForPhrases(accessToken, groupId, phrases, opts = {}) {
  const postsLimit = opts.postsLimit ?? 20;
  const commentsPerPost = opts.commentsPerPost ?? 20;
  const pauseMs = opts.pauseMs ?? 350;
  const scanTarget = opts.scanTarget ?? 'all';
  const hits = [];
  if (!phrases.length) return { hits };

  if (isMock(accessToken)) {
    const phrase = phrases[0].phrase;
    if (scanPosts(scanTarget)) {
      hits.push({
        kind: 'post',
        externalId: `${groupId}_post_1`,
        text: `Ищу специалиста — ${phrase}`,
        authorId: '10001',
        authorName: 'Mock Author',
        authorUrl: 'https://vk.com/id10001',
        url: `https://vk.com/wall-${groupId}_1`,
        matchedPhrase: phrase,
        foundAt: new Date().toISOString(),
      });
    }
    if (scanComments(scanTarget)) {
      hits.push({
        kind: 'comment',
        externalId: `${groupId}_c_1`,
        parentExternalId: `${groupId}_1`,
        text: `Кто знает хорошего мастера? ${phrase}`,
        authorId: '10002',
        authorName: 'Mock Commenter',
        authorUrl: 'https://vk.com/id10002',
        matchedPhrase: phrase,
        url: `https://vk.com/wall-${groupId}_1?reply=1`,
        foundAt: new Date().toISOString(),
      });
    }
    return { hits };
  }

  const ownerId = -Math.abs(Number(groupId));
  if (!Number.isFinite(ownerId) || ownerId >= 0) {
    return { hits, error: `Некорректный id группы VK: ${groupId}` };
  }

  let posts = [];
  let wallProfiles = new Map();
  let wallGroups = new Map();
  try {
    const wall = await vkCall('wall.get', {
      owner_id: ownerId,
      count: Math.min(100, postsLimit),
      filter: 'all',
      extended: 1,
    }, accessToken);
    posts = wall.items ?? [];
    wallProfiles = indexProfiles(wall.profiles);
    wallGroups = indexGroups(wall.groups);
    const postAuthorIds = posts.map(pickVkPostAuthorId).filter((id) => id != null && id > 0);
    await fetchVkUserProfiles(accessToken, postAuthorIds, wallProfiles);
  } catch (err) {
    return { hits, error: err instanceof Error ? err.message : String(err) };
  }

  for (const post of posts) {
    const postText = (post.text || '').trim();
    const matched = scanPosts(scanTarget) ? matchPhrases(postText, phrases) : null;
    if (matched) {
      hits.push({
        kind: 'post',
        externalId: `${post.owner_id}_${post.id}`,
        text: postText,
        ...resolveVkPostAuthor(post, wallProfiles, wallGroups),
        url: `https://vk.com/wall${post.owner_id}_${post.id}`,
        matchedPhrase: matched,
        foundAt: new Date(post.date * 1000).toISOString(),
      });
    }
    if (!scanComments(scanTarget)) continue;
    await sleep(pauseMs);
    try {
      const comments = await vkCall('wall.getComments', {
        owner_id: post.owner_id,
        post_id: post.id,
        count: Math.min(100, commentsPerPost),
        sort: 'desc',
        extended: 1,
      }, accessToken);
      const cProfiles = indexProfiles(comments.profiles);
      const cGroups = indexGroups(comments.groups);
      for (const [id, profile] of wallProfiles) {
        if (!cProfiles.has(id)) cProfiles.set(id, profile);
      }
      await fetchVkUserProfiles(
        accessToken,
        (comments.items ?? []).map((c) => c.from_id).filter((id) => id > 0),
        cProfiles,
      );
      for (const c of comments.items ?? []) {
        const text = (c.text || '').trim();
        const m = matchPhrases(text, phrases);
        if (!m) continue;
        hits.push({
          kind: 'comment',
          externalId: `${post.owner_id}_${post.id}_${c.id}`,
          parentExternalId: `${post.owner_id}_${post.id}`,
          text,
          ...resolveVkAuthor(c.from_id, cProfiles, cGroups),
          url: `https://vk.com/wall${post.owner_id}_${post.id}?reply=${c.id}`,
          matchedPhrase: m,
          foundAt: new Date(c.date * 1000).toISOString(),
        });
      }
    } catch { /* skip one post */ }
    await sleep(pauseMs);
  }
  return { hits };
}
