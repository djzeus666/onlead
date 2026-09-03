import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, randomToken, verifyPassword } from './crypto.mjs';
import { looksLikeImageModel } from './ai.mjs';
import { isProd } from './hardening.mjs';
import { columnBotsCount, columnJobsCount, columnLeadsCount, columnUsersCount, docsCount, readStoreFromTables, SCHEMA_VERSION, schemaVersion, writeStoreToTables } from './schema.mjs';
import { openSqlite, readStoreBlob, sqliteReady, writeStoreBlob } from './sqlite.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'store.json');

const PACKAGES = {
  business: ['leadgen-vk', 'lead-vk', 'massliking-vk', 'autoposting-vk', 'congratulation-vk', 'broom-vk', 'group-manager-vk', 'parsing-accounts-vk', 'parsing-groups-vk'],
  'maxi-ai': ['leadgen-vk', 'image-ai', 'ai-lead-vk', 'neurocomment-vk', 'massliking-vk', 'autoposting-vk', 'autostoris-vk', 'lead-vk', 'congratulation-vk', 'grabber-vk', 'invite-vk', 'chat-manager-vk', 'parsing-accounts-vk', 'parsing-groups-vk'],
  maxi: ['leadgen-vk', 'grabber-vk', 'invite-vk', 'chat-manager-vk', 'autoposting-vk', 'autostoris-vk', 'massliking-vk', 'congratulation-vk', 'lead-vk', 'broom-vk', 'group-manager-vk', 'image-ai', 'parsing-accounts-vk', 'parsing-groups-vk'],
};

const TOOLS = [
  'leadgen-vk', 'ai-lead-vk', 'neurocomment-vk', 'image-ai', 'lead-vk', 'massliking-vk',
  'grabber-vk', 'autoposting-vk', 'congratulation-vk', 'invite-vk', 'autostoris-vk',
  'broom-vk', 'chat-manager-vk', 'group-manager-vk', 'lists', 'parsing-accounts-vk', 'parsing-groups-vk',
];

function empty() {
  const now = Date.now();
  return {
    users: [],
    sessions: [],
    accounts: [],
    campaigns: [],
    jobs: [],
    leads: [],
    lists: [],
    landings: [
      {
        id: 'p1', userId: 'u-admin', name: 'Запись на консультацию',
        url: 'https://onlead.m360-ural.online/#/p/p1',
        slug: 'consult', template: 'consult', leads: 0, status: 'draft',
        headline: 'Запишитесь на консультацию',
        sub: 'За 30 минут разберём задачу и дадим понятный план. Без воды и обязательств.',
        cta: 'Записаться',
        features: ['30 минут разбора', 'План следующих шагов', 'Можно онлайн'],
        fields: ['name', 'phone', 'comment'],
        tone: 'teal',
        layout: 'studio',
        kicker: 'личная встреча',
        stats: [{ n: '30 мин', l: 'встреча' }, { n: '12+', l: 'ниш' }, { n: '24 ч', l: 'ответ' }],
        meta: { duration: '30 минут', place: 'онлайн / студия', when: 'пн–сб' },
      },
    ],
    bots: [],
    tgChannels: [],
    tgChannelAccess: [],
    tgFunnels: [],
    ops: [],
    logs: [],
    leadgen: [],
    leadgenMatches: [],
    neurocomments: [],
    contentPosts: [],
    pubLogs: [],
    rssSources: [],
    rssItems: [],
    hostedLeadBots: [],
    aiLeadTools: [],
    payments: [],
    emailTokens: [],
    tgSessions: [],
    tgReceipts: [],
    settings: {
      trialHours: 72,
      referralPercent: 7,
      vkAppId: process.env.VK_APP_ID || '',
      vkMessagesAppId: process.env.VK_MESSAGES_APP_ID || '6463690',
      /** Cabinet UI for messages token (online-lead.ru app 6463690). */
      vkMessagesUiEnabled: true,
      toolsEnabled: Object.fromEntries(TOOLS.map((s) => [s, true])),
      pauseMs: 400,
      dailyLimit: 80,
      legal: { operator: '', inn: '', ogrn: '', address: '', email: '' },
      ai: { providerId: '', baseUrl: '', model: '', imageModel: '', apiKeyEnc: '', keyMask: '' },
      promo: {
        enabled: true,
        title: 'Розыгрыш Maxi',
        text: 'Подключите пакет Maxi — участвуйте в розыгрыше месяца подписки',
        href: '#/office/subscriptions',
        until: 0,
      },
    },
    createdAt: now,
  };
}

