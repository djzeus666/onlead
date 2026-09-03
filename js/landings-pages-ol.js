/**
 * Landings gallery / legacy editor / public view (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.landingPublicUrl = function landingPublicUrl(id, page) {
  const p = page || (OnLead.load()?.landings || []).find((x) => x.id === id);
  if (OnLead.landingOlUrl && p) return OnLead.landingOlUrl(p);
  const landingId = typeof id === "string" ? id : (p?.id || "");
  if (p?.customHost) return `https://${p.customHost}/`;
  return `${location.origin}/#/p/${encodeURIComponent(landingId)}`;
}

OnLead.landingStatusLabel = function landingStatusLabel(status) {
  return status === "published" ? "опубликован" : "черновик";
}

OnLead.tplMini = function tplMini(tpl) {
  const lay = tpl.layout || "studio";
  const tone = tpl.tone || "teal";
  const inner = {
    studio: `<div class="m-nav"></div><div class="m-hero"><b></b><s></s><s class="sh"></s><i></i></div><div class="m-row"><em></em><em></em><em></em></div>`,
    salon: `<div class="m-photo"><span></span></div><div class="m-side"><b></b><s></s><s class="sh"></s><i></i></div>`,
    stage: `<div class="m-ticket"><u></u><b></b><s></s><ol><li></li><li></li><li></li></ol></div>`,
    school: `<div class="m-mods"><n></n><n></n><n></n></div><div class="m-side"><b></b><i></i></div>`,
    portrait: `<div class="m-ava"></div><q></q><s></s><i></i>`,
    chat: `<div class="m-bub in"></div><div class="m-bub out"></div><div class="m-bub in short"></div><i></i>`,
    packs: `<div class="m-packs"><em></em><em></em><em></em></div><i></i>`,
    listing: `<div class="m-photo flat"></div><div class="m-row"><em></em><em></em><em></em></div><i></i>`,
    gym: `<div class="m-gym"><b></b><s></s><div class="m-row"><em></em><em></em><em></em></div></div>`,
    garage: `<div class="m-cars"><span></span><span></span><span></span></div><b></b><s></s><i></i>`,
    paper: `<div class="m-head"></div><div class="m-lines"><s></s><s></s><s class="sh"></s></div><i></i>`,
    poster: `<u></u><b></b><s></s><i></i>`,
  };
  return `<div class="tpl-mini lay-${OnLead.esc(lay)} tone-${OnLead.esc(tone)}" aria-hidden="true">${inner[lay] || inner.studio}</div>`;
}

OnLead.parsePipe = function parsePipe(raw, keys) {
  return String(raw || "").split("\n").map((line) => {
    const p = line.split("|").map((s) => s.trim());
    const o = {};
    keys.forEach((k, i) => { o[k] = p[i] || ""; });
    return o;
  }).filter((o) => Object.values(o).some(Boolean));
}

OnLead.dumpPipe = function dumpPipe(arr, keys) {
  return (arr || []).map((o) => keys.map((k) => o[k] || "").join("|")).join("\n");
}

OnLead.landingFormFields = function landingFormFields(page, preview) {
  const fieldMeta = Object.fromEntries((OnLead.LANDING_FIELDS || []).map((f) => [f.id, f]));
  const fields = (page.fields || ["name", "phone"]).filter((id) => fieldMeta[id]);
  return fields.map((id) => {
    const f = fieldMeta[id];
    const req = id === "name" || id === "phone" ? "required" : "";
    if (f.type === "textarea") {
      return `<label class="field"><span>${OnLead.esc(f.label)}</span><textarea name="${OnLead.esc(id)}" placeholder="${OnLead.esc(f.ph)}" ${preview ? "disabled" : ""}></textarea></label>`;
    }
    return `<label class="field"><span>${OnLead.esc(f.label)}</span><input name="${OnLead.esc(id)}" type="${OnLead.esc(f.type)}" placeholder="${OnLead.esc(f.ph)}" ${req} ${preview ? "disabled" : ""}></label>`;
  }).join("");
}

OnLead.landingFormBlock = function landingFormBlock(page, preview, extraClass = "") {
  const utmHidden = !preview && (page.utmSource || page.utmMedium || page.utmCampaign)
    ? `<input type="hidden" name="utm_source" value="${OnLead.esc(page.utmSource || "")}">
       <input type="hidden" name="utm_medium" value="${OnLead.esc(page.utmMedium || "")}">
       <input type="hidden" name="utm_campaign" value="${OnLead.esc(page.utmCampaign || "")}">`
    : "";
  return `<form class="lp-form ${extraClass}"${preview ? "" : ` id="lp-lead-form" data-id="${OnLead.esc(page.id || "")}"`}>
    <h3>${OnLead.esc(page.formTitle || "Оставьте заявку")}</h3>
    <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    ${utmHidden}
    ${OnLead.landingFormFields(page, preview)}
    <button class="btn btn-primary btn-block" type="submit" ${preview ? "disabled" : ""}>${OnLead.esc(page.cta || "Оставить заявку")}</button>
    <p class="muted lp-legal">Нажимая кнопку, вы соглашаетесь на <a href="#/consent">обработку персональных данных</a> и принимаете <a href="#/privacy">политику конфиденциальности</a>.</p>
  </form>`;
}

OnLead.lpStats = function lpStats(page) {
  const stats = (page.stats || []).filter((s) => s.n || s.l);
  if (!stats.length) return "";
  return `<div class="lp-stats">${stats.map((s) => `<div><b>${OnLead.esc(s.n)}</b><span>${OnLead.esc(s.l)}</span></div>`).join("")}</div>`;
}

OnLead.lpFeats = function lpFeats(page, mark = "✓") {
  const feats = (page.features || []).filter(Boolean);
  if (!feats.length) return "";
  return `<div class="lp-feats">${feats.map((x) => `<div><b>${mark}</b><span>${OnLead.esc(x)}</span></div>`).join("")}</div>`;
}

OnLead.lpSteps = function lpSteps(page) {
  const steps = (page.steps || []).filter((s) => s.t || s.d);
  if (!steps.length) return "";
  return `<ol class="lp-steps">${steps.map((s) => `<li><b>${OnLead.esc(s.t)}</b><span>${OnLead.esc(s.d)}</span></li>`).join("")}</ol>`;
}

OnLead.lpPrices = function lpPrices(page) {
  const prices = (page.prices || []).filter((p) => p.name || p.price);
  if (!prices.length) return "";
  return `<div class="lp-packs">${prices.map((p) => `<article><h4>${OnLead.esc(p.name)}</h4><div class="serif lp-sum">${OnLead.esc(p.price)}</div><p>${OnLead.esc(p.note || "")}</p></article>`).join("")}</div>`;
}

OnLead.lpMeta = function lpMeta(page) {
  const m = page.meta || {};
  const bits = [m.when, m.place, m.duration].filter(Boolean);
  if (!bits.length) return "";
  return `<div class="lp-meta">${bits.map((x) => `<span>${OnLead.esc(x)}</span>`).join("")}</div>`;
}

OnLead.lpPriceCards = function lpPriceCards(page) {
  const prices = (page.prices || []).filter((p) => p.name || p.price);
  if (!prices.length) return "";
  return `<div class="lp-packs">${prices.map((p, i) => {
    const bits = String(p.note || "").split("·").map((s) => s.trim()).filter(Boolean);
    return `<article class="${i === 1 ? "hit" : ""}"><h3>${OnLead.esc(p.name)}</h3><div class="serif lp-sum">${OnLead.esc(p.price)}</div>
      ${bits.length ? `<ul>${bits.map((b) => `<li>${OnLead.esc(b)}</li>`).join("")}</ul>` : ""}</article>`;
  }).join("")}</div>`;
}

OnLead.lpTextCards = function lpTextCards(items, cls = "lp-cards") {
  const rows = (items || []).filter((x) => x.t || x.d);
  if (!rows.length) return "";
  return `<div class="${cls}">${rows.map((x) => `<article><h3>${OnLead.esc(x.t || "")}</h3><p>${OnLead.esc(x.d || "")}</p></article>`).join("")}</div>`;
}

OnLead.lpReviews = function lpReviews(page) {
  const rows = (page.reviews || []).filter((x) => x.q);
  if (!rows.length) return "";
  return `<div class="lp-reviews">${rows.map((x) => `<blockquote><p>«${OnLead.esc(x.q)}»</p><cite>${OnLead.esc(x.a || "")}</cite></blockquote>`).join("")}</div>`;
}

OnLead.lpFaqBlock = function lpFaqBlock(page) {
  const rows = (page.faq || []).filter((x) => x.q);
  if (!rows.length) return "";
  return `<div class="lp-faq">${rows.map((x) => `<details><summary>${OnLead.esc(x.q)}</summary><p>${OnLead.esc(x.a || "")}</p></details>`).join("")}</div>`;
}

OnLead.lpIllu = function lpIllu(layout) {
  return `<div class="lp-illu lp-illu-${OnLead.esc(layout)}" aria-hidden="true"><i></i><i></i><i></i><b></b></div>`;
}

OnLead.lpSec = function lpSec(title, inner) {
  if (!inner) return "";
  return `<section class="lp-sec"><div class="lp-inner"><h2 class="serif">${OnLead.esc(title)}</h2>${inner}</div></section>`;
}

OnLead.normLayout = function normLayout(id) {
  const alias = {
    studio: "specialist", salon: "booking", stage: "event", school: "course",
    portrait: "expert", chat: "magnet", packs: "course", listing: "agency",
    gym: "booking", garage: "product", paper: "magnet", poster: "event",
  };
  const next = alias[id] || id || "specialist";
  const ok = ["course", "magnet", "specialist", "agency", "booking", "event", "expert", "product"];
  return ok.includes(next) ? next : "specialist";
}

OnLead.landingPageView = function landingPageView(page, opts = {}) {
  const preview = !!opts.preview;
  const shot = !!opts.shot;
  const layout = OnLead.normLayout(page.layout);
  const tone = page.tone || "teal";
  const form = OnLead.landingFormBlock(page, preview);
  const titles = {
    course: { out: "Чему научитесь", aud: "Кому подойдёт", steps: "Программа", who: "Автор", prices: "Тарифы", rev: "Отзывы учеников", faq: "Вопросы и ответы", form: "Записаться на поток" },
    magnet: { out: "Что внутри гайда", aud: "Для кого", steps: "Содержание", who: "Кто собрала", prices: "Тарифы", rev: "Кто уже открылся", faq: "Вопросы", form: "Получить PDF" },
    specialist: { out: "Как проходит", aud: "Кому", steps: "Как идём", who: "Кто ведёт", prices: "Услуги", rev: "Отзывы", faq: "Вопросы", form: "Записаться" },
    agency: { out: "Кейсы", aud: "Команда", steps: "Как работаем", who: "Студия", prices: "Услуги", rev: "Отзывы", faq: "Вопросы", form: "Оставить бриф" },
    booking: { out: "Почему к нам", aud: "Мастера", steps: "Визит", who: "Студия", prices: "Прайс", rev: "Отзывы", faq: "Вопросы", form: "Запись" },
    event: { out: "Что будет", aud: "Кто ведёт", steps: "Программа", who: "Спикеры", prices: "Билет", rev: "Отзывы", faq: "Вопросы", form: "Регистрация" },
    expert: { out: "Кейсы", aud: "С кем", steps: "Обо мне", who: "Эксперт", prices: "Форматы", rev: "Отзывы", faq: "Вопросы", form: "Написать" },
    product: { out: "О товаре", aud: "Состав", steps: "Как заказать", who: "Кто делает", prices: "Варианты", rev: "Отзывы", faq: "Вопросы", form: "Заказ" },
  }[layout] || { out: "Оффер", aud: "Кому", steps: "Как", who: "Автор", prices: "Цены", rev: "Отзывы", faq: "Вопросы", form: "Заявка" };
  const pills = (page.stats || []).filter((s) => s.n || s.l);
  const heroPills = pills.length
    ? `<div class="lp-pills">${pills.map((s, i) => `<span class="${i === 0 ? "on" : ""}">${OnLead.esc([s.n, s.l].filter(Boolean).join(" · "))}</span>`).join("")}</div>`
    : (page.kicker ? `<div class="lp-pills"><span class="on">${OnLead.esc(page.kicker)}</span></div>` : "");
  const ctaLabel = OnLead.esc(page.cta || "Оставить заявку");
  const ctaHref = OnLead.landingInPageHref(page, "lp-lead");
  const ctaHero = (preview || shot)
    ? `<span class="btn btn-primary">${ctaLabel}</span>`
    : `<a class="btn btn-primary" href="${ctaHref}">${ctaLabel}</a>`;
  const hero = `<section class="lp-hero-pro">
    <div class="lp-inner lp-hero-grid">
      <div>
        ${heroPills}
        <h1 class="serif">${OnLead.esc(page.headline || page.name || "Заголовок")}</h1>
        ${page.sub ? `<p>${OnLead.esc(page.sub)}</p>` : ""}
        ${ctaHero}
        ${page.urgency ? `<div class="lp-urgent">${OnLead.esc(page.urgency)}</div>` : ""}
      </div>
      ${OnLead.lpIllu(layout)}
    </div>
  </section>`;
  const who = (page.author || page.quote)
    ? `<div class="lp-author"><div class="lp-ava">${OnLead.esc(String(page.author || "A").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase())}</div>
        <div><b>${OnLead.esc(page.author || "")}</b><div class="muted">${OnLead.esc(page.role || "")}</div>
        ${page.quote ? `<blockquote>«${OnLead.esc(page.quote)}»</blockquote>` : ""}</div></div>`
    : "";
  const extras = [
    OnLead.lpSec(titles.out, OnLead.lpTextCards(page.outcomes) || OnLead.lpFeats(page)),
    OnLead.lpSec(titles.aud, OnLead.lpTextCards(page.audience, "lp-cards lp-cards-3")),
    OnLead.lpSec(titles.steps, OnLead.lpSteps(page)),
    OnLead.lpSec(titles.who, who),
    OnLead.lpSec(titles.prices, OnLead.lpPriceCards(page) || OnLead.lpPrices(page)),
    OnLead.lpSec(titles.rev, OnLead.lpReviews(page)),
    OnLead.lpSec(titles.faq, OnLead.lpFaqBlock(page)),
  ].join("");
  if (shot) {
    return `<article class="lp-scene lp-pro lp-shot lp-lay-${OnLead.esc(layout)} lp-${OnLead.esc(tone)}">${hero}${OnLead.lpSec(titles.out, OnLead.lpTextCards((page.outcomes || []).slice(0, 3)))}</article>`;
  }
  const demo = preview ? `<div class="lp-demo-bar">Пример шаблона — тексты и картинки замените на свои в редакторе</div>` : "";
  const nav = `<div class="lp-top"><div class="lp-inner">
    <b class="serif">${OnLead.esc((page.name || "OnLead").split(" ")[0])}</b>
    ${(preview || shot) ? `<span class="btn btn-primary btn-sm">${ctaLabel}</span>` : `<a class="btn btn-primary btn-sm" href="${ctaHref}">${ctaLabel}</a>`}
  </div></div>`;
  const formSec = `<section class="lp-sec lp-sec-form" id="lp-lead"><div class="lp-inner lp-form-grid">
    <div><h2 class="serif">${OnLead.esc(page.formTitle || titles.form)}</h2>
      <p class="muted">Свяжемся, ответим на вопросы. Без давления — если не подойдёт, так и скажем.</p></div>
    ${form}
  </div></section>`;
  const foot = `<footer class="lp-foot"><div class="lp-inner"><span>Страница собрана в OnLead</span></div></footer>`;
  return `<article class="lp-scene lp-pro lp-lay-${OnLead.esc(layout)} lp-${OnLead.esc(tone)}">${demo}${nav}${hero}${extras}${formSec}${foot}</article>`;
}

OnLead.landingFromForm = function landingFromForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  const out = {
    name: d.name,
    headline: d.headline,
    sub: d.sub,
    cta: d.cta,
    formTitle: d.formTitle,
    kicker: d.kicker,
    tone: d.tone,
    layout: d.layout,
    quote: d.quote,
    author: d.author,
    role: d.role,
    urgency: d.urgency,
    features: String(d.features || "").split("\n").map((s) => s.trim()).filter(Boolean),
    fields: [...form.querySelectorAll("[name=fields]:checked")].map((i) => i.value),
    stats: OnLead.parsePipe(d.stats, ["n", "l"]),
    steps: OnLead.parsePipe(d.steps, ["t", "d"]),
    prices: OnLead.parsePipe(d.prices, ["name", "price", "note"]),
    outcomes: OnLead.parsePipe(d.outcomes, ["t", "d"]),
    audience: OnLead.parsePipe(d.audience, ["t", "d"]),
    faq: OnLead.parsePipe(d.faq, ["q", "a"]),
    reviews: OnLead.parsePipe(d.reviews, ["q", "a"]),
    meta: { when: d.metaWhen || "", place: d.metaPlace || "", duration: d.metaDuration || "" },
  };
  if (form.querySelector("[name=customHost]")) {
    const zone = OnLead.LANDING_DNS_ZONE || "m360-ural.online";
    let host = String(d.customHost || "").trim();
    if (host === "__custom__") {
      const slug = String(d.customHostSlug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      host = slug ? `${slug}.${zone}` : "";
    }
    out.customHost = host;
    out.utmSource = d.utmSource || "";
    out.utmMedium = d.utmMedium || "";
    out.utmCampaign = d.utmCampaign || "";
    out.pixelHtml = d.pixelHtml || "";
  } else if (form.querySelector("[name=utmSource]")) {
    out.utmSource = d.utmSource || "";
    out.utmMedium = d.utmMedium || "";
    out.utmCampaign = d.utmCampaign || "";
    out.pixelHtml = d.pixelHtml || "";
  }
  return out;
}

OnLead.landingEditor = function landingEditor(page, state) {
  const fields = page.fields || ["name", "phone"];
  const tones = [
    { id: "teal", label: "Бирюза" },
    { id: "gold", label: "Золото" },
    { id: "ink", label: "Чернила" },
    { id: "blue", label: "Синий" },
    { id: "green", label: "Зелёный" },
    { id: "cream", label: "Крем" },
    { id: "rose", label: "Роза" },
    { id: "night", label: "Ночь" },
    { id: "slate", label: "Сланец" },
    { id: "wine", label: "Вино" },
    { id: "sand", label: "Песок" },
  ];
  const layouts = OnLead.LANDING_LAYOUTS || [];
  const url = OnLead.landingPublicUrl(page.id, page);
  const published = page.status === "published";
  const mine = page.userId === OnLead.load()?.user?.id;
  const m = page.meta || {};
  const pro = state && OnLead.toolOn(state, "landings-pro");
  const dnsZone = OnLead.LANDING_DNS_ZONE || "m360-ural.online";
  const presetHosts = OnLead.LANDING_HOSTS || [];
  const hostCustom = page.customHost && !presetHosts.includes(page.customHost);
  const customSlug = hostCustom && page.customHost.endsWith("." + dnsZone)
    ? page.customHost.slice(0, -(dnsZone.length + 1))
    : "";
  const dnsNote = page.dnsStatus
    ? `<p class="muted" style="font-size:12px;margin:-4px 0 10px">DNS: <b>${OnLead.esc(page.dnsStatus)}</b>${page.dnsMessage ? " · " + OnLead.esc(page.dnsMessage) : ""}</p>`
    : `<p class="muted" style="font-size:12px;margin:-6px 0 10px">При публикации DNS-запись создаётся автоматически в Cloudflare (A → сервер, proxied).</p>`;
  const proFields = pro ? `
      <h3 style="margin:18px 0 8px">Лендинги PRO</h3>
      <label class="field"><span>Свой поддомен</span>
        <select name="customHost" id="landing-host-select">
          <option value="">— основной домен —</option>
          ${presetHosts.map((h) => `<option value="${OnLead.esc(h)}" ${page.customHost === h ? "selected" : ""}>${OnLead.esc(h)}</option>`).join("")}
          <option value="__custom__" ${hostCustom ? "selected" : ""}>Свой поддомен…</option>
        </select>
      </label>
      <label class="field" id="landing-host-custom-wrap" style="${hostCustom ? "" : "display:none"}">
        <span>Поддомен на ${OnLead.esc(dnsZone)}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <input name="customHostSlug" value="${OnLead.esc(customSlug)}" placeholder="promo" pattern="[a-z0-9-]+" style="max-width:160px">
          <span class="muted">.${OnLead.esc(dnsZone)}</span>
        </div>
      </label>
      ${dnsNote}
      <label class="field"><span>UTM source</span><input name="utmSource" value="${OnLead.esc(page.utmSource || "")}" placeholder="vk"></label>
      <label class="field"><span>UTM medium</span><input name="utmMedium" value="${OnLead.esc(page.utmMedium || "")}" placeholder="cpc"></label>
      <label class="field"><span>UTM campaign</span><input name="utmCampaign" value="${OnLead.esc(page.utmCampaign || "")}" placeholder="spring-sale"></label>
      <label class="field"><span>Код пикселя (HTML)</span><textarea name="pixelHtml" rows="4" placeholder="<script>...</script>">${OnLead.esc(page.pixelHtml || "")}</textarea></label>
      <p class="muted" style="font-size:12px">UTM попадут в скрытые поля формы. Пиксель вставляется на опубликованную страницу.</p>` : "";
  return `<div class="lp-edit">
    <form id="landing-edit-form" class="card lp-edit-form" data-id="${OnLead.esc(page.id)}">
      <label class="field"><span>Название в кабинете</span><input name="name" value="${OnLead.esc(page.name)}" required></label>
      <label class="field"><span>Макет</span>
        <select name="layout">${layouts.map((t) => `<option value="${t.id}" ${(page.layout || "studio") === t.id ? "selected" : ""}>${OnLead.esc(t.label)}</option>`).join("")}</select>
      </label>
      <label class="field"><span>Тон</span>
        <select name="tone">${tones.map((t) => `<option value="${t.id}" ${page.tone === t.id ? "selected" : ""}>${t.label}</option>`).join("")}</select>
      </label>
      <label class="field"><span>Надзаголовок</span><input name="kicker" value="${OnLead.esc(page.kicker || "")}"></label>
      <label class="field"><span>Срочность под кнопкой</span><input name="urgency" value="${OnLead.esc(page.urgency || "")}"></label>
      <label class="field"><span>Заголовок</span><input name="headline" value="${OnLead.esc(page.headline || "")}" required></label>
      <label class="field"><span>Подзаголовок</span><textarea name="sub">${OnLead.esc(page.sub || "")}</textarea></label>
      <label class="field"><span>Заголовок формы</span><input name="formTitle" value="${OnLead.esc(page.formTitle || "Оставьте заявку")}"></label>
      <label class="field"><span>Кнопка</span><input name="cta" value="${OnLead.esc(page.cta || "Оставить заявку")}"></label>
      <label class="field"><span>Пункты оффера — каждый с новой строки</span><textarea name="features">${OnLead.esc((page.features || []).join("\n"))}</textarea></label>
      <label class="field"><span>Цифры — число|подпись</span><textarea name="stats">${OnLead.esc(OnLead.dumpPipe(page.stats, ["n", "l"]))}</textarea></label>
      <label class="field"><span>Шаги / программа — заголовок|текст</span><textarea name="steps">${OnLead.esc(OnLead.dumpPipe(page.steps, ["t", "d"]))}</textarea></label>
      <label class="field"><span>Пакеты — имя|цена|заметка через ·</span><textarea name="prices">${OnLead.esc(OnLead.dumpPipe(page.prices, ["name", "price", "note"]))}</textarea></label>
      <label class="field"><span>Карточки оффера — заголовок|текст</span><textarea name="outcomes">${OnLead.esc(OnLead.dumpPipe(page.outcomes, ["t", "d"]))}</textarea></label>
      <label class="field"><span>Кому / команда / мастера — заголовок|текст</span><textarea name="audience">${OnLead.esc(OnLead.dumpPipe(page.audience, ["t", "d"]))}</textarea></label>
      <label class="field"><span>Отзывы — цитата|автор</span><textarea name="reviews">${OnLead.esc(OnLead.dumpPipe(page.reviews, ["q", "a"]))}</textarea></label>
      <label class="field"><span>FAQ — вопрос|ответ</span><textarea name="faq">${OnLead.esc(OnLead.dumpPipe(page.faq, ["q", "a"]))}</textarea></label>
      <label class="field"><span>Цитата</span><textarea name="quote">${OnLead.esc(page.quote || "")}</textarea></label>
      <label class="field"><span>Автор цитаты</span><input name="author" value="${OnLead.esc(page.author || "")}"></label>
      <label class="field"><span>Роль автора</span><input name="role" value="${OnLead.esc(page.role || "")}"></label>
      <div class="lp-meta-fields">
        <label class="field"><span>Когда</span><input name="metaWhen" value="${OnLead.esc(m.when || "")}"></label>
        <label class="field"><span>Где</span><input name="metaPlace" value="${OnLead.esc(m.place || "")}"></label>
        <label class="field"><span>Длительность</span><input name="metaDuration" value="${OnLead.esc(m.duration || "")}"></label>
      </div>
      <div class="field"><span>Поля формы</span>
        <div class="lp-checks">${(OnLead.LANDING_FIELDS || []).map((f) => `
          <label><input type="checkbox" name="fields" value="${OnLead.esc(f.id)}" ${fields.includes(f.id) ? "checked" : ""}>${OnLead.esc(f.label)}</label>`).join("")}</div>
      </div>
      ${proFields}
      <div class="muted" style="font-size:12px;margin-bottom:10px">Ссылка: ${OnLead.esc(url)}</div>
      <div class="tpl-card-acts">
        <button class="btn btn-primary" type="submit">Сохранить</button>
        <button type="button" class="btn btn-ghost" data-act="copy-landing-url" data-url="${OnLead.esc(url)}">Копировать ссылку</button>
        <button type="button" class="btn ${published ? "btn-ghost" : "btn-ink"}" data-act="publish-landing" data-id="${OnLead.esc(page.id)}" data-status="${published ? "draft" : "published"}">${published ? "Отключить" : "Опубликовать"}</button>
        ${published ? `<a class="btn btn-ghost" href="#/p/${OnLead.esc(page.id)}" target="_blank" rel="noopener">Открыть</a>` : ""}
        ${mine ? `<button type="button" class="btn btn-ghost" data-act="del-landing" data-id="${OnLead.esc(page.id)}" data-name="${OnLead.esc(page.name)}">Удалить</button>` : ""}
      </div>
    </form>
    <div id="lp-live" class="lp-preview-frame tone-${OnLead.esc(page.tone || "teal")}">${OnLead.landingPageView(page, { preview: true })}</div>
  </div>`;
}

OnLead.tplHref = function tplHref(extra, cur) {
  const p = new URLSearchParams();
  const tier = extra.tier !== undefined ? extra.tier : cur.tier;
  const niche = extra.niche !== undefined ? extra.niche : cur.niche;
  if (tier) p.set("tier", tier);
  if (niche) p.set("niche", niche);
  const s = p.toString();
  return "#/office/landings/templates" + (s ? "?" + s : "");
}

OnLead.tplCard = function tplCard(t) {
  return `<article class="card tpl-card">
    <a class="tpl-shot" href="#/office/landings/templates/${OnLead.esc(t.id)}"><div class="tpl-shot-inner">${OnLead.landingPageView(t, { preview: true, shot: true })}</div></a>
    <div class="tpl-card-body">
      <div class="tpl-card-tags">
        <span class="chip">${OnLead.esc(t.niche)}</span>
        ${t.tier === "pro" ? `<span class="chip chip-gold">PRO</span>` : `<span class="chip">Бесплатный</span>`}
        ${t.badge ? `<span class="chip chip-gold">${OnLead.esc(t.badge)}</span>` : ""}
      </div>
      <b>${OnLead.esc(t.name)}</b>
      <p>${OnLead.esc(t.blurb || t.sub || "")}</p>
      <div class="tpl-card-acts">
        <a class="btn btn-ghost btn-sm" href="#/office/landings/templates/${OnLead.esc(t.id)}">Посмотреть</a>
        <button type="button" class="btn btn-primary btn-sm" data-act="new-landing" data-name="${OnLead.esc(t.name)}" data-template="${OnLead.esc(t.id)}">Использовать</button>
      </div>
    </div>
  </article>`;
}

OnLead.landingsGallery = function landingsGallery() {
  const q = OnLead.hashParams();
  const niche = q.get("niche") || "";
  const tier = q.get("tier") || "";
  const cur = { niche, tier };
  const all = OnLead.LANDING_TEMPLATES || [];
  const niches = OnLead.landingNiches ? OnLead.landingNiches() : [];
  const free = all.filter((t) => t.tier !== "pro");
  const pro = all.filter((t) => t.tier === "pro");
  const shown = all.filter((t) => (!tier || t.tier === tier) && (!niche || t.niche === niche));
  const freeShown = shown.filter((t) => t.tier !== "pro");
  const proShown = shown.filter((t) => t.tier === "pro");
  return `<div class="h-row"><div><h1>Шаблоны</h1>
      <p class="muted" style="margin:6px 0 0">Выберите макет — тексты и картинки замените на свои в редакторе</p></div></div>
    <div class="lg-filters">
      <a class="btn btn-sm ${!tier ? "btn-ink" : "btn-ghost"}" href="${OnLead.tplHref({ tier: "" }, cur)}">Все шаблоны</a>
      <a class="btn btn-sm ${tier === "free" ? "btn-ink" : "btn-ghost"}" href="${OnLead.tplHref({ tier: "free" }, cur)}">Бесплатные · ${free.length}</a>
      <a class="btn btn-sm ${tier === "pro" ? "btn-ink" : "btn-ghost"}" href="${OnLead.tplHref({ tier: "pro" }, cur)}">PRO · ${pro.length}</a>
    </div>
    <div class="lg-filters">
      <a class="btn btn-sm ${!niche ? "btn-ink" : "btn-ghost"}" href="${OnLead.tplHref({ niche: "" }, cur)}">Все</a>
      ${niches.map((n) => `<a class="btn btn-sm ${niche === n ? "btn-ink" : "btn-ghost"}" href="${OnLead.tplHref({ niche: n }, cur)}">${OnLead.esc(n)}</a>`).join("")}
    </div>
    ${!tier && !niche && freeShown.length ? `<div class="tpl-sec"><div><b>Доступны сейчас · ${freeShown.length}</b><p class="muted">Можно взять прямо сейчас, тариф не нужен</p></div>
      <div class="tpl-grid">${freeShown.map(tplCard).join("")}</div></div>` : ""}
    ${!tier && !niche && proShown.length ? `<div class="tpl-sec"><div><b>На платном тарифе · ${proShown.length}</b><p class="muted">В триале все макеты открыты. После триала — тариф лендингов.</p></div>
      <div class="tpl-grid">${proShown.map(tplCard).join("")}</div></div>` : ""}
    ${tier || niche ? `<div class="tpl-grid">${shown.map(tplCard).join("")}</div>` : ""}`;
}

OnLead.landings = function landings(path, state) {
  const subNavPaths = ["/office/landings/leads", "/office/landings/media", "/office/landings/plan"];
  const nav = subNavPaths.includes(path) ? OnLead.sectionNav("landings", path) : "";
  if (path === "/office/landings" || path === "/office/landings/pages" || path === "/office/landings/templates") {
    return `${nav}${OnLead.landingsUnifiedHtml ? OnLead.landingsUnifiedHtml(state) : OnLead.bundleHub("landings", state)}`;
  }
  const tplMatch = path.match(/^\/office\/landings\/templates\/([^/]+)$/);
  if (tplMatch) {
    const tpl = OnLead.landingTemplate(tplMatch[1]);
    if (!tpl) {
      return `${nav}<div class="card muted">Такого шаблона нет. <a href="#/office/landings">Вернуться</a></div>`;
    }
    const preview = OnLead.landingOlPublicHtml ? OnLead.landingOlPublicHtml(tpl, { preview: true }) : OnLead.landingPageView(tpl, { preview: true });
    return `${nav}<div class="h-row">
        <div><div class="muted">Шаблон · ${OnLead.esc(tpl.niche)}</div><h1>${OnLead.esc(tpl.name)}</h1></div>
        <div class="toolbar">
          <a class="btn btn-ghost" href="#/office/landings">← Все шаблоны</a>
          <button type="button" class="btn btn-primary" data-act="new-landing" data-name="${OnLead.esc(tpl.name)}" data-template="${OnLead.esc(tpl.id)}">Создать страницу</button>
        </div>
      </div>
      <p class="muted" style="margin-top:0">${OnLead.esc(tpl.blurb || tpl.sub || "")}</p>
      <div class="ol-preview-wrap">${preview}</div>`;
  }
  const pageMatch = path.match(/^\/office\/landings\/pages\/([^/]+)$/);
  if (pageMatch) {
    const page = (state.landings || []).find((p) => p.id === pageMatch[1]);
    if (!page) {
      return `${nav}<div class="card muted">Страница не найдена. <a href="#/office/landings">К списку</a></div>`;
    }
    const editor = OnLead.landingOlEditorHtml ? OnLead.landingOlEditorHtml(page, state) : OnLead.landingEditor(page, state);
    return editor;
  }
  if (path.endsWith("/leads")) {
    const rows = (state.leads || []).filter((l) => l.landingId || String(l.source || "").startsWith("Лендинг"));
    return `${nav}<div class="h-row"><h1>Заявки с лендингов</h1></div>
      ${rows.length
        ? `<table class="table"><thead><tr><th>Имя</th><th>Телефон</th><th>Страница</th><th>Источник</th><th></th></tr></thead>
          <tbody>${rows.map((l) => `<tr>
            <td>${OnLead.esc(l.name)}</td><td>${OnLead.esc(l.phone || "—")}</td><td>${OnLead.esc(l.landingName || "—")}</td><td>${OnLead.esc(l.source)}</td>
            <td><div class="match-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-act="edit-lead" data-id="${OnLead.esc(l.id)}" data-name="${OnLead.esc(l.name)}" data-note="${OnLead.esc(l.note || "")}" data-city="${OnLead.esc(l.city || "")}" data-phone="${OnLead.esc(l.phone || "")}">Изменить</button>
              <button type="button" class="btn btn-ghost btn-sm" data-act="del-lead" data-id="${OnLead.esc(l.id)}" data-name="${OnLead.esc(l.name)}">Удалить</button>
            </div></td>
          </tr>`).join("")}</tbody></table>`
        : `<div class="card muted">Заявок пока нет — опубликуйте страницу и отправьте ссылку.</div>`}`;
  }
  if (path.endsWith("/media")) {
    return `${nav}<div class="h-row"><h1>Медиатека</h1>
      <a class="btn btn-ghost btn-sm" href="#/office/tools/image-ai">Создать в Image AI</a></div>
      <form id="media-upload-form" class="card" style="margin:12px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required>
        <button class="btn btn-primary btn-sm" type="submit">Загрузить</button>
        <span class="muted" style="font-size:12px">JPG/PNG/WebP/GIF до 5 МБ — для лендингов и постов</span>
      </form>
      <div id="landings-media-grid"><p class="muted">Загрузка…</p></div>`;
  }
  if (path.endsWith("/plan")) {
    return `${nav}<div class="h-row"><h1>Лендинги PRO</h1></div>
      <div class="card"><p>290 ₽/мес · свой домен, UTM и пиксель поверх конструктора.</p>
      <button class="btn btn-primary" data-act="buy-tool" data-slug="landings-pro" data-m="1" data-amount="290">Подключить за 290 ₽</button></div>`;
  }
  return `${nav}${OnLead.landingsUnifiedHtml ? OnLead.landingsUnifiedHtml(state) : `<div class="h-row"><h1>Мои лендинги</h1></div>
    <form id="landing-form" class="lg-add" style="margin-bottom:14px">
      <input name="name" placeholder="Название страницы" required>
      <button class="btn btn-primary" type="submit">Новая страница</button>
    </form>
    <div class="card muted">Загрузка…</div>`}`;
}

/* --- create/save/public binders --- */
OnLead.saveOlLandingEditor = async function saveOlLandingEditor() {
  const editor = document.querySelector(".ol-editor");
  if (!editor) return;
  const id = editor.dataset.id;
  const page = (OnLead.load().landings || []).find((p) => p.id === id) || {};
  const content = OnLead.collectLandingOlContent(editor, page);
  const pro = OnLead.collectOlProFields ? OnLead.collectOlProFields(editor) : {};
  await OnLead.api("/api/landings/" + id, {
    method: "PATCH",
    body: {
      name: document.getElementById("ol-title")?.value || page.name,
      slug: document.getElementById("ol-slug")?.value || page.slug,
      seoDescription: document.getElementById("ol-seo")?.value || "",
      content,
      ...pro,
    },
  });
  OnLead._flash = "Сохранили";
  await OnLead.refresh();
}

