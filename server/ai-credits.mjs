/** Image AI credits balance per cabinet user. */
export const IMAGE_AI_DEFAULT_CREDITS = 100;
export const IMAGE_AI_CREDIT_COST = 1;

export function aiCreditsBalance(user) {
  if (!user) return 0;
  const n = Number(user.aiCredits);
  return Number.isFinite(n) ? Math.max(0, n) : IMAGE_AI_DEFAULT_CREDITS;
}

export function spendAiCredits(d, userId, cost = IMAGE_AI_CREDIT_COST) {
  const u = (d.users || []).find((x) => x.id === userId);
  if (!u) return { ok: false, left: 0 };
  const left = aiCreditsBalance(u);
  if (left < cost) return { ok: false, left };
  u.aiCredits = left - cost;
  return { ok: true, left: u.aiCredits };
}

export function grantAiCredits(d, userId, amount, reason = '') {
  const u = (d.users || []).find((x) => x.id === userId);
  if (!u || !amount) return null;
  u.aiCredits = aiCreditsBalance(u) + Math.max(0, Math.round(Number(amount)));
  return { left: u.aiCredits, reason };
}
