/**
 * Office shell — sidebar, topbar, layout (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.lkNavNarrow = function lkNavNarrow() {
  return window.matchMedia("(max-width: 980px)").matches;
}

OnLead.setLkNav = function setLkNav(open) {
  const app = document.querySelector(".app");
  const side = document.querySelector(".lk-side");
  if (!app) return;
  app.classList.toggle("nav-open", !!open);
  if (side) {
    if (!OnLead.lkNavNarrow() || open) side.removeAttribute("inert");
    else side.setAttribute("inert", "");
  }
  document.querySelectorAll("[data-act=lk-nav-toggle]").forEach((el) => {
    el.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll(".lk-burger").forEach((el) => {
    el.setAttribute("aria-label", open ? "Закрыть меню" : "Меню");
  });
  if (open && side) side.scrollTop = 0;
}

OnLead.officeShell = function officeShell(path) {
  const state = OnLead.load();
  const trial = OnLead.trialLeft(state);
  const chrome = OnLead.officeChrome(path);
  const flash = OnLead._flash ? `<div class="notice"><div>${OnLead.esc(OnLead._flash)}</div></div>${(OnLead._flash = "") || ""}` : "";
  const landingEditor = /^\/office\/landings\/pages\/[^/]+$/.test(path);
  const landingTemplateView = /^\/office\/landings\/templates\/[^/]+$/.test(path);
  const hideContext = landingEditor || landingTemplateView;
  const context = (path === "/office" || path === "/office/accounts" || hideContext)
    ? ""
    : `<div class="lk-context"><p class="lk-context-kicker">${OnLead.esc(chrome.kicker)}</p><h1>${OnLead.esc(chrome.title)}</h1></div>`;
  const hideTopTitle = path === "/office/accounts" || hideContext;
  const pageClass = path === "/office"
    ? " page-home"
    : landingEditor
      ? " page-landing-edit"
      : landingTemplateView
        ? " page-landing-preview"
        : "";
  return `
  <div class="app">
    ${OnLead.lkSidebar(path, state, trial)}
    <button type="button" class="lk-scrim" data-act="lk-nav-close" aria-label="Закрыть меню"></button>
    <div class="lk-main">
      ${OnLead.lkTopbar(path, state, trial, hideTopTitle)}
      <div class="main">
        ${context}
        <div class="page${pageClass}">${flash}${OnLead.officePage(path, state)}</div>
      </div>
    </div>
  </div>`;
}

OnLead.hrefPath = function hrefPath(href) {
  return String(href || "").replace("#", "");
}

OnLead.navActive = function navActive(path, href) {
  const p = OnLead.hrefPath(href);
  if (path === p) return true;
  if (p === "/office" && path === "/office") return true;
  if (p === "/office/tools/lists" && path.startsWith("/office/tools/lists/")) return true;
  if (p === "/office/academy" && path.startsWith("/office/academy/")) return true;
  if (p === "/office/landings" && path.startsWith("/office/landings")) return true;
  if (p === "/office/content" && (path.startsWith("/office/content") || path === "/office/compose" || path === "/office/content-studio" || path === "/office/media" || path === "/office/history" || path === "/office/ai-images")) return true;
  if (p === "/office/automation" && (path.startsWith("/office/automation") || path === "/office/rss" || path === "/office/crosspost" || path === "/office/repost")) return true;
  if (p === "/office/analytics" && path.startsWith("/office/analytics")) return true;
  return false;
}

OnLead.bundleActive = function bundleActive(pack, path) {
  const root = OnLead.hrefPath(pack.href);
  if (path === root || path.startsWith(root + "/")) return true;
  return (pack.items || []).some((i) => {
    const p = OnLead.hrefPath(i.href);
    return path === p || (p.length > 1 && path.startsWith(p + "/"));
  });
}

OnLead.readSideOpen = function readSideOpen() {
  try { return JSON.parse(sessionStorage.getItem("onlead-side-open") || "{}") || {}; }
  catch { return {}; }
}

OnLead.writeSideOpen = function writeSideOpen(id, open) {
  const map = OnLead.readSideOpen();
  map[id] = !!open;
  try { sessionStorage.setItem("onlead-side-open", JSON.stringify(map)); } catch { /* ignore */ }
}

OnLead.packIsOpen = function packIsOpen(id, pathOn) {
  const map = OnLead.readSideOpen();
  if (map[id] === true) return true;
  if (map[id] === false) return false;
  return pathOn;
}

OnLead.navCounter = function navCounter(key, state) {
  if (key === "accounts") {
    const used = state.accounts?.length || 0;
    const total = state.accountSlots || 3;
    return `${used}/${total}`;
  }
  return "";
}

OnLead.lkSideLink = function lkSideLink(path, item) {
  const active = OnLead.navActive(path, item.href);
  const counter = item.counter ? OnLead.navCounter(item.counter, OnLead.load()) : "";
  return `<a href="${item.href}" class="lk-side-link${active ? " on" : ""}">
    <span class="lk-side-ico">${OnLead.icon(item.icon || "home")}</span>
    <span class="lk-side-text">${OnLead.esc(item.label)}</span>
    ${item.badge ? `<span class="lk-side-badge">${OnLead.esc(item.badge)}</span>` : ""}
    ${counter ? `<span class="lk-side-count">${OnLead.esc(counter)}</span>` : ""}
  </a>`;
}

