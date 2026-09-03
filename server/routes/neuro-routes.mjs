import { load, toolOn } from '../db.mjs';
import {
  getNeuroConfig, publicNeuro, neuroStats, listNeuroTasks, runNeuroDiscover,
  patchNeuroConfig, cancelNeuroTask, addNeuroTarget, removeNeuroTarget,
  addNeuroBlock, removeNeuroBlock, listNeuroDialogs, getNeuroDialogThread,
} from '../neurocomments.mjs';
import {
  getAiLeadConfig, publicAiLead, aiLeadStats, listAiLeadActions,
  patchAiLeadConfig, runAiLeadBatch,
} from '../ai-lead-tool.mjs';
import { send, sendFail, readBody, requireUser } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

if (path === '/api/neurocomments' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return true;
    const cfg = getNeuroConfig(u.id);
    const status = url.searchParams.get('status') || '';
    send(res, 200, {
      config: publicNeuro(cfg, u.id),
      stats: neuroStats(u.id),
      tasks: listNeuroTasks(u.id, status || undefined),
    });
  return true;
  }

  if (path === '/api/neurocomments' && method === 'PATCH') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const cfg = patchNeuroConfig(u.id, body);
    send(res, 200, { config: publicNeuro(cfg, u.id), stats: neuroStats(u.id) });
  return true;
  }

  if (method === 'POST' && path === '/api/neurocomments/discover') {
    const u = requireUser(req, res); if (!u) return true;
    if (!toolOn(u, 'neurocomment-vk', load().settings)) send(res, 403, { error: 'РќРµР№СЂРѕРєРѕРјРјРµРЅС‚Р°СЂРёРё РЅРµ Р°РєС‚РёРІРЅС‹' });
    try {
      const r = await runNeuroDiscover(u.id);
      send(res, 200, { ...r, tasks: listNeuroTasks(u.id), stats: neuroStats(u.id) });
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'POST' && path.match(/^\/api\/neurocomments\/tasks\/[^/]+\/cancel$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    cancelNeuroTask(u.id, id);
    send(res, 200, { tasks: listNeuroTasks(u.id), stats: neuroStats(u.id) });
  }

  if (method === 'POST' && path === '/api/neurocomments/targets') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    try {
      await addNeuroTarget(u.id, { mode: body.mode, raw: body.raw });
      const cfg = getNeuroConfig(u.id);
      send(res, 200, { config: publicNeuro(cfg, u.id) });
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'DELETE' && path.startsWith('/api/neurocomments/targets/')) {
    const u = requireUser(req, res); if (!u) return true;
    removeNeuroTarget(u.id, path.split('/').pop());
    send(res, 200, { config: publicNeuro(getNeuroConfig(u.id), u.id) });
  }

  if (method === 'GET' && path === '/api/neurocomments/blocks') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, { blocks: getNeuroConfig(u.id).blocks || [] });
  return true;
  }

  if (method === 'POST' && path === '/api/neurocomments/blocks') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    try {
      addNeuroBlock(u.id, body.recipientId, body.reason);
      send(res, 200, { blocks: getNeuroConfig(u.id).blocks || [] });
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'DELETE' && path.startsWith('/api/neurocomments/blocks/')) {
    const u = requireUser(req, res); if (!u) return true;
    removeNeuroBlock(u.id, path.split('/').pop());
    send(res, 200, { blocks: getNeuroConfig(u.id).blocks || [] });
  }

  if (method === 'GET' && path === '/api/neurocomments/dialogs') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, { dialogs: listNeuroDialogs(u.id) });
  return true;
  }

  if (method === 'GET' && path.match(/^\/api\/neurocomments\/dialogs\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    try {
      send(res, 200, await getNeuroDialogThread(u.id, id));
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (path === '/api/ai-lead' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, {
      config: publicAiLead(getAiLeadConfig(u.id), u.id),
      stats: aiLeadStats(u.id),
      actions: listAiLeadActions(u.id),
    });
  }

  if (path === '/api/ai-lead' && method === 'PATCH') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const cfg = patchAiLeadConfig(u.id, body);
    send(res, 200, {
      config: publicAiLead(cfg, u.id),
      stats: aiLeadStats(u.id),
    });
  return true;
  }

  if (method === 'POST' && path === '/api/ai-lead/run') {
    const u = requireUser(req, res); if (!u) return true;
    if (!toolOn(u, 'ai-lead-vk', load().settings)) send(res, 403, { error: 'AI Р›РёРґ-РјРµРЅРµРґР¶РµСЂ РЅРµ Р°РєС‚РёРІРµРЅ' });
    try {
      const r = await runAiLeadBatch(u.id);
      send(res, 200, {
        ...r,
        config: publicAiLead(getAiLeadConfig(u.id), u.id),
        actions: listAiLeadActions(u.id),
      });
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'GET' && path === '/api/ai-lead/actions') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, { actions: listAiLeadActions(u.id) });
  return true;
  }

  return false;
}
