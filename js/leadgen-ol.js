/**
 * Лидоскоп — UX aligned with online-lead.ru
 */
window.OnLead = window.OnLead || {};

OnLead.fmtLeadgenTime = function fmtLeadgenTime(ts) {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 16).replace("T", " ");
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

OnLead.highlightLeadgenText = function highlightLeadgenText(text, phrase) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
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
};

OnLead.leadgenOlFilterBtn = function leadgenOlFilterBtn(key, val, label, current, tone) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const on = (current || "") === val;
  return `<button type="button" class="lg-ol-filter ${tone || ""} ${on ? "on" : ""}" data-act="lg-filter" data-key="${esc(key)}" data-val="${esc(val)}">${esc(label)}</button>`;
};

OnLead.leadgenOlMatchRow = function leadgenOlMatchRow(m, expanded) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const hot = (m.aiScore != null && m.aiScore >= 7) || (m.score || 0) >= 8 || /ищу|нужен|нужна|посоветуйте|заказать|кто может/i.test(m.text || "");
  const authorHref = m.authorUrl || (m.authorId ? (String(m.authorId).startsWith("-") ? `https://vk.com/club${String(m.authorId).replace(/^-/, "")}` : `https://vk.com/id${m.authorId}`) : "");
  const kindLabel = m.kind === "comment" ? "коммент" : "пост";
  return `<div class="lg-ol-match" data-match-id="${esc(m.id)}">
    <div class="lg-ol-match-body">
      <div class="lg-ol-match-meta">
        ${hot ? `<span class="chip chip-gold">Горячий лид</span>` : ""}
        <span class="chip">${esc(kindLabel)}</span>
        <span class="chip chip-muted">VK</span>
        <span class="chip chip-phrase">${esc(m.matchedPhrase)}</span>
        ${m.aiScore != null ? `<span class="chip chip-ai">AI ${m.aiScore}/10</span>` : ""}
        <span class="muted">${esc(OnLead.fmtLeadgenTime(m.foundAt || m.createdAt))}</span>
      </div>
      ${authorHref || m.authorName ? `<p class="lg-ol-author">${authorHref ? `<a href="${esc(authorHref)}" target="_blank" rel="noopener">${esc(m.authorName || m.authorId || "—")}</a>` : esc(m.authorName)}</p>` : ""}
      <p class="lg-ol-text">${OnLead.highlightLeadgenText(m.text, m.matchedPhrase)}</p>
      ${m.url ? `<a class="lg-ol-link muted" href="${esc(m.url)}" target="_blank" rel="noopener">исходный пост</a>` : ""}
      ${expanded ? `<div class="lg-ol-expand">
        <label class="field"><span>Заметка</span><textarea class="lg-ol-note" data-id="${esc(m.id)}" rows="2">${esc(m.note || "")}</textarea></label>
        ${m.aiScoreReason ? `<p class="muted" style="font-size:12px;margin:8px 0 0">${esc(m.aiScoreReason)}</p>` : ""}
        ${m.aiDraftReply ? `<div class="lg-ol-draft"><b class="muted" style="font-size:12px">Черновик ответа</b>
          <textarea readonly rows="3">${esc(m.aiDraftReply)}</textarea>
          <button type="button" class="btn btn-ghost btn-sm" data-act="lg-copy-draft" data-text="${esc(m.aiDraftReply)}">Копировать</button></div>` : ""}
        <div class="toolbar" style="margin-top:8px">
          <button type="button" class="btn btn-ghost btn-sm" data-act="lg-ai-score" data-id="${esc(m.id)}">Оценить ИИ</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="lg-ai-draft" data-id="${esc(m.id)}">Черновик ответа</button>
          <a class="btn btn-ghost btn-sm" href="#/office/crm">CRM</a>
        </div>
      </div>` : ""}
    </div>
    <div class="lg-ol-match-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-act="lg-expand-match" data-id="${esc(m.id)}">${expanded ? "Свернуть" : "Карточка"}</button>
      ${m.status !== "saved" ? `<button type="button" class="btn btn-ghost btn-sm" data-act="lg-mark-saved" data-id="${esc(m.id)}">Сохранить</button>` : `<span class="muted" style="font-size:12px">сохранено</span>`}
      ${m.status !== "saved" ? `<button type="button" class="btn btn-primary btn-sm" data-act="lg-save-match" data-id="${esc(m.id)}">В CRM</button>` : ""}
      ${m.status !== "dismissed" ? `<button type="button" class="btn btn-ghost btn-sm" data-act="lg-del-match" data-id="${esc(m.id)}">Скрыть</button>` : `<button type="button" class="btn btn-ghost btn-sm" data-act="lg-restore-match" data-id="${esc(m.id)}">Вернуть</button>`}
      <button type="button" class="btn btn-ghost btn-sm" data-act="lg-delete-match" data-id="${esc(m.id)}">Удалить</button>
    </div>
  </div>`;
};

