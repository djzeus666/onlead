window.OnLead = window.OnLead || {};

const $ = (sel, root = document) => root.querySelector(sel);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c] || c);
OnLead.esc = esc;

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
OnLead.icon = icon;

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
OnLead.paintOfficeBalance = paintOfficeBalance;

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
OnLead.userInitials = userInitials;

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
OnLead.officeChrome = officeChrome;

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
    if (path === "/office/content" && ["calendar", "day", "week"].includes(hashParams().get("view"))) {
      if (!OnLead._calHydrated) {
        OnLead._calHydrated = true;
        await OnLead.loadContentCalendar?.();
        if (seq !== renderSeq) return;
        await render();
        OnLead._calHydrated = false;
        return;
      }
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
OnLead.render = render;
OnLead.go = go;
OnLead.confirmDel = confirmDel;

/* ========== LANDING ========== */

/* ========== OFFICE ========== */
function officeShell(path) { return OnLead.officeShell(path); }
function setLkNav(open) { return OnLead.setLkNav(open); }
function hrefPath(href) { return OnLead.hrefPath(href); }
function navActive(path, href) { return OnLead.navActive(path, href); }

function toolsHub(state) { return OnLead.toolsHub(state); }
function toolPage(slug, state) { return OnLead.toolPage(slug, state); }

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
OnLead.officePage = officePage;

function toolPriceLabel(t) {
  return t.price ? `${t.price} ₽/мес` : "входит в парсеры";
}
OnLead.toolPriceLabel = toolPriceLabel;

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
OnLead.toolRow = toolRow;

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

function accounts(state) { return OnLead.accountsOlPage(state); }
function channelLabel(c) { return OnLead.channelLabel(c); }
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

function fmtLeadgenTime(ts) { return OnLead.fmtLeadgenTime(ts); }
function highlightLeadgenText(text, phrase) { return OnLead.highlightLeadgenText(text, phrase); }
function vkGroupHref(g) { return OnLead.vkGroupHref(g); }
function lgNormId(v) { return OnLead.lgNormId(v); }
function leadgenCheckedSet(state) { return OnLead.leadgenCheckedSet(state); }
function syncLeadgenCheckedFromDom() { return OnLead.syncLeadgenCheckedFromDom(); }
function leadgenGroupRowHtml(g, checked) { return OnLead.leadgenGroupRowHtml(g, checked); }
function leadgenGroupRows(state) { return OnLead.leadgenGroupRows(state); }
function lgFilterBtn(key, val, label, current) { return OnLead.lgFilterBtn(key, val, label, current); }
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
function bundleHub(id, state) { return OnLead.bundleHub(id, state); }
function parserPaywall(state, slug) { return OnLead.parserPaywall(state, slug); }
function parsers(path, state) { return OnLead.parsers(path, state); }
function sectionNav(id, path) { return OnLead.sectionNav(id, path); }
function telegram(path, state) { return OnLead.telegram(path, state); }
function landings(path, state) { return OnLead.landings(path, state); }
function landingPublicUrl(id, page) { return OnLead.landingPublicUrl(id, page); }
function landingFromForm(form) { return OnLead.landingFromForm(form); }
function landingPageView(page, opts) { return OnLead.landingPageView(page, opts); }
function landingEditor(page, state) { return OnLead.landingEditor(page, state); }
function funnelSecHtml(s) { return OnLead.funnelSecHtml(s); }

function landingPage() { return OnLead.landingPage(); }
function authPage(mode) { return OnLead.authPage(mode); }
function bindAuth() { return OnLead.bindAuth(); }
function choosePayMethod(opts) { return OnLead.choosePayMethod(opts); }
async function startCheckout(body, btn) { return OnLead.startCheckout(body, btn); }
async function consumePendingVkToken() { return OnLead.consumePendingVkToken(); }
async function consumePaidReturn() { return OnLead.consumePaidReturn(); }
async function finishVkConnect(data) { return OnLead.finishVkConnect(data); }
async function startVkOAuth() { return OnLead.startVkOAuth(); }
async function startVkMessagesOAuth(accountId) { return OnLead.startVkMessagesOAuth(accountId); }
async function saveVkMessagesToken(accountId) { return OnLead.saveVkMessagesToken(accountId); }
function openVkConnectModal() { return OnLead.openVkConnectModal(); }
function closeVkConnectModal() { return OnLead.closeVkConnectModal(); }
function openVkEventLogModal() { return OnLead.openVkEventLogModal(); }
function closeVkEventLogModal() { return OnLead.closeVkEventLogModal(); }
function saveVkTokenFromPaste() { return OnLead.saveVkTokenFromPaste(); }
async function refreshVkChannels(accountId, statusEl) { return OnLead.refreshVkChannels(accountId, statusEl); }
async function saveLeadgenCfg() { return OnLead.saveLeadgenCfg(); }
async function loadLeadgenGroups() { return OnLead.loadLeadgenGroups(); }
async function saveLeadgenGroups(refresh, gen) { return OnLead.saveLeadgenGroups(refresh, gen); }
function bindLeadgenUi() { return OnLead.bindLeadgenUi(); }
async function onLeadgenAddPhrase(e) { return OnLead.onLeadgenAddPhrase(e); }
async function onLeadgenExclude(e) { return OnLead.onLeadgenExclude(e); }
async function removeLeadgenPhrase(id) { return OnLead.removeLeadgenPhrase(id); }
async function removeLeadgenExclude(text) { return OnLead.removeLeadgenExclude(text); }
async function addLeadgenNiche(id) { return OnLead.addLeadgenNiche(id); }
async function startLeadgenScan() { return OnLead.startLeadgenScan(); }
function applyLeadgenGroupChecks(check) { return OnLead.applyLeadgenGroupChecks(check); }

function bindOffice() {
  const root = document.getElementById("app");
  root.onclick = (e) => OnLead.handleOfficeClick?.(e);
  OnLead.bindOfficeChrome?.();
  $("#tool-form")?.addEventListener("submit", (e) => OnLead.onToolSubmit?.(e));
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
OnLead.pollToolCampaigns = pollToolCampaigns;

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
OnLead.syncAutopostPreview = syncAutopostPreview;

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
OnLead.loadLandingsMedia = loadLandingsMedia;

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
OnLead.loadTgFunnelOlData = loadTgFunnelOlData;

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
OnLead.loadTgReceipts = loadTgReceipts;

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
OnLead.loadToolExtras = loadToolExtras;

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
OnLead.saveOlLandingEditor = saveOlLandingEditor;

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
OnLead.createLanding = createLanding;

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
OnLead.personName = personName;

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
OnLead.loadOpenList = loadOpenList;

