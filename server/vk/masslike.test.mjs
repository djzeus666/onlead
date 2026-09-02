import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  itemKey,
  parseMasslikeMode,
  parseMasslikeWindow,
  masslikeInWindow,
  masslikePace,
  masslikeSkipWords,
  masslikeSkipText,
  pickMasslikeItem,
  runMasslikeStep,
} from './masslike.mjs';

test('parseMasslikeMode maps labels and values', () => {
  assert.equal(parseMasslikeMode('friends'), 'friends');
  assert.equal(parseMasslikeMode('Стены пользователей'), 'friends');
  assert.equal(parseMasslikeMode('Посты сообществ'), 'communities');
  assert.equal(parseMasslikeMode('communities'), 'communities');
  assert.equal(parseMasslikeMode('Фото'), 'photos');
  assert.equal(parseMasslikeMode('Комментарии к постам'), 'comments');
  assert.equal(parseMasslikeMode('comments'), 'comments');
  assert.equal(parseMasslikeMode('Свой список'), 'list');
});

test('window respects Moscow clock', () => {
  const w = parseMasslikeWindow('09:00–12:00');
  assert.equal(w.fromH, 9);
  assert.equal(w.toH, 12);
  assert.equal(masslikeInWindow(w, new Date('2026-08-28T10:00:00+03:00')), true);
  assert.equal(masslikeInWindow(w, new Date('2026-08-28T13:00:00+03:00')), false);
  assert.equal(masslikeInWindow(null, new Date('2026-08-28T03:00:00+03:00')), true);
  assert.equal(parseMasslikeWindow('Круглосуточно'), null);
});

test('pace skips daily and hourly caps and quiet gap', () => {
  const now = new Date('2026-08-28T10:00:00+03:00');
  const daily = masslikePace(
    { sentToday: 40, sentTodayDate: '2026-08-28' },
    { perDay: 40, perHour: 15, window: 'Круглосуточно' },
    now,
  );
  assert.equal(daily.skip, true);
  assert.match(daily.message, /Дневной лимит/);

  const hourly = masslikePace(
    { sentToday: 2, sentTodayDate: '2026-08-28', sentHour: 15, hourKey: '2026-08-28T10' },
    { perDay: 40, perHour: 15, window: 'Круглосуточно' },
    now,
  );
  assert.equal(hourly.skip, true);
  assert.match(hourly.message, /Часовой лимит/);

  const gap = masslikePace(
    { lastLikeAt: new Date(now.getTime() - 10_000).toISOString() },
    { perDay: 40, perHour: 15, window: 'Круглосуточно' },
    now,
  );
  assert.equal(gap.skip, true);
  assert.equal(gap.quiet, true);
});

test('pickMasslikeItem skips liked, seen and stop-words', () => {
  const words = masslikeSkipWords('вакансия, 25–40');
  assert.ok(words.includes('вакансия'));
  assert.ok(!words.includes('25–40'));
  const picked = pickMasslikeItem([
    { ownerId: 1, postId: 1, text: 'Нужна вакансия', liked: false },
    { ownerId: 2, postId: 2, text: 'Уже лайк', liked: true },
    { ownerId: 3, postId: 3, text: 'Ок', liked: false },
  ], ['post:3_3'], words);
  assert.equal(picked, null);
  const ok = pickMasslikeItem([
    { ownerId: 1, postId: 1, text: 'Нужна вакансия' },
    { ownerId: 4, postId: 4, text: 'Новый пост' },
  ], [], words);
  assert.equal(itemKey(ok), 'post:4_4');
  assert.equal(masslikeSkipText('Нужна вакансия завтра', words), true);
});

test('runMasslikeStep likes once and does not repeat', async () => {
  const liked = [];
  const posts = [
    { ownerId: 11, postId: 1, url: 'https://vk.com/wall11_1', text: 'A' },
    { ownerId: 12, postId: 2, url: 'https://vk.com/wall12_2', text: 'B' },
  ];
  const apis = {
    discoverFriends: async () => posts,
    like: async (_t, spec) => {
      liked.push(`${spec.ownerId}_${spec.itemId}`);
      return { ok: true };
    },
  };
  const now = new Date('2026-08-28T12:00:00+03:00');
  const first = await runMasslikeStep({
    payload: { target: 'friends', perHour: 20, perDay: 40, window: 'Круглосуточно' },
    stats: {},
    token: 'mock:vk',
    now,
    ...apis,
  });
  assert.equal(first.ok, true);
  assert.equal(first.skip, undefined);
  assert.equal(first.meta.likedItem.url, 'https://vk.com/wall11_1');
  assert.equal(first.meta.likedItem.text, 'A');
  assert.equal(first.meta.likedItem.type, 'post');
  assert.match(first.message, /wall11_1/);

  const second = await runMasslikeStep({
    payload: { target: 'friends', perHour: 20, perDay: 40, window: 'Круглосуточно' },
    stats: { likedKeys: [first.meta.likedKey], lastLikeAt: new Date(now.getTime() - 300_000).toISOString() },
    token: 'mock:vk',
    now,
    ...apis,
  });
  assert.equal(second.meta.likedKey, 'post:12_2');
  assert.deepEqual(liked, ['11_1', '12_2']);
});

test('runMasslikeStep asks for community links', async () => {
  const r = await runMasslikeStep({
    payload: { target: 'communities', perHour: 20, perDay: 40, window: 'Круглосуточно' },
    stats: {},
    token: 'mock:vk',
    now: new Date('2026-08-28T12:00:00+03:00'),
    resolveOwner: async () => null,
    discoverWall: async () => [],
    like: async () => ({ ok: true }),
  });
  assert.equal(r.skip, true);
  assert.match(r.message, /ссылк/i);
});

test('runMasslikeStep likes a comment and keeps reply url', async () => {
  const r = await runMasslikeStep({
    payload: { target: 'comments', perHour: 20, perDay: 40, window: 'Круглосуточно' },
    stats: {},
    token: 'mock:vk',
    now: new Date('2026-08-28T12:00:00+03:00'),
    discoverFriends: async () => [{ ownerId: 11, postId: 5, url: 'https://vk.com/wall11_5', text: 'Пост' }],
    discoverComments: async () => [{
      type: 'comment', ownerId: 11, postId: 5, itemId: 77,
      text: 'Согласен', url: 'https://vk.com/wall11_5?reply=77',
    }],
    like: async () => ({ ok: true }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.meta.likedKey, 'comment:11_77');
  assert.equal(r.meta.likedItem.type, 'comment');
  assert.equal(r.meta.likedItem.url, 'https://vk.com/wall11_5?reply=77');
});