function seed(store) {
  if (store.users.length) return store;
  const trialUntil = Date.now() + (store.settings.trialHours || 72) * 3600 * 1000;
  const adminPass = String(process.env.ADMIN_PASSWORD || '').trim();
  if (isProd() && (!adminPass || adminPass === 'admin1234')) {
    throw new Error('Пустой store.json: задайте ADMIN_PASSWORD в .env.prod (не admin1234) и перезапустите.');
  }
  store.users.push({
    id: 'u-admin',
    name: 'Администратор',
    email: (process.env.ADMIN_EMAIL || 'admin@onlead.local').toLowerCase(),
    passwordHash: hashPassword(adminPass || 'admin1234'),
    role: 'admin',
    balance: 0,
    refBalance: 0,
    trialUntil: 0,
    packageId: null,
    enabledTools: {},
    accountSlots: 10,
    referral: { invited: 0, paying: 0, earned: 0, code: 'ADMIN' },
    banned: false,
    emailVerified: true,
    createdAt: Date.now(),
  });
  if (!isProd()) {
    store.users.push({
      id: 'u-demo',
      name: 'Артём Литвинов',
      email: 'artem@onlead.local',
      passwordHash: hashPassword('demo1234'),
      role: 'user',
      balance: 0,
      refBalance: 0,
      trialUntil,
      packageId: null,
      enabledTools: {},
      accountSlots: 3,
      referral: { invited: 0, paying: 0, earned: 0, code: randomToken(4).slice(0, 8).toUpperCase() },
      banned: false,
      emailVerified: true,
      createdAt: Date.now(),
    });
    store.ops.push({ id: 'o1', userId: 'u-demo', at: new Date().toISOString(), title: 'Триал 72 часа', amount: 0 });
  }
  return store;
}

function lockDownSeedAccounts(store) {
  if (!isProd()) return false;
  let changed = false;
  const dropSessions = new Set();
  for (const u of store.users || []) {
    const email = String(u.email || '').toLowerCase();
    if (email === 'artem@onlead.local' && !u.banned) {
      u.banned = true;
      dropSessions.add(u.id);
      changed = true;
    }
    const seedHash = verifyPassword('demo1234', u.passwordHash) || verifyPassword('admin1234', u.passwordHash);
    if (!seedHash) continue;
    if (u.role === 'admin') {
      const envPass = String(process.env.ADMIN_PASSWORD || '').trim();
      if (envPass && envPass !== 'admin1234') {
        u.passwordHash = hashPassword(envPass);
        u.seedPassword = false;
        dropSessions.add(u.id);
        changed = true;
        console.warn('[security] Пароль admin сменён с seed на ADMIN_PASSWORD из окружения.');
      } else {
        u.seedPassword = true;
        changed = true;
        console.error('[security] У admin остался seed-пароль. Задайте ADMIN_PASSWORD в .env.prod (не admin1234) и перезапустите.');
      }
    } else {
      u.banned = true;
      u.seedPassword = true;
      dropSessions.add(u.id);
      changed = true;
    }
  }
  if (dropSessions.size) {
    const before = (store.sessions || []).length;
    store.sessions = (store.sessions || []).filter((s) => !dropSessions.has(s.userId));
    if (store.sessions.length !== before) changed = true;
  }
  return changed;
}

