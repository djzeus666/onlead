window.OnLead = window.OnLead || {};

const $ = (sel, root = document) => root.querySelector(sel);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c] || c);

function icon(name) {
  const p = 'width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const map = {
    home: `<path d="M3 10.5 8 4l5 6.5V16H3z"/><path d="M6.5 16v-4h3v4"/>`,
    book: `<path d="M4 4h6v12H4zM10 4h6v12h-6"/><path d="M10 4v12"/>`,
    users: `<circle cx="6" cy="7" r="2.2"/><path d="M2.8 13c.4-2 1.8-3 3.2-3s2.8 1 3.2 3"/><circle cx="11.2" cy="7.2" r="1.8"/><path d="M10 13c.3-1.4 1.3-2.2 2.4-2.2"/>`,
    layers: `<path d="M8 3 14 6.5 8 10 2 6.5z"/><path d="M2 9.5 8 13l6-3.5"/><path d="M2 12.5 8 16l6-3.5"/>`,
    kanban: `<rect x="3" y="3" width="10" height="10" rx="1.5"/><path d="M3 7h10M7 7v6"/>`,
    spark: `<path d="M8 2v3M8 11v3M3.2 4.2l2.1 2.1M10.7 9.7l2.1 2.1M2 8h3M11 8h3M3.2 11.8l2.1-2.1M10.7 6.3l2.1-2.1"/>`,
    search: `<circle cx="7" cy="7" r="3.2"/><path d="M9.4 9.4 13 13"/>`,
    chat: `<path d="M3 12.5V4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v5A1.5 1.5 0 0 1 11.5 11H6z"/>`,
    heart: `<path d="M8 13.2S3 10 3 6.8A2.6 2.6 0 0 1 8 5.2 2.6 2.6 0 0 1 13 6.8C13 10 8 13.2 8 13.2z"/>`,
    send: `<path d="M3 8 13 3 8 13 7 9z"/>`,
    story: `<rect x="5" y="2.5" width="6" height="11" rx="2"/><path d="M3.5 5v6M12.5 5v6"/>`,
    grab: `<rect x="3" y="3" width="10" height="10" rx="1.5"/><path d="M6 3v10M3 7h10"/>`,
    image: `<rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><circle cx="6" cy="7" r="1"/><path d="M4 11.5 7 8.5l2 2 1.5-1.5 2.5 2.5"/>`,
    invite: `<circle cx="6" cy="6.5" r="2"/><path d="M2.8 13c.4-2 1.8-3 3.2-3s2.8 1 3.2 3M11 6v5M8.5 8.5H13.5"/>`,
    broom: `<path d="M5 14 9 4l3 1-4 9zM4 14h8"/><path d="M9 4c1-2 3-2 4 0"/>`,
    wallet: `<rect x="2" y="5" width="12" height="8" rx="1.5"/><path d="M2 8h12"/><circle cx="11" cy="10.2" r=".8"/>`,
    gift: `<rect x="3" y="7" width="10" height="7" rx="1"/><path d="M8 7v7M3 10h10M8 7c-2-3-4-1-2.5 0S8 7 8 7c2-3 4-1 2.5 0S8 7 8 7"/>`,
    rocket: `<path d="M9.5 2.5c2 2.2 3 5 2.2 7.2L10 11l-2.5-2.5 1.3-1.7C9.6 5 9.4 3.6 9.5 2.5z"/><path d="M7.2 8.2 3.5 13.5 8.8 9.8"/><path d="M5.2 10.8c-1.2.2-2.2 1-2.7 2.2 1.2-.4 2.1-1.4 2.4-2.5z"/>`,
    chevron: `<path d="M6 4.5 10 8 6 11.5"/>`,
    globe: `<circle cx="8" cy="8" r="5.2"/><path d="M3 8h10M8 3c1.6 1.8 2.4 3.4 2.4 5S9.6 11.2 8 13C6.4 11.2 5.6 9.6 5.6 8S6.4 4.8 8 3z"/>`,
    list: `<path d="M3 4.5h10M3 8h10M3 11.5h10"/><circle cx="3" cy="4.5" r=".7" fill="currentColor"/><circle cx="3" cy="8" r=".7" fill="currentColor"/><circle cx="3" cy="11.5" r=".7" fill="currentColor"/>`,
    mail: `<rect x="2.5" y="4" width="11" height="8" rx="1.4"/><path d="M3 5.2 8 8.4 13 5.2"/>`,
    paper: `<path d="M5 3h5l3 3v7.5A1.5 1.5 0 0 1 11.5 15h-6A1.5 1.5 0 0 1 4 13.5V4.5A1.5 1.5 0 0 1 5.5 3z"/><path d="M10 3v3h3"/>`,
    user: `<circle cx="8" cy="6" r="2.2"/><path d="M3 14c.6-2.4 2.2-3.5 5-3.5s4.4 1.1 5 3.5"/>`,
    chart: `<path d="M3 13V8M6 13V5M9 13V7M12 13V3"/>`,
    settings: `<circle cx="8" cy="8" r="2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M12.2 3.8l-1 1M4.8 11.2l-1 1"/>`,
    edit: `<path d="M11 3.5 12.5 5 6 11.5 3.5 12 4 9.5z"/><path d="M10 4.5 11.5 6"/>`,
    menu: `<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>`,
    plus: `<path d="M8 3.5v9M3.5 8h9"/>`,
  };
  return `<svg ${p} viewBox="0 0 16 16">${map[name] || map.home}</svg>`;
}

function confirmDel(name) {
  return confirm(`Удалить «${name}»? Это нельзя отменить.`);
}

function brandLogo(href, extra = "") {
  return `<a class="logo ${extra}" href="${href}"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span></a>`;
}

async function onOfficeChange(e) {
  const alSource = e.target.closest('input[name="al-source"]');
  if (alSource) {
    try {
      await OnLead.api("/api/ai-lead", { method: "PATCH", body: { source: alSource.value } });
      await render();
    } catch (err) {
      alert(err.message);
    }
    return;
  }
  const sel = e.target.closest("select[data-act]");
  if (!sel) return;
  const act = sel.dataset.act;
  try {
    if (act === "lead-stage") {
      await OnLead.api("/api/leads/" + sel.dataset.id, { method: "PATCH", body: { stage: sel.value } });
      await render();
    }
    if (act === "crm-stage") {
      await OnLead.patchCrmLead(sel.dataset.id, { stage: sel.value });
      await render();
    }
    if (act === "crm-assignee") {
      await OnLead.patchCrmLead(sel.dataset.id, { assigneeUserId: sel.value || null });
      await render();
    }
  } catch (err) {
    alert(err.message);
  }
}

