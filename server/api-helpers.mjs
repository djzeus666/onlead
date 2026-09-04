/** Shared helpers used by snapshot and legacy index routes. */
import { decryptToken } from './crypto.mjs';
import { cabinetTaskMessage } from './user-error.mjs';

/** Mirror of billing.TG_PLANS slots — kept here to hydrate broken tgPlan rows without a cycle. */
const TG_PLAN_SLOTS = {
  start: { lite: 1, pro: 0, title: 'Старт' },
  business: { lite: 3, pro: 0, title: 'Бизнес' },
  agency: { lite: 10, pro: 0, title: 'Агентство' },
  pro: { lite: 2, pro: 1, title: 'Pro' },
  'pro-max': { lite: 5, pro: 3, title: 'Pro Max' },
};

export function botToken(b) {
  const enc = b?.tokenEnc;
  if (!enc) return '';
  if (String(enc).startsWith('mock:')) return String(enc);
  try { return decryptToken(enc, process.env.TOKEN_ENCRYPTION_KEY); }
  catch { return ''; }
}

function asUntilMs(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function liveTgPlan(u) {
  const raw = u?.tgPlan;
  const until = asUntilMs(raw?.until);
  if (raw && until > Date.now()) {
    const catalog = TG_PLAN_SLOTS[String(raw.id || '')];
    let lite = Number(raw.lite || 0);
    let pro = Number(raw.pro || 0);
    // Repair purchases that stored id/until but dropped slot counts (quoteFromRow bug).
    if (catalog && !(lite || pro)) {
      lite = catalog.lite;
      pro = catalog.pro;
    }
    return { id: raw.id || null, lite, pro, until };
  }
  const trialUntil = asUntilMs(u?.trialUntil);
  if (trialUntil > Date.now()) return { id: 'trial', lite: 1, pro: 0, until: trialUntil };
  return { id: null, lite: 0, pro: 0, until: 0 };
}

export function tgPlanLabel(plan) {
  if (!plan?.id) return '';
  if (plan.id === 'trial') return 'Пробный · 3 дня';
  return TG_PLAN_SLOTS[String(plan.id)]?.title || String(plan.id);
}

export function tgSlotUsage(d, userId) {
  const list = (d.tgFunnels || []).filter((f) => f.userId === userId && f.status !== 'archive');
  return {
    lite: list.filter((f) => f.kind !== 'pro').length,
    pro: list.filter((f) => f.kind === 'pro').length,
  };
}

export function trialLeft(user) {
  const ms = (user.trialUntil || 0) - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)} д ${h % 24} ч` : `${h} ч`;
}

export function publicAccount(a) {
  if (!a) return null;
  const { tokenEnc, messagesTokenEnc, ...rest } = a;
  return {
    ...rest,
    tokenMask: a.tokenMask,
    hasMessagesToken: Boolean(messagesTokenEnc),
    messagesTokenMask: a.messagesTokenMask || null,
  };
}

export function publicCampaign(c) {
  if (!c) return null;
  const stats = { ...(c.stats || {}) };
  delete stats.lastAdminMessage;
  if (stats.lastMessage) {
    stats.lastMessage = cabinetTaskMessage(stats.lastMessage, {
      ok: c.status === 'done' || Number(stats.ok || 0) > 0,
    });
  }
  return { ...c, stats };
}

export function publicPromo(settings = {}) {
  const src = settings.promo || {};
  const until = Number(src.until || 0);
  if (until && until < Date.now()) return { enabled: false };
  return {
    enabled: src.enabled !== false,
    title: String(src.title || 'Розыгрыш Maxi').trim(),
    text: String(src.text || 'Подключите Maxi — участвуйте в розыгрыше месяца подписки').trim(),
    href: String(src.href || '#/office/subscriptions').trim(),
    until: until || 0,
  };
}
