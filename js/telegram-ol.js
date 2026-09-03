/**
 * Telegram OL — lead-bots, funnel tabs (Товары / Заказы / Настройки)
 */
window.OnLead = window.OnLead || {};

OnLead.TG_FUNNEL_TABS = [
  { id: "products", label: "Товары" },
  { id: "orders", label: "Заказы" },
  { id: "settings", label: "Настройки" },
];

OnLead.LEAD_BOT_KINDS = [
  { id: "lead", label: "Лид-бот", hint: "Спросит клиента и отправит заявку", emoji: "🎯" },
  { id: "faq", label: "FAQ-бот", hint: "Ответит на частые вопросы", emoji: "💬" },
  { id: "booking", label: "Запись", hint: "Запишет на услугу и соберёт контакты", emoji: "📅" },
  { id: "widget", label: "Виджет на сайт", hint: "Форма заявки для лендинга", emoji: "🌐" },
];

OnLead.TG_ORDER_TONE = {
  paid: "chip-ok",
  receipt_sent: "chip-warn",
  awaiting_payment: "chip-warn",
  rejected: "chip-bad",
  draft: "",
  cancelled: "",
};

OnLead.telegramLeadBotsPage = function telegramLeadBotsPage(state, nav) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const bots = state.hostedLeadBots || [];
  const tab = OnLead._lbTab || "list";
  const snippet = OnLead._lbSnippet || "";

  const kindCards = OnLead.LEAD_BOT_KINDS.map((k) => `<button type="button" class="card tg-lb-kind ${OnLead._lbKind === k.id ? "on" : ""}" data-act="lb-pick-kind" data-kind="${esc(k.id)}">
    <span class="tg-lb-emoji">${k.emoji}</span>
    <b>${esc(k.label)}</b>
    <p class="muted">${esc(k.hint)}</p>
  </button>`).join("");

  const createForm = tab === "create" ? `<div class="card tg-lb-create">
    <h3>Новый бот</h3>
    <div class="tg-lb-kind-grid">${kindCards}</div>
    <label class="field"><span>Название / бизнес</span><input id="lb-business" value="${esc(OnLead._lbDraft?.business || "")}" placeholder="Студия маникюра"></label>
    <label class="field"><span>Город</span><input id="lb-city" value="${esc(OnLead._lbDraft?.city || "")}" placeholder="Екатеринбург"></label>
    <label class="field"><span>Цель / оффер</span><input id="lb-goal" value="${esc(OnLead._lbDraft?.goal || "")}" placeholder="Запись на консультацию"></label>
    <label class="field"><span>CTA после заявки</span><input id="lb-contact" value="${esc(OnLead._lbDraft?.contact || "Мы перезвоним в рабочее время")}"></label>
    <div class="toolbar">
      <button type="button" class="btn btn-primary" data-act="lb-create">Создать</button>
      <button type="button" class="btn btn-ghost" data-act="lb-tab" data-tab="list">Отмена</button>
    </div>
  </div>` : "";

  const list = bots.map((b) => {
    const kind = OnLead.LEAD_BOT_KINDS.find((k) => k.id === b.kind);
    return `<div class="list-item tg-lb-row">
      <div><b>${esc(b.title)}</b>
        <div class="muted">${esc(kind?.label || b.kind)} · ${b.status === "live" ? "работает" : b.status === "paused" ? "пауза" : "черновик"}${b.funnelId ? " · воронка" : ""}</div></div>
      <div class="match-actions">
        ${b.kind === "widget" ? `<button type="button" class="btn btn-primary btn-sm" data-act="lb-snippet" data-id="${esc(b.id)}">Сниппет</button>` : `<button type="button" class="btn btn-primary btn-sm" data-act="lb-funnel" data-id="${esc(b.id)}">В воронку</button>`}
        <button type="button" class="btn btn-ghost btn-sm" data-act="lb-refine" data-id="${esc(b.id)}">AI refine</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="lb-del" data-id="${esc(b.id)}" data-name="${esc(b.title)}">Удалить</button>
      </div>
    </div>`;
  }).join("");

  const snippetModal = snippet ? `<div class="ol-modal-backdrop" data-act="lb-snippet-close">
    <div class="card ol-modal" onclick="event.stopPropagation()">
      <h3>HTML-сниппет виджета</h3>
      <p class="muted">Вставьте на лендинг или сайт. Заявки попадут в CRM.</p>
      <textarea class="tg-snippet-ta" readonly rows="12">${esc(snippet)}</textarea>
      <div class="toolbar"><button type="button" class="btn btn-primary btn-sm" data-act="lb-copy-snippet">Копировать</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="lb-snippet-close">Закрыть</button></div>
    </div>
  </div>` : "";

  return `${nav}
    <div class="ol-page-head tg-ol-head">
      <div><h1>TG-боты / виджет</h1>
        <p class="muted ol-page-head__lead">Лид-бот, FAQ, запись и форма заявки на сайт — как в Online Lead.</p></div>
      <div class="ol-page-actions">
        <button type="button" class="btn btn-primary btn-sm" data-act="lb-tab" data-tab="create">+ Создать</button>
      </div>
    </div>
    ${createForm}
    ${tab !== "create" ? `<div class="card">${list || `<p class="muted">Ботов пока нет — создайте лид-бот, FAQ, запись или виджет.</p>`}</div>` : ""}
    <p class="muted" style="margin-top:12px">Telegram-боты подключаются в <a href="#/office/telegram/bots">Мои боты</a>. Каталог товаров и заказы — в <a href="#/office/telegram/funnels">Воронках</a>.</p>
    ${snippetModal}`;
};