OnLead.leadgenOlPage = function leadgenOlPage(state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const t = OnLead.tool("leadgen-vk");
  const on = OnLead.toolOn(state, "leadgen-vk");
  const cfg = state.leadgen || {};
  const matches = state.leadgenMatches || [];
  const phrases = cfg.phrases || [];
  const savedGroups = cfg.groups || [];
  const status = cfg.scanStatus || "idle";
  const scanning = status === "running" || status === "queued";
  const filter = OnLead._lgFilter || { status: "", kind: "", phrase: "", author: "" };
  const shown = matches.filter((m) => {
    if (filter.status) return m.status === filter.status;
    return m.status !== "dismissed";
  }).filter((m) => !filter.kind || m.kind === filter.kind)
    .filter((m) => {
      if (!filter.phrase) return true;
      const q = filter.phrase.toLowerCase();
      return String(m.matchedPhrase || "").toLowerCase().includes(q) || String(m.text || "").toLowerCase().includes(q);
    })
    .filter((m) => {
      if (!filter.author) return true;
      return String(m.authorName || "").toLowerCase().includes(filter.author.toLowerCase());
    });

  const paywall = on ? "" : `<div class="card lg-ol-paywall">
    <b>${esc(t.name)}</b>
    <p class="muted">${esc(t.summary)}</p>
    <div class="toolbar">${OnLead.PERIODS.map((p) => {
      const price = Math.round(t.price * p.id * (1 - p.discount));
      return `<button class="btn btn-primary btn-sm" data-act="buy-tool" data-slug="leadgen-vk" data-m="${p.id}" data-amount="${price}">${p.label} · ${price} ₽</button>`;
    }).join("")}</div></div>`;

  const scanBtn = scanning
    ? (status === "queued" ? "В очереди…" : "Сканирую…")
    : "Сканировать сейчас";

  return `<div class="lg-ol">
    <div class="ol-page-head lg-ol-head">
      <div>
        <h1>Лидоскоп</h1>
        <p class="muted ol-page-head__lead">Мониторинг «горячих» запросов в VK — ответ в один клик или в CRM</p>
        <div class="ol-page-actions" style="justify-content:flex-start;margin-top:10px">
          <a class="btn btn-ghost btn-sm" href="#/office/crm">CRM-воронка</a>
        </div>
      </div>
      ${on ? `<div class="lg-ol-scan-bar">
        <div class="lg-ol-mode" role="group">
          <button type="button" class="lg-ol-mode-btn ${!cfg.enabled ? "on" : ""}" data-act="lg-toggle-enabled" data-val="0">Вручную</button>
          <button type="button" class="lg-ol-mode-btn ${cfg.enabled ? "on" : ""}" data-act="lg-toggle-enabled" data-val="1">По расписанию</button>
        </div>
        <button type="button" class="btn btn-primary" data-act="lg-scan" ${scanning ? "disabled" : ""}>${scanBtn}</button>
        <div class="lg-ol-scan-meta muted">
          ${status === "queued" ? `<span class="chip">В очереди</span>` : ""}
          ${status === "running" ? `<span class="chip">Идёт скан…</span>` : ""}
          ${status === "failed" ? `<span class="chip chip-warn">Ошибка</span>` : ""}
          ${cfg.lastScanAt ? `Последний ${esc(OnLead.fmtLeadgenTime(cfg.lastScanAt))}` : ""}
          ${cfg.enabled ? ` · авто каждые ${cfg.scanIntervalMin || 30} мин` : ""}
        </div>
      </div>` : ""}
    </div>
    ${paywall}
    ${on ? `<div class="card lg-ol-bar">
      <label class="field"><span>VK-аккаунт</span>
        <select id="lg-account">${state.accounts.length
          ? state.accounts.map((a) => `<option value="${esc(a.id)}" ${a.id === (cfg.accountId || state.activeAccount) ? "selected" : ""}>${esc(a.name)}</option>`).join("")
          : `<option value="">Подключите аккаунт</option>`}</select>
      </label>
      <label class="field"><span>Искать в</span>
        <select id="lg-target">
          <option value="all" ${cfg.scanTarget === "all" || !cfg.scanTarget ? "selected" : ""}>Посты и комментарии</option>
          <option value="posts" ${cfg.scanTarget === "posts" ? "selected" : ""}>Только посты</option>
          <option value="comments" ${cfg.scanTarget === "comments" ? "selected" : ""}>Только комментарии</option>
        </select>
      </label>
      <label class="field lg-ol-narrow"><span>Интервал, мин</span>
        <input id="lg-interval" type="number" min="5" max="1440" value="${esc(cfg.scanIntervalMin || 30)}">
      </label>
      <label class="field lg-ol-narrow"><span>Постов</span>
        <input id="lg-posts" type="number" min="5" max="100" value="${esc(cfg.postsLimit || 20)}">
      </label>
      <label class="field lg-ol-narrow"><span>Комментов</span>
        <input id="lg-comments" type="number" min="0" max="100" value="${esc(cfg.commentsPerPost || 20)}">
      </label>
      <div class="lg-ol-bar-foot">
        <span class="chip">${cfg.scansToday || 0} сканов сегодня</span>
        <button type="button" class="btn btn-ghost btn-sm" data-act="lg-save-cfg">Сохранить</button>
      </div>
      ${cfg.lastError ? `<p class="muted" style="width:100%;margin:0;font-size:12px;color:var(--warn-fg,#b45309)">${esc(cfg.lastError)}</p>` : ""}
    </div>` : ""}
    ${on ? `<div class="lg-ol-grid">
      <div class="card">
        <div class="ol-page-head" style="margin-bottom:10px">
          <h3 style="margin:0;font-size:15px">Группы <span class="muted">${savedGroups.length}</span></h3>
          <button type="button" class="btn btn-ghost btn-sm" data-act="lg-open-groups">Выбрать группы</button>
        </div>
        ${savedGroups.length ? `<div class="lg-ol-chips">${savedGroups.slice(0, 12).map((g) => `<span class="chip">${esc(g.name || g.externalGroupId)}</span>`).join("")}${savedGroups.length > 12 ? `<span class="muted">+${savedGroups.length - 12}</span>` : ""}</div>` : `<p class="muted">Группы не выбраны</p>`}
      </div>
      <div class="card">
        <h3 style="margin:0 0 10px">Фразы <span class="muted">${phrases.length}</span></h3>
        <form id="lg-phrase-form" class="lg-add">
          <input name="phrase" placeholder="ищу мастера, нужен ремонт…">
          <button type="submit" class="btn btn-primary btn-sm">+</button>
        </form>
        <p class="muted" style="font-size:11px;margin:10px 0 6px">Пресеты ниш:</p>
        <div class="toolbar">${(OnLead.NICHES || []).map((n) => `<button type="button" class="btn btn-ghost btn-sm" data-act="lg-niche" data-id="${n.id}">${esc(n.title)}</button>`).join("")}</div>
        <div class="acc-groups" style="margin-top:10px">${phrases.length ? phrases.map((p) => `<span class="chip">${esc(p.phrase)} <button type="button" data-act="lg-del-phrase" data-id="${esc(p.id)}">×</button></span>`).join("") : `<span class="muted">Добавьте фразы</span>`}</div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3 style="margin:0 0 10px">Уведомления и стоп-слова</h3>
      <label class="lg-check"><input type="checkbox" id="lg-notify-email" ${cfg.notifyEmail !== false ? "checked" : ""}> Email о новых лидах</label>
      <label class="lg-check"><input type="checkbox" id="lg-notify-tg" ${cfg.notifyTelegram ? "checked" : ""}> Telegram о новых лидах</label>
      <label class="field"><span>Telegram chat_id</span>
        <input id="lg-tg-chat" value="${esc(cfg.telegramChatId || "")}" placeholder="123456789 или -100…">
      </label>
      <label class="field"><span>Исключения (по строке)</span>
        <textarea id="lg-excludes" rows="3" placeholder="спам\nреклама">${esc((cfg.excludePhrases || []).join("\n"))}</textarea>
      </label>
      <button type="button" class="btn btn-ghost btn-sm" data-act="lg-save-notify">Сохранить</button>
    </div>
    <div class="card lg-ol-matches" style="margin-top:12px">
      <div class="ol-page-head lg-ol-matches-head" style="margin-bottom:12px">
        <h3 style="margin:0;font-size:15px">Совпадения <span class="muted">${shown.length}</span></h3>
        <div class="lg-ol-filters-wrap">
          <div class="lg-ol-filters">${["", "post", "comment"].map((v, i) => OnLead.leadgenOlFilterBtn("kind", v, ["Все", "Посты", "Комментарии"][i], filter.kind, "kind")).join("")}</div>
          <div class="lg-ol-filters">${["", "new", "saved", "dismissed"].map((v, i) => OnLead.leadgenOlFilterBtn("status", v, ["Все", "Новые", "Сохранённые", "Скрытые"][i], filter.status, "status")).join("")}</div>
        </div>
      </div>
      <div class="lg-ol-adv-filters">
        <input id="lg-filter-phrase" placeholder="Фильтр по фразе" value="${esc(filter.phrase || "")}">
        <input id="lg-filter-author" placeholder="Автор" value="${esc(filter.author || "")}">
        <button type="button" class="btn btn-ghost btn-sm" data-act="lg-apply-filters">Применить</button>
      </div>
      <div class="lg-ol-match-list">${shown.length
        ? shown.map((m) => OnLead.leadgenOlMatchRow(m, OnLead._lgExpanded === m.id)).join("")
        : `<p class="muted" style="padding:24px;text-align:center">${matches.length ? "Нет заявок в этом фильтре." : "Пока пусто — сохраните группы и фразы, затем «Сканировать»."}</p>`}</div>
    </div>
    <div id="lg-groups-modal" class="lg-ol-modal ol-modal" hidden>
      <div class="lg-ol-modal-box ol-modal-box">
        <div class="lg-ol-modal-head ol-modal-head">
          <h3>Группы VK</h3>
          <button type="button" class="btn btn-ghost btn-sm" data-act="lg-close-groups">Закрыть</button>
        </div>
        <div class="lg-ol-modal-body ol-modal-body">
          <div class="lg-add">
            <input id="lg-group-q" placeholder="Поиск по названию">
            <button type="button" class="btn btn-ghost btn-sm" data-act="lg-load-groups">Обновить</button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="lg-groups-all">Все</button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="lg-groups-none">Сброс</button>
          </div>
          <div id="lg-group-list" class="lg-groups" style="margin-top:12px"></div>
          <p class="muted" id="lg-status" style="margin:10px 0 0;font-size:12px"></p>
        </div>
        <div class="lg-ol-modal-foot ol-modal-foot">
          <button type="button" class="btn btn-primary btn-sm" data-act="lg-save-groups">Сохранить</button>
        </div>
      </div>
    </div>` : ""}
  </div>`;
};

