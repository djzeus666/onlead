/**
 * Нейрокомментарии — 5 вкладок (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.NC_TABS = [
  { id: "settings", label: "Настройки" },
  { id: "dialogs", label: "Диалоги" },
  { id: "stats", label: "Статистика" },
  { id: "blocks", label: "Блокировки" },
  { id: "training", label: "Обучение" },
];

OnLead.NC_TASK_FILTERS = [
  { id: "", label: "Все" },
  { id: "scheduled", label: "Запланированы" },
  { id: "sent", label: "Отправлены" },
  { id: "error", label: "Ошибки" },
  { id: "cancelled", label: "Отменены" },
];

OnLead.NC_FAQ = {
  overview: {
    title: "Нейрокомментарии",
    badge: "Инструмент VK · исходящее продвижение",
    description: "Нейросеть оставляет осмысленные комментарии под чужими постами — мягкое присутствие через вовлечение, а не спам.",
    steps: [
      "Подключите личный аккаунт VK в разделе «Аккаунты».",
      "Выберите его в настройках и включите режимы поиска постов.",
      "Задайте дневной лимит и тон, нажмите «Найти посты».",
    ],
  },
  settings: {
    title: "Что настраивать",
    description: "Здесь включается инструмент и выбирается, где искать посты для комментариев.",
    steps: ["Выберите VK-аккаунт", "Включите режимы: друзья / аудитория / стены", "Задайте лимит и тон", "Смотрите историю задач"],
  },
  dialogs: {
    title: "Ответы под вашими комментариями",
    description: "После отправки комментария здесь появляются ветки с ответами из VK.",
    steps: ["Дождитесь статуса «отправлены»", "Выберите ветку слева", "Ответьте автору в VK при необходимости"],
  },
  stats: {
    title: "Метрики работы",
    description: "Сводка: лимит, очередь, ошибки.",
    steps: ["Проверьте тумблер и аккаунт", "Убедитесь, что режимы включены", "Нажмите «Найти посты»"],
  },
  blocks: {
    title: "Кому не комментировать",
    description: "Чёрный список страниц и пользователей VK.",
    steps: ["Возьмите id из ссылки wall-123_456", "Добавьте в список", "Удалите при необходимости"],
  },
  training: {
    title: "Стиль под вашу нишу",
    description: "Сейчас стиль задаётся полем «Тон» на вкладке «Настройки».",
    steps: ["Опишите тон в 1–2 предложениях", "Проверьте 5–10 комментариев", "Уточните тон или блокировки"],
  },
};

OnLead.ncTaskStatusChip = function ncTaskStatusChip(status) {
  if (status === "sent") return "chip-ok";
  if (status === "error") return "chip-bad";
  if (status === "scheduled" || status === "sending") return "chip-warn";
  return "";
};

OnLead.ncTaskRowHtml = function ncTaskRowHtml(t) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const canCancel = t.status === "scheduled" || t.status === "error";
  return `<li class="nc-task">
    <div class="nc-task-head">
      <span class="chip ${OnLead.ncTaskStatusChip(t.status)}">${esc(t.status)}</span>
      <span class="muted">${esc(t.mode || "")}</span>
      ${t.postUrl ? `<a class="nc-task-link" href="${esc(t.postUrl)}" target="_blank" rel="noopener">открыть пост →</a>` : ""}
      ${canCancel ? `<button type="button" class="btn btn-ghost btn-sm nc-task-cancel" data-act="nc-cancel-task" data-id="${esc(t.id)}">Отменить</button>` : ""}
    </div>
    <div class="nc-bubbles">
      <div><span class="nc-bubble-label muted">Исходный пост</span>
        <div class="nc-bubble nc-bubble-in">${esc((t.postText || "").slice(0, 280))}${(t.postText || "").length > 280 ? "…" : ""}</div></div>
      ${t.generatedText ? `<div><span class="nc-bubble-label muted">Ответ нейросети</span>
        <div class="nc-bubble nc-bubble-out">${esc(t.generatedText)}</div></div>` : ""}
      ${t.errorMessage ? `<p class="nc-task-err muted">${esc(t.errorMessage)}</p>` : ""}
    </div>
  </li>`;
};

OnLead.neurocommentOlPage = function neurocommentOlPage(state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const t = OnLead.tool("neurocomment-vk");
  const on = OnLead.toolOn(state, "neurocomment-vk");
  const cfg = state.neurocomments || {};
  const stats = state.neurocommentStats || {};
  const tasks = state.neurocommentTasks || [];
  const tab = OnLead._ncTab || "settings";
  const taskFilter = OnLead._ncTaskFilter || "";
  const dialogId = OnLead._ncDialogId || "";
  const thread = OnLead._ncThread;

  const paywall = on ? "" : `<div class="card nc-paywall">
    <b>${esc(t.name)}</b><p class="muted">${esc(t.summary)}</p>
    <div class="toolbar">${OnLead.PERIODS.map((p) => {
      const price = Math.round(t.price * p.id * (1 - p.discount));
      return `<button class="btn btn-primary btn-sm" data-act="buy-tool" data-slug="neurocomment-vk" data-m="${p.id}" data-amount="${price}">${p.label} · ${price} ₽</button>`;
    }).join("")}</div></div>`;

  const kpi = `<div class="nc-kpi">
    ${[
      { label: "Отправлено сегодня", value: stats.sentToday ?? cfg.sentToday ?? 0 },
      { label: "В работе", value: stats.inProgress ?? 0 },
      { label: "Всего отправлено", value: stats.totalSent ?? 0 },
      { label: "Дней работы", value: stats.days ?? 0 },
    ].map((c) => `<div class="card nc-kpi-card"><b>${c.value}</b><span class="muted">${esc(c.label)}</span></div>`).join("")}
  </div>`;

  const tabs = `<div class="nc-tabs-row">
    <div class="nc-tabs" role="tablist">${OnLead.NC_TABS.map((tb) =>
      `<button type="button" class="nc-tab ${tab === tb.id ? "on" : ""}" data-act="nc-tab" data-tab="${tb.id}">${esc(tb.label)}</button>`).join("")}</div>
    <button type="button" class="btn btn-ghost btn-sm" data-act="nc-faq" data-tab="${esc(tab)}">Справка</button>
  </div>`;

  let panel = "";
  if (tab === "settings" && on) {
    const targets = cfg.targets || [];
    const filtered = taskFilter ? tasks.filter((x) => x.status === taskFilter) : tasks;
    panel = `<div class="nc-panel">
      <div class="card">
        <h3>Аккаунт VK</h3>
        <label class="field"><span>Аккаунт</span>
          <select id="nc-account">${state.accounts.length
            ? state.accounts.map((a) => `<option value="${esc(a.id)}" ${a.id === (cfg.accountId || state.activeAccount) ? "selected" : ""}>${esc(a.name)}</option>`).join("")
            : `<option value="">Подключите аккаунт</option>`}</select>
        </label>
        <label class="field nc-inline"><span>Лимит в день</span>
          <input id="nc-limit" type="number" min="1" max="200" value="${esc(cfg.dailyLimit || 20)}"></label>
        <label class="field"><span>Тон комментариев</span>
          <textarea id="nc-tone" rows="2" placeholder="Экспертный тон, без эмодзи, на «вы»…">${esc(cfg.tonePrompt || "")}</textarea></label>
        <button type="button" class="btn btn-ghost btn-sm" data-act="nc-save-settings">Сохранить настройки</button>
      </div>
      <div class="nc-modes">
        <h3>Режимы работы</h3>
        <div class="nc-mode-grid">
          ${OnLead.ncModeCard("По друзьям", "Свежие посты из ленты друзей.", cfg.modeFriends !== false, "nc-toggle-mode", "modeFriends")}
          ${OnLead.ncModeCard("По целевым страницам", "Посты аудитории выбранных страниц (до 5).", !!cfg.modeAudience, "nc-toggle-mode", "modeAudience", `${targets.filter((x) => x.mode === "audience").length} из 5`)}
          ${OnLead.ncModeCard("Посты целевых страниц", "Комментарии на стены выбранных страниц (до 5).", !!cfg.modeWall, "nc-toggle-mode", "modeWall", `${targets.filter((x) => x.mode === "wall").length} из 5`)}
        </div>
      </div>
      <div class="card">
        <h3>Целевые страницы</h3>
        <div class="lg-add nc-target-add">
          <select id="nc-target-mode"><option value="wall">Стена страницы</option><option value="audience">Аудитория страницы</option></select>
          <input id="nc-target-raw" placeholder="id, screen_name или ссылка VK">
          <button type="button" class="btn btn-primary btn-sm" data-act="nc-add-target">Добавить</button>
        </div>
        <ul class="nc-list">${targets.length ? targets.map((tg) => `<li class="nc-list-row">
          <span><span class="chip">${tg.mode === "wall" ? "стена" : "аудитория"}</span> ${esc(tg.name || tg.vkId)}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-act="nc-del-target" data-id="${esc(tg.id)}">Удалить</button>
        </li>`).join("") : `<li class="muted">Пока нет целей</li>`}</ul>
      </div>
      <div class="card nc-history">
        <div class="ol-page-head nc-history-head">
          <h3>История комментариев</h3>
          <div class="nc-task-filters">${OnLead.NC_TASK_FILTERS.map((f) =>
            `<button type="button" class="nc-task-filter ${taskFilter === f.id ? "on" : ""}" data-act="nc-task-filter" data-val="${esc(f.id)}">${esc(f.label)}</button>`).join("")}</div>
        </div>
        <ul class="nc-task-list">${filtered.length
          ? filtered.map((task) => OnLead.ncTaskRowHtml(task)).join("")
          : `<li class="muted nc-empty">Задач пока нет — нажмите «Найти посты» или дождитесь планировщика.</li>`}</ul>
      </div>
    </div>`;
  }

  if (tab === "dialogs" && on) {
    const dialogs = (tasks.filter((x) => x.status === "sent")).map((d) => ({
      id: d.id,
      generatedText: d.generatedText,
      replyCount: d.replyCount || 0,
    }));
    panel = `<div class="nc-panel nc-dialog-grid">
      <div class="card">
        <h3>Диалоги под комментариями</h3>
        <ul class="nc-dialog-list">${dialogs.length ? dialogs.map((d) =>
          `<li><button type="button" class="nc-dialog-btn ${dialogId === d.id ? "on" : ""}" data-act="nc-pick-dialog" data-id="${esc(d.id)}">
            <span class="nc-dialog-preview">${esc((d.generatedText || "Комментарий").slice(0, 120))}</span>
            <span class="muted">ответов: ${Number(d.replyCount) || 0}</span>
          </button></li>`).join("") : `<li class="muted">Веток пока нет — появятся после отправки.</li>`}</ul>
      </div>
      <div class="card nc-thread" id="nc-thread-box">
        ${!dialogId ? `<p class="muted">Выберите ветку слева — переписка загрузится из VK.</p>` : ""}
        ${dialogId && !thread ? `<p class="muted">Загрузка…</p>` : ""}
        ${thread ? `<div class="nc-thread-body">
          ${thread.task?.postUrl ? `<a class="nc-task-link" href="${esc(thread.task.postUrl)}" target="_blank" rel="noopener">Открыть пост во VK</a>` : ""}
          <div><span class="nc-bubble-label muted">Наш комментарий</span>
            <div class="nc-bubble nc-bubble-out">${esc(thread.task?.generatedText || "")}</div></div>
          <p class="muted"><b>Ответы · ${(thread.replies || []).length}</b></p>
          ${(thread.replies || []).map((r) => `<div><span class="muted" style="font-size:11px">id${esc(r.fromId)}</span>
            <div class="nc-bubble nc-bubble-in">${esc(r.text)}</div></div>`).join("")}
          ${!(thread.replies || []).length ? `<p class="muted">Ответов пока нет</p>` : ""}
        </div>` : ""}
      </div>
    </div>`;
  }

  if (tab === "stats" && on) {
    panel = `<div class="card nc-panel"><ul class="nc-stats-list">
      <li>Статус: ${stats.enabled || cfg.enabled ? "включён" : "выключен"}</li>
      <li>Дневной лимит: ${stats.dailyLimit ?? cfg.dailyLimit ?? 20}</li>
      <li>Сегодня: ${stats.sentToday ?? 0}</li>
      <li>В очереди: ${stats.inProgress ?? 0}</li>
      <li>Всего отправлено: ${stats.totalSent ?? 0}</li>
      <li>Ошибок: ${stats.errors ?? 0}</li>
    </ul></div>`;
  }

  if (tab === "blocks" && on) {
    const blocks = cfg.blocks || [];
    panel = `<div class="card nc-panel">
      <h3>Блокировки получателей</h3>
      <div class="lg-add"><input id="nc-block-id" placeholder="VK owner id (например -123 или 456)">
        <button type="button" class="btn btn-primary btn-sm" data-act="nc-add-block">Добавить</button></div>
      <ul class="nc-list" style="margin-top:12px">${blocks.length ? blocks.map((b) => `<li class="nc-list-row">
        <span>${esc(b.recipientId)}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-act="nc-del-block" data-id="${esc(b.id)}">Удалить</button>
      </li>`).join("") : `<li class="muted">Список пуст</li>`}</ul>
    </div>`;
  }

  if (tab === "training") {
    const faq = OnLead.NC_FAQ.training;
    panel = `<div class="card nc-panel">
      <h3>Обучение модели</h3>
      <p class="muted">${esc(faq.description)}</p>
      <ol class="nc-steps">${faq.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <button type="button" class="btn btn-ghost btn-sm" data-act="nc-faq" data-tab="training">Подробная справка</button>
    </div>`;
  }

  const faqModal = OnLead._ncFaqOpen ? OnLead.ncFaqModalHtml(OnLead._ncFaqTab || "overview") : "";

  return `<div class="nc-ol">
    <div class="ol-page-head nc-head">
      <div>
        <h1>Нейрокомментарии</h1>
        <p class="muted ol-page-head__lead">${cfg.enabled ? "Активен" : "Остановлен"} · AI-комментарии под контекст поста · лимит ${cfg.dailyLimit || 20}/день</p>
      </div>
      ${on ? `<div class="ol-page-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-act="nc-faq" data-tab="overview">Обучение</button>
        <button type="button" class="btn btn-primary btn-sm" data-act="nc-discover">Найти посты</button>
        <button type="button" class="nc-toggle ${cfg.enabled ? "on" : ""}" data-act="nc-toggle-enabled" aria-pressed="${cfg.enabled ? "true" : "false"}" title="${cfg.enabled ? "Выключить" : "Включить"}"></button>
      </div>` : ""}
    </div>
    ${paywall}
    ${on ? kpi : ""}
    ${on || tab === "training" ? tabs : ""}
    ${on || tab === "training" ? panel : ""}
    ${faqModal}
  </div>`;
};

OnLead.ncModeCard = function ncModeCard(title, desc, on, act, key, foot) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  return `<div class="card nc-mode-card">
    <div class="nc-mode-top"><h4>${esc(title)}</h4><span class="chip ${on ? "chip-ok" : ""}">${on ? "Вкл" : "Выкл"}</span></div>
    <p class="muted">${esc(desc)}</p>
    ${foot ? `<p class="muted nc-mode-foot">${esc(foot)}</p>` : ""}
    <button type="button" class="btn btn-ghost btn-sm" data-act="${act}" data-key="${esc(key)}" data-val="${on ? "0" : "1"}">${on ? "Выключить" : "Включить"}</button>
  </div>`;
};

OnLead.ncFaqModalHtml = function ncFaqModalHtml(tab) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const faq = OnLead.NC_FAQ[tab] || OnLead.NC_FAQ.overview;
  return `<div id="nc-faq-modal" class="lg-ol-modal ol-modal">
    <div class="lg-ol-modal-box ol-modal-box">
      <div class="lg-ol-modal-head ol-modal-head"><h3>${esc(faq.title)}</h3>
        <button type="button" class="btn btn-ghost btn-sm" data-act="nc-faq-close">Закрыть</button></div>
      <div class="lg-ol-modal-body ol-modal-body">
        ${faq.badge ? `<span class="chip">${esc(faq.badge)}</span>` : ""}
        <p class="muted" style="margin:10px 0">${esc(faq.description)}</p>
        ${faq.steps ? `<ol class="nc-steps">${faq.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      </div>
    </div>
  </div>`;
};

OnLead.bindNeurocommentOl = function bindNeurocommentOl() {
  document.getElementById("nc-faq-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "nc-faq-modal") OnLead._ncFaqOpen = false;
  });
};