function normalizeStore(store) {
  store.settings = { ...empty().settings, ...(store.settings || {}) };
  store.settings.legal = { ...empty().settings.legal, ...(store.settings.legal || {}) };
  // Env wins when DB legal is blank (survives dual-process overwrite / compose recreate).
  const envOp = String(process.env.LEGAL_OPERATOR || '').trim();
  const envInn = String(process.env.LEGAL_INN || '').replace(/\D/g, '').slice(0, 12);
  const envOgrn = String(process.env.LEGAL_OGRN || '').replace(/\D/g, '').slice(0, 15);
  const envAddr = String(process.env.LEGAL_ADDRESS || '').trim();
  const envEmail = String(process.env.LEGAL_EMAIL || process.env.SMTP_FROM || '').trim();
  if (!store.settings.legal.operator && envOp) store.settings.legal.operator = envOp.slice(0, 160);
  if (!store.settings.legal.inn && envInn) store.settings.legal.inn = envInn;
  if (!store.settings.legal.ogrn && envOgrn) store.settings.legal.ogrn = envOgrn;
  if (!store.settings.legal.address && envAddr) store.settings.legal.address = envAddr.slice(0, 240);
  if (!store.settings.legal.email && envEmail) store.settings.legal.email = envEmail.slice(0, 120);
  const legacy = String(store.settings.vkAppId || '').trim();
  if (legacy === '53828134' || legacy === '54690675') {
    store.settings.vkAppId = '5530956';
  }
  const msgApp = String(store.settings.vkMessagesAppId || '').trim();
  if (!msgApp || msgApp === '2685278') {
    if (store.settings.vkMessagesUiEnabled !== true) store.settings.vkMessagesUiEnabled = true;
    store.settings.vkMessagesAppId = '6463690';
  }
  store.settings.ai = store.settings.ai || {};
  store.settings.promo = { ...empty().settings.promo, ...(store.settings.promo || {}) };
  if (store.settings.ai.imageModel && !looksLikeImageModel(store.settings.ai.imageModel)) {
    console.warn(`[db] imageModel "${store.settings.ai.imageModel}" не похож на image-модель — сброшен на пресет провайдера.`);
    store.settings.ai.imageModel = '';
  }
  store.logs = store.logs || [];
  store.jobs = store.jobs || [];
  store.leadgen = store.leadgen || [];
  store.leadgenMatches = store.leadgenMatches || [];
  store.neurocomments = store.neurocomments || [];
  store.contentPosts = store.contentPosts || [];
  store.pubLogs = store.pubLogs || [];
  store.rssSources = store.rssSources || [];
  store.rssItems = store.rssItems || [];
  store.hostedLeadBots = store.hostedLeadBots || [];
  store.aiLeadTools = store.aiLeadTools || [];
  store.payments = store.payments || [];
  store.emailTokens = store.emailTokens || [];
  store.tgChannels = store.tgChannels || [];
  store.tgChannelAccess = store.tgChannelAccess || [];
  store.tgFunnels = store.tgFunnels || [];
  store.tgSessions = store.tgSessions || [];
  store.tgReceipts = store.tgReceipts || [];
  const toolSlugs = [...TOOLS, 'landings-pro'];
  store.settings.toolsEnabled = {
    ...Object.fromEntries(toolSlugs.map((s) => [s, true])),
    ...(store.settings.toolsEnabled || {}),
  };
  for (const slug of toolSlugs) {
    if (store.settings.toolsEnabled[slug] !== false) store.settings.toolsEnabled[slug] = true;
  }
  for (const u of store.users || []) {
    if (u.emailVerified === undefined) u.emailVerified = true;
    if (u.cabinet) u.cabinet = { ...(u.cabinet || {}) };
  }
  for (const l of store.landings || []) {
    if (!l.headline) l.headline = l.name || 'Заголовок';
    if (l.sub == null) l.sub = 'Оставьте заявку — перезвоним в рабочее время.';
    if (!l.cta) l.cta = 'Оставить заявку';
    if (!Array.isArray(l.features)) l.features = [];
    if (!Array.isArray(l.fields) || !l.fields.length) l.fields = ['name', 'phone'];
    if (!l.tone) l.tone = 'teal';
    if (!l.template) l.template = 'consult';
  }
  const admin = (store.users || []).find((u) => u.role === 'admin');
  if (admin) {
    for (const l of store.landings || []) {
      if (!l.userId) l.userId = admin.id;
    }
  }
  return store;
}

