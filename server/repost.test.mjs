import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVkOwnerRef, createRepostSource, importRepostItems } from './repost.mjs';

test('parseVkOwnerRef parses club url', () => {
  assert.equal(parseVkOwnerRef('https://vk.com/club12345'), -12345);
  assert.equal(parseVkOwnerRef('wall-100_42'), -100);
});

test('createRepostSource stores vk owner', () => {
  const db = { repostSources: [], repostItems: [] };
  const s = createRepostSource(db, 'u1', { externalRef: 'https://vk.com/public99', name: 'Test' });
  assert.equal(s.externalOwnerId, -99);
  assert.equal(db.repostSources.length, 1);
});

test('importRepostItems creates draft post', () => {
  const db = {
    repostSources: [{ id: 'rs1', userId: 'u1', accountId: 'a1', ownerId: -1, ownerLabel: 'G' }],
    repostItems: [{
      id: 'ri1', userId: 'u1', sourceId: 'rs1', status: 'new', text: 'Hello world', title: 'Hi', attachments: ['photo1_2'],
    }],
    contentPosts: [],
  };
  const r = importRepostItems(db, 'u1', 'rs1', [{ itemId: 'ri1' }]);
  assert.equal(r.imported, 1);
  assert.equal(db.contentPosts[0].text.includes('Hello'), true);
  assert.equal(db.repostItems[0].status, 'imported');
});
