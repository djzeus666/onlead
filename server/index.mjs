/**
 * OnLead API + static host.
 * VK live client ported from D:\\Project\\post2post\\packages\\integrations\\src\\vk
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
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
import { syncPublishedLandingDns, applyLandingDnsMeta } from './landing-dns.mjs';
import { saveUserMedia, listUserMedia, decodeUploadBody, mediaPath, deleteUserMedia } from './media.mjs';
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
  publicCabinet, AI_AGENT_CARDS,
} from './cabinet.mjs';
import {
  ensureInboundWebhookToken, rotateInboundWebhookToken, findUserByInboundToken,
  handleInboundWebhook, inboundWebhookUrl,
} from './webhooks-inbound.mjs';
import { exchangeVkOAuthCode, resolveVkOAuthScope, vkOAuthUsesCodeFlow } from './vk-oauth.mjs';
import {
  requestAls, send, sendFail, readBody, enforceRate, healthPayload, mergedLegal,
  bearer, authUser, requireUser, requireAdmin, publicOrigin, createApiContext,
} from './http-api.mjs';
import {
  snapshot, publicAccount, publicCampaign, botToken, liveTgPlan, tgSlotUsage, publicPromo,
} from './snapshot.mjs';
import { dispatchRoutes } from './routes/dispatch.mjs';
import { assertWorkspaceMutation } from './workspace-rbac.mjs';

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


async function handleApi(req, res, url) {
  const method = req.method;
  const path = url.pathname;

  if (await dispatchRoutes(createApiContext(req, res, url))) return;
  if (!assertWorkspaceMutation(req, res, path)) return;


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
    if (!toolOn(u, 'leadgen-vk', load().settings)) return send(res, 403, { error: 'Р›РёРґРѕРіРµРЅРµСЂР°С‚РѕСЂ РЅРµ Р°РєС‚РёРІРµРЅ' });
    const cfg = getLeadgenConfig(u.id);
    if (!cfg.phrases?.length) return send(res, 400, { error: 'Р”РѕР±Р°РІСЊС‚Рµ РїРѕРёСЃРєРѕРІС‹Рµ С„СЂР°Р·С‹' });
    if (!cfg.groups?.length) return send(res, 400, { error: 'Р’С‹Р±РµСЂРёС‚Рµ СЃРѕРѕР±С‰РµСЃС‚РІР° РґР»СЏ СЃРєР°РЅР°' });
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
    if (!match) return send(res, 404, { error: 'РќРµС‚ СЃРѕРІРїР°РґРµРЅРёСЏ' });
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
    if (!toolOn(u, 'neurocomment-vk', load().settings)) return send(res, 403, { error: 'РќРµР№СЂРѕРєРѕРјРјРµРЅС‚Р°СЂРёРё РЅРµ Р°РєС‚РёРІРЅС‹' });
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
    if (!toolOn(u, 'ai-lead-vk', load().settings)) return send(res, 403, { error: 'AI Р›РёРґ-РјРµРЅРµРґР¶РµСЂ РЅРµ Р°РєС‚РёРІРµРЅ' });
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
    return send(res, 200, { ok: true, ...snapshot(u) });
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
    return send(res, 200, { ok: true, ...snapshot(u) });
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


  if (method === 'POST' && path === '/api/bots') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const token = String(body.token || body.username || '').trim();
    if (!token) return send(res, 400, { error: 'Р’СЃС‚Р°РІСЊС‚Рµ С‚РѕРєРµРЅ РёР· @BotFather' });
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
    if (!bot) return send(res, 404, { error: 'Р‘РѕС‚ РЅРµ РЅР°Р№РґРµРЅ' });
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
    if (!bots.length) return send(res, 400, { error: 'РЎРЅР°С‡Р°Р»Р° РїРѕРґРєР»СЋС‡РёС‚Рµ Р±РѕС‚Р° Рё СЃРґРµР»Р°Р№С‚Рµ РµРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј РєР°РЅР°Р»Р°' });
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
    if (!username) return send(res, 400, { error: 'РЈРєР°Р¶РёС‚Рµ @username РєР°РЅР°Р»Р°' });
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
      return send(res, 400, { error: 'РџСЂРѕР±РЅС‹Р№ Telegram Р·Р°РєСЂС‹С‚, РїРѕРєР° РЅРµ РІРєР»СЋС‡С‘РЅ Р¶РёРІРѕР№ webhook.' });
    }
    if (u.tgTrialUsed) return send(res, 400, { error: 'РџСЂРѕР±РЅС‹Рµ 3 РґРЅСЏ Telegram СѓР¶Рµ РёСЃРїРѕР»СЊР·РѕРІР°РЅС‹' });
    if (u.tgPlan?.until > Date.now() && u.tgPlan.id && u.tgPlan.id !== 'trial') {
      return send(res, 400, { error: 'РЈ РІР°СЃ СѓР¶Рµ РµСЃС‚СЊ С‚Р°СЂРёС„ Telegram' });
    }
    mutate((d) => {
      const x = d.users.find((i) => i.id === u.id);
      if (!x) return;
      x.tgTrialUsed = true;
      x.tgPlan = { id: 'trial', lite: 1, pro: 0, until: Date.now() + 3 * 86400000 };
    });
    return send(res, 200, snapshot(u));
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
    if (!ch) return send(res, 404, { error: 'РљР°РЅР°Р» РЅРµ РЅР°Р№РґРµРЅ' });
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
      return send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Pro вЂ” РїРѕРґРєР»СЋС‡РёС‚Рµ С‚Р°СЂРёС„ РёР»Рё РѕС‚РїСЂР°РІСЊС‚Рµ РІРѕСЂРѕРЅРєСѓ РІ Р°СЂС…РёРІ' });
    }
    if (kind !== 'pro' && used.lite >= (plan.lite || 0)) {
      return send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Lite вЂ” РїРѕРґРєР»СЋС‡РёС‚Рµ С‚Р°СЂРёС„ РёР»Рё РѕС‚РїСЂР°РІСЊС‚Рµ РІРѕСЂРѕРЅРєСѓ РІ Р°СЂС…РёРІ' });
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
        name: String(body.name || 'РќРѕРІР°СЏ РІРѕСЂРѕРЅРєР°').trim().slice(0, 80) || 'РќРѕРІР°СЏ РІРѕСЂРѕРЅРєР°',
        scenario: String(body.scenario || '').slice(0, 40),
        kind,
        botId: String(body.botId || ''),
        status: 'on',
        product: String(body.product || '').slice(0, 120),
        price: String(body.price || '').slice(0, 40),
        sections: sections.length ? sections : [{ title: 'РЎС‚Р°СЂС‚', text: 'Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ.', buttons: 'Р”Р°Р»РµРµ' }],
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
    if (!row0) return send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' });
    const nextStatus = (body.status === 'on' || body.status === 'off' || body.status === 'archive') ? body.status : row0.status;
    if (row0.status === 'archive' && nextStatus !== 'archive') {
      const kind = row0.kind === 'pro' ? 'pro' : 'lite';
      const plan = liveTgPlan(d0.users.find((x) => x.id === u.id) || u);
      const used = tgSlotUsage(d0, u.id);
      if (kind === 'pro' && used.pro >= (plan.pro || 0)) {
        return send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Pro' });
      }
      if (kind !== 'pro' && used.lite >= (plan.lite || 0)) {
        return send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Lite' });
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
    if (!funnel) return send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' });
    return send(res, 200, funnel);
  }

  if (method === 'GET' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const products = listFunnelProducts(u.id, id);
    if (products == null) return send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' });
    return send(res, 200, products);
  }

  if (method === 'POST' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const body = await readBody(req);
    const row = createFunnelProduct(u.id, id, body);
    if (!row) return send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' });
    return send(res, 200, row);
  }

  if (method === 'PATCH' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const parts = path.split('/');
    const funnelId = parts[4];
    const productId = parts[6];
    const body = await readBody(req);
    const row = patchFunnelProduct(u.id, funnelId, productId, body);
    if (!row) return send(res, 404, { error: 'РќРµ РЅР°Р№РґРµРЅРѕ' });
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
    if (orders == null) return send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' });
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
    if (!row) return send(res, 404, { error: 'Р‘РѕС‚ РЅРµ РЅР°Р№РґРµРЅ' });
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
    if (!bot) return send(res, 404, { error: 'Р‘РѕС‚ РЅРµ РЅР°Р№РґРµРЅ' });
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
    if (!result.ok) return send(res, 400, { error: result.error || 'РћС€РёР±РєР°' });
    return send(res, 200, { ok: true, message: result.message });
  }

  if (method === 'DELETE' && path.match(/^\/api\/tg\/funnels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    mutate((d) => { d.tgFunnels = (d.tgFunnels || []).filter((x) => !(x.id === id && x.userId === u.id)); });
    return send(res, 200, { ok: true });
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
        return send(res, 400, { error: 'РЎСѓРјРјР° РЅР°С‡РёСЃР»РµРЅРёСЏ вЂ” РѕС‚ 1 РґРѕ 300 000 в‚Ѕ' });
      }
    }
    if (body.aiCredits != null) {
      const credits = Math.round(Number(body.aiCredits));
      if (!Number.isFinite(credits) || credits === 0 || Math.abs(credits) > 100000) {
        return send(res, 400, { error: 'РљСЂРµРґРёС‚С‹ Image AI вЂ” РѕС‚ 1 РґРѕ 100 000' });
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
        return send(res, 400, { error: 'РРќРќ РЅРµ РїСЂРѕС…РѕРґРёС‚ РєРѕРЅС‚СЂРѕР»СЊРЅСѓСЋ СЃСѓРјРјСѓ Р¤РќРЎ. РџСЂРѕРІРµСЂСЊС‚Рµ С†РёС„СЂС‹ вЂ” Р·РЅР°С‡РµРЅРёРµ РЅРµ РїРѕРґСЃС‚Р°РІР»СЏРµС‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.' });
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
      return sendFail(res, err, 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РєР»СЋС‡');
    }
  }

  if (method === 'POST' && path === '/api/admin/ai/test') {
    if (!requireAdmin(req, res)) return;
    try {
      const result = await testAiChat(readAiConfig(load().settings));
      return send(res, 200, result);
    } catch (err) {
      return sendFail(res, err, 'РџСЂРѕРІРµСЂРєР° РЅРµ СѓРґР°Р»Р°СЃСЊ');
    }
  }

  if (method === 'POST' && path === '/api/admin/ai/test-image') {
    if (!requireAdmin(req, res)) return;
    try {
      const img = await generateAiImage(
        { prompt: 'Minimal SMM post cover, teal and cream, abstract geometric', ratio: '1:1 РїРѕСЃС‚' },
        readAiConfig(load().settings),
      );
      const url = saveGeneratedImage(img);
      return send(res, 200, { ok: true, url });
    } catch (err) {
      return sendFail(res, err, 'РљР°СЂС‚РёРЅРєР° РЅРµ СЃРіРµРЅРµСЂРёСЂРѕРІР°Р»Р°СЃСЊ');
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
      if (!res.headersSent) send(res, 500, { error: isProd() ? 'РЎРµСЂРІРёСЃ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРµРЅ' : publicCabinetError(err, 'Server error') });
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
  console.log(`РљР°Р±РёРЅРµС‚  ${PUBLIC_URL}/`);
  console.log(`РђРґРјРёРЅРєР°  ${PUBLIC_URL}/admin`);
  console.log(`VK API   post2post adapters${allowMocks() ? ' (mock:vk СЂР°Р·СЂРµС€С‘РЅ Р»РѕРєР°Р»СЊРЅРѕ)' : ' (С‚РѕР»СЊРєРѕ Р¶РёРІРѕР№ access_token)'}`);
  console.log(`Prod     ${isProd() ? 'yes' : 'no'} В· mocks ${allowMocks() ? 'on' : 'off'} В· telegramLive ${isTelegramLive() ? 'yes' : 'no'} В· encKey ${key.ok ? 'ok' : key.reason} В· storage ${storageEngine()} v${storageSchema()}`);
  bootWebhooks();
});
