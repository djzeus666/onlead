/** Growth tools — from post2post packages/integrations/src/vk/growth.ts */
import { vkCall, isMock } from './call.mjs';

function mapUser(u) {
  return {
    id: u.id,
    firstName: u.first_name || '',
    lastName: u.last_name || '',
    bdate: u.bdate,
    deactivated: u.deactivated,
    photo: u.photo_100,
    lastSeen: u.last_seen?.time,
    sex: u.sex,
    cityId: u.city?.id,
    cityTitle: u.city?.title,
    canWritePrivateMessage: u.can_write_private_message === 1,
  };
}

export async function vkGetFriends(accessToken, opts = {}) {
  if (isMock(accessToken)) {
    const now = new Date();
    return [{
      id: 10001,
      firstName: 'Иван',
      lastName: 'Тестов',
      bdate: `${now.getDate()}.${now.getMonth() + 1}.1990`,
      photo: '',
      canWritePrivateMessage: true,
    }];
  }
  const res = await vkCall('friends.get', {
    ...(opts.userId ? { user_id: opts.userId } : {}),
    fields: opts.fields || 'bdate,photo_100,last_seen,sex,city,can_write_private_message',
    count: opts.count ?? 200,
    offset: opts.offset ?? 0,
    order: 'name',
  }, accessToken);
  return (res.items ?? []).map(mapUser);
}

export async function vkGetFollowers(accessToken, opts = {}) {
  if (isMock(accessToken)) {
    return [{ id: 50001, firstName: 'Мария', lastName: 'Подписчик', photo: '' }];
  }
  const res = await vkCall('users.getFollowers', {
    count: Math.min(Math.max(Number(opts.count || 200), 1), 1000),
    offset: opts.offset ?? 0,
    fields: opts.fields || 'bdate,photo_100,last_seen,sex,city',
  }, accessToken);
  return (res.items ?? []).map(mapUser);
}

export function vkIsBirthdayToday(bdate, when = new Date()) {
  if (!bdate) return false;
  const parts = bdate.split('.').map((p) => Number(p));
  if (parts.length < 2) return false;
  const [d, m] = parts;
  return d === when.getDate() && m === when.getMonth() + 1;
}

/** Bit 12 = messages (4096) in VK app permissions bitmask. */
export const VK_PERM_MESSAGES = 4096;

export async function vkSendMessage(accessToken, peerId, message) {
  if (isMock(accessToken)) return { ok: true, messageId: `mock-msg-${peerId}` };
  try {
    const id = await vkCall('messages.send', {
      peer_id: peerId,
      message,
      random_id: Math.floor(Math.random() * 1_000_000_000),
    }, accessToken);
    return { ok: true, messageId: String(id) };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'messages.send failed',
      code: err?.code || '',
    };
  }
}

export async function vkPostOnWall(accessToken, ownerId, message) {
  if (isMock(accessToken)) return { ok: true, postId: `mock-wall-${ownerId}` };
  try {
    const res = await vkCall('wall.post', { owner_id: ownerId, message }, accessToken);
    return { ok: true, postId: String(res.post_id) };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'wall.post failed',
      code: err?.code || '',
    };
  }
}

/** Ensures token can call messages.* (bitmask and/or live API probe). */
export async function vkAssertMessagesPermission(accessToken) {
  if (isMock(accessToken)) return;
  try {
    const perms = Number(await vkCall('account.getAppPermissions', {}, accessToken)) || 0;
    if ((perms & VK_PERM_MESSAGES) !== 0) return;
  } catch {
    /* probe below */
  }
  try {
    await vkCall('messages.getConversations', { count: 0 }, accessToken);
  } catch {
    throw new Error(
      'В токене нет права «Сообщения». Kate Mobile часто блокирует VK. Для автопоздравлений выберите «Только стена» или вставьте другой messages-токен вручную.',
    );
  }
}

export async function vkInviteToGroup(accessToken, groupId, userId) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('groups.invite', { group_id: Math.abs(groupId), user_id: userId }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'groups.invite failed' };
  }
}

export async function vkIsGroupMember(accessToken, groupId, userId) {
  if (isMock(accessToken)) return { member: true };
  try {
    const res = await vkCall('groups.isMember', {
      group_id: Math.abs(groupId),
      user_id: userId,
    }, accessToken);
    return { member: res === 1 };
  } catch {
    return { member: false };
  }
}

export async function vkDeleteFriend(accessToken, userId) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('friends.delete', { user_id: userId }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'friends.delete failed' };
  }
}

/** Blacklisting is the only way VK lets you drop a follower. */
export async function vkBanUser(accessToken, userId) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('account.ban', { owner_id: userId }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'account.ban failed' };
  }
}

