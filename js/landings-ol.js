/**
 * Landings UX aligned with online-lead.ru: unified page, section editor, dark public view.
 */
window.OnLead = window.OnLead || {};

OnLead.SECTION_LABELS = {
  hero: "Первый экран",
  about: "О себе",
  services: "Услуги и цены",
  steps: "Как мы работаем",
  reviews: "Отзывы",
  faq: "Вопросы и ответы",
  form: "Форма заявки",
  contacts: "Контакты",
};

OnLead.TONE_ACCENT = {
  teal: "#2ec4b6", gold: "#c9a227", ink: "#4d7cef", blue: "#4d7cef",
  green: "#3dffc0", cream: "#ef6c4d", rose: "#e85d75", night: "#7c6cff",
  slate: "#64748b", wine: "#9b2335", sand: "#d4a574",
};

OnLead.landingContent = function landingContent(page) {
  if (page?.content?.sections?.length) return page.content;
  return OnLead.flatToSections(page);
};

OnLead.flatToSections = function flatToSections(page) {
  const accent = page?.content?.accent || OnLead.TONE_ACCENT[page?.tone] || "#ef6c4d";
  const sections = [];
  const badges = (page?.features || []).filter(Boolean).slice(0, 4);
  const statBadges = (page?.stats || []).map((s) => [s.n, s.l].filter(Boolean).join(" · ")).filter(Boolean).slice(0, 4);
  sections.push({
    type: "hero",
    title: page?.headline || page?.name || "Заголовок",
    subtitle: page?.sub || "",
    ctaText: page?.cta || "Оставить заявку",
    note: page?.urgency || page?.kicker || "",
    badges: badges.length ? badges : statBadges,
  });
  const aboutText = [
    page?.quote ? `«${page.quote}»` : "",
    page?.author ? [page.author, page.role].filter(Boolean).join(" — ") : "",
  ].filter(Boolean).join("\n\n");
  if (aboutText || (page?.stats || []).length) {
    sections.push({
      type: "about",
      title: "О себе",
      text: aboutText || "Расскажите о себе и опыте.",
      stats: (page?.stats || []).map((s) => ({ value: String(s.n || ""), label: String(s.l || "") })),
    });
  }
  const serviceItems = (page?.prices || []).map((p) => ({
    title: String(p.name || ""), text: String(p.note || ""), price: String(p.price || ""),
  }));
  if (!serviceItems.length && (page?.outcomes || []).length) {
    for (const o of page.outcomes || []) {
      serviceItems.push({ title: String(o.t || ""), text: String(o.d || ""), price: "" });
    }
  }
  if (serviceItems.length) {
    sections.push({ type: "services", title: "Услуги и цены", items: serviceItems.slice(0, 8), note: "" });
  }
  if ((page?.steps || []).length) {
    sections.push({
      type: "steps", title: "Как мы работаем",
      items: (page.steps || []).map((s) => ({ title: String(s.t || ""), text: String(s.d || "") })),
    });
  }
  if ((page?.reviews || []).length) {
    sections.push({
      type: "reviews", title: "Отзывы",
      items: (page.reviews || []).map((r) => ({ text: String(r.q || ""), author: String(r.a || "") })),
    });
  }
  if ((page?.faq || []).length) {
    sections.push({
      type: "faq", title: "Вопросы и ответы",
      items: (page.faq || []).map((f) => ({ question: String(f.q || ""), answer: String(f.a || "") })),
    });
  }
  sections.push({
    type: "form",
    title: page?.formTitle || "Оставьте заявку",
    text: "Перезвоним в рабочее время, ответим на вопросы.",
    buttonText: page?.cta || "Отправить",
    fields: Array.isArray(page?.fields) && page.fields.length ? page.fields : ["name", "phone"],
    successText: page?.successText || "Заявка принята — перезвоним в рабочее время.",
  });
  sections.push({
    type: "contacts", title: "Контакты",
    phone: page?.contacts?.phone || "",
    email: page?.contacts?.email || "",
    address: page?.contacts?.address || page?.meta?.place || "",
  });
  return { accent, sections };
};

