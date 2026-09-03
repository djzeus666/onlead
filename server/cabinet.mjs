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
  rubrics: [],
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
  c.rubrics = Array.isArray(c.rubrics) ? c.rubrics.slice(0, 40) : [];
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
  if (body.rubrics != null) cur.rubrics = Array.isArray(body.rubrics) ? body.rubrics.slice(0, 40) : cur.rubrics;
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
  const payload = teamPayload(db, userId);
  return payload.members;
}

export function teamPayload(db, userId) {
  const owner = resolveTeamOwner(db, userId);
  const actor = db.users.find((u) => u.id === userId);
  if (!owner) return { ownerId: null, members: [], canManage: false };
  const canManage = Boolean(actor && !actor.teamOwnerId);

  const members = [{
    id: owner.id,
    userId: owner.id,
    name: owner.name || owner.email,
    email: owner.email,
    role: 'owner',
    status: 'active',
  }];

  for (const u of db.users || []) {
    if (u.id === owner.id) continue;
    if (u.teamOwnerId === owner.id) {
      members.push({
        id: u.id,
        userId: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.teamRole === 'admin' ? 'admin' : 'member',
        status: 'active',
        joinedAt: u.teamJoinedAt || u.createdAt,
      });
    }
  }

  for (const inv of owner.teamInvites || []) {
    if (inv.status !== 'pending') continue;
    members.push({
      id: inv.id,
      inviteId: inv.id,
      name: inv.email.split('@')[0],
      email: inv.email,
      role: inv.role === 'admin' ? 'admin' : 'member',
      status: 'pending',
      invitedAt: inv.createdAt,
    });
  }

  return { ownerId: owner.id, members, canManage };
}

export function resolveTeamOwner(db, userId) {
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return null;
  if (user.teamOwnerId) {
    return (db.users || []).find((u) => u.id === user.teamOwnerId) || user;
  }
  return user;
}

function assertTeamOwner(db, userId) {
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) return { ok: false, error: 'Пользователь не найден' };
  if (user.teamOwnerId) return { ok: false, error: 'Только владелец может управлять командой' };
  return { ok: true, owner: user };
}

function normalizeTeamRole(role) {
  return role === 'admin' ? 'admin' : 'member';
}

export function inviteTeamMember(db, ownerId, { email, role }) {
  const check = assertTeamOwner(db, ownerId);
  if (!check.ok) return check;
  const owner = check.owner;
  const addr = String(email || '').trim().toLowerCase();
  const teamRole = normalizeTeamRole(role);
  if (!addr.includes('@')) return { ok: false, error: 'Укажите email' };
  if (addr === owner.email) return { ok: false, error: 'Нельзя пригласить себя' };

  const existing = (db.users || []).find((u) => u.email === addr);
  if (existing?.teamOwnerId && existing.teamOwnerId !== owner.id) {
    return { ok: false, error: 'Пользователь уже в другой команде' };
  }
  if (existing?.teamOwnerId === owner.id) {
    return { ok: false, error: 'Уже в вашей команде' };
  }

  owner.teamInvites = owner.teamInvites || [];
  if (owner.teamInvites.some((i) => i.status === 'pending' && i.email === addr)) {
    return { ok: false, error: 'Приглашение уже отправлено' };
  }

  if (existing && !existing.teamOwnerId) {
    existing.teamOwnerId = owner.id;
    existing.teamRole = teamRole;
    existing.teamJoinedAt = Date.now();
    return { ok: true, added: true, member: { id: existing.id, email: addr, role: teamRole, status: 'active' } };
  }

  const token = randomBytes(18).toString('base64url');
  const invite = {
    id: 'ti' + Date.now(),
    email: addr,
    role: teamRole,
    token,
    status: 'pending',
    createdAt: Date.now(),
  };
  owner.teamInvites.push(invite);
  return { ok: true, added: false, invite };
}

export function patchTeamMember(db, ownerId, targetId, { role }) {
  const check = assertTeamOwner(db, ownerId);
  if (!check.ok) return check;
  const owner = check.owner;
  const teamRole = normalizeTeamRole(role);
  const member = (db.users || []).find((u) => u.id === targetId && u.teamOwnerId === owner.id);
  if (!member) return { ok: false, error: 'Участник не найден' };
  member.teamRole = teamRole;
  return { ok: true, member: { id: member.id, email: member.email, role: teamRole } };
}

export function removeTeamMember(db, ownerId, targetId) {
  const check = assertTeamOwner(db, ownerId);
  if (!check.ok) return check;
  const owner = check.owner;
  if (targetId === owner.id) return { ok: false, error: 'Нельзя удалить владельца' };

  const member = (db.users || []).find((u) => u.id === targetId && u.teamOwnerId === owner.id);
  if (member) {
    delete member.teamOwnerId;
    delete member.teamRole;
    delete member.teamJoinedAt;
    return { ok: true, removed: 'member' };
  }

  owner.teamInvites = owner.teamInvites || [];
  const idx = owner.teamInvites.findIndex((i) => i.id === targetId && i.status === 'pending');
  if (idx >= 0) {
    owner.teamInvites[idx].status = 'revoked';
    return { ok: true, removed: 'invite' };
  }
  return { ok: false, error: 'Участник или приглашение не найдены' };
}

export function acceptTeamInvite(db, token, user) {
  const check = findPendingTeamInvite(db, token, user?.email);
  if (!check.ok) return check;
  if (user.teamOwnerId) return { ok: false, error: 'Вы уже в команде' };
  const { owner, invite } = check;
  user.teamOwnerId = owner.id;
  user.teamRole = invite.role === 'admin' ? 'admin' : 'member';
  user.teamJoinedAt = Date.now();
  invite.status = 'accepted';
  invite.acceptedAt = Date.now();
  invite.memberUserId = user.id;
  return { ok: true, ownerId: owner.id, role: user.teamRole };
}

export function findPendingTeamInvite(db, token, email) {
  const tok = String(token || '').trim();
  const addr = String(email || '').trim().toLowerCase();
  if (!tok || !addr.includes('@')) return { ok: false, error: 'Недействительное приглашение' };
  for (const owner of db.users || []) {
    const inv = (owner.teamInvites || []).find((i) => i.status === 'pending' && i.token === tok);
    if (!inv) continue;
    if (inv.email !== addr) return { ok: false, error: 'Приглашение отправлено на другой email' };
    return { ok: true, owner, invite: inv };
  }
  return { ok: false, error: 'Приглашение не найдено или устарело' };
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
