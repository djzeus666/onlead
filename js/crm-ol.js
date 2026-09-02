/**
 * CRM — kanban 5 этапов, sidebar, assignee (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.CRM_STAGES = [
  { id: "new", label: "Новые", tone: "sky" },
  { id: "contacted", label: "Связались", tone: "amber" },
  { id: "qualified", label: "Квалификация", tone: "violet" },
  { id: "won", label: "Сделка", tone: "emerald" },
  { id: "lost", label: "Отказ", tone: "zinc" },
];

OnLead.normalizeCrmStage = function normalizeCrmStage(stage) {
  const map = { dialog: "contacted", hot: "qualified" };
  const s = String(stage || "new");
  if (map[s]) return map[s];
  return OnLead.CRM_STAGES.some((x) => x.id === s) ? s : "new";
};

OnLead.fmtCrmDate = function fmtCrmDate(ts) {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 16);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

OnLead.crmOlPage = function crmOlPage(state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const view = hashParams().get("view") || "board";
  const selectedId = OnLead._crmSelectedId || "";
  const leads = (state.leads || []).map((l) => ({
    ...l,
    stage: OnLead.normalizeCrmStage(l.stage),
  }));
  const active = leads.filter((l) => !l.archived);
  const archived = leads.filter((l) => l.archived);
  const pool = view === "archive" ? archived : active;
  const members = listCrmAssignees(state);
  const selected = pool.find((l) => l.id === selectedId) || null;

  const byStage = Object.fromEntries(OnLead.CRM_STAGES.map((s) => [s.id, []]));
  if (view === "board") {
    for (const l of pool) {
      const st = OnLead.normalizeCrmStage(l.stage);
      (byStage[st] || byStage.new).push(l);
    }
  }

  const counts = Object.fromEntries(
    OnLead.CRM_STAGES.map((s) => [s.id, active.filter((l) => OnLead.normalizeCrmStage(l.stage) === s.id).length]),
  );
  const qualified = counts.qualified || 0;
  const won = counts.won || 0;

  const assigneeName = (l) => {
    if (!l.assigneeUserId) return "";
    return members.find((m) => m.id === l.assigneeUserId)?.name || "";
  };

  const cardBtn = (l) => {
    const on = selectedId === l.id;
    return `<button type="button" class="crm-card ${on ? "on" : ""}" data-act="crm-pick" data-id="${esc(l.id)}">
      <div class="crm-card-top">
        <span class="crm-card-source muted">${esc(l.source || "—")}</span>
        ${l.score != null ? `<span class="crm-score">${esc(l.score)}/10</span>` : ""}
      </div>
      <b class="crm-card-name">${esc(l.name)}</b>
      ${l.note ? `<p class="crm-card-note muted">${esc(String(l.note).slice(0, 120))}</p>` : ""}
      <p class="crm-card-meta muted">${esc(l.city || "—")}${l.phone ? ` · ${esc(l.phone)}` : ""}${assigneeName(l) ? ` · ${esc(assigneeName(l))}` : ""}</p>
    </button>`;
  };

  const board = `<div class="crm-board">
    ${OnLead.CRM_STAGES.map((col) => `<div class="crm-col crm-col-${col.tone}">
      <div class="crm-col-head">
        <b>${esc(col.label)}</b>
        <span class="crm-col-count">${(byStage[col.id] || []).length}</span>
      </div>
      <div class="crm-col-body">
        ${(byStage[col.id] || []).length
          ? (byStage[col.id] || []).map(cardBtn).join("")
          : `<p class="crm-col-empty muted">Пусто</p>`}
      </div>
    </div>`).join("")}
  </div>`;

  const list = pool.length
    ? `<table class="table crm-table"><thead><tr>
        <th>Имя</th><th>Этап</th><th>Ответственный</th><th>Источник</th><th></th>
      </tr></thead><tbody>${pool.map((l) => {
        const st = OnLead.CRM_STAGES.find((s) => s.id === OnLead.normalizeCrmStage(l.stage));
        return `<tr class="${selectedId === l.id ? "crm-row-on" : ""}" data-act="crm-pick" data-id="${esc(l.id)}" role="button" tabindex="0">
          <td><b>${esc(l.name)}</b>${l.phone ? `<div class="muted">${esc(l.phone)}</div>` : ""}</td>
          <td>${esc(st?.label || l.stage || "")}</td>
          <td>${esc(assigneeName(l) || "—")}</td>
          <td>${esc(l.source || "")}</td>
          <td><div class="match-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-act="edit-lead" data-id="${esc(l.id)}" data-name="${esc(l.name)}" data-note="${esc(l.note || "")}" data-city="${esc(l.city || "")}" data-phone="${esc(l.phone || "")}">Изменить</button>
            ${view === "archive"
              ? `<button type="button" class="btn btn-ghost btn-sm" data-act="restore-lead" data-id="${esc(l.id)}">Вернуть</button>`
              : `<button type="button" class="btn btn-ghost btn-sm" data-act="archive-lead" data-id="${esc(l.id)}">В архив</button>`}
            <button type="button" class="btn btn-ghost btn-sm" data-act="del-lead" data-id="${esc(l.id)}" data-name="${esc(l.name)}">Удалить</button>
          </div></td>
        </tr>`;
      }).join("")}</tbody></table>`
    : `<div class="card muted">${view === "archive" ? "Архив пуст." : "Лидов нет — добавьте вручную или из инструментов."}</div>`;

  const sidebar = selected ? `<aside class="crm-sidebar card">
    <div class="crm-sidebar-head">
      <h3>${esc(selected.name)}</h3>
      <span class="score">${esc(selected.score ?? 0)}/10</span>
    </div>
    <p class="muted crm-sidebar-source">${esc(selected.source || "")}${selected.city ? ` · ${esc(selected.city)}` : ""}</p>
    ${selected.phone ? `<p class="crm-sidebar-phone"><a href="tel:${esc(selected.phone)}">${esc(selected.phone)}</a></p>` : ""}
    <label class="field"><span>Этап</span>
      <select id="crm-stage" data-act="crm-stage" data-id="${esc(selected.id)}">
        ${OnLead.CRM_STAGES.map((s) =>
          `<option value="${esc(s.id)}" ${OnLead.normalizeCrmStage(selected.stage) === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
      </select>
    </label>
    <label class="field"><span>Ответственный</span>
      <select id="crm-assignee" data-act="crm-assignee" data-id="${esc(selected.id)}">
        <option value="">Не назначен</option>
        ${members.map((m) =>
          `<option value="${esc(m.id)}" ${selected.assigneeUserId === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
      </select>
    </label>
    <label class="field"><span>Заметки</span>
      <textarea id="crm-note" rows="4" data-act="crm-note" data-id="${esc(selected.id)}" placeholder="Контекст, договорённости…">${esc(selected.note || "")}</textarea>
    </label>
    <div class="crm-quick-stages">
      ${OnLead.CRM_STAGES.filter((s) => s.id !== OnLead.normalizeCrmStage(selected.stage)).map((s) =>
        `<button type="button" class="btn btn-ghost btn-sm" data-act="crm-quick-stage" data-id="${esc(selected.id)}" data-stage="${esc(s.id)}">→ ${esc(s.label)}</button>`).join("")}
    </div>
    <div class="match-actions crm-sidebar-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-act="edit-lead" data-id="${esc(selected.id)}" data-name="${esc(selected.name)}" data-note="${esc(selected.note || "")}" data-city="${esc(selected.city || "")}" data-phone="${esc(selected.phone || "")}">Редактировать</button>
      ${view === "archive"
        ? `<button type="button" class="btn btn-ghost btn-sm" data-act="restore-lead" data-id="${esc(selected.id)}">Вернуть</button>`
        : `<button type="button" class="btn btn-ghost btn-sm" data-act="archive-lead" data-id="${esc(selected.id)}">В архив</button>`}
      <button type="button" class="btn btn-ghost btn-sm" data-act="del-lead" data-id="${esc(selected.id)}" data-name="${esc(selected.name)}">Удалить</button>
    </div>
  </aside>` : `<aside class="crm-sidebar card crm-sidebar-empty muted">
    <p>Выберите карточку на доске — здесь этап, ответственный и заметки.</p>
  </aside>`;

  return `<div class="crm-ol">
    <div class="ol-page-head crm-head">
      <div>
        <p class="crm-kicker muted">Сделки · CRM</p>
        <h1>Воронка лидов</h1>
        <p class="muted ol-page-head__lead">Бесплатно · 5 этапов как в Online Lead · лиды из лидоскопа, AI и лендингов</p>
      </div>
      <div class="ol-page-actions">
        <a class="btn btn-ghost btn-sm" href="#/office/tools/leadgen-vk">Лидоскоп</a>
        <button type="button" class="btn btn-primary btn-sm" data-act="new-lead">Новый лид</button>
      </div>
    </div>
    <div class="crm-kpi">
      <div class="card"><span class="muted">В работе</span><b>${active.length}</b></div>
      <div class="card"><span class="muted">Квалификация</span><b>${qualified}</b></div>
      <div class="card"><span class="muted">Сделки</span><b>${won}</b></div>
      <div class="card"><span class="muted">Конверсия</span><b>${active.length ? Math.round((won / active.length) * 100) : 0}%</b></div>
    </div>
    <div class="toolbar crm-toolbar">
      <div class="seg">
        <a href="#/office/crm" class="${view === "board" ? "on" : ""}">Доска</a>
        <a href="#/office/crm?view=list" class="${view === "list" ? "on" : ""}">Список</a>
        <a href="#/office/crm?view=archive" class="${view === "archive" ? "on" : ""}">Архив</a>
      </div>
      ${view === "board" ? `<span class="chip">${active.length} в работе</span>` : ""}
    </div>
    ${view === "board"
      ? `<div class="crm-layout">${board}${sidebar}</div>`
      : `<div class="crm-list-wrap">${list}</div>`}
  </div>`;
};

function listCrmAssignees(state) {
  const u = state.user || {};
  const name = String(u.name || u.email || "Я").trim() || "Я";
  return [{ id: u.id, name }];
}

OnLead.patchCrmLead = async function patchCrmLead(id, body) {
  await OnLead.api("/api/leads/" + id, { method: "PATCH", body });
};

OnLead.bindCrmOl = function bindCrmOl() {
  const note = document.getElementById("crm-note");
  if (note && !note.dataset.bound) {
    note.dataset.bound = "1";
    note.addEventListener("blur", async () => {
      const id = note.dataset.id;
      if (!id) return;
      try {
        await OnLead.patchCrmLead(id, { note: note.value });
      } catch (err) {
        alert(err.message);
      }
    });
  }
};

function hashParams() {
  const hash = location.hash.replace(/^#/, "");
  const i = hash.indexOf("?");
  const q = i === -1 ? String(location.search || "").replace(/^\?/, "") : hash.slice(i + 1);
  return new URLSearchParams(q);
}