export async function vkRemoveGroupMember(accessToken, groupId, userId) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('groups.removeUser', { group_id: Math.abs(groupId), user_id: userId }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'groups.removeUser failed' };
  }
}

export async function vkAddFriend(accessToken, userId, text) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('friends.add', { user_id: userId, text: text || undefined }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'friends.add failed' };
  }
}

export async function vkGetIncomingFriendRequests(accessToken, count = 20) {
  if (isMock(accessToken)) return [{ id: 50002, firstName: 'Заявка', lastName: 'В друзья' }];
  try {
    const res = await vkCall('friends.getRequests', { count, need_viewed: 1 }, accessToken);
    return (res.items ?? []).map(mapUser);
  } catch {
    return [];
  }
}

/** Accept up to `limit` incoming friend requests (auto-приём заявок). */
export async function vkAcceptIncomingFriends(accessToken, limit = 3) {
  const reqs = await vkGetIncomingFriendRequests(accessToken, limit + 5);
  let ok = 0;
  for (const u of reqs.slice(0, limit)) {
    const r = await vkAddFriend(accessToken, u.id);
    if (r.ok) ok += 1;
  }
  return ok;
}

export async function vkFetchWallPosts(accessToken, ownerId, count = 10) {
  if (isMock(accessToken)) {
    return [{
      ownerId, postId: 42, text: 'Mock grabber post', date: Math.floor(Date.now() / 1000) - 3600,
      url: `https://vk.com/wall${ownerId}_42`, hasPhoto: true, attachments: ['photo100_200'], likes: 3,
    }];
  }
  const res = await vkCall('wall.get', { owner_id: ownerId, count, filter: 'owner' }, accessToken);
  return (res.items ?? []).filter((i) => !i.is_pinned).map((i) => {
    const photos = (i.attachments ?? [])
      .filter((a) => a.type === 'photo' && a.photo)
      .map((a) => `photo${a.photo.owner_id}_${a.photo.id}`);
    return {
      ownerId: i.owner_id,
      postId: i.id,
      text: (i.text || '').trim(),
      date: i.date,
      url: `https://vk.com/wall${i.owner_id}_${i.id}`,
      hasPhoto: photos.length > 0,
      attachments: photos.slice(0, 10),
      likes: i.likes?.count,
    };
  });
}

export async function vkGetGroupMembers(accessToken, groupId, opts = {}) {
  if (isMock(accessToken)) {
    return [
      { id: 20001, firstName: 'Анна', lastName: 'Лидова', sex: 1, cityTitle: 'Екатеринбург' },
      { id: 20002, firstName: 'Пётр', lastName: 'Сегментов', sex: 2, cityTitle: 'Москва' },
    ];
  }
  const want = Math.min(Math.max(Number(opts.count || 100), 1), 1000);
  const gid = Math.abs(Number(groupId));
  const out = [];
  let offset = 0;
  while (out.length < want) {
    const chunk = Math.min(1000, want - out.length);
    const res = await vkCall('groups.getMembers', {
      group_id: gid,
      count: chunk,
      offset,
      fields: opts.fields || 'sex,city,bdate,photo_100,last_seen',
    }, accessToken);
    const items = (res.items ?? []).map(mapUser);
    out.push(...items);
    offset += items.length;
    if (!items.length || offset >= (res.count || 0)) break;
  }
  return out;
}

export async function vkListManagedGroups(accessToken) {
  if (isMock(accessToken)) return [{ id: 111, name: 'Demo Group', screenName: 'demo' }];
  const out = [];
  let offset = 0;
  const count = 1000;
  for (;;) {
    const res = await vkCall('groups.get', {
      extended: 1, filter: 'admin,editor,moder', count, offset, fields: 'screen_name',
    }, accessToken);
    const items = res.items ?? [];
    const total = res.count ?? items.length;
    for (const g of items) {
      out.push({ id: g.id, name: g.name || String(g.id), screenName: g.screen_name });
    }
    offset += items.length;
    if (!items.length || offset >= total) break;
  }
  return out;
}

export async function vkGetGroupJoinRequests(accessToken, groupId, count = 50) {
  if (isMock(accessToken)) return [{ id: 30001, firstName: 'Новый', lastName: 'Участник' }];
  const res = await vkCall('groups.getRequests', {
    group_id: Math.abs(groupId), count, fields: 'photo_100',
  }, accessToken);
  return (res.items ?? []).map((u) => ({
    id: u.id, firstName: u.first_name || '', lastName: u.last_name || '', photo: u.photo_100,
  }));
}

export async function vkApproveJoinRequest(accessToken, groupId, userId) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('groups.approveRequest', { group_id: Math.abs(groupId), user_id: userId }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'approve failed' };
  }
}

