/** Telegram payment receipts — pending operator confirm before funnel completes. */
import { telegramCreateInviteLink, telegramSendMessage } from './telegram.mjs';
import { recordChannelAccess } from './tg-channel.mjs';
import { sectionMessage } from './tg-funnel.mjs';

export function extractReceiptFile(update) {
  const msg = update?.message;
  if (!msg) return null;
  if (Array.isArray(msg.photo) && msg.photo.length) {
    return { fileId: msg.photo[msg.photo.length - 1].file_id, kind: 'photo' };
  }
  const doc = msg.document;
  if (doc?.file_id && /^image\//i.test(doc.mime_type || '')) {
    return { fileId: doc.file_id, kind: 'document' };
  }
  return null;
}

export function createReceipt(d, row) {
  d.tgReceipts = d.tgReceipts || [];
  const receipt = {
    id: 'rc' + Date.now(),
    status: 'pending',
    createdAt: Date.now(),
    ...row,
  };
  d.tgReceipts.unshift(receipt);
  d.tgReceipts = d.tgReceipts.slice(0, 500);
  return receipt;
}

export function upsertTelegramLead(d, bot, from, funnel, receipt) {
  const tg = from?.username ? `@${from.username}` : String(from?.id || '');
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || tg || 'Telegram';
  d.leads = d.leads || [];
  const tgId = String(from?.id || receipt?.tgUserId || '');
  const dup = d.leads.find((l) => l.userId === bot.userId && l.source === 'telegram' && l.tgId === tgId && Date.now() - (l.createdAt || 0) < 6 * 3600 * 1000);
  if (dup) {
    if (receipt?.fileId) dup.note = `${dup.note || ''} · чек ${receipt.fileId}`.trim().slice(0, 500);
    return dup;
  }
  const row = {
    id: 'ld' + Date.now(),
    userId: bot.userId,
    name: String(name).slice(0, 80),
    phone: '',
    email: '',
    city: 'Telegram',
    note: `Воронка ${funnel?.name || ''} ${funnel?.product || ''} ${funnel?.price || ''}${receipt?.fileId ? ` · чек ${receipt.fileId}` : ''}`.trim().slice(0, 500),
    stage: 'new',
    source: 'telegram',
    tgId,
    tg,
    createdAt: Date.now(),
  };
  d.leads.unshift(row);
  return row;
}

export async function deliverFunnelComplete({
  token, chatId, funnel, session, inviteLink, accessUntil, days,
}) {
  const lastSection = funnel.sections?.slice(-1)[0];
  let text = sectionMessage(lastSection, funnel);
  text += '\n\nОплата подтверждена. Заявка отправлена в кабинет.';
  if (inviteLink) {
    text += `\n\nКанал (${days || 30} дн.): ${inviteLink}`;
    if (accessUntil) {
      text += `\n\nДоступ до ${new Date(accessUntil).toLocaleDateString('ru-RU')}. По истечении срока бот исключит из канала.`;
    }
  }
  await telegramSendMessage(token, chatId, text);
  return text;
}

