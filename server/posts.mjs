/** Content posts — draft / schedule / publish (online-lead.ru parity). */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { vkPublishWall, vkUploadWallPhotos } from './vk/adapter.mjs';
import { vkPublishStory } from './vk/stories.mjs';
import { mediaPath } from './media.mjs';
import { generatedPath } from './ai.mjs';

export const POST_STATUSES = ['draft', 'pending_approval', 'scheduled', 'published', 'failed', 'trash'];

export const CONTENT_NICHES = [
  { id: 'beauty', label: 'Красота и уход', tone: 'Рассказывайте о процедурах, до/после, акциях.' },
  { id: 'fitness', label: 'Фитнес и здоровье', tone: 'Мотивация, упражнения, питание, результаты клиентов.' },
  { id: 'education', label: 'Обучение и курсы', tone: 'Польза, кейсы учеников, анонсы потоков.' },
  { id: 'services', label: 'Услуги B2C', tone: 'Боли клиента, FAQ, отзывы, призыв записаться.' },
  { id: 'shop', label: 'Интернет-магазин', tone: 'Товар дня, подборки, доставка, акции.' },
  { id: 'realestate', label: 'Недвижимость', tone: 'Объекты, районы, ипотека, советы покупателям.' },
];

const STUDIO_TEMPLATES = {
  beauty: [
    '3 ошибки в домашнем уходе, которые портят кожу',
    'Что происходит на первой процедуре — по шагам',
    'До/после: реальный кейс без фильтров',
    'Акция недели: условия и кому подходит',
    'Ответы на частые вопросы в Direct',
    'Почему записываются заранее — коротко и по делу',
    'Мини-гайд: как подготовиться к визиту',
  ],
  fitness: [
    'Миф о похудении, в который все верят',
    'Разминка на 5 минут без инвентаря',
    'Что есть до и после тренировки',
    'История клиента: с чего начал и что изменилось',
    '3 причины, почему нет прогресса',
    'Расписание групповых на неделю',
    'Приглашение на пробную тренировку',
  ],
  education: [
    'Кому подойдёт наш курс — честный чеклист',
    'Разбор типичной ошибки учеников',
    'Кейс: результат за 30 дней',
    'Программа модуля — что внутри',
    'Ответ на возражение «нет времени»',
    'Бесплатный материал / чеклист в комментариях',
    'Старт потока: даты и формат',
  ],
  services: [
    'С чего начать, если вы впервые обращаетесь',
    'Сколько стоит и из чего складывается цена',
    'Отзыв клиента — коротко и по факту',
    '3 ситуации, когда услуга реально нужна',
    'Как мы работаем: этапы от заявки до результата',
    'FAQ: сроки, гарантии, оплата',
    'Призыв: оставьте заявку — перезвоним сегодня',
  ],
  shop: [
    'Товар недели: кому подойдёт и почему',
    'Подборка «хиты месяца»',
    'Как выбрать размер / модель — мини-гид',
    'Доставка и оплата — без сюрпризов',
    'Распаковка / обзор новинки',
    'Отзыв покупателя',
    'Промокод на первый заказ — условия',
  ],
  realestate: [
    'Объект недели: планировка и плюсы',
    '5 вопросов перед покупкой квартиры',
    'Район глазами жителя',
    'Ипотека: что изменилось и на что смотреть',
    'Ошибка при просмотре — не повторяйте',
    'Сравнение двух типовых планировок',
    'Запись на просмотр — как связаться',
  ],
};

