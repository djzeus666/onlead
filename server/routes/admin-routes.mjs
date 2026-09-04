import { load, mutate, publicUser, TOOLS } from '../db.mjs';
import { aiCreditsBalance, grantAiCredits } from '../ai-credits.mjs';
import { isValidInn } from '../inn.mjs';
import { creditBalance } from '../billing.mjs';
import { AI_PROVIDERS, AI_CATALOG_SOURCE, creditCardLabel } from '../ai-providers.mjs';
import {
  publicAiSettings, readAiConfig, applyAiSettings, testAiChat, generateAiImage, saveGeneratedImage,
} from '../ai.mjs';
import { syncPublishedLandingDns, applyLandingDnsMeta } from '../landing-dns.mjs';
import { tick } from '../jobs.mjs';
import { send, sendFail, readBody, requireAdmin, healthPayload, mergedLegal } from '../http-api.mjs';
import { botToken } from '../snapshot.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;

if (method === 'GET' && path === '/api/admin/overview') {
    if (!requireAdmin(req, res)) return true;
    const d = load();
    const h = healthPayload();
    send(res, 200, {
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
  return true;
  }

  if (method === 'GET' && path === '/api/admin/users') {
    if (!requireAdmin(req, res)) return true;
    send(res, 200, load().users.map((u) => ({
      ...publicUser(u),
      aiCredits: aiCreditsBalance(u),
    })));
  return true;
  }

  if (method === 'PATCH' && path.startsWith('/api/admin/users/')) {
    if (!requireAdmin(req, res)) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    if (body.credit != null) {
      const amount = Math.round(Number(body.credit));
      if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 300000) {
        send(res, 400, { error: 'Сумма начисления — от 1 до 300 000 ₽' });
      return true;
      }
    }
    if (body.aiCredits != null) {
      const credits = Math.round(Number(body.aiCredits));
      if (!Number.isFinite(credits) || credits === 0 || Math.abs(credits) > 100000) {
        send(res, 400, { error: 'Кредиты Image AI — от 1 до 100 000' });
      return true;
      }
    }
    try {
      mutate((d) => {
        const u = d.users.find((x) => x.id === id);
        if (!u) return true;
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
      sendFail(res, err);
    return true;
    }
    const u = load().users.find((x) => x.id === id);
    send(res, 200, { ...publicUser(u), aiCredits: aiCreditsBalance(u) });
  return true;
  }

  if (method === 'GET' && path === '/api/admin/accounts') {
    if (!requireAdmin(req, res)) return true;
    const d = load();
    send(res, 200, d.accounts.map((a) => ({
      ...a, tokenEnc: undefined,
      userEmail: d.users.find((u) => u.id === a.userId)?.email,
    })));
  return true;
  }

  if (method === 'GET' && path === '/api/admin/jobs') {
    if (!requireAdmin(req, res)) return true;
    send(res, 200, { campaigns: load().campaigns, jobs: load().jobs.slice(0, 200) });
  return true;
  }

  if (method === 'POST' && path.startsWith('/api/admin/campaigns/') && path.endsWith('/stop')) {
    if (!requireAdmin(req, res)) return true;
    const id = path.split('/')[4];
    mutate((d) => {
      const c = d.campaigns.find((x) => x.id === id);
      if (c) c.status = 'paused';
    });
    send(res, 200, { ok: true });
  return true;
  }

  if (method === 'GET' && path === '/api/admin/logs') {
    if (!requireAdmin(req, res)) return true;
    send(res, 200, load().logs.slice(0, 300));
  return true;
  }

  if (method === 'GET' && path === '/api/admin/settings') {
    if (!requireAdmin(req, res)) return true;
    const s = { ...load().settings };
    s.ai = publicAiSettings(s.ai);
    s.toolSlugs = [...TOOLS, 'landings-pro', 'lists', 'parsing-accounts-vk', 'parsing-groups-vk'];
    send(res, 200, s);
  return true;
  }

  if (method === 'PATCH' && path === '/api/admin/settings') {
    if (!requireAdmin(req, res)) return true;
    const body = await readBody(req);
    delete body.ai;
    delete body.apiKeyEnc;
    let legalInn = '';
    if (body.legal && typeof body.legal === 'object') {
      legalInn = String(body.legal.inn || '').replace(/\D/g, '').slice(0, 12);
      if (legalInn && !isValidInn(legalInn)) {
        send(res, 400, { error: 'ИНН не проходит контрольную сумму ФНС. Проверьте цифры — значение не подставляется автоматически.' });
      return true;
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
    send(res, 200, s);
  return true;
  }

  if (method === 'GET' && path === '/api/admin/ai') {
    if (!requireAdmin(req, res)) return true;
    const s = load().settings;
    send(res, 200, {
      source: AI_CATALOG_SOURCE,
      catalog: AI_PROVIDERS.map((p) => ({ ...p, creditCardLabel: creditCardLabel(p.creditCard) })),
      config: publicAiSettings(s.ai),
    });
  return true;
  }

  if (method === 'PATCH' && path === '/api/admin/ai') {
    if (!requireAdmin(req, res)) return true;
    const body = await readBody(req);
    try {
      mutate((d) => {
        d.settings.ai = applyAiSettings(d.settings.ai, body);
      });
      send(res, 200, publicAiSettings(load().settings.ai));
    return true;
    } catch (err) {
      sendFail(res, err, 'Не удалось сохранить ключ');
    }
  }

  if (method === 'POST' && path === '/api/admin/ai/test') {
    if (!requireAdmin(req, res)) return true;
    try {
      const result = await testAiChat(readAiConfig(load().settings));
      send(res, 200, result);
    return true;
    } catch (err) {
      sendFail(res, err, 'Проверка не удалась');
    }
  }

  if (method === 'POST' && path === '/api/admin/ai/test-image') {
    if (!requireAdmin(req, res)) return true;
    try {
      const img = await generateAiImage(
        { prompt: 'Minimal SMM post cover, teal and cream, abstract geometric', ratio: '1:1 пост' },
        readAiConfig(load().settings),
      );
      const url = saveGeneratedImage(img);
      send(res, 200, { ok: true, url });
    return true;
    } catch (err) {
      sendFail(res, err, 'Картинка не сгенерировалась');
    }
  }

  if (method === 'POST' && path === '/api/admin/landing-dns/sync') {
    if (!requireAdmin(req, res)) return true;
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
      send(res, 200, { ok: true, results });
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/admin/tick') {
    if (!requireAdmin(req, res)) return true;
    await tick();
    send(res, 200, { ok: true });
  return true;
  }

  return false;
}
