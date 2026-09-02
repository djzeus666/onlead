/** Content calendar slots (online-lead.ru parity). */
export const DEFAULT_CONTENT_PLAN = {
  slotsPerDay: 3,
  defaultTimes: '10:00, 14:00, 18:00',
};

export function parsePlanTimes(raw) {
  const src = raw != null ? String(raw) : DEFAULT_CONTENT_PLAN.defaultTimes;
  const out = [];
  for (const part of src.split(/[,;\n]+/)) {
    const m = part.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const h = Math.min(23, Math.max(0, Number(m[1])));
    const min = Math.min(59, Math.max(0, Number(m[2])));
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out.slice(0, 24);
}

export function slotIsoForDay(dayDate, timeStr) {
  const d = dayDate instanceof Date ? dayDate : new Date(dayDate);
  if (Number.isNaN(d.getTime())) return null;
  const [h, m] = String(timeStr || '10:00').split(':').map(Number);
  const x = new Date(d);
  x.setHours(h || 0, m || 0, 0, 0);
  return x.getTime();
}

export function normalizeContentPlan(raw) {
  const c = { ...DEFAULT_CONTENT_PLAN, ...(raw || {}) };
  c.slotsPerDay = Math.min(24, Math.max(1, Number(c.slotsPerDay) || 3));
  c.defaultTimes = parsePlanTimes(c.defaultTimes).join(', ') || DEFAULT_CONTENT_PLAN.defaultTimes;
  return c;
}

export function postsCalendar(store, userId, fromMs, toMs) {
  const from = Number(fromMs) || Date.now() - 86400000 * 30;
  const to = Number(toMs) || Date.now() + 86400000 * 30;
  const days = {};
  const add = (key, kind, post) => {
    if (!days[key]) days[key] = { date: key, scheduled: [], published: [], draft: [] };
    days[key][kind].push({
      id: post.id,
      title: post.title || '',
      text: String(post.text || '').slice(0, 120),
      status: post.status,
      scheduledAt: post.scheduledAt || null,
      publishedAt: post.publishedAt || null,
    });
  };

  for (const p of store.contentPosts || []) {
    if (p.userId !== userId || p.status === 'trash') continue;
    const ts = p.scheduledAt || p.publishedAt || p.updatedAt || p.createdAt;
    if (!ts || ts < from || ts > to) continue;
    const key = new Date(ts).toISOString().slice(0, 10);
    if (p.status === 'published') add(key, 'published', p);
    else if (p.status === 'scheduled') add(key, 'scheduled', p);
    else if (p.status === 'draft' || p.status === 'pending_approval') add(key, 'draft', p);
  }

  return {
    from,
    to,
    days: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
