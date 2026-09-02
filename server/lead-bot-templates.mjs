/** Ready scenarios + widget snippet (online-lead.ru / post2post parity). */

export const BOT_KINDS = ['lead', 'faq', 'booking', 'widget'];

const KIND_LABEL = {
  lead: 'Лид-бот',
  faq: 'FAQ-бот',
  booking: 'Бот записи',
  widget: 'Виджет заявок',
};

export function botKindLabel(kind) {
  return KIND_LABEL[kind] || kind;
}

export function buildLeadBotScenario(input = {}) {
  const { kind, business, goal, nicheTitle, city, contact } = input;
  const who = String(business || '').trim() || nicheTitle || 'Бизнес';
  const where = String(city || '').trim() || 'вашем городе';
  const cta = String(contact || '').trim() || 'менеджер перезвонит в рабочее время';

  if (kind === 'widget') {
    return [
      `# Виджет заявок — ${who}`,
      '',
      `## Цель`,
      goal || 'Собрать заявку с сайта и отправить в CRM',
      '',
      `## Поля формы`,
      '- Имя',
      '- Телефон (обязательно)',
      '- Комментарий / услуга',
      '',
      `## Тексты`,
      `- Заголовок: «Оставьте заявку — ${who}»`,
      `- Подзаголовок: «Ответим в течение 15 минут (${where})»`,
      `- Успех: «Заявка принята. ${cta}.»`,
    ].join('\n');
  }

  if (kind === 'faq') {
    return [
      `# FAQ-бот Telegram — ${who}`,
      '',
      `## Приветствие (/start)`,
      `Здравствуйте! Я бот «${who}». Могу ответить на частые вопросы или передать заявку менеджеру.`,
      '',
      `## Меню`,
      '1. Услуги и цены',
      '2. Адрес и режим работы',
      '3. Как записаться',
      '4. Связаться с человеком',
    ].join('\n');
  }

  if (kind === 'booking') {
    return [
      `# Бот записи — ${who}`,
      '',
      `## Приветствие`,
      `Привет! Запишу вас в «${who}» (${where}).`,
      '',
      `## Шаги`,
      '1. Услуга → 2. День → 3. Время → 4. Имя → 5. Телефон',
      '',
      `## Финал`,
      `Заявка на запись принята. ${cta}.`,
    ].join('\n');
  }

  return [
    `# Лид-бот Telegram — ${who}`,
    '',
    `## Приветствие (/start)`,
    `Здравствуйте! Помогу с «${goal || 'заявкой'}» для ${who} (${nicheTitle || 'бизнес'}, ${where}).`,
    '',
    `## Вопросы`,
    '1. Что нужно? 2. Срок 3. Бюджет 4. Имя 5. Телефон',
    '',
    `## Финал`,
    `Спасибо! Передал заявку. ${cta}.`,
  ].join('\n');
}

