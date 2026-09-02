import { createHash, randomInt } from 'node:crypto';
import { load, mutate } from './db.mjs';
import {
  isMailConfigured,
  isPlaceholderEmail,
  officeUrl,
  publicUrl,
  sendMail,
  sendMailSafe,
} from './mail.mjs';
import {
  buildBillingPaymentEmail,
  buildLeadgenMatchesEmail,
  buildPasswordResetEmail,
  buildTrialEndingEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
} from './mail-templates.mjs';

const VERIFY_TTL_MS = 60 * 60_000;
const VERIFY_TTL_MINUTES = 60;
const RESET_TTL_MS = 60 * 60_000;
const LEADGEN_THROTTLE_MS = 15 * 60_000;

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function sixDigits() {
  return String(randomInt(100_000, 1_000_000));
}

function putToken(userId, type, code) {
  const tokenHash = type === 'reset' ? sha256(`pwdreset:${code}`) : sha256(code);
  const expiresAt = Date.now() + (type === 'reset' ? RESET_TTL_MS : VERIFY_TTL_MS);
  mutate((d) => {
    d.emailTokens = (d.emailTokens || []).filter((t) => t.userId !== userId || t.type !== type);
    d.emailTokens.unshift({ id: 'et' + Date.now(), userId, type, tokenHash, expiresAt });
    d.emailTokens = d.emailTokens.slice(0, 500);
  });
}

function findToken(userId, type, code) {
  const tokenHash = type === 'reset' ? sha256(`pwdreset:${code}`) : sha256(code);
  const rec = (load().emailTokens || []).find((t) => t.userId === userId && t.type === type && t.tokenHash === tokenHash);
  if (!rec || rec.expiresAt < Date.now()) return null;
  return rec;
}

function clearTokens(userId, type) {
  mutate((d) => {
    d.emailTokens = (d.emailTokens || []).filter((t) => t.userId !== userId || (type && t.type !== type));
  });
}

export function userVerified(user) {
  if (!user) return false;
  if (user.emailVerified === false) return false;
  return true;
}

export function skipEmailGate(email) {
  return isPlaceholderEmail(email);
}

