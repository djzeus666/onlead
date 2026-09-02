const TOKEN = 'onlead-admin-token';
const $ = (s, r = document) => r.querySelector(s);
const NAV = [
  ['/', 'Обзор'],
  ['/users', 'Пользователи'],
  ['/accounts', 'VK-аккаунты'],
  ['/tools', 'Инструменты'],
  ['/jobs', 'Задачи и воркер'],
  ['/ai', 'ИИ-модели'],
  ['/logs', 'Логи'],
  ['/settings', 'Настройки'],
];
const MENU_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg>';

function token() { return sessionStorage.getItem(TOKEN); }
function setToken(t) { t ? sessionStorage.setItem(TOKEN, t) : sessionStorage.removeItem(TOKEN); }

let modalResolve = null;

function modalHtml() {
  return `<div class="adm-modal" id="adm-modal" hidden>
    <button type="button" class="adm-modal-backdrop" data-adm="modal-cancel" aria-label="Закрыть"></button>
    <div class="adm-modal-card" role="dialog" aria-modal="true" aria-labelledby="adm-modal-text">
      <p id="adm-modal-text"></p>
      <div class="adm-modal-acts">
        <button type="button" class="btn btn-ghost" id="adm-modal-cancel" data-adm="modal-cancel">Отмена</button>
        <button type="button" class="btn btn-primary" id="adm-modal-ok" data-adm="modal-ok">OK</button>
      </div>
    </div>
  </div>`;
}

function openAdmModal({ text, ok = 'OK', cancel = '' }) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    const box = $('#adm-modal');
    const msg = $('#adm-modal-text');
    const cancelBtn = $('#adm-modal-cancel');
    const okBtn = $('#adm-modal-ok');
    if (!box || !msg) {
      resolve(!cancel);
      return;
    }
    msg.textContent = text;
    if (okBtn) okBtn.textContent = ok;
    if (cancelBtn) {
      cancelBtn.hidden = !cancel;
      cancelBtn.textContent = cancel || 'Отмена';
    }
    box.hidden = false;
    okBtn?.focus();
  });
}

function closeAdmModal(value) {
  const box = $('#adm-modal');
  if (box) box.hidden = true;
  const done = modalResolve;
  modalResolve = null;
  if (done) done(value);
}

function note(text) {
  return openAdmModal({ text, ok: 'Понятно' });
}

function ask(text) {
  return openAdmModal({ text, ok: 'Да', cancel: 'Отмена' });
}

function navLinks(path) {
  return NAV.map(([h, l]) => `<a href="#${h}" class="${path === h ? 'on' : ''}">${l}</a>`).join('');
}

function pageTitle(path) {
  return (NAV.find(([h]) => h === path) || ['', 'Админка'])[1];
}

function setAdmNav(open) {
  const root = document.querySelector('.adm');
  const sheet = $('#adm-sheet');
  const burger = $('#adm-nav-toggle');
  if (!root) return;
  root.classList.toggle('nav-open', !!open);
  if (sheet) {
    if (open) sheet.removeAttribute('inert');
    else sheet.setAttribute('inert', '');
  }
  burger?.setAttribute('aria-expanded', open ? 'true' : 'false');
  burger?.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
}

function ensureAdmUi() {
  if (window._admUi) return;
  window._admUi = true;
  document.addEventListener('click', (e) => {
    if (e.target.closest('.adm-sheet a')) setAdmNav(false);
    const btn = e.target.closest('[data-adm]');
    if (!btn) return;
    const act = btn.dataset.adm;
    if (act === 'nav-toggle') {
      const root = document.querySelector('.adm');
      setAdmNav(!root?.classList.contains('nav-open'));
      return;
    }
    if (act === 'nav-close') {
      setAdmNav(false);
      return;
    }
    if (act === 'modal-ok') {
      closeAdmModal(true);
      return;
    }
    if (act === 'modal-cancel') {
      closeAdmModal(false);
      return;
    }
    if (act === 'logout') {
      ask('Выйти из админки?').then((ok) => {
        if (!ok) return;
        setToken(null);
        location.hash = '#/login';
        render();
      });
    }
  });
  document.addEventListener('keydown', (e) => {
    const modal = $('#adm-modal');
    if (modal && !modal.hidden) {
      if (e.key === 'Escape') closeAdmModal(false);
      if (e.key === 'Enter') {
        e.preventDefault();
        closeAdmModal(true);
      }
      return;
    }
    if (e.key === 'Escape') setAdmNav(false);
  });
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  if (token()) headers.Authorization = 'Bearer ' + token();
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.status);
  return data;
}

