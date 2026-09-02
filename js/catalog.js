window.OnLead = window.OnLead || {};

OnLead.BRAND = {
  name: "OnLead",
  domain: "onlead.m360-ural.online",
  origin: "https://onlead.m360-ural.online",
  tagline: "Сигналы из VK — в управляемый поток лидов",
};

/** PRO landing subdomains (Caddy → onlead, Host preserved). */
OnLead.LANDING_HOSTS = [
  "leadgen.m360-ural.online",
  "smm.m360-ural.online",
  "agents.m360-ural.online",
  "media.m360-ural.online",
  "za.m360-ural.online",
];

OnLead.LANDING_DNS_ZONE = "m360-ural.online";

OnLead.PACKAGES = [
  {
    id: "business",
    name: "Business",
    badge: "Хит",
    price: 390,
    hint: "Пакет для продвижения · 6 инструментов",
    tools: ["leadgen-vk", "lead-vk", "massliking-vk", "autoposting-vk", "congratulation-vk", "broom-vk", "group-manager-vk", "parsing-accounts-vk", "parsing-groups-vk"],
  },
  {
    id: "maxi-ai",
    name: "Maxi ИИ",
    badge: "ИИ",
    price: 469,
    hint: "ИИ-лид-менеджер, картинки и нейрокомментарии · 11 инструментов",
    tools: ["leadgen-vk", "image-ai", "ai-lead-vk", "neurocomment-vk", "massliking-vk", "autoposting-vk", "autostoris-vk", "lead-vk", "congratulation-vk", "grabber-vk", "invite-vk", "chat-manager-vk", "parsing-accounts-vk", "parsing-groups-vk"],
  },
  {
    id: "maxi",
    name: "Maxi",
    badge: "Выгодно",
    price: 649,
    hint: "Все возможности платформы · 11 инструментов",
    tools: ["leadgen-vk", "grabber-vk", "invite-vk", "chat-manager-vk", "autoposting-vk", "autostoris-vk", "massliking-vk", "congratulation-vk", "lead-vk", "broom-vk", "group-manager-vk", "image-ai", "parsing-accounts-vk", "parsing-groups-vk"],
  },
];

OnLead.PERIODS = [
  { id: 1, label: "1 месяц", discount: 0 },
  { id: 3, label: "3 месяца", discount: 0.05 },
  { id: 6, label: "6 месяцев", discount: 0.1 },
];

OnLead.packPrice = function (pack, months = 1) {
  const m = Math.max(1, Number(months) || 1);
  const period = OnLead.PERIODS.find((p) => p.id === m) || OnLead.PERIODS[0];
  return Math.round(pack.price * m * (1 - (period?.discount || 0)));
};

OnLead.packageActive = function (state) {
  if (!state?.packageId) return false;
  if (!state.packageUntil) return true;
  return state.packageUntil > Date.now();
};

OnLead.subscriptionLabel = function (state) {
  const trial = OnLead.trialLeft(state);
  if (trial) return `Пробный · ${trial}`;
  if (OnLead.packageActive(state)) {
    const pack = OnLead.PACKAGES.find((p) => p.id === state.packageId);
    const name = pack?.name || state.packageId;
    if (state.packageUntil) {
      const d = new Date(state.packageUntil).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      return `${name} · до ${d}`;
    }
    return name;
  }
  if (state.packageId && state.packageUntil) return "Подписка истекла";
  return "Не подключена";
};

OnLead.NAV = [
  { section: "Меню", items: [
    { href: "#/office", icon: "home", label: "Главная" },
    { href: "#/office/academy", icon: "book", label: "Академия", badge: "NEW" },
  ]},
  { section: "Контент", items: [
    { href: "#/office/content", icon: "edit", label: "Публикации", badge: "NEW" },
    { href: "#/office/automation", icon: "layers", label: "Автопубликация" },
  ]},
  { section: "VK", items: [
    { href: "#/office/accounts", icon: "users", label: "Аккаунты VK", counter: "accounts" },
    { href: "#/office/subscriptions", icon: "layers", label: "Тарифы и инструменты" },
  ]},
];

OnLead.FEATURED = [
  { href: "#/office/crm", icon: "kanban", label: "CRM", badge: "NEW" },
  { href: "#/office/tools/ai-lead-vk", icon: "spark", label: "AI Лид-менеджер", mark: "mail" },
  { href: "#/office/tools/neurocomment-vk", icon: "chat", label: "Нейрокомментарии" },
];

