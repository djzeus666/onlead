/** AI Лид-менеджер: follow-up turns in VK DM after the opener. */
import { vkCall, isMock } from './call.mjs';
import { vkSendMessage } from './growth.mjs';
import { generateLeadReply, scoreLead } from '../ai.mjs';

export const MAX_DIALOG_TURNS = 12;
export const MAX_ACTIVE_DIALOGS = 80;

export function getAiDialogs(stats = {}) {
  return { ...(stats.aiDialogs || {}) };
}

export function trimAiDialogs(dialogs = {}) {
  const rows = Object.entries(dialogs);
  if (rows.length <= MAX_ACTIVE_DIALOGS) return dialogs;
  rows.sort((a, b) => Number(b[1]?.lastOutboundAt || 0) - Number(a[1]?.lastOutboundAt || 0));
  return Object.fromEntries(rows.slice(0, MAX_ACTIVE_DIALOGS));
}

export async function fetchPeerHistory(token, peerId, count = 20) {
  if (isMock(token)) {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: 1, out: 1, text: 'Привет! Интересна тема?', date: now - 7200 },
      { id: 2, out: 0, text: 'Да, расскажите подробнее', date: now - 120 },
    ];
  }
  const hist = await vkCall('messages.getHistory', { peer_id: Number(peerId), count }, token);
  return (hist.items || []).slice().reverse();
}

export function latestInbound(history, afterId = 0) {
  let best = null;
  for (const msg of history) {
    if (msg.out) continue;
    if (Number(msg.id) <= Number(afterId)) continue;
    const text = String(msg.text || '').trim();
    if (!text) continue;
    best = msg;
  }
  return best;
}

export function historyTranscript(history, limit = 12) {
  return history
    .slice(-limit)
    .map((m) => ({
      role: m.out ? 'assistant' : 'user',
      text: String(m.text || '').trim(),
    }))
    .filter((m) => m.text);
}

export function syncCrmLead(d, userId, dialog, replyText, score, scoreReason, threshold) {
  const vkId = Number(dialog.vkId);
  if (!vkId) return;
  const lead = (d.leads || []).find((l) => l.userId === userId && Number(l.vkId) === vkId);
  const note = `${scoreReason || ''}${scoreReason ? ' · ' : ''}${replyText.slice(0, 100)}`.trim();
  if (lead) {
    lead.score = score;
    if (lead.stage === 'new') lead.stage = 'contacted';
    if (score >= 8) lead.stage = 'qualified';
    lead.note = note;
    return;
  }
  if (score < threshold) return;
  d.leads.unshift({
    id: 'c' + Date.now(),
    userId,
    name: dialog.name || `id${vkId}`,
    source: 'AI Лид-менеджер',
    score,
    stage: score >= 8 ? 'qualified' : 'contacted',
    city: '—',
    note,
    vkId,
  });
}

/**
 * Check active dialogs for new inbound messages and reply with AI.
 * Returns { handled, result? } — outreach should run only when handled is false.
 */
export async function runAiLeadDialogStep({
  msgToken,
  dialogs,
  payload,
  ai,
  offer,
  threshold,
  userId,
  mutateFn,
}) {
  const entries = Object.entries(dialogs)
    .filter(([, d]) => (d.turns || 0) < MAX_DIALOG_TURNS)
    .sort((a, b) => Number(b[1].lastInboundAt || 0) - Number(a[1].lastInboundAt || 0));

  for (const [peerKey, dialog] of entries) {
    const peerId = Number(dialog.vkId || peerKey);
    if (!peerId) continue;

    let history;
    try {
      history = await fetchPeerHistory(msgToken, peerId);
    } catch {
      continue;
    }

    const inbound = latestInbound(history, dialog.lastSeenMessageId || 0);
    if (!inbound) continue;

    const transcript = historyTranscript(history);
    const replyText = String(inbound.text || '').trim();
    const firstName = String(dialog.name || '').split(/\s+/)[0] || 'друг';

    let text;
    try {
      text = await generateLeadReply({
        person: { firstName },
        offer,
        style: payload.style,
        history: transcript,
      }, ai);
    } catch (err) {
      return {
        handled: true,
        result: {
          ok: false,
          message: `Диалог ${dialog.name || peerId}: AI не ответил`,
          adminMessage: err instanceof Error ? err.message : String(err),
          meta: { aiDialogs: dialogs },
        },
      };
    }

    const r = await vkSendMessage(msgToken, peerId, text);
    if (!r.ok) {
      return {
        handled: true,
        result: {
          ok: false,
          message: r.message || 'Не удалось отправить ответ',
          meta: { aiDialogs: dialogs },
        },
      };
    }

    let score = Number(dialog.score || 5);
    let scoreReason = String(dialog.scoreReason || '');
    try {
      const graded = await scoreLead({
        person: { firstName },
        offer,
        sourceHint: '',
        reply: replyText,
      }, ai);
      score = graded.score;
      scoreReason = graded.reason;
    } catch {
      /* keep previous score */
    }

    const updated = {
      ...dialog,
      vkId: peerId,
      lastSeenMessageId: Number(inbound.id),
      lastInboundAt: Date.now(),
      lastOutboundAt: Date.now(),
      turns: (dialog.turns || 1) + 1,
      score,
      scoreReason,
      lastReply: text.slice(0, 200),
    };
    dialogs[peerKey] = updated;

    if (mutateFn) mutateFn(updated, replyText, score, scoreReason);

    return {
      handled: true,
      result: {
        ok: true,
        message: `Ответ ${dialog.name || firstName} · ход ${updated.turns} · скоринг ${score}/10`,
        adminMessage: scoreReason || undefined,
        meta: { aiDialogs: trimAiDialogs(dialogs) },
      },
    };
  }

  return { handled: false };
}
