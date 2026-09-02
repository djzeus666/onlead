/**
 * Тарифы и биллинг — parity online-lead.ru billing page
 */
window.OnLead = window.OnLead || {};

OnLead.BILLING_ADDONS = [
  {
    id: "leadgen",
    anchor: "leadgen",
    mark: "ЛГ",
    title: "Лидоскоп",
    slug: "leadgen-vk",
    href: "#/office/tools/leadgen-vk",
    blurb: "Мониторинг заявок в постах и комментариях VK. Совпадения — в CRM.",
    features: ["Фразы и стоп-слова", "Расписание сканов", "AI-ответ и скоринг", "CRM-воронка"],
  },
  {
    id: "ai-agents",
    anchor: "ai-agents",
    mark: "AI",
    title: "Нейросотрудники",
    slugs: ["ai-lead-vk", "neurocomment-vk"],
    href: "#/office/tools/ai-lead-vk",
    blurb: "AI Лид-менеджер и нейрокомментарии — прогрев и охват без ручной рутины.",
    features: ["Диалоги в ЛС VK", "AI-комментарии", "Скоринг лидов", "Журнал действий"],
  },
  {
    id: "content",
    anchor: "passive-products",
    mark: "КН",
    title: "Контент и медиа",
    slug: "image-ai",
    href: "#/office/ai-images",
    blurb: "AI-картинки, автопостинг и граббер — контент под ключ.",
    features: ["Image AI", "Автопостинг VK", "Граббер постов", "Медиатека лендингов"],
  },
];