OnLead.BUNDLES = [
  {
    id: "subscribed",
    href: "#/office/tools/subscribed",
    title: "По подписке",
    hint: "доступ на всех аккаунтах",
    tone: "sub",
    icon: "rocket",
    prefix: "/office/tools/",
    items: [
      { href: "#/office/tools/leadgen-vk", slug: "leadgen-vk", label: "Лидоскоп" },
      { href: "#/office/tools/lead-vk", slug: "lead-vk", label: "Лид-менеджер" },
      { href: "#/office/tools/massliking-vk", slug: "massliking-vk", label: "Масслайкинг" },
      { href: "#/office/tools/autoposting-vk", slug: "autoposting-vk", label: "Автопостинг" },
      { href: "#/office/tools/autostoris-vk", slug: "autostoris-vk", label: "Автосторис" },
      { href: "#/office/tools/congratulation-vk", slug: "congratulation-vk", label: "Автопоздравления" },
      { href: "#/office/tools/grabber-vk", slug: "grabber-vk", label: "Граббер постов" },
      { href: "#/office/ai-images", slug: "image-ai", label: "AI-Картинки" },
      { href: "#/office/tools/invite-vk", slug: "invite-vk", label: "Инвайтинг" },
      { href: "#/office/tools/chat-manager-vk", slug: "chat-manager-vk", label: "Менеджер чатов" },
      { href: "#/office/tools/group-manager-vk", slug: "group-manager-vk", label: "Менеджер групп" },
      { href: "#/office/tools/broom-vk", slug: "broom-vk", label: "Веник" },
    ],
  },
  {
    id: "parsers",
    href: "#/office/tools/parsers",
    title: "Парсеры и списки",
    hint: "оплата внутри инструмента",
    tone: "parsers",
    icon: "list",
    items: [
      { href: "#/office/tools/lists", slug: "lists", label: "Мои списки" },
      { href: "#/office/tools/parsing-accounts-vk", slug: "parsing-accounts-vk", label: "Парсинг аккаунтов" },
      { href: "#/office/tools/parsing-groups-vk", slug: "parsing-groups-vk", label: "Парсинг групп" },
    ],
  },
  {
    id: "telegram",
    href: "#/office/telegram",
    title: "Telegram",
    hint: "боты и воронки продаж",
    tone: "tg",
    icon: "send",
    items: [
      { href: "#/office/telegram/tariffs", label: "Тарифы", blurb: "Слоты Lite и Pro, живой бот" },
      { href: "#/office/telegram/bots", label: "Мои боты", blurb: "Токен из @BotFather, webhook" },
      { href: "#/office/telegram/channels", label: "Каналы", blurb: "Закрытые каналы для Pro-воронок" },
      { href: "#/office/telegram/funnels", label: "Воронки", badge: "NEW", blurb: "Товары, заказы, настройки бота" },
      { href: "#/office/telegram/lead-bots", label: "TG-боты / виджет", blurb: "Лид-бот, FAQ, запись, embed" },
    ],
  },
  {
    id: "automation",
    href: "#/office/automation",
    title: "Автопубликация",
    hint: "RSS и кросспост",
    tone: "auto",
    icon: "layers",
    items: [
      { href: "#/office/automation", label: "Обзор" },
      { href: "#/office/rss", label: "RSS Autopilot" },
      { href: "#/office/repost", label: "Репосты VK" },
      { href: "#/office/crosspost", label: "AI-кросспост" },
    ],
  },
  {
    id: "content",
    href: "#/office/content",
    title: "Контент",
    hint: "посты и медиа",
    tone: "content",
    icon: "edit",
    items: [
      { href: "#/office/content", label: "Доска" },
      { href: "#/office/compose", label: "Редактор" },
      { href: "#/office/content-studio", label: "AI-план" },
      { href: "#/office/ai-images", label: "AI-картинки" },
      { href: "#/office/media", label: "Медиатека" },
      { href: "#/office/history", label: "История" },
    ],
  },
  {
    id: "landings",
    href: "#/office/landings",
    title: "Лендинги",
    hint: "конструктор страниц под заявки",
    tone: "land",
    icon: "globe",
    items: [
      { href: "#/office/landings", label: "Лендинги", blurb: "Шаблоны, редактор, публикация" },
      { href: "#/office/landings/leads", label: "Заявки", blurb: "Лиды с форм лендингов" },
      { href: "#/office/landings/media", label: "Медиатека", blurb: "Картинки для страниц" },
    ],
  },
];

OnLead.GROUPS = OnLead.BUNDLES;

OnLead.CABINET = [
  { href: "#/office/analytics", icon: "chart", label: "Аналитика" },
  { href: "#/office/workflow", icon: "layers", label: "Процесс" },
  { href: "#/office/settings", icon: "settings", label: "Настройки" },
  { href: "#/office/team", icon: "users", label: "Команда" },
  { href: "#/office/ai-agents", icon: "spark", label: "AI-сотрудники" },
  { href: "#/office/balance", icon: "wallet", label: "Баланс" },
  { href: "#/office/referral", icon: "gift", label: "Реф. программа" },
];

