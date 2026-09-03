/**
 * Автопубликация — RSS Autopilot, AI-кросспост (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.autopubOlNav = function autopubOlNav(path) {
  const items = [
    { href: "#/office/automation", label: "Обзор" },
    { href: "#/office/webhooks/inbound", label: "Webhook" },
    { href: "#/office/rss", label: "RSS Autopilot" },
    { href: "#/office/repost", label: "Репосты VK" },
    { href: "#/office/crosspost", label: "AI-кросспост" },
  ];
  return `<div class="toolbar ap-nav">${items.map((it) => {
    const p = String(it.href).replace("#", "");
    const on = path === p || (it.href.includes("webhooks") && path.startsWith("/office/webhooks"));
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="${it.href}">${it.label}</a>`;
  }).join("")}</div>`;
};

OnLead.automationOlPage = function automationOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.autopubOlNav(path);
  const rssN = (state.rssSources || []).length;
  const grabOn = OnLead.toolOn(state, "grabber-vk");
  const whUrl = OnLead._inboundWebhookUrl || "";
  return `<div class="ap-ol">
    ${nav}
    <div class="h-row"><div><p class="ap-kicker">Автоматизация</p><h1>Обзор</h1>
      <p class="muted">RSS в черновики, AI-кросспост, webhook и репосты из VK.</p></div></div>
    <div class="card ap-webhook" id="webhook">
      <b>Внешний триггер → черновик</b>
      <p class="muted">Кратко: POST JSON → черновик. Полные настройки и тест — на отдельной странице.</p>
      ${whUrl
    ? `<input class="ap-webhook-url" readonly value="${esc(whUrl)}" aria-label="Webhook URL">`
    : `<p class="muted">Загрузка URL…</p>`}
      <div class="toolbar" style="margin-top:10px">
        <a class="btn btn-sm btn-primary" href="#/office/webhooks/inbound">Настройки webhook</a>
        <button type="button" class="btn btn-sm btn-ghost" data-act="webhook-copy" ${whUrl ? "" : "disabled"}>Копировать URL</button>
      </div>
    </div>
    <div class="ap-cards">
      <a class="card ap-card" href="#/office/rss">
        <b>RSS Autopilot</b>
        <p class="muted">Лента → черновики и расписание · ${rssN} источник${rssN === 1 ? "" : rssN >= 2 && rssN <= 4 ? "а" : "ов"}</p>
      </a>
      <a class="card ap-card" href="#/office/crosspost">
        <b>AI-кросспост</b>
        <p class="muted">Один текст → версии для VK и Telegram</p>
      </a>
      <a class="card ap-card" href="#/office/repost">
        <b>Репосты VK</b>
        <p class="muted">Сканирование стены → черновики</p>
      </a>
      <a class="card ap-card" href="#/office/tools/grabber-vk">
        <b>Граббер постов</b>
        <p class="muted">${grabOn ? "Включён" : "Выкл"} · репосты из VK в очередь</p>
      </a>
      <a class="card ap-card" href="#/office/content">
        <b>Доска контента</b>
        <p class="muted">Черновики и запланированные публикации</p>
      </a>
    </div>
  </div>`;
};

/** Dedicated inbound webhook settings (OL /webhooks/inbound). */
OnLead.inboundWebhookOlPage = function inboundWebhookOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.autopubOlNav(path);
  const whUrl = OnLead._inboundWebhookUrl || "";
  return `<div class="ap-ol">
    ${nav}
    <div class="h-row"><div><p class="ap-kicker">Автоматизация</p><h1>Входящий webhook</h1>
      <p class="muted">POST с внешнего сервиса создаёт черновик или запланированный пост в кабинете.</p></div></div>
    <div class="card ap-webhook">
      <b>URL endpoint</b>
      ${whUrl
    ? `<input class="ap-webhook-url" readonly value="${esc(whUrl)}" aria-label="Webhook URL">`
    : `<p class="muted">Загрузка…</p>`}
      <div class="toolbar" style="margin-top:10px">
        <button type="button" class="btn btn-sm btn-primary" data-act="webhook-copy" ${whUrl ? "" : "disabled"}>Копировать</button>
        <button type="button" class="btn btn-sm btn-ghost" data-act="webhook-rotate">Сменить токен</button>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <b>Формат тела</b>
      <pre class="ap-webhook-hint" style="white-space:pre-wrap;font-size:12px;margin:8px 0 0">{
  "title": "Заголовок",
  "body": "Текст поста",
  "scheduledAt": "2026-09-10T18:00:00+05:00",
  "accountId": "опционально",
  "ownerId": -123456
}</pre>
      <p class="muted" style="margin-top:10px;font-size:12px">Авторизация — секрет в URL. После смены токена обновите интеграцию.</p>
    </div>
  </div>`;
};

