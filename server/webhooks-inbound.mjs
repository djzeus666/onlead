/** Inbound webhook → content draft (online-lead.ru parity). */
import { randomBytes } from 'node:crypto';
import { createPost } from './posts.mjs';
import { publicUrl } from './hardening.mjs';

function token() {
  return randomBytes(24).toString('hex');
}

export function findUserByInboundToken(db, inboundToken) {
  if (!inboundToken) return null;
  return (db.users || []).find((u) => u.inboundWebhookToken === inboundToken) || null;
}

export function ensureInboundWebhookToken(db, userId) {
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return null;
  if (!user.inboundWebhookToken) {
    user.inboundWebhookToken = token();
  }
  return user.inboundWebhookToken;
}

export function rotateInboundWebhookToken(db, userId) {
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return null;
  user.inboundWebhookToken = token();
  return user.inboundWebhookToken;
}

export function inboundWebhookUrl(inboundToken) {
  if (!inboundToken) return '';
  return `${publicUrl()}/api/webhooks/inbound/${encodeURIComponent(inboundToken)}`;
}

function parseScheduledAt(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const t = Date.parse(String(raw));
  return Number.isNaN(t) ? null : t;
}

export function handleInboundWebhook(db, userId, body = {}) {
  const text = String(body.text ?? body.body ?? '').slice(0, 16384);
  const title = String(body.title || '').slice(0, 200);
  if (!text.trim() && !title.trim()) {
    const err = new Error('title or text/body required');
    err.status = 400;
    throw err;
  }

  const scheduledAt = parseScheduledAt(body.scheduledAt);
  if (body.scheduledAt != null && body.scheduledAt !== '' && scheduledAt == null) {
    const err = new Error('Invalid scheduledAt');
    err.status = 400;
    throw err;
  }

  let accountId = body.accountId != null ? String(body.accountId) : '';
  let ownerId = body.ownerId != null && body.ownerId !== '' ? Number(body.ownerId) : null;

  if (accountId) {
    const acc = (db.accounts || []).find((a) => a.userId === userId && a.id === accountId);
    if (!acc) {
      const err = new Error('accountId must belong to user');
      err.status = 400;
      throw err;
    }
  }

  const status = scheduledAt && scheduledAt > Date.now() ? 'scheduled' : 'draft';

  const post = createPost(db, userId, {
    title,
    text: text || title,
    accountId,
    ownerId,
    scheduledAt: status === 'scheduled' ? scheduledAt : null,
    status,
  });

  return { ok: true, postId: post.id, status: post.status };
}
