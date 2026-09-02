/** AI crosspost — adapt source text for VK (and generic short). */
import { generateAiChat } from './ai.mjs';
import { createPost } from './posts.mjs';

const PLATFORM_HINTS = {
  vk: 'VK: живой тон, 2–4 абзаца, можно эмодзи умеренно, без хештег-спама.',
  telegram: 'Telegram: короткие абзацы, можно markdown (**жирный**), 1–2 эмодзи.',
  short: 'Короткая версия для Stories/статуса: до 400 символов.',
};

export async function adaptCrosspostText(text, platforms, aiConfig) {
  const src = String(text || '').trim();
  if (!src) throw new Error('Вставьте исходный текст');
  const plats = (platforms?.length ? platforms : ['vk']).filter((p) => PLATFORM_HINTS[p]);
  if (!plats.length) throw new Error('Выберите площадки');

  if (!aiConfig?.apiKey) {
    return Object.fromEntries(plats.map((p) => [p, src.slice(0, p === 'short' ? 400 : 16384)]));
  }

  const versions = {};
  for (const p of plats) {
    try {
      const { text: out } = await generateAiChat([
        { role: 'system', content: `Ты SMM-редактор. ${PLATFORM_HINTS[p]} Не добавляй пояснений — только текст поста.` },
        { role: 'user', content: `Адаптируй этот пост:\n\n${src.slice(0, 8000)}` },
      ], aiConfig, { maxTokens: p === 'short' ? 200 : 450 });
      versions[p] = out.slice(0, p === 'short' ? 400 : 16384);
    } catch {
      versions[p] = src.slice(0, p === 'short' ? 400 : 16384);
    }
  }
  return versions;
}

export function createCrosspostDrafts(store, userId, versions, { accountId, ownerId, ownerLabel } = {}) {
  const created = [];
  for (const [platform, text] of Object.entries(versions || {})) {
    if (!String(text || '').trim()) continue;
    const post = createPost(store, userId, {
      title: `Кросспост · ${platform.toUpperCase()}`,
      text: String(text).trim(),
      accountId: platform === 'vk' ? String(accountId || '') : '',
      ownerId: platform === 'vk' ? ownerId : null,
      ownerLabel: platform === 'vk' ? String(ownerLabel || '') : '',
      status: 'draft',
      niche: `crosspost-${platform}`,
    });
    created.push({ platform, postId: post.id });
  }
  return created;
}