OnLead.bindLeadgenOl = function bindLeadgenOl() {
  const phraseInput = document.getElementById("lg-filter-phrase");
  const authorInput = document.getElementById("lg-filter-author");
  phraseInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.querySelector("[data-act=lg-apply-filters]")?.click();
  });
  authorInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.querySelector("[data-act=lg-apply-filters]")?.click();
  });
  document.querySelectorAll(".lg-ol-note").forEach((ta) => {
    ta.addEventListener("blur", async () => {
      try {
        await OnLead.api("/api/leadgen/matches/" + ta.dataset.id, { method: "PATCH", body: { note: ta.value } });
      } catch { /* ignore */ }
    });
  });
  const gq = document.getElementById("lg-group-q");
  if (gq && !gq.dataset.bound) {
    gq.dataset.bound = "1";
    gq.addEventListener("input", () => {
      const needle = gq.value.trim().toLowerCase();
      document.querySelectorAll("#lg-group-list .lg-check").forEach((el) => {
        const name = (el.dataset.gname || "").toLowerCase();
        el.style.display = !needle || name.includes(needle) ? "" : "none";
      });
    });
  }
  document.getElementById("lg-groups-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "lg-groups-modal") e.target.setAttribute("hidden", "");
  });
};

/* --- group-check helpers --- */
OnLead.fmtLeadgenTime = function fmtLeadgenTime(ts) {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 16).replace("T", " ");
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

