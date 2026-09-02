/** Drop expired cabinet sessions and email tokens so SQLite does not grow forever. */
import { mutate } from './db.mjs';
import { tickTgChannelExpiry } from './tg-channel.mjs';

const INTERVAL_MS = 5 * 60 * 1000;
let lastRun = 0;

export function pruneStore(d, now = Date.now()) {
  const sessionsBefore = (d.sessions || []).length;
  const tokensBefore = (d.emailTokens || []).length;
  d.sessions = (d.sessions || []).filter((s) => Number(s.exp || 0) > now);
  d.emailTokens = (d.emailTokens || []).filter((t) => Number(t.expiresAt || 0) > now);
  return {
    sessions: sessionsBefore - d.sessions.length,
    emailTokens: tokensBefore - d.emailTokens.length,
  };
}

export async function tickHousekeep(now = Date.now()) {
  if (lastRun && now - lastRun < INTERVAL_MS) return { skipped: true };
  lastRun = now;
  let stats = { sessions: 0, emailTokens: 0 };
  mutate((d) => {
    stats = pruneStore(d, now);
  });
  let tgChannel = { kicked: 0, pending: 0 };
  try {
    tgChannel = await tickTgChannelExpiry(now);
  } catch (err) {
    console.warn('[housekeep] tg channel', err instanceof Error ? err.message : err);
  }
  return { ok: true, ...stats, tgChannel };
}
