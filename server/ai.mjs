/** OpenAI-compatible chat + image generation for OnLead tools. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decryptToken, encryptToken, maskToken } from './crypto.mjs';
import { AI_PROVIDERS, matchProvider } from './ai-providers.mjs';
import {
  buildImagePromptRequest, buildLeadOpenerPrompt, buildLeadReplyPrompt, buildLeadScorePrompt, buildNeuroCommentPrompt,
  imageFallbackPrompt, parseLeadScore, wantsVisibleText,
} from './ai-prompts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEN_DIR = join(ROOT, 'data', 'generated');

function encKey() {
  return String(process.env.TOKEN_ENCRYPTION_KEY || '').trim();
}

export function publicAiSettings(ai = {}) {
  const imageModel = looksLikeImageModel(ai.imageModel) ? ai.imageModel : '';
  return {
    providerId: ai.providerId || '',
    baseUrl: ai.baseUrl || '',
    model: ai.model || '',
    imageModel,
    keyMask: ai.apiKeyEnc ? (ai.keyMask || '••••') : '',
    configured: Boolean(ai.apiKeyEnc) || ai.providerId === 'pollinations',
  };
}

export function looksLikeImageModel(model) {
  const m = String(model || '').trim();
  if (!m || /@/.test(m)) return false;
  if (/image|flux|dall-e|imagen|cogview|sdxl|diffusion|gpt-image|schnell|pollinations/i.test(m)) return true;
  return false;
}

export function readAiConfig(settings) {
  const ai = settings?.ai || {};
  let apiKey = '';
  if (ai.apiKeyEnc) {
    try { apiKey = decryptToken(ai.apiKeyEnc, encKey()); }
    catch { apiKey = ''; }
  }
  const provider = matchProvider(ai.baseUrl, ai.providerId);
  const storedImage = looksLikeImageModel(ai.imageModel) ? ai.imageModel : '';
  const presetImage = provider?.imageNeedsCredits ? '' : provider?.imageModels?.[0] || '';
  return {
    providerId: ai.providerId || provider?.id || '',
    baseUrl: String(ai.baseUrl || provider?.baseUrl || '').replace(/\/+$/, ''),
    apiKey,
    model: ai.model || provider?.models?.[0] || '',
    imageModel: storedImage || presetImage,
    provider,
  };
}

export function applyAiSettings(current, body) {
  const next = { ...(current || {}) };
  if (body.providerId != null) next.providerId = String(body.providerId || '').trim();
  if (body.baseUrl != null) next.baseUrl = String(body.baseUrl || '').trim().replace(/\/+$/, '');
  if (body.model != null) next.model = String(body.model || '').trim();
  if (body.imageModel != null) {
    const image = String(body.imageModel || '').trim();
    next.imageModel = looksLikeImageModel(image) ? image : '';
  }
  if (!looksLikeImageModel(next.imageModel)) next.imageModel = '';
  const rawKey = String(body.apiKey || '').trim();
  if (rawKey) {
    next.apiKeyEnc = encryptToken(rawKey, encKey());
    next.keyMask = maskToken(rawKey);
  }
  if (body.clearKey) {
    next.apiKeyEnc = '';
    next.keyMask = '';
  }
  const preset = matchProvider(next.baseUrl, next.providerId);
  if (preset && !next.baseUrl && preset.baseUrl) next.baseUrl = preset.baseUrl.replace(/\/+$/, '');
  if (preset && !next.model && preset.models[0]) next.model = preset.models[0];
  // Providers whose image endpoint is credits-only must not be auto-filled:
  // an unusable model just costs a failed round-trip before the free fallback.
  if (preset && !next.imageModel && !preset.imageNeedsCredits && preset.imageModels?.[0]) {
    next.imageModel = preset.imageModels[0];
  }
  return next;
}

async function expandImagePrompt(raw, ratio, config) {
  const fallback = imageFallbackPrompt(raw, ratio);
  if (!config?.apiKey || !config.baseUrl || !config.model) return fallback;
  const { system, user } = buildImagePromptRequest({ raw, ratio });
  try {
    const json = await openaiJson(`${config.baseUrl}/chat/completions`, config.apiKey, withoutReasoning({
      model: config.model,
      temperature: 0.3,
      max_tokens: 320,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }, config), extraHeaders(config), aiTimeoutMs('expand'));
    const text = String(json.choices?.[0]?.message?.content || '').replace(/^["']|["']$/g, '').trim();
    if (text.length > 20 && text.length < 900 && !looksLikeChainOfThought(text)) return text;
  } catch (err) {
    console.error('[image-ai] prompt expand', err.message);
  }
  return fallback;
}

export function sizeFromRatio(ratio) {
  const s = String(ratio || '');
  if (s.includes('9:16')) return { w: 768, h: 1344, openai: '1024x1792' };
  if (s.includes('16:9')) return { w: 1344, h: 768, openai: '1792x1024' };
  if (s.includes('4:5')) return { w: 1024, h: 1280, openai: '1024x1024' };
  return { w: 1024, h: 1024, openai: '1024x1024' };
}

/** Maps provider error bodies to cabinet wording; also drives model failover. */
export function humanizeAiError(raw) {
  const text = String(raw || '').slice(0, 800);
  if (/aborted due to timeout|The operation was aborted|AbortError/i.test(text)) {
    return 'Провайдер не ответил вовремя. Бесплатные модели стоят в очереди — попробуйте ещё раз или выберите модель побыстрее.';
  }
  if (/is unavailable for free|use this slug instead/i.test(text)) {
    return 'Модель недоступна на бесплатном тарифе. Выберите другую в админке → ИИ-модели.';
  }
  if (/incorrect api key|invalid.?api.?key|unauthorized|401/i.test(text)) {
    return 'Неверный API-ключ. Проверьте ключ в админке → ИИ-модели.';
  }
  if (/insufficient credits/i.test(text)) {
    return 'На ключе провайдера нет кредитов для этой модели. Выберите бесплатную модель или пополните счёт у провайдера.';
  }
  if (/model_unavailable|model.?not.?found|does not exist|unknown model|no endpoint found|not a valid model/i.test(text)) {
    return 'Модель недоступна у провайдера. Выберите другую в каталоге (для картинок нужна image-модель).';
  }
  if (/rate.?limit|429|quota|insufficient/i.test(text)) {
    return 'Лимит бесплатного тарифа исчерпан. Подождите или смените провайдера.';
  }
  const m = text.match(/"message"\s*:\s*"([^"]+)"/);
  if (m?.[1]) return `Ошибка ИИ: ${m[1]}`;
  return `Ошибка ИИ: ${text.slice(0, 280)}`;
}

