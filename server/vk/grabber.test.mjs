import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPostsByKeywords, parseKeywords, postMatchesKeywords, stripSourceLinks, replaceGrabberLinks } from './grabber.mjs';

test('keywords are split on commas and newlines, noise dropped', () => {
  assert.deepEqual(parseKeywords('ремонт, авто\nшиномонтаж;'), ['ремонт', 'авто', 'шиномонтаж']);
  assert.deepEqual(parseKeywords('a, ремонт'), ['ремонт']);
  assert.deepEqual(parseKeywords(''), []);
});

test('without keywords every post passes, with them only matches', () => {
  const post = { text: 'Поменяли стойки на Ларгусе' };
  assert.equal(postMatchesKeywords(post, []), true);
  assert.equal(postMatchesKeywords(post, ['стойки']), true);
  assert.equal(postMatchesKeywords(post, ['пицца']), false);
  assert.equal(postMatchesKeywords({ text: '' }, ['стойки']), false);
});

test('duplicate reposts are collapsed', () => {
  const posts = [
    { text: 'Одинаковый пост про ремонт' },
    { text: 'Одинаковый пост про ремонт' },
    { text: 'Другой пост про ремонт' },
  ];
  assert.equal(filterPostsByKeywords(posts, ['ремонт']).length, 2);
});

test('links, mentions and hashtags are stripped before reposting', () => {
  const raw = 'Скидка тут https://vk.com/club1 подробнее у [club42|нас] #акция @promo_bot';
  const out = stripSourceLinks(raw);
  assert.equal(/https?:/.test(out), false);
  assert.equal(out.includes('#акция'), false);
  assert.equal(out.includes('@promo_bot'), false);
  assert.equal(out.includes('нас'), true);
  assert.equal(out.includes('Скидка тут'), true);
});

test('stripping keeps paragraphs but collapses the gaps it leaves', () => {
  const out = stripSourceLinks('Первый абзац\n\n\n\nВторой абзац');
  assert.equal(out, 'Первый абзац\n\nВторой абзац');
});

test('replaceGrabberLinks swaps source URLs or appends own link', () => {
  const raw = 'Скидка тут https://vk.com/club1 подробнее';
  assert.equal(replaceGrabberLinks(raw, 'https://shop.example'), 'Скидка тут https://shop.example подробнее');
  assert.equal(replaceGrabberLinks('Текст без ссылки', 'https://shop.example'), 'Текст без ссылки\n\nhttps://shop.example');
  assert.equal(replaceGrabberLinks(raw, ''), stripSourceLinks(raw));
});

test('parseEditorLine extracts user id and role', async () => {
  const { parseEditorLine } = await import('./growth.mjs');
  assert.deepEqual(parseEditorLine('https://vk.com/id123 — редактор'), { userId: 123, role: 'editor' });
  assert.deepEqual(parseEditorLine('456 — модератор'), { userId: 456, role: 'moderator' });
  assert.equal(parseEditorLine(''), null);
});
