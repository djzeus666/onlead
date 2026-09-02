/**
 * Prompts for the three AI tools of the cabinet: AI Лид-менеджер, Нейрокомментарии,
 * AI-Картинки. Kept apart from the transport in ai.mjs so the wording can be tuned
 * and unit-tested without touching HTTP code.
 */

/* ---------------------------------------------------------------- helpers */

/** VK gives us bdate as "DD.MM" or "DD.MM.YYYY"; only the latter yields an age. */
export function ageFromBdate(bdate) {
  const m = String(bdate || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const born = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday = now.getMonth() < born.getMonth()
    || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 10 && age <= 100 ? age : null;
}

function daysSince(unixSeconds) {
  const t = Number(unixSeconds || 0);
  if (!t) return null;
  return Math.floor((Date.now() - t * 1000) / 86400000);
}

/**
 * Compact factual card of a VK user. Only what the API actually returned —
 * the model must never be handed guesses it could repeat as fact.
 */
export function personCard(person = {}) {
  const lines = [];
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  lines.push(`Имя: ${name || 'неизвестно'}`);
  if (person.cityTitle) lines.push(`Город: ${person.cityTitle}`);
  const age = ageFromBdate(person.bdate);
  if (age) lines.push(`Возраст: ${age}`);
  if (person.sex === 1) lines.push('Пол: женский');
  if (person.sex === 2) lines.push('Пол: мужской');
  const seen = daysSince(person.lastSeen);
  if (seen != null) lines.push(`Заходил(а) в VK: ${seen === 0 ? 'сегодня' : seen + ' дн. назад'}`);
  lines.push(`Аватар: ${person.photo ? 'есть' : 'нет'}`);
  if (person.deactivated) lines.push('Страница заблокирована или удалена');
  return lines.join('\n');
}

/* ------------------------------------------------- AI Лид-менеджер: письмо */

const LEAD_STYLE_HINTS = {
  'как вы пишете': 'обычная человеческая переписка: короткие фразы, без официоза и без панибратства',
  'деловой': 'сдержанно и по делу, на «вы», без восклицаний и смайлов',
  'дружеский': 'тепло и просто, как пишут знакомому, допустимо одно уместное «)»',
  'продающий': 'уверенно и конкретно: сразу видна польза, но без давления и без «успейте»',
};

export function leadStyleHint(style) {
  const key = String(style || '').trim().toLowerCase();
  return LEAD_STYLE_HINTS[key] || LEAD_STYLE_HINTS['как вы пишете'];
}

/**
 * First DM in VK. The goal is a reply, not a sale — openers that pitch in the
 * first message get reported as spam and cost the account.
 */
export function buildLeadOpenerPrompt({ person, offer, style, sourceHint } = {}) {
  const system = [
    'Ты пишешь ПЕРВОЕ личное сообщение во ВКонтакте от лица владельца небольшого бизнеса.',
    'Цель одна — получить ответ. Продажа будет позже, в этом сообщении её нет.',
    '',
    'Правила:',
    '- 1–3 коротких предложения, не длиннее 300 символов.',
    '- Начни с имени человека, дальше сразу по делу.',
    '- Опирайся только на факты из карточки. Ничего не выдумывай про человека и не льсти.',
    '- Заверши одним открытым вопросом, на который легко ответить одной фразой.',
    '',
    'Запрещено:',
    '- Ссылки, цены, прайс, приглашения «в личку», названия мессенджеров.',
    '- Слова «предложение», «сотрудничество», «взаимовыгодно», «уникальный», «успейте», «не пропустите».',
    '- Шаблонные зачины «Здравствуйте! Меня зовут…», «Добрый день! Хочу предложить…».',
    '- Больше одного смайла; хештеги; ВЕРХНИЙ РЕГИСТР; более одного восклицательного знака.',
    '- Любые намёки на рассылку, бота или автоматизацию.',
    '',
    'Ответь только текстом сообщения — без кавычек, пояснений и подписи.',
  ].join('\n');

  const user = [
    `Тон: ${leadStyleHint(style)}.`,
    `Цель диалога (оффер владельца): ${String(offer || '').trim() || 'познакомиться и понять, актуальна ли тема'}`,
    sourceHint ? `Где нашли человека: ${sourceHint}. Прямо на это не ссылайся — это может насторожить.` : '',
    '',
    'Карточка человека:',
    personCard(person),
  ].filter(Boolean).join('\n');

  return { system, user };
}

/** Follow-up DM after the person replied — keep the thread natural, move toward the offer. */
export function buildLeadReplyPrompt({ person, offer, style, history } = {}) {
  const lines = (history || [])
    .slice(-12)
    .map((m) => {
      const who = m.role === 'user' ? 'Человек' : 'Вы';
      return `${who}: ${String(m.text || '').trim()}`;
    })
    .filter((l) => l.length > 8);

  const system = [
    'Ты продолжаешь личную переписку во ВКонтакте от лица владельца небольшого бизнеса.',
    'Человек уже ответил — опирайся на его последнюю реплику, не начинай с нуля.',
    '',
    'Правила:',
    '- 1–4 коротких предложения, не длиннее 400 символов.',
    '- Ответь по сути на последнее сообщение человека.',
    '- Мягко подводи к цели оффера, но без давления и без «воронки».',
    '- Если человек спрашивает цену или сроки — ответь конкретно, без уклончивости.',
    '',
    'Запрещено:',
    '- Ссылки, мессенджеры, «перейдите по ссылке», прайсы в простыне.',
    '- Шаблоны «Спасибо за ответ», «Рад, что написали» без содержания.',
    '- Повторять дословно своё предыдущее сообщение.',
    '- Больше одного вопроса в сообщении.',
    '',
    'Ответь только текстом сообщения — без кавычек и пояснений.',
  ].join('\n');

  const user = [
    `Тон: ${leadStyleHint(style)}.`,
    `Цель диалога: ${String(offer || '').trim() || 'понять интерес и договориться о следующем шаге'}`,
    person?.firstName ? `Имя: ${person.firstName}` : '',
    '',
    'Переписка (от старых к новым):',
    lines.length ? lines.join('\n') : 'Человек: (ответ без текста)',
  ].filter(Boolean).join('\n');

  return { system, user };
}

/* ------------------------------------------------ AI Лид-менеджер: скоринг */

/** Cabinet field "Порог скоринга в CRM" arrives as "6+" … "9+". */
export function parseScoreThreshold(raw) {
  const m = String(raw || '').match(/(\d{1,2})/);
  if (!m) return 0;
  return Math.min(10, Math.max(1, Number(m[1])));
}

export function buildLeadScorePrompt({ person, offer, sourceHint, reply } = {}) {
  const system = [
    'Ты оцениваешь, насколько человек из ВКонтакте близок к покупке по конкретному офферу.',
    'Отвечай ТОЛЬКО одной строкой JSON, без markdown и пояснений:',
    '{"score": <целое 1-10>, "intent": "hot|warm|cold", "reason": "<до 90 символов по-русски>"}',
    '',
    'Шкала:',
    '10-9 — прямо сейчас ищет это: явный запрос, «посоветуйте», «где купить», назвал сроки или бюджет.',
    '8-7 — активный интерес: обсуждает саму проблему, сравнивает варианты, спрашивает цену.',
    '6-5 — тематический интерес без срочности: профильная аудитория, тема близка.',
    '4-3 — косвенный сигнал: смежная тема или совпал только регион.',
    '2-1 — нерелевантно: другая ниша, другой город, коммерческий аккаунт, бот, пустая страница.',
    '',
    'Снижай оценку за: отсутствие аватара, заблокированную страницу, давний последний визит,',
    'признаки магазина или бота, город за пределами гео оффера.',
    'Данных мало почти всегда — это норма: при скудной карточке ставь 5 или ниже, а не 8.',
    'Не завышай оценку из вежливости и не объясняй ответ вне поля reason.',
  ].join('\n');

  const user = [
    `Оффер: ${String(offer || '').trim() || 'не указан'}`,
    sourceHint ? `Источник аудитории: ${sourceHint}` : '',
    '',
    'Карточка человека:',
    personCard(person),
    reply ? `\nОтвет человека в переписке:\n${String(reply).slice(0, 600)}` : '',
  ].filter(Boolean).join('\n');

  return { system, user };
}

/** Tolerates models that wrap JSON in prose or code fences. */
export function parseLeadScore(raw) {
  const text = String(raw || '');
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  let data;
  try { data = JSON.parse(match[0]); }
  catch { return null; }
  const score = Math.round(Number(data.score));
  if (!Number.isFinite(score)) return null;
  const intent = ['hot', 'warm', 'cold'].includes(data.intent) ? data.intent : '';
  return {
    score: Math.min(10, Math.max(1, score)),
    intent: intent || (score >= 8 ? 'hot' : score >= 5 ? 'warm' : 'cold'),
    reason: String(data.reason || '').replace(/\s+/g, ' ').trim().slice(0, 120),
  };
}

/** Leadgen match scoring (Лидоскоп) — text from post/comment, not VK person card. */
export function buildLeadgenMatchScorePrompt({ text, matchedPhrase, kind, platform, authorName } = {}) {
  const system = [
    'Ты — AI-скоринг лидов для SMM/продаж в РФ.',
    'Оцени вероятность, что автор — потенциальный клиент (1–10).',
    'Критерии: явный спрос/боль, готовность к диалогу, релевантность фразе, отсутствие спама.',
    'Ответ строго в формате:',
    'score: N',
    'reason: краткая причина на русском (1–2 предложения)',
  ].join('\n');
  const user = [
    `Площадка: ${platform || 'vk'}`,
    `Тип: ${kind || 'post'}`,
    `Фраза-триггер: ${matchedPhrase || '—'}`,
    `Автор: ${authorName || 'неизвестно'}`,
    '',
    'Текст:',
    `«${String(text || '').slice(0, 1500)}»`,
  ].join('\n');
  return { system, user };
}

export function parseLeadgenMatchScore(raw) {
  const text = String(raw || '');
  const scoreM = text.match(/score:\s*(\d+)/i);
  const reasonM = text.match(/reason:\s*(.+)/is);
  if (!scoreM) return null;
  const score = Math.min(10, Math.max(1, Number(scoreM[1])));
  return {
    score,
    reason: String(reasonM?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 200),
  };
}

/** Leadgen AI draft reply (manual send only). */
export function buildLeadgenDraftReplyPrompt({ text, matchedPhrase, kind, platform, authorName, note } = {}) {
  const system = [
    'Ты — менеджер по лидам. Пишешь черновик ответа автору во ВКонтакте.',
    'Тон: вежливый, полезный, без давления. 2–4 предложения на русском.',
    'Не обещай то, чего нет в контексте. Без ссылок-спама.',
    'Верни ТОЛЬКО текст ответа — без кавычек и без «Ответ:».',
    'Это черновик для ручной отправки человеком, не автосообщение.',
  ].join('\n');
  const user = [
    `Автор: ${authorName || 'пользователь'}`,
    `Тип: ${kind || 'post'}`,
    `Фраза: ${matchedPhrase || '—'}`,
    note ? `Заметка менеджера: ${note}` : '',
    '',
    'Сообщение автора:',
    `«${String(text || '').slice(0, 1500)}»`,
  ].filter(Boolean).join('\n');
  return { system, user };
}

/* ------------------------------------------------------ Нейрокомментарии */

const COMMENT_TONE_HINTS = {
  'нейтральный': 'спокойно и ровно, без оценок и восторгов',
  'экспертный': 'как человек, который сам этим занимается: конкретно, с деталью из практики, без менторства',
  'живой': 'разговорно, как пишут в ленте друзьям, можно неполное предложение',
  'с юмором': 'с лёгкой самоиронией; шутка уместная и добрая, без сарказма в адрес автора',
};

export function commentToneHint(tone) {
  const key = String(tone || '').trim().toLowerCase();
  return COMMENT_TONE_HINTS[key] || COMMENT_TONE_HINTS['нейтральный'];
}

/**
 * A comment that reads like a bot costs the account and the client's reputation,
 * so the rules below are mostly a list of tells to avoid.
 */
export function buildNeuroCommentPrompt({ postText, topics, tone } = {}) {
  const system = [
    'Ты — живой подписчик сообщества ВКонтакте. Пишешь комментарий под постом.',
    '',
    'Формат: 1–2 предложения, 40–220 символов. Только текст комментария.',
    '',
    'Обязательно:',
    '- Зацепись за КОНКРЕТНУЮ деталь поста: факт, цифру, пример, слово автора.',
    '- Пиши простыми словами, как в мессенджере.',
    '- Если по посту нечего сказать содержательно — отреагируй коротко и по-человечески на сам факт публикации.',
    '',
    'Запрещено:',
    '- Общие похвалы: «Отличный пост», «Спасибо за информацию», «Очень полезно», «Интересная мысль».',
    '- Реклама, услуги, цены, ссылки, «пишите в личку», упоминание своей компании.',
    '- Хештеги, «Здравствуйте», «Уважаемые», обращение к автору по имени.',
    '- Вопрос ради вопроса и связки вида «А что думаете вы?».',
    '- Дословный пересказ поста и цитаты из него.',
    '- Больше одного смайла и любые следы ИИ.',
    '',
    'Ниша нужна только чтобы выбрать угол зрения. Не называй её и ничего не продавай.',
    'Ответь только текстом комментария, без кавычек.',
  ].join('\n');

  const snippet = String(postText || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  const topicLine = String(topics || '').trim().slice(0, 180);
  const user = [
    `Тон: ${commentToneHint(tone)}.`,
    topicLine ? `Ниша комментатора (ориентир, не упоминать): ${topicLine}.` : '',
    '',
    'Текст поста:',
    snippet || '(в посте нет текста — вероятно, только фото или видео)',
  ].filter(Boolean).join('\n');

  return { system, user };
}

/* ------------------------------------------------------------ AI-Картинки */

const RATIO_HINTS = {
  '9:16': 'vertical 9:16 full-screen story composition, key subject in the upper two thirds, safe margins for overlaid text',
  '16:9': 'wide 16:9 cinematic cover, generous negative space on one side for a headline',
  '4:5': '4:5 portrait feed composition, subject centred and close to the frame',
  '1:1': 'square 1:1 social post, balanced centred composition',
};

export function ratioHint(ratio) {
  const s = String(ratio || '');
  for (const key of ['9:16', '16:9', '4:5']) {
    if (s.includes(key)) return RATIO_HINTS[key];
  }
  return RATIO_HINTS['1:1'];
}

export function wantsVisibleText(prompt) {
  return /надпис|текст[ао]?м?\b|логотип|лого|букв|слоган|заголов|written|inscription|lettering/i.test(String(prompt || ''));
}

/** Quoted fragments in the brief are the exact letters the user wants rendered. */
export function extractInscriptions(raw) {
  const out = [];
  const text = String(raw || '');
  for (const re of [/[«"']([^«»"']{1,40})[»"']/g, /надпис[ьюи]{1,2}\s+([A-Za-zА-Яа-яЁё0-9 ]{1,40})/gi]) {
    let m;
    while ((m = re.exec(text))) {
      const value = m[1].trim();
      if (value && !out.includes(value)) out.push(value);
    }
  }
  return out.slice(0, 3);
}

/**
 * Asks the chat model to rewrite a short Russian brief into an English prompt.
 * Image models follow English far better, and a literal word-swap loses the subject.
 */
export function buildImagePromptRequest({ raw, ratio } = {}) {
  const system = [
    'You turn a short Russian brief into ONE English prompt for a photorealistic image model.',
    '',
    'Rules:',
    '- Output only the prompt. No preamble, no markdown, no surrounding quotes.',
    '- Translate every object, subject and action from the brief. Never drop or swap what was asked for.',
    '- If the brief asks for an inscription, logo text or slogan, repeat that text EXACTLY in double quotes and state that the lettering must be sharp, correctly spelled and physically placed on the surface.',
    '- Add concrete photographic detail: framing, lens, lighting, materials, colour palette, background, mood.',
    '- Never invent people, brands or logos that were not requested.',
    '- No watermark, no UI mockup, no app icon, no collage, no text overlay unless the brief asked for text.',
    '- Keep it under 90 words, one paragraph.',
  ].join('\n');

  const inscriptions = extractInscriptions(raw);
  const user = [
    `Brief (Russian): ${String(raw || '').trim()}`,
    `Format: ${ratioHint(ratio)}`,
    inscriptions.length ? `Exact lettering to render: ${inscriptions.map((t) => `"${t}"`).join(', ')}` : '',
    'Write one detailed English image prompt.',
  ].filter(Boolean).join('\n');

  return { system, user };
}

/**
 * Used when the chat model is unavailable. Modern image models parse basic
 * Russian, so the brief is kept verbatim and only wrapped in English direction.
 */
export function imageFallbackPrompt(raw, ratio) {
  const brief = String(raw || '').replace(/\s+/g, ' ').trim();
  const inscriptions = extractInscriptions(brief);
  const parts = [
    'Photorealistic photograph.',
    `Subject: ${brief}.`,
    `${ratioHint(ratio)}.`,
    'Natural lighting, sharp focus, realistic materials and depth of field.',
    'No illustration, no 3d render, no app icon, no watermark, no collage.',
  ];
  if (inscriptions.length) {
    parts.push(
      `The lettering ${inscriptions.map((t) => `"${t}"`).join(' and ')} must be sharp, correctly spelled and readable on the surface of the object.`,
    );
  } else {
    parts.push('Do not replace the subject with an icon or a logo.');
  }
  return parts.join(' ');
}