/** Free-tier models queue: nemotron:free answers in ~45s. Keep budgets generous. */
export function aiTimeoutMs(kind = 'chat') {
  const env = Number(process.env.AI_TIMEOUT_MS);
  const base = Number.isFinite(env) && env > 0 ? env : 60000;
  if (kind === 'expand') return Math.min(base, 20000);
  return base;
}

async function openaiJson(url, apiKey, body, extraHeaders = {}, timeoutMs = aiTimeoutMs()) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(humanizeAiError(`${res.status} ${text}`));
  try { return JSON.parse(text); }
  catch { throw new Error(humanizeAiError(text)); }
}

export async function testAiChat(config) {
  if (config.providerId === 'pollinations') {
    return { ok: true, model: 'pollinations/flux', reply: 'Картинки без текстового чата. Нажмите «Проверить картинку».' };
  }
  if (!config.apiKey) throw new Error('Сначала сохраните API-ключ провайдера.');
  if (!config.baseUrl || !config.model) throw new Error('Укажите Base URL и текстовую модель.');
  const started = Date.now();
  // Goes through the same fallback chain as the cabinet, so the check reflects
  // what clients actually get rather than the state of one throttled model.
  const out = await generateAiChat(
    [{ role: 'user', content: 'Reply with one word: pong' }],
    config,
    { maxTokens: 64, temperature: 0 },
  );
  return {
    ok: true,
    model: out.model,
    fallback: out.model !== config.model ? config.model : '',
    baseUrl: config.baseUrl,
    reply: out.text,
    usageTokens: out.usageTokens,
    latencyMs: Date.now() - started,
  };
}

/** Errors worth retrying on a sibling model rather than showing to the user. */
export function isModelExhausted(message) {
  return /Лимит бесплатного тарифа|Модель недоступна|нет кредитов|пустым текстом|рассуждения|пустой ответ/i.test(String(message || ''));
}

/**
 * Free tiers throttle per model, so one exhausted model must not take the whole
 * cabinet down. Falls back through the provider preset before giving up.
 */
export function chatModelChain(config) {
  const preset = matchProvider(config.baseUrl, config.providerId);
  const chain = [config.model, ...(preset?.models || [])];
  return [...new Set(chain.filter(Boolean))].slice(0, 3);
}

