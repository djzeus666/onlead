/** VK Stories: upload photo → stories.save, wall fallback when API unavailable. */
import { vkCall, isMock } from './call.mjs';
import { vkPublishWall } from './adapter.mjs';

/** Parse poll question + answers from textarea (one per line). */
export function parseStoryPoll(raw) {
  const lines = String(raw || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  return {
    question: lines[0].slice(0, 140),
    answers: lines.slice(1, 4).map((a) => a.slice(0, 60)),
  };
}

async function vkCreateStoryPoll(accessToken, ownerId, poll) {
  if (isMock(accessToken)) return { id: 9001, owner_id: Number(ownerId) };
  const answers = poll.answers.map((a, i) => ({ text: a, id: i + 1 }));
  return vkCall('polls.create', {
    question: poll.question,
    add_answers: JSON.stringify(answers),
    owner_id: Number(ownerId),
    is_anonymous: 0,
  }, accessToken);
}

function pollClickableSticker(ownerId, pollId) {
  return JSON.stringify({
    original_width: 1080,
    original_height: 1920,
    clickable_stickers: [{
      type: 'poll',
      poll: { poll_id: Number(pollId), poll_owner_id: Number(ownerId) },
      clickable_area: [
        { x: 80, y: 1200 }, { x: 1000, y: 1200 },
        { x: 1000, y: 1650 }, { x: 80, y: 1650 },
      ],
    }],
  });
}

function multipartPhoto(buffer, filename = 'story.jpg') {
  const boundary = `onlead${Date.now().toString(36)}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`,
    'utf8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return {
    body: Buffer.concat([head, buffer, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function loadImageBuffer(imageUrl, imageBuffer, fetchFn) {
  if (imageBuffer) return imageBuffer;
  if (!imageUrl) return null;
  const res = await fetchFn(String(imageUrl));
  if (!res.ok) throw new Error(`Не удалось загрузить картинку (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadStoryPhoto(accessToken, uploadUrl, buffer, fetchFn) {
  const { body, contentType } = multipartPhoto(buffer);
  const res = await fetchFn(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('VK не принял файл сторис');
  }
}

async function fallbackWall(accessToken, ownerId, caption, link, reason) {
  const text = `[stories] ${caption || 'Сторис'}${link ? ` ${link}` : ''}`.trim();
  const r = await vkPublishWall(accessToken, { ownerId, text });
  return {
    ok: r.ok,
    via: 'wall',
    message: r.ok
      ? `Сторис через стену (API stories: ${reason || 'недоступен'})`
      : r.message,
    externalPostId: r.externalPostId,
  };
}

/**
 * @param {object} opts
 * @param {number} opts.ownerId — user id or negative group id
 * @param {string} [opts.caption]
 * @param {string} [opts.link]
 * @param {string} [opts.imageUrl]
 * @param {Buffer} [opts.imageBuffer]
 */
export async function vkPublishStory(accessToken, opts = {}) {
  const {
    ownerId,
    caption = '',
    link = '',
    imageUrl,
    imageBuffer,
    poll,
    fetchFn = globalThis.fetch.bind(globalThis),
  } = opts;

  if (isMock(accessToken)) {
    return { ok: true, via: 'stories', storyId: `mock_story_${Date.now()}`, message: 'Сторис опубликован (mock)' };
  }

  let buffer;
  try {
    buffer = await loadImageBuffer(imageUrl, imageBuffer, fetchFn);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fallbackWall(accessToken, ownerId, caption, link, msg);
  }
  if (!buffer?.length) {
    return fallbackWall(accessToken, ownerId, caption, link, 'нет изображения');
  }

  const groupId = Number(ownerId) < 0 ? Math.abs(Number(ownerId)) : undefined;
  const uploadParams = { add_to_news: 1 };
  if (groupId) uploadParams.group_id = groupId;

  let uploadServer;
  try {
    uploadServer = await vkCall('stories.getPhotoUploadServer', uploadParams, accessToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fallbackWall(accessToken, ownerId, caption, link, msg);
  }

  const uploadUrl = uploadServer?.upload_url;
  if (!uploadUrl) {
    return fallbackWall(accessToken, ownerId, caption, link, 'нет upload_url');
  }

  let uploadJson;
  try {
    uploadJson = await uploadStoryPhoto(accessToken, uploadUrl, buffer, fetchFn);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fallbackWall(accessToken, ownerId, caption, link, msg);
  }

  if (uploadJson?.error) {
    return fallbackWall(accessToken, ownerId, caption, link, uploadJson.error);
  }

  const saveParams = {
    upload_results: typeof uploadJson === 'string' ? uploadJson : JSON.stringify(uploadJson),
  };
  const cleanLink = String(link || '').trim();
  if (cleanLink) {
    saveParams.link_url = cleanLink;
    saveParams.link_text = 'Подробнее';
  }
  const storyPoll = poll || parseStoryPoll(caption);
  if (storyPoll?.answers?.length) {
    try {
      const created = await vkCreateStoryPoll(accessToken, ownerId, storyPoll);
      if (created?.id) {
        saveParams.clickable_stickers = pollClickableSticker(ownerId, created.id);
      }
    } catch {
      /* caption fallback only */
    }
  }

  try {
    const saved = await vkCall('stories.save', saveParams, accessToken);
    const item = saved?.items?.[0] || saved?.[0];
    return {
      ok: true,
      via: 'stories',
      storyId: item?.id || saved?.count,
      message: 'Сторис опубликован',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fallbackWall(accessToken, ownerId, caption, link, msg);
  }
}

/** Views / poll answers for published stories (best-effort). */
export async function vkStoryStats(accessToken, ownerId, storyId) {
  if (isMock(accessToken)) return { views: 24, clicks: 3 };
  try {
    const res = await vkCall('stories.getStats', {
      owner_id: Number(ownerId),
      story_id: Number(storyId),
    }, accessToken);
    return {
      views: Number(res?.views?.count || res?.views || 0),
      clicks: Number(res?.answers?.count || res?.answers || 0),
    };
  } catch {
    return { views: 0, clicks: 0 };
  }
}
