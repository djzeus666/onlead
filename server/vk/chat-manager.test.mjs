import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeSpam, parseChatPeerIds, renderGroupWelcome } from './chat-manager.mjs';

test('chat links resolve to peer ids', () => {
  const ids = parseChatPeerIds('https://vk.com/im?sel=c123\nhttps://vk.com/write-456');
  assert.equal(ids.includes(2000000123), true);
  assert.equal(ids.includes(-456), true);
});

test('moderation modes catch links and spam words', () => {
  assert.equal(looksLikeSpam('смотри https://spam.ru', 'Ссылки'), true);
  assert.equal(looksLikeSpam('обычный вопрос по доставке', 'Ссылки'), false);
  assert.equal(looksLikeSpam('пассивный доход без вложений', 'Спам-слова'), true);
  assert.equal(looksLikeSpam('пассивный доход без вложений', 'Выкл'), false);
});

test('group welcome template substitutes name', () => {
  assert.match(renderGroupWelcome('{name}, добро пожаловать!', { firstName: 'Аня' }), /Аня/);
});