OnLead.TOOLS = [
  {
    slug: "leadgen-vk",
    name: "Лидоскоп",
    price: 249,
    group: "vk",
    summary: "Ищет заявки в постах и комментариях сообществ VK по вашим фразам. Совпадения — в список и в CRM.",
    features: ["Скан постов и комментариев", "Глубина: посты и комментарии", "Фразы, ниши и стоп-слова", "Сообщества, где вы состоите", "Расписание или ручной запуск", "Горячие лиды в CRM"],
    fields: [],
    metrics: ["Совпадений", "Новых", "В CRM", "Сканов сегодня"],
  },
  {
    slug: "ai-lead-vk",
    name: "AI Лид-менеджер",
    price: 199,
    group: "ai",
    summary: "ИИ находит аудиторию, добавляет в друзья и ведёт диалог от вашего имени. Скоринг 1–10, горячие уходят в CRM.",
    features: ["Парсинг аудитории по группам и интересам", "Диалог GPT от вашего имени", "Скоринг лидов 1–10", "Авто-приём заявок"],
    fields: [
      { key: "source", label: "Источник аудитории", type: "select", options: ["Подписчики групп", "Рекомендации", "Свой список"] },
      { key: "groups", label: "Ссылки на сообщества", type: "textarea", placeholder: "https://vk.com/club..." },
      { key: "style", label: "Тон диалога", type: "select", options: ["Как вы пишете", "Деловой", "Дружеский", "Продающий"] },
      { key: "offer", label: "Оффер / цель диалога", type: "textarea", placeholder: "Запись на консультацию, продажа курса..." },
      { key: "score", label: "Порог скоринга в CRM", type: "select", options: ["6+", "7+", "8+", "9+"] },
      { key: "autoAccept", label: "Авто-приём заявок", type: "select", options: ["Да", "Нет"] },
    ],
    metrics: ["Диалоги", "Горячие", "В CRM", "Конверсия"],
  },
  {
    slug: "neurocomment-vk",
    name: "Нейрокомментарии",
    price: 199,
    group: "ai",
    summary: "ИИ-комментарии под постами целевых сообществ: по теме и тону из настроек AI в админке.",
    features: ["Подбор постов", "Генерация текста ИИ", "Тон и ниша", "Лимиты VK"],
    fields: [
      { key: "communities", label: "Сообщества", type: "textarea", placeholder: "Ссылки или короткие имена" },
      { key: "topics", label: "Темы и ключи", type: "text", placeholder: "ремонт квартир, дизайн интерьера" },
      { key: "tone", label: "Тон", type: "select", options: ["Нейтральный", "Экспертный", "Живой", "С юмором"] },
      { key: "perDay", label: "Комментариев в день", type: "number", placeholder: "12" },
    ],
    metrics: ["Комментарии", "Охват постов", "Ответы", "Переходы"],
  },
  {
    slug: "image-ai",
    name: "AI-Картинки",
    price: 229,
    group: "ai",
    summary: "Генератор обложек, баннеров и карточек для постов и сторис. SDXL и DALL·E 3.",
    features: ["Обложки и баннеры", "Карточки товара", "Сторис 9:16", "Стили бренда"],
    fields: [
      { key: "prompt", label: "Промпт", type: "textarea", placeholder: "Минималистичная обложка курса по SMM, тёмный фон, золотая типографика" },
      { key: "ratio", label: "Формат", type: "select", options: ["1:1 пост", "9:16 сторис", "16:9 обложка", "4:5 лента"] },
      { key: "engine", label: "Движок", type: "select", options: ["SDXL", "DALL·E 3"] },
    ],
    metrics: ["Сгенерировано", "В постах", "В сторис", "Кредиты"],
  },
  {
    slug: "lead-vk",
    name: "Лид-менеджер",
    price: 349,
    group: "vk",
    summary: "Последовательности сообщений, шаблоны и воронка без ИИ — вы задаёте сценарий, сервис ведёт диалог.",
    features: ["Цепочки сообщений", "10 вариаций текста", "Фильтры аудитории", "Передача в CRM"],
    fields: [
      { key: "list", label: "Список получателей", type: "select", options: ["Новый список", "Подписчики группы", "Друзья"] },
      { key: "templates", label: "Шаблоны (по одному на строку)", type: "textarea", placeholder: "Привет, {name}! Видел ваш интерес к..." },
      { key: "delay", label: "Пауза между шагами", type: "select", options: ["2 мин", "15 мин", "1 час", "1 день"] },
    ],
    metrics: ["Отправлено", "Ответы", "Лиды", "Отказы"],
  },
  {
    slug: "massliking-vk",
    name: "Масслайкинг",
    price: 199,
    group: "vk",
    summary: "Лайки постов, комментариев и фото — с окном часов и лимитами, без повторов.",
    features: ["Лента, сообщества, фото, комментарии, свой список", "Карточки с кнопкой на пост или комментарий", "Окно часов по Москве", "Один объект — один лайк"],
    fields: [
      { key: "target", label: "Что лайкать", type: "select", options: [
        { value: "friends", label: "Лента друзей" },
        { value: "communities", label: "Посты сообществ" },
        { value: "comments", label: "Комментарии к постам" },
        { value: "photos", label: "Фото в ленте" },
        { value: "list", label: "Стены из своего списка" },
      ] },
      { key: "sources", label: "Сообщества и стены", type: "textarea", placeholder: "https://vk.com/club… по одной ссылке — для «Посты сообществ»" },
      { key: "listId", label: "Список людей", type: "lists" },
      { key: "filters", label: "Стоп-слова в тексте", type: "text", placeholder: "вакансия, реклама, розыгрыш" },
      { key: "perHour", label: "Лайков в час", type: "number", placeholder: "15", value: "15", min: 1, max: 40 },
      { key: "perDay", label: "Лайков в сутки", type: "number", placeholder: "40", value: "40", min: 1, max: 80 },
      { key: "window", label: "Окно активности (Москва)", type: "select", options: ["Круглосуточно", "09:00–12:00", "12:00–16:00", "18:00–22:00"] },
    ],
    metrics: ["Лайки", "Просмотры", "Взаимные", "Ошибки"],
  },
  {
    slug: "grabber-vk",
    name: "Граббер постов",
    price: 99,
    group: "vk",
    summary: "Сбор постов из сообществ-конкурентов: текст, вложения, автопостинг к себе.",
    features: ["Источники-сообщества", "Фильтр по ключам", "Очередь на публикацию", "Замена ссылок"],
    fields: [
      { key: "sources", label: "Источники", type: "textarea", placeholder: "https://vk.com/public..." },
      { key: "keys", label: "Ключи включения", type: "text" },
      { key: "dest", label: "Куда публиковать", type: "select", options: ["Личная стена", "Сообщество 1", "Очередь автопостинга"] },
      { key: "replaceUrl", label: "Замена ссылок", type: "text", placeholder: "https://ваш-сайт.ru — подставится вместо ссылок источника" },
    ],
    metrics: ["Собрано", "В очереди", "Опубликовано", "Пропущено"],
  },
  {
    slug: "autoposting-vk",
    name: "Автопостинг",
    price: 149,
    group: "vk",
    summary: "Очередь публикаций в группы и на стены, кросс-постинг и календарь.",
    features: ["Календарь", "Кросс-постинг", "Utm-метки", "Предпросмотр"],
    fields: [
      { key: "destinations", label: "Куда", type: "select", options: ["Личная стена", "Сообщества", "Несколько стен"] },
      { key: "text", label: "Текст поста", type: "textarea" },
      { key: "when", label: "Когда", type: "select", options: ["Сейчас", "Сегодня 18:00", "Завтра 10:00", "По расписанию"] },
      { key: "utmSource", label: "UTM source", type: "text", placeholder: "onlead" },
      { key: "utmMedium", label: "UTM medium", type: "text", placeholder: "vk" },
      { key: "utmCampaign", label: "UTM campaign", type: "text", placeholder: "autopost" },
    ],
    metrics: ["В очереди", "Опубликовано", "Ошибок", "Охват"],
  },
  {
    slug: "congratulation-vk",
    name: "Автопоздравления",
    price: 129,
    group: "vk",
    summary: "Поздравления друзьям в день рождения: на стену (базовый токен) или в ЛС, если есть токен с messages.",
    features: ["Списки именинников", "Стена или ЛС", "Шаблон {name}", "Лимит в сутки"],
    fields: [
      { key: "audience", label: "Аудитория", type: "select", options: ["Друзья", "Подписчики", "Свой список"] },
      {
        key: "text",
        label: "Текст поздравления",
        type: "textarea",
        placeholder: "{name}, с днём рождения! …",
        value:
          "{name}, с днём рождения!\n\n"
          + "Пусть этот год будет как хороший маршрут: меньше пробок, больше открытий и остановок там, где по-настоящему тепло. Здоровья, лёгкости в делах и людей рядом, с которыми хочется делить и радость, и планы.\n\n"
          + "Желаю, чтобы задуманное складывалось будто само собой — и чтобы поводов улыбнуться было больше, чем поводов откладывать.\n\n"
          + "Обнимаю!",
      },
      { key: "channel", label: "Куда отправлять", type: "select", options: ["Авто: ЛС → стена", "Только ЛС", "Только стена"] },
      { key: "time", label: "Время отправки", type: "select", options: ["09:00", "11:00", "18:00"] },
    ],
    metrics: ["Сегодня ДР", "Отправлено", "Ответы", "В друзья"],
  },
  {
    slug: "invite-vk",
    name: "Инвайтинг",
    price: 199,
    group: "vk",
    summary: "Приглашения в сообщество или чат по спискам и фильтрам, с лимитами API.",
    features: ["Списки и парсер", "Лимиты приглашений", "Чёрный список", "Статистика вступлений"],
    fields: [
      { key: "group", label: "Куда приглашать", type: "text", placeholder: "https://vk.com/club..." },
      { key: "list", label: "Кого", type: "select", options: ["Свой список", "Друзья друзей", "Парсинг группы"] },
      { key: "listId", label: "Список получателей", type: "lists" },
      { key: "sourceGroup", label: "Группа-источник", type: "text", placeholder: "https://vk.com/public... (для парсинга)" },
      { key: "perDay", label: "Приглашений в день", type: "number", placeholder: "30" },
      { key: "blacklist", label: "Чёрный список", type: "textarea", placeholder: "id123 или https://vk.com/id123 — по одному на строку" },
    ],
    metrics: ["Приглашено", "Вступили", "Отказы", "Лимит"],
  },
  {
    slug: "autostoris-vk",
    name: "Автосторис",
    price: 149,
    group: "vk",
    summary: "Очередь сторис: картинки, текст, ссылки, публикация по расписанию.",
    features: ["Очередь 9:16", "AI-картинки", "Ссылки и опросы", "Несколько аккаунтов"],
    fields: [
  { key: "groups", label: "Сообщества", type: "textarea", placeholder: "https://vk.com/club... (необязательно — иначе личная страница)" },
      { key: "caption", label: "Подпись", type: "textarea", placeholder: "Текст сторис\n---\nСледующий в очереди (разделитель ---)" },
      { key: "link", label: "Ссылка", type: "text" },
      { key: "poll", label: "Опрос (вопрос + варианты, по строке)", type: "textarea", placeholder: "Что интереснее?\nВариант А\nВариант Б" },
      { key: "when", label: "Публикация", type: "select", options: ["Сейчас", "Каждый день 10:00", "Пн/Ср/Пт 19:00"] },
    ],
    metrics: ["В очереди", "Опубликовано", "Просмотры", "Клики"],
  },
  {
    slug: "broom-vk",
    name: "Веник",
    price: 99,
    group: "vk",
    summary: "Чистка друзей, подписчиков и сообщества от ботов, мёртвых и нецелевых аккаунтов.",
    features: ["Детектор ботов", "Нет аватара / нет постов", "Давность входа", "Белые списки"],
    fields: [
      { key: "scope", label: "Где чистить", type: "select", options: ["Друзья", "Подписчики", "Участники группы"] },
      { key: "rules", label: "Правила", type: "select", options: ["Боты", "Нет фото", "Не заходили 365 дней", "Все эвристики"] },
    ],
    metrics: ["Проверено", "Ботов", "Удалено", "В белом списке"],
  },
  {
    slug: "chat-manager-vk",
    name: "Менеджер чатов",
    price: 199,
    group: "vk",
    summary: "Несколько бесед в одном окне: автоответы, модерация, приветствия.",
    features: ["Единый инбокс", "Автоответы", "Кик по правилам", "Приветствие новичков"],
    fields: [
      { key: "chats", label: "Чаты", type: "textarea", placeholder: "Ссылки на беседы" },
      { key: "welcome", label: "Приветствие", type: "textarea", placeholder: "{name}, добро пожаловать!" },
      { key: "rules", label: "Автомодерация", type: "select", options: ["Выкл", "Ссылки", "Спам-слова", "Строгая"] },
      { key: "kick", label: "Кик нарушителей", type: "select", options: ["Выкл", "После спама"] },
    ],
    metrics: ["Чатов", "Автоответы", "Приветствия", "Модерация", "Киков"],
  },
  {
    slug: "group-manager-vk",
    name: "Менеджер групп",
    price: 99,
    group: "vk",
    summary: "Несколько сообществ из одного кабинета: заявки, редакторы, базовые настройки.",
    features: ["Заявки на вступление", "Роли редакторов", "Чёрный список", "Статус группы"],
    fields: [
      { key: "groups", label: "Сообщества", type: "textarea" },
      { key: "autoJoin", label: "Заявки", type: "select", options: ["Вручную", "Авто-одобрение", "По списку"] },
      { key: "list", label: "Белый список (для «По списку»)", type: "lists" },
      { key: "blacklist", label: "Чёрный список", type: "lists" },
      { key: "groupAccess", label: "Статус группы", type: "select", options: ["Не менять", "Открытая", "Закрытая", "Приватная"] },
      { key: "editors", label: "Редакторы", type: "textarea", placeholder: "https://vk.com/id123 — редактор\nhttps://vk.com/id456 — модератор" },
    ],
    metrics: ["Групп", "Заявки", "Одобрено", "Редакторы"],
  },
  {
    slug: "lists",
    name: "Мои списки",
    price: 0,
    group: "parsers",
    summary: "Сегменты аудитории из парсеров: открыть, скопировать ID, отправить в CRM или в воронку.",
    features: ["Все собранные сегменты", "Карточка человека со ссылкой VK", "Копирование ID", "Передача в CRM"],
    fields: [],
    metrics: ["Списков", "Людей", "В CRM", "Экспорт"],
  },
  {
    slug: "parsing-accounts-vk",
    name: "Парсинг аккаунтов",
    price: 99,
    group: "parsers",
    summary: "Поиск людей ВКонтакте по городу, возрасту, полу и интересам. Результат сохраняется в «Мои списки».",
    features: ["Город и возраст", "Пол и интересы", "Активность", "Экспорт в списки и CRM"],
    fields: [],
    metrics: ["Найдено", "Списков", "В CRM", "Запусков"],
  },
  {
    slug: "parsing-groups-vk",
    name: "Парсинг групп",
    price: 99,
    group: "parsers",
    summary: "Сбор участников сообщества с фильтром по полу и городу. Список можно сразу отдать в инвайтинг или лид-менеджер.",
    features: ["Подписчики сообщества", "Фильтр пол / город", "До 1000 профилей за запуск", "Сохранение в «Мои списки»"],
    fields: [],
    metrics: ["Собрано", "Списков", "В CRM", "Запусков"],
  },
];

