/** Funnel products, orders, settings (OL /funnels parity). */
import { load, mutate } from './db.mjs';

const ORDER_LABELS = {
  draft: 'Черновик',
  awaiting_payment: 'Ждём оплату',
  receipt_sent: 'Чек на проверке',
  paid: 'Оплачен',
  rejected: 'Отклонён',
  cancelled: 'Отменён',
};

const RECEIPT_MAP = {
  pending: 'receipt_sent',
  confirmed: 'paid',
  rejected: 'rejected',
};

function newId(prefix = 'pr') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function parseRub(raw) {
  const n = Number(String(raw || '').replace(/\D/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getFunnel(userId, funnelId) {
  const db = load();
  return (db.tgFunnels || []).find((f) => f.id === funnelId && f.userId === userId) || null;
}

export function listFunnelProducts(userId, funnelId) {
  const f = getFunnel(userId, funnelId);
  if (!f) return null;
  return (f.products || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function createFunnelProduct(userId, funnelId, body = {}) {
  return mutate((d) => {
    const f = (d.tgFunnels || []).find((x) => x.id === funnelId && x.userId === userId);
    if (!f) return null;
    f.products = f.products || [];
    const row = {
      id: newId(),
      title: String(body.title || '').trim().slice(0, 120),
      description: String(body.description || '').trim().slice(0, 2000),
      priceRub: body.priceRub != null ? Number(body.priceRub) || null : null,
      priceNote: body.priceNote ? String(body.priceNote).slice(0, 80) : null,
      photoUrl: body.photoUrl ? String(body.photoUrl).slice(0, 500) : null,
      payUrl: body.payUrl ? String(body.payUrl).slice(0, 500) : null,
      deliveryText: String(body.deliveryText || '').trim().slice(0, 2000),
      deliveryUrl: body.deliveryUrl ? String(body.deliveryUrl).slice(0, 500) : null,
      sortOrder: f.products.length,
      active: body.active !== false,
    };
    f.products.push(row);
    return row;
  });
}

export function patchFunnelProduct(userId, funnelId, productId, body = {}) {
  return mutate((d) => {
    const f = (d.tgFunnels || []).find((x) => x.id === funnelId && x.userId === userId);
    if (!f) return null;
    const p = (f.products || []).find((x) => x.id === productId);
    if (!p) return null;
    if (body.title != null) p.title = String(body.title).trim().slice(0, 120);
    if (body.description != null) p.description = String(body.description).trim().slice(0, 2000);
    if (body.priceRub !== undefined) p.priceRub = body.priceRub == null ? null : Number(body.priceRub) || null;
    if (body.priceNote !== undefined) p.priceNote = body.priceNote ? String(body.priceNote).slice(0, 80) : null;
    if (body.photoUrl !== undefined) p.photoUrl = body.photoUrl ? String(body.photoUrl).slice(0, 500) : null;
    if (body.payUrl !== undefined) p.payUrl = body.payUrl ? String(body.payUrl).slice(0, 500) : null;
    if (body.deliveryText != null) p.deliveryText = String(body.deliveryText).trim().slice(0, 2000);
    if (body.deliveryUrl !== undefined) p.deliveryUrl = body.deliveryUrl ? String(body.deliveryUrl).slice(0, 500) : null;
    if (body.active != null) p.active = !!body.active;
    return p;
  });
}

export function deleteFunnelProduct(userId, funnelId, productId) {
  mutate((d) => {
    const f = (d.tgFunnels || []).find((x) => x.id === funnelId && x.userId === userId);
    if (!f?.products) return;
    f.products = f.products.filter((x) => x.id !== productId);
  });
}

export function patchFunnelSettings(userId, funnelId, body = {}) {
  return mutate((d) => {
    const f = (d.tgFunnels || []).find((x) => x.id === funnelId && x.userId === userId);
    if (!f) return null;
    f.settings = f.settings || {};
    const keys = ['greeting', 'payUrl', 'payNote', 'paidText', 'awaitReceiptText', 'notifyChatId', 'receiptAcceptedText', 'rejectedText'];
    for (const k of keys) {
      if (body[k] !== undefined) f.settings[k] = String(body[k] || '').slice(0, 2000);
    }
    if (body.name != null) f.name = String(body.name).trim().slice(0, 80) || f.name;
    if (body.botId != null) f.botId = String(body.botId || '');
    if (Array.isArray(body.sections)) {
      f.sections = body.sections.slice(0, 12).map((s) => ({
        title: String(s.title || '').trim().slice(0, 80),
        text: String(s.text || '').trim().slice(0, 2000),
        buttons: String(s.buttons || '').trim().slice(0, 200),
      }));
    }
    return f;
  });
}

export function listFunnelOrders(userId, funnelId) {
  const db = load();
  const f = getFunnel(userId, funnelId);
  if (!f) return null;
  const rows = (db.tgReceipts || [])
    .filter((r) => r.userId === userId && r.funnelId === funnelId)
    .map((r) => ({
      id: r.id,
      productTitle: r.product || f.product || f.name || '—',
      amountRub: parseRub(r.price),
      status: RECEIPT_MAP[r.status] || (r.status === 'pending' ? 'receipt_sent' : r.status),
      statusLabel: ORDER_LABELS[RECEIPT_MAP[r.status] || r.status] || r.status,
      customerName: r.tgName || null,
      customerContact: r.tgUsername || null,
      customerUsername: (r.tgUsername || '').replace(/^@/, '') || null,
      hasReceipt: !!r.fileId,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      ownerNote: r.rejectNote || null,
    }));
  rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return rows.slice(0, 100);
}

export { ORDER_LABELS };