const routes = {
  '/': overview,
  '/users': users,
  '/accounts': accounts,
  '/tools': tools,
  '/jobs': jobs,
  '/logs': logs,
  '/ai': aiModels,
  '/settings': settings,
};

async function render() {
  document.body.classList.add('is-adm');
  ensureAdmUi();
  const path = location.hash.replace('#', '') || '/';
  const root = document.getElementById('app');
  if (!token() && path !== '/login') {
    root.innerHTML = loginView();
    $('#login-form')?.addEventListener('submit', onLogin);
    return;
  }
  if (!token()) {
    root.innerHTML = loginView();
    $('#login-form')?.addEventListener('submit', onLogin);
    return;
  }
  let html;
  try {
    html = await (routes[path] || overview)();
  } catch (e) {
    if (/авториз|401/i.test(e.message)) { setToken(null); return render(); }
    html = `<div class="page"><p>${esc(e.message)}</p></div>`;
  }
  root.innerHTML = shell(path, html);
  bind();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function loginView() {
  return `<div class="admin-login">
    <form class="auth-card" id="login-form">
      <div class="logo"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span> <span class="muted" style="font-weight:550">Admin</span></div>
      <h1 class="serif" style="font-size:28px">Панель управления</h1>
      <p class="muted">https://onlead.m360-ural.online/admin</p>
      <div class="field"><label>Email</label><input name="email" autocomplete="username"></div>
      <div class="field"><label>Пароль</label><input name="password" type="password" autocomplete="current-password"></div>
      <button class="btn btn-primary btn-block" type="submit">Войти</button>
    </form>
  </div>${modalHtml()}`;
}

async function onLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector('button[type=submit]');
  if (btn) btn.disabled = true;
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: { email: fd.get('email'), password: fd.get('password') } });
    if (data.user?.role !== 'admin') throw new Error('Это не администратор');
    setToken(data.token);
    location.hash = '#/';
    render();
  } catch (err) {
    if (btn) btn.disabled = false;
    await note(err.message);
  }
}

function shell(path, inner) {
  const links = navLinks(path);
  return `<div class="adm">
    <aside class="adm-rail">
      <a class="adm-logo" href="#/"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span> <i>Admin</i></a>
      <nav class="adm-nav">${links}</nav>
      <div class="adm-rail-foot">
        <a class="btn btn-ghost btn-sm" href="/">Кабинет</a>
        <button type="button" class="btn btn-ghost btn-sm" data-adm="logout">Выйти</button>
      </div>
    </aside>
    <div class="adm-main">
      <header class="adm-top">
        <button type="button" class="adm-burger" id="adm-nav-toggle" data-adm="nav-toggle" aria-label="Меню" aria-expanded="false">${MENU_ICON}</button>
        <b>${esc(pageTitle(path))}</b>
        <a class="btn btn-ghost btn-sm" href="/">Кабинет</a>
      </header>
      <button type="button" class="adm-scrim" data-adm="nav-close" aria-label="Закрыть меню"></button>
      <nav class="adm-sheet" id="adm-sheet" inert>
        ${links}
        <a href="/">Кабинет</a>
        <button type="button" data-adm="logout">Выйти</button>
      </nav>
      <div class="page">${inner}</div>
    </div>
    ${modalHtml()}
  </div>`;
}