OnLead.landingOlPublicHtml = function landingOlPublicHtml(page, opts = {}) {
  const preview = !!opts.preview;
  const content = OnLead.landingContent(page);
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const pixel = page.pixelHtml && !preview ? `<div class="ol-pixel">${page.pixelHtml}</div>` : "";
  const sections = content.sections.map((s, i) => OnLead.landingSectionHtml(s, content.accent, page, preview)).join("");
  const foot = preview
    ? `<div class="ol-preview-bar">Так страница выглядит прямо сейчас, включая несохранённые правки</div>`
    : "";
  const footLink = preview ? `#/office/landings` : `#/`;
  return `${pixel}<main class="ol-landing" style="--ol-accent:${esc(content.accent)}">${foot}${sections}<footer class="ol-foot"><a href="${footLink}">Сделано в OnLead</a></footer></main>`;
};

OnLead.landingSectionHtml = function landingSectionHtml(section, accent, page, preview) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const id = page?.id || "";
  switch (section.type) {
    case "hero":
      return `<section class="ol-sec ol-hero"><div class="ol-inner ol-block">
        <h1>${esc(section.title)}</h1>
        ${section.subtitle ? `<p class="ol-lead">${esc(section.subtitle)}</p>` : ""}
        <div class="ol-hero-acts">
          ${preview ? `<span class="ol-btn">${esc(section.ctaText)}</span>` : `<a class="ol-btn" href="${OnLead.landingInPageHref ? OnLead.landingInPageHref(page, "lead-form") : "#lead-form"}">${esc(section.ctaText)}</a>`}
          ${section.note ? `<span class="ol-note">${esc(section.note)}</span>` : ""}
        </div>
        ${(section.badges || []).length ? `<div class="ol-badges">${section.badges.map((b) => `<div class="ol-badge">${esc(b)}</div>`).join("")}</div>` : ""}
      </div></section>`;
    case "about":
      return `<section class="ol-sec"><div class="ol-inner ol-block"><h2>${esc(section.title)}</h2>
        ${section.text ? `<p class="ol-text">${esc(section.text).replace(/\n/g, "<br>")}</p>` : ""}
        ${(section.stats || []).length ? `<div class="ol-stats">${section.stats.map((s) => `<div class="ol-stat"><b style="color:var(--ol-accent)">${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>` : ""}
      </div></section>`;
    case "services":
      return `<section class="ol-sec"><div class="ol-inner ol-block"><h2>${esc(section.title)}</h2>
        <div class="ol-grid ol-grid-2">${(section.items || []).map((it) => `<article class="ol-card"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p>${it.price ? `<b class="ol-price" style="color:var(--ol-accent)">${esc(it.price)}</b>` : ""}</article>`).join("")}</div>
        ${section.note ? `<p class="ol-note">${esc(section.note)}</p>` : ""}
      </div></section>`;
    case "steps":
      return `<section class="ol-sec"><div class="ol-inner ol-block"><h2>${esc(section.title)}</h2>
        <div class="ol-grid ol-grid-2">${(section.items || []).map((it, i) => `<article class="ol-card"><span class="ol-num" style="color:var(--ol-accent)">${String(i + 1).padStart(2, "0")}</span><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join("")}</div>
      </div></section>`;
    case "reviews":
      return `<section class="ol-sec"><div class="ol-inner ol-block"><h2>${esc(section.title)}</h2>
        <div class="ol-grid ol-grid-2">${(section.items || []).map((it) => `<figure class="ol-card ol-review"><blockquote>${esc(it.text)}</blockquote><figcaption>${esc(it.author)}</figcaption></figure>`).join("")}</div>
      </div></section>`;
    case "faq":
      return `<section class="ol-sec"><div class="ol-inner ol-block"><h2>${esc(section.title)}</h2>
        <div class="ol-faq">${(section.items || []).map((it) => `<details class="ol-card"><summary>${esc(it.question)}</summary><p>${esc(it.answer)}</p></details>`).join("")}</div>
      </div></section>`;
    case "form": {
      const fields = section.fields || ["name", "phone"];
      const utm = page.utmSource ? `<input type="hidden" name="utm_source" value="${esc(page.utmSource)}">` : "";
      const utm2 = page.utmMedium ? `<input type="hidden" name="utm_medium" value="${esc(page.utmMedium)}">` : "";
      const utm3 = page.utmCampaign ? `<input type="hidden" name="utm_campaign" value="${esc(page.utmCampaign)}">` : "";
      const inputs = [
        fields.includes("name") ? `<label>Имя<input name="name" required></label>` : "",
        fields.includes("phone") ? `<label>Телефон<input name="phone" type="tel"></label>` : "",
        fields.includes("email") ? `<label>E-mail<input name="email" type="email"></label>` : "",
        fields.includes("comment") ? `<label>Комментарий<textarea name="comment" rows="3"></textarea></label>` : "",
      ].join("");
      return `<section class="ol-sec ol-form-sec" id="lead-form"><div class="ol-inner ol-form-inner">
        <h2>${esc(section.title)}</h2>
        ${section.text ? `<p class="ol-lead">${esc(section.text)}</p>` : ""}
        ${preview ? `<div class="ol-form ol-form-preview">${inputs}<span class="ol-btn">${esc(section.buttonText)}</span></div>`
          : `<form class="ol-form" id="ol-lead-form" data-id="${esc(id)}" data-success="${esc(section.successText)}">${utm}${utm2}${utm3}${inputs}<button type="submit" class="ol-btn">${esc(section.buttonText)}</button></form>`}
      </div></section>`;
    }
    case "contacts":
      return `<section class="ol-sec"><div class="ol-inner ol-block"><h2>${esc(section.title)}</h2>
        <div class="ol-grid ol-grid-3 ol-contacts">
          ${section.phone ? `<div class="ol-card ol-contact"><span class="ol-contact-lbl">Телефон</span><b>${esc(section.phone)}</b></div>` : ""}
          ${section.email ? `<div class="ol-card ol-contact"><span class="ol-contact-lbl">E-mail</span><b>${esc(section.email)}</b></div>` : ""}
          ${section.address ? `<div class="ol-card ol-contact"><span class="ol-contact-lbl">Адрес</span><b>${esc(section.address)}</b></div>` : ""}
        </div></div></section>`;
    default:
      return "";
  }
};

OnLead.landingOlThumb = function landingOlThumb(accent, sectionTypes) {
  const types = sectionTypes || ["hero", "services", "form"];
  return `<div class="ol-thumb" style="--ol-accent:${accent}" aria-hidden="true">${types.slice(0, 6).map((t) => {
    if (t === "hero") return `<div class="ol-thumb-hero"><i></i><i></i><b></b></div>`;
    if (t === "form") return `<div class="ol-thumb-form"><i></i><i></i><b></b></div>`;
    return `<div class="ol-thumb-block"><i></i><div><i></i><i></i></div></div>`;
  }).join("")}</div>`;
};

OnLead.landingOlTemplateMeta = function landingOlTemplateMeta(t) {
  const content = OnLead.flatToSections(t);
  return {
    accent: content.accent,
    sectionTypes: content.sections.map((s) => s.type),
  };
};

OnLead.landingOlUrl = function landingOlUrl(page) {
  if (page?.customHost) return `https://${page.customHost}/`;
  const slug = page?.slug || page?.id;
  if (slug) return `${location.origin}/#/l/${encodeURIComponent(slug)}`;
  return `${location.origin}/#/p/${encodeURIComponent(page?.id || "")}`;
};

OnLead.landingsUnifiedHtml = function landingsUnifiedHtml(state, editId) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const mine = (state.landings || []).filter((p) => p.userId === state.user?.id);
  const editing = editId ? mine.find((p) => p.id === editId) : null;
  if (editing) return OnLead.landingOlEditorHtml(editing, state);
  const templates = OnLead.LANDING_TEMPLATES || [];
  const categories = [...new Set(templates.map((t) => t.niche))];
  return `<div class="ol-cabinet">
    <div class="ol-subnav">
      <a class="btn btn-sm btn-ghost" href="#/office/landings/leads">Заявки</a>
      <a class="btn btn-sm btn-ghost" href="#/office/landings/media">Медиатека</a>
      <a class="btn btn-sm btn-ghost" href="#/office/crm">CRM</a>
    </div>
    <div class="ol-page-head">
      <div>
        <h1>Лендинги</h1>
        <p class="muted ol-page-head__lead">Выберите шаблон, замените тексты — или опишите бизнес, AI перепишет страницу. Адрес и форма настраиваются здесь, заявки падают в CRM.</p>
      </div>
    </div>
    <div class="ol-tpl-filters">${[`<button type="button" class="btn btn-sm btn-ink" data-ol-cat="all">Все · ${templates.length}</button>`]
      .concat(categories.map((c) => `<button type="button" class="btn btn-sm btn-ghost" data-ol-cat="${esc(c)}">${esc(c)}</button>`)).join("")}</div>
    <div class="tpl-grid" id="ol-tpl-grid">${templates.map((t) => {
      const meta = OnLead.landingOlTemplateMeta(t);
      return `<article class="card tpl-card" data-ol-niche="${esc(t.niche)}">
        ${OnLead.landingOlThumb(meta.accent, meta.sectionTypes)}
        <div class="tpl-card-body"><div class="tpl-card-tags"><span class="chip">${esc(t.niche)}</span>${t.tier === "pro" ? `<span class="chip chip-gold">PRO</span>` : ""}</div>
          <b>${esc(t.name)}</b><p>${esc(t.blurb || t.sub || "")}</p>
          <div class="tpl-card-acts">
            <button type="button" class="btn btn-primary btn-sm" data-act="new-landing" data-name="${esc(t.name)}" data-template="${esc(t.id)}">Использовать</button>
            <a class="btn btn-ghost btn-sm" href="#/office/landings/templates/${esc(t.id)}">Посмотреть</a>
          </div></div></article>`;
    }).join("")}</div>
    <h2 style="margin:24px 0 12px">Мои страницы</h2>
    ${mine.length ? mine.map((p) => `<div class="list-item"><div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <b>${esc(p.name)}</b><span class="chip ${p.status === "published" ? "chip-ok" : ""}">${p.status === "published" ? "Опубликован" : "Черновик"}</span></div>
          <p class="muted" style="margin:4px 0 0">/l/${esc(p.slug || p.id)} · заявок: ${p.leads || 0} · просмотров: ${p.viewsCount || 0}</p></div>
        <div class="match-actions">
          ${p.status === "published" ? `<a class="btn btn-ghost btn-sm" href="#/l/${esc(p.slug || p.id)}" target="_blank" rel="noopener">Открыть</a>` : ""}
          <a class="btn btn-primary btn-sm" href="#/office/landings/pages/${esc(p.id)}">Редактировать</a>
        </div></div>`).join("") : `<div class="card muted">Пока пусто — выберите шаблон выше.</div>`}
  </div>`;
};

