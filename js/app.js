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
  if (path === "/office/webhooks/inbound" || path === "/office/webhooks") return { kicker: "Автоматизация", title: "Webhook" };
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
          await OnLead.renderPublicLanding("/p/" + page.id, root);
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
    const billing = OnLead.consumePaidReturn();
    if (paidReturn || path === "/office/balance") await billing;
    if (seq !== renderSeq) return;
    root.innerHTML = OnLead.officeShell(path);
    bindOffice();
    if (!paidReturn && path !== "/office/balance") {
      billing.then((last) => {
        if (seq !== renderSeq) return;
        if (last?.applied) paintOfficeBalance();
      }).catch(() => {});
    }
    if (path === "/office/accounts") await OnLead.consumePendingVkToken();
    if (path === "/office/leadgen" || path === "/office/tools/leadgen-vk") {
      const lg = OnLead.load().leadgen;
      if (lg?.scanStatus === "running" || lg?.scanStatus === "queued") OnLead.pollLeadgenScan();
    }
    if (path.startsWith("/office/tools/") && path !== "/office/tools/leadgen-vk" && path !== "/office/leadgen" && !path.startsWith("/office/tools/lists") && path !== "/office/tools/parsing-accounts-vk" && path !== "/office/tools/parsing-groups-vk" && path !== "/office/tools/subscribed" && path !== "/office/tools/parsers") {
      OnLead.loadToolExtras(path.split("/").pop());
    }
    if (path.endsWith("/telegram/funnels")) OnLead.loadTgReceipts();
    const tgFunnelEd = path.match(/\/office\/telegram\/funnels\/([^/]+)$/);
    if (tgFunnelEd) OnLead.loadTgFunnelOlData(tgFunnelEd[1]);
    if (path.endsWith("/landings/media")) OnLead.loadLandingsMedia();
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
    if (path === "/office/automation" || path === "/office/webhooks/inbound" || path === "/office/webhooks") OnLead.loadInboundWebhook?.();
    if (path === "/office/workflow") OnLead.loadWorkflow?.();
    if (path === "/office/ai-images") OnLead.loadAiGallery?.();
    if (path === "/office/analytics") OnLead.loadAnalyticsDetail?.();
    return;
  }
  if (path === "/login") { root.innerHTML = OnLead.authPage("login"); OnLead.bindAuth(); return; }
  if (path === "/register") { root.innerHTML = OnLead.authPage("register"); OnLead.bindAuth(); return; }
  if (path === "/verify-email") { root.innerHTML = OnLead.authPage("verify"); OnLead.bindAuth(); return; }
  if (path === "/forgot") { root.innerHTML = OnLead.authPage("forgot"); OnLead.bindAuth(); return; }
  if (path === "/reset-password") { root.innerHTML = OnLead.authPage("reset"); OnLead.bindAuth(); return; }
  if (path === "/privacy" || path === "/offer" || path === "/consent") {
    document.title = path === "/offer" ? "Оферта — OnLead" : path === "/consent" ? "Согласие — OnLead" : "Конфиденциальность — OnLead";
    root.innerHTML = (OnLead.legalPage || (() => "<p>Нет документа</p>"))(path.slice(1));
    return;
  }
  if (path.startsWith("/p/")) { await OnLead.renderPublicLanding(path, root); return; }
  if (path.startsWith("/l/")) { await OnLead.renderPublicLanding(path, root); return; }
  root.innerHTML = OnLead.landingPage();
  if (section) {
    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}
OnLead.render = render;
OnLead.go = go;
OnLead.confirmDel = confirmDel;

