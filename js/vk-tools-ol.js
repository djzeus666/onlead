/**
 * VK-инструменты — hub и обёртка страниц (online-lead.ru / vk-tool-ui parity)
 */
window.OnLead = window.OnLead || {};

OnLead.VK_TOOLS_OL = [
  {
    id: "masslike",
    slug: "massliking-vk",
    title: "Масслайкинг",
    short: "Лайки по фильтрам и лимитам",
    description: "Автолайки постов друзей и целевых стен VK с дневным лимитом и паузами — безопасный прогрев аудитории.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "congrats",
    slug: "congratulation-vk",
    title: "Автопоздравления",
    short: "ДР и персональные сообщения",
    description: "Поздравления с днём рождения и триггерные сообщения целевой аудитории.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "inviting",
    slug: "invite-vk",
    title: "Инвайтинг",
    short: "Приглашения в сообщество",
    description: "Массовые приглашения пользователей в группу/сообщество с лимитами и фильтрами.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "group-manager",
    slug: "group-manager-vk",
    title: "Менеджер групп",
    short: "Админка сообществ",
    description: "Обслуживание групп: заявки, модерация, базовые действия администратора.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "broom",
    slug: "broom-vk",
    title: "Веник",
    short: "Чистка аудитории",
    description: "Удаление неактивных, удалённых и «мусорных» друзей/подписчиков по правилам.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "grabber",
    slug: "grabber-vk",
    title: "Граббер VK",
    short: "Копирование чужих постов",
    description: "Забор постов из сообществ по правилам, фильтры и очередь на публикацию.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "auto-stories",
    slug: "autostoris-vk",
    title: "Автосторис",
    short: "Конвейер Stories",
    description: "Отдельный сценарий сторис: шаблоны, расписание и ротация креативов.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "lead-dm",
    slug: "ai-lead-vk",
    title: "AI Лид-менеджер",
    short: "Автодиалоги в ЛС",
    description: "Прогрев и диалоги в личных сообщениях VK от вашего имени с передачей в CRM.",
    group: "subscribed",
    mvp: true,
  },
  {
    id: "audience",
    slug: "parsing-groups-vk",
    title: "Парсер аудитории",
    short: "Сегменты VK",
    description: "Сбор аудитории по группам и активности для воронок и инвайта.",
    group: "parsers",
    mvp: true,
  },
];

OnLead.VK_TOOLS_GROUPS = [
  {
    id: "subscribed",
    title: "По подписке",
    hint: "Рост и обслуживание аудитории",
    toolIds: ["masslike", "congrats", "auto-stories", "grabber", "inviting", "group-manager", "broom", "lead-dm"],
    extra: [
      {
        id: "inbox",
        slug: "chat-manager-vk",
        title: "Менеджер чатов",
        description: "Входящие сообщения и комментарии с площадок в одном потоке.",
      },
    ],
    moreSlugs: ["leadgen-vk", "lead-vk", "autoposting-vk", "image-ai"],
  },
  {
    id: "parsers",
    title: "Парсеры и списки",
    hint: "Сегменты для воронок и инвайта",
    toolIds: ["audience"],
    extra: [
      {
        id: "lists",
        href: "#/office/tools/lists",
        title: "Мои списки",
        description: "Сохранённые сегменты из парсеров — копирование ID для рассылок.",
      },
      {
        id: "parse-accounts",
        slug: "parsing-accounts-vk",
        title: "Парсинг аккаунтов",
        description: "Сбор людей по городу, возрасту и интересам.",
      },
    ],
  },
];

OnLead.VK_TOOL_SLUGS = new Set([
  ...OnLead.VK_TOOLS_OL.map((t) => t.slug).filter((s) => s !== "ai-lead-vk"),
  "chat-manager-vk",
]);

OnLead.isVkToolSlug = function isVkToolSlug(slug) {
  return OnLead.VK_TOOL_SLUGS.has(slug);
};

OnLead.vkToolOlBySlug = function vkToolOlBySlug(slug) {
  return OnLead.VK_TOOLS_OL.find((t) => t.slug === slug);
};

OnLead.fmtVkTime = function fmtVkTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 16).replace("T", " ");
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

