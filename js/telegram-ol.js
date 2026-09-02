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
