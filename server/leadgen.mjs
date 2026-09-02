/** Leadgen config + scan runner (post2post leadgen.service, in-process). */
import { decryptToken } from './crypto.mjs';
import { load, mutate, toolOn } from './db.mjs';
import { vkListMemberGroups, vkScanGroupForPhrases } from './vk/leadgen.mjs';
import { notifyLeadgenMatches } from './notify.mjs';

const HOT = /ищу|нужен|нужна|посоветуйте|заказать|кто может/i;
const MAX_MATCHES = 120;

function accountToken(account) {
  if (!account?.tokenEnc) return null;
  if (String(account.tokenEnc).startsWith('mock:')) return account.tokenEnc;
  return decryptToken(account.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
}

const DEFAULT_LEADGEN_PHRASES = [
  { id: 'lg1', phrase: 'ищу специалиста', caseInsensitive: true },
  { id: 'lg2', phrase: 'нужен мастер', caseInsensitive: true },
  { id: 'lg3', phrase: 'посоветуйте', caseInsensitive: true },
  { id: 'lg4', phrase: 'кто может', caseInsensitive: true },
  { id: 'lg5', phrase: 'заказать', caseInsensitive: true },
];

function normalizeLeadgenPhrases(phrases) {
  return (phrases || []).map((p, i) => {
    const phrase = String(p.phrase || p.text || '').trim();
    if (!phrase) return null;
    return {
      id: p.id || `lg${i}${Date.now().toString(36).slice(-4)}`,
      phrase,
      caseInsensitive: p.caseInsensitive !== false,
    };
  }).filter(Boolean);
}

export function defaultLeadgenConfig(userId) {
  return {
    userId,
    accountId: null,
    enabled: true,
    scanTarget: 'all',
    scanIntervalMin: 30,
    postsLimit: 20,
    commentsPerPost: 20,
    excludePhrases: [],
    notifyEmail: true,
    notifyTelegram: false,
    telegramChatId: '',
    phrases: DEFAULT_LEADGEN_PHRASES.map((p) => ({ ...p })),
    groups: [],
    scanStatus: 'idle',
    lastScanAt: 0,
    lastError: '',
    scansToday: 0,
    scansDay: '',
  };
}

export function getLeadgenConfig(userId) {
  const db = load();
  db.leadgen = db.leadgen || [];
  let cfg = db.leadgen.find((c) => c.userId === userId);
  if (!cfg) {
    cfg = mutate((d) => {
      d.leadgen = d.leadgen || [];
      const c = defaultLeadgenConfig(userId);
      d.leadgen.push(c);
      return c;
    });
  } else {
    const normalized = normalizeLeadgenPhrases(cfg.phrases);
    const stale = (cfg.phrases || []).some((p) => p.text && !p.phrase);
    if (stale || normalized.length !== (cfg.phrases || []).length) {
      cfg = mutate((d) => {
        const c = d.leadgen.find((x) => x.userId === userId);
        if (c) c.phrases = normalized.length ? normalized : DEFAULT_LEADGEN_PHRASES.map((p) => ({ ...p }));
        return c;
      });
    }
  }
  return cfg;
}

export function publicLeadgen(cfg, userId) {
  const db = load();
  const matches = (db.leadgenMatches || []).filter((m) => m.userId === userId);
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...cfg,
    scansToday: cfg.scansDay === today ? cfg.scansToday : 0,
    matchCount: matches.length,
    newCount: matches.filter((m) => m.status === 'new').length,
  };
}

function hitExcluded(text, excludePhrases) {
  const hay = String(text || '').toLowerCase();
  return (excludePhrases || []).some((p) => {
    const n = String(p || '').trim().toLowerCase();
    return n && hay.includes(n);
  });
}

function scoreHit(text) {
  return HOT.test(text || '') ? 8 : 6;
}