async function overview() {
  const d = await api('/api/admin/overview');
  const L = d.legal || {};
  const C = d.contour || {};
  const B = C.backups || {};
  const legalWarn = L.requisitesReady
    ? ''
    : `<div class="card" style="margin-bottom:16px">
        <b>Реквизиты 152-ФЗ не заполнены</b>
        <p class="muted" style="margin:8px 0 12px">Страницы #/privacy и #/offer остаются черновиком, пока нет оператора и ИНН. Внесите реквизиты в <a href="#/settings">Настройках</a>, когда будут под рукой. Чужие компании не подставляйте.</p>
      </div>`;
  const yesNo = (v) => (v ? 'да' : 'нет');
  return `${legalWarn}<h1 class="serif">Обзор платформы</h1>
    <div class="kpi">
      <div class="card"><span>Пользователи</span><b>${d.users}</b></div>
      <div class="card"><span>VK-аккаунты</span><b>${d.accounts}</b></div>
      <div class="card"><span>Кампании running</span><b>${d.campaignsRunning}</b></div>
      <div class="card"><span>Лиды</span><b>${d.leads}</b></div>
      <div class="card"><span>Ожидают оплату</span><b>${d.pendingPayments || 0}</b></div>
    </div>
    <h3>Контур</h3>
    <div class="kpi">
      <div class="card"><span>SQLite схема</span><b>${esc(C.storageSchema ?? '—')}</b></div>
      <div class="card"><span>ЮKassa live</span><b>${yesNo(C.paymentsLive)}</b></div>
      <div class="card"><span>Telegram webhook</span><b>${yesNo(C.telegramLive)}</b></div>
      <div class="card"><span>Почта SMTP</span><b>${yesNo(C.mailConfigured)}</b></div>
      <div class="card"><span>Ключ шифрования</span><b>${yesNo(C.encryptionKey)}</b></div>
      <div class="card"><span>ИИ подключён</span><b>${yesNo(C.aiConfigured)}</b></div>
      <div class="card"><span>MinIO бэкап</span><b>${yesNo(B.remoteOk)}</b></div>
      <div class="card"><span>Geo S3</span><b>${B.geoConfigured ? yesNo(B.geoOk) : 'не задан'}</b></div>
    </div>
    ${(d.brokenBots || []).length ? `<div class="card" style="margin:16px 0">
      <b>Telegram-боты без рабочего токена</b>
      <p class="muted" style="margin:8px 0 0">Воронки по этим ботам не отвечают. Клиент должен нажать «Заменить токен» в кабинете (Telegram → Боты).</p>
      <ul style="margin:8px 0 0">${d.brokenBots.map((b) => `<li>${esc(b.name || b.id)} ${esc(b.username || '')} — ${esc(b.status)}</li>`).join('')}</ul>
    </div>` : ''}
    <h3>Инструменты</h3>
    <table class="table"><thead><tr><th>Slug</th><th>Включён</th><th>Кампаний</th></tr></thead>
    <tbody>${d.tools.map((t) => `<tr><td>${esc(t.slug)}</td><td>${t.enabled ? 'да' : 'нет'}</td><td>${t.campaigns}</td></tr>`).join('')}</tbody></table>`;
}

async function users() {
  const list = await api('/api/admin/users');
  return `<h1 class="serif">Пользователи</h1>
    <p class="muted">«На счёт» — баланс кабинета (₽). «+ AI» — кредиты Image AI (1 кредит = 1 картинка).</p>
    <table class="table"><thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Баланс</th><th>Кредиты AI</th><th>Триал</th><th></th></tr></thead>
    <tbody>${list.map((u) => `<tr>
      <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td>
      <td>${u.balance} ₽</td>
      <td>${u.aiCredits ?? 100}</td>
      <td>${u.trialUntil && u.trialUntil > Date.now() ? 'да' : '—'}</td>
      <td>
        <div class="adm-acts">
          <button class="btn btn-ghost btn-sm" data-act="ban" data-id="${u.id}" data-v="${u.banned ? 0 : 1}">${u.banned ? 'Разбан' : 'Бан'}</button>
          <button class="btn btn-ghost btn-sm" data-act="trial" data-id="${u.id}">+72ч</button>
          <button class="btn btn-ghost btn-sm" data-act="bal" data-id="${u.id}">+1000 ₽</button>
        </div>
        ${u.role === 'admin' ? '' : `<form class="adm-credit" data-credit="${u.id}">
          <input name="amount" type="number" min="100" max="300000" step="100" placeholder="₽" required>
          <button class="btn btn-primary btn-sm" type="submit">На счёт</button>
        </form>
        <form class="adm-ai-credits" data-user="${u.id}" style="margin-top:6px">
          <input name="credits" type="number" min="1" max="100000" step="10" placeholder="Кредиты" required>
          <button class="btn btn-ghost btn-sm" type="submit">+ AI</button>
        </form>`}
      </td>
    </tr>`).join('')}</tbody></table>`;
}

