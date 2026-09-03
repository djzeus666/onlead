/**
 * Marketing landing + auth pages (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.landingPage = function landingPage() {
  const origin = OnLead.BRAND.origin;
  const tools = OnLead.TOOLS;
  const feat = [
    { slug: "ai-lead-vk", tag: "01 / DIALOGUE", tone: "blue" },
    { slug: "leadgen-vk", tag: "02 / SIGNAL", tone: "mint" },
    { slug: "neurocomment-vk", tag: "03 / CONTENT", tone: "amber" },
  ].map((x) => ({ ...x, t: OnLead.tool(x.slug) })).filter((x) => x.t);
  const featSlugs = new Set(feat.map((x) => x.slug));
  const rest = tools.filter((t) => !featSlugs.has(t.slug));
  const route = [
    ["Сигнал", "Находим тех, кому актуально ваше предложение."],
    ["Контакт", "Фиксируем интерес и бережно начинаем разговор."],
    ["Диалог", "ИИ отвечает в вашем тоне и задаёт нужные вопросы."],
    ["Лид", "Вы подключаетесь, когда человек уже готов."],
  ];
  return `
  <div class="sf-banner">НОВЫЙ РЕЖИМ · AI-ЛИД-МЕНЕДЖЕР УЖЕ В ONLEAD · <a href="${origin}/#/register">Смотреть, как работает →</a></div>
  <header class="pub-head">
    <div class="inner">
      ${OnLead.brandLogo(origin + "/#/")}
      <nav class="nav-pub">
        <a href="${origin}/#system">Система</a>
        <a href="${origin}/#tools">Инструменты</a>
        <a href="${origin}/#prices">Тарифы</a>
        <a href="${origin}/#faq">Вопросы</a>
      </nav>
      <div class="head-actions">
        <a class="btn btn-ghost btn-sm pub-login" href="${origin}/#/login">Войти</a>
        <a class="btn btn-primary btn-sm" href="${origin}/#/register">Открыть кабинет</a>
        <details class="pub-menu">
          <summary class="pub-burger" aria-label="Меню">${OnLead.icon("menu")}</summary>
          <nav class="pub-sheet">
            <a href="${origin}/#system">Система</a>
            <a href="${origin}/#tools">Инструменты</a>
            <a href="${origin}/#prices">Тарифы</a>
            <a href="${origin}/#faq">Вопросы</a>
            <a class="btn btn-ghost" href="${origin}/#/login">Войти</a>
            <a class="btn btn-primary" href="${origin}/#/register">Попробовать 72 часа</a>
          </nav>
        </details>
      </div>
    </div>
  </header>
  <section class="hero" id="top">
    <div class="wrap hero-grid">
      <div>
        <div class="sf-kicker"><i></i> SIGNAL FIELD / 2026</div>
        <h1>Сигналы,<br><span class="accent">которые</span><br>становятся<br>лидами<span class="amp">.</span></h1>
        <p class="lead">OnLead собирает аудиторию из VK, ведёт диалог и показывает момент, когда пора подключаться вам.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="${origin}/#/register">Начать за 5 минут</a>
          <a class="sf-play" href="${origin}/#system"><span>${OnLead.icon("spark")}</span> Посмотреть систему</a>
        </div>
        <div class="stats-row">
          <div><b>67 721</b><br><span class="muted">пользователей</span></div>
          <div><b>4,9 / 5</b><br><span class="muted">средняя оценка</span></div>
          <div><b>+23,4%</b><br><span class="muted">конверсия в диалог</span></div>
        </div>
      </div>
      <div class="mock">
        <div class="mock-top"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span> VK · online · скоринг 8.7/10</div>
        <div class="mock-body">
          <div class="bubble in">Привет! А что именно за инструменты?</div>
          <div class="bubble out">AI ведёт диалог, парсит аудиторию и пишет посты в вашем тоне. Расскажу подробнее?</div>
          <div class="bubble in">Отлично, давайте обсудим.</div>
        </div>
        <div class="mock-hot">
          <div class="mono">HOT LEAD / NOW</div>
          <b><i></i> Готов к диалогу <span class="mono" style="color:var(--teal)">8.7/10</span></b>
        </div>
      </div>
    </div>
  </section>
  <section class="section" id="system" style="background:var(--surface);border-block:1px solid var(--line)">
    <div class="wrap">
      <div class="sf-split">
        <div>
          <div class="sf-label">01 / THE ROUTE</div>
          <h2>Один маршрут<br><span class="soft">вместо восьми</span> вкладок</h2>
        </div>
        <p class="muted" style="max-width:34ch;margin:0">От первого сигнала до понятного действия — система держит контекст и не заставляет переключаться между сервисами.</p>
      </div>
      <div class="sf-route">
        ${route.map(([h, p], i) => `
          <article>
            <div class="n">0${i + 1} / 04</div>
            <div class="route-bar ${i === 3 ? "done" : ""}"></div>
            <h3>${h}<em>.</em></h3>
            <p>${p}</p>
          </article>`).join("")}
      </div>
    </div>
  </section>
  <section class="section" id="tools">
    <div class="wrap">
      <div class="sf-split">
        <div>
          <div class="sf-label">02 / TOOLKIT</div>
          <h2>Инструменты,<br><span class="soft">собранные в поток</span></h2>
        </div>
        <a href="${origin}/#/register" style="color:var(--teal);font-weight:700">Все инструменты →</a>
      </div>
      <div class="grid-3" style="margin:28px 0 18px">
        ${feat.map(({ t, tag, tone }) => `
          <article class="card feat-card card-lift">
            <div class="feat-ico ${tone}">${OnLead.icon("spark")}</div>
            <div class="tag">${tag}</div>
            <h3>${OnLead.esc(t.name)}</h3>
            <p>${OnLead.esc(t.summary)}</p>
            <div class="more">Открыть модуль →</div>
          </article>`).join("")}
      </div>
      <div class="grid-4">
        ${rest.map((t) => `
          <article class="card card-lift">
            <div class="icon-box">${OnLead.icon("spark")}</div>
            <h3>${OnLead.esc(t.name)}</h3>
            <p>${OnLead.esc(t.summary)}</p>
          </article>`).join("")}
      </div>
    </div>
  </section>
  <section class="section sf-band" id="ai">
    <div class="wrap">
      <div class="flow-status">
        <span class="mono" style="letter-spacing:.14em">FLOW STATUS</span>
        ${["Сигнал", "Контакт", "Диалог", "Лид"].map((s, i) => `
          <span class="${i === 3 ? "ok" : ""}"><span class="dot ${i === 3 ? "ok" : ""}"></span> ${s}</span>${i < 3 ? "<i></i>" : ""}`).join("")}
      </div>
      <div class="hero-grid" style="margin-top:36px;align-items:center">
        <div>
          <div class="sf-label">03 / WORKSPACE</div>
          <h2>Кабинет,<br><span class="soft">который держит ритм</span></h2>
          <p>Всё важное на одном экране: активность, горячие диалоги, состояние кампаний и следующий шаг.</p>
          <a class="btn" style="margin-top:22px;background:var(--mint);color:var(--ink);font-weight:800" href="${origin}/#/register">Перейти в кабинет</a>
        </div>
        <div class="card" style="background:#222e46;border-color:transparent;color:#f5f2eb">
          <div class="mono" style="color:var(--mint);font-size:10px;letter-spacing:.14em">LIVE / CABINET</div>
          <h3 class="serif" style="font-size:28px;margin:10px 0">Обзор.</h3>
          <p style="color:#aab3c3;margin:0 0 18px">Лиды, сообщения и следующий шаг — без стены настроек.</p>
          <div class="kpi">
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>CRM</b><span>сделки в работе</span></div>
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>AI</b><span>диалог и скоринг</span></div>
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>VK</b><span>аккаунты и поток</span></div>
            <div class="card" style="background:#182338;border-color:rgba(255,255,255,.08);color:#fff"><b>72ч</b><span>пробный доступ</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="section" id="prices">
    <div class="wrap">
      <div class="sf-split">
        <div>
          <div class="sf-label">04 / ACCESS</div>
          <h2>Выберите<br>свой <span class="accent" style="color:var(--teal)">ритм</span></h2>
          <p class="muted" style="max-width:34ch">Начните с одного потока. Добавляйте инструменты, когда увидите точку роста.</p>
        </div>
      </div>
      <div class="grid-3" style="margin-top:28px">
        ${OnLead.PACKAGES.map((p) => `
          <article class="card price-card ${p.id === "maxi" ? "hit" : ""}">
            <span class="chip ${p.id === "maxi" ? "" : (p.id === "maxi-ai" ? "chip-gold" : "")}">${OnLead.esc(p.badge)}</span>
            <h3>${OnLead.esc(p.name)}</h3>
            <div class="amount">${p.price}<small style="font-size:16px"> ₽/мес</small></div>
            <p style="margin-bottom:12px">${OnLead.esc(p.hint)}</p>
            <ul>${p.tools.slice(0, 6).map((s) => `<li>${OnLead.esc(OnLead.tool(s)?.name || s)}</li>`).join("")}</ul>
            <a class="btn btn-primary btn-block" style="margin-top:16px" href="${origin}/#/register">Выбрать ${OnLead.esc(p.name)}</a>
          </article>`).join("")}
      </div>
      <p class="muted" style="margin-top:12px">Периоды 1 / 3 / 6 месяцев со скидкой. Отдельные инструменты — поштучно.</p>
    </div>
  </section>
  <section class="section" id="faq" style="background:var(--surface);border-top:1px solid var(--line)">
    <div class="wrap hero-grid">
      <div>
        <div class="sf-label">05 / CLARITY</div>
        <h2>Вопросы<br>перед <span style="color:var(--teal)">стартом</span></h2>
      </div>
      <div class="faq">
        ${OnLead.FAQ.map((f) => `<details><summary>${OnLead.esc(f.q)}</summary><p>${OnLead.esc(f.a)}</p></details>`).join("")}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="sf-cta">
        <div class="sf-label">NEXT SIGNAL / 01</div>
        <h2 class="serif">Пора увидеть,<br>кто уже готов к диалогу<span style="color:var(--teal)">.</span></h2>
        <a class="btn btn-ink" href="${origin}/#/register">Запустить OnLead</a>
      </div>
    </div>
  </section>
  <footer class="pub-foot">
    <div class="inner">
      <div>
        <div class="logo"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span></div>
        <p>Рабочая система для тех, кто превращает активность в VK в управляемый поток лидов.</p>
      </div>
      <div>
        <strong style="color:var(--ink)">Продукт</strong>
        <a href="${OnLead.BRAND.origin}/#system">Система</a>
        <a href="${OnLead.BRAND.origin}/#tools">Инструменты</a>
        <a href="${OnLead.BRAND.origin}/#prices">Тарифы</a>
        <a href="${OnLead.BRAND.origin}/#faq">Вопросы</a>
      </div>
      <div>
        <strong style="color:var(--ink)">Кабинет</strong>
        <a href="${OnLead.BRAND.origin}/#/login">Войти</a>
        <a href="${OnLead.BRAND.origin}/#/register">Регистрация</a>
        <a href="${OnLead.BRAND.origin}/#/office">Рабочий стол</a>
        <a href="${OnLead.BRAND.origin}/admin">Админка</a>
      </div>
      <div>
        <strong style="color:var(--ink)">Документы</strong>
        <a href="${OnLead.BRAND.origin}/#/privacy">Конфиденциальность</a>
        <a href="${OnLead.BRAND.origin}/#/offer">Оферта</a>
        <a href="${OnLead.BRAND.origin}/#/consent">Согласие на ПДн</a>
      </div>
    </div>
  </footer>`;
}

OnLead.authPage = function authPage(mode) {
  const ref = captureRef();
  const q = OnLead.hashParams();
  const invited = mode === "register" && ref;
  const emailPrefill = q.get("email") || "";
  const codePrefill = q.get("code") || "";
  const titles = {
    login: "Вход в кабинет",
    register: "72 часа всех инструментов",
    verify: "Подтвердите email",
    forgot: "Сброс пароля",
    reset: "Новый пароль",
  };
  const hints = {
    login: `Кабинет ${OnLead.BRAND.origin}.`,
    register: invited ? `Вас пригласили по коду ${OnLead.esc(ref)}. 72 часа всех инструментов.` : "Код подтверждения придёт на почту. Без карты, 72 часа всех инструментов.",
    verify: "Мы отправили 6-значный код. Он действует 60 минут.",
    forgot: "Если email есть в системе — пришлём код сброса.",
    reset: "Введите код из письма и новый пароль (от 8 символов).",
  };
  const submit = {
    login: "Войти",
    register: "Создать кабинет",
    verify: "Подтвердить",
    forgot: "Отправить код",
    reset: "Сохранить пароль",
  };
  const flash = OnLead._flash ? `<div class="notice" style="margin-bottom:12px"><div>${OnLead.esc(OnLead._flash)}</div></div>${(OnLead._flash = "") || ""}` : "";
  return `
  <div class="auth-wrap auth-split">
    <aside class="auth-panel">
      ${OnLead.brandLogo(OnLead.BRAND.origin + "/#/")}
      <div>
        <div class="sf-label">SIGNAL FIELD / ACCESS</div>
        <h2>Ваш поток<br>продолжает<br><em>работать.</em></h2>
        <p>Вернитесь к диалогам, сигналам и решениям, которые уже двигают воронку.</p>
      </div>
      <div class="muted" style="font-size:13px">72 часа всех инструментов · без карты</div>
    </aside>
    <div class="auth-card">
      ${OnLead.brandLogo(OnLead.BRAND.origin + "/#/")}
      <h1 class="serif" style="font-size:28px;margin:16px 0 6px">${titles[mode]}</h1>
      ${flash}
      <p class="muted">${hints[mode]}</p>
      <form id="auth-form" data-mode="${mode}" style="margin-top:16px">
        ${mode === "register" ? `<div class="field"><label>Имя</label><input name="name" required></div>` : ""}
        <div class="field"><label>Email</label><input name="email" type="email" value="${OnLead.esc(emailPrefill)}" required></div>
        ${mode === "login" || mode === "register" || mode === "reset" ? `<div class="field"><label>${mode === "reset" ? "Новый пароль" : "Пароль"}</label><input name="password" type="password" minlength="${mode === "login" ? 4 : 8}" required></div>` : ""}
        ${mode === "verify" || mode === "reset" ? `<div class="field"><label>Код из письма</label><input name="code" inputmode="numeric" maxlength="6" placeholder="000000" value="${OnLead.esc(codePrefill)}" required></div>` : ""}
        ${mode === "register" ? `<label class="consent"><input type="checkbox" name="consent" value="on" required> Принимаю <a href="#/offer" target="_blank" rel="noopener">оферту</a> и <a href="#/privacy" target="_blank" rel="noopener">политику конфиденциальности</a></label>` : ""}
        <button class="btn btn-primary btn-block" type="submit">${submit[mode]}</button>
      </form>
      <p class="muted" style="margin-top:14px;font-size:13px">
        ${mode === "login" ? `Нет аккаунта? <a href="#/register" style="color:var(--teal-2)">Регистрация</a> · <a href="#/forgot" style="color:var(--teal-2)">Забыли пароль?</a>` : ""}
        ${mode === "register" ? `Уже есть? <a href="#/login" style="color:var(--teal-2)">Войти</a>` : ""}
        ${mode === "verify" ? `<a href="#/login" style="color:var(--teal-2)">Назад ко входу</a> · <button type="button" class="btn btn-ghost btn-sm" data-act="resend-verify">Отправить код ещё раз</button>` : ""}
        ${mode === "forgot" || mode === "reset" ? `<a href="#/login" style="color:var(--teal-2)">Назад ко входу</a>` : ""}
      </p>
    </div>
  </div>`;
}

OnLead.bindAuth = function bindAuth() {
  const q = OnLead.hashParams();
  $("#auth-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const mode = e.target.dataset.mode;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      if (mode === "forgot") {
        await OnLead.api("/api/auth/forgot-password", { method: "POST", body: { email: fd.get("email") } });
        OnLead._flash = "Если email зарегистрирован, код отправлен";
        location.hash = `#/reset-password?email=${encodeURIComponent(fd.get("email"))}`;
        OnLead.render();
        return;
      }
      const path = {
        login: "/api/auth/login",
        register: "/api/auth/register",
        verify: "/api/auth/verify-email",
        reset: "/api/auth/reset-password",
      }[mode];
      const data = await OnLead.api(path, {
        method: "POST",
        body: {
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          code: fd.get("code"),
          ref: mode === "register" ? captureRef() : undefined,
          consent: mode === "register" ? fd.get("consent") === "on" : undefined,
        },
      });
      if (data.needsEmailVerification) {
        location.hash = `#/verify-email?email=${encodeURIComponent(data.email)}`;
        OnLead.render();
        return;
      }
      OnLead.setToken(data.token);
      location.hash = "#/office";
      OnLead.render();
    } catch (err) {
      if (err.payload?.needsEmailVerification) {
        OnLead._flash = err.message || "Подтвердите email — код из письма.";
        location.hash = `#/verify-email?email=${encodeURIComponent(err.payload.email || fd.get("email"))}`;
        OnLead.render();
        return;
      }
      OnLead._flash = err.message;
      OnLead.render();
      btn.disabled = false;
    }
  });
  document.querySelector("[data-act=resend-verify]")?.addEventListener("click", async () => {
    const email = $("[name=email]")?.value || q.get("email");
    if (!email) return;
    try {
      const data = await OnLead.api("/api/auth/resend-verification", { method: "POST", body: { email } });
      alert(data.message || "Код отправлен");
    } catch (err) {
      alert(err.message);
    }
  });
  if (q.get("email") && q.get("code") && ($("#auth-form")?.dataset.mode === "verify")) {
    $("#auth-form")?.requestSubmit();
  }
}