function captureRef() {
  const fromPath = location.pathname.match(/^\/r\/([A-Za-z0-9_-]+)/i);
  const hash = location.hash.replace(/^#/, "");
  const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : String(location.search || "").replace(/^\?/, "");
  const fromQuery = new URLSearchParams(q).get("ref");
  const code = String(fromPath?.[1] || fromQuery || "").trim().toUpperCase();
  if (code) {
    try { sessionStorage.setItem("onlead-ref", code); } catch { /* ignore */ }
  }
  try { return code || sessionStorage.getItem("onlead-ref") || ""; }
  catch { return code; }
}

OnLead.mount = function () {
  OnLead.health = OnLead.health || {
    mocksAllowed: !/m360-ural\.online$/i.test(location.hostname),
    telegramLive: false,
  };
  fetch("/api/health").then((r) => r.json()).then((h) => {
    OnLead.health = h;
    const p = (location.hash.replace(/^#/, "") || "/");
    if (/^\/(privacy|offer|consent)\b/.test(p)) render();
  }).catch(() => {});
  const ref = captureRef();
  if (/^\/r\/[A-Za-z0-9_-]+/i.test(location.pathname)) {
    location.replace(`${location.origin}/#/register?ref=${encodeURIComponent(ref)}`);
    return;
  }
  const paid = new URLSearchParams(location.search).get("paid");
  if (paid === "1") {
    try { sessionStorage.setItem("onlead-paid", "1"); } catch { /* ignore */ }
    history.replaceState({}, "", `${location.pathname}#/office/balance`);
  }
  window.addEventListener("hashchange", render);
  window.addEventListener("message", onVkOAuthMessage);
  document.addEventListener("click", (e) => {
    const menu = document.querySelector("details.pub-menu[open]");
    if (!menu) return;
    if (e.target.closest(".pub-sheet a") || !menu.contains(e.target)) {
      menu.removeAttribute("open");
    }
  });
  if (!location.hash) location.hash = "#/";
  render();
};

let renderSeq = 0;

function isPaidReturn() {
  try { if (sessionStorage.getItem("onlead-paid") === "1") return true; } catch { /* ignore */ }
  if (!location.hash.includes("?")) return false;
  return new URLSearchParams(location.hash.slice(location.hash.indexOf("?") + 1)).get("paid") === "1";
}

function paintOfficeBalance() {
  const state = OnLead.load();
  const bal = document.querySelector(".lk-bal");
  if (bal && state) bal.textContent = `${Number(state.balance || 0).toLocaleString("ru-RU")} ₽`;
}

function setDocShell(path) {
  const lk = String(path || "").startsWith("/office");
  const auth = ["/login", "/register", "/verify-email", "/forgot", "/reset-password"].includes(path);
  document.body.classList.toggle("is-lk", lk);
  document.body.classList.toggle("is-auth", auth);
}

function userInitials(user) {
  const name = String(user?.name || user?.email || "U").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function greetWord() {
  const h = new Date().getHours();
  if (h < 5 || h >= 22) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function tickPromoCountdown() {
  if (window._promoTick) clearInterval(window._promoTick);
  const el = document.querySelector("[data-promo-until]");
  if (!el) return;
  window._promoTick = setInterval(() => {
    const until = Number(el.dataset.promoUntil || 0);
    if (!until) return;
    el.textContent = fmtCountdown(until);
    if (until <= Date.now()) clearInterval(window._promoTick);
  }, 30000);
}

function academyLessons() {
  return [
    {
      title: "Подключить VK",
      teaser: "Токен через blank.html, слоты и сообщества",
      mins: 4,
      href: "#/office/accounts",
      cta: "Открыть аккаунты",
      shot: "img/academy/accounts.svg",
      caption: "Раздел «Аккаунты VK»: получение токена и список подключённых страниц",
      steps: [
        { t: "Откройте «Аккаунты»", d: "В верхней панели нажмите «Аккаунты». Без живого VK ни парсер, ни лидогенератор, ни нейрокомментарии не стартуют." },
        { t: "Получите токен", d: "Кнопка «Получить токен VK» откроет вход в приложение 5530956. После разрешения VK покажет пустую страницу blank.html — скопируйте весь адрес из строки браузера, в нём будет access_token." },
        { t: "Вставьте URL и подключите", d: "Вставьте скопированную ссылку (или сам токен) в поле и нажмите «Подключить». Появятся имя, id и сообщества, где вы администратор." },
        { t: "Проверьте слот", d: "Сверху видно, сколько аккаунтов занято из доступных по тарифу. Отключить лишний можно кнопкой на карточке." },
      ],
    },
    {
      title: "Парсинг аккаунтов",
      teaser: "Город, возраст, интересы → список людей",
      mins: 5,
      href: "#/office/tools/parsing-accounts-vk",
      cta: "Открыть парсер",
      shot: "img/academy/parser.svg",
      caption: "Форма парсинга: фильтры аудитории слева, что попадёт в «Мои списки» — справа",
      steps: [
        { t: "Выберите аккаунт", d: "Сервис живёт в меню «Сервисы» → «Парсинг аккаунтов». В форме укажите, с какого VK-аккаунта собирать." },
        { t: "Сузьте выдачу", d: "Город, возраст, пол, интересы и «были онлайн» отсекают мёртвые анкеты. Не ставьте 1000 сразу: 100–300 за проход безопаснее." },
        { t: "Соберите список", d: "«Собрать список» кладёт людей в «Мои списки». Оттуда их забирают лидогенератор, инвайтинг и AI Лид-менеджер." },
        { t: "Не запускайте сразу массовые действия", d: "После парсинга дайте аккаунту обычную активность. Массовые действия в тот же час повышают риск ограничений VK." },
      ],
    },
    {
      title: "Лидогенератор",
      teaser: "Фразы «ищу / нужен» в постах сообществ",
      mins: 7,
      href: "#/office/tools/leadgen-vk",
      cta: "Открыть лидогенератор",
      shot: "img/academy/leadgen.svg",
      caption: "Скан: настройки и фразы слева, сообщества аккаунта справа, совпадения — ниже",
      steps: [
        { t: "Это не рассылка", d: "Лидогенератор читает стены сообществ, где вы уже состоите, и ищет заявки вроде «ищу мастера». В личку сам не пишет — для диалога есть AI Лид-менеджер." },
        { t: "Фразы и ниши", d: "Добавьте свои формулировки или нажмите готовую нишу. Стоп-слова отсекают мусор («работа», «вакансия», если вам это не нужно)." },
        { t: "Сообщества", d: "«Загрузить из VK» подтянет группы аккаунта. Отметьте 5–20 тематических, сохраните список. Скан по всей ленте даёт шум." },
        { t: "Запуск и CRM", d: "«Сканировать сейчас» или интервал по расписанию. Горячие совпадения кнопкой «В CRM» попадают на доску сделок." },
      ],
    },
    {
      title: "Воронка в CRM",
      teaser: "Доска: новые → диалог → тёплые → сделка",
      mins: 4,
      href: "#/office/crm",
      cta: "Открыть CRM",
      shot: "img/academy/crm.svg",
      caption: "Бесплатная CRM: счётчики сверху, колонки этапов, карточка лида с источником и скорингом",
      steps: [
        { t: "Откуда лиды", d: "CRM бесплатна. Карточки приходят из лидогенератора, AI Лид-менеджера, лендингов и кнопки «Новый лид»." },
        { t: "Доска или список", d: "Переключатель «Доска / Список / Архив». На доске четыре этапа. Этап меняется в карточке — без отдельного меню." },
        { t: "Карточка", d: "Имя, город, телефон, заметка, скоринг. Скрытые совпадения лидогенератора на доску не попадают — их возвращают фильтром «Скрытые»." },
        { t: "Архив", d: "Закрытые или лишние — в архив. Удаление необратимо, возврат из архива — кнопкой «Вернуть»." },
      ],
    },
    {
      title: "AI Лид-менеджер",
      teaser: "Оффер, тон, порог скоринга, диалог от вашего имени",
      mins: 6,
      href: "#/office/tools/ai-lead-vk",
      cta: "Открыть AI Лид-менеджер",
      shot: "img/academy/ai.svg",
      caption: "Запуск задачи: источник аудитории, тон, оффер и порог, с которого лид едет в CRM",
      steps: [
        { t: "Источник", d: "Подписчики групп, рекомендации VK или свой список из парсера. Ссылки на сообщества — по одной на строку." },
        { t: "Оффер одной фразой", d: "Что человек должен сделать и зачем: «запись на консультацию», «демо курса». Размытый оффер даёт пустые диалоги." },
        { t: "Тон «как вы пишете»", d: "Шаблонный «продающий» чаще ловит жалобы. Деловой или дружеский — под нишу." },
        { t: "Порог в CRM", d: "7+ или 8+ отправляет только тёплых. Ниже — остаются в задачах инструмента, доску не засоряют. Лимит в сутки держите скромным." },
      ],
    },
    {
      title: "Нейрокомментарии",
      teaser: "3–8 сообществ, тон, лимит в сутки",
      mins: 4,
      href: "#/office/tools/neurocomment-vk",
      cta: "Открыть нейрокомментарии",
      shot: "img/academy/neuro.svg",
      caption: "Задача: сообщества, темы, тон комментария и суточный лимит",
      steps: [
        { t: "Узкий список сообществ", d: "3–8 целевых пабликов, не вся лента. Иначе комментарии уезжают мимо темы." },
        { t: "Темы и тон", d: "Ключи ниши («ремонт квартир», «дизайн интерьера»). Тон «живой» или «экспертный» выглядит естественнее продающего." },
        { t: "Лимит", d: "Живой аккаунт не оставляет по 80 однотипных реплик. 8–15 в сутки достаточно, чтобы присутствовать, а не светиться." },
        { t: "Запуск", d: "«Запустить» создаёт задачу. Пауза и правка — в списке справа. Комментарии идут под свежими постами по ключам." },
      ],
    },
    {
      title: "Лендинг под заявку",
      teaser: "Шаблон ниши → страница → заявки в CRM",
      mins: 5,
      href: "#/office/landings/templates",
      cta: "Открыть шаблоны",
      shot: "img/academy/landings.svg",
      caption: "Каталог шаблонов: бесплатные макеты и PRO, фильтр по нише",
      steps: [
        { t: "Выберите макет", d: "«Сервисы» → «Лендинги» → «Шаблоны». Фильтры по нише и тарифу. Бесплатные можно взять сразу, PRO открыты в триале." },
        { t: "Создайте страницу", d: "Откройте шаблон и нажмите «Создать страницу». В редакторе замените тексты, фото и оффер на свои." },
        { t: "Заявки", d: "Форма с лендинга падает в CRM и в раздел заявок лендингов. Проверьте, что поля имя/телефон на месте." },
        { t: "Домен и UTM", d: "Свой домен, UTM и пиксель — на тарифе PRO, в настройках страницы. Для теста хватает служебного адреса OnLead." },
      ],
    },
  ];
}

function officeChrome(path) {
  if (path === "/office") return { kicker: "Кабинет", title: "Обзор" };
  if (path.startsWith("/office/academy")) {
    const m = String(path).match(/\/academy\/(\d+)/);
    const lesson = m ? academyLessons()[Number(m[1])] : null;
    return { kicker: "Обучение", title: lesson ? lesson.title : "Академия" };
  }
  if (path === "/office/accounts") return { kicker: "Аккаунты", title: "VK аккаунты" };
  if (path === "/office/subscriptions") return { kicker: "Оплата", title: "Тарифы" };
  if (path === "/office/crm") return { kicker: "Сделки", title: "CRM" };
  if (path === "/office/content") return { kicker: "Контент", title: "Публикации" };
  if (path === "/office/compose") return { kicker: "Контент", title: "Редактор" };
  if (path === "/office/content-studio") return { kicker: "Контент", title: "AI-план" };
  if (path === "/office/media") return { kicker: "Контент", title: "Медиатека" };
  if (path === "/office/history") return { kicker: "Контент", title: "История" };
  if (path === "/office/ai-images") return { kicker: "Контент", title: "AI-картинки" };
  if (path === "/office/automation") return { kicker: "Автоматизация", title: "Обзор" };
  if (path === "/office/rss") return { kicker: "Автоматизация", title: "RSS Autopilot" };
  if (path === "/office/repost") return { kicker: "Автоматизация", title: "Репосты VK" };
  if (path === "/office/crosspost") return { kicker: "Автоматизация", title: "AI-кросспост" };
  if (path === "/office/analytics") return { kicker: "Кабинет", title: "Аналитика" };
  if (path === "/office/settings") return { kicker: "Кабинет", title: "Настройки" };
  if (path === "/office/team") return { kicker: "Кабинет", title: "Команда" };
  if (path === "/office/workflow") return { kicker: "Кабинет", title: "Рабочий процесс" };
  if (path === "/office/ai-agents") return { kicker: "Кабинет", title: "AI-сотрудники" };
  if (path === "/office/balance") return { kicker: "Оплата", title: "Баланс" };
  if (path === "/office/referral") return { kicker: "Кабинет", title: "Реферальная программа" };
  if (path === "/office/profile") return { kicker: "Кабинет", title: "Профиль" };
  if (path === "/office/tools") return { kicker: "VK", title: "Инструменты" };
  if (path === "/office/tools/subscribed") return { kicker: "VK", title: "По подписке" };
  if (path === "/office/tools/parsers" || path === "/office/tools/lists" || path.startsWith("/office/tools/lists/") || path.startsWith("/office/parsers")) {
    return { kicker: "VK", title: "Парсеры и списки" };
  }
  if (path.startsWith("/office/telegram")) return { kicker: "Каналы", title: "Telegram" };
  if (path.startsWith("/office/landings")) return { kicker: "Страницы", title: "Лендинги" };
  if (path.startsWith("/office/tools/")) {
    const slug = path.split("/").pop();
    const t = OnLead.tool(slug);
    return { kicker: "Инструмент", title: t?.name || "Инструмент" };
  }
  return { kicker: "Кабинет", title: "OnLead" };
}

async function render() {
  const seq = ++renderSeq;
  const { path, section } = route();
  setDocShell(path);
  const root = document.getElementById("app");
  if (!path.startsWith("/p/") && !path.startsWith("/l/")) document.title = "OnLead — сигналы в лиды";
  const mainHosts = ["onlead.m360-ural.online", "localhost", "127.0.0.1"];
  if (!path.startsWith("/office") && !path.startsWith("/p/") && path !== "/login" && path !== "/register" && path !== "/verify-email" && path !== "/forgot" && path !== "/reset-password" && path !== "/privacy" && path !== "/offer" && path !== "/consent") {
    const host = location.hostname.toLowerCase();
    if (host && !mainHosts.includes(host)) {
      try {
        const page = await OnLead.api("/api/public/landings/host");
        if (page?.id) {
          await renderPublicLanding("/p/" + page.id, root);
          return;
        }
      } catch { /* marketing site */ }
    }
  }
  if (path === "/office/tools/image-ai") {
    go("/office/ai-images");
    return;
  }
  if (path.startsWith("/office")) {
    if (!path.match(/\/office\/telegram\/funnels\/[^/]+$/)) {
      OnLead._tgFunnelCacheId = null;
      OnLead._tgProducts = null;
      OnLead._tgOrders = null;
    }
    if (!OnLead.loggedIn()) {
      setDocShell("/login");
      go("/login");
      return;
    }
    try {
      await OnLead.refresh();
    } catch (err) {
      console.warn("[onlead] session refresh failed:", err.message);
      OnLead.setToken(null);
      OnLead._flash = err.message || "Сессия истекла. Войдите снова.";
      setDocShell("/login");
      go("/login");
      return;
    }
    if (seq !== renderSeq) return;
    const paidReturn = isPaidReturn();
    const billing = consumePaidReturn();
    if (paidReturn || path === "/office/balance") await billing;
    if (seq !== renderSeq) return;
    root.innerHTML = officeShell(path);
    bindOffice();
    if (!paidReturn && path !== "/office/balance") {
      billing.then((last) => {
        if (seq !== renderSeq) return;
        if (last?.applied) paintOfficeBalance();
      }).catch(() => {});
    }
    if (path === "/office/accounts") await consumePendingVkToken();
    if (path === "/office/leadgen" || path === "/office/tools/leadgen-vk") {
      const lg = OnLead.load().leadgen;
      if (lg?.scanStatus === "running" || lg?.scanStatus === "queued") pollLeadgenScan();
    }
    if (path.startsWith("/office/tools/") && path !== "/office/tools/leadgen-vk" && path !== "/office/leadgen" && !path.startsWith("/office/tools/lists") && path !== "/office/tools/parsing-accounts-vk" && path !== "/office/tools/parsing-groups-vk" && path !== "/office/tools/subscribed" && path !== "/office/tools/parsers") {
      loadToolExtras(path.split("/").pop());
    }
    if (path.endsWith("/telegram/funnels")) loadTgReceipts();
    const tgFunnelEd = path.match(/\/office\/telegram\/funnels\/([^/]+)$/);
    if (tgFunnelEd) loadTgFunnelOlData(tgFunnelEd[1]);
    if (path.endsWith("/landings/media")) loadLandingsMedia();
    if (path === "/office/media") OnLead.loadContentMediaGrid?.();
    if (path === "/office/content" && (hashParams().get("view") === "calendar" || hashParams().get("view") === "day")) {
      await OnLead.loadContentCalendar?.();
      if (seq !== renderSeq) return;
      await render();
      return;
    }
    if (path === "/office/rss") OnLead.loadRssItems?.();
    if (path === "/office/repost") OnLead.loadRepostItems?.();
    if (path === "/office/automation") OnLead.loadInboundWebhook?.();
    if (path === "/office/workflow") OnLead.loadWorkflow?.();
    if (path === "/office/ai-images") OnLead.loadAiGallery?.();
    if (path === "/office/analytics") OnLead.loadAnalyticsDetail?.();
    return;
  }
  if (path === "/login") { root.innerHTML = authPage("login"); bindAuth(); return; }
  if (path === "/register") { root.innerHTML = authPage("register"); bindAuth(); return; }
  if (path === "/verify-email") { root.innerHTML = authPage("verify"); bindAuth(); return; }
  if (path === "/forgot") { root.innerHTML = authPage("forgot"); bindAuth(); return; }
  if (path === "/reset-password") { root.innerHTML = authPage("reset"); bindAuth(); return; }
  if (path === "/privacy" || path === "/offer" || path === "/consent") {
    document.title = path === "/offer" ? "Оферта — OnLead" : path === "/consent" ? "Согласие — OnLead" : "Конфиденциальность — OnLead";
    root.innerHTML = (OnLead.legalPage || (() => "<p>Нет документа</p>"))(path.slice(1));
    return;
  }
  if (path.startsWith("/p/")) { await renderPublicLanding(path, root); return; }
  if (path.startsWith("/l/")) { await renderPublicLanding(path, root); return; }
  root.innerHTML = landingPage();
  if (section) {
    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

/* ========== LANDING ========== */
function landingPage() {
  const origin = OnLead.BRAND.origin;
  const tools = OnLead.TOOLS;
  const feat = [
    { slug: "ai-lead-vk", tag: "01 / DIALOGUE", tone: "blue" },
    { slug: "leadgen-vk", tag: "02 / SIGNAL", tone: "mint" },
    { slug: "neurocomment-vk", tag: "03 / CONTENT", tone: "amber" },
  ].map((x) => ({ ...x, t: OnLead.tool(x.slug) })).filter((x) => x.t);
  const featSlugs = new Set(feat.map((x) => x.slug));
  const rest = tools.filter((t) => !featSlugs.has(t.slug));
  const route = [
    ["Сигнал", "Находим тех, кому актуально ваше предложение."],
    ["Контакт", "Фиксируем интерес и бережно начинаем разговор."],
    ["Диалог", "ИИ отвечает в вашем тоне и задаёт нужные вопросы."],
    ["Лид", "Вы подключаетесь, когда человек уже готов."],
  ];
  return `
  <div class="sf-banner">НОВЫЙ РЕЖИМ · AI-ЛИД-МЕНЕДЖЕР УЖЕ В ONLEAD · <a href="${origin}/#/register">Смотреть, как работает →</a></div>
  <header class="pub-head">
    <div class="inner">
      ${brandLogo(origin + "/#/")}
      <nav class="nav-pub">
        <a href="${origin}/#system">Система</a>
        <a href="${origin}/#tools">Инструменты</a>
        <a href="${origin}/#prices">Тарифы</a>
        <a href="${origin}/#faq">Вопросы</a>
      </nav>
      <div class="head-actions">
        <a class="btn btn-ghost btn-sm pub-login" href="${origin}/#/login">Войти</a>
        <a class="btn btn-primary btn-sm" href="${origin}/#/register">Открыть кабинет</a>
        <details class="pub-menu">
          <summary class="pub-burger" aria-label="Меню">${icon("menu")}</summary>
          <nav class="pub-sheet">
            <a href="${origin}/#system">Система</a>
            <a href="${origin}/#tools">Инструменты</a>
            <a href="${origin}/#prices">Тарифы</a>
            <a href="${origin}/#faq">Вопросы</a>
            <a class="btn btn-ghost" href="${origin}/#/login">Войти</a>
            <a class="btn btn-primary" href="${origin}/#/register">Попробовать 72 часа</a>
          </nav>
        </details>
      </div>
    </div>
  </header>
  <section class="hero" id="top">
    <div class="wrap hero-grid">
      <div>
        <div class="sf-kicker"><i></i> SIGNAL FIELD / 2026</div>
        <h1>Сигналы,<br><span class="accent">которые</span><br>становятся<br>лидами<span class="amp">.</span></h1>
        <p class="lead">OnLead собирает аудиторию из VK, ведёт диалог и показывает момент, когда пора подключаться вам.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="${origin}/#/register">Начать за 5 минут</a>
          <a class="sf-play" href="${origin}/#system"><span>${icon("spark")}</span> Посмотреть систему</a>
        </div>
        <div class="stats-row">
          <div><b>67 721</b><br><span class="muted">пользователей</span></div>
          <div><b>4,9 / 5</b><br><span class="muted">средняя оценка</span></div>
          <div><b>+23,4%</b><br><span class="muted">конверсия в диалог</span></div>
        </div>
      </div>
      <div class="mock">
        <div class="mock-top"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span> VK · online · скоринг 8.7/10</div>
        <div class="mock-body">
          <div class="bubble in">Привет! А что именно за инструменты?</div>
          <div class="bubble out">AI ведёт диалог, парсит аудиторию и пишет посты в вашем тоне. Расскажу подробнее?</div>
          <div class="bubble in">Отлично, давайте обсудим.</div>
        </div>
        <div class="mock-hot">
          <div class="mono">HOT LEAD / NOW</div>
          <b><i></i> Готов к диалогу <span class="mono" style="color:var(--teal)">8.7/10</span></b>
        </div>
      </div>
    </div>
  </section>
  <section class="section" id="system" style="background:var(--surface);border-block:1px solid var(--line)">
    <div class="wrap">
      <div class="sf-split">
        <div>
          <div class="sf-label">01 / THE ROUTE</div>
          <h2>Один маршрут<br><span class="soft">вместо восьми</span> вкладок</h2>
        </div>
        <p class="muted" style="max-width:34ch;margin:0">От первого сигнала до понятного действия — система держит контекст и не заставляет переключаться между сервисами.</p>
      </div>
      <div class="sf-route">
        ${route.map(([h, p], i) => `
          <article>
            <div class="n">0${i + 1} / 04</div>
            <div class="route-bar ${i === 3 ? "done" : ""}"></div>
            <h3>${h}<em>.</em></h3>
            <p>${p}</p>
          </article>`).join("")}
      </div>
    </div>
  </section>
  <section class="section" id="tools">
    <div class="wrap">
      <div class="sf-split">
        <div>
          <div class="sf-label">02 / TOOLKIT</div>
          <h2>Инструменты,<br><span class="soft">собранные в поток</span></h2>
        </div>
        <a href="${origin}/#/register" style="color:var(--teal);font-weight:700">Все инструменты →</a>
      </div>
      <div class="grid-3" style="margin:28px 0 18px">
        ${feat.map(({ t, tag, tone }) => `
          <article class="card feat-card card-lift">
            <div class="feat-ico ${tone}">${icon("spark")}</div>
            <div class="tag">${tag}</div>
            <h3>${esc(t.name)}</h3>
            <p>${esc(t.summary)}</p>
            <div class="more">Открыть модуль →</div>
          </article>`).join("")}
      </div>
      <div class="grid-4">
        ${rest.map((t) => `
          <article class="card card-lift">
            <div class="icon-box">${icon("spark")}</div>
            <h3>${esc(t.name)}</h3>
            <p>${esc(t.summary)}</p>
          </article>`).join("")}
      </div>
    </div>
  </section>
  <section class="section sf-band" id="ai">
    <div class="wrap">
      <div class="flow-status">
        <span class="mono" style="letter-spacing:.14em">FLOW STATUS</span>
        ${["Сигнал", "Контакт", "Диалог", "Лид"].map((s, i) => `
          <span class="${i === 3 ? "ok" : ""}"><span class="dot ${i === 3 ? "ok" : ""}"></span> ${s}</span>${i < 3 ? "<i></i>" : ""}`).join("")}
      </div>
      <div class="hero-grid" style="margin-top:36px;align-items:center">
        <div>
          <div class="sf-label">03 / WORKSPACE</div>
          <h2>Кабинет,<br><span class="soft">который держит ритм</span></h2>
          <p>Всё важное на одном экране: активность, горячие диалоги, состояние кампаний и следующий шаг.</p>
          <a class="btn" style="margin-top:22px;background:var(--mint);color:var(--ink);font-weight:800" href="${origin}/#/register">Перейти в кабинет</a>
        </div>
        <div class="card" style="background:#222e46;border-color:transparent;color:#f5f2eb">
          <div class="mono" style="color:var(--mint);font-size:10px;letter-spacing:.14em">LIVE / CABINET</div>
          <h3 class="serif" style="font-size:28px;margin:10px 0">Обзор.</h3>
          <p style="color:#aab3c3;margin:0 0 18px">Лиды, сообщения и следующий шаг — без стены настроек.</p>
          <div class="kpi">
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>CRM</b><span>сделки в работе</span></div>
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>AI</b><span>диалог и скоринг</span></div>
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>VK</b><span>аккаунты и поток</span></div>
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>72ч</b><span>пробный доступ</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="section" id="prices">
    <div class="wrap">
      <div class="sf-split">
        <div>
          <div class="sf-label">04 / ACCESS</div>
          <h2>Выберите<br>свой <span class="accent" style="color:var(--teal)">ритм</span></h2>
          <p class="muted" style="max-width:34ch">Начните с одного потока. Добавляйте инструменты, когда увидите точку роста.</p>
        </div>
      </div>
      <div class="grid-3" style="margin-top:28px">
        ${OnLead.PACKAGES.map((p) => `
          <article class="card price-card ${p.id === "maxi" ? "hit" : ""}">
            <span class="chip ${p.id === "maxi" ? "" : (p.id === "maxi-ai" ? "chip-gold" : "")}">${esc(p.badge)}</span>
            <h3>${esc(p.name)}</h3>
            <div class="amount">${p.price}<small style="font-size:16px"> ₽/мес</small></div>
            <p style="margin-bottom:12px">${esc(p.hint)}</p>
            <ul>${p.tools.slice(0, 6).map((s) => `<li>${esc(OnLead.tool(s)?.name || s)}</li>`).join("")}</ul>
            <a class="btn btn-primary btn-block" style="margin-top:16px" href="${origin}/#/register">Выбрать ${esc(p.name)}</a>
          </article>`).join("")}
      </div>
      <p class="muted" style="margin-top:12px">Периоды 1 / 3 / 6 месяцев со скидкой. Отдельные инструменты — поштучно.</p>
    </div>
  </section>
  <section class="section" id="faq" style="background:var(--surface);border-top:1px solid var(--line)">
    <div class="wrap hero-grid">
      <div>
        <div class="sf-label">05 / CLARITY</div>
        <h2>Вопросы<br>перед <span style="color:var(--teal)">стартом</span></h2>
      </div>
      <div class="faq">
        ${OnLead.FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="sf-cta">
        <div class="sf-label">NEXT SIGNAL / 01</div>
        <h2 class="serif">Пора увидеть,<br>кто уже готов к диалогу<span style="color:var(--teal)">.</span></h2>
        <a class="btn btn-ink" href="${origin}/#/register">Запустить OnLead</a>
      </div>
    </div>
  </section>
  <footer class="pub-foot">
    <div class="inner">
      <div>
        <div class="logo"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span></div>
        <p>Рабочая система для тех, кто превращает активность в VK в управляемый поток лидов.</p>
      </div>
      <div>
        <strong style="color:var(--ink)">Продукт</strong>
        <a href="${OnLead.BRAND.origin}/#system">Система</a>
        <a href="${OnLead.BRAND.origin}/#tools">Инструменты</a>
        <a href="${OnLead.BRAND.origin}/#prices">Тарифы</a>
        <a href="${OnLead.BRAND.origin}/#faq">Вопросы</a>
      </div>
      <div>
        <strong style="color:var(--ink)">Кабинет</strong>
        <a href="${OnLead.BRAND.origin}/#/login">Войти</a>
        <a href="${OnLead.BRAND.origin}/#/register">Регистрация</a>
        <a href="${OnLead.BRAND.origin}/#/office">Рабочий стол</a>
        <a href="${OnLead.BRAND.origin}/admin">Админка</a>
      </div>
      <div>
        <strong style="color:var(--ink)">Документы</strong>
        <a href="${OnLead.BRAND.origin}/#/privacy">Конфиденциальность</a>
        <a href="${OnLead.BRAND.origin}/#/offer">Оферта</a>
        <a href="${OnLead.BRAND.origin}/#/consent">Согласие на ПДн</a>
      </div>
    </div>
  </footer>`;
}

function authPage(mode) {
  const ref = captureRef();
  const q = hashParams();
  const invited = mode === "register" && ref;
  const emailPrefill = q.get("email") || "";
  const codePrefill = q.get("code") || "";
  const titles = {
    login: "Вход в кабинет",
    register: "72 часа всех инструментов",
    verify: "Подтвердите email",
    forgot: "Сброс пароля",
    reset: "Новый пароль",
  };
  const hints = {
    login: `Кабинет ${OnLead.BRAND.origin}.`,
    register: invited ? `Вас пригласили по коду ${esc(ref)}. 72 часа всех инструментов.` : "Код подтверждения придёт на почту. Без карты, 72 часа всех инструментов.",
    verify: "Мы отправили 6-значный код. Он действует 60 минут.",
    forgot: "Если email есть в системе — пришлём код сброса.",
    reset: "Введите код из письма и новый пароль (от 8 символов).",
  };
  const submit = {
    login: "Войти",
    register: "Создать кабинет",
    verify: "Подтвердить",
    forgot: "Отправить код",
    reset: "Сохранить пароль",
  };
  const flash = OnLead._flash ? `<div class="notice" style="margin-bottom:12px"><div>${esc(OnLead._flash)}</div></div>${(OnLead._flash = "") || ""}` : "";
  return `
  <div class="auth-wrap auth-split">
    <aside class="auth-panel">
      ${brandLogo(OnLead.BRAND.origin + "/#/")}
      <div>
        <div class="sf-label">SIGNAL FIELD / ACCESS</div>
        <h2>Ваш поток<br>продолжает<br><em>работать.</em></h2>
        <p>Вернитесь к диалогам, сигналам и решениям, которые уже двигают воронку.</p>
      </div>
      <div class="muted" style="font-size:13px">72 часа всех инструментов · без карты</div>
    </aside>
    <div class="auth-card">
      ${brandLogo(OnLead.BRAND.origin + "/#/")}
      <h1 class="serif" style="font-size:28px;margin:16px 0 6px">${titles[mode]}</h1>
      ${flash}
      <p class="muted">${hints[mode]}</p>
      <form id="auth-form" data-mode="${mode}" style="margin-top:16px">
        ${mode === "register" ? `<div class="field"><label>Имя</label><input name="name" required></div>` : ""}
        <div class="field"><label>Email</label><input name="email" type="email" value="${esc(emailPrefill)}" required></div>
        ${mode === "login" || mode === "register" || mode === "reset" ? `<div class="field"><label>${mode === "reset" ? "Новый пароль" : "Пароль"}</label><input name="password" type="password" minlength="${mode === "login" ? 4 : 8}" required></div>` : ""}
        ${mode === "verify" || mode === "reset" ? `<div class="field"><label>Код из письма</label><input name="code" inputmode="numeric" maxlength="6" placeholder="000000" value="${esc(codePrefill)}" required></div>` : ""}
        ${mode === "register" ? `<label class="consent"><input type="checkbox" name="consent" value="on" required> Принимаю <a href="#/offer" target="_blank" rel="noopener">оферту</a> и <a href="#/privacy" target="_blank" rel="noopener">политику конфиденциальности</a></label>` : ""}
        <button class="btn btn-primary btn-block" type="submit">${submit[mode]}</button>
      </form>
      <p class="muted" style="margin-top:14px;font-size:13px">
        ${mode === "login" ? `Нет аккаунта? <a href="#/register" style="color:var(--teal-2)">Регистрация</a> · <a href="#/forgot" style="color:var(--teal-2)">Забыли пароль?</a>` : ""}
        ${mode === "register" ? `Уже есть? <a href="#/login" style="color:var(--teal-2)">Войти</a>` : ""}
        ${mode === "verify" ? `<a href="#/login" style="color:var(--teal-2)">Назад ко входу</a> · <button type="button" class="btn btn-ghost btn-sm" data-act="resend-verify">Отправить код ещё раз</button>` : ""}
        ${mode === "forgot" || mode === "reset" ? `<a href="#/login" style="color:var(--teal-2)">Назад ко входу</a>` : ""}
      </p>
    </div>
  </div>`;
}

function bindAuth() {
  const q = hashParams();
  $("#auth-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const mode = e.target.dataset.mode;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      if (mode === "forgot") {
        await OnLead.api("/api/auth/forgot-password", { method: "POST", body: { email: fd.get("email") } });
        OnLead._flash = "Если email зарегистрирован, код отправлен";
        location.hash = `#/reset-password?email=${encodeURIComponent(fd.get("email"))}`;
        render();
        return;
      }
      const path = {
        login: "/api/auth/login",
        register: "/api/auth/register",
        verify: "/api/auth/verify-email",
        reset: "/api/auth/reset-password",
      }[mode];
      const data = await OnLead.api(path, {
        method: "POST",
        body: {
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          code: fd.get("code"),
          ref: mode === "register" ? captureRef() : undefined,
          consent: mode === "register" ? fd.get("consent") === "on" : undefined,
        },
      });
      if (data.needsEmailVerification) {
        location.hash = `#/verify-email?email=${encodeURIComponent(data.email)}`;
        render();
        return;
      }
      OnLead.setToken(data.token);
      location.hash = "#/office";
      render();
    } catch (err) {
      if (err.payload?.needsEmailVerification) {
        OnLead._flash = err.message || "Подтвердите email — код из письма.";
        location.hash = `#/verify-email?email=${encodeURIComponent(err.payload.email || fd.get("email"))}`;
        render();
        return;
      }
      OnLead._flash = err.message;
      render();
      btn.disabled = false;
    }
  });
  document.querySelector("[data-act=resend-verify]")?.addEventListener("click", async () => {
    const email = $("[name=email]")?.value || q.get("email");
    if (!email) return;
    try {
      const data = await OnLead.api("/api/auth/resend-verification", { method: "POST", body: { email } });
      alert(data.message || "Код отправлен");
    } catch (err) {
      alert(err.message);
    }
  });
  if (q.get("email") && q.get("code") && ($("#auth-form")?.dataset.mode === "verify")) {
    $("#auth-form")?.requestSubmit();
  }
}

/* ========== OFFICE ========== */
function lkNavNarrow() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function setLkNav(open) {
  const app = document.querySelector(".app");
  const side = document.querySelector(".lk-side");
  if (!app) return;
  app.classList.toggle("nav-open", !!open);
  if (side) {
    if (!lkNavNarrow() || open) side.removeAttribute("inert");
    else side.setAttribute("inert", "");
  }
  document.querySelectorAll("[data-act=lk-nav-toggle]").forEach((el) => {
    el.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll(".lk-burger").forEach((el) => {
    el.setAttribute("aria-label", open ? "Закрыть меню" : "Меню");
  });
  if (open && side) side.scrollTop = 0;
}

function officeShell(path) {
  const state = OnLead.load();
  const trial = OnLead.trialLeft(state);
  const chrome = officeChrome(path);
  const flash = OnLead._flash ? `<div class="notice"><div>${esc(OnLead._flash)}</div></div>${(OnLead._flash = "") || ""}` : "";
  const landingEditor = /^\/office\/landings\/pages\/[^/]+$/.test(path);
  const landingTemplateView = /^\/office\/landings\/templates\/[^/]+$/.test(path);
  const hideContext = landingEditor || landingTemplateView;
  const context = (path === "/office" || path === "/office/accounts" || hideContext)
    ? ""
    : `<div class="lk-context"><p class="lk-context-kicker">${esc(chrome.kicker)}</p><h1>${esc(chrome.title)}</h1></div>`;
  const hideTopTitle = path === "/office/accounts" || hideContext;
  const pageClass = path === "/office"
    ? " page-home"
    : landingEditor
      ? " page-landing-edit"
      : landingTemplateView
        ? " page-landing-preview"
        : "";
  return `
  <div class="app">
    ${lkSidebar(path, state, trial)}
    <button type="button" class="lk-scrim" data-act="lk-nav-close" aria-label="Закрыть меню"></button>
    <div class="lk-main">
      ${lkTopbar(path, state, trial, hideTopTitle)}
      <div class="main">
        ${context}
        <div class="page${pageClass}">${flash}${officePage(path, state)}</div>
      </div>
    </div>
  </div>`;
}

function hrefPath(href) {
  return String(href || "").replace("#", "");
}

function navActive(path, href) {
  const p = hrefPath(href);
  if (path === p) return true;
  if (p === "/office" && path === "/office") return true;
  if (p === "/office/tools/lists" && path.startsWith("/office/tools/lists/")) return true;
  if (p === "/office/academy" && path.startsWith("/office/academy/")) return true;
  if (p === "/office/landings" && path.startsWith("/office/landings")) return true;
  if (p === "/office/content" && (path.startsWith("/office/content") || path === "/office/compose" || path === "/office/content-studio" || path === "/office/media" || path === "/office/history" || path === "/office/ai-images")) return true;
  if (p === "/office/automation" && (path.startsWith("/office/automation") || path === "/office/rss" || path === "/office/crosspost" || path === "/office/repost")) return true;
  if (p === "/office/analytics" && (path.startsWith("/office/analytics") || path === "/office/settings" || path === "/office/team" || path === "/office/workflow" || path === "/office/ai-agents")) return true;
  return false;
}

function bundleActive(pack, path) {
  const root = hrefPath(pack.href);
  if (path === root || path.startsWith(root + "/")) return true;
  return (pack.items || []).some((i) => {
    const p = hrefPath(i.href);
    return path === p || (p.length > 1 && path.startsWith(p + "/"));
  });
}

function readSideOpen() {
  try { return JSON.parse(sessionStorage.getItem("onlead-side-open") || "{}") || {}; }
  catch { return {}; }
}

function writeSideOpen(id, open) {
  const map = readSideOpen();
  map[id] = !!open;
  try { sessionStorage.setItem("onlead-side-open", JSON.stringify(map)); } catch { /* ignore */ }
}

function packIsOpen(id, pathOn) {
  const map = readSideOpen();
  if (map[id] === true) return true;
  if (map[id] === false) return false;
  return pathOn;
}

function navCounter(key, state) {
  if (key === "accounts") {
    const used = state.accounts?.length || 0;
    const total = state.accountSlots || 3;
    return `${used}/${total}`;
  }
  return "";
}

function lkSideLink(path, item) {
  const active = navActive(path, item.href);
  const counter = item.counter ? navCounter(item.counter, OnLead.load()) : "";
  return `<a href="${item.href}" class="lk-side-link${active ? " on" : ""}">
    <span class="lk-side-ico">${icon(item.icon || "home")}</span>
    <span class="lk-side-text">${esc(item.label)}</span>
    ${item.badge ? `<span class="lk-side-badge">${esc(item.badge)}</span>` : ""}
    ${counter ? `<span class="lk-side-count">${esc(counter)}</span>` : ""}
  </a>`;
}

function lkSideBundle(b, path) {
  const pathOn = bundleActive(b, path);
  const open = packIsOpen(b.id, pathOn);
  const count = (b.items || []).length;
  const kids = (b.items || []).map((it) => {
    const active = navActive(path, it.href) || (hrefPath(it.href).length > 2 && (path === hrefPath(it.href) || path.startsWith(hrefPath(it.href) + "/")));
    return `<a href="${it.href}" class="lk-side-sublink${active ? " on" : ""}">
      <span>${esc(it.label)}</span>
      ${it.badge ? `<i>${esc(it.badge)}</i>` : ""}
    </a>`;
  }).join("");
  return `<details class="lk-side-group" data-pack="${esc(b.id)}"${open ? " open" : ""}>
    <summary>
      <span class="lk-side-ico">${icon(b.icon || "layers")}</span>
      <span class="lk-side-label"><b>${esc(b.title)}</b><small>${esc(b.hint || "")}</small></span>
      <span class="lk-side-count">${count}</span>
    </summary>
    <div class="lk-side-sub">${kids}</div>
  </details>`;
}

function lkSidebar(path, state, trial) {
  const initials = esc(userInitials(state.user));
  const acc = state.accounts?.[0];
  const navSections = (OnLead.NAV || []).map((sec) => {
    const links = (sec.items || []).map((it) => lkSideLink(path, it)).join("");
    return `<div class="lk-side-sec">
      <div class="lk-side-sec-title">${esc(sec.section)}</div>
      ${links}
    </div>`;
  }).join("");
  const featured = (OnLead.FEATURED || []).map((it) => lkSideLink(path, it)).join("");
  const bundles = (OnLead.BUNDLES || []).map((b) => lkSideBundle(b, path)).join("");
  const cabinet = [
    ...(OnLead.CABINET || []),
    { href: "#/office/profile", icon: "user", label: "Профиль" },
  ].map((it) => lkSideLink(path, it)).join("");
  return `<aside class="lk-side" aria-label="Навигация кабинета">
    <div class="lk-side-head">
      <a class="lk-logo" href="#/office"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span></a>
      <button type="button" class="lk-side-close" data-act="lk-nav-close" aria-label="Закрыть меню">×</button>
    </div>
    <div class="lk-side-user">
      <div class="lk-ava">${initials}</div>
      <div class="lk-side-user__who">
        <b>${esc(state.user?.name || state.user?.email || "Пользователь")}</b>
        <small>${acc ? `Активный · id ${esc(acc.vkId)}` : "Аккаунт VK не подключён"}</small>
      </div>
    </div>
    <nav class="lk-side-nav">
      ${navSections}
      <div class="lk-side-sec">
        <div class="lk-side-sec-title">Инструменты VK</div>
        ${featured}
        ${bundles}
      </div>
      <div class="lk-side-sec">
        <div class="lk-side-sec-title">Кабинет</div>
        ${cabinet}
      </div>
    </nav>
    <div class="lk-side-foot">
      ${trial ? `<div class="lk-side-trial">Триал ${esc(trial)}</div>` : ""}
      <button type="button" class="btn btn-ghost btn-sm lk-side-logout" data-act="logout">Выйти</button>
    </div>
  </aside>`;
}

function lkTopbar(path, state, trial, hideTitle = false) {
  const initials = esc(userInitials(state.user));
  return `<header class="lk-topbar">
    <button type="button" class="lk-burger" data-act="lk-nav-toggle" aria-label="Меню" aria-expanded="false">${icon("menu")}</button>
    <div class="lk-topbar__title"${hideTitle ? ' hidden' : ""}>${esc(officeChrome(path).title)}</div>
    <div class="lk-bar-end">
      ${trial ? `<span class="lk-trial">триал ${esc(trial)}</span>` : ""}
      <a class="lk-bal" href="#/office/balance">${state.balance.toLocaleString("ru-RU")} ₽</a>
      <details class="lk-account">
        <summary class="lk-ava" aria-label="Аккаунт">${initials}</summary>
        <div class="lk-account-menu">
          <div class="lk-account-who"><b>${esc(state.user?.name || state.user?.email || "Пользователь")}</b><small>${esc(state.user?.email || state.user?.id || "")}</small></div>
          <a href="#/office/profile">Профиль</a>
          <a href="#/office/balance">Баланс</a>
          <a href="#/office/referral">Рефералы</a>
          <a href="#/office/subscriptions">Тарифы</a>
          <button type="button" data-act="logout">Выйти</button>
        </div>
      </details>
    </div>
  </header>`;
}

function officePage(path, state) {
  if (path === "/office") return dash(state);
  if (path === "/office/academy" || path.startsWith("/office/academy/")) return academy(path);
  if (path === "/office/accounts") return accounts(state);
  if (path === "/office/subscriptions") return subscriptions(state);
  if (path === "/office/crm") return crm(state);
  if (path === "/office/content") return content(state, path);
  if (path === "/office/compose") return compose(state);
  if (path === "/office/content-studio") return contentStudio(state, path);
  if (path === "/office/media") return contentMedia(state, path);
  if (path === "/office/history") return contentHistory(state, path);
  if (path === "/office/ai-images") return aiImagesPage(state, path);
  if (path === "/office/automation") return automation(state, path);
  if (path === "/office/rss") return rssPage(state, path);
  if (path === "/office/repost") return repostPage(state, path);
  if (path === "/office/crosspost") return crosspost(state, path);
  if (path === "/office/analytics") return analytics(state, path);
  if (path === "/office/settings") return settingsPage(state, path);
  if (path === "/office/team") return teamPage(state, path);
  if (path === "/office/workflow") return workflowPage(state, path);
  if (path === "/office/ai-agents") return aiAgents(state, path);
  if (path === "/office/balance") return balance(state);
  if (path === "/office/referral") return referral(state);
  if (path === "/office/profile") return profile(state);
  if (path === "/office/tools" || path === "/office/vk-tools") return toolsHub(state);
  if (path === "/office/tools/subscribed" || path === "/office/tools/parsers") return bundleHub(path.split("/").pop(), state);
  if (path === "/office/leadgen" || path === "/office/tools/leadgen-vk") return leadgenPage(state);
  if (path === "/office/neurocomments" || path === "/office/tools/neurocomment-vk") return neurocommentPage(state);
  if (path === "/office/tools/ai-lead-vk") return aiLeadPage(state);
  if (path === "/office/tools/lead-vk") return leadVkPage(state);
  if (path === "/office/tools/lists" || path.startsWith("/office/tools/lists/") || path === "/office/tools/parsing-accounts-vk" || path === "/office/tools/parsing-groups-vk" || path.startsWith("/office/parsers")) return parsers(path, state);
  if (path.startsWith("/office/tools/")) return toolPage(path.split("/").pop(), state);
  if (path.startsWith("/office/telegram")) return telegram(path, state);
  if (path.startsWith("/office/landings")) return landings(path, state);
  return `<h1 class="serif">Страница не найдена</h1>`;
}

function toolPriceLabel(t) {
  return t.price ? `${t.price} ₽/мес` : "входит в парсеры";
}

function toolRow(t, state, extra = {}) {
  const on = t.slug ? OnLead.toolOn(state, t.slug) : extra.on;
  const href = extra.href || `#/office/tools/${t.slug}`;
  const name = extra.label || t.name;
  const summary = extra.summary || t.summary || "";
  const price = t.slug ? toolPriceLabel(t) : (extra.price || "");
  const status = extra.badge
    ? `<span class="chip chip-new">${esc(extra.badge)}</span>`
    : (t.slug || extra.on !== undefined
      ? `<span class="lk-dot ${on ? "on" : ""}"></span><span>${on ? "В работе" : "Выкл"}</span>`
      : "");
  return `<a class="lk-tool" href="${href}">
    <div><b>${esc(name)}</b>${summary ? `<p>${esc(summary)}</p>` : ""}</div>
    <div class="lk-tool-meta">${price ? `<span>${esc(price)}</span>` : ""}${status}</div>
  </a>`;
}

function fmtCountdown(untilMs) {
  const left = Math.max(0, untilMs - Date.now());
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  if (d > 0) return `${d} д ${h} ч`;
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

function promoEndMs(promo) {
  const until = Number(promo?.until || 0);
  if (until > Date.now()) return until;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

function promoDismissed() {
  try { return localStorage.getItem("onlead-promo-hide") === "1"; } catch { return false; }
}

function activityForDays(state, days) {
  const all = state.activity || [];
  const n = Math.min(Math.max(Number(days) || 30, 7), all.length || 30);
  return all.slice(-n);
}

function sumActivity(rows) {
  return rows.reduce((a, r) => ({
    actions: a.actions + (r.actions || 0),
    leads: a.leads + (r.leads || 0),
    messages: a.messages + (r.messages || 0),
    likes: a.likes + (r.likes || 0),
    posts: a.posts + (r.posts || 0),
    bots: a.bots + (r.bots || 0),
  }), { actions: 0, leads: 0, messages: 0, likes: 0, posts: 0, bots: 0 });
}

function dash(state) {
  if (OnLead.dashboardOlPage) {
    return OnLead.dashboardOlPage(state, {
      promoDismissed,
      promoEndMs,
      fmtCountdown,
    });
  }
  return `<div class="card muted">Главная загружается…</div>`;
}

function academy(path) {
  const lessons = academyLessons();
  const m = String(path || "").match(/\/academy\/(\d+)/);
  const idx = m ? Number(m[1]) : -1;
  const open = lessons[idx];
  if (open) {
    const prev = idx > 0 ? `#/office/academy/${idx - 1}` : "";
    const next = idx < lessons.length - 1 ? `#/office/academy/${idx + 1}` : "";
    return `<div class="h-row">
        <p class="muted" style="margin:0">Урок ${idx + 1} из ${lessons.length} · ${open.mins} мин</p>
        <a class="btn btn-ghost btn-sm" href="#/office/academy">Все уроки</a>
      </div>
      <figure class="ac-figure">
        <img src="${esc(open.shot)}" alt="${esc(open.caption)}" width="1200" height="720">
        <figcaption>${esc(open.caption)}</figcaption>
      </figure>
      <ol class="ac-steps">
        ${open.steps.map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s.t)}</b><p>${esc(s.d)}</p></div></li>`).join("")}
      </ol>
      <div class="ac-actions">
        <a class="btn btn-primary" href="${esc(open.href)}">${esc(open.cta)}</a>
        ${prev ? `<a class="btn btn-ghost" href="${prev}">Назад</a>` : ""}
        ${next ? `<a class="btn btn-ghost" href="${next}">Следующий урок</a>` : `<a class="btn btn-ghost" href="#/office/academy">К списку</a>`}
      </div>`;
  }
  return `<p class="ac-lead">Скриншоты кабинета и шаги по каждому сервису. Откройте урок — в конце кнопка сразу в инструмент.</p>
    <div class="ac-grid">${lessons.map((l, i) => `<article class="ac-card">
      <a class="ac-shot" href="#/office/academy/${i}"><img src="${esc(l.shot)}" alt="${esc(l.caption)}" width="640" height="360"></a>
      <div class="ac-card-body">
        <div class="muted">Урок ${i + 1} · ${l.mins} мин</div>
        <h3>${esc(l.title)}</h3>
        <p>${esc(l.teaser)}</p>
        <a class="btn btn-ghost btn-sm" href="#/office/academy/${i}">Смотреть</a>
      </div>
    </article>`).join("")}</div>`;
}

function channelLabel(c) {
  if (c.type === "personal") return "страница";
  if (c.type === "page") return "паблик";
  if (c.type === "event") return "событие";
  return "группа";
}

function renderVkMessagesBlock(a, msgUi) {
  if (!msgUi) return "";
  const msgOk = a.hasMessagesToken;
  const id = esc(a.id);
  const tokens = `<div class="vk-slot__tokens">
      <button class="vk-token vk-token--base is-ok" type="button" data-act="vk-login" title="Обновить базовый токен">
        <span class="vk-token__icon" aria-hidden="true">🔗</span>
        <span class="vk-token__label">Базовый токен</span>
        <span class="vk-token__refresh" aria-hidden="true">↻</span>
      </button>
      <button class="vk-token vk-token--msg${msgOk ? " is-ok" : ""}" type="button" data-act="vk-msg-login" data-id="${id}" title="${msgOk ? "Обновить токен сообщений" : "Получить токен сообщений"}">
        <span class="vk-token__icon" aria-hidden="true">💬</span>
        <span class="vk-token__label">Токен сообщений</span>
        <span class="vk-token__refresh" aria-hidden="true">↻</span>
      </button>
    </div>`;
  if (msgOk) {
    return `${tokens}
      <div class="vk-msg-paste-panel" data-id="${id}" hidden>
        <p class="vk-slot__hint">Скопируйте URL blank.html после входа во VK:</p>
        <textarea class="vk-msg-paste vk-slot__paste" data-id="${id}" rows="2" placeholder="https://oauth.vk.com/blank.html#access_token=…"></textarea>
        <button class="btn btn-ink btn-sm" data-act="vk-msg-save" data-id="${id}" type="button">Сохранить</button>
      </div>
      <p class="vk-slot__status vk-msg-status" data-id="${id}"></p>`;
  }
  return `${tokens}
    <div class="vk-msg-paste-panel" data-id="${id}">
      <p class="vk-slot__hint">Для ЛС нужен отдельный токен с правом «Сообщения».</p>
      <textarea class="vk-msg-paste vk-slot__paste" data-id="${id}" rows="2" placeholder="https://oauth.vk.com/blank.html#access_token=…"></textarea>
      <button class="btn btn-ink btn-sm" data-act="vk-msg-save" data-id="${id}" type="button">Сохранить</button>
    </div>
    <p class="vk-slot__status vk-msg-status" data-id="${id}"></p>`;
}

function vkSlotShortId(id) {
  const digits = String(id || "").replace(/\D/g, "");
  return digits ? digits.slice(-6) : "—";
}

function vkSlotAvatar(a) {
  const initials = esc((a.name || "VK").split(" ").map((p) => p[0]).join("").slice(0, 2));
  return a.avatarUrl
    ? `<img class="vk-slot__ava" src="${esc(a.avatarUrl)}" alt="">`
    : `<div class="vk-slot__ava vk-slot__ava--fb">${initials}</div>`;
}

function renderActiveVkSlot(a, state, { isActive = false } = {}) {
  const msgUi = OnLead.vkMessagesUiOn(state);
  const groups = (a.channels || []).filter((c) => c.type !== "personal").length;
  const id = esc(a.id);
  const vkUrl = `https://vk.com/id${encodeURIComponent(a.vkId || "")}`;
  return `<article class="vk-slot vk-slot--active${isActive ? " vk-slot--current" : ""}">
    <div class="vk-slot__top">
      <div class="vk-slot__badges">
        ${isActive ? `<span class="vk-slot__badge vk-slot__badge--active">★ Активный</span>` : ""}
        <span class="vk-slot__badge">AID: ${vkSlotShortId(a.id)}</span>
      </div>
      <details class="vk-slot__menu">
        <summary aria-label="Меню аккаунта">⋯</summary>
        <div class="vk-slot__menu-pop">
          <a href="${vkUrl}" target="_blank" rel="noopener">Открыть профиль VK</a>
          <button type="button" data-act="vk-refresh-channels" data-id="${id}">Обновить сообщества</button>
          <button type="button" class="danger" data-act="del-acc" data-id="${id}">Отключить</button>
        </div>
      </details>
    </div>
    <div class="vk-slot__profile">
      ${vkSlotAvatar(a)}
      <div class="vk-slot__who">
        <b>${esc(a.name)}</b>
        <a class="vk-slot__vkid" href="${vkUrl}" target="_blank" rel="noopener">id ${esc(a.vkId)}</a>
        ${groups ? `<span class="vk-slot__stat">${groups} сообществ</span>` : `<span class="vk-slot__stat vk-ch-status" data-id="${id}">сообщества не загружены</span>`}
      </div>
    </div>
    ${msgUi ? renderVkMessagesBlock(a, msgUi) : `<div class="vk-slot__tokens"><button class="vk-token vk-token--base is-ok" type="button" data-act="vk-login"><span class="vk-token__icon">🔗</span><span class="vk-token__label">Базовый токен</span><span class="vk-token__refresh">↻</span></button></div>`}
    <p class="vk-slot__foot">Бесплатный слот · без срока</p>
  </article>`;
}

function renderEmptyVkSlot() {
  return `<article class="vk-slot vk-slot--empty">
    <div class="vk-slot__empty-ico" aria-hidden="true">👤+</div>
    <b>Слот свободен</b>
    <p class="vk-slot__hint">Привяжите VK-аккаунт, чтобы начать работу</p>
    <button type="button" class="btn btn-primary vk-slot__bind" data-act="vk-connect-open">🔗 Привязать аккаунт</button>
    <p class="vk-slot__foot">Бесплатный слот · без срока</p>
  </article>`;
}

function renderRentVkSlot() {
  return `<article class="vk-slot vk-slot--rent">
    <div class="vk-slot__rent-ico" aria-hidden="true">+</div>
    <b>Арендовать слот</b>
    <p class="vk-slot__hint">Дополнительный платный слот на срок от 1 до 24 месяцев</p>
    <button type="button" class="btn btn-ghost vk-slot__rent" data-act="vk-rent-slot">Узнать условия</button>
  </article>`;
}

function vkConnectModalHtml(state) {
  return `<div class="vk-connect-modal" id="vk-connect-modal" hidden>
    <button type="button" class="vk-connect-modal__backdrop" data-act="vk-connect-close" aria-label="Закрыть"></button>
    <div class="vk-connect-modal__card" role="dialog" aria-modal="true" aria-labelledby="vk-connect-title">
      <button type="button" class="vk-connect-modal__x" data-act="vk-connect-close" aria-label="Закрыть">×</button>
      <h2 id="vk-connect-title">Привязать VK-аккаунт</h2>
      <p class="vk-slot__hint">Приложения 5530956 / 6463690 → <code>oauth.vk.com/blank.html</code></p>
      <p class="vk-slot__hint"><b>Шаг 1.</b> Получите токен во VK. <b>Шаг 2.</b> Скопируйте весь URL страницы blank.html.</p>
      <p class="vk-slot__status" id="vk-connect-status"></p>
      <button class="btn btn-primary btn-block" data-act="vk-login" type="button">Перейти и получить токен</button>
      <div class="field" style="margin-top:12px">
        <label>Токен vk1.a… или URL blank.html</label>
        <textarea id="vk-token-paste" class="vk-slot__paste" rows="3" placeholder="https://oauth.vk.com/blank.html#access_token=vk1.a.…"></textarea>
      </div>
      <div class="actions" style="margin-top:10px">
        <button class="btn btn-ink btn-block" data-act="vk-save-token" type="button">Привязать токен</button>
        ${OnLead.health?.mocksAllowed ? `<button class="btn btn-ghost btn-block" data-act="vk-mock" type="button">Демо без VK</button>` : ""}
      </div>
    </div>
  </div>`;
}

function accounts(state) {
  const slots = state.accountSlots || 3;
  const used = state.accounts.length;
  const activeId = state.activeAccount || state.accounts[0]?.id;
  const slotCards = [];
  for (let i = 0; i < slots; i += 1) {
    const acc = state.accounts[i];
    if (acc) slotCards.push(renderActiveVkSlot(acc, state, { isActive: acc.id === activeId }));
    else slotCards.push(renderEmptyVkSlot());
  }
  slotCards.push(renderRentVkSlot());
  return `<div class="vk-acc-page">
    <div class="vk-acc-head">
      <div>
        <h1>VK аккаунты</h1>
        <p class="vk-acc-sub">Привязано ${used} из ${slots} слотов</p>
      </div>
      <div class="vk-acc-head__acts">
        <button type="button" class="btn btn-ghost vk-acc-log-btn" data-act="vk-event-log">Журнал событий</button>
        <button type="button" class="btn btn-primary vk-acc-rent-btn" data-act="vk-rent-slot">+ Арендовать слот</button>
      </div>
    </div>
    <div class="vk-slot-grid">${slotCards.join("")}</div>
    ${vkConnectModalHtml(state)}
  </div>`;
}

function subscriptions(state) {
  if (OnLead.billingOlPage) return OnLead.billingOlPage(state);
  return `<div class="card muted">Тарифы загружаются…</div>`;
}

function crm(state) {
  return OnLead.crmOlPage ? OnLead.crmOlPage(state) : `<div class="card muted">CRM загружается…</div>`;
}

function content(state, path) {
  return OnLead.contentOlPage ? OnLead.contentOlPage(state, path) : `<div class="card muted">Контент загружается…</div>`;
}

function compose(state) {
  return OnLead.composeOlPage ? OnLead.composeOlPage(state) : `<div class="card muted">Редактор загружается…</div>`;
}

function contentStudio(state, path) {
  return OnLead.contentOlStudioPage ? OnLead.contentOlStudioPage(state, path) : `<div class="card muted">Студия загружается…</div>`;
}

function contentMedia(state, path) {
  return OnLead.contentOlMediaPage ? OnLead.contentOlMediaPage(state, path) : `<div class="card muted">Медиатека загружается…</div>`;
}

function contentHistory(state, path) {
  return OnLead.contentOlHistoryPage ? OnLead.contentOlHistoryPage(state, path) : `<div class="card muted">История загружается…</div>`;
}

function automation(state, path) {
  return OnLead.automationOlPage ? OnLead.automationOlPage(state, path) : `<div class="card muted">Автоматизация загружается…</div>`;
}

function rssPage(state, path) {
  return OnLead.rssOlPage ? OnLead.rssOlPage(state, path) : `<div class="card muted">RSS загружается…</div>`;
}

function crosspost(state, path) {
  return OnLead.crosspostOlPage ? OnLead.crosspostOlPage(state, path) : `<div class="card muted">Кросспост загружается…</div>`;
}

function repostPage(state, path) {
  return OnLead.repostOlPage ? OnLead.repostOlPage(state, path) : `<div class="card muted">Репосты загружаются…</div>`;
}

function workflowPage(state, path) {
  return OnLead.workflowOlPage ? OnLead.workflowOlPage(state, path) : `<div class="card muted">Workflow загружается…</div>`;
}

function aiImagesPage(state, path) {
  return OnLead.aiImagesOlPage ? OnLead.aiImagesOlPage(state, path) : `<div class="card muted">AI-картинки загружаются…</div>`;
}

function analytics(state, path) {
  return OnLead.analyticsOlPage ? OnLead.analyticsOlPage(state, path) : `<div class="card muted">Аналитика загружается…</div>`;
}

function settingsPage(state, path) {
  return OnLead.settingsOlPage ? OnLead.settingsOlPage(state, path) : `<div class="card muted">Настройки загружаются…</div>`;
}

function teamPage(state, path) {
  return OnLead.teamOlPage ? OnLead.teamOlPage(state, path) : `<div class="card muted">Команда загружается…</div>`;
}

function aiAgents(state, path) {
  return OnLead.aiAgentsOlPage ? OnLead.aiAgentsOlPage(state, path) : `<div class="card muted">AI-сотрудники загружаются…</div>`;
}

function balance(state) {
  const live = state.settings?.paymentsLive;
  const pending = (state.pendingPayments || []).map((p) => `
    <div class="notice">
      <div>Незавершённый платёж: ${esc(p.title)} — ${Number(p.amount).toLocaleString("ru-RU")} ₽</div>
      <button class="btn btn-ink btn-sm" data-act="resume-pay" data-kind="${esc(p.kind)}" data-amount="${esc(p.amount)}" data-package="${esc(p.packageId || "")}" data-slug="${esc(p.slug || "")}" data-tgplan="${esc(p.tgPlan || "")}" data-m="${esc(p.months || 1)}">Продолжить оплату</button>
    </div>`).join("");
  return `${pending}<div class="h-row"><h1>Баланс</h1></div>
    <p class="muted">${live ? "Пополнение счёта — через ЮKassa (карта, СБП). Тарифы и инструменты можно оплатить с этого счёта или картой." : "Тестовый режим — зачисление без ЮKassa."}</p>
    <div class="toolbar" style="margin:0 0 14px">
      <button class="btn btn-primary" data-act="topup" data-amount="1000">1 000 ₽</button>
      <button class="btn btn-ghost" data-act="topup" data-amount="3000">3 000 ₽</button>
      <button class="btn btn-ghost" data-act="topup" data-amount="5000">5 000 ₽</button>
    </div>
    <div class="kpi"><div class="card"><span>Основной</span><b>${state.balance.toLocaleString("ru-RU")} ₽</b></div>
    <div class="card"><span>Реферальный</span><b>${state.refBalance} ₽</b></div></div>
    ${state.refBalance > 0 ? `<div class="toolbar" style="margin:0 0 14px"><button type="button" class="btn btn-ink" data-act="transfer-ref">Перевести ${state.refBalance} ₽ на основной счёт</button></div>` : ""}
    <h3>Операции</h3>
    <table class="table"><thead><tr><th>Дата</th><th>Описание</th><th>Сумма</th></tr></thead>
    <tbody>${state.ops.map((o) => `<tr><td>${esc(o.at)}</td><td>${esc(o.title)}</td><td>${o.amount > 0 ? "+" : ""}${o.amount} ₽</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Операций пока нет</td></tr>`}</tbody></table>`;
}

function referral(state) {
  const r = state.referral;
  const code = String(r.code || "").toUpperCase();
  const link = `${OnLead.BRAND.origin}/r/${encodeURIComponent(code)}`;
  const forecast = Math.round((r.paying || 0) * 390 * 0.07);
  const refOps = (state.ops || []).filter((o) => /реферал/i.test(o.title || "")).slice(0, 10);
  return `<div class="h-row"><h1>Реферальная программа</h1></div>
    <p>7% с каждого платежа приглашённого — навсегда. Ссылка открывает регистрацию с вашим кодом.</p>
    <div class="card" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
      <code>${esc(link)}</code>
      <button class="btn btn-ink btn-sm" data-act="copy" data-text="${esc(link)}">Копировать</button>
    </div>
    <div class="kpi" style="margin-top:14px">
      <div class="card"><span>Приглашено</span><b>${r.invited || 0}</b></div>
      <div class="card"><span>Платят</span><b>${r.paying || 0}</b></div>
      <div class="card"><span>Заработано</span><b>${r.earned || 0} ₽</b></div>
      <div class="card"><span>Реф. баланс</span><b>${state.refBalance || 0} ₽</b></div>
      <div class="card"><span>Прогноз / мес</span><b>${forecast} ₽</b></div>
    </div>
    ${state.refBalance > 0 ? `<button type="button" class="btn btn-primary" data-act="transfer-ref" style="margin-top:14px">Перевести ${state.refBalance} ₽ на основной счёт</button>` : ""}
    ${refOps.length ? `<h3 style="margin-top:24px">Последние начисления</h3>
    <table class="table"><thead><tr><th>Дата</th><th>Описание</th><th>Сумма</th></tr></thead>
    <tbody>${refOps.map((o) => `<tr><td>${esc(o.at?.slice(0, 10) || "")}</td><td>${esc(o.title)}</td><td>+${o.amount} ₽</td></tr>`).join("")}</tbody></table>` : ""}`;
}

function profile(state) {
  return `<div class="lk-settings">
      <p class="muted">Имя в кабинете и почта для входа.</p>
      <div class="lk-settings-row"><label for="prof-name">Имя</label><input id="prof-name" value="${esc(state.user.name)}"></div>
      <div class="lk-settings-row"><label for="prof-email">Email</label><input id="prof-email" type="email" value="${esc(state.user.email)}"></div>
      <div class="lk-settings-row"><span></span><button class="btn btn-primary" data-act="save-profile">Сохранить</button></div>
    </div>`;
}

function fmtLeadgenTime(ts) {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 16).replace("T", " ");
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function highlightLeadgenText(text, phrase) {
  const source = String(text || "");
  const needle = String(phrase || "").trim();
  if (!source) return "";
  if (!needle) return esc(source);
  const lower = source.toLowerCase();
  const n = needle.toLowerCase();
  let out = "";
  let from = 0;
  let idx = lower.indexOf(n, from);
  while (idx !== -1) {
    out += esc(source.slice(from, idx));
    out += `<mark class="lg-hit">${esc(source.slice(idx, idx + needle.length))}</mark>`;
    from = idx + needle.length;
    idx = lower.indexOf(n, from);
  }
  return out + esc(source.slice(from));
}

function vkGroupHref(g) {
  const sn = g.screenName || g.screen_name;
  if (sn) return "https://vk.com/" + sn;
  const id = String(g.id || g.externalGroupId || "").replace(/^-/, "");
  return id ? "https://vk.com/club" + id : "";
}

function lgNormId(v) {
  return String(v || "").replace(/^-/, "");
}

function leadgenCheckedSet(state) {
  if (OnLead._lgChecked instanceof Set) return OnLead._lgChecked;
  const saved = (state || OnLead.load()).leadgen?.groups || [];
  OnLead._lgChecked = new Set(saved.map((g) => lgNormId(g.externalGroupId || g.id)).filter(Boolean));
  return OnLead._lgChecked;
}

function syncLeadgenCheckedFromDom() {
  const set = leadgenCheckedSet();
  document.querySelectorAll("#lg-group-list input[data-gid]").forEach((el) => {
    const id = lgNormId(el.dataset.gid);
    if (!id) return;
    if (el.checked) set.add(id);
    else set.delete(id);
  });
}

function leadgenGroupRowHtml(g, checked) {
  const href = vkGroupHref(g);
  const id = lgNormId(g.id || g.externalGroupId);
  return `<div class="lg-check" data-gname="${esc(g.name)}">
    <label><input type="checkbox" ${checked ? "checked" : ""} data-gid="${esc(id)}" data-gname="${esc(g.name)}" data-gsn="${esc(g.screenName || "")}"> <span>${esc(g.name)}</span></label>
    ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">VK</a>` : ""}
  </div>`;
}

function leadgenGroupRows(state) {
  const selected = leadgenCheckedSet(state);
  const loaded = OnLead._lgLoadedGroups;
  if (loaded?.length) {
    return loaded.map((g) => {
      const id = lgNormId(g.id);
      return { id, name: g.name, screenName: g.screenName || "", checked: selected.has(id) };
    });
  }
  return (state.leadgen?.groups || []).map((g) => ({
    id: lgNormId(g.externalGroupId),
    name: g.name,
    screenName: g.screenName || "",
    checked: true,
  }));
}

function lgFilterBtn(key, val, label, current) {
  const on = (current || "") === val ? "on" : "";
  return `<button type="button" class="btn btn-ghost btn-sm ${on}" data-act="lg-filter" data-key="${esc(key)}" data-val="${esc(val)}">${label}</button>`;
}

function leadgenPage(state) {
  return OnLead.leadgenOlPage ? OnLead.leadgenOlPage(state) : `<div class="card muted">Лидоскоп недоступен</div>`;
}

function neurocommentPage(state) {
  return OnLead.neurocommentOlPage ? OnLead.neurocommentOlPage(state) : toolPage("neurocomment-vk", state);
}

function aiLeadPage(state) {
  return OnLead.aiLeadOlPage ? OnLead.aiLeadOlPage(state) : toolPage("ai-lead-vk", state);
}

function leadVkPage(state) {
  return OnLead.leadVkOlPage ? OnLead.leadVkOlPage(state) : toolPage("lead-vk", state);
}

function bundleHub(id, state) {
  if (OnLead.vkToolsHubPage && (id === "subscribed" || id === "parsers")) {
    return OnLead.vkToolsHubPage(state, { section: id });
  }
  const b = OnLead.BUNDLES.find((x) => x.id === id);
  if (!b) return `<h1>Раздел не найден</h1>`;
  return `
    <div class="h-row">
      <div>
        <div class="muted">Раздел</div>
        <h1>${esc(b.title)}</h1>
      </div>
    </div>
    <p class="muted" style="margin-top:0">${esc(b.hint)}</p>
    <div class="lk-tool-list">
      ${b.items.map((it) => {
        const t = it.slug ? OnLead.tool(it.slug) : { name: it.label, summary: it.blurb || "" };
        return toolRow(t, state, { href: it.href, label: it.label, summary: t.summary || it.blurb, badge: it.badge });
      }).join("")}
    </div>`;
}

function toolsHub(state) {
  if (OnLead.vkToolsHubPage) return OnLead.vkToolsHubPage(state);
  const connected = OnLead.TOOLS.filter((t) => OnLead.toolOn(state, t.slug)).length;
  return `<div class="h-row"><div><h1>Инструменты VK</h1><p class="muted">Каждый сервис — отдельный экран. Подключите аккаунт и запустите задачу.</p></div>
      <span class="muted">в работе ${connected} из ${OnLead.TOOLS.length}</span></div>
    <div class="lk-tool-list">
      ${OnLead.TOOLS.map((t) => toolRow(t, state)).join("")}
    </div>`;
}

function toolAccountSelect(state) {
  if (!state.accounts.length) {
    return `<p class="muted">Сначала <a href="#/office/accounts">подключите VK-аккаунт</a>.</p>`;
  }
  return `<div class="field"><label>VK-аккаунт</label>
    <select name="accountId">${state.accounts.map((a) => `<option value="${esc(a.id)}" ${a.id === state.activeAccount ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
  </div>`;
}

function fmtWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isTechnicalMessage(s) {
  return /image-модел|админк|API-ключ|провайдер|Base URL|HTTP \d|OpenRouter|Pollinations|YooKassa|TOKEN_|encrypt|stack|gemini-2|llama-3|dall-e|нужен ключ|Kate Mobile|2685278|5530956|messages\.send|Access denied|токен с правом|токен сообщений|blank\.html|oauth\.vk|post2post|сервис заблокирован|проверьте права токена|вставьте рабочий|wall\.post/i.test(String(s || ""));
}

function taskSubline(c, slug) {
  const when = fmtWhen(c.created);
  if (slug === "image-ai") {
    if ((c.stats?.images || []).length) return `${when} · картинка готова`;
    if (c.status === "running") return `${when} · создаём картинку…`;
    if (c.stats?.fail) return `${when} · не получилось, попробуйте ещё раз`;
    return when;
  }
  const st = c.status === "running" ? "в работе" : c.status === "paused" ? "пауза" : c.status === "error" ? "не выполнилось" : "готово";
  const sent = Number(c.stats?.ok || 0);
  const fail = Number(c.stats?.fail || 0);
  const counts = (sent || fail) ? ` · ok ${sent}${fail ? ` / err ${fail}` : ""}` : "";
  const msg = isTechnicalMessage(c.stats?.lastMessage) ? "" : (c.stats?.lastMessage || "");
  return msg ? `${when} · ${st}${counts} · ${msg}` : `${when} · ${st}${counts}`;
}

function masslikeKindLabel(type) {
  if (type === "comment") return "Комментарий";
  if (type === "photo") return "Фото";
  return "Пост";
}

function masslikeOpenLabel(type) {
  if (type === "comment") return "Открыть комментарий";
  if (type === "photo") return "Открыть фото";
  return "Открыть пост";
}

function masslikeUrlFromKey(key) {
  const m = String(key || "").match(/^(post|photo|comment):(-?\d+)_(\d+)$/);
  if (!m) return null;
  const type = m[1];
  const owner = m[2];
  const id = m[3];
  if (type === "photo") return { type, url: `https://vk.com/photo${owner}_${id}` };
  if (type === "comment") return { type, url: `https://vk.com/wall${owner}_${id}` };
  return { type, url: `https://vk.com/wall${owner}_${id}` };
}

function collectMasslikeLiked(tasks) {
  const out = [];
  const seen = new Set();
  const push = (it) => {
    const url = String(it?.url || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(it);
  };
  for (const c of tasks || []) {
    for (const it of c.stats?.likedItems || []) push(it);
  }
  if (!out.length) {
    for (const c of tasks || []) {
      for (const key of [...(c.stats?.likedKeys || [])].reverse()) {
        const parsed = masslikeUrlFromKey(key);
        if (parsed) push({ ...parsed, text: "", at: c.stats?.lastLikeAt || c.created });
      }
    }
  }
  return out.slice(0, 40);
}

function masslikeLikedFeed(tasks) {
  const items = collectMasslikeLiked(tasks);
  return `<div class="card ml-feed" style="margin-top:16px">
    <b>Что лайкнули</b>
    <p class="muted" style="margin:6px 0 12px">Последние действия сервиса. Кнопка открывает пост или комментарий во ВКонтакте.</p>
    ${items.length ? items.map((it) => {
      const type = it.type || "post";
      const preview = String(it.text || "").trim();
      return `<article class="match-card ml-card">
        <div>
          <span class="chip">${esc(masslikeKindLabel(type))}</span>
          <p style="margin:8px 0 4px">${preview ? esc(preview) : `<span class="muted">${type === "photo" ? "Фото без подписи" : type === "comment" ? "Комментарий без текста" : "Пост без текста"}</span>`}</p>
          <div class="muted">${esc(it.at ? fmtWhen(it.at) : "")}</div>
        </div>
        <a class="btn btn-primary btn-sm" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(masslikeOpenLabel(type))}</a>
      </article>`;
    }).join("") : `<p class="muted">Пока пусто — после запуска карточки появятся здесь.</p>`}
  </div>`;
}

function autopostingPanel(state) {
  const items = state.autopostQueue || [];
  const slots = ["Сегодня 18:00", "Завтра 10:00", "По расписанию", "Сейчас"];
  return `<div class="card" style="margin-top:16px">
    <h3 style="margin:0 0 10px">Календарь и предпросмотр</h3>
    <div id="autopost-preview" class="card muted" style="margin-bottom:12px;white-space:pre-wrap;min-height:64px">Заполните текст поста слева — здесь появится предпросмотр.</div>
    <p class="muted" style="font-size:12px;margin:0 0 8px">Слоты публикации (МСК): ${slots.map((s) => esc(s)).join(" · ")}</p>
    ${items.length ? `<div class="match-card"><b>Очередь · ${items.length}</b>
      ${items.map((it, i) => `<div class="list-item" style="margin-top:8px"><div>
        <span class="chip">#${i + 1}</span>
        <div class="muted" style="margin-top:4px">${esc(String(it.text || "").slice(0, 160))}${it.photoCount ? ` · ${it.photoCount} фото` : ""}</div>
      </div></div>`).join("")}
    </div>` : `<p class="muted">Очередь пуста — соберите посты граббером или введите текст в форме.</p>`}
  </div>`;
}

function imageGallery(tasks) {
  const images = (tasks || []).flatMap((c) => c.stats?.images || []);
  if (!images.length) {
    return `<h3 style="margin-top:20px">Галерея</h3><p class="muted">Готовые обложки появятся здесь.</p>`;
  }
  return `<h3 style="margin-top:20px">Галерея</h3>
    <div class="gallery">${images.map((i) => `
      <a class="ph gen" href="${esc(i.url)}" target="_blank" rel="noopener" title="${esc(i.prompt || "")}">
        <img src="${esc(i.url)}" alt="${esc(i.prompt || "SMM")}" />
        <span>${esc((i.prompt || "").slice(0, 80))}</span>
      </a>`).join("")}</div>`;
}

function toolFieldHtml(f, state) {
  const acc = state.accounts.find((a) => a.id === (state.activeAccount)) || state.accounts[0];
  const channels = acc?.channels || [];
  const destKeys = f.key === "destinations" || f.key === "dest";
  const groupKeys = f.key === "group";
  const pool = groupKeys ? channels.filter((c) => c.type !== "personal") : channels;
  if ((destKeys || groupKeys) && pool.length) {
    const opts = pool.map((c) => ({ v: c.externalId, l: `${c.name} · ${c.externalId}` }));
    return `<div class="field"><label>${esc(f.label)}</label>
      <select name="${f.key}">${opts.map((o) => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join("")}</select></div>`;
  }
  if (f.type === "lists") {
    const lists = state.lists || [];
    if (!lists.length) {
      return `<p class="muted" style="margin:0 0 10px">Список людей: сначала <a href="#/office/tools/lists">соберите аудиторию</a>.</p>`;
    }
    return `<div class="field"><label>${esc(f.label)}</label>
      <select name="listId">${lists.map((l) => `<option value="${esc(l.id)}">${esc(l.name)} · ${l.count || (l.items || []).length}</option>`).join("")}</select></div>`;
  }
  if (f.type === "select") {
    let optsSrc = f.options || [];
    if (f.key === "channel" && !OnLead.vkMessagesUiOn(state)) {
      optsSrc = ["Только стена"];
    }
    const opts = optsSrc.map((o) => (o && typeof o === "object" ? { value: o.value ?? o.v, label: o.label ?? o.l } : { value: o, label: o }));
    return `<div class="field"><label>${esc(f.label)}</label><select name="${f.key}">${opts.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select></div>`;
  }
  if (f.type === "textarea") {
    const body = f.value != null ? String(f.value) : "";
    const hint = f.key === "text" && String(f.value || f.placeholder || "").includes("{name}")
      ? `<p class="muted" style="margin:6px 0 0">Плейсхолдеры: <code>{name}</code>, <code>{first_name}</code>, <code>{last_name}</code>, <code>{full_name}</code></p>`
      : "";
    return `<div class="field"><label>${esc(f.label)}</label><textarea name="${f.key}" placeholder="${esc(f.placeholder || "")}">${esc(body)}</textarea>${hint}</div>`;
  }
  const min = f.min != null ? ` min="${esc(f.min)}"` : "";
  const max = f.max != null ? ` max="${esc(f.max)}"` : "";
  const val = f.value != null && f.value !== "" ? ` value="${esc(f.value)}"` : "";
  return `<div class="field"><label>${esc(f.label)}</label><input name="${f.key}" type="${f.type === "number" ? "number" : "text"}" placeholder="${esc(f.placeholder || "")}"${min}${max}${val}></div>`;
}

function toolPage(slug, state) {
  const t = OnLead.tool(slug);
  if (!t) return `<h1>Нет такого инструмента</h1>`;
  const on = OnLead.toolOn(state, slug);
  const tasks = state.campaigns[slug] || [];
  const running = tasks.filter((x) => x.status === "running").length;
  const olVk = OnLead.vkToolOlPage && OnLead.isVkToolSlug && OnLead.isVkToolSlug(slug);
  const paywall = on ? "" : `
    <div class="card" style="margin-bottom:16px">
      <span class="chip">Не активирован</span>
      <h3 style="margin-top:8px">${esc(t.name)}</h3>
      <p>${esc(t.summary)}</p>
      <div class="toolbar">
        ${OnLead.PERIODS.map((p) => {
          const price = Math.round(t.price * p.id * (1 - p.discount));
          return `<button class="btn btn-ghost" data-act="buy-tool" data-slug="${slug}" data-m="${p.id}" data-amount="${price}">${p.label} · ${price} ₽</button>`;
        }).join("")}
      </div>
    </div>`;
  const header = olVk ? "" : `
    <div class="h-row">
      <div>
        <div class="muted">Инструмент VK · отдельный сервис</div>
        <h1>${esc(t.name)}</h1>
      </div>
      <span class="status ${on ? "on" : "off"}">${on ? "Активен · триал или подписка" : "Не подключён"}</span>
    </div>`;
  const kpi = olVk ? "" : `
    <p class="muted" style="margin-top:0">${esc(t.summary)}</p>
    <div class="kpi">
      <div class="card"><span>Задач</span><b>${tasks.length}</b></div>
      <div class="card"><span>В работе</span><b>${running}</b></div>
      ${slug === "image-ai" ? `
      <div class="card"><span>Готово</span><b>${tasks.reduce((s, c) => s + ((c.stats?.images || []).length), 0)}</b></div>
      <div class="card"><span>Кредиты</span><b>${state.user?.aiCredits ?? 100}</b></div>` : `
      <div class="card"><span>${esc(t.metrics[0] || "Действия")}</span><b>${tasks.reduce((s, c) => s + (c.stats?.ok || 0), 0)}</b></div>
      <div class="card"><span>Ошибки</span><b>${tasks.reduce((s, c) => s + (c.stats?.fail || 0), 0)}</b></div>`}
    </div>`;
  const core = `
    <div class="task-grid" style="margin-top:16px">
      <form class="card" id="tool-form" data-slug="${slug}">
        <h3>Запуск</h3>
        ${slug === "image-ai" ? "" : toolAccountSelect(state)}
        ${t.fields.map((f) => toolFieldHtml(f, state)).join("")}
        ${slug === "image-ai" || t.fields.some((f) => f.key === "perDay") ? "" : `<div class="field"><label>Лимит в сутки</label><input name="perDay" type="number" value="20" min="1" max="200"></div>`}
        <button class="btn btn-primary" type="submit" ${on && (state.accounts.length || slug === "image-ai") ? "" : "disabled"}>${slug === "image-ai" ? "Сгенерировать" : "Запустить"}</button>
      </form>
      <div>
        <h3>Задачи</h3>
        ${tasks.length ? tasks.map((c) => `<div class="list-item">
          <div><b>${esc(c.title || t.name || "Задача")}</b>
            <div class="muted">${esc(taskSubline(c, slug))}</div>
          </div>
          <div class="match-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-act="edit-cam" data-id="${c.id}" data-title="${esc(c.title || "")}">Изменить</button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="pause-cam" data-id="${c.id}">${c.status === "running" ? "Отключить" : "Включить"}</button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="del-cam" data-id="${c.id}" data-name="${esc(c.title || "Задача")}">Удалить</button>
          </div>
        </div>`).join("") : `<div class="card muted">Пока нет запусков — заполните форму и нажмите «Запустить».</div>`}
        <div class="card" style="margin-top:12px">
          <b>Что умеет</b>
          <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
    <div id="tool-extra" data-slug="${slug}"></div>
    ${slug === "autoposting-vk" ? autopostingPanel(state) : ""}
    ${slug === "image-ai" ? imageGallery(tasks) : ""}
    ${slug === "massliking-vk" ? masslikeLikedFeed(tasks) : ""}
    ${slug === "ai-lead-vk" || slug === "lead-vk" ? `<div class="card" style="margin-top:16px"><b>Лиды из этого инструмента</b>
      ${state.leads.filter((l) => l.source.includes("Лид")).map((l) => `<div class="list-item" style="margin-top:8px"><div><b>${esc(l.name)}</b><div class="muted">${esc(l.note)}</div></div><span class="score">${l.score}/10</span></div>`).join("") || `<p class="muted">Появятся после отправки</p>`}
    </div>` : ""}
    ${slug === "grabber-vk" ? `<div class="card" style="margin-top:16px"><b>Собранные посты</b>
      ${state.lists.filter((l) => (l.source || "").includes("Граббер")).map((l) => {
        const photos = (l.items || []).filter((it) => (it.attachments || []).length || it.hasPhoto).length;
        return `<div class="list-item" style="margin-top:8px"><div><b>${esc(l.name)}</b><div class="muted">${esc(l.created)}${photos ? ` · ${photos} с фото` : ""}</div></div><b>${l.count}</b></div>`;
      }).join("") || `<p class="muted">После запуска список появится здесь и в «Мои списки»</p>`}
    </div>` : ""}
  `;
  if (olVk) return OnLead.vkToolOlPage(slug, state, { t, on, tasks, paywall, body: on ? core : "" });
  return `${header}${paywall}${on ? kpi + core : ""}`;
}

function parserPaywall(state, slug) {
  const t = OnLead.tool(slug);
  if (!t || OnLead.toolOn(state, slug)) return "";
  return `<div class="card" style="margin-bottom:16px">
    <span class="chip">Не активирован</span>
    <h3 style="margin-top:8px">${esc(t.name)}</h3>
    <p>${esc(t.summary)}</p>
    <div class="toolbar">
      ${OnLead.PERIODS.map((p) => {
        const price = Math.round(t.price * p.id * (1 - p.discount));
        return `<button type="button" class="btn btn-ghost" data-act="buy-tool" data-slug="${esc(slug)}" data-m="${p.id}" data-amount="${price}">${p.label} · ${price} ₽</button>`;
      }).join("")}
    </div>
  </div>`;
}

function parsers(path, state) {
  if (path.endsWith("/parsing-accounts-vk") || path.endsWith("/accounts")) return parseAccountsPage(state);
  if (path.endsWith("/parsing-groups-vk") || path.endsWith("/groups")) return parseGroupsPage(state);
  const detail = path.match(/\/lists\/([^/]+)$/);
  if (detail) return listDetailPage(detail[1], state);
  return listsPage(state);
}

function listsPage(state) {
  const lists = state.lists || [];
  return `
    <div class="h-row">
      <div>
        <div class="muted">Парсеры и списки</div>
        <h1>Мои списки</h1>
      </div>
      <div class="toolbar" style="margin:0">
        <a class="btn btn-ghost" href="#/office/tools/parsing-accounts-vk">Парсинг аккаунтов</a>
        <a class="btn btn-primary" href="#/office/tools/parsing-groups-vk">Парсинг групп</a>
      </div>
    </div>
    <p class="muted" style="margin-top:0">Сегменты из парсеров. Отсюда копируются ID в инвайтинг и лид-менеджер, горячие можно отправить в CRM.</p>
    ${lists.length ? lists.map((l) => `<div class="list-item">
      <div>
        <b>${esc(l.name)}</b>
        <div class="muted">${esc(l.source || "Парсер")} · ${esc(l.created || "")}</div>
      </div>
      <div class="match-actions">
        <b>${Number(l.count || 0).toLocaleString("ru-RU")}</b>
        <a class="btn btn-ghost btn-sm" href="#/office/tools/lists/${esc(l.id)}">Открыть</a>
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-rename" data-id="${esc(l.id)}" data-name="${esc(l.name)}">Изменить</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-del" data-id="${esc(l.id)}" data-name="${esc(l.name)}">Удалить</button>
      </div>
    </div>`).join("") : `<div class="card muted">Списков пока нет. Соберите аудиторию в «Парсинг аккаунтов» или «Парсинг групп» — результат появится здесь.</div>`}
  `;
}

function listDetailPage(id, state) {
  const meta = (state.lists || []).find((l) => l.id === id);
  return `
    <div class="h-row">
      <div>
        <div class="muted"><a href="#/office/tools/lists">Мои списки</a></div>
        <h1>${esc(meta?.name || "Список")}</h1>
      </div>
      <div class="toolbar" style="margin:0">
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-rename" data-id="${esc(id)}" data-name="${esc(meta?.name || "")}">Изменить</button>
        <button type="button" class="btn btn-ink btn-sm" data-act="list-copy" data-id="${esc(id)}">Копировать ID</button>
        <button type="button" class="btn btn-primary btn-sm" data-act="list-crm" data-id="${esc(id)}">В CRM</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-del" data-id="${esc(id)}" data-name="${esc(meta?.name || "список")}">Удалить</button>
      </div>
    </div>
    <p class="muted" id="list-meta">${meta ? `${Number(meta.count || 0).toLocaleString("ru-RU")} человек · ${esc(meta.source || "")}` : "Загружаем…"}</p>
    <div id="list-people" class="card muted">Загружаем людей…</div>
  `;
}

function parseAccountsPage(state) {
  const t = OnLead.tool("parsing-accounts-vk");
  const on = OnLead.toolOn(state, "parsing-accounts-vk");
  return `
    <div class="h-row">
      <div>
        <div class="muted">Парсеры и списки</div>
        <h1>Парсинг аккаунтов</h1>
      </div>
      <span class="status ${on ? "on" : "off"}">${on ? "Готов" : "Не подключён"}</span>
    </div>
    ${parserPaywall(state, "parsing-accounts-vk")}
    ${on ? `<p class="muted" style="margin-top:0">${esc(t.summary)}</p>
    <div class="task-grid">
      <form class="card" id="parse-form" data-kind="accounts">
        ${toolAccountSelect(state)}
        <div class="field"><label>Город</label><input name="geo" placeholder="Москва"></div>
        <div class="field"><label>Возраст</label><input name="age" placeholder="25–40"></div>
        <div class="field"><label>Пол</label>
          <select name="sex">
            <option value="0">Любой</option>
            <option value="1">Женский</option>
            <option value="2">Мужской</option>
          </select>
        </div>
        <div class="field"><label>Интересы</label><input name="int" placeholder="дизайн, ремонт, авто"></div>
        <div class="field"><label>Активность</label>
          <select name="act">
            <option value="7">Были 7 дней</option>
            <option value="14">14 дней</option>
            <option value="30">30 дней</option>
            <option value="0">Не важно</option>
          </select>
        </div>
        <div class="field"><label>Сколько собрать</label><input name="count" type="number" min="20" max="1000" value="100"></div>
        <button type="submit" class="btn btn-primary">Собрать список</button>
        <p class="muted" id="parse-status" style="margin:10px 0 0"></p>
      </form>
      <div class="card">
        <b>Что получите</b>
        <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        <a class="btn btn-ghost btn-sm" href="#/office/tools/lists">Открыть мои списки</a>
      </div>
    </div>` : ""}
  `;
}

function parseGroupsPage(state) {
  const t = OnLead.tool("parsing-groups-vk");
  const on = OnLead.toolOn(state, "parsing-groups-vk");
  return `
    <div class="h-row">
      <div>
        <div class="muted">Парсеры и списки</div>
        <h1>Парсинг групп</h1>
      </div>
      <span class="status ${on ? "on" : "off"}">${on ? "Готов" : "Не подключён"}</span>
    </div>
    ${parserPaywall(state, "parsing-groups-vk")}
    ${on ? `<p class="muted" style="margin-top:0">${esc(t.summary)}</p>
    <div class="task-grid">
      <form class="card" id="parse-form" data-kind="groups">
        ${toolAccountSelect(state)}
        <div class="field"><label>Сообщество-источник</label><input name="src" placeholder="https://vk.com/club… или shortname"></div>
        <div class="field"><label>Что собирать</label>
          <select name="collect">
            <option value="members">Подписчики</option>
          </select>
        </div>
        <div class="field"><label>Пол</label>
          <select name="sex">
            <option value="0">Любой</option>
            <option value="1">Женский</option>
            <option value="2">Мужской</option>
          </select>
        </div>
        <div class="field"><label>Город содержит</label><input name="city" placeholder="Екатеринбург"></div>
        <div class="field"><label>Максимум людей</label><input name="count" type="number" min="20" max="1000" value="200"></div>
        <button type="submit" class="btn btn-primary">Запустить</button>
        <p class="muted" id="parse-status" style="margin:10px 0 0"></p>
      </form>
      <div class="card">
        <b>Куда дальше</b>
        <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        <div class="toolbar">
          <a class="btn btn-ghost btn-sm" href="#/office/tools/lists">Мои списки</a>
          <a class="btn btn-ghost btn-sm" href="#/office/tools/invite-vk">Инвайтинг</a>
        </div>
      </div>
    </div>` : ""}
  `;
}

function sectionNav(id, path) {
  const b = OnLead.BUNDLES.find((x) => x.id === id);
  if (!b) return "";
  return `<div class="toolbar">${b.items.map((it) => {
    const itemPath = hrefPath(it.href);
    const on = path === itemPath || path.startsWith(itemPath + "/");
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="${it.href}">${esc(it.label)}</a>`;
  }).join("")}</div>`;
}

function fmtUntil(ts) {
  if (!ts || ts < Date.now()) return "";
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function liveTg(state) {
  const p = state.tgPlan || {};
  if (p.until && p.until > Date.now()) return p;
  if (state.user?.trialUntil && state.user.trialUntil > Date.now()) {
    return { id: "trial", lite: 1, pro: 0, until: state.user.trialUntil };
  }
  return { id: null, lite: 0, pro: 0, until: 0 };
}

function funnelSecHtml(s = {}) {
  return `<div class="funnel-sec">
    <div class="h-row" style="margin:0 0 8px"><b>Раздел</b>
      <button type="button" class="btn btn-ghost btn-sm" data-act="funnel-del-section">Убрать</button></div>
    <label class="field"><span>Заголовок</span><input name="title" value="${esc(s.title || "")}"></label>
    <label class="field"><span>Текст сообщения</span><textarea name="text">${esc(s.text || "")}</textarea></label>
    <label class="field"><span>Кнопки через запятую</span><input name="buttons" value="${esc(s.buttons || "")}"></label>
  </div>`;
}

function telegramTariffs(state, nav) {
  const months = Math.max(1, Number(hashParams().get("m") || 1));
  const plan = liveTg(state);
  const used = state.tgSlots || { lite: 0, pro: 0 };
  const catalog = OnLead.TG_PLANS || [];
  const periods = OnLead.TG_PERIODS || [];
  const until = fmtUntil(plan.until);
  const live = !!(state.settings?.telegramLive || OnLead.health?.telegramLive);
  const trialBtn = (!live || state.tgTrialUsed)
    ? ""
    : `<button type="button" class="btn btn-ghost" data-act="tg-trial">Сначала попробовать 3 дня бесплатно</button>`;
  const buy = (p, price) => live
    ? `<button type="button" class="btn btn-primary btn-block" style="margin-top:12px" data-act="buy-tg" data-plan="${esc(p.id)}" data-m="${months}" data-amount="${price}">Подключить</button>`
    : `<button type="button" class="btn btn-ghost btn-block" style="margin-top:12px" disabled>Оплата закрыта</button>`;
  return `${nav}
    ${live
      ? `<div class="notice"><div>Бот отвечает в Telegram по сохранённой воронке: /start и кнопки. Подключите бота, включите воронку, напишите боту.</div></div>`
      : `<div class="notice"><div>Рассылка из кабинета ещё не запущена.</div></div>`}
    <div class="h-row">
      <div>
        <h1>Тарифы Telegram</h1>
        <p class="muted" style="margin:0">${plan.lite || plan.pro
          ? `Сейчас: ${plan.id === "trial" ? "пробный" : esc(OnLead.tgPlan(plan.id)?.name || plan.id)} · Lite ${used.lite}/${plan.lite} · Pro ${used.pro}/${plan.pro}${until ? " · до " + until : ""}`
          : "Слот — одна воронка. Подключите тариф или возьмите 3 дня."}</p>
      </div>
      <div class="toolbar" style="margin:0">
        <a class="btn btn-ink btn-sm" href="#/office/telegram/funnels">Открыть конструктор</a>
        <a class="btn btn-ghost btn-sm" href="#/office/academy">Обучение</a>
      </div>
    </div>
    <div class="toolbar"><div class="seg">${periods.map((p) => `
      <a href="#/office/telegram/tariffs?m=${p.id}" class="${months === p.id ? "on" : ""}">${esc(p.label)}</a>`).join("")}</div></div>
    <div class="grid-3">${catalog.map((p) => {
      const price = OnLead.tgPrice(p, months);
      return `<div class="card price-card tg-plan ${p.hit ? "hit" : ""}">
        ${p.hit ? `<span class="chip">выгодно</span>` : ""}
        <h3>${esc(p.name)}</h3>
        <div class="amount">${price.toLocaleString("ru-RU")} ₽</div>
        <p>${esc(p.hint)}</p>
        <p style="margin-top:8px">${esc(p.blurb)}</p>
        <p class="muted" style="margin-top:8px">Lite ${p.lite} · Pro ${p.pro}</p>
        ${buy(p, price)}
      </div>`;
    }).join("")}
      <div class="card">
        <h3>Конструктор</h3>
        <p>Тексты и кнопки сохраняются. Включённая воронка отвечает в Telegram на /start и кнопки.</p>
        ${trialBtn}
      </div>
    </div>
    <p class="muted" style="margin-top:16px">Оплата картой / СБП через ЮKassa или со счёта кабинета. После подключения бот отвечает на /start текстами воронки.</p>`;
}

function telegramBots(state, nav) {
  const bots = state.bots || [];
  return `${nav}<div class="h-row"><h1>Боты</h1></div>
    <p class="muted" style="margin-top:0">Подключение бесплатное. Создайте бота в <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>, скопируйте токен и вставьте сюда. Сервис поставит webhook и начнёт отвечать на /start.</p>
    <form id="bot-form" class="card" style="display:grid;gap:10px;max-width:560px">
      <label class="field"><span>Токен</span><input name="token" placeholder="123456789:AAH..." required autocomplete="off"></label>
      <button class="btn btn-primary" type="submit">Подключить</button>
      ${OnLead.health?.mocksAllowed ? `<p class="muted" style="font-size:12px;margin:0">Для проверки без Telegram: <code>mock:demo</code></p>` : ""}
    </form>
    ${bots.length ? bots.map((b) => `<div class="list-item"><div><b>${esc(b.name)}</b>
      <div class="muted">${esc(b.username)} · ${b.tokenMask ? esc(b.tokenMask) + " · " : ""}${b.status === "on" ? "включён" : "выключен"}</div>
      ${b.tokenBroken ? `<div class="muted" style="color:var(--danger)">Токен недействителен — бот не отвечает. Нажмите «Заменить токен» и вставьте новый из @BotFather.</div>` : ""}</div>
      <div class="match-actions">
        <button type="button" class="btn ${b.tokenBroken ? "btn-primary" : "btn-ghost"} btn-sm" data-act="retoken-bot" data-id="${esc(b.id)}">Заменить токен</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="edit-bot" data-id="${esc(b.id)}" data-name="${esc(b.name)}">Изменить</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-bot" data-id="${esc(b.id)}" data-status="${b.status === "on" ? "off" : "on"}">${b.status === "on" ? "Отключить" : "Включить"}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-bot" data-id="${esc(b.id)}" data-name="${esc(b.name)}">Удалить</button>
      </div></div>`).join("") : `<div class="card muted" style="margin-top:12px">Ботов пока нет.</div>`}`;
}

function telegramChannels(state, nav) {
  const channels = state.tgChannels || [];
  const access = state.tgChannelAccess || [];
  const plan = liveTg(state);
  const active = access.filter((a) => a.status === "active" && Number(a.until) > Date.now());
  const history = access.filter((a) => a.status !== "active" || Number(a.until) <= Date.now()).slice(0, 20);
  const accessRow = (a) => {
    const label = a.tgUsername ? `@${esc(a.tgUsername.replace(/^@/, ""))}` : `id ${esc(a.tgUserId)}`;
    const st = a.status === "active" && Number(a.until) > Date.now()
      ? `до ${fmtWhen(a.until)}`
      : a.status === "kicked"
        ? "исключён"
        : a.status === "error"
          ? `ошибка${a.note ? `: ${esc(a.note)}` : ""}`
          : "истёк";
    return `<div class="list-item" style="margin-top:8px"><div><b>${label}</b>
      <div class="muted">${esc(a.tariffDays ? `${a.tariffDays} дн.` : "Pro")} · ${st}</div></div>
      <span class="chip">${a.status === "active" && Number(a.until) > Date.now() ? "активен" : esc(a.status || "—")}</span></div>`;
  };
  return `${nav}<div class="h-row"><h1>Каналы</h1>
      <button type="button" class="btn btn-primary" data-act="refresh-tg-channels">Обновить список</button></div>
    <p class="muted" style="margin-top:0">Закрытый канал нужен для воронок Pro. Добавьте бота администратором с правом приглашать, затем укажите @username — webhook не читает getUpdates.</p>
    ${plan.pro ? "" : `<div class="notice"><div>Pro-слот нужен, чтобы выдавать доступ в канал по сроку. Lite-воронки работают без канала.</div>
      <a class="btn btn-ink btn-sm" href="#/office/telegram/tariffs">Тарифы</a></div>`}
    ${plan.pro ? `<div class="card" style="margin-bottom:16px">
      <h3 style="margin:0 0 8px">Доступ по подписке Pro</h3>
      <p class="muted" style="margin:0 0 10px">После оплаты в воронке пользователь получает invite-link; по истечении срока бот исключает его из канала.</p>
      ${active.length ? `<div><b>Активные · ${active.length}</b>${active.slice(0, 15).map(accessRow).join("")}</div>` : `<p class="muted">Активных подписчиков канала пока нет.</p>`}
      ${history.length ? `<details style="margin-top:12px"><summary class="muted">История · ${history.length}</summary>${history.map(accessRow).join("")}</details>` : ""}
    </div>` : ""}
    <form id="tg-channel-form" class="lg-add" style="margin-bottom:14px">
      <input name="username" placeholder="@channel или ссылка t.me/…" required>
      <button class="btn btn-ghost" type="submit">Добавить по username</button>
    </form>
    ${channels.length ? channels.map((c) => `<div class="list-item"><div><b>${esc(c.name)}</b>
      <div class="muted">${esc(c.username || c.chatId || "—")} · ${c.status === "on" ? "подключён" : "выключен"}</div></div>
      <div class="match-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-act="edit-tg-channel" data-id="${esc(c.id)}" data-name="${esc(c.name)}" data-username="${esc(c.username || "")}">Изменить</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-tg-channel" data-id="${esc(c.id)}" data-status="${c.status === "on" ? "off" : "on"}">${c.status === "on" ? "Отключить" : "Включить"}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-tg-channel" data-id="${esc(c.id)}" data-name="${esc(c.name)}">Удалить</button>
      </div></div>`).join("") : `<div class="card muted">Каналов нет. Сделайте бота админом и обновите список — либо укажите @username, если бот уже в канале.</div>`}`;
}

function telegramFunnels(state, nav) {
  const funnels = state.tgFunnels || [];
  const plan = liveTg(state);
  const used = state.tgSlots || { lite: 0, pro: 0 };
  const active = funnels.filter((f) => f.status !== "archive");
  const archived = funnels.filter((f) => f.status === "archive");
  const scenarios = OnLead.TG_SCENARIOS || [];
  const row = (f) => {
    const sc = OnLead.tgScenario(f.scenario);
    return `<div class="list-item"><div><b>${esc(f.name)}</b>
      <div class="muted">${f.kind === "pro" ? "Pro" : "Lite"}${sc ? " · " + esc(sc.name) : ""} · ${f.status === "on" ? "включена" : f.status === "archive" ? "архив" : "выключена"} · ${(f.sections || f.steps || []).length} разделов</div></div>
      <div class="match-actions">
        <a class="btn btn-primary btn-sm" href="#/office/telegram/funnels/${esc(f.id)}">Конструктор</a>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-funnel" data-id="${esc(f.id)}" data-status="${f.status === "on" ? "off" : "on"}">${f.status === "on" ? "Отключить" : "Включить"}</button>
        ${f.status === "archive"
          ? `<button type="button" class="btn btn-ghost btn-sm" data-act="toggle-funnel" data-id="${esc(f.id)}" data-status="on">Из архива</button>`
          : `<button type="button" class="btn btn-ghost btn-sm" data-act="archive-funnel" data-id="${esc(f.id)}">В архив</button>`}
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-funnel" data-id="${esc(f.id)}" data-name="${esc(f.name)}">Удалить</button>
      </div></div>`;
  };
  return `${nav}
    <div class="h-row">
      <div><h1>Воронки</h1>
        <p class="muted" style="margin:0">Слоты: Lite ${used.lite}/${plan.lite || 0} · Pro ${used.pro}/${plan.pro || 0}. Архив освобождает слот.</p></div>
    </div>
    <h3>Сценарии</h3>
    <div class="grid-3">${scenarios.map((s) => `
      <div class="card">
        <span class="chip">${s.kind === "pro" ? "Pro" : "Lite"}</span>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.blurb)}</p>
        <button type="button" class="btn btn-primary" style="margin-top:12px" data-act="new-funnel" data-scenario="${esc(s.id)}">Создать воронку</button>
      </div>`).join("")}</div>
    <h3 style="margin-top:22px">Мои воронки</h3>
    ${active.length ? active.map(row).join("") : `<div class="card muted">Воронок нет — выберите сценарий.</div>`}
    ${archived.length ? `<h3 style="margin-top:22px">Архив</h3>${archived.map(row).join("")}` : ""}
    <div id="tg-receipts-box" style="margin-top:22px"></div>`;
}

function telegramFunnelEditor(id, state, nav) {
  const f = (state.tgFunnels || []).find((x) => x.id === id);
  if (!f) return `${nav}<div class="card">Воронка не найдена. <a href="#/office/telegram/funnels">К списку</a></div>`;
  const bots = state.bots || [];
  const sections = (f.sections && f.sections.length) ? f.sections : (f.steps || []).map((t) => ({ title: t, text: "", buttons: "" }));
  const sc = OnLead.tgScenario(f.scenario);
  return `${nav}
    <div class="h-row"><h1>${esc(f.name)}</h1>
      <div class="toolbar" style="margin:0">
        <a class="btn btn-ghost btn-sm" href="#/office/telegram/funnels">К списку</a>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-funnel" data-id="${esc(f.id)}" data-status="${f.status === "on" ? "off" : "on"}">${f.status === "on" ? "Отключить" : "Включить"}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="archive-funnel" data-id="${esc(f.id)}">В архив</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-funnel" data-id="${esc(f.id)}" data-name="${esc(f.name)}">Удалить</button>
      </div>
    </div>
    <p class="muted">${f.kind === "pro" ? "Pro" : "Lite"}${sc ? " · " + esc(sc.name) : ""}. Включённая воронка отвечает в Telegram: /start и кнопки разделов.</p>
    <form id="funnel-edit-form" class="card" data-id="${esc(f.id)}" style="max-width:720px">
      <label class="field"><span>Название</span><input name="name" value="${esc(f.name)}" required></label>
      <label class="field"><span>Продукт</span><input name="product" value="${esc(f.product || "")}" placeholder="Название оффера"></label>
      <label class="field"><span>Цена</span><input name="price" value="${esc(f.price || "")}" placeholder="4 900 ₽"></label>
      <label class="field"><span>Бот</span>
        <select name="botId">
          <option value="">Не выбран</option>
          ${bots.map((b) => `<option value="${esc(b.id)}" ${f.botId === b.id ? "selected" : ""}>${esc(b.name)} ${esc(b.username || "")}</option>`).join("")}
        </select>
      </label>
      <div id="funnel-sections">${sections.map((s) => funnelSecHtml(s)).join("")}</div>
      <div class="toolbar">
        <button type="button" class="btn btn-ghost" data-act="funnel-add-section">Добавить раздел</button>
        <button class="btn btn-primary" type="submit">Сохранить</button>
      </div>
    </form>`;
}

function telegram(path, state) {
  const navPath = path === "/office/telegram" ? "/office/telegram/tariffs" : path;
  const nav = sectionNav("telegram", navPath);
  const funnelMatch = path.match(/^\/office\/telegram\/funnels\/([^/]+)$/);
  if (funnelMatch) {
    return OnLead.telegramFunnelOlEditor
      ? OnLead.telegramFunnelOlEditor(funnelMatch[1], state, nav)
      : telegramFunnelEditor(funnelMatch[1], state, nav);
  }
  if (path.endsWith("/lead-bots")) {
    return OnLead.telegramLeadBotsPage
      ? OnLead.telegramLeadBotsPage(state, nav)
      : `<div class="card muted">TG-боты недоступны</div>`;
  }
  if (path.endsWith("/bots")) return telegramBots(state, nav);
  if (path.endsWith("/channels")) return telegramChannels(state, nav);
  if (path.endsWith("/funnels")) return telegramFunnels(state, nav);
  return telegramTariffs(state, nav);
}

function landingPublicUrl(id, page) {
  const p = page || (OnLead.load()?.landings || []).find((x) => x.id === id);
  if (OnLead.landingOlUrl && p) return OnLead.landingOlUrl(p);
  const landingId = typeof id === "string" ? id : (p?.id || "");
  if (p?.customHost) return `https://${p.customHost}/`;
  return `${location.origin}/#/p/${encodeURIComponent(landingId)}`;
}

function landingStatusLabel(status) {
  return status === "published" ? "опубликован" : "черновик";
}

function tplMini(tpl) {
  const lay = tpl.layout || "studio";
  const tone = tpl.tone || "teal";
  const inner = {
    studio: `<div class="m-nav"></div><div class="m-hero"><b></b><s></s><s class="sh"></s><i></i></div><div class="m-row"><em></em><em></em><em></em></div>`,
    salon: `<div class="m-photo"><span></span></div><div class="m-side"><b></b><s></s><s class="sh"></s><i></i></div>`,
    stage: `<div class="m-ticket"><u></u><b></b><s></s><ol><li></li><li></li><li></li></ol></div>`,
    school: `<div class="m-mods"><n></n><n></n><n></n></div><div class="m-side"><b></b><i></i></div>`,
    portrait: `<div class="m-ava"></div><q></q><s></s><i></i>`,
    chat: `<div class="m-bub in"></div><div class="m-bub out"></div><div class="m-bub in short"></div><i></i>`,
    packs: `<div class="m-packs"><em></em><em></em><em></em></div><i></i>`,
    listing: `<div class="m-photo flat"></div><div class="m-row"><em></em><em></em><em></em></div><i></i>`,
    gym: `<div class="m-gym"><b></b><s></s><div class="m-row"><em></em><em></em><em></em></div></div>`,
    garage: `<div class="m-cars"><span></span><span></span><span></span></div><b></b><s></s><i></i>`,
    paper: `<div class="m-head"></div><div class="m-lines"><s></s><s></s><s class="sh"></s></div><i></i>`,
    poster: `<u></u><b></b><s></s><i></i>`,
  };
  return `<div class="tpl-mini lay-${esc(lay)} tone-${esc(tone)}" aria-hidden="true">${inner[lay] || inner.studio}</div>`;
}

function parsePipe(raw, keys) {
  return String(raw || "").split("\n").map((line) => {
    const p = line.split("|").map((s) => s.trim());
    const o = {};
    keys.forEach((k, i) => { o[k] = p[i] || ""; });
    return o;
  }).filter((o) => Object.values(o).some(Boolean));
}

function dumpPipe(arr, keys) {
  return (arr || []).map((o) => keys.map((k) => o[k] || "").join("|")).join("\n");
}

function landingFormFields(page, preview) {
  const fieldMeta = Object.fromEntries((OnLead.LANDING_FIELDS || []).map((f) => [f.id, f]));
  const fields = (page.fields || ["name", "phone"]).filter((id) => fieldMeta[id]);
  return fields.map((id) => {
    const f = fieldMeta[id];
    const req = id === "name" || id === "phone" ? "required" : "";
    if (f.type === "textarea") {
      return `<label class="field"><span>${esc(f.label)}</span><textarea name="${esc(id)}" placeholder="${esc(f.ph)}" ${preview ? "disabled" : ""}></textarea></label>`;
    }
    return `<label class="field"><span>${esc(f.label)}</span><input name="${esc(id)}" type="${esc(f.type)}" placeholder="${esc(f.ph)}" ${req} ${preview ? "disabled" : ""}></label>`;
  }).join("");
}

function landingFormBlock(page, preview, extraClass = "") {
  const utmHidden = !preview && (page.utmSource || page.utmMedium || page.utmCampaign)
    ? `<input type="hidden" name="utm_source" value="${esc(page.utmSource || "")}">
       <input type="hidden" name="utm_medium" value="${esc(page.utmMedium || "")}">
       <input type="hidden" name="utm_campaign" value="${esc(page.utmCampaign || "")}">`
    : "";
  return `<form class="lp-form ${extraClass}"${preview ? "" : ` id="lp-lead-form" data-id="${esc(page.id || "")}"`}>
    <h3>${esc(page.formTitle || "Оставьте заявку")}</h3>
    <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    ${utmHidden}
    ${landingFormFields(page, preview)}
    <button class="btn btn-primary btn-block" type="submit" ${preview ? "disabled" : ""}>${esc(page.cta || "Оставить заявку")}</button>
    <p class="muted lp-legal">Нажимая кнопку, вы соглашаетесь на <a href="#/consent">обработку персональных данных</a> и принимаете <a href="#/privacy">политику конфиденциальности</a>.</p>
  </form>`;
}

function lpStats(page) {
  const stats = (page.stats || []).filter((s) => s.n || s.l);
  if (!stats.length) return "";
  return `<div class="lp-stats">${stats.map((s) => `<div><b>${esc(s.n)}</b><span>${esc(s.l)}</span></div>`).join("")}</div>`;
}

function lpFeats(page, mark = "✓") {
  const feats = (page.features || []).filter(Boolean);
  if (!feats.length) return "";
  return `<div class="lp-feats">${feats.map((x) => `<div><b>${mark}</b><span>${esc(x)}</span></div>`).join("")}</div>`;
}

function lpSteps(page) {
  const steps = (page.steps || []).filter((s) => s.t || s.d);
  if (!steps.length) return "";
  return `<ol class="lp-steps">${steps.map((s) => `<li><b>${esc(s.t)}</b><span>${esc(s.d)}</span></li>`).join("")}</ol>`;
}

function lpPrices(page) {
  const prices = (page.prices || []).filter((p) => p.name || p.price);
  if (!prices.length) return "";
  return `<div class="lp-packs">${prices.map((p) => `<article><h4>${esc(p.name)}</h4><div class="serif lp-sum">${esc(p.price)}</div><p>${esc(p.note || "")}</p></article>`).join("")}</div>`;
}

function lpMeta(page) {
  const m = page.meta || {};
  const bits = [m.when, m.place, m.duration].filter(Boolean);
  if (!bits.length) return "";
  return `<div class="lp-meta">${bits.map((x) => `<span>${esc(x)}</span>`).join("")}</div>`;
}

function lpPriceCards(page) {
  const prices = (page.prices || []).filter((p) => p.name || p.price);
  if (!prices.length) return "";
  return `<div class="lp-packs">${prices.map((p, i) => {
    const bits = String(p.note || "").split("·").map((s) => s.trim()).filter(Boolean);
    return `<article class="${i === 1 ? "hit" : ""}"><h3>${esc(p.name)}</h3><div class="serif lp-sum">${esc(p.price)}</div>
      ${bits.length ? `<ul>${bits.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</article>`;
  }).join("")}</div>`;
}

function lpTextCards(items, cls = "lp-cards") {
  const rows = (items || []).filter((x) => x.t || x.d);
  if (!rows.length) return "";
  return `<div class="${cls}">${rows.map((x) => `<article><h3>${esc(x.t || "")}</h3><p>${esc(x.d || "")}</p></article>`).join("")}</div>`;
}

function lpReviews(page) {
  const rows = (page.reviews || []).filter((x) => x.q);
  if (!rows.length) return "";
  return `<div class="lp-reviews">${rows.map((x) => `<blockquote><p>«${esc(x.q)}»</p><cite>${esc(x.a || "")}</cite></blockquote>`).join("")}</div>`;
}

function lpFaqBlock(page) {
  const rows = (page.faq || []).filter((x) => x.q);
  if (!rows.length) return "";
  return `<div class="lp-faq">${rows.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a || "")}</p></details>`).join("")}</div>`;
}

function lpIllu(layout) {
  return `<div class="lp-illu lp-illu-${esc(layout)}" aria-hidden="true"><i></i><i></i><i></i><b></b></div>`;
}

function lpSec(title, inner) {
  if (!inner) return "";
  return `<section class="lp-sec"><div class="lp-inner"><h2 class="serif">${esc(title)}</h2>${inner}</div></section>`;
}

function normLayout(id) {
  const alias = {
    studio: "specialist", salon: "booking", stage: "event", school: "course",
    portrait: "expert", chat: "magnet", packs: "course", listing: "agency",
    gym: "booking", garage: "product", paper: "magnet", poster: "event",
  };
  const next = alias[id] || id || "specialist";
  const ok = ["course", "magnet", "specialist", "agency", "booking", "event", "expert", "product"];
  return ok.includes(next) ? next : "specialist";
}

function landingPageView(page, opts = {}) {
  const preview = !!opts.preview;
  const shot = !!opts.shot;
  const layout = normLayout(page.layout);
  const tone = page.tone || "teal";
  const form = landingFormBlock(page, preview);
  const titles = {
    course: { out: "Чему научитесь", aud: "Кому подойдёт", steps: "Программа", who: "Автор", prices: "Тарифы", rev: "Отзывы учеников", faq: "Вопросы и ответы", form: "Записаться на поток" },
    magnet: { out: "Что внутри гайда", aud: "Для кого", steps: "Содержание", who: "Кто собрала", prices: "Тарифы", rev: "Кто уже открылся", faq: "Вопросы", form: "Получить PDF" },
    specialist: { out: "Как проходит", aud: "Кому", steps: "Как идём", who: "Кто ведёт", prices: "Услуги", rev: "Отзывы", faq: "Вопросы", form: "Записаться" },
    agency: { out: "Кейсы", aud: "Команда", steps: "Как работаем", who: "Студия", prices: "Услуги", rev: "Отзывы", faq: "Вопросы", form: "Оставить бриф" },
    booking: { out: "Почему к нам", aud: "Мастера", steps: "Визит", who: "Студия", prices: "Прайс", rev: "Отзывы", faq: "Вопросы", form: "Запись" },
    event: { out: "Что будет", aud: "Кто ведёт", steps: "Программа", who: "Спикеры", prices: "Билет", rev: "Отзывы", faq: "Вопросы", form: "Регистрация" },
    expert: { out: "Кейсы", aud: "С кем", steps: "Обо мне", who: "Эксперт", prices: "Форматы", rev: "Отзывы", faq: "Вопросы", form: "Написать" },
    product: { out: "О товаре", aud: "Состав", steps: "Как заказать", who: "Кто делает", prices: "Варианты", rev: "Отзывы", faq: "Вопросы", form: "Заказ" },
  }[layout] || { out: "Оффер", aud: "Кому", steps: "Как", who: "Автор", prices: "Цены", rev: "Отзывы", faq: "Вопросы", form: "Заявка" };
  const pills = (page.stats || []).filter((s) => s.n || s.l);
  const heroPills = pills.length
    ? `<div class="lp-pills">${pills.map((s, i) => `<span class="${i === 0 ? "on" : ""}">${esc([s.n, s.l].filter(Boolean).join(" · "))}</span>`).join("")}</div>`
    : (page.kicker ? `<div class="lp-pills"><span class="on">${esc(page.kicker)}</span></div>` : "");
  const ctaLabel = esc(page.cta || "Оставить заявку");
  const ctaHref = landingInPageHref(page, "lp-lead");
  const ctaHero = (preview || shot)
    ? `<span class="btn btn-primary">${ctaLabel}</span>`
    : `<a class="btn btn-primary" href="${ctaHref}">${ctaLabel}</a>`;
  const hero = `<section class="lp-hero-pro">
    <div class="lp-inner lp-hero-grid">
      <div>
        ${heroPills}
        <h1 class="serif">${esc(page.headline || page.name || "Заголовок")}</h1>
        ${page.sub ? `<p>${esc(page.sub)}</p>` : ""}
        ${ctaHero}
        ${page.urgency ? `<div class="lp-urgent">${esc(page.urgency)}</div>` : ""}
      </div>
      ${lpIllu(layout)}
    </div>
  </section>`;
  const who = (page.author || page.quote)
    ? `<div class="lp-author"><div class="lp-ava">${esc(String(page.author || "A").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase())}</div>
        <div><b>${esc(page.author || "")}</b><div class="muted">${esc(page.role || "")}</div>
        ${page.quote ? `<blockquote>«${esc(page.quote)}»</blockquote>` : ""}</div></div>`
    : "";
  const extras = [
    lpSec(titles.out, lpTextCards(page.outcomes) || lpFeats(page)),
    lpSec(titles.aud, lpTextCards(page.audience, "lp-cards lp-cards-3")),
    lpSec(titles.steps, lpSteps(page)),
    lpSec(titles.who, who),
    lpSec(titles.prices, lpPriceCards(page) || lpPrices(page)),
    lpSec(titles.rev, lpReviews(page)),
    lpSec(titles.faq, lpFaqBlock(page)),
  ].join("");
  if (shot) {
    return `<article class="lp-scene lp-pro lp-shot lp-lay-${esc(layout)} lp-${esc(tone)}">${hero}${lpSec(titles.out, lpTextCards((page.outcomes || []).slice(0, 3)))}</article>`;
  }
  const demo = preview ? `<div class="lp-demo-bar">Пример шаблона — тексты и картинки замените на свои в редакторе</div>` : "";
  const nav = `<div class="lp-top"><div class="lp-inner">
    <b class="serif">${esc((page.name || "OnLead").split(" ")[0])}</b>
    ${(preview || shot) ? `<span class="btn btn-primary btn-sm">${ctaLabel}</span>` : `<a class="btn btn-primary btn-sm" href="${ctaHref}">${ctaLabel}</a>`}
  </div></div>`;
  const formSec = `<section class="lp-sec lp-sec-form" id="lp-lead"><div class="lp-inner lp-form-grid">
    <div><h2 class="serif">${esc(page.formTitle || titles.form)}</h2>
      <p class="muted">Свяжемся, ответим на вопросы. Без давления — если не подойдёт, так и скажем.</p></div>
    ${form}
  </div></section>`;
  const foot = `<footer class="lp-foot"><div class="lp-inner"><span>Страница собрана в OnLead</span></div></footer>`;
  return `<article class="lp-scene lp-pro lp-lay-${esc(layout)} lp-${esc(tone)}">${demo}${nav}${hero}${extras}${formSec}${foot}</article>`;
}

function landingFromForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  const out = {
    name: d.name,
    headline: d.headline,
    sub: d.sub,
    cta: d.cta,
    formTitle: d.formTitle,
    kicker: d.kicker,
    tone: d.tone,
    layout: d.layout,
    quote: d.quote,
    author: d.author,
    role: d.role,
    urgency: d.urgency,
    features: String(d.features || "").split("\n").map((s) => s.trim()).filter(Boolean),
    fields: [...form.querySelectorAll("[name=fields]:checked")].map((i) => i.value),
    stats: parsePipe(d.stats, ["n", "l"]),
    steps: parsePipe(d.steps, ["t", "d"]),
    prices: parsePipe(d.prices, ["name", "price", "note"]),
    outcomes: parsePipe(d.outcomes, ["t", "d"]),
    audience: parsePipe(d.audience, ["t", "d"]),
    faq: parsePipe(d.faq, ["q", "a"]),
    reviews: parsePipe(d.reviews, ["q", "a"]),
    meta: { when: d.metaWhen || "", place: d.metaPlace || "", duration: d.metaDuration || "" },
  };
  if (form.querySelector("[name=customHost]")) {
    const zone = OnLead.LANDING_DNS_ZONE || "m360-ural.online";
    let host = String(d.customHost || "").trim();
    if (host === "__custom__") {
      const slug = String(d.customHostSlug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      host = slug ? `${slug}.${zone}` : "";
    }
    out.customHost = host;
    out.utmSource = d.utmSource || "";
    out.utmMedium = d.utmMedium || "";
    out.utmCampaign = d.utmCampaign || "";
    out.pixelHtml = d.pixelHtml || "";
  } else if (form.querySelector("[name=utmSource]")) {
    out.utmSource = d.utmSource || "";
    out.utmMedium = d.utmMedium || "";
    out.utmCampaign = d.utmCampaign || "";
    out.pixelHtml = d.pixelHtml || "";
  }
  return out;
}

function landingEditor(page, state) {
  const fields = page.fields || ["name", "phone"];
  const tones = [
    { id: "teal", label: "Бирюза" },
    { id: "gold", label: "Золото" },
    { id: "ink", label: "Чернила" },
    { id: "blue", label: "Синий" },
    { id: "green", label: "Зелёный" },
    { id: "cream", label: "Крем" },
    { id: "rose", label: "Роза" },
    { id: "night", label: "Ночь" },
    { id: "slate", label: "Сланец" },
    { id: "wine", label: "Вино" },
    { id: "sand", label: "Песок" },
  ];
  const layouts = OnLead.LANDING_LAYOUTS || [];
  const url = landingPublicUrl(page.id, page);
  const published = page.status === "published";
  const mine = page.userId === OnLead.load()?.user?.id;
  const m = page.meta || {};
  const pro = state && OnLead.toolOn(state, "landings-pro");
  const dnsZone = OnLead.LANDING_DNS_ZONE || "m360-ural.online";
  const presetHosts = OnLead.LANDING_HOSTS || [];
  const hostCustom = page.customHost && !presetHosts.includes(page.customHost);
  const customSlug = hostCustom && page.customHost.endsWith("." + dnsZone)
    ? page.customHost.slice(0, -(dnsZone.length + 1))
    : "";
  const dnsNote = page.dnsStatus
    ? `<p class="muted" style="font-size:12px;margin:-4px 0 10px">DNS: <b>${esc(page.dnsStatus)}</b>${page.dnsMessage ? " · " + esc(page.dnsMessage) : ""}</p>`
    : `<p class="muted" style="font-size:12px;margin:-6px 0 10px">При публикации DNS-запись создаётся автоматически в Cloudflare (A → сервер, proxied).</p>`;
  const proFields = pro ? `
      <h3 style="margin:18px 0 8px">Лендинги PRO</h3>
      <label class="field"><span>Свой поддомен</span>
        <select name="customHost" id="landing-host-select">
          <option value="">— основной домен —</option>
          ${presetHosts.map((h) => `<option value="${esc(h)}" ${page.customHost === h ? "selected" : ""}>${esc(h)}</option>`).join("")}
          <option value="__custom__" ${hostCustom ? "selected" : ""}>Свой поддомен…</option>
        </select>
      </label>
      <label class="field" id="landing-host-custom-wrap" style="${hostCustom ? "" : "display:none"}">
        <span>Поддомен на ${esc(dnsZone)}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <input name="customHostSlug" value="${esc(customSlug)}" placeholder="promo" pattern="[a-z0-9-]+" style="max-width:160px">
          <span class="muted">.${esc(dnsZone)}</span>
        </div>
      </label>
      ${dnsNote}
      <label class="field"><span>UTM source</span><input name="utmSource" value="${esc(page.utmSource || "")}" placeholder="vk"></label>
      <label class="field"><span>UTM medium</span><input name="utmMedium" value="${esc(page.utmMedium || "")}" placeholder="cpc"></label>
      <label class="field"><span>UTM campaign</span><input name="utmCampaign" value="${esc(page.utmCampaign || "")}" placeholder="spring-sale"></label>
      <label class="field"><span>Код пикселя (HTML)</span><textarea name="pixelHtml" rows="4" placeholder="<script>...</script>">${esc(page.pixelHtml || "")}</textarea></label>
      <p class="muted" style="font-size:12px">UTM попадут в скрытые поля формы. Пиксель вставляется на опубликованную страницу.</p>` : "";
  return `<div class="lp-edit">
    <form id="landing-edit-form" class="card lp-edit-form" data-id="${esc(page.id)}">
      <label class="field"><span>Название в кабинете</span><input name="name" value="${esc(page.name)}" required></label>
      <label class="field"><span>Макет</span>
        <select name="layout">${layouts.map((t) => `<option value="${t.id}" ${(page.layout || "studio") === t.id ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select>
      </label>
      <label class="field"><span>Тон</span>
        <select name="tone">${tones.map((t) => `<option value="${t.id}" ${page.tone === t.id ? "selected" : ""}>${t.label}</option>`).join("")}</select>
      </label>
      <label class="field"><span>Надзаголовок</span><input name="kicker" value="${esc(page.kicker || "")}"></label>
      <label class="field"><span>Срочность под кнопкой</span><input name="urgency" value="${esc(page.urgency || "")}"></label>
      <label class="field"><span>Заголовок</span><input name="headline" value="${esc(page.headline || "")}" required></label>
      <label class="field"><span>Подзаголовок</span><textarea name="sub">${esc(page.sub || "")}</textarea></label>
      <label class="field"><span>Заголовок формы</span><input name="formTitle" value="${esc(page.formTitle || "Оставьте заявку")}"></label>
      <label class="field"><span>Кнопка</span><input name="cta" value="${esc(page.cta || "Оставить заявку")}"></label>
      <label class="field"><span>Пункты оффера — каждый с новой строки</span><textarea name="features">${esc((page.features || []).join("\n"))}</textarea></label>
      <label class="field"><span>Цифры — число|подпись</span><textarea name="stats">${esc(dumpPipe(page.stats, ["n", "l"]))}</textarea></label>
      <label class="field"><span>Шаги / программа — заголовок|текст</span><textarea name="steps">${esc(dumpPipe(page.steps, ["t", "d"]))}</textarea></label>
      <label class="field"><span>Пакеты — имя|цена|заметка через ·</span><textarea name="prices">${esc(dumpPipe(page.prices, ["name", "price", "note"]))}</textarea></label>
      <label class="field"><span>Карточки оффера — заголовок|текст</span><textarea name="outcomes">${esc(dumpPipe(page.outcomes, ["t", "d"]))}</textarea></label>
      <label class="field"><span>Кому / команда / мастера — заголовок|текст</span><textarea name="audience">${esc(dumpPipe(page.audience, ["t", "d"]))}</textarea></label>
      <label class="field"><span>Отзывы — цитата|автор</span><textarea name="reviews">${esc(dumpPipe(page.reviews, ["q", "a"]))}</textarea></label>
      <label class="field"><span>FAQ — вопрос|ответ</span><textarea name="faq">${esc(dumpPipe(page.faq, ["q", "a"]))}</textarea></label>
      <label class="field"><span>Цитата</span><textarea name="quote">${esc(page.quote || "")}</textarea></label>
      <label class="field"><span>Автор цитаты</span><input name="author" value="${esc(page.author || "")}"></label>
      <label class="field"><span>Роль автора</span><input name="role" value="${esc(page.role || "")}"></label>
      <div class="lp-meta-fields">
        <label class="field"><span>Когда</span><input name="metaWhen" value="${esc(m.when || "")}"></label>
        <label class="field"><span>Где</span><input name="metaPlace" value="${esc(m.place || "")}"></label>
        <label class="field"><span>Длительность</span><input name="metaDuration" value="${esc(m.duration || "")}"></label>
      </div>
      <div class="field"><span>Поля формы</span>
        <div class="lp-checks">${(OnLead.LANDING_FIELDS || []).map((f) => `
          <label><input type="checkbox" name="fields" value="${esc(f.id)}" ${fields.includes(f.id) ? "checked" : ""}>${esc(f.label)}</label>`).join("")}</div>
      </div>
      ${proFields}
      <div class="muted" style="font-size:12px;margin-bottom:10px">Ссылка: ${esc(url)}</div>
      <div class="tpl-card-acts">
        <button class="btn btn-primary" type="submit">Сохранить</button>
        <button type="button" class="btn btn-ghost" data-act="copy-landing-url" data-url="${esc(url)}">Копировать ссылку</button>
        <button type="button" class="btn ${published ? "btn-ghost" : "btn-ink"}" data-act="publish-landing" data-id="${esc(page.id)}" data-status="${published ? "draft" : "published"}">${published ? "Отключить" : "Опубликовать"}</button>
        ${published ? `<a class="btn btn-ghost" href="#/p/${esc(page.id)}" target="_blank" rel="noopener">Открыть</a>` : ""}
        ${mine ? `<button type="button" class="btn btn-ghost" data-act="del-landing" data-id="${esc(page.id)}" data-name="${esc(page.name)}">Удалить</button>` : ""}
      </div>
    </form>
    <div id="lp-live" class="lp-preview-frame tone-${esc(page.tone || "teal")}">${landingPageView(page, { preview: true })}</div>
  </div>`;
}

function tplHref(extra, cur) {
  const p = new URLSearchParams();
  const tier = extra.tier !== undefined ? extra.tier : cur.tier;
  const niche = extra.niche !== undefined ? extra.niche : cur.niche;
  if (tier) p.set("tier", tier);
  if (niche) p.set("niche", niche);
  const s = p.toString();
  return "#/office/landings/templates" + (s ? "?" + s : "");
}

function tplCard(t) {
  return `<article class="card tpl-card">
    <a class="tpl-shot" href="#/office/landings/templates/${esc(t.id)}"><div class="tpl-shot-inner">${landingPageView(t, { preview: true, shot: true })}</div></a>
    <div class="tpl-card-body">
      <div class="tpl-card-tags">
        <span class="chip">${esc(t.niche)}</span>
        ${t.tier === "pro" ? `<span class="chip chip-gold">PRO</span>` : `<span class="chip">Бесплатный</span>`}
        ${t.badge ? `<span class="chip chip-gold">${esc(t.badge)}</span>` : ""}
      </div>
      <b>${esc(t.name)}</b>
      <p>${esc(t.blurb || t.sub || "")}</p>
      <div class="tpl-card-acts">
        <a class="btn btn-ghost btn-sm" href="#/office/landings/templates/${esc(t.id)}">Посмотреть</a>
        <button type="button" class="btn btn-primary btn-sm" data-act="new-landing" data-name="${esc(t.name)}" data-template="${esc(t.id)}">Использовать</button>
      </div>
    </div>
  </article>`;
}

function landingsGallery() {
  const q = hashParams();
  const niche = q.get("niche") || "";
  const tier = q.get("tier") || "";
  const cur = { niche, tier };
  const all = OnLead.LANDING_TEMPLATES || [];
  const niches = OnLead.landingNiches ? OnLead.landingNiches() : [];
  const free = all.filter((t) => t.tier !== "pro");
  const pro = all.filter((t) => t.tier === "pro");
  const shown = all.filter((t) => (!tier || t.tier === tier) && (!niche || t.niche === niche));
  const freeShown = shown.filter((t) => t.tier !== "pro");
  const proShown = shown.filter((t) => t.tier === "pro");
  return `<div class="h-row"><div><h1>Шаблоны</h1>
      <p class="muted" style="margin:6px 0 0">Выберите макет — тексты и картинки замените на свои в редакторе</p></div></div>
    <div class="lg-filters">
      <a class="btn btn-sm ${!tier ? "btn-ink" : "btn-ghost"}" href="${tplHref({ tier: "" }, cur)}">Все шаблоны</a>
      <a class="btn btn-sm ${tier === "free" ? "btn-ink" : "btn-ghost"}" href="${tplHref({ tier: "free" }, cur)}">Бесплатные · ${free.length}</a>
      <a class="btn btn-sm ${tier === "pro" ? "btn-ink" : "btn-ghost"}" href="${tplHref({ tier: "pro" }, cur)}">PRO · ${pro.length}</a>
    </div>
    <div class="lg-filters">
      <a class="btn btn-sm ${!niche ? "btn-ink" : "btn-ghost"}" href="${tplHref({ niche: "" }, cur)}">Все</a>
      ${niches.map((n) => `<a class="btn btn-sm ${niche === n ? "btn-ink" : "btn-ghost"}" href="${tplHref({ niche: n }, cur)}">${esc(n)}</a>`).join("")}
    </div>
    ${!tier && !niche && freeShown.length ? `<div class="tpl-sec"><div><b>Доступны сейчас · ${freeShown.length}</b><p class="muted">Можно взять прямо сейчас, тариф не нужен</p></div>
      <div class="tpl-grid">${freeShown.map(tplCard).join("")}</div></div>` : ""}
    ${!tier && !niche && proShown.length ? `<div class="tpl-sec"><div><b>На платном тарифе · ${proShown.length}</b><p class="muted">В триале все макеты открыты. После триала — тариф лендингов.</p></div>
      <div class="tpl-grid">${proShown.map(tplCard).join("")}</div></div>` : ""}
    ${tier || niche ? `<div class="tpl-grid">${shown.map(tplCard).join("")}</div>` : ""}`;
}

function landings(path, state) {
  const subNavPaths = ["/office/landings/leads", "/office/landings/media", "/office/landings/plan"];
  const nav = subNavPaths.includes(path) ? sectionNav("landings", path) : "";
  if (path === "/office/landings" || path === "/office/landings/pages" || path === "/office/landings/templates") {
    return `${nav}${OnLead.landingsUnifiedHtml ? OnLead.landingsUnifiedHtml(state) : bundleHub("landings", state)}`;
  }
  const tplMatch = path.match(/^\/office\/landings\/templates\/([^/]+)$/);
  if (tplMatch) {
    const tpl = OnLead.landingTemplate(tplMatch[1]);
    if (!tpl) {
      return `${nav}<div class="card muted">Такого шаблона нет. <a href="#/office/landings">Вернуться</a></div>`;
    }
    const preview = OnLead.landingOlPublicHtml ? OnLead.landingOlPublicHtml(tpl, { preview: true }) : landingPageView(tpl, { preview: true });
    return `${nav}<div class="h-row">
        <div><div class="muted">Шаблон · ${esc(tpl.niche)}</div><h1>${esc(tpl.name)}</h1></div>
        <div class="toolbar">
          <a class="btn btn-ghost" href="#/office/landings">← Все шаблоны</a>
          <button type="button" class="btn btn-primary" data-act="new-landing" data-name="${esc(tpl.name)}" data-template="${esc(tpl.id)}">Создать страницу</button>
        </div>
      </div>
      <p class="muted" style="margin-top:0">${esc(tpl.blurb || tpl.sub || "")}</p>
      <div class="ol-preview-wrap">${preview}</div>`;
  }
  const pageMatch = path.match(/^\/office\/landings\/pages\/([^/]+)$/);
  if (pageMatch) {
    const page = (state.landings || []).find((p) => p.id === pageMatch[1]);
    if (!page) {
      return `${nav}<div class="card muted">Страница не найдена. <a href="#/office/landings">К списку</a></div>`;
    }
    const editor = OnLead.landingOlEditorHtml ? OnLead.landingOlEditorHtml(page, state) : landingEditor(page, state);
    return editor;
  }
  if (path.endsWith("/leads")) {
    const rows = (state.leads || []).filter((l) => l.landingId || String(l.source || "").startsWith("Лендинг"));
    return `${nav}<div class="h-row"><h1>Заявки с лендингов</h1></div>
      ${rows.length
        ? `<table class="table"><thead><tr><th>Имя</th><th>Телефон</th><th>Страница</th><th>Источник</th><th></th></tr></thead>
          <tbody>${rows.map((l) => `<tr>
            <td>${esc(l.name)}</td><td>${esc(l.phone || "—")}</td><td>${esc(l.landingName || "—")}</td><td>${esc(l.source)}</td>
            <td><div class="match-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-act="edit-lead" data-id="${esc(l.id)}" data-name="${esc(l.name)}" data-note="${esc(l.note || "")}" data-city="${esc(l.city || "")}" data-phone="${esc(l.phone || "")}">Изменить</button>
              <button type="button" class="btn btn-ghost btn-sm" data-act="del-lead" data-id="${esc(l.id)}" data-name="${esc(l.name)}">Удалить</button>
            </div></td>
          </tr>`).join("")}</tbody></table>`
        : `<div class="card muted">Заявок пока нет — опубликуйте страницу и отправьте ссылку.</div>`}`;
  }
  if (path.endsWith("/media")) {
    return `${nav}<div class="h-row"><h1>Медиатека</h1>
      <a class="btn btn-ghost btn-sm" href="#/office/tools/image-ai">Создать в Image AI</a></div>
      <form id="media-upload-form" class="card" style="margin:12px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required>
        <button class="btn btn-primary btn-sm" type="submit">Загрузить</button>
        <span class="muted" style="font-size:12px">JPG/PNG/WebP/GIF до 5 МБ — для лендингов и постов</span>
      </form>
      <div id="landings-media-grid"><p class="muted">Загрузка…</p></div>`;
  }
  if (path.endsWith("/plan")) {
    return `${nav}<div class="h-row"><h1>Лендинги PRO</h1></div>
      <div class="card"><p>290 ₽/мес · свой домен, UTM и пиксель поверх конструктора.</p>
      <button class="btn btn-primary" data-act="buy-tool" data-slug="landings-pro" data-m="1" data-amount="290">Подключить за 290 ₽</button></div>`;
  }
  return `${nav}${OnLead.landingsUnifiedHtml ? OnLead.landingsUnifiedHtml(state) : `<div class="h-row"><h1>Мои лендинги</h1></div>
    <form id="landing-form" class="lg-add" style="margin-bottom:14px">
      <input name="name" placeholder="Название страницы" required>
      <button class="btn btn-primary" type="submit">Новая страница</button>
    </form>
    <div class="card muted">Загрузка…</div>`}`;
}

function bindSidebar() {
  document.querySelectorAll("details.lk-side-group[data-pack]").forEach((el) => {
    el.addEventListener("toggle", () => writeSideOpen(el.dataset.pack, el.open));
  });
}

function bindOffice() {
  const root = document.getElementById("app");
  root.onclick = onClick;
  bindSidebar();
  setLkNav(false);
  if (!window._lkEsc) {
    window._lkEsc = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setLkNav(false);
    });
  }
  $("#tool-form")?.addEventListener("submit", onToolSubmit);
  $("#tool-form [name=accountId]")?.addEventListener("change", () => {
    const slug = $("#tool-form")?.dataset.slug;
    if (slug) loadToolExtras(slug);
  });
  $("#parse-form")?.addEventListener("submit", onParse);
  $("#landing-form")?.addEventListener("submit", onLandingCreate);
  bindLandingEditor();
  bindTelegramForms();
  if (OnLead.bindLandingsOl) OnLead.bindLandingsOl();
  if (OnLead.bindLeadgenOl) OnLead.bindLeadgenOl();
  if (OnLead.bindNeurocommentOl) OnLead.bindNeurocommentOl();
  if (OnLead.bindCrmOl) OnLead.bindCrmOl();
  if (OnLead.bindContentOl) OnLead.bindContentOl();
  if (OnLead.bindComposeOl) OnLead.bindComposeOl();
  if (OnLead.bindAutopubOl) OnLead.bindAutopubOl();
  if (OnLead.bindRepostOl) OnLead.bindRepostOl();
  if (OnLead.bindAiImagesOl) OnLead.bindAiImagesOl();
  if (OnLead.bindCabinetOl) OnLead.bindCabinetOl();
  if (OnLead.bindBillingOl) OnLead.bindBillingOl();
  if (OnLead.bindLeadVkOl) OnLead.bindLeadVkOl();
  scrollToHashAnchor();
  $("#media-upload-form")?.addEventListener("submit", onMediaUpload);
  $("#tool-form")?.addEventListener("input", syncAutopostPreview);
  $("#tool-form")?.addEventListener("change", syncAutopostPreview);
  syncAutopostPreview();
  root.onchange = onOfficeChange;
  $("#lg-phrase-form")?.addEventListener("submit", onLeadgenAddPhrase);
  $("#lg-exclude-form")?.addEventListener("submit", onLeadgenExclude);
  bindLeadgenUi();
  loadOpenList();
  pollToolCampaigns();
  tickPromoCountdown();
  $("#vk-token-paste")?.addEventListener("paste", () => {
    setTimeout(() => {
      const parsed = OnLead.parseVkAccessToken($("#vk-token-paste")?.value || "");
      if (parsed?.accessToken) finishVkConnect(parsed);
    }, 0);
  });
}

function pollToolCampaigns() {
  clearInterval(OnLead._toolPoll);
  const slug = $("#tool-form")?.dataset.slug;
  if (!slug || slug === "image-ai") return;
  const running = (OnLead.load().campaigns[slug] || []).some((c) => c.status === "running");
  if (!running) return;
  let n = 0;
  OnLead._toolPoll = setInterval(async () => {
    if (OnLead._toolPollBusy) return;
    n += 1;
    OnLead._toolPollBusy = true;
    try {
      const snap = (OnLead.load().campaigns[slug] || []).map((c) => [c.id, c.status, c.stats?.ok, c.stats?.lastMessage, (c.stats?.likedItems || []).length]);
      await OnLead.refresh();
      const next = (OnLead.load().campaigns[slug] || []).map((c) => [c.id, c.status, c.stats?.ok, c.stats?.lastMessage, (c.stats?.likedItems || []).length]);
      const still = (OnLead.load().campaigns[slug] || []).some((c) => c.status === "running");
      if (JSON.stringify(snap) !== JSON.stringify(next)) {
        clearInterval(OnLead._toolPoll);
        await render();
        return;
      }
      if (!still || n > 40) clearInterval(OnLead._toolPoll);
    } catch {
      clearInterval(OnLead._toolPoll);
    } finally {
      OnLead._toolPollBusy = false;
    }
  }, 4000);
}

let vkConnecting = false;

function takePendingVkToken() {
  try {
    const raw = sessionStorage.getItem(OnLead.VK_PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OnLead.VK_PENDING_KEY);
    const data = JSON.parse(raw);
    if (data?.accessToken) return data;
  } catch { /* ignore */ }
  return null;
}

async function consumePendingVkToken() {
  const pending = takePendingVkToken();
  if (pending) await finishVkConnect(pending);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function consumePaidReturn() {
  let flag = false;
  try { flag = sessionStorage.getItem("onlead-paid") === "1"; } catch { /* ignore */ }
  const hashQ = location.hash.includes("?") ? new URLSearchParams(location.hash.slice(location.hash.indexOf("?") + 1)) : null;
  const paidReturn = flag || hashQ?.get("paid") === "1";
  const pending = (OnLead.load().pendingPayments || []).length;
  if (!paidReturn && !pending) return { applied: false };
  const attempts = paidReturn ? 3 : 1;
  let last = { applied: false };
  try {
    for (let i = 0; i < attempts; i += 1) {
      if (i) await sleep(1500);
      last = await OnLead.api("/api/billing/confirm", { method: "POST" });
      if (last.applied || last.reason === "no pending payment" || last.status === "succeeded") break;
    }
    if (paidReturn) {
      try { sessionStorage.removeItem("onlead-paid"); } catch { /* ignore */ }
    }
    await OnLead.refresh();
    if (last.applied) OnLead._flash = "Оплата прошла. Баланс или подписка обновлены.";
    else if (paidReturn && last.status && last.status !== "succeeded") {
      OnLead._flash = "Платёж ещё обрабатывается. Откройте «Баланс» через минуту — зачисление догонит само.";
    }
  } catch (err) {
    OnLead._flash = err.message;
  }
  return last;
}

function choosePayMethod({ amount, balance }) {
  return new Promise((resolve) => {
    document.querySelector(".pay-modal")?.remove();
    const need = Number(amount) || 0;
    const have = Number(balance) || 0;
    const enough = need > 0 && have >= need;
    const host = document.createElement("div");
    host.className = "pay-modal";
    host.innerHTML = `
      <button type="button" class="pay-modal-backdrop" data-pay="cancel" aria-label="Закрыть"></button>
      <div class="pay-modal-card" role="dialog" aria-modal="true">
        <h3>Как оплатить</h3>
        <p>${need ? `К оплате ${need.toLocaleString("ru-RU")} ₽. ` : ""}На счёте кабинета ${have.toLocaleString("ru-RU")} ₽.${enough ? "" : " Не хватает — пополните баланс или оплатите картой."}</p>
        <div class="pay-modal-acts">
          <button type="button" class="btn btn-primary" data-pay="balance" ${enough ? "" : "disabled"}>Списать со счёта</button>
          <button type="button" class="btn btn-ink" data-pay="yookassa">Карта / СБП · ЮKassa</button>
          <button type="button" class="btn btn-ghost" data-pay="cancel">Отмена</button>
        </div>
      </div>`;
    const done = (value) => {
      document.removeEventListener("keydown", onKey);
      host.remove();
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape") done(null);
    };
    host.addEventListener("click", (e) => {
      const el = e.target.closest("[data-pay]");
      if (!el || el.disabled) return;
      const act = el.dataset.pay;
      if (act === "balance" || act === "yookassa") done(act);
      if (act === "cancel") done(null);
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(host);
    host.querySelector("[data-pay=yookassa]")?.focus();
  });
}

async function startCheckout(body, btn) {
  if (OnLead._checkoutBusy) return;
  OnLead._checkoutBusy = true;
  const prev = btn?.textContent;
  try {
    const kind = body.kind || (body.packageId ? "package" : body.slug ? "tool" : body.tgPlan ? "tg-plan" : "");
    if (kind && kind !== "topup" && !body.method) {
      const state = OnLead.load() || {};
      const pick = await choosePayMethod({
        amount: Number(body.amount || btn?.dataset?.amount || 0),
        balance: Number(state.balance || 0),
      });
      if (!pick) return;
      body = { ...body, method: pick };
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = body.method === "balance" ? "Списываем со счёта…" : "Открываем оплату…";
    }
    const token = OnLead.getToken();
    try { if (token) localStorage.setItem(OnLead.tokenKey + "-pay", token); } catch { /* ignore */ }
    const res = await OnLead.api("/api/billing/checkout", { method: "POST", body });
    if (res.applied) {
      OnLead._flash = res.mode === "balance"
        ? "Списали со счёта кабинета. Доступ обновлён."
        : "Оплата уже зачислена.";
      await OnLead.refresh();
      await render();
      return;
    }
    const url = res.confirmationUrl;
    if (!url) throw new Error("ЮKassa не вернула ссылку на оплату. Попробуйте ещё раз.");
    location.assign(url);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      if (prev) btn.textContent = prev;
    }
    throw err;
  } finally {
    OnLead._checkoutBusy = false;
  }
}

function onVkOAuthMessage(e) {
  if (e.origin !== location.origin) return;
  if (e.data?.type === "vk-token-error") {
    const status = document.getElementById("vk-connect-status");
    const text = e.data.errorDescription || e.data.error || "Ошибка авторизации VK";
    if (status) status.textContent = text;
    else alert(text);
    return;
  }
  if (e.data?.type === "vk-code" && e.data.code) {
    void exchangeVkCodeAndConnect(e.data.code);
    return;
  }
  if (e.data?.type !== "vk-token" || !e.data.accessToken) return;
  try { sessionStorage.removeItem(OnLead.VK_PENDING_KEY); } catch { /* ignore */ }
  finishVkConnect(e.data);
}

async function exchangeVkCodeAndConnect(code) {
  const status = document.getElementById("vk-connect-status");
  if (status) status.textContent = "Получаем токен VK…";
  try {
    const data = await OnLead.api("/api/vk/oauth-token", { method: "POST", body: { code } });
    await finishVkConnect({ accessToken: data.accessToken, userId: data.userId });
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

async function refreshVkChannelsFromBrowser(accountId, status) {
  const { accessToken } = await OnLead.api(`/api/accounts/${accountId}/vk-token`);
  const { channels, groupsError } = await OnLead.fetchVkChannels(accessToken);
  const groups = channels.filter((c) => c.type !== "personal");
  if (!groups.length) {
    const hint = groupsError || "VK не вернул админские сообщества. Проверьте права токена и переподключите аккаунт.";
    throw new Error(hint);
  }
  await OnLead.api(`/api/accounts/${accountId}/channels`, { method: "POST", body: { channels } });
  if (status) status.textContent = `Загружено сообществ: ${groups.length}`;
  await render();
}

async function refreshVkChannels(accountId, statusEl) {
  const status = statusEl || document.querySelector(`.vk-ch-status[data-id="${CSS.escape(accountId)}"]`);
  if (status) status.textContent = "Запрашиваем сообщества VK…";
  try {
    const channels = await OnLead.api(`/api/accounts/${accountId}/channels`);
    const groups = channels.filter((c) => c.type !== "personal");
    if (!groups.length) {
      if (status) status.textContent = "VK не вернул админские сообщества. Проверьте права токена.";
      return;
    }
    if (status) status.textContent = `Загружено сообществ: ${groups.length}`;
    await render();
  } catch (err) {
    if (!err?.payload?.ipBound) {
      if (status) status.textContent = err.message;
      else alert(err.message);
      return;
    }
    if (status) status.textContent = "Токен привязан к IP — запрашиваем из браузера…";
    try {
      await refreshVkChannelsFromBrowser(accountId, status);
    } catch (err2) {
      if (status) status.textContent = err2.message;
      else alert(err2.message);
    }
  }
}

async function finishVkConnect({ accessToken, userId }) {
  if (!accessToken || vkConnecting) return;
  vkConnecting = true;
  if (!OnLead.loggedIn()) {
    try {
      sessionStorage.setItem(OnLead.VK_PENDING_KEY, JSON.stringify({ type: "vk-token", accessToken, userId }));
    } catch { /* ignore */ }
    vkConnecting = false;
    go("/login");
    return;
  }
  const status = document.getElementById("vk-connect-status");
  if (status) status.textContent = "Получаем ключ и все админские группы…";
  try {
    let channels = [];
    let groupsError = "";
    try {
      const fetched = await OnLead.fetchVkChannels(accessToken, userId);
      channels = fetched.channels || [];
      groupsError = fetched.groupsError || "";
    } catch (err) {
      groupsError = err.message || String(err);
    }
    const groups = channels.filter((c) => c.type !== "personal");
    if (status) {
      status.textContent = groups.length
        ? `Сохраняем аккаунт и ${groups.length} сообществ…`
        : "Сохраняем аккаунт (сообщества не загрузились)…";
    }
    await OnLead.api("/api/accounts", { method: "POST", body: { token: accessToken, userId, channels } });
    closeVkConnectModal();
    await render();
    if (!groups.length && groupsError && status) {
      status.textContent = `Аккаунт подключён, но сообщества не загрузились: ${groupsError}. Нажмите «Обновить сообщества» на карточке.`;
    }
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  } finally {
    vkConnecting = false;
  }
}

async function startVkOAuth() {
  const status = document.getElementById("vk-connect-status");
  if (status) status.textContent = "Открываем VK (5530956 → blank.html)…";
  try {
    const { url } = await OnLead.api("/api/vk/oauth-url");
    window.open(url, "vk_oauth", "width=720,height=780,noopener=no");
    if (status) {
      status.textContent = "После входа скопируйте весь URL страницы blank.html и вставьте в поле ниже.";
    }
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

async function startVkMessagesOAuth(accountId) {
  if (accountId) {
    const panel = document.querySelector(`.vk-msg-paste-panel[data-id="${CSS.escape(accountId)}"]`);
    if (panel) panel.hidden = false;
  }
  const status = accountId
    ? document.querySelector(`.vk-msg-status[data-id="${CSS.escape(accountId)}"]`)
    : document.querySelector(".vk-msg-status");
  if (status) status.textContent = "Открываем получение токена сообщений…";
  try {
    const { url } = await OnLead.api("/api/vk/oauth-url?kind=messages");
    const popup = window.open(url, "vk_oauth_msg", "width=720,height=780,noopener=no");
    if (!popup) {
      location.href = url;
      return;
    }
    if (status) {
      status.textContent = "После входа скопируйте URL blank.html и вставьте в поле ниже. В списке прав должно быть «Сообщения».";
    }
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

async function saveVkMessagesToken(accountId) {
  const box = document.querySelector(`.vk-msg-paste[data-id="${CSS.escape(accountId)}"]`);
  const status = document.querySelector(`.vk-msg-status[data-id="${CSS.escape(accountId)}"]`);
  const raw = box?.value || "";
  const parsed = OnLead.parseVkAccessToken(raw);
  if (!parsed?.accessToken) {
    if (status) status.textContent = "Вставьте URL blank.html или сам access_token.";
    else alert("Вставьте URL blank.html или сам access_token.");
    return;
  }
  if (status) status.textContent = "Проверяем право «Сообщения»…";
  try {
    await OnLead.api("/api/accounts/" + accountId + "/messages-token", {
      method: "POST",
      body: { messagesToken: parsed.accessToken },
    });
    await render();
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

function openVkConnectModal() {
  const modal = document.getElementById("vk-connect-modal");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("vk-modal-open");
  modal.querySelector("#vk-token-paste")?.focus();
}

function closeVkConnectModal() {
  const modal = document.getElementById("vk-connect-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("vk-modal-open");
}

function openVkEventLogModal() {
  document.querySelector(".vk-event-modal")?.remove();
  const host = document.createElement("div");
  host.className = "vk-event-modal";
  host.innerHTML = `<button type="button" class="vk-connect-modal__backdrop" data-act="vk-event-close" aria-label="Закрыть"></button>
    <div class="vk-connect-modal__card" role="dialog" aria-modal="true">
      <button type="button" class="vk-connect-modal__x" data-act="vk-event-close" aria-label="Закрыть">×</button>
      <h2>Журнал событий</h2>
      <p class="vk-slot__hint">Загружаем…</p>
    </div>`;
  document.body.appendChild(host);
  document.body.classList.add("vk-modal-open");
  OnLead.api("/api/me/logs").then((rows) => {
    const list = (rows || []).length
      ? rows.map((r) => `<div class="vk-log-row"><span>${esc(fmtWhen(r.at))}</span><span>${esc(r.message || "")}</span></div>`).join("")
      : `<p class="vk-slot__hint">Пока нет событий по VK-аккаунтам.</p>`;
    host.querySelector(".vk-connect-modal__card").innerHTML = `
      <button type="button" class="vk-connect-modal__x" data-act="vk-event-close" aria-label="Закрыть">×</button>
      <h2>Журнал событий</h2>
      <div class="vk-log-list">${list}</div>`;
  }).catch((err) => {
    host.querySelector(".vk-slot__hint").textContent = err.message;
  });
}

function closeVkEventLogModal() {
  document.querySelector(".vk-event-modal")?.remove();
  if (!document.getElementById("vk-connect-modal") || document.getElementById("vk-connect-modal").hidden) {
    document.body.classList.remove("vk-modal-open");
  }
}

function saveVkTokenFromPaste() {
  const raw = $("#vk-token-paste")?.value || "";
  const parsed = OnLead.parseVkAccessToken(raw);
  if (!parsed?.accessToken) {
    const status = document.getElementById("vk-connect-status");
    if (status) status.textContent = "Вставьте весь URL blank.html или сам access_token.";
    return;
  }
  finishVkConnect(parsed);
}

async function onClick(e) {
  const btn = e.target.closest("[data-act]");
  if (e.target.closest(".lk-side a") && lkNavNarrow()) setLkNav(false);
  if (!btn) return;
  if (btn.disabled || btn.hasAttribute("disabled")) return;
  if (btn.tagName === "BUTTON") e.preventDefault();
  const act = btn.dataset.act;
  try {
    if (act === "logout") {
      OnLead._lgChecked = undefined;
      OnLead._lgLoadedGroups = null;
      OnLead.logout();
      render();
      return;
    }
    if (act === "lk-nav-toggle") {
      const app = document.querySelector(".app");
      setLkNav(!app?.classList.contains("nav-open"));
      return;
    }
    if (act === "lk-nav-close") {
      setLkNav(false);
      return;
    }
    if (act === "topup") {
      await startCheckout({ kind: "topup", amount: Number(btn.dataset.amount || 1000) }, btn);
      return;
    }
    if (act === "dash-chart") {
      OnLead._chartDays = Number(btn.dataset.days || 30);
      await render();
      return;
    }
    if (act === "sub-period") {
      OnLead._packMonths = Number(btn.dataset.m || 1);
      await render();
      return;
    }
    if (act === "promo-hide") {
      try { localStorage.setItem("onlead-promo-hide", "1"); } catch { /* ignore */ }
      await render();
      return;
    }
    if (act === "dash-onboarding-dismiss") {
      try { localStorage.setItem("onlead.onboarding.dismissed", "1"); } catch { /* ignore */ }
      await render();
      return;
    }
    if (act === "transfer-ref") {
      await OnLead.api("/api/billing/transfer-ref", { method: "POST", body: { amount: "all" } });
      OnLead._flash = "Реферальный баланс переведён на основной счёт.";
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "resume-pay") {
      const kind = btn.dataset.kind || "topup";
      const body = { kind, method: "yookassa" };
      if (kind === "topup") body.amount = Number(btn.dataset.amount || 1000);
      if (kind === "package") {
        body.packageId = btn.dataset.package;
        body.months = Number(btn.dataset.m || 1);
      }
      if (kind === "tool") {
        body.slug = btn.dataset.slug;
        body.months = Number(btn.dataset.m || 1);
      }
      if (kind === "tg-plan") {
        body.tgPlan = btn.dataset.tgplan;
        body.months = Number(btn.dataset.m || 1);
      }
      await startCheckout(body, btn);
      return;
    }
    if (act === "copy") {
      navigator.clipboard?.writeText(btn.dataset.text || "");
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "save-profile") {
      await OnLead.api("/api/me", { method: "PATCH", body: { name: $("#prof-name").value, email: $("#prof-email").value } });
      await render(); return;
    }
    if (act === "vk-connect-open") { openVkConnectModal(); return; }
    if (act === "vk-connect-close") { closeVkConnectModal(); return; }
    if (act === "vk-event-log") { openVkEventLogModal(); return; }
    if (act === "vk-event-close") { closeVkEventLogModal(); return; }
    if (act === "vk-rent-slot") { go("/office/subscriptions"); return; }
    if (act === "vk-login") { await startVkOAuth(); return; }
    if (act === "vk-refresh-channels") { await refreshVkChannels(btn.dataset.id); return; }
    if (act === "vk-save-token") { saveVkTokenFromPaste(); return; }
    if (act === "vk-msg-login") { await startVkMessagesOAuth(btn.dataset.id); return; }
    if (act === "vk-msg-save") { await saveVkMessagesToken(btn.dataset.id); return; }
    if (act === "vk-msg-clear") {
      await OnLead.api("/api/accounts/" + btn.dataset.id + "/messages-token", {
        method: "POST",
        body: { clear: true },
      });
      await render();
      return;
    }
    if (act === "vk-mock") {
      await OnLead.api("/api/accounts", { method: "POST", body: { token: "mock:vk" } });
      await render(); return;
    }
    if (act === "lg-save-cfg") { await saveLeadgenCfg(); return; }
    if (act === "lg-scan") { await startLeadgenScan(); return; }
    if (act === "lg-load-groups") { await loadLeadgenGroups(); return; }
    if (act === "lg-save-groups") {
      await saveLeadgenGroups(true);
      document.getElementById("lg-groups-modal")?.setAttribute("hidden", "");
      return;
    }
    if (act === "lg-del-phrase") { await removeLeadgenPhrase(btn.dataset.id); return; }
    if (act === "lg-del-exclude") { await removeLeadgenExclude(btn.dataset.text); return; }
    if (act === "lg-niche") { await addLeadgenNiche(btn.dataset.id); return; }
    if (act === "lg-save-match") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { saveToCrm: true } });
      await render(); return;
    }
    if (act === "lg-del-match") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "dismissed" } });
      await render(); return;
    }
    if (act === "lg-restore-match") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "new" } });
      await render(); return;
    }
    if (act === "lg-filter") {
      OnLead._lgFilter = OnLead._lgFilter || { status: "", kind: "", phrase: "", author: "" };
      OnLead._lgFilter[btn.dataset.key] = btn.dataset.val;
      await render(); return;
    }
    if (act === "lg-apply-filters") {
      OnLead._lgFilter = OnLead._lgFilter || { status: "", kind: "", phrase: "", author: "" };
      OnLead._lgFilter.phrase = document.getElementById("lg-filter-phrase")?.value || "";
      OnLead._lgFilter.author = document.getElementById("lg-filter-author")?.value || "";
      await render(); return;
    }
    if (act === "lg-toggle-enabled") {
      await OnLead.api("/api/leadgen", { method: "PATCH", body: { enabled: btn.dataset.val === "1" } });
      await OnLead.refresh();
      await render(); return;
    }
    if (act === "lg-mark-saved") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "saved" } });
      await render(); return;
    }
    if (act === "lg-delete-match") {
      if (!confirm("Удалить совпадение безвозвратно?")) return;
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "DELETE" });
      await render(); return;
    }
    if (act === "lg-expand-match") {
      OnLead._lgExpanded = OnLead._lgExpanded === btn.dataset.id ? null : btn.dataset.id;
      await render(); return;
    }
    if (act === "lg-ai-score") {
      btn.disabled = true;
      try {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id + "/ai-score", { method: "POST" });
        await OnLead.refresh();
        OnLead._lgExpanded = btn.dataset.id;
        await render();
      } catch (err) { alert(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (act === "lg-ai-draft") {
      btn.disabled = true;
      try {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id + "/ai-draft", { method: "POST" });
        await OnLead.refresh();
        OnLead._lgExpanded = btn.dataset.id;
        await render();
      } catch (err) { alert(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (act === "lg-copy-draft") {
      await navigator.clipboard?.writeText(btn.dataset.text || "");
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "lg-open-groups") {
      document.getElementById("lg-groups-modal")?.removeAttribute("hidden");
      await loadLeadgenGroups();
      return;
    }
    if (act === "lg-close-groups") {
      document.getElementById("lg-groups-modal")?.setAttribute("hidden", "");
      return;
    }
    if (act === "nc-tab") {
      OnLead._ncTab = btn.dataset.tab || "settings";
      OnLead._ncDialogId = "";
      OnLead._ncThread = null;
      await render();
      return;
    }
    if (act === "nc-task-filter") {
      OnLead._ncTaskFilter = btn.dataset.val || "";
      await render();
      return;
    }
    if (act === "nc-toggle-enabled") {
      const cfg = OnLead.load().neurocomments || {};
      await OnLead.api("/api/neurocomments", { method: "PATCH", body: { enabled: !cfg.enabled } });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "nc-discover") {
      await OnLead.api("/api/neurocomments/discover", { method: "POST" });
      await OnLead.refresh();
      OnLead._flash = "Поиск постов выполнен";
      await render();
      return;
    }
    if (act === "nc-save-settings") {
      await OnLead.api("/api/neurocomments", {
        method: "PATCH",
        body: {
          accountId: document.getElementById("nc-account")?.value || null,
          dailyLimit: Number(document.getElementById("nc-limit")?.value || 20),
          tonePrompt: document.getElementById("nc-tone")?.value || "",
        },
      });
      await OnLead.refresh();
      OnLead._flash = "Настройки сохранены";
      await render();
      return;
    }
    if (act === "nc-toggle-mode") {
      const key = btn.dataset.key;
      const val = btn.dataset.val === "1";
      if (!key) return;
      await OnLead.api("/api/neurocomments", { method: "PATCH", body: { [key]: val } });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "nc-add-target") {
      const raw = String(document.getElementById("nc-target-raw")?.value || "").trim();
      if (!raw) return alert("Укажите ссылку или id");
      await OnLead.api("/api/neurocomments/targets", {
        method: "POST",
        body: { mode: document.getElementById("nc-target-mode")?.value || "wall", raw },
      });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "nc-del-target") {
      await OnLead.api("/api/neurocomments/targets/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "nc-cancel-task") {
      await OnLead.api("/api/neurocomments/tasks/" + btn.dataset.id + "/cancel", { method: "POST" });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "nc-add-block") {
      const recipientId = String(document.getElementById("nc-block-id")?.value || "").trim();
      if (!recipientId) return alert("Укажите id");
      await OnLead.api("/api/neurocomments/blocks", { method: "POST", body: { recipientId } });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "nc-del-block") {
      await OnLead.api("/api/neurocomments/blocks/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "nc-pick-dialog") {
      OnLead._ncDialogId = btn.dataset.id;
      OnLead._ncThread = null;
      await render();
      try {
        OnLead._ncThread = await OnLead.api("/api/neurocomments/dialogs/" + btn.dataset.id);
        await render();
      } catch (err) {
        alert(err.message);
      }
      return;
    }
    if (act === "nc-faq") {
      OnLead._ncFaqTab = btn.dataset.tab || "overview";
      OnLead._ncFaqOpen = true;
      await render();
      return;
    }
    if (act === "nc-faq-close") {
      OnLead._ncFaqOpen = false;
      await render();
      return;
    }
    if (act === "al-toggle") {
      const cfg = OnLead.load().aiLead || {};
      await OnLead.api("/api/ai-lead", { method: "PATCH", body: { enabled: !cfg.enabled } });
      OnLead._alRunMsg = "";
      OnLead._alRunErr = "";
      await render();
      return;
    }
    if (act === "al-save" || act === "al-save-list") {
      const body = OnLead.aiLeadCollectForm ? OnLead.aiLeadCollectForm() : {};
      await OnLead.api("/api/ai-lead", { method: "PATCH", body });
      OnLead._flash = "Сценарий сохранён";
      await render();
      return;
    }
    if (act === "al-run") {
      try {
        OnLead._alRunErr = "";
        const body = OnLead.aiLeadCollectForm ? OnLead.aiLeadCollectForm() : {};
        await OnLead.api("/api/ai-lead", { method: "PATCH", body });
        const r = await OnLead.api("/api/ai-lead/run", { method: "POST" });
        OnLead._alRunMsg = r.message || "Готово";
        await OnLead.refresh();
        await render();
      } catch (err) {
        OnLead._alRunMsg = "";
        OnLead._alRunErr = err.message || "Ошибка запуска";
        await render();
      }
      return;
    }
    if (act === "tg-funnel-tab") {
      OnLead._tgFunnelTab = btn.dataset.tab || "products";
      OnLead._tgFunnelCacheId = null;
      await render();
      return;
    }
    if (act === "tg-product-save") {
      const fid = btn.dataset.fid;
      const pid = btn.dataset.pid;
      const body = OnLead.tgProductCollect ? OnLead.tgProductCollect() : {};
      if (pid) {
        await OnLead.api("/api/tg/funnels/" + fid + "/products/" + pid, { method: "PATCH", body });
      } else {
        await OnLead.api("/api/tg/funnels/" + fid + "/products", { method: "POST", body });
      }
      OnLead._tgProductDraft = null;
      OnLead._tgFunnelCacheId = null;
      await render();
      return;
    }
    if (act === "tg-product-edit") {
      try { OnLead._tgProductDraft = JSON.parse(btn.dataset.json || "{}"); } catch { OnLead._tgProductDraft = {}; }
      await render();
      return;
    }
    if (act === "tg-product-cancel") {
      OnLead._tgProductDraft = null;
      await render();
      return;
    }
    if (act === "tg-product-toggle") {
      await OnLead.api("/api/tg/funnels/" + btn.dataset.fid + "/products/" + btn.dataset.pid, {
        method: "PATCH",
        body: { active: btn.dataset.active === "1" },
      });
      OnLead._tgFunnelCacheId = null;
      await render();
      return;
    }
    if (act === "tg-product-del") {
      if (!confirmDel("товар")) return;
      await OnLead.api("/api/tg/funnels/" + btn.dataset.fid + "/products/" + btn.dataset.pid, { method: "DELETE" });
      OnLead._tgFunnelCacheId = null;
      await render();
      return;
    }
    if (act === "lb-tab") {
      OnLead._lbTab = btn.dataset.tab || "list";
      await render();
      return;
    }
    if (act === "lb-pick-kind") {
      OnLead._lbKind = btn.dataset.kind || "lead";
      await render();
      return;
    }
    if (act === "lb-create") {
      const r = await OnLead.api("/api/lead-bots", {
        method: "POST",
        body: {
          kind: OnLead._lbKind || "lead",
          business: document.getElementById("lb-business")?.value || "",
          city: document.getElementById("lb-city")?.value || "",
          goal: document.getElementById("lb-goal")?.value || "",
          contact: document.getElementById("lb-contact")?.value || "",
        },
      });
      OnLead._lbTab = "list";
      if (r.kind === "widget") {
        const sn = await OnLead.api("/api/lead-bots/" + r.id + "/widget-snippet");
        OnLead._lbSnippet = sn.snippet || "";
      }
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "lb-snippet") {
      const sn = await OnLead.api("/api/lead-bots/" + btn.dataset.id + "/widget-snippet");
      OnLead._lbSnippet = sn.snippet || "";
      await render();
      return;
    }
    if (act === "lb-snippet-close") {
      OnLead._lbSnippet = "";
      await render();
      return;
    }
    if (act === "lb-copy-snippet") {
      const ta = document.querySelector(".tg-snippet-ta");
      if (ta) {
        ta.select();
        try { document.execCommand("copy"); OnLead._flash = "Сниппет скопирован"; } catch { /* ignore */ }
      }
      return;
    }
    if (act === "lb-funnel") {
      const r = await OnLead.api("/api/lead-bots/" + btn.dataset.id + "/deploy-funnel", { method: "POST" });
      OnLead._flash = "Воронка создана из сценария";
      await OnLead.refresh();
      if (r.funnel?.id) go("/office/telegram/funnels/" + r.funnel.id);
      else await render();
      return;
    }
    if (act === "lb-del") {
      if (!confirmDel(btn.dataset.name || "бот")) return;
      await OnLead.api("/api/lead-bots/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.refresh();
      await render();
      return;
    }
    if (act === "lg-save-notify") {
      const excludes = String(document.getElementById("lg-excludes")?.value || "")
        .split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      await OnLead.api("/api/leadgen", {
        method: "PATCH",
        body: {
          notifyEmail: !!document.getElementById("lg-notify-email")?.checked,
          notifyTelegram: !!document.getElementById("lg-notify-tg")?.checked,
          telegramChatId: document.getElementById("lg-tg-chat")?.value || "",
          excludePhrases: excludes,
        },
      });
      OnLead._flash = "Настройки уведомлений сохранены";
      await render(); return;
    }
    if (act === "lg-groups-all" || act === "lg-groups-none") {
      applyLeadgenGroupChecks(act === "lg-groups-all");
      return;
    }
    if (act === "list-del") {
      if (!confirmDel(btn.dataset.name || "список")) return;
      await OnLead.api("/api/lists/" + btn.dataset.id, { method: "DELETE" });
      go("/office/tools/lists");
      await render();
      return;
    }
    if (act === "list-rename") {
      const name = prompt("Название списка", btn.dataset.name || "");
      if (name == null) return;
      const title = name.trim();
      if (!title) return;
      await OnLead.api("/api/lists/" + btn.dataset.id, { method: "PATCH", body: { name: title } });
      await render();
      return;
    }
    if (act === "list-copy") {
      const list = await OnLead.api("/api/lists/" + btn.dataset.id);
      const ids = (list.items || []).map((p) => p.id).join("\n");
      await navigator.clipboard?.writeText(ids);
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "list-crm") {
      await OnLead.api("/api/lists/" + btn.dataset.id + "/crm", { method: "POST" });
      OnLead._flash = "Людей из списка отправили в CRM.";
      go("/office/crm");
      await render();
      return;
    }
    if (act === "del-acc") {
      await OnLead.api("/api/accounts/" + btn.dataset.id, { method: "DELETE" });
      await render(); return;
    }
    if (act === "buy-pack") {
      await startCheckout({
        packageId: btn.dataset.id,
        months: Number(btn.dataset.m || 1),
        amount: Number(btn.dataset.amount || 0),
      }, btn);
      return;
    }
    if (act === "buy-tool") {
      await startCheckout({ slug: btn.dataset.slug, months: Number(btn.dataset.m || 1), amount: Number(btn.dataset.amount || 0) }, btn);
      return;
    }
    if (act === "buy-tg") {
      await startCheckout({ kind: "tg-plan", tgPlan: btn.dataset.plan, months: Number(btn.dataset.m || 1), amount: Number(btn.dataset.amount || 0) }, btn);
      return;
    }
    if (act === "tg-trial") {
      await OnLead.api("/api/tg/trial", { method: "POST" });
      OnLead._flash = "Три дня Telegram включены: 1 слот Lite.";
      await render();
      return;
    }
    if (act === "new-landing") {
      await createLanding(btn.dataset.name || "Новая страница", btn.dataset.template || "");
      return;
    }
    if (act === "ol-save-landing") {
      await saveOlLandingEditor();
      return;
    }
    if (act === "ol-ai-generate") {
      const editor = document.querySelector(".ol-editor");
      const id = editor?.dataset.id;
      if (!id) return;
      const business = document.getElementById("ol-ai-business")?.value || "";
      const city = document.getElementById("ol-ai-city")?.value || "";
      btn.disabled = true;
      try {
        await OnLead.api("/api/landings/" + id + "/generate", { method: "POST", body: { business, city } });
        OnLead._flash = "AI переписал тексты — проверьте блоки и сохраните.";
        await OnLead.refresh();
        await render();
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
      return;
    }
    if (act === "ol-preview-toggle") {
      const box = document.getElementById("ol-preview-box");
      const editor = document.querySelector(".ol-editor");
      if (!box || !editor) return;
      const open = box.hasAttribute("hidden");
      if (open) {
        const page = (OnLead.load().landings || []).find((p) => p.id === editor.dataset.id) || {};
        const content = OnLead.collectLandingOlContent(editor, page);
        box.innerHTML = OnLead.landingOlPublicHtml({ ...page, content }, { preview: true });
        box.removeAttribute("hidden");
        btn.textContent = "Скрыть предпросмотр";
      } else {
        box.setAttribute("hidden", "");
        box.innerHTML = "";
        btn.textContent = "Предпросмотр";
      }
      return;
    }
    if (act === "publish-landing") {
      const olEd = document.querySelector(".ol-editor");
      let body = { status: btn.dataset.status };
      if (olEd) {
        const page = (OnLead.load().landings || []).find((p) => p.id === olEd.dataset.id) || {};
        const content = OnLead.collectLandingOlContent(olEd, page);
        const pro = OnLead.collectOlProFields ? OnLead.collectOlProFields(olEd) : {};
        body = {
          name: document.getElementById("ol-title")?.value || page.name,
          slug: document.getElementById("ol-slug")?.value || page.slug,
          seoDescription: document.getElementById("ol-seo")?.value || "",
          content,
          ...pro,
          status: btn.dataset.status,
        };
      } else {
        const form = $("#landing-edit-form");
        if (form) body = { ...landingFromForm(form), status: btn.dataset.status };
      }
      await OnLead.api("/api/landings/" + btn.dataset.id, { method: "PATCH", body });
      OnLead._flash = btn.dataset.status === "published" ? "Страница опубликована — можно делиться ссылкой." : "Страница снята с публикации.";
      await render();
      return;
    }
    if (act === "copy-landing-url") {
      await navigator.clipboard?.writeText(btn.dataset.url || "");
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "del-landing") {
      if (!confirmDel(btn.dataset.name || "страницу")) return;
      await OnLead.api("/api/landings/" + btn.dataset.id, { method: "DELETE" });
      OnLead._flash = "Страницу удалили.";
      go("/office/landings");
      await render();
      return;
    }
    if (act === "crm-pick") {
      OnLead._crmSelectedId = btn.dataset.id;
      await render();
      return;
    }
    if (act === "compose-ai") {
      const form = document.getElementById("compose-form");
      const id = form?.dataset.id;
      if (!id) { alert("Сначала сохраните черновик"); return; }
      await OnLead.saveComposeDraft(form, { quiet: true });
      try {
        await OnLead.api("/api/posts/" + id + "/ai-text", { method: "POST", body: {} });
        OnLead._flash = "Текст сгенерирован";
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "compose-schedule") {
      const form = document.getElementById("compose-form");
      if (!form) return;
      const body = OnLead.composeFormBody(form);
      if (!body.scheduledAt) { alert("Укажите дату и время в поле «Расписание»"); return; }
      body.status = "scheduled";
      const id = form.dataset.id;
      if (id) await OnLead.api("/api/posts/" + id, { method: "PATCH", body });
      else await OnLead.saveComposeDraft(form);
      OnLead._flash = "Пост запланирован";
      go("/office/content");
      await render();
      return;
    }
    if (act === "compose-publish") {
      const form = document.getElementById("compose-form");
      if (!form) return;
      const id = await OnLead.saveComposeDraft(form, { quiet: true });
      const fd = new FormData(form);
      try {
        const r = await OnLead.api("/api/posts/" + id + "/publish", {
          method: "POST",
          body: { accountId: fd.get("accountId"), ownerId: fd.get("ownerId") },
        });
        OnLead._flash = r.result?.permalink ? "Опубликовано в VK" : "Готово";
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "compose-trash") {
      if (!confirmDel("пост")) return;
      await OnLead.api("/api/posts/" + btn.dataset.id, { method: "DELETE" });
      OnLead._flash = "Пост в корзине";
      go("/office/content");
      await render();
      return;
    }
    if (act === "compose-submit-approval") {
      const form = document.getElementById("compose-form");
      if (!form) return;
      const id = await OnLead.saveComposeDraft(form, { quiet: true });
      try {
        await OnLead.api("/api/posts/" + id + "/submit-approval", { method: "POST" });
        OnLead._flash = "Отправлено на согласование";
        go("/office/workflow");
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "compose-pick-media") {
      try {
        const lib = await OnLead.api("/api/media/library");
        const rows = [...(lib.uploads || []), ...(lib.ai || [])];
        if (!rows.length) { alert("Медиатека пуста — загрузите фото или создайте в AI-картинках"); return; }
        const list = rows.slice(0, 8).map((r, i) => `${i + 1}. ${(r.prompt || r.name || r.url).slice(0, 40)}`).join("\n");
        const n = prompt(`Номер фото (1–${Math.min(8, rows.length)}):\n${list}`);
        const idx = Number(n) - 1;
        if (idx >= 0 && rows[idx]) {
          OnLead._composePickMedia = rows[idx].url;
          await render();
        }
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "ai-use-compose") {
      OnLead._composePickMedia = btn.dataset.url || "";
      go("/office/compose");
      return;
    }
    if (act === "ai-preset") {
      const ta = document.querySelector('#ai-images-form [name="prompt"]');
      if (ta) ta.value = btn.textContent.trim();
      return;
    }
    if (act === "cal-prev") {
      const d = OnLead._calMonth || new Date();
      OnLead._calMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      await OnLead.loadContentCalendar?.();
      await render();
      return;
    }
    if (act === "cal-next") {
      const d = OnLead._calMonth || new Date();
      OnLead._calMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      await OnLead.loadContentCalendar?.();
      await render();
      return;
    }
    if (act === "wf-approve") {
      await OnLead.api("/api/posts/" + btn.dataset.id + "/approve", { method: "POST" });
      OnLead._flash = "Пост утверждён";
      await OnLead.loadWorkflow?.();
      await render();
      return;
    }
    if (act === "wf-reject") {
      const reason = prompt("Причина отклонения (необязательно)") || "";
      await OnLead.api("/api/posts/" + btn.dataset.id + "/reject", { method: "POST", body: { reason } });
      OnLead._flash = "Пост отклонён";
      await OnLead.loadWorkflow?.();
      await render();
      return;
    }
    if (act === "wf-mode") {
      await OnLead.api("/api/workflow/settings", { method: "PATCH", body: { approvalMode: btn.dataset.mode } });
      OnLead._flash = "Режим сохранён";
      await OnLead.loadWorkflow?.();
      await render();
      return;
    }
    if (act === "repost-pick-src") {
      OnLead._repostSourceId = btn.dataset.id;
      await render();
      return;
    }
    if (act === "repost-fetch") {
      try {
        const r = await OnLead.api("/api/repost/sources/" + btn.dataset.id + "/fetch", { method: "POST" });
        OnLead._flash = `+${r.created || 0} новых, ${r.updated || 0} обновлено`;
        await OnLead.loadRepostItems?.();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "repost-del-src") {
      if (!confirmDel("источник")) return;
      await OnLead.api("/api/repost/sources/" + btn.dataset.id, { method: "DELETE" });
      OnLead._repostSourceId = "";
      OnLead._flash = "Источник удалён";
      await render();
      return;
    }
    if (act === "repost-save-src") {
      const card = btn.closest(".ap-settings");
      const wallSel = card?.querySelector('[name="ownerId"]');
      const wallOpt = wallSel?.selectedOptions?.[0];
      await OnLead.api("/api/repost/sources/" + btn.dataset.id, {
        method: "PATCH",
        body: {
          enabled: card?.querySelector('[name="enabled"]')?.checked,
          onlineMode: card?.querySelector('[name="onlineMode"]')?.checked,
          includeKeywords: card?.querySelector('[name="includeKeywords"]')?.value,
          excludeKeywords: card?.querySelector('[name="excludeKeywords"]')?.value,
          accountId: card?.querySelector('[name="accountId"]')?.value,
          ownerId: wallSel?.value,
          ownerLabel: wallOpt?.textContent || "",
        },
      });
      OnLead._flash = "Настройки сохранены";
      return;
    }
    if (act === "repost-import") {
      const sourceId = document.getElementById("repost-items-box")?.dataset.source;
      const ids = [...document.querySelectorAll('input[name="repost-item"]:checked')].map((el) => el.value);
      if (!sourceId || !ids.length) { alert("Выберите посты"); return; }
      try {
        const r = await OnLead.api("/api/repost/import", { method: "POST", body: { sourceId, items: ids.map((itemId) => ({ itemId })) } });
        OnLead._flash = `Импортировано: ${r.imported || 0}`;
        await OnLead.loadRepostItems?.();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "cnt-copy-url") {
      await navigator.clipboard?.writeText(btn.dataset.url || "");
      btn.textContent = "OK";
      return;
    }
    if (act === "cnt-del-media") {
      if (!confirm("Удалить файл?")) return;
      await OnLead.api("/api/media/" + btn.dataset.name, { method: "DELETE" });
      OnLead._flash = "Файл удалён";
      await OnLead.loadContentMediaGrid?.();
      return;
    }
    if (act === "rss-pick-src") {
      OnLead._rssSourceId = btn.dataset.id;
      await render();
      return;
    }
    if (act === "webhook-copy") {
      const url = OnLead._inboundWebhookUrl || document.querySelector(".ap-webhook-url")?.value || "";
      if (url) await navigator.clipboard?.writeText(url);
      btn.textContent = "Скопировано";
      setTimeout(() => { btn.textContent = "Копировать URL"; }, 1500);
      return;
    }
    if (act === "webhook-rotate") {
      if (!confirm("Старый URL перестанет работать. Сменить токен?")) return;
      try {
        const r = await OnLead.api("/api/webhooks/inbound/token/rotate", { method: "POST" });
        OnLead._inboundWebhookUrl = r.url || "";
        OnLead._flash = "Webhook URL обновлён";
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "rss-fetch") {
      try {
        const r = await OnLead.api("/api/rss/sources/" + btn.dataset.id + "/fetch", { method: "POST" });
        OnLead._flash = `+${r.created || 0} новых, ${r.updated || 0} обновлено`;
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "rss-del-src") {
      if (!confirmDel(btn.dataset.name || "источник")) return;
      await OnLead.api("/api/rss/sources/" + btn.dataset.id, { method: "DELETE" });
      OnLead._rssSourceId = "";
      OnLead._flash = "Источник удалён";
      await render();
      return;
    }
    if (act === "rss-save-src") {
      const card = btn.closest(".ap-settings");
      const wallSel = card?.querySelector('[name="ownerId"]');
      const wallOpt = wallSel?.selectedOptions?.[0];
      await OnLead.api("/api/rss/sources/" + btn.dataset.id, {
        method: "PATCH",
        body: {
          enabled: card?.querySelector('[name="enabled"]')?.checked,
          onlineMode: card?.querySelector('[name="onlineMode"]')?.checked,
          aiRewrite: card?.querySelector('[name="aiRewrite"]')?.checked,
          accountId: card?.querySelector('[name="accountId"]')?.value,
          ownerId: wallSel?.value,
          ownerLabel: wallOpt?.textContent || "",
        },
      });
      OnLead._flash = "Настройки сохранены";
      await render();
      return;
    }
    if (act === "rss-import") {
      const sourceId = btn.dataset.source || document.getElementById("rss-items-box")?.dataset.source;
      const ids = [...document.querySelectorAll('input[name="rss-item"]:checked')].map((el) => el.value);
      if (!ids.length) { alert("Отметьте записи"); return; }
      try {
        const r = await OnLead.api("/api/rss/import", {
          method: "POST",
          body: { sourceId, items: ids.map((id) => ({ itemId: id })) },
        });
        OnLead._flash = `Импортировано: ${r.imported}`;
        go("/office/content");
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "cross-plat") {
      const p = btn.dataset.plat;
      const plats = OnLead._crosspostPlats || ["vk", "telegram"];
      OnLead._crosspostPlats = plats.includes(p) ? plats.filter((x) => x !== p) : [...plats, p];
      await render();
      return;
    }
    if (act === "cross-adapt") {
      OnLead._crosspostSource = document.getElementById("cross-source")?.value || "";
      try {
        const r = await OnLead.api("/api/crosspost/adapt", {
          method: "POST",
          body: { text: OnLead._crosspostSource, platforms: OnLead._crosspostPlats || ["vk", "telegram"] },
        });
        OnLead._crosspostVersions = r.versions || {};
        OnLead._flash = "Адаптации готовы";
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "cross-drafts") {
      const versions = OnLead.collectCrosspostVersions ? OnLead.collectCrosspostVersions() : OnLead._crosspostVersions;
      const acc = document.getElementById("cross-account")?.value;
      const ownerId = document.getElementById("cross-owner")?.value;
      const ownerLabel = document.getElementById("cross-owner")?.selectedOptions?.[0]?.textContent || "";
      try {
        const r = await OnLead.api("/api/crosspost/drafts", {
          method: "POST",
          body: { versions, accountId: acc, ownerId, ownerLabel },
        });
        OnLead._flash = `Создано черновиков: ${r.count}`;
        go("/office/content");
        await render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "analytics-days") {
      OnLead._analyticsDays = Number(btn.dataset.days) || 30;
      await render();
      return;
    }
    if (act === "cab-del-item") {
      const kind = btn.dataset.kind;
      const id = btn.dataset.id;
      const c = OnLead.load().cabinet || {};
      const list = (c[kind] || []).filter((x) => x.id !== id);
      await OnLead.api("/api/cabinet/settings", { method: "PATCH", body: { [kind]: list } });
      OnLead._flash = "Удалено";
      await render();
      return;
    }
    if (act === "crm-quick-stage") {
      await OnLead.patchCrmLead(btn.dataset.id, { stage: btn.dataset.stage });
      await render();
      return;
    }
    if (act === "new-lead") {
      const name = prompt("Имя лида", "Новый контакт");
      if (!name) return;
      await OnLead.api("/api/leads", { method: "POST", body: { name } });
      await render(); return;
    }
    if (act === "edit-lead") {
      const name = prompt("Имя", btn.dataset.name || "");
      if (name == null) return;
      const phone = prompt("Телефон", btn.dataset.phone || "");
      if (phone == null) return;
      const city = prompt("Город", btn.dataset.city || "");
      if (city == null) return;
      const note = prompt("Заметка", btn.dataset.note || "");
      if (note == null) return;
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim(), phone, city, note } });
      await render();
      return;
    }
    if (act === "del-lead") {
      if (!confirmDel(btn.dataset.name || "лид")) return;
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "DELETE" });
      await render();
      return;
    }
    if (act === "archive-lead") {
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { archived: true } });
      await render();
      return;
    }
    if (act === "restore-lead") {
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { archived: false } });
      await render();
      return;
    }
    if (act === "add-bot") {
      return;
    }
    if (act === "edit-bot") {
      const name = prompt("Название", btn.dataset.name || "");
      if (name == null) return;
      await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim() } });
      await render();
      return;
    }
    if (act === "retoken-bot") {
      const token = prompt("Новый токен из @BotFather", "");
      if (token == null || !token.trim()) return;
      try {
        await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { token: token.trim() } });
        OnLead._flash = "Токен обновлён, webhook переустановлен.";
      } catch (err) {
        alert(err.message);
      }
      await render();
      return;
    }
    if (act === "toggle-bot") {
      await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
      await render();
      return;
    }
    if (act === "del-bot") {
      if (!confirmDel(btn.dataset.name || "бота")) return;
      await OnLead.api("/api/bots/" + btn.dataset.id, { method: "DELETE" });
      await render();
      return;
    }
    if (act === "refresh-tg-channels") {
      const res = await OnLead.api("/api/tg/channels/refresh", { method: "POST" });
      OnLead._flash = res.added ? `Добавлено каналов: ${res.added}` : (res.found ? "Список обновлён, новых каналов нет." : "Telegram не прислал каналы. Сделайте бота админом и напишите в канал, затем обновите снова.");
      await render();
      return;
    }
    if (act === "add-tg-channel") {
      const username = prompt("Канал (@name или ссылка)", "@onlead_channel");
      if (!username) return;
      await OnLead.api("/api/tg/channels", { method: "POST", body: { username, name: username } });
      await render();
      return;
    }
    if (act === "edit-tg-channel") {
      const name = prompt("Название", btn.dataset.name || "");
      if (name == null) return;
      const username = prompt("Username", btn.dataset.username || "");
      if (username == null) return;
      await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim(), username: username.trim() } });
      await render();
      return;
    }
    if (act === "toggle-tg-channel") {
      await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
      await render();
      return;
    }
    if (act === "del-tg-channel") {
      if (!confirmDel(btn.dataset.name || "канал")) return;
      await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "DELETE" });
      await render();
      return;
    }
    if (act === "add-funnel") {
      return;
    }
    if (act === "new-funnel") {
      const sc = OnLead.tgScenario(btn.dataset.scenario);
      if (!sc) return;
      const row = await OnLead.api("/api/tg/funnels", {
        method: "POST",
        body: { name: sc.name, scenario: sc.id, kind: sc.kind, sections: sc.sections },
      });
      go("/office/telegram/funnels/" + row.id);
      await render();
      return;
    }
    if (act === "funnel-add-section") {
      document.getElementById("funnel-sections")?.insertAdjacentHTML("beforeend", funnelSecHtml({ title: "Новый раздел", text: "", buttons: "" }));
      return;
    }
    if (act === "funnel-del-section") {
      btn.closest(".funnel-sec")?.remove();
      return;
    }
    if (act === "archive-funnel") {
      await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "PATCH", body: { status: "archive" } });
      await render();
      return;
    }
    if (act === "edit-funnel") {
      go("/office/telegram/funnels/" + btn.dataset.id);
      return;
    }
    if (act === "toggle-funnel") {
      await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
      await render();
      return;
    }
    if (act === "del-funnel") {
      if (!confirmDel(btn.dataset.name || "воронку")) return;
      await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "DELETE" });
      if (location.hash.includes("/funnels/")) go("/office/telegram/funnels");
      await render();
      return;
    }
    if (act === "pause-cam") {
      await OnLead.api("/api/campaigns/" + btn.dataset.id + "/pause", { method: "POST" });
      await render(); return;
    }
    if (act === "vk-tool-toggle") {
      const slug = btn.dataset.slug;
      const st = OnLead.load();
      const list = st.campaigns[slug] || [];
      const anyRunning = list.some((c) => c.status === "running");
      const targets = list.filter((c) => (anyRunning ? c.status === "running" : c.status === "paused"));
      for (const c of targets) {
        await OnLead.api("/api/campaigns/" + c.id + "/pause", { method: "POST" });
      }
      await render();
      return;
    }
    if (act === "vk-tool-run") {
      const form = document.getElementById("tool-form");
      if (!form) return alert("Заполните форму запуска ниже");
      form.requestSubmit();
      return;
    }
    if (act === "edit-cam") {
      const title = prompt("Название задачи", btn.dataset.title || "");
      if (title == null) return;
      await OnLead.api("/api/campaigns/" + btn.dataset.id, { method: "PATCH", body: { title: title.trim() } });
      await render();
      return;
    }
    if (act === "del-cam") {
      if (!confirmDel(btn.dataset.name || "задачу")) return;
      await OnLead.api("/api/campaigns/" + btn.dataset.id, { method: "DELETE" });
      await render();
      return;
    }
    if (act === "gm-approve" || act === "gm-deny") {
      await OnLead.api("/api/vk/groups/requests", {
        method: "POST",
        body: {
          action: act === "gm-approve" ? "approve" : "deny",
          groupId: btn.dataset.gid,
          userId: btn.dataset.uid,
          accountId: $("#tool-form [name=accountId]")?.value,
        },
      });
      await loadToolExtras("group-manager-vk");
      return;
    }
    if (act === "vk-chat-reply") {
      const peerId = btn.dataset.peer;
      const input = document.getElementById(`chat-reply-${peerId}`);
      const message = String(input?.value || "").trim();
      if (!message) return alert("Введите текст ответа");
      await OnLead.api("/api/vk/chats/reply", {
        method: "POST",
        body: {
          peerId,
          message,
          accountId: $("#tool-form [name=accountId]")?.value,
        },
      });
      if (input) input.value = "";
      OnLead._flash = "Сообщение отправлено";
      await loadToolExtras("chat-manager-vk");
      return;
    }
    if (act === "confirm-receipt") {
      await OnLead.api("/api/tg/receipts/" + btn.dataset.id + "/confirm", { method: "POST" });
      await OnLead.refresh();
      OnLead._flash = "Оплата подтверждена, клиенту отправлено сообщение";
      await loadTgReceipts();
      return;
    }
    if (act === "reject-receipt") {
      const note = prompt("Причина отклонения (необязательно)", "") ?? "";
      await OnLead.api("/api/tg/receipts/" + btn.dataset.id + "/reject", { method: "POST", body: { note } });
      await loadTgReceipts();
      return;
    }
  } catch (err) { alert(err.message); }
}

async function onToolSubmit(e) {
  e.preventDefault();
  const slug = e.target.dataset.slug;
  const state = OnLead.load();
  if (!OnLead.toolOn(state, slug)) return;
  const data = Object.fromEntries(new FormData(e.target).entries());
  const accountId = data.accountId || state.activeAccount;
  delete data.accountId;
  const btn = e.target.querySelector("button[type=submit]");
  const prev = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    if (slug === "image-ai") btn.textContent = "Создаём картинку…";
  }
  try {
    await OnLead.api("/api/campaigns", { method: "POST", body: { slug, accountId, payload: data } });
    await render();
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      if (prev) btn.textContent = prev;
    }
    alert(err.message);
  }
}

function vkAccountQuery() {
  const id = $("#tool-form [name=accountId]")?.value || "";
  return id ? `?accountId=${encodeURIComponent(id)}` : "";
}

function isBdayToday(bdate) {
  if (!bdate) return false;
  const p = String(bdate).split(".");
  if (p.length < 2) return false;
  const now = new Date();
  return Number(p[0]) === now.getDate() && Number(p[1]) === now.getMonth() + 1;
}

function syncAutopostPreview() {
  const form = $("#tool-form");
  if (!form || form.dataset.slug !== "autoposting-vk") return;
  const box = document.getElementById("autopost-preview");
  if (!box) return;
  const d = Object.fromEntries(new FormData(form).entries());
  let text = String(d.text || "").trim() || "—";
  const when = String(d.when || "Сейчас");
  const dest = String(d.dest || "");
  if (!/utm_[a-z]+=/i.test(text)) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const src = encodeURIComponent(String(d.utmSource || "onlead").trim() || "onlead");
      const med = encodeURIComponent(String(d.utmMedium || "vk").trim() || "vk");
      const camp = encodeURIComponent(String(d.utmCampaign || "autopost").trim() || "autopost");
      const url = urlMatch[0];
      const sep = url.includes("?") ? "&" : "?";
      text = text.replace(url, `${url}${sep}utm_source=${src}&utm_medium=${med}&utm_campaign=${camp}`);
    }
  }
  box.textContent = `[${when}]${dest ? ` · ${dest}` : ""}\n\n${text}`;
}

async function loadLandingsMedia() {
  const box = document.getElementById("landings-media-grid");
  if (!box) return;
  try {
    const lib = await OnLead.api("/api/media/library");
    const rows = [...(lib.uploads || []), ...(lib.ai || [])];
    if (!rows.length) {
      box.innerHTML = `<div class="card muted">Пока пусто — загрузите файл или сгенерируйте обложку в Image AI.</div>`;
      return;
    }
    box.innerHTML = `<div class="gallery">${rows.map((i) => `
      <a class="ph gen" href="${esc(i.url)}" target="_blank" rel="noopener" title="${esc(i.prompt || i.name || "")}">
        <img src="${esc(i.url)}" alt="${esc(i.prompt || i.name || "media")}" />
        <span>${esc((i.prompt || i.name || (i.source === "upload" ? "Загрузка" : "AI")).slice(0, 80))}</span>
      </a>`).join("")}</div>
      <p class="muted" style="font-size:12px;margin-top:10px">Скопируйте URL картинки и вставьте в поле фото лендинга.</p>`;
  } catch (err) {
    box.innerHTML = `<div class="card muted">${esc(err.message)}</div>`;
  }
}

async function onMediaUpload(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="file"]');
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("Файл больше 5 МБ");
    return;
  }
  try {
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    await OnLead.api("/api/media/upload", { method: "POST", body: { data, mime: file.type } });
    OnLead._flash = "Файл загружен";
    await loadLandingsMedia();
    if (input) input.value = "";
  } catch (err) {
    alert(err.message);
  }
}

async function loadTgFunnelOlData(id) {
  if (!OnLead.telegramFunnelOlEditor || OnLead._tgFunnelCacheId === id) return;
  try {
    const [products, orders] = await Promise.all([
      OnLead.api("/api/tg/funnels/" + id + "/products"),
      OnLead.api("/api/tg/funnels/" + id + "/orders"),
    ]);
    OnLead._tgProducts = products;
    OnLead._tgOrders = orders;
    OnLead._tgFunnelCacheId = id;
    await render();
  } catch { /* ignore */ }
}

async function loadTgReceipts() {
  const box = document.getElementById("tg-receipts-box");
  if (!box) return;
  box.innerHTML = `<div class="card muted">Загружаем чеки…</div>`;
  try {
    const rows = await OnLead.api("/api/tg/receipts");
    const pending = rows.filter((r) => r.status === "pending");
    box.innerHTML = `<div class="card">
      <b>Чеки на подтверждение · ${pending.length}</b>
      <p class="muted" style="margin:8px 0 0">После «Я оплатил» клиент присылает скрин — подтвердите, чтобы выдать доступ и создать лид.</p>
      ${pending.length ? pending.map((r) => `<div class="list-item" style="margin-top:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <b>${esc(r.tgName || r.tgUsername || "Telegram")}</b>
          <div class="muted">${esc(r.funnelName || "")}${r.product ? " · " + esc(r.product) : ""}${r.price ? " · " + esc(r.price) : ""}${r.createdAt ? " · " + fmtWhen(r.createdAt) : ""}</div>
        </div>
        <div class="match-actions">
          <button type="button" class="btn btn-primary btn-sm" data-act="confirm-receipt" data-id="${esc(r.id)}">Подтвердить</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="reject-receipt" data-id="${esc(r.id)}">Отклонить</button>
        </div>
      </div>`).join("") : `<p class="muted" style="margin-top:12px">Ожидающих чеков нет.</p>`}
    </div>`;
  } catch (err) {
    box.innerHTML = `<div class="card muted">${esc(err.message)}</div>`;
  }
}

async function loadToolExtras(slug) {
  const box = document.getElementById("tool-extra");
  if (!box) return;
  const live = ["congratulation-vk", "chat-manager-vk", "group-manager-vk", "invite-vk", "grabber-vk", "broom-vk", "ai-lead-vk", "autostoris-vk"];
  if (!live.includes(slug)) return;
  const q = vkAccountQuery();
  box.innerHTML = `<div class="card muted" style="margin-top:16px">Загружаем данные VK…</div>`;
  try {
    if (slug === "congratulation-vk") {
      const friends = await OnLead.api("/api/vk/friends" + q);
      const today = (friends || []).filter((f) => isBdayToday(f.bdate));
      const state = OnLead.load();
      const tasks = state.campaigns["congratulation-vk"] || [];
      const statusById = new Map();
      for (const c of tasks) {
        for (const row of c.stats?.congrats || []) {
          if (row?.id == null) continue;
          const id = Number(row.id);
          const prev = statusById.get(id);
          if (!prev || (row.ok && !prev.ok) || (row.at && prev.at && row.at > prev.at)) {
            statusById.set(id, row);
          }
        }
      }
      const sentN = today.filter((f) => statusById.get(Number(f.id))?.ok).length;
      const failN = today.filter((f) => {
        const s = statusById.get(Number(f.id));
        return s && !s.ok;
      }).length;
      const waitN = today.length - sentN - failN;
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Именинники сегодня · ${today.length}</b>
        <p class="muted" style="margin:8px 0 0">Отправлено ${sentN} · ошибки ${failN} · в очереди ${waitN}. Статус обновляется после запуска задачи.</p>
        ${today.length ? today.map((f) => {
          const st = statusById.get(Number(f.id));
          let chip = `<span class="chip">в очереди</span>`;
          let sub = `id ${f.id}`;
          if (st?.ok) {
            const via = st.via === "message" ? "ЛС" : st.via === "wall" ? "стена" : "отправлено";
            chip = `<span class="chip chip-ok">выполнено · ${via}</span>`;
            sub = `id ${f.id}${st.at ? ` · ${fmtWhen(st.at)}` : ""}`;
          } else if (st && !st.ok) {
            chip = `<span class="chip chip-bad">не отправлено</span>`;
            sub = `id ${f.id}`;
          } else if (f.canWritePrivateMessage === false) {
            sub += " · ЛС закрыты";
          }
          return `<div class="list-item" style="margin-top:8px"><div><b>${esc(f.firstName)} ${esc(f.lastName)}</b><div class="muted">${esc(sub)}</div></div>${chip}</div>`;
        }).join("") : `<p class="muted">Сегодня в друзьях нет дней рождения — задача отправит поздравления, когда они появятся.</p>`}
      </div>`;
      return;
    }
    if (slug === "chat-manager-vk") {
      const chats = await OnLead.api("/api/vk/chats" + q);
      const state = OnLead.load();
      const tasks = state.campaigns["chat-manager-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const st = task?.stats || {};
      const log = (st.chatLog || []).slice(0, 12);
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Менеджер чатов</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Чатов</span><b>${st.chats || chats.length || 0}</b></div>
          <div class="card"><span>ЛС</span><b>${st.replied || 0}</b></div>
          <div class="card"><span>Приветствия</span><b>${st.welcomed || 0}</b></div>
          <div class="card"><span>Модерация</span><b>${st.moderated || 0}</b></div>
          <div class="card"><span>Киков</span><b>${st.kicked || 0}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${esc(task.stats.lastMessage)}</p>` : ""}
        ${log.length ? `<h3 style="margin:16px 0 8px">Последние действия</h3>
          ${log.map((row) => `<div class="list-item" style="margin-top:6px"><div><b>${esc(row.kind || "")}</b> · ${esc(row.chat || "")}<div class="muted">${esc(row.note || "")}${row.at ? " · " + fmtWhen(row.at) : ""}</div></div></div>`).join("")}` : ""}
        <h3 style="margin:16px 0 8px">Диалоги · ${chats.length}</h3>
        ${chats.length ? chats.map((c) => `<div class="list-item" style="margin-top:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px"><b>${esc(c.title)}</b><div class="muted">${esc(c.last)}</div></div>
          ${c.unread ? `<span class="chip">${c.unread}</span>` : ""}
          <div style="width:100%;display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <input class="input" style="flex:1;min-width:160px" placeholder="Ответ из кабинета…" id="chat-reply-${esc(c.peerId)}">
            <button type="button" class="btn btn-primary btn-sm" data-act="vk-chat-reply" data-peer="${esc(c.peerId)}">Отправить</button>
          </div>
        </div>`).join("") : `<p class="muted">Диалогов нет или нет права messages.</p>`}
      </div>`;
      return;
    }
    if (slug === "ai-lead-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["ai-lead-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const dialogs = Object.values(task?.stats?.aiDialogs || {});
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>AI диалоги · ${dialogs.length}</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Активных</span><b>${dialogs.length}</b></div>
          <div class="card"><span>Ответов</span><b>${dialogs.filter((d) => (d.turns || 0) > 1).length}</b></div>
          <div class="card"><span>Горячие 8+</span><b>${dialogs.filter((d) => (d.score || 0) >= 8).length}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${esc(task.stats.lastMessage)}</p>` : ""}
        ${dialogs.length ? dialogs.slice(0, 15).map((d) => `<div class="list-item" style="margin-top:8px"><div>
          <b>${esc(d.name || ("id" + d.vkId))}</b>
          <div class="muted">ход ${d.turns || 1} · скоринг ${d.score || "—"}/10${d.lastReply ? " · " + esc(d.lastReply.slice(0, 60)) : ""}</div>
        </div></div>`).join("") : `<p class="muted">Диалоги появятся после первых касаний и ответов.</p>`}
      </div>`;
      return;
    }
    if (slug === "autostoris-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["autostoris-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const metrics = (task?.stats?.storyMetrics || []).slice(0, 12);
      const views = metrics.reduce((a, m) => a + (m.views || 0), 0);
      const clicks = metrics.reduce((a, m) => a + (m.clicks || 0), 0);
      const queueLeft = task?.stats?.storyQueueLeft ?? 0;
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Автосторис</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>В очереди</span><b>${queueLeft}</b></div>
          <div class="card"><span>Опубликовано</span><b>${metrics.length}</b></div>
          <div class="card"><span>Просмотры</span><b>${views}</b></div>
          <div class="card"><span>Клики</span><b>${clicks}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${esc(task.stats.lastMessage)}</p>` : ""}
        ${metrics.length ? metrics.map((m) => `<div class="list-item" style="margin-top:8px"><div>
          <b>${esc(m.caption || "Сторис")}</b>
          <div class="muted">${m.views || 0} просм · ${m.clicks || 0} клик · ${esc(m.via || "")}${m.at ? " · " + fmtWhen(m.at) : ""}</div>
        </div></div>`).join("") : `<p class="muted">Статистика появится после первой публикации.</p>`}
      </div>`;
      return;
    }
    if (slug === "invite-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["invite-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const st = task?.stats || {};
      const limit = Number(task?.payload?.perDay || 30);
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Инвайтинг</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Приглашено</span><b>${st.ok || 0}</b></div>
          <div class="card"><span>Вступили</span><b>${st.joinedCount ?? (st.joinedIds || []).length}</b></div>
          <div class="card"><span>Лимит/день</span><b>${limit}</b></div>
          <div class="card"><span>Ошибки</span><b>${st.fail || 0}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${esc(task.stats.lastMessage)}</p>` : ""}
        <p class="muted" style="margin:8px 0 0">Чёрный список и «Вступили» обновляются после запуска задачи.</p>
      </div>`;
      return;
    }
    if (slug === "grabber-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["grabber-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const st = task?.stats || {};
      const grabbed = (st.grabbedKeys || []).length;
      const queued = (state.autopostQueue || []).length;
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Граббер постов</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Собрано ключей</span><b>${grabbed}</b></div>
          <div class="card"><span>В очереди автопостинга</span><b>${queued}</b></div>
          <div class="card"><span>Успешно</span><b>${st.ok || 0}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${esc(task.stats.lastMessage)}</p>` : `<p class="muted">Запустите задачу — здесь появятся сбор и очередь.</p>`}
      </div>`;
      return;
    }
    if (slug === "group-manager-vk") {
      const groups = await OnLead.api("/api/vk/groups" + q);
      let reqsHtml = "";
      if (groups[0]) {
        const gid = groups[0].id;
        const reqs = await OnLead.api(`/api/vk/groups/requests?groupId=${encodeURIComponent(gid)}${q ? "&" + q.slice(1) : ""}`);
        reqsHtml = `<h3 style="margin:16px 0 8px">Заявки в «${esc(groups[0].name)}»</h3>
          ${reqs.length ? reqs.map((r) => `<div class="list-item"><div><b>${esc(r.firstName)} ${esc(r.lastName)}</b></div>
            <div class="match-actions">
              <button class="btn btn-primary btn-sm" data-act="gm-approve" data-gid="${gid}" data-uid="${r.id}">Одобрить</button>
              <button class="btn btn-ghost btn-sm" data-act="gm-deny" data-gid="${gid}" data-uid="${r.id}">Отклонить</button>
            </div></div>`).join("") : `<p class="muted">Открытых заявок нет.</p>`}`;
      }
      box.innerHTML = `<div class="card" style="margin-top:16px"><b>Сообщества, где вы админ · ${groups.length}</b>
        ${groups.length ? groups.map((g) => `<div class="list-item" style="margin-top:8px"><div><b>${esc(g.name)}</b><div class="muted">${esc(g.screenName || "")} · id ${g.id}</div></div></div>`).join("") : `<p class="muted">Нет управляемых сообществ — войдите через VK.</p>`}
        ${reqsHtml}
      </div>`;
      return;
    }
    if (slug === "broom-vk") {
      const friends = await OnLead.api("/api/vk/friends" + q);
      const suspects = (friends || []).filter((f) => f.deactivated || !f.photo);
      box.innerHTML = `<div class="card" style="margin-top:16px"><b>Кандидаты на чистку · ${suspects.length} из ${friends.length}</b>
        ${suspects.length ? suspects.slice(0, 30).map((f) => `<div class="list-item" style="margin-top:8px"><div><b>${esc(f.firstName)} ${esc(f.lastName)}</b><div class="muted">${f.deactivated ? "деактивирован" : "нет фото"}</div></div></div>`).join("") : `<p class="muted">По текущим правилам чистить некого.</p>`}
      </div>`;
    }
  } catch (err) {
    box.innerHTML = `<div class="card muted" style="margin-top:16px">${esc(err.message)}</div>`;
  }
}

async function saveOlLandingEditor() {
  const editor = document.querySelector(".ol-editor");
  if (!editor) return;
  const id = editor.dataset.id;
  const page = (OnLead.load().landings || []).find((p) => p.id === id) || {};
  const content = OnLead.collectLandingOlContent(editor, page);
  const pro = OnLead.collectOlProFields ? OnLead.collectOlProFields(editor) : {};
  await OnLead.api("/api/landings/" + id, {
    method: "PATCH",
    body: {
      name: document.getElementById("ol-title")?.value || page.name,
      slug: document.getElementById("ol-slug")?.value || page.slug,
      seoDescription: document.getElementById("ol-seo")?.value || "",
      content,
      ...pro,
    },
  });
  OnLead._flash = "Сохранили";
  await OnLead.refresh();
}

async function createLanding(name, template) {
  const tpl = OnLead.landingTemplate(template);
  const title = String(name || tpl?.name || "").trim() || "Новая страница";
  const body = tpl
    ? {
        name: title,
        template: tpl.id,
        layout: tpl.layout,
        kicker: tpl.kicker,
        headline: tpl.headline,
        sub: tpl.sub,
        cta: tpl.cta,
        formTitle: tpl.formTitle,
        features: tpl.features,
        fields: tpl.fields,
        tone: tpl.tone,
        quote: tpl.quote,
        author: tpl.author,
        role: tpl.role,
        urgency: tpl.urgency,
        stats: tpl.stats,
        steps: tpl.steps,
        prices: tpl.prices,
        outcomes: tpl.outcomes,
        audience: tpl.audience,
        faq: tpl.faq,
        reviews: tpl.reviews,
        meta: tpl.meta,
      }
    : { name: title, headline: title, sub: "Оставьте заявку — перезвоним в рабочее время.", cta: "Оставить заявку", formTitle: "Оставьте заявку", fields: ["name", "phone"], tone: "teal", layout: "specialist" };
  const created = await OnLead.api("/api/landings", { method: "POST", body });
  OnLead._flash = `Черновик «${title}» создан. Опубликуйте, чтобы открыть ссылку клиентам.`;
  go("/office/landings/pages/" + created.id);
  await render();
}

async function onLandingCreate(e) {
  e.preventDefault();
  const name = String(new FormData(e.target).get("name") || "").trim();
  try {
    await createLanding(name);
  } catch (err) {
    alert(err.message);
  }
}

function funnelFromForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  const sections = [...form.querySelectorAll(".funnel-sec")].map((el) => ({
    title: el.querySelector("[name=title]")?.value || "",
    text: el.querySelector("[name=text]")?.value || "",
    buttons: el.querySelector("[name=buttons]")?.value || "",
  }));
  return {
    name: d.name,
    product: d.product || "",
    price: d.price || "",
    botId: d.botId || "",
    sections,
  };
}

function bindTelegramForms() {
  $("#bot-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = String(e.target.token?.value || "").trim();
    try {
      await OnLead.api("/api/bots", { method: "POST", body: { token } });
      OnLead._flash = "Бот подключён.";
      await render();
    } catch (err) {
      alert(err.message);
    }
  });
  $("#tg-channel-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = String(e.target.username?.value || "").trim();
    try {
      await OnLead.api("/api/tg/channels", { method: "POST", body: { username } });
      await render();
    } catch (err) {
      alert(err.message);
    }
  });
  $("#funnel-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = OnLead.tgSettingsFromForm
        ? OnLead.tgSettingsFromForm(e.target)
        : funnelFromForm(e.target);
      await OnLead.api("/api/tg/funnels/" + e.target.dataset.id, { method: "PATCH", body });
      OnLead._flash = "Воронку сохранили.";
      await render();
    } catch (err) {
      alert(err.message);
    }
  });
}

