/**
 * Контент — доска, студия, медиа, история (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.CONTENT_COLS = [
  { id: "draft", label: "Черновики", tone: "sky" },
  { id: "pending_approval", label: "Согласование", tone: "violet" },
  { id: "scheduled", label: "Запланированы", tone: "amber" },
  { id: "published", label: "Опубликованы", tone: "emerald" },
  { id: "failed", label: "Ошибки", tone: "rose" },
];

OnLead.fmtContentDate = function fmtContentDate(ts) {
  if (!ts) return "—";
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

OnLead.contentOlNav = function contentOlNav(path) {
  const items = [
    { href: "#/office/content", label: "Доска" },
    { href: "#/office/content?view=calendar", label: "Календарь" },
    { href: "#/office/content?view=watermarks", label: "Водяные знаки" },
    { href: "#/office/compose", label: "Редактор" },
    { href: "#/office/content-studio", label: "AI-план" },
    { href: "#/office/ai-images", label: "AI-картинки" },
    { href: "#/office/media", label: "Медиатека" },
    { href: "#/office/history", label: "История" },
  ];
  return `<div class="toolbar cnt-nav">${items.map((it) => {
    const p = String(it.href).replace("#", "");
    const on = path === p || (p === "/office/content" && path.startsWith("/office/content?"));
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="${it.href}">${it.label}</a>`;
  }).join("")}</div>`;
};

OnLead.contentOlPage = function contentOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const q = hashParams();
  const view = q.get("view") || "board";
  const trash = q.get("trash") === "1";
  const posts = (state.contentPosts || []).filter((p) => (trash ? p.status === "trash" : p.status !== "trash"));
  const counts = state.contentCounts || {};
  const nav = OnLead.contentOlNav(path);

  const byStatus = Object.fromEntries(OnLead.CONTENT_COLS.map((c) => [c.id, []]));
  for (const p of posts) {
    const st = byStatus[p.status] ? p.status : "draft";
    (byStatus[st] || byStatus.draft).push(p);
  }

  const card = (p) => `<a class="cnt-card" href="#/office/compose?id=${esc(p.id)}">
    <b>${esc(p.title || p.text.slice(0, 48) || "Без названия")}</b>
    <p class="muted">${esc(String(p.text || "").slice(0, 100))}</p>
    <span class="cnt-card-meta muted">${p.scheduledAt ? `⏱ ${OnLead.fmtContentDate(p.scheduledAt)}` : OnLead.fmtContentDate(p.updatedAt || p.createdAt)}</span>
  </a>`;

  const board = `<div class="cnt-board">
    ${OnLead.CONTENT_COLS.map((col) => `<div class="cnt-col cnt-col-${col.tone}">
      <div class="cnt-col-head"><b>${esc(col.label)}</b><span>${(byStatus[col.id] || []).length}</span></div>
      <div class="cnt-col-body">${(byStatus[col.id] || []).map(card).join("") || `<p class="muted cnt-empty">Пусто</p>`}</div>
    </div>`).join("")}
  </div>`;

  const list = `<div class="cnt-list">${posts.map((p) => `<a class="cnt-row" href="#/office/compose?id=${esc(p.id)}">
    <div><b>${esc(p.title || "—")}</b><p class="muted">${esc(String(p.text || "").slice(0, 120))}</p></div>
    <span class="chip">${esc(p.status)}</span>
    <span class="muted">${OnLead.fmtContentDate(p.scheduledAt || p.publishedAt || p.updatedAt)}</span>
  </a>`).join("") || `<div class="card muted">Нет постов — создайте в редакторе или AI-плане.</div>`}</div>`;

  const calMonth = OnLead._calMonth || new Date();
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const calData = OnLead._calendarData?.days || [];
  const dayMap = Object.fromEntries(calData.map((d) => [d.date, d]));
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(`<div class="cnt-cal-cell cnt-cal-empty"></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const row = dayMap[key];
    const n = (row?.scheduled?.length || 0) + (row?.published?.length || 0) + (row?.draft?.length || 0);
    cells.push(`<a class="cnt-cal-cell${n ? " has" : ""}" href="#/office/content?view=day&date=${key}">
      <b>${d}</b>${n ? `<span class="cnt-cal-n">${n}</span>` : ""}</a>`);
  }
  const monthLabel = first.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const weekHdr = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => `<div class="cnt-cal-wd">${d}</div>`).join("");
  const calendar = `<div class="cnt-cal">
    <div class="toolbar cnt-cal-head">
      <button type="button" class="btn btn-ghost btn-sm" data-act="cal-prev">←</button>
      <b>${esc(monthLabel)}</b>
      <button type="button" class="btn btn-ghost btn-sm" data-act="cal-next">→</button>
      <a class="btn btn-ghost btn-sm" href="#/office/content?view=day&date=${new Date().toISOString().slice(0, 10)}">Сегодня</a>
    </div>
    <div class="cnt-cal-week">${weekHdr}</div>
    <div class="cnt-cal-grid">${cells.join("")}</div>
  </div>`;

  const dayView = view === "day" ? (() => {
    const dateKey = q.get("date") || new Date().toISOString().slice(0, 10);
    const row = dayMap[dateKey] || { scheduled: [], published: [], draft: [] };
    const all = [...row.scheduled, ...row.published, ...row.draft];
    return `<div class="card"><b>${esc(dateKey)}</b>
      ${all.length ? all.map((p) => `<a class="cnt-row" href="#/office/compose?id=${esc(p.id)}"><b>${esc(p.title || p.text.slice(0, 40))}</b>
        <span class="chip">${esc(p.status)}</span></a>`).join("") : `<p class="muted">Нет постов на этот день</p>`}
      <a class="btn btn-ghost btn-sm" href="#/office/content?view=calendar">← Календарь</a>
      <a class="btn btn-ghost btn-sm" href="#/office/content?view=week&date=${esc(dateKey)}">Неделя</a></div>`;
  })() : "";

  const weekView = view === "week" ? (() => {
    const dateKey = q.get("date") || new Date().toISOString().slice(0, 10);
    const anchor = new Date(dateKey + "T12:00:00");
    const dow = (anchor.getDay() + 6) % 7;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - dow);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const row = dayMap[key] || { scheduled: [], published: [], draft: [] };
      const all = [...row.scheduled, ...row.published, ...row.draft];
      const label = d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
      days.push(`<div class="cnt-week-day">
        <a class="cnt-week-head" href="#/office/content?view=day&date=${key}"><b>${esc(label)}</b><span>${all.length}</span></a>
        <div class="cnt-week-body">${all.length
          ? all.slice(0, 6).map((p) => `<a class="cnt-week-item" href="#/office/compose?id=${esc(p.id)}">${esc(p.title || String(p.text || "").slice(0, 36) || "—")}</a>`).join("")
          : `<span class="muted">—</span>`}</div>
      </div>`);
    }
    const prev = new Date(monday); prev.setDate(monday.getDate() - 7);
    const next = new Date(monday); next.setDate(monday.getDate() + 7);
    const pKey = prev.toISOString().slice(0, 10);
    const nKey = next.toISOString().slice(0, 10);
    return `<div class="cnt-week">
      <div class="toolbar cnt-cal-head">
        <a class="btn btn-ghost btn-sm" href="#/office/content?view=week&date=${pKey}">←</a>
        <b>Неделя с ${esc(monday.toLocaleDateString("ru-RU"))}</b>
        <a class="btn btn-ghost btn-sm" href="#/office/content?view=week&date=${nKey}">→</a>
        <a class="btn btn-ghost btn-sm" href="#/office/content?view=calendar">Месяц</a>
      </div>
      <div class="cnt-week-grid">${days.join("")}</div>
    </div>`;
  })() : "";

  const watermarksView = view === "watermarks" ? (() => {
    const c = state.cabinet || {};
    const rows = (c.watermarks || []).map((w) => `<div class="cab-list-row"><b>${esc(w.name)}</b>
      <p class="muted">${esc(String(w.text || "").slice(0, 160))}</p>
      <button type="button" class="btn btn-ghost btn-sm" data-act="cab-del-item" data-kind="watermarks" data-id="${esc(w.id)}">×</button></div>`).join("");
    return `<div class="card"><b>Водяные знаки</b>
      <p class="muted" style="font-size:12px">Текст добавляется к посту при публикации — включите в редакторе.</p>
      ${rows || `<p class="muted">Пока пусто</p>`}
      <form id="cnt-add-wm" class="cab-add" style="margin-top:12px">
        <input name="name" placeholder="Название" required>
        <textarea name="text" rows="2" placeholder="Текст знака" required></textarea>
        <button type="submit" class="btn btn-primary btn-sm">Добавить</button>
      </form></div>`;
  })() : "";

  let body = board;
  if (view === "list") body = list;
  else if (view === "calendar") body = calendar;
  else if (view === "week") body = weekView;
  else if (view === "day") body = dayView;
  else if (view === "watermarks") body = watermarksView;

  return `<div class="cnt-ol">
    ${nav}
    <div class="h-row cnt-head">
      <div><p class="cnt-kicker">Контент</p><h1>${trash ? "Корзина" : "Все публикации"}</h1></div>
      <div class="toolbar">
        <a class="btn btn-primary" href="#/office/compose">+ Новый пост</a>
        <a class="btn btn-ghost" href="#/office/content-studio">AI-план</a>
      </div>
    </div>
    <div class="cnt-kpi">
      ${OnLead.CONTENT_COLS.map((c) => `<div class="card"><span class="muted">${esc(c.label)}</span><b>${counts[c.id] || 0}</b></div>`).join("")}
      <div class="card"><span class="muted">Всего</span><b>${counts.all || 0}</b></div>
    </div>
    <div class="toolbar cnt-toolbar">
      <a class="btn btn-sm ${view === "board" || (!view || view === "board") && !trash ? "btn-ink" : "btn-ghost"}" href="#/office/content?view=board">Доска</a>
      <a class="btn btn-sm ${view === "list" ? "btn-ink" : "btn-ghost"}" href="#/office/content?view=list">Список</a>
      <a class="btn btn-sm ${view === "calendar" || view === "day" ? "btn-ink" : "btn-ghost"}" href="#/office/content?view=calendar">Месяц</a>
      <a class="btn btn-sm ${view === "week" ? "btn-ink" : "btn-ghost"}" href="#/office/content?view=week">Неделя</a>
      <a class="btn btn-sm ${view === "watermarks" ? "btn-ink" : "btn-ghost"}" href="#/office/content?view=watermarks">Водяные знаки</a>
      <a class="btn btn-sm ${trash ? "btn-ink" : "btn-ghost"}" href="#/office/content?trash=1">Корзина · ${counts.trash || 0}</a>
    </div>
    ${body}
  </div>`;
};

OnLead.contentOlHistoryPage = function contentOlHistoryPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const logs = state.pubLogs || [];
  const nav = OnLead.contentOlNav(path);
  return `<div class="cnt-ol">
    ${nav}
    <div class="h-row"><div><p class="cnt-kicker">Контент</p><h1>История публикаций</h1></div></div>
    ${logs.length ? `<table class="table cnt-history"><thead><tr><th>Когда</th><th>Канал</th><th>Статус</th><th>Текст</th><th></th></tr></thead>
      <tbody>${logs.map((l) => `<tr>
        <td>${OnLead.fmtContentDate(l.createdAt)}</td>
        <td>${esc(l.channel || "vk")}${l.ownerLabel ? `<br><small class="muted">${esc(l.ownerLabel)}</small>` : ""}</td>
        <td><span class="chip ${l.status === "ok" ? "chip-ok" : "chip-err"}">${l.status === "ok" ? "OK" : "Ошибка"}</span></td>
        <td>${esc(l.textPreview || l.message || "—")}</td>
        <td>${l.permalink ? `<a class="btn btn-ghost btn-sm" href="${esc(l.permalink)}" target="_blank" rel="noopener">VK</a>` : ""}</td>
      </tr>`).join("")}</tbody></table>`
      : `<div class="card muted">Публикаций пока не было — опубликуйте пост из редактора.</div>`}
  </div>`;
};

OnLead.CONTENT_NICHES = [
  { id: "beauty", label: "Красота и уход" },
  { id: "fitness", label: "Фитнес" },
  { id: "education", label: "Обучение" },
  { id: "services", label: "Услуги" },
  { id: "shop", label: "Магазин" },
  { id: "realestate", label: "Недвижимость" },
];

OnLead.contentOlStudioPage = function contentOlStudioPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.contentOlNav(path);
  const niches = OnLead.CONTENT_NICHES;
  return `<div class="cnt-ol">
    ${nav}
    <div class="h-row"><div><p class="cnt-kicker">AI-контент</p><h1>План на неделю</h1>
      <p class="muted">Выберите нишу — создадим черновики и поставим в расписание по одному в день.</p></div></div>
    <form id="cnt-studio-form" class="card cnt-studio-form">
      <label class="field"><span>Ниша</span>
        <select name="niche">${niches.map((n) => `<option value="${esc(n.id)}">${esc(n.label)}</option>`).join("")}</select>
      </label>
      <label class="field"><span>Дней в плане</span>
        <select name="days"><option value="7">7</option><option value="14">14</option><option value="30">30</option></select>
      </label>
      <button type="submit" class="btn btn-primary">Сгенерировать план</button>
    </form>
    <div id="cnt-studio-result" class="muted" style="margin-top:12px"></div>
  </div>`;
};

OnLead.contentOlMediaPage = function contentOlMediaPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.contentOlNav(path);
  return `<div class="cnt-ol">
    ${nav}
    <div class="h-row"><div><p class="cnt-kicker">Контент</p><h1>Медиатека</h1></div>
      <a class="btn btn-ghost btn-sm" href="#/office/tools/image-ai">AI-картинки</a></div>
    <form id="cnt-media-upload" class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0">
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required>
      <button class="btn btn-primary btn-sm" type="submit">Загрузить</button>
      <span class="muted" style="font-size:12px">JPG/PNG/WebP/GIF до 5 МБ</span>
    </form>
    <div id="cnt-media-grid"><p class="muted">Загрузка…</p></div>
  </div>`;
};

OnLead.loadContentMediaGrid = async function loadContentMediaGrid() {
  const box = document.getElementById("cnt-media-grid");
  if (!box) return;
  try {
    const lib = await OnLead.api("/api/media/library");
    const rows = [...(lib.uploads || []), ...(lib.ai || [])];
    if (!rows.length) {
      box.innerHTML = `<div class="card muted">Пусто — загрузите файл или создайте в AI-картинках.</div>`;
      return;
    }
    box.innerHTML = `<div class="gallery cnt-gallery">${rows.map((i) => `
      <div class="ph gen cnt-ph">
        <a href="${OnLead.esc(i.url)}" target="_blank" rel="noopener"><img src="${OnLead.esc(i.url)}" alt="" /></a>
        <span>${OnLead.esc((i.prompt || i.name || (i.source === "upload" ? "Загрузка" : "AI")).slice(0, 60))}</span>
        <div class="cnt-ph-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="cnt-copy-url" data-url="${OnLead.esc(i.url)}">URL</button>
          ${i.name && i.source === "upload" ? `<button type="button" class="btn btn-ghost btn-sm" data-act="cnt-del-media" data-name="${OnLead.esc(i.name)}">×</button>` : ""}
          <a class="btn btn-ghost btn-sm" href="#/office/compose">В пост</a>
        </div>
      </div>`).join("")}</div>`;
  } catch (err) {
    box.innerHTML = `<div class="card muted">${OnLead.esc(err.message)}</div>`;
  }
};

OnLead.loadContentCalendar = async function loadContentCalendar() {
  const calMonth = OnLead._calMonth || new Date();
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  const from = new Date(y, m - 1, 1).getTime();
  const to = new Date(y, m + 2, 0).getTime();
  try {
    OnLead._calendarData = await OnLead.api(`/api/posts/calendar?from=${from}&to=${to}`);
  } catch {
    OnLead._calendarData = { days: [] };
  }
};

OnLead.bindContentOl = function bindContentOl() {
  document.getElementById("cnt-studio-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const box = document.getElementById("cnt-studio-result");
    try {
      if (box) box.textContent = "Генерируем…";
      const r = await OnLead.api("/api/content-studio/plan", {
        method: "POST",
        body: { niche: fd.get("niche"), days: Number(fd.get("days") || 7) },
      });
      OnLead._flash = `Создано ${r.count} постов в расписании`;
      go("/office/content");
      await render();
    } catch (err) {
      if (box) box.textContent = err.message;
    }
  });
  document.getElementById("cnt-media-upload")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input[type="file"]');
    const file = input?.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      alert(file ? "Файл больше 5 МБ" : "Выберите файл");
      return;
    }
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    await OnLead.api("/api/media/upload", { method: "POST", body: { data, mime: file.type } });
    OnLead._flash = "Файл загружен";
    if (input) input.value = "";
    await OnLead.loadContentMediaGrid();
  });
  document.getElementById("cnt-add-wm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const c = OnLead.load().cabinet || {};
    const list = [...(c.watermarks || []), { id: "wm-" + Date.now(), name: fd.get("name"), text: fd.get("text") }];
    await OnLead.api("/api/cabinet/settings", { method: "PATCH", body: { watermarks: list } });
    OnLead._flash = "Водяной знак добавлен";
    await render();
  });
};
