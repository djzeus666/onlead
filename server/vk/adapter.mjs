/** VK adapter — connect / channels / publish from post2post packages/integrations/src/vk/index.ts */
import { readFileSync } from 'node:fs';
import { vkCall, isMock } from './call.mjs';

function normalizeGroupsGetById(response) {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && Array.isArray(response.groups)) return response.groups;
  return [];
}

function groupIdParam(raw) {
  const trimmed = String(raw || '').trim().replace(/^@/, '');
  if (!trimmed) return undefined;
  const numeric = Number(trimmed.replace(/^-/, ''));
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return trimmed;
}

function isVkIdToken(token) {
  return /^vk2\.a\./i.test(token);
}

export async function vkConnect(credentials) {
  const accessToken = credentials.accessToken ?? credentials.token;
  if (!accessToken) throw new Error('VK accessToken is required');
  if (isMock(accessToken)) {
    return {
      externalAccountId: 'mock-vk-user',
      displayName: 'VK Mock User',
      accessToken,
      metadata: { mock: true },
    };
  }
  try {
    const users = await vkCall('users.get', { fields: 'photo_100' }, accessToken);
    const user = users[0];
    if (user) {
      return {
        externalAccountId: String(user.id),
        displayName: `${user.first_name} ${user.last_name}`.trim(),
        avatarUrl: user.photo_100,
        accessToken,
        metadata: { source: 'user_token' },
      };
    }
  } catch (err) {
    if (err.code === 'VK_NETWORK') throw err;
  }
  const groupParam = groupIdParam(credentials.groupId ?? credentials.externalId ?? '');
  if (groupParam != null) {
    const groups = normalizeGroupsGetById(
      await vkCall('groups.getById', { group_ids: String(groupParam), fields: 'photo_100' }, accessToken),
    );
    const g = groups[0];
    if (g) {
      return {
        externalAccountId: `group_${g.id}`,
        displayName: g.name,
        avatarUrl: g.photo_100,
        accessToken,
        metadata: { source: 'group_token', groupId: g.id, type: g.type },
      };
    }
  }
  try {
    const groups = await vkCall('groups.get', { extended: 1, filter: 'admin,editor', count: 1 }, accessToken);
    const g = groups.items?.[0];
    if (g) {
      return {
        externalAccountId: `group_${g.id}`,
        displayName: g.name,
        avatarUrl: g.photo_100,
        accessToken,
        metadata: { source: 'group_token_via_groups.get', groupId: g.id },
      };
    }
  } catch { /* fall through */ }
  throw new Error(
    'Не удалось определить аккаунт VK. Для токена сообщества укажите ID группы.',
  );
}

export async function vkListChannels(accessToken, metadata = {}) {
  if (isMock(accessToken)) {
    return [
      { externalId: String(10001), name: 'Моя страница (mock)', type: 'personal' },
      { externalId: '-1001', name: 'VK Mock Community', type: 'community' },
    ];
  }
  const channels = [];
  try {
    const users = await vkCall('users.get', { fields: 'photo_100' }, accessToken);
    const user = users[0];
    if (user?.id) {
      channels.push({
        externalId: String(user.id),
        name: `Моя страница (${user.first_name} ${user.last_name})`.trim(),
        type: 'personal',
        avatarUrl: user.photo_100,
      });
    }
  } catch { /* skip */ }
  try {
    let offset = 0;
    const count = 1000;
    for (;;) {
      const groups = await vkCall('groups.get', {
        extended: 1,
        filter: 'admin,editor,moder',
        count,
        offset,
        fields: 'photo_100,screen_name',
      }, accessToken);
      const items = groups.items ?? [];
      const total = groups.count ?? items.length;
      for (const g of items) {
        channels.push({
          externalId: String(-g.id),
          name: g.name,
          type: g.type === 'page' ? 'page' : g.type === 'event' ? 'event' : 'community',
          avatarUrl: g.photo_100,
          screenName: g.screen_name,
        });
      }
      offset += items.length;
      if (!items.length || offset >= total) break;
    }
  } catch (err) {
    if (err.code === 'VK_1051' || isVkIdToken(accessToken)) return channels;
    throw err;
  }
  return channels;
}

export async function vkPublishWall(accessToken, { ownerId, text, fromGroup, attachments }) {
  if (isMock(accessToken)) {
    const att = Array.isArray(attachments) ? attachments.length : 0;
    return { ok: true, externalPostId: `vk_mock_${Date.now()}`, permalink: `https://vk.com/wall${ownerId}_1`, attachments: att };
  }
  if (isVkIdToken(accessToken)) {
    return { ok: false, message: 'Токен VK ID не умеет публиковать на стену. Нужен classic user / community token.' };
  }
  try {
    const att = (attachments || []).filter(Boolean).slice(0, 10);
    const params = {
      owner_id: ownerId,
      from_group: fromGroup ?? (ownerId < 0 ? 1 : 0),
      message: String(text || '').slice(0, 16384),
    };
    if (att.length) params.attachments = att.join(',');
    const response = await vkCall('wall.post', params, accessToken);
    return {
      ok: true,
      externalPostId: `${ownerId}_${response.post_id}`,
      permalink: `https://vk.ru/wall${ownerId}_${response.post_id}`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'wall.post failed', code: err.code };
  }
}

export async function vkUploadWallPhotos(accessToken, ownerId, filePaths) {
  const paths = (filePaths || []).filter(Boolean).slice(0, 10);
  if (!paths.length) return [];
  if (isMock(accessToken)) {
    return paths.map((_, i) => `photo100_${200 + i}`);
  }
  if (isVkIdToken(accessToken)) return [];

  const out = [];
  const groupId = ownerId < 0 ? Math.abs(ownerId) : undefined;
  for (const fp of paths) {
    try {
      const params = groupId ? { group_id: groupId } : {};
      const server = await vkCall('photos.getWallUploadServer', params, accessToken);
      const uploadUrl = server?.upload_url;
      if (!uploadUrl) continue;

      const buf = readFileSync(fp);
      const form = new FormData();
      form.append('photo', new Blob([buf]), 'photo.jpg');
      const upRes = await fetch(uploadUrl, { method: 'POST', body: form });
      const upJson = await upRes.json();
      if (upJson?.error) continue;

      const saveParams = {
        photo: upJson.photo,
        server: upJson.server,
        hash: upJson.hash,
      };
      if (groupId) saveParams.group_id = groupId;
      const saved = await vkCall('photos.saveWallPhoto', saveParams, accessToken);
      const ph = Array.isArray(saved) ? saved[0] : saved;
      if (ph?.owner_id && ph?.id) out.push(`photo${ph.owner_id}_${ph.id}`);
    } catch {
      /* skip failed upload */
    }
  }
  return out;
}

export async function vkGetMe(accessToken) {
  return vkConnect({ accessToken });
}