OnLead.rssOlPage = function rssOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.autopubOlNav(path);
  const sources = state.rssSources || [];
  const sel = OnLead._rssSourceId || sources[0]?.id || "";
  const active = sources.find((s) => s.id === sel) || null;
  const accounts = state.accounts || [];
  const walls = active?.accountId ? OnLead.composeWallOptions(state, active.accountId) : OnLead.composeWallOptions(state, accounts[0]?.id);

  const srcList = sources.length
    ? `<div class="ap-src-list">${sources.map((s) => `<button type="button" class="ap-src ${s.id === sel ? "on" : ""}" data-act="rss-pick-src" data-id="${esc(s.id)}">
        <b>${esc(s.name)}</b>
        <span class="muted">${esc(s.url.slice(0, 48))}${s.url.length > 48 ? "…" : ""}</span>
        ${s.lastError ? `<span class="ap-err">${esc(s.lastError.slice(0, 80))}</span>` : ""}
        <span class="ap-meta">${s.itemCount || 0} записей · ${s.onlineMode ? "онлайн" : "ручной"}</span>
      </button>`).join("")}</div>`
    : `<div class="card muted">Добавьте RSS-ленту — статьи появятся справа.</div>`;

  const settings = active ? `<div class="card ap-settings">
    <div class="h-row" style="margin:0 0 10px"><b>${esc(active.name)}</b>
      <div class="toolbar">
        <button type="button" class="btn btn-ghost btn-sm" data-act="rss-fetch" data-id="${esc(active.id)}">Обновить</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="rss-del-src" data-id="${esc(active.id)}">Удалить</button>
      </div>
    </div>
    <label class="field chk"><input type="checkbox" name="enabled" ${active.enabled !== false ? "checked" : ""}> Включён</label>
    <label class="field chk"><input type="checkbox" name="onlineMode" ${active.onlineMode ? "checked" : ""}> Онлайн-режим (авто-импорт новых)</label>
    <label class="field chk"><input type="checkbox" name="aiRewrite" ${active.aiRewrite !== false ? "checked" : ""}> AI-переписывание</label>
    <label class="field"><span>VK-аккаунт</span>
      <select name="accountId">${accounts.map((a) => `<option value="${esc(a.id)}"${a.id === active.accountId ? " selected" : ""}>${esc(a.name)}</option>`).join("") || `<option value="">—</option>`}</select></label>
    <label class="field"><span>Стена по умолчанию</span>
      <select name="ownerId">${walls.map((w) => `<option value="${w.ownerId}"${String(w.ownerId) === String(active.ownerId) ? " selected" : ""}>${esc(w.label)}</option>`).join("") || `<option value="">—</option>`}</select></label>
    <button type="button" class="btn btn-primary btn-sm" data-act="rss-save-src" data-id="${esc(active.id)}">Сохранить</button>
  </div>` : "";

  return `<div class="ap-ol">
    ${nav}
    <div class="h-row"><div><p class="ap-kicker">Автоматизация</p><h1>RSS Autopilot</h1></div></div>
    <div class="ap-layout">
      <div class="ap-col">
        <form id="rss-add-form" class="card ap-add">
          <label class="field"><span>URL ленты</span><input name="url" type="url" required placeholder="https://example.com/feed.xml"></label>
          <label class="field"><span>Название</span><input name="name" placeholder="Необязательно"></label>
          <label class="field chk"><input type="checkbox" name="onlineMode"> Онлайн-режим</label>
          <button type="submit" class="btn btn-primary">Добавить</button>
        </form>
        ${srcList}
      </div>
      <div class="ap-col">
        ${settings}
        <div id="rss-items-box" class="card" data-source="${esc(sel)}">
          <div class="h-row" style="margin:0 0 8px"><b>Записи</b>
            <button type="button" class="btn btn-ink btn-sm" data-act="rss-import" ${sel ? "" : "disabled"}>В черновики</button>
          </div>
          <p class="muted">Загрузка…</p>
        </div>
      </div>
    </div>
  </div>`;
};

