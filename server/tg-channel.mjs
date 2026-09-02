/** Telegram Pro: channel access grants and expiry kicks. */
import { load, mutate } from './db.mjs';
import { decryptToken } from './crypto.mjs';
import { isMockToken } from './hardening.mjs';
import { telegramBanChatMember } from './telegram.mjs';

function botToken(b) {
  const enc = b?.tokenEnc;
  if (!enc) return '';
  if (isMockToken(enc)) return String(enc);
  try { return decryptToken(enc, process.env.TOKEN_ENCRYPTION_KEY); }
  catch { return ''; }
}

/** Parse «30 дней», «90 дней» from funnel button text. */
export function parseTariffDays(input, fallback = 30) {
  const m = String(input || '').match(/(\d+)\s*дн/i);
  if (m) return Math.max(1, Math.min(365, Number(m[1])));
  return fallback;
}

export function recordChannelAccess(d, row) {
  d.tgChannelAccess = d.tgChannelAccess || [];
  const until = Number(row.until || 0);
  if (!until || until <= Date.now()) return null;
  const entry = {
    id: 'tga' + Date.now() + Math.random().toString(16).slice(2, 5),
    userId: row.userId,
    botId: row.botId,
    chatId: String(row.chatId),
    tgUserId: String(row.tgUserId),
    tgUsername: String(row.tgUsername || ''),
    tariffDays: Number(row.tariffDays || 30),
    until,
    invitedAt: Date.now(),
    status: 'active',
  };
  d.tgChannelAccess.unshift(entry);
  d.tgChannelAccess = d.tgChannelAccess.slice(0, 5000);
  return entry;
}

export async function tickTgChannelExpiry(now = Date.now()) {
  const db = load();
  const due = (db.tgChannelAccess || []).filter((a) => a.status === 'active' && Number(a.until) <= now);
  if (!due.length) return { kicked: 0, pending: 0 };

  let kicked = 0;
  const updates = [];

  for (const row of due.slice(0, 15)) {
    const bot = (db.bots || []).find((b) => b.id === row.botId && b.userId === row.userId);
    const token = botToken(bot);
    if (!token) {
      updates.push({ id: row.id, status: 'error', note: 'no-bot-token' });
      continue;
    }
    try {
      await telegramBanChatMember(token, row.chatId, row.tgUserId);
      updates.push({ id: row.id, status: 'kicked' });
      kicked += 1;
    } catch (err) {
      updates.push({
        id: row.id,
        status: 'error',
        note: (err instanceof Error ? err.message : String(err)).slice(0, 120),
      });
    }
  }

  if (updates.length) {
    mutate((d) => {
      d.tgChannelAccess = d.tgChannelAccess || [];
      for (const up of updates) {
        const row = d.tgChannelAccess.find((x) => x.id === up.id);
        if (!row) continue;
        row.status = up.status;
        if (up.note) row.note = up.note;
        row.kickedAt = Date.now();
      }
    });
  }

  const pending = (load().tgChannelAccess || []).filter((a) => a.status === 'active').length;
  return { kicked, pending };
}

export function activeChannelAccess(db, userId) {
  const now = Date.now();
  return (db.tgChannelAccess || []).filter(
    (a) => a.userId === userId && a.status === 'active' && Number(a.until) > now,
  );
}