OnLead.vkToolOlAggregateStats = function vkToolOlAggregateStats(slug, tasks) {
  const list = tasks || [];
  const today = new Date().toDateString();
  let sentToday = 0;
  let totalOk = 0;
  let errors = 0;
  let lastRunAt = null;

  for (const c of list) {
    const ok = Number(c.stats?.ok || 0);
    const fail = Number(c.stats?.fail || 0);
    totalOk += ok;
    errors += fail;
    const at = c.updatedAt || c.created;
    if (at && (!lastRunAt || at > lastRunAt)) lastRunAt = at;
    const day = at ? new Date(at).toDateString() : "";
    if (day === today) sentToday += ok;
  }

  if (slug === "massliking-vk") {
    const liked = list.reduce((s, c) => s + (c.stats?.likedItems?.length || c.stats?.likedKeys?.length || 0), 0);
    if (liked > totalOk) totalOk = liked;
  }

  const running = list.some((c) => c.status === "running");
  const dailyLimit = list.reduce((m, c) => Math.max(m, Number(c.payload?.perDay || c.config?.perDay || 0)), 0) || null;

  return { sentToday, totalOk, errors, enabled: running, lastRunAt, dailyLimit };
};

OnLead.vkToolOlCollectActions = function vkToolOlCollectActions(slug, tasks) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const rows = [];
  const push = (target, detail, status, at, key) => {
    rows.push({
      key: key || `${target}-${at}-${rows.length}`,
      target: String(target || "—").slice(0, 120),
      detail: detail ? String(detail).slice(0, 200) : "",
      status: status || "ok",
      at: at || new Date().toISOString(),
    });
  };

  const techRe = /API-ключ|HTTP \d|Access denied|токен|oauth\.vk|blank\.html|messages\.send/i;

  for (const c of tasks || []) {
    const lm = c.stats?.lastMessage;
    if (lm && !techRe.test(lm)) {
      push(c.title || "Задача", lm, c.status === "error" ? "error" : "ok", c.updatedAt || c.created, `lm-${c.id}`);
    }

    if (slug === "massliking-vk") {
      for (const it of c.stats?.likedItems || []) {
        push(it.text || "Пост", it.url || "", "ok", it.at || c.updatedAt, `like-${it.url}`);
      }
    }
    if (slug === "congratulation-vk") {
      for (const row of c.stats?.congrats || []) {
        push(row.name || `id ${row.id}`, row.via || "", row.ok ? "sent" : "error", row.at, `cg-${row.id}-${row.at}`);
      }
    }
    if (slug === "invite-vk") {
      for (const row of (c.stats?.invited || c.stats?.inviteLog || []).slice(0, 20)) {
        push(row.name || row.id, row.group || "", row.ok !== false ? "invited" : "error", row.at, `inv-${row.id}`);
      }
    }
    if (slug === "grabber-vk") {
      for (const row of (c.stats?.grabbed || []).slice(0, 20)) {
        push(row.title || "Пост", row.source || "", "grabbed", row.at, `gr-${row.id || row.at}`);
      }
    }
    if (slug === "broom-vk") {
      for (const row of (c.stats?.removed || []).slice(0, 20)) {
        push(row.name || row.id, row.reason || "", "removed", row.at, `br-${row.id}`);
      }
    }
    if (slug === "autostoris-vk") {
      for (const row of (c.stats?.storyMetrics || []).slice(0, 15)) {
        push("Сторис", `просмотры ${row.views || 0}`, "ok", row.at, `st-${row.at}`);
      }
    }
    if (slug === "ai-lead-vk") {
      for (const d of Object.values(c.stats?.aiDialogs || {}).slice(0, 20)) {
        push(d.name || `id ${d.vkId}`, d.lastReply || `скоринг ${d.score || "—"}`, "sent", d.updatedAt, `ai-${d.vkId}`);
      }
    }
    if (slug === "chat-manager-vk") {
      for (const row of (c.stats?.chatLog || []).slice(0, 20)) {
        push(row.chat || row.kind, row.note || row.kind, "ok", row.at, `ch-${row.at}-${row.kind}`);
      }
    }
    if (slug === "group-manager-vk") {
      for (const row of (c.stats?.gmLog || []).slice(0, 20)) {
        push(row.action || "Действие", row.detail || "", row.ok !== false ? "ok" : "error", row.at, `gm-${row.at}`);
      }
    }
    if (slug === "lead-vk") {
      const note = c.payload?.templates ? String(c.payload.templates).split("\n")[0].slice(0, 80) : "";
      if (c.stats?.ok) {
        push("Касания", note || lm || "", "sent", c.updatedAt || c.created, `lv-${c.id}`);
      }
    }
  }

  rows.sort((a, b) => new Date(b.at) - new Date(a.at));
  return rows.slice(0, 40);
};

