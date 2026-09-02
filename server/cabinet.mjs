/** Cabinet — analytics + user settings (online-lead.ru parity). */
import { activitySeries, activityTotals } from './stats.mjs';
import { contentPostCounts } from './posts.mjs';
import { normalizeContentPlan } from './content-plan.mjs';
import { randomBytes } from 'node:crypto';

export const TIMEZONES = [
  'Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Samara',
  'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Vladivostok', 'UTC',
];

const DEFAULT_CABINET = {
  timezone: 'Europe/Moscow',
  notifications: {
    emailLeadgen: true,
    emailPublish: false,
    emailErrors: true,
    emailDigest: false,
  },
  utm: { enabled: false, source: 'vk', medium: 'social', campaign: '' },
  signatures: [],
  quickAnswers: [],
  watermarks: [],
  contentPlan: { slotsPerDay: 3, defaultTimes: '10:00, 14:00, 18:00' },
  workflow: { approvalMode: 'optional', scheduleAfterApproval: true, editAfterApproval: true },
  workflowStages: null,
};

export function normalizeCabinet(raw) {
  const c = { ...DEFAULT_CABINET, ...(raw || {}) };
  c.notifications = { ...DEFAULT_CABINET.notifications, ...(c.notifications || {}) };
  c.utm = { ...DEFAULT_CABINET.utm, ...(c.utm || {}) };
  c.signatures = Array.isArray(c.signatures) ? c.signatures : [];
  c.quickAnswers = Array.isArray(c.quickAnswers) ? c.quickAnswers : [];
  c.watermarks = Array.isArray(c.watermarks) ? c.watermarks.slice(0, 20) : [];
  c.contentPlan = normalizeContentPlan(c.contentPlan);
  if (c.workflow && typeof c.workflow === 'object') {
    c.workflow = { approvalMode: 'optional', scheduleAfterApproval: true, editAfterApproval: true, ...c.workflow };
  }
  return c;
}

export function publicCabinet(user) {
  return normalizeCabinet(user?.cabinet);
}

export function patchCabinet(user, body = {}) {
  const cur = normalizeCabinet(user.cabinet);
  if (body.timezone != null) cur.timezone = String(body.timezone);
  if (body.notifications != null) {
    cur.notifications = { ...cur.notifications, ...body.notifications };
  }
  if (body.utm != null) cur.utm = { ...cur.utm, ...body.utm };
  if (body.signatures != null) cur.signatures = Array.isArray(body.signatures) ? body.signatures.slice(0, 40) : cur.signatures;
  if (body.quickAnswers != null) cur.quickAnswers = Array.isArray(body.quickAnswers) ? body.quickAnswers.slice(0, 40) : cur.quickAnswers;
  if (body.watermarks != null) cur.watermarks = Array.isArray(body.watermarks) ? body.watermarks.slice(0, 20) : cur.watermarks;
  if (body.contentPlan != null) cur.contentPlan = normalizeContentPlan({ ...cur.contentPlan, ...body.contentPlan });
  if (body.workflow != null) cur.workflow = { ...cur.workflow, ...body.workflow };
  if (body.workflowStages != null) cur.workflowStages = Array.isArray(body.workflowStages) ? body.workflowStages.slice(0, 12) : cur.workflowStages;
  return cur;
}

function rowId() {
  return `cab-${Date.now()}-${randomBytes(2).toString('hex')}`;
}

export function addCabinetItem(list, { name, text }) {
  const row = { id: rowId(), name: String(name || '').slice(0, 80), text: String(text || '').slice(0, 2000) };
  return [...(list || []), row];
}

export function removeCabinetItem(list, id) {
  return (list || []).filter((x) => x.id !== id);
}

