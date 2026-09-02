/**
 * Главная — parity online-lead.ru dashboard
 */
window.OnLead = window.OnLead || {};

OnLead._dashActivitySlice = function _dashActivitySlice(state, days) {
  const all = state.activity || [];
  const n = Math.min(Math.max(Number(days) || 30, 7), all.length || 30);
  return all.slice(-n);
};

OnLead._dashActivitySum = function _dashActivitySum(rows) {
  return (rows || []).reduce((a, r) => ({
    actions: a.actions + (r.actions || 0),
    leads: a.leads + (r.leads || 0),
    messages: a.messages + (r.messages || 0),
    likes: a.likes + (r.likes || 0),
    posts: a.posts + (r.posts || 0),
    bots: a.bots + (r.bots || 0),
  }), { actions: 0, leads: 0, messages: 0, likes: 0, posts: 0, bots: 0 });
};

OnLead.dashboardOlQuickActions = [
  { title: "Подключить VK", href: "#/office/accounts", accent: "emerald", act: "vk-connect-open" },
  { title: "Лидоскоп", href: "#/office/tools/leadgen-vk", accent: "teal" },
  { title: "CRM-воронка", href: "#/office/crm", accent: "cyan" },
  { title: "AI Лид-менеджер", href: "#/office/tools/ai-lead-vk", accent: "violet" },
  { title: "Нейрокомментарии", href: "#/office/tools/neurocomment-vk", accent: "purple" },
  { title: "Лендинги", href: "#/office/landings", accent: "sand" },
  { title: "Тарифы", href: "#/office/subscriptions#posting-plans", accent: "ink" },
];