OnLead.createLanding = async function createLanding(name, template) {
  const tpl = OnLead.landingTemplate(template);
  const title = String(name || tpl?.name || "").trim() || "Новая страница";
  const body = tpl
    ? {
        name: title,
        template: tpl.id,
        layout: tpl.layout,
        kicker: tpl.kicker,
        headline: tpl.headline,
        sub: tpl.sub,
        cta: tpl.cta,
        formTitle: tpl.formTitle,
        features: tpl.features,
        fields: tpl.fields,
        tone: tpl.tone,
        quote: tpl.quote,
        author: tpl.author,
        role: tpl.role,
        urgency: tpl.urgency,
        stats: tpl.stats,
        steps: tpl.steps,
        prices: tpl.prices,
        outcomes: tpl.outcomes,
        audience: tpl.audience,
        faq: tpl.faq,
        reviews: tpl.reviews,
        meta: tpl.meta,
      }
    : { name: title, headline: title, sub: "Оставьте заявку — перезвоним в рабочее время.", cta: "Оставить заявку", formTitle: "Оставьте заявку", fields: ["name", "phone"], tone: "teal", layout: "specialist" };
  const created = await OnLead.api("/api/landings", { method: "POST", body });
  OnLead._flash = `Черновик «${title}» создан. Опубликуйте, чтобы открыть ссылку клиентам.`;
  OnLead.go("/office/landings/pages/" + created.id);
  await OnLead.render();
}

