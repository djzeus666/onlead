import test from 'node:test';
import assert from 'node:assert/strict';
import { broomCandidates, broomReason, broomRuleKind } from './broom.mjs';

const NOW = Date.UTC(2026, 0, 31);
const daysAgo = (n) => (NOW - n * 86400000) / 1000;

const live = { id: 1, firstName: 'Анна', lastName: 'Живая', photo: 'https://vk.com/a.jpg', lastSeen: daysAgo(2) };
const banned = { id: 2, firstName: 'Пётр', lastName: 'Удалён', deactivated: 'deleted', photo: '' };
const noPhoto = { id: 3, firstName: 'Иван', lastName: 'Безфото', photo: '', lastSeen: daysAgo(3) };
const stale = { id: 4, firstName: 'Ольга', lastName: 'Давняя', photo: 'https://vk.com/o.jpg', lastSeen: daysAgo(500) };

test('each rule of the dropdown selects its own people', () => {
  assert.equal(broomRuleKind('Боты'), 'bots');
  assert.equal(broomRuleKind('Нет фото'), 'nophoto');
  assert.equal(broomRuleKind('Не заходили 365 дней'), 'stale');
  assert.equal(broomRuleKind('Все эвристики'), 'all');
  assert.equal(broomRuleKind(''), 'all');
});

test('an active profile is never a candidate', () => {
  for (const rule of ['Боты', 'Нет фото', 'Не заходили 365 дней', 'Все эвристики']) {
    assert.deepEqual(broomCandidates([live], rule, NOW), [], rule);
  }
});

test('"нет фото" does not sweep away a year-old but real account', () => {
  assert.deepEqual(broomCandidates([stale], 'Нет фото', NOW), []);
  assert.equal(broomCandidates([stale], 'Не заходили 365 дней', NOW).length, 1);
});

test('"боты" catches deleted pages, not merely photoless ones', () => {
  assert.equal(broomCandidates([banned], 'Боты', NOW).length, 1);
  assert.deepEqual(broomCandidates([noPhoto], 'Боты', NOW), []);
});

test('"все эвристики" collects every kind and explains each', () => {
  const out = broomCandidates([live, banned, noPhoto, stale], 'Все эвристики', NOW);
  assert.deepEqual(out.map((p) => p.id), [2, 3, 4]);
  assert.equal(out[0].reason, 'страница удалена или заблокирована');
  assert.equal(out[1].reason, 'нет аватара');
  assert.equal(out[2].reason, 'не заходил(а) больше года');
});

test('VK placeholder avatars count as no avatar', () => {
  const placeholder = { id: 9, firstName: 'Без', lastName: 'Аватара', photo: 'https://vk.com/images/camera_100.png', lastSeen: daysAgo(1) };
  assert.equal(broomReason(placeholder, 'nophoto', NOW), 'нет аватара');
});

test('a nameless profile is treated as a bot', () => {
  assert.equal(broomReason({ id: 10, firstName: '', lastName: '' }, 'bots', NOW), 'похоже на бота');
});

test('a transliterated name is not evidence of a bot', () => {
  const latin = { id: 11, firstName: 'Aigiz', lastName: 'Khabibullin', photo: 'https://vk.com/k.jpg', lastSeen: daysAgo(1) };
  assert.equal(broomReason(latin, 'bots', NOW), '');
  assert.equal(broomReason(latin, 'all', NOW), '');
});

test('digits inside a name still read as a bot', () => {
  const spam = { id: 12, firstName: 'Иван', lastName: 'Петров123', photo: 'https://vk.com/p.jpg', lastSeen: daysAgo(1) };
  assert.equal(broomReason(spam, 'bots', NOW), 'похоже на бота');
});