function bindLandingEditor() {
  const form = $("#landing-edit-form");
  if (!form) return;
  const hostSel = form.querySelector("#landing-host-select");
  const customWrap = document.getElementById("landing-host-custom-wrap");
  const syncCustomHost = () => {
    if (customWrap && hostSel) customWrap.style.display = hostSel.value === "__custom__" ? "" : "none";
  };
  hostSel?.addEventListener("change", syncCustomHost);
  syncCustomHost();
  const paint = () => {
    const box = document.getElementById("lp-live");
    if (!box) return;
    const page = { ...landingFromForm(form), id: form.dataset.id };
    box.className = `lp-preview-frame tone-${page.tone || "teal"}`;
    box.innerHTML = landingPageView(page, { preview: true });
  };
  form.addEventListener("input", paint);
  form.addEventListener("change", paint);
  form.addEventListener("submit", onLandingSave);
}

async function onLandingSave(e) {
  e.preventDefault();
  const form = e.target;
  try {
    await OnLead.api("/api/landings/" + form.dataset.id, { method: "PATCH", body: landingFromForm(form) });
    OnLead._flash = "Сохранили";
    await render();
  } catch (err) {
    alert(err.message);
  }
}

function publicLandingMissing() {
  return `<div class="lp-pub">
    <div class="lp-pub-bar"><a href="#/"><b>OnLead</b></a></div>
    <div class="lp-wrap"><div class="card lp-ok"><h3>Страница недоступна</h3><p class="muted">Её сняли с публикации или ссылка устарела.</p></div></div>
  </div>`;
}

