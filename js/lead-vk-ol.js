/**
 * Лид-менеджер VK — цепочки без AI (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.LEAD_VK_SOURCES = [
  { id: "friends", label: "Друзья", value: "Друзья" },
  { id: "group", label: "Подписчики группы", value: "Подписчики группы" },
  { id: "list", label: "Список из парсера", value: "Новый список" },
];

OnLead.leadVkOlPage = function leadVkOlPage(state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const slug = "lead-vk";
  const t = OnLead.tool(slug);
  const on = OnLead.toolOn(state, slug);
  const tasks = state.campaigns[slug] || [];
  const stats = OnLead.vkToolOlAggregateStats ? OnLead.vkToolOlAggregateStats(slug, tasks) : {};
  const lists = (state.lists || []).filter((l) => (l.items || []).length);
  const last = tasks.find((c) => c.status === "running") || tasks[0];
  const p = last?.payload || {};
  const source = String(p.list || p.source || "Друзья");
  const isGroup = /групп|сообществ/i.test(source);
  const isList = /список/i.test(source);

  const paywall = on ? "" : `<div class="card lv-paywall">
    <span class="chip">Не активирован</span>
    <h3>${esc(t?.name || "Лид-менеджер")}</h3>
    <p class="muted">${esc(t?.summary || "")}</p>
    <div class="toolbar">${(OnLead.PERIODS || []).map((period) => {
      const price = Math.round((t?.price || 349) * period.id * (1 - period.discount));
      return `<button type="button" class="btn btn-ghost" data-act="buy-tool" data-slug="${slug}" data-m="${period.id}" data-amount="${price}">${esc(period.label)} · ${price} ₽</button>`;
    }).join("")}</div>
  </div>`;

  const accounts = state.accounts || [];
  const accountOpts = accounts.length
    ? accounts.map((a) => `<option value="${esc(a.id)}" ${a.id === (p.accountId || state.activeAccount) ? "selected" : ""}>${esc(a.name)}</option>`).join("")
    : `<option value="">Подключите аккаунт VK</option>`;

  const scenario = on ? `<div class="lv-grid">
    <form class="card lv-scenario" id="tool-form" data-slug="${slug}">
      <h2 class="lv-section-title">Сценарий</h2>
      <label class="field"><span>Аккаунт VK</span>
        <select name="accountId">${accountOpts}</select></label>
      <label class="field"><span>Аудитория</span>
        <select name="list" id="lv-source">${OnLead.LEAD_VK_SOURCES.map((s) =>
          `<option value="${esc(s.value)}" ${source === s.value || (isList && s.id === "list") || (isGroup && s.id === "group") ? "selected" : ""}>${esc(s.label)}</option>`,
        ).join("")}</select></label>
      <div id="lv-group-field" class="field" ${isGroup ? "" : 'hidden'}>
        <span>Ссылка на сообщество</span>
        <input name="groups" type="text" value="${esc(p.groups || p.group || "")}" placeholder="https://vk.com/club123456"></div>
      <div id="lv-list-field" class="field" ${isList ? "" : 'hidden'}>
        <span>Список из парсера</span>
        <select name="listId">${lists.length
          ? lists.map((l) => `<option value="${esc(l.id)}" ${l.id === p.listId ? "selected" : ""}>${esc(l.name)} · ${l.count || (l.items || []).length}</option>`).join("")
          : `<option value="">Сначала соберите список</option>`}</select>
        <p class="muted lv-hint"><a href="#/office/tools/lists">Мои списки</a> · <a href="#/office/tools/parsing-groups-vk">Парсер аудитории</a></p></div>
      <label class="field"><span>Шаблоны ({name}) — по одному на строку</span>
        <textarea name="templates" rows="5" placeholder="Привет, {name}! …">${esc(p.templates || "")}</textarea></label>
      <div class="lv-row-fields">
        <label class="field"><span>Пауза между касаниями</span>
          <select name="delay">${["2 мин", "15 мин", "1 час", "1 день"].map((d) =>
            `<option ${d === (p.delay || "15 мин") ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
        <label class="field"><span>Канал</span>
          <select name="channel">${[
            { v: "message", l: "Личное сообщение" },
            { v: "friend", l: "Заявка в друзья + сообщение" },
          ].map((o) => `<option value="${o.v}" ${(p.channel || "message") === o.v ? "selected" : ""}>${esc(o.l)}</option>`).join("")}</select></label>
      </div>
      <label class="field lv-inline"><span>Лимит в сутки</span>
        <input name="perDay" type="number" min="1" max="200" value="${esc(p.perDay || 20)}"></label>
      <button type="submit" class="btn btn-primary" ${accounts.length ? "" : "disabled"}>Запустить кампанию</button>
    </form>
    ${OnLead.vkToolOlStatsHtml ? OnLead.vkToolOlStatsHtml(slug, tasks, stats) : ""}
  </div>` : "";

  const taskRows = tasks.length ? tasks.map((c) => `<div class="list-item">
    <div><b>${esc(c.title || t?.name || "Кампания")}</b>
      <div class="muted">${esc(c.stats?.lastMessage || c.status)} · OK ${c.stats?.ok || 0}</div></div>
    <div class="match-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-act="edit-cam" data-id="${esc(c.id)}" data-title="${esc(c.title || "")}">Изменить</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="pause-cam" data-id="${esc(c.id)}">${c.status === "running" ? "Пауза" : "Включить"}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="del-cam" data-id="${esc(c.id)}" data-name="${esc(c.title || "Кампания")}">Удалить</button>
    </div>
  </div>`).join("") : `<div class="card muted">Кампаний пока нет — настройте сценарий и нажмите «Запустить кампанию».</div>`;

  const crmLeads = (state.leads || []).filter((l) => /лид-менеджер/i.test(l.source || ""));
  const leadsBlock = on ? `<div class="card lv-leads">
    <h2 class="lv-section-title">Лиды в CRM · ${crmLeads.length}</h2>
    ${crmLeads.length
      ? crmLeads.slice(0, 15).map((l) => `<div class="lv-lead-row">
          <div><b>${esc(l.name)}</b><p class="muted">${esc(String(l.note || "").slice(0, 120))}</p></div>
          <span class="chip">${esc(l.stage || "new")}</span>
        </div>`).join("")
      : `<p class="muted">Появятся после первых отправок.</p>`}
    ${crmLeads.length ? `<a class="btn btn-ghost btn-sm" href="#/office/crm">Открыть CRM →</a>` : ""}
  </div>` : "";

  const log = on && OnLead.vkToolOlActionsHtml ? OnLead.vkToolOlActionsHtml(slug, tasks) : "";

  return `<div class="lv-ol">
    ${OnLead.vkToolOlHeaderHtml ? OnLead.vkToolOlHeaderHtml(slug, state, tasks, { t, on }) : `<h1>Лид-менеджер</h1>`}
    ${paywall}
    ${scenario}
    ${on ? `<div class="card lv-tasks"><h2 class="lv-section-title">Кампании</h2>${taskRows}</div>` : ""}
    ${leadsBlock}
    ${log}
  </div>`;
};

OnLead.bindLeadVkOl = function bindLeadVkOl() {
  const sel = document.getElementById("lv-source");
  if (!sel) return;
  const sync = () => {
    const v = sel.value || "";
    const group = document.getElementById("lv-group-field");
    const list = document.getElementById("lv-list-field");
    if (group) group.hidden = !/групп|сообществ/i.test(v);
    if (list) list.hidden = !/список/i.test(v);
  };
  sel.addEventListener("change", sync);
  sync();
};
