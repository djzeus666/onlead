import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POST_STATUSES,
  normalizePostStatus,
  createPost,
  updatePost,
  listPosts,
  deletePost,
  studioPlanDrafts,
  contentPostCounts,
} from './posts.mjs';

test('post statuses include draft scheduled published failed trash', () => {
  assert.ok(POST_STATUSES.includes('draft'));
  assert.ok(POST_STATUSES.includes('scheduled'));
  assert.ok(POST_STATUSES.includes('published'));
  assert.equal(normalizePostStatus('unknown'), 'draft');
});

test('create and list posts for user', () => {
  const store = { contentPosts: [] };
  const p = createPost(store, 'u1', { title: 'Test', text: 'Hello', status: 'draft' });
  assert.equal(p.userId, 'u1');
  assert.equal(listPosts(store, 'u1').length, 1);
  assert.equal(listPosts(store, 'u2').length, 0);
});

test('update post sets scheduled status fields', () => {
  const store = { contentPosts: [] };
  const p = createPost(store, 'u1', { text: 'A' });
  const ts = Date.now() + 3600000;
  updatePost(store, 'u1', p.id, { scheduledAt: ts, status: 'scheduled' });
  const row = listPosts(store, 'u1', { status: 'scheduled' })[0];
  assert.equal(row.scheduledAt, ts);
});

test('delete moves to trash', () => {
  const store = { contentPosts: [] };
  const p = createPost(store, 'u1', { text: 'X' });
  deletePost(store, 'u1', p.id);
  assert.equal(listPosts(store, 'u1').length, 0);
  assert.equal(listPosts(store, 'u1', { trash: true }).length, 1);
});

test('studio plan returns niche drafts', () => {
  const drafts = studioPlanDrafts('beauty', 7);
  assert.equal(drafts.length, 7);
  assert.ok(drafts[0].title);
  assert.ok(drafts[0].text);
});

test('contentPostCounts aggregates by status', () => {
  const store = { contentPosts: [] };
  createPost(store, 'u1', { status: 'draft', text: 'a' });
  createPost(store, 'u1', { status: 'published', text: 'b' });
  const c = contentPostCounts(store, 'u1');
  assert.equal(c.draft, 1);
  assert.equal(c.published, 1);
  assert.equal(c.all, 2);
});
