import { load, mutate, toolOn } from '../db.mjs';
import {
  analyticsReport, publicCabinet, patchCabinet, teamPayload,
  inviteTeamMember, patchTeamMember, removeTeamMember,
  AI_AGENT_CARDS,
} from '../cabinet.mjs';
import { send, readBody, requireUser, publicOrigin } from '../http-api.mjs';
import { generateAiChat, readAiConfig } from '../ai.mjs';
import { rateLimitHit, RATE, clientIp } from '../hardening.mjs';

const ASSIST_PROMPTS = {
  'content-studio': 'Ты помощник контент-студии OnLead. Помоги с нишей, тоном бренда и темами постов VK на 7–30 дней. Отвечай кратко по-русски, списками.',
  'ai-images': 'Ты помощник генерации картинок для VK. Улучшай промпты обложек и креативов. Отвечай по-русски, одним улучшенным промптом и 2 альтернативами.',
  'ai-lead': 'Ты помощник AI лид-менеджера VK. Помоги с оффером, тоном ЛС и шаблоном ({name}). Коротко по-русски.',
  neurocomment: 'Ты помощник нейрокомментариев VK. Подскажи тон, темы и примеры уместных комментариев без спама. По-русски.',
};

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

  if (method === 'GET' && path === '/api/cabinet/agents') {
    const u = requireUser(req, res);
    if (!u) return true;
    const db = load();
    const user = db.users.find((x) => x.id === u.id);
    send(res, 200, {
      agents: AI_AGENT_CARDS.map((c) => ({
        ...c,
        unlocked: c.slug ? toolOn(user, c.slug, db.settings) : true,
      })),
    });
    return true;
  }

  if (method === 'POST' && path === '/api/ai/assist') {
    const u = requireUser(req, res);
    if (!u) return true;
    const hit = rateLimitHit(`ai-assist:${u.id}:${clientIp(req)}`, RATE.ai.max, RATE.ai.windowMs);
    if (!hit.ok) {
      send(res, 429, { error: 'Слишком много запросов. Подождите минуту.' }, { 'Retry-After': String(hit.retryAfter || 60) });
      return true;
    }
    const body = await readBody(req);
    const agent = String(body.agent || '').trim();
    const message = String(body.message || '').trim().slice(0, 2000);
    if (!message) {
      send(res, 400, { error: 'Пустой вопрос' });
      return true;
    }
    const system = ASSIST_PROMPTS[agent] || 'Ты помощник OnLead. Отвечай кратко по-русски.';
    try {
      const { text } = await generateAiChat(
        [
          { role: 'system', content: system },
          { role: 'user', content: message },
        ],
        readAiConfig(load().settings),
        { maxTokens: 400, temperature: 0.6 },
      );
      send(res, 200, { text: String(text || '').trim() });
    } catch (err) {
      send(res, 502, { error: err instanceof Error ? err.message : 'AI недоступен' });
    }
    return true;
  }

  if (method === 'GET' && path === '/api/analytics') {
    const u = requireUser(req, res);
    if (!u) return true;
    const days = Number(url.searchParams.get('days') || 30);
    send(res, 200, analyticsReport(load(), u.id, days));
    return true;
  }

  if (method === 'GET' && path === '/api/cabinet/settings') {
    const u = requireUser(req, res);
    if (!u) return true;
    const user = load().users.find((x) => x.id === u.id);
    send(res, 200, { cabinet: publicCabinet(user) });
    return true;
  }

  if (method === 'PATCH' && path === '/api/cabinet/settings') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    const cabinet = mutate((db) => {
      const x = db.users.find((i) => i.id === u.id);
      x.cabinet = patchCabinet(x, body);
      return x.cabinet;
    });
    send(res, 200, { cabinet: publicCabinet({ cabinet }) });
    return true;
  }

  if (method === 'GET' && path === '/api/team') {
    const u = requireUser(req, res);
    if (!u) return true;
    const payload = teamPayload(load(), u.actorId);
    send(res, 200, payload);
    return true;
  }

  if (method === 'POST' && path === '/api/team/invite') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    const result = mutate((db) => inviteTeamMember(db, u.actorId, body));
    if (!result.ok) {
      send(res, 400, { error: result.error });
      return true;
    }
    const out = { ok: true, added: result.added };
    if (result.invite) {
      out.invite = {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        status: 'pending',
      };
      out.inviteLink = `${publicOrigin(req)}/#/register?teamInvite=${encodeURIComponent(result.invite.token)}`;
    }
    if (result.member) out.member = result.member;
    send(res, 200, out);
    return true;
  }

  const teamMemberPatch = path.match(/^\/api\/team\/members\/([^/]+)$/);
  if (method === 'PATCH' && teamMemberPatch) {
    const u = requireUser(req, res);
    if (!u) return true;
    const targetId = decodeURIComponent(teamMemberPatch[1]);
    const body = await readBody(req);
    const result = mutate((db) => patchTeamMember(db, u.actorId, targetId, body));
    if (!result.ok) {
      send(res, 400, { error: result.error });
      return true;
    }
    send(res, 200, { ok: true, member: result.member });
    return true;
  }

  const teamMemberDelete = path.match(/^\/api\/team\/members\/([^/]+)$/);
  if (method === 'DELETE' && teamMemberDelete) {
    const u = requireUser(req, res);
    if (!u) return true;
    const targetId = decodeURIComponent(teamMemberDelete[1]);
    const result = mutate((db) => removeTeamMember(db, u.actorId, targetId));
    if (!result.ok) {
      send(res, 400, { error: result.error });
      return true;
    }
    send(res, 200, { ok: true, removed: result.removed });
    return true;
  }

  return false;
}
