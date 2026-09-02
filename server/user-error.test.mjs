import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicCabinetError, cabinetTaskMessage, isAdminDiagnosticMessage } from './user-error.mjs';

test('VK API codes become Russian cabinet copy', () => {
  assert.match(publicCabinetError({ code: 'VK_5', message: 'User authorization failed: invalid access_token' }), /токен/i);
  assert.match(publicCabinetError({ code: 'VK_NETWORK', message: 'VK API недоступен (certificate)' }), /временно/);
  assert.equal(publicCabinetError({ code: 'VK_15', message: 'Access denied' }).includes('Access'), false);
});

test('our Russian messages stay, SQL and stacks do not', () => {
  assert.equal(publicCabinetError(new Error('Нет свободных слотов')), 'Нет свободных слотов');
  const hid = publicCabinetError(new Error('SQLITE_ERROR: UNIQUE constraint failed: users.email'));
  assert.equal(hid.includes('SQLITE'), false);
  assert.equal(hid.includes('users.email'), false);
});

test('task diagnostics go to admin, not cabinet', () => {
  const raw = 'Для ЛС нужен токен с правом «Сообщения». Kate Mobile сейчас блокирует VK — выберите «Только стена»';
  assert.equal(isAdminDiagnosticMessage(raw), true);
  assert.equal(cabinetTaskMessage(raw, { ok: false }).includes('Kate'), false);
  assert.equal(cabinetTaskMessage(raw, { ok: false }).includes('токен'), false);
  assert.match(cabinetTaskMessage('Стена → Алексей', { ok: true }), /Алексей/);
});