async function accounts() {
  const list = await api('/api/admin/accounts');
  return `<h1 class="serif">VK-аккаунты</h1>
    <p class="muted">Токены зашифрованы (AES-256-GCM, как в post2post). Здесь только маска.</p>
    <table class="table"><thead><tr><th>Имя</th><th>VK id</th><th>Пользователь</th><th>Токен</th></tr></thead>
    <tbody>${list.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.vkId)}</td><td>${esc(a.userEmail)}</td><td>${esc(a.tokenMask)}</td></tr>`).join('')}</tbody></table>`;
}

async function tools() {
  const s = await api('/api/admin/settings');
  const flags = s.toolsEnabled || {};
  const slugs = s.toolSlugs || Object.keys(flags);
  return `<h1 class="serif">Флаги инструментов</h1>
    <p class="muted">Выключенный инструмент недоступен всем кабинетам, даже на триале.</p>
    ${slugs.map((slug) => `<div class="flag">
      <b>${esc(slug)}</b>
      <button class="btn ${flags[slug] !== false ? 'btn-primary' : 'btn-ghost'} btn-sm" data-act="flag" data-slug="${slug}" data-v="${flags[slug] === false ? 1 : 0}">
        ${flags[slug] === false ? 'Включить' : 'Выключить'}
      </button>
    </div>`).join('')}`;
}

async function jobs() {
  const d = await api('/api/admin/jobs');
  return `<div class="h-row"><h1 class="serif">Задачи</h1>
      <div class="toolbar" style="margin:0"><button class="btn btn-primary btn-sm" data-act="tick">Прогнать воркер сейчас</button></div></div>
    <h3>Кампании</h3>
    <table class="table"><thead><tr><th>Инструмент</th><th>Статус</th><th>OK / fail</th><th>Последнее</th><th></th></tr></thead>
    <tbody>${(d.campaigns || []).map((c) => `<tr>
      <td>${esc(c.slug)}</td><td>${esc(c.status)}</td>
      <td>${c.stats?.ok || 0} / ${c.stats?.fail || 0}</td>
      <td>${esc(c.stats?.lastAdminMessage || c.stats?.lastMessage || '')}</td>
      <td><button class="btn btn-ghost btn-sm" data-act="stop" data-id="${c.id}">Стоп</button></td>
    </tr>`).join('')}</tbody></table>
    <h3>Журнал шагов</h3>
    <table class="table"><thead><tr><th>Время</th><th>Slug</th><th>OK</th><th>Сообщение</th></tr></thead>
    <tbody>${(d.jobs || []).slice(0, 40).map((j) => `<tr><td>${esc(j.at)}</td><td>${esc(j.slug)}</td><td>${j.ok ? 'да' : 'нет'}</td><td>${esc(j.message)}</td></tr>`).join('')}</tbody></table>`;
}

async function logs() {
  const list = await api('/api/admin/logs');
  return `<h1 class="serif">Логи</h1>
    <table class="table"><thead><tr><th>Время</th><th>Уровень</th><th>Сообщение</th></tr></thead>
    <tbody>${list.map((l) => `<tr><td>${esc(l.at)}</td><td>${esc(l.level)}</td><td>${esc(l.message)}</td></tr>`).join('')}</tbody></table>`;
}

async function aiModels() {
  const d = await api('/api/admin/ai');
  const cfg = d.config || {};
  const q = (window._aiFilter || '').trim().toLowerCase();
  const catalog = (d.catalog || []).filter((p) => {
    if (!q) return true;
    return [p.name, p.id, p.baseUrl, ...(p.models || []), ...(p.imageModels || [])].join(' ').toLowerCase().includes(q);
  });
  const picked = window._aiPick ? (d.catalog || []).find((p) => p.id === window._aiPick) : null;
  const selected = picked || (d.catalog || []).find((p) => p.id === cfg.providerId) || null;
  const pickId = selected?.id || cfg.providerId || '';
  const fromPick = Boolean(picked);
  const providerId = fromPick ? picked.id : (cfg.providerId || '');
  const baseUrl = fromPick ? (picked.baseUrl || '') : (cfg.baseUrl || selected?.baseUrl || '');
  const model = fromPick ? (picked.models?.[0] || '') : (cfg.model || '');
  const savedImage = /@/.test(cfg.imageModel || '') ? '' : (cfg.imageModel || '');
  const imageModel = fromPick ? (picked.imageModels?.[0] || '') : savedImage;
  window._aiCatalog = d.catalog || [];
  return `<h1 class="serif">ИИ-модели</h1>
    <p class="muted">Каталог и base URL — из
      <a href="${esc(d.source)}" target="_blank" rel="noopener">awesome-freellm-apis</a>.
      Выберите провайдера, получите ключ по ссылке и сохраните. Для картинок SMM нужны image-модели (Gemini, OpenAI, Pollinations, SiliconFlow).</p>
    <form class="card" id="ai-form" autocomplete="off" style="margin-bottom:18px">
      <input type="text" name="username" autocomplete="username" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0">
      <input type="password" name="password" autocomplete="current-password" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0">
      <div class="field"><label>Провайдер</label>
        <input name="providerId" id="ai-provider" autocomplete="off" value="${esc(providerId)}" placeholder="groq">
      </div>
      <div class="field"><label>Base URL</label>
        <input name="baseUrl" id="ai-base" autocomplete="off" value="${esc(baseUrl)}" placeholder="https://api.groq.com/openai/v1">
      </div>
      <div class="field"><label>Текстовая модель</label>
        <input name="chatModel" id="ai-model" autocomplete="off" list="ai-model-list" value="${esc(model)}" placeholder="llama-3.3-70b-versatile">
        <datalist id="ai-model-list">${(selected?.models || []).map((m) => `<option value="${esc(m)}"></option>`).join('')}</datalist>
      </div>
      <div class="field"><label>Модель картинок</label>
        <input name="imageGenModel" id="ai-image" autocomplete="off" list="ai-image-list" value="${esc(imageModel)}" placeholder="gemini-2.5-flash-image или пусто, если провайдер без картинок">
        <datalist id="ai-image-list">${(selected?.imageModels || []).map((m) => `<option value="${esc(m)}"></option>`).join('')}</datalist>
        <p class="muted" style="margin:6px 0 0">${selected?.imageModels?.length ? 'Из каталога: ' + esc(selected.imageModels.join(', ')) : 'У этого провайдера нет image-модели — поле должно быть пустым.'}</p>
      </div>
      <div class="field"><label>API-ключ ${cfg.keyMask ? `<span class="muted">сейчас ${esc(cfg.keyMask)}</span>` : ''}</label>
        <input name="providerKey" id="ai-key" type="text" spellcheck="false" autocomplete="new-password" data-lpignore="true" data-1p-ignore="true" placeholder="${cfg.configured ? 'Оставьте пустым, чтобы не менять' : 'Вставьте ключ'}">
        ${selected?.keyUrl ? `<p class="muted" style="margin:6px 0 0"><a href="${esc(selected.keyUrl)}" target="_blank" rel="noopener">Получить ключ →</a></p>` : ''}
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" type="submit">Сохранить</button>
        <button class="btn btn-ghost" type="button" data-act="ai-test">Проверить чат</button>
        <button class="btn btn-ghost" type="button" data-act="ai-test-image">Проверить картинку</button>
      </div>
      <p class="muted" id="ai-status" style="margin:10px 0 0"></p>
    </form>
    <div class="h-row"><h3 style="margin:0">Каталог провайдеров</h3>
      <input id="ai-filter" value="${esc(window._aiFilter || '')}" placeholder="Поиск: groq, gemini, nvidia…" style="max-width:280px">
    </div>
    <table class="table"><thead><tr>
      <th></th><th>Провайдер</th><th>Base URL</th><th>Карта</th><th>Текст</th><th>Картинки</th><th>Ключ</th>
    </tr></thead>
    <tbody>${catalog.map((p) => `<tr class="${p.id === pickId ? 'on' : ''}">
      <td><button class="btn btn-ghost btn-sm" data-act="ai-pick" data-id="${esc(p.id)}">${p.id === pickId ? 'Выбран' : 'Выбрать'}</button></td>
      <td><b>${esc(p.name)}</b>${p.recommended ? ' <span class="chip">рекомендуем</span>' : ''}${p.note ? `<div class="muted">${esc(p.note)}</div>` : ''}</td>
      <td><code>${esc(p.baseUrl || '—')}</code></td>
      <td>${esc(p.creditCardLabel)}</td>
      <td class="muted">${esc((p.models || []).slice(0, 2).join(', ') || '—')}</td>
      <td>${(p.imageModels || []).length ? esc(p.imageModels.slice(0, 2).join(', ')) : '<span class="muted">нет</span>'}</td>
      <td><a href="${esc(p.keyUrl)}" target="_blank" rel="noopener">Получить ключ →</a></td>
    </tr>`).join('')}</tbody></table>`;
}

async function settings() {
  const s = await api('/api/admin/settings');
  const L = s.legal || {};
  return `<h1 class="serif">Настройки</h1>
    <form class="card" id="set-form" style="max-width:560px">
      <div class="field"><label>Часы триала</label><input name="trialHours" type="number" value="${s.trialHours}"></div>
      <div class="field"><label>Пауза VK, мс</label><input name="pauseMs" type="number" value="${s.pauseMs}"></div>
      <div class="field"><label>Дневной лимит действий</label><input name="dailyLimit" type="number" value="${s.dailyLimit}"></div>
      <div class="field"><label>VK App ID</label><input name="vkAppId" value="${esc(s.vkAppId || '')}" placeholder="5530956">
        <p class="muted" style="margin:6px 0 0">По умолчанию 5530956 + <code>https://oauth.vk.com/blank.html</code> (как online-lead.ru).</p>
      </div>
      <div class="field"><label>VK Messages App ID</label><input name="vkMessagesAppId" value="${esc(s.vkMessagesAppId || '')}" placeholder="6463690">
        <p class="muted" style="margin:6px 0 0">По умолчанию 6463690 (как online-lead.ru). Kate Mobile 2685278 VK часто блокирует.</p>
      </div>
      <div class="field">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" name="vkMessagesUiEnabled" value="1" ${s.vkMessagesUiEnabled === true ? 'checked' : ''}>
          <span>Показывать в кабинете блок «Токен VK для личных сообщений»</span>
        </label>
        <p class="muted" style="margin:6px 0 0">Сейчас по умолчанию выключено (VK часто блокирует OAuth Kate). Пока выключено — автопоздравления идут на стену. Включите, когда появится рабочий способ получить messages-токен.</p>
      </div>
      <h3>Юридические данные (152-ФЗ)</h3>
      <p class="muted">ИНН не выдумывается. Если поле непустое, сервер проверяет контрольную сумму ФНС (10 или 12 цифр). После сохранения #/privacy и #/offer берут эти поля.</p>
      <div class="field"><label>Оператор (ООО / ИП)</label><input name="legalOperator" value="${esc(L.operator || '')}" placeholder="ООО «…»"></div>
      <div class="field"><label>ИНН</label><input name="legalInn" value="${esc(L.inn || '')}" inputmode="numeric" placeholder="10 или 12 цифр, с контрольной суммой"></div>
      <div class="field"><label>ОГРН / ОГРНИП</label><input name="legalOgrn" value="${esc(L.ogrn || '')}" inputmode="numeric"></div>
      <div class="field"><label>Адрес</label><input name="legalAddress" value="${esc(L.address || '')}"></div>
      <div class="field"><label>Email оператора</label><input name="legalEmail" type="email" value="${esc(L.email || '')}"></div>
      <button class="btn btn-primary">Сохранить</button>
    </form>`;
}

function bind() {
  setAdmNav(false);
  document.querySelectorAll('form.adm-credit').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.credit;
      const amount = Math.round(Number(new FormData(form).get('amount')));
      const btn = form.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;
      try {
        if (!Number.isFinite(amount) || amount < 100) throw new Error('Минимум 100 ₽');
        const ok = await ask(`Начислить ${amount.toLocaleString('ru-RU')} ₽ на счёт кабинета?`);
        if (!ok) return;
        await api('/api/admin/users/' + id, { method: 'PATCH', body: { credit: amount } });
        render();
      } catch (err) {
        await note(err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  });
  document.querySelectorAll('form.adm-ai-credits').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.user;
      const credits = Math.round(Number(new FormData(form).get('credits')));
      const btn = form.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;
      try {
        if (!Number.isFinite(credits) || credits < 1) throw new Error('Минимум 1 кредит');
        const ok = await ask(`Начислить ${credits} кредитов Image AI?`);
        if (!ok) return;
        await api('/api/admin/users/' + id, { method: 'PATCH', body: { aiCredits: credits } });
        render();
      } catch (err) {
        await note(err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  });
  $('#set-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/api/admin/settings', {
        method: 'PATCH',
        body: {
          trialHours: Number(fd.get('trialHours')),
          pauseMs: Number(fd.get('pauseMs')),
          dailyLimit: Number(fd.get('dailyLimit')),
          vkAppId: fd.get('vkAppId'),
          vkMessagesAppId: fd.get('vkMessagesAppId'),
          vkMessagesUiEnabled: fd.get('vkMessagesUiEnabled') === '1',
          legal: {
            operator: fd.get('legalOperator'),
            inn: fd.get('legalInn'),
            ogrn: fd.get('legalOgrn'),
            address: fd.get('legalAddress'),
            email: fd.get('legalEmail'),
          },
        },
      });
      render();
    } catch (err) {
      await note(err.message);
    }
  });
  $('#ai-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const status = $('#ai-status');
    try {
      if (status) status.textContent = 'Сохраняем…';
      await api('/api/admin/ai', {
        method: 'PATCH',
        body: {
          providerId: fd.get('providerId'),
          baseUrl: fd.get('baseUrl'),
          model: fd.get('chatModel'),
          imageModel: fd.get('imageGenModel'),
          apiKey: fd.get('providerKey'),
        },
      });
      window._aiPick = String(fd.get('providerId') || '');
      render();
    } catch (err) {
      if (status) status.textContent = err.message;
      else await note(err.message);
    }
  });
  $('#ai-filter')?.addEventListener('change', (e) => {
    window._aiFilter = e.target.value;
    render();
  });
  document.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const act = btn.dataset.act;
      try {
        if (act === 'ban') {
          const ok = await ask(btn.dataset.v === '1' ? 'Заблокировать этого пользователя?' : 'Снять блокировку с пользователя?');
          if (!ok) return;
          await api('/api/admin/users/' + btn.dataset.id, { method: 'PATCH', body: { banned: btn.dataset.v === '1' } });
        }
        if (act === 'trial') await api('/api/admin/users/' + btn.dataset.id, { method: 'PATCH', body: { trialHours: 72 } });
        if (act === 'bal') {
          const ok = await ask('Начислить 1 000 ₽ на счёт кабинета?');
          if (!ok) return;
          await api('/api/admin/users/' + btn.dataset.id, { method: 'PATCH', body: { credit: 1000 } });
        }
        if (act === 'flag') {
          const on = btn.dataset.v === '1';
          const ok = await ask(on ? 'Включить инструмент для всех кабинетов?' : 'Выключить инструмент для всех кабинетов?');
          if (!ok) return;
          await api('/api/admin/settings', { method: 'PATCH', body: { toolsEnabled: { [btn.dataset.slug]: on } } });
        }
        if (act === 'stop') {
          const ok = await ask('Остановить эту кампанию?');
          if (!ok) return;
          await api('/api/admin/campaigns/' + btn.dataset.id + '/stop', { method: 'POST' });
        }
        if (act === 'tick') await api('/api/admin/tick', { method: 'POST' });
        if (act === 'ai-pick') {
          const p = (window._aiCatalog || []).find((x) => x.id === btn.dataset.id);
          window._aiPick = btn.dataset.id;
          if (p) {
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
            set('ai-provider', p.id);
            set('ai-base', p.baseUrl || '');
            set('ai-model', p.models?.[0] || '');
            set('ai-image', p.imageModels?.[0] || '');
          }
          render();
          return;
        }
        if (act === 'ai-test') {
          const status = $('#ai-status');
          if (status) status.textContent = 'Проверяем чат…';
          const res = await api('/api/admin/ai/test', { method: 'POST' });
          if (status) status.textContent = `OK · ${res.model} · ${res.reply || ''}`;
          return;
        }
        if (act === 'ai-test-image') {
          const status = $('#ai-status');
          if (status) status.textContent = 'Генерируем тестовую картинку…';
          const res = await api('/api/admin/ai/test-image', { method: 'POST' });
          if (status) status.innerHTML = `OK · <a href="${esc(res.url)}" target="_blank" rel="noopener">открыть картинку</a>`;
          return;
        }
        render();
      } catch (err) { await note(err.message); }
    });
  });
}

window.addEventListener('hashchange', render);
render();