export async function sendVerificationEmail(user) {
  const code = sixDigits();
  putToken(user.id, 'verify', code);
  const verifyUrl = `${publicUrl()}/#/verify-email?email=${encodeURIComponent(user.email)}&code=${code}`;
  const content = buildVerificationEmail({
    name: user.name || user.email,
    code,
    verifyUrl,
    expiresMinutes: VERIFY_TTL_MINUTES,
  });
  if (skipEmailGate(user.email)) {
    console.warn(`[dev] Email verify code for ${user.email}: ${code}`);
    return;
  }
  if (!isMailConfigured()) {
    console.warn(`[dev] SMTP off · verify ${user.email}: ${code} → ${verifyUrl}`);
    return;
  }
  try {
    await sendMail({ to: user.email, ...content });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[dev] Email verify code for ${user.email}: ${code}`);
      return;
    }
    throw new Error('Не удалось отправить письмо подтверждения. Попробуйте позже.');
  }
}

export async function sendWelcomeEmail(user) {
  if (skipEmailGate(user.email) || !isMailConfigured()) return;
  const content = buildWelcomeEmail({
    name: user.name || user.email,
    dashboardUrl: officeUrl('/office'),
  });
  await sendMailSafe({ to: user.email, ...content });
}

export async function sendPasswordResetEmail(user) {
  const code = sixDigits();
  putToken(user.id, 'reset', code);
  const resetUrl = `${publicUrl()}/#/reset-password?email=${encodeURIComponent(user.email)}&code=${code}`;
  const content = buildPasswordResetEmail({
    name: user.name || user.email,
    code,
    resetUrl,
    expiresMinutes: VERIFY_TTL_MINUTES,
  });
  if (skipEmailGate(user.email) || !isMailConfigured()) {
    console.warn(`[dev] Password reset code for ${user.email}: ${code}`);
    return { ok: true };
  }
  await sendMailSafe({ to: user.email, ...content });
  return { ok: true };
}

export function consumeVerifyCode(user, code) {
  const digits = String(code || '').replace(/\D/g, '').slice(0, 6);
  if (digits.length !== 6) return false;
  if (!findToken(user.id, 'verify', digits)) return false;
  mutate((d) => {
    const x = d.users.find((u) => u.id === user.id);
    if (x) x.emailVerified = true;
  });
  clearTokens(user.id, 'verify');
  return true;
}

export function consumeResetCode(user, code) {
  const digits = String(code || '').replace(/\D/g, '').slice(0, 6);
  if (digits.length !== 6) return false;
  if (!findToken(user.id, 'reset', digits)) return false;
  mutate((d) => {
    const x = d.users.find((u) => u.id === user.id);
    if (x) x.emailVerified = true;
  });
  clearTokens(user.id, 'reset');
  return true;
}

export async function notifyPayment(user, quote) {
  if (!user || skipEmailGate(user.email) || !isMailConfigured()) return;
  const content = buildBillingPaymentEmail({
    title: quote?.title || 'OnLead',
    amountRub: quote?.amount,
    billingUrl: officeUrl('/office/balance'),
  });
  await sendMailSafe({ to: user.email, ...content });
}

export async function notifyLeadgenMatches(user, cfg, { newCount, samples }) {
  if (!user || !newCount) return;
  const notifyEmail = cfg?.notifyEmail !== false;
  if (notifyEmail && !skipEmailGate(user.email) && isMailConfigured()) {
    const last = Number(user.mail?.leadgenAt || 0);
    if (Date.now() - last >= LEADGEN_THROTTLE_MS) {
      mutate((d) => {
        const x = d.users.find((u) => u.id === user.id);
        if (!x) return;
        x.mail = { ...(x.mail || {}), leadgenAt: Date.now() };
      });
      const content = buildLeadgenMatchesEmail({
        newCount,
        samples: samples || [],
        leadgenUrl: officeUrl('/office/tools/leadgen-vk'),
      });
      await sendMailSafe({ to: user.email, ...content });
    }
  }
  if (cfg?.notifyTelegram && cfg?.telegramChatId) {
    await notifyLeadgenTelegram(cfg.telegramChatId, newCount, samples).catch(() => {});
  }
}

async function notifyLeadgenTelegram(chatId, newCount, samples) {
  const token = String(process.env.LEADGEN_NOTIFY_BOT_TOKEN || process.env.ONLEAD_NOTIFY_BOT_TOKEN || '').trim();
  if (!token) return;
  const { telegramSendMessage } = await import('./telegram.mjs');
  const lines = [`Лидоскоп: ${newCount} новых совпадений`];
  for (const s of (samples || []).slice(0, 3)) {
    lines.push(`• ${s.author || '—'}: ${String(s.text || '').slice(0, 80)}`);
  }
  lines.push('Откройте кабинет OnLead → Лидоскоп');
  await telegramSendMessage(token, chatId, lines.join('\n'));
}

export async function tickTrialEndingEmails() {
  if (!isMailConfigured()) return;
  const now = Date.now();
  const users = load().users.filter((u) => u.role !== 'admin' && u.trialUntil > now && !skipEmailGate(u.email));
  for (const user of users) {
    const daysLeft = Math.max(0, Math.ceil((user.trialUntil - now) / 86400000));
    if (daysLeft !== 1 && daysLeft !== 3) continue;
    if (user.mail?.trialDay === daysLeft) continue;
    mutate((d) => {
      const x = d.users.find((u) => u.id === user.id);
      if (!x) return;
      x.mail = { ...(x.mail || {}), trialDay: daysLeft };
    });
    const content = buildTrialEndingEmail({
      name: user.name || user.email,
      daysLeft,
      billingUrl: officeUrl('/office/subscriptions'),
    });
    await sendMailSafe({ to: user.email, ...content });
  }
}
