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
    const selected = f.value != null ? String(f.value) : "";
    return `<div class="field"><label>${OnLead.esc(f.label)}</label><select name="${f.key}">${opts.map((o) => `<option value="${OnLead.esc(o.value)}"${selected && String(o.value) === selected ? " selected" : ""}>${OnLead.esc(o.label)}</option>`).join("")}</select></div>`;
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
    <div class="card vk-ol-lock" style="margin-bottom:16px">
      <span class="chip">Модуль закрыт</span>
      <h3 style="margin-top:8px">${OnLead.esc(t.name)}</h3>
      <p>${OnLead.esc(t.summary)}</p>
      <p class="muted" style="font-size:12px;margin:0 0 8px">Нужна подписка или разовый пакет. Чаще берут 1 месяц.</p>
      <div class="toolbar">
        ${OnLead.PERIODS.map((p) => {
          const price = Math.round(t.price * p.id * (1 - p.discount));
          const primary = p.id === 1;
          return `<button class="btn ${primary ? "btn-primary" : "btn-ghost"}" data-act="buy-tool" data-slug="${slug}" data-m="${p.id}" data-amount="${price}">${primary ? `Подключить за ${price} ₽` : `${p.label} · ${price} ₽`}</button>`;
        }).join("")}
        <a class="btn btn-ghost" href="#/office/subscriptions">Все тарифы</a>
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

/* --- extras / preview --- */
OnLead.isBdayToday = function isBdayToday(bdate) {
  if (!bdate) return false;
  const p = String(bdate).split(".");
  if (p.length < 2) return false;
  const now = new Date();
  return Number(p[0]) === now.getDate() && Number(p[1]) === now.getMonth() + 1;
}

OnLead.syncAutopostPreview = function syncAutopostPreview() {
  const form = $("#tool-form");
  if (!form || form.dataset.slug !== "autoposting-vk") return;
  const box = document.getElementById("autopost-preview");
  if (!box) return;
  const d = Object.fromEntries(new FormData(form).entries());
  let text = String(d.text || "").trim() || "—";
  const when = String(d.when || "Сейчас");
  const dest = String(d.dest || "");
  if (!/utm_[a-z]+=/i.test(text)) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const src = encodeURIComponent(String(d.utmSource || "onlead").trim() || "onlead");
      const med = encodeURIComponent(String(d.utmMedium || "vk").trim() || "vk");
      const camp = encodeURIComponent(String(d.utmCampaign || "autopost").trim() || "autopost");
      const url = urlMatch[0];
      const sep = url.includes("?") ? "&" : "?";
      text = text.replace(url, `${url}${sep}utm_source=${src}&utm_medium=${med}&utm_campaign=${camp}`);
    }
  }
  box.textContent = `[${when}]${dest ? ` · ${dest}` : ""}\n\n${text}`;
}