export async function confirmReceipt({ receiptId, userId, botPlainToken, loadFn, mutateFn }) {
  const d0 = loadFn();
  const receipt = (d0.tgReceipts || []).find((r) => r.id === receiptId && r.userId === userId);
  if (!receipt) return { ok: false, error: 'Чек не найден' };
  if (receipt.status !== 'pending') return { ok: false, error: 'Чек уже обработан' };
  const bot = (d0.bots || []).find((b) => b.id === receipt.botId && b.userId === userId);
  const funnel = (d0.tgFunnels || []).find((f) => f.id === receipt.funnelId && f.userId === userId);
  const owner = (d0.users || []).find((u) => u.id === userId);
  if (!bot || !funnel) return { ok: false, error: 'Бот или воронка не найдены' };
  const plain = botPlainToken(bot);
  if (!plain) return { ok: false, error: 'Токен бота недоступен' };

  const from = {
    id: receipt.tgUserId,
    username: (receipt.tgUsername || '').replace(/^@/, ''),
    first_name: receipt.tgName?.split(' ')[0] || '',
    last_name: receipt.tgName?.split(' ').slice(1).join(' ') || '',
  };
  const session = (d0.tgSessions || []).find((s) => s.key === receipt.sessionKey)
    || { tariffDays: receipt.tariffDays || 30, step: (funnel.sections || []).length - 1 };

  let inviteLink = '';
  let accessUntil = 0;
  const days = Number(session?.tariffDays || 30);
  if (funnel.kind === 'pro') {
    const ch = (d0.tgChannels || []).find((c) => c.userId === bot.userId && c.status === 'on' && c.chatId);
    const planUntil = Number(owner?.tgPlan?.until || 0);
    accessUntil = Math.min(
      Date.now() + days * 86400000,
      planUntil > Date.now() ? planUntil : Date.now() + days * 86400000,
    );
    if (ch?.chatId && from.id) {
      try {
        const inv = await telegramCreateInviteLink(plain, ch.chatId, {
          memberLimit: 1,
          expireDate: accessUntil,
        });
        inviteLink = inv?.invite_link || '';
      } catch { /* channel rights may be missing */ }
    }
  }

  try {
    await deliverFunnelComplete({
      token: plain,
      chatId: receipt.chatId,
      funnel,
      session,
      inviteLink,
      accessUntil,
      days,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Не удалось отправить сообщение' };
  }

  mutateFn((d) => {
    const rc = (d.tgReceipts || []).find((r) => r.id === receiptId);
    if (rc) {
      rc.status = 'confirmed';
      rc.confirmedAt = Date.now();
    }
    const sess = (d.tgSessions || []).find((s) => s.key === receipt.sessionKey);
    if (sess) {
      sess.paymentStatus = 'confirmed';
      sess.step = Math.max(0, (funnel.sections || []).length - 1);
    }
    upsertTelegramLead(d, bot, from, funnel, rc || receipt);
    if (funnel.kind === 'pro' && inviteLink && from.id) {
      const ch = (d.tgChannels || []).find((c) => c.userId === bot.userId && c.status === 'on' && c.chatId);
      if (ch?.chatId) {
        recordChannelAccess(d, {
          userId: bot.userId,
          botId: bot.id,
          chatId: ch.chatId,
          tgUserId: from.id,
          tgUsername: from.username ? `@${from.username}` : '',
          tariffDays: days,
          until: accessUntil,
        });
      }
    }
  });

  return { ok: true };
}

export async function rejectReceipt({ receiptId, userId, note, botPlainToken, loadFn, mutateFn }) {
  const d0 = loadFn();
  const receipt = (d0.tgReceipts || []).find((r) => r.id === receiptId && r.userId === userId);
  if (!receipt) return { ok: false, error: 'Чек не найден' };
  if (receipt.status !== 'pending') return { ok: false, error: 'Чек уже обработан' };
  const bot = (d0.bots || []).find((b) => b.id === receipt.botId && b.userId === userId);
  const plain = bot ? botPlainToken(bot) : '';
  const rejectNote = String(note || '').slice(0, 200);

  mutateFn((d) => {
    const rc = (d.tgReceipts || []).find((r) => r.id === receiptId);
    if (rc) {
      rc.status = 'rejected';
      rc.rejectedAt = Date.now();
      rc.rejectNote = rejectNote;
    }
    const sess = (d.tgSessions || []).find((s) => s.key === receipt.sessionKey);
    if (sess) {
      sess.paymentStatus = 'awaiting_receipt';
      delete sess.receiptId;
    }
  });

  if (plain && receipt.chatId) {
    const msg = rejectNote
      ? `Чек не принят: ${rejectNote}\n\nПришлите скриншот или PDF оплаты ещё раз.`
      : 'Чек не принят. Пришлите скриншот или PDF оплаты ещё раз.';
    try {
      await telegramSendMessage(plain, receipt.chatId, msg);
    } catch { /* ignore */ }
  }
  return { ok: true };
}
