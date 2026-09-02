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

async function handleApi(req, res, url) {
  const method = req.method;
  const path = url.pathname;

  if (await dispatchRoutes(createApiContext(req, res, url))) return;

  if (method === 'GET' && path === '/api/vk/oauth-url') {
    const u = requireUser(req, res); if (!u) return;
    const kind = String(url.searchParams.get('kind') || 'base').toLowerCase();
    const forMessages = kind === 'messages' || kind === 'msg';
    if (forMessages && load().settings.vkMessagesUiEnabled !== true) {
      return send(res, 403, { error: 'РџРѕР»СѓС‡РµРЅРёРµ С‚РѕРєРµРЅР° Р›РЎ РѕС‚РєР»СЋС‡РµРЅРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј' });
    }
    // Base/messages: same as online-lead.ru вЂ” 5530956 / 6463690 + oauth.vk.com/blank.html.
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
      ? 'Kate Mobile (2685278) VK С‡Р°СЃС‚Рѕ Р±Р»РѕРєРёСЂСѓРµС‚ (В«РЎРµСЂРІРёСЃ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅВ»). РЈРєР°Р¶РёС‚Рµ РїСЂРёР»РѕР¶РµРЅРёРµ 6463690, РєР°Рє РЅР° online-lead.ru.'
      : undefined;
    return send(res, 200, {
      url: urlOut, appId, redirectUri, kind: forMessages ? 'messages' : 'base', flow: responseType, warning,
    });
  }

  if (method === 'POST' && path === '/api/vk/oauth-token') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const code = String(body.code || '').trim();
    if (!code) return send(res, 400, { error: 'РќРµС‚ code РѕС‚ VK' });
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
    if (!raw) return send(res, 400, { error: 'РќРµС‚ access_token VK' });
    if (!allowMocks() && isMockToken(raw)) return send(res, 400, { error: mockBlockedMessage('VK') });
    const fromBrowser = normalizeChannels(body.channels);
    let info;
    try {
      info = await vkConnect({ accessToken: raw, groupId: body.groupId });
    } catch (err) {
      const personal = fromBrowser.find((c) => c.type === 'personal') || fromBrowser[0];
      if (!personal) return sendFail(res, err);
      info = {
        displayName: String(personal.name || 'VK').replace(/^РњРѕСЏ СЃС‚СЂР°РЅРёС†Р°\s*\((.+)\)\s*$/, '$1'),
        externalAccountId: personal.externalId,
        avatarUrl: personal.avatarUrl,
        metadata: { source: 'browser_oauth' },
      };
    }
    let channels = fromBrowser;
    if (!channels.length || !channelsHaveGroups(channels)) {
      try {
        channels = mergeChannels(channels, await vkListChannels(raw));
      } catch { /* IP-bound blank.html token вЂ” groups only from browser */ }
    }
    const db = load();
    const mine = db.accounts.filter((a) => a.userId === u.id);
    const existing = mine.find((a) => String(a.vkId) === String(info.externalAccountId));
    if (!existing && mine.length >= (u.accountSlots || 3)) {
      return send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅС‹С… СЃР»РѕС‚РѕРІ' });
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
        d.logs.unshift({ id: 'log-' + Date.now(), at: new Date().toISOString(), level: 'info', userId: u.id, message: `РћР±РЅРѕРІР»С‘РЅ VK ${a.name} В· РіСЂСѓРїРї ${groupsCount}` });
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
      d.logs.unshift({ id: 'log-' + Date.now(), at: new Date().toISOString(), level: 'info', userId: u.id, message: `РџРѕРґРєР»СЋС‡С‘РЅ VK ${a.name} В· РіСЂСѓРїРї ${groupsCount}` });
      return a;
    });
    const { tokenEnc: _hide, messagesTokenEnc: _hideMsg, ...safe } = acc;
    return send(res, 200, publicAccount(acc));
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/messages-token$/)) {
    const u = requireUser(req, res); if (!u) return;
    if (load().settings.vkMessagesUiEnabled !== true) {
      return send(res, 403, { error: 'РўРѕРєРµРЅ Р›РЎ РѕС‚РєР»СЋС‡С‘РЅ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј' });
    }
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' });
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
    if (!raw) return send(res, 400, { error: 'РќРµС‚ access_token РґР»СЏ СЃРѕРѕР±С‰РµРЅРёР№' });
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
        message: `РўРѕРєРµРЅ СЃРѕРѕР±С‰РµРЅРёР№ VK РґР»СЏ ${a.name}`,
      });
    });
    return send(res, 200, publicAccount(load().accounts.find((a) => a.id === id)));
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/messages-token\/check$/)) {
    const u = requireUser(req, res); if (!u) return;
    if (load().settings.vkMessagesUiEnabled !== true) {
      return send(res, 403, { error: 'РўРѕРєРµРЅ Р›РЎ РѕС‚РєР»СЋС‡С‘РЅ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј' });
    }
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' });
    if (!acc.messagesTokenEnc) return send(res, 400, { error: 'РўРѕРєРµРЅ СЃРѕРѕР±С‰РµРЅРёР№ РЅРµ РїРѕРґРєР»СЋС‡С‘РЅ', ok: false });
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
    if (!acc) return send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' });
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
    if (!incoming.length) return send(res, 400, { error: 'РќРµС‚ РєР°РЅР°Р»РѕРІ' });
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' });
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
          message: `РћР±РЅРѕРІР»РµРЅС‹ РєР°РЅР°Р»С‹ VK ${a.name} В· РіСЂСѓРїРї ${groupsCount}`,
        });
      }
    });
    return send(res, 200, channels);
  }

  if (method === 'GET' && path.startsWith('/api/accounts/') && path.endsWith('/channels')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) return send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' });
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
      if (/another ip|1130|РїСЂРёРІСЏР·Р°РЅ Рє IP/i.test(msg)) {
        return send(res, 409, {
          error: 'РўРѕРєРµРЅ РїСЂРёРІСЏР·Р°РЅ Рє IP Р±СЂР°СѓР·РµСЂР°. РќР°Р¶РјРёС‚Рµ В«РћР±РЅРѕРІРёС‚СЊ СЃРѕРѕР±С‰РµСЃС‚РІР°В» РІ РєР°Р±РёРЅРµС‚Рµ вЂ” СЃРїРёСЃРѕРє РїРѕРґС‚СЏРЅРµС‚СЃСЏ РёР· VK РІ СЌС‚РѕРј Р±СЂР°СѓР·РµСЂРµ.',
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
    if (!file || !existsSync(file)) return send(res, 404, { error: 'РќРµС‚ С„Р°Р№Р»Р°' });
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
    if (!post) return send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'PATCH' && path.match(/^\/api\/posts\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const post = mutate((db) => updatePost(db, u.id, id, body));
    if (!post) return send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'DELETE' && path.match(/^\/api\/posts\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const hard = url.searchParams.get('hard') === '1';
    const ok = mutate((db) => deletePost(db, u.id, id, { hard }));
    if (!ok) return send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' });
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
    if (!post) return send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/approve$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const user = load().users.find((x) => x.id === u.id);
    const { settings } = workflowFromUser(user);
    const post = mutate((db) => approvePost(db, u.id, id, settings));
    if (!post) return send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/reject$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const post = mutate((db) => rejectPost(db, u.id, id, body.reason));
    if (!post) return send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/publish$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) return send(res, 400, { error: 'РџРѕРґРєР»СЋС‡РёС‚Рµ VK-Р°РєРєР°СѓРЅС‚' });
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
    if (!post) return send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' });
    const cfg = readAiConfig(db.settings);
    try {
      const prompt = String(body.prompt || 'РќР°РїРёС€Рё РєРѕСЂРѕС‚РєРёР№ РїРѕСЃС‚ РґР»СЏ VK').slice(0, 500);
      const topic = String(body.topic || post.title || post.text.slice(0, 80)).slice(0, 200);
      const { text } = await generateAiChat([
        { role: 'system', content: 'РўС‹ SMM-СЂРµРґР°РєС‚РѕСЂ. РџРёС€Рё РїРѕСЃС‚С‹ РґР»СЏ VK: Р¶РёРІРѕ, РїРѕ РґРµР»Сѓ, Р±РµР· РєР°РІС‹С‡РµРє Рё С…РµС€С‚РµРі-СЃРїР°РјР°. 2вЂ“4 Р°Р±Р·Р°С†Р°.' },
        { role: 'user', content: `${prompt}\n\nРўРµРјР°: ${topic}` },
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
    if (!source) return send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { source });
  }

  if (method === 'DELETE' && path.match(/^\/api\/rss\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/').pop();
    const ok = mutate((db) => deleteRssSource(db, u.id, id));
    if (!ok) return send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
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
    if (!getRssSource(db, u.id, id)) return send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    const status = url.searchParams.get('status') || null;
    const take = Number(url.searchParams.get('take') || 100);
    return send(res, 200, { items: listRssItems(db, u.id, id, { status, take }) });
  }

  if (method === 'POST' && path === '/api/rss/import') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const sourceId = String(body.sourceId || '');
    const items = Array.isArray(body.items) ? body.items : [];
    if (!sourceId || !items.length) return send(res, 400, { error: 'Р’С‹Р±РµСЂРёС‚Рµ СЃС‚Р°С‚СЊРё' });
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
    if (!source) return send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { source });
  }

  if (method === 'DELETE' && path.match(/^\/api\/repost\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const ok = mutate((db) => deleteRepostSource(db, u.id, id));
    if (!ok) return send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && path.match(/^\/api\/repost\/sources\/[^/]+\/fetch$/)) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[4];
    const db = load();
    const source = getRepostSource(db, u.id, id);
    if (!source) return send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    const acc = resolveVkAccount(u, source.accountId);
    if (!acc) return send(res, 400, { error: 'РџРѕРґРєР»СЋС‡РёС‚Рµ VK-Р°РєРєР°СѓРЅС‚ РґР»СЏ СЃРєР°РЅРёСЂРѕРІР°РЅРёСЏ' });
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
    if (!getRepostSource(db, u.id, id)) return send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    const status = url.searchParams.get('status') || null;
    return send(res, 200, { items: listRepostItems(db, u.id, id, { status, take: 100 }) });
  }

  if (method === 'POST' && path === '/api/repost/import') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const sourceId = String(body.sourceId || '');
    const items = Array.isArray(body.items) ? body.items : [];
    if (!sourceId || !items.length) return send(res, 400, { error: 'Р’С‹Р±РµСЂРёС‚Рµ РїРѕСЃС‚С‹' });
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

  if (method === 'POST' && path === '/api/parsers') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const slug = body.kind === 'groups' ? 'parsing-groups-vk' : 'parsing-accounts-vk';
    if (!toolOn(u, slug, load().settings)) return send(res, 403, { error: 'РџР°СЂСЃРµСЂ РЅРµ Р°РєС‚РёРІРµРЅ' });
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
    if (!list) return send(res, 404, { error: 'РЎРїРёСЃРѕРє РЅРµ РЅР°Р№РґРµРЅ' });
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
    if (!name) return send(res, 400, { error: 'РЈРєР°Р¶РёС‚Рµ РЅР°Р·РІР°РЅРёРµ' });
    const list = mutate((d) => {
      const l = d.lists.find((x) => x.id === id && (!x.userId || x.userId === u.id));
      if (!l) return null;
      l.name = name;
      return l;
    });
    if (!list) return send(res, 404, { error: 'РЎРїРёСЃРѕРє РЅРµ РЅР°Р№РґРµРЅ' });
    return send(res, 200, { ok: true, name: list.name });
  }

  if (method === 'POST' && path.startsWith('/api/lists/') && path.endsWith('/crm')) {
    const u = requireUser(req, res); if (!u) return;
    const id = path.split('/')[3];
    const list = load().lists.find((l) => l.id === id && (!l.userId || l.userId === u.id));
    if (!list) return send(res, 404, { error: 'РЎРїРёСЃРѕРє РЅРµ РЅР°Р№РґРµРЅ' });
    let n = 0;
    mutate((d) => {
      for (const p of (list.items || []).slice(0, 200)) {
        const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || ('id' + p.id);
        d.leads.unshift({
          id: 'c' + Date.now() + Math.random().toString(16).slice(2),
          userId: u.id, name, source: list.name || 'РЎРїРёСЃРѕРє', score: 5,
          stage: 'new', city: p.cityTitle || 'вЂ”', note: '', vkId: p.id,
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
        id: 'c' + Date.now(), userId: u.id, name: body.name || 'РќРѕРІС‹Р№ РєРѕРЅС‚Р°РєС‚',
        source: body.source || 'Р’СЂСѓС‡РЅСѓСЋ', score: Number(body.score || 5),
        stage: normalizeLeadStage(body.stage || 'new'), city: body.city || 'вЂ”', note: body.note || '',
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
      if (body.city != null) l.city = String(body.city).trim().slice(0, 80) || 'вЂ”';
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
    if (!lead) return send(res, 404, { error: 'Р›РёРґ РЅРµ РЅР°Р№РґРµРЅ' });
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

  if (method === 'GET' && path === '/api/vk/friends') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'РќРµС‚ VK' });
    const friends = await vkGetFriends(tokenOf(acc), { count: 80 });
    return send(res, 200, friends);
  }

  if (method === 'GET' && path === '/api/vk/chats') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'РќРµС‚ VK' });
    return send(res, 200, await vkConversations(tokenOf(acc, { messages: true }) || tokenOf(acc), 30));
  }

  if (method === 'POST' && path === '/api/vk/chats/reply') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) return send(res, 400, { error: 'РќРµС‚ VK' });
    const peerId = Number(body.peerId);
    const message = String(body.message || '').trim();
    if (!peerId || !message) return send(res, 400, { error: 'РЈРєР°Р¶РёС‚Рµ peerId Рё С‚РµРєСЃС‚' });
    const token = tokenOf(acc, { messages: true }) || tokenOf(acc);
    const r = await vkSendMessage(token, peerId, message.slice(0, 3500));
    if (!r.ok) return send(res, 400, { error: r.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ' });
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

  if (method === 'GET' && path === '/api/vk/groups') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'РќРµС‚ VK' });
    const groups = await vkListManagedGroups(tokenOf(acc));
    return send(res, 200, groups);
  }

  if (method === 'GET' && path === '/api/vk/groups/requests') {
    const u = requireUser(req, res); if (!u) return;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) return send(res, 400, { error: 'РќРµС‚ VK' });
    const groupId = Number(url.searchParams.get('groupId'));
    if (!groupId) return send(res, 400, { error: 'РЈРєР°Р¶РёС‚Рµ groupId' });
    const reqs = await vkGetGroupJoinRequests(tokenOf(acc), groupId);
    return send(res, 200, reqs);
  }

  if (method === 'POST' && path === '/api/vk/groups/requests') {
    const u = requireUser(req, res); if (!u) return;
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) return send(res, 400, { error: 'РќРµС‚ VK' });
    const token = tokenOf(acc);
    if (body.action === 'approve') await vkApproveJoinRequest(token, body.groupId, body.userId);
    else await vkDenyJoinRequest(token, body.groupId, body.userId);
    return send(res, 200, { ok: true });
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
