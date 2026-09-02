/** Incoming Telegram webhook: /start and button steps → saved funnel texts. */

import { decryptToken, randomToken } from './crypto.mjs';

import { load, mutate } from './db.mjs';

import { isMockToken, publicUrl } from './hardening.mjs';

import { advanceFunnel, parseButtons, sectionMessage } from './tg-funnel.mjs';

import {
  createReceipt,
  extractReceiptFile,
  upsertTelegramLead,
} from './tg-receipts.mjs';

import {

  telegramAnswerCallback, telegramCreateInviteLink, telegramSendMessage, telegramSetWebhook,

} from './telegram.mjs';

import { parseTariffDays, recordChannelAccess } from './tg-channel.mjs';



function botPlainToken(b) {

  const enc = b?.tokenEnc;

  if (!enc) return '';

  if (isMockToken(enc)) return String(enc);

  try { return decryptToken(enc, process.env.TOKEN_ENCRYPTION_KEY); }

  catch { return ''; }

}



export function webhookSecretFor(bot) {

  return String(bot?.webhookSecret || '').trim();

}



export function webhookUrlFor(bot) {

  return `${publicUrl()}/api/tg/webhook/${encodeURIComponent(bot.id)}`;

}



export async function registerBotWebhook(bot) {

  const token = botPlainToken(bot);

  if (!token || isMockToken(token)) return { ok: false, reason: 'mock-or-empty' };

  const secret = webhookSecretFor(bot);

  if (!secret) return { ok: false, reason: 'no-secret' };

  await telegramSetWebhook(token, webhookUrlFor(bot), secret);

  return { ok: true };

}



export function ensureBotWebhookSecret(bot) {

  if (bot.webhookSecret && String(bot.webhookSecret).length >= 16) return bot;

  bot.webhookSecret = randomToken(16);

  return bot;

}



function pickFunnel(d, bot) {

  const list = (d.tgFunnels || []).filter((f) => f.userId === bot.userId && f.status === 'on');

  const bound = list.filter((f) => f.botId === bot.id);

  return (bound[0] || list[0]) || null;

}



function sessionKey(botId, chatId) {

  return `${botId}:${chatId}`;

}



function keyboard(section) {

  const buttons = parseButtons(section?.buttons);

  if (!buttons.length) return undefined;

  return {

    inline_keyboard: buttons.map((b) => [{ text: b.slice(0, 40), callback_data: b.slice(0, 60) }]),

  };

}