function officePage(path, state) {
  if (path === "/office") return dash(state);
  if (path === "/office/academy" || path.startsWith("/office/academy/")) return academy(path);
  if (path === "/office/accounts") return OnLead.accountsOlPage(state);
  if (path === "/office/subscriptions") {
    return OnLead.billingOlPage ? OnLead.billingOlPage(state) : `<div class="card muted">Тарифы загружаются…</div>`;
  }
  if (path === "/office/crm") {
    return OnLead.crmOlPage ? OnLead.crmOlPage(state) : `<div class="card muted">CRM загружается…</div>`;
  }
  if (path === "/office/content") {
    return OnLead.contentOlPage ? OnLead.contentOlPage(state, path) : `<div class="card muted">Контент загружается…</div>`;
  }
  if (path === "/office/compose") {
    return OnLead.composeOlPage ? OnLead.composeOlPage(state) : `<div class="card muted">Редактор загружается…</div>`;
  }
  if (path === "/office/content-studio") {
    return OnLead.contentOlStudioPage ? OnLead.contentOlStudioPage(state, path) : `<div class="card muted">Студия загружается…</div>`;
  }
  if (path === "/office/media") {
    return OnLead.contentOlMediaPage ? OnLead.contentOlMediaPage(state, path) : `<div class="card muted">Медиатека загружается…</div>`;
  }
  if (path === "/office/history") {
    return OnLead.contentOlHistoryPage ? OnLead.contentOlHistoryPage(state, path) : `<div class="card muted">История загружается…</div>`;
  }
  if (path === "/office/ai-images") {
    return OnLead.aiImagesOlPage ? OnLead.aiImagesOlPage(state, path) : `<div class="card muted">AI-картинки загружаются…</div>`;
  }
  if (path === "/office/automation") {
    return OnLead.automationOlPage ? OnLead.automationOlPage(state, path) : `<div class="card muted">Автоматизация загружается…</div>`;
  }
  if (path === "/office/webhooks/inbound" || path === "/office/webhooks") {
    return OnLead.inboundWebhookOlPage ? OnLead.inboundWebhookOlPage(state, path) : `<div class="card muted">Webhook загружается…</div>`;
  }
  if (path === "/office/rss") {
    return OnLead.rssOlPage ? OnLead.rssOlPage(state, path) : `<div class="card muted">RSS загружается…</div>`;
  }
  if (path === "/office/repost") {
    return OnLead.repostOlPage ? OnLead.repostOlPage(state, path) : `<div class="card muted">Репосты загружаются…</div>`;
  }
  if (path === "/office/crosspost") {
    return OnLead.crosspostOlPage ? OnLead.crosspostOlPage(state, path) : `<div class="card muted">Кросспост загружается…</div>`;
  }
  if (path === "/office/analytics") {
    return OnLead.analyticsOlPage ? OnLead.analyticsOlPage(state, path) : `<div class="card muted">Аналитика загружается…</div>`;
  }
  if (path === "/office/settings") {
    return OnLead.settingsOlPage ? OnLead.settingsOlPage(state, path) : `<div class="card muted">Настройки загружаются…</div>`;
  }
  if (path === "/office/team") {
    return OnLead.teamOlPage ? OnLead.teamOlPage(state, path) : `<div class="card muted">Команда загружается…</div>`;
  }
  if (path === "/office/workflow") {
    return OnLead.workflowOlPage ? OnLead.workflowOlPage(state, path) : `<div class="card muted">Workflow загружается…</div>`;
  }
  if (path === "/office/ai-agents") {
    return OnLead.aiAgentsOlPage ? OnLead.aiAgentsOlPage(state, path) : `<div class="card muted">AI-сотрудники загружаются…</div>`;
  }
  if (path === "/office/balance") return balance(state);
  if (path === "/office/referral") return referral(state);
  if (path === "/office/profile") return profile(state);
  if (path === "/office/tools" || path === "/office/vk-tools") return OnLead.toolsHub(state);
  if (path === "/office/tools/subscribed" || path === "/office/tools/parsers") return OnLead.bundleHub(path.split("/").pop(), state);
  if (path === "/office/leadgen" || path === "/office/tools/leadgen-vk") {
    return OnLead.leadgenOlPage ? OnLead.leadgenOlPage(state) : `<div class="card muted">Лидоскоп недоступен</div>`;
  }
  if (path === "/office/neurocomments" || path === "/office/tools/neurocomment-vk") {
    return OnLead.neurocommentOlPage ? OnLead.neurocommentOlPage(state) : OnLead.toolPage("neurocomment-vk", state);
  }
  if (path === "/office/tools/ai-lead-vk") {
    return OnLead.aiLeadOlPage ? OnLead.aiLeadOlPage(state) : OnLead.toolPage("ai-lead-vk", state);
  }
  if (path === "/office/tools/lead-vk") {
    return OnLead.leadVkOlPage ? OnLead.leadVkOlPage(state) : OnLead.toolPage("lead-vk", state);
  }
  if (path === "/office/tools/lists" || path.startsWith("/office/tools/lists/") || path === "/office/tools/parsing-accounts-vk" || path === "/office/tools/parsing-groups-vk" || path.startsWith("/office/parsers")) {
    return OnLead.parsers(path, state);
  }
  if (path.startsWith("/office/tools/")) return OnLead.toolPage(path.split("/").pop(), state);
  if (path.startsWith("/office/telegram")) return OnLead.telegram(path, state);
  if (path.startsWith("/office/landings")) return OnLead.landings(path, state);
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

function balance(state) {
  const live = state.settings?.paymentsLive;
  const pending = (state.pendingPayments || []).map((p) => `
    <div class="notice">
      <div>Незавершённый платёж: ${esc(p.title)} — ${Number(p.amount).toLocaleString("ru-RU")} ₽</div>
      <button class="btn btn-ink btn-sm" data-act="resume-pay" data-kind="${esc(p.kind)}" data-amount="${esc(p.amount)}" data-package="${esc(p.packageId || "")}" data-slug="${esc(p.slug || "")}" data-tgplan="${esc(p.tgPlan || "")}" data-m="${esc(p.months || 1)}" data-url="${esc(p.confirmationUrl || "")}">Продолжить оплату</button>
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

function bindOffice() {
  const root = document.getElementById("app");
  root.onclick = (e) => OnLead.handleOfficeClick?.(e);
  OnLead.bindOfficeChrome?.();
  $("#tool-form")?.addEventListener("submit", (e) => OnLead.onToolSubmit?.(e));
  $("#tool-form [name=accountId]")?.addEventListener("change", () => {
    const slug = $("#tool-form")?.dataset.slug;
    if (slug) OnLead.loadToolExtras(slug);
  });
  $("#parse-form")?.addEventListener("submit", (e) => OnLead.onParse(e));
  $("#landing-form")?.addEventListener("submit", (e) => OnLead.onLandingCreate(e));
  OnLead.bindLandingEditor();
  OnLead.bindTelegramForms();
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
  $("#media-upload-form")?.addEventListener("submit", (e) => OnLead.onMediaUpload(e));
  $("#tool-form")?.addEventListener("input", () => OnLead.syncAutopostPreview());
  $("#tool-form")?.addEventListener("change", () => OnLead.syncAutopostPreview());
  OnLead.syncAutopostPreview();
  root.onchange = onOfficeChange;
  $("#lg-phrase-form")?.addEventListener("submit", (e) => OnLead.onLeadgenAddPhrase(e));
  $("#lg-exclude-form")?.addEventListener("submit", (e) => OnLead.onLeadgenExclude(e));
  OnLead.bindLeadgenUi();
  OnLead.loadOpenList();
  pollToolCampaigns();
  tickPromoCountdown();
  $("#vk-token-paste")?.addEventListener("paste", () => {
    setTimeout(() => {
      const parsed = OnLead.parseVkAccessToken($("#vk-token-paste")?.value || "");
      if (parsed?.accessToken) OnLead.finishVkConnect(parsed);
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