function publicLandingHtml(page) {
  if (OnLead.landingOlPublicHtml) return OnLead.landingOlPublicHtml(page);
  const lay = normLayout(page.layout);
  const tone = page.tone || "teal";
  const pixel = page.pixelHtml ? `<div class="lp-pixel">${page.pixelHtml}</div>` : "";
  return `${pixel}<div class="lp-pub lp-pro-pub lp-pub-${esc(lay)} lp-${esc(tone)}">${landingPageView(page)}</div>`;
}

async function renderPublicLanding(path, root) {
  const bySlug = path.startsWith("/l/");
  const key = decodeURIComponent(path.replace(/^\/(p|l)\//, ""));
  if (!key) {
    document.title = "OnLead";
    root.innerHTML = publicLandingMissing();
    return;
  }
  try {
    const apiPath = bySlug
      ? `/api/public/landings/slug/${encodeURIComponent(key)}`
      : `/api/public/landings/${encodeURIComponent(key)}`;
    const page = await OnLead.api(apiPath);
    document.title = page.headline || page.name || "OnLead";
    if (page.seoDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = page.seoDescription;
    }
    root.innerHTML = publicLandingHtml(page);
    const form = document.getElementById("ol-lead-form") || document.getElementById("lp-lead-form");
    form?.addEventListener("submit", onPublicLead);
    scrollToHashAnchor();
  } catch {
    document.title = "OnLead";
    root.innerHTML = publicLandingMissing();
  }
}

async function onPublicLead(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const btn = form.querySelector("[type=submit]");
  const prev = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Отправляем…"; }
  try {
    await OnLead.api("/api/public/landings/" + encodeURIComponent(form.dataset.id) + "/leads", { method: "POST", body: data });
    const okText = form.dataset.success || "Заявка принята — перезвоним в рабочее время.";
    form.outerHTML = `<div class="card lp-ok ol-ok"><h3>${esc(okText)}</h3></div>`;
  } catch (err) {
    if (btn) { btn.disabled = false; if (prev) btn.textContent = prev; }
    alert(err.message || "Не получилось отправить заявку. Попробуйте ещё раз.");
  }
}

async function onParse(e) {
  e.preventDefault();
  const kind = e.target.dataset.kind;
  const data = Object.fromEntries(new FormData(e.target).entries());
  const status = $("#parse-status");
  const btn = e.target.querySelector("button[type=submit]");
  const prev = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Собираем…"; }
  if (status) status.textContent = "Собираем аудиторию в VK…";
  try {
    const list = await OnLead.api("/api/parsers", { method: "POST", body: { kind, ...data } });
    OnLead._flash = `Готово: ${list.name} · ${list.count} человек`;
    go("/office/tools/lists/" + list.id);
    await render();
  } catch (err) {
    if (btn) { btn.disabled = false; if (prev) btn.textContent = prev; }
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

function personName(p) {
  return [p.firstName || p.first_name, p.lastName || p.last_name].filter(Boolean).join(" ") || ("id" + p.id);
}

async function loadOpenList() {
  const m = route().path.match(/\/lists\/([^/]+)$/);
  const box = $("#list-people");
  if (!m || !box) return;
  try {
    const list = await OnLead.api("/api/lists/" + m[1]);
    const people = list.items || [];
    const meta = $("#list-meta");
    if (meta) meta.textContent = `${people.length.toLocaleString("ru-RU")} человек · ${list.source || ""}`;
    box.className = "";
    box.innerHTML = people.length ? `<table class="table"><thead><tr><th>Имя</th><th>Город</th><th></th></tr></thead><tbody>
      ${people.map((p) => {
        const href = p.url || ("https://vk.com/id" + p.id);
        return `<tr><td><a href="${esc(href)}" target="_blank" rel="noopener">${esc(personName(p))}</a></td><td>${esc(p.cityTitle || p.city || "—")}</td><td><a class="btn btn-ghost btn-sm" href="${esc(href)}" target="_blank" rel="noopener">VK</a></td></tr>`;
      }).join("")}
    </tbody></table>` : `<div class="card muted">В списке пока никого нет.</div>`;
  } catch (err) {
    box.className = "card muted";
    box.textContent = err.message;
  }
}

async function saveLeadgenCfg() {
  await OnLead.api("/api/leadgen", {
    method: "PATCH",
    body: {
      accountId: $("#lg-account")?.value || null,
      scanTarget: $("#lg-target")?.value || "all",
      scanIntervalMin: Number($("#lg-interval")?.value || 30),
      postsLimit: Number($("#lg-posts")?.value || 20),
      commentsPerPost: Number($("#lg-comments")?.value || 20),
    },
  });
  const status = $("#lg-status");
  if (status) status.textContent = "Настройки сохранены";
}

function collectedLeadgenGroups() {
  syncLeadgenCheckedFromDom();
  const byId = new Map();
  document.querySelectorAll("#lg-group-list input[data-gid]").forEach((el) => {
    const id = lgNormId(el.dataset.gid);
    if (!id || !el.checked) return;
    byId.set(id, {
      externalGroupId: id,
      name: el.dataset.gname,
      screenName: el.dataset.gsn,
    });
  });
  return [...byId.values()];
}

function updateLeadgenGroupCount() {
  const el = $("#lg-group-count");
  if (!el) return;
  const all = document.querySelectorAll("#lg-group-list input[data-gid]").length;
  const n = document.querySelectorAll("#lg-group-list input[data-gid]:checked").length;
  el.textContent = all ? `Выбрано: ${n} из ${all}. Выбор сохраняется сам.` : "Нажмите «Загрузить из VK» — подтянутся сообщества аккаунта.";
}

function filterLeadgenGroups(q) {
  const needle = String(q || "").trim().toLowerCase();
  document.querySelectorAll("#lg-group-list .lg-check").forEach((el) => {
    const name = (el.dataset.gname || el.textContent || "").toLowerCase();
    el.style.display = !needle || name.includes(needle) ? "" : "none";
  });
}

function setLeadgenGroupControls(hasGroups) {
  const on = OnLead.toolOn(OnLead.load(), "leadgen-vk");
  const q = $("#lg-group-q");
  if (q) q.disabled = !hasGroups;
  document.querySelectorAll("[data-act=lg-groups-all],[data-act=lg-groups-none]").forEach((b) => {
    b.disabled = !on || !hasGroups;
  });
}

function applyLeadgenGroupChecks(check) {
  const set = leadgenCheckedSet();
  document.querySelectorAll("#lg-group-list input[data-gid]").forEach((inp) => {
    inp.checked = check;
    const id = lgNormId(inp.dataset.gid);
    if (!id) return;
    if (check) set.add(id);
    else set.delete(id);
  });
  updateLeadgenGroupCount();
  scheduleLeadgenGroupsSave();
}

function nextLeadgenSaveGen() {
  OnLead._lgSaveGen = (Number(OnLead._lgSaveGen) || 0) + 1;
  return OnLead._lgSaveGen;
}

function scheduleLeadgenGroupsSave() {
  clearTimeout(OnLead._lgSaveTimer);
  const gen = nextLeadgenSaveGen();
  OnLead._lgSaveTimer = setTimeout(() => {
    if (!document.querySelector("#lg-group-list input[data-gid]")) return;
    saveLeadgenGroups(false, gen).catch((err) => {
      const status = $("#lg-status");
      if (status) status.textContent = err.message;
    });
  }, 500);
}

function bindLeadgenUi() {
  const q = $("#lg-group-q");
  const list = $("#lg-group-list");
  if (!q && !list) return;
  if (q) {
    q.value = OnLead._lgGroupQ || "";
    filterLeadgenGroups(q.value);
    q.addEventListener("input", () => {
      OnLead._lgGroupQ = q.value;
      filterLeadgenGroups(q.value);
    });
  }
  if (list) {
    if (OnLead._lgListScroll) list.scrollTop = OnLead._lgListScroll;
    list.addEventListener("scroll", () => { OnLead._lgListScroll = list.scrollTop; }, { passive: true });
    list.addEventListener("change", () => {
      syncLeadgenCheckedFromDom();
      updateLeadgenGroupCount();
      scheduleLeadgenGroupsSave();
    });
  }
  setLeadgenGroupControls(!!list?.querySelector("input[data-gid]"));
  const allBtn = document.querySelector("[data-act=lg-groups-all]");
  const noneBtn = document.querySelector("[data-act=lg-groups-none]");
  allBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    applyLeadgenGroupChecks(true);
  });
  noneBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    applyLeadgenGroupChecks(false);
  });
}