OnLead.landingOlProFieldsHtml = function landingOlProFieldsHtml(page, state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const pro = state && OnLead.toolOn && OnLead.toolOn(state, "landings-pro");
  if (!pro) {
    return `<div class="card ol-pro-upsell" style="margin-top:12px">
      <b>Лендинги PRO</b>
      <p class="muted" style="margin:6px 0 10px;font-size:13px">Свой поддомен, UTM-метки и код пикселя на опубликованной странице.</p>
      <a class="btn btn-primary btn-sm" href="#/office/landings/plan">Подключить за 290 ₽</a>
    </div>`;
  }
  const dnsZone = OnLead.LANDING_DNS_ZONE || "m360-ural.online";
  const presetHosts = OnLead.LANDING_HOSTS || [];
  const hostCustom = page.customHost && !presetHosts.includes(page.customHost);
  const customSlug = hostCustom && page.customHost.endsWith("." + dnsZone)
    ? page.customHost.slice(0, -(dnsZone.length + 1))
    : "";
  const dnsNote = page.dnsStatus
    ? `<p class="muted" style="font-size:12px;margin:0">DNS: <b>${esc(page.dnsStatus)}</b>${page.dnsMessage ? " · " + esc(page.dnsMessage) : ""}</p>`
    : `<p class="muted" style="font-size:12px;margin:0">При публикации DNS создаётся автоматически (Cloudflare).</p>`;
  return `<div class="card ol-pro-panel" style="margin-top:12px">
    <h3 style="margin:0 0 12px">Лендинги PRO</h3>
    <div class="ol-meta-grid">
      <label class="field"><span>Свой поддомен</span>
        <select id="ol-host-select">
          <option value="">— основной домен —</option>
          ${presetHosts.map((h) => `<option value="${esc(h)}" ${page.customHost === h ? "selected" : ""}>${esc(h)}</option>`).join("")}
          <option value="__custom__" ${hostCustom ? "selected" : ""}>Свой поддомен…</option>
        </select>
      </label>
      <label class="field" id="ol-host-custom-wrap" style="${hostCustom ? "" : "display:none"}">
        <span>Поддомен на ${esc(dnsZone)}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <input id="ol-host-slug" value="${esc(customSlug)}" placeholder="promo" pattern="[a-z0-9-]+" style="max-width:160px">
          <span class="muted">.${esc(dnsZone)}</span>
        </div>
      </label>
      <label class="field"><span>UTM source</span><input id="ol-utm-source" value="${esc(page.utmSource || "")}" placeholder="vk"></label>
      <label class="field"><span>UTM medium</span><input id="ol-utm-medium" value="${esc(page.utmMedium || "")}" placeholder="cpc"></label>
      <label class="field"><span>UTM campaign</span><input id="ol-utm-campaign" value="${esc(page.utmCampaign || "")}" placeholder="spring"></label>
    </div>
    <label class="field" style="margin-top:10px"><span>Код пикселя (HTML)</span><textarea id="ol-pixel" rows="3" placeholder="<script>...</script>">${esc(page.pixelHtml || "")}</textarea></label>
    ${dnsNote}
  </div>`;
};

