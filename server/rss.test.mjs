import test from 'node:test';
import assert from 'node:assert/strict';
import { stripHtml, buildRssTextBody, parseRssFeed } from './rss-parser.mjs';
import { createRssSource, fetchRssSource, listRssItems, importRssItems, deleteRssSource } from './rss.mjs';
import { adaptCrosspostText, createCrosspostDrafts } from './crosspost.mjs';

test('stripHtml removes tags', () => {
  assert.equal(stripHtml('<p>Hi <b>there</b></p>'), 'Hi there');
});

test('buildRssTextBody prefers content', () => {
  assert.match(buildRssTextBody({ title: 'T', content: 'Body text' }), /Body text/);
});

test('parseRssFeed parses minimal RSS 2.0', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => `<?xml version="1.0"?><rss><channel><title>Test Feed</title>
      <item><title>Hello</title><link>https://example.com/1</link><guid>g1</guid><description>World</description></item>
    </channel></rss>`,
  });
  try {
    const feed = await parseRssFeed('https://example.com/feed.xml');
    assert.equal(feed.title, 'Test Feed');
    assert.equal(feed.items.length, 1);
    assert.equal(feed.items[0].title, 'Hello');
  } finally {
    globalThis.fetch = orig;
  }
});

test('createRssSource stores source', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => `<rss><channel><title>Blog</title><item><title>A</title><guid>1</guid></item></channel></rss>`,
  });
  const store = { rssSources: [], rssItems: [] };
  try {
    const r = await createRssSource(store, 'u1', { url: 'https://example.com/rss.xml' });
    assert.equal(store.rssSources.length, 1);
    assert.equal(r.source.name, 'Blog');
  } finally {
    globalThis.fetch = orig;
  }
});

test('fetchRssSource upserts items', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => `<rss><channel><title>B</title>
      <item><title>One</title><guid>g-one</guid><description>Text</description></item>
    </channel></rss>`,
  });
  const store = {
    rssSources: [{ id: 'rs1', userId: 'u1', url: 'https://example.com/f.xml', name: 'B', enabled: true }],
    rssItems: [],
  };
  try {
    const r = await fetchRssSource(store, 'u1', 'rs1');
    assert.equal(r.created, 1);
    assert.equal(listRssItems(store, 'u1', 'rs1').length, 1);
  } finally {
    globalThis.fetch = orig;
  }
});

test('importRssItems creates content post without AI', async () => {
  const store = {
    rssSources: [{ id: 'rs1', userId: 'u1', aiRewrite: false, accountId: 'vk1', ownerId: 1 }],
    rssItems: [{ id: 'i1', userId: 'u1', sourceId: 'rs1', guid: 'g', title: 'T', summary: 'S', status: 'new' }],
    contentPosts: [],
  };
  const r = await importRssItems(store, 'u1', 'rs1', [{ itemId: 'i1' }], {});
  assert.equal(r.imported, 1);
  assert.equal(store.contentPosts.length, 1);
  assert.equal(store.rssItems[0].status, 'imported');
});

test('adaptCrosspostText fallback without AI key', async () => {
  const v = await adaptCrosspostText('Hello world', ['vk'], { apiKey: '' });
  assert.equal(v.vk, 'Hello world');
});

test('createCrosspostDrafts', () => {
  const store = { contentPosts: [] };
  const rows = createCrosspostDrafts(store, 'u1', { vk: 'VK text', telegram: 'TG' });
  assert.equal(rows.length, 2);
  assert.equal(store.contentPosts.length, 2);
});
