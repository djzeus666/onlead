import test from 'node:test';
import assert from 'node:assert/strict';
import { audienceKind, filterByActivity, peopleFromLists, audienceProgress, inviteAudiencePayload } from './audience.mjs';

test('every audience wording in the cabinet maps to a source', () => {
  assert.equal(audienceKind('Друзья'), 'friends');
  assert.equal(audienceKind('Подписчики'), 'followers');
  assert.equal(audienceKind('Участники группы'), 'group');
  assert.equal(audienceKind('Подписчики группы'), 'group');
  assert.equal(audienceKind('Парсинг группы'), 'group');
  assert.equal(audienceKind('Свой список'), 'list');
  assert.equal(audienceKind('Новый список'), 'list');
  assert.equal(audienceKind('Друзья друзей'), 'fof');
  assert.equal(audienceKind(''), 'friends');
  assert.equal(audienceKind('что-то незнакомое'), 'friends');
});

test('group wins over followers when both words appear', () => {
  assert.notEqual(audienceKind('Подписчики группы'), 'followers');
  assert.notEqual(audienceKind('Друзья друзей'), 'friends');
});

test('activity filter keeps profiles that hide their last visit', () => {
  const now = Date.UTC(2026, 0, 31);
  const day = 86400000;
  const people = [
    { id: 1, lastSeen: (now - 2 * day) / 1000 },
    { id: 2, lastSeen: (now - 20 * day) / 1000 },
    { id: 3 },
  ];
  assert.deepEqual(filterByActivity(people, 7, now).map((p) => p.id), [1, 3]);
  assert.deepEqual(filterByActivity(people, 30, now).map((p) => p.id), [1, 2, 3]);
  assert.deepEqual(filterByActivity(people, 0, now).map((p) => p.id), [1, 2, 3]);
});

test('a saved list becomes an audience, empty lists are skipped', () => {
  const lists = [
    { id: 'l1', name: 'Пустой', items: [] },
    { id: 'l2', name: 'Тёплые', items: [{ id: 5, firstName: 'Аня' }, { id: 6 }] },
  ];
  const picked = peopleFromLists(lists);
  assert.equal(picked.listName, 'Тёплые');
  assert.deepEqual(picked.people.map((p) => p.id), [5, 6]);
  const byId = peopleFromLists(lists, 'l2');
  assert.equal(byId.people.length, 2);
  assert.deepEqual(peopleFromLists([], null).people, []);
});

test('list rows without a numeric id are dropped', () => {
  const { people } = peopleFromLists([{ id: 'l', name: 'x', items: [{ id: 'abc' }, { id: 7 }] }]);
  assert.deepEqual(people.map((p) => p.id), [7]);
});

test('audience cursor resets on a new MSK day', () => {
  const p = audienceProgress({ ok: 5, audienceDay: '2026-01-30' });
  assert.equal(p.index, 0);
  assert.equal(p.reset, true);
  const same = audienceProgress({ ok: 5, audienceDay: p.dayKey });
  assert.equal(same.index, 5);
  assert.equal(same.reset, false);
});

test('invite payload keeps destination group separate from source', () => {
  const payload = inviteAudiencePayload({
    group: 'https://vk.com/club999',
    sourceGroup: 'https://vk.com/public111',
    listId: 'l1',
  });
  assert.equal(payload.groups, 'https://vk.com/public111');
  assert.equal(payload.listId, 'l1');
  assert.equal(payload.group, undefined);
});