OnLead.collectOlProFields = function collectOlProFields(root) {
  const hostSel = root.querySelector("#ol-host-select");
  if (!hostSel) return {};
  const dnsZone = OnLead.LANDING_DNS_ZONE || "m360-ural.online";
  let customHost = "";
  if (hostSel.value === "__custom__") {
    const slug = String(root.querySelector("#ol-host-slug")?.value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (slug) customHost = `${slug}.${dnsZone}`;
  } else {
    customHost = hostSel.value || "";
  }
  return {
    customHost,
    utmSource: root.querySelector("#ol-utm-source")?.value || "",
    utmMedium: root.querySelector("#ol-utm-medium")?.value || "",
    utmCampaign: root.querySelector("#ol-utm-campaign")?.value || "",
    pixelHtml: root.querySelector("#ol-pixel")?.value || "",
  };
};

OnLead.landingOlEditorHtml = function landingOlEditorHtml(page, state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const content = OnLead.landingContent(page);
  const url = OnLead.landingOlUrl(page);
  const published = page.status === "published";
  return `<div class="ol-editor" data-id="${esc(page.id)}">
    <div class="ol-page-head ol-editor-head">
      <div class="ol-page-head__main">
        <a class="ol-back" href="#/office/landings">← Все страницы</a>
      </div>
      <div class="ol-page-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-act="ol-preview-toggle">Предпросмотр</button>
        <button type="button" class="btn btn-primary btn-sm" data-act="ol-save-landing">Сохранить</button>
        <button type="button" class="btn ${published ? "btn-ghost" : "btn-ink"} btn-sm" data-act="publish-landing" data-id="${esc(page.id)}" data-status="${published ? "draft" : "published"}">${published ? "Снять с публикации" : "Опубликовать"}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="del-landing" data-id="${esc(page.id)}" data-name="${esc(page.name)}">Удалить</button>
      </div>
    </div>
    <div class="card ol-ai-box">
      <b>Заполнить страницу с помощью AI</b>
      <p class="muted" style="margin:6px 0 10px;font-size:13px">Опишите бизнес — AI перепишет тексты шаблона. Структура блоков не изменится.</p>
      <div class="ol-ai-row">
        <input id="ol-ai-business" placeholder="Студия маникюра, работаем с 2019, средний чек 2500 ₽">
        <input id="ol-ai-city" placeholder="Город">
        <button type="button" class="btn btn-primary btn-sm" data-act="ol-ai-generate">Сгенерировать</button>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="ol-meta-grid">
        <label class="field"><span>Название</span><input id="ol-title" value="${esc(page.name)}"></label>
        <label class="field"><span>Адрес (slug)</span><input id="ol-slug" value="${esc(page.slug || page.id)}" class="mono"></label>
        <label class="field"><span>SEO описание</span><textarea id="ol-seo" rows="2">${esc(page.seoDescription || page.sub || "")}</textarea></label>
      </div>
      <p class="muted" style="font-size:12px;margin:0">Публичная ссылка: ${esc(url)}</p>
    </div>
    ${OnLead.landingOlProFieldsHtml(page, state)}
    <div id="ol-preview-box" class="ol-preview-box" hidden></div>
    <div id="ol-sections">${content.sections.map((s, i) => OnLead.landingOlSectionEditor(s, i)).join("")}</div>
  </div>`;
};

OnLead.landingOlSectionEditor = function landingOlSectionEditor(section, index) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const label = OnLead.SECTION_LABELS[section.type] || section.type;
  const head = `<div class="card ol-sec-edit" data-sec-idx="${index}" data-sec-type="${esc(section.type)}"><h3>${esc(label)}</h3>`;
  if (section.type === "hero") {
    return `${head}
      <label class="field"><span>Заголовок</span><textarea data-f="title" rows="2">${esc(section.title)}</textarea></label>
      <label class="field"><span>Подзаголовок</span><textarea data-f="subtitle" rows="2">${esc(section.subtitle)}</textarea></label>
      <label class="field"><span>Кнопка</span><input data-f="ctaText" value="${esc(section.ctaText)}"></label>
      <label class="field"><span>Подпись у кнопки</span><input data-f="note" value="${esc(section.note)}"></label>
      <label class="field"><span>Преимущества (по строке)</span><textarea data-f="badges" rows="3">${esc((section.badges || []).join("\n"))}</textarea></label>
    </div>`;
  }
  if (section.type === "about") {
    return `${head}
      <label class="field"><span>Заголовок</span><input data-f="title" value="${esc(section.title)}"></label>
      <label class="field"><span>Текст</span><textarea data-f="text" rows="4">${esc(section.text)}</textarea></label>
      ${OnLead.landingOlItemList("stats", section.stats || [], [["value", "Значение"], ["label", "Подпись"]])}
    </div>`;
  }
  if (section.type === "services" || section.type === "steps" || section.type === "reviews" || section.type === "faq") {
    const key = section.type === "faq" ? "items" : "items";
    const fields = section.type === "faq"
      ? [["question", "Вопрос"], ["answer", "Ответ"]]
      : section.type === "reviews"
        ? [["text", "Текст"], ["author", "Автор"]]
        : section.type === "services"
          ? [["title", "Название"], ["text", "Описание"], ["price", "Цена"]]
          : [["title", "Название"], ["text", "Описание"]];
    return `${head}
      <label class="field"><span>Заголовок</span><input data-f="title" value="${esc(section.title)}"></label>
      ${OnLead.landingOlItemList(key, section.items || [], fields)}
      ${section.type === "services" ? `<label class="field"><span>Примечание</span><input data-f="note" value="${esc(section.note || "")}"></label>` : ""}
    </div>`;
  }
  if (section.type === "form") {
    const fields = ["name", "phone", "email", "comment"];
    const labels = { name: "Имя", phone: "Телефон", email: "E-mail", comment: "Комментарий" };
    return `${head}
      <label class="field"><span>Заголовок</span><input data-f="title" value="${esc(section.title)}"></label>
      <label class="field"><span>Пояснение</span><textarea data-f="text" rows="2">${esc(section.text)}</textarea></label>
      <label class="field"><span>Кнопка</span><input data-f="buttonText" value="${esc(section.buttonText)}"></label>
      <label class="field"><span>После отправки</span><input data-f="successText" value="${esc(section.successText)}"></label>
      <div class="field"><span>Поля</span><div class="lp-checks">${fields.map((f) => `
        <label><input type="checkbox" data-form-field="${f}" ${(section.fields || []).includes(f) ? "checked" : ""}>${labels[f]}</label>`).join("")}</div></div>
    </div>`;
  }
  if (section.type === "contacts") {
    return `${head}
      <label class="field"><span>Телефон</span><input data-f="phone" value="${esc(section.phone)}"></label>
      <label class="field"><span>E-mail</span><input data-f="email" value="${esc(section.email)}"></label>
      <label class="field"><span>Адрес</span><input data-f="address" value="${esc(section.address)}"></label>
    </div>`;
  }
  return `${head}</div>`;
};

