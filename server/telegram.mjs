/** Telegram Bot API. Incoming updates go through webhook, not getUpdates. */
import { allowMocks, isMockToken } from './hardening.mjs';

async function telegramCall(token, method, params = {}, post = false) {
  const raw = String(token || '').trim();
  if (!raw) throw new Error('Нет токена бота');
  const url = `https://api.telegram.org/bot${raw}/${method}`;
  let res;
  if (post) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
  } else {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') continue;
      qs.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    res = await fetch(`${url}${qs.size ? '?' + qs : ''}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!data?.ok) {
    throw new Error(data?.description || `Telegram не ответил на ${method}`);
  }
  return data.result;
}

export async function telegramGetMe(token) {
  const raw = String(token || '').trim();
  if (!raw) throw new Error('Вставьте токен бота');
  if (isMockToken(raw)) {
    if (!allowMocks()) throw new Error('Демо-токен Telegram на рабочем контуре отключён');
    return { id: 1, is_bot: true, first_name: 'OnLead Demo', username: 'onlead_demo_bot' };
  }
  return telegramCall(raw, 'getMe');
}

export async function telegramGetChat(token, ident) {
  const raw = String(token || '').trim();
  const chatId = String(ident || '').trim();
  if (!chatId) throw new Error('Укажите канал');
  if (isMockToken(raw)) {
    if (!allowMocks()) throw new Error('Демо-токен Telegram на рабочем контуре отключён');
    const username = chatId.startsWith('@') ? chatId : '@' + chatId.replace(/^https?:\/\/t\.me\//, '');
    return { id: -1001, title: username, username: username.replace(/^@/, ''), type: 'channel' };
  }
  return telegramCall(raw, 'getChat', { chat_id: chatId });
}

export async function telegramDiscoverChats(token) {
  const raw = String(token || '').trim();
  if (isMockToken(raw)) {
    if (!allowMocks()) throw new Error('Демо-токен Telegram на рабочем контуре отключён');
    return [{ chatId: '-1001', name: 'OnLead Demo Channel', username: '@onlead_demo', type: 'channel' }];
  }
  return [];
}

export async function telegramSendMessage(token, chatId, text, replyMarkup) {
  const payload = {
    chat_id: chatId,
    text: String(text || '').slice(0, 3900),
    disable_web_page_preview: true,
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return telegramCall(token, 'sendMessage', payload, true);
}

export async function telegramAnswerCallback(token, callbackQueryId) {
  return telegramCall(token, 'answerCallbackQuery', { callback_query_id: callbackQueryId }, true);
}

export async function telegramSetWebhook(token, url, secret) {
  return telegramCall(token, 'setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  }, true);
}

export async function telegramCreateInviteLink(token, chatId, opts = {}) {
  const params = {
    chat_id: chatId,
    member_limit: opts.memberLimit ?? 1,
  };
  if (opts.expireDate) params.expire_date = Math.floor(Number(opts.expireDate) / 1000);
  return telegramCall(token, 'createChatInviteLink', params, true);
}

/** Remove subscriber from channel when Pro access expires. */
export async function telegramBanChatMember(token, chatId, userId) {
  if (isMockToken(token)) return { ok: true };
  return telegramCall(token, 'banChatMember', {
    chat_id: chatId,
    user_id: Number(userId),
    revoke_messages: false,
  }, true);
}
