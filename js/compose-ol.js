/**
 * Compose — редактор поста VK (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.composeWallOptions = function composeWallOptions(state, accountId) {
  const acc = (state.accounts || []).find((a) => a.id === accountId) || state.accounts?.[0];
  if (!acc) return [];
  const opts = [];
  const personal = Number(acc.externalId || acc.vkId);
  if (Number.isFinite(personal) && personal) {
    opts.push({ ownerId: personal, label: `Моя страница (${acc.name || personal})` });
  }
  for (const ch of acc.channels || []) {
    if (ch.type === "personal") continue;
    const gid = Number(String(ch.externalId || ch.id || "").replace(/^group_/, "-"));
    if (!Number.isFinite(gid)) continue;
    opts.push({ ownerId: gid < 0 ? gid : -Math.abs(gid), label: ch.name || ch.screenName || `Сообщество ${Math.abs(gid)}` });
  }
  return opts;
};

OnLead.composeOlPage = function composeOlPage(state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const q = hashParams();
  const editId = q.get("id") || "";
  const post = editId
    ? (state.contentPosts || []).find((p) => p.id === editId)
    : null;
  const accounts = state.accounts || [];
  const accId = post?.accountId || accounts[0]?.id || "";
  const walls = OnLead.composeWallOptions(state, accId);
  const ownerId = post?.ownerId ?? walls[0]?.ownerId ?? "";
  const nav = OnLead.contentOlNav ? OnLead.contentOlNav("/office/compose") : "";

  const schedVal = post?.scheduledAt
    ? new Date(post.scheduledAt).toISOString().slice(0, 16)
    : "";
  const cabinet = state.cabinet || {};
  const watermarks = cabinet.watermarks || [];
  const rubrics = cabinet.rubrics || [];
  const mediaUrls = post?.mediaUrls || [];
  const pickMedia = OnLead._composePickMedia;

  const mediaStrip = (pickMedia || mediaUrls.length) ? `<div class="compose-media card">
    <b>Фото из медиатеки</b>
    <div class="compose-media-pick toolbar">
      <button type="button" class="btn btn-ghost btn-sm" data-act="compose-pick-media">Выбрать фото</button>
      ${(pickMedia ? [pickMedia] : mediaUrls).map((u) => `<span class="chip">${esc(String(u).slice(-24))}</span>`).join("")}
    </div></div>` : `<div class="compose-media card"><button type="button" class="btn btn-ghost btn-sm" data-act="compose-pick-media">+ Фото из медиатеки</button></div>`;

  return `<div class="cnt-ol compose-ol">
    ${nav}
    <div class="h-row compose-head">
      <div><p class="cnt-kicker">Контент</p><h1>${post ? "Редактор поста" : "Новый пост"}</h1></div>
      <div class="toolbar">
        <a class="btn btn-ghost" href="#/office/content">← Доска</a>
        ${post?.permalink ? `<a class="btn btn-ghost" href="${esc(post.permalink)}" target="_blank" rel="noopener">Открыть в VK</a>` : ""}
      </div>
    </div>
    ${!accounts.length ? `<div class="card muted" style="margin-bottom:12px">Подключите <a href="#/office/accounts">VK-аккаунт</a>, чтобы публиковать на стену.</div>` : ""}
    <form id="compose-form" class="compose-layout" data-id="${esc(post?.id || "")}">
      <div class="compose-main card">
        <label class="field"><span>Заголовок (для себя)</span>
          <input name="title" value="${esc(post?.title || "")}" placeholder="Тема поста"></label>
        <label class="field"><span>Текст поста</span>
          <textarea name="text" rows="12" placeholder="Текст для VK…">${esc(post?.text || "")}</textarea></label>
        <label class="field"><span>Формат публикации</span>
          <select name="publishKind">
            <option value="wall"${(post?.publishKind || "wall") === "wall" ? " selected" : ""}>Стена</option>
            <option value="story"${post?.publishKind === "story" ? " selected" : ""}>Сторис (нужно фото)</option>
          </select>
          <small class="muted">Сторис публикует первое фото из медиатеки</small></label>
        <div class="toolbar compose-ai">
          <button type="button" class="btn btn-ghost btn-sm" data-act="compose-ai" ${!post?.id ? "disabled title=\"Сначала сохраните черновик\"" : ""}>✨ AI-текст</button>
          <a class="btn btn-ghost btn-sm" href="#/office/media">Медиатека</a>
        </div>
        ${post?.error ? `<p class="compose-err">${esc(post.error)}</p>` : ""}
      </div>
      <aside class="compose-side">
        <div class="card">
          <label class="field"><span>VK-аккаунт</span>
            <select name="accountId">${accounts.length
              ? accounts.map((a) => `<option value="${esc(a.id)}"${a.id === accId ? " selected" : ""}>${esc(a.name)}</option>`).join("")
              : `<option value="">—</option>`}</select></label>
          <label class="field"><span>Стена</span>
            <select name="ownerId">${walls.length
              ? walls.map((w) => `<option value="${w.ownerId}"${String(w.ownerId) === String(ownerId) ? " selected" : ""}>${esc(w.label)}</option>`).join("")
              : `<option value="">—</option>`}</select></label>
          <label class="field"><span>Расписание</span>
            <input type="datetime-local" name="scheduledAt" value="${esc(schedVal)}">
            <small class="muted">Пусто — только ручная публикация</small></label>
          ${rubrics.length ? `<label class="field"><span>Рубрика</span>
            <select name="rubricId">
              <option value="">— без рубрики —</option>
              ${rubrics.map((r) => `<option value="${esc(r.id)}"${r.id === post?.rubricId ? " selected" : ""}>${esc(r.name)}</option>`).join("")}
            </select>
            <small class="muted">Текст рубрики добавится в начало при публикации</small></label>` : `<p class="muted" style="font-size:12px;margin:0 0 8px"><a href="#/office/content?view=rubrics">Создать рубрику</a></p>`}
          ${watermarks.length ? `<label class="field chk"><input type="checkbox" name="applyWatermark" ${post?.applyWatermark ? "checked" : ""}> Водяной знак</label>
          <label class="field"><span>Знак</span><select name="watermarkId">
            ${watermarks.map((w) => `<option value="${esc(w.id)}"${w.id === post?.watermarkId ? " selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label>` : ""}
          <div class="compose-actions">
            <button type="submit" class="btn btn-primary" name="action" value="save">Сохранить</button>
            <button type="button" class="btn btn-ghost" data-act="compose-schedule">В расписание</button>
            ${post?.id ? `<button type="button" class="btn btn-ghost" data-act="compose-submit-approval">На согласование</button>` : ""}
            <button type="button" class="btn btn-ink" data-act="compose-publish" ${!accounts.length ? "disabled" : ""}>Опубликовать</button>
          </div>
          ${post?.rejectionReason ? `<p class="compose-err">Отклонено: ${esc(post.rejectionReason)}</p>` : ""}
          ${post?.status ? `<p class="muted compose-status">Статус: <b>${esc(post.status)}</b>${post.publishedAt ? ` · ${OnLead.fmtContentDate(post.publishedAt)}` : ""}</p>` : ""}
        </div>
        ${post?.id ? `<button type="button" class="btn btn-ghost btn-sm compose-trash" data-act="compose-trash" data-id="${esc(post.id)}">В корзину</button>` : ""}
      </aside>
      ${mediaStrip}
    </form>
  </div>`;
};

OnLead.bindComposeOl = function bindComposeOl() {
  const form = document.getElementById("compose-form");
  if (!form) return;

  form.querySelector('[name="accountId"]')?.addEventListener("change", async () => {
    await OnLead.saveComposeDraft(form, { quiet: true });
    await render();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await OnLead.saveComposeDraft(form);
    await render();
  });
};

OnLead.composeFormBody = function composeFormBody(form) {
  const fd = new FormData(form);
  const sched = fd.get("scheduledAt");
  let scheduledAt = null;
  if (sched) {
    const t = new Date(String(sched)).getTime();
    if (Number.isFinite(t)) scheduledAt = t;
  }
  const ownerId = fd.get("ownerId");
  const walls = OnLead.composeWallOptions(OnLead.load(), fd.get("accountId"));
  const wall = walls.find((w) => String(w.ownerId) === String(ownerId));
  return {
    title: String(fd.get("title") || ""),
    text: String(fd.get("text") || ""),
    accountId: String(fd.get("accountId") || ""),
    ownerId: ownerId != null && ownerId !== "" ? Number(ownerId) : null,
    ownerLabel: wall?.label || "",
    scheduledAt,
    applyWatermark: fd.get("applyWatermark") === "on",
    watermarkId: String(fd.get("watermarkId") || ""),
    rubricId: String(fd.get("rubricId") || ""),
    publishKind: String(fd.get("publishKind") || "wall") === "story" ? "story" : "wall",
  };
};

OnLead.saveComposeDraft = async function saveComposeDraft(form, opts = {}) {
  const body = OnLead.composeFormBody(form);
  if (OnLead._composePickMedia) body.mediaUrls = [OnLead._composePickMedia];
  body.status = body.scheduledAt && body.scheduledAt > Date.now() ? "scheduled" : "draft";
  const id = form.dataset.id;
  if (id) {
    await OnLead.api("/api/posts/" + id, { method: "PATCH", body });
    if (!opts.quiet) OnLead._flash = "Сохранено";
    return id;
  }
  const r = await OnLead.api("/api/posts", { method: "POST", body });
  form.dataset.id = r.post.id;
  if (!opts.quiet) {
    OnLead._flash = "Черновик создан";
    go("/office/compose?id=" + r.post.id);
  }
  return r.post.id;
};
