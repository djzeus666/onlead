/** AI Lead Manager config, actions log, campaign sync (OL lead-dm parity). */
import { load, mutate } from './db.mjs';

const MAX_ACTIONS = 200;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function newId(prefix = 'al') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultAiLeadConfig(userId) {
  return {
    userId,
    enabled: false,
    accountId: null,
    source: 'friends',
    userIds: [],
    listId: null,
    groups: '',
    template: 'Привет, {name}!',
    useAi: true,
    offerHint: '',
    createCrmLead: true,
    dailyLimit: 15,
    style: 'Как вы пишете',
    score: '7+',
    autoAccept: true,
    campaignId: null,
    sentToday: 0,
    sentTodayDate: '',
    lastRunAt: null,
    lastError: null,
    actions: [],
  };
}

function withDayReset(cfg) {
  const key = todayKey();
  if (cfg.sentTodayDate === key) return cfg;
  return { ...cfg, sentToday: 0, sentTodayDate: key };
}

export function getAiLeadConfig(userId) {
  const db = load();
  db.aiLeadTools = db.aiLeadTools || [];
  let cfg = db.aiLeadTools.find((c) => c.userId === userId);
  if (!cfg) {
    cfg = mutate((d) => {
      d.aiLeadTools = d.aiLeadTools || [];
      const c = defaultAiLeadConfig(userId);
      d.aiLeadTools.push(c);
      return c;
    });
  }
  const normalized = withDayReset(cfg);
  if (normalized.sentToday !== cfg.sentToday || normalized.sentTodayDate !== cfg.sentTodayDate) {
    cfg = mutate((d) => {
      const c = d.aiLeadTools.find((x) => x.userId === userId);
      if (c) {
        c.sentToday = normalized.sentToday;
        c.sentTodayDate = normalized.sentTodayDate;
      }
      return c;
    });
  }
  return cfg;
}

export function publicAiLead(cfg, userId) {
  const c = withDayReset(cfg || getAiLeadConfig(userId));
  return {
    enabled: !!c.enabled,
    accountId: c.accountId || null,
    source: c.source || 'friends',
    userIds: (c.userIds || []).slice(0, 500),
    listId: c.listId || null,
    groups: c.groups || '',
    template: c.template || '',
    useAi: c.useAi !== false,
    offerHint: c.offerHint || '',
    createCrmLead: c.createCrmLead !== false,
    dailyLimit: Number(c.dailyLimit) || 15,
    style: c.style || 'Как вы пишете',
    score: c.score || '7+',
    autoAccept: c.autoAccept !== false,
    sentToday: Number(c.sentToday) || 0,
    lastRunAt: c.lastRunAt || null,
    lastError: c.lastError || null,
  };
}

export function configToPayload(cfg) {
  const sourceMap = {
    list: 'Свой список',
    friends: 'Друзья',
    audience_segment: 'Свой список',
  };
  const p = {
    source: sourceMap[cfg.source] || 'Друзья',
    offer: cfg.offerHint || '',
    style: cfg.style || 'Как вы пишете',
    score: cfg.score || '7+',
    autoAccept: cfg.autoAccept !== false ? 'Да' : 'Нет',
    perDay: Number(cfg.dailyLimit) || 15,
    delay: '15 мин',
    template: cfg.template || '',
    text: cfg.template || '',
    useAi: cfg.useAi !== false,
    createCrmLead: cfg.createCrmLead !== false,
    groups: cfg.groups || '',
  };
  if (cfg.source === 'list' && (cfg.userIds || []).length) {
    p.userIds = cfg.userIds;
  }
  if (cfg.source === 'audience_segment' && cfg.listId) {
    p.listId = cfg.listId;
  }
  return p;
}

function findCampaign(userId, cfg) {
  const db = load();
  if (cfg?.campaignId) {
    const byId = db.campaigns.find((c) => c.id === cfg.campaignId && c.userId === userId);
    if (byId) return byId;
  }
  const mine = db.campaigns.filter((c) => c.userId === userId && c.slug === 'ai-lead-vk');
  return mine.find((c) => c.status === 'running') || mine[0];
}