OnLead.landingOlItemList = function landingOlItemList(key, items, fields) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  return `<div class="ol-item-list" data-list="${esc(key)}">${items.map((item, i) => `
    <div class="ol-item-row" data-item-idx="${i}">${fields.map(([k, lab]) => `
      <label class="field"><span>${esc(lab)}</span><input data-item-k="${esc(k)}" value="${esc(item[k] || "")}"></label>`).join("")}
      <button type="button" class="btn btn-ghost btn-sm" data-act="ol-del-item">Удалить</button></div>`).join("")}
    <button type="button" class="btn btn-ghost btn-sm" data-act="ol-add-item">+ Добавить</button></div>`;
};

OnLead.collectLandingOlContent = function collectLandingOlContent(root, page) {
  const base = OnLead.landingContent(page);
  const sections = [];
  root.querySelectorAll(".ol-sec-edit").forEach((card) => {
    const type = card.dataset.secType;
    const sec = { type };
    card.querySelectorAll("[data-f]").forEach((el) => {
      const k = el.dataset.f;
      if (k === "badges") sec.badges = el.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4);
      else sec[k] = el.value;
    });
    const list = card.querySelector(".ol-item-list");
    if (list) {
      const key = list.dataset.list;
      sec[key] = [];
      list.querySelectorAll(".ol-item-row").forEach((row) => {
        const item = {};
        row.querySelectorAll("[data-item-k]").forEach((inp) => { item[inp.dataset.itemK] = inp.value; });
        sec[key].push(item);
      });
    }
    if (type === "form") {
      sec.fields = [...card.querySelectorAll("[data-form-field]:checked")].map((c) => c.dataset.formField);
    }
    sections.push(sec);
  });
  return { accent: base.accent, sections };
};

