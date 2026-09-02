window.OnLead = window.OnLead || {};

OnLead.legalOperator = function () {
  const L = (OnLead.health && OnLead.health.legal) || {};
  return {
    name: L.operator || "OnLead",
    email: L.email || "",
    inn: L.inn || "",
    ogrn: L.ogrn || "",
    address: L.address || "",
    site: L.site || (typeof location !== "undefined" ? location.origin : "https://onlead.m360-ural.online"),
    requisitesReady: !!L.requisitesReady,
  };
};

OnLead.legalPage = function (kind) {
  const o = OnLead.legalOperator();
  const mail = o.email ? `<a href="mailto:${escLegal(o.email)}">${escLegal(o.email)}</a>` : "адрес электронной почты оператора (укажите LEGAL_EMAIL в конфигурации)";
  const inn = o.inn ? `ИНН ${escLegal(o.inn)}` : "ИНН будет указан после заполнения в админке";
  const ogrn = o.ogrn ? `, ОГРН ${escLegal(o.ogrn)}` : "";
  const addr = o.address ? escLegal(o.address) : "адрес будет указан после заполнения в админке";
  const reqNote = o.requisitesReady
    ? ""
    : `<p class="muted">Реквизиты оператора задаются в админке OnLead (Настройки → Юридические данные) или переменными LEGAL_* в .env.prod. ИНН проверяется по контрольной сумме ФНС и не подставляется автоматически.</p>`;

  if (kind === "offer") {
    return legalShell("Публичная оферта", `
      ${reqNote}
      <p>Настоящий документ является предложением ${escLegal(o.name)} (${inn}${ogrn}, ${addr}, сайт ${escLegal(o.site)}) заключить договор на использование сервиса OnLead.</p>
      <h2>1. Предмет</h2>
      <p>Сервис предоставляет доступ к кабинету автоматизации ВКонтакте: инструменты, лендинги, CRM заявок, биллинг. Telegram-воронки отвечают через webhook бота по сохранённым текстам.</p>
      <h2>2. Оплата</h2>
      <p>Оплата принимается через ЮKassa. Чек направляется на email, указанный в профиле. Подписка и отдельные инструменты активируются после подтверждённого платежа.</p>
      <h2>3. Триал</h2>
      <p>Бесплатный период 72 часа не требует карты. Оператор вправе отказать в повторном триале при злоупотреблении.</p>
      <h2>4. Ограничения</h2>
      <p>Пользователь соблюдает правила VK и применимое законодательство. Запрещены спам, обход блокировок, обработка чужих персональных данных без оснований.</p>
      <h2>5. Ответственность</h2>
      <p>Сервис предоставляется «как есть». Данные кабинета хранятся в SQLite по отдельным таблицам сущностей. JSON-копия, ротация на сервере и копия в объектное хранилище — страховка, не гарантия отсутствия потерь.</p>
      <h2>6. Контакты</h2>
      <p>По оферте: ${mail}.</p>
    `);
  }

  if (kind === "consent") {
    return legalShell("Согласие на обработку персональных данных", `
      ${reqNote}
      <p>Отправляя форму на лендинге или регистрируясь в кабинете, вы даёте ${escLegal(o.name)} согласие на обработку указанных вами данных (имя, телефон, email, комментарий, технические логи) в целях ответа на заявку, исполнения договора и работы кабинета.</p>
      <p>Согласие действует до отзыва. Отозвать можно письмом на ${mail}. Правовые основания и перечень данных — в <a href="#/privacy">политике конфиденциальности</a>.</p>
    `);
  }

  return legalShell("Политика конфиденциальности", `
    ${reqNote}
    <p>Оператор: ${escLegal(o.name)}, ${inn}${ogrn}, ${addr}. Сайт: ${escLegal(o.site)}. Связь: ${mail}.</p>
    <h2>1. Какие данные обрабатываем</h2>
    <ul>
      <li>Кабинет: email, имя, пароль в виде хеша, платежные статусы, реферальный код.</li>
      <li>Лендинги: имя, телефон, email, комментарий заявки.</li>
      <li>Интеграции: токены VK и Telegram в зашифрованном виде, идентификаторы сообществ.</li>
      <li>Технические: IP, User-Agent, cookies/sessionStorage для сессии кабинета.</li>
    </ul>
    <h2>2. Цели</h2>
    <p>Регистрация и вход, оказание услуг автоматизации, обработка заявок с лендингов, оплата и чеки 54-ФЗ, связь по сервису, безопасность (лимиты запросов).</p>
    <h2>3. Правовые основания</h2>
    <p>Исполнение договора-оферты, согласие субъекта (формы заявок и регистрация), законные интересы в части безопасности сервиса. Обработка ведётся с учётом 152-ФЗ.</p>
    <h2>4. Передача третьим лицам</h2>
    <p>ЮKassa — приём оплаты и фискализация. VK / Telegram — по вашему подключению токена. SMTP-провайдер — доставка писем. Хостинг — размещение сервера.</p>
    <h2>5. Срок и права</h2>
    <p>Данные кабинета хранятся, пока аккаунт активен, и разумный срок после удаления для бухгалтерии и споров. Вы можете запросить доступ, уточнение или удаление, написав на ${mail}.</p>
    <h2>6. Cookies</h2>
    <p>Используем локальное хранилище браузера для сессии кабинета. Сторонней рекламной аналитики нет.</p>
  `);
};

function legalShell(title, body) {
  const origin = (typeof OnLead !== "undefined" && OnLead.BRAND && OnLead.BRAND.origin) || "";
  return `
  <header class="pub-head">
    <div class="inner">
      <a class="logo" href="${origin}/#/"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span></a>
      <nav class="nav-pub">
        <a href="${origin}/#/privacy">Конфиденциальность</a>
        <a href="${origin}/#/offer">Оферта</a>
        <a href="${origin}/#/consent">Согласие</a>
      </nav>
      <div class="head-actions">
        <a class="btn btn-ghost btn-sm pub-login" href="${origin}/#/login">Войти</a>
        <details class="pub-menu">
          <summary class="pub-burger" aria-label="Меню"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg></summary>
          <nav class="pub-sheet">
            <a href="${origin}/#/privacy">Конфиденциальность</a>
            <a href="${origin}/#/offer">Оферта</a>
            <a href="${origin}/#/consent">Согласие</a>
            <a class="btn btn-ghost" href="${origin}/#/login">Войти</a>
            <a class="btn btn-primary" href="${origin}/#/">На главную</a>
          </nav>
        </details>
      </div>
    </div>
  </header>
  <article class="legal-doc wrap">
    <p class="muted" style="margin:0 0 8px"><a href="${origin}/#/">На главную</a></p>
    <h1>${title}</h1>
    ${body}
    <p class="muted" style="margin-top:28px">OnLead · ${title}</p>
  </article>`;
}

function escLegal(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