export async function listLeadgenGroups(userId) {
  const cfg = getLeadgenConfig(userId);
  const db = load();
  const acc = db.accounts.find((a) => a.userId === userId && (a.id === cfg.accountId || !cfg.accountId))
    || db.accounts.find((a) => a.userId === userId);
  if (!acc) throw new Error('Сначала подключите VK-аккаунт');
  const token = accountToken(acc);
  if (!token) throw new Error('Нет токена VK');
  return vkListMemberGroups(token, { count: 1000 });
}

function failLeadgenScan(userId, message) {
  mutate((d) => {
    const c = d.leadgen.find((x) => x.userId === userId);
    if (!c) return;
    c.scanStatus = 'failed';
    c.lastError = message;
    c.lastScanAt = Date.now();
  });
}

export async function runLeadgenScan(userId, { manual = true } = {}) {
  const cfg = getLeadgenConfig(userId);
  const db = load();
  const user = db.users.find((u) => u.id === userId);
  const fail = (msg) => { failLeadgenScan(userId, msg); throw new Error(msg); };
  if (!user || !toolOn(user, 'leadgen-vk', db.settings)) fail('Лидогенератор не активен');
  if (!cfg.phrases?.length) fail('Добавьте поисковые фразы');
  if (!cfg.groups?.length) fail('Выберите сообщества для скана');
  const acc = db.accounts.find((a) => a.userId === userId && (a.id === cfg.accountId || !cfg.accountId))
    || db.accounts.find((a) => a.userId === userId);
  if (!acc) fail('Сначала подключите VK-аккаунт');
  const token = accountToken(acc);
  if (!token) fail('Нет токена VK');

  mutate((d) => {
    const c = d.leadgen.find((x) => x.userId === userId);
    c.scanStatus = 'running';
    c.lastError = '';
  });

  const phrases = cfg.phrases;
  const exclude = cfg.excludePhrases || [];
  const opts = {
    scanTarget: cfg.scanTarget || 'all',
    postsLimit: Number(cfg.postsLimit || 20),
    commentsPerPost: Number(cfg.commentsPerPost || 20),
    pauseMs: Number(db.settings.pauseMs || 350),
  };
  let inserted = 0;
  const errors = [];

  try {
    for (const g of cfg.groups) {
      const scan = await vkScanGroupForPhrases(token, String(g.externalGroupId || g.id), phrases, opts);
      if (scan.error) errors.push(`${g.name || g.externalGroupId}: ${scan.error}`);
      mutate((d) => {
        d.leadgenMatches = d.leadgenMatches || [];
        for (const hit of scan.hits || []) {
          if (inserted >= MAX_MATCHES) break;
          if (hitExcluded(hit.text, exclude)) continue;
          const dup = d.leadgenMatches.find((m) =>
            m.userId === userId && m.kind === hit.kind && m.externalId === hit.externalId);
          if (dup) {
            dup.text = hit.text;
            dup.matchedPhrase = hit.matchedPhrase;
            dup.authorName = hit.authorName || dup.authorName;
            dup.authorUrl = hit.authorUrl || dup.authorUrl;
            continue;
          }
          d.leadgenMatches.unshift({
            id: 'lg' + Date.now() + Math.random().toString(16).slice(2, 6),
            userId,
            kind: hit.kind,
            externalId: hit.externalId,
            parentExternalId: hit.parentExternalId,
            text: hit.text,
            authorId: hit.authorId,
            authorName: hit.authorName || hit.authorId || '—',
            authorUrl: hit.authorUrl,
            url: hit.url,
            matchedPhrase: hit.matchedPhrase,
            groupId: g.externalGroupId || g.id,
            groupName: g.name,
            status: 'new',
            stage: 'new',
            note: '',
            score: scoreHit(hit.text),
            foundAt: hit.foundAt || new Date().toISOString(),
            createdAt: Date.now(),
          });
          inserted += 1;
        }
        d.leadgenMatches = d.leadgenMatches.slice(0, 2000);
      });
      if (inserted >= MAX_MATCHES) break;
    }
  } catch (err) {
    mutate((d) => {
      const c = d.leadgen.find((x) => x.userId === userId);
      c.scanStatus = 'failed';
      c.lastError = err instanceof Error ? err.message : String(err);
      c.lastScanAt = Date.now();
    });
    throw err;
  }

  const today = new Date().toISOString().slice(0, 10);
  mutate((d) => {
    const c = d.leadgen.find((x) => x.userId === userId);
    if (c.scansDay !== today) { c.scansToday = 0; c.scansDay = today; }
    c.scansToday += 1;
    c.scanStatus = errors.length && !inserted ? 'failed' : 'idle';
    c.lastError = errors.slice(0, 3).join('; ');
    c.lastScanAt = Date.now();
    d.logs.unshift({
      id: 'log-' + Date.now(),
      at: new Date().toISOString(),
      level: inserted ? 'info' : 'warn',
      userId,
      message: `Лидогенератор: ${inserted} новых · ${manual ? 'вручную' : 'по расписанию'}${c.lastError ? ' · ' + c.lastError : ''}`,
    });
  });
  if (inserted) {
    const user = load().users.find((u) => u.id === userId);
    const cfgNow = getLeadgenConfig(userId);
    const samples = (load().leadgenMatches || [])
      .filter((m) => m.userId === userId && m.status === 'new')
      .slice(0, 5)
      .map((m) => ({ phrase: m.matchedPhrase, author: m.authorName, text: m.text, url: m.url }));
    notifyLeadgenMatches(user, cfgNow, { newCount: inserted, samples }).catch(() => {});
  }
  return { inserted, errors };
}

