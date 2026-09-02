/** Checkout + fulfillment. Live path is the same YooKassa shop as post2post. */
import { load, mutate } from './db.mjs';
import { isLivePayments, createYookassaPayment, getYookassaPayment } from './yookassa.mjs';
import { notifyPayment } from './notify.mjs';
import { isTelegramLive } from './hardening.mjs';

export const PACKAGE_PRICES = { business: 390, 'maxi-ai': 469, maxi: 649 };

export const TOOL_PRICES = {
  'ai-lead-vk': 199, 'neurocomment-vk': 199, 'image-ai': 229, 'lead-vk': 349,
  'leadgen-vk': 249, 'massliking-vk': 199, 'grabber-vk': 99, 'autoposting-vk': 149,
  'congratulation-vk': 129, 'invite-vk': 199, 'autostoris-vk': 149, 'broom-vk': 99,
  'chat-manager-vk': 199, 'group-manager-vk': 99, 'landings-pro': 290,
  'parsing-accounts-vk': 99, 'parsing-groups-vk': 99,
};

export const TG_PLANS = {
  start: { price: 490, lite: 1, pro: 0, title: 'Telegram Старт' },
  business: { price: 1190, lite: 3, pro: 0, title: 'Telegram Бизнес' },
  agency: { price: 2990, lite: 10, pro: 0, title: 'Telegram Агентство' },
  pro: { price: 1490, lite: 2, pro: 1, title: 'Telegram Pro' },
  'pro-max': { price: 3490, lite: 5, pro: 3, title: 'Telegram Pro Max' },
};

const LABELS = {
  business: 'OnLead Business',
  'maxi-ai': 'OnLead Maxi ИИ',
  maxi: 'OnLead Maxi',
};

function placeholderEmail(email) {
  const e = String(email || '').toLowerCase();
  return !e.includes('@') || e.endsWith('.local') || e.endsWith('.test');
}

export function quoteCheckout(body) {
  const asTopup = body.kind === 'topup'
    || (body.amount && !body.packageId && !body.slug && !body.tgPlan && body.kind !== 'tg-plan');
  if (asTopup) {
    const amount = Math.round(Number(body.amount || 1000));
    if (!Number.isFinite(amount) || amount < 100 || amount > 300000) {
      throw new Error('Сумма пополнения — от 100 до 300 000 ₽');
    }
    return { kind: 'topup', amount, title: `Пополнение ${amount} ₽` };
  }
  if (body.packageId && PACKAGE_PRICES[body.packageId]) {
    const months = Math.max(1, Number(body.months || 1));
    const disc = months >= 6 ? 0.1 : months >= 3 ? 0.05 : 0;
    const base = PACKAGE_PRICES[body.packageId];
    const amount = Math.round(base * months * (1 - disc));
    return {
      kind: 'package',
      packageId: body.packageId,
      amount,
      title: `${LABELS[body.packageId] || body.packageId} · ${months} мес`,
      months,
    };
  }
  if (body.tgPlan || body.kind === 'tg-plan') {
    const planId = String(body.tgPlan || body.planId || '');
    const plan = TG_PLANS[planId];
    if (!plan) throw new Error('Неизвестный тариф Telegram');
    const months = Math.max(1, Number(body.months || 1));
    const disc = months >= 12 ? 0.1 : months >= 6 ? 0.08 : months >= 3 ? 0.06 : 0;
    const amount = Math.round(plan.price * months * (1 - disc));
    return {
      kind: 'tg-plan',
      tgPlan: planId,
      months,
      amount,
      lite: plan.lite,
      pro: plan.pro,
      title: `${plan.title} · ${months} мес`,
    };
  }
  if (body.slug) {
    const months = Math.max(1, Number(body.months || 1));
    const disc = months >= 6 ? 0.1 : months >= 3 ? 0.05 : 0;
    const base = TOOL_PRICES[body.slug];
    if (base == null && body.slug !== 'landings-pro') throw new Error('Неизвестный инструмент');
    const amount = Math.round((base || 199) * months * (1 - disc));
    return { kind: 'tool', slug: body.slug, months, amount, title: `${body.slug} · ${months} мес` };
  }
  throw new Error('Что покупаем?');
}

