import { encryptToken, decryptToken, maskToken } from '../crypto.mjs';
import { load, mutate } from '../db.mjs';
import { allowMocks, isMockToken, mockBlockedMessage } from '../hardening.mjs';
import { vkConnect, vkListChannels } from '../vk/adapter.mjs';
import { extractVkAccessToken } from '../vk/call.mjs';
import {
  vkGetFriends, vkListManagedGroups, vkGetGroupJoinRequests, vkApproveJoinRequest, vkDenyJoinRequest,
  vkConversations, vkAssertMessagesPermission, vkSendMessage,
} from '../vk/growth.mjs';
import { exchangeVkOAuthCode, resolveVkOAuthScope, vkOAuthUsesCodeFlow } from '../vk-oauth.mjs';
import { send, sendFail, readBody, requireUser } from '../http-api.mjs';
import { publicAccount } from '../snapshot.mjs';
import {
  resolveVkAccount, tokenOf, normalizeChannels, mergeChannels, channelsHaveGroups,
  resolveVkRedirectUri, resolveVkBaseAppId,
} from '../vk-helpers.mjs';

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

if (method === 'GET' && path === '/api/vk/oauth-url') {
    const u = requireUser(req, res); if (!u) return true;
    const kind = String(url.searchParams.get('kind') || 'base').toLowerCase();
    const forMessages = kind === 'messages' || kind === 'msg';
    if (forMessages && load().settings.vkMessagesUiEnabled !== true) {
      send(res, 403, { error: 'Получение токена ЛС отключено администратором' });
      return true;
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
    send(res, 200, {
      url: urlOut, appId, redirectUri, kind: forMessages ? 'messages' : 'base', flow: responseType, warning,
    });
    return true;
  }

  if (method === 'POST' && path === '/api/vk/oauth-token') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const code = String(body.code || '').trim();
    if (!code) { send(res, 400, { error: 'РќРµС‚ code РѕС‚ VK' }); return true; }
    const appId = resolveVkBaseAppId(load().settings);
    const redirectUri = resolveVkRedirectUri(false);
    try {
      const token = await exchangeVkOAuthCode({ appId, code, redirectUri });
      send(res, 200, token);
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/accounts') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const raw = extractVkAccessToken(body.token || body.accessToken || '') || String(body.token || '').trim();
    if (!raw) { send(res, 400, { error: 'РќРµС‚ access_token VK' }); return true; }
    if (!allowMocks() && isMockToken(raw)) { send(res, 400, { error: mockBlockedMessage('VK') }); return true; }
    const fromBrowser = normalizeChannels(body.channels);
    let info;
    try {
      info = await vkConnect({ accessToken: raw, groupId: body.groupId });
    } catch (err) {
      const personal = fromBrowser.find((c) => c.type === 'personal') || fromBrowser[0];
      if (!personal) { sendFail(res, err); return true; }
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
      send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅС‹С… СЃР»РѕС‚РѕРІ' });
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
    send(res, 200, publicAccount(acc));
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/messages-token$/)) {
    const u = requireUser(req, res); if (!u) return true;
    if (load().settings.vkMessagesUiEnabled !== true) {
      send(res, 403, { error: 'РўРѕРєРµРЅ Р›РЎ РѕС‚РєР»СЋС‡С‘РЅ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј' });
    }
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) { send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' }); return true; }
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
      send(res, 200, publicAccount(load().accounts.find((a) => a.id === id)));
    }
    const raw = extractVkAccessToken(body.messagesToken || body.token || body.accessToken || '')
      || String(body.messagesToken || body.token || '').trim();
    if (!raw) { send(res, 400, { error: 'РќРµС‚ access_token РґР»СЏ СЃРѕРѕР±С‰РµРЅРёР№' }); return true; }
    if (!allowMocks() && isMockToken(raw)) { send(res, 400, { error: mockBlockedMessage('VK') }); return true; }
    try {
      await vkAssertMessagesPermission(raw);
    } catch (err) {
      sendFail(res, err);
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
    send(res, 200, publicAccount(load().accounts.find((a) => a.id === id)));
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/messages-token\/check$/)) {
    const u = requireUser(req, res); if (!u) return true;
    if (load().settings.vkMessagesUiEnabled !== true) {
      send(res, 403, { error: 'РўРѕРєРµРЅ Р›РЎ РѕС‚РєР»СЋС‡С‘РЅ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј' });
    }
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) { send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' }); return true; }
    if (!acc.messagesTokenEnc) { send(res, 400, { error: 'РўРѕРєРµРЅ СЃРѕРѕР±С‰РµРЅРёР№ РЅРµ РїРѕРґРєР»СЋС‡С‘РЅ', ok: false }); return true; }
    const token = tokenOf(acc, { messages: true });
    try {
      await vkAssertMessagesPermission(token);
      send(res, 200, { ok: true });
    return true;
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
      sendFail(res, err);
    }
  }

  if (method === 'GET' && path === '/api/accounts') {
    const u = requireUser(req, res); if (!u) return true;
    const list = load().accounts.filter((a) => a.userId === u.id).map(publicAccount);
    send(res, 200, list);
  }

  if (method === 'DELETE' && path.startsWith('/api/accounts/')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    mutate((d) => { d.accounts = d.accounts.filter((a) => !(a.id === id && a.userId === u.id)); });
    send(res, 200, { ok: true });
  }

  if (method === 'GET' && path.match(/^\/api\/accounts\/[^/]+\/vk-token$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) { send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' }); return true; }
    if (String(acc.tokenEnc).startsWith('mock:')) { send(res, 200, { accessToken: acc.tokenEnc }); return true; }
    try {
      const accessToken = decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
      send(res, 200, { accessToken });
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'POST' && path.match(/^\/api\/accounts\/[^/]+\/channels$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const incoming = normalizeChannels(body.channels);
    if (!incoming.length) { send(res, 400, { error: 'РќРµС‚ РєР°РЅР°Р»РѕРІ' }); return true; }
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) { send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' }); return true; }
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
    send(res, 200, channels);
  }

  if (method === 'GET' && path.startsWith('/api/accounts/') && path.endsWith('/channels')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const acc = load().accounts.find((a) => a.id === id && a.userId === u.id);
    if (!acc) { send(res, 404, { error: 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°' }); return true; }
    const token = String(acc.tokenEnc).startsWith('mock:') ? acc.tokenEnc : decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
    try {
      const channels = await vkListChannels(token);
      mutate((d) => {
        const a = d.accounts.find((x) => x.id === id && x.userId === u.id);
        if (a) a.channels = mergeChannels(a.channels || [], channels);
      });
      send(res, 200, channels);
    return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/another ip|1130|РїСЂРёРІСЏР·Р°РЅ Рє IP/i.test(msg)) {
        send(res, 409, {
          error: 'РўРѕРєРµРЅ РїСЂРёРІСЏР·Р°РЅ Рє IP Р±СЂР°СѓР·РµСЂР°. РќР°Р¶РјРёС‚Рµ В«РћР±РЅРѕРІРёС‚СЊ СЃРѕРѕР±С‰РµСЃС‚РІР°В» РІ РєР°Р±РёРЅРµС‚Рµ вЂ” СЃРїРёСЃРѕРє РїРѕРґС‚СЏРЅРµС‚СЃСЏ РёР· VK РІ СЌС‚РѕРј Р±СЂР°СѓР·РµСЂРµ.',
          ipBound: true,
          channels: acc.channels || [],
        });
      }
      sendFail(res, err);
    }
  }

  if (method === 'GET' && path === '/api/vk/friends') {
    const u = requireUser(req, res); if (!u) return true;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) { send(res, 400, { error: 'РќРµС‚ VK' }); return true; }
    const friends = await vkGetFriends(tokenOf(acc), { count: 80 });
    send(res, 200, friends);
  }

  if (method === 'GET' && path === '/api/vk/chats') {
    const u = requireUser(req, res); if (!u) return true;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) { send(res, 400, { error: 'РќРµС‚ VK' }); return true; }
    send(res, 200, await vkConversations(tokenOf(acc, { messages: true }) || tokenOf(acc), 30));
  }

  if (method === 'POST' && path === '/api/vk/chats/reply') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) { send(res, 400, { error: 'РќРµС‚ VK' }); return true; }
    const peerId = Number(body.peerId);
    const message = String(body.message || '').trim();
    if (!peerId || !message) { send(res, 400, { error: 'РЈРєР°Р¶РёС‚Рµ peerId Рё С‚РµРєСЃС‚' }); return true; }
    const token = tokenOf(acc, { messages: true }) || tokenOf(acc);
    const r = await vkSendMessage(token, peerId, message.slice(0, 3500));
    if (!r.ok) { send(res, 400, { error: r.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ' }); return true; }
    send(res, 200, { ok: true, messageId: r.messageId });
  }

  if (method === 'GET' && path === '/api/vk/groups') {
    const u = requireUser(req, res); if (!u) return true;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) { send(res, 400, { error: 'РќРµС‚ VK' }); return true; }
    const groups = await vkListManagedGroups(tokenOf(acc));
    send(res, 200, groups);
  }

  if (method === 'GET' && path === '/api/vk/groups/requests') {
    const u = requireUser(req, res); if (!u) return true;
    const acc = resolveVkAccount(u, url.searchParams.get('accountId'));
    if (!acc) { send(res, 400, { error: 'РќРµС‚ VK' }); return true; }
    const groupId = Number(url.searchParams.get('groupId'));
    if (!groupId) { send(res, 400, { error: 'РЈРєР°Р¶РёС‚Рµ groupId' }); return true; }
    const reqs = await vkGetGroupJoinRequests(tokenOf(acc), groupId);
    send(res, 200, reqs);
  }

  if (method === 'POST' && path === '/api/vk/groups/requests') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) { send(res, 400, { error: 'РќРµС‚ VK' }); return true; }
    const token = tokenOf(acc);
    if (body.action === 'approve') await vkApproveJoinRequest(token, body.groupId, body.userId);
    else await vkDenyJoinRequest(token, body.groupId, body.userId);
    send(res, 200, { ok: true });
  return true;
  }

  return false;
}
