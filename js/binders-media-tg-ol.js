/**
 * Landings media + Telegram form binders (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.loadLandingsMedia = async function loadLandingsMedia() {
  const box = document.getElementById("landings-media-grid");
  if (!box) return;
  try {
    const lib = await OnLead.api("/api/media/library");
    const rows = [...(lib.uploads || []), ...(lib.ai || [])];
    if (!rows.length) {
      box.innerHTML = `<div class="card muted">Пока пусто — загрузите файл или сгенерируйте обложку в Image AI.</div>`;
      return;
    }
    box.innerHTML = `<div class="gallery">${rows.map((i) => `
      <a class="ph gen" href="${OnLead.esc(i.url)}" target="_blank" rel="noopener" title="${OnLead.esc(i.prompt || i.name || "")}">
        <img src="${OnLead.esc(i.url)}" alt="${OnLead.esc(i.prompt || i.name || "media")}" />
        <span>${OnLead.esc((i.prompt || i.name || (i.source === "upload" ? "Загрузка" : "AI")).slice(0, 80))}</span>
      </a>`).join("")}</div>
      <p class="muted" style="font-size:12px;margin-top:10px">Скопируйте URL картинки и вставьте в поле фото лендинга.</p>`;
  } catch (err) {
    box.innerHTML = `<div class="card muted">${OnLead.esc(err.message)}</div>`;
  }
}

OnLead.onMediaUpload = async function onMediaUpload(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="file"]');
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("Файл больше 5 МБ");
    return;
  }
  try {
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    await OnLead.api("/api/media/upload", { method: "POST", body: { data, mime: file.type } });
    OnLead._flash = "Файл загружен";
    await OnLead.loadLandingsMedia();
    if (input) input.value = "";
  } catch (err) {
    alert(err.message);
  }
}

OnLead.loadTgFunnelOlData = async function loadTgFunnelOlData(id) {
  if (!OnLead.telegramFunnelOlEditor || OnLead._tgFunnelCacheId === id) return;
  try {
    const [products, orders] = await Promise.all([
      OnLead.api("/api/tg/funnels/" + id + "/products"),
      OnLead.api("/api/tg/funnels/" + id + "/orders"),
    ]);
    OnLead._tgProducts = products;
    OnLead._tgOrders = orders;
    OnLead._tgFunnelCacheId = id;
    await OnLead.render();
  } catch { /* ignore */ }
}

OnLead.loadTgReceipts = async function loadTgReceipts() {
  const box = document.getElementById("tg-receipts-box");
  if (!box) return;
  box.innerHTML = `<div class="card muted">Загружаем чеки…</div>`;
  try {
    const rows = await OnLead.api("/api/tg/receipts");
    const pending = rows.filter((r) => r.status === "pending");
    box.innerHTML = `<div class="card">
      <b>Чеки на подтверждение · ${pending.length}</b>
      <p class="muted" style="margin:8px 0 0">После «Я оплатил» клиент присылает скрин — подтвердите, чтобы выдать доступ и создать лид.</p>
      ${pending.length ? pending.map((r) => `<div class="list-item" style="margin-top:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <b>${OnLead.esc(r.tgName || r.tgUsername || "Telegram")}</b>
          <div class="muted">${OnLead.esc(r.funnelName || "")}${r.product ? " · " + OnLead.esc(r.product) : ""}${r.price ? " · " + OnLead.esc(r.price) : ""}${r.createdAt ? " · " + OnLead.fmtWhen(r.createdAt) : ""}</div>
        </div>
        <div class="match-actions">
          <button type="button" class="btn btn-primary btn-sm" data-act="confirm-receipt" data-id="${OnLead.esc(r.id)}">Подтвердить</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="reject-receipt" data-id="${OnLead.esc(r.id)}">Отклонить</button>
        </div>
      </div>`).join("") : `<p class="muted" style="margin-top:12px">Ожидающих чеков нет.</p>`}
    </div>`;
  } catch (err) {
    box.innerHTML = `<div class="card muted">${OnLead.esc(err.message)}</div>`;
  }
}

OnLead.funnelFromForm = function funnelFromForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  const sections = [...form.querySelectorAll(".funnel-sec")].map((el) => ({
    title: el.querySelector("[name=title]")?.value || "",
    text: el.querySelector("[name=text]")?.value || "",
    buttons: el.querySelector("[name=buttons]")?.value || "",
  }));
  return {
    name: d.name,
    product: d.product || "",
    price: d.price || "",
    botId: d.botId || "",
    sections,
  };
}

OnLead.bindTelegramForms = function bindTelegramForms() {
  $("#bot-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = String(e.target.token?.value || "").trim();
    try {
      await OnLead.api("/api/bots", { method: "POST", body: { token } });
      OnLead._flash = "Бот подключён.";
      await OnLead.render();
    } catch (err) {
      alert(err.message);
    }
  });
  $("#tg-channel-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = String(e.target.username?.value || "").trim();
    try {
      await OnLead.api("/api/tg/channels", { method: "POST", body: { username } });
      await OnLead.render();
    } catch (err) {
      alert(err.message);
    }
  });
  $("#funnel-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = OnLead.tgSettingsFromForm
        ? OnLead.tgSettingsFromForm(e.target)
        : OnLead.funnelFromForm(e.target);
      await OnLead.api("/api/tg/funnels/" + e.target.dataset.id, { method: "PATCH", body });
      OnLead._flash = "Воронку сохранили.";
      await OnLead.render();
    } catch (err) {
      alert(err.message);
    }
  });
}