OnLead.vkToolOlStatsHtml = function vkToolOlStatsHtml(slug, tasks, stats) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const st = stats || OnLead.vkToolOlAggregateStats(slug, tasks);
  const limit = st.dailyLimit != null ? `/${st.dailyLimit}` : "";
  return `<div class="card vk-ol-stats">
    <h2 class="vk-ol-stats-title">Статистика</h2>
    <div class="vk-ol-stats-grid">
      <div class="vk-ol-stat"><span class="muted">Сегодня</span><b>${st.sentToday}${limit}</b></div>
      <div class="vk-ol-stat"><span class="muted">Всего OK</span><b>${st.totalOk}</b></div>
      <div class="vk-ol-stat"><span class="muted">Ошибки</span><b>${st.errors}</b></div>
      <div class="vk-ol-stat"><span class="muted">Статус</span><span class="chip ${st.enabled ? "chip-ok" : ""}">${st.enabled ? "Работает" : "Пауза"}</span></div>
    </div>
    ${st.lastRunAt ? `<p class="muted vk-ol-stats-foot">Последний запуск: ${esc(OnLead.fmtVkTime(st.lastRunAt))}</p>` : ""}
  </div>`;
};

OnLead.vkToolOlActionsHtml = function vkToolOlActionsHtml(slug, tasks) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const actions = OnLead.vkToolOlCollectActions(slug, tasks);
  const tone = (s) => {
    if (/error|fail/i.test(s)) return "chip-bad";
    if (/ok|sent|invited|grabbed|removed|parsed/i.test(s)) return "chip-ok";
    return "";
  };
  return `<div class="card vk-ol-log">
    <h2 class="vk-ol-stats-title">Журнал</h2>
    ${actions.length
      ? actions.map((a) => `<div class="vk-ol-log-row">
          <div class="vk-ol-log-body">
            <b>${esc(a.target)}</b>
            ${a.detail ? `<p class="muted">${esc(a.detail)}</p>` : ""}
            <span class="muted vk-ol-log-time">${esc(OnLead.fmtVkTime(a.at))}</span>
          </div>
          <span class="chip ${tone(a.status)}">${esc(a.status)}</span>
        </div>`).join("")
      : `<p class="muted">Пока пусто — действия появятся после первого запуска.</p>`}
  </div>`;
};

OnLead.vkToolOlHeaderHtml = function vkToolOlHeaderHtml(slug, state, tasks, meta) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const def = OnLead.vkToolOlBySlug(slug);
  const t = meta?.t || OnLead.tool(slug);
  const title = def?.title || t?.name || slug;
  const desc = def?.description || t?.summary || "";
  const on = meta?.on ?? OnLead.toolOn(state, slug);
  const stats = OnLead.vkToolOlAggregateStats(slug, tasks);
  const hubHref = "#/office/tools/subscribed";

  return `<div class="vk-ol-head ol-page-head">
    <div>
      <a class="ol-back vk-ol-back" href="${hubHref}">← VK-инструменты</a>
      <h1>${esc(title)}</h1>
      <p class="muted vk-ol-desc ol-page-head__lead">${esc(desc)}</p>
    </div>
    ${on ? `<div class="ol-page-actions vk-ol-actions">
      <button type="button" class="btn ${stats.enabled ? "btn-ghost" : "btn-primary"} btn-sm" data-act="vk-tool-toggle" data-slug="${esc(slug)}">${stats.enabled ? "Выключить" : "Включить"}</button>
      <button type="button" class="btn btn-primary btn-sm" data-act="vk-tool-run" data-slug="${esc(slug)}">Запустить сейчас</button>
    </div>` : `<span class="status off">Не подключён</span>`}
  </div>`;
};

