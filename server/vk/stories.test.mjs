import test from 'node:test';
import assert from 'node:assert/strict';
import { vkPublishStory, vkStoryStats, parseStoryPoll } from './stories.mjs';

test('parseStoryPoll reads question and answers', () => {
  const p = parseStoryPoll('Какой цвет?\nКрасный\nСиний\nЗелёный');
  assert.equal(p.question, 'Какой цвет?');
  assert.deepEqual(p.answers, ['Красный', 'Синий', 'Зелёный']);
  assert.equal(parseStoryPoll('одна строка'), null);
});

test('mock token publishes story without network', async () => {
  const r = await vkPublishStory('mock:vk', { ownerId: 10001, caption: 'Тест' });
  assert.equal(r.ok, true);
  assert.equal(r.via, 'stories');
  assert.ok(r.storyId);
});

test('mock story stats return views and clicks', async () => {
  const st = await vkStoryStats('mock:vk', 10001, 42);
  assert.ok(st.views > 0);
  assert.ok(st.clicks >= 0);
});