OnLead.highlightLeadgenText = function highlightLeadgenText(text, phrase) {
  const source = String(text || "");
  const needle = String(phrase || "").trim();
  if (!source) return "";
  if (!needle) return OnLead.esc(source);
  const lower = source.toLowerCase();
  const n = needle.toLowerCase();
  let out = "";
  let from = 0;
  let idx = lower.indexOf(n, from);
  while (idx !== -1) {
    out += OnLead.esc(source.slice(from, idx));
    out += `<mark class="lg-hit">${OnLead.esc(source.slice(idx, idx + needle.length))}</mark>`;
    from = idx + needle.length;
    idx = lower.indexOf(n, from);
  }
  return out + OnLead.esc(source.slice(from));
}

OnLead.vkGroupHref = function vkGroupHref(g) {
  const sn = g.screenName || g.screen_name;
  if (sn) return "https://vk.com/" + sn;
  const id = String(g.id || g.externalGroupId || "").replace(/^-/, "");
  return id ? "https://vk.com/club" + id : "";
}

OnLead.lgNormId = function lgNormId(v) {
  return String(v || "").replace(/^-/, "");
}

OnLead.leadgenCheckedSet = function leadgenCheckedSet(state) {
  if (OnLead._lgChecked instanceof Set) return OnLead._lgChecked;
  const saved = (state || OnLead.load()).leadgen?.groups || [];
  OnLead._lgChecked = new Set(saved.map((g) => OnLead.lgNormId(g.externalGroupId || g.id)).filter(Boolean));
  return OnLead._lgChecked;
}