OnLead.loadToolExtras = async function loadToolExtras(slug) {
  const box = document.getElementById("tool-extra");
  if (!box) return;
  const live = ["congratulation-vk", "chat-manager-vk", "group-manager-vk", "invite-vk", "grabber-vk", "broom-vk", "ai-lead-vk", "autostoris-vk"];
  if (!live.includes(slug)) return;
  const q = vkAccountQuery();
  box.innerHTML = `<div class="card muted" style="margin-top:16px">Загружаем данные VK…</div>`;
  try {
    if (slug === "congratulation-vk") {
      const friends = await OnLead.api("/api/vk/friends" + q);
      const today = (friends || []).filter((f) => OnLead.isBdayToday(f.bdate));
      const state = OnLead.load();
      const tasks = state.campaigns["congratulation-vk"] || [];
      const statusById = new Map();
      for (const c of tasks) {
        for (const row of c.stats?.congrats || []) {
          if (row?.id == null) continue;
          const id = Number(row.id);
          const prev = statusById.get(id);
          if (!prev || (row.ok && !prev.ok) || (row.at && prev.at && row.at > prev.at)) {
            statusById.set(id, row);
          }
        }
      }
      const sentN = today.filter((f) => statusById.get(Number(f.id))?.ok).length;
      const failN = today.filter((f) => {
        const s = statusById.get(Number(f.id));
        return s && !s.ok;
      }).length;
      const waitN = today.length - sentN - failN;
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Именинники сегодня · ${today.length}</b>
        <p class="muted" style="margin:8px 0 0">Отправлено ${sentN} · ошибки ${failN} · в очереди ${waitN}. Статус обновляется после запуска задачи.</p>
        ${today.length ? today.map((f) => {
          const st = statusById.get(Number(f.id));
          let chip = `<span class="chip">в очереди</span>`;
          let sub = `id ${f.id}`;
          if (st?.ok) {
            const via = st.via === "message" ? "ЛС" : st.via === "wall" ? "стена" : "отправлено";
            chip = `<span class="chip chip-ok">выполнено · ${via}</span>`;
            sub = `id ${f.id}${st.at ? ` · ${OnLead.fmtWhen(st.at)}` : ""}`;
          } else if (st && !st.ok) {
            chip = `<span class="chip chip-bad">не отправлено</span>`;
            sub = `id ${f.id}`;
          } else if (f.canWritePrivateMessage === false) {
            sub += " · ЛС закрыты";
          }
          return `<div class="list-item" style="margin-top:8px"><div><b>${OnLead.esc(f.firstName)} ${OnLead.esc(f.lastName)}</b><div class="muted">${OnLead.esc(sub)}</div></div>${chip}</div>`;
        }).join("") : `<p class="muted">Сегодня в друзьях нет дней рождения — задача отправит поздравления, когда они появятся.</p>`}
      </div>`;
      return;
    }
    if (slug === "chat-manager-vk") {
      const chats = await OnLead.api("/api/vk/chats" + q);
      const state = OnLead.load();
      const tasks = state.campaigns["chat-manager-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const st = task?.stats || {};
      const log = (st.chatLog || []).slice(0, 12);
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Менеджер чатов</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Чатов</span><b>${st.chats || chats.length || 0}</b></div>
          <div class="card"><span>ЛС</span><b>${st.replied || 0}</b></div>
          <div class="card"><span>Приветствия</span><b>${st.welcomed || 0}</b></div>
          <div class="card"><span>Модерация</span><b>${st.moderated || 0}</b></div>
          <div class="card"><span>Киков</span><b>${st.kicked || 0}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${OnLead.esc(task.stats.lastMessage)}</p>` : ""}
        ${log.length ? `<h3 style="margin:16px 0 8px">Последние действия</h3>
          ${log.map((row) => `<div class="list-item" style="margin-top:6px"><div><b>${OnLead.esc(row.kind || "")}</b> · ${OnLead.esc(row.chat || "")}<div class="muted">${OnLead.esc(row.note || "")}${row.at ? " · " + OnLead.fmtWhen(row.at) : ""}</div></div></div>`).join("")}` : ""}
        <h3 style="margin:16px 0 8px">Диалоги · ${chats.length}</h3>
        ${chats.length ? chats.map((c) => `<div class="list-item" style="margin-top:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px"><b>${OnLead.esc(c.title)}</b><div class="muted">${OnLead.esc(c.last)}</div></div>
          ${c.unread ? `<span class="chip">${c.unread}</span>` : ""}
          <div style="width:100%;display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <input class="input" style="flex:1;min-width:160px" placeholder="Ответ из кабинета…" id="chat-reply-${OnLead.esc(c.peerId)}">
            <button type="button" class="btn btn-primary btn-sm" data-act="vk-chat-reply" data-peer="${OnLead.esc(c.peerId)}">Отправить</button>
          </div>
        </div>`).join("") : `<p class="muted">Диалогов нет или нет права messages.</p>`}
      </div>`;
      return;
    }
    if (slug === "ai-lead-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["ai-lead-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const dialogs = Object.values(task?.stats?.aiDialogs || {});
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>AI диалоги · ${dialogs.length}</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Активных</span><b>${dialogs.length}</b></div>
          <div class="card"><span>Ответов</span><b>${dialogs.filter((d) => (d.turns || 0) > 1).length}</b></div>
          <div class="card"><span>Горячие 8+</span><b>${dialogs.filter((d) => (d.score || 0) >= 8).length}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${OnLead.esc(task.stats.lastMessage)}</p>` : ""}
        ${dialogs.length ? dialogs.slice(0, 15).map((d) => `<div class="list-item" style="margin-top:8px"><div>
          <b>${OnLead.esc(d.name || ("id" + d.vkId))}</b>
          <div class="muted">ход ${d.turns || 1} · скоринг ${d.score || "—"}/10${d.lastReply ? " · " + OnLead.esc(d.lastReply.slice(0, 60)) : ""}</div>
        </div></div>`).join("") : `<p class="muted">Диалоги появятся после первых касаний и ответов.</p>`}
      </div>`;
      return;
    }
    if (slug === "autostoris-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["autostoris-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const metrics = (task?.stats?.storyMetrics || []).slice(0, 12);
      const views = metrics.reduce((a, m) => a + (m.views || 0), 0);
      const clicks = metrics.reduce((a, m) => a + (m.clicks || 0), 0);
      const queueLeft = task?.stats?.storyQueueLeft ?? 0;
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Автосторис</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>В очереди</span><b>${queueLeft}</b></div>
          <div class="card"><span>Опубликовано</span><b>${metrics.length}</b></div>
          <div class="card"><span>Просмотры</span><b>${views}</b></div>
          <div class="card"><span>Клики</span><b>${clicks}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${OnLead.esc(task.stats.lastMessage)}</p>` : ""}
        ${metrics.length ? metrics.map((m) => `<div class="list-item" style="margin-top:8px"><div>
          <b>${OnLead.esc(m.caption || "Сторис")}</b>
          <div class="muted">${m.views || 0} просм · ${m.clicks || 0} клик · ${OnLead.esc(m.via || "")}${m.at ? " · " + OnLead.fmtWhen(m.at) : ""}</div>
        </div></div>`).join("") : `<p class="muted">Статистика появится после первой публикации.</p>`}
      </div>`;
      return;
    }
    if (slug === "invite-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["invite-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const st = task?.stats || {};
      const limit = Number(task?.payload?.perDay || 30);
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Инвайтинг</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Приглашено</span><b>${st.ok || 0}</b></div>
          <div class="card"><span>Вступили</span><b>${st.joinedCount ?? (st.joinedIds || []).length}</b></div>
          <div class="card"><span>Лимит/день</span><b>${limit}</b></div>
          <div class="card"><span>Ошибки</span><b>${st.fail || 0}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${OnLead.esc(task.stats.lastMessage)}</p>` : ""}
        <p class="muted" style="margin:8px 0 0">Чёрный список и «Вступили» обновляются после запуска задачи.</p>
      </div>`;
      return;
    }
    if (slug === "grabber-vk") {
      const state = OnLead.load();
      const tasks = state.campaigns["grabber-vk"] || [];
      const task = tasks.find((c) => c.status === "running") || tasks[0];
      const st = task?.stats || {};
      const grabbed = (st.grabbedKeys || []).length;
      const queued = (state.autopostQueue || []).length;
      box.innerHTML = `<div class="card" style="margin-top:16px">
        <b>Граббер постов</b>
        <div class="kpi" style="margin:12px 0">
          <div class="card"><span>Собрано ключей</span><b>${grabbed}</b></div>
          <div class="card"><span>В очереди автопостинга</span><b>${queued}</b></div>
          <div class="card"><span>Успешно</span><b>${st.ok || 0}</b></div>
        </div>
        ${task?.stats?.lastMessage ? `<p class="muted">${OnLead.esc(task.stats.lastMessage)}</p>` : `<p class="muted">Запустите задачу — здесь появятся сбор и очередь.</p>`}
      </div>`;
      return;
    }
    if (slug === "group-manager-vk") {
      const groups = await OnLead.api("/api/vk/groups" + q);
      let reqsHtml = "";
      if (groups[0]) {
        const gid = groups[0].id;
        const reqs = await OnLead.api(`/api/vk/groups/requests?groupId=${encodeURIComponent(gid)}${q ? "&" + q.slice(1) : ""}`);
        reqsHtml = `<h3 style="margin:16px 0 8px">Заявки в «${OnLead.esc(groups[0].name)}»</h3>
          ${reqs.length ? reqs.map((r) => `<div class="list-item"><div><b>${OnLead.esc(r.firstName)} ${OnLead.esc(r.lastName)}</b></div>
            <div class="match-actions">
              <button class="btn btn-primary btn-sm" data-act="gm-approve" data-gid="${gid}" data-uid="${r.id}">Одобрить</button>
              <button class="btn btn-ghost btn-sm" data-act="gm-deny" data-gid="${gid}" data-uid="${r.id}">Отклонить</button>
            </div></div>`).join("") : `<p class="muted">Открытых заявок нет.</p>`}`;
      }
      box.innerHTML = `<div class="card" style="margin-top:16px"><b>Сообщества, где вы админ · ${groups.length}</b>
        ${groups.length ? groups.map((g) => `<div class="list-item" style="margin-top:8px"><div><b>${OnLead.esc(g.name)}</b><div class="muted">${OnLead.esc(g.screenName || "")} · id ${g.id}</div></div></div>`).join("") : `<p class="muted">Нет управляемых сообществ — войдите через VK.</p>`}
        ${reqsHtml}
      </div>`;
      return;
    }
    if (slug === "broom-vk") {
      const friends = await OnLead.api("/api/vk/friends" + q);
      const suspects = (friends || []).filter((f) => f.deactivated || !f.photo);
      box.innerHTML = `<div class="card" style="margin-top:16px"><b>Кандидаты на чистку · ${suspects.length} из ${friends.length}</b>
        ${suspects.length ? suspects.slice(0, 30).map((f) => `<div class="list-item" style="margin-top:8px"><div><b>${OnLead.esc(f.firstName)} ${OnLead.esc(f.lastName)}</b><div class="muted">${f.deactivated ? "деактивирован" : "нет фото"}</div></div></div>`).join("") : `<p class="muted">По текущим правилам чистить некого.</p>`}
      </div>`;
    }
  } catch (err) {
    box.innerHTML = `<div class="card muted" style="margin-top:16px">${OnLead.esc(err.message)}</div>`;
  }
}