OnLead.tool = (slug) => OnLead.TOOLS.find((t) => t.slug === slug);

OnLead.NICHES = [
  { id: "dentistry", title: "Стоматология", phrases: ["ищу стоматолога", "нужен стоматолог", "посоветуйте стоматологию", "лечение зубов", "имплантация зубов"] },
  { id: "beauty", title: "Салон красоты", phrases: ["ищу мастера маникюра", "нужен парикмахер", "посоветуйте салон красоты", "запись на брови", "ламинирование ресниц"] },
  { id: "autoservice", title: "Автосервис", phrases: ["ищу автосервис", "нужен автомеханик", "посоветуйте СТО", "диагностика автомобиля", "ремонт ходовой"] },
  { id: "construction", title: "Ремонт и стройка", phrases: ["нужен ремонт", "ищу бригаду", "ремонт квартир", "отделка под ключ", "дизайн проект"] },
  { id: "cafe", title: "Кафе", phrases: ["где поесть", "посоветуйте кафе", "банкет на", "доставка еды", "бизнес-ланч"] },
  { id: "lawyer", title: "Юрист", phrases: ["нужен юрист", "юридическая консультация", "составить договор", "защита в суде", "трудовой спор"] },
  { id: "realtor", title: "Недвижимость", phrases: ["купить квартиру", "снять квартиру", "продать квартиру", "ипотека", "новостройка"] },
];

