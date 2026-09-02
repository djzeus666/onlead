import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTariffDays, recordChannelAccess } from './tg-channel.mjs';
import { aiCreditsBalance, spendAiCredits, IMAGE_AI_DEFAULT_CREDITS } from './ai-credits.mjs';

test('parseTariffDays reads days from button label', () => {
  assert.equal(parseTariffDays('90 дней'), 90);
  assert.equal(parseTariffDays('тариф'), 30);
});

test('recordChannelAccess stores active row', () => {
  const d = { tgChannelAccess: [] };
  const row = recordChannelAccess(d, {
    userId: 'u1',
    botId: 'b1',
    chatId: '-100',
    tgUserId: '42',
    until: Date.now() + 86400000,
    tariffDays: 30,
  });
  assert.ok(row?.id);
  assert.equal(d.tgChannelAccess.length, 1);
});

test('spendAiCredits decrements balance', () => {
  const d = { users: [{ id: 'u1', aiCredits: 5 }] };
  const r = spendAiCredits(d, 'u1', 2);
  assert.equal(r.ok, true);
  assert.equal(r.left, 3);
  assert.equal(aiCreditsBalance(d.users[0]), 3);
});

test('default credits when field missing', () => {
  assert.equal(aiCreditsBalance({ id: 'u1' }), IMAGE_AI_DEFAULT_CREDITS);
});
