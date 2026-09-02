/**
 * Repost — VK wall → черновики (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.repostOlNav = function repostOlNav(path) {
  const items = [
    { href: "#/office/automation", label: "Обзор" },
    { href: "#/office/rss", label: "RSS" },
    { href: "#/office/repost", label: "Репосты VK" },
    { href: "#/office/crosspost", label: "AI-кросспост" },
  ];
  return `<div class="toolbar ap-nav">${items.map((it) => {
    const p = String(it.href).replace("#", "");
    const on = path === p;
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="${it.href}">${it.label}</a>`;
  }).join("")}</div>`;
};

OnLead.repostOlPage = function repostOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.repostOlNav(path);
  const sources = state.repostSources || [];
  const sel = OnLead._repostSourceId || sources[0]?.id || "";
  const active = sources.find((s) => s.id === sel) || null;
  const accounts = state.accounts || [];
  const walls = active?.accountId ? OnLead.composeWallOptions(state, active.accountId) : OnLead.composeWallOptions(state, accounts[0]?.id);

  const srcList = sources.length
    ? `<div class="ap-src-list">${sources.map((s) => `<button type="button" class="ap-src ${s.id === sel ? "on" : ""}" data-act="repost-pick-src" data-id="${esc(s.id)}">
        <b>${esc(s.name)}</b>
        <span class="muted">VK ${esc(String(s.externalOwnerId))}</span>
        ${s.lastError ? `<span class="ap-err">${esc(s.lastError.slice(0, 80))}</span>` : ""}
        <span class="ap-meta">${s.itemCount || 0} записей · ${s.onlineMode ? "онлайн" : "ручной"}</span>
      </button>`).join("")}</div>`
    : `<div class="card muted">Добавьте группу или страницу VK — посты появятся справа.</div>`;

  const settings = active ? `<div class="card ap-settings">
    <div class="h-row" style="margin:0 0 10px"><b>${esc(active.name)}</b>
      <div class="toolbar">
        <button type="button" class="btn btn-ghost btn-sm" data-act="repost-fetch" data-id="${esc(active.id)}">Сканировать</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="repost-del-src" data-id="${esc(active.id)}">Удалить</button>
      </div></div>
    <label class="field chk"><input type="checkbox" name="enabled" ${active.enabled !== false ? "checked" : ""}> Включён</label>
    <label class="field chk"><input type="checkbox" name="onlineMode" ${active.onlineMode ? "checked" : ""}> Онлайн-режим</label>
    <label class="field"><span>Ключевые слова (включить)</span><input name="includeKeywords" value="${esc((active.includeKeywords || []).join(", "))}" placeholder="акция, новость"></label>
    <label class="field"><span>Исключить слова</span><input name="excludeKeywords" value="${esc((active.excludeKeywords || []).join(", "))}"></label>
    <label class="field"><span>VK-аккаунт</span>
      <select name="accountId">${accounts.map((a) => `<option value="${esc(a.id)}"${a.id === active.accountId ? " selected" : ""}>${esc(a.name)}</option>`).join("") || `<option value="">—</option>`}</select></label>
    <label class="field"><span>Стена назначения</span>
      <select name="ownerId">${walls.map((w) => `<option value="${w.ownerId}"${String(w.ownerId) === String(active.ownerId) ? " selected" : ""}>${esc(w.label)}</option>`).join("") || `<option value="">—</option>`}</select></label>
    <button type="button" class="btn btn-ghost btn-sm" data-act="repost-save-src" data-id="${esc(active.id)}">Сохранить</button>
  </div>` : "";

  return `<div class="ap-ol">
    ${nav}
    <div class="h-row"><div><p class="ap-kicker">Автопубликация</p><h1>Репосты VK</h1>
      <p class="muted">Сканирование стены → черновики с вложениями.</p></div></div>
    <div class="ap-layout">
      <div class="ap-col">
        <form id="repost-add-form" class="card ap-add">
          <b>Добавить источник</b>
          <label class="field"><span>Ссылка или ID</span><input name="externalRef" required placeholder="https://vk.com/club123 или -123"></label>
          <label class="field"><span>Название</span><input name="name" placeholder="Необязательно"></label>
          <label class="field chk"><input type="checkbox" name="onlineMode"> Онлайн-режим</label>
          <button type="submit" class="btn btn-primary btn-sm">Добавить</button>
        </form>
        ${srcList}
        ${settings}
      </div>
      <div class="ap-col">
        <div class="card" id="repost-items-box" data-source="${esc(sel)}">
          ${active ? `<p class="muted">Загрузка постов…</p>` : `<p class="muted">Выберите или добавьте источник.</p>`}
        </div>
        ${active ? `<div class="toolbar"><button type="button" class="btn btn-primary btn-sm" data-act="repost-import">Импорт в черновики</button></div>` : ""}
      </div>
    </div>
  </div>`;
};

OnLead.loadRepostItems = async function loadRepostItems() {
  const box = document.getElementById("repost-items-box");
  const sourceId = box?.dataset.source;
  if (!box || !sourceId) return;
  try {
    const r = await OnLead.api(`/api/repost/sources/${sourceId}/items?status=new`);
    const items = r.items || [];
    const esc = OnLead.esc || ((s) => String(s ?? ""));
    if (!items.length) {
      box.innerHTML = `<p class="muted">Нет новых постов — нажмите «Сканировать».</p>`;
      return;
    }
    box.innerHTML = `<div class="ap-items">${items.map((it) => `<label class="ap-item">
      <input type="checkbox" name="repost-item" value="${esc(it.id)}">
      <div><b>${esc(it.title || it.text.slice(0, 60))}</b>
        <p class="muted">${esc(String(it.text || "").slice(0, 120))}</p>
        ${it.link ? `<a href="${esc(it.link)}" target="_blank" rel="noopener" class="muted">оригинал</a>` : ""}
        ${(it.attachments || []).length ? `<span class="ap-meta">${it.attachments.length} влож.</span>` : ""}
      </div></label>`).join("")}</div>`;
  } catch (err) {
    box.innerHTML = `<p class="muted">${OnLead.esc(err.message)}</p>`;
  }
};

OnLead.bindRepostOl = function bindRepostOl() {
  OnLead.loadRepostItems?.();
  document.getElementById("repost-add-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await OnLead.api("/api/repost/sources", {
        method: "POST",
        body: {
          externalRef: fd.get("externalRef"),
          name: fd.get("name"),
          onlineMode: fd.get("onlineMode") === "on",
        },
      });
      OnLead._flash = "Источник добавлен";
      await render();
    } catch (err) { alert(err.message); }
  });
};
