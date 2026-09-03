/**
 * AI-картинки — отдельная страница + галерея (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.aiImagesOlNav = function aiImagesOlNav(path) {
  const items = [
    { href: "#/office/ai-images", label: "Генерация" },
    { href: "#/office/media", label: "Медиатека" },
    { href: "#/office/compose", label: "В пост" },
  ];
  return `<div class="toolbar ai-nav">${items.map((it) => {
    const p = String(it.href).replace("#", "");
    const on = path === p;
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="${it.href}">${it.label}</a>`;
  }).join("")}</div>`;
};

OnLead.aiImagesOlPage = function aiImagesOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.aiImagesOlNav(path);
  const images = OnLead._aiGallery || [];
  const last = OnLead._aiLastImage;

  const presets = [
    { label: "Обложка VK", prompt: "Минималистичная обложка для поста ВКонтакте, чистая типографика" },
    { label: "Промо", prompt: "Яркий промо-баннер акции, контрастные цвета, место под текст" },
    { label: "Сторис", prompt: "Вертикальный креатив 9:16 для сторис, современный стиль" },
    { label: "Фон", prompt: "Минималистичный абстрактный фон для карточки товара" },
  ];
  const gallery = images.length
    ? `<div class="ai-gallery">${images.map((img) => `<a class="ai-thumb" href="${esc(img.url)}" target="_blank" rel="noopener" title="${esc(img.name || "")}">
        <img src="${esc(img.url)}" alt="" loading="lazy">
        <span class="ai-thumb-act">
          <button type="button" class="btn btn-sm btn-ink" data-act="ai-use-compose" data-url="${esc(img.url)}">В пост</button>
        </span></a>`).join("")}</div>`
    : `<div class="card muted">Пока нет картинок — сгенерируйте первую или загрузите в <a href="#/office/media">медиатеку</a>.</div>`;

  return `<div class="ai-ol">
    ${nav}
    <div class="h-row"><div><p class="ai-kicker">Контент</p><h1>AI-картинки</h1>
      <p class="muted">Генерация обложек и креативов для постов VK · стили и галерея.</p></div></div>
    <div class="ai-layout">
      <form id="ai-images-form" class="card ai-form">
        <label class="field"><span>Описание</span>
          <textarea name="prompt" rows="5" placeholder="Опишите картинку…" required></textarea></label>
        <div class="toolbar ai-chips">${presets.map((p) =>
          `<button type="button" class="btn btn-ghost btn-sm" data-act="ai-preset" data-prompt="${esc(p.prompt)}">${esc(p.label)}</button>`).join("")}</div>
        <label class="field"><span>Стиль</span>
          <select name="style">
            <option value="">Авто</option>
            <option value="minimal">Минимализм</option>
            <option value="photo">Фотореализм</option>
            <option value="flat">Flat illustration</option>
            <option value="3d">3D soft</option>
          </select></label>
        <label class="field"><span>Размер</span>
          <select name="ratio"><option value="1:1">1024×1024</option><option value="9:16">1024×1792</option><option value="16:9">1792×1024</option></select></label>
        <button type="submit" class="btn btn-primary">Сгенерировать</button>
      </form>
      <div class="card ai-preview">
        <b>Превью</b>
        ${last ? `<img src="${esc(last)}" alt="" class="ai-preview-img">
          <div class="toolbar"><a class="btn btn-sm btn-ghost" href="${esc(last)}" target="_blank" rel="noopener">Открыть</a>
          <button type="button" class="btn btn-sm btn-ink" data-act="ai-use-compose" data-url="${esc(last)}">В пост</button></div>`
          : `<p class="muted">Здесь появится последняя генерация</p>`}
      </div>
    </div>
    <h2 style="margin:18px 0 8px">Галерея</h2>
    <div id="ai-gallery-box">${gallery}</div>
  </div>`;
};

OnLead.loadAiGallery = async function loadAiGallery() {
  try {
    const r = await OnLead.api("/api/media/library");
    const imgs = (r.items || r.media || []).filter((x) => x.url && /\.(png|jpe?g|webp|gif)/i.test(x.url || x.name || ""));
    OnLead._aiGallery = imgs.slice(0, 48);
    const box = document.getElementById("ai-gallery-box");
    if (!box) return;
    const esc = OnLead.esc || ((s) => String(s ?? ""));
    if (!imgs.length) {
      box.innerHTML = `<div class="card muted">Пока нет картинок.</div>`;
      return;
    }
    box.innerHTML = `<div class="ai-gallery">${OnLead._aiGallery.map((img) => `<a class="ai-thumb" href="${esc(img.url)}" target="_blank" rel="noopener">
      <img src="${esc(img.url)}" alt="" loading="lazy">
      <span class="ai-thumb-act"><button type="button" class="btn btn-sm btn-ink" data-act="ai-use-compose" data-url="${esc(img.url)}">В пост</button></span></a>`).join("")}</div>`;
  } catch { /* ignore */ }
};

OnLead.bindAiImagesOl = function bindAiImagesOl() {
  document.querySelectorAll("[data-act=ai-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ta = document.querySelector("#ai-images-form textarea[name=prompt]");
      if (ta) ta.value = btn.dataset.prompt || btn.textContent || "";
    });
  });
  document.getElementById("ai-images-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Генерация…"; }
    try {
      const style = String(fd.get("style") || "");
      const styleHint = style === "minimal" ? ", minimal flat design"
        : style === "photo" ? ", photorealistic"
        : style === "flat" ? ", flat illustration"
        : style === "3d" ? ", soft 3d render"
        : "";
      const prompt = `${String(fd.get("prompt") || "").trim()}${styleHint}`;
      const r = await OnLead.api("/api/campaigns", {
        method: "POST",
        body: { slug: "image-ai", payload: { prompt, ratio: fd.get("ratio"), engine: "auto" } },
      });
      const imgs = r.stats?.images || r.campaign?.stats?.images || [];
      const url = imgs[imgs.length - 1]?.url || imgs[0]?.url;
      if (url) {
        OnLead._aiLastImage = url;
        OnLead._flash = "Картинка готова";
        await OnLead.refresh();
        await render();
      }
    } catch (err) { alert(err.message); }
    finally {
      if (btn) { btn.disabled = false; btn.textContent = "Сгенерировать"; }
    }
  });
  OnLead.loadAiGallery?.();
};