OnLead.onLandingCreate = async function onLandingCreate(e) {
  e.preventDefault();
  const name = String(new FormData(e.target).get("name") || "").trim();
  try {
    await OnLead.createLanding(name);
  } catch (err) {
    alert(err.message);
  }
}

OnLead.bindLandingEditor = function bindLandingEditor() {
  const form = $("#landing-edit-form");
  if (!form) return;
  const hostSel = form.querySelector("#landing-host-select");
  const customWrap = document.getElementById("landing-host-custom-wrap");
  const syncCustomHost = () => {
    if (customWrap && hostSel) customWrap.style.display = hostSel.value === "__custom__" ? "" : "none";
  };
  hostSel?.addEventListener("change", syncCustomHost);
  syncCustomHost();
  const paint = () => {
    const box = document.getElementById("lp-live");
    if (!box) return;
    const page = { ...landingFromForm(form), id: form.dataset.id };
    box.className = `lp-preview-frame tone-${page.tone || "teal"}`;
    box.innerHTML = landingPageView(page, { preview: true });
  };
  form.addEventListener("input", paint);
  form.addEventListener("change", paint);
  form.addEventListener("submit", onLandingSave);
}

OnLead.onLandingSave = async function onLandingSave(e) {
  e.preventDefault();
  const form = e.target;
  try {
    await OnLead.api("/api/landings/" + form.dataset.id, { method: "PATCH", body: OnLead.landingFromForm(form) });
    OnLead._flash = "Сохранили";
    await OnLead.render();
  } catch (err) {
    alert(err.message);
  }
}