export function analyticsReport(db, userId, days = 30) {
  const n = Math.min(Math.max(Number(days) || 30, 7), 90);
  const series = activitySeries(db, userId, n);
  const totals = activityTotals(series);
  const posts = contentPostCounts(db, userId);
  const accounts = (db.accounts || []).filter((a) => a.userId === userId && a.status === 'active');
  const since = Date.now() - n * 86400000;

  const pubLogs = (db.pubLogs || []).filter((l) => l.userId === userId && (l.createdAt || 0) >= since);
  const publishOk = pubLogs.filter((l) => l.status === 'ok').length;
  const publishErr = pubLogs.filter((l) => l.status === 'error').length;

  const campaigns = (db.campaigns || []).filter((c) => c.userId === userId);
  const runningTools = campaigns.filter((c) => c.status === 'running').length;

  const toolHits = {};
  for (const j of db.jobs || []) {
    if (j.userId !== userId || !j.ok) continue;
    const t = Date.parse(j.at);
    if (!t || t < since) continue;
    const camp = campaigns.find((c) => c.id === j.campaignId);
    const slug = camp?.slug || 'other';
    toolHits[slug] = (toolHits[slug] || 0) + 1;
  }
  const topTools = Object.entries(toolHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, count]) => ({ slug, count }));

  const leadsActive = (db.leads || []).filter((l) => l.userId === userId && !l.archived).length;
  const lgMatches = (db.leadgenMatches || []).filter((m) => m.userId === userId && m.status !== 'dismissed').length;

  const pubByDay = {};
  for (const l of pubLogs) {
    const key = new Date(l.createdAt).toISOString().slice(0, 10);
    if (!pubByDay[key]) pubByDay[key] = { date: key, ok: 0, err: 0 };
    if (l.status === 'ok') pubByDay[key].ok += 1;
    else pubByDay[key].err += 1;
  }

  return {
    days: n,
    summary: {
      connectedAccounts: accounts.length,
      runningTools,
      leads: totals.leads,
      leadsActive,
      leadgenMatches: lgMatches,
      actions: totals.actions,
      messages: totals.messages,
      likes: totals.likes,
      posts: totals.posts,
      contentDraft: posts.draft || 0,
      contentScheduled: posts.scheduled || 0,
      contentPublished: posts.published || 0,
      publishOk,
      publishErr,
    },
    series,
    publishing: Object.values(pubByDay).sort((a, b) => a.date.localeCompare(b.date)),
    topTools,
    recentPublishes: pubLogs.slice(0, 12).map((l) => ({
      id: l.id,
      status: l.status,
      message: l.message,
      textPreview: l.textPreview,
      permalink: l.permalink,
      createdAt: l.createdAt,
    })),
  };
}

export function listTeamMembers(db, userId) {
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return [];
  return [{
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    role: 'owner',
  }];
}

export const AI_AGENT_CARDS = [
  { id: 'leadgen', title: 'Лидоскоп', tagline: 'Ищет заявки в VK', href: '#/office/tools/leadgen-vk', slug: 'leadgen-vk', tone: 'teal' },
  { id: 'ai-lead', title: 'AI Лид-менеджер', tagline: 'Диалоги и скоринг', href: '#/office/tools/ai-lead-vk', slug: 'ai-lead-vk', tone: 'violet' },
  { id: 'neuro', title: 'Нейрокомментарии', tagline: 'Комментарии под постами', href: '#/office/tools/neurocomment-vk', slug: 'neurocomment-vk', tone: 'purple' },
  { id: 'image', title: 'AI-картинки', tagline: 'Обложки и креативы', href: '#/office/ai-images', slug: 'image-ai', tone: 'amber' },
  { id: 'content', title: 'Контент-план', tagline: 'AI-план на неделю', href: '#/office/content-studio', slug: null, tone: 'sky' },
  { id: 'crosspost', title: 'AI-кросспост', tagline: 'Адаптация под площадки', href: '#/office/crosspost', slug: null, tone: 'cyan' },
  { id: 'compose', title: 'Редактор постов', tagline: 'VK + расписание', href: '#/office/compose', slug: null, tone: 'emerald' },
  { id: 'rss', title: 'RSS Autopilot', tagline: 'Лента → черновики', href: '#/office/rss', slug: null, tone: 'rose' },
];