/** OpenAI-compatible chat completion. Returns trimmed text. */
export async function generateAiChat(messages, config, opts = {}) {
  if (config.providerId === 'pollinations') {
    throw new Error('Выбранный провайдер только для картинок. Укажите текстовую модель в админке.');
  }
  if (!config.apiKey) throw new Error('В админке не задан API-ключ ИИ.');
  if (!config.baseUrl || !config.model) throw new Error('В админке не заданы Base URL или текстовая модель ИИ.');
  const chain = chatModelChain(config);
  let lastErr = null;
  for (const model of chain) {
    try {
      const json = await openaiJson(`${config.baseUrl}/chat/completions`, config.apiKey, withoutReasoning({
        model,
        messages,
        max_tokens: Math.min(Math.max(Number(opts.maxTokens) || 220, 32), 600),
        temperature: opts.temperature == null ? 0.85 : Number(opts.temperature),
      }, config), extraHeaders(config));
      const choice = json.choices?.[0] || {};
      const reply = String(choice.message?.content || '').trim();
      if (!reply) throw new Error('ИИ вернул пустой ответ');
      if (model !== config.model) console.warn(`[ai] ${config.model} недоступна, ответила ${model}`);
      return {
        text: reply,
        model,
        finishReason: String(choice.finish_reason || ''),
        usageTokens: json.usage?.total_tokens || 0,
      };
    } catch (err) {
      lastErr = err;
      if (!isModelExhausted(err.message)) throw err;
    }
  }
  throw lastErr || new Error('ИИ вернул пустой ответ');
}

function cleanOneLiner(text, limit) {
  return String(text || '')
    .replace(/^["«]+|["»]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function assertNotThinking(text, what) {
  if (!looksLikeChainOfThought(text)) return;
  throw new Error(`Модель вернула свои рассуждения вместо ${what}. Выберите модель без reasoning в админке → ИИ-модели.`);
}

/** Short VK wall comment from post text + niche topics + tone. */
export async function generateNeuroCommentText({ postText, topics, tone }, config) {
  const { system, user } = buildNeuroCommentPrompt({ postText, topics, tone });
  const { text } = await generateAiChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    config,
    { maxTokens: 320, temperature: 0.9 },
  );
  assertNotThinking(text, 'комментария');
  return cleanOneLiner(text, 400);
}

/** First DM of the AI Лид-менеджер: personalised, no pitch, ends on a question. */
export async function generateLeadOpener({ person, offer, style, sourceHint }, config) {
  const { system, user } = buildLeadOpenerPrompt({ person, offer, style, sourceHint });
  const { text } = await generateAiChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    config,
    { maxTokens: 320, temperature: 0.85 },
  );
  assertNotThinking(text, 'сообщения');
  return cleanOneLiner(text, 300);
}

/** Follow-up after the lead replied — uses the thread, not a fresh opener. */
export async function generateLeadReply({ person, offer, style, history }, config) {
  const { system, user } = buildLeadReplyPrompt({ person, offer, style, history });
  const { text } = await generateAiChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    config,
    { maxTokens: 420, temperature: 0.82 },
  );
  assertNotThinking(text, 'ответа в диалоге');
  return cleanOneLiner(text, 400);
}

/** Lead scoring 1-10 for the CRM threshold of the AI Лид-менеджер. */
export async function scoreLead({ person, offer, sourceHint, reply }, config) {
  const { system, user } = buildLeadScorePrompt({ person, offer, sourceHint, reply });
  const { text } = await generateAiChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    config,
    { maxTokens: 200, temperature: 0 },
  );
  const parsed = parseLeadScore(text);
  if (!parsed) throw new Error('ИИ вернул скоринг не в формате JSON');
  return parsed;
}

function extraHeaders(config) {
  if (/openrouter\.ai/i.test(config.baseUrl)) {
    return { 'HTTP-Referer': 'https://onlead.m360-ural.online', 'X-Title': 'OnLead' };
  }
  return {};
}

function isOpenRouter(config) {
  return config?.providerId === 'openrouter' || /openrouter\.ai/i.test(config?.baseUrl || '');
}

/**
 * Reasoning models (nemotron, deepseek-r1, glm thinking) otherwise spend the
 * whole token budget thinking and return either an empty answer or the chain
 * of thought itself — which would end up published as a VK comment.
 */
function withoutReasoning(body, config) {
  if (!isOpenRouter(config)) return body;
  return { ...body, reasoning: { exclude: true } };
}