OnLead.crosspostOlPage = function crosspostOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.autopubOlNav(path);
  const accounts = state.accounts || [];
  const accId = accounts[0]?.id || "";
  const walls = OnLead.composeWallOptions(state, accId);
  const versions = OnLead._crosspostVersions || {};

  const versionBlocks = Object.keys(versions).length
    ? Object.entries(versions).map(([p, text]) => `<div class="card ap-version">
        <b class="ap-plat">${esc(p.toUpperCase())}</b>
        <textarea class="ap-version-text" data-platform="${esc(p)}">${esc(text)}</textarea>
      </div>`).join("")
    : "";

  return `<div class="ap-ol">
    ${nav}
    <div class="h-row"><div><p class="ap-kicker">Автоматизация</p><h1>AI-кросспост</h1>
      <p class="muted">Вставьте пост — получите адаптации под площадки и черновики в контенте.</p></div></div>
    <div class="card ap-cross-form">
      <label class="field"><span>Исходный текст</span>
        <textarea id="cross-source" rows="8" placeholder="Пост из Telegram или другого канала…">${esc(OnLead._crosspostSource || "")}</textarea></label>
      <div class="toolbar ap-plats">
        ${["vk", "telegram", "short"].map((p) => {
          const on = (OnLead._crosspostPlats || ["vk", "telegram"]).includes(p);
          return `<button type="button" class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" data-act="cross-plat" data-plat="${p}">${p === "short" ? "Короткая" : p.toUpperCase()}</button>`;
        }).join("")}
      </div>
      <button type="button" class="btn btn-primary" data-act="cross-adapt">Адаптировать AI</button>
    </div>
    ${versionBlocks ? `<div class="ap-versions">${versionBlocks}
      <div class="card">
        <label class="field"><span>VK-аккаунт для черновика</span>
          <select id="cross-account">${accounts.map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("") || `<option value="">—</option>`}</select></label>
        <label class="field"><span>Стена VK</span>
          <select id="cross-owner">${walls.map((w) => `<option value="${w.ownerId}">${esc(w.label)}</option>`).join("") || `<option value="">—</option>`}</select></label>
        <button type="button" class="btn btn-ink" data-act="cross-drafts">Создать черновики</button>
        <a class="btn btn-ghost" href="#/office/content">К контенту</a>
      </div>
    </div>` : ""}
  </div>`;
};

OnLead.loadRssItems = async function loadRssItems() {
  const box = document.getElementById("rss-items-box");
  if (!box) return;
  const sourceId = box.dataset.source;
  if (!sourceId) {
    box.innerHTML = `<p class="muted">Выберите источник</p>`;
    return;
  }
  try {
    const r = await OnLead.api(`/api/rss/sources/${sourceId}/items?take=80`);
    const items = r.items || [];
    OnLead._rssItems = items;
    if (!items.length) {
      box.innerHTML = `<div class="h-row" style="margin:0 0 8px"><b>Записи</b>
        <button type="button" class="btn btn-ink btn-sm" data-act="rss-import" data-source="${OnLead.esc(sourceId)}">В черновики</button></div>
        <p class="muted">Пусто — нажмите «Обновить» у источника.</p>`;
      return;
    }
    box.innerHTML = `<div class="h-row" style="margin:0 0 8px"><b>Записи</b>
      <button type="button" class="btn btn-ink btn-sm" data-act="rss-import" data-source="${OnLead.esc(sourceId)}">В черновики</button></div>
      <div class="ap-items">${items.map((it) => `<label class="ap-item">
        <input type="checkbox" name="rss-item" value="${OnLead.esc(it.id)}" ${it.status === "imported" ? "disabled" : ""}>
        <div><b>${OnLead.esc(it.title)}</b>
          <p class="muted">${OnLead.esc(String(it.summary || "").slice(0, 120))}</p>
          <span class="ap-meta">${it.status === "imported" ? "импортирован" : "новая"}${it.link ? ` · <a href="${OnLead.esc(it.link)}" target="_blank" rel="noopener">ссылка</a>` : ""}</span>
        </div>
      </label>`).join("")}</div>`;
  } catch (err) {
    box.innerHTML = `<p class="muted">${OnLead.esc(err.message)}</p>`;
  }
};

OnLead.loadInboundWebhook = async function loadInboundWebhook() {
  try {
    const r = await OnLead.api("/api/webhooks/inbound/token");
    OnLead._inboundWebhookUrl = r.url || "";
    const inp = document.querySelector(".ap-webhook-url");
    const copyBtn = document.querySelector('[data-act="webhook-copy"]');
    if (inp && r.url) {
      inp.value = r.url;
      copyBtn?.removeAttribute("disabled");
    }
  } catch {
    OnLead._inboundWebhookUrl = "";
  }
};

OnLead.bindAutopubOl = function bindAutopubOl() {
  OnLead.loadRssItems?.();
  document.getElementById("rss-add-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await OnLead.api("/api/rss/sources", {
        method: "POST",
        body: {
          url: fd.get("url"),
          name: fd.get("name"),
          onlineMode: fd.get("onlineMode") === "on",
        },
      });
      OnLead._flash = "RSS добавлен";
      await render();
    } catch (err) { alert(err.message); }
  });
};

OnLead.collectCrosspostVersions = function collectCrosspostVersions() {
  const out = { ...(OnLead._crosspostVersions || {}) };
  document.querySelectorAll(".ap-version-text").forEach((el) => {
    out[el.dataset.platform] = el.value;
  });
  return out;
};
