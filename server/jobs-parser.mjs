/** Audience / group parser jobs. */
import { load, mutate } from './db.mjs';
import { vkGetGroupMembers, vkUsersSearch } from './vk/growth.mjs';
import { filterByActivity } from './vk/audience.mjs';
import { vkResolveOwnerId } from './vk/neurocomment.mjs';
import { vkScanGroupForPhrases } from './vk/leadgen.mjs';
import { accountToken } from './jobs-shared.mjs';

function parseAgeRange(raw) {
  const m = String(raw || '').match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (!m) return {};
  return { ageFrom: Number(m[1]), ageTo: Number(m[2]) };
}

/** Kept fields feed the audience picker later: broom needs lastSeen, congrats bdate. */
function compactPerson(u) {
  return {
    id: u.id,
    firstName: u.firstName || u.first_name || '',
    lastName: u.lastName || u.last_name || '',
    cityTitle: u.cityTitle || u.city || '',
    sex: u.sex,
    photo: u.photo,
    bdate: u.bdate,
    lastSeen: u.lastSeen,
    deactivated: u.deactivated,
    url: `https://vk.com/id${u.id}`,
  };
}

export async function runParser(userId, kind, payload) {
  const db = load();
  const account = db.accounts.find((a) => a.userId === userId && a.id === (payload.accountId || db.accounts.find((x) => x.userId === userId)?.id));
  const acc = account || db.accounts.find((a) => a.userId === userId);
  if (!acc) throw new Error('Сначала подключите VK-аккаунт');
  const token = accountToken(db, acc);
  const count = Math.min(Math.max(Number(payload.count || 100), 10), 1000);
  const sex = Number(payload.sex || 0);
  const activityDays = Number(payload.act || 0);
  // Activity is filtered after the fact, so ask VK for extra rows to compensate.
  const fetchCount = activityDays ? Math.min(count * 2, 1000) : count;

  if (kind === 'groups') {
    const owner = await vkResolveOwnerId(token, payload.src || payload.groups || '');
    if (!owner) throw new Error('Не удалось разобрать ссылку на группу');
    let people = await vkGetGroupMembers(token, owner.id, { count: fetchCount });
    const city = String(payload.city || payload.geo || '').trim().toLowerCase();
    if (sex === 1 || sex === 2) people = people.filter((p) => Number(p.sex) === sex);
    if (city) people = people.filter((p) => String(p.cityTitle || '').toLowerCase().includes(city));
    people = filterByActivity(people, activityDays).slice(0, count);
    const items = people.map(compactPerson);
    const list = {
      id: 'l' + Date.now(), userId,
      name: `Группа ${owner.screenName || owner.name || owner.id}`,
      count: items.length, source: 'Парсинг групп',
      created: new Date().toLocaleDateString('ru-RU'), items,
    };
    mutate((d) => { d.lists.unshift(list); });
    return list;
  }
  if (kind === 'scan') {
    const owner = await vkResolveOwnerId(token, payload.src || '');
    const phrases = String(payload.phrases || payload.int || '').split(',').map((s) => ({ phrase: s.trim() })).filter((p) => p.phrase);
    const scan = await vkScanGroupForPhrases(token, String(Math.abs(owner?.id || 0)), phrases);
    mutate((d) => {
      for (const h of scan.hits.slice(0, 50)) {
        d.leads.unshift({
          id: 'c' + Date.now() + Math.random().toString(16).slice(2),
          userId, name: h.authorName || h.authorId, source: 'Парсинг', score: 6,
          stage: 'new', city: '—', note: h.text?.slice(0, 120), vkId: h.authorId,
        });
      }
    });
    return scan;
  }
  const age = parseAgeRange(payload.age);
  const found = await vkUsersSearch(token, {
    q: [payload.int || payload.q, payload.geo].filter(Boolean).join(' '),
    city: payload.cityId,
    ageFrom: age.ageFrom,
    ageTo: age.ageTo,
    sex: sex || undefined,
    count: fetchCount,
  });
  const people = filterByActivity(found, activityDays).slice(0, count);
  const items = people.map(compactPerson);
  const list = {
    id: 'l' + Date.now(), userId,
    name: payload.geo ? `${payload.geo} · аккаунты` : (payload.int ? `${payload.int} · аккаунты` : 'Парсинг аккаунтов'),
    count: items.length, source: 'Парсинг аккаунтов',
    created: new Date().toLocaleDateString('ru-RU'), items,
  };
  mutate((d) => { d.lists.unshift(list); });
  return list;
}
