/**
 * VK tools hub + tool page UI (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.toolsHub = function toolsHub(state) {
  if (OnLead.vkToolsHubPage) return OnLead.vkToolsHubPage(state);
  const connected = OnLead.TOOLS.filter((t) => OnLead.toolOn(state, t.slug)).length;
  return `<div class="h-row"><div><h1>Инструменты VK</h1><p class="muted">Каждый сервис — отдельный экран. Подключите аккаунт и запустите задачу.</p></div>
      <span class="muted">в работе ${connected} из ${OnLead.TOOLS.length}</span></div>
    <div class="lk-tool-list">
      ${OnLead.TOOLS.map((t) => OnLead.toolRow(t, state)).join("")}
    </div>`;
}

OnLead.toolAccountSelect = function toolAccountSelect(state) {
  if (!state.accounts.length) {
    return `<p class="muted">Сначала <a href="#/office/accounts">подключите VK-аккаунт</a>.</p>`;
  }
  return `<div class="field"><label>VK-аккаунт</label>
    <select name="accountId">${state.accounts.map((a) => `<option value="${OnLead.esc(a.id)}" ${a.id === state.activeAccount ? "selected" : ""}>${OnLead.esc(a.name)}</option>`).join("")}</select>
  </div>`;
}

OnLead.fmtWhen = function fmtWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

OnLead.isTechnicalMessage = function isTechnicalMessage(s) {
  return /image-модел|админк|API-ключ|провайдер|Base URL|HTTP \d|OpenRouter|Pollinations|YooKassa|TOKEN_|encrypt|stack|gemini-2|llama-3|dall-e|нужен ключ|Kate Mobile|2685278|5530956|messages\.send|Access denied|токен с правом|токен сообщений|blank\.html|oauth\.vk|post2post|сервис заблокирован|проверьте права токена|вставьте рабочий|wall\.post/i.test(String(s || ""));
}

OnLead.taskSubline = function taskSubline(c, slug) {
  const when = OnLead.fmtWhen(c.created);
  if (slug === "image-ai") {
    if ((c.stats?.images || []).length) return `${when} · картинка готова`;
    if (c.status === "running") return `${when} · создаём картинку…`;
    if (c.stats?.fail) return `${when} · не получилось, попробуйте ещё раз`;
    return when;
  }
  const st = c.status === "running" ? "в работе" : c.status === "paused" ? "пауза" : c.status === "error" ? "не выполнилось" : "готово";
  const sent = Number(c.stats?.ok || 0);
  const fail = Number(c.stats?.fail || 0);
  const counts = (sent || fail) ? ` · ok ${sent}${fail ? ` / err ${fail}` : ""}` : "";
  const msg = OnLead.isTechnicalMessage(c.stats?.lastMessage) ? "" : (c.stats?.lastMessage || "");
  return msg ? `${when} · ${st}${counts} · ${msg}` : `${when} · ${st}${counts}`;
}

OnLead.masslikeKindLabel = function masslikeKindLabel(type) {
  if (type === "comment") return "Комментарий";
  if (type === "photo") return "Фото";
  return "Пост";
}

OnLead.masslikeOpenLabel = function masslikeOpenLabel(type) {
  if (type === "comment") return "Открыть комментарий";
  if (type === "photo") return "Открыть фото";
  return "Открыть пост";
}

OnLead.masslikeUrlFromKey = function masslikeUrlFromKey(key) {
  const m = String(key || "").match(/^(post|photo|comment):(-?\d+)_(\d+)$/);
  if (!m) return null;
  const type = m[1];
  const owner = m[2];
  const id = m[3];
  if (type === "photo") return { type, url: `https://vk.com/photo${owner}_${id}` };
  if (type === "comment") return { type, url: `https://vk.com/wall${owner}_${id}` };
  return { type, url: `https://vk.com/wall${owner}_${id}` };
}

OnLead.collectMasslikeLiked = function collectMasslikeLiked(tasks) {
  const out = [];
  const seen = new Set();
  const push = (it) => {
    const url = String(it?.url || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(it);
  };
  for (const c of tasks || []) {
    for (const it of c.stats?.likedItems || []) push(it);
  }
  if (!out.length) {
    for (const c of tasks || []) {
      for (const key of [...(c.stats?.likedKeys || [])].reverse()) {
        const parsed = OnLead.masslikeUrlFromKey(key);
        if (parsed) push({ ...parsed, text: "", at: c.stats?.lastLikeAt || c.created });
      }
    }
  }
  return out.slice(0, 40);
}

OnLead.masslikeLikedFeed = function masslikeLikedFeed(tasks) {
  const items = OnLead.collectMasslikeLiked(tasks);
  return `<div class="card ml-feed" style="margin-top:16px">
    <b>Что лайкнули</b>
    <p class="muted" style="margin:6px 0 12px">Последние действия сервиса. Кнопка открывает пост или комментарий во ВКонтакте.</p>
    ${items.length ? items.map((it) => {
      const type = it.type || "post";
      const preview = String(it.text || "").trim();
      return `<article class="match-card ml-card">
        <div>
          <span class="chip">${OnLead.esc(OnLead.masslikeKindLabel(type))}</span>
          <p style="margin:8px 0 4px">${preview ? OnLead.esc(preview) : `<span class="muted">${type === "photo" ? "Фото без подписи" : type === "comment" ? "Комментарий без текста" : "Пост без текста"}</span>`}</p>
          <div class="muted">${OnLead.esc(it.at ? OnLead.fmtWhen(it.at) : "")}</div>
        </div>
        <a class="btn btn-primary btn-sm" href="${OnLead.esc(it.url)}" target="_blank" rel="noopener">${OnLead.esc(OnLead.masslikeOpenLabel(type))}</a>
      </article>`;
    }).join("") : `<p class="muted">Пока пусто — после запуска карточки появятся здесь.</p>`}
  </div>`;
}

OnLead.autopostingPanel = function autopostingPanel(state) {
  const items = state.autopostQueue || [];
  const slots = ["Сегодня 18:00", "Завтра 10:00", "По расписанию", "Сейчас"];
  return `<div class="card" style="margin-top:16px">
    <h3 style="margin:0 0 10px">Календарь и предпросмотр</h3>
    <div id="autopost-preview" class="card muted" style="margin-bottom:12px;white-space:pre-wrap;min-height:64px">Заполните текст поста слева — здесь появится предпросмотр.</div>
    <p class="muted" style="font-size:12px;margin:0 0 8px">Слоты публикации (МСК): ${slots.map((s) => OnLead.esc(s)).join(" · ")}</p>
    ${items.length ? `<div class="match-card"><b>Очередь · ${items.length}</b>
      ${items.map((it, i) => `<div class="list-item" style="margin-top:8px"><div>
        <span class="chip">#${i + 1}</span>
        <div class="muted" style="margin-top:4px">${OnLead.esc(String(it.text || "").slice(0, 160))}${it.photoCount ? ` · ${it.photoCount} фото` : ""}</div>
      </div></div>`).join("")}
    </div>` : `<p class="muted">Очередь пуста — соберите посты граббером или введите текст в форме.</p>`}
  </div>`;
}

OnLead.imageGallery = function imageGallery(tasks) {
  const images = (tasks || []).flatMap((c) => c.stats?.images || []);
  if (!images.length) {
    return `<h3 style="margin-top:20px">Галерея</h3><p class="muted">Готовые обложки появятся здесь.</p>`;
  }
  return `<h3 style="margin-top:20px">Галерея</h3>
    <div class="gallery">${images.map((i) => `
      <a class="ph gen" href="${OnLead.esc(i.url)}" target="_blank" rel="noopener" title="${OnLead.esc(i.prompt || "")}">
        <img src="${OnLead.esc(i.url)}" alt="${OnLead.esc(i.prompt || "SMM")}" />
        <span>${OnLead.esc((i.prompt || "").slice(0, 80))}</span>
      </a>`).join("")}</div>`;
}

OnLead.toolFieldHtml = function toolFieldHtml(f, state) {
  const acc = state.accounts.find((a) => a.id === (state.activeAccount)) || state.accounts[0];
  const channels = acc?.channels || [];
  const destKeys = f.key === "destinations" || f.key === "dest";
  const groupKeys = f.key === "group";
  const pool = groupKeys ? channels.filter((c) => c.type !== "personal") : channels;
  if ((destKeys || groupKeys) && pool.length) {
    const opts = pool.map((c) => ({ v: c.externalId, l: `${c.name} · ${c.externalId}` }));
    return `<div class="field"><label>${OnLead.esc(f.label)}</label>
      <select name="${f.key}">${opts.map((o) => `<option value="${OnLead.esc(o.v)}">${OnLead.esc(o.l)}</option>`).join("")}</select></div>`;
  }
  if (f.type === "lists") {
    const lists = state.lists || [];
    if (!lists.length) {
      return `<p class="muted" style="margin:0 0 10px">Список людей: сначала <a href="#/office/tools/lists">соберите аудиторию</a>.</p>`;
    }
    return `<div class="field"><label>${OnLead.esc(f.label)}</label>
      <select name="listId">${lists.map((l) => `<option value="${OnLead.esc(l.id)}">${OnLead.esc(l.name)} · ${l.count || (l.items || []).length}</option>`).join("")}</select></div>`;
  }
  if (f.type === "select") {
    let optsSrc = f.options || [];
    if (f.key === "channel" && !OnLead.vkMessagesUiOn(state)) {
      optsSrc = ["Только стена"];
    }
    const opts = optsSrc.map((o) => (o && typeof o === "object" ? { value: o.value ?? o.v, label: o.label ?? o.l } : { value: o, label: o }));
    return `<div class="field"><label>${OnLead.esc(f.label)}</label><select name="${f.key}">${opts.map((o) => `<option value="${OnLead.esc(o.value)}">${OnLead.esc(o.label)}</option>`).join("")}</select></div>`;
  }
  if (f.type === "textarea") {
    const body = f.value != null ? String(f.value) : "";
    const hint = f.key === "text" && String(f.value || f.placeholder || "").includes("{name}")
      ? `<p class="muted" style="margin:6px 0 0">Плейсхолдеры: <code>{name}</code>, <code>{first_name}</code>, <code>{last_name}</code>, <code>{full_name}</code></p>`
      : "";
    return `<div class="field"><label>${OnLead.esc(f.label)}</label><textarea name="${f.key}" placeholder="${OnLead.esc(f.placeholder || "")}">${OnLead.esc(body)}</textarea>${hint}</div>`;
  }
  const min = f.min != null ? ` min="${OnLead.esc(f.min)}"` : "";
  const max = f.max != null ? ` max="${OnLead.esc(f.max)}"` : "";
  const val = f.value != null && f.value !== "" ? ` value="${OnLead.esc(f.value)}"` : "";
  return `<div class="field"><label>${OnLead.esc(f.label)}</label><input name="${f.key}" type="${f.type === "number" ? "number" : "text"}" placeholder="${OnLead.esc(f.placeholder || "")}"${min}${max}${val}></div>`;
}

OnLead.toolPage = function toolPage(slug, state) {
  const t = OnLead.tool(slug);
  if (!t) return `<h1>Нет такого инструмента</h1>`;
  const on = OnLead.toolOn(state, slug);
  const tasks = state.campaigns[slug] || [];
  const running = tasks.filter((x) => x.status === "running").length;
  const olVk = OnLead.vkToolOlPage && OnLead.isVkToolSlug && OnLead.isVkToolSlug(slug);
  const paywall = on ? "" : `
    <div class="card" style="margin-bottom:16px">
      <span class="chip">Не активирован</span>
      <h3 style="margin-top:8px">${OnLead.esc(t.name)}</h3>
      <p>${OnLead.esc(t.summary)}</p>
      <div class="toolbar">
        ${OnLead.PERIODS.map((p) => {
          const price = Math.round(t.price * p.id * (1 - p.discount));
          return `<button class="btn btn-ghost" data-act="buy-tool" data-slug="${slug}" data-m="${p.id}" data-amount="${price}">${p.label} · ${price} ₽</button>`;
        }).join("")}
      </div>
    </div>`;
  const header = olVk ? "" : `
    <div class="h-row">
      <div>
        <div class="muted">Инструмент VK · отдельный сервис</div>
        <h1>${OnLead.esc(t.name)}</h1>
      </div>
      <span class="status ${on ? "on" : "off"}">${on ? "Активен · триал или подписка" : "Не подключён"}</span>
    </div>`;
  const kpi = olVk ? "" : `
    <p class="muted" style="margin-top:0">${OnLead.esc(t.summary)}</p>
    <div class="kpi">
      <div class="card"><span>Задач</span><b>${tasks.length}</b></div>
      <div class="card"><span>В работе</span><b>${running}</b></div>
      ${slug === "image-ai" ? `
      <div class="card"><span>Готово</span><b>${tasks.reduce((s, c) => s + ((c.stats?.images || []).length), 0)}</b></div>
      <div class="card"><span>Кредиты</span><b>${state.user?.aiCredits ?? 100}</b></div>` : `
      <div class="card"><span>${OnLead.esc(t.metrics[0] || "Действия")}</span><b>${tasks.reduce((s, c) => s + (c.stats?.ok || 0), 0)}</b></div>
      <div class="card"><span>Ошибки</span><b>${tasks.reduce((s, c) => s + (c.stats?.fail || 0), 0)}</b></div>`}
    </div>`;
  const core = `
    <div class="task-grid" style="margin-top:16px">
      <form class="card" id="tool-form" data-slug="${slug}">
        <h3>Запуск</h3>
        ${slug === "image-ai" ? "" : OnLead.toolAccountSelect(state)}
        ${t.fields.map((f) => OnLead.toolFieldHtml(f, state)).join("")}
        ${slug === "image-ai" || t.fields.some((f) => f.key === "perDay") ? "" : `<div class="field"><label>Лимит в сутки</label><input name="perDay" type="number" value="20" min="1" max="200"></div>`}
        <button class="btn btn-primary" type="submit" ${on && (state.accounts.length || slug === "image-ai") ? "" : "disabled"}>${slug === "image-ai" ? "Сгенерировать" : "Запустить"}</button>
      </form>
      <div>
        <h3>Задачи</h3>
        ${tasks.length ? tasks.map((c) => `<div class="list-item">
          <div><b>${OnLead.esc(c.title || t.name || "Задача")}</b>
            <div class="muted">${OnLead.esc(OnLead.taskSubline(c, slug))}</div>
          </div>
          <div class="match-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-act="edit-cam" data-id="${c.id}" data-title="${OnLead.esc(c.title || "")}">Изменить</button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="pause-cam" data-id="${c.id}">${c.status === "running" ? "Отключить" : "Включить"}</button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="del-cam" data-id="${c.id}" data-name="${OnLead.esc(c.title || "Задача")}">Удалить</button>
          </div>
        </div>`).join("") : `<div class="card muted">Пока нет запусков — заполните форму и нажмите «Запустить».</div>`}
        <div class="card" style="margin-top:12px">
          <b>Что умеет</b>
          <ul>${t.features.map((f) => `<li>${OnLead.esc(f)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
    <div id="tool-extra" data-slug="${slug}"></div>
    ${slug === "autoposting-vk" ? OnLead.autopostingPanel(state) : ""}
    ${slug === "image-ai" ? OnLead.imageGallery(tasks) : ""}
    ${slug === "massliking-vk" ? OnLead.masslikeLikedFeed(tasks) : ""}
    ${slug === "ai-lead-vk" || slug === "lead-vk" ? `<div class="card" style="margin-top:16px"><b>Лиды из этого инструмента</b>
      ${state.leads.filter((l) => l.source.includes("Лид")).map((l) => `<div class="list-item" style="margin-top:8px"><div><b>${OnLead.esc(l.name)}</b><div class="muted">${OnLead.esc(l.note)}</div></div><span class="score">${l.score}/10</span></div>`).join("") || `<p class="muted">Появятся после отправки</p>`}
    </div>` : ""}
    ${slug === "grabber-vk" ? `<div class="card" style="margin-top:16px"><b>Собранные посты</b>
      ${state.lists.filter((l) => (l.source || "").includes("Граббер")).map((l) => {
        const photos = (l.items || []).filter((it) => (it.attachments || []).length || it.hasPhoto).length;
        return `<div class="list-item" style="margin-top:8px"><div><b>${OnLead.esc(l.name)}</b><div class="muted">${OnLead.esc(l.created)}${photos ? ` · ${photos} с фото` : ""}</div></div><b>${l.count}</b></div>`;
      }).join("") || `<p class="muted">После запуска список появится здесь и в «Мои списки»</p>`}
    </div>` : ""}
  `;
  if (olVk) return OnLead.vkToolOlPage(slug, state, { t, on, tasks, paywall, body: on ? core : "" });
  return `${header}${paywall}${on ? kpi + core : ""}`;
}
