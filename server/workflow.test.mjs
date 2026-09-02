import test from 'node:test';
import assert from 'node:assert/strict';
import {
  workflowFromUser, patchWorkflowSettings, submitForApproval, approvePost, rejectPost, listPendingApproval,
} from './workflow.mjs';

test('workflowFromUser returns default stages', () => {
  const wf = workflowFromUser({ cabinet: {} });
  assert.equal(wf.settings.approvalMode, 'optional');
  assert.equal(wf.stages.length, 4);
});

test('patchWorkflowSettings updates approval mode', () => {
  const c = patchWorkflowSettings({}, { approvalMode: 'required' });
  assert.equal(c.workflow.approvalMode, 'required');
});

test('submit and approve post', () => {
  const db = { contentPosts: [{ id: 'p1', userId: 'u1', status: 'draft', text: 'Hi' }] };
  submitForApproval(db, 'u1', 'p1');
  assert.equal(db.contentPosts[0].status, 'pending_approval');
  assert.equal(listPendingApproval(db, 'u1').length, 1);
  approvePost(db, 'u1', 'p1');
  assert.equal(db.contentPosts[0].status, 'draft');
});

test('rejectPost stores reason', () => {
  const db = { contentPosts: [{ id: 'p1', userId: 'u1', status: 'pending_approval', text: 'Hi' }] };
  rejectPost(db, 'u1', 'p1', 'Too short');
  assert.equal(db.contentPosts[0].status, 'draft');
  assert.equal(db.contentPosts[0].rejectionReason, 'Too short');
});