OnLead.FAQ = [
  { q: "Насколько это безопасно для страницы?", a: "Работа идёт через официальные методы API ВКонтакте. Темп действий настраивается под лимиты, чтобы снизить риск ограничений. С 2021 года платформа живёт в этом режиме." },
  { q: "Сколько VK-аккаунтов можно подключить?", a: "Несколько. Каждый аккаунт настраивается отдельно и может работать с разными инструментами. Слоты зависят от тарифа и докупаются." },
  { q: "Сколько стоит сервис?", a: "Пакеты: Business 390 ₽/мес, Maxi ИИ 469 ₽/мес, Maxi 649 ₽/мес. Периоды 1 / 3 / 6 месяцев со скидкой. Инструменты подключаются и поштучно." },
  { q: "Есть ли демо?", a: "Новым пользователям все инструменты открыты на 72 часа без карты. После триала оставляете только нужное." },
  { q: "Можно ли настроить под нишу?", a: "Фильтры парсинга, шаблоны, расписание, стиль ИИ — всё гибко. На бизнес-тарифе есть API." },
  { q: "Что умеет ИИ?", a: "Лид-менеджер с диалогом и скорингом, нейрокомментарии, генератор картинок, вариации сообщений и подсказки в настройках." },
];

OnLead.LANDING_FIELDS = [
  { id: "name", label: "Имя", type: "text", ph: "Как к вам обращаться" },
  { id: "phone", label: "Телефон", type: "tel", ph: "+7 900 000-00-00" },
  { id: "email", label: "Email", type: "email", ph: "you@mail.ru" },
  { id: "comment", label: "Комментарий", type: "textarea", ph: "Коротко о задаче" },
];

