/** Section-based landing model (parity with online-lead.ru). */

export const TONE_ACCENT = {
  teal: '#2ec4b6',
  gold: '#c9a227',
  ink: '#4d7cef',
  blue: '#4d7cef',
  green: '#3dffc0',
  cream: '#ef6c4d',
  rose: '#e85d75',
  night: '#7c6cff',
  slate: '#64748b',
  wine: '#9b2335',
  sand: '#d4a574',
};

export const SECTION_LABELS = {
  hero: 'Первый экран',
  about: 'О себе',
  services: 'Услуги и цены',
  steps: 'Как мы работаем',
  reviews: 'Отзывы',
  faq: 'Вопросы и ответы',
  form: 'Форма заявки',
  contacts: 'Контакты',
};

const DEFAULT_CONTACTS = {
  type: 'contacts',
  title: 'Контакты',
  phone: '',
  email: '',
  address: '',
};

export function normalizeSlug(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function landingContent(page = {}) {
  if (page.content?.sections?.length) {
    return {
      accent: page.content.accent || TONE_ACCENT[page.tone] || '#ef6c4d',
      sections: page.content.sections,
    };
  }
  return flatToSections(page);
}

export function flatToSections(page = {}) {
  const accent = page.content?.accent || TONE_ACCENT[page.tone] || '#ef6c4d';
  const sections = [];
  const badges = (page.features || []).filter(Boolean).slice(0, 4);
  const statBadges = (page.stats || [])
    .map((s) => [s.n, s.l].filter(Boolean).join(' · '))
    .filter(Boolean)
    .slice(0, 4);
  sections.push({
    type: 'hero',
    title: page.headline || page.name || 'Заголовок',
    subtitle: page.sub || '',
    ctaText: page.cta || 'Оставить заявку',
    note: page.urgency || page.kicker || '',
    badges: badges.length ? badges : statBadges,
  });
  const aboutText = [
    page.quote ? `«${page.quote}»` : '',
    page.author ? [page.author, page.role].filter(Boolean).join(' — ') : '',
  ].filter(Boolean).join('\n\n');
  if (aboutText || (page.stats || []).length) {
    sections.push({
      type: 'about',
      title: 'О себе',
      text: aboutText || 'Расскажите о себе и опыте — клиенты читают это перед заявкой.',
      stats: (page.stats || []).map((s) => ({ value: String(s.n || ''), label: String(s.l || '') })),
    });
  }
  const serviceItems = (page.prices || []).map((p) => ({
    title: String(p.name || ''),
    text: String(p.note || ''),
    price: String(p.price || ''),
  }));
  if (!serviceItems.length && (page.outcomes || []).length) {
    for (const o of page.outcomes || []) {
      serviceItems.push({ title: String(o.t || ''), text: String(o.d || ''), price: '' });
    }
  }
  if (serviceItems.length) {
    sections.push({
      type: 'services',
      title: 'Услуги и цены',
      items: serviceItems.slice(0, 8),
      note: '',
    });
  }
  if ((page.audience || []).length) {
    sections.push({
      type: 'services',
      title: 'Кому подойдёт',
      items: (page.audience || []).map((a) => ({
        title: String(a.t || ''),
        text: String(a.d || ''),
        price: '',
      })).slice(0, 6),
      note: '',
    });
  }
  if ((page.steps || []).length) {
    sections.push({
      type: 'steps',
      title: 'Как мы работаем',
      items: (page.steps || []).map((s) => ({ title: String(s.t || ''), text: String(s.d || '') })),
    });
  }
  if ((page.reviews || []).length) {
    sections.push({
      type: 'reviews',
      title: 'Отзывы',
      items: (page.reviews || []).map((r) => ({ text: String(r.q || ''), author: String(r.a || '') })),
    });
  }
  if ((page.faq || []).length) {
    sections.push({
      type: 'faq',
      title: 'Вопросы и ответы',
      items: (page.faq || []).map((f) => ({ question: String(f.q || ''), answer: String(f.a || '') })),
    });
  }
  sections.push({
    type: 'form',
    title: page.formTitle || 'Оставьте заявку',
    text: 'Перезвоним в рабочее время, ответим на вопросы. Без давления.',
    buttonText: page.cta || 'Отправить',
    fields: Array.isArray(page.fields) && page.fields.length ? page.fields : ['name', 'phone'],
    successText: page.successText || 'Заявка принята — перезвоним в рабочее время.',
  });
  const contacts = page.contacts || {};
  if (contacts.phone || contacts.email || contacts.address || page.meta?.place) {
    sections.push({
      ...DEFAULT_CONTACTS,
      title: contacts.title || 'Контакты',
      phone: contacts.phone || '',
      email: contacts.email || '',
      address: contacts.address || page.meta?.place || '',
    });
  } else {
    sections.push({ ...DEFAULT_CONTACTS });
  }
  return { accent, sections };
}

export function sectionsToFlat(content = {}, fallback = {}) {
  const sections = content.sections || [];
  const hero = sections.find((s) => s.type === 'hero') || {};
  const about = sections.find((s) => s.type === 'about') || {};
  const services = sections.find((s) => s.type === 'services') || {};
  const stepsSec = sections.find((s) => s.type === 'steps') || {};
  const reviewsSec = sections.find((s) => s.type === 'reviews') || {};
  const faqSec = sections.find((s) => s.type === 'faq') || {};
  const formSec = sections.find((s) => s.type === 'form') || {};
  const contactsSec = sections.find((s) => s.type === 'contacts') || {};
  const audienceSec = sections.find((s) => s.title === 'Кому подойдёт') || null;

  const toneEntry = Object.entries(TONE_ACCENT).find(([, v]) => v === content.accent);
  return {
    name: fallback.name || 'Страница',
    headline: String(hero.title || fallback.headline || '').slice(0, 140),
    sub: String(hero.subtitle || fallback.sub || '').slice(0, 400),
    cta: String(formSec.buttonText || hero.ctaText || fallback.cta || 'Оставить заявку').slice(0, 48),
    formTitle: String(formSec.title || fallback.formTitle || 'Оставьте заявку').slice(0, 80),
    kicker: String(hero.note || fallback.kicker || '').slice(0, 48),
    urgency: String(hero.note || fallback.urgency || '').slice(0, 80),
    features: (hero.badges || []).slice(0, 8),
    fields: (formSec.fields || fallback.fields || ['name', 'phone']).slice(0, 6),
    stats: (about.stats || []).map((s) => ({ n: s.value, l: s.label })).slice(0, 4),
    steps: (stepsSec.items || []).map((s) => ({ t: s.title, d: s.text })).slice(0, 8),
    prices: (services.items || []).filter((i) => i.price).map((i) => ({
      name: i.title,
      price: i.price,
      note: i.text,
    })).slice(0, 4),
    outcomes: (services.items || []).filter((i) => !i.price).map((i) => ({ t: i.title, d: i.text })).slice(0, 6),
    audience: (audienceSec?.items || []).map((i) => ({ t: i.title, d: i.text })).slice(0, 4),
    faq: (faqSec.items || []).map((f) => ({ q: f.question, a: f.answer })).slice(0, 6),
    reviews: (reviewsSec.items || []).map((r) => ({ q: r.text, a: r.author })).slice(0, 4),
    successText: String(formSec.successText || fallback.successText || '').slice(0, 200),
    contacts: {
      title: contactsSec.title || 'Контакты',
      phone: contactsSec.phone || '',
      email: contactsSec.email || '',
      address: contactsSec.address || '',
    },
    meta: {
      ...(fallback.meta || {}),
      place: contactsSec.address || fallback.meta?.place || '',
    },
    tone: toneEntry?.[0] || fallback.tone || 'teal',
    content,
  };
}

export function parseLandingContent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.sections)) return null;
  return {
    accent: String(raw.accent || '#ef6c4d').slice(0, 20),
    sections: raw.sections,
  };
}

export function mergeGeneratedContent(base, generated) {
  const parsed = parseLandingContent(generated);
  if (!parsed) return base;
  const out = { accent: base.accent, sections: [] };
  for (let i = 0; i < base.sections.length; i += 1) {
    const b = base.sections[i];
    const g = parsed.sections[i];
    if (!g || g.type !== b.type) {
      out.sections.push(b);
      continue;
    }
    out.sections.push({ ...b, ...g, type: b.type });
  }
  return out;
}