OnLead.syncLeadgenCheckedFromDom = function syncLeadgenCheckedFromDom() {
  const set = OnLead.leadgenCheckedSet();
  document.querySelectorAll("#lg-group-list input[data-gid]").forEach((el) => {
    const id = OnLead.lgNormId(el.dataset.gid);
    if (!id) return;
    if (el.checked) set.add(id);
    else set.delete(id);
  });
}

OnLead.leadgenGroupRowHtml = function leadgenGroupRowHtml(g, checked) {
  const href = OnLead.vkGroupHref(g);
  const id = OnLead.lgNormId(g.id || g.externalGroupId);
  return `<div class="lg-check" data-gname="${OnLead.esc(g.name)}">
    <label><input type="checkbox" ${checked ? "checked" : ""} data-gid="${OnLead.esc(id)}" data-gname="${OnLead.esc(g.name)}" data-gsn="${OnLead.esc(g.screenName || "")}"> <span>${OnLead.esc(g.name)}</span></label>
    ${href ? `<a href="${OnLead.esc(href)}" target="_blank" rel="noopener">VK</a>` : ""}
  </div>`;
}

OnLead.leadgenGroupRows = function leadgenGroupRows(state) {
  const selected = OnLead.leadgenCheckedSet(state);
  const loaded = OnLead._lgLoadedGroups;
  if (loaded?.length) {
    return loaded.map((g) => {
      const id = OnLead.lgNormId(g.id);
      return { id, name: g.name, screenName: g.screenName || "", checked: selected.has(id) };
    });
  }
  return (state.leadgen?.groups || []).map((g) => ({
    id: OnLead.lgNormId(g.externalGroupId),
    name: g.name,
    screenName: g.screenName || "",
    checked: true,
  }));
}

OnLead.lgFilterBtn = function lgFilterBtn(key, val, label, current) {
  const on = (current || "") === val ? "on" : "";
  return `<button type="button" class="btn btn-ghost btn-sm ${on}" data-act="lg-filter" data-key="${OnLead.esc(key)}" data-val="${OnLead.esc(val)}">${label}</button>`;
}