function creditReferral(d, payer, amount, title) {
  if (!payer?.referredBy || !(amount > 0)) return;
  const pct = Number(d.settings?.referralPercent || 7);
  const bonus = Math.round(amount * pct / 100);
  if (bonus <= 0) return;
  const ref = d.users.find((x) => x.id === payer.referredBy);
  if (!ref || ref.id === payer.id) return;
  ref.refBalance = (ref.refBalance || 0) + bonus;
  ref.referral = ref.referral || { invited: 0, paying: 0, earned: 0, code: '—' };
  ref.referral.earned = (ref.referral.earned || 0) + bonus;
  if (!payer.referralPaidOnce) {
    ref.referral.paying = (ref.referral.paying || 0) + 1;
    payer.referralPaidOnce = true;
  }
  d.ops.unshift({
    id: 'op' + Date.now() + 'r',
    userId: ref.id,
    at: new Date().toISOString(),
    title: `Реферал ${pct}%: ${title}`,
    amount: bonus,
  });
}

export function applyQuote(d, userId, quote, { paymentId } = {}) {
  if (paymentId && (d.ops || []).some((o) => o.paymentId === paymentId)) return { already: true };
  const x = d.users.find((u) => u.id === userId);
  if (!x) throw new Error('Нет пользователя');
  if (quote.kind === 'topup') {
    x.balance = (x.balance || 0) + quote.amount;
  } else if (quote.kind === 'package') {
    x.packageId = quote.packageId;
    const extra = Number(quote.months || 1) * 30 * 86400000;
    const from = Math.max(Date.now(), Number(x.packageUntil || 0));
    x.packageUntil = from + extra;
  } else if (quote.kind === 'tool') {
    x.enabledTools = x.enabledTools || {};
    const extra = Number(quote.months || 1) * 30 * 86400000;
    const from = Math.max(Date.now(), Number(x.enabledTools[quote.slug] || 0));
    x.enabledTools[quote.slug] = from + extra;
  } else if (quote.kind === 'tg-plan') {
    const extra = Number(quote.months || 1) * 30 * 86400000;
    const from = Math.max(Date.now(), Number(x.tgPlan?.until || 0));
    x.tgPlan = {
      id: quote.tgPlan,
      lite: Number(quote.lite || 0),
      pro: Number(quote.pro || 0),
      until: from + extra,
    };
  }
  d.ops = d.ops || [];
  d.ops.unshift({
    id: 'op' + Date.now(),
    userId,
    paymentId: paymentId || undefined,
    at: new Date().toISOString(),
    title: quote.title,
    amount: quote.kind === 'topup' ? quote.amount : -quote.amount,
  });
  if (quote.kind !== 'topup') creditReferral(d, x, quote.amount, quote.title);
  const row = (d.payments || []).find((p) => p.id === paymentId);
  if (row) {
    row.status = 'succeeded';
    row.appliedAt = Date.now();
  }
  return { already: false };
}

function quoteFromRow(row, meta = {}) {
  if (row?.kind) {
    return {
      kind: row.kind,
      packageId: row.packageId,
      tgPlan: row.tgPlan,
      slug: row.slug,
      months: row.months,
      amount: row.amount,
      title: row.title,
    };
  }
  return quoteCheckout({
    kind: meta.kind,
    packageId: meta.packageId || undefined,
    slug: meta.slug || undefined,
    months: meta.months,
    amount: meta.amount,
  });
}

function paymentMatchesQuote(row, quote) {
  return row.kind === quote.kind
    && Number(row.amount) === Number(quote.amount)
    && String(row.packageId || '') === String(quote.packageId || '')
    && String(row.slug || '') === String(quote.slug || '')
    && String(row.tgPlan || '') === String(quote.tgPlan || '');
}