OnLead.telegramFunnelOlEditor = function telegramFunnelOlEditor(id, state, nav) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const f = (state.tgFunnels || []).find((x) => x.id === id);
  if (!f) return `${nav}<div class="card">Воронка не найдена. <a href="#/office/telegram/funnels">К списку</a></div>`;

  const tab = OnLead._tgFunnelTab || "products";
  const products = OnLead._tgProducts || f.products || [];
  const orders = OnLead._tgOrders || [];
  const settings = f.settings || {};
  const bots = state.bots || [];

  const tabs = `<div class="tg-tab-bar">${OnLead.TG_FUNNEL_TABS.map((t) =>
    `<button type="button" class="tg-tab ${tab === t.id ? "on" : ""}" data-act="tg-funnel-tab" data-tab="${esc(t.id)}">${esc(t.label)}</button>`).join("")}</div>`;

  let panel = "";
  if (tab === "products") {
    const draft = OnLead._tgProductDraft || {};
    panel = `<div class="tg-panel">
      <div class="card tg-product-form">
        <h3>${draft.id ? "Редактирование товара" : "Новый товар"}</h3>
        <div class="tg-form-grid">
          <label class="field"><span>Название</span><input id="tg-pr-title" value="${esc(draft.title || "")}"></label>
          <label class="field"><span>Цена, ₽</span><input id="tg-pr-price" type="number" value="${esc(draft.priceRub ?? "")}" placeholder="4900"></label>
          <label class="field tg-span2"><span>Описание</span><textarea id="tg-pr-desc" rows="2">${esc(draft.description || "")}</textarea></label>
          <label class="field tg-span2"><span>Что получает покупатель</span><textarea id="tg-pr-delivery" rows="2">${esc(draft.deliveryText || "")}</textarea></label>
          <label class="field"><span>Ссылка на оплату</span><input id="tg-pr-pay" value="${esc(draft.payUrl || "")}" placeholder="https://…"></label>
          <label class="field"><span>Подпись к цене</span><input id="tg-pr-note" value="${esc(draft.priceNote || "")}" placeholder="от 5 000 ₽"></label>
        </div>
        <div class="toolbar">
          <button type="button" class="btn btn-primary btn-sm" data-act="tg-product-save" data-fid="${esc(f.id)}" data-pid="${esc(draft.id || "")}">${draft.id ? "Сохранить" : "Добавить"}</button>
          ${draft.id ? `<button type="button" class="btn btn-ghost btn-sm" data-act="tg-product-cancel">Отмена</button>` : ""}
        </div>
      </div>
      ${products.length ? products.map((p) => `<div class="card tg-product-row">
        <div><b>${esc(p.title)}</b> <span class="chip ${p.active ? "chip-ok" : ""}">${p.active ? "В каталоге" : "Скрыт"}</span>
          <p class="muted">${esc(p.priceRub ? p.priceRub + " ₽" : (p.priceNote || "Цена по запросу"))}</p>
          ${p.description ? `<p class="muted">${esc(String(p.description).slice(0, 120))}</p>` : ""}</div>
        <div class="match-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="tg-product-edit" data-json="${esc(JSON.stringify(p))}">Изменить</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="tg-product-toggle" data-fid="${esc(f.id)}" data-pid="${esc(p.id)}" data-active="${p.active ? "0" : "1"}">${p.active ? "Скрыть" : "Показать"}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="tg-product-del" data-fid="${esc(f.id)}" data-pid="${esc(p.id)}">Удалить</button>
        </div>
      </div>`).join("") : `<div class="card muted">Товаров пока нет — добавьте первый для каталога бота.</div>`}
    </div>`;
  }

  if (tab === "orders") {
    panel = `<div class="tg-panel">${orders.length ? orders.map((o) => `<div class="card tg-order-row">
      <div class="tg-order-head">
        <div><b>${esc(o.productTitle)}</b> <span class="chip ${OnLead.TG_ORDER_TONE[o.status] || ""}">${esc(o.statusLabel || o.status)}</span>
          <p class="muted">${esc(o.customerName || "Без имени")} · ${esc(o.customerContact || "—")}${o.amountRub ? " · " + o.amountRub + " ₽" : ""}</p>
          <p class="muted tg-order-time">${esc(o.createdAt ? OnLead.fmtVkTime(o.createdAt) : "")}</p>
          ${o.ownerNote ? `<p class="muted">Причина: ${esc(o.ownerNote)}</p>` : ""}</div>
        ${o.status === "receipt_sent" ? `<div class="match-actions">
          <button type="button" class="btn btn-primary btn-sm" data-act="confirm-receipt" data-id="${esc(o.id)}">Подтвердить</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="reject-receipt" data-id="${esc(o.id)}">Отклонить</button>
        </div>` : ""}
      </div>
      ${o.hasReceipt ? `<p class="muted" style="font-size:12px;margin:8px 0 0">📎 Чек прикреплён в Telegram</p>` : ""}
    </div>`).join("") : `<div class="card muted">Заказов пока нет — появятся после оплаты в боте.</div>`}</div>`;
  }

  if (tab === "settings") {
    const sections = (f.sections && f.sections.length) ? f.sections : [{ title: "Старт", text: "", buttons: "" }];
    panel = `<div class="tg-panel">
      <form id="funnel-edit-form" class="card" data-id="${esc(f.id)}">
        <div class="tg-form-grid">
          <label class="field"><span>Название воронки</span><input name="name" value="${esc(f.name)}"></label>
          <label class="field"><span>Бот</span>
            <select name="botId"><option value="">Не выбран</option>
              ${bots.map((b) => `<option value="${esc(b.id)}" ${f.botId === b.id ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label>
          <label class="field tg-span2"><span>Приветствие</span><textarea name="greeting" rows="2">${esc(settings.greeting || "")}</textarea></label>
          <label class="field tg-span2"><span>Ссылка на оплату</span><input name="payUrl" value="${esc(settings.payUrl || "")}" placeholder="https://yookassa…"></label>
          <label class="field tg-span2"><span>Текст на шаге оплаты</span><textarea name="payNote" rows="2">${esc(settings.payNote || "")}</textarea></label>
          <label class="field tg-span2"><span>Текст после подтверждения</span><textarea name="paidText" rows="2">${esc(settings.paidText || "")}</textarea></label>
          <label class="field"><span>Уведомления (@username)</span><input name="notifyChatId" value="${esc(settings.notifyChatId || "")}"></label>
        </div>
        <details style="margin-top:16px"><summary class="muted">Разделы сценария (legacy)</summary>
          <div id="funnel-sections" style="margin-top:12px">${sections.map((s) => OnLead.funnelSecHtml ? OnLead.funnelSecHtml(s) : "").join("")}</div>
          <button type="button" class="btn btn-ghost btn-sm" data-act="funnel-add-section" style="margin-top:8px">Добавить раздел</button>
        </details>
        <button class="btn btn-primary" type="submit" style="margin-top:16px">Сохранить</button>
      </form>
    </div>`;
  }

  return `${nav}
    <div class="ol-page-head">
      <div>
        <a class="ol-back" href="#/office/telegram/funnels">← Воронки</a>
        <h1>${esc(f.name)}</h1>
        <p class="muted ol-page-head__lead">${f.kind === "pro" ? "Pro" : "Lite"} · ${f.status === "on" ? "включена" : "выключена"}</p>
      </div>
      <div class="ol-page-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-funnel" data-id="${esc(f.id)}" data-status="${f.status === "on" ? "off" : "on"}">${f.status === "on" ? "Выключить" : "Включить"}</button>
      </div>
    </div>
    ${tabs}
    ${panel}`;
};

OnLead.funnelSecHtml = function funnelSecHtml(s = {}) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  return `<div class="funnel-sec">
    <div class="h-row" style="margin:0 0 8px"><b>Раздел</b>
      <button type="button" class="btn btn-ghost btn-sm" data-act="funnel-del-section">Убрать</button></div>
    <label class="field"><span>Заголовок</span><input name="title" value="${esc(s.title || "")}"></label>
    <label class="field"><span>Текст</span><textarea name="text">${esc(s.text || "")}</textarea></label>
    <label class="field"><span>Кнопки</span><input name="buttons" value="${esc(s.buttons || "")}"></label>
  </div>`;
};

OnLead.tgProductCollect = function tgProductCollect() {
  return {
    title: document.getElementById("tg-pr-title")?.value || "",
    priceRub: document.getElementById("tg-pr-price")?.value ? Number(document.getElementById("tg-pr-price").value) : null,
    description: document.getElementById("tg-pr-desc")?.value || "",
    deliveryText: document.getElementById("tg-pr-delivery")?.value || "",
    payUrl: document.getElementById("tg-pr-pay")?.value || "",
    priceNote: document.getElementById("tg-pr-note")?.value || "",
  };
};

OnLead.tgSettingsFromForm = function tgSettingsFromForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  const sections = [...form.querySelectorAll(".funnel-sec")].map((el) => ({
    title: el.querySelector("[name=title]")?.value || "",
    text: el.querySelector("[name=text]")?.value || "",
    buttons: el.querySelector("[name=buttons]")?.value || "",
  }));
  return {
    name: d.name,
    botId: d.botId || "",
    settings: {
      greeting: d.greeting || "",
      payUrl: d.payUrl || "",
      payNote: d.payNote || "",
      paidText: d.paidText || "",
      notifyChatId: d.notifyChatId || "",
    },
    sections,
  };
};

/* --- classic telegram pages (tariffs/bots/channels/funnels list) --- */
OnLead.fmtUntil = function fmtUntil(ts) {
  if (!ts || ts < Date.now()) return "";
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

OnLead.liveTg = function liveTg(state) {
  const p = state.tgPlan || {};
  if (p.until && p.until > Date.now()) return p;
  if (state.user?.trialUntil && state.user.trialUntil > Date.now()) {
    return { id: "trial", lite: 1, pro: 0, until: state.user.trialUntil };
  }
  return { id: null, lite: 0, pro: 0, until: 0 };
}

OnLead.funnelSecHtml = function funnelSecHtml(s = {}) {
  return `<div class="funnel-sec">
    <div class="h-row" style="margin:0 0 8px"><b>Раздел</b>
      <button type="button" class="btn btn-ghost btn-sm" data-act="funnel-del-section">Убрать</button></div>
    <label class="field"><span>Заголовок</span><input name="title" value="${OnLead.esc(s.title || "")}"></label>
    <label class="field"><span>Текст сообщения</span><textarea name="text">${OnLead.esc(s.text || "")}</textarea></label>
    <label class="field"><span>Кнопки через запятую</span><input name="buttons" value="${OnLead.esc(s.buttons || "")}"></label>
  </div>`;
}

OnLead.telegramTariffs = function telegramTariffs(state, nav) {
  const months = Math.max(1, Number(OnLead.hashParams().get("m") || 1));
  const plan = OnLead.liveTg(state);
  const used = state.tgSlots || { lite: 0, pro: 0 };
  const catalog = OnLead.TG_PLANS || [];
  const periods = OnLead.TG_PERIODS || [];
  const until = OnLead.fmtUntil(plan.until);
  const live = !!(state.settings?.telegramLive || OnLead.health?.telegramLive);
  const trialBtn = (!live || state.tgTrialUsed)
    ? ""
    : `<button type="button" class="btn btn-ghost" data-act="tg-trial">Сначала попробовать 3 дня бесплатно</button>`;
  const buy = (p, price) => live
    ? `<button type="button" class="btn btn-primary btn-block" style="margin-top:12px" data-act="buy-tg" data-plan="${OnLead.esc(p.id)}" data-m="${months}" data-amount="${price}">Подключить</button>`
    : `<button type="button" class="btn btn-ghost btn-block" style="margin-top:12px" disabled>Оплата закрыта</button>`;
  return `${nav}
    ${live
      ? `<div class="notice"><div>Бот отвечает в Telegram по сохранённой воронке: /start и кнопки. Подключите бота, включите воронку, напишите боту.</div></div>`
      : `<div class="notice"><div>Рассылка из кабинета ещё не запущена.</div></div>`}
    <div class="h-row">
      <div>
        <h1>Тарифы Telegram</h1>
        <p class="muted" style="margin:0">${plan.lite || plan.pro
          ? `Сейчас: ${plan.id === "trial" ? "пробный" : OnLead.esc(OnLead.tgPlan(plan.id)?.name || plan.id)} · Lite ${used.lite}/${plan.lite} · Pro ${used.pro}/${plan.pro}${until ? " · до " + until : ""}`
          : "Слот — одна воронка. Подключите тариф или возьмите 3 дня."}</p>
      </div>
      <div class="toolbar" style="margin:0">
        <a class="btn btn-ink btn-sm" href="#/office/telegram/funnels">Открыть конструктор</a>
        <a class="btn btn-ghost btn-sm" href="#/office/academy">Обучение</a>
      </div>
    </div>
    <div class="toolbar"><div class="seg">${periods.map((p) => `
      <a href="#/office/telegram/tariffs?m=${p.id}" class="${months === p.id ? "on" : ""}">${OnLead.esc(p.label)}</a>`).join("")}</div></div>
    <div class="grid-3">${catalog.map((p) => {
      const price = OnLead.tgPrice(p, months);
      return `<div class="card price-card tg-plan ${p.hit ? "hit" : ""}">
        ${p.hit ? `<span class="chip">выгодно</span>` : ""}
        <h3>${OnLead.esc(p.name)}</h3>
        <div class="amount">${price.toLocaleString("ru-RU")} ₽</div>
        <p>${OnLead.esc(p.hint)}</p>
        <p style="margin-top:8px">${OnLead.esc(p.blurb)}</p>
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

OnLead.telegramBots = function telegramBots(state, nav) {
  const bots = state.bots || [];
  return `${nav}<div class="h-row"><h1>Боты</h1></div>
    <p class="muted" style="margin-top:0">Подключение бесплатное. Создайте бота в <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>, скопируйте токен и вставьте сюда. Сервис поставит webhook и начнёт отвечать на /start.</p>
    <form id="bot-form" class="card" style="display:grid;gap:10px;max-width:560px">
      <label class="field"><span>Токен</span><input name="token" placeholder="123456789:AAH..." required autocomplete="off"></label>
      <button class="btn btn-primary" type="submit">Подключить</button>
      ${OnLead.health?.mocksAllowed ? `<p class="muted" style="font-size:12px;margin:0">Для проверки без Telegram: <code>mock:demo</code></p>` : ""}
    </form>
    ${bots.length ? bots.map((b) => `<div class="list-item"><div><b>${OnLead.esc(b.name)}</b>
      <div class="muted">${OnLead.esc(b.username)} · ${b.tokenMask ? OnLead.esc(b.tokenMask) + " · " : ""}${b.status === "on" ? "включён" : "выключен"}</div>
      ${b.tokenBroken ? `<div class="muted" style="color:var(--danger)">Токен недействителен — бот не отвечает. Нажмите «Заменить токен» и вставьте новый из @BotFather.</div>` : ""}</div>
      <div class="match-actions">
        <button type="button" class="btn ${b.tokenBroken ? "btn-primary" : "btn-ghost"} btn-sm" data-act="retoken-bot" data-id="${OnLead.esc(b.id)}">Заменить токен</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="edit-bot" data-id="${OnLead.esc(b.id)}" data-name="${OnLead.esc(b.name)}">Изменить</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-bot" data-id="${OnLead.esc(b.id)}" data-status="${b.status === "on" ? "off" : "on"}">${b.status === "on" ? "Отключить" : "Включить"}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-bot" data-id="${OnLead.esc(b.id)}" data-name="${OnLead.esc(b.name)}">Удалить</button>
      </div></div>`).join("") : `<div class="card muted" style="margin-top:12px">Ботов пока нет.</div>`}`;
}

OnLead.telegramChannels = function telegramChannels(state, nav) {
  const channels = state.tgChannels || [];
  const access = state.tgChannelAccess || [];
  const plan = OnLead.liveTg(state);
  const active = access.filter((a) => a.status === "active" && Number(a.until) > Date.now());
  const history = access.filter((a) => a.status !== "active" || Number(a.until) <= Date.now()).slice(0, 20);
  const accessRow = (a) => {
    const label = a.tgUsername ? `@${OnLead.esc(a.tgUsername.replace(/^@/, ""))}` : `id ${OnLead.esc(a.tgUserId)}`;
    const st = a.status === "active" && Number(a.until) > Date.now()
      ? `до ${OnLead.fmtWhen(a.until)}`
      : a.status === "kicked"
        ? "исключён"
        : a.status === "error"
          ? `ошибка${a.note ? `: ${OnLead.esc(a.note)}` : ""}`
          : "истёк";
    return `<div class="list-item" style="margin-top:8px"><div><b>${label}</b>
      <div class="muted">${OnLead.esc(a.tariffDays ? `${a.tariffDays} дн.` : "Pro")} · ${st}</div></div>
      <span class="chip">${a.status === "active" && Number(a.until) > Date.now() ? "активен" : OnLead.esc(a.status || "—")}</span></div>`;
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
    ${channels.length ? channels.map((c) => `<div class="list-item"><div><b>${OnLead.esc(c.name)}</b>
      <div class="muted">${OnLead.esc(c.username || c.chatId || "—")} · ${c.status === "on" ? "подключён" : "выключен"}</div></div>
      <div class="match-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-act="edit-tg-channel" data-id="${OnLead.esc(c.id)}" data-name="${OnLead.esc(c.name)}" data-username="${OnLead.esc(c.username || "")}">Изменить</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-tg-channel" data-id="${OnLead.esc(c.id)}" data-status="${c.status === "on" ? "off" : "on"}">${c.status === "on" ? "Отключить" : "Включить"}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-tg-channel" data-id="${OnLead.esc(c.id)}" data-name="${OnLead.esc(c.name)}">Удалить</button>
      </div></div>`).join("") : `<div class="card muted">Каналов нет. Сделайте бота админом и обновите список — либо укажите @username, если бот уже в канале.</div>`}`;
}

OnLead.telegramFunnels = function telegramFunnels(state, nav) {
  const funnels = state.tgFunnels || [];
  const plan = OnLead.liveTg(state);
  const used = state.tgSlots || { lite: 0, pro: 0 };
  const active = funnels.filter((f) => f.status !== "archive");
  const archived = funnels.filter((f) => f.status === "archive");
  const scenarios = OnLead.TG_SCENARIOS || [];
  const row = (f) => {
    const sc = OnLead.tgScenario(f.scenario);
    return `<div class="list-item"><div><b>${OnLead.esc(f.name)}</b>
      <div class="muted">${f.kind === "pro" ? "Pro" : "Lite"}${sc ? " · " + OnLead.esc(sc.name) : ""} · ${f.status === "on" ? "включена" : f.status === "archive" ? "архив" : "выключена"} · ${(f.sections || f.steps || []).length} разделов</div></div>
      <div class="match-actions">
        <a class="btn btn-primary btn-sm" href="#/office/telegram/funnels/${OnLead.esc(f.id)}">Конструктор</a>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-funnel" data-id="${OnLead.esc(f.id)}" data-status="${f.status === "on" ? "off" : "on"}">${f.status === "on" ? "Отключить" : "Включить"}</button>
        ${f.status === "archive"
          ? `<button type="button" class="btn btn-ghost btn-sm" data-act="toggle-funnel" data-id="${OnLead.esc(f.id)}" data-status="on">Из архива</button>`
          : `<button type="button" class="btn btn-ghost btn-sm" data-act="archive-funnel" data-id="${OnLead.esc(f.id)}">В архив</button>`}
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-funnel" data-id="${OnLead.esc(f.id)}" data-name="${OnLead.esc(f.name)}">Удалить</button>
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
        <h3>${OnLead.esc(s.name)}</h3>
        <p>${OnLead.esc(s.blurb)}</p>
        <button type="button" class="btn btn-primary" style="margin-top:12px" data-act="new-funnel" data-scenario="${OnLead.esc(s.id)}">Создать воронку</button>
      </div>`).join("")}</div>
    <h3 style="margin-top:22px">Мои воронки</h3>
    ${active.length ? active.map(row).join("") : `<div class="card muted">Воронок нет — выберите сценарий.</div>`}
    ${archived.length ? `<h3 style="margin-top:22px">Архив</h3>${archived.map(row).join("")}` : ""}
    <div id="tg-receipts-box" style="margin-top:22px"></div>`;
}

OnLead.telegramFunnelEditor = function telegramFunnelEditor(id, state, nav) {
  const f = (state.tgFunnels || []).find((x) => x.id === id);
  if (!f) return `${nav}<div class="card">Воронка не найдена. <a href="#/office/telegram/funnels">К списку</a></div>`;
  const bots = state.bots || [];
  const sections = (f.sections && f.sections.length) ? f.sections : (f.steps || []).map((t) => ({ title: t, text: "", buttons: "" }));
  const sc = OnLead.tgScenario(f.scenario);
  return `${nav}
    <div class="h-row"><h1>${OnLead.esc(f.name)}</h1>
      <div class="toolbar" style="margin:0">
        <a class="btn btn-ghost btn-sm" href="#/office/telegram/funnels">К списку</a>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle-funnel" data-id="${OnLead.esc(f.id)}" data-status="${f.status === "on" ? "off" : "on"}">${f.status === "on" ? "Отключить" : "Включить"}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="archive-funnel" data-id="${OnLead.esc(f.id)}">В архив</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-funnel" data-id="${OnLead.esc(f.id)}" data-name="${OnLead.esc(f.name)}">Удалить</button>
      </div>
    </div>
    <p class="muted">${f.kind === "pro" ? "Pro" : "Lite"}${sc ? " · " + OnLead.esc(sc.name) : ""}. Включённая воронка отвечает в Telegram: /start и кнопки разделов.</p>
    <form id="funnel-edit-form" class="card" data-id="${OnLead.esc(f.id)}" style="max-width:720px">
      <label class="field"><span>Название</span><input name="name" value="${OnLead.esc(f.name)}" required></label>
      <label class="field"><span>Продукт</span><input name="product" value="${OnLead.esc(f.product || "")}" placeholder="Название оффера"></label>
      <label class="field"><span>Цена</span><input name="price" value="${OnLead.esc(f.price || "")}" placeholder="4 900 ₽"></label>
      <label class="field"><span>Бот</span>
        <select name="botId">
          <option value="">Не выбран</option>
          ${bots.map((b) => `<option value="${OnLead.esc(b.id)}" ${f.botId === b.id ? "selected" : ""}>${OnLead.esc(b.name)} ${OnLead.esc(b.username || "")}</option>`).join("")}
        </select>
      </label>
      <div id="funnel-sections">${sections.map((s) => OnLead.funnelSecHtml(s)).join("")}</div>
      <div class="toolbar">
        <button type="button" class="btn btn-ghost" data-act="funnel-add-section">Добавить раздел</button>
        <button class="btn btn-primary" type="submit">Сохранить</button>
      </div>
    </form>`;
}

OnLead.telegram = function telegram(path, state) {
  const navPath = path === "/office/telegram" ? "/office/telegram/tariffs" : path;
  const nav = OnLead.sectionNav("telegram", navPath);
  const funnelMatch = path.match(/^\/office\/telegram\/funnels\/([^/]+)$/);
  if (funnelMatch) {
    return OnLead.telegramFunnelOlEditor
      ? OnLead.telegramFunnelOlEditor(funnelMatch[1], state, nav)
      : OnLead.telegramFunnelEditor(funnelMatch[1], state, nav);
  }
  if (path.endsWith("/lead-bots")) {
    return OnLead.telegramLeadBotsPage
      ? OnLead.telegramLeadBotsPage(state, nav)
      : `<div class="card muted">TG-боты недоступны</div>`;
  }
  if (path.endsWith("/bots")) return OnLead.telegramBots(state, nav);
  if (path.endsWith("/channels")) return OnLead.telegramChannels(state, nav);
  if (path.endsWith("/funnels")) return OnLead.telegramFunnels(state, nav);
  return OnLead.telegramTariffs(state, nav);
}
