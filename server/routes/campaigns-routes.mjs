import { load, mutate, TOOLS, toolOn } from '../db.mjs';
import { runCampaignStep, applyCampaignResult, tick } from '../jobs.mjs';
import { send, readBody, requireUser } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;

  if (method === 'POST' && path === '/api/campaigns') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    const slug = body.slug;
    if (!TOOLS.includes(slug) && slug !== 'landings-pro') { send(res, 400, { error: 'Неизвестный инструмент' }); return true; }
    if (!toolOn(load().users.find((x) => x.id === u.id), slug, load().settings) && slug !== 'landings-pro') {
      send(res, 403, { error: 'Инструмент не активен' });
      return true;
    }
    const acc = load().accounts.find((a) => a.userId === u.id && (a.id === body.accountId || !body.accountId));
    if (!acc && slug !== 'image-ai') { send(res, 400, { error: 'Подключите VK-аккаунт' }); return true; }
    const payload = body.payload || body;
    const defaultTitles = {
      'massliking-vk': 'Масслайкинг',
      'congratulation-vk': 'Автопоздравление',
      'invite-vk': 'Инвайтинг',
      'broom-vk': 'Веник',
      'autoposting-vk': 'Автопостинг',
      'lead-vk': 'Лид-менеджер',
      'ai-lead-vk': 'AI Лид-менеджер',
      'chat-manager-vk': 'Чат-менеджер',
      'neurocomment-vk': 'Нейрокомменты',
      'grabber-vk': 'Граббер',
      'autostoris-vk': 'Автосторис',
      'group-manager-vk': 'Менеджер групп',
      'image-ai': 'AI-картинка',
    };
    const cam = mutate((d) => {
      const c = {
        id: 't' + Date.now(), userId: u.id, accountId: acc?.id || null, slug,
        status: 'running', payload,
        title: String(body.title || defaultTitles[slug] || '').slice(0, 120),
        created: new Date().toISOString(),
        stats: { ok: 0, fail: 0 },
      };
      d.campaigns.unshift(c);
      return c;
    });
    if (slug === 'image-ai') {
      const result = await runCampaignStep(cam);
      applyCampaignResult(cam.id, result);
      send(res, 200, load().campaigns.find((c) => c.id === cam.id) || cam);
      return true;
    }
    tick().catch(() => {});
    send(res, 200, cam);
    return true;
  }

  if (method === 'POST' && path.startsWith('/api/campaigns/') && path.endsWith('/pause')) {
    const u = requireUser(req, res);
    if (!u) return true;
    const id = path.split('/')[3];
    mutate((d) => {
      const c = d.campaigns.find((x) => x.id === id && x.userId === u.id);
      if (c) c.status = c.status === 'running' ? 'paused' : 'running';
    });
    send(res, 200, { ok: true });
    return true;
  }

  if (method === 'PATCH' && path.match(/^\/api\/campaigns\/[^/]+$/)) {
    const u = requireUser(req, res);
    if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const cam = mutate((d) => {
      const c = d.campaigns.find((x) => x.id === id && x.userId === u.id);
      if (!c) return null;
      if (body.title != null) c.title = String(body.title).trim().slice(0, 160);
      if (body.status === 'paused' || body.status === 'running') c.status = body.status;
      return c;
    });
    if (!cam) { send(res, 404, { error: 'Задача не найдена' }); return true; }
    send(res, 200, cam);
    return true;
  }

  if (method === 'DELETE' && path.match(/^\/api\/campaigns\/[^/]+$/)) {
    const u = requireUser(req, res);
    if (!u) return true;
    const id = path.split('/').pop();
    mutate((d) => { d.campaigns = d.campaigns.filter((x) => !(x.id === id && x.userId === u.id)); });
    send(res, 200, { ok: true });
    return true;
  }

  return false;
}