/* --- binders / API helpers --- */
OnLead.saveLeadgenCfg = async function saveLeadgenCfg() {
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

OnLead.collectedLeadgenGroups = function collectedLeadgenGroups() {
  OnLead.syncLeadgenCheckedFromDom();
  const byId = new Map();
  document.querySelectorAll("#lg-group-list input[data-gid]").forEach((el) => {
    const id = OnLead.lgNormId(el.dataset.gid);
    if (!id || !el.checked) return;
    byId.set(id, {
      externalGroupId: id,
      name: el.dataset.gname,
      screenName: el.dataset.gsn,
    });
  });
  return [...byId.values()];
}

OnLead.updateLeadgenGroupCount = function updateLeadgenGroupCount() {
  const el = $("#lg-group-count");
  if (!el) return;
  const all = document.querySelectorAll("#lg-group-list input[data-gid]").length;
  const n = document.querySelectorAll("#lg-group-list input[data-gid]:checked").length;
  el.textContent = all ? `Выбрано: ${n} из ${all}. Выбор сохраняется сам.` : "Нажмите «Загрузить из VK» — подтянутся сообщества аккаунта.";
}

OnLead.filterLeadgenGroups = function filterLeadgenGroups(q) {
  const needle = String(q || "").trim().toLowerCase();
  document.querySelectorAll("#lg-group-list .lg-check").forEach((el) => {
    const name = (el.dataset.gname || el.textContent || "").toLowerCase();
    el.style.display = !needle || name.includes(needle) ? "" : "none";
  });
}

OnLead.setLeadgenGroupControls = function setLeadgenGroupControls(hasGroups) {
  const on = OnLead.toolOn(OnLead.load(), "leadgen-vk");
  const q = $("#lg-group-q");
  if (q) q.disabled = !hasGroups;
  document.querySelectorAll("[data-act=lg-groups-all],[data-act=lg-groups-none]").forEach((b) => {
    b.disabled = !on || !hasGroups;
  });
}

OnLead.applyLeadgenGroupChecks = function applyLeadgenGroupChecks(check) {
  const set = OnLead.leadgenCheckedSet();
  document.querySelectorAll("#lg-group-list input[data-gid]").forEach((inp) => {
    inp.checked = check;
    const id = OnLead.lgNormId(inp.dataset.gid);
    if (!id) return;
    if (check) set.add(id);
    else set.delete(id);
  });
  OnLead.updateLeadgenGroupCount();
  OnLead.scheduleLeadgenGroupsSave();
}

OnLead.nextLeadgenSaveGen = function nextLeadgenSaveGen() {
  OnLead._lgSaveGen = (Number(OnLead._lgSaveGen) || 0) + 1;
  return OnLead._lgSaveGen;
}

OnLead.scheduleLeadgenGroupsSave = function scheduleLeadgenGroupsSave() {
  clearTimeout(OnLead._lgSaveTimer);
  const gen = OnLead.nextLeadgenSaveGen();
  OnLead._lgSaveTimer = setTimeout(() => {
    if (!document.querySelector("#lg-group-list input[data-gid]")) return;
    OnLead.saveLeadgenGroups(false, gen).catch((err) => {
      const status = $("#lg-status");
      if (status) status.textContent = err.message;
    });
  }, 500);
}

OnLead.bindLeadgenUi = function bindLeadgenUi() {
  const q = $("#lg-group-q");
  const list = $("#lg-group-list");
  if (!q && !list) return;
  if (q) {
    q.value = OnLead._lgGroupQ || "";
    OnLead.filterLeadgenGroups(q.value);
    q.addEventListener("input", () => {
      OnLead._lgGroupQ = q.value;
      OnLead.filterLeadgenGroups(q.value);
    });
  }
  if (list) {
    if (OnLead._lgListScroll) list.scrollTop = OnLead._lgListScroll;
    list.addEventListener("scroll", () => { OnLead._lgListScroll = list.scrollTop; }, { passive: true });
    list.addEventListener("change", () => {
      OnLead.syncLeadgenCheckedFromDom();
      OnLead.updateLeadgenGroupCount();
      OnLead.scheduleLeadgenGroupsSave();
    });
  }
  OnLead.setLeadgenGroupControls(!!list?.querySelector("input[data-gid]"));
  const allBtn = document.querySelector("[data-act=lg-groups-all]");
  const noneBtn = document.querySelector("[data-act=lg-groups-none]");
  allBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    OnLead.applyLeadgenGroupChecks(true);
  });
  noneBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    OnLead.applyLeadgenGroupChecks(false);
  });
}

OnLead.saveLeadgenGroups = async function saveLeadgenGroups(refresh = true, gen) {
  const my = gen == null ? OnLead.nextLeadgenSaveGen() : gen;
  const groups = OnLead.collectedLeadgenGroups();
  await OnLead.api("/api/leadgen/groups", { method: "PUT", body: { groups } });
  if (my !== OnLead._lgSaveGen) return;
  const state = OnLead.load();
  if (state?.leadgen) state.leadgen.groups = groups;
  const status = $("#lg-status");
  if (status) status.textContent = `Сохранено сообществ: ${groups.length}`;
  if (refresh === true) await OnLead.render();
}