export function buildExecutableScenario(input = {}) {
  const { kind, business, goal, nicheTitle, city, contact } = input;
  const who = String(business || '').trim() || nicheTitle || 'Бизнес';
  const where = String(city || '').trim() || 'вашем городе';
  const cta = String(contact || '').trim() || 'менеджер перезвонит в рабочее время';
  const niche = nicheTitle || 'услуг';
  const helpText = 'Команды: /start — сначала, /cancel — отмена, /help — подсказка.';
  const cancelText = 'Диалог отменён. Напишите /start, чтобы начать снова.';

  if (kind === 'widget') {
    return {
      greeting: `Оставьте заявку — ${who}`,
      steps: [],
      branches: {},
      finale: `Заявка принята. ${cta}.`,
      cancelText,
      helpText,
    };
  }

  if (kind === 'faq') {
    return {
      greeting: `Здравствуйте! Я бот «${who}» (${niche}, ${where}). Выберите тему или оставьте заявку.`,
      steps: [
        {
          id: 'menu',
          type: 'choice',
          prompt: 'Чем помочь?',
          field: 'topic',
          options: [
            { id: 'services', label: 'Услуги и цены', next: 'ans_services' },
            { id: 'address', label: 'Адрес и режим', next: 'ans_address' },
            { id: 'booking', label: 'Как записаться', next: 'ask_name' },
            { id: 'human', label: 'Связаться с человеком', next: 'ask_name' },
          ],
        },
        {
          id: 'ans_services',
          type: 'message',
          prompt: `Основные направления «${who}»: консультация, услуги по нише «${niche}».`,
          next: 'ask_name',
        },
        {
          id: 'ans_address',
          type: 'message',
          prompt: `Мы в городе ${where}. Точный адрес уточнит менеджер.`,
          next: 'ask_name',
        },
        {
          id: 'ask_name',
          type: 'text_input',
          prompt: 'Как вас зовут?',
          field: 'name',
          required: true,
          next: 'ask_phone',
        },
        {
          id: 'ask_phone',
          type: 'text_input',
          prompt: 'Оставьте телефон для связи:',
          field: 'phone',
          required: true,
          next: 'done',
        },
        {
          id: 'done',
          type: 'message',
          prompt: `Спасибо! Передал заявку. ${cta}.`,
          finalize: true,
        },
      ],
      branches: {},
      finale: `Спасибо! Передал заявку. ${cta}.`,
      cancelText,
      helpText,
    };
  }

  if (kind === 'booking') {
    return {
      greeting: `Привет! Запишу вас в «${who}» (${where}).`,
      steps: [
        {
          id: 'service',
          type: 'choice',
          prompt: 'Выберите услугу:',
          field: 'service',
          options: [
            { id: 'consult', label: 'Консультация', next: 'day' },
            { id: 'main', label: `Основная услуга (${niche})`, next: 'day' },
          ],
        },
        {
          id: 'day',
          type: 'choice',
          prompt: 'Предпочтительный день:',
          field: 'day',
          options: [
            { id: 'today', label: 'Сегодня', next: 'name' },
            { id: 'tomorrow', label: 'Завтра', next: 'name' },
            { id: 'week', label: 'На этой неделе', next: 'name' },
          ],
        },
        {
          id: 'name',
          type: 'text_input',
          prompt: 'Ваше имя:',
          field: 'name',
          required: true,
          next: 'phone',
        },
        {
          id: 'phone',
          type: 'text_input',
          prompt: 'Телефон для подтверждения:',
          field: 'phone',
          required: true,
          next: 'confirm',
        },
        {
          id: 'confirm',
          type: 'message',
          prompt: `Заявка на запись принята. ${cta}.`,
          finalize: true,
        },
      ],
      branches: {},
      finale: `Заявка на запись принята. ${cta}.`,
      cancelText,
      helpText,
    };
  }

  return {
    greeting: `Здравствуйте! Помогу с «${goal || 'заявкой'}» для ${who} (${niche}, ${where}).`,
    steps: [
      {
        id: 'service',
        type: 'text_input',
        prompt: 'Что нужно? (услуга или продукт)',
        field: 'service',
        required: true,
        next: 'urgency',
      },
      {
        id: 'urgency',
        type: 'choice',
        prompt: 'Когда нужно?',
        field: 'urgency',
        options: [
          { id: 'urgent', label: 'Срочно', next: 'budget' },
          { id: 'week', label: 'На неделе', next: 'budget' },
          { id: 'info', label: 'Просто узнать', next: 'budget' },
        ],
      },
      {
        id: 'budget',
        type: 'choice',
        prompt: 'Ориентировочный бюджет:',
        field: 'budget',
        options: [
          { id: 'low', label: 'До 10 тыс.', next: 'name' },
          { id: 'mid', label: '10–50 тыс.', next: 'name' },
          { id: 'high', label: 'От 50 тыс.', next: 'name' },
          { id: 'unknown', label: 'Пока не знаю', next: 'name' },
        ],
      },
      {
        id: 'name',
        type: 'text_input',
        prompt: 'Как вас зовут?',
        field: 'name',
        required: true,
        next: 'phone',
      },
      {
        id: 'phone',
        type: 'text_input',
        prompt: 'Телефон или @username:',
        field: 'phone',
        required: true,
        next: 'done',
      },
      {
        id: 'done',
        type: 'message',
        prompt: `Спасибо! Передал заявку. ${cta}.`,
        finalize: true,
      },
    ],
    branches: {},
    finale: `Спасибо! Передал заявку. ${cta}.`,
    cancelText,
    helpText,
  };
}