OnLead.LANDING_LAYOUTS = [
  { id: "studio", label: "Студия — спокойная запись" },
  { id: "salon", label: "Салон — фото и форма" },
  { id: "stage", label: "Сцена — билет на эфир" },
  { id: "school", label: "Школа — программа курса" },
  { id: "portrait", label: "Портрет — эксперт" },
  { id: "chat", label: "Чат — заявка в VK" },
  { id: "packs", label: "Пакеты — прайс" },
  { id: "listing", label: "Объект — недвижимость" },
  { id: "gym", label: "Зал — фитнес" },
  { id: "garage", label: "Гараж — авто" },
  { id: "paper", label: "Бланк — коммерческое" },
  { id: "poster", label: "Афиша — событие" },
];

OnLead.LANDING_TEMPLATES = [
  {
    id: "consult",
    name: "Консультация специалиста",
    niche: "Услуги",
    badge: "Хит",
    layout: "studio",
    tone: "teal",
    kicker: "личная встреча",
    headline: "Разберём задачу за одну встречу",
    sub: "Спокойный разбор без продажи «пакета на год». Уйдёте с планом на ближайшие две недели.",
    cta: "Записаться",
    formTitle: "Выберите удобный слот",
    features: ["30 минут один на один", "План следующих шагов на бумаге", "Онлайн или в студии"],
    fields: ["name", "phone", "comment"],
    stats: [{ n: "30 мин", l: "встреча" }, { n: "12+", l: "ниш" }, { n: "24 ч", l: "ответ" }],
    meta: { duration: "30 минут", place: "онлайн / студия", when: "пн–сб" },
  },
  {
    id: "beauty",
    name: "Салон и мастер",
    niche: "Красота",
    layout: "salon",
    tone: "rose",
    kicker: "запись к мастеру",
    headline: "Цвет, стрижка и уход без очереди у зеркала",
    sub: "Свободные окна на этой неделе. Пришлите фото — подскажем, сколько времени заложить.",
    cta: "Хочу окно",
    formTitle: "Записаться",
    features: ["Диагностика волос в начале", "Фиксируем время в WhatsApp", "Чай и плед, пока красится"],
    fields: ["name", "phone", "comment"],
    stats: [{ n: "4.9", l: "рейтинг" }, { n: "7 лет", l: "в деле" }, { n: "40 мин", l: "средний визит" }],
    quote: "Не стригу «как получится»: сначала смотрим лицо, плотность и как носите волосы в обычной жизни.",
    author: "Мария, колорист",
  },
  {
    id: "webinar",
    name: "Живой вебинар",
    niche: "Обучение",
    layout: "stage",
    tone: "gold",
    kicker: "открытый эфир",
    headline: "Как собирать заявки из VK, не сжигая аккаунт",
    sub: "Разбор воронки в прямом эфире: от парсинга до первого диалога. Места ограничены — запись уйдёт только тем, кто был.",
    cta: "Занять место",
    formTitle: "Регистрация на эфир",
    features: ["60 минут без воды", "Запись на почту после эфира", "Разбор 2 ниш из чата"],
    fields: ["name", "phone", "email"],
    steps: [
      { t: "19:00", d: "Как выглядит тёплая заявка в комментариях" },
      { t: "19:25", d: "Какие лимиты VK реально держат" },
      { t: "19:45", d: "Ответы на вопросы из чата" },
    ],
    meta: { when: "чт 19:00 МСК", duration: "60 минут", place: "онлайн" },
  },
  {
    id: "course",
    name: "Практический курс",
    niche: "Обучение",
    layout: "school",
    tone: "ink",
    kicker: "14 дней практики",
    headline: "Система лидов из ВКонтакте — не набор роликов",
    sub: "Каждый день одно действие: список, касание, диалог, сделка. К концу второй недели воронка уже крутится без вас.",
    cta: "Хочу программу",
    formTitle: "Получить программу",
    features: ["14 уроков по 15 минут", "Шаблоны сообщений под нишу", "Разбор вашей воронки"],
    fields: ["name", "phone", "email"],
    steps: [
      { t: "Дни 1–4", d: "Сбор аудитории и чистые списки" },
      { t: "Дни 5–9", d: "Прогрев, сторис и первое касание" },
      { t: "Дни 10–14", d: "Диалог, скоринг и CRM" },
    ],
    stats: [{ n: "14", l: "уроков" }, { n: "3", l: "шаблона" }, { n: "1", l: "разбор" }],
  },
  {
    id: "coach",
    name: "Страница эксперта",
    niche: "Эксперт",
    layout: "portrait",
    tone: "sand",
    kicker: "наставничество",
    headline: "Помогу собрать первую пачку заявок без хаоса в директ",
    sub: "Работаю с теми, кто уже что-то продаёт, но заявки приходят «как повезёт». Спокойный тон, конкретные шаги.",
    cta: "Написать мне",
    formTitle: "Коротко о задаче",
    features: ["Созвон 40 минут", "Разбор текущего трафика", "Один приоритет на месяц"],
    fields: ["name", "phone", "comment"],
    quote: "Не обещаю «сто заявок за неделю». Обещаю, что перестанете писать всем подряд и начнёте закрывать тех, кто уже тёплый.",
    author: "Артём, стратег",
    stats: [{ n: "6 лет", l: "в VK" }, { n: "40+", l: "проектов" }, { n: "1", l: "фокус" }],
  },
  {
    id: "vk-lead",
    name: "Заявка в сообщения VK",
    niche: "VK",
    layout: "chat",
    tone: "blue",
    kicker: "диалог в VK",
    headline: "Оставьте номер — напишем в сообщения сообщества",
    sub: "Без холодных звонков. Менеджер продолжит разговор там, где вам удобно читать: в VK.",
    cta: "Написать в VK",
    formTitle: "Куда написать",
    features: ["Ответ в рабочие часы", "Можно сразу прислать ссылку на профиль", "Переписка остаётся у вас"],
    fields: ["name", "phone"],
    steps: [
      { t: "Вы", d: "Оставляете имя и телефон на этой странице" },
      { t: "Мы", d: "Пишем в VK в течение рабочего дня" },
      { t: "Дальше", d: "Считаем задачу и предлагаем слот" },
    ],
  },
  {
    id: "price",
    name: "Прайс пакетов",
    niche: "Продажи",
    layout: "packs",
    tone: "green",
    kicker: "прозрачные пакеты",
    headline: "Выберите объём — посчитаем, сколько заявок реально вытянуть",
    sub: "Без «индивидуально от». Три понятных контура. Триал 72 часа, если ещё не пробовали кабинет.",
    cta: "Получить расчёт",
    formTitle: "Какой пакет смотрите",
    features: ["Пакеты на 1 / 3 / 6 месяцев", "Можно подключить поштучно", "Триал 72 часа"],
    fields: ["name", "phone", "comment"],
    prices: [
      { name: "Старт", price: "9 900 ₽", note: "Один источник и ручной диалог" },
      { name: "Система", price: "19 900 ₽", note: "Парсинг + прогрев + CRM" },
      { name: "Агентство", price: "39 900 ₽", note: "Несколько проектов и отчёт" },
    ],
  },
  {
    id: "realty",
    name: "Квартира / объект",
    niche: "Недвижимость",
    layout: "listing",
    tone: "slate",
    kicker: "показ на этой неделе",
    headline: "Светлая двушка у парка — без агентской карусели",
    sub: "Собственник на связи. Показ в удобный слот, документы готовы, торг по сроку сделки — да.",
    cta: "Записаться на показ",
    formTitle: "Когда удобно приехать",
    features: ["Кухня-гостиная 22 м²", "Окна во двор, не на трассу", "Ипотека и материнский капитал"],
    fields: ["name", "phone", "comment"],
    stats: [{ n: "54 м²", l: "площадь" }, { n: "2/9", l: "этаж" }, { n: "2018", l: "дом" }],
    meta: { place: "центр, 8 мин до метро", when: "показы ежедневно", duration: "20 минут" },
  },
  {
    id: "fitness",
    name: "Зал и персоналки",
    niche: "Фитнес",
    layout: "gym",
    tone: "night",
    kicker: "набор в группу",
    headline: "Сила и мобильность. Без крика и вечных кардио-кругов",
    sub: "Малые группы до 8 человек. Сначала тест, потом программа. Первый блок — 4 недели, чтобы увидеть цифры, а не «ощущения».",
    cta: "На пробную",
    formTitle: "Записаться на тест",
    features: ["Тест формы в первый визит", "Группы утром и вечером", "Зал с нормальным воздухом"],
    fields: ["name", "phone"],
    stats: [{ n: "8", l: "в группе" }, { n: "4 нед", l: "первый блок" }, { n: "6:30", l: "ранний слот" }],
    meta: { duration: "55 минут", place: "зал на первом", when: "пн / ср / пт" },
  },
  {
    id: "auto",
    name: "Авто с пробегом",
    niche: "Авто",
    layout: "garage",
    tone: "wine",
    kicker: "подбор под ключ",
    headline: "Найдём машину, на которой не придётся чинить чужие сюрпризы",
    sub: "Диагностика до сделки, история, торг с продавцом. Вы приезжаете уже на проверенный вариант — не на «смотрите объявление».",
    cta: "Оставить запрос",
    formTitle: "Какой авто ищите",
    features: ["Проверка на подъёмнике", "Отчёт по истории", "Сопровождение сделки"],
    fields: ["name", "phone", "comment"],
    prices: [
      { name: "Осмотр", price: "4 500 ₽", note: "Один конкретный автомобиль" },
      { name: "Подбор", price: "19 000 ₽", note: "До 5 вариантов под бюджет" },
      { name: "Под ключ", price: "39 000 ₽", note: "От поиска до постановки" },
    ],
    meta: { place: "город и область", duration: "3–10 дней", when: "ежедневно" },
  },
  {
    id: "offer",
    name: "Коммерческое предложение",
    niche: "Документы",
    layout: "paper",
    tone: "cream",
    kicker: "для ИП и ООО",
    headline: "КП на автоматизацию ВКонтакте — без созвона-робота",
    sub: "На почту придёт PDF: что внедряем, сроки, стоимость контура. Если не подойдёт — просто не отвечаете.",
    cta: "Запросить КП",
    formTitle: "Куда отправить PDF",
    features: ["Срок — 1 рабочий день", "Реквизиты и объём в одном файле", "Можно без звонка"],
    fields: ["name", "phone", "email", "comment"],
    steps: [
      { t: "Сегодня", d: "Коротко пишете задачу и объём" },
      { t: "Завтра", d: "Присылаем PDF с составом работ" },
      { t: "Дальше", d: "Согласовываете или откладываете" },
    ],
  },
  {
    id: "event",
    name: "Афиша события",
    niche: "Мероприятия",
    layout: "poster",
    tone: "gold",
    kicker: "закрытая встреча",
    headline: "Вечер разборов: живые воронки, не слайды",
    sub: "Два часа в зале. Три разбора с места. Без трансляции — кто не пришёл, тот читает конспект.",
    cta: "Забронировать место",
    formTitle: "Бронь",
    features: ["До 24 гостей", "Фуршет после", "Конспект на почту"],
    fields: ["name", "phone", "email"],
    meta: { when: "сб 18:00", place: "лофт в центре", duration: "2 часа" },
    stats: [{ n: "24", l: "места" }, { n: "3", l: "разбора" }, { n: "18:00", l: "старт" }],
  },
];

