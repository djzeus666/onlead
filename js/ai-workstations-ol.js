/**
 * AI-workstations — shared chrome + hub for нейросотрудники (MVP).
 * Wraps existing tool pages; not a freeform OL multi-agent chat clone.
 */
window.OnLead = window.OnLead || {};

/** Featured workstations (full pages) + secondary deep-links. */
OnLead.AI_WORKSTATIONS = [
  {
    id: "content-studio",
    title: "Контент-студия",
    tagline: "Профиль → ниша → план на 7–30 дней",
    href: "#/office/content-studio",
    slug: null,
    tone: "sky",
    featured: true,
    assistHint: "Подскажи нишу и темы на неделю для бренда…",
  },
  {
    id: "ai-images",
    title: "AI-картинки",
    tagline: "Обложки и креативы · галерея",
    href: "#/office/ai-images",
    slug: "image-ai",
    tone: "amber",
    featured: true,
    assistHint: "Улучши промпт для обложки VK…",
  },
  {
    id: "ai-lead",
    title: "AI Лид-менеджер",
    tagline: "Диалоги в ЛС, скоринг, CRM",
    href: "#/office/tools/ai-lead-vk",
    slug: "ai-lead-vk",
    tone: "violet",
    featured: true,
    assistHint: "Напиши оффер и тон для прогрева…",
  },
  {
    id: "neurocomment",
    title: "Нейрокомментарии",
    tagline: "AI-комментарии под постами",
    href: "#/office/tools/neurocomment-vk",
    slug: "neurocomment-vk",
    tone: "purple",
    featured: true,
    assistHint: "Подскажи тон и темы комментариев…",
  },
  {
    id: "leadgen",
    title: "Лидоскоп",
    tagline: "Ищет заявки в VK",
    href: "#/office/tools/leadgen-vk",
    slug: "leadgen-vk",
    tone: "teal",
    featured: false,
  },
  {
    id: "crosspost",
    title: "AI-кросспост",
    tagline: "Адаптация текста",
    href: "#/office/crosspost",
    slug: null,
    tone: "cyan",
    featured: false,
  },
  {
    id: "compose",
    title: "Редактор постов",
    tagline: "VK + расписание",
    href: "#/office/compose",
    slug: null,
    tone: "emerald",
    featured: false,
  },
  {
    id: "rss",
    title: "RSS Autopilot",
    tagline: "Лента → черновики",
    href: "#/office/rss",
    slug: null,
    tone: "rose",
    featured: false,
  },
];

OnLead.aiWorkstationById = function aiWorkstationById(id) {
  return (OnLead.AI_WORKSTATIONS || []).find((w) => w.id === id) || null;
};

OnLead.aiWorkstationStat = function aiWorkstationStat(state, id) {
  const nc = state.neurocommentStats || {};
  const al = state.aiLeadStats || {};
  const cc = state.contentCounts || {};
  const gallery = OnLead._aiGallery || [];
  if (id === "neurocomment") {
    const sent = nc.totalSent ?? nc.sent ?? 0;
    const today = nc.sentToday ?? nc.today ?? 0;
    return sent || today ? `Сегодня ${today} · всего ${sent}` : "Пока без отправок";
  }
  if (id === "ai-lead") {
    const today = al.sentToday ?? 0;
    const hot = al.hot ?? 0;
    return `Сегодня ${today} · горячие ${hot}`;
  }
  if (id === "ai-images") {
    return gallery.length ? `В галерее ${gallery.length}` : "Сгенерируйте первую";
  }
  if (id === "content-studio") {
    const n = (cc.draft || 0) + (cc.scheduled || 0);
    return n ? `Черновики/слоты ${n}` : "Соберите план";
  }
  return "";
};

OnLead.aiWorkstationShell = function aiWorkstationShell(id, state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const w = OnLead.aiWorkstationById(id);
  if (!w) return "";
  const on = w.slug ? OnLead.toolOn(state, w.slug) : true;
  const st = OnLead.aiWorkstationStat(state, id);
  const chip = w.slug
    ? (on ? `<span class="chip chip-ok">В работе</span>` : `<a class="chip" href="#/office/subscriptions#ai-agents">Подключить</a>`)
    : `<span class="chip">Открыто</span>`;
  const hint = esc(w.assistHint || "Спросите AI…");
  return `<div class="ws-shell" data-ws="${esc(w.id)}">
    <div class="ws-shell-bar">
      <a class="ol-back" href="#/office/ai-agents">← AI-сотрудники</a>
      <div class="ws-shell-meta">
        <span class="ws-kicker">Нейросотрудник</span>
        ${chip}
        ${st ? `<span class="muted ws-stat">${esc(st)}</span>` : ""}
      </div>
    </div>
    <details class="ws-assist card">
      <summary>Спросить AI-помощника</summary>
      <form class="ws-assist-form" data-ws-assist="${esc(w.id)}">
        <textarea name="q" rows="2" placeholder="${hint}" required></textarea>
        <button type="submit" class="btn btn-primary btn-sm">Спросить</button>
      </form>
      <div class="ws-assist-out muted" data-ws-out="${esc(w.id)}"></div>
    </details>
  </div>`;
};

OnLead.bindWorkstationAssist = function bindWorkstationAssist() {
  document.querySelectorAll("form[data-ws-assist]").forEach((form) => {
    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = form.dataset.wsAssist;
      const q = String(new FormData(form).get("q") || "").trim();
      const out = document.querySelector(`[data-ws-out="${id}"]`);
      if (!q || !out) return;
      out.textContent = "Думаю…";
      try {
        const r = await OnLead.api("/api/ai/assist", {
          method: "POST",
          body: { agent: id, message: q },
        });
        out.textContent = r.text || r.reply || "Пустой ответ";
      } catch (err) {
        out.textContent = err?.message || "Не удалось получить ответ";
      }
    });
  });
};
