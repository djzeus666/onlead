import { load, mutate, toolOn } from '../db.mjs';
import {
  findOwnedLanding, findPublishedLandingByHost, findPublishedLandingBySlug,
  landingHostTaken, landingSlugTaken,
} from '../landings.mjs';
import { landingContent, sectionsToFlat, normalizeSlug } from '../landings-sections.mjs';
import { generateLandingContent } from '../landings-generate.mjs';
import { requestHost } from '../landing-hosts.mjs';
import { isDnsAutomationEnabled } from '../landing-hosts.mjs';
import { applyLandingDnsMeta, ensureLandingDns } from '../landing-dns.mjs';
import {
  bumpLandingView, landingPublicUrl, landingTemplateAllowed,
  publicLandingPayload, sanitizeLandingContent,
} from '../landings-http.mjs';
import { send, readBody, requireUser, enforceRate } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;

  if (method === 'GET' && path === '/api/public/landings/host') {
    const host = requestHost(req);
    const d = load();
    const l = findPublishedLandingByHost(d, host);
    if (!l) { send(res, 404, { error: 'На этом домене нет опубликованной страницы' }); return true; }
    send(res, 200, publicLandingPayload(l, d));
    return true;
  }

  if (method === 'GET' && path.match(/^\/api\/public\/landings\/slug\/[^/]+$/)) {
    const slug = decodeURIComponent(path.split('/').pop());
    const payload = mutate((d) => {
      const l = findPublishedLandingBySlug(d, slug);
      if (!l) return null;
      bumpLandingView(d, l.id);
      return publicLandingPayload(l, d);
    });
    if (!payload) { send(res, 404, { error: 'Страница не найдена' }); return true; }
    send(res, 200, payload);
    return true;
  }

  if (method === 'GET' && path.match(/^\/api\/public\/landings\/[^/]+$/) && !path.includes('/slug/')) {
    const key = decodeURIComponent(path.split('/').pop());
    const payload = mutate((d) => {
      let l = d.landings.find((x) => x.id === key && x.status === 'published');
      if (!l) l = findPublishedLandingBySlug(d, key);
      if (!l) return null;
      bumpLandingView(d, l.id);
      return publicLandingPayload(l, d);
    });
    if (!payload) { send(res, 404, { error: 'Страница не найдена' }); return true; }
    send(res, 200, payload);
    return true;
  }

  if (method === 'POST' && path.match(/^\/api\/public\/landings\/[^/]+\/leads$/)) {
    if (!enforceRate(req, res, 'lead')) return true;
    const key = decodeURIComponent(path.split('/')[4]);
    const body = await readBody(req);
    if (String(body.website || body.company || '').trim()) { send(res, 200, { ok: true }); return true; }
    const d = load();
    let landing = d.landings.find((x) => x.id === key && x.status === 'published');
    if (!landing) landing = findPublishedLandingBySlug(d, key);
    if (!landing) { send(res, 404, { error: 'Страница не найдена' }); return true; }
    const id = landing.id;
    const name = String(body.name || '').trim().slice(0, 80);
    const phone = String(body.phone || '').trim().slice(0, 40);
    const email = String(body.email || '').trim().slice(0, 80);
    const comment = String(body.comment || '').trim().slice(0, 500);
    const utm = ['utm_source', 'utm_medium', 'utm_campaign']
      .map((k) => (body[k] ? `${k.replace('utm_', '')}=${String(body[k]).trim().slice(0, 40)}` : ''))
      .filter(Boolean)
      .join('&');
    if (!name) { send(res, 400, { error: 'Укажите имя' }); return true; }
    const digits = phone.replace(/\D/g, '');
    if (landing.fields?.includes('phone') && digits.length < 10) {
      send(res, 400, { error: 'Укажите телефон' });
      return true;
    }
    const ownerId = landing.userId;
    if (!ownerId) { send(res, 400, { error: 'Страница недоступна для заявок' }); return true; }
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
    send(res, 200, { ok: true, id: lead.id });
    return true;
  }

  if (method === 'GET' && path.match(/^\/api\/landings\/[^/]+$/)) {
    const u = requireUser(req, res);
    if (!u) return true;
    const id = path.split('/').pop();
    const l = findOwnedLanding(load(), u, id);
    if (!l) { send(res, 404, { error: 'Страница не найдена' }); return true; }
    send(res, 200, { ...l, url: landingPublicUrl(req, l) });
    return true;
  }

  if (method === 'POST' && path.match(/^\/api\/landings\/[^/]+\/generate$/)) {
    const u = requireUser(req, res);
    if (!u) return true;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const l0 = findOwnedLanding(load(), u, id);
    if (!l0) { send(res, 404, { error: 'Страница не найдена' }); return true; }
    try {
      const flat = await generateLandingContent(l0, body, load());
      const landing = mutate((d) => {
        const l = findOwnedLanding(d, u, id);
        if (!l) return null;
        const owner = d.users.find((x) => x.id === u.id);
        const pro = toolOn(owner, 'landings-pro', d.settings);
        const next = sanitizeLandingContent(flat, l, { pro });
        Object.assign(l, next);
        l.content = flat.content;
        return l;
      });
      send(res, 200, { ...landing, url: landingPublicUrl(req, landing) });
    } catch (err) {
      send(res, 400, { error: err instanceof Error ? err.message : 'Не удалось сгенерировать' });
    }
    return true;
  }

  if (method === 'PATCH' && path.match(/^\/api\/landings\/[^/]+$/)) {
    const u = requireUser(req, res);
    if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const landing = mutate((d) => {
      const l = findOwnedLanding(d, u, id);
      if (!l) return null;
      const owner = d.users.find((x) => x.id === u.id);
      const pro = toolOn(owner, 'landings-pro', d.settings);
      const nextTemplate = String(body.template != null ? body.template : l.template || '').trim();
      if (!landingTemplateAllowed(owner, nextTemplate, d.settings)) return { forbidden: true };
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
    if (!landing) { send(res, 404, { error: 'Страница не найдена' }); return true; }
    if (landing.forbidden) { send(res, 403, { error: 'PRO-шаблон доступен с тарифом «Лендинги PRO»' }); return true; }
    if (landing.hostTaken) { send(res, 409, { error: 'Этот поддомен уже занят другой страницей' }); return true; }
    if (landing.slugTaken) { send(res, 409, { error: 'Этот адрес уже занят другой страницей' }); return true; }
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
    send(res, 200, landing);
    return true;
  }

  if (method === 'DELETE' && path.match(/^\/api\/landings\/[^/]+$/)) {
    const u = requireUser(req, res);
    if (!u) return true;
    const id = path.split('/').pop();
    const removed = mutate((d) => {
      const i = d.landings.findIndex((x) => x.id === id && x.userId === u.id);
      if (i === -1) return false;
      d.landings.splice(i, 1);
      return true;
    });
    if (!removed) { send(res, 404, { error: 'Страница не найдена' }); return true; }
    send(res, 200, { ok: true });
    return true;
  }

  if (method === 'POST' && path === '/api/landings') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    const db = load();
    const owner = db.users.find((x) => x.id === u.id);
    const templateId = String(body.template || '').trim();
    if (!landingTemplateAllowed(owner, templateId, db.settings)) {
      send(res, 403, { error: 'PRO-шаблон доступен с тарифом «Лендинги PRO»' });
      return true;
    }
    const content = sanitizeLandingContent(body, { name: 'Новая страница' }, { pro: toolOn(owner, 'landings-pro', db.settings) });
    if (content.customHost && landingHostTaken(db, content.customHost)) {
      send(res, 409, { error: 'Этот поддомен уже занят другой страницей' });
      return true;
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
    send(res, 200, landing);
    return true;
  }

  return false;
}