OnLead.landingTemplate = (id) => OnLead.LANDING_TEMPLATES.find((t) => t.id === id) || null;
OnLead.landingNiches = () => [...new Set(OnLead.LANDING_TEMPLATES.map((t) => t.niche))];

OnLead.TG_PERIODS = [
  { id: 1, label: "1 месяц", discount: 0 },
  { id: 3, label: "3 месяца −6%", discount: 0.06 },
  { id: 6, label: "6 месяцев −8%", discount: 0.08 },
  { id: 12, label: "12 месяцев −10%", discount: 0.1 },
];

OnLead.TG_PLANS = [
  { id: "start", name: "Старт", price: 490, lite: 1, pro: 0, hint: "Одна воронка на один продукт", blurb: "Воронка Lite: цифровой продукт, чек вручную, бот и конструктор разделов." },
  { id: "business", name: "Бизнес", price: 1190, lite: 3, pro: 0, hint: "Три воронки под продукты и трафик", blurb: "Три слота Lite — дешевле трёх «Стартов».", hit: true },
  { id: "agency", name: "Агентство", price: 2990, lite: 10, pro: 0, hint: "Десять воронок для клиентских проектов", blurb: "Слот выходит 299 ₽ вместо 490 ₽." },
  { id: "pro", name: "Pro", price: 1490, lite: 2, pro: 1, hint: "Закрытый канал + две обычные воронки", blurb: "Pro выдаёт доступ в канал на срок. Плюс две Lite." },
  { id: "pro-max", name: "Pro Max", price: 3490, lite: 5, pro: 3, hint: "Три закрытых канала и пять Lite", blurb: "Для тех, кто продаёт подписки системно." },
];

