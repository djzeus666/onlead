import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyQuote,
  creditBalance,
  fulfillYookassaPayment,
  parseYookassaWebhook,
  payWithBalance,
  quoteCheckout,
  selectPendingForTick,
  shouldAbandonPending,
  transferRefBalance,
} from './billing.mjs';

function store() {
  return {
    users: [{
      id: 'u1',
      email: 'user@example.com',
      balance: 0,
      packageId: null,
      enabledTools: {},
      referral: { invited: 0, paying: 0, earned: 0, code: 'X' },
    }],
    payments: [],
    ops: [],
    settings: { referralPercent: 7 },
  };
}

test('quoteCheckout packages and telegram discount', () => {
  assert.equal(quoteCheckout({ packageId: 'business' }).amount, 390);
  const pack6 = quoteCheckout({ packageId: 'maxi', months: 6 });
  assert.equal(pack6.months, 6);
  assert.equal(pack6.amount, Math.round(649 * 6 * 0.9));
  const tg = quoteCheckout({ tgPlan: 'start', months: 12 });
  assert.equal(tg.kind, 'tg-plan');
  assert.equal(tg.amount, Math.round(490 * 12 * 0.9));
  const tgHint = quoteCheckout({ kind: 'tg-plan', tgPlan: 'start', months: 1, amount: 490 });
  assert.equal(tgHint.kind, 'tg-plan');
  assert.equal(tgHint.amount, 490);
  assert.throws(() => quoteCheckout({}), /Что покупаем/);
});

test('applyQuote is idempotent for the same paymentId', () => {
  const d = store();
  applyQuote(d, 'u1', { kind: 'package', packageId: 'maxi', amount: 649, title: 'Maxi' }, { paymentId: 'pay-1' });
  assert.equal(d.users[0].packageId, 'maxi');
  const again = applyQuote(d, 'u1', { kind: 'package', packageId: 'business', amount: 390, title: 'Biz' }, { paymentId: 'pay-1' });
  assert.equal(again.already, true);
  assert.equal(d.users[0].packageId, 'maxi');
});

test('webhook parser ignores noise and foreign apps', () => {
  assert.equal(parseYookassaWebhook({ event: 'refund.succeeded' }).ignored, true);
  assert.equal(parseYookassaWebhook({ event: 'payment.succeeded', object: {} }).ok, false);
  assert.equal(parseYookassaWebhook({
    event: 'payment.succeeded',
    object: { id: 'p1', metadata: { app: 'other' } },
  }).ignored, true);
  const canceled = parseYookassaWebhook({
    event: 'payment.canceled',
    object: { id: 'p1', metadata: { app: 'onlead', userId: 'u1' } },
  });
  assert.equal(canceled.canceled, true);
  assert.equal(canceled.paymentId, 'p1');
  const ok = parseYookassaWebhook({
    event: 'payment.succeeded',
    object: { id: 'p1', metadata: { app: 'onlead', userId: 'u1' } },
  });
  assert.equal(ok.paymentId, 'p1');
});

test('pending YooKassa object does not credit the cabinet', () => {
  const d = store();
  const r = fulfillYookassaPayment(d, {
    id: 'yk-1',
    status: 'pending',
    metadata: { app: 'onlead', userId: 'u1', kind: 'package', packageId: 'business', amount: '390' },
  }, 'u1');
  assert.equal(r.applied, false);
  assert.equal(d.users[0].packageId, null);
  assert.equal(d.users[0].balance, 0);
});

test('succeeded YooKassa payload credits once', () => {
  const d = store();
  const payment = {
    id: 'yk-2',
    status: 'succeeded',
    metadata: { app: 'onlead', userId: 'u1', kind: 'package', packageId: 'business', amount: '390' },
  };
  const first = fulfillYookassaPayment(d, payment, 'u1');
  assert.equal(first.applied, true);
  assert.equal(d.users[0].packageId, 'business');
  const second = fulfillYookassaPayment(d, payment, 'u1');
  assert.equal(second.applied, false);
  assert.equal(d.ops.filter((o) => o.paymentId === 'yk-2').length, 1);
});

test('expired YooKassa object marks the local row canceled', () => {
  const d = store();
  d.payments = [{ id: 'yk-exp', userId: 'u1', status: 'pending', provider: 'yookassa', createdAt: 1 }];
  const r = fulfillYookassaPayment(d, { id: 'yk-exp', status: 'expired', metadata: { app: 'onlead' } }, 'u1');
  assert.equal(r.applied, false);
  assert.equal(r.status, 'canceled');
  assert.equal(d.payments[0].status, 'canceled');
  assert.equal(d.users[0].balance, 0);
});

test('cabinet balance pays a package and refuses a topup loop', () => {
  const d = store();
  d.users[0].balance = 1000;
  const paid = payWithBalance(d, 'u1', quoteCheckout({ packageId: 'business' }), { paymentId: 'bal-1' });
  assert.equal(paid.mode, 'balance');
  assert.equal(d.users[0].balance, 610);
  assert.equal(d.users[0].packageId, 'business');
  assert.equal(d.payments[0].provider, 'balance');
  assert.equal(d.payments[0].status, 'succeeded');
  assert.throws(() => payWithBalance(d, 'u1', quoteCheckout({ kind: 'topup', amount: 500 })), /ЮKassa/);
});

test('cabinet balance refuses a short wallet', () => {
  const d = store();
  d.users[0].balance = 10;
  assert.throws(() => payWithBalance(d, 'u1', quoteCheckout({ packageId: 'maxi' })), /нужно/);
  assert.equal(d.users[0].packageId, null);
  assert.equal(d.users[0].balance, 10);
});

test('admin credit lands on the cabinet ledger', () => {
  const d = store();
  creditBalance(d, 'u1', 2500);
  assert.equal(d.users[0].balance, 2500);
  assert.equal(d.ops[0].amount, 2500);
  assert.match(d.ops[0].title, /администратором/);
});

test('pending tick prefers oldest rows and abandons after a day', () => {
  const now = 2_000_000;
  const rows = [
    { id: 'new', status: 'pending', provider: 'yookassa', createdAt: now - 1000 },
    { id: 'old', status: 'pending', provider: 'yookassa', createdAt: now - 10_000 },
    { id: 'paid', status: 'succeeded', provider: 'yookassa', createdAt: 1 },
  ];
  const picked = selectPendingForTick(rows, 1);
  assert.equal(picked[0].id, 'old');
  assert.equal(shouldAbandonPending({ createdAt: now - 25 * 3600 * 1000 }, now, 'pending'), true);
  assert.equal(shouldAbandonPending({ createdAt: now - 1000 }, now, 'pending'), false);
  assert.equal(shouldAbandonPending({ createdAt: now - 1000 }, now, 'canceled'), true);
});

test('transferRefBalance moves funds to main balance', () => {
  const d = store();
  d.users[0].refBalance = 120;
  d.users[0].balance = 50;
  const r = transferRefBalance(d, 'u1', 'all');
  assert.equal(r.moved, 120);
  assert.equal(d.users[0].balance, 170);
  assert.equal(d.users[0].refBalance, 0);
});

test('applyQuote extends packageUntil for multi-month packages', () => {
  const d = store();
  const quote = quoteCheckout({ packageId: 'business', months: 3 });
  applyQuote(d, 'u1', quote, { paymentId: 'p1' });
  assert.equal(d.users[0].packageId, 'business');
  assert.ok(d.users[0].packageUntil > Date.now());
});
