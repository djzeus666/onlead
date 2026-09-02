/** VK chat inbox: auto-replies, group welcomes, moderation and kicks. */
import { vkCall, isMock } from './call.mjs';
import { vkConversations, vkSendMessage } from './growth.mjs';

const SPAM_WORDS = ['заработок без', 'казино', 'крипт', 'инвестиц', 'пассивный доход', 'mlm'];

export function parseChatPeerIds(raw) {
  const out = new Set();
  const text = String(raw || '');
  for (const m of text.matchAll(/(?:chat|conversation)(\d+)|peer_id[=:](-?\d+)|c(\d+)/gi)) {
    const id = Number(m[1] || m[2] || m[3]);
    if (id) out.add(id > 0 && id < 2000000000 ? 2000000000 + id : id);
  }
  for (const m of text.matchAll(/vk\.com\/(?:im\?sel=|write)(-?\d+)/gi)) {
    out.add(Number(m[1]));
  }
  return [...out];
}

export function looksLikeSpam(text, mode) {
  const t = String(text || '').toLowerCase();
  if (!t || mode === 'Выкл') return false;
  if (mode === 'Ссылки' || mode === 'Строгая') {
    if (/https?:\/\//i.test(t) || /vk\.cc\//i.test(t) || /t\.me\//i.test(t)) return true;
  }
  if (mode === 'Спам-слова' || mode === 'Строгая') {
    if (SPAM_WORDS.some((w) => t.includes(w))) return true;
  }
  return false;
}

export function renderGroupWelcome(template, member = {}) {
  const name = [member.firstName, member.firstName && member.lastName ? member.lastName : '']
    .filter(Boolean)
    .join(' ')
    .trim() || 'новичок';
  return String(template || '')
    .replace(/\{name\}/gi, name)
    .replace(/\{first_name\}/gi, member.firstName || name)
    .replace(/\{last_name\}/gi, member.lastName || '')
    .trim();
}

function chatShortId(peerId) {
  const n = Number(peerId);
  return n >= 2000000000 ? n - 2000000000 : n;
}

export async function vkRemoveChatUser(token, peerId, userId) {
  if (isMock(token)) return { ok: true };
  await vkCall('messages.removeChatUser', {
    chat_id: chatShortId(peerId),
    member_id: Number(userId),
  }, token);
  return { ok: true };
}

export async function runChatManagerStep(token, payload, stats = {}) {
  if (!token) return { ok: false, message: 'Нужен токен сообщений VK' };
  const mode = String(payload.rules || 'Выкл');
  const welcome = String(payload.welcome || '').trim();
  const kickOn = /кик|kick/i.test(String(payload.kick || 'После спама'));
  const watched = parseChatPeerIds(payload.chats);
  const conv = await vkConversations(token, 40);
  const targets = watched.length
    ? conv.filter((c) => watched.includes(c.peerId))
    : conv.filter((c) => c.peerId >= 2000000000 || c.unread > 0).slice(0, 8);

  const seen = new Set(stats.repliedPeers || []);
  const welcomed = new Set(stats.welcomedKeys || []);
  let replied = 0;
  let moderated = 0;
  let welcomedN = 0;
  let kicked = 0;
  const log = [...(stats.chatLog || [])];

  for (const chat of targets) {
    if (chat.peerId < 2000000000 && chat.unread > 0 && welcome && !seen.has(chat.peerId)) {
      const r = await vkSendMessage(token, chat.peerId, welcome);
      if (r.ok) {
        replied += 1;
        seen.add(chat.peerId);
        log.unshift({ at: new Date().toISOString(), kind: 'dm', chat: chat.title, note: 'автоответ' });
      }
    }

    if (chat.peerId < 2000000000) continue;
    if (isMock(token)) continue;

    try {
      const hist = await vkCall('messages.getHistory', { peer_id: chat.peerId, count: 20 }, token);
      for (const msg of hist.items || []) {
        if (msg.action?.type === 'chat_invite_user' && welcome) {
          const memberId = Number(msg.action.member_id || msg.action.member || 0);
          if (!memberId) continue;
          const key = `${chat.peerId}:${memberId}`;
          if (welcomed.has(key)) continue;
          const text = renderGroupWelcome(welcome, {
            firstName: msg.action.text || '',
            lastName: '',
          });
          const greet = text.includes('@') || text.includes('[id')
            ? text
            : `[id${memberId}|${text.split(' ')[0] || 'друг'}], ${text}`;
          const r = await vkSendMessage(token, chat.peerId, greet);
          if (r.ok) {
            welcomed.add(key);
            welcomedN += 1;
            log.unshift({
              at: new Date().toISOString(),
              kind: 'welcome',
              chat: chat.title,
              note: `id${memberId}`,
            });
          }
        }
      }

      if (mode === 'Выкл') continue;
      for (const msg of hist.items || []) {
        if (msg.out) continue;
        if (!looksLikeSpam(msg.text, mode)) continue;
        await vkCall('messages.delete', {
          message_ids: msg.id,
          peer_id: chat.peerId,
          delete_for_all: 1,
        }, token);
        moderated += 1;
        log.unshift({
          at: new Date().toISOString(),
          kind: 'moderation',
          chat: chat.title,
          note: String(msg.text || '').slice(0, 80),
        });
        if (kickOn && msg.from_id && msg.from_id > 0) {
          try {
            await vkRemoveChatUser(token, chat.peerId, msg.from_id);
            kicked += 1;
            log.unshift({
              at: new Date().toISOString(),
              kind: 'kick',
              chat: chat.title,
              note: `id${msg.from_id}`,
            });
          } catch {
            /* need admin rights */
          }
        }
        break;
      }
    } catch {
      /* no admin rights in this chat */
    }
  }

  const parts = [`Чатов ${targets.length}`];
  if (replied) parts.push(`ЛС ${replied}`);
  if (welcomedN) parts.push(`приветствий ${welcomedN}`);
  if (moderated) parts.push(`модерация ${moderated}`);
  if (kicked) parts.push(`киков ${kicked}`);
  return {
    ok: true,
    message: parts.join(' · '),
    meta: {
      conv: targets.slice(0, 20),
      repliedPeers: [...seen].slice(-300),
      welcomedKeys: [...welcomed].slice(-400),
      chatLog: log.slice(0, 60),
      chats: targets.length,
      replied,
      welcomed: welcomedN,
      moderated,
      kicked,
    },
  };
}
