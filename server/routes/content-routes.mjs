import { createReadStream, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { load, mutate } from '../db.mjs';
import { generatedPath, readAiConfig, generateAiChat } from '../ai.mjs';
import {
  listPosts, getPost, createPost, updatePost, deletePost, publishPost, listPubLogs,
  publicPost, contentPostCounts, studioPlanDrafts, CONTENT_NICHES,
} from '../posts.mjs';
import { postsCalendar } from '../content-plan.mjs';
import {
  listRssSources, getRssSource, createRssSource, updateRssSource, deleteRssSource,
  fetchRssSource, listRssItems, importRssItems, rssSourceItemCounts,
} from '../rss.mjs';
import { adaptCrosspostText, createCrosspostDrafts } from '../crosspost.mjs';
import {
  listRepostSources, getRepostSource, createRepostSource, updateRepostSource,
  deleteRepostSource, fetchRepostSource, listRepostItems, importRepostItems, repostSourceItemCounts,
} from '../repost.mjs';
import {
  workflowFromUser, submitForApproval, approvePost, rejectPost,
} from '../workflow.mjs';
import { publicCabinet } from '../cabinet.mjs';
import { saveUserMedia, listUserMedia, decodeUploadBody, mediaPath, deleteUserMedia } from '../media.mjs';
import { send, sendFail, readBody, requireUser } from '../http-api.mjs';
import { resolveVkAccount, tokenOf } from '../vk-helpers.mjs';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
};

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