export function queueLeadgenScan(userId) {
  mutate((d) => {
    d.leadgen = d.leadgen || [];
    const c = d.leadgen.find((x) => x.userId === userId) || defaultLeadgenConfig(userId);
    if (!d.leadgen.includes(c)) d.leadgen.push(c);
    if (c.scanStatus === 'running') return;
    c.scanStatus = 'queued';
    c.lastError = '';
  });
}

export async function tickLeadgen() {
  const db = load();
  const today = new Date().toISOString().slice(0, 10);
  mutate((d) => {
    d.leadgen = d.leadgen || [];
    for (const cfg of d.leadgen) {
      if (cfg.scansDay !== today) { cfg.scansToday = 0; cfg.scansDay = today; }
      if (cfg.scanStatus === 'running' || cfg.scanStatus === 'queued') continue;
      if (!cfg.enabled || !cfg.phrases?.length || !cfg.groups?.length) continue;
      const user = db.users.find((u) => u.id === cfg.userId);
      if (!user || !toolOn(user, 'leadgen-vk', db.settings)) continue;
      const interval = Math.max(5, Number(cfg.scanIntervalMin || 30)) * 60 * 1000;
      if (!cfg.lastScanAt || Date.now() - cfg.lastScanAt >= interval) cfg.scanStatus = 'queued';
    }
  });
  const queued = load().leadgen.find((c) => c.scanStatus === 'queued');
  if (!queued) return;
  try {
    await runLeadgenScan(queued.userId, { manual: false });
  } catch (err) {
    console.error('[leadgen]', err.message || err);
  }
}

export function saveMatchToCrm(userId, matchId) {
  return mutate((d) => {
    const m = (d.leadgenMatches || []).find((x) => x.id === matchId && x.userId === userId);
    if (!m) throw new Error('Нет совпадения');
    m.status = 'saved';
    m.stage = m.stage === 'new' ? 'contacted' : m.stage;
    const already = d.leads.find((l) => l.userId === userId && l.vkId && String(l.vkId) === String(m.authorId) && l.source === 'Лидогенератор');
    if (already) {
      already.note = m.text.slice(0, 160);
      already.score = Math.max(already.score || 0, m.score || 6);
      return already;
    }
    const lead = {
      id: 'c' + Date.now(),
      userId,
      name: m.authorName || m.authorId || 'Лид VK',
      source: 'Лидогенератор',
      score: m.score || 6,
      stage: 'contacted',
      city: '—',
      note: `${m.matchedPhrase}: ${m.text}`.slice(0, 160),
      vkId: m.authorId,
      url: m.url,
    };
    d.leads.unshift(lead);
    return lead;
  });
}