export function syncAiLeadCampaign(userId, cfgIn) {
  const cfg = cfgIn || getAiLeadConfig(userId);
  const payload = configToPayload(cfg);
  const existing = findCampaign(userId, cfg);

  if (!existing) {
    return mutate((d) => {
      const accId = cfg.accountId || d.accounts.find((a) => a.userId === userId && a.status === 'active')?.id;
      const c = {
        id: `t${Date.now()}`,
        userId,
        accountId: accId || null,
        slug: 'ai-lead-vk',
        status: cfg.enabled ? 'running' : 'paused',
        payload,
        title: 'AI Лид-менеджер',
        created: new Date().toISOString(),
        stats: { ok: 0, fail: 0 },
      };
      d.campaigns.unshift(c);
      const tool = d.aiLeadTools.find((x) => x.userId === userId);
      if (tool) tool.campaignId = c.id;
      return c;
    });
  }

  mutate((d) => {
    const c = d.campaigns.find((x) => x.id === existing.id);
    if (!c) return;
    c.payload = { ...c.payload, ...payload };
    if (cfg.accountId) c.accountId = cfg.accountId;
    c.status = cfg.enabled ? 'running' : 'paused';
    const tool = d.aiLeadTools.find((x) => x.userId === userId);
    if (tool && !tool.campaignId) tool.campaignId = c.id;
  });
  return load().campaigns.find((c) => c.id === existing.id);
}

export function aiLeadStats(userId) {
  const cfg = withDayReset(getAiLeadConfig(userId));
  const cam = findCampaign(userId, cfg);
  const dialogs = Object.values(cam?.stats?.aiDialogs || {});
  const dayKey = todayKey();
  const sentToday = cfg.sentTodayDate === dayKey
    ? Number(cfg.sentToday) || 0
    : (cam?.stats?.audienceDay === dayKey ? Number(cam.stats.ok) || 0 : 0);

  return {
    enabled: !!cfg.enabled,
    dailyLimit: Number(cfg.dailyLimit) || 15,
    sentToday,
    totalOk: cam?.stats?.ok || 0,
    errors: cam?.stats?.fail || 0,
    dialogs: dialogs.length,
    hot: dialogs.filter((d) => (d.score || 0) >= 8).length,
    lastRunAt: cfg.lastRunAt || cam?.stats?.updatedAt || null,
  };
}

export function listAiLeadActions(userId) {
  const cfg = getAiLeadConfig(userId);
  const cam = findCampaign(userId, cfg);
  const rows = [...(cfg.actions || [])];
  const seen = new Set(rows.map((r) => r.externalKey).filter(Boolean));

  for (const d of Object.values(cam?.stats?.aiDialogs || {})) {
    const key = `dlg-${d.vkId}`;
    if (seen.has(key)) continue;
    rows.push({
      id: key,
      targetLabel: d.name || `id ${d.vkId}`,
      status: (d.turns || 0) > 1 ? 'reply' : 'sent',
      detail: d.lastReply || d.opener || `скоринг ${d.score ?? '—'}/10`,
      createdAt: d.updatedAt || d.lastOutboundAt || cam?.stats?.updatedAt,
      externalKey: key,
    });
  }

  rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return rows.slice(0, 80);
}

export function appendAiLeadAction(userId, row) {
  mutate((d) => {
    d.aiLeadTools = d.aiLeadTools || [];
    let c = d.aiLeadTools.find((x) => x.userId === userId);
    if (!c) {
      c = defaultAiLeadConfig(userId);
      d.aiLeadTools.push(c);
    }
    const entry = {
      id: newId(),
      targetLabel: row.targetLabel || '—',
      status: row.status || (row.ok ? 'sent' : 'error'),
      detail: row.detail || row.message || '',
      createdAt: row.createdAt || new Date().toISOString(),
      externalKey: row.externalKey || null,
    };
    c.actions = [entry, ...(c.actions || [])].slice(0, MAX_ACTIONS);
    if (row.ok === false && row.detail) c.lastError = String(row.detail).slice(0, 240);
  });
}

