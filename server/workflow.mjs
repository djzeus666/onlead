/** Approval workflow — stages + queue (online-lead.ru parity). */
import { getPost, updatePost } from './posts.mjs';
import { normalizeCabinet } from './cabinet.mjs';

export const DEFAULT_WORKFLOW_SETTINGS = {
  approvalMode: 'optional',
  scheduleAfterApproval: true,
  editAfterApproval: true,
  submitFromAnyStage: false,
};

export const DEFAULT_WORKFLOW_STAGES = [
  { id: 'draft', name: 'Черновик', kind: 'draft', color: '#64748b', sortOrder: 0, isSystem: true },
  { id: 'approval', name: 'Согласование', kind: 'approval', color: '#f59e0b', sortOrder: 1, isSystem: true },
  { id: 'schedule', name: 'Планирование', kind: 'schedule', color: '#3b82f6', sortOrder: 2, isSystem: true },
  { id: 'publish', name: 'Публикация', kind: 'publish', color: '#10b981', sortOrder: 3, isSystem: true },
];

export function workflowFromUser(user) {
  const c = normalizeCabinet(user?.cabinet);
  const settings = { ...DEFAULT_WORKFLOW_SETTINGS, ...(c.workflow || {}) };
  const stages = (Array.isArray(c.workflowStages) && c.workflowStages.length
    ? c.workflowStages
    : DEFAULT_WORKFLOW_STAGES).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return { settings, stages };
}

export function patchWorkflowSettings(cabinet, body = {}) {
  const c = normalizeCabinet(cabinet);
  c.workflow = { ...DEFAULT_WORKFLOW_SETTINGS, ...(c.workflow || {}) };
  if (body.approvalMode != null) {
    const m = String(body.approvalMode);
    if (['off', 'optional', 'required'].includes(m)) c.workflow.approvalMode = m;
  }
  if (body.scheduleAfterApproval != null) c.workflow.scheduleAfterApproval = Boolean(body.scheduleAfterApproval);
  if (body.editAfterApproval != null) c.workflow.editAfterApproval = Boolean(body.editAfterApproval);
  if (body.submitFromAnyStage != null) c.workflow.submitFromAnyStage = Boolean(body.submitFromAnyStage);
  return c;
}

export function listPendingApproval(store, userId) {
  return (store.contentPosts || [])
    .filter((p) => p.userId === userId && p.status === 'pending_approval')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map((p) => ({
      id: p.id,
      title: p.title || '',
      text: String(p.text || '').slice(0, 200),
      workflowStageName: p.workflowStageName || 'Согласование',
      scheduledAt: p.scheduledAt || null,
      updatedAt: p.updatedAt || p.createdAt,
    }));
}

function postMutable(store, userId, id) {
  return (store.contentPosts || []).find((p) => p.id === id && p.userId === userId) || null;
}

export function submitForApproval(store, userId, postId, settings = DEFAULT_WORKFLOW_SETTINGS) {
  const post = postMutable(store, userId, postId);
  if (!post) return null;
  if (settings.approvalMode === 'off') return post;
  post.status = 'pending_approval';
  post.workflowStageName = 'Согласование';
  post.updatedAt = Date.now();
  return post;
}

export function approvePost(store, userId, postId, settings = DEFAULT_WORKFLOW_SETTINGS) {
  const post = postMutable(store, userId, postId);
  if (!post) return null;
  const hasFutureSchedule = post.scheduledAt && post.scheduledAt > Date.now();
  if (hasFutureSchedule && settings.scheduleAfterApproval !== false) {
    post.status = 'scheduled';
    post.workflowStageName = 'Планирование';
  } else {
    post.status = 'draft';
    post.workflowStageName = 'Черновик';
  }
  post.rejectionReason = '';
  post.updatedAt = Date.now();
  return post;
}

export function rejectPost(store, userId, postId, reason = '') {
  const post = postMutable(store, userId, postId);
  if (!post) return null;
  post.status = 'draft';
  post.workflowStageName = 'Черновик';
  post.rejectionReason = String(reason || '').slice(0, 500);
  post.updatedAt = Date.now();
  return post;
}

export function workflowPublicPayload(store, user) {
  const { settings, stages } = workflowFromUser(user);
  const members = [{
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    role: 'owner',
  }];
  return {
    settings,
    stages,
    members,
    pending: listPendingApproval(store, user.id),
  };
}

export function getPostForWorkflow(store, userId, postId) {
  return getPost(store, userId, postId);
}

export function touchPost(store, userId, postId, patch) {
  return updatePost(store, userId, postId, patch);
}