OnLead.dashboardOlPage = function dashboardOlPage(state, opts = {}) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const chartDays = OnLead._chartDays || 30;
  const activity = OnLead._dashActivitySlice(state, chartDays);
  const act = OnLead._dashActivitySum(activity);
  const maxAct = Math.max(1, ...activity.map((r) => r.actions || 0));
  const first = String(state.user?.name || "").split(" ")[0] || "коллега";
  const date = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const crmLive = (state.leads || []).filter((l) => !l.archived).length;
  const tools = (OnLead.TOOLS || []).filter((t) => t.price > 0);
  const connected = tools.filter((t) => OnLead.toolOn(state, t.slug)).length;
  const subLabel = OnLead.subscriptionLabel ? OnLead.subscriptionLabel(state) : "—";
  const trial = OnLead.trialLeft ? OnLead.trialLeft(state) : "";
  const planBadge = trial ? `Пробный · ${trial}` : subLabel;
  const nc = state.neurocommentStats || {};
  const al = state.aiLeadStats || {};
  const queue = state.autopostQueue || [];
  const lg = state.leadgen || {};
  const lgMatches = (state.leadgenMatches || []).filter((m) => m.status !== "dismissed").length;

  const cardsNote = !crmLive
    ? "Доска пустая — лиды появятся из сервисов."
    : `${crmLive} в работе на доске CRM`;

  const next = !state.accounts.length
    ? { href: "#/office/accounts", title: "Подключить VK", note: "Без аккаунта сервисы не из чего запускать." }
    : { href: "#/office/crm", title: "Открыть CRM", note: cardsNote };

  const promo = state.promo || {};
  const promoDismissed = opts.promoDismissed || (() => {
    try { return localStorage.getItem("onlead-promo-hide") === "1"; } catch { return false; }
  });
  const fmtCountdown = opts.fmtCountdown || ((ms) => {
    const s = Math.max(0, Math.floor((ms - Date.now()) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d) return `${d} д ${h} ч`;
    if (h) return `${h} ч ${m} мин`;
    return `${m} мин`;
  });
  const promoEndMs = opts.promoEndMs || ((p) => Number(p.until || 0));
  const promoShow = promo.enabled !== false && promo.title && !promoDismissed();
  const promoUntil = promoShow ? promoEndMs(promo) : 0;

  const promoBlock = promoShow
    ? `<div class="lk-giveaway card">
        <div class="lk-giveaway-main">
          <span class="lk-promo-badge">Розыгрыш</span>
          <b>${esc(promo.title)}</b>
          <p>${esc(promo.text || "")}</p>
          ${promoUntil ? `<div class="lk-giveaway-timer">Осталось <strong data-promo-until="${promoUntil}">${esc(fmtCountdown(promoUntil))}</strong></div>` : ""}
        </div>
        <div class="lk-giveaway-acts">
          <a class="btn btn-primary btn-sm" href="${esc(promo.href || "#/office/subscriptions")}">Подробнее</a>
          <button type="button" class="btn btn-ghost btn-sm" data-act="promo-hide">Скрыть</button>
        </div>
      </div>`
    : "";

  const onboardingDismissed = (() => {
    try { return localStorage.getItem("onlead.onboarding.dismissed") === "1"; } catch { return false; }
  })();
  const obStep2 = state.accounts.length > 0;
  const obStep3 = crmLive > 0 || connected > 0;
  const obDone = 1 + (obStep2 ? 1 : 0) + (obStep3 ? 1 : 0);
  const onboarding = !onboardingDismissed && obDone < 3
    ? `<details class="card dash-onboarding" open>
        <summary><b>Начало работы</b> <span class="muted">${obDone}/3</span></summary>
        <div class="dash-onboarding-bar"><i style="width:${Math.round((obDone / 3) * 100)}%"></i></div>
        <ol class="dash-onboarding-steps">
          <li class="done"><span>✓</span> Создайте аккаунт</li>
          <li class="${obStep2 ? "done" : ""}"><span>${obStep2 ? "✓" : "2"}</span> Подключите VK
            ${obStep2 ? "" : `<button type="button" class="btn btn-ghost btn-sm" data-act="vk-connect-open">Подключить</button>`}
          </li>
          <li class="${obStep3 ? "done" : ""}"><span>${obStep3 ? "✓" : "3"}</span> Первый лид или инструмент
            ${obStep3 ? "" : `<a class="btn btn-ghost btn-sm" href="#/office/tools/leadgen-vk">Лидоскоп</a>`}
          </li>
        </ol>
        <button type="button" class="btn btn-ghost btn-sm" data-act="dash-onboarding-dismiss">Скрыть</button>
      </details>`
    : "";

  const statCards = [
    { label: "Аккаунты VK", value: `${state.accounts.length}/${state.accountSlots || 3}`, hint: "подключено", tone: "" },
    { label: "Инструменты", value: `${connected}/${tools.length}`, hint: "активны", tone: connected ? "ok" : "" },
    { label: "Лиды CRM", value: String(crmLive), hint: "в работе", tone: crmLive ? "ok" : "" },
    { label: `Действия · ${chartDays} дн`, value: String(act.actions || 0), hint: "VK активность", tone: "" },
    { label: "AI-кредиты", value: String(state.user?.aiCredits ?? 0), hint: "остаток", tone: "" },
  ];

  const quickGrid = OnLead.dashboardOlQuickActions.map((q) => {
    const inner = q.act
      ? `<button type="button" class="dash-quick dash-quick-${q.accent}" data-act="${esc(q.act)}"><span class="dash-quick-ico"></span><b>${esc(q.title)}</b></button>`
      : `<a class="dash-quick dash-quick-${q.accent}" href="${esc(q.href)}"><span class="dash-quick-ico"></span><b>${esc(q.title)}</b></a>`;
    return inner;
  }).join("");

  const accountRows = state.accounts.length
    ? state.accounts.slice(0, 4).map((a) => `<div class="dash-acc-row"><b>${esc(a.name)}</b><span class="muted">id ${esc(a.vkId)}</span></div>`).join("")
    : `<p class="muted">Нет аккаунтов — <button type="button" class="btn btn-ghost btn-sm" data-act="vk-connect-open">Подключить</button></p>`;

  const neuroBlock = OnLead.toolOn(state, "neurocomment-vk") || nc.totalSent
    ? `<div class="card dash-side-card">
        <div class="dash-side-head"><b>Нейрокомментарии</b><a class="btn btn-ghost btn-sm" href="#/office/tools/neurocomment-vk">Открыть</a></div>
        <div class="dash-mini-grid">
          <div><span class="muted">Сегодня</span><b>${nc.sentToday ?? 0}</b></div>
          <div><span class="muted">Всего</span><b>${nc.totalSent ?? 0}</b></div>
          <div><span class="muted">В работе</span><b>${nc.inProgress ?? 0}</b></div>
          <div><span class="muted">Лимит</span><b>${nc.dailyLimit ?? 20}/день</b></div>
        </div>
      </div>`
    : "";

  const aiBlock = OnLead.toolOn(state, "ai-lead-vk") || al.totalOk
    ? `<div class="card dash-side-card">
        <div class="dash-side-head"><b>AI Лид-менеджер</b><a class="btn btn-ghost btn-sm" href="#/office/tools/ai-lead-vk">Открыть</a></div>
        <div class="dash-mini-grid">
          <div><span class="muted">Сегодня</span><b>${al.sentToday ?? 0}</b></div>
          <div><span class="muted">Диалоги</span><b>${al.dialogs ?? 0}</b></div>
          <div><span class="muted">Горячие</span><b>${al.hot ?? 0}</b></div>
          <div><span class="muted">OK</span><b>${al.totalOk ?? 0}</b></div>
        </div>
      </div>`
    : "";

  const todayQueue = queue.length
    ? `<div class="card dash-queue">
        <div class="dash-side-head"><b>Очередь автопостинга</b><span class="chip">${queue.length}</span></div>
        ${queue.slice(0, 4).map((it) => `<div class="dash-queue-row muted">${esc(String(it.text || "").slice(0, 80))}${it.photoCount ? ` · ${it.photoCount} фото` : ""}</div>`).join("")}
      </div>`
    : "";

  const lgBlock = lg.enabled || lgMatches
    ? `<div class="card dash-side-card">
        <div class="dash-side-head"><b>Лидоскоп</b><a class="btn btn-ghost btn-sm" href="#/office/tools/leadgen-vk">Открыть</a></div>
        <p class="muted" style="margin:0">${lgMatches} совпадений · ${(lg.phrases || []).length} фраз</p>
      </div>`
    : "";

  const ref = state.referral || {};
  const refCode = String(ref.code || "").toUpperCase();
  const refLink = refCode && refCode !== "—" ? `${OnLead.BRAND.origin}/r/${encodeURIComponent(refCode)}` : "";
  const refForecast = Math.round((ref.paying || 0) * 390 * 0.07);
  const refOps = (state.ops || []).filter((o) => /реферал/i.test(o.title || "")).slice(0, 5);

  return `<section class="lk-home dash-ol">
    ${promoBlock}
    <div class="dash-hero card">
      <div class="dash-hero-main">
        <p class="dash-kicker">Личный кабинет · ${esc(date)}</p>
        <h1>${esc(first)}, добро пожаловать</h1>
        <p class="muted">${esc(next.note)}</p>
        <div class="dash-hero-acts">
          <a class="btn btn-primary" href="${esc(next.href)}">${esc(next.title)}</a>
          <a class="btn btn-ghost" href="#/office/compose">Создать пост</a>
        </div>
      </div>
      <div class="dash-hero-aside">
        <span class="chip ${OnLead.packageActive && OnLead.packageActive(state) ? "chip-ok" : ""}">${esc(planBadge)}</span>
        <a class="btn btn-ghost btn-sm" href="#/office/subscriptions">Сменить тариф</a>
      </div>
    </div>

    <div class="dash-stat-grid">${statCards.map((c) =>
      `<div class="card dash-stat ${c.tone ? "dash-stat-" + c.tone : ""}">
        <span class="muted">${esc(c.label)}</span>
        <b>${esc(c.value)}</b>
        <small class="muted">${esc(c.hint)}</small>
      </div>`).join("")}</div>

    <div class="dash-section">
      <h2 class="dash-section-title">Быстрые действия</h2>
      <div class="dash-quick-grid">${quickGrid}</div>
    </div>

    <div class="dash-main-grid">
      <div class="dash-main-left">
        <div class="lk-activity card">
          <div class="lk-activity-head">
            <div><b>Активность VK</b><p class="muted">Сводно за ${chartDays} дней · ${act.actions || 0} действий</p></div>
            <div class="lk-chart-tabs">
              <button type="button" class="btn btn-ghost btn-sm ${chartDays === 7 ? "active" : ""}" data-act="dash-chart" data-days="7">7 дн</button>
              <button type="button" class="btn btn-ghost btn-sm ${chartDays === 30 ? "active" : ""}" data-act="dash-chart" data-days="30">30 дн</button>
            </div>
          </div>
          <div class="lk-activity-kpi lk-activity-kpi-5">
            <div><span>Лиды</span><b>${act.leads || 0}</b></div>
            <div><span>Сообщения</span><b>${act.messages || 0}</b></div>
            <div><span>Лайки</span><b>${act.likes || 0}</b></div>
            <div><span>Посты</span><b>${act.posts || 0}</b></div>
            <div><span>Ботов удалено</span><b>${act.bots || 0}</b></div>
          </div>
          <div class="lk-chart" aria-hidden="true">${activity.map((r) => {
            const h = Math.max(4, Math.round(((r.actions || 0) / maxAct) * 100));
            const label = r.date.slice(8, 10) + "." + r.date.slice(5, 7);
            return `<button type="button" class="lk-chart-bar" style="--h:${h}%" title="${esc(r.date)}: ${r.actions || 0}"><i></i><span>${label}</span></button>`;
          }).join("")}</div>
        </div>
        ${todayQueue}
        <div class="lk-tools-dash">
          <div class="lk-tools-dash-head"><b>Инструменты VK</b><span class="muted">Подключено ${connected} из ${tools.length}</span></div>
          <div class="lk-tools-dash-grid lk-tools-dash-grid-full">${tools.slice(0, 12).map((t) => {
            const on = OnLead.toolOn(state, t.slug);
            const connect = on
              ? `<span class="lk-tool-status on">В работе</span>`
              : `<button type="button" class="btn btn-primary btn-sm" data-act="buy-tool" data-slug="${esc(t.slug)}" data-m="1" data-amount="${t.price}">Подключить</button>`;
            return `<div class="lk-tool-dash ${on ? "on" : ""}">
              <a href="#/office/tools/${esc(t.slug)}"><b>${esc(t.name)}</b><span>${t.price} ₽/мес</span></a>
              ${connect}
            </div>`;
          }).join("")}</div>
          <a class="btn btn-ghost btn-sm" href="#/office/tools">Все инструменты</a>
        </div>
      </div>
      <aside class="dash-main-right">
        <div class="card dash-side-card">
          <div class="dash-side-head"><b>Аккаунты VK</b><a class="btn btn-ghost btn-sm" href="#/office/accounts">Все</a></div>
          ${accountRows}
        </div>
        ${lgBlock}
        ${neuroBlock}
        ${aiBlock}
        <div class="card dash-side-card dash-links">
          <b>Полезные ссылки</b>
          <a href="#/office/balance">Баланс · ${state.balance.toLocaleString("ru-RU")} ₽</a>
          <a href="#/office/subscriptions#leadgen">Тариф · Лидоскоп</a>
          <a href="#/office/subscriptions#ai-agents">Тариф · Нейросотрудники</a>
          <a href="#/office/academy">Академия</a>
        </div>
      </aside>
    </div>

    ${onboarding}

    ${refLink ? `<div class="lk-ref-dash card">
      <div class="lk-ref-dash-head"><b>Реферальная программа</b><span class="muted">7% с каждого платежа</span></div>
      <div class="lk-ref-dash-grid">
        <div><span>Ссылка</span><code>${esc(refLink)}</code><button type="button" class="btn btn-ink btn-sm" data-act="copy" data-text="${esc(refLink)}">Копировать</button></div>
        <div><span>Приглашено</span><b>${ref.invited || 0}</b></div>
        <div><span>Платят</span><b>${ref.paying || 0}</b></div>
        <div><span>Заработано</span><b>${ref.earned || 0} ₽</b></div>
        <div><span>Прогноз / мес</span><b>${refForecast} ₽</b></div>
      </div>
      ${refOps.length ? `<ul class="lk-ref-ops">${refOps.map((o) => `<li><span>${esc(o.at?.slice(0, 10) || "")}</span> ${esc(o.title)} <b>+${o.amount} ₽</b></li>`).join("")}</ul>` : ""}
      <a class="btn btn-ghost btn-sm" href="#/office/referral">Вся программа</a>
    </div>` : ""}
  </section>`;
};

OnLead.bindDashboardOl = function bindDashboardOl() {
  /* no-op — handlers in app.js onClick */
};