OnLead.vkToolOlPage = function vkToolOlPage(slug, state, parts) {
  const { t, on, tasks, paywall, body } = parts;
  return `<div class="vk-ol">
    ${OnLead.vkToolOlHeaderHtml(slug, state, tasks, { t, on })}
    ${paywall || ""}
    ${on ? OnLead.vkToolOlStatsHtml(slug, tasks) : ""}
    ${on ? body || "" : ""}
    ${on ? OnLead.vkToolOlActionsHtml(slug, tasks) : ""}
  </div>`;
};

OnLead.vkToolOlHubCard = function vkToolOlHubCard(def, state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const on = OnLead.toolOn(state, def.slug);
  const tasks = state.campaigns[def.slug] || [];
  const stats = OnLead.vkToolOlAggregateStats(def.slug, tasks);
  const href = `#/office/tools/${def.slug}`;
  let foot = "";
  if (def.id === "masslike" && on) {
    foot = `<p class="vk-ol-card-foot muted">Сегодня: ${stats.sentToday} · всего: ${stats.totalOk}</p>`;
  }
  return `<a class="card vk-ol-card" href="${href}">
    <div class="vk-ol-card-top">
      <h3>${esc(def.title)}</h3>
      <div class="vk-ol-card-badges">
        ${def.mvp && on ? `<span class="chip chip-ok">MVP</span>` : ""}
        ${on && stats.enabled ? `<span class="chip">Вкл</span>` : ""}
        ${!on ? `<span class="chip chip-muted">Выкл</span>` : ""}
      </div>
    </div>
    <p class="muted vk-ol-card-desc">${esc(def.description)}</p>
    ${foot}
    <span class="vk-ol-card-link">Открыть →</span>
  </a>`;
};

OnLead.vkToolOlExtraCard = function vkToolOlExtraCard(item, state) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const href = item.href || (item.slug ? `#/office/tools/${item.slug}` : "#");
  const on = item.slug ? OnLead.toolOn(state, item.slug) : true;
  return `<a class="card vk-ol-card" href="${href}">
    <div class="vk-ol-card-top"><h3>${esc(item.title)}</h3>${on ? `<span class="chip chip-ok">MVP</span>` : ""}</div>
    <p class="muted vk-ol-card-desc">${esc(item.description)}</p>
    <span class="vk-ol-card-link">Открыть →</span>
  </a>`;
};

OnLead.vkToolsHubPage = function vkToolsHubPage(state, opts) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const section = (opts && opts.section) || "all";
  const groups = OnLead.VK_TOOLS_GROUPS.filter((g) => section === "all" || g.id === section);

  const sections = groups.map((group) => {
    const defs = group.toolIds
      .map((id) => OnLead.VK_TOOLS_OL.find((t) => t.id === id))
      .filter(Boolean);
    const extras = group.extra || [];
    const more = section === "subscribed" && group.moreSlugs
      ? group.moreSlugs.map((slug) => {
          const t = OnLead.tool(slug);
          return t ? { slug, title: t.name, description: t.summary } : null;
        }).filter(Boolean)
      : [];

    if (!defs.length && !extras.length && !more.length) return "";

    return `<section class="vk-ol-section">
      <div class="vk-ol-section-head">
        <h2>${esc(group.title)}</h2>
        <p class="muted">${esc(group.hint)}</p>
      </div>
      <div class="vk-ol-grid">
        ${defs.map((d) => OnLead.vkToolOlHubCard(d, state)).join("")}
        ${extras.map((ex) => OnLead.vkToolOlExtraCard(ex, state)).join("")}
        ${more.map((m) => OnLead.vkToolOlExtraCard(m, state)).join("")}
      </div>
    </section>`;
  }).join("");

  const intro = section === "parsers"
    ? `<p class="muted vk-ol-intro ol-page-head__lead">Сегменты VK для инвайта и рассылок. Сохранённые списки — в «Мои списки».</p>`
    : `<p class="muted vk-ol-intro ol-page-head__lead">Рост и обслуживание аудитории VK. Каждый инструмент — отдельный экран с журналом действий и статистикой.</p>`;

  return `<div class="vk-ol vk-ol-hub">
    <div class="ol-page-head vk-ol-hub-head">
      <div>
        <h1>VK-инструменты</h1>
        ${intro}
      </div>
    </div>
    ${sections || `<div class="card muted">Раздел пуст</div>`}
  </div>`;
};
