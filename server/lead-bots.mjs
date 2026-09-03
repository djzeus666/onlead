/** Hosted lead bots + web widget (OL /lead-bots parity). */
import { randomToken } from './crypto.mjs';
import { load, mutate } from './db.mjs';
import { publicUrl } from './hardening.mjs';
import {
  BOT_KINDS,
  buildExecutableScenario,
  buildLeadBotScenario,
  buildWidgetSnippet,
  scenarioToFunnelSections,
} from './lead-bot-templates.mjs';

function newId(prefix = 'lb') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultHostedLeadBot(userId) {
  return {
    userId,
    id: newId(),
    kind: 'lead',
    title: 'Новый лид-бот',
    status: 'draft',
    business: '',
    city: '',
    goal: '',
    contact: 'Мы перезвоним в рабочее время',
    nicheTitle: '',
    script: '',
    scenario: null,
    botId: null,
    funnelId: null,
    publicKey: randomToken(12),
    createdAt: Date.now(),
  };
}

export function listHostedLeadBots(userId) {
  return (load().hostedLeadBots || []).filter((b) => b.userId === userId);
}

export function getHostedLeadBot(userId, id) {
  return listHostedLeadBots(userId).find((b) => b.id === id) || null;
}

export function publicHostedLeadBot(b) {
  if (!b) return null;
  return {
    id: b.id,
    kind: b.kind,
    title: b.title,
    status: b.status,
    business: b.business || '',
    city: b.city || '',
    goal: b.goal || '',
    contact: b.contact || '',
    nicheTitle: b.nicheTitle || '',
    script: b.script || '',
    botId: b.botId || null,
    funnelId: b.funnelId || null,
    publicKey: b.publicKey || '',
    hasWidget: b.kind === 'widget',
    createdAt: b.createdAt,
  };
}

function draftInput(body = {}) {
  return {
    kind: BOT_KINDS.includes(body.kind) ? body.kind : 'lead',
    business: String(body.business || '').slice(0, 120),
    city: String(body.city || '').slice(0, 80),
    goal: String(body.goal || '').slice(0, 500),
    contact: String(body.contact || 'Мы перезвоним в рабочее время').slice(0, 200),
    nicheTitle: String(body.nicheTitle || body.niche || '').slice(0, 120),
  };
}

export function createHostedLeadBot(userId, body = {}) {
  const input = draftInput(body);
  const scenario = buildExecutableScenario(input);
  const script = buildLeadBotScenario(input);
  return mutate((d) => {
    d.hostedLeadBots = d.hostedLeadBots || [];
    const row = {
      ...defaultHostedLeadBot(userId),
      kind: input.kind,
      title: String(body.title || botTitle(input)).slice(0, 120),
      business: input.business,
      city: input.city,
      goal: input.goal,
      contact: input.contact,
      nicheTitle: input.nicheTitle,
      script,
      scenario,
      status: 'draft',
    };
    d.hostedLeadBots.unshift(row);
    return row;
  });
}

function botTitle(input) {
  const labels = { lead: 'Лид-бот', faq: 'FAQ-бот', booking: 'Бот записи', widget: 'Виджет заявок' };
  const base = labels[input.kind] || 'Бот';
  return input.business ? `${base} · ${input.business}` : base;
}

export function patchHostedLeadBot(userId, id, body = {}) {
  return mutate((d) => {
    const b = (d.hostedLeadBots || []).find((x) => x.id === id && x.userId === userId);
    if (!b) return null;
    if (body.title != null) b.title = String(body.title).trim().slice(0, 120);
    if (body.status != null && ['draft', 'live', 'paused'].includes(body.status)) b.status = body.status;
    if (body.botId !== undefined) b.botId = body.botId || null;
    if (body.business != null) b.business = String(body.business).slice(0, 120);
    if (body.city != null) b.city = String(body.city).slice(0, 80);
    if (body.goal != null) b.goal = String(body.goal).slice(0, 500);
    if (body.contact != null) b.contact = String(body.contact).slice(0, 200);
    if (body.nicheTitle != null) b.nicheTitle = String(body.nicheTitle).slice(0, 120);
    if (body.script != null) b.script = String(body.script).slice(0, 12000);
    const regen = body.regenerate === true
      || body.business != null || body.city != null || body.goal != null || body.contact != null || body.kind != null;
    if (body.kind != null && BOT_KINDS.includes(body.kind)) b.kind = body.kind;
    if (regen) {
      const input = draftInput({ ...b, kind: b.kind });
      b.scenario = buildExecutableScenario(input);
      if (body.script == null) b.script = buildLeadBotScenario(input);
    }
    return b;
  });
}