OnLead.billingOlPage = function billingOlPage(state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const live = state.settings?.paymentsLive;
  const months = OnLead._packMonths || 1;
  const subLabel = OnLead.subscriptionLabel ? OnLead.subscriptionLabel(state) : "—";
  const packActive = OnLead.packageActive && OnLead.packageActive(state);
  const currentPack = OnLead.PACKAGES.find((p) => p.id === state.packageId);
  const tools = (OnLead.TOOLS || []).filter((t) => t.price > 0);
  const connected = tools.filter((t) => OnLead.toolOn(state, t.slug)).length;
  const crmLive = (state.leads || []).filter((l) => !l.archived).length;
  const lg = state.leadgen || {};
  const lgMatches = (state.leadgenMatches || []).filter((m) => m.status !== "dismissed").length;
  const nc = state.neurocommentStats || {};
  const al = state.aiLeadStats || {};

  const periodBtns = (OnLead.PERIODS || []).map((p) =>
    `<button type="button" class="btn btn-ghost btn-sm ${months === p.id ? "active" : ""}" data-act="sub-period" data-m="${p.id}">${esc(p.label)}${p.discount ? ` −${Math.round(p.discount * 100)}%` : ""}</button>`,
  ).join("");

  const untilStr = state.packageUntil
    ? new Date(state.packageUntil).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const usageStrip = [
    { label: "Баланс", value: `${state.balance.toLocaleString("ru-RU")} ₽`, href: "#/office/balance" },
    { label: "Аккаунты VK", value: `${state.accounts.length} / ${state.accountSlots || 3}`, href: "#/office/accounts" },
    { label: "Инструменты", value: `${connected} активны`, href: "#/office/tools" },
    { label: "AI-кредиты", value: String(state.user?.aiCredits ?? 0), href: "#/office/ai-images" },
    { label: "Лиды CRM", value: String(crmLive), href: "#/office/crm" },
    { label: "Очередь постов", value: String((state.autopostQueue || []).length), href: "#/office/tools/autoposting-vk" },
  ];

  const planHero = `<div class="card bill-plan-hero">
    <div class="bill-plan-hero-main">
      <span class="bill-mark">${esc(currentPack ? currentPack.name.slice(0, 2).toUpperCase() : "—")}</span>
      <div>
        <h2>${esc(currentPack?.name || (packActive ? state.packageId : "Тариф не выбран"))}</h2>
        <p class="muted">${esc(subLabel)}${untilStr ? ` · оплачено до ${esc(untilStr)}` : ""}</p>
        <p>${esc(currentPack?.hint || "Выберите пакет — инструменты подключаются автоматически на срок оплаты.")}</p>
      </div>
      <span class="chip ${packActive ? "chip-ok" : ""}">${packActive ? "Активен" : "Не активен"}</span>
    </div>
    <div class="bill-plan-hero-acts">
      <a class="btn btn-primary btn-sm" href="#/office/subscriptions#posting-plans">Сменить тариф</a>
      <a class="btn btn-ghost btn-sm" href="#/office/accounts">Аккаунты VK</a>
      <a class="btn btn-ghost btn-sm" href="#/office/balance">Пополнить баланс</a>
    </div>
  </div>`;

  const usageHtml = `<div class="bill-usage card">${usageStrip.map((u) =>
    `<a class="bill-usage-cell" href="${esc(u.href)}"><span class="muted">${esc(u.label)}</span><b>${esc(u.value)}</b></a>`).join("")}</div>`;

  const packagesHtml = `<section id="posting-plans" class="bill-section scroll-anchor">
    <h2 class="bill-section-title">Пакеты подписки</h2>
    <p class="muted bill-section-lead">${live ? "Оплата картой / СБП или со счёта кабинета." : "Тестовый режим — без списания с карты."}</p>
    <div class="lk-period-tabs">${periodBtns}</div>
    <div class="bill-plan-grid">${(OnLead.PACKAGES || []).map((p) => {
      const price = OnLead.packPrice(p, months);
      const per = months > 1 ? `<div class="muted bill-plan-per">${p.price} ₽/мес · экономия ${Math.round(p.price * months - price)} ₽</div>` : "";
      const active = state.packageId === p.id && packActive;
      const toolCount = (p.tools || []).length;
      return `<article class="card bill-plan-card ${active ? "on" : ""}">
        <span class="chip">${esc(p.badge)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="bill-plan-price">${price.toLocaleString("ru-RU")} ₽</div>
        ${per}
        <p class="muted">${esc(p.hint)}</p>
        <p class="muted bill-plan-tools">${toolCount} инструментов в пакете</p>
        <button class="btn btn-primary btn-block" type="button" data-act="buy-pack" data-id="${p.id}" data-m="${months}" data-amount="${price}">${active ? "Подключено" : "Выбрать тариф"}</button>
      </article>`;
    }).join("")}</div>
  </section>`;

  const addonSection = (addon) => {
    const slugs = addon.slugs || (addon.slug ? [addon.slug] : []);
    const on = slugs.some((s) => OnLead.toolOn(state, s));
    const primaryTool = slugs[0] ? OnLead.TOOLS.find((t) => t.slug === slugs[0]) : null;
    let stats = "";
    if (addon.id === "leadgen") {
      stats = `<div class="bill-addon-stats">
        <div><span class="muted">Фраз</span><b>${(lg.phrases || []).length}</b></div>
        <div><span class="muted">Групп</span><b>${(lg.groups || []).length}</b></div>
        <div><span class="muted">Совпадений</span><b>${lgMatches}</b></div>
      </div>`;
    } else if (addon.id === "ai-agents") {
      stats = `<div class="bill-addon-stats">
        <div><span class="muted">NC сегодня</span><b>${nc.sentToday ?? 0}</b></div>
        <div><span class="muted">AI диалоги</span><b>${al.dialogs ?? 0}</b></div>
        <div><span class="muted">Горячие</span><b>${al.hot ?? 0}</b></div>
      </div>`;
    }
    const buyBtns = slugs.map((slug) => {
      const t = OnLead.TOOLS.find((x) => x.slug === slug);
      if (!t) return "";
      const toolOn = OnLead.toolOn(state, slug);
      return toolOn
        ? `<a class="btn btn-ghost btn-sm" href="#/office/tools/${esc(slug)}">${esc(t.name)} · открыть</a>`
        : `<button type="button" class="btn btn-primary btn-sm" data-act="buy-tool" data-slug="${esc(slug)}" data-m="1" data-amount="${t.price}">${esc(t.name)} · ${t.price} ₽</button>`;
    }).join("");
    return `<section id="${esc(addon.anchor)}" class="bill-section bill-addon scroll-anchor">
      <div class="card bill-addon-hero bill-addon-${esc(addon.id)}">
        <div class="bill-addon-top">
          <span class="bill-mark">${esc(addon.mark)}</span>
          <div>
            <h2>${esc(addon.title)}</h2>
            <p class="muted">${esc(addon.blurb)}</p>
          </div>
          <span class="chip ${on ? "chip-ok" : ""}">${on ? "Подключено" : "Не активно"}</span>
        </div>
        <ul class="bill-feature-list">${addon.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        ${stats}
        <div class="bill-addon-acts">
          <a class="btn btn-ghost btn-sm" href="${esc(addon.href)}">Открыть модуль</a>
          ${buyBtns}
        </div>
      </div>
    </section>`;
  };

  const upsells = OnLead.BILLING_ADDONS.filter((a) => {
    const slugs = a.slugs || (a.slug ? [a.slug] : []);
    return !slugs.some((s) => OnLead.toolOn(state, s));
  });
  const upsellHtml = upsells.length
    ? `<section id="upsells" class="bill-section scroll-anchor">
        <h2 class="bill-section-title">Дополните кабинет</h2>
        <div class="bill-upsell-grid">${upsells.map((a) =>
          `<a class="card bill-upsell" href="#/office/subscriptions#${esc(a.anchor)}">
            <span class="bill-mark">${esc(a.mark)}</span>
            <b>${esc(a.title)}</b>
            <p class="muted">${esc(a.blurb.slice(0, 80))}…</p>
          </a>`).join("")}</div>
      </section>`
    : "";

  const alaCarte = `<section id="passive-products" class="bill-section scroll-anchor">
    <h2 class="bill-section-title">Поштучные инструменты</h2>
    <p class="muted bill-section-lead">Подключайте отдельно, если не нужен полный пакет.</p>
    <div class="bill-tool-grid">${tools.map((t) => {
      const on = OnLead.toolOn(state, t.slug);
      return `<div class="card bill-tool-card ${on ? "on" : ""}">
        <b>${esc(t.name)}</b>
        <span class="muted">${t.price} ₽/мес</span>
        <p class="muted bill-tool-sum">${esc(String(t.summary || "").slice(0, 90))}…</p>
        <div class="bill-tool-acts">
          <a class="btn btn-ghost btn-sm" href="#/office/tools/${esc(t.slug)}">Открыть</a>
          ${on ? `<span class="chip chip-ok">В работе</span>` : `<button type="button" class="btn btn-primary btn-sm" data-act="buy-tool" data-slug="${esc(t.slug)}" data-m="1" data-amount="${t.price}">Подключить</button>`}
        </div>
      </div>`;
    }).join("")}</div>
  </section>`;

  return `<div class="bill-ol">
    <div class="ol-page-head bill-head">
      <div>
        <p class="bill-kicker muted">Оплата · подписка</p>
        <h1>Тарифы и биллинг</h1>
        <p class="muted ol-page-head__lead">Пакеты, аддоны и поштучные инструменты · баланс на отдельной странице</p>
      </div>
      <a class="btn btn-ghost btn-sm" href="#/office/balance">Кошелёк · ${state.balance.toLocaleString("ru-RU")} ₽</a>
    </div>
    ${planHero}
    ${usageHtml}
    ${packagesHtml}
    ${OnLead.BILLING_ADDONS.map(addonSection).join("")}
    ${upsellHtml}
    ${alaCarte}
  </div>`;
};

OnLead.bindBillingOl = function bindBillingOl() {
  /* billing page uses shared scrollToHashAnchor from bindOffice */
};
