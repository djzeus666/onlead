import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiTimeoutMs, applyAiSettings, chatModelChain, humanizeAiError, isModelExhausted, looksLikeChainOfThought,
  looksLikeImageModel, publicAiSettings, readAiConfig,
} from './ai.mjs';

test('image models are told apart from chat models', () => {
  assert.equal(looksLikeImageModel('google/gemini-2.5-flash-image-preview'), true);
  assert.equal(looksLikeImageModel('black-forest-labs/flux.1-schnell'), true);
  assert.equal(looksLikeImageModel('dall-e-3'), true);
  assert.equal(looksLikeImageModel('google/gemma-4-26b-a4b-it:free'), false);
  assert.equal(looksLikeImageModel('nvidia/nemotron-3-ultra-550b-a55b:free'), false);
  assert.equal(looksLikeImageModel(''), false);
});

test('free-tier models get a budget longer than their queue', () => {
  const prev = process.env.AI_TIMEOUT_MS;
  delete process.env.AI_TIMEOUT_MS;
  assert.equal(aiTimeoutMs(), 60000);
  assert.equal(aiTimeoutMs('expand'), 20000);
  process.env.AI_TIMEOUT_MS = '90000';
  assert.equal(aiTimeoutMs(), 90000);
  assert.equal(aiTimeoutMs('expand'), 20000);
  process.env.AI_TIMEOUT_MS = 'nonsense';
  assert.equal(aiTimeoutMs(), 60000);
  if (prev == null) delete process.env.AI_TIMEOUT_MS;
  else process.env.AI_TIMEOUT_MS = prev;
});

test('pollinations counts as configured without a key', () => {
  assert.equal(publicAiSettings({ providerId: 'pollinations' }).configured, true);
  assert.equal(publicAiSettings({ providerId: 'openrouter' }).configured, false);
  assert.equal(publicAiSettings({ providerId: 'openrouter', apiKeyEnc: 'x:y:z' }).configured, true);
});

test('a chat model stored as imageModel is not surfaced', () => {
  const out = publicAiSettings({ providerId: 'openrouter', imageModel: 'google/gemma-4-26b-a4b-it:free' });
  assert.equal(out.imageModel, '');
});

test('an exhausted free model falls back to its provider siblings', () => {
  const chain = chatModelChain({ providerId: 'openrouter', model: 'minimax/minimax-m3:free' });
  assert.equal(chain[0], 'minimax/minimax-m3:free');
  assert.equal(chain.length > 1, true);
  assert.equal(new Set(chain).size, chain.length);
  assert.equal(chain.length <= 3, true);
});

test('a hand-typed model still leads its own chain', () => {
  const chain = chatModelChain({ providerId: 'custom', model: 'my/model' });
  assert.deepEqual(chain, ['my/model']);
});

test('provider errors that should trigger failover are recognised', () => {
  const cases = [
    '400 {"error":{"message":"totally/does-not-exist:free is not a valid model ID"}}',
    '404 {"error":{"message":"No endpoint found for model"}}',
    '429 {"error":{"message":"Rate limit exceeded"}}',
    '402 {"error":{"message":"Insufficient credits"}}',
    '404 {"error":{"message":"minimax/minimax-m3:free is unavailable for free"}}',
  ];
  for (const raw of cases) {
    assert.equal(isModelExhausted(humanizeAiError(raw)), true, raw);
  }
  assert.equal(isModelExhausted(humanizeAiError('401 {"error":"Incorrect API key"}')), false);
});

test('only throttling and dead models trigger a retry', () => {
  assert.equal(isModelExhausted('Лимит бесплатного тарифа исчерпан. Подождите.'), true);
  assert.equal(isModelExhausted('Модель недоступна у провайдера.'), true);
  assert.equal(isModelExhausted('ИИ вернул пустой ответ'), true);
  assert.equal(isModelExhausted('Неверный API-ключ. Проверьте ключ в админке.'), false);
  assert.equal(isModelExhausted('The operation was aborted due to timeout'), false);
});

test('credits-only image models are not filled in automatically', () => {
  const openrouter = applyAiSettings({}, { providerId: 'openrouter' });
  assert.equal(openrouter.imageModel, '');
  assert.equal(openrouter.model, 'minimax/minimax-m3:free');
  const openai = applyAiSettings({}, { providerId: 'openai' });
  assert.equal(openai.imageModel, 'gpt-image-1');
});

test('reading the config does not resurrect a credits-only image model', () => {
  const openrouter = readAiConfig({ ai: { providerId: 'openrouter', imageModel: '' } });
  assert.equal(openrouter.imageModel, '');
  const chosen = readAiConfig({ ai: { providerId: 'openrouter', imageModel: 'black-forest-labs/flux.1-schnell' } });
  assert.equal(chosen.imageModel, 'black-forest-labs/flux.1-schnell');
  const gemini = readAiConfig({ ai: { providerId: 'gemini', imageModel: '' } });
  assert.equal(gemini.imageModel, 'gemini-2.5-flash-image');
});

test('leaked chain of thought never reaches a VK comment', () => {
  assert.equal(looksLikeChainOfThought('Okay, the user just said "Say pong". Hmm, that\'s short.'), true);
  assert.equal(looksLikeChainOfThought('The user wants a comment about car repair.'), true);
  assert.equal(looksLikeChainOfThought('Хорошо, пользователь просит комментарий.'), true);
  assert.equal(looksLikeChainOfThought('Нужно написать короткий отзыв.'), true);
  assert.equal(looksLikeChainOfThought("Here's a thinking process: 1. Analyze the Request"), true);
  assert.equal(looksLikeChainOfThought("Let's break this down into steps."), true);
  assert.equal(looksLikeChainOfThought('**Analysis:** the post is about suspension'), true);
  assert.equal(looksLikeChainOfThought('Мне нужно написать короткий комментарий.'), true);
  assert.equal(looksLikeChainOfThought('Отличный разбор, спасибо что поделились опытом.'), false);
  assert.equal(looksLikeChainOfThought('Согласен, у нас так же вышло прошлой зимой.'), false);
  assert.equal(looksLikeChainOfThought('Стойки за 2 часа — это ещё быстро, по цене норм.'), false);
  assert.equal(looksLikeChainOfThought(''), false);
});
