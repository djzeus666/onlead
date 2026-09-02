/**
 * OnLead API + static host.
 * VK live client ported from D:\\Project\\post2post\\packages\\integrations\\src\\vk
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { encryptToken, decryptToken, hashPassword, verifyPassword, randomToken, maskToken } from './crypto.mjs';
import { load, mutate, publicUser, toolOn, TOOLS, storageEngine, storageSchema } from './db.mjs';
import { aiCreditsBalance, grantAiCredits } from './ai-credits.mjs';
import {
  allowMocks, clientIp, encryptionKeyStatus, isMockToken, isProd, isTelegramLive,
  legalPublic, mockBlockedMessage, RATE, rateLimitHit, resolveEncryptionKey,
  safeEqual, securityHeaders,
} from './hardening.mjs';
import { publicCabinetError, cabinetTaskMessage } from './user-error.mjs';
import { backupStatus, tickBackup } from './backup.mjs';
import { isMailConfigured } from './mail.mjs';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  consumeVerifyCode,
  consumeResetCode,
  skipEmailGate,
  userVerified,
} from './notify.mjs';
import { vkConnect, vkListChannels, vkPublishWall } from './vk/adapter.mjs';
import { extractVkAccessToken } from './vk/call.mjs';
import { startWorker, runParser, tick, runCampaignStep, applyCampaignResult } from './jobs.mjs';
import {
  vkGetFriends, vkListManagedGroups, vkGetGroupJoinRequests, vkApproveJoinRequest, vkDenyJoinRequest, vkConversations,
  vkAssertMessagesPermission, vkSendMessage,
} from './vk/growth.mjs';
import {
  getLeadgenConfig, publicLeadgen, listLeadgenGroups, runLeadgenScan, saveMatchToCrm,
} from './leadgen.mjs';
import { scoreLeadgenMatch, draftLeadgenMatchReply } from './leadgen-ai.mjs';
import {
  getNeuroConfig, publicNeuro, neuroStats, listNeuroTasks, runNeuroDiscover,
  patchNeuroConfig, cancelNeuroTask, addNeuroTarget, removeNeuroTarget,
  addNeuroBlock, removeNeuroBlock, listNeuroDialogs, getNeuroDialogThread,
} from './neurocomments.mjs';
import {
  getAiLeadConfig, publicAiLead, aiLeadStats, listAiLeadActions,
  patchAiLeadConfig, runAiLeadBatch,
} from './ai-lead-tool.mjs';
import {
  CRM_STAGE_IDS, normalizeLead, normalizeLeadStage, listCrmAssignees, crmStageLabel,
} from './crm.mjs';
import {
  listHostedLeadBots, publicHostedLeadBot, createHostedLeadBot,
  patchHostedLeadBot, deleteHostedLeadBot, widgetSnippetForBot,
  deployLeadBotToFunnel, submitWidgetLead,
} from './lead-bots.mjs';
import {
  listFunnelProducts, createFunnelProduct, patchFunnelProduct,
  deleteFunnelProduct, patchFunnelSettings, listFunnelOrders,
} from './tg-funnel-ol.mjs';
import { telegramGetMe, telegramGetChat, telegramDiscoverChats } from './telegram.mjs';
import { ensureBotWebhookSecret, handleTelegramUpdate, registerBotWebhook, botPlainToken } from './tg-worker.mjs';
import { confirmReceipt, rejectReceipt } from './tg-receipts.mjs';
import { isValidInn } from './inn.mjs';
import { yookassaIpAllowed } from './ip-allow.mjs';
import { activitySeries, activityTotals } from './stats.mjs';
import { findOwnedLanding, findPublishedLandingByHost, findPublishedLandingBySlug, landingHostTaken, landingSlugTaken } from './landings.mjs';
import { landingContent, sectionsToFlat, normalizeSlug } from './landings-sections.mjs';
import { generateLandingContent } from './landings-generate.mjs';
import { saveUserMedia, listUserMedia, decodeUploadBody, mediaPath, deleteUserMedia } from './media.mjs';
import { isAllowedLandingHost, isDnsAutomationEnabled, requestHost } from './landing-hosts.mjs';
import { applyLandingDnsMeta, ensureLandingDns, syncPublishedLandingDns } from './landing-dns.mjs';
import { isProLandingTemplate } from './landings-templates.mjs';
import { publicHealthPayload } from './health-public.mjs';
import { createCheckout, confirmUserPending, creditBalance, handleYookassaWebhook, isLivePayments, transferRefBalance } from './billing.mjs';
import { AI_PROVIDERS, AI_CATALOG_SOURCE, creditCardLabel } from './ai-providers.mjs';
import {
  publicAiSettings, readAiConfig, applyAiSettings, testAiChat, generateAiImage, saveGeneratedImage, generatedPath,
  generateAiChat,
} from './ai.mjs';
import {
  listPosts, getPost, createPost, updatePost, deletePost, publishPost, listPubLogs,
  publicPost, contentPostCounts, studioPlanDrafts, CONTENT_NICHES,
} from './posts.mjs';
import {
  listRssSources, getRssSource, createRssSource, updateRssSource, deleteRssSource,
  fetchRssSource, listRssItems, importRssItems, rssSourceItemCounts,
} from './rss.mjs';
import { adaptCrosspostText, createCrosspostDrafts } from './crosspost.mjs';
import {
  listRepostSources, getRepostSource, createRepostSource, updateRepostSource,
  deleteRepostSource, fetchRepostSource, listRepostItems, importRepostItems, repostSourceItemCounts,
} from './repost.mjs';
import { postsCalendar } from './content-plan.mjs';
import {
  workflowPublicPayload, patchWorkflowSettings, submitForApproval, approvePost, rejectPost, workflowFromUser,
} from './workflow.mjs';
import {
  analyticsReport, publicCabinet, patchCabinet, listTeamMembers, AI_AGENT_CARDS,
} from './cabinet.mjs';
import {
  ensureInboundWebhookToken, rotateInboundWebhookToken, findUserByInboundToken,
  handleInboundWebhook, inboundWebhookUrl,
} from './webhooks-inbound.mjs';
import { exchangeVkOAuthCode, resolveVkOAuthScope, vkOAuthUsesCodeFlow } from './vk-oauth.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const name of ['.env', '.env.example']) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
loadEnv();
resolveEncryptionKey();

const PORT = Number(process.env.PORT || 4173);
const requestAls = new AsyncLocalStorage();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  const req = requestAls.getStore();
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' && !headers['Content-Type'] ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    ...securityHeaders(req),
    ...headers,
  });
  res.end(typeof body === 'string' ? body : json);
}

function sendFail(res, err, fallback = 'Не получилось выполнить запрос. Попробуйте ещё раз.') {
  console.warn('[api]', err?.code || '', String(err?.message || err).slice(0, 200));
  return send(res, 400, { error: publicCabinetError(err, fallback) });
}

function readBody(req, maxBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error('Слишком большое тело запроса'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
    });
    req.on('error', reject);
  });
}

function enforceRate(req, res, kind) {
  const rule = RATE[kind];
  if (!rule) return true;
  const hit = rateLimitHit(`${kind}:${clientIp(req)}`, rule.max, rule.windowMs);
  if (hit.ok) return true;
  send(res, 429, { error: 'Слишком много попыток. Подождите и повторите.' }, { 'Retry-After': String(hit.retryAfter) });
  return false;
}

function mergedLegal() {
  const env = legalPublic();
  const s = load().settings?.legal || {};
  const operator = String(s.operator || process.env.LEGAL_OPERATOR || '').trim();
  const email = String(s.email || env.email || '').trim();
  const inn = String(s.inn || env.inn || '').replace(/\D/g, '');
  const ogrn = String(s.ogrn || process.env.LEGAL_OGRN || '').replace(/\D/g, '');
  const address = String(s.address || env.address || '').trim();
  return {
    operator: operator || 'OnLead',
    email,
    inn,
    ogrn,
    address,
    site: env.site,
    requisitesReady: Boolean(operator && email && isValidInn(inn)),
  };
}

function healthPayload() {
  const key = encryptionKeyStatus();
  const bak = backupStatus();
  return {
    ok: true,
    service: 'onlead',
    paymentsLive: isLivePayments(),
    mailConfigured: isMailConfigured(),
    mocksAllowed: allowMocks(),
    telegramLive: isTelegramLive(),
    encryptionKey: key.ok,
    storage: storageEngine(),
    storageSchema: storageSchema(),
    backups: {
      count: bak.count || 0,
      lastAt: bak.lastAt || 0,
      offsiteCount: bak.offsiteCount || 0,
      remoteConfigured: Boolean(bak.remote?.configured),
      remoteOk: Boolean(bak.remote?.ok),
      geoConfigured: Boolean(bak.remote?.geoConfigured),
      geoOk: Boolean(bak.remote?.geoOk),
    },
    legal: mergedLegal(),
  };
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function authUser(req) {
  const token = bearer(req);
  if (!token) return null;
  const db = load();
  const s = db.sessions.find((x) => x.token === token && x.exp > Date.now());
  if (!s) return null;
  const user = db.users.find((u) => u.id === s.userId && !u.banned);
  return user || null;
}

function requireUser(req, res) {
  const u = authUser(req);
  if (!u) { send(res, 401, { error: 'Нужна авторизация' }); return null; }
  return u;
}

function requireAdmin(req, res) {
  const u = requireUser(req, res);
  if (!u) return null;
  if (u.role !== 'admin') { send(res, 403, { error: 'Только администратор' }); return null; }
  return u;
}

function resolveVkAccount(u, accountId) {
  const list = load().accounts.filter((a) => a.userId === u.id);
  return list.find((a) => a.id === accountId) || list[0] || null;
}

function tokenOf(acc, opts = {}) {
  if (!acc) return null;
  if (opts.messages && acc.messagesTokenEnc) {
    return String(acc.messagesTokenEnc).startsWith('mock:')
      ? acc.messagesTokenEnc
      : decryptToken(acc.messagesTokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
  }
  if (!acc.tokenEnc) return null;
  return String(acc.tokenEnc).startsWith('mock:') ? acc.tokenEnc : decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
}

function publicOrigin(req) {
  const fromEnv = String(process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const xfProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = xfProto || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'onlead.m360-ural.online').split(',')[0].trim();
  return `${proto}://${host}`;
}

const LANDING_FIELD_IDS = ['name', 'phone', 'email', 'comment'];
const LANDING_TONES = ['teal', 'ink', 'gold', 'green', 'blue', 'cream', 'rose', 'night', 'slate', 'wine', 'sand'];
const LANDING_LAYOUTS = [
  'studio', 'salon', 'stage', 'school', 'portrait', 'chat', 'packs', 'listing', 'gym', 'garage', 'paper', 'poster',
  'course', 'magnet', 'specialist', 'agency', 'booking', 'event', 'expert', 'product',
];

function landingPublicUrl(req, landingOrId) {
  const landing = typeof landingOrId === 'object' && landingOrId ? landingOrId : null;
  const id = landing?.id || String(landingOrId || '');
  const host = String(landing?.customHost || '').trim();
  if (host) return `https://${host}/`;
  const slug = String(landing?.slug || '').trim();
  if (slug) return `${publicOrigin(req)}/#/l/${encodeURIComponent(slug)}`;
  return `${publicOrigin(req)}/#/p/${id}`;
}

function clipList(raw, keys, max) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((row) => {
    const o = {};
    for (const k of keys) o[k] = String(row?.[k] || '').trim().slice(0, k === 'd' || k === 'note' || k === 'a' || k === 'q' ? 320 : 80);
    return o;
  }).filter((o) => Object.values(o).some(Boolean));
}

function landingProFields(body, fallback, pro) {
  if (!pro) return {};
  const hostRaw = body.customHost != null ? body.customHost : fallback.customHost;
  const customHost = hostRaw ? String(hostRaw).trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] : '';
  return {
    utmSource: String(body.utmSource != null ? body.utmSource : fallback.utmSource || '').trim().slice(0, 40),
    utmMedium: String(body.utmMedium != null ? body.utmMedium : fallback.utmMedium || '').trim().slice(0, 40),
    utmCampaign: String(body.utmCampaign != null ? body.utmCampaign : fallback.utmCampaign || '').trim().slice(0, 60),
    pixelHtml: String(body.pixelHtml != null ? body.pixelHtml : fallback.pixelHtml || '').trim().slice(0, 2000),
    customHost: customHost && isAllowedLandingHost(customHost) ? customHost : '',
  };
}

function landingTemplateAllowed(user, templateId, settings) {
  const id = String(templateId || '').trim();
  if (!id || !isProLandingTemplate(id)) return true;
  if (user?.trialUntil && user.trialUntil > Date.now()) return true;
  return toolOn(user, 'landings-pro', settings);
}

function sanitizeLandingContent(body = {}, fallback = {}, opts = {}) {
  const fields = (Array.isArray(body.fields) ? body.fields : fallback.fields || [])
    .map((f) => String(f).trim())
    .filter((f) => LANDING_FIELD_IDS.includes(f));
  const features = (Array.isArray(body.features) ? body.features : fallback.features || [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 8);
  const tone = LANDING_TONES.includes(body.tone) ? body.tone : (fallback.tone || 'teal');
  const layout = LANDING_LAYOUTS.includes(body.layout) ? body.layout : (fallback.layout || 'studio');
  const name = String(body.name != null ? body.name : fallback.name || '').trim().slice(0, 80);
  const metaSrc = (body.meta && typeof body.meta === 'object') ? body.meta : (fallback.meta || {});
  return {
    name: name || fallback.name || 'Новая страница',
    headline: String(body.headline != null ? body.headline : fallback.headline || name || 'Заголовок').trim().slice(0, 140) || 'Заголовок',
    sub: String(body.sub != null ? body.sub : fallback.sub || '').trim().slice(0, 400),
    cta: String(body.cta != null ? body.cta : fallback.cta || 'Оставить заявку').trim().slice(0, 48) || 'Оставить заявку',
    formTitle: String(body.formTitle != null ? body.formTitle : fallback.formTitle || 'Оставьте заявку').trim().slice(0, 80) || 'Оставьте заявку',
    kicker: String(body.kicker != null ? body.kicker : fallback.kicker || '').trim().slice(0, 48),
    features,
    fields: fields.length ? fields : ['name', 'phone'],
    tone,
    layout,
    template: String(body.template != null ? body.template : fallback.template || '').slice(0, 40),
    quote: String(body.quote != null ? body.quote : fallback.quote || '').trim().slice(0, 400),
    author: String(body.author != null ? body.author : fallback.author || '').trim().slice(0, 80),
    role: String(body.role != null ? body.role : fallback.role || '').trim().slice(0, 80),
    urgency: String(body.urgency != null ? body.urgency : fallback.urgency || '').trim().slice(0, 80),
    stats: clipList(body.stats != null ? body.stats : fallback.stats, ['n', 'l'], 4),
    steps: clipList(body.steps != null ? body.steps : fallback.steps, ['t', 'd'], 8),
    prices: clipList(body.prices != null ? body.prices : fallback.prices, ['name', 'price', 'note'], 4),
    outcomes: clipList(body.outcomes != null ? body.outcomes : fallback.outcomes, ['t', 'd'], 6),
    audience: clipList(body.audience != null ? body.audience : fallback.audience, ['t', 'd'], 4),
    faq: clipList(body.faq != null ? body.faq : fallback.faq, ['q', 'a'], 6),
    reviews: clipList(body.reviews != null ? body.reviews : fallback.reviews, ['q', 'a'], 4),
    meta: {
      when: String(metaSrc.when || '').trim().slice(0, 80),
      place: String(metaSrc.place || '').trim().slice(0, 80),
      duration: String(metaSrc.duration || '').trim().slice(0, 80),
    },
    seoDescription: String(body.seoDescription != null ? body.seoDescription : fallback.seoDescription || '').trim().slice(0, 240),
    successText: String(body.successText != null ? body.successText : fallback.successText || '').trim().slice(0, 200),
    contacts: body.contacts && typeof body.contacts === 'object'
      ? {
        title: String(body.contacts.title || fallback.contacts?.title || 'Контакты').slice(0, 60),
        phone: String(body.contacts.phone || '').slice(0, 40),
        email: String(body.contacts.email || '').slice(0, 80),
        address: String(body.contacts.address || '').slice(0, 120),
      }
      : (fallback.contacts || undefined),
    content: body.content?.sections
      ? { accent: String(body.content.accent || '#ef6c4d').slice(0, 20), sections: body.content.sections }
      : (fallback.content || undefined),
    ...landingProFields(body, fallback, opts.pro),
  };
}

function publicLandingPayload(l, db, { countView = false } = {}) {
  const owner = (db?.users || []).find((u) => u.id === l.userId);
  const pro = owner && toolOn(owner, 'landings-pro', db?.settings);
  const content = landingContent(l);
  if (countView) {
    l.viewsCount = (l.viewsCount || 0) + 1;
  }
  return {
    id: l.id,
    slug: l.slug || l.id,
    name: l.name,
    headline: l.headline,
    sub: l.sub,
    cta: l.cta,
    formTitle: l.formTitle,
    kicker: l.kicker,
    features: l.features || [],
    fields: l.fields || ['name', 'phone'],
    tone: l.tone || 'teal',
    layout: l.layout || 'studio',
    quote: l.quote || '',
    author: l.author || '',
    role: l.role || '',
    urgency: l.urgency || '',
    stats: l.stats || [],
    steps: l.steps || [],
    prices: l.prices || [],
    outcomes: l.outcomes || [],
    audience: l.audience || [],
    faq: l.faq || [],
    reviews: l.reviews || [],
    meta: l.meta || {},
    seoDescription: l.seoDescription || '',
    successText: l.successText || '',
    contacts: l.contacts || {},
    content,
    ...(pro ? {
      utmSource: l.utmSource || '',
      utmMedium: l.utmMedium || '',
      utmCampaign: l.utmCampaign || '',
      pixelHtml: l.pixelHtml || '',
    } : {}),
  };
}

function bumpLandingView(d, landingId) {
  const l = d.landings.find((x) => x.id === landingId && x.status === 'published');
  if (l) l.viewsCount = (l.viewsCount || 0) + 1;
  return l;
}

function botToken(b) {
  const enc = b?.tokenEnc;
  if (!enc) return '';
  if (String(enc).startsWith('mock:')) return String(enc);
  try { return decryptToken(enc, process.env.TOKEN_ENCRYPTION_KEY); }
  catch { return ''; }
}

function liveTgPlan(u) {
  const p = u?.tgPlan;
  if (p?.until && p.until > Date.now()) return p;
  if (u?.trialUntil && u.trialUntil > Date.now()) return { id: 'trial', lite: 1, pro: 0, until: u.trialUntil };
  return { id: null, lite: 0, pro: 0, until: 0 };
}

function tgSlotUsage(d, userId) {
  const list = (d.tgFunnels || []).filter((f) => f.userId === userId && f.status !== 'archive');
  return {
    lite: list.filter((f) => f.kind !== 'pro').length,
    pro: list.filter((f) => f.kind === 'pro').length,
  };
}

function normalizeChannels(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => ({
    externalId: String(c.externalId || c.id || ''),
    name: String(c.name || c.externalId || 'VK'),
    type: c.type || 'community',
    avatarUrl: c.avatarUrl || c.photo || undefined,
    screenName: c.screenName || undefined,
  })).filter((c) => c.externalId);
}

function mergeChannels(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const c of normalizeChannels(list)) {
      map.set(c.externalId, c);
    }
  }
  return [...map.values()];
}

function channelsHaveGroups(channels) {
  return channels.some((c) => c.type !== 'personal');
}

function resolveVkRedirectUri(forMessages) {
  const explicit = String(process.env.VK_REDIRECT_URI || '').trim();
  if (explicit) return explicit;
  if (forMessages) {
    const msgExplicit = String(process.env.VK_MESSAGES_REDIRECT_URI || '').trim();
    if (msgExplicit) return msgExplicit;
  }
  return 'https://oauth.vk.com/blank.html';
}

function resolveVkBaseAppId(settings) {
  const fromSettings = String(settings?.vkAppId || '').trim();
  const fromEnv = String(process.env.VK_APP_ID || '5530956').trim() || '5530956';
  return fromSettings || fromEnv;
}

function trialLeft(user) {
  const ms = (user.trialUntil || 0) - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)} д ${h % 24} ч` : `${h} ч`;
}

function publicAccount(a) {
  if (!a) return null;
  const { tokenEnc, messagesTokenEnc, ...rest } = a;
  return {
    ...rest,
    tokenMask: a.tokenMask,
    hasMessagesToken: Boolean(messagesTokenEnc),
    messagesTokenMask: a.messagesTokenMask || null,
  };
}

function publicCampaign(c) {
  if (!c) return null;
  const stats = { ...(c.stats || {}) };
  delete stats.lastAdminMessage;
  if (stats.lastMessage) {
    stats.lastMessage = cabinetTaskMessage(stats.lastMessage, {
      ok: c.status === 'done' || Number(stats.ok || 0) > 0,
    });
  }
  return { ...c, stats };
}

function snapshot(user) {
  const db = load();
  const accounts = db.accounts.filter((a) => a.userId === user.id).map(publicAccount);
  const autopostList = db.lists.find((l) => l.userId === user.id && l.source === 'Очередь автопостинга');
  return {
    user: { ...publicUser(user), trialLeft: trialLeft(user), aiCredits: aiCreditsBalance(user) },
    accounts,
    activeAccount: accounts[0]?.id || null,
    campaigns: db.campaigns.filter((c) => c.userId === user.id).map(publicCampaign),
    leads: db.leads.filter((l) => !l.userId || l.userId === user.id).map(normalizeLead),
    lists: db.lists.filter((l) => !l.userId || l.userId === user.id).map((l) => ({ ...l, items: undefined, count: l.count || l.items?.length || 0 })),
    autopostQueue: (autopostList?.items || [])
      .filter((it) => it.status === 'queued')
      .slice(0, 12)
      .map((it) => ({
        id: it.id,
        text: String(it.text || '').slice(0, 200),
        photoCount: (it.attachments || []).length,
      })),
    landings: db.landings.filter((l) => l.userId === user.id),
    bots: db.bots.filter((b) => !b.userId || b.userId === user.id).map((b) => ({
      ...b, tokenEnc: undefined, webhookSecret: undefined,
      tokenBroken: !botToken(b),
    })),
    tgChannels: (db.tgChannels || []).filter((c) => !c.userId || c.userId === user.id),
    tgChannelAccess: (db.tgChannelAccess || [])
      .filter((a) => a.userId === user.id)
      .slice(0, 80)
      .map((a) => ({
        id: a.id,
        chatId: a.chatId,
        tgUserId: a.tgUserId,
        tgUsername: a.tgUsername || '',
        tariffDays: a.tariffDays || 0,
        until: a.until,
        invitedAt: a.invitedAt,
        status: a.status,
        kickedAt: a.kickedAt,
        note: a.note || '',
      })),
    tgFunnels: (db.tgFunnels || []).filter((f) => !f.userId || f.userId === user.id),
    tgReceipts: (db.tgReceipts || [])
      .filter((r) => r.userId === user.id)
      .slice(0, 40)
      .map((r) => ({
        id: r.id,
        status: r.status,
        funnelName: r.funnelName || '',
        tgName: r.tgName || '',
        tgUsername: r.tgUsername || '',
        product: r.product || '',
        price: r.price || '',
        fileId: r.fileId || '',
        createdAt: r.createdAt,
        confirmedAt: r.confirmedAt,
      })),
    tgPlan: liveTgPlan(user),
    tgSlots: tgSlotUsage(db, user.id),
    ops: db.ops.filter((o) => !o.userId || o.userId === user.id),
    pendingPayments: (db.payments || [])
      .filter((p) => p.userId === user.id && p.status === 'pending' && p.provider !== 'balance')
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        kind: p.kind,
        amount: p.amount,
        title: p.title,
        packageId: p.packageId || '',
        slug: p.slug || '',
        tgPlan: p.tgPlan || '',
        months: p.months || 1,
        createdAt: p.createdAt,
      })),
    leadgen: publicLeadgen(getLeadgenConfig(user.id), user.id),
    leadgenMatches: (db.leadgenMatches || []).filter((m) => m.userId === user.id).slice(0, 200),
    neurocomments: publicNeuro(getNeuroConfig(user.id), user.id),
    neurocommentTasks: listNeuroTasks(user.id).slice(0, 80),
    neurocommentStats: neuroStats(user.id),
    aiLead: publicAiLead(getAiLeadConfig(user.id), user.id),
    aiLeadStats: aiLeadStats(user.id),
    aiLeadActions: listAiLeadActions(user.id),
    contentPosts: listPosts(db, user.id).slice(0, 120).map(publicPost),
    contentCounts: contentPostCounts(db, user.id),
    pubLogs: listPubLogs(db, user.id, 40),
    rssSources: (() => {
      const counts = rssSourceItemCounts(db, user.id);
      return listRssSources(db, user.id).map((s) => ({ ...s, itemCount: counts[s.id] || 0 }));
    })(),
    repostSources: (() => {
      const counts = repostSourceItemCounts(db, user.id);
      return listRepostSources(db, user.id).map((s) => ({ ...s, itemCount: counts[s.id] || 0 }));
    })(),
    cabinet: publicCabinet(user),
    hostedLeadBots: listHostedLeadBots(user.id).map(publicHostedLeadBot),
    activity: activitySeries(db, user.id, 30),
    stats: (() => {
      const act = activityTotals(activitySeries(db, user.id, 30));
      return { leads: act.leads, messages: act.messages, likes: act.likes, posts: act.posts, bots: act.bots, actions: act.actions };
    })(),
    settings: {
      trialHours: db.settings.trialHours,
      toolsEnabled: db.settings.toolsEnabled,
      paymentsLive: isLivePayments(),
      mocksAllowed: allowMocks(),
      telegramLive: isTelegramLive(),
      vkMessagesUiEnabled: db.settings.vkMessagesUiEnabled === true,
    },
    promo: publicPromo(db.settings),
    balance: user.balance || 0,
    refBalance: user.refBalance || 0,
    referral: user.referral || { invited: 0, paying: 0, earned: 0, code: '—' },
  };
}

function publicPromo(settings = {}) {
  const src = settings.promo || {};
  const until = Number(src.until || 0);
  if (until && until < Date.now()) return { enabled: false };
  return {
    enabled: src.enabled !== false,
    title: String(src.title || 'Розыгрыш Maxi').trim(),
    text: String(src.text || 'Подключите Maxi — участвуйте в розыгрыше месяца подписки').trim(),
    href: String(src.href || '#/office/subscriptions').trim(),
    until: until || 0,
  };
}

async function handleApi(req, res, url) {
  const method = req.method;
  const path = url.pathname;

  if ((method === 'GET' || method === 'HEAD') && path === '/api/health') {
    const body = publicHealthPayload(healthPayload());
    if (method === 'HEAD') {
      const json = JSON.stringify(body);
      res.writeHead(200, {
        ...securityHeaders(req),
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(json),
      });
      return res.end();
    }
    return send(res, 200, body);
  }

  if (method === 'POST' && path === '/api/auth/register') {
    if (!enforceRate(req, res, 'register')) return;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || email.split('@')[0]);
    const refCode = String(body.ref || body.referralCode || '').trim().toUpperCase();
    if (!email || !email.includes('@')) return send(res, 400, { error: 'Укажите email' });
    if (password.length < 8) return send(res, 400, { error: 'Пароль должен быть не короче 8 символов' });
    if (body.consent !== true && body.consent !== '1' && body.consent !== 'on') {
      return send(res, 400, { error: 'Нужно согласие с офертой и политикой конфиденциальности' });
    }
    const exists = load().users.find((u) => u.email === email);
    if (exists) return send(res, 409, { error: 'Такой email уже есть' });
    const user = mutate((db) => {
      const referrer = refCode
        ? db.users.find((x) => String(x.referral?.code || '').toUpperCase() === refCode)
        : null;
      const skip = skipEmailGate(email);
      const u = {
        id: 'u' + Date.now(), name, email, passwordHash: hashPassword(password), role: 'user',
        balance: 0, refBalance: 0, trialUntil: Date.now() + db.settings.trialHours * 3600 * 1000,
        packageId: null, enabledTools: {}, accountSlots: 3,
        referral: { invited: 0, paying: 0, earned: 0, code: randomToken(4).slice(0, 8).toUpperCase() },
        referredBy: referrer && referrer.email !== email ? referrer.id : null,
        banned: false, emailVerified: skip, createdAt: Date.now(),
      };
      db.users.push(u);
      if (u.referredBy) {
        const owner = db.users.find((x) => x.id === u.referredBy);
        if (owner?.referral) owner.referral.invited = (owner.referral.invited || 0) + 1;
      }
      db.ops.push({ id: 'o' + Date.now(), userId: u.id, at: new Date().toISOString(), title: 'Триал 72 часа', amount: 0 });
      return u;
    });
    if (user.emailVerified) {
      const token = mutate((db) => {
        const t = randomToken();
        db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
        return t;
      });
      return send(res, 200, { token, user: publicUser(user) });
    }
    try {
      await sendVerificationEmail(user);
    } catch (err) {
      return sendFail(res, err);
    }
    return send(res, 200, {
      needsEmailVerification: true,
      email: user.email,
      message: 'Мы отправили код подтверждения на ваш email',
    });
  }

  if (method === 'POST' && path === '/api/auth/verify-email') {
    if (!enforceRate(req, res, 'verify')) return;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || body.token || '');
    const user = load().users.find((u) => u.email === email);
    if (!user) return send(res, 400, { error: 'Неверный код или email' });
    if (user.emailVerified) {
      const token = mutate((db) => {
        const t = randomToken();
        db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
        return t;
      });
      return send(res, 200, { token, user: publicUser(user) });
    }
    if (!consumeVerifyCode(user, code)) return send(res, 400, { error: 'Код недействителен или устарел' });
    const fresh = load().users.find((u) => u.id === user.id);
    sendWelcomeEmail(fresh).catch(() => {});
    const token = mutate((db) => {
      const t = randomToken();
      db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
      return t;
    });
    return send(res, 200, { token, user: publicUser(fresh) });
  }

  if (method === 'POST' && path === '/api/auth/resend-verification') {
    if (!enforceRate(req, res, 'resend')) return;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const user = load().users.find((u) => u.email === email);
    if (!user) return send(res, 200, { ok: true, message: 'Если email зарегистрирован, письмо отправлено' });
    if (user.emailVerified) return send(res, 200, { ok: true, message: 'Email уже подтверждён' });
    try {
      await sendVerificationEmail(user);
    } catch (err) {
      return sendFail(res, err);
    }
    return send(res, 200, { ok: true, message: 'Новый код отправлен на почту' });
  }

  if (method === 'POST' && path === '/api/auth/forgot-password') {
    if (!enforceRate(req, res, 'forgot')) return;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const user = load().users.find((u) => u.email === email);
    if (user?.passwordHash) {
      await sendPasswordResetEmail(user);
    }
    return send(res, 200, { ok: true, message: 'Если email зарегистрирован, код отправлен' });
  }

  if (method === 'POST' && path === '/api/auth/reset-password') {
    if (!enforceRate(req, res, 'reset')) return;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '');
    const password = String(body.password || '');
    if (password.length < 8) return send(res, 400, { error: 'Пароль должен быть не короче 8 символов' });
    const user = load().users.find((u) => u.email === email);
    if (!user || !consumeResetCode(user, code)) return send(res, 400, { error: 'Код недействителен или устарел' });
    mutate((d) => {
      const x = d.users.find((u) => u.id === user.id);
      if (x) x.passwordHash = hashPassword(password);
    });
    const token = mutate((db) => {
      const t = randomToken();
      db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
      return t;
    });
    return send(res, 200, { token, user: publicUser(load().users.find((u) => u.id === user.id)) });
  }

  if (method === 'POST' && path === '/api/auth/login') {
    if (!enforceRate(req, res, 'login')) return;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (isProd() && (password === 'admin1234' || password === 'demo1234')) {
      return send(res, 401, { error: 'Неверный email или пароль' });
    }
    const user = load().users.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return send(res, 401, { error: 'Неверный email или пароль' });
    }
    if (user.banned) return send(res, 403, { error: 'Аккаунт заблокирован' });
    if (!userVerified(user)) {
      return send(res, 403, {
        error: 'Подтвердите email: введите код из письма или запросите новый на странице подтверждения.',
        needsEmailVerification: true,
        email: user.email,
      });
    }
    const token = mutate((db) => {
      const t = randomToken();
      db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
      return t;
    });
    return send(res, 200, { token, user: publicUser(user) });
  }

  if (method === 'GET' && path === '/api/me') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, snapshot(u));
  }

  if (method === 'PATCH' && path === '/api/me') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    mutate((db) => {
      const x = db.users.find((i) => i.id === u.id);
      if (body.name) x.name = String(body.name);
      if (body.email) x.email = String(body.email).toLowerCase();
    });
    return send(res, 200, snapshot(load().users.find((i) => i.id === u.id)));
  }

  if (method === 'GET' && path === '/api/me/logs') {
    const u = requireUser(req, res); if (!u) return;
    const rows = load().logs
      .filter((l) => l.userId === u.id)
      .slice(0, 80)
      .map((l) => ({ at: l.at, level: l.level, message: l.message }));
    return send(res, 200, rows);
  }

  if (method === 'GET' && path === '/api/vk/oauth-url') {
    const u = requireUser(req, res); if (!u) return;
    const kind = String(url.searchParams.get('kind') || 'base').toLowerCase();
    const forMessages = kind === 'messages' || kind === 'msg';
    if (forMessages && load().settings.vkMessagesUiEnabled !== true) {
      return send(res, 403, { error: 'Получение токена ЛС отключено администратором' });
    }
    // Base/messages: same as online-lead.ru — 5530956 / 6463690 + oauth.vk.com/blank.html.
    const baseAppId = resolveVkBaseAppId(load().settings);
    const messagesAppId = String(
      load().settings.vkMessagesAppId || process.env.VK_MESSAGES_APP_ID || '6463690',
    ).trim() || '6463690';
    const appId = forMessages ? messagesAppId : baseAppId;
    const redirectUri = resolveVkRedirectUri(forMessages);
    const scope = resolveVkOAuthScope(forMessages, appId);
    const state = `${forMessages ? 'msg' : 'ol'}_${Date.now().toString(36)}`;
    const useCode = vkOAuthUsesCodeFlow(forMessages, redirectUri);
    const responseType = useCode ? 'code' : 'token';
    const oauthHost = redirectUri.includes('oauth.vk.com') ? 'https://oauth.vk.com' : 'https://oauth.vk.ru';
    let urlOut = `${oauthHost}/authorize?client_id=${encodeURIComponent(appId)}`
      + `&display=page&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&scope=${scope}&response_type=${responseType}&v=5.199&state=${state}`;
    if (!useCode) urlOut += '&revoke=1';
    const warning = forMessages && messagesAppId === '2685278'
      ? 'Kate Mobile (2685278) VK часто блокирует («Сервис заблокирован»). Укажите приложение 6463690, как на online-lead.ru.'
      : undefined;
    return send(res, 200, {
      url: urlOut, appId, redirectUri, kind: forMessages ? 'messages' : 'base', flow: responseType, warning,
    });
  }

  if (method === 'POST' && path === '/api/vk/oauth-token') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const code = String(body.code || '').trim();
    if (!code) return send(res, 400, { error: 'Нет code от VK' });
    const appId = resolveVkBaseAppId(load().settings);
    const redirectUri = resolveVkRedirectUri(false);
    try {
      const token = await exchangeVkOAuthCode({ appId, code, redirectUri });
      return send(res, 200, token);
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/accounts') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const raw = extractVkAccessToken(body.token || body.accessToken || '') || String(body.token || '').trim();
    if (!raw) return send(res, 400, { error: 'Нет access_token VK' });
    if (!allowMocks() && isMockToken(raw)) return send(res, 400, { error: mockBlockedMessage('VK') });
    const fromBrowser = normalizeChannels(body.channels);
    let info;
    try {
      info = await vkConnect({ accessToken: raw, groupId: body.groupId });
    } catch (err) {
      const personal = fromBrowser.find((c) => c.type === 'personal') || fromBrowser[0];
      if (!personal) return sendFail(res, err);
      info = {
        displayName: String(personal.name || 'VK').replace(/^Моя страница\s*\((.+)\)\s*$/, '$1'),
        externalAccountId: personal.externalId,
        avatarUrl: personal.avatarUrl,
        metadata: { source: 'browser_oauth' },
      };
    }
    let channels = fromBrowser;
    if (!channels.length || !channelsHaveGroups(channels)) {
      try {
        channels = mergeChannels(channels, await vkListChannels(raw));
      } catch { /* IP-bound blank.html token — groups only from browser */ }
    }
    const db = load();
    const mine = db.accounts.filter((a) => a.userId === u.id);
    const existing = mine.find((a) => String(a.vkId) === String(info.externalAccountId));
    if (!existing && mine.length >= (u.accountSlots || 3)) {
      return send(res, 400, { error: 'Нет свободных слотов' });
    }
    const tokenEnc = raw.startsWith('mock:') ? raw : encryptToken(raw, process.env.TOKEN_ENCRYPTION_KEY);
    const acc = mutate((d) => {
      const groupsCount = channels.filter((c) => c.type !== 'personal').length;
      if (existing) {
        const a = d.accounts.find((x) => x.id === existing.id);
        a.name = info.displayName;
        a.vkId = info.externalAccountId;
        a.externalId = String(info.externalAccountId).replace(/^group_/, '-');
        a.status = 'active';
        a.avatarUrl = info.avatarUrl;
        a.tokenEnc = tokenEnc;
        a.tokenMask = maskToken(raw);
        a.metadata = { ...a.metadata, ...info.metadata };
        a.channels = channels;
        a.updatedAt = Date.now();
        d.logs.unshift({ id: 'log-' + Date.now(), at: new Date().toISOString(), level: 'info', userId: u.id, message: `Обновлён VK ${a.name} · групп ${groupsCount}` });
        return a;
      }
      const a = {
        id: 'vk-' + Date.now(),
        userId: u.id,
        name: info.displayName,
        vkId: info.externalAccountId,
        externalId: String(info.externalAccountId).replace(/^group_/, '-'),
        status: 'active',
        avatarUrl: info.avatarUrl,
        tokenEnc,
        tokenMask: maskToken(raw),
        metadata: info.metadata,
        channels,
        createdAt: Date.now(),
      };
      d.accounts.push(a);
      d.logs.unshift({ id: 'log-' + Date.now(), at: new Date().toISOString(), level: 'info', userId: u.id, message: `Подключён VK ${a.name} · групп ${groupsCount}` });
      return a;
    });
    const { tokenEnc: _hide, messagesTokenEnc: _hideMsg, ...safe } = acc;
    return send(res, 200, publicAccount(acc));
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/messages-token$/)) {
    const u = requireUser(req, res); if (!u) return;
    if (load().settings.vkMessagesUiEnabled !== true) {
      return send(res, 403, { error: 'Токен ЛС отключён администратором' });
    }
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'Нет аккаунта' });
    const body = await readBody(req);
    const clear = body.clear === true || body.messagesToken === '' || body.token === '';
    if (clear) {
      mutate((d) => {
        const a = d.accounts.find((x) => x.id === id && x.userId === u.id);
        if (a) {
          delete a.messagesTokenEnc;
          delete a.messagesTokenMask;
          a.updatedAt = Date.now();
        }
      });
      return send(res, 200, publicAccount(load().accounts.find((a) => a.id === id)));
    }
    const raw = extractVkAccessToken(body.messagesToken || body.token || body.accessToken || '')
      || String(body.messagesToken || body.token || '').trim();
    if (!raw) return send(res, 400, { error: 'Нет access_token для сообщений' });
    if (!allowMocks() && isMockToken(raw)) return send(res, 400, { error: mockBlockedMessage('VK') });
    try {
      await vkAssertMessagesPermission(raw);
    } catch (err) {
      return sendFail(res, err);
    }
    mutate((d) => {
      const a = d.accounts.find((x) => x.id === id && x.userId === u.id);
      if (!a) return;
      a.messagesTokenEnc = raw.startsWith('mock:') ? raw : encryptToken(raw, process.env.TOKEN_ENCRYPTION_KEY);
      a.messagesTokenMask = maskToken(raw);
      a.updatedAt = Date.now();
      d.logs.unshift({
        id: 'log-' + Date.now(),
        at: new Date().toISOString(),
        level: 'info',
        userId: u.id,
        message: `Токен сообщений VK для ${a.name}`,
      });
    });
    return send(res, 200, publicAccount(load().accounts.find((a) => a.id === id)));
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/messages-token\/check$/)) {
    const u = requireUser(req, res); if (!u) return;
    if (load().settings.vkMessagesUiEnabled !== true) {
      return send(res, 403, { error: 'Токен ЛС отключён администратором' });
    }
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'Нет аккаунта' });
    if (!acc.messagesTokenEnc) return send(res, 400, { error: 'Токен сообщений не подключён', ok: false });
    const token = tokenOf(acc, { messages: true });
    try {
      await vkAssertMessagesPermission(token);
      return send(res, 200, { ok: true });
    } catch (err) {
      mutate((d) => {
        d.logs.unshift({
          id: 'log-' + Date.now(),
          at: new Date().toISOString(),
          level: 'warn',
          userId: u.id,
          message: `[messages-token/check] ${acc.name}: ${err instanceof Error ? err.message : String(err)}`,
        });
      });
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path === '/api/accounts') {
    const u = requireUser(req, res); if (!u) return;
    const list = load().accounts.filter((a) => a.userId === u.id).map(publicAccount);
    return send(res, 200, list);
  }

  if (method === 'DELETE' && path.startsWith('/api/accounts/')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.accounts = d.accounts.filter((a) => !(a.id === id && a.userId === u.id)); });
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && path.match(/^\/api\/accounts\/[^/]+\/vk-token$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'Нет аккаунта' });
    if (String(acc.tokenEnc).startsWith('mock:')) return send(res, 200, { accessToken: acc.tokenEnc });
    try {
      const accessToken = decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
      return send(res, 200, { accessToken });
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/channels$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const incoming = normalizeChannels(body.channels);
    if (!incoming.length) return send(res, 400, { error: 'Нет каналов' });
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'Нет аккаунта' });
    const channels = mergeChannels(acc.channels || [], incoming);
    mutate((d) => {
      const a = d.accounts.find((x) => x.id === id && x.userId === u.id);
      if (a) {
        a.channels = channels;
        a.updatedAt = Date.now();
        const groupsCount = channels.filter((c) => c.type !== 'personal').length;
        d.logs.unshift({
          id: 'log-' + Date.now(),
          at: new Date().toISOString(),
          level: 'info',
          userId: u.id,
          message: `Обновлены каналы VK ${a.name} · групп ${groupsCount}`,
        });
      }
    });
    return send(res, 200, channels);
  }

  if (method === 'GET' && path.startsWith('/api/accounts/') && path.endsWith('/channels')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'Нет аккаунта' });
    const token = String(acc.tokenEnc).startsWith('mock:') ? acc.tokenEnc : decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
    try {
      const channels = await vkListChannels(token);
      mutate((d) => {
        const a = d.accounts.find((x) => x.id === id && x.userId === u.id);
        if (a) a.channels = mergeChannels(a.channels || [], channels);
      });
      return send(res, 200, channels);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/another ip|1130|привязан к IP/i.test(msg)) {
        return send(res, 409, {
          error: 'Токен привязан к IP браузера. Нажмите «Обновить сообщества» в кабинете — список подтянется из VK в этом браузере.',
          ipBound: true,
          channels: acc.channels || [],
        });
      }
      return sendFail(res, err);
    }
  }

  if (path === '/api/leadgen' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, publicLeadgen(getLeadgenConfig(u.id), u.id));
  }

  if (path === '/api/leadgen' && method === 'PATCH') {
    const u = requireUser(req, res); if (!u) return;
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
    return send(res, 200, publicLeadgen(cfg, u.id));
  }

  if (method === 'GET' && path === '/api/leadgen/groups') {
    const u = requireUser(req, res); if (!u) return;
    try { return send(res, 200, await listLeadgenGroups(u.id)); }
    catch (err) { return sendFail(res, err); }
  }

  if (method === 'PUT' && path === '/api/leadgen/groups') {
    const u = requireUser(req, res); if (!u) return;
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
    return send(res, 200, publicLeadgen(cfg, u.id));
  }

  if (method === 'PUT' && path === '/api/leadgen/phrases') {
    const u = requireUser(req, res); if (!u) return;
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
    return send(res, 200, publicLeadgen(cfg, u.id));
  }

  if (method === 'POST' && path === '/api/leadgen/scan') {
    const u = requireUser(req, res); if (!u) return;
    if (!toolOn(u, 'leadgen-vk', load().settings)) return send(res, 403, { error: 'Лидогенератор не активен' });
    const cfg = getLeadgenConfig(u.id);
    if (!cfg.phrases?.length) return send(res, 400, { error: 'Добавьте поисковые фразы' });
    if (!cfg.groups?.length) return send(res, 400, { error: 'Выберите сообщества для скана' });
    if (cfg.scanStatus === 'running') return send(res, 200, { queued: true, ...publicLeadgen(cfg, u.id) });
    mutate((d) => {
      const c = d.leadgen.find((x) => x.userId === u.id);
      if (c) { c.scanStatus = 'queued'; c.lastError = ''; }
    });
    runLeadgenScan(u.id, { manual: true }).catch((err) => console.error('[leadgen scan]', err.message || err));
    return send(res, 200, { queued: true, ...publicLeadgen(getLeadgenConfig(u.id), u.id) });
  }

  if (method === 'GET' && path === '/api/leadgen/matches') {
    const u = requireUser(req, res); if (!u) return;
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
    return send(res, 200, list.slice(0, 200));
  }

  if (method === 'POST' && path.match(/^\/api\/leadgen\/matches\/[^/]+\/ai-score$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    try {
      const match = await scoreLeadgenMatch(u.id, id);
      return send(res, 200, match);
    } catch (err) { return sendFail(res, err); }
  }

  if (method === 'POST' && path.match(/^\/api\/leadgen\/matches\/[^/]+\/ai-draft$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    try {
      const match = await draftLeadgenMatchReply(u.id, id);
      return send(res, 200, match);
    } catch (err) { return sendFail(res, err); }
  }

  if (method === 'PATCH' && path.startsWith('/api/leadgen/matches/')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    if (body.status === 'saved' || body.saveToCrm) {
      try {
        const lead = saveMatchToCrm(u.id, id);
        const match = load().leadgenMatches.find((m) => m.id === id);
        return send(res, 200, { match, lead });
      } catch (err) { return sendFail(res, err); }
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
    if (!match) return send(res, 404, { error: 'Нет совпадения' });
    return send(res, 200, match);
  }

  if (method === 'DELETE' && path.startsWith('/api/leadgen/matches/')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.leadgenMatches = (d.leadgenMatches || []).filter((m) => !(m.id === id && m.userId === u.id)); });
    return send(res, 200, { ok: true });
  }

  if (path === '/api/neurocomments' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return;
    const cfg = getNeuroConfig(u.id);
    const status = url.searchParams.get('status') || '';
    return send(res, 200, {
      config: publicNeuro(cfg, u.id),
      stats: neuroStats(u.id),
      tasks: listNeuroTasks(u.id, status || undefined),
    });
  }

  if (path === '/api/neurocomments' && method === 'PATCH') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const cfg = patchNeuroConfig(u.id, body);
    return send(res, 200, { config: publicNeuro(cfg, u.id), stats: neuroStats(u.id) });
  }

  if (method === 'POST' && path === '/api/neurocomments/discover') {
    const u = requireUser(req, res); if (!u) return;
    if (!toolOn(u, 'neurocomment-vk', load().settings)) return send(res, 403, { error: 'Нейрокомментарии не активны' });
    try {
      const r = await runNeuroDiscover(u.id);
      return send(res, 200, { ...r, tasks: listNeuroTasks(u.id), stats: neuroStats(u.id) });
    } catch (err) { return sendFail(res, err); }
  }

  if (method === 'POST' && path.match(/^\/api\/neurocomments\/tasks\/[^/]+\/cancel$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    cancelNeuroTask(u.id, id);
    return send(res, 200, { tasks: listNeuroTasks(u.id), stats: neuroStats(u.id) });
  }

  if (method === 'POST' && path === '/api/neurocomments/targets') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    try {
      await addNeuroTarget(u.id, { mode: body.mode, raw: body.raw });
      const cfg = getNeuroConfig(u.id);
      return send(res, 200, { config: publicNeuro(cfg, u.id) });
    } catch (err) { return sendFail(res, err); }
  }

  if (method === 'DELETE' && path.startsWith('/api/neurocomments/targets/')) {
    const u = requireUser(req, res); if (!u) return;
    removeNeuroTarget(u.id, path.split('/').pop());
    return send(res, 200, { config: publicNeuro(getNeuroConfig(u.id), u.id) });
  }

  if (method === 'GET' && path === '/api/neurocomments/blocks') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, { blocks: getNeuroConfig(u.id).blocks || [] });
  }

  if (method === 'POST' && path === '/api/neurocomments/blocks') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    try {
      addNeuroBlock(u.id, body.recipientId, body.reason);
      return send(res, 200, { blocks: getNeuroConfig(u.id).blocks || [] });
    } catch (err) { return sendFail(res, err); }
  }

  if (method === 'DELETE' && path.startsWith('/api/neurocomments/blocks/')) {
    const u = requireUser(req, res); if (!u) return;
    removeNeuroBlock(u.id, path.split('/').pop());
    return send(res, 200, { blocks: getNeuroConfig(u.id).blocks || [] });
  }

  if (method === 'GET' && path === '/api/neurocomments/dialogs') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, { dialogs: listNeuroDialogs(u.id) });
  }

  if (method === 'GET' && path.match(/^\/api\/neurocomments\/dialogs\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    try {
      return send(res, 200, await getNeuroDialogThread(u.id, id));
    } catch (err) { return sendFail(res, err); }
  }

  if (path === '/api/ai-lead' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, {
      config: publicAiLead(getAiLeadConfig(u.id), u.id),
      stats: aiLeadStats(u.id),
      actions: listAiLeadActions(u.id),
    });
  }

  if (path === '/api/ai-lead' && method === 'PATCH') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const cfg = patchAiLeadConfig(u.id, body);
    return send(res, 200, {
      config: publicAiLead(cfg, u.id),
      stats: aiLeadStats(u.id),
    });
  }

  if (method === 'POST' && path === '/api/ai-lead/run') {
    const u = requireUser(req, res); if (!u) return;
    if (!toolOn(u, 'ai-lead-vk', load().settings)) return send(res, 403, { error: 'AI Лид-менеджер не активен' });
    try {
      const r = await runAiLeadBatch(u.id);
      return send(res, 200, {
        ...r,
        config: publicAiLead(getAiLeadConfig(u.id), u.id),
        actions: listAiLeadActions(u.id),
      });
    } catch (err) { return sendFail(res, err); }
  }

  if (method === 'GET' && path === '/api/ai-lead/actions') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, { actions: listAiLeadActions(u.id) });
  }

  if (method === 'GET' && path === '/api/media/library') {
    const u = requireUser(req, res); if (!u) return;
    const uploads = listUserMedia(u.id);
    const ai = (load().campaigns || [])
      .filter((c) => c.userId === u.id && c.slug === 'image-ai')
      .flatMap((c) => (c.stats?.images || []).map((img) => ({ ...img, source: 'ai' })));
    return send(res, 200, { uploads, ai });
  }

  if (method === 'POST' && path === '/api/media/upload') {
    const u = requireUser(req, res); if (!u) return;
    try {
      const body = await readBody(req, 6 * 1024 * 1024);
      const buf = decodeUploadBody(body);
      const row = saveUserMedia(u.id, buf, body.mime || body.contentType || 'image/jpeg');
      return send(res, 200, row);
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'DELETE' && path.startsWith('/api/media/') && path.split('/').length === 4) {
    const u = requireUser(req, res); if (!u) return;
    const name = path.split('/').pop();
    try {
      return send(res, 200, deleteUserMedia(u.id, name));
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path.startsWith('/api/media/') && path !== '/api/media/library' && path !== '/api/media/upload') {
    const name = path.split('/').pop();
    const file = generatedPath(name) || mediaPath(name);
    if (!file || !existsSync(file)) return send(res, 404, { error: 'Нет файла' });
    const type = MIME[extname(file)] || 'image/png';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' });
    createReadStream(file).pipe(res);
    return;
  }

  if (method === 'GET' && path === '/api/posts') {
    const u = requireUser(req, res); if (!u) return;
    const db = load();
    const q = url.searchParams;
    const posts = listPosts(db, u.id, {
      status: q.get('status') || null,
      trash: q.get('trash') === '1',
      templates: q.get('templates') === '1' ? true : (q.get('templates') === '0' ? false : undefined),
    }).map(publicPost);
    return send(res, 200, { posts, counts: contentPostCounts(db, u.id) });
  }

  if (method === 'POST' && path === '/api/posts') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const post = mutate((db) => createPost(db, u.id, body));
    return send(res, 201, { post: publicPost(post) });
  }

  if (method === 'GET' && path === '/api/posts/history') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, { logs: listPubLogs(load(), u.id, 100) });
  }

  if (method === 'GET' && path.match(/^\/api\/posts\/[^/]+$/) && !path.endsWith('/history')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const post = getPost(load(), u.id, id);
    if (!post) return send(res, 404, { error: 'Пост не найден' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'PATCH' && path.match(/^\/api\/posts\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const post = mutate((db) => updatePost(db, u.id, id, body));
    if (!post) return send(res, 404, { error: 'Пост не найден' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'DELETE' && path.match(/^\/api\/posts\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const hard = url.searchParams.get('hard') === '1';
    const ok = mutate((db) => deletePost(db, u.id, id, { hard }));
    if (!ok) return send(res, 404, { error: 'Пост не найден' });
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && path === '/api/posts/calendar') {
    const u = requireUser(req, res); if (!u) return;
    const from = Number(url.searchParams.get('from') || Date.now() - 86400000 * 35);
    const to = Number(url.searchParams.get('to') || Date.now() + 86400000 * 35);
    return send(res, 200, postsCalendar(load(), u.id, from, to));
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/submit-approval$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const user = load().users.find((x) => x.id === u.id);
    const { settings } = workflowFromUser(user);
    const post = mutate((db) => submitForApproval(db, u.id, id, settings));
    if (!post) return send(res, 404, { error: 'Пост не найден' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/approve$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const user = load().users.find((x) => x.id === u.id);
    const { settings } = workflowFromUser(user);
    const post = mutate((db) => approvePost(db, u.id, id, settings));
    if (!post) return send(res, 404, { error: 'Пост не найден' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/reject$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const post = mutate((db) => rejectPost(db, u.id, id, body.reason));
    if (!post) return send(res, 404, { error: 'Пост не найден' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/publish$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) return send(res, 400, { error: 'Подключите VK-аккаунт' });
    const token = tokenOf(acc);
    const db = load();
    const userRow = db.users.find((x) => x.id === u.id);
    const result = await publishPost(db, u.id, id, {
      account: acc,
      token,
      ownerId: body.ownerId,
      cabinet: publicCabinet(userRow),
    });
    mutate((d) => d);
    if (!result.ok) return send(res, 400, { error: result.error, post: result.post });
    return send(res, 200, result);
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/ai-text$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const db = load();
    const post = getPost(db, u.id, id);
    if (!post) return send(res, 404, { error: 'Пост не найден' });
    const cfg = readAiConfig(db.settings);
    try {
      const prompt = String(body.prompt || 'Напиши короткий пост для VK').slice(0, 500);
      const topic = String(body.topic || post.title || post.text.slice(0, 80)).slice(0, 200);
      const { text } = await generateAiChat([
        { role: 'system', content: 'Ты SMM-редактор. Пиши посты для VK: живо, по делу, без кавычек и хештег-спама. 2–4 абзаца.' },
        { role: 'user', content: `${prompt}\n\nТема: ${topic}` },
      ], cfg, { maxTokens: 400 });
      const updated = mutate((d) => updatePost(d, u.id, id, { text }));
      return send(res, 200, { text, post: publicPost(updated) });
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path === '/api/content-studio/niches') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, { niches: CONTENT_NICHES });
  }

  if (method === 'POST' && path === '/api/content-studio/plan') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const nicheId = String(body.niche || 'services');
    const days = Math.min(Math.max(Number(body.days) || 7, 3), 30);
    const drafts = studioPlanDrafts(nicheId, days);
    const posts = mutate((db) => {
      const created = [];
      for (const d of drafts) {
        created.push(createPost(db, u.id, {
          title: d.title,
          text: d.text,
          niche: d.niche,
          scheduledAt: d.scheduledAt,
          status: 'scheduled',
        }));
      }
      return created;
    });
    return send(res, 201, { posts: posts.map(publicPost), count: posts.length });
  }

  if (method === 'GET' && path === '/api/rss/sources') {
    const u = requireUser(req, res); if (!u) return;
    const db = load();
    const counts = rssSourceItemCounts(db, u.id);
    const sources = listRssSources(db, u.id).map((s) => ({ ...s, itemCount: counts[s.id] || 0 }));
    return send(res, 200, { sources });
  }

  if (method === 'POST' && path === '/api/rss/sources') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    try {
      const db = load();
      const result = await createRssSource(db, u.id, body);
      mutate((d) => d);
      try { await fetchRssSource(db, u.id, result.source.id); mutate((d) => d); } catch { /* lastError */ }
      return send(res, 201, result);
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'PATCH' && path.match(/^\/api\/rss\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const source = mutate((db) => updateRssSource(db, u.id, id, body));
    if (!source) return send(res, 404, { error: 'Источник не найден' });
    return send(res, 200, { source });
  }

  if (method === 'DELETE' && path.match(/^\/api\/rss\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const ok = mutate((db) => deleteRssSource(db, u.id, id));
    if (!ok) return send(res, 404, { error: 'Источник не найден' });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path.match(/^\/api\/rss\/sources\/[^/]+\/fetch$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    try {
      const db = load();
      const result = await fetchRssSource(db, u.id, id);
      mutate((d) => d);
      return send(res, 200, result);
    } catch (err) {
      mutate((d) => d);
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path.match(/^\/api\/rss\/sources\/[^/]+\/items$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const db = load();
    if (!getRssSource(db, u.id, id)) return send(res, 404, { error: 'Источник не найден' });
    const status = url.searchParams.get('status') || null;
    const take = Number(url.searchParams.get('take') || 100);
    return send(res, 200, { items: listRssItems(db, u.id, id, { status, take }) });
  }

  if (method === 'POST' && path === '/api/rss/import') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const sourceId = String(body.sourceId || '');
    const items = Array.isArray(body.items) ? body.items : [];
    if (!sourceId || !items.length) return send(res, 400, { error: 'Выберите статьи' });
    const db = load();
    const aiConfig = readAiConfig(db.settings);
    try {
      const result = await importRssItems(db, u.id, sourceId, items, { aiConfig });
      mutate((d) => d);
      return send(res, 200, result);
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/crosspost/adapt') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const aiConfig = readAiConfig(load().settings);
    try {
      const versions = await adaptCrosspostText(body.text, body.platforms, aiConfig);
      return send(res, 200, { versions });
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/crosspost/drafts') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const created = mutate((db) => createCrosspostDrafts(db, u.id, body.versions || {}, {
      accountId: body.accountId,
      ownerId: body.ownerId,
      ownerLabel: body.ownerLabel,
    }));
    return send(res, 201, { created, count: created.length });
  }

  if (method === 'GET' && path === '/api/repost/sources') {
    const u = requireUser(req, res); if (!u) return;
    const db = load();
    const counts = repostSourceItemCounts(db, u.id);
    return send(res, 200, { sources: listRepostSources(db, u.id).map((s) => ({ ...s, itemCount: counts[s.id] || 0 })) });
  }

  if (method === 'POST' && path === '/api/repost/sources') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    try {
      const source = mutate((db) => createRepostSource(db, u.id, body));
      return send(res, 201, { source });
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'PATCH' && path.match(/^\/api\/repost\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const body = await readBody(req);
    const source = mutate((db) => updateRepostSource(db, u.id, id, body));
    if (!source) return send(res, 404, { error: 'Источник не найден' });
    return send(res, 200, { source });
  }

  if (method === 'DELETE' && path.match(/^\/api\/repost\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const ok = mutate((db) => deleteRepostSource(db, u.id, id));
    if (!ok) return send(res, 404, { error: 'Источник не найден' });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path.match(/^\/api\/repost\/sources\/[^/]+\/fetch$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const db = load();
    const source = getRepostSource(db, u.id, id);
    if (!source) return send(res, 404, { error: 'Источник не найден' });
    const acc = resolveVkAccount(u, source.accountId);
    if (!acc) return send(res, 400, { error: 'Подключите VK-аккаунт для сканирования' });
    const token = tokenOf(acc);
    try {
      const result = await fetchRepostSource(db, u.id, id, token);
      mutate((d) => d);
      return send(res, 200, result);
    } catch (err) {
      mutate((d) => d);
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path.match(/^\/api\/repost\/sources\/[^/]+\/items$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const db = load();
    if (!getRepostSource(db, u.id, id)) return send(res, 404, { error: 'Источник не найден' });
    const status = url.searchParams.get('status') || null;
    return send(res, 200, { items: listRepostItems(db, u.id, id, { status, take: 100 }) });
  }

  if (method === 'POST' && path === '/api/repost/import') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const sourceId = String(body.sourceId || '');
    const items = Array.isArray(body.items) ? body.items : [];
    if (!sourceId || !items.length) return send(res, 400, { error: 'Выберите посты' });
    try {
      const result = mutate((db) => importRepostItems(db, u.id, sourceId, items));
      return send(res, 200, result);
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path === '/api/workflow') {
    const u = requireUser(req, res); if (!u) return;
    const db = load();
    const user = db.users.find((x) => x.id === u.id);
    return send(res, 200, workflowPublicPayload(db, user));
  }

  if (method === 'PATCH' && path === '/api/workflow/settings') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    mutate((db) => {
      const x = db.users.find((i) => i.id === u.id);
      x.cabinet = patchWorkflowSettings(x.cabinet, body);
      return x.cabinet;
    });
    const db = load();
    const user = db.users.find((x) => x.id === u.id);
    return send(res, 200, workflowPublicPayload(db, user));
  }

  if (method === 'GET' && path === '/api/analytics') {
    const u = requireUser(req, res); if (!u) return;
    const days = Number(url.searchParams.get('days') || 30);
    return send(res, 200, analyticsReport(load(), u.id, days));
  }

  if (method === 'GET' && path === '/api/cabinet/settings') {
    const u = requireUser(req, res); if (!u) return;
    const user = load().users.find((x) => x.id === u.id);
    return send(res, 200, { cabinet: publicCabinet(user) });
  }

  if (method === 'PATCH' && path === '/api/cabinet/settings') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const cabinet = mutate((db) => {
      const x = db.users.find((i) => i.id === u.id);
      x.cabinet = patchCabinet(x, body);
      return x.cabinet;
    });
    return send(res, 200, { cabinet: publicCabinet({ cabinet }) });
  }

  if (method === 'GET' && path === '/api/team') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, { members: listTeamMembers(load(), u.id) });
  }

  if (method === 'GET' && path === '/api/webhooks/inbound/token') {
    const u = requireUser(req, res); if (!u) return;
    const tok = mutate((db) => ensureInboundWebhookToken(db, u.id));
    return send(res, 200, { token: tok, url: inboundWebhookUrl(tok) });
  }

  if (method === 'POST' && path === '/api/webhooks/inbound/token/rotate') {
    const u = requireUser(req, res); if (!u) return;
    const tok = mutate((db) => rotateInboundWebhookToken(db, u.id));
    return send(res, 200, { token: tok, url: inboundWebhookUrl(tok) });
  }

  if (method === 'POST' && path === '/api/campaigns') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const slug = body.slug;
    if (!TOOLS.includes(slug) && slug !== 'landings-pro') return send(res, 400, { error: 'Неизвестный инструмент' });
    if (!toolOn(u, slug, load().settings) && slug !== 'landings-pro') return send(res, 403, { error: 'Инструмент не активен' });
    const acc = load().accounts.find((a) => a.userId === u.id && (a.id === body.accountId || !body.accountId));
    if (!acc && slug !== 'image-ai') return send(res, 400, { error: 'Подключите VK-аккаунт' });
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
      return send(res, 200, load().campaigns.find((c) => c.id === cam.id) || cam);
    }
    tick().catch(() => {});
    return send(res, 200, cam);
  }

  if (method === 'POST' && path.startsWith('/api/campaigns/') && path.endsWith('/pause')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    mutate((d) => {
      const c = d.campaigns.find((x) => x.id === id && x.userId === u.id);
      if (c) c.status = c.status === 'running' ? 'paused' : 'running';
    });
    return send(res, 200, { ok: true });
  }

  if (method === 'PATCH' && path.match(/^\/api\/campaigns\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const cam = mutate((d) => {
      const c = d.campaigns.find((x) => x.id === id && x.userId === u.id);
      if (!c) return null;
      if (body.title != null) c.title = String(body.title).trim().slice(0, 160);
      if (body.status === 'paused' || body.status === 'running') c.status = body.status;
      return c;
    });
    if (!cam) return send(res, 404, { error: 'Задача не найдена' });
    return send(res, 200, cam);
  }

  if (method === 'DELETE' && path.match(/^\/api\/campaigns\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.campaigns = d.campaigns.filter((x) => !(x.id === id && x.userId === u.id)); });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/parsers') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const slug = body.kind === 'groups' ? 'parsing-groups-vk' : 'parsing-accounts-vk';
    if (!toolOn(u, slug, load().settings)) return send(res, 403, { error: 'Парсер не активен' });
    try {
      const list = await runParser(u.id, body.kind || 'accounts', body);
      return send(res, 200, { ...list, items: undefined, count: list.count || list.items?.length || 0, id: list.id, name: list.name });
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path.startsWith('/api/lists/')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const list = load().lists.find((l) => l.id === id && (!l.userId || l.userId === u.id));
    if (!list) return send(res, 404, { error: 'Список не найден' });
    return send(res, 200, { ...list, count: list.count || list.items?.length || 0, items: (list.items || []).slice(0, 1000) });
  }

  if (method === 'DELETE' && path.startsWith('/api/lists/')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    mutate((d) => { d.lists = d.lists.filter((l) => l.id !== id || (l.userId && l.userId !== u.id)); });
    return send(res, 200, { ok: true });
  }

  if (method === 'PATCH' && path.match(/^\/api\/lists\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) return send(res, 400, { error: 'Укажите название' });
    const list = mutate((d) => {
      const l = d.lists.find((x) => x.id === id && (!x.userId || x.userId === u.id));
      if (!l) return null;
      l.name = name;
      return l;
    });
    if (!list) return send(res, 404, { error: 'Список не найден' });
    return send(res, 200, { ok: true, name: list.name });
  }

  if (method === 'POST' && path.startsWith('/api/lists/') && path.endsWith('/crm')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const list = load().lists.find((l) => l.id === id && (!l.userId || l.userId === u.id));
    if (!list) return send(res, 404, { error: 'Список не найден' });
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
    return send(res, 200, { ok: true, count: n });
  }

  if (method === 'GET' && path === '/api/crm/assignees') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, { members: listCrmAssignees(u) });
  }

  if (method === 'POST' && path === '/api/leads') {
    const u = requireUser(req, res); if (!u) return;
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
    return send(res, 200, lead);
  }

  if (method === 'PATCH' && path.startsWith('/api/leads/')) {
    const u = requireUser(req, res); if (!u) return;
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
    if (!lead) return send(res, 404, { error: 'Лид не найден' });
    return send(res, 200, { ok: true, lead: normalizeLead(lead) });
  }

  if (method === 'DELETE' && path.startsWith('/api/leads/')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.leads = d.leads.filter((x) => !(x.id === id && x.userId === u.id)); });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/billing/webhook/yookassa') {
    if (!yookassaIpAllowed(clientIp(req))) {
      console.warn('[yookassa] webhook ip rejected', clientIp(req));
      return send(res, 401, { error: 'forbidden' });
    }
    try {
      const result = await handleYookassaWebhook(await readBody(req));
      return send(res, 200, result);
    } catch (err) {
      return sendFail(res, err, 'webhook');
    }
  }

  if (method === 'POST' && path === '/api/billing/topup') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    try {
      const result = await createCheckout(u, { kind: 'topup', amount: body.amount || 1000 }, publicOrigin(req));
      return send(res, 200, { ...result, ...(result.applied ? snapshot(load().users.find((i) => i.id === u.id)) : {}) });
    } catch (err) {
      console.error('[billing] topup', err.message);
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/billing/buy' || method === 'POST' && path === '/api/billing/checkout') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    try {
      const result = await createCheckout(u, body, publicOrigin(req));
      return send(res, 200, { ...result, ...(result.applied ? snapshot(load().users.find((i) => i.id === u.id)) : {}) });
    } catch (err) {
      console.error('[billing] checkout', err.message);
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/billing/confirm') {
    const u = requireUser(req, res); if (!u) return;
    try {
      const result = await confirmUserPending(u.id);
      return send(res, 200, { ...result, ...snapshot(load().users.find((i) => i.id === u.id)) });
    } catch (err) {
      console.error('[billing] confirm', err.message);
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/billing/transfer-ref') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    try {
      const result = mutate((d) => transferRefBalance(d, u.id, body.amount));
      return send(res, 200, { ...result, ...snapshot(load().users.find((i) => i.id === u.id)) });
    } catch (err) {
      console.error('[billing] transfer-ref', err.message);
      return sendFail(res, err);
    }
  }

  if (method === 'GET' && path === '/api/vk/friends') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'Нет VK' });
    const friends = await vkGetFriends(tokenOf(acc), { count: 80 });
    return send(res, 200, friends);
  }

  if (method === 'GET' && path === '/api/vk/chats') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'Нет VK' });
    return send(res, 200, await vkConversations(tokenOf(acc, { messages: true }) || tokenOf(acc), 30));
  }

  if (method === 'POST' && path === '/api/vk/chats/reply') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) return send(res, 400, { error: 'Нет VK' });
    const peerId = Number(body.peerId);
    const message = String(body.message || '').trim();
    if (!peerId || !message) return send(res, 400, { error: 'Укажите peerId и текст' });
    const token = tokenOf(acc, { messages: true }) || tokenOf(acc);
    const r = await vkSendMessage(token, peerId, message.slice(0, 3500));
    if (!r.ok) return send(res, 400, { error: r.message || 'Не удалось отправить' });
    return send(res, 200, { ok: true, messageId: r.messageId });
  }

  if (method === 'GET' && path === '/api/tg/receipts') {
    const u = requireUser(req, res); if (!u) return;
    const db = load();
    const rows = (db.tgReceipts || [])
      .filter((r) => r.userId === u.id)
      .slice(0, 50)
      .map((r) => ({
        id: r.id,
        status: r.status,
        funnelName: r.funnelName || '',
        tgName: r.tgName || '',
        tgUsername: r.tgUsername || '',
        product: r.product || '',
        price: r.price || '',
        fileId: r.fileId || '',
        createdAt: r.createdAt,
        confirmedAt: r.confirmedAt,
      }));
    return send(res, 200, rows);
  }

  if (method === 'POST' && path.match(/^\/api\/tg\/receipts\/[^/]+\/confirm$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const result = await confirmReceipt({
      receiptId: id,
      userId: u.id,
      botPlainToken,
      loadFn: load,
      mutateFn: mutate,
    });
    if (!result.ok) return send(res, 400, { error: result.error });
    return send(res, 200, { ok: true, ...snapshot(load().users.find((x) => x.id === u.id)) });
  }

  if (method === 'POST' && path.match(/^\/api\/tg\/receipts\/[^/]+\/reject$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const body = await readBody(req);
    const result = await rejectReceipt({
      receiptId: id,
      userId: u.id,
      note: body.note,
      botPlainToken,
      loadFn: load,
      mutateFn: mutate,
    });
    if (!result.ok) return send(res, 400, { error: result.error });
    return send(res, 200, { ok: true, ...snapshot(load().users.find((x) => x.id === u.id)) });
  }

  if (method === 'GET' && path === '/api/vk/groups') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'Нет VK' });
    const groups = await vkListManagedGroups(tokenOf(acc));
    return send(res, 200, groups);
  }

  if (method === 'GET' && path === '/api/vk/groups/requests') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'Нет VK' });
    const groupId = Number(url.searchParams.get('groupId'));
    if (!groupId) return send(res, 400, { error: 'Укажите groupId' });
    const reqs = await vkGetGroupJoinRequests(tokenOf(acc), groupId);
    return send(res, 200, reqs);
  }

  if (method === 'POST' && path === '/api/vk/groups/requests') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) return send(res, 400, { error: 'Нет VK' });
    const token = tokenOf(acc);
    if (body.action === 'approve') await vkApproveJoinRequest(token, body.groupId, body.userId);
    else await vkDenyJoinRequest(token, body.groupId, body.userId);
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/bots') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const token = String(body.token || body.username || '').trim();
    if (!token) return send(res, 400, { error: 'Вставьте токен из @BotFather' });
    if (!allowMocks() && isMockToken(token)) return send(res, 400, { error: mockBlockedMessage('Telegram') });
    let me;
    try { me = await telegramGetMe(token); }
    catch (err) { return sendFail(res, err); }
    const bot = mutate((d) => {
      const username = me.username ? '@' + me.username : (body.username || 'bot');
      const b = {
        id: 'b' + Date.now(),
        userId: u.id,
        name: String(body.name || me.first_name || username).trim().slice(0, 80),
        username,
        tgId: me.id,
        status: 'on',
        tokenMask: maskToken(token),
        tokenEnc: token.startsWith('mock:') ? token : encryptToken(token, process.env.TOKEN_ENCRYPTION_KEY),
      };
      ensureBotWebhookSecret(b);
      d.bots.push(b);
      return b;
    });
    try { await registerBotWebhook(bot); }
    catch (err) { console.error('[tg webhook] setWebhook', err.message); }
    return send(res, 200, { ...bot, tokenEnc: undefined, webhookSecret: undefined });
  }

  if (method === 'PATCH' && path.match(/^\/api\/bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const newToken = String(body.token || '').trim();
    let me = null;
    if (newToken) {
      if (!allowMocks() && isMockToken(newToken)) return send(res, 400, { error: mockBlockedMessage('Telegram') });
      try { me = await telegramGetMe(newToken); }
      catch (err) { return sendFail(res, err); }
    }
    const bot = mutate((d) => {
      const b = d.bots.find((x) => x.id === id && x.userId === u.id);
      if (!b) return null;
      if (newToken) {
        b.tokenEnc = isMockToken(newToken) ? newToken : encryptToken(newToken, process.env.TOKEN_ENCRYPTION_KEY);
        b.tokenMask = maskToken(newToken);
        if (me?.id) b.tgId = me.id;
        if (me?.username) b.username = '@' + me.username;
        ensureBotWebhookSecret(b);
      }
      if (body.name != null) b.name = String(body.name).trim().slice(0, 80) || b.name;
      if (body.username != null && !newToken) b.username = String(body.username).trim().slice(0, 40) || b.username;
      if (body.status === 'on' || body.status === 'off') b.status = body.status;
      if (body.status === 'on') ensureBotWebhookSecret(b);
      return b;
    });
    if (!bot) return send(res, 404, { error: 'Бот не найден' });
    if (bot.status === 'on') {
      try { await registerBotWebhook(bot); }
      catch (err) { console.error('[tg webhook] setWebhook', err.message); }
    }
    return send(res, 200, { ...bot, tokenEnc: undefined, webhookSecret: undefined });
  }

  if (method === 'DELETE' && path.match(/^\/api\/bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.bots = d.bots.filter((x) => !(x.id === id && x.userId === u.id)); });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/tg/channels/refresh') {
    const u = requireUser(req, res); if (!u) return;
    const d0 = load();
    const bots = d0.bots.filter((b) => b.userId === u.id && b.status !== 'off');
    if (!bots.length) return send(res, 400, { error: 'Сначала подключите бота и сделайте его администратором канала' });
    const found = [];
    for (const b of bots) {
      const token = botToken(b);
      if (!token) continue;
      try {
        const chats = await telegramDiscoverChats(token);
        for (const c of chats) found.push({ ...c, botId: b.id });
      } catch { /* one bot may fail, others still refresh */ }
    }
    const added = mutate((d) => {
      d.tgChannels = d.tgChannels || [];
      let n = 0;
      for (const c of found) {
        const exists = d.tgChannels.find((x) => x.userId === u.id && (x.chatId === c.chatId || x.username === c.username));
        if (exists) {
          exists.name = c.name || exists.name;
          exists.chatId = c.chatId || exists.chatId;
          exists.botId = c.botId || exists.botId;
          continue;
        }
        d.tgChannels.unshift({
          id: 'ch' + Date.now() + n,
          userId: u.id,
          name: c.name,
          username: c.username,
          chatId: c.chatId,
          botId: c.botId,
          status: 'on',
        });
        n += 1;
      }
      return n;
    });
    return send(res, 200, { ok: true, added, found: found.length });
  }

  if (method === 'POST' && path === '/api/tg/channels') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    let username = String(body.username || body.name || '').trim().slice(0, 80);
    if (!username) return send(res, 400, { error: 'Укажите @username канала' });
    if (!username.startsWith('@') && !username.startsWith('-') && !username.includes('t.me/')) {
      username = '@' + username.replace(/^@/, '');
    }
    if (username.includes('t.me/')) username = '@' + username.split('t.me/').pop().replace(/\/.*/, '');
    const d0 = load();
    const bots = d0.bots.filter((b) => b.userId === u.id && b.status !== 'off');
    let meta = { title: username, id: '', username: username.replace(/^@/, '') };
    if (bots.length) {
      let lastErr = null;
      for (const b of bots) {
        const token = botToken(b);
        if (!token) continue;
        try {
          const chat = await telegramGetChat(token, username.startsWith('-') ? username : username);
          meta = { title: chat.title || username, id: String(chat.id || ''), username: chat.username ? '@' + chat.username : username, botId: b.id };
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (lastErr && !meta.id) return sendFail(res, lastErr);
    }
    const ch = mutate((d) => {
      d.tgChannels = d.tgChannels || [];
      const row = {
        id: 'ch' + Date.now(), userId: u.id,
        name: String(body.name || meta.title || username).trim().slice(0, 80),
        username: meta.username || username,
        chatId: meta.id || '',
        botId: meta.botId || '',
        status: 'on',
      };
      d.tgChannels.unshift(row);
      return row;
    });
    return send(res, 200, ch);
  }

  if (method === 'POST' && path === '/api/tg/trial') {
    const u = requireUser(req, res); if (!u) return;
    if (!isTelegramLive()) {
      return send(res, 400, { error: 'Пробный Telegram закрыт, пока не включён живой webhook.' });
    }
    if (u.tgTrialUsed) return send(res, 400, { error: 'Пробные 3 дня Telegram уже использованы' });
    if (u.tgPlan?.until > Date.now() && u.tgPlan.id && u.tgPlan.id !== 'trial') {
      return send(res, 400, { error: 'У вас уже есть тариф Telegram' });
    }
    mutate((d) => {
      const x = d.users.find((i) => i.id === u.id);
      if (!x) return;
      x.tgTrialUsed = true;
      x.tgPlan = { id: 'trial', lite: 1, pro: 0, until: Date.now() + 3 * 86400000 };
    });
    return send(res, 200, snapshot(load().users.find((i) => i.id === u.id)));
  }
  if (method === 'PATCH' && path.match(/^\/api\/tg\/channels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const ch = mutate((d) => {
      const row = (d.tgChannels || []).find((x) => x.id === id && x.userId === u.id);
      if (!row) return null;
      if (body.name != null) row.name = String(body.name).trim().slice(0, 80) || row.name;
      if (body.username != null) row.username = String(body.username).trim().slice(0, 40) || row.username;
      if (body.status === 'on' || body.status === 'off') row.status = body.status;
      return row;
    });
    if (!ch) return send(res, 404, { error: 'Канал не найден' });
    return send(res, 200, ch);
  }

  if (method === 'DELETE' && path.match(/^\/api\/tg\/channels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.tgChannels = (d.tgChannels || []).filter((x) => !(x.id === id && x.userId === u.id)); });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/tg/funnels') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const kind = body.kind === 'pro' ? 'pro' : 'lite';
    const d0 = load();
    const plan = liveTgPlan(d0.users.find((x) => x.id === u.id) || u);
    const used = tgSlotUsage(d0, u.id);
    if (kind === 'pro' && used.pro >= (plan.pro || 0)) {
      return send(res, 400, { error: 'Нет свободного слота Pro — подключите тариф или отправьте воронку в архив' });
    }
    if (kind !== 'pro' && used.lite >= (plan.lite || 0)) {
      return send(res, 400, { error: 'Нет свободного слота Lite — подключите тариф или отправьте воронку в архив' });
    }
    const sections = Array.isArray(body.sections)
      ? body.sections.slice(0, 12).map((s) => ({
          title: String(s.title || '').trim().slice(0, 80),
          text: String(s.text || '').trim().slice(0, 2000),
          buttons: String(s.buttons || '').trim().slice(0, 200),
        })).filter((s) => s.title || s.text)
      : [];
    const funnel = mutate((d) => {
      d.tgFunnels = d.tgFunnels || [];
      const row = {
        id: 'fn' + Date.now(),
        userId: u.id,
        name: String(body.name || 'Новая воронка').trim().slice(0, 80) || 'Новая воронка',
        scenario: String(body.scenario || '').slice(0, 40),
        kind,
        botId: String(body.botId || ''),
        status: 'on',
        product: String(body.product || '').slice(0, 120),
        price: String(body.price || '').slice(0, 40),
        sections: sections.length ? sections : [{ title: 'Старт', text: 'Добро пожаловать.', buttons: 'Далее' }],
        products: [],
        settings: {},
      };
      d.tgFunnels.unshift(row);
      return row;
    });
    return send(res, 200, funnel);
  }

  if (method === 'PATCH' && path.match(/^\/api\/tg\/funnels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const d0 = load();
    const row0 = (d0.tgFunnels || []).find((x) => x.id === id && x.userId === u.id);
    if (!row0) return send(res, 404, { error: 'Воронка не найдена' });
    const nextStatus = (body.status === 'on' || body.status === 'off' || body.status === 'archive') ? body.status : row0.status;
    if (row0.status === 'archive' && nextStatus !== 'archive') {
      const kind = row0.kind === 'pro' ? 'pro' : 'lite';
      const plan = liveTgPlan(d0.users.find((x) => x.id === u.id) || u);
      const used = tgSlotUsage(d0, u.id);
      if (kind === 'pro' && used.pro >= (plan.pro || 0)) {
        return send(res, 400, { error: 'Нет свободного слота Pro' });
      }
      if (kind !== 'pro' && used.lite >= (plan.lite || 0)) {
        return send(res, 400, { error: 'Нет свободного слота Lite' });
      }
    }
    const funnel = mutate((d) => {
      const row = (d.tgFunnels || []).find((x) => x.id === id && x.userId === u.id);
      if (!row) return null;
      if (body.name != null) row.name = String(body.name).trim().slice(0, 80) || row.name;
      if (body.product != null) row.product = String(body.product).trim().slice(0, 120);
      if (body.price != null) row.price = String(body.price).trim().slice(0, 40);
      if (body.botId != null) row.botId = String(body.botId);
      if (body.status === 'on' || body.status === 'off' || body.status === 'archive') row.status = body.status;
      if (Array.isArray(body.sections)) {
        row.sections = body.sections.slice(0, 12).map((s) => ({
          title: String(s.title || '').trim().slice(0, 80),
          text: String(s.text || '').trim().slice(0, 2000),
          buttons: String(s.buttons || '').trim().slice(0, 200),
        }));
      }
      if (body.settings && typeof body.settings === 'object') {
        row.settings = { ...(row.settings || {}), ...body.settings };
        for (const k of Object.keys(row.settings)) {
          row.settings[k] = String(row.settings[k] || '').slice(0, 2000);
        }
      }
      return row;
    });
    if (!funnel) return send(res, 404, { error: 'Воронка не найдена' });
    return send(res, 200, funnel);
  }

  if (method === 'GET' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const products = listFunnelProducts(u.id, id);
    if (products == null) return send(res, 404, { error: 'Воронка не найдена' });
    return send(res, 200, products);
  }

  if (method === 'POST' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const body = await readBody(req);
    const row = createFunnelProduct(u.id, id, body);
    if (!row) return send(res, 404, { error: 'Воронка не найдена' });
    return send(res, 200, row);
  }

  if (method === 'PATCH' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const parts = path.split('/');
    const funnelId = parts[4];
    const productId = parts[6];
    const body = await readBody(req);
    const row = patchFunnelProduct(u.id, funnelId, productId, body);
    if (!row) return send(res, 404, { error: 'Не найдено' });
    return send(res, 200, row);
  }

  if (method === 'DELETE' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const parts = path.split('/');
    deleteFunnelProduct(u.id, parts[4], parts[6]);
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && path.match(/^\/api\/tg\/funnels\/[^/]+\/orders$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const orders = listFunnelOrders(u.id, id);
    if (orders == null) return send(res, 404, { error: 'Воронка не найдена' });
    return send(res, 200, orders);
  }

  if (path === '/api/lead-bots' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return;
    return send(res, 200, listHostedLeadBots(u.id).map(publicHostedLeadBot));
  }

  if (path === '/api/lead-bots' && method === 'POST') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const row = createHostedLeadBot(u.id, body);
    return send(res, 200, publicHostedLeadBot(row));
  }

  if (method === 'PATCH' && path.match(/^\/api\/lead-bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const row = patchHostedLeadBot(u.id, id, body);
    if (!row) return send(res, 404, { error: 'Бот не найден' });
    return send(res, 200, publicHostedLeadBot(row));
  }

  if (method === 'DELETE' && path.match(/^\/api\/lead-bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    deleteHostedLeadBot(u.id, id);
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && path.match(/^\/api\/lead-bots\/[^/]+\/widget-snippet$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const bot = listHostedLeadBots(u.id).find((b) => b.id === id);
    if (!bot) return send(res, 404, { error: 'Бот не найден' });
    return send(res, 200, { snippet: widgetSnippetForBot(bot), endpoint: bot.publicKey });
  }

  if (method === 'POST' && path.match(/^\/api\/lead-bots\/[^/]+\/deploy-funnel$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    try {
      const funnel = deployLeadBotToFunnel(u.id, id);
      return send(res, 200, { funnel, bot: publicHostedLeadBot(listHostedLeadBots(u.id).find((b) => b.id === id)) });
    } catch (err) { return sendFail(res, err); }
  }

  if (method === 'POST' && path.match(/^\/api\/public\/widget\/[^/]+\/lead$/)) {
    const key = path.split('/')[4];
    const body = await readBody(req);
    const result = submitWidgetLead(key, body);
    if (!result.ok) return send(res, 400, { error: result.error || 'Ошибка' });
    return send(res, 200, { ok: true, message: result.message });
  }

  if (method === 'DELETE' && path.match(/^\/api\/tg\/funnels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.tgFunnels = (d.tgFunnels || []).filter((x) => !(x.id === id && x.userId === u.id)); });
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && path === '/api/public/landings/host') {
    const host = requestHost(req);
    const d = load();
    const l = findPublishedLandingByHost(d, host);
    if (!l) return send(res, 404, { error: 'На этом домене нет опубликованной страницы' });
    return send(res, 200, publicLandingPayload(l, d));
  }

  if (method === 'GET' && path.match(/^\/api\/public\/landings\/slug\/[^/]+$/)) {
    const slug = decodeURIComponent(path.split('/').pop());
    const payload = mutate((d) => {
      const l = findPublishedLandingBySlug(d, slug);
      if (!l) return null;
      bumpLandingView(d, l.id);
      return publicLandingPayload(l, d);
    });
    if (!payload) return send(res, 404, { error: 'Страница не найдена' });
    return send(res, 200, payload);
  }

  if (method === 'GET' && path.match(/^\/api\/public\/landings\/[^/]+$/)) {
    const key = decodeURIComponent(path.split('/').pop());
    const payload = mutate((d) => {
      let l = d.landings.find((x) => x.id === key && x.status === 'published');
      if (!l) l = findPublishedLandingBySlug(d, key);
      if (!l) return null;
      bumpLandingView(d, l.id);
      return publicLandingPayload(l, d);
    });
    if (!payload) return send(res, 404, { error: 'Страница не найдена' });
    return send(res, 200, payload);
  }

  if (method === 'POST' && path.match(/^\/api\/public\/landings\/[^/]+\/leads$/)) {
    if (!enforceRate(req, res, 'lead')) return;
    const key = decodeURIComponent(path.split('/')[4]);
    const body = await readBody(req);
    if (String(body.website || body.company || '').trim()) return send(res, 200, { ok: true });
    const d = load();
    let landing = d.landings.find((x) => x.id === key && x.status === 'published');
    if (!landing) landing = findPublishedLandingBySlug(d, key);
    if (!landing) return send(res, 404, { error: 'Страница не найдена' });
    const id = landing.id;
    const name = String(body.name || '').trim().slice(0, 80);
    const phone = String(body.phone || '').trim().slice(0, 40);
    const email = String(body.email || '').trim().slice(0, 80);
    const comment = String(body.comment || '').trim().slice(0, 500);
    const utm = ['utm_source', 'utm_medium', 'utm_campaign']
      .map((k) => (body[k] ? `${k.replace('utm_', '')}=${String(body[k]).trim().slice(0, 40)}` : ''))
      .filter(Boolean)
      .join('&');
    if (!name) return send(res, 400, { error: 'Укажите имя' });
    const digits = phone.replace(/\D/g, '');
    if (landing.fields?.includes('phone') && digits.length < 10) {
      return send(res, 400, { error: 'Укажите телефон' });
    }
    const ownerId = landing.userId;
    if (!ownerId) return send(res, 400, { error: 'Страница недоступна для заявок' });
    const lead = mutate((db) => {
      const page = db.landings.find((x) => x.id === id);
      const phoneKey = digits;
      const recent = db.leads.find((x) => (
        x.landingId === id
        && String(x.phone || '').replace(/\D/g, '') === phoneKey
        && (x.createdAt || 0) > Date.now() - 60000
      ));
      if (recent) return recent;
      page.leads = (page.leads || 0) + 1;
      const row = {
        id: 'c' + Date.now(),
        userId: ownerId,
        name,
        phone,
        email,
        source: `Лендинг · ${page.name}`,
        landingId: page.id,
        landingName: page.name,
        score: 6,
        stage: 'new',
        city: '—',
        note: [comment, utm ? `UTM: ${utm}` : ''].filter(Boolean).join(' · ').slice(0, 500),
        createdAt: Date.now(),
      };
      db.leads.unshift(row);
      return row;
    });
    return send(res, 200, { ok: true, id: lead.id });
  }

  if (method === 'GET' && path.match(/^\/api\/landings\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const l = findOwnedLanding(load(), u, id);
    if (!l) return send(res, 404, { error: 'Страница не найдена' });
    return send(res, 200, { ...l, url: landingPublicUrl(req, l) });
  }

  if (method === 'POST' && path.match(/^\/api\/landings\/[^/]+\/generate$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const l0 = findOwnedLanding(load(), u, id);
    if (!l0) return send(res, 404, { error: 'Страница не найдена' });
    try {
      const flat = await generateLandingContent(l0, body, load());
      const landing = mutate((d) => {
        const l = findOwnedLanding(d, u, id);
        if (!l) return null;
        const pro = toolOn(u, 'landings-pro', d.settings);
        const next = sanitizeLandingContent(flat, l, { pro });
        Object.assign(l, next);
        l.content = flat.content;
        return l;
      });
      return send(res, 200, { ...landing, url: landingPublicUrl(req, landing) });
    } catch (err) {
      return send(res, 400, { error: err instanceof Error ? err.message : 'Не удалось сгенерировать' });
    }
  }

  if (method === 'PATCH' && path.match(/^\/api\/landings\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const landing = mutate((d) => {
      const l = findOwnedLanding(d, u, id);
      if (!l) return null;
      const pro = toolOn(u, 'landings-pro', d.settings);
      const nextTemplate = String(body.template != null ? body.template : l.template || '').trim();
      if (!landingTemplateAllowed(u, nextTemplate, d.settings)) return { forbidden: true };
      let patchBody = { ...body };
      if (body.content?.sections) {
        const flat = sectionsToFlat(body.content, l);
        patchBody = { ...flat, ...body, content: body.content };
      }
      if (body.slug != null) {
        const slug = normalizeSlug(body.slug) || l.slug;
        if (landingSlugTaken(d, slug, l.id)) return { slugTaken: true };
        patchBody.slug = slug;
      }
      if (body.name != null) patchBody.name = String(body.name).trim().slice(0, 80);
      const next = sanitizeLandingContent(patchBody, l, { pro });
      if (next.customHost && landingHostTaken(d, next.customHost, l.id)) {
        return { hostTaken: true };
      }
      if (!next.content?.sections) {
        next.content = landingContent({ ...l, ...next });
      }
      Object.assign(l, next);
      if (body.status === 'published' || body.status === 'draft') {
        l.status = body.status;
        if (body.status === 'published') l.publishedAt = Date.now();
      }
      l.url = landingPublicUrl(req, l);
      return l;
    });
    if (!landing) return send(res, 404, { error: 'Страница не найдена' });
    if (landing.forbidden) return send(res, 403, { error: 'PRO-шаблон доступен с тарифом «Лендинги PRO»' });
    if (landing.hostTaken) return send(res, 409, { error: 'Этот поддомен уже занят другой страницей' });
    if (landing.slugTaken) return send(res, 409, { error: 'Этот адрес уже занят другой страницей' });
    if (landing.customHost && landing.status === 'published' && isDnsAutomationEnabled()) {
      try {
        const dns = await ensureLandingDns(landing.customHost);
        applyLandingDnsMeta(landing, dns);
        mutate((d) => {
          const l = findOwnedLanding(d, u, id);
          if (l) applyLandingDnsMeta(l, dns);
        });
      } catch (err) {
        landing.dnsStatus = 'error';
        landing.dnsMessage = (err instanceof Error ? err.message : String(err)).slice(0, 240);
      }
    }
    return send(res, 200, landing);
  }

  if (method === 'DELETE' && path.match(/^\/api\/landings\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const removed = mutate((d) => {
      const i = d.landings.findIndex((x) => x.id === id && x.userId === u.id);
      if (i === -1) return false;
      d.landings.splice(i, 1);
      return true;
    });
    if (!removed) return send(res, 404, { error: 'Страница не найдена' });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path === '/api/landings') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const db = load();
    const templateId = String(body.template || '').trim();
    if (!landingTemplateAllowed(u, templateId, db.settings)) {
      return send(res, 403, { error: 'PRO-шаблон доступен с тарифом «Лендинги PRO»' });
    }
    const content = sanitizeLandingContent(body, { name: 'Новая страница' }, { pro: toolOn(u, 'landings-pro', db.settings) });
    if (content.customHost && landingHostTaken(db, content.customHost)) {
      return send(res, 409, { error: 'Этот поддомен уже занят другой страницей' });
    }
    const slugBase = normalizeSlug(content.name) || 'page';
    let slug = slugBase;
    for (let i = 0; i < 50; i += 1) {
      const candidate = i === 0 ? slugBase : `${slugBase}-${i + 1}`;
      if (!landingSlugTaken(db, candidate)) { slug = candidate; break; }
    }
    const landing = mutate((d) => {
      const id = 'p' + Date.now();
      const l = {
        id,
        userId: u.id,
        url: '',
        slug,
        leads: 0,
        viewsCount: 0,
        status: 'draft',
        createdAt: Date.now(),
        ...content,
      };
      l.content = landingContent(l);
      l.url = landingPublicUrl(req, l);
      d.landings.unshift(l);
      return l;
    });
    return send(res, 200, landing);
  }

  /* ---- admin ---- */
  if (method === 'GET' && path === '/api/admin/overview') {
    if (!requireAdmin(req, res)) return;
    const d = load();
    const h = healthPayload();
    return send(res, 200, {
      users: d.users.filter((u) => u.role !== 'admin').length,
      accounts: d.accounts.length,
      campaignsRunning: d.campaigns.filter((c) => c.status === 'running').length,
      jobs: d.jobs.length,
      errors: d.logs.filter((l) => l.level === 'warn').length,
      leads: d.leads.length,
      pendingPayments: (d.payments || []).filter((p) => p.status === 'pending').length,
      legal: mergedLegal(),
      contour: {
        storage: h.storage,
        storageSchema: h.storageSchema,
        paymentsLive: h.paymentsLive,
        telegramLive: h.telegramLive,
        mailConfigured: h.mailConfigured,
        encryptionKey: h.encryptionKey,
        aiConfigured: publicAiSettings(d.settings.ai).configured,
        backups: h.backups,
      },
      brokenBots: (d.bots || [])
        .filter((b) => !botToken(b))
        .map((b) => ({ id: b.id, name: b.name, username: b.username, status: b.status })),
      tools: TOOLS.map((slug) => ({
        slug,
        enabled: d.settings.toolsEnabled[slug] !== false,
        campaigns: d.campaigns.filter((c) => c.slug === slug).length,
      })),
    });
  }

  if (method === 'GET' && path === '/api/admin/users') {
    if (!requireAdmin(req, res)) return;
    return send(res, 200, load().users.map((u) => ({
      ...publicUser(u),
      aiCredits: aiCreditsBalance(u),
    })));
  }

  if (method === 'PATCH' && path.startsWith('/api/admin/users/')) {
    if (!requireAdmin(req, res)) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    if (body.credit != null) {
      const amount = Math.round(Number(body.credit));
      if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 300000) {
        return send(res, 400, { error: 'Сумма начисления — от 1 до 300 000 ₽' });
      }
    }
    if (body.aiCredits != null) {
      const credits = Math.round(Number(body.aiCredits));
      if (!Number.isFinite(credits) || credits === 0 || Math.abs(credits) > 100000) {
        return send(res, 400, { error: 'Кредиты Image AI — от 1 до 100 000' });
      }
    }
    try {
      mutate((d) => {
        const u = d.users.find((x) => x.id === id);
        if (!u) return;
        if (body.banned != null) u.banned = !!body.banned;
        if (body.credit != null) creditBalance(d, id, body.credit);
        else if (body.balance != null) u.balance = Number(body.balance);
        if (body.aiCredits != null) grantAiCredits(d, id, body.aiCredits, 'admin');
        if (body.trialHours != null) u.trialUntil = Date.now() + Number(body.trialHours) * 3600 * 1000;
        if (body.packageId != null) u.packageId = body.packageId || null;
        if (body.accountSlots != null) u.accountSlots = Number(body.accountSlots);
        if (body.role) u.role = body.role;
      });
    } catch (err) {
      return sendFail(res, err);
    }
    const u = load().users.find((x) => x.id === id);
    return send(res, 200, { ...publicUser(u), aiCredits: aiCreditsBalance(u) });
  }

  if (method === 'GET' && path === '/api/admin/accounts') {
    if (!requireAdmin(req, res)) return;
    const d = load();
    return send(res, 200, d.accounts.map((a) => ({
      ...a, tokenEnc: undefined,
      userEmail: d.users.find((u) => u.id === a.userId)?.email,
    })));
  }

  if (method === 'GET' && path === '/api/admin/jobs') {
    if (!requireAdmin(req, res)) return;
    return send(res, 200, { campaigns: load().campaigns, jobs: load().jobs.slice(0, 200) });
  }

  if (method === 'POST' && path.startsWith('/api/admin/campaigns/') && path.endsWith('/stop')) {
    if (!requireAdmin(req, res)) return;
    const id = path.split('/')[4];
    mutate((d) => {
      const c = d.campaigns.find((x) => x.id === id);
      if (c) c.status = 'paused';
    });
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && path === '/api/admin/logs') {
    if (!requireAdmin(req, res)) return;
    return send(res, 200, load().logs.slice(0, 300));
  }

  if (method === 'GET' && path === '/api/admin/settings') {
    if (!requireAdmin(req, res)) return;
    const s = { ...load().settings };
    s.ai = publicAiSettings(s.ai);
    s.toolSlugs = [...TOOLS, 'landings-pro', 'lists', 'parsing-accounts-vk', 'parsing-groups-vk'];
    return send(res, 200, s);
  }

  if (method === 'PATCH' && path === '/api/admin/settings') {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    delete body.ai;
    delete body.apiKeyEnc;
    let legalInn = '';
    if (body.legal && typeof body.legal === 'object') {
      legalInn = String(body.legal.inn || '').replace(/\D/g, '').slice(0, 12);
      if (legalInn && !isValidInn(legalInn)) {
        return send(res, 400, { error: 'ИНН не проходит контрольную сумму ФНС. Проверьте цифры — значение не подставляется автоматически.' });
      }
    }
    mutate((d) => {
      d.settings = { ...d.settings, ...body };
      if (body.vkAppId !== undefined) {
        const vkId = String(body.vkAppId || '').trim();
        d.settings.vkAppId = (vkId === '53828134' || vkId === '54690675') ? '5530956' : vkId;
      }
      if (body.vkMessagesUiEnabled !== undefined) {
        d.settings.vkMessagesUiEnabled = body.vkMessagesUiEnabled === true || body.vkMessagesUiEnabled === '1' || body.vkMessagesUiEnabled === 'on';
      }
      if (body.toolsEnabled) d.settings.toolsEnabled = { ...d.settings.toolsEnabled, ...body.toolsEnabled };
      if (body.legal && typeof body.legal === 'object') {
        d.settings.legal = {
          operator: String(body.legal.operator || '').trim().slice(0, 160),
          inn: legalInn,
          ogrn: String(body.legal.ogrn || '').replace(/\D/g, '').slice(0, 15),
          address: String(body.legal.address || '').trim().slice(0, 240),
          email: String(body.legal.email || '').trim().slice(0, 120),
        };
      }
    });
    const s = { ...load().settings };
    s.ai = publicAiSettings(s.ai);
    return send(res, 200, s);
  }

  if (method === 'GET' && path === '/api/admin/ai') {
    if (!requireAdmin(req, res)) return;
    const s = load().settings;
    return send(res, 200, {
      source: AI_CATALOG_SOURCE,
      catalog: AI_PROVIDERS.map((p) => ({ ...p, creditCardLabel: creditCardLabel(p.creditCard) })),
      config: publicAiSettings(s.ai),
    });
  }

  if (method === 'PATCH' && path === '/api/admin/ai') {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    try {
      mutate((d) => {
        d.settings.ai = applyAiSettings(d.settings.ai, body);
      });
      return send(res, 200, publicAiSettings(load().settings.ai));
    } catch (err) {
      return sendFail(res, err, 'Не удалось сохранить ключ');
    }
  }

  if (method === 'POST' && path === '/api/admin/ai/test') {
    if (!requireAdmin(req, res)) return;
    try {
      const result = await testAiChat(readAiConfig(load().settings));
      return send(res, 200, result);
    } catch (err) {
      return sendFail(res, err, 'Проверка не удалась');
    }
  }

  if (method === 'POST' && path === '/api/admin/ai/test-image') {
    if (!requireAdmin(req, res)) return;
    try {
      const img = await generateAiImage(
        { prompt: 'Minimal SMM post cover, teal and cream, abstract geometric', ratio: '1:1 пост' },
        readAiConfig(load().settings),
      );
      const url = saveGeneratedImage(img);
      return send(res, 200, { ok: true, url });
    } catch (err) {
      return sendFail(res, err, 'Картинка не сгенерировалась');
    }
  }

  if (method === 'POST' && path === '/api/admin/landing-dns/sync') {
    if (!requireAdmin(req, res)) return;
    try {
      const db = load();
      const results = await syncPublishedLandingDns(db);
      mutate((d) => {
        for (const row of results) {
          if (!row.host || row.status !== 'ok') continue;
          const landing = (d.landings || []).find(
            (l) => l.status === 'published' && String(l.customHost || '').toLowerCase() === row.host,
          );
          if (landing) applyLandingDnsMeta(landing, row);
        }
      });
      return send(res, 200, { ok: true, results });
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/admin/tick') {
    if (!requireAdmin(req, res)) return;
    await tick();
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path.startsWith('/api/webhooks/inbound/')) {
    if (!enforceRate(req, res, 'webhook')) return;
    const inboundToken = decodeURIComponent(path.slice('/api/webhooks/inbound/'.length));
    const user = findUserByInboundToken(load(), inboundToken);
    if (!user) return send(res, 401, { error: 'Invalid token' });
    const body = await readBody(req);
    try {
      const result = mutate((db) => {
        const u = findUserByInboundToken(db, inboundToken);
        if (!u) {
          const err = new Error('Invalid token');
          err.status = 401;
          throw err;
        }
        return handleInboundWebhook(db, u.id, body);
      });
      return send(res, 200, result);
    } catch (err) {
      return sendFail(res, err);
    }
  }

  if (method === 'POST' && path.startsWith('/api/tg/webhook/')) {
    if (!enforceRate(req, res, 'webhook')) return;
    const botId = path.split('/').pop();
    const secret = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    const bot = (load().bots || []).find((b) => b.id === botId);
    if (!bot || bot.status === 'off') return send(res, 404, { error: 'bot' });
    if (!bot.webhookSecret || String(bot.webhookSecret).length < 16) return send(res, 401, { error: 'forbidden' });
    if (!safeEqual(secret, bot.webhookSecret)) return send(res, 401, { error: 'forbidden' });
    const body = await readBody(req);
    try {
      const result = await handleTelegramUpdate(bot, body);
      return send(res, 200, { ok: true, step: result.step, done: result.done });
    } catch (err) {
      console.error('[tg webhook]', err.message);
      return send(res, 200, { ok: true });
    }
  }

  send(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]).replace(/\\/g, '/');
  if (rel === '/') rel = '/index.html';
  if (rel === '/admin' || rel === '/admin/') rel = '/admin/index.html';
  rel = rel.replace(/^\//, '');
  if (/^r\/[A-Za-z0-9_-]+\/?$/.test(rel)) rel = 'index.html';
  const blocked = rel.startsWith('data') || rel.startsWith('server') || rel.includes('..');
  const file = normalize(join(ROOT, rel));
  const rootNorm = normalize(ROOT).toLowerCase();
  if (blocked || !file.toLowerCase().startsWith(rootNorm) || !existsSync(file) || statSync(file).isDirectory()) {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }
  const type = MIME[extname(file)] || 'application/octet-stream';
  const extra = {};
  if (rel.startsWith('admin')) extra['X-Robots-Tag'] = 'noindex, nofollow';
  res.writeHead(200, { ...securityHeaders(req), 'Content-Type': type, 'Cache-Control': 'no-cache', ...extra });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  requestAls.run(req, async () => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, securityHeaders(req));
      return res.end();
    }
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    try {
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      return serveStatic(req, res, url.pathname);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: isProd() ? 'Сервис временно недоступен' : publicCabinetError(err, 'Server error') });
    }
  });
});

load();
tickBackup();
startWorker();
function bootWebhooks() {
  const bots = mutate((d) => {
    for (const b of d.bots || []) {
      if (b.status === 'off') continue;
      ensureBotWebhookSecret(b);
    }
    return (d.bots || []).filter((b) => b.status !== 'off');
  });
  for (const b of bots) {
    registerBotWebhook(b).catch((err) => console.error('[tg webhook]', b.id, err.message));
  }
}
const PUBLIC_URL = String(process.env.PUBLIC_URL || 'https://onlead.m360-ural.online').replace(/\/$/, '');
server.listen(PORT, '0.0.0.0', () => {
  const key = encryptionKeyStatus();
  console.log(`OnLead API http://0.0.0.0:${PORT}`);
  console.log(`Кабинет  ${PUBLIC_URL}/`);
  console.log(`Админка  ${PUBLIC_URL}/admin`);
  console.log(`VK API   post2post adapters${allowMocks() ? ' (mock:vk разрешён локально)' : ' (только живой access_token)'}`);
  console.log(`Prod     ${isProd() ? 'yes' : 'no'} · mocks ${allowMocks() ? 'on' : 'off'} · telegramLive ${isTelegramLive() ? 'yes' : 'no'} · encKey ${key.ok ? 'ok' : key.reason} · storage ${storageEngine()} v${storageSchema()}`);
  bootWebhooks();
});