if (method === 'GET' && path === '/api/media/library') {
    const u = requireUser(req, res); if (!u) return true;
    const uploads = listUserMedia(u.id);
    const ai = (load().campaigns || [])
      .filter((c) => c.userId === u.id && c.slug === 'image-ai')
      .flatMap((c) => (c.stats?.images || []).map((img) => ({ ...img, source: 'ai' })));
    send(res, 200, { uploads, ai });
  return true;
  }

  if (method === 'POST' && path === '/api/media/upload') {
    const u = requireUser(req, res); if (!u) return true;
    try {
      const body = await readBody(req, 6 * 1024 * 1024);
      const buf = decodeUploadBody(body);
      const row = saveUserMedia(u.id, buf, body.mime || body.contentType || 'image/jpeg');
      send(res, 200, row);
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'DELETE' && path.startsWith('/api/media/') && path.split('/').length === 4) {
    const u = requireUser(req, res); if (!u) return true;
    const name = path.split('/').pop();
    try {
      send(res, 200, deleteUserMedia(u.id, name));
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'GET' && path.startsWith('/api/media/') && path !== '/api/media/library' && path !== '/api/media/upload') {
    const name = path.split('/').pop();
    const file = generatedPath(name) || mediaPath(name);
    if (!file || !existsSync(file)) send(res, 404, { error: 'РќРµС‚ С„Р°Р№Р»Р°' });
    const type = MIME[extname(file)] || 'image/png';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' });
    createReadStream(file).pipe(res);
    return true;
  }

  if (method === 'GET' && path === '/api/posts') {
    const u = requireUser(req, res); if (!u) return true;
    const db = load();
    const q = url.searchParams;
    const posts = listPosts(db, u.id, {
      status: q.get('status') || null,
      trash: q.get('trash') === '1',
      templates: q.get('templates') === '1' ? true : (q.get('templates') === '0' ? false : undefined),
    }).map(publicPost);
    send(res, 200, { posts, counts: contentPostCounts(db, u.id) });
  }

  if (method === 'POST' && path === '/api/posts') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const post = mutate((db) => createPost(db, u.id, body));
    send(res, 201, { post: publicPost(post) });
  return true;
  }

  if (method === 'GET' && path === '/api/posts/history') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, { logs: listPubLogs(load(), u.id, 100) });
  return true;
  }

  if (method === 'GET' && path.match(/^\/api\/posts\/[^/]+$/) && !path.endsWith('/history')) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const post = getPost(load(), u.id, id);
    if (!post) { send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { post: publicPost(post) });
  }

  if (method === 'PATCH' && path.match(/^\/api\/posts\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const post = mutate((db) => updatePost(db, u.id, id, body));
    if (!post) { send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { post: publicPost(post) });
  }

  if (method === 'DELETE' && path.match(/^\/api\/posts\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const hard = url.searchParams.get('hard') === '1';
    const ok = mutate((db) => deletePost(db, u.id, id, { hard }));
    if (!ok) { send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { ok: true });
  }

  if (method === 'GET' && path === '/api/posts/calendar') {
    const u = requireUser(req, res); if (!u) return true;
    const from = Number(url.searchParams.get('from') || Date.now() - 86400000 * 35);
    const to = Number(url.searchParams.get('to') || Date.now() + 86400000 * 35);
    send(res, 200, postsCalendar(load(), u.id, from, to));
  return true;
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/submit-approval$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const user = load().users.find((x) => x.id === u.id);
    const { settings } = workflowFromUser(user);
    const post = mutate((db) => submitForApproval(db, u.id, id, settings));
    if (!post) { send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/approve$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const user = load().users.find((x) => x.id === u.id);
    const { settings } = workflowFromUser(user);
    const post = mutate((db) => approvePost(db, u.id, id, settings));
    if (!post) { send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/reject$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const post = mutate((db) => rejectPost(db, u.id, id, body.reason));
    if (!post) { send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { post: publicPost(post) });
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/publish$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const acc = resolveVkAccount(u, body.accountId);
    if (!acc) { send(res, 400, { error: 'РџРѕРґРєР»СЋС‡РёС‚Рµ VK-Р°РєРєР°СѓРЅС‚' }); return true; }
    const token = tokenOf(acc);
    const db = load();
    const userRow = db.users.find((x) => x.id === u.id);
    const result = await publishPost(db, u.id, id, {
      account: acc,
      token,
      ownerId: body.ownerId,
      cabinet: publicCabinet(userRow),
    });
    mutate((d) => d);
    if (!result.ok) { send(res, 400, { error: result.error, post: result.post }); return true; }
    send(res, 200, result);
  }

  if (method === 'POST' && path.match(/^\/api\/posts\/[^/]+\/ai-text$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[3];
    const body = await readBody(req);
    const db = load();
    const post = getPost(db, u.id, id);
    if (!post) { send(res, 404, { error: 'РџРѕСЃС‚ РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    const cfg = readAiConfig(db.settings);
    try {
      const prompt = String(body.prompt || 'РќР°РїРёС€Рё РєРѕСЂРѕС‚РєРёР№ РїРѕСЃС‚ РґР»СЏ VK').slice(0, 500);
      const topic = String(body.topic || post.title || post.text.slice(0, 80)).slice(0, 200);
      const { text } = await generateAiChat([
        { role: 'system', content: 'РўС‹ SMM-СЂРµРґР°РєС‚РѕСЂ. РџРёС€Рё РїРѕСЃС‚С‹ РґР»СЏ VK: Р¶РёРІРѕ, РїРѕ РґРµР»Сѓ, Р±РµР· РєР°РІС‹С‡РµРє Рё С…РµС€С‚РµРі-СЃРїР°РјР°. 2вЂ“4 Р°Р±Р·Р°С†Р°.' },
        { role: 'user', content: `${prompt}\n\nРўРµРјР°: ${topic}` },
      ], cfg, { maxTokens: 400 });
      const updated = mutate((d) => updatePost(d, u.id, id, { text }));
      send(res, 200, { text, post: publicPost(updated) });
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'GET' && path === '/api/content-studio/niches') {
    const u = requireUser(req, res); if (!u) return true;
    send(res, 200, { niches: CONTENT_NICHES });
  return true;
  }

  if (method === 'POST' && path === '/api/content-studio/plan') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const nicheId = String(body.niche || 'services');
    const days = Math.min(Math.max(Number(body.days) || 7, 3), 30);
    const drafts = studioPlanDrafts(nicheId, days);
    const posts = mutate((db) => {
      const created = [];
      for (const d of drafts) {
        created.push(createPost(db, u.id, {
          title: d.title,
          text: d.text,
          niche: d.niche,
          scheduledAt: d.scheduledAt,
          status: 'scheduled',
        }));
      }
      return created;
    });
    send(res, 201, { posts: posts.map(publicPost), count: posts.length });
  return true;
  }

  if (method === 'GET' && path === '/api/rss/sources') {
    const u = requireUser(req, res); if (!u) return true;
    const db = load();
    const counts = rssSourceItemCounts(db, u.id);
    const sources = listRssSources(db, u.id).map((s) => ({ ...s, itemCount: counts[s.id] || 0 }));
    send(res, 200, { sources });
  return true;
  }

  if (method === 'POST' && path === '/api/rss/sources') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    try {
      const db = load();
      const result = await createRssSource(db, u.id, body);
      mutate((d) => d);
      try { await fetchRssSource(db, u.id, result.source.id); mutate((d) => d); } catch { /* lastError */ }
      send(res, 201, result);
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'PATCH' && path.match(/^\/api\/rss\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const body = await readBody(req);
    const source = mutate((db) => updateRssSource(db, u.id, id, body));
    if (!source) { send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { source });
  }

  if (method === 'DELETE' && path.match(/^\/api\/rss\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/').pop();
    const ok = mutate((db) => deleteRssSource(db, u.id, id));
    if (!ok) { send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { ok: true });
  }

  if (method === 'POST' && path.match(/^\/api\/rss\/sources\/[^/]+\/fetch$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    try {
      const db = load();
      const result = await fetchRssSource(db, u.id, id);
      mutate((d) => d);
      send(res, 200, result);
    return true;
    } catch (err) {
      mutate((d) => d);
      sendFail(res, err);
    }
  }

  if (method === 'GET' && path.match(/^\/api\/rss\/sources\/[^/]+\/items$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const db = load();
    if (!getRssSource(db, u.id, id)) send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    const status = url.searchParams.get('status') || null;
    const take = Number(url.searchParams.get('take') || 100);
    send(res, 200, { items: listRssItems(db, u.id, id, { status, take }) });
  return true;
  }

  if (method === 'POST' && path === '/api/rss/import') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const sourceId = String(body.sourceId || '');
    const items = Array.isArray(body.items) ? body.items : [];
    if (!sourceId || !items.length) { send(res, 400, { error: 'Р’С‹Р±РµСЂРёС‚Рµ СЃС‚Р°С‚СЊРё' }); return true; }
    const db = load();
    const aiConfig = readAiConfig(db.settings);
    try {
      const result = await importRssItems(db, u.id, sourceId, items, { aiConfig });
      mutate((d) => d);
      send(res, 200, result);
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/crosspost/adapt') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const aiConfig = readAiConfig(load().settings);
    try {
      const versions = await adaptCrosspostText(body.text, body.platforms, aiConfig);
      send(res, 200, { versions });
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'POST' && path === '/api/crosspost/drafts') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const created = mutate((db) => createCrosspostDrafts(db, u.id, body.versions || {}, {
      accountId: body.accountId,
      ownerId: body.ownerId,
      ownerLabel: body.ownerLabel,
    }));
    send(res, 201, { created, count: created.length });
  return true;
  }

  if (method === 'GET' && path === '/api/repost/sources') {
    const u = requireUser(req, res); if (!u) return true;
    const db = load();
    const counts = repostSourceItemCounts(db, u.id);
    send(res, 200, { sources: listRepostSources(db, u.id).map((s) => ({ ...s, itemCount: counts[s.id] || 0 })) });
  return true;
  }

  if (method === 'POST' && path === '/api/repost/sources') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    try {
      const source = mutate((db) => createRepostSource(db, u.id, body));
      send(res, 201, { source });
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  if (method === 'PATCH' && path.match(/^\/api\/repost\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const body = await readBody(req);
    const source = mutate((db) => updateRepostSource(db, u.id, id, body));
    if (!source) { send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { source });
  }

  if (method === 'DELETE' && path.match(/^\/api\/repost\/sources\/[^/]+$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const ok = mutate((db) => deleteRepostSource(db, u.id, id));
    if (!ok) { send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    send(res, 200, { ok: true });
  }

  if (method === 'POST' && path.match(/^\/api\/repost\/sources\/[^/]+\/fetch$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const db = load();
    const source = getRepostSource(db, u.id, id);
    if (!source) { send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' }); return true; }
    const acc = resolveVkAccount(u, source.accountId);
    if (!acc) { send(res, 400, { error: 'РџРѕРґРєР»СЋС‡РёС‚Рµ VK-Р°РєРєР°СѓРЅС‚ РґР»СЏ СЃРєР°РЅРёСЂРѕРІР°РЅРёСЏ' }); return true; }
    const token = tokenOf(acc);
    try {
      const result = await fetchRepostSource(db, u.id, id, token);
      mutate((d) => d);
      send(res, 200, result);
    return true;
    } catch (err) {
      mutate((d) => d);
      sendFail(res, err);
    }
  }

  if (method === 'GET' && path.match(/^\/api\/repost\/sources\/[^/]+\/items$/)) {
    const u = requireUser(req, res); if (!u) return true;
    const id = path.split('/')[4];
    const db = load();
    if (!getRepostSource(db, u.id, id)) send(res, 404, { error: 'РСЃС‚РѕС‡РЅРёРє РЅРµ РЅР°Р№РґРµРЅ' });
    const status = url.searchParams.get('status') || null;
    send(res, 200, { items: listRepostItems(db, u.id, id, { status, take: 100 }) });
  return true;
  }

  if (method === 'POST' && path === '/api/repost/import') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    const sourceId = String(body.sourceId || '');
    const items = Array.isArray(body.items) ? body.items : [];
    if (!sourceId || !items.length) { send(res, 400, { error: 'Р’С‹Р±РµСЂРёС‚Рµ РїРѕСЃС‚С‹' }); return true; }
    try {
      const result = mutate((db) => importRepostItems(db, u.id, sourceId, items));
      send(res, 200, result);
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  return false;
}