OnLead.TG_SCENARIOS = [
  {
    id: "product", kind: "lite", name: "Разовый товар",
    blurb: "Бот продаёт продукт, просит чек, вы подтверждаете.",
    sections: [
      { title: "Старт", text: "Здравствуйте! Я помогу оформить заказ. Нажмите «Каталог».", buttons: "Каталог" },
      { title: "Оффер", text: "Коротко о продукте и что получите после оплаты.", buttons: "Купить, Задать вопрос" },
      { title: "Оплата", text: "Переведите сумму и пришлите скрин чека — подтвердим вручную.", buttons: "Я оплатил" },
      { title: "Выдача", text: "Оплата принята. Вот доступ к материалу.", buttons: "В начало" },
    ],
  },
  {
    id: "course", kind: "lite", name: "Инфопродукт / курс",
    blurb: "Программа, цена, чек, выдача уроков.",
    sections: [
      { title: "Старт", text: "Добро пожаловать на курс. Посмотрите программу и тариф.", buttons: "Программа, Купить" },
      { title: "Программа", text: "Модули и сроки. После оплаты откроем кабинет уроков.", buttons: "Купить, Назад" },
      { title: "Оплата", text: "Оплатите и пришлите чек. Проверим в течение рабочего дня.", buttons: "Я оплатил" },
    ],
  },
  {
    id: "guide", kind: "lite", name: "Гайд / чек-лист",
    blurb: "Короткий оффер и моментальная выдача файла после подтверждения.",
    sections: [
      { title: "Старт", text: "Гайд в PDF. Оплата → чек → ссылка на файл.", buttons: "Получить гайд" },
      { title: "Оплата", text: "Пришлите скрин перевода — вышлем ссылку.", buttons: "Чек отправлен" },
    ],
  },
  {
    id: "access", kind: "lite", name: "Доступ к материалам",
    blurb: "Разовая оплата за папку, таблицу или Notion.",
    sections: [
      { title: "Старт", text: "Доступ к материалам навсегда после подтверждения оплаты.", buttons: "Оплатить" },
      { title: "Выдача", text: "Ссылка на папку. Сохраните её.", buttons: "Открыть материалы" },
    ],
  },
  {
    id: "order", kind: "lite", name: "Приём заказов",
    blurb: "Клиент описывает задачу, вы считаете и подтверждаете.",
    sections: [
      { title: "Старт", text: "Опишите задачу одним сообщением — посчитаем и пришлём счёт.", buttons: "Оставить заявку" },
      { title: "Заявка", text: "Приняли. Ответим в рабочее время с ценой и сроком.", buttons: "В начало" },
    ],
  },
  {
    id: "channel", kind: "pro", name: "Подписка на закрытый канал",
    blurb: "Бот выдаёт ссылку-приглашение и закрывает доступ по сроку.",
    sections: [
      { title: "Старт", text: "Закрытый канал на выбранный срок. После оплаты — персональная ссылка.", buttons: "Тарифы" },
      { title: "Тарифы", text: "30 / 90 / 180 дней. Оплатите и пришлите чек.", buttons: "30 дней, 90 дней" },
      { title: "Доступ", text: "Ссылка одноразовая. По истечении срока бот исключит из канала.", buttons: "Открыть канал" },
    ],
  },
];

OnLead.tgScenario = (id) => OnLead.TG_SCENARIOS.find((s) => s.id === id) || null;
OnLead.tgPlan = (id) => OnLead.TG_PLANS.find((p) => p.id === id) || null;
OnLead.tgPrice = (plan, months) => {
  const m = Math.max(1, Number(months || 1));
  const disc = m >= 12 ? 0.1 : m >= 6 ? 0.08 : m >= 3 ? 0.06 : 0;
  return Math.round(Number(plan.price || 0) * m * (1 - disc));
};
