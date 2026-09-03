import { load, mutate, toolOn } from '../db.mjs';
import {
  getLeadgenConfig, publicLeadgen, listLeadgenGroups, runLeadgenScan, saveMatchToCrm,
} from '../leadgen.mjs';
import { scoreLeadgenMatch, draftLeadgenMatchReply } from '../leadgen-ai.mjs';
import { send, sendFail, readBody, requireUser } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

if (path === '/api/leadgen' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, publicLeadgen(getLeadgenConfig(u.id), u.id));
  return true;
  }

  if (path === '/api/leadgen' && method === 'PATCH') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const cfg = mutate((d) => {
      d.leadgen = d.leadgen || [];
      let c = d.leadgen.find((x) => x.userId === u.id);
      if (!c) {
        c = { userId: u.id, accountId: null, enabled: false, scanTarget: 'all', scanIntervalMin: 30, postsLimit: 20, commentsPerPost: 20, excludePhrases: [], phrases: [], groups: [], scanStatus: 'idle', lastScanAt: 0, lastError: '', scansToday: 0, scansDay: '' };
        d.leadgen.push(c);
      }
      if (body.accountId != null) c.accountId = body.accountId || null;
      if (body.enabled != null) c.enabled = !!body.enabled;
      if (body.scanTarget) c.scanTarget = ['all', 'posts', 'comments'].includes(body.scanTarget) ? body.scanTarget : c.scanTarget;
      if (body.scanIntervalMin != null) c.scanIntervalMin = Math.max(5, Math.min(1440, Number(body.scanIntervalMin) || 30));
      if (body.postsLimit != null) c.postsLimit = Math.max(5, Math.min(100, Number(body.postsLimit) || 20));
      if (body.commentsPerPost != null) c.commentsPerPost = Math.max(0, Math.min(100, Number(body.commentsPerPost) || 20));
      if (Array.isArray(body.excludePhrases)) c.excludePhrases = body.excludePhrases.map((s) => String(s).trim()).filter(Boolean).slice(0, 100);
      if (body.notifyEmail != null) c.notifyEmail = !!body.notifyEmail;
      if (body.notifyTelegram != null) c.notifyTelegram = !!body.notifyTelegram;
      if (body.telegramChatId != null) c.telegramChatId = String(body.telegramChatId || '').trim().slice(0, 32);
      return c;
    });
    send(res, 200, publicLeadgen(cfg, u.id));
  return true;
  }

  if (method === 'GET' && path === '/api/leadgen/groups') {
    const u = requireUser(req, res); if (!u) return true;
    try { send(res, 200, await listLeadgenGroups(u.id)); }
    catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'PUT' && path === '/api/leadgen/groups') {
    const u = requireUser(req, res); if (!u) return true;
    getLeadgenConfig(u.id);
    const body = await readBody(req);
    const groups = (body.groups || []).map((g) => ({
      externalGroupId: String(g.externalGroupId || g.id || '').replace(/^-/, ''),
      name: String(g.name || g.externalGroupId || ''),
      screenName: g.screenName,
    })).filter((g) => g.externalGroupId).slice(0, 1000);
    const cfg = mutate((d) => {
      const c = d.leadgen.find((x) => x.userId === u.id);
      c.groups = groups;
      return c;
    });
    send(res, 200, publicLeadgen(cfg, u.id));
  }

  if (method === 'PUT' && path === '/api/leadgen/phrases') {
    const u = requireUser(req, res); if (!u) return true;
    getLeadgenConfig(u.id);
    const body = await readBody(req);
    const phrases = (body.phrases || []).map((p) => ({
      id: p.id || 'ph' + Math.random().toString(36).slice(2, 8),
      phrase: String(p.phrase || p).trim(),
      caseInsensitive: p.caseInsensitive !== false,
    })).filter((p) => p.phrase).slice(0, 80);
    const cfg = mutate((d) => {
      const c = d.leadgen.find((x) => x.userId === u.id);
      c.phrases = phrases;
      return c;
    });
    send(res, 200, publicLeadgen(cfg, u.id));
  return true;
  }

  if (method === 'POST' && path === '/api/leadgen/scan') {
    const u = requireUser(req, res); if (!u) return true;
    if (!toolOn(u, 'leadgen-vk', load().settings)) send(res, 403, { error: 'Р›РёРґРѕРіРµРЅРµСЂР°С‚РѕСЂ РЅРµ Р°РєС‚РёРІРµРЅ' });
    const cfg = getLeadgenConfig(u.id);
    if (!cfg.phrases?.length) { send(res, 400, { error: 'Р”РѕР±Р°РІСЊС‚Рµ РїРѕРёСЃРєРѕРІС‹Рµ С„СЂР°Р·С‹' }); return true; }
    if (!cfg.groups?.length) { send(res, 400, { error: 'Р’С‹Р±РµСЂРёС‚Рµ СЃРѕРѕР±С‰РµСЃС‚РІР° РґР»СЏ СЃРєР°РЅР°' }); return true; }
    if (cfg.scanStatus === 'running') { send(res, 200, { queued: true, ...publicLeadgen(cfg, u.id) }); return true; }
    mutate((d) => {
      const c = d.leadgen.find((x) => x.userId === u.id);
      if (c) { c.scanStatus = 'queued'; c.lastError = ''; }
    });
    runLeadgenScan(u.id, { manual: true }).catch((err) => console.error('[leadgen scan]', err.message || err));
    send(res, 200, { queued: true, ...publicLeadgen(getLeadgenConfig(u.id), u.id) });
  }

  if (method === 'GET' && path === '/api/leadgen/matches') {
    const u = requireUser(req, res); if (!u) return true;
    const status = url.searchParams.get('status');
    const kind = url.searchParams.get('kind');
    const phrase = url.searchParams.get('phrase');
    const author = url.searchParams.get('author');
    let list = (load().leadgenMatches || []).filter((m) => m.userId === u.id);
    if (status) list = list.filter((m) => m.status === status);
    if (kind) list = list.filter((m) => m.kind === kind);
    if (phrase) {
      const q = phrase.trim().toLowerCase();
      list = list.filter((m) => String(m.matchedPhrase || '').toLowerCase().includes(q) || String(m.text || '').toLowerCase().includes(q));
    }
    if (author) {
      const q = author.trim().toLowerCase();
      list = list.filter((m) => String(m.authorName || '').toLowerCase().includes(q));
    }
    send(res, 200, list.slice(0, 200));
  return true;
  }

  if (method === 'POST' && path.match(/^\/api\/leadgen\/matches\/[^/]+\/ai-score$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    try {
      const match = await scoreLeadgenMatch(u.id, id);
      send(res, 200, match);
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'POST' && path.match(/^\/api\/leadgen\/matches\/[^/]+\/ai-draft$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    try {
      const match = await draftLeadgenMatchReply(u.id, id);
      send(res, 200, match);
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'PATCH' && path.startsWith('/api/leadgen/matches/')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    if (body.status === 'saved' || body.saveToCrm) {
      try {
        const lead = saveMatchToCrm(u.id, id);
        const match = load().leadgenMatches.find((m) => m.id === id);
        send(res, 200, { match, lead });
      return true;
      } catch (err) { sendFail(res, err); ; return true; }
    }
    const match = mutate((d) => {
      const m = (d.leadgenMatches || []).find((x) => x.id === id && x.userId === u.id);
      if (!m) return null;
      if (body.status) m.status = body.status;
      if (body.stage) m.stage = body.stage;
      if (body.note != null) m.note = String(body.note);
      if (body.notes != null) m.note = String(body.notes);
      return m;
    });
    if (!match) { send(res, 404, { error: 'РќРµС‚ СЃРѕРІРїР°РґРµРЅРёСЏ' }); return true; }
    send(res, 200, match);
  }

  if (method === 'DELETE' && path.startsWith('/api/leadgen/matches/')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    mutate((d) => { d.leadgenMatches = (d.leadgenMatches || []).filter((m) => !(m.id === id && m.userId === u.id)); });
    send(res, 200, { ok: true });
  return true;
  }

  return false;
}