OnLead.publicLandingMissing = function publicLandingMissing() {
  return `<div class="lp-pub">
    <div class="lp-pub-bar"><a href="#/"><b>OnLead</b></a></div>
    <div class="lp-wrap"><div class="card lp-ok"><h3>Страница недоступна</h3><p class="muted">Её сняли с публикации или ссылка устарела.</p></div></div>
  </div>`;
}

OnLead.publicLandingHtml = function publicLandingHtml(page) {
  if (OnLead.landingOlPublicHtml) return OnLead.landingOlPublicHtml(page);
  const lay = normLayout(page.layout);
  const tone = page.tone || "teal";
  const pixel = page.pixelHtml ? `<div class="lp-pixel">${page.pixelHtml}</div>` : "";
  return `${pixel}<div class="lp-pub lp-pro-pub lp-pub-${OnLead.esc(lay)} lp-${OnLead.esc(tone)}">${landingPageView(page)}</div>`;
}

OnLead.renderPublicLanding = async function renderPublicLanding(path, root) {
  const bySlug = path.startsWith("/l/");
  const key = decodeURIComponent(path.replace(/^\/(p|l)\//, ""));
  if (!key) {
    document.title = "OnLead";
    root.innerHTML = OnLead.publicLandingMissing();
    return;
  }
  try {
    const apiPath = bySlug
      ? `/api/public/landings/slug/${encodeURIComponent(key)}`
      : `/api/public/landings/${encodeURIComponent(key)}`;
    const page = await OnLead.api(apiPath);
    document.title = page.headline || page.name || "OnLead";
    if (page.seoDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = page.seoDescription;
    }
    root.innerHTML = OnLead.publicLandingHtml(page);
    const form = document.getElementById("ol-lead-form") || document.getElementById("lp-lead-form");
    form?.addEventListener("submit", onPublicLead);
    scrollToHashAnchor();
  } catch {
    document.title = "OnLead";
    root.innerHTML = OnLead.publicLandingMissing();
  }
}

OnLead.onPublicLead = async function onPublicLead(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const btn = form.querySelector("[type=submit]");
  const prev = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Отправляем…"; }
  try {
    await OnLead.api("/api/public/landings/" + encodeURIComponent(form.dataset.id) + "/leads", { method: "POST", body: data });
    const okText = form.dataset.success || "Заявка принята — перезвоним в рабочее время.";
    form.outerHTML = `<div class="card lp-ok ol-ok"><h3>${OnLead.esc(okText)}</h3></div>`;
  } catch (err) {
    if (btn) { btn.disabled = false; if (prev) btn.textContent = prev; }
    alert(err.message || "Не получилось отправить заявку. Попробуйте ещё раз.");
  }
}