export async function handleTelegramUpdate(bot, update) {

  const token = botPlainToken(bot);

  if (!token || isMockToken(token)) return { ok: false, reason: 'no-token' };

  const msg = update?.message || update?.callback_query?.message;

  const from = update?.message?.from || update?.callback_query?.from;

  const chatId = msg?.chat?.id;

  if (!chatId) return { ok: true, ignored: true };



  if (update?.callback_query?.id) {

    try { await telegramAnswerCallback(token, update.callback_query.id); } catch { /* ignore */ }

  }



  const d0 = load();

  const owner = (d0.users || []).find((u) => u.id === bot.userId);

  const planUntil = Number(owner?.tgPlan?.until || 0);

  const trialUntil = Number(owner?.trialUntil || 0);

  if (planUntil <= Date.now() && trialUntil <= Date.now()) {

    await telegramSendMessage(token, chatId, 'Тариф Telegram не активен. Откройте кабинет OnLead и подключите слот.');

    return { ok: true, reason: 'no-plan' };

  }

  const funnel = pickFunnel(d0, bot);

  if (!funnel) {

    await telegramSendMessage(token, chatId, 'Воронка ещё не включена. Откройте конструктор в кабинете OnLead.');

    return { ok: true, reason: 'no-funnel' };

  }



  const key = sessionKey(bot.id, chatId);

  const prev = (d0.tgSessions || []).find((s) => s.key === key);

  const receiptFile = extractReceiptFile(update);

  const input = update?.callback_query

    ? String(update.callback_query.data || '')

    : String(update?.message?.text || '');



  if (prev?.paymentStatus === 'pending_confirm') {

    if (receiptFile) {

      await telegramSendMessage(token, chatId, 'Чек уже на проверке. Дождитесь подтверждения оператора.');

      return { ok: true, reason: 'receipt-pending' };

    }

    if (input && !/^\/start\b/i.test(input)) {

      await telegramSendMessage(token, chatId, 'Оплата на проверке. Мы сообщим, когда подтвердим чек.');

      return { ok: true, reason: 'awaiting-confirm' };

    }

  }



  if (receiptFile && (prev?.paymentStatus === 'awaiting_receipt' || prev?.awaitingReceipt)) {

    let receiptId = '';

    mutate((d) => {

      const sess = (d.tgSessions || []).find((s) => s.key === key) || {};

      const tgName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim();

      const receipt = createReceipt(d, {

        userId: bot.userId,

        botId: bot.id,

        chatId: String(chatId),

        sessionKey: key,

        funnelId: funnel.id,

        funnelName: funnel.name || '',

        tgUserId: from?.id,

        tgUsername: from?.username ? `@${from.username}` : '',

        tgName,

        fileId: receiptFile.fileId,

        fileKind: receiptFile.kind,

        tariffDays: sess.tariffDays || 30,

        product: funnel.product || '',

        price: funnel.price || '',

      });

      receiptId = receipt.id;

      const row = (d.tgSessions || []).find((s) => s.key === key);

      const payload = {

        key, botId: bot.id, chatId: String(chatId), funnelId: funnel.id,

        step: prev?.step ?? 0, userId: bot.userId, at: Date.now(),

        tariffDays: prev?.tariffDays || 30,

        paymentStatus: 'pending_confirm',

        receiptId,

        awaitingReceipt: false,

      };

      if (row) Object.assign(row, payload);

      else {

        d.tgSessions = d.tgSessions || [];

        d.tgSessions.unshift(payload);

      }

      d.tgSessions = d.tgSessions.slice(0, 2000);

    });

    await telegramSendMessage(token, chatId, 'Чек получен. Ждём подтверждения оператора — обычно это несколько минут.');

    return { ok: true, receiptId, awaitingConfirm: true };

  }



  if (prev?.paymentStatus === 'awaiting_receipt' && input && !receiptFile) {

    const section = funnel.sections?.[prev.step] || funnel.sections?.slice(-1)[0];

    await telegramSendMessage(token, chatId, `${sectionMessage(section, funnel)}\n\nПришлите скриншот или PDF чека ответом на это сообщение.`, keyboard(section));

    return { ok: true, reason: 'need-receipt' };

  }



  const next = advanceFunnel(funnel, prev?.step || 0, input || '/start');

  const tariffDays = parseTariffDays(input, prev?.tariffDays || 30);

  const paymentFlow = !!(next.awaitingReceipt || prev?.paymentStatus === 'awaiting_receipt');



  mutate((d) => {

    d.tgSessions = d.tgSessions || [];

    const row = d.tgSessions.find((s) => s.key === key);

    const payload = {

      key, botId: bot.id, chatId: String(chatId), funnelId: funnel.id,

      step: next.step, userId: bot.userId, at: Date.now(),

      tariffDays: /(\d+)\s*дн/i.test(input) ? tariffDays : (prev?.tariffDays || tariffDays),

      lastInput: String(input || '').slice(0, 80),

    };

    if (next.awaitingReceipt) {

      payload.paymentStatus = 'awaiting_receipt';

      payload.awaitingReceipt = true;

    } else if (!paymentFlow) {

      delete payload.paymentStatus;

      delete payload.awaitingReceipt;

      delete payload.receiptId;

    }

    if (row) Object.assign(row, payload);

    else d.tgSessions.unshift(payload);

    d.tgSessions = d.tgSessions.slice(0, 2000);

    if (next.done && !next.awaitingReceipt && !prev?.paymentStatus) {

      upsertTelegramLead(d, bot, from, funnel);

    }

  });



  if (next.awaitingReceipt) {

    const section = next.section;

    const text = `${sectionMessage(section, funnel)}\n\nПришлите скриншот или PDF чека ответом на это сообщение.`;

    await telegramSendMessage(token, chatId, text, keyboard(section));

    return { ok: true, step: next.step, awaitingReceipt: true };

  }



  let text = sectionMessage(next.section, funnel);

  if (next.done) {

    text += '\n\nЗаявка отправлена в кабинет.';

    if (funnel.kind === 'pro') {

      const ch = (load().tgChannels || []).find((c) => c.userId === bot.userId && c.status === 'on' && c.chatId);

      const session = (load().tgSessions || []).find((s) => s.key === key);

      const days = Number(session?.tariffDays || 30);

      const accessUntil = Math.min(

        Date.now() + days * 86400000,

        planUntil > Date.now() ? planUntil : Date.now() + days * 86400000,

      );

      if (ch?.chatId && from?.id) {

        mutate((d) => {

          recordChannelAccess(d, {

            userId: bot.userId,

            botId: bot.id,

            chatId: ch.chatId,

            tgUserId: from.id,

            tgUsername: from.username ? `@${from.username}` : '',

            tariffDays: days,

            until: accessUntil,

          });

        });

        try {

          const inv = await telegramCreateInviteLink(token, ch.chatId, {

            memberLimit: 1,

            expireDate: accessUntil,

          });

          if (inv?.invite_link) {

            text += `\n\nКанал (${days} дн.): ${inv.invite_link}`;

            text += `\n\nДоступ до ${new Date(accessUntil).toLocaleDateString('ru-RU')}. По истечении срока бот исключит из канала.`;

          }

        } catch { /* channel rights may be missing */ }

      }

    }

  }

  await telegramSendMessage(token, chatId, text, keyboard(next.section));

  return { ok: true, step: next.step, done: next.done };

}



export { botPlainToken, upsertTelegramLead as upsertLead };