function postId() {
  return `post-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

function logId() {
  return `plog-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

export function normalizePostStatus(status) {
  const s = String(status || 'draft');
  return POST_STATUSES.includes(s) ? s : 'draft';
}

export function normalizePost(post) {
  if (!post) return post;
  return {
    ...post,
    status: normalizePostStatus(post.status),
    text: String(post.text || ''),
    title: String(post.title || ''),
    mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
    vkAttachments: Array.isArray(post.vkAttachments) ? post.vkAttachments : [],
    channel: post.channel || 'vk',
    publishKind: post.publishKind === 'story' ? 'story' : 'wall',
    template: Boolean(post.template),
    applyWatermark: Boolean(post.applyWatermark),
    watermarkId: post.watermarkId || '',
    workflowStageName: post.workflowStageName || '',
    rejectionReason: post.rejectionReason || '',
  };
}

export function resolveMediaFile(urlOrName) {
  const raw = String(urlOrName || '');
  const name = raw.replace(/^.*\/api\/media\//, '').split('?')[0];
  return mediaPath(name) || generatedPath(name);
}

export function publicPost(post) {
  const p = normalizePost(post);
  return {
    id: p.id,
    status: p.status,
    title: p.title,
    text: p.text,
    accountId: p.accountId || '',
    ownerId: p.ownerId || null,
    ownerLabel: p.ownerLabel || '',
    channel: p.channel,
    publishKind: p.publishKind === 'story' ? 'story' : 'wall',
    mediaUrls: p.mediaUrls,
    scheduledAt: p.scheduledAt || null,
    publishedAt: p.publishedAt || null,
    externalPostId: p.externalPostId || '',
    permalink: p.permalink || '',
    error: p.error || '',
    template: p.template,
    niche: p.niche || '',
    mediaUrls: p.mediaUrls,
    vkAttachments: p.vkAttachments,
    applyWatermark: p.applyWatermark,
    watermarkId: p.watermarkId || '',
    workflowStageName: p.workflowStageName || '',
    rejectionReason: p.rejectionReason || '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function listPosts(store, userId, opts = {}) {
  const status = opts.status ? normalizePostStatus(opts.status) : null;
  const trash = opts.trash === true;
  const templates = opts.templates === true;
  let rows = (store.contentPosts || []).filter((p) => p.userId === userId);
  if (trash) rows = rows.filter((p) => p.status === 'trash');
  else rows = rows.filter((p) => p.status !== 'trash');
  if (templates) rows = rows.filter((p) => p.template);
  else if (opts.templates === false) rows = rows.filter((p) => !p.template);
  if (status) rows = rows.filter((p) => normalizePostStatus(p.status) === status);
  return rows
    .map(normalizePost)
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

export function getPost(store, userId, id) {
  const row = (store.contentPosts || []).find((p) => p.id === id && p.userId === userId);
  return row ? normalizePost(row) : null;
}

function getPostMutable(store, userId, id) {
  return (store.contentPosts || []).find((p) => p.id === id && p.userId === userId) || null;
}

export function createPost(store, userId, body = {}) {
  const now = Date.now();
  const post = normalizePost({
    id: postId(),
    userId,
    status: normalizePostStatus(body.status || 'draft'),
    title: String(body.title || '').slice(0, 200),
    text: String(body.text || '').slice(0, 16384),
    accountId: String(body.accountId || ''),
    ownerId: body.ownerId != null && body.ownerId !== '' ? Number(body.ownerId) : null,
    ownerLabel: String(body.ownerLabel || '').slice(0, 120),
    channel: 'vk',
    publishKind: body.publishKind === 'story' ? 'story' : 'wall',
    mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls.slice(0, 10) : [],
    vkAttachments: Array.isArray(body.vkAttachments) ? body.vkAttachments.slice(0, 10) : [],
    scheduledAt: body.scheduledAt ? Number(body.scheduledAt) : null,
    template: Boolean(body.template),
    niche: String(body.niche || '').slice(0, 40),
    applyWatermark: Boolean(body.applyWatermark),
    watermarkId: String(body.watermarkId || '').slice(0, 40),
    workflowStageName: String(body.workflowStageName || '').slice(0, 80),
    rejectionReason: String(body.rejectionReason || '').slice(0, 500),
    createdAt: now,
    updatedAt: now,
  });
  store.contentPosts = store.contentPosts || [];
  store.contentPosts.unshift(post);
  return post;
}

export function updatePost(store, userId, id, patch = {}) {
  const post = getPostMutable(store, userId, id);
  if (!post) return null;
  if (patch.status != null) post.status = normalizePostStatus(patch.status);
  if (patch.title != null) post.title = String(patch.title).slice(0, 200);
  if (patch.text != null) post.text = String(patch.text).slice(0, 16384);
  if (patch.accountId != null) post.accountId = String(patch.accountId);
  if (patch.ownerId !== undefined) {
    post.ownerId = patch.ownerId != null && patch.ownerId !== '' ? Number(patch.ownerId) : null;
  }
  if (patch.ownerLabel != null) post.ownerLabel = String(patch.ownerLabel).slice(0, 120);
  if (patch.publishKind != null) post.publishKind = patch.publishKind === 'story' ? 'story' : 'wall';
  if (patch.mediaUrls != null) post.mediaUrls = Array.isArray(patch.mediaUrls) ? patch.mediaUrls.slice(0, 10) : [];
  if (patch.vkAttachments != null) post.vkAttachments = Array.isArray(patch.vkAttachments) ? patch.vkAttachments.slice(0, 10) : [];
  if (patch.scheduledAt !== undefined) post.scheduledAt = patch.scheduledAt ? Number(patch.scheduledAt) : null;
  if (patch.template != null) post.template = Boolean(patch.template);
  if (patch.niche != null) post.niche = String(patch.niche).slice(0, 40);
  if (patch.applyWatermark != null) post.applyWatermark = Boolean(patch.applyWatermark);
  if (patch.watermarkId != null) post.watermarkId = String(patch.watermarkId).slice(0, 40);
  if (patch.workflowStageName != null) post.workflowStageName = String(patch.workflowStageName).slice(0, 80);
  if (patch.rejectionReason != null) post.rejectionReason = String(patch.rejectionReason).slice(0, 500);
  post.updatedAt = Date.now();
  if (post.status === 'scheduled' && post.scheduledAt && post.scheduledAt <= Date.now()) {
    post.status = 'draft';
  }
  return normalizePost(post);
}

export function deletePost(store, userId, id, { hard = false } = {}) {
  const idx = (store.contentPosts || []).findIndex((p) => p.id === id && p.userId === userId);
  if (idx < 0) return false;
  if (hard) {
    store.contentPosts.splice(idx, 1);
    return true;
  }
  store.contentPosts[idx].status = 'trash';
  store.contentPosts[idx].updatedAt = Date.now();
  return true;
}

export function appendPubLog(store, userId, row) {
  store.pubLogs = store.pubLogs || [];
  const entry = {
    id: logId(),
    userId,
    postId: row.postId || '',
    channel: row.channel || 'vk',
    status: row.status === 'error' ? 'error' : 'ok',
    message: String(row.message || '').slice(0, 500),
    externalPostId: row.externalPostId || '',
    permalink: row.permalink || '',
    textPreview: String(row.textPreview || '').slice(0, 160),
    ownerLabel: row.ownerLabel || '',
    createdAt: Date.now(),
  };
  store.pubLogs.unshift(entry);
  if (store.pubLogs.length > 500) store.pubLogs.length = 500;
  return entry;
}

export function listPubLogs(store, userId, limit = 80) {
  return (store.pubLogs || [])
    .filter((l) => l.userId === userId)
    .slice(0, Math.min(Math.max(limit, 1), 200));
}

export function studioPlanDrafts(nicheId, days = 7) {
  const niche = CONTENT_NICHES.find((n) => n.id === nicheId) || CONTENT_NICHES[0];
  const topics = STUDIO_TEMPLATES[niche.id] || STUDIO_TEMPLATES.services;
  const n = Math.min(Math.max(Number(days) || 7, 3), 30);
  const base = Date.now() + 86400000;
  return topics.slice(0, n).map((title, i) => ({
    title,
    text: `${title}.\n\n${niche.tone}\n\n#${niche.label.replace(/\s+/g, '')}`,
    scheduledAt: base + i * 86400000,
    niche: niche.id,
  }));
}

export function resolveOwnerId(account, ownerId) {
  if (ownerId != null && ownerId !== '' && Number.isFinite(Number(ownerId))) return Number(ownerId);
  const ext = Number(account?.externalId);
  return Number.isFinite(ext) && ext ? ext : null;
}

export async function publishPost(store, userId, postId, { account, token, ownerId: rawOwnerId, cabinet } = {}) {
  const post = getPostMutable(store, userId, postId);
  if (!post) return { ok: false, error: 'Пост не найден' };
  if (!account) return { ok: false, error: 'Подключите VK-аккаунт' };
  if (!token) return { ok: false, error: 'Нет токена VK' };
  const ownerId = resolveOwnerId(account, rawOwnerId ?? post.ownerId);
  if (!ownerId) return { ok: false, error: 'Укажите стену для публикации' };
  let text = String(post.text || '').trim();
  if (!text && post.publishKind !== 'story') return { ok: false, error: 'Добавьте текст поста' };

  if (post.applyWatermark && post.watermarkId && cabinet) {
    const wm = (cabinet.watermarks || []).find((w) => w.id === post.watermarkId);
    if (wm?.text) text = `${text}\n\n— ${String(wm.text).trim()}`;
  }

  if (post.publishKind === 'story') {
    const imageUrl = (post.mediaUrls || [])[0] || '';
    if (!imageUrl) return { ok: false, error: 'Для сторис добавьте фото из медиатеки' };
    const r = await vkPublishStory(token, {
      ownerId,
      caption: text,
      imageUrl: String(imageUrl).startsWith('http') ? imageUrl : undefined,
      imageBuffer: (() => {
        const file = resolveMediaFile(imageUrl);
        if (!file) return undefined;
        try {
          return readFileSync(file);
        } catch {
          return undefined;
        }
      })(),
    });
    const preview = text.slice(0, 160) || 'Сторис';
    const ownerLabel = post.ownerLabel || (ownerId < 0 ? `Сообщество ${Math.abs(ownerId)}` : 'Моя страница');
    if (r.ok) {
      post.status = 'published';
      post.publishedAt = Date.now();
      post.scheduledAt = null;
      post.externalPostId = r.storyId || '';
      post.permalink = r.permalink || '';
      post.error = '';
      post.accountId = account.id;
      post.ownerId = ownerId;
      post.updatedAt = Date.now();
      appendPubLog(store, userId, {
        postId: post.id,
        channel: 'vk-story',
        status: 'ok',
        message: r.message || 'Сторис опубликован',
        externalPostId: r.storyId,
        textPreview: preview,
        ownerLabel,
      });
      return { ok: true, post: publicPost(post), result: r };
    }
    post.status = 'failed';
    post.error = r.message || 'Ошибка публикации сторис';
    post.updatedAt = Date.now();
    appendPubLog(store, userId, {
      postId: post.id,
      channel: 'vk-story',
      status: 'error',
      message: post.error,
      textPreview: preview,
      ownerLabel,
    });
    return { ok: false, error: post.error, post: publicPost(post) };
  }

  let attachments = (post.vkAttachments || []).filter(Boolean).slice(0, 10);
  const mediaFiles = (post.mediaUrls || []).map(resolveMediaFile).filter(Boolean);
  if (mediaFiles.length) {
    const uploaded = await vkUploadWallPhotos(token, ownerId, mediaFiles);
    attachments = [...uploaded, ...attachments.filter((a) => String(a).startsWith('photo'))].slice(0, 10);
  }
  const r = await vkPublishWall(token, {
    ownerId,
    text,
    fromGroup: ownerId < 0 ? 1 : 0,
    attachments,
  });

  const preview = text.slice(0, 160);
  const ownerLabel = post.ownerLabel || (ownerId < 0 ? `Сообщество ${Math.abs(ownerId)}` : 'Моя страница');

  if (r.ok) {
    post.status = 'published';
    post.publishedAt = Date.now();
    post.scheduledAt = null;
    post.externalPostId = r.externalPostId || '';
    post.permalink = r.permalink || '';
    post.error = '';
    post.accountId = account.id;
    post.ownerId = ownerId;
    post.updatedAt = Date.now();
    appendPubLog(store, userId, {
      postId: post.id,
      channel: 'vk',
      status: 'ok',
      message: 'Опубликовано',
      externalPostId: r.externalPostId,
      permalink: r.permalink,
      textPreview: preview,
      ownerLabel,
    });
    return { ok: true, post: publicPost(post), result: r };
  }

  post.status = 'failed';
  post.error = r.message || 'Ошибка публикации';
  post.updatedAt = Date.now();
  appendPubLog(store, userId, {
    postId: post.id,
    channel: 'vk',
    status: 'error',
    message: post.error,
    textPreview: preview,
    ownerLabel,
  });
  return { ok: false, error: post.error, post: publicPost(post) };
}

export async function tickScheduledPosts(store, deps) {
  const { tokenOf, loadAccounts } = deps;
  const now = Date.now();
  const due = (store.contentPosts || []).filter(
    (p) => p.status === 'scheduled' && p.scheduledAt && p.scheduledAt <= now,
  );
  for (const raw of due.slice(0, 5)) {
    const post = getPostMutable(store, raw.userId, raw.id);
    if (!post) continue;
    const accounts = loadAccounts ? loadAccounts(post.userId) : [];
    const account = accounts.find((a) => a.id === post.accountId) || accounts[0];
    if (!account) {
      post.status = 'failed';
      post.error = 'Нет VK-аккаунта для публикации';
      post.updatedAt = now;
      appendPubLog(store, post.userId, {
        postId: post.id,
        channel: 'vk',
        status: 'error',
        message: post.error,
        textPreview: post.text.slice(0, 160),
      });
      continue;
    }
    const token = tokenOf(account);
    await publishPost(store, post.userId, post.id, { account, token, ownerId: post.ownerId });
  }
}

export function contentPostCounts(store, userId) {
  const rows = listPosts(store, userId);
  const by = Object.fromEntries(POST_STATUSES.filter((s) => s !== 'trash').map((s) => [s, 0]));
  for (const p of rows) by[p.status] = (by[p.status] || 0) + 1;
  by.trash = (store.contentPosts || []).filter((p) => p.userId === userId && p.status === 'trash').length;
  by.all = rows.length;
  return by;
}