async function reusePendingCheckout(user, quote) {
  const db = load();
  const cutoff = Date.now() - 2 * 3600 * 1000;
  const match = (db.payments || []).find((p) => (
    p.userId === user.id
    && p.status === 'pending'
    && p.provider === 'yookassa'
    && (p.createdAt || 0) > cutoff
    && paymentMatchesQuote(p, quote)
  ));
  if (!match) return null;
  try {
    const yk = await getYookassaPayment(match.id);
    if (yk.status === 'succeeded') {
      await applySucceededPayment(match.id, user.id);
      return { mode: 'yookassa', paymentId: match.id, confirmationUrl: null, applied: true, reused: true };
    }
    if (yk.status === 'pending' && yk.confirmation?.confirmation_url) {
      return {
        mode: 'yookassa',
        paymentId: match.id,
        confirmationUrl: yk.confirmation.confirmation_url,
        applied: false,
        reused: true,
      };
    }
    if (yk.status === 'canceled') {
      mutate((d) => {
        const row = (d.payments || []).find((p) => p.id === match.id);
        if (row) row.status = 'canceled';
      });
    }
  } catch (err) {
    console.error('[yookassa] reuse failed', match.id, err.message);
  }
  return null;
}

export function payWithBalance(d, userId, quote, { paymentId } = {}) {
  if (quote.kind === 'topup') throw new Error('Пополнение счёта только через ЮKassa');
  const x = d.users.find((u) => u.id === userId);
  if (!x) throw new Error('Нет пользователя');
  const have = Number(x.balance || 0);
  const need = Number(quote.amount || 0);
  if (!(need > 0)) throw new Error('Некорректная сумма');
  if (have < need) {
    throw new Error(`На счёте ${have.toLocaleString('ru-RU')} ₽, нужно ${need.toLocaleString('ru-RU')} ₽. Пополните баланс или оплатите картой.`);
  }
  const id = paymentId || `bal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  d.payments = d.payments || [];
  d.payments.unshift({
    id,
    userId,
    provider: 'balance',
    status: 'pending',
    ...quote,
    createdAt: Date.now(),
  });
  d.payments = d.payments.slice(0, 500);
  x.balance = have - need;
  applyQuote(d, userId, quote, { paymentId: id });
  return { mode: 'balance', applied: true, paymentId: id };
}

export function creditBalance(d, userId, delta, title = 'Пополнение администратором') {
  const x = d.users.find((u) => u.id === userId);
  if (!x) throw new Error('Нет пользователя');
  const amount = Math.round(Number(delta));
  if (!Number.isFinite(amount) || amount === 0) throw new Error('Укажите сумму, не ноль');
  if (Math.abs(amount) > 300000) throw new Error('Сумма — до 300 000 ₽ за одну операцию');
  x.balance = Number(x.balance || 0) + amount;
  d.ops = d.ops || [];
  d.ops.unshift({
    id: 'op' + Date.now() + 'c',
    userId,
    at: new Date().toISOString(),
    title,
    amount,
  });
  return x;
}

export function transferRefBalance(d, userId, amount) {
  const x = d.users.find((u) => u.id === userId);
  if (!x) throw new Error('Нет пользователя');
  const avail = Number(x.refBalance || 0);
  const move = amount == null || amount === 'all'
    ? avail
    : Math.round(Number(amount));
  if (!Number.isFinite(move) || move <= 0) throw new Error('Нечего переводить');
  if (move > avail) throw new Error('Недостаточно на реф. счёте');
  x.refBalance = avail - move;
  x.balance = Number(x.balance || 0) + move;
  d.ops = d.ops || [];
  d.ops.unshift({
    id: 'op' + Date.now() + 'r',
    userId,
    at: new Date().toISOString(),
    title: 'Перевод с реф. счёта',
    amount: move,
  });
  return { moved: move, balance: x.balance, refBalance: x.refBalance };
}

export async function createCheckout(user, body, origin) {
  const quote = quoteCheckout(body);
  const method = String(body.method || body.pay || 'yookassa').toLowerCase();
  if (quote.kind === 'tg-plan' && !isTelegramLive()) {
    throw new Error('Оплата Telegram закрыта: включите TELEGRAM_LIVE, когда webhook бота отвечает на /start.');
  }
  if (method === 'balance') {
    const result = mutate((d) => payWithBalance(d, user.id, quote));
    const fresh = load().users.find((u) => u.id === user.id) || user;
    notifyPayment(fresh, quote).catch(() => {});
    return { ...result, confirmationUrl: null };
  }
  if (!isLivePayments()) {
    mutate((d) => applyQuote(d, user.id, quote));
    notifyPayment(user, quote).catch(() => {});
    return { mode: 'stub', applied: true, confirmationUrl: null };
  }
  if (placeholderEmail(user.email)) {
    throw new Error('Для чека 54-ФЗ укажите рабочий email в профиле (не @onlead.local)');
  }
  const reused = await reusePendingCheckout(user, quote);
  if (reused) return reused;
  const returnUrl = `${String(origin || '').replace(/\/$/, '')}/?paid=1`;
  const description = `OnLead — ${quote.title}`;
  const payment = await createYookassaPayment({
    amountRaw: quote.amount,
    description,
    returnUrl,
    email: user.email,
    metadata: {
      app: 'onlead',
      userId: String(user.id),
      kind: quote.kind,
      packageId: quote.packageId || '',
      slug: quote.slug || '',
      tgPlan: quote.tgPlan || '',
      months: String(quote.months || 1),
      amount: String(quote.amount),
    },
    idempotenceKey: `onlead-${user.id}-${quote.kind}-${Date.now()}`,
  });
  const confirmationUrl = payment.confirmation?.confirmation_url || null;
  if (!confirmationUrl) {
    console.error('[yookassa] no confirmation_url', payment.id, payment.status);
    throw new Error('ЮKassa не вернула ссылку на оплату. Попробуйте ещё раз.');
  }
  mutate((d) => {
    d.payments = d.payments || [];
    d.payments.unshift({
      id: payment.id,
      userId: user.id,
      provider: 'yookassa',
      status: 'pending',
      ...quote,
      createdAt: Date.now(),
    });
    d.payments = d.payments.slice(0, 500);
  });
  return {
    mode: 'yookassa',
    paymentId: payment.id,
    confirmationUrl,
    applied: false,
  };
}

export const PENDING_TICK_LIMIT = 12;
export const PENDING_ABANDON_MS = 24 * 3600 * 1000;

export function selectPendingForTick(payments, limit = PENDING_TICK_LIMIT) {
  return (payments || [])
    .filter((p) => p.status === 'pending' && p.provider === 'yookassa')
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
    .slice(0, limit);
}

export function shouldAbandonPending(row, now = Date.now(), ykStatus = '') {
  if (ykStatus === 'canceled' || ykStatus === 'expired') return true;
  const age = now - Number(row?.createdAt || 0);
  if (age >= PENDING_ABANDON_MS && ykStatus !== 'succeeded') return true;
  return false;
}

export function parseYookassaWebhook(body) {
  const event = String(body?.event || '');
  if (event === 'payment.canceled') {
    const paymentId = String(body?.object?.id || '').trim();
    if (!paymentId) return { ok: false, reason: 'missing payment id' };
    const meta = body?.object?.metadata || {};
    if (meta.app && meta.app !== 'onlead') return { ok: true, ignored: true, reason: 'not onlead' };
    return { ok: true, canceled: true, paymentId, userId: meta.userId };
  }
  if (event && event !== 'payment.succeeded') {
    return { ok: true, ignored: true };
  }
  const paymentId = String(body?.object?.id || '').trim();
  if (!paymentId) return { ok: false, reason: 'missing payment id' };
  const meta = body?.object?.metadata || {};
  if (meta.app && meta.app !== 'onlead') return { ok: true, ignored: true, reason: 'not onlead' };
  return { ok: true, paymentId, userId: meta.userId };
}

export function fulfillYookassaPayment(d, payment, expectedUserId) {
  if (!payment) return { ok: false, reason: 'missing payment' };
  if (payment.status === 'canceled' || payment.status === 'expired') {
    const row = (d.payments || []).find((p) => p.id === payment.id);
    if (row) row.status = 'canceled';
    return { ok: true, applied: false, status: 'canceled' };
  }
  if (payment.status !== 'succeeded') {
    return { ok: true, applied: false, status: payment.status };
  }
  const meta = payment.metadata || {};
  if (meta.app && meta.app !== 'onlead') {
    return { ok: true, applied: false, reason: 'not onlead' };
  }
  const userId = String(meta.userId || expectedUserId || '');
  if (expectedUserId && userId && userId !== String(expectedUserId)) {
    return { ok: false, reason: 'user mismatch' };
  }
  if (!userId) return { ok: false, reason: 'missing user' };
  d.payments = d.payments || [];
  let row = d.payments.find((p) => p.id === payment.id);
  if (!row) {
    row = {
      id: payment.id,
      userId,
      provider: 'yookassa',
      status: 'pending',
      ...quoteFromRow(null, meta),
      createdAt: Date.now(),
    };
    d.payments.unshift(row);
  }
  const result = applyQuote(d, userId, quoteFromRow(row, meta), { paymentId: payment.id });
  return { ok: true, applied: !result.already, status: 'succeeded' };
}

export async function applySucceededPayment(paymentId, expectedUserId, deps = {}) {
  const fetchPayment = deps.fetchPayment || getYookassaPayment;
  const payment = await fetchPayment(paymentId);
  let result = { ok: true, applied: false };
  mutate((d) => {
    result = fulfillYookassaPayment(d, payment, expectedUserId);
  });
  if (result.applied) {
    const user = load().users.find((u) => u.id === expectedUserId || u.id === (payment.metadata || {}).userId);
    const row = (load().payments || []).find((p) => p.id === paymentId);
    notifyPayment(user, quoteFromRow(row, payment.metadata || {})).catch(() => {});
  }
  return result;
}

export async function confirmUserPending(userId) {
  const db = load();
  const pending = (db.payments || []).filter((p) => p.userId === userId && p.status === 'pending' && p.provider === 'yookassa');
  if (!pending.length) return { ok: true, applied: false, reason: 'no pending payment' };
  let last = { ok: true, applied: false };
  let appliedAny = false;
  for (const row of pending.slice(0, 15)) {
    last = await applySucceededPayment(row.id, userId);
    if (last.applied) appliedAny = true;
  }
  if (appliedAny) return { ...last, applied: true, status: 'succeeded' };
  return last;
}

let lastBillingTick = 0;
export async function tickPendingPayments() {
  if (!isLivePayments()) return { skipped: true };
  const now = Date.now();
  if (now - lastBillingTick < 20000) return { skipped: true };
  lastBillingTick = now;
  const db = load();
  const pending = selectPendingForTick(db.payments);
  let applied = 0;
  let canceled = 0;
  for (const row of pending) {
    try {
      const result = await applySucceededPayment(row.id, row.userId);
      if (result.applied) applied += 1;
      else if (shouldAbandonPending(row, now, result.status)) {
        mutate((d) => {
          const found = (d.payments || []).find((p) => p.id === row.id && p.status === 'pending');
          if (found) found.status = 'canceled';
        });
        canceled += 1;
      }
    } catch (err) {
      console.error('[yookassa] tick', row.id, err.message);
      if (shouldAbandonPending(row, now, 'unknown')) {
        mutate((d) => {
          const found = (d.payments || []).find((p) => p.id === row.id && p.status === 'pending');
          if (found) found.status = 'canceled';
        });
        canceled += 1;
      }
    }
  }
  return { ok: true, checked: pending.length, applied, canceled };
}

export async function handleYookassaWebhook(body) {
  const parsed = parseYookassaWebhook(body);
  if (!parsed.ok || parsed.ignored) return parsed;
  if (parsed.canceled) {
    mutate((d) => {
      const row = (d.payments || []).find((p) => p.id === parsed.paymentId);
      if (row && row.status === 'pending') row.status = 'canceled';
    });
    return { ok: true, applied: false, status: 'canceled' };
  }
  return applySucceededPayment(parsed.paymentId, parsed.userId);
}

export { isLivePayments };