OnLead.bindLandingsOl = function bindLandingsOl() {
  document.querySelectorAll("[data-ol-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.olCat;
      document.querySelectorAll("[data-ol-cat]").forEach((b) => {
        b.classList.toggle("btn-ink", b.dataset.olCat === cat);
        b.classList.toggle("btn-ghost", b.dataset.olCat !== cat);
      });
      document.querySelectorAll("#ol-tpl-grid .tpl-card").forEach((card) => {
        card.style.display = cat === "all" || card.dataset.olNiche === cat ? "" : "none";
      });
    });
  });
  const editor = document.querySelector(".ol-editor");
  if (!editor) return;
  const hostSel = editor.querySelector("#ol-host-select");
  const customWrap = editor.querySelector("#ol-host-custom-wrap");
  const syncHost = () => {
    if (customWrap && hostSel) customWrap.style.display = hostSel.value === "__custom__" ? "" : "none";
  };
  hostSel?.addEventListener("change", syncHost);
  syncHost();
  editor.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "ol-add-item") {
      const list = btn.closest(".ol-item-list");
      const fields = list.querySelectorAll(".ol-item-row [data-item-k]");
      const keys = [...new Set([...fields].map((f) => f.dataset.itemK))];
      const row = document.createElement("div");
      row.className = "ol-item-row";
      row.innerHTML = keys.map((k) => `<label class="field"><span>${k}</span><input data-item-k="${k}" value=""></label>`).join("")
        + `<button type="button" class="btn btn-ghost btn-sm" data-act="ol-del-item">Удалить</button>`;
      list.insertBefore(row, btn);
    }
    if (btn.dataset.act === "ol-del-item") btn.closest(".ol-item-row")?.remove();
  });
};
