/**
 * Turns the audience dropdowns of the cabinet into an actual list of people.
 *
 * Four tools ask the same question in four wordings — «Где чистить», «Кого»,
 * «Список получателей», «Аудитория» — so the mapping lives here once instead of
 * being re-guessed (and previously ignored) in every branch of the job runner.
 */
import { mskParts } from '../schedule.mjs';
import { vkGetFriends, vkGetFollowers, vkGetGroupMembers } from './growth.mjs';
import { vkResolveOwnerId } from './neurocomment.mjs';

/**
 * Order matters: «Подписчики группы» is a group, not followers, and «Друзья
 * друзей» is not «Друзья».
 */
export function audienceKind(choice) {
  const s = String(choice || '').trim().toLowerCase();
  if (!s) return 'friends';
  if (/друз[ье]й\s+друз|друзья\s+друзей/.test(s)) return 'fof';
  if (/(подписчик|участник|парсинг|члены).{0,12}(групп|сообществ)|^групп|сообществ/.test(s)) return 'group';
  if (/список/.test(s)) return 'list';
  if (/подписчик/.test(s)) return 'followers';
  if (/друз/.test(s)) return 'friends';
  return 'friends';
}

export const AUDIENCE_LABELS = {
  friends: 'друзья',
  followers: 'подписчики',
  group: 'участники сообщества',
  list: 'свой список',
  fof: 'друзья друзей',
};

/**
 * «Активность» filter of the parsers. VK has no "last seen within N days"
 * search parameter, so it is applied to the returned profiles. Users whose
 * last visit is hidden are kept — dropping them would silently halve results.
 */
export function filterByActivity(people, days, now = Date.now()) {
  const n = Number(days || 0);
  if (!n) return people || [];
  const edge = now - n * 86400000;
  return (people || []).filter((p) => {
    const seen = Number(p.lastSeen || 0);
    if (!seen) return true;
    return seen * 1000 >= edge;
  });
}

/** People saved in a cabinet list, newest list first unless one is pinned. */
export function peopleFromLists(lists, listId) {
  const owned = (lists || []).filter((l) => Array.isArray(l.items) && l.items.length);
  const picked = (listId && owned.find((l) => l.id === listId)) || owned[0];
  if (!picked) return { people: [], listName: '' };
  const people = picked.items
    .map((it) => (typeof it === 'object' ? it : { id: Number(it) }))
    .filter((it) => Number(it.id))
    .map((it) => ({
      id: Number(it.id),
      firstName: it.firstName || it.first_name || '',
      lastName: it.lastName || it.last_name || '',
      photo: it.photo,
      lastSeen: it.lastSeen,
      deactivated: it.deactivated,
      cityTitle: it.cityTitle,
      bdate: it.bdate,
    }));
  return { people, listName: picked.name || '' };
}

async function friendsOfFriends(token, count) {
  const seeds = await vkGetFriends(token, { count: 10 });
  const own = new Set(seeds.map((f) => f.id));
  const out = [];
  const seen = new Set();
  for (const seed of seeds.slice(0, 5)) {
    let batch = [];
    try { batch = await vkGetFriends(token, { userId: seed.id, count: 100 }); }
    catch { continue; }
    for (const p of batch) {
      if (own.has(p.id) || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= count) return out;
    }
  }
  return out;
}

/** Daily cursor for invite/lead/broom — resets at midnight MSK. */
export function audienceProgress(stats = {}, now = new Date()) {
  const { dayKey } = mskParts(now);
  const sameDay = stats?.audienceDay === dayKey;
  return {
    dayKey,
    index: sameDay ? Number(stats.ok || 0) : 0,
    reset: Boolean(stats?.audienceDay && !sameDay),
  };
}

/** Invite «Парсинг группы» must not reuse destination group field. */
export function inviteAudiencePayload(payload = {}) {
  const src = String(payload.sourceGroup || payload.groups || payload.sources || '').trim();
  return {
    listId: payload.listId,
    groups: src,
    sources: src,
  };
}

/**
 * @returns {{ people: array, label: string, error?: string }} — `error` means the
 * user has to fix something in the campaign form, so the caller should surface it.
 */
export async function resolveAudience({ token, choice, payload = {}, lists = [], count = 200 } = {}) {
  const kind = audienceKind(choice);
  const label = AUDIENCE_LABELS[kind];

  if (kind === 'list') {
    const rawIds = Array.isArray(payload.userIds) ? payload.userIds : [];
    if (rawIds.length) {
      const people = rawIds
        .map((raw) => {
          const id = Number(String(raw).replace(/\D/g, ''));
          return id ? { id, firstName: '', lastName: '' } : null;
        })
        .filter(Boolean);
      if (people.length) {
        return { people: people.slice(0, count), label: 'свой список ID' };
      }
    }
    const { people, listName } = peopleFromLists(lists, payload.listId);
    if (!people.length) {
      return { people: [], label, error: 'Список пуст — соберите людей парсером или загрузите список' };
    }
    return { people: people.slice(0, count), label: listName ? `список «${listName}»` : label };
  }

  if (kind === 'group') {
    const raw = String(payload.groups || payload.group || payload.sources || '').trim()
      || (/(vk\.com|club|public)/i.test(String(choice)) ? String(choice) : '');
    if (!raw) return { people: [], label, error: 'Укажите сообщество — ссылку на группу в настройках' };
    const first = raw.split(/[\s,]+/).filter(Boolean)[0];
    const owner = await vkResolveOwnerId(token, first);
    if (!owner?.id) return { people: [], label, error: `Не нашёл сообщество ${first}` };
    const people = await vkGetGroupMembers(token, owner.id, { count });
    return { people, label };
  }

  if (kind === 'followers') {
    return { people: await vkGetFollowers(token, { count }), label };
  }

  if (kind === 'fof') {
    const people = await friendsOfFriends(token, count);
    if (!people.length) return { people: [], label, error: 'Не удалось собрать друзей друзей — профили закрыты' };
    return { people, label };
  }

  return { people: await vkGetFriends(token, { count }), label };
}
