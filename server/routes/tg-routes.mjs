import { encryptToken, maskToken } from '../crypto.mjs';
import { load, mutate } from '../db.mjs';
import { allowMocks, isMockToken, isTelegramLive, mockBlockedMessage } from '../hardening.mjs';
import {
  listHostedLeadBots, publicHostedLeadBot, createHostedLeadBot,
  patchHostedLeadBot, deleteHostedLeadBot, widgetSnippetForBot,
  deployLeadBotToFunnel, submitWidgetLead,
} from '../lead-bots.mjs';
import {
  listFunnelProducts, createFunnelProduct, patchFunnelProduct,
  deleteFunnelProduct, listFunnelOrders,
} from '../tg-funnel-ol.mjs';
import { telegramGetMe, telegramGetChat, telegramDiscoverChats } from '../telegram.mjs';
import { ensureBotWebhookSecret, registerBotWebhook, botPlainToken } from '../tg-worker.mjs';
import { confirmReceipt, rejectReceipt } from '../tg-receipts.mjs';
import { send, sendFail, readBody, requireUser } from '../http-api.mjs';
import { snapshot, botToken, liveTgPlan, tgSlotUsage } from '../snapshot.mjs';

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

if (method === 'GET' && path === '/api/tg/receipts') {
    const u = requireUser(req, res); if (!u) return true;
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
    send(res, 200, rows);
  return true;
  }

  if (method === 'POST' && path.match(/^\/api\/tg\/receipts\/[^/]+\/confirm$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const result = await confirmReceipt({
      receiptId: id,
      userId: u.id,
      botPlainToken,
      loadFn: load,
      mutateFn: mutate,
    });
    if (!result.ok) { send(res, 400, { error: result.error }); return true; }
    send(res, 200, { ok: true, ...snapshot(u) });
  }

  if (method === 'POST' && path.match(/^\/api\/tg\/receipts\/[^/]+\/reject$/)) {
    const u = requireUser(req, res); if (!u) return true;
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
    if (!result.ok) { send(res, 400, { error: result.error }); return true; }
    send(res, 200, { ok: true, ...snapshot(u) });
  }

  if (method === 'POST' && path === '/api/bots') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const token = String(body.token || body.username || '').trim();
    if (!token) { send(res, 400, { error: 'Р’СЃС‚Р°РІСЊС‚Рµ С‚РѕРєРµРЅ РёР· @BotFather' }); return true; }
    if (!allowMocks() && isMockToken(token)) send(res, 400, { error: mockBlockedMessage('Telegram') });
    let me;
    try { me = await telegramGetMe(token); }
    catch (err) { sendFail(res, err); ; return true; }
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
    send(res, 200, { ...bot, tokenEnc: undefined, webhookSecret: undefined });
  }

  if (method === 'PATCH' && path.match(/^\/api\/bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const newToken = String(body.token || '').trim();
    let me = null;
    if (newToken) {
      if (!allowMocks() && isMockToken(newToken)) send(res, 400, { error: mockBlockedMessage('Telegram') });
      try { me = await telegramGetMe(newToken); }
      catch (err) { sendFail(res, err); ; return true; }
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
    if (!bot) { send(res, 404, { error: 'Р‘РѕС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    if (bot.status === 'on') {
      try { await registerBotWebhook(bot); }
      catch (err) { console.error('[tg webhook] setWebhook', err.message); }
    }
    send(res, 200, { ...bot, tokenEnc: undefined, webhookSecret: undefined });
  }

  if (method === 'DELETE' && path.match(/^\/api\/bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    mutate((d) => { d.bots = d.bots.filter((x) => !(x.id === id && x.userId === u.id)); });
    send(res, 200, { ok: true });
  return true;
  }

  if (method === 'POST' && path === '/api/tg/channels/refresh') {
    const u = requireUser(req, res); if (!u) return true;
    const d0 = load();
    const bots = d0.bots.filter((b) => b.userId === u.id && b.status !== 'off');
    if (!bots.length) { send(res, 400, { error: 'РЎРЅР°С‡Р°Р»Р° РїРѕРґРєР»СЋС‡РёС‚Рµ Р±РѕС‚Р° Рё СЃРґРµР»Р°Р№С‚Рµ РµРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј РєР°РЅР°Р»Р°' }); return true; }
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
    send(res, 200, { ok: true, added, found: found.length });
  return true;
  }

  if (method === 'POST' && path === '/api/tg/channels') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    let username = String(body.username || body.name || '').trim().slice(0, 80);
    if (!username) { send(res, 400, { error: 'РЈРєР°Р¶РёС‚Рµ @username РєР°РЅР°Р»Р°' }); return true; }
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
      if (lastErr && !meta.id) { sendFail(res, lastErr); return true; }
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
    send(res, 200, ch);
  }

  if (method === 'POST' && path === '/api/tg/trial') {
    const u = requireUser(req, res); if (!u) return true;
    if (!isTelegramLive()) {
      send(res, 400, { error: 'РџСЂРѕР±РЅС‹Р№ Telegram Р·Р°РєСЂС‹С‚, РїРѕРєР° РЅРµ РІРєР»СЋС‡С‘РЅ Р¶РёРІРѕР№ webhook.' });
    return true;
    }
    if (u.tgTrialUsed) { send(res, 400, { error: 'РџСЂРѕР±РЅС‹Рµ 3 РґРЅСЏ Telegram СѓР¶Рµ РёСЃРїРѕР»СЊР·РѕРІР°РЅС‹' }); return true; }
    if (u.tgPlan?.until > Date.now() && u.tgPlan.id && u.tgPlan.id !== 'trial') {
      send(res, 400, { error: 'РЈ РІР°СЃ СѓР¶Рµ РµСЃС‚СЊ С‚Р°СЂРёС„ Telegram' });
    }
    mutate((d) => {
      const x = d.users.find((i) => i.id === u.id);
      if (!x) return;
      x.tgTrialUsed = true;
      x.tgPlan = { id: 'trial', lite: 1, pro: 0, until: Date.now() + 3 * 86400000 };
    });
    send(res, 200, snapshot(u));
  return true;
  }
  if (method === 'PATCH' && path.match(/^\/api\/tg\/channels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
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
    if (!ch) { send(res, 404, { error: 'РљР°РЅР°Р» РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, ch);
  }

  if (method === 'DELETE' && path.match(/^\/api\/tg\/channels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    mutate((d) => { d.tgChannels = (d.tgChannels || []).filter((x) => !(x.id === id && x.userId === u.id)); });
    send(res, 200, { ok: true });
  return true;
  }

  if (method === 'POST' && path === '/api/tg/funnels') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const kind = body.kind === 'pro' ? 'pro' : 'lite';
    const d0 = load();
    const plan = liveTgPlan(d0.users.find((x) => x.id === u.id) || u);
    const used = tgSlotUsage(d0, u.id);
    if (kind === 'pro' && used.pro >= (plan.pro || 0)) {
      send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Pro вЂ” РїРѕРґРєР»СЋС‡РёС‚Рµ С‚Р°СЂРёС„ РёР»Рё РѕС‚РїСЂР°РІСЊС‚Рµ РІРѕСЂРѕРЅРєСѓ РІ Р°СЂС…РёРІ' });
    return true;
    }
    if (kind !== 'pro' && used.lite >= (plan.lite || 0)) {
      send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Lite вЂ” РїРѕРґРєР»СЋС‡РёС‚Рµ С‚Р°СЂРёС„ РёР»Рё РѕС‚РїСЂР°РІСЊС‚Рµ РІРѕСЂРѕРЅРєСѓ РІ Р°СЂС…РёРІ' });
    return true;
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
    send(res, 200, funnel);
  return true;
  }

  if (method === 'PATCH' && path.match(/^\/api\/tg\/funnels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const d0 = load();
    const row0 = (d0.tgFunnels || []).find((x) => x.id === id && x.userId === u.id);
    if (!row0) { send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' }); return true; }
    const nextStatus = (body.status === 'on' || body.status === 'off' || body.status === 'archive') ? body.status : row0.status;
    if (row0.status === 'archive' && nextStatus !== 'archive') {
      const kind = row0.kind === 'pro' ? 'pro' : 'lite';
      const plan = liveTgPlan(d0.users.find((x) => x.id === u.id) || u);
      const used = tgSlotUsage(d0, u.id);
      if (kind === 'pro' && used.pro >= (plan.pro || 0)) {
        send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Pro' });
      }
      if (kind !== 'pro' && used.lite >= (plan.lite || 0)) {
        send(res, 400, { error: 'РќРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ СЃР»РѕС‚Р° Lite' });
      return true;
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
    if (!funnel) { send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' }); return true; }
    send(res, 200, funnel);
  }

  if (method === 'GET' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const products = listFunnelProducts(u.id, id);
    if (products == null) { send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' }); return true; }
    send(res, 200, products);
  }

  if (method === 'POST' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const body = await readBody(req);
    const row = createFunnelProduct(u.id, id, body);
    if (!row) { send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' }); return true; }
    send(res, 200, row);
  }

  if (method === 'PATCH' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const parts = path.split('/');
    const funnelId = parts[4];
    const productId = parts[6];
    const body = await readBody(req);
    const row = patchFunnelProduct(u.id, funnelId, productId, body);
    if (!row) { send(res, 404, { error: 'РќРµ РЅР°Р№РґРµРЅРѕ' }); return true; }
    send(res, 200, row);
  }

  if (method === 'DELETE' && path.match(/^\/api\/tg\/funnels\/[^/]+\/products\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const parts = path.split('/');
    deleteFunnelProduct(u.id, parts[4], parts[6]);
    send(res, 200, { ok: true });
  return true;
  }

  if (method === 'GET' && path.match(/^\/api\/tg\/funnels\/[^/]+\/orders$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const orders = listFunnelOrders(u.id, id);
    if (orders == null) { send(res, 404, { error: 'Р’РѕСЂРѕРЅРєР° РЅРµ РЅР°Р№РґРµРЅР°' }); return true; }
    send(res, 200, orders);
  }

  if (path === '/api/lead-bots' && method === 'GET') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, listHostedLeadBots(u.id).map(publicHostedLeadBot));
  return true;
  }

  if (path === '/api/lead-bots' && method === 'POST') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const row = createHostedLeadBot(u.id, body);
    send(res, 200, publicHostedLeadBot(row));
  return true;
  }

  if (method === 'PATCH' && path.match(/^\/api\/lead-bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const row = patchHostedLeadBot(u.id, id, body);
    if (!row) { send(res, 404, { error: 'Р‘РѕС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, publicHostedLeadBot(row));
  }

  if (method === 'DELETE' && path.match(/^\/api\/lead-bots\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    deleteHostedLeadBot(u.id, id);
    send(res, 200, { ok: true });
  return true;
  }

  if (method === 'GET' && path.match(/^\/api\/lead-bots\/[^/]+\/widget-snippet$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const bot = listHostedLeadBots(u.id).find((b) => b.id === id);
    if (!bot) { send(res, 404, { error: 'Р‘РѕС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { snippet: widgetSnippetForBot(bot), endpoint: bot.publicKey });
  }

  if (method === 'POST' && path.match(/^\/api\/lead-bots\/[^/]+\/deploy-funnel$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    try {
      const funnel = deployLeadBotToFunnel(u.id, id);
      send(res, 200, { funnel, bot: publicHostedLeadBot(listHostedLeadBots(u.id).find((b) => b.id === id)) });
    return true;
    } catch (err) { sendFail(res, err); ; return true; }
  }

  if (method === 'POST' && path.match(/^\/api\/public\/widget\/[^/]+\/lead$/)) {
    const key = path.split('/')[4];
    const body = await readBody(req);
    const result = submitWidgetLead(key, body);
    if (!result.ok) { send(res, 400, { error: result.error || 'РћС€РёР±РєР°' }); return true; }
    send(res, 200, { ok: true, message: result.message });
  }

  if (method === 'DELETE' && path.match(/^\/api\/tg\/funnels\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    mutate((d) => { d.tgFunnels = (d.tgFunnels || []).filter((x) => !(x.id === id && x.userId === u.id)); });
    send(res, 200, { ok: true });
  return true;
  }

  return false;
}
