/**
 * Parsers / lists + section nav + bundle hub (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.sectionNav = function sectionNav(id, path) {
  const b = OnLead.BUNDLES.find((x) => x.id === id);
  if (!b) return "";
  return `<div class="toolbar">${b.items.map((it) => {
    const itemPath = OnLead.hrefPath(it.href);
    const on = path === itemPath || path.startsWith(itemPath + "/");
    return `<a class="btn btn-sm ${on ? "btn-ink" : "btn-ghost"}" href="${it.href}">${OnLead.esc(it.label)}</a>`;
  }).join("")}</div>`;
}

OnLead.bundleHub = function bundleHub(id, state) {
  if (OnLead.vkToolsHubPage && (id === "subscribed" || id === "parsers")) {
    return OnLead.vkToolsHubPage(state, { section: id });
  }
  const b = OnLead.BUNDLES.find((x) => x.id === id);
  if (!b) return `<h1>Раздел не найден</h1>`;
  return `
    <div class="h-row">
      <div>
        <div class="muted">Раздел</div>
        <h1>${OnLead.esc(b.title)}</h1>
      </div>
    </div>
    <p class="muted" style="margin-top:0">${OnLead.esc(b.hint)}</p>
    <div class="lk-tool-list">
      ${b.items.map((it) => {
        const t = it.slug ? OnLead.tool(it.slug) : { name: it.label, summary: it.blurb || "" };
        return OnLead.toolRow(t, state, { href: it.href, label: it.label, summary: t.summary || it.blurb, badge: it.badge });
      }).join("")}
    </div>`;
}

OnLead.parserPaywall = function parserPaywall(state, slug) {
  const t = OnLead.tool(slug);
  if (!t || OnLead.toolOn(state, slug)) return "";
  return `<div class="card" style="margin-bottom:16px">
    <span class="chip">Не активирован</span>
    <h3 style="margin-top:8px">${OnLead.esc(t.name)}</h3>
    <p>${OnLead.esc(t.summary)}</p>
    <div class="toolbar">
      ${OnLead.PERIODS.map((p) => {
        const price = Math.round(t.price * p.id * (1 - p.discount));
        return `<button type="button" class="btn btn-ghost" data-act="buy-tool" data-slug="${OnLead.esc(slug)}" data-m="${p.id}" data-amount="${price}">${p.label} · ${price} ₽</button>`;
      }).join("")}
    </div>
  </div>`;
}

OnLead.parsers = function parsers(path, state) {
  if (path.endsWith("/parsing-accounts-vk") || path.endsWith("/accounts")) return OnLead.parseAccountsPage(state);
  if (path.endsWith("/parsing-groups-vk") || path.endsWith("/groups")) return OnLead.parseGroupsPage(state);
  const detail = path.match(/\/lists\/([^/]+)$/);
  if (detail) return OnLead.listDetailPage(detail[1], state);
  return OnLead.listsPage(state);
}

OnLead.listsPage = function listsPage(state) {
  const lists = state.lists || [];
  return `
    <div class="h-row">
      <div>
        <div class="muted">Парсеры и списки</div>
        <h1>Мои списки</h1>
      </div>
      <div class="toolbar" style="margin:0">
        <a class="btn btn-ghost" href="#/office/tools/parsing-accounts-vk">Парсинг аккаунтов</a>
        <a class="btn btn-primary" href="#/office/tools/parsing-groups-vk">Парсинг групп</a>
      </div>
    </div>
    <p class="muted" style="margin-top:0">Сегменты из парсеров. Отсюда копируются ID в инвайтинг и лид-менеджер, горячие можно отправить в CRM.</p>
    ${lists.length ? lists.map((l) => `<div class="list-item">
      <div>
        <b>${OnLead.esc(l.name)}</b>
        <div class="muted">${OnLead.esc(l.source || "Парсер")} · ${OnLead.esc(l.created || "")}</div>
      </div>
      <div class="match-actions">
        <b>${Number(l.count || 0).toLocaleString("ru-RU")}</b>
        <a class="btn btn-ghost btn-sm" href="#/office/tools/lists/${OnLead.esc(l.id)}">Открыть</a>
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-rename" data-id="${OnLead.esc(l.id)}" data-name="${OnLead.esc(l.name)}">Изменить</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-del" data-id="${OnLead.esc(l.id)}" data-name="${OnLead.esc(l.name)}">Удалить</button>
      </div>
    </div>`).join("") : `<div class="card muted">Списков пока нет. Соберите аудиторию в «Парсинг аккаунтов» или «Парсинг групп» — результат появится здесь.</div>`}
  `;
}

OnLead.listDetailPage = function listDetailPage(id, state) {
  const meta = (state.lists || []).find((l) => l.id === id);
  return `
    <div class="h-row">
      <div>
        <div class="muted"><a href="#/office/tools/lists">Мои списки</a></div>
        <h1>${OnLead.esc(meta?.name || "Список")}</h1>
      </div>
      <div class="toolbar" style="margin:0">
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-rename" data-id="${OnLead.esc(id)}" data-name="${OnLead.esc(meta?.name || "")}">Изменить</button>
        <button type="button" class="btn btn-ink btn-sm" data-act="list-copy" data-id="${OnLead.esc(id)}">Копировать ID</button>
        <button type="button" class="btn btn-primary btn-sm" data-act="list-crm" data-id="${OnLead.esc(id)}">В CRM</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="list-del" data-id="${OnLead.esc(id)}" data-name="${OnLead.esc(meta?.name || "список")}">Удалить</button>
      </div>
    </div>
    <p class="muted" id="list-meta">${meta ? `${Number(meta.count || 0).toLocaleString("ru-RU")} человек · ${OnLead.esc(meta.source || "")}` : "Загружаем…"}</p>
    <div id="list-people" class="card muted">Загружаем людей…</div>
  `;
}

OnLead.parseAccountsPage = function parseAccountsPage(state) {
  const t = OnLead.tool("parsing-accounts-vk");
  const on = OnLead.toolOn(state, "parsing-accounts-vk");
  return `
    <div class="h-row">
      <div>
        <div class="muted">Парсеры и списки</div>
        <h1>Парсинг аккаунтов</h1>
      </div>
      <span class="status ${on ? "on" : "off"}">${on ? "Готов" : "Не подключён"}</span>
    </div>
    ${OnLead.parserPaywall(state, "parsing-accounts-vk")}
    ${on ? `<p class="muted" style="margin-top:0">${OnLead.esc(t.summary)}</p>
    <div class="task-grid">
      <form class="card" id="parse-form" data-kind="accounts">
        ${OnLead.toolAccountSelect(state)}
        <div class="field"><label>Город</label><input name="geo" placeholder="Москва"></div>
        <div class="field"><label>Возраст</label><input name="age" placeholder="25–40"></div>
        <div class="field"><label>Пол</label>
          <select name="sex">
            <option value="0">Любой</option>
            <option value="1">Женский</option>
            <option value="2">Мужской</option>
          </select>
        </div>
        <div class="field"><label>Интересы</label><input name="int" placeholder="дизайн, ремонт, авто"></div>
        <div class="field"><label>Активность</label>
          <select name="act">
            <option value="7">Были 7 дней</option>
            <option value="14">14 дней</option>
            <option value="30">30 дней</option>
            <option value="0">Не важно</option>
          </select>
        </div>
        <div class="field"><label>Сколько собрать</label><input name="count" type="number" min="20" max="1000" value="100"></div>
        <button type="submit" class="btn btn-primary">Собрать список</button>
        <p class="muted" id="parse-status" style="margin:10px 0 0"></p>
      </form>
      <div class="card">
        <b>Что получите</b>
        <ul>${t.features.map((f) => `<li>${OnLead.esc(f)}</li>`).join("")}</ul>
        <a class="btn btn-ghost btn-sm" href="#/office/tools/lists">Открыть мои списки</a>
      </div>
    </div>` : ""}
  `;
}

OnLead.parseGroupsPage = function parseGroupsPage(state) {
  const t = OnLead.tool("parsing-groups-vk");
  const on = OnLead.toolOn(state, "parsing-groups-vk");
  return `
    <div class="h-row">
      <div>
        <div class="muted">Парсеры и списки</div>
        <h1>Парсинг групп</h1>
      </div>
      <span class="status ${on ? "on" : "off"}">${on ? "Готов" : "Не подключён"}</span>
    </div>
    ${OnLead.parserPaywall(state, "parsing-groups-vk")}
    ${on ? `<p class="muted" style="margin-top:0">${OnLead.esc(t.summary)}</p>
    <div class="task-grid">
      <form class="card" id="parse-form" data-kind="groups">
        ${OnLead.toolAccountSelect(state)}
        <div class="field"><label>Сообщество-источник</label><input name="src" placeholder="https://vk.com/club… или shortname"></div>
        <div class="field"><label>Что собирать</label>
          <select name="collect">
            <option value="members">Подписчики</option>
          </select>
        </div>
        <div class="field"><label>Пол</label>
          <select name="sex">
            <option value="0">Любой</option>
            <option value="1">Женский</option>
            <option value="2">Мужской</option>
          </select>
        </div>
        <div class="field"><label>Город содержит</label><input name="city" placeholder="Екатеринбург"></div>
        <div class="field"><label>Максимум людей</label><input name="count" type="number" min="20" max="1000" value="200"></div>
        <button type="submit" class="btn btn-primary">Запустить</button>
        <p class="muted" id="parse-status" style="margin:10px 0 0"></p>
      </form>
      <div class="card">
        <b>Куда дальше</b>
        <ul>${t.features.map((f) => `<li>${OnLead.esc(f)}</li>`).join("")}</ul>
        <div class="toolbar">
          <a class="btn btn-ghost btn-sm" href="#/office/tools/lists">Мои списки</a>
          <a class="btn btn-ghost btn-sm" href="#/office/tools/invite-vk">Инвайтинг</a>
        </div>
      </div>
    </div>` : ""}
  `;
}