export function scenarioToFunnelSections(scenario) {
  const sections = [{
    title: 'Старт',
    text: scenario?.greeting || 'Здравствуйте!',
    buttons: '',
  }];
  for (const step of scenario?.steps || []) {
    if (step.type === 'choice' && step.options?.length) {
      sections.push({
        title: String(step.prompt || 'Выбор').slice(0, 80),
        text: step.prompt || '',
        buttons: step.options.map((o) => o.label).join(', '),
      });
    } else if (step.type === 'text_input') {
      sections.push({
        title: String(step.prompt || 'Вопрос').slice(0, 80),
        text: step.prompt || '',
        buttons: '',
      });
    } else if (step.type === 'message') {
      sections.push({
        title: step.finalize ? 'Финал' : 'Сообщение',
        text: step.prompt || '',
        buttons: step.finalize ? 'В начало' : 'Далее',
      });
    }
  }
  if (scenario?.finale && !sections.some((s) => s.title === 'Финал')) {
    sections.push({ title: 'Финал', text: scenario.finale, buttons: 'В начало' });
  }
  return sections.slice(0, 12);
}

export function buildWidgetSnippet(input = {}) {
  const title = String(input.business || 'Заявка').replace(/"/g, "'");
  const goal = String(input.goal || 'Оставьте контакты').replace(/"/g, "'");
  const endpoint = String(input.endpoint || '').replace(/"/g, '');
  const ok = String(input.successText || 'Заявка принята. Мы свяжемся с вами.').replace(/"/g, "'");
  return `<!-- OnLead widget -->
<div id="onlead-widget" data-title="${title}" data-goal="${goal}" data-endpoint="${endpoint}"></div>
<script>
(function(){
  var root = document.getElementById('onlead-widget');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  var title = root.dataset.title || 'Заявка';
  var goal = root.dataset.goal || '';
  var endpoint = root.dataset.endpoint || '';
  root.innerHTML = '<form style="max-width:360px;font:14px/1.4 system-ui;border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#fff">'
    + '<strong style="font-size:16px">'+title+'</strong>'
    + (goal ? '<p style="margin:8px 0 12px;color:#64748b">'+goal+'</p>' : '')
    + '<input name="name" placeholder="Имя" required style="width:100%;margin:0 0 8px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box">'
    + '<input name="phone" placeholder="Телефон" required style="width:100%;margin:0 0 8px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box">'
    + '<textarea name="comment" placeholder="Комментарий" rows="3" style="width:100%;margin:0 0 8px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box"></textarea>'
    + '<input name="company" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;opacity:0" aria-hidden="true">'
    + '<button type="submit" style="width:100%;padding:10px;border:0;border-radius:8px;background:#0f172a;color:#fff;cursor:pointer">Отправить</button>'
    + '<p data-ok style="display:none;margin:10px 0 0;color:#15803d">${ok}</p>'
    + '<p data-err style="display:none;margin:10px 0 0;color:#b91c1c"></p>'
    + '</form>';
  root.querySelector('form').addEventListener('submit', function(e){
    e.preventDefault();
    var form = e.target;
    var fd = new FormData(form);
    var errEl = root.querySelector('[data-err]');
    var okEl = root.querySelector('[data-ok]');
    errEl.style.display = 'none';
    okEl.style.display = 'none';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        phone: fd.get('phone'),
        comment: fd.get('comment'),
        company: fd.get('company'),
        pageUrl: location.href
      })
    }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
     .then(function(res){
        if (!res.ok) throw new Error((res.j && res.j.error) || 'Ошибка отправки');
        okEl.style.display = 'block';
        form.reset();
      })
     .catch(function(err){
        errEl.textContent = err.message || 'Не удалось отправить';
        errEl.style.display = 'block';
      });
  });
})();
</script>`;
}
