/** Same SMTP env keys as post2post: SMTP_HOST/PORT/SECURE/USER/PASS/FROM/REPLY_TO. */
import { sendSmtp } from './smtp.mjs';

export const FROM_NAME = 'OnLead';

export function mailConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || (port === 465 ? 'true' : 'false')).toLowerCase() !== 'false';
  const from = String(process.env.SMTP_FROM || user).trim();
  const replyTo = String(process.env.SMTP_REPLY_TO || from).trim();
  return { host, port, secure, user, pass, from, replyTo };
}

export function isMailConfigured() {
  const c = mailConfig();
  return Boolean(c.host && c.user && c.pass && c.from);
}

export function isPlaceholderEmail(email) {
  const e = String(email || '').toLowerCase();
  return !e.includes('@') || e.endsWith('.local') || e.endsWith('.test');
}

export function publicUrl() {
  return String(process.env.PUBLIC_URL || 'https://onlead.m360-ural.online').replace(/\/$/, '');
}

export function officeUrl(hash) {
  const h = String(hash || '/office').replace(/^#/, '');
  return `${publicUrl()}/#${h.startsWith('/') ? h : '/' + h}`;
}

export async function sendMail(input) {
  if (!isMailConfigured()) throw new Error('SMTP не настроен');
  const c = mailConfig();
  await sendSmtp({
    ...c,
    fromName: input.fromName || FROM_NAME,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendMailSafe(input) {
  try {
    await sendMail(input);
    return true;
  } catch (err) {
    console.warn('[mail]', input.to, err instanceof Error ? err.message : err);
    return false;
  }
}