export async function vkDenyJoinRequest(accessToken, groupId, userId) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('groups.removeUser', { group_id: Math.abs(groupId), user_id: userId }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'deny failed' };
  }
}

/** Ban member in community (blacklist). */
export async function vkBanGroupMember(accessToken, groupId, userId, reason = 1) {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('groups.ban', {
      group_id: Math.abs(groupId),
      user_id: userId,
      reason,
      comment: 'OnLead blacklist',
    }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'groups.ban failed' };
  }
}

/** 0 = open, 1 = closed (requests), 2 = private. */
export async function vkSetGroupAccess(accessToken, groupId, access) {
  if (isMock(accessToken)) return { ok: true, access };
  try {
    await vkCall('groups.edit', { group_id: Math.abs(groupId), access: Number(access) }, accessToken);
    return { ok: true, access: Number(access) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'groups.edit failed' };
  }
}

const EDITOR_ROLES = {
  moderator: 'moderator',
  editor: 'editor',
  administrator: 'administrator',
  модератор: 'moderator',
  редактор: 'editor',
  администратор: 'administrator',
  админ: 'administrator',
};

export function parseEditorLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return null;
  const parts = raw.split(/\s*[—–-]\s*/);
  const link = parts[0].trim();
  const roleRaw = (parts[1] || 'редактор').trim().toLowerCase();
  const idMatch = link.match(/(?:id|club|public)?(\d+)/i);
  const userId = idMatch ? Number(idMatch[1]) : Number(link);
  if (!userId) return null;
  const role = EDITOR_ROLES[roleRaw] || 'editor';
  return { userId, role };
}

export async function vkEditGroupManager(accessToken, groupId, userId, role = 'editor') {
  if (isMock(accessToken)) return { ok: true };
  try {
    await vkCall('groups.editManager', {
      group_id: Math.abs(groupId),
      user_id: userId,
      role: EDITOR_ROLES[String(role).toLowerCase()] || role,
    }, accessToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'groups.editManager failed' };
  }
}

export async function vkUsersSearch(accessToken, opts = {}) {
  if (isMock(accessToken)) {
    return [
      { id: 40001, firstName: 'Ольга', lastName: 'Поиск', cityTitle: opts.q || 'Москва' },
      { id: 40002, firstName: 'Дмитрий', lastName: 'Выборка', cityTitle: 'Казань' },
    ];
  }
  const res = await vkCall('users.search', {
    q: opts.q,
    city: opts.city,
    age_from: opts.ageFrom,
    age_to: opts.ageTo,
    sex: opts.sex,
    count: opts.count ?? 50,
    fields: 'photo_100,city,bdate,last_seen,sex',
  }, accessToken);
  return (res.items ?? []).map(mapUser);
}

export async function vkConversations(accessToken, count = 20) {
  if (isMock(accessToken)) {
    return [{ peerId: 10001, title: 'Иван Тестов', last: 'Привет!', unread: 1 }];
  }
  const res = await vkCall('messages.getConversations', { count, extended: 1, filter: 'all' }, accessToken);
  const profiles = new Map((res.profiles ?? []).map((p) => [p.id, p]));
  return (res.items ?? []).map((it) => {
    const peer = it.conversation?.peer || {};
    const p = profiles.get(peer.id);
    return {
      peerId: peer.id,
      title: p ? `${p.first_name} ${p.last_name}` : (it.conversation?.chat_settings?.title || `id${peer.id}`),
      last: it.last_message?.text || '',
      unread: it.conversation?.unread_count || 0,
    };
  });
}

export function renderCongratsTemplate(template, user) {
  return template
    .replaceAll('{name}', user.firstName || 'друг')
    .replaceAll('{first_name}', user.firstName || 'друг')
    .replaceAll('{last_name}', user.lastName || '')
    .replaceAll('{full_name}', `${user.firstName} ${user.lastName}`.trim());
}

export function vkGrowthErrorHint(message, code) {
  const m = String(message || '').toLowerCase();
  const c = String(code || '');
  if (m.includes('flood') || m.includes('too many') || c === 'VK_9') {
    return 'Лимит VK — уменьшите дневной лимит и паузы.';
  }
  if (c === 'VK_901' || c === 'VK_902' || c === 'VK_900') {
    return 'Пользователь ограничил личные сообщения — попробуем стену или пропустим.';
  }
  if (
    c === 'VK_7' || c === 'VK_15'
    || m.includes('access denied')
    || m.includes('no access to call')
    || m.includes('permission to perform')
  ) {
    return 'Нет права messages.send. Kate Mobile сейчас часто блокирует VK — в Автопоздравлениях выберите «Только стена» (базовый токен).';
  }
  if (m.includes('wall.post') || m.includes('wall post')) {
    return 'Не удалось опубликовать на стене — друг мог закрыть записи от других.';
  }
  return message;
}
