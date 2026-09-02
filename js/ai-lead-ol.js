/**
 * AI Лид-менеджер — сценарий, статистика, журнал (online-lead.ru lead-dm parity)
 */
window.OnLead = window.OnLead || {};

OnLead.AI_LEAD_SOURCES = [
  { id: "list", label: "Список ID" },
  { id: "friends", label: "Друзья" },
  { id: "audience_segment", label: "Сегмент парсера" },
];

OnLead.aiLeadOlPage = function aiLeadOlPage(state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const t = OnLead.tool("ai-lead-vk");
  const on = OnLead.toolOn(state, "ai-lead-vk");
  const cfg = state.aiLead || {};
  const stats = state.aiLeadStats || {};
  const actions = state.aiLeadActions || [];
  const lists = (state.lists || []).filter((l) => (l.items || []).length);
  const runMsg = OnLead._alRunMsg || "";
  const runErr = OnLead._alRunErr || "";

  const paywall = on ? "" : `<div class="card al-paywall">
    <span class="chip">Не активирован</span>
    <h3>${esc(t?.name || "AI Лид-менеджер")}</h3>
    <p class="muted">${esc(t?.summary || "")}</p>
    <div class="toolbar">${(OnLead.PERIODS || []).map((p) => {
      const price = Math.round((t?.price || 199) * p.id * (1 - p.discount));
      return `<button type="button" class="btn btn-ghost" data-act="buy-tool" data-slug="ai-lead-vk" data-m="${p.id}" data-amount="${price}">${esc(p.label)} · ${price} ₽</button>`;
    }).join("")}</div>
  </div>`;

  const accounts = state.accounts || [];
  const accountOpts = accounts.length
    ? accounts.map((a) => `<option value="${esc(a.id)}" ${a.id === (cfg.accountId || state.activeAccount) ? "selected" : ""}>${esc(a.name)}</option>`).join("")
    : `<option value="">Подключите аккаунт</option>`;

  const source = cfg.source || "friends";
  const userIdsText = (cfg.userIds || []).join("\n");

  const scenario = on ? `<div class="al-grid">
    <div class="card al-scenario">
      <h2 class="al-section-title">Сценарий</h2>
      <label class="field"><span>Аккаунт VK</span>
        <select id="al-account">${accountOpts}</select></label>
      <div class="al-sources">
        ${OnLead.AI_LEAD_SOURCES.map((s) => `<label class="al-radio">
          <input type="radio" name="al-source" value="${esc(s.id)}" ${source === s.id ? "checked" : ""}>
          <span>${esc(s.label)}</span>
        </label>`).join("")}
      </div>
      ${source === "list" ? `<div class="field">
        <span>VK user id (по одному на строку)</span>
        <textarea id="al-user-ids" rows="4" placeholder="123456789">${esc(userIdsText)}</textarea>
        <button type="button" class="btn btn-ghost btn-sm" data-act="al-save-list">Сохранить список</button>
      </div>` : ""}
      ${source === "audience_segment" ? `<p class="muted al-hint">Сначала соберите сегмент в <a href="#/office/tools/lists">Мои списки</a> или <a href="#/office/tools/parsing-groups-vk">Парсере аудитории</a>.</p>
        <label class="field"><span>Список из парсера</span>
          <select id="al-list-id">${lists.length
            ? lists.map((l) => `<option value="${esc(l.id)}" ${l.id === cfg.listId ? "selected" : ""}>${esc(l.name)} · ${l.count || (l.items || []).length}</option>`).join("")
            : `<option value="">Нет списков</option>`}</select></label>` : ""}
      <label class="field"><span>Шаблон ({name})</span>
        <textarea id="al-template" rows="3" placeholder="Привет, {name}!">${esc(cfg.template || "")}</textarea></label>
      <label class="field"><span>Оффер / контекст для AI</span>
        <input id="al-offer" type="text" value="${esc(cfg.offerHint || "")}" placeholder="Запись на консультацию…"></label>
      <label class="al-check"><input type="checkbox" id="al-use-ai" ${cfg.useAi !== false ? "checked" : ""}> Переписывать через AI</label>
      <label class="al-check"><input type="checkbox" id="al-crm" ${cfg.createCrmLead !== false ? "checked" : ""}> Создавать карточку в CRM лидогена</label>
      <div class="al-row-fields">
        <label class="field"><span>Тон диалога</span>
          <select id="al-style">${["Как вы пишете", "Деловой", "Дружеский", "Продающий"].map((o) =>
            `<option ${o === (cfg.style || "Как вы пишете") ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>
        <label class="field"><span>Порог в CRM</span>
          <select id="al-score">${["6+", "7+", "8+", "9+"].map((o) =>
            `<option ${o === (cfg.score || "7+") ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>
      </div>
      <label class="al-check"><input type="checkbox" id="al-auto-accept" ${cfg.autoAccept !== false ? "checked" : ""}> Авто-приём заявок в друзья</label>
      <label class="field al-inline"><span>Лимит в день</span>
        <input id="al-limit" type="number" min="1" max="200" value="${esc(cfg.dailyLimit || 15)}"></label>
      <button type="button" class="btn btn-ghost btn-sm" data-act="al-save">Сохранить сценарий</button>
    </div>
    ${OnLead.aiLeadStatsHtml(stats, cfg)}
  </div>` : "";

  const tone = (s) => {
    if (/error|fail/i.test(s)) return "chip-bad";
    if (/reply|sent|ok/i.test(s)) return "chip-ok";
    return "";
  };

  const log = on ? `<div class="card al-log">
    <h2 class="al-section-title">Журнал</h2>
    ${actions.length
      ? actions.map((a) => `<div class="al-log-row">
          <div class="al-log-body">
            <b>${esc(a.targetLabel || "—")}</b>
            ${a.detail ? `<p class="muted">${esc(String(a.detail).slice(0, 200))}</p>` : ""}
            <span class="muted al-log-time">${esc(OnLead.fmtVkTime ? OnLead.fmtVkTime(a.createdAt) : a.createdAt)}</span>
          </div>
          <span class="chip ${tone(a.status)}">${esc(a.status)}</span>
        </div>`).join("")
      : `<p class="muted">Пока пусто — нажмите «Отправить пачку» или дождитесь планировщика.</p>`}
  </div>` : "";

  const dialogs = (state.campaigns?.["ai-lead-vk"] || [])
    .flatMap((c) => Object.values(c.stats?.aiDialogs || {}));
  const dialogsBlock = on && dialogs.length ? `<div class="card al-dialogs">
    <h2 class="al-section-title">Активные диалоги · ${dialogs.length}</h2>
    ${dialogs.slice(0, 12).map((d) => `<div class="al-dialog-row">
      <b>${esc(d.name || ("id" + d.vkId))}</b>
      <span class="muted">ход ${d.turns || 1} · ${d.score != null ? d.score + "/10" : "—"}${d.lastReply ? " · " + esc(String(d.lastReply).slice(0, 50)) : ""}</span>
    </div>`).join("")}
  </div>` : "";

  return `<div class="al-ol">
    <div class="ol-page-head al-head">
      <div>
        <a class="ol-back" href="#/office/tools/subscribed">← VK-инструменты</a>
        <h1>AI Лид-менеджер</h1>
        <p class="muted ol-page-head__lead">Прогрев в ЛС VK от вашего имени. AI переписывает шаблон; успешные диалоги уходят в CRM.</p>
      </div>
      ${on ? `<div class="ol-page-actions">
        <button type="button" class="btn ${cfg.enabled ? "btn-ghost" : "btn-primary"} btn-sm" data-act="al-toggle">${cfg.enabled ? "Выключить" : "Включить"}</button>
        <button type="button" class="btn btn-primary btn-sm" data-act="al-run" ${cfg.enabled ? "" : "disabled"}>Отправить пачку</button>
      </div>` : ""}
    </div>
    ${paywall}
    ${runMsg ? `<p class="al-run-msg ok">${esc(runMsg)}</p>` : ""}
    ${runErr ? `<p class="al-run-msg err">${esc(runErr)}</p>` : ""}
    ${cfg.lastError ? `<p class="al-run-msg warn">${esc(cfg.lastError)}</p>` : ""}
    ${scenario}
    ${dialogsBlock}
    ${log}
  </div>`;
};

OnLead.aiLeadStatsHtml = function aiLeadStatsHtml(stats, cfg) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const st = stats || {};
  const limit = st.dailyLimit ?? cfg?.dailyLimit ?? 15;
  return `<div class="card al-stats">
    <h2 class="al-section-title">Статистика</h2>
    <div class="al-stats-grid">
      <div class="al-stat"><span class="muted">Сегодня</span><b>${st.sentToday ?? 0}/${limit}</b></div>
      <div class="al-stat"><span class="muted">Всего OK</span><b>${st.totalOk ?? 0}</b></div>
      <div class="al-stat"><span class="muted">Диалоги</span><b>${st.dialogs ?? 0}</b></div>
      <div class="al-stat"><span class="muted">Горячие 8+</span><b>${st.hot ?? 0}</b></div>
      <div class="al-stat"><span class="muted">Ошибки</span><b>${st.errors ?? 0}</b></div>
      <div class="al-stat"><span class="muted">Статус</span><span class="chip ${st.enabled ? "chip-ok" : ""}">${st.enabled ? "Работает" : "Пауза"}</span></div>
    </div>
    ${st.lastRunAt ? `<p class="muted al-stats-foot">Последний запуск: ${esc(OnLead.fmtVkTime ? OnLead.fmtVkTime(st.lastRunAt) : st.lastRunAt)}</p>` : ""}
  </div>`;
};

OnLead.aiLeadCollectForm = function aiLeadCollectForm() {
  const source = document.querySelector('input[name="al-source"]:checked')?.value || "friends";
  const body = {
    accountId: document.getElementById("al-account")?.value || null,
    source,
    template: document.getElementById("al-template")?.value || "",
    offerHint: document.getElementById("al-offer")?.value || "",
    useAi: !!document.getElementById("al-use-ai")?.checked,
    createCrmLead: !!document.getElementById("al-crm")?.checked,
    style: document.getElementById("al-style")?.value || "Как вы пишете",
    score: document.getElementById("al-score")?.value || "7+",
    autoAccept: !!document.getElementById("al-auto-accept")?.checked,
    dailyLimit: Number(document.getElementById("al-limit")?.value || 15),
    listId: document.getElementById("al-list-id")?.value || null,
  };
  if (source === "list") {
    body.userIds = String(document.getElementById("al-user-ids")?.value || "")
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return body;
};
