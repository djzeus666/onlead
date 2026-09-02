/** Landing HTTP helpers (sanitization, public payload, URLs). */
import { toolOn } from './db.mjs';
import { landingContent } from './landings-sections.mjs';
import { isAllowedLandingHost } from './landing-hosts.mjs';
import { isProLandingTemplate } from './landings-templates.mjs';
import { publicOrigin } from './http-api.mjs';

const LANDING_FIELD_IDS = ['name', 'phone', 'email', 'comment'];
const LANDING_TONES = ['teal', 'ink', 'gold', 'green', 'blue', 'cream', 'rose', 'night', 'slate', 'wine', 'sand'];
const LANDING_LAYOUTS = [
  'studio', 'salon', 'stage', 'school', 'portrait', 'chat', 'packs', 'listing', 'gym', 'garage', 'paper', 'poster',
  'course', 'magnet', 'specialist', 'agency', 'booking', 'event', 'expert', 'product',
];

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

export function landingTemplateAllowed(user, templateId, settings) {
  const id = String(templateId || '').trim();
  if (!id || !isProLandingTemplate(id)) return true;
  if (user?.trialUntil && user.trialUntil > Date.now()) return true;
  return toolOn(user, 'landings-pro', settings);
}

export function sanitizeLandingContent(body = {}, fallback = {}, opts = {}) {
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

export function publicLandingPayload(l, db, { countView = false } = {}) {
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

export function bumpLandingView(d, landingId) {
  const l = d.landings.find((x) => x.id === landingId && x.status === 'published');
  if (l) l.viewsCount = (l.viewsCount || 0) + 1;
  return l;
}

export function landingPublicUrl(req, landingOrId) {
  const landing = typeof landingOrId === 'object' && landingOrId ? landingOrId : null;
  const id = landing?.id || String(landingOrId || '');
  const host = String(landing?.customHost || '').trim();
  if (host) return `https://${host}/`;
  const slug = String(landing?.slug || '').trim();
  if (slug) return `${publicOrigin(req)}/#/l/${encodeURIComponent(slug)}`;
  return `${publicOrigin(req)}/#/p/${id}`;
}
