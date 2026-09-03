/** Content-family campaign step handlers: grabber, autoposting, autostoris. */
import { mutate } from './db.mjs';
import { vkFetchWallPosts, vkListManagedGroups } from './vk/growth.mjs';
import { filterPostsByKeywords, parseKeywords, replaceGrabberLinks } from './vk/grabber.mjs';
import { postingDue, storiesDue } from './schedule.mjs';
import { sleep } from './vk/call.mjs';
import { vkPublishWall } from './vk/adapter.mjs';
import { vkPublishStory, vkStoryStats } from './vk/stories.mjs';
import { generateAiImage, saveGeneratedImage, readAiConfig } from './ai.mjs';
import {
  grabberDestination,
  queueGrabbedPosts,
  parseStoryCaptions,
  appendUtm,
  takeQueuedPost,
  markQueuedPost,
  resolveOwners,
} from './jobs-shared.mjs';

export async function runContentFamilyStep(ctx) {
  const { campaign, db, p, slug, pause, account, token } = ctx;

  if (slug === 'grabber-vk') {
    const owners = await resolveOwners(token, p.sources);
    if (!owners.length) return { ok: false, message: 'Укажите источники' };
    const raw = [];
    for (const owner of owners.slice(0, 3)) {
      raw.push(...await vkFetchWallPosts(token, owner, 10));
    }
    const keys = parseKeywords(p.keys);
    const posts = filterPostsByKeywords(raw, keys);
    const dest = String(p.dest || '').toLowerCase();
    const oneShot = /стен|сообществ|очеред/.test(dest);
    if (!posts.length) {
      return {
        ok: true,
        done: oneShot,
        skip: !oneShot,
        quiet: !oneShot,
        message: keys.length
          ? `Пока нет постов по ключам: ${keys.join(', ')}`
          : 'Источники без новых постов',
      };
    }
    let batch = posts;
    if (!oneShot) {
      const seen = new Set(campaign.stats?.grabbedKeys || []);
      batch = posts.filter((post) => {
        const key = post.url || `${post.ownerId}_${post.postId}`;
        return key && !seen.has(key);
      });
      if (!batch.length) {
        return {
          ok: true,
          skip: true,
          quiet: true,
          done: false,
          message: 'Новых постов нет · мониторинг',
        };
      }
    }
    const listId = 'grab-' + Date.now();
    mutate((d) => {
      d.lists.unshift({
        id: listId,
        userId: campaign.userId,
        name: `Граббер ${owners[0]}${keys.length ? ` · ${keys[0]}` : ''}`,
        count: batch.length,
        source: 'Граббер постов',
        created: new Date().toLocaleDateString('ru-RU'),
        items: batch,
      });
    });
    const filtered = keys.length ? ` (из ${raw.length} по ключам)` : '';
    const grabbedKeys = [
      ...(campaign.stats?.grabbedKeys || []),
      ...batch.map((post) => post.url || `${post.ownerId}_${post.postId}`),
    ].slice(-300);
    if (/очеред/.test(dest)) {
      const queued = queueGrabbedPosts(campaign, batch, p.replaceUrl);
      return {
        ok: true,
        done: true,
        message: `Собрано ${batch.length}${filtered} · ${queued} в очереди автопостинга`,
        meta: { grabbedKeys },
      };
    }
    if (/стен|сообществ/.test(dest)) {
      const target = await grabberDestination(token, account, dest);
      const best = batch.find((x) => String(x.text || '').trim() || (x.attachments || []).length);
      if (!best) return { ok: true, done: true, message: `Собрано ${batch.length}${filtered} · публиковать нечего` };
      const r = await vkPublishWall(token, {
        ownerId: target,
        text: replaceGrabberLinks(best.text || '', p.replaceUrl),
        attachments: best.attachments,
      });
      const attNote = (best.attachments || []).length ? ` + ${best.attachments.length} фото` : '';
      return {
        ok: r.ok,
        done: true,
        message: r.ok
          ? `Собрано ${batch.length}${filtered} · опубликован 1 пост${attNote}`
          : `Собрано ${batch.length}${filtered}, публикация не удалась: ${r.message}`,
        meta: r.ok ? { posted: true, grabbedKeys } : { grabbedKeys },
      };
    }
    return {
      ok: true,
      done: false,
      message: `Собрано ${batch.length} новых постов${filtered} · мониторинг`,
      meta: { grabbedKeys },
    };
  }

  if (slug === 'autoposting-vk') {
    const gate = postingDue(p.when, campaign.createdAt || campaign.startedAt);
    if (!gate.due) return { ok: true, skip: true, quiet: true, message: gate.note };

    const dest = String(p.destinations || p.dest || '').trim();
    const targets = [];
    const explicit = Number(dest);
    if (Number.isFinite(explicit) && explicit !== 0) {
      targets.push(explicit);
    } else if (/сообществ/i.test(dest)) {
      const groups = await vkListManagedGroups(token);
      // «Несколько стен» means own page plus every community the user manages.
      const wanted = /нескольк/i.test(dest) ? groups : groups.slice(0, 1);
      targets.push(...wanted.map((g) => -g.id));
      if (/нескольк/i.test(dest)) targets.unshift(Number(account.externalId) || Number(account.vkId));
    } else if (/нескольк/i.test(dest)) {
      const groups = await vkListManagedGroups(token);
      targets.push(Number(account.externalId) || Number(account.vkId), ...groups.map((g) => -g.id));
    } else {
      targets.push(Number(account.externalId) || Number(account.vkId));
    }
    if (!targets.length) return { ok: false, done: true, message: 'Некуда публиковать: нет управляемых сообществ' };

    const queued = takeQueuedPost(campaign.userId);
    let text = String(p.text || '').trim() || queued?.text || '';
    if (text && (p.utmSource || p.utmCampaign || p.utmMedium)) text = appendUtm(text, p);
    const postAttachments = queued?.attachments || [];
    const recurring = /расписан|каждый день|пн\/ср\/пт/i.test(String(p.when || ''));
    if (!text) {
      return {
        ok: true,
        done: !recurring,
        skip: true,
        message: recurring ? 'Очередь пуста · ждём контент' : 'Нет текста поста и очередь пуста',
      };
    }

    const posted = [];
    const failed = [];
    for (const ownerId of targets.slice(0, 5)) {
      const r = await vkPublishWall(token, { ownerId, text, attachments: postAttachments });
      if (r.ok) posted.push(r.externalPostId);
      else failed.push(r.message);
      await sleep(pause);
    }
    if (queued) markQueuedPost(campaign.userId, queued.id, posted.length ? 'posted' : 'failed');
    return {
      ok: posted.length > 0,
      // A recurring schedule must stay running; a one-off is finished.
      done: !recurring,
      message: posted.length
        ? `Опубликовано на ${posted.length} ${posted.length === 1 ? 'стене' : 'стенах'}${queued ? ' (из очереди)' : ''}`
        : `Публикация не удалась: ${failed[0] || 'неизвестная ошибка'}`,
      meta: posted.length ? { posted: true } : undefined,
    };
  }

  if (slug === 'autostoris-vk') {
    const rawGroups = String(p.groups || '').trim();
    let ownerIds = [Number(account.externalId)];
    if (rawGroups) {
      const ids = await resolveOwners(token, rawGroups);
      if (ids.length) ownerIds = ids.map(Number);
    }
    const accountIdx = Number(campaign.stats?.storyAccountIdx || 0);
    const ownerId = ownerIds[accountIdx % ownerIds.length] || Number(account.externalId);
    const metrics = [...(campaign.stats?.storyMetrics || [])];
    for (const m of metrics.slice(0, 8)) {
      if (!m?.storyId) continue;
      const st = await vkStoryStats(token, m.ownerId || ownerId, m.storyId);
      m.views = st.views;
      m.clicks = st.clicks;
    }
    const gate = storiesDue(p.when, campaign.stats?.storyDay);
    if (!gate.due) {
      return {
        ok: true,
        skip: true,
        quiet: true,
        message: gate.note || 'Ждём расписание сторис',
        meta: metrics.length ? { storyMetrics: metrics } : undefined,
      };
    }
    const recurring = /каждый день|пн\/ср\/пт|расписан/i.test(String(p.when || ''));
    const captions = parseStoryCaptions(p.caption || p.text || 'Сторис');
    const storyIdx = Number(campaign.stats?.storyIdx || 0);
    let caption = captions[storyIdx % captions.length] || 'Сторис';
    const queueLeft = Math.max(0, captions.length - ((storyIdx % captions.length) + 1));
    const pollLines = String(p.poll || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const poll = pollLines.length >= 2
      ? { question: pollLines[0], answers: pollLines.slice(1, 4) }
      : null;
    if (!poll && pollLines.length >= 2) {
      caption += `\n\n📊 ${pollLines[0]}: ${pollLines.slice(1, 4).join(' · ')}`;
    }
    let imageUrl = String(p.imageUrl || '').trim();
    if (!imageUrl) {
      try {
        const ai = readAiConfig(db.settings);
        const img = await generateAiImage({
          prompt: `Vertical VK story 9:16, clean SMM layout, topic: ${caption.slice(0, 120)}`,
          ratio: '9:16',
        }, ai);
        imageUrl = saveGeneratedImage(img);
      } catch {
        /* wall fallback inside vkPublishStory */
      }
    }
    const r = await vkPublishStory(token, {
      ownerId,
      caption,
      link: p.link,
      imageUrl: imageUrl || undefined,
      poll,
    });
    if (r.ok && r.storyId) {
      metrics.unshift({
        storyId: r.storyId,
        ownerId,
        caption: caption.slice(0, 100),
        views: 0,
        clicks: 0,
        via: r.via,
        at: new Date().toISOString(),
      });
    }
    const viewsSum = metrics.reduce((a, m) => a + (m.views || 0), 0);
    const nextStoryIdx = r.ok ? storyIdx + 1 : storyIdx;
    const nextAccountIdx = r.ok ? accountIdx + 1 : accountIdx;
    return {
      ok: r.ok,
      done: !recurring && queueLeft <= 0,
      message: r.ok
        ? `${r.message || 'Сторис опубликован'} · просмотров ${viewsSum}${recurring ? ' · следующий по расписанию' : ''}${queueLeft ? ` · в очереди ${queueLeft}` : ''}`
        : r.message,
      meta: r.ok
        ? {
          storyDay: gate.dayKey,
          imageUrl: imageUrl || undefined,
          via: r.via,
          storyMetrics: metrics.slice(0, 30),
          storyIdx: nextStoryIdx,
          storyAccountIdx: nextAccountIdx,
          storyQueueLeft: queueLeft,
        }
        : (metrics.length ? { storyMetrics: metrics, storyIdx, storyAccountIdx: accountIdx } : undefined),
    };
  }

  return { ok: false, message: `Нет исполнителя для ${slug}` };
}
