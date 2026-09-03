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