/** `\b` is ASCII-only, so the Russian markers use a letter lookahead instead. */
const COT_MARKERS = [
  /^(okay|ok|alright|hmm|let me|first,|so,|the user)\b/i,
  /^(хорошо|итак|пользователь|давайте подумаем|нужно написать)(?![\p{L}])/iu,
  /\bthe user (wants|asked|just said|is asking)\b/i,
  /\b(thinking process|chain of thought|let'?s break (this|it) down|step by step)\b/i,
  /(?<![\p{L}])(я должен|мне нужно) (написать|составить|ответить)(?![\p{L}])/iu,
  /^\s*(\*\*)?(analy[sz]e|analysis|plan|draft|requirements)\b/i,
];

/** True when the model leaked its internal monologue instead of the answer. */
export function looksLikeChainOfThought(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  return COT_MARKERS.some((re) => re.test(t));
}

async function fetchImageBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`Не удалось скачать картинку: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') || 'image/png';
  return { buf, mime };
}

async function generatePollinations(prompt, size, opts = {}) {
  const models = opts.preferText
    ? ['gptimage', 'flux', 'turbo']
    : ['flux', 'gptimage', 'turbo'];
  let lastErr = new Error('pollinations');
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      const qs = new URLSearchParams({
        width: String(size.w),
        height: String(size.h),
        nologo: 'true',
        enhance: 'false',
        model,
        seed: String((Date.now() + attempt * 17) % 100000),
      });
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${qs}`;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'OnLead/1.0', Accept: 'image/*' },
          signal: AbortSignal.timeout(50000),
          redirect: 'follow',
        });
        if (res.status === 429 || res.status === 503) {
          lastErr = new Error(`pollinations ${res.status}`);
          continue;
        }
        if (!res.ok) {
          lastErr = new Error(`pollinations ${res.status}`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 800) {
          lastErr = new Error('pollinations empty');
          continue;
        }
        return { buf, mime: res.headers.get('content-type') || 'image/png' };
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }
  }
  throw lastErr;
}

/**
 * Free provider accounts often expose no image endpoint at all. Remember that
 * per model so every generation does not pay for the same 404 before falling
 * back to Pollinations.
 */
const deadImageModels = new Set();

function imageModelKey(config, model) {
  return `${config.baseUrl}|${model}`;
}

export function forgetDeadImageModels() {
  deadImageModels.clear();
}

async function generateOpenAiImage(config, prompt, size) {
  const model = config.imageModel || 'dall-e-3';
  if (!looksLikeImageModel(model)) throw new Error('not an image model');
  if (deadImageModels.has(imageModelKey(config, model))) {
    throw new Error(`Модель ${model} недоступна на этом ключе (проверено ранее).`);
  }
  const payload = { model, prompt, n: 1, size: size.openai };
  let json;
  try {
    json = await openaiJson(`${config.baseUrl}/images/generations`, config.apiKey, {
      ...payload,
      response_format: 'b64_json',
    }, extraHeaders(config));
  } catch {
    json = await openaiJson(`${config.baseUrl}/images/generations`, config.apiKey, payload, extraHeaders(config));
  }
  const item = json.data?.[0];
  if (item?.b64_json) {
    return { buf: Buffer.from(item.b64_json, 'base64'), mime: 'image/png' };
  }
  if (item?.url) return fetchImageBuffer(item.url);
  throw new Error('Провайдер не вернул картинку. Укажите image-модель (Gemini / OpenAI / Pollinations).');
}

export async function generateAiImage(req, config) {
  const raw = String(req.prompt || '').trim();
  if (raw.length < 4) throw new Error('Напишите, какую картинку сделать');
  const prompt = await expandImagePrompt(raw, req.ratio, config);
  const size = sizeFromRatio(req.ratio);
  const attempts = [];
  if (config.apiKey && looksLikeImageModel(config.imageModel) && config.providerId !== 'pollinations') {
    attempts.push({ ...config, imageModel: config.imageModel });
  } else if (config.apiKey && config.providerId === 'gemini') {
    attempts.push({ ...config, imageModel: config.imageModel || 'gemini-2.5-flash-image' });
  }
  for (const attempt of attempts) {
    try {
      return await generateOpenAiImage(attempt, prompt, size);
    } catch (err) {
      const msg = String(err.message || '');
      if (/недоступна|не найдена|no endpoint|no model found|insufficient credits|404|402/i.test(msg)) {
        deadImageModels.add(imageModelKey(attempt, attempt.imageModel || 'dall-e-3'));
      }
      console.error('[image-ai] provider', attempt.imageModel, msg);
    }
  }
  try {
    return await generatePollinations(prompt, size, { preferText: wantsVisibleText(raw) });
  } catch (err) {
    console.error('[image-ai] fallback', err.message);
    throw new Error('Не получилось создать картинку. Попробуйте другое описание.');
  }
}

export function saveGeneratedImage(image) {
  mkdirSync(GEN_DIR, { recursive: true });
  const ext = /jpeg|jpg/i.test(image.mime) ? 'jpg' : /webp/i.test(image.mime) ? 'webp' : 'png';
  const name = `img-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;
  writeFileSync(join(GEN_DIR, name), image.buf);
  return `/api/media/${name}`;
}

export function generatedPath(name) {
  if (!/^img-\d+-[a-f0-9]+\.(png|jpg|jpeg|webp)$/i.test(String(name || ''))) return null;
  return join(GEN_DIR, name);
}

export { AI_PROVIDERS };
