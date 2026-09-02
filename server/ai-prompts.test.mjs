import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ageFromBdate, buildImagePromptRequest, buildLeadOpenerPrompt, buildLeadReplyPrompt, buildLeadScorePrompt,
  buildLeadgenMatchScorePrompt, parseLeadgenMatchScore,
  buildNeuroCommentPrompt, commentToneHint, extractInscriptions, imageFallbackPrompt,
  leadStyleHint, parseLeadScore, parseScoreThreshold, personCard, ratioHint, wantsVisibleText,
} from './ai-prompts.mjs';

test('age comes only from a full birth date', () => {
  const year = new Date().getFullYear();
  assert.equal(ageFromBdate(`1.1.${year - 30}`), 30);
  assert.equal(ageFromBdate('31.12'), null);
  assert.equal(ageFromBdate(''), null);
  assert.equal(ageFromBdate('1.1.1700'), null);
});

test('person card states only what VK returned', () => {
  const card = personCard({ firstName: 'Анна', lastName: 'Лидова', cityTitle: 'Екатеринбург', sex: 1 });
  assert.match(card, /Имя: Анна Лидова/);
  assert.match(card, /Город: Екатеринбург/);
  assert.match(card, /Пол: женский/);
  assert.match(card, /Аватар: нет/);
  assert.doesNotMatch(card, /Возраст/);
});

test('lead opener forbids the tells that get accounts banned', () => {
  const { system, user } = buildLeadOpenerPrompt({
    person: { firstName: 'Пётр', cityTitle: 'Москва' },
    offer: 'запись на консультацию',
    style: 'Деловой',
    sourceHint: 'клуб автолюбителей',
  });
  for (const banned of ['Ссылки', 'сотрудничество', 'успейте', 'Здравствуйте']) {
    assert.match(system, new RegExp(banned, 'i'));
  }
  assert.match(system, /300 символов/);
  assert.match(user, /запись на консультацию/);
  assert.match(user, /Пётр/);
  assert.match(user, /клуб автолюбителей/);
});

test('lead reply prompt includes transcript and offer', () => {
  const { system, user } = buildLeadReplyPrompt({
    person: { firstName: 'Мария' },
    offer: 'курс SMM',
    style: 'Дружеский',
    history: [
      { role: 'assistant', text: 'Мария, вы в теме SMM?' },
      { role: 'user', text: 'Да, ищу курс для себя' },
    ],
  });
  assert.match(system, /продолжаешь личную переписку/i);
  assert.match(user, /курс SMM/);
  assert.match(user, /ищу курс для себя/);
});

test('unknown dialogue style falls back to the neutral one', () => {
  assert.equal(leadStyleHint('Деловой'), leadStyleHint('деловой'));
  assert.equal(leadStyleHint('нет такого'), leadStyleHint('Как вы пишете'));
});

test('scoring prompt pins the scale and the JSON shape', () => {
  const { system, user } = buildLeadScorePrompt({
    person: { firstName: 'Ольга' },
    offer: 'ремонт квартир',
    reply: 'Сколько стоит?',
  });
  assert.match(system, /"score"/);
  assert.match(system, /10-9/);
  assert.match(system, /2-1/);
  assert.match(user, /ремонт квартир/);
  assert.match(user, /Сколько стоит\?/);
});

test('CRM threshold is read from the cabinet select', () => {
  assert.equal(parseScoreThreshold('6+'), 6);
  assert.equal(parseScoreThreshold('9+'), 9);
  assert.equal(parseScoreThreshold(''), 0);
  assert.equal(parseScoreThreshold('99+'), 10);
});

test('score survives models that wrap JSON in prose', () => {
  const good = parseLeadScore('```json\n{"score": 8, "intent": "hot", "reason": "Спрашивает цену"}\n```');
  assert.deepEqual(good, { score: 8, intent: 'hot', reason: 'Спрашивает цену' });
  const clamped = parseLeadScore('{"score": 44, "reason": "x"}');
  assert.equal(clamped.score, 10);
  assert.equal(clamped.intent, 'hot');
  assert.equal(parseLeadScore('нет json'), null);
  assert.equal(parseLeadScore('{"score": "abc"}'), null);
});

test('comment prompt bans generic praise and self-promo', () => {
  const { system, user } = buildNeuroCommentPrompt({
    postText: 'Заменили подвеску за 2 часа',
    topics: 'автосервис',
    tone: 'Экспертный',
  });
  assert.match(system, /Отличный пост/);
  assert.match(system, /Спасибо за информацию/);
  assert.match(system, /пишите в личку/i);
  assert.match(system, /Хештеги/);
  assert.match(user, /Заменили подвеску/);
  assert.match(user, /автосервис/);
  assert.equal(commentToneHint('Экспертный'), commentToneHint('экспертный'));
});

test('empty post still gets a usable instruction', () => {
  const { user } = buildNeuroCommentPrompt({ postText: '   ', tone: 'Живой' });
  assert.match(user, /только фото или видео/);
});

test('ratio drives the composition hint', () => {
  assert.match(ratioHint('9:16 сторис'), /vertical 9:16/);
  assert.match(ratioHint('16:9 обложка'), /wide 16:9/);
  assert.match(ratioHint('4:5 лента'), /4:5 portrait/);
  assert.match(ratioHint('1:1 пост'), /square 1:1/);
  assert.match(ratioHint(''), /square 1:1/);
});

test('quoted lettering is carried into the image prompt verbatim', () => {
  assert.deepEqual(extractInscriptions('обложка с надписью «Скидка 20%»'), ['Скидка 20%']);
  assert.deepEqual(extractInscriptions('баннер с текстом "SALE"'), ['SALE']);
  assert.deepEqual(extractInscriptions('просто машина'), []);
  const { user } = buildImagePromptRequest({ raw: 'постер с надписью «SMM»', ratio: '1:1 пост' });
  assert.match(user, /"SMM"/);
  assert.equal(wantsVisibleText('постер с надписью SMM'), true);
  assert.equal(wantsVisibleText('красный автомобиль на закате'), false);
});

test('image fallback keeps the brief and drops the old car hardcode', () => {
  const out = imageFallbackPrompt('минималистичная обложка курса по SMM', '16:9 обложка');
  assert.match(out, /минималистичная обложка курса по SMM/);
  assert.match(out, /wide 16:9/);
  assert.doesNotMatch(out, /Real car/);
  assert.doesNotMatch(out, /car body/);
});

test('image fallback demands readable lettering only when asked', () => {
  const withText = imageFallbackPrompt('кружка с надписью «Доброе утро»', '1:1 пост');
  assert.match(withText, /"Доброе утро"/);
  assert.match(withText, /readable on the surface/);
  const without = imageFallbackPrompt('красный автомобиль на закате', '1:1 пост');
  assert.match(without, /Do not replace the subject/);
});

test('leadgen match score parser', () => {
  const parsed = parseLeadgenMatchScore('score: 8\nreason: Явный запрос услуги');
  assert.equal(parsed?.score, 8);
  assert.match(parsed?.reason || '', /запрос/);
  assert.match(buildLeadgenMatchScorePrompt({ text: 'ищу мастера', matchedPhrase: 'ищу' }).user, /ищу мастера/);
});
