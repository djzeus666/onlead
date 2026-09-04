import { load, mutate, toolOn } from '../db.mjs';
import { runParser } from '../jobs.mjs';
import {
  CRM_STAGE_IDS, normalizeLead, normalizeLeadStage, listCrmAssignees,
} from '../crm.mjs';
import { send, sendFail, readBody, requireUser } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

if (method === 'POST' && path === '/api/parsers') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const slug = body.kind === 'groups' ? 'parsing-groups-vk' : 'parsing-accounts-vk';
    if (!toolOn(u, slug, load().settings)) send(res, 403, { error: 'Парсер не активен' });
    try {
      const list = await runParser(u.id, body.kind || 'accounts', body);
      send(res, 200, { ...list, items: undefined, count: list.count || list.items?.length || 0, id: list.id, name: list.name });
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'GET' && path.startsWith('/api/lists/')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const list = load().lists.find((l) => l.id === id && (!l.userId || l.userId === u.id));
    if (!list) { send(res, 404, { error: 'Список не найден' }); return true; }
    send(res, 200, { ...list, count: list.count || list.items?.length || 0, items: (list.items || []).slice(0, 1000) });
  }

  if (method === 'DELETE' && path.startsWith('/api/lists/')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    mutate((d) => { d.lists = d.lists.filter((l) => l.id !== id || (l.userId && l.userId !== u.id)); });
    send(res, 200, { ok: true });
  return true;
  }

  if (method === 'PATCH' && path.match(/^\/api\/lists\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) { send(res, 400, { error: 'Укажите название' }); return true; }
    const list = mutate((d) => {
      const l = d.lists.find((x) => x.id === id && (!x.userId || x.userId === u.id));
      if (!l) return null;
      l.name = name;
      return l;
    });
    if (!list) { send(res, 404, { error: 'Список не найден' }); return true; }
    send(res, 200, { ok: true, name: list.name });
  }

  if (method === 'POST' && path.startsWith('/api/lists/') && path.endsWith('/crm')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const list = load().lists.find((l) => l.id === id && (!l.userId || l.userId === u.id));
    if (!list) { send(res, 404, { error: 'Список не найден' }); return true; }
    let n = 0;
    mutate((d) => {
      for (const p of (list.items || []).slice(0, 200)) {
        const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || ('id' + p.id);
        d.leads.unshift({
          id: 'c' + Date.now() + Math.random().toString(16).slice(2),
          userId: u.id, name, source: list.name || 'Список', score: 5,
          stage: 'new', city: p.cityTitle || '—', note: '', vkId: p.id,
        });
        n += 1;
      }
    });
    send(res, 200, { ok: true, count: n });
  }

  if (method === 'GET' && path === '/api/crm/assignees') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, { members: listCrmAssignees(u) });
  return true;
  }

  if (method === 'POST' && path === '/api/leads') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const lead = mutate((d) => {
      const l = {
        id: 'c' + Date.now(), userId: u.id, name: body.name || 'Новый контакт',
        source: body.source || 'Вручную', score: Number(body.score || 5),
        stage: normalizeLeadStage(body.stage || 'new'), city: body.city || '—', note: body.note || '',
        assigneeUserId: body.assigneeUserId || null,
      };
      d.leads.unshift(l);
      return l;
    });
    send(res, 200, lead);
  return true;
  }

  if (method === 'PATCH' && path.startsWith('/api/leads/')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const lead = mutate((d) => {
      const l = d.leads.find((x) => x.id === id && x.userId === u.id);
      if (!l) return null;
      if (body.name != null) l.name = String(body.name).trim().slice(0, 80) || l.name;
      if (body.note != null) l.note = String(body.note).trim().slice(0, 500);
      if (body.city != null) l.city = String(body.city).trim().slice(0, 80) || '—';
      if (body.phone != null) l.phone = String(body.phone).trim().slice(0, 40);
      if (body.stage) {
        const st = normalizeLeadStage(body.stage);
        if (CRM_STAGE_IDS.includes(st)) l.stage = st;
      }
      if (body.assigneeUserId !== undefined) {
        l.assigneeUserId = body.assigneeUserId ? String(body.assigneeUserId) : null;
      }
      if (body.archived === true || body.archived === false) l.archived = !!body.archived;
      return l;
    });
    if (!lead) { send(res, 404, { error: 'Лид не найден' }); return true; }
    send(res, 200, { ok: true, lead: normalizeLead(lead) });
  }

  if (method === 'DELETE' && path.startsWith('/api/leads/')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    mutate((d) => { d.leads = d.leads.filter((x) => !(x.id === id && x.userId === u.id)); });
    send(res, 200, { ok: true });
  return true;
  }

  return false;
}
