/** Shared helpers used by snapshot and legacy index routes. */
import { decryptToken } from './crypto.mjs';
import { cabinetTaskMessage } from './user-error.mjs';

export function botToken(b) {
  const enc = b?.tokenEnc;
  if (!enc) return '';
  if (String(enc).startsWith('mock:')) return String(enc);
  try { return decryptToken(enc, process.env.TOKEN_ENCRYPTION_KEY); }
  catch { return ''; }
}

export function liveTgPlan(u) {
  const p = u?.tgPlan;
  if (p?.until && p.until > Date.now()) return p;
  if (u?.trialUntil && u.trialUntil > Date.now()) return { id: 'trial', lite: 1, pro: 0, until: u.trialUntil };
  return { id: null, lite: 0, pro: 0, until: 0 };
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