OnLead.loadLeadgenGroups = async function loadLeadgenGroups() {
  const status = $("#lg-status");
  if (status) status.textContent = "Загружаем сообщества…";
  try {
    await OnLead.saveLeadgenCfg();
    const list = await OnLead.api("/api/leadgen/groups");
    OnLead._lgLoadedGroups = (list || []).map((g) => ({
      id: OnLead.lgNormId(g.id),
      name: g.name,
      screenName: g.screenName || "",
    }));
    const selected = OnLead.leadgenCheckedSet();
    const box = $("#lg-group-list");
    if (!box) return;
    box.innerHTML = OnLead._lgLoadedGroups.length
      ? OnLead._lgLoadedGroups.map((g) => OnLead.leadgenGroupRowHtml(g, selected.has(OnLead.lgNormId(g.id)))).join("")
      : `<span class="muted">VK не вернул группы</span>`;
    OnLead.setLeadgenGroupControls(!!OnLead._lgLoadedGroups.length);
    const q = $("#lg-group-q");
    OnLead.filterLeadgenGroups(OnLead._lgGroupQ || q?.value || "");
    OnLead.updateLeadgenGroupCount();
    if (status) status.textContent = `Загружено сообществ: ${OnLead._lgLoadedGroups.length}`;
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

OnLead.onLeadgenAddPhrase = async function onLeadgenAddPhrase(e) {
  e.preventDefault();
  const phrase = String(new FormData(e.target).get("phrase") || "").trim();
  if (!phrase) return;
  const phrases = [...(OnLead.load().leadgen?.phrases || [])];
  if (!phrases.some((p) => p.phrase.toLowerCase() === phrase.toLowerCase())) {
    phrases.push({ phrase, caseInsensitive: true });
  }
  await OnLead.api("/api/leadgen/phrases", { method: "PUT", body: { phrases } });
  await OnLead.render();
}

OnLead.onLeadgenExclude = async function onLeadgenExclude(e) {
  e.preventDefault();
  const text = String(new FormData(e.target).get("exclude") || "").trim();
  if (!text) return;
  const excludePhrases = [...new Set([...(OnLead.load().leadgen?.excludePhrases || []), text])];
  await OnLead.api("/api/leadgen", { method: "PATCH", body: { excludePhrases } });
  await OnLead.render();
}

OnLead.removeLeadgenPhrase = async function removeLeadgenPhrase(id) {
  const phrases = (OnLead.load().leadgen?.phrases || []).filter((p) => p.id !== id);
  await OnLead.api("/api/leadgen/phrases", { method: "PUT", body: { phrases } });
  await OnLead.render();
}

OnLead.removeLeadgenExclude = async function removeLeadgenExclude(text) {
  const excludePhrases = (OnLead.load().leadgen?.excludePhrases || []).filter((p) => p !== text);
  await OnLead.api("/api/leadgen", { method: "PATCH", body: { excludePhrases } });
  await OnLead.render();
}

OnLead.addLeadgenNiche = async function addLeadgenNiche(id) {
  const niche = OnLead.NICHES.find((n) => n.id === id);
  if (!niche) return;
  const phrases = [...(OnLead.load().leadgen?.phrases || [])];
  for (const phrase of niche.phrases) {
    if (!phrases.some((p) => p.phrase.toLowerCase() === phrase.toLowerCase())) {
      phrases.push({ phrase, caseInsensitive: true });
    }
  }
  await OnLead.api("/api/leadgen/phrases", { method: "PUT", body: { phrases } });
  await OnLead.render();
}

OnLead.startLeadgenScan = async function startLeadgenScan() {
  const status = $("#lg-status");
  try {
    await OnLead.saveLeadgenCfg();
    if (document.querySelectorAll("#lg-group-list input[data-gid]").length) await OnLead.saveLeadgenGroups(false);
    await OnLead.api("/api/leadgen/scan", { method: "POST" });
    if (status) status.textContent = "Скан в очереди…";
    const scanBtn = document.querySelector("[data-act=lg-scan]");
    if (scanBtn) { scanBtn.disabled = true; scanBtn.textContent = "Сканируем…"; }
    OnLead.pollLeadgenScan();
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

OnLead.pollLeadgenScan = function pollLeadgenScan() {
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
        await OnLead.render();
        return;
      }
      if (n > 90) {
        clearInterval(OnLead._leadgenPoll);
        await OnLead.render();
      }
    } catch {
      clearInterval(OnLead._leadgenPoll);
    }
  }, 2000);
}