let cache = null;
let engine = 'json';
let schemaVer = 0;

function readJsonFile() {
  if (!existsSync(DATA)) return null;
  return JSON.parse(readFileSync(DATA, 'utf8'));
}

function writeJsonFile(store) {
  mkdirSync(dirname(DATA), { recursive: true });
  const json = JSON.stringify(store, null, 2);
  const tmp = DATA + '.tmp';
  writeFileSync(tmp, json);
  try {
    renameSync(tmp, DATA);
  } catch {
    try { unlinkSync(DATA); } catch { /* ignore */ }
    renameSync(tmp, DATA);
  }
}

export function storageEngine() {
  return engine;
}

export function storageSchema() {
  return schemaVer;
}

export function load() {
  if (cache) return cache;
  mkdirSync(dirname(DATA), { recursive: true });
  try {
    openSqlite();
    engine = 'sqlite';
  } catch (err) {
    if (isProd()) {
      throw new Error(
        `[db] production requires built-in SQLite (NODE_OPTIONS=--experimental-sqlite): ${err.message}`,
      );
    }
    console.warn('[db] sqlite unavailable, JSON only:', err.message);
    engine = 'json';
  }
  let store = null;
  if (engine === 'sqlite') {
    try {
      const ver = schemaVersion();
      if (ver >= 2 && (docsCount() > 0 || columnUsersCount() > 0 || columnLeadsCount() > 0 || columnBotsCount() > 0 || columnJobsCount() > 0)) {
        store = readStoreFromTables();
        engine = 'sqlite-schema';
        schemaVer = ver;
      }
    } catch (err) {
      console.warn('[db] schema read', err.message);
    }
    if (!store) {
      const blob = readStoreBlob();
      if (blob) store = JSON.parse(blob);
    }
  }
  if (!store) store = readJsonFile();
  if (!store) {
    cache = seed(empty());
    save();
    return cache;
  }
  cache = normalizeStore(store);
  if (lockDownSeedAccounts(cache)) save();
  else if (engine === 'sqlite') save();
  else if (engine === 'sqlite-schema' && schemaVer < SCHEMA_VERSION) save();
  return cache;
}

export function save() {
  if (!cache) return;
  if ((engine === 'sqlite' || engine === 'sqlite-schema') && sqliteReady()) {
    try {
      writeStoreToTables(cache);
      engine = 'sqlite-schema';
      schemaVer = SCHEMA_VERSION;
    } catch (err) {
      console.error('[db] sqlite schema write', err.message);
    }
    try { writeStoreBlob(cache); }
    catch (err) { console.error('[db] sqlite blob write', err.message); }
  }
  writeJsonFile(cache);
}

export function mutate(fn) {
  const db = load();
  const out = fn(db);
  save();
  return out;
}

export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

export function toolOn(user, slug, settings) {
  if (!user) return false;
  if (user.banned) return false;
  if (slug === 'lists') return true;
  if (user.role === 'admin') return true;
  const flags = settings?.toolsEnabled || {};
  if (flags[slug] === false) return false;
  if (user.trialUntil && user.trialUntil > Date.now()) return true;
  if (user.enabledTools?.[slug] && user.enabledTools[slug] > Date.now()) return true;
  if (!user.packageId) return false;
  if (user.packageUntil && user.packageUntil <= Date.now()) return false;
  const pack = PACKAGES[user.packageId];
  return !!(pack && pack.includes(slug));
}

export { PACKAGES, TOOLS };
