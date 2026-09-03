/**
 * Office click dispatcher + tool form (domain acts in click-*-ol.js)
 */
window.OnLead = window.OnLead || {};

OnLead.onClick = async function onClick(e) {
  const btn = e.target.closest("[data-act]");
  if (e.target.closest(".lk-side a") && OnLead.lkNavNarrow()) OnLead.setLkNav(false);
  if (!btn) return;
  if (btn.disabled || btn.hasAttribute("disabled")) return;
  if (btn.tagName === "BUTTON") e.preventDefault();
  const act = btn.dataset.act;
  try {

    const domainHandlers = [OnLead.clickBilling, OnLead.clickLeadgen, OnLead.clickTelegram, OnLead.clickLandings, OnLead.clickNeuro, OnLead.clickAiLead, OnLead.clickCrm, OnLead.clickContent, OnLead.clickVkTools];
    for (const h of domainHandlers) {
      if (typeof h === "function" && await h(act, btn, e)) return;
    }
    if (act === "logout") {
      OnLead._lgChecked = undefined;
      OnLead._lgLoadedGroups = null;
      OnLead.logout();
      OnLead.render();
      return;
    }
    if (act === "lk-nav-toggle") {
      const app = document.querySelector(".app");
      OnLead.setLkNav(!app?.classList.contains("nav-open"));
      return;
    }
    if (act === "lk-nav-close") {
      OnLead.setLkNav(false);
      return;
    }
    
    if (act === "dash-chart") {
      OnLead._chartDays = Number(btn.dataset.days || 30);
      await OnLead.render();
      return;
    }
    
    if (act === "promo-hide") {
      try { localStorage.setItem("onlead-promo-hide", "1"); } catch { /* ignore */ }
      await OnLead.render();
      return;
    }
    if (act === "dash-onboarding-dismiss") {
      try { localStorage.setItem("onlead.onboarding.dismissed", "1"); } catch { /* ignore */ }
      await OnLead.render();
      return;
    }
    
    
    if (act === "copy") {
      navigator.clipboard?.writeText(btn.dataset.text || "");
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "save-profile") {
      await OnLead.api("/api/me", { method: "PATCH", body: { name: $("#prof-name").value, email: $("#prof-email").value } });
      await OnLead.render(); return;
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  } catch (err) { alert(err.message); }
}

OnLead.onToolSubmit = async function onToolSubmit(e) {
  e.preventDefault();
  const slug = e.target.dataset.slug;
  const state = OnLead.load();
  if (!OnLead.toolOn(state, slug)) return;
  const data = Object.fromEntries(new FormData(e.target).entries());
  const accountId = data.accountId || state.activeAccount;
  delete data.accountId;
  const btn = e.target.querySelector("button[type=submit]");
  const prev = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    if (slug === "image-ai") btn.textContent = "Создаём картинку…";
  }
  try {
    await OnLead.api("/api/campaigns", { method: "POST", body: { slug, accountId, payload: data } });
    await OnLead.render();
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      if (prev) btn.textContent = prev;
    }
    alert(err.message);
  }
}
OnLead.handleOfficeClick = OnLead.onClick;
