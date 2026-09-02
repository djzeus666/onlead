import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fetchPeerHistory,
  getAiDialogs,
  historyTranscript,
  latestInbound,
  trimAiDialogs,
} from './ai-lead.mjs';

test('latestInbound finds newest user message after lastSeenMessageId', () => {
  const hist = [
    { id: 1, out: 1, text: 'Hi' },
    { id: 2, out: 0, text: 'Old reply' },
    { id: 3, out: 0, text: 'New reply' },
  ];
  assert.equal(latestInbound(hist, 1)?.id, 3);
  assert.equal(latestInbound(hist, 2)?.id, 3);
  assert.equal(latestInbound(hist, 3), null);
});

test('historyTranscript maps out flag to roles', () => {
  const rows = historyTranscript([
    { out: 1, text: 'Мы пишем' },
    { out: 0, text: 'Они ответили' },
  ]);
  assert.deepEqual(rows, [
    { role: 'assistant', text: 'Мы пишем' },
    { role: 'user', text: 'Они ответили' },
  ]);
});

test('trimAiDialogs keeps newest dialogs', () => {
  const dialogs = {};
  for (let i = 0; i < 90; i += 1) {
    dialogs[String(i)] = { lastOutboundAt: i };
  }
  const trimmed = trimAiDialogs(dialogs);
  assert.equal(Object.keys(trimmed).length, 80);
  assert.ok(trimmed['89']);
  assert.equal(trimmed['0'], undefined);
});

test('fetchPeerHistory mock returns inbound for dialog step', async () => {
  const hist = await fetchPeerHistory('mock:vk', 123);
  assert.ok(hist.some((m) => !m.out));
});

test('getAiDialogs clones stats map', () => {
  const src = { aiDialogs: { '1': { vkId: 1 } } };
  const copy = getAiDialogs(src);
  copy['2'] = { vkId: 2 };
  assert.equal(Object.keys(src.aiDialogs).length, 1);
});