export async function refineHostedLeadBot(userId, id, { generateAiChat, readAiConfig, settings } = {}) {
  const bot = getHostedLeadBot(userId, id);
  if (!bot) throw new Error('Бот не найден');
  const cfg = readAiConfig(settings || load().settings);
  const { text } = await generateAiChat([
    {
      role: 'system',
      content: 'Ты копирайтер Telegram-ботов. Улучши оффер и сценарий: коротко, по делу, на русском. Верни только текст сценария без кавычек.',
    },
    {
      role: 'user',
      content: `Бизнес: ${bot.business || bot.title}\nГород: ${bot.city || '—'}\nЦель: ${bot.goal || '—'}\nТекущий сценарий:\n${bot.script || bot.goal || 'Собери заявку'}`,
    },
  ], cfg, { maxTokens: 500 });
  const script = String(text || '').trim().slice(0, 12000);
  if (!script) throw new Error('AI не вернул текст');
  return patchHostedLeadBot(userId, id, { script, regenerate: false });
}

export function deleteHostedLeadBot(userId, id) {
  mutate((d) => {
    d.hostedLeadBots = (d.hostedLeadBots || []).filter((x) => !(x.id === id && x.userId === userId));
  });
}

export function widgetEndpoint(publicKey) {
  return `${publicUrl()}/api/public/widget/${encodeURIComponent(publicKey)}/lead`;
}

export function widgetSnippetForBot(bot) {
  const endpoint = widgetEndpoint(bot.publicKey);
  return buildWidgetSnippet({
    business: bot.business || bot.title,
    goal: bot.goal || 'Оставьте контакты',
    endpoint,
    successText: bot.scenario?.finale || 'Заявка принята. Мы свяжемся с вами.',
  });
}

export function deployLeadBotToFunnel(userId, botId) {
  const bot = getHostedLeadBot(userId, botId);
  if (!bot) throw new Error('Бот не найден');
  if (bot.kind === 'widget') throw new Error('Виджет не создаёт воронку — используйте HTML-сниппет');
  const sections = scenarioToFunnelSections(bot.scenario);
  const funnel = mutate((d) => {
    d.tgFunnels = d.tgFunnels || [];
    let f = bot.funnelId ? d.tgFunnels.find((x) => x.id === bot.funnelId && x.userId === userId) : null;
    if (!f) {
      f = {
        id: 'fn' + Date.now(),
        userId,
        name: bot.title || 'Лид-бот',
        scenario: 'lead-bot',
        kind: 'lite',
        botId: bot.botId || '',
        status: 'off',
        product: bot.business || '',
        price: '',
        sections,
        products: [],
        settings: {
          greeting: bot.scenario?.greeting || '',
          paidText: bot.scenario?.finale || '',
        },
      };
      d.tgFunnels.unshift(f);
    } else {
      f.sections = sections;
      f.name = bot.title || f.name;
      if (bot.botId) f.botId = bot.botId;
    }
    const b = (d.hostedLeadBots || []).find((x) => x.id === botId);
    if (b) {
      b.funnelId = f.id;
      b.status = 'live';
    }
    return f;
  });
  return funnel;
}

export function findWidgetBot(publicKey) {
  const key = String(publicKey || '').trim();
  if (!key) return null;
  return (load().hostedLeadBots || []).find((b) => b.publicKey === key && b.kind === 'widget' && b.status !== 'paused') || null;
}

export function submitWidgetLead(publicKey, body = {}) {
  if (String(body.company || '').trim()) {
    return { ok: false, error: 'Spam rejected' };
  }
  const bot = findWidgetBot(publicKey);
  if (!bot) return { ok: false, error: 'Виджет не найден' };
  const name = String(body.name || '').trim().slice(0, 80) || 'С сайта';
  const phone = String(body.phone || '').trim().slice(0, 40);
  if (!phone) return { ok: false, error: 'Укажите телефон' };
  const comment = String(body.comment || '').trim().slice(0, 500);
  const pageUrl = String(body.pageUrl || '').slice(0, 500);
  mutate((d) => {
    d.leads = d.leads || [];
    d.leads.unshift({
      id: 'ld' + Date.now(),
      userId: bot.userId,
      name,
      phone,
      email: '',
      city: bot.city || '',
      note: [`Виджет: ${bot.title}`, comment, pageUrl ? `страница: ${pageUrl}` : ''].filter(Boolean).join(' · ').slice(0, 500),
      stage: 'new',
      source: 'widget',
      createdAt: Date.now(),
    });
  });
  return { ok: true, message: bot.scenario?.finale || 'Заявка принята' };
}