async function saveLeadgenGroups(refresh = true, gen) {
  const my = gen == null ? nextLeadgenSaveGen() : gen;
  const groups = collectedLeadgenGroups();
  await OnLead.api("/api/leadgen/groups", { method: "PUT", body: { groups } });
  if (my !== OnLead._lgSaveGen) return;
  const state = OnLead.load();
  if (state?.leadgen) state.leadgen.groups = groups;
  const status = $("#lg-status");
  if (status) status.textContent = `Сохранено сообществ: ${groups.length}`;
  if (refresh === true) await render();
}

async function loadLeadgenGroups() {
  const status = $("#lg-status");
  if (status) status.textContent = "Загружаем сообщества…";
  try {
    await saveLeadgenCfg();
    const list = await OnLead.api("/api/leadgen/groups");
    OnLead._lgLoadedGroups = (list || []).map((g) => ({
      id: lgNormId(g.id),
      name: g.name,
      screenName: g.screenName || "",
    }));
    const selected = leadgenCheckedSet();
    const box = $("#lg-group-list");
    if (!box) return;
    box.innerHTML = OnLead._lgLoadedGroups.length
      ? OnLead._lgLoadedGroups.map((g) => leadgenGroupRowHtml(g, selected.has(lgNormId(g.id)))).join("")
      : `<span class="muted">VK не вернул группы</span>`;
    setLeadgenGroupControls(!!OnLead._lgLoadedGroups.length);
    const q = $("#lg-group-q");
    filterLeadgenGroups(OnLead._lgGroupQ || q?.value || "");
    updateLeadgenGroupCount();
    if (status) status.textContent = `Загружено сообществ: ${OnLead._lgLoadedGroups.length}`;
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

async function onLeadgenAddPhrase(e) {
  e.preventDefault();
  const phrase = String(new FormData(e.target).get("phrase") || "").trim();
  if (!phrase) return;
  const phrases = [...(OnLead.load().leadgen?.phrases || [])];
  if (!phrases.some((p) => p.phrase.toLowerCase() === phrase.toLowerCase())) {
    phrases.push({ phrase, caseInsensitive: true });
  }
  await OnLead.api("/api/leadgen/phrases", { method: "PUT", body: { phrases } });
  await render();
}

async function onLeadgenExclude(e) {
  e.preventDefault();
  const text = String(new FormData(e.target).get("exclude") || "").trim();
  if (!text) return;
  const excludePhrases = [...new Set([...(OnLead.load().leadgen?.excludePhrases || []), text])];
  await OnLead.api("/api/leadgen", { method: "PATCH", body: { excludePhrases } });
  await render();
}

async function removeLeadgenPhrase(id) {
  const phrases = (OnLead.load().leadgen?.phrases || []).filter((p) => p.id !== id);
  await OnLead.api("/api/leadgen/phrases", { method: "PUT", body: { phrases } });
  await render();
}

async function removeLeadgenExclude(text) {
  const excludePhrases = (OnLead.load().leadgen?.excludePhrases || []).filter((p) => p !== text);
  await OnLead.api("/api/leadgen", { method: "PATCH", body: { excludePhrases } });
  await render();
}

async function addLeadgenNiche(id) {
  const niche = OnLead.NICHES.find((n) => n.id === id);
  if (!niche) return;
  const phrases = [...(OnLead.load().leadgen?.phrases || [])];
  for (const phrase of niche.phrases) {
    if (!phrases.some((p) => p.phrase.toLowerCase() === phrase.toLowerCase())) {
      phrases.push({ phrase, caseInsensitive: true });
    }
  }
  await OnLead.api("/api/leadgen/phrases", { method: "PUT", body: { phrases } });
  await render();
}

async function startLeadgenScan() {
  const status = $("#lg-status");
  try {
    await saveLeadgenCfg();
    if (document.querySelectorAll("#lg-group-list input[data-gid]").length) await saveLeadgenGroups(false);
    await OnLead.api("/api/leadgen/scan", { method: "POST" });
    if (status) status.textContent = "Скан в очереди…";
    const scanBtn = document.querySelector("[data-act=lg-scan]");
    if (scanBtn) { scanBtn.disabled = true; scanBtn.textContent = "Сканируем…"; }
    pollLeadgenScan();
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

function pollLeadgenScan() {
  clearInterval(OnLead._leadgenPoll);
  let n = 0;
  let seenActive = false;
  OnLead._leadgenPoll = setInterval(async () => {
    n += 1;
    try {
      const cfg = await OnLead.api("/api/leadgen");
      const active = cfg.scanStatus === "running" || cfg.scanStatus === "queued";
      if (active) seenActive = true;
      const statusEl = $("#lg-status");
      if (statusEl && active) {
        statusEl.textContent = cfg.scanStatus === "queued" ? "В очереди…" : "Сканируем сообщества…";
      }
      if (!active && (seenActive || n > 3)) {
        clearInterval(OnLead._leadgenPoll);
        await render();
        return;
      }
      if (n > 90) {
        clearInterval(OnLead._leadgenPoll);
        await render();
      }
    } catch {
      clearInterval(OnLead._leadgenPoll);
    }
  }, 2000);
}