OnLead.lkSideBundle = function lkSideBundle(b, path) {
  const pathOn = OnLead.bundleActive(b, path);
  const open = OnLead.packIsOpen(b.id, pathOn);
  const count = (b.items || []).length;
  const kids = (b.items || []).map((it) => {
    const active = OnLead.navActive(path, it.href) || (OnLead.hrefPath(it.href).length > 2 && (path === OnLead.hrefPath(it.href) || path.startsWith(OnLead.hrefPath(it.href) + "/")));
    return `<a href="${it.href}" class="lk-side-sublink${active ? " on" : ""}">
      <span>${OnLead.esc(it.label)}</span>
      ${it.badge ? `<i>${OnLead.esc(it.badge)}</i>` : ""}
    </a>`;
  }).join("");
  return `<details class="lk-side-group" data-pack="${OnLead.esc(b.id)}"${open ? " open" : ""}>
    <summary>
      <span class="lk-side-ico">${OnLead.icon(b.icon || "layers")}</span>
      <span class="lk-side-label"><b>${OnLead.esc(b.title)}</b><small>${OnLead.esc(b.hint || "")}</small></span>
      <span class="lk-side-count">${count}</span>
    </summary>
    <div class="lk-side-sub">${kids}</div>
  </details>`;
}

OnLead.lkSidebar = function lkSidebar(path, state, trial) {
  const initials = OnLead.esc(OnLead.userInitials(state.user));
  const acc = state.accounts?.[0];
  const navSections = (OnLead.NAV || []).map((sec) => {
    const links = (sec.items || []).map((it) => OnLead.lkSideLink(path, it)).join("");
    return `<div class="lk-side-sec">
      <div class="lk-side-sec-title">${OnLead.esc(sec.section)}</div>
      ${links}
    </div>`;
  }).join("");
  const featured = (OnLead.FEATURED || []).map((it) => OnLead.lkSideLink(path, it)).join("");
  const bundles = (OnLead.BUNDLES || []).map((b) => OnLead.lkSideBundle(b, path)).join("");
  const cabinet = [
    ...(OnLead.CABINET || []),
    { href: "#/office/profile", icon: "user", label: "Профиль" },
  ].map((it) => OnLead.lkSideLink(path, it)).join("");
  return `<aside class="lk-side" aria-label="Навигация кабинета">
    <div class="lk-side-head">
      <a class="lk-logo" href="#/office"><span class="logo-mark" aria-hidden="true"></span> OnLead<span class="logo-dot">.</span></a>
      <button type="button" class="lk-side-close" data-act="lk-nav-close" aria-label="Закрыть меню">×</button>
    </div>
    <div class="lk-side-user">
      <div class="lk-ava">${initials}</div>
      <div class="lk-side-user__who">
        <b>${OnLead.esc(state.user?.name || state.user?.email || "Пользователь")}</b>
        <small>${acc ? `Активный · id ${OnLead.esc(acc.vkId)}` : "Аккаунт VK не подключён"}</small>
      </div>
    </div>
    <nav class="lk-side-nav">
      ${navSections}
      <div class="lk-side-sec">
        <div class="lk-side-sec-title">Инструменты VK</div>
        ${featured}
        ${bundles}
      </div>
      <div class="lk-side-sec">
        <div class="lk-side-sec-title">Кабинет</div>
        ${cabinet}
      </div>
    </nav>
    <div class="lk-side-foot">
      ${trial ? `<a class="lk-side-trial" href="#/office/subscriptions">Триал ${OnLead.esc(trial)} · оформить</a>` : ""}
      <button type="button" class="btn btn-ghost btn-sm lk-side-logout" data-act="logout">Выйти</button>
    </div>
  </aside>`;
}

OnLead.lkTopbar = function lkTopbar(path, state, trial, hideTitle = false) {
  const initials = OnLead.esc(OnLead.userInitials(state.user));
  const pending = (state.pendingPayments || [])[0];
  const pendingBanner = pending
    ? `<div class="lk-pending-pay">
        <span>Незавершённая оплата · ${OnLead.esc(pending.title || "платёж")} · ${Number(pending.amount || 0).toLocaleString("ru-RU")} ₽</span>
        <button type="button" class="btn btn-ink btn-sm" data-act="resume-pay" data-kind="${OnLead.esc(pending.kind || "topup")}" data-amount="${OnLead.esc(pending.amount || "")}" data-package="${OnLead.esc(pending.packageId || "")}" data-slug="${OnLead.esc(pending.slug || "")}" data-tgplan="${OnLead.esc(pending.tgPlan || "")}" data-m="${OnLead.esc(pending.months || 1)}" data-url="${OnLead.esc(pending.confirmationUrl || "")}">Продолжить</button>
      </div>`
    : "";
  return `<header class="lk-topbar">
    <button type="button" class="lk-burger" data-act="lk-nav-toggle" aria-label="Меню" aria-expanded="false">${OnLead.icon("menu")}</button>
    <div class="lk-topbar__title"${hideTitle ? ' hidden' : ""}>${OnLead.esc(OnLead.officeChrome(path).title)}</div>
    <div class="lk-bar-end">
      ${trial ? `<a class="lk-trial" href="#/office/subscriptions">триал ${OnLead.esc(trial)} · тариф</a>` : ""}
      <a class="lk-bal" href="#/office/balance">${state.balance.toLocaleString("ru-RU")} ₽</a>
      <details class="lk-account">
        <summary class="lk-ava" aria-label="Аккаунт">${initials}</summary>
        <div class="lk-account-menu">
          <div class="lk-account-who"><b>${OnLead.esc(state.user?.name || state.user?.email || "Пользователь")}</b><small>${OnLead.esc(state.user?.email || state.user?.id || "")}</small></div>
          <a href="#/office/profile">Профиль</a>
          <a href="#/office/balance">Баланс</a>
          <a href="#/office/referral">Рефералы</a>
          <a href="#/office/subscriptions">Тарифы</a>
          <button type="button" data-act="logout">Выйти</button>
        </div>
      </details>
    </div>
  </header>${pendingBanner}`;
}
