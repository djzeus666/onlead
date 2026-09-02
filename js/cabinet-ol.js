/**
 * Кабинет — аналитика, настройки, команда + AI-агенты (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.CABINET_NAV = [
  { href: "#/office/analytics", label: "Аналитика" },
  { href: "#/office/workflow", label: "Процесс" },
  { href: "#/office/settings", label: "Настройки" },
  { href: "#/office/team", label: "Команда" },
  { href: "#/office/ai-agents", label: "AI-сотрудники" },
];

OnLead.cabinetOlNav = function cabinetOlNav(path) {
  return `<div class="toolbar cab-nav">${OnLead.CABINET_NAV.map((it) => {
    const p = String(it.href).replace("#", "");
    const on = path === p;
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="${it.href}">${it.label}</a>`;
  }).join("")}</div>`;
};

OnLead.fmtAnalyticsN = function fmtAnalyticsN(n) {
  return Number(n || 0).toLocaleString("ru-RU");
};

OnLead.analyticsOlPage = function analyticsOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.cabinetOlNav(path);
  const days = OnLead._analyticsDays || 30;
  const stats = state.stats || {};
  const activity = OnLead._dashActivitySlice ? OnLead._dashActivitySlice(state, days) : (state.activity || []).slice(-days);
  const act = OnLead._dashActivitySum ? OnLead._dashActivitySum(activity) : stats;
  const maxAct = Math.max(1, ...(activity || []).map((r) => r.actions || 0));
  const cc = state.contentCounts || {};

  return `<div class="cab-ol">
    ${nav}
    <div class="h-row cab-head">
      <div><p class="cab-kicker">Кабинет</p><h1>Аналитика</h1></div>
      <div class="toolbar">
        ${[7, 30, 90].map((d) => `<button type="button" class="btn btn-sm ${days === d ? "btn-ink" : "btn-ghost"}" data-act="analytics-days" data-days="${d}">${d} дн.</button>`).join("")}
      </div>
    </div>
    <div id="analytics-detail"><p class="muted">Загрузка…</p></div>
    <div class="cab-kpi">
      <div class="card"><span class="muted">Действия VK</span><b>${OnLead.fmtAnalyticsN(act.actions)}</b></div>
      <div class="card"><span class="muted">Лиды</span><b>${OnLead.fmtAnalyticsN(act.leads)}</b></div>
      <div class="card"><span class="muted">Сообщения</span><b>${OnLead.fmtAnalyticsN(act.messages)}</b></div>
      <div class="card"><span class="muted">Посты</span><b>${OnLead.fmtAnalyticsN(act.posts)}</b></div>
      <div class="card"><span class="muted">Черновики</span><b>${OnLead.fmtAnalyticsN(cc.draft)}</b></div>
      <div class="card"><span class="muted">Опубликовано</span><b>${OnLead.fmtAnalyticsN(cc.published)}</b></div>
    </div>
    <div class="card cab-chart">
      <b>Активность по дням</b>
      <div class="cab-bars">${(activity || []).map((r) => {
        const h = Math.round(((r.actions || 0) / maxAct) * 100);
        return `<div class="cab-bar" title="${esc(r.date)}: ${r.actions || 0}"><i style="height:${Math.max(4, h)}%"></i><small>${esc(String(r.date || "").slice(5))}</small></div>`;
      }).join("")}</div>
    </div>
  </div>`;
};

OnLead.renderAnalyticsDetail = function renderAnalyticsDetail(data) {
  const box = document.getElementById("analytics-detail");
  if (!box || !data) return;
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const s = data.summary || {};
  const tools = (data.topTools || []).map((t) => {
    const tool = OnLead.tool ? OnLead.tool(t.slug) : null;
    return `<tr><td>${esc(tool?.name || t.slug)}</td><td>${t.count}</td></tr>`;
  }).join("") || `<tr><td colspan="2" class="muted">Нет данных</td></tr>`;
  const pubs = (data.recentPublishes || []).map((p) => `<tr>
    <td>${OnLead.fmtContentDate ? OnLead.fmtContentDate(p.createdAt) : "—"}</td>
    <td><span class="chip ${p.status === "ok" ? "chip-ok" : "chip-err"}">${p.status === "ok" ? "OK" : "Ошибка"}</span></td>
    <td>${esc(p.textPreview || p.message || "—")}</td>
    <td>${p.permalink ? `<a href="${esc(p.permalink)}" target="_blank" rel="noopener">VK</a>` : ""}</td>
  </tr>`).join("") || `<tr><td colspan="4" class="muted">Публикаций за период нет</td></tr>`;

  box.innerHTML = `<div class="cab-kpi" style="margin-bottom:12px">
    <div class="card"><span class="muted">Аккаунты VK</span><b>${s.connectedAccounts || 0}</b></div>
    <div class="card"><span class="muted">Инструментов в работе</span><b>${s.runningTools || 0}</b></div>
    <div class="card"><span class="muted">Публикации OK</span><b>${s.publishOk || 0}</b></div>
    <div class="card"><span class="muted">Ошибки публикации</span><b>${s.publishErr || 0}</b></div>
  </div>
  <div class="cab-grid-2">
    <div class="card"><b>Топ инструментов</b>
      <table class="table"><thead><tr><th>Сервис</th><th>Действий</th></tr></thead><tbody>${tools}</tbody></table>
    </div>
    <div class="card"><b>Последние публикации</b>
      <table class="table"><thead><tr><th>Когда</th><th></th><th>Текст</th><th></th></tr></thead><tbody>${pubs}</tbody></table>
    </div>
  </div>`;
};

OnLead.loadAnalyticsDetail = async function loadAnalyticsDetail() {
  const days = OnLead._analyticsDays || 30;
  try {
    const data = await OnLead.api("/api/analytics?days=" + days);
    OnLead.renderAnalyticsDetail(data);
  } catch (err) {
    const box = document.getElementById("analytics-detail");
    if (box) box.innerHTML = `<div class="card muted">${OnLead.esc(err.message)}</div>`;
  }
};

OnLead.SETTINGS_TABS = [
  { id: "general", label: "Общие" },
  { id: "notifications", label: "Уведомления" },
  { id: "content-plan", label: "Контент-план" },
  { id: "watermarks", label: "Водяные знаки" },
  { id: "utm", label: "UTM" },
  { id: "signatures", label: "Подписи" },
  { id: "quick", label: "Быстрые ответы" },
];

OnLead.settingsOlPage = function settingsOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.cabinetOlNav(path);
  const tab = hashParams().get("tab") || "general";
  const c = state.cabinet || {};
  const tz = c.timezone || "Europe/Moscow";
  const n = c.notifications || {};
  const utm = c.utm || {};

  const tabs = `<div class="toolbar cab-tabs">${OnLead.SETTINGS_TABS.map((t) => {
    const on = tab === t.id;
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="#/office/settings?tab=${t.id}">${t.label}</a>`;
  }).join("")}</div>`;

  let body = "";
  if (tab === "general") {
    body = `<form id="cab-settings-form" class="card cab-form" data-section="general">
      <label class="field"><span>Часовой пояс</span>
        <select name="timezone">${["Europe/Kaliningrad", "Europe/Moscow", "Europe/Samara", "Asia/Yekaterinburg", "Asia/Novosibirsk", "Asia/Vladivostok", "UTC"].map((z) =>
          `<option value="${z}"${z === tz ? " selected" : ""}>${z}</option>`).join("")}</select></label>
      <button type="submit" class="btn btn-primary">Сохранить</button>
    </form>`;
  } else if (tab === "notifications") {
    body = `<form id="cab-settings-form" class="card cab-form" data-section="notifications">
      <label class="field chk"><input type="checkbox" name="emailLeadgen" ${n.emailLeadgen !== false ? "checked" : ""}> Email при совпадениях лидоскопа</label>
      <label class="field chk"><input type="checkbox" name="emailPublish" ${n.emailPublish ? "checked" : ""}> Email при публикации поста</label>
      <label class="field chk"><input type="checkbox" name="emailErrors" ${n.emailErrors !== false ? "checked" : ""}> Email при ошибках</label>
      <label class="field chk"><input type="checkbox" name="emailDigest" ${n.emailDigest ? "checked" : ""}> Еженедельный дайджест</label>
      <p class="muted" style="font-size:12px">Письма отправляются, если SMTP настроен на сервере.</p>
      <button type="submit" class="btn btn-primary">Сохранить</button>
    </form>`;
  } else if (tab === "content-plan") {
    const cp = c.contentPlan || {};
    body = `<form id="cab-settings-form" class="card cab-form" data-section="content-plan">
      <label class="field"><span>Слотов в день</span><input name="slotsPerDay" type="number" min="1" max="24" value="${esc(cp.slotsPerDay || 3)}"></label>
      <label class="field"><span>Время слотов</span><input name="defaultTimes" value="${esc(cp.defaultTimes || "10:00, 14:00, 18:00")}" placeholder="10:00, 14:00, 18:00"></label>
      <p class="muted" style="font-size:12px">Используется в календаре контента.</p>
      <button type="submit" class="btn btn-primary">Сохранить</button>
    </form>`;
  } else if (tab === "watermarks") {
    const rows = (c.watermarks || []).map((w) => `<div class="cab-list-row"><b>${esc(w.name)}</b><p class="muted">${esc(String(w.text || "").slice(0, 120))}</p>
      <button type="button" class="btn btn-ghost btn-sm" data-act="cab-del-item" data-kind="watermarks" data-id="${esc(w.id)}">×</button></div>`).join("");
    body = `<div class="card"><b>Водяные знаки</b><p class="muted" style="font-size:12px">Текст добавляется к посту при публикации (включите в редакторе).</p>
      ${rows || `<p class="muted">Пока пусто</p>`}
      <form id="cab-add-wm" class="cab-add" style="margin-top:12px">
        <input name="name" placeholder="Название" required>
        <textarea name="text" rows="2" placeholder="Текст знака" required></textarea>
        <button type="submit" class="btn btn-ghost btn-sm">Добавить</button>
      </form></div>`;
  } else if (tab === "utm") {
    body = `<form id="cab-settings-form" class="card cab-form" data-section="utm">
      <label class="field chk"><input type="checkbox" name="utmEnabled" ${utm.enabled ? "checked" : ""}> Добавлять UTM к ссылкам в автопостинге</label>
      <label class="field"><span>utm_source</span><input name="utmSource" value="${esc(utm.source || "vk")}"></label>
      <label class="field"><span>utm_medium</span><input name="utmMedium" value="${esc(utm.medium || "social")}"></label>
      <label class="field"><span>utm_campaign</span><input name="utmCampaign" value="${esc(utm.campaign || "")}"></label>
      <button type="submit" class="btn btn-primary">Сохранить</button>
    </form>`;
  } else if (tab === "signatures") {
    const rows = (c.signatures || []).map((s) => `<div class="cab-list-row"><b>${esc(s.name)}</b><p class="muted">${esc(String(s.text || "").slice(0, 120))}</p>
      <button type="button" class="btn btn-ghost btn-sm" data-act="cab-del-item" data-kind="signatures" data-id="${esc(s.id)}">×</button></div>`).join("");
    body = `<div class="card"><b>Подписи к постам</b>${rows || `<p class="muted">Пока пусто</p>`}
      <form id="cab-add-sig" class="cab-add" style="margin-top:12px">
        <input name="name" placeholder="Название" required>
        <textarea name="text" rows="2" placeholder="Текст подписи" required></textarea>
        <button type="submit" class="btn btn-ghost btn-sm">Добавить</button>
      </form></div>`;
  } else {
    const rows = (c.quickAnswers || []).map((s) => `<div class="cab-list-row"><b>${esc(s.name)}</b><p class="muted">${esc(String(s.text || "").slice(0, 120))}</p>
      <button type="button" class="btn btn-ghost btn-sm" data-act="cab-del-item" data-kind="quickAnswers" data-id="${esc(s.id)}">×</button></div>`).join("");
    body = `<div class="card"><b>Быстрые ответы</b>${rows || `<p class="muted">Пока пусто</p>`}
      <form id="cab-add-qa" class="cab-add" style="margin-top:12px">
        <input name="name" placeholder="Название" required>
        <textarea name="text" rows="2" placeholder="Текст ответа" required></textarea>
        <button type="submit" class="btn btn-ghost btn-sm">Добавить</button>
      </form></div>`;
  }

  return `<div class="cab-ol">
    ${nav}
    <div class="h-row"><div><p class="cab-kicker">Кабинет</p><h1>Настройки</h1></div></div>
    ${tabs}
    ${body}
  </div>`;
};

OnLead.teamOlPage = function teamOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.cabinetOlNav(path);
  const payload = OnLead._teamPayload || {};
  const members = payload.members?.length
    ? payload.members
    : [{ id: state.user?.id, name: state.user?.name, email: state.user?.email, role: "owner", status: "active" }];
  const canManage = OnLead._teamPayload ? Boolean(payload.canManage) : !state.user?.teamOwnerId;
  const roleLabel = (r) => (r === "owner" ? "Владелец" : r === "admin" ? "Админ" : "Участник");
  const statusLabel = (s) => (s === "pending" ? "Ожидает" : "Активен");
  const statusClass = (s) => (s === "pending" ? "chip-warn" : "chip-ok");
  const rows = members.map((m) => {
    const actions = canManage && m.role !== "owner"
      ? `<td class="team-actions">
          ${m.status === "active" ? `<select class="team-role" data-id="${esc(m.id)}" aria-label="Роль">
            <option value="admin"${m.role === "admin" ? " selected" : ""}>Админ</option>
            <option value="member"${m.role === "member" ? " selected" : ""}>Участник</option>
          </select>` : `<span class="muted">—</span>`}
          <button type="button" class="btn ghost sm team-remove" data-id="${esc(m.id)}" data-label="${esc(m.email)}">Удалить</button>
        </td>`
      : `<td>${canManage ? "" : '<span class="muted">—</span>'}</td>`;
    return `<tr data-member-id="${esc(m.id)}">
      <td>${esc(m.name || "—")}</td>
      <td>${esc(m.email || "—")}</td>
      <td><span class="chip">${esc(roleLabel(m.role))}</span></td>
      <td><span class="chip ${statusClass(m.status || "active")}">${esc(statusLabel(m.status || "active"))}</span></td>
      ${actions}
    </tr>`;
  }).join("");
  const inviteBlock = canManage
    ? `<div class="card cab-team-invite">
        <h3>Пригласить участника</h3>
        <p class="muted">Email должен совпадать с аккаунтом при регистрации по ссылке-приглашению.</p>
        <form id="team-invite-form" class="cab-add team-invite-row">
          <label class="field"><span>Email</span><input type="email" name="email" required placeholder="colleague@company.ru" /></label>
          <label class="field"><span>Роль</span>
            <select name="role"><option value="member">Участник</option><option value="admin">Админ</option></select>
          </label>
          <button type="submit" class="btn primary">Пригласить</button>
        </form>
        <div id="team-invite-result" class="muted" hidden></div>
      </div>`
    : `<p class="muted">Управление командой доступно только владельцу аккаунта.</p>`;
  const actionHead = canManage ? "<th></th>" : "";
  return `<div class="cab-ol">
    ${nav}
    <div class="h-row"><div><p class="cab-kicker">Кабинет</p><h1>Команда</h1>
      <p class="muted">Участники аккаунта, роли и приглашения.</p></div></div>
    ${inviteBlock}
    <table class="table team-table"><thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Статус</th>${actionHead}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${canManage ? 5 : 4}" class="muted">Нет участников</td></tr>`}</tbody></table>
  </div>`;
};

OnLead.aiAgentsOlPage = function aiAgentsOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.cabinetOlNav(path);
  const cards = [
    { title: "Лидоскоп", tagline: "Ищет заявки в VK", href: "#/office/tools/leadgen-vk", slug: "leadgen-vk", tone: "teal" },
    { title: "AI Лид-менеджер", tagline: "Диалоги и скоринг", href: "#/office/tools/ai-lead-vk", slug: "ai-lead-vk", tone: "violet" },
    { title: "Нейрокомментарии", tagline: "AI под постами", href: "#/office/tools/neurocomment-vk", slug: "neurocomment-vk", tone: "purple" },
    { title: "AI-картинки", tagline: "Обложки и креативы", href: "#/office/ai-images", slug: "image-ai", tone: "amber" },
    { title: "Контент-план", tagline: "План на 7–30 дней", href: "#/office/content-studio", slug: null, tone: "sky" },
    { title: "AI-кросспост", tagline: "Адаптация текста", href: "#/office/crosspost", slug: null, tone: "cyan" },
    { title: "Редактор постов", tagline: "VK + расписание", href: "#/office/compose", slug: null, tone: "emerald" },
    { title: "RSS Autopilot", tagline: "Лента → черновики", href: "#/office/rss", slug: null, tone: "rose" },
  ];
  return `<div class="cab-ol">
    ${nav}
    <div class="h-row"><div><p class="cab-kicker">Нейросотрудники</p><h1>AI-станции</h1>
      <p class="muted">Готовые AI-инструменты OnLead — каждый закрывает свою задачу в воронке.</p></div></div>
    <div class="cab-agents">${cards.map((a) => {
      const on = a.slug ? OnLead.toolOn(state, a.slug) : true;
      return `<a class="card cab-agent cab-agent-${a.tone}" href="${a.href}">
        <b>${esc(a.title)}</b>
        <p class="muted">${esc(a.tagline)}</p>
        <span class="cab-agent-st">${a.slug ? (on ? "В работе" : "Подключите в тарифах") : "Открыть"}</span>
      </a>`;
    }).join("")}</div>
  </div>`;
};

OnLead.bindCabinetOl = function bindCabinetOl() {
  OnLead.loadAnalyticsDetail?.();
  const teamPath = (OnLead.hashRouteRaw?.() || location.hash.replace(/^#/, "") || "/").replace(/#.*$/, "");
  if (teamPath === "/office/team") {
    OnLead.bindTeamOlEvents?.();
    if (!OnLead._teamPayload) {
      OnLead.api("/api/team").then((r) => {
        OnLead._teamPayload = r;
        OnLead._teamMembers = r.members || [];
        return render?.();
      }).catch(() => {});
    }
  }
  document.getElementById("cab-settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sec = e.target.dataset.section;
    const fd = new FormData(e.target);
    let body = {};
    if (sec === "general") body = { timezone: fd.get("timezone") };
    if (sec === "notifications") {
      body = { notifications: {
        emailLeadgen: fd.get("emailLeadgen") === "on",
        emailPublish: fd.get("emailPublish") === "on",
        emailErrors: fd.get("emailErrors") === "on",
        emailDigest: fd.get("emailDigest") === "on",
      }};
    }
    if (sec === "content-plan") {
      body = { contentPlan: {
        slotsPerDay: Number(fd.get("slotsPerDay")) || 3,
        defaultTimes: fd.get("defaultTimes"),
      }};
    }
    if (sec === "utm") {
      body = { utm: {
        enabled: fd.get("utmEnabled") === "on",
        source: fd.get("utmSource"),
        medium: fd.get("utmMedium"),
        campaign: fd.get("utmCampaign"),
      }};
    }
    await OnLead.api("/api/cabinet/settings", { method: "PATCH", body });
    OnLead._flash = "Сохранено";
    await render();
  });
  const addListItem = async (formId, kind) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const c = OnLead.load().cabinet || {};
      const list = [...(c[kind] || []), { id: "tmp-" + Date.now(), name: fd.get("name"), text: fd.get("text") }];
      await OnLead.api("/api/cabinet/settings", { method: "PATCH", body: { [kind]: list } });
      OnLead._flash = "Добавлено";
      await render();
    });
  };
  addListItem("cab-add-sig", "signatures");
  addListItem("cab-add-qa", "quickAnswers");
  addListItem("cab-add-wm", "watermarks");
};

OnLead.refreshTeamPage = async function refreshTeamPage() {
  try {
    const r = await OnLead.api("/api/team");
    OnLead._teamPayload = r;
    OnLead._teamMembers = r.members || [];
    await render?.();
  } catch (err) {
    OnLead._flash = err?.message || "Не удалось загрузить команду";
  }
};

OnLead.bindTeamOlEvents = function bindTeamOlEvents() {
  const form = document.getElementById("team-invite-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const out = document.getElementById("team-invite-result");
    try {
      const r = await OnLead.api("/api/team/invite", {
        method: "POST",
        body: { email: fd.get("email"), role: fd.get("role") || "member" },
      });
      if (out) {
        out.hidden = false;
        out.textContent = r.inviteLink
          ? `Приглашение создано. Ссылка: ${r.inviteLink}`
          : (r.added ? "Участник добавлен в команду." : "Готово.");
      }
      form.reset();
      OnLead._flash = r.added ? "Участник добавлен" : "Приглашение отправлено";
      await OnLead.refreshTeamPage();
    } catch (err) {
      if (out) {
        out.hidden = false;
        out.textContent = err?.message || "Не удалось пригласить";
      }
    }
  });
  document.querySelectorAll(".team-role").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id;
      try {
        await OnLead.api(`/api/team/members/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { role: sel.value },
        });
        OnLead._flash = "Роль обновлена";
      } catch (err) {
        OnLead._flash = err?.message || "Ошибка";
        await OnLead.refreshTeamPage();
      }
    });
  });
  document.querySelectorAll(".team-remove").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const label = btn.dataset.label || "участника";
      if (!confirm(`Удалить ${label} из команды?`)) return;
      try {
        await OnLead.api(`/api/team/members/${encodeURIComponent(id)}`, { method: "DELETE" });
        OnLead._flash = "Удалено";
        await OnLead.refreshTeamPage();
      } catch (err) {
        OnLead._flash = err?.message || "Ошибка";
      }
    });
  });
};