export function recordAiLeadActionFromResult(userId, result) {
  if (!userId || !result || result.skip) return;
  const msg = String(result.message || '').trim();
  if (!msg) return;
  const m = msg.match(/Касание\s+([^(\n]+)/i);
  const target = m ? m[1].trim() : 'Контакт';
  appendAiLeadAction(userId, {
    targetLabel: target,
    status: result.ok ? 'sent' : 'error',
    detail: msg,
    ok: result.ok,
    externalKey: `step-${Date.now()}`,
  });
  if (result.ok) {
    mutate((d) => {
      const c = d.aiLeadTools?.find((x) => x.userId === userId);
      if (!c) return;
      const key = todayKey();
      if (c.sentTodayDate !== key) {
        c.sentToday = 0;
        c.sentTodayDate = key;
      }
      c.sentToday = (Number(c.sentToday) || 0) + 1;
      c.lastRunAt = new Date().toISOString();
      c.lastError = null;
    });
  }
}

export function patchAiLeadConfig(userId, body = {}) {
  const cfg = mutate((d) => {
    d.aiLeadTools = d.aiLeadTools || [];
    let c = d.aiLeadTools.find((x) => x.userId === userId);
    if (!c) {
      c = defaultAiLeadConfig(userId);
      d.aiLeadTools.push(c);
    }
    if (body.enabled != null) c.enabled = !!body.enabled;
    if (body.accountId != null) c.accountId = body.accountId || null;
    if (body.source != null) c.source = ['list', 'friends', 'audience_segment'].includes(body.source) ? body.source : c.source;
    if (body.userIds != null) {
      c.userIds = (Array.isArray(body.userIds) ? body.userIds : String(body.userIds).split(/[\s,;]+/))
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 500);
    }
    if (body.listId != null) c.listId = body.listId || null;
    if (body.groups != null) c.groups = String(body.groups || '').slice(0, 2000);
    if (body.template != null) c.template = String(body.template || '').slice(0, 4000);
    if (body.useAi != null) c.useAi = !!body.useAi;
    if (body.offerHint != null) c.offerHint = String(body.offerHint || '').slice(0, 2000);
    if (body.createCrmLead != null) c.createCrmLead = !!body.createCrmLead;
    if (body.dailyLimit != null) c.dailyLimit = Math.min(200, Math.max(1, Number(body.dailyLimit) || 15));
    if (body.style != null) c.style = String(body.style || 'Как вы пишете').slice(0, 80);
    if (body.score != null) c.score = String(body.score || '7+').slice(0, 8);
    if (body.autoAccept != null) c.autoAccept = !!body.autoAccept;
    return c;
  });
  syncAiLeadCampaign(userId, cfg);
  return getAiLeadConfig(userId);
}

export async function runAiLeadBatch(userId) {
  const { runCampaignStep, applyCampaignResult } = await import('./jobs.mjs');
  let cfg = getAiLeadConfig(userId);
  if (!cfg.enabled) throw new Error('Включите AI Лид-менеджер');

  const db = load();
  const accId = cfg.accountId || db.accounts.find((a) => a.userId === userId && a.status === 'active')?.id;
  if (!accId) throw new Error('Подключите VK-аккаунт');

  cfg = patchAiLeadConfig(userId, { accountId: accId, enabled: true });
  const cam = syncAiLeadCampaign(userId, cfg);
  if (!cam) throw new Error('Не удалось создать задачу');

  const statsBefore = aiLeadStats(userId);
  const left = Math.max(0, statsBefore.dailyLimit - statsBefore.sentToday);
  if (!left) throw new Error('Дневной лимит исчерпан');

  const batch = Math.min(5, left);
  let ok = 0;
  let fail = 0;
  let lastMsg = '';

  for (let i = 0; i < batch; i += 1) {
    const fresh = load().campaigns.find((c) => c.id === cam.id);
    if (!fresh || fresh.status !== 'running') break;
    const result = await runCampaignStep(fresh);
    applyCampaignResult(cam.id, result);
    lastMsg = String(result.message || lastMsg);
    if (result.skip && result.quiet) continue;
    if (result.ok) ok += 1;
    else fail += 1;
    if (result.done) break;
  }

  mutate((d) => {
    const c = d.aiLeadTools.find((x) => x.userId === userId);
    if (c) {
      c.lastRunAt = new Date().toISOString();
      if (fail && !ok) c.lastError = lastMsg.slice(0, 240);
    }
  });

  const stats = aiLeadStats(userId);
  const message = ok
    ? `Отправлено ${ok} касаний${fail ? ` · ошибок ${fail}` : ''}`
    : (lastMsg || 'Нет новых контактов — проверьте аудиторию или лимит');

  return {
    ok: ok > 0,
    message,
    stats,
    actions: listAiLeadActions(userId),
  };
}

export function tickAiLeadTools() {
  const db = load();
  for (const cfg of db.aiLeadTools || []) {
    if (!cfg.enabled) continue;
    syncAiLeadCampaign(cfg.userId, cfg);
  }
}
