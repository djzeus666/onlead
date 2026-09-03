/**
 * Office click + tool form handlers (extracted from app.js)
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
    if (act === "topup") {
      await OnLead.startCheckout({ kind: "topup", amount: Number(btn.dataset.amount || 1000) }, btn);
      return;
    }
    if (act === "dash-chart") {
      OnLead._chartDays = Number(btn.dataset.days || 30);
      await OnLead.render();
      return;
    }
    if (act === "sub-period") {
      OnLead._packMonths = Number(btn.dataset.m || 1);
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
    if (act === "transfer-ref") {
      await OnLead.api("/api/billing/transfer-ref", { method: "POST", body: { amount: "all" } });
      OnLead._flash = "Реферальный баланс переведён на основной счёт.";
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "resume-pay") {
      const kind = btn.dataset.kind || "topup";
      const body = { kind, method: "yookassa" };
      if (kind === "topup") body.amount = Number(btn.dataset.amount || 1000);
      if (kind === "package") {
        body.packageId = btn.dataset.package;
        body.months = Number(btn.dataset.m || 1);
      }
      if (kind === "tool") {
        body.slug = btn.dataset.slug;
        body.months = Number(btn.dataset.m || 1);
      }
      if (kind === "tg-plan") {
        body.tgPlan = btn.dataset.tgplan;
        body.months = Number(btn.dataset.m || 1);
      }
      await OnLead.startCheckout(body, btn);
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
    if (act === "vk-connect-open") { OnLead.openVkConnectModal(); return; }
    if (act === "vk-connect-close") { OnLead.closeVkConnectModal(); return; }
    if (act === "vk-event-log") { OnLead.openVkEventLogModal(); return; }
    if (act === "vk-event-close") { OnLead.closeVkEventLogModal(); return; }
    if (act === "vk-rent-slot") { OnLead.go("/office/subscriptions"); return; }
    if (act === "vk-login") { await OnLead.startVkOAuth(); return; }
    if (act === "vk-refresh-channels") { await OnLead.refreshVkChannels(btn.dataset.id); return; }
    if (act === "vk-save-token") { OnLead.saveVkTokenFromPaste(); return; }
    if (act === "vk-msg-login") { await OnLead.startVkMessagesOAuth(btn.dataset.id); return; }
    if (act === "vk-msg-save") { await OnLead.saveVkMessagesToken(btn.dataset.id); return; }
    if (act === "vk-msg-clear") {
      await OnLead.api("/api/accounts/" + btn.dataset.id + "/messages-token", {
        method: "POST",
        body: { clear: true },
      });
      await OnLead.render();
      return;
    }
    if (act === "vk-mock") {
      await OnLead.api("/api/accounts", { method: "POST", body: { token: "mock:vk" } });
      await OnLead.render(); return;
    }
    if (act === "lg-save-cfg") { await OnLead.saveLeadgenCfg(); return; }
    if (act === "lg-scan") { await OnLead.startLeadgenScan(); return; }
    if (act === "lg-load-groups") { await OnLead.loadLeadgenGroups(); return; }
    if (act === "lg-save-groups") {
      await OnLead.saveLeadgenGroups(true);
      document.getElementById("lg-groups-modal")?.setAttribute("hidden", "");
      return;
    }
    if (act === "lg-del-phrase") { await OnLead.removeLeadgenPhrase(btn.dataset.id); return; }
    if (act === "lg-del-exclude") { await OnLead.removeLeadgenExclude(btn.dataset.text); return; }
    if (act === "lg-niche") { await OnLead.addLeadgenNiche(btn.dataset.id); return; }
    if (act === "lg-save-match") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { saveToCrm: true } });
      await OnLead.render(); return;
    }
    if (act === "lg-del-match") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "dismissed" } });
      await OnLead.render(); return;
    }
    if (act === "lg-restore-match") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "new" } });
      await OnLead.render(); return;
    }
    if (act === "lg-filter") {
      OnLead._lgFilter = OnLead._lgFilter || { status: "", kind: "", phrase: "", author: "" };
      OnLead._lgFilter[btn.dataset.key] = btn.dataset.val;
      await OnLead.render(); return;
    }
    if (act === "lg-apply-filters") {
      OnLead._lgFilter = OnLead._lgFilter || { status: "", kind: "", phrase: "", author: "" };
      OnLead._lgFilter.phrase = document.getElementById("lg-filter-phrase")?.value || "";
      OnLead._lgFilter.author = document.getElementById("lg-filter-author")?.value || "";
      await OnLead.render(); return;
    }
    if (act === "lg-toggle-enabled") {
      await OnLead.api("/api/leadgen", { method: "PATCH", body: { enabled: btn.dataset.val === "1" } });
      await OnLead.refresh();
      await OnLead.render(); return;
    }
    if (act === "lg-mark-saved") {
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "saved" } });
      await OnLead.render(); return;
    }
    if (act === "lg-delete-match") {
      if (!confirm("Удалить совпадение безвозвратно?")) return;
      await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.render(); return;
    }
    if (act === "lg-expand-match") {
      OnLead._lgExpanded = OnLead._lgExpanded === btn.dataset.id ? null : btn.dataset.id;
      await OnLead.render(); return;
    }
    if (act === "lg-ai-score") {
      btn.disabled = true;
      try {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id + "/ai-score", { method: "POST" });
        await OnLead.refresh();
        OnLead._lgExpanded = btn.dataset.id;
        await OnLead.render();
      } catch (err) { alert(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (act === "lg-ai-draft") {
      btn.disabled = true;
      try {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id + "/ai-draft", { method: "POST" });
        await OnLead.refresh();
        OnLead._lgExpanded = btn.dataset.id;
        await OnLead.render();
      } catch (err) { alert(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (act === "lg-copy-draft") {
      await navigator.clipboard?.writeText(btn.dataset.text || "");
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "lg-open-groups") {
      document.getElementById("lg-groups-modal")?.removeAttribute("hidden");
      await OnLead.loadLeadgenGroups();
      return;
    }
    if (act === "lg-close-groups") {
      document.getElementById("lg-groups-modal")?.setAttribute("hidden", "");
      return;
    }
    if (act === "nc-tab") {
      OnLead._ncTab = btn.dataset.tab || "settings";
      OnLead._ncDialogId = "";
      OnLead._ncThread = null;
      await OnLead.render();
      return;
    }
    if (act === "nc-task-filter") {
      OnLead._ncTaskFilter = btn.dataset.val || "";
      await OnLead.render();
      return;
    }
    if (act === "nc-toggle-enabled") {
      const cfg = OnLead.load().neurocomments || {};
      await OnLead.api("/api/neurocomments", { method: "PATCH", body: { enabled: !cfg.enabled } });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "nc-discover") {
      await OnLead.api("/api/neurocomments/discover", { method: "POST" });
      await OnLead.refresh();
      OnLead._flash = "Поиск постов выполнен";
      await OnLead.render();
      return;
    }
    if (act === "nc-save-settings") {
      await OnLead.api("/api/neurocomments", {
        method: "PATCH",
        body: {
          accountId: document.getElementById("nc-account")?.value || null,
          dailyLimit: Number(document.getElementById("nc-limit")?.value || 20),
          tonePrompt: document.getElementById("nc-tone")?.value || "",
        },
      });
      await OnLead.refresh();
      OnLead._flash = "Настройки сохранены";
      await OnLead.render();
      return;
    }
    if (act === "nc-toggle-mode") {
      const key = btn.dataset.key;
      const val = btn.dataset.val === "1";
      if (!key) return;
      await OnLead.api("/api/neurocomments", { method: "PATCH", body: { [key]: val } });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "nc-add-target") {
      const raw = String(document.getElementById("nc-target-raw")?.value || "").trim();
      if (!raw) return alert("Укажите ссылку или id");
      await OnLead.api("/api/neurocomments/targets", {
        method: "POST",
        body: { mode: document.getElementById("nc-target-mode")?.value || "wall", raw },
      });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "nc-del-target") {
      await OnLead.api("/api/neurocomments/targets/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "nc-cancel-task") {
      await OnLead.api("/api/neurocomments/tasks/" + btn.dataset.id + "/cancel", { method: "POST" });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "nc-add-block") {
      const recipientId = String(document.getElementById("nc-block-id")?.value || "").trim();
      if (!recipientId) return alert("Укажите id");
      await OnLead.api("/api/neurocomments/blocks", { method: "POST", body: { recipientId } });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "nc-del-block") {
      await OnLead.api("/api/neurocomments/blocks/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "nc-pick-dialog") {
      OnLead._ncDialogId = btn.dataset.id;
      OnLead._ncThread = null;
      await OnLead.render();
      try {
        OnLead._ncThread = await OnLead.api("/api/neurocomments/dialogs/" + btn.dataset.id);
        await OnLead.render();
      } catch (err) {
        alert(err.message);
      }
      return;
    }
    if (act === "nc-faq") {
      OnLead._ncFaqTab = btn.dataset.tab || "overview";
      OnLead._ncFaqOpen = true;
      await OnLead.render();
      return;
    }
    if (act === "nc-faq-close") {
      OnLead._ncFaqOpen = false;
      await OnLead.render();
      return;
    }
    if (act === "al-toggle") {
      const cfg = OnLead.load().aiLead || {};
      await OnLead.api("/api/ai-lead", { method: "PATCH", body: { enabled: !cfg.enabled } });
      OnLead._alRunMsg = "";
      OnLead._alRunErr = "";
      await OnLead.render();
      return;
    }
    if (act === "al-save" || act === "al-save-list") {
      const body = OnLead.aiLeadCollectForm ? OnLead.aiLeadCollectForm() : {};
      await OnLead.api("/api/ai-lead", { method: "PATCH", body });
      OnLead._flash = "Сценарий сохранён";
      await OnLead.render();
      return;
    }
    if (act === "al-run") {
      try {
        OnLead._alRunErr = "";
        const body = OnLead.aiLeadCollectForm ? OnLead.aiLeadCollectForm() : {};
        await OnLead.api("/api/ai-lead", { method: "PATCH", body });
        const r = await OnLead.api("/api/ai-lead/run", { method: "POST" });
        OnLead._alRunMsg = r.message || "Готово";
        await OnLead.refresh();
        await OnLead.render();
      } catch (err) {
        OnLead._alRunMsg = "";
        OnLead._alRunErr = err.message || "Ошибка запуска";
        await OnLead.render();
      }
      return;
    }
    if (act === "tg-funnel-tab") {
      OnLead._tgFunnelTab = btn.dataset.tab || "products";
      OnLead._tgFunnelCacheId = null;
      await OnLead.render();
      return;
    }
    if (act === "tg-product-save") {
      const fid = btn.dataset.fid;
      const pid = btn.dataset.pid;
      const body = OnLead.tgProductCollect ? OnLead.tgProductCollect() : {};
      if (pid) {
        await OnLead.api("/api/tg/funnels/" + fid + "/products/" + pid, { method: "PATCH", body });
      } else {
        await OnLead.api("/api/tg/funnels/" + fid + "/products", { method: "POST", body });
      }
      OnLead._tgProductDraft = null;
      OnLead._tgFunnelCacheId = null;
      await OnLead.render();
      return;
    }
    if (act === "tg-product-edit") {
      try { OnLead._tgProductDraft = JSON.parse(btn.dataset.json || "{}"); } catch { OnLead._tgProductDraft = {}; }
      await OnLead.render();
      return;
    }
    if (act === "tg-product-cancel") {
      OnLead._tgProductDraft = null;
      await OnLead.render();
      return;
    }
    if (act === "tg-product-toggle") {
      await OnLead.api("/api/tg/funnels/" + btn.dataset.fid + "/products/" + btn.dataset.pid, {
        method: "PATCH",
        body: { active: btn.dataset.active === "1" },
      });
      OnLead._tgFunnelCacheId = null;
      await OnLead.render();
      return;
    }
    if (act === "tg-product-del") {
      if (!OnLead.confirmDel("товар")) return;
      await OnLead.api("/api/tg/funnels/" + btn.dataset.fid + "/products/" + btn.dataset.pid, { method: "DELETE" });
      OnLead._tgFunnelCacheId = null;
      await OnLead.render();
      return;
    }
    if (act === "lb-tab") {
      OnLead._lbTab = btn.dataset.tab || "list";
      await OnLead.render();
      return;
    }
    if (act === "lb-pick-kind") {
      OnLead._lbKind = btn.dataset.kind || "lead";
      await OnLead.render();
      return;
    }
    if (act === "lb-create") {
      const r = await OnLead.api("/api/lead-bots", {
        method: "POST",
        body: {
          kind: OnLead._lbKind || "lead",
          business: document.getElementById("lb-business")?.value || "",
          city: document.getElementById("lb-city")?.value || "",
          goal: document.getElementById("lb-goal")?.value || "",
          contact: document.getElementById("lb-contact")?.value || "",
        },
      });
      OnLead._lbTab = "list";
      if (r.kind === "widget") {
        const sn = await OnLead.api("/api/lead-bots/" + r.id + "/widget-snippet");
        OnLead._lbSnippet = sn.snippet || "";
      }
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "lb-snippet") {
      const sn = await OnLead.api("/api/lead-bots/" + btn.dataset.id + "/widget-snippet");
      OnLead._lbSnippet = sn.snippet || "";
      await OnLead.render();
      return;
    }
    if (act === "lb-snippet-close") {
      OnLead._lbSnippet = "";
      await OnLead.render();
      return;
    }
    if (act === "lb-copy-snippet") {
      const ta = document.querySelector(".tg-snippet-ta");
      if (ta) {
        ta.select();
        try { document.execCommand("copy"); OnLead._flash = "Сниппет скопирован"; } catch { /* ignore */ }
      }
      return;
    }
    if (act === "lb-funnel") {
      const r = await OnLead.api("/api/lead-bots/" + btn.dataset.id + "/deploy-funnel", { method: "POST" });
      OnLead._flash = "Воронка создана из сценария";
      await OnLead.refresh();
      if (r.funnel?.id) OnLead.go("/office/telegram/funnels/" + r.funnel.id);
      else await OnLead.render();
      return;
    }
    if (act === "lb-del") {
      if (!OnLead.confirmDel(btn.dataset.name || "бот")) return;
      await OnLead.api("/api/lead-bots/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    if (act === "lg-save-notify") {
      const excludes = String(document.getElementById("lg-excludes")?.value || "")
        .split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      await OnLead.api("/api/leadgen", {
        method: "PATCH",
        body: {
          notifyEmail: !!document.getElementById("lg-notify-email")?.checked,
          notifyTelegram: !!document.getElementById("lg-notify-tg")?.checked,
          telegramChatId: document.getElementById("lg-tg-chat")?.value || "",
          excludePhrases: excludes,
        },
      });
      OnLead._flash = "Настройки уведомлений сохранены";
      await OnLead.render(); return;
    }
    if (act === "lg-groups-all" || act === "lg-groups-none") {
      OnLead.applyLeadgenGroupChecks(act === "lg-groups-all");
      return;
    }
    if (act === "list-del") {
      if (!OnLead.confirmDel(btn.dataset.name || "список")) return;
      await OnLead.api("/api/lists/" + btn.dataset.id, { method: "DELETE" });
      OnLead.go("/office/tools/lists");
      await OnLead.render();
      return;
    }
    if (act === "list-rename") {
      const name = prompt("Название списка", btn.dataset.name || "");
      if (name == null) return;
      const title = name.trim();
      if (!title) return;
      await OnLead.api("/api/lists/" + btn.dataset.id, { method: "PATCH", body: { name: title } });
      await OnLead.render();
      return;
    }
    if (act === "list-copy") {
      const list = await OnLead.api("/api/lists/" + btn.dataset.id);
      const ids = (list.items || []).map((p) => p.id).join("\n");
      await navigator.clipboard?.writeText(ids);
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "list-crm") {
      await OnLead.api("/api/lists/" + btn.dataset.id + "/crm", { method: "POST" });
      OnLead._flash = "Людей из списка отправили в CRM.";
      OnLead.go("/office/crm");
      await OnLead.render();
      return;
    }
    if (act === "del-acc") {
      await OnLead.api("/api/accounts/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.render(); return;
    }
    if (act === "buy-pack") {
      await OnLead.startCheckout({
        packageId: btn.dataset.id,
        months: Number(btn.dataset.m || 1),
        amount: Number(btn.dataset.amount || 0),
      }, btn);
      return;
    }
    if (act === "buy-tool") {
      await OnLead.startCheckout({ slug: btn.dataset.slug, months: Number(btn.dataset.m || 1), amount: Number(btn.dataset.amount || 0) }, btn);
      return;
    }
    if (act === "buy-tg") {
      await OnLead.startCheckout({ kind: "tg-plan", tgPlan: btn.dataset.plan, months: Number(btn.dataset.m || 1), amount: Number(btn.dataset.amount || 0) }, btn);
      return;
    }
    if (act === "tg-trial") {
      await OnLead.api("/api/tg/trial", { method: "POST" });
      OnLead._flash = "Три дня Telegram включены: 1 слот Lite.";
      await OnLead.render();
      return;
    }
    if (act === "new-landing") {
      await OnLead.createLanding(btn.dataset.name || "Новая страница", btn.dataset.template || "");
      return;
    }
    if (act === "ol-save-landing") {
      await OnLead.saveOlLandingEditor();
      return;
    }
    if (act === "ol-ai-generate") {
      const editor = document.querySelector(".ol-editor");
      const id = editor?.dataset.id;
      if (!id) return;
      const business = document.getElementById("ol-ai-business")?.value || "";
      const city = document.getElementById("ol-ai-city")?.value || "";
      btn.disabled = true;
      try {
        await OnLead.api("/api/landings/" + id + "/generate", { method: "POST", body: { business, city } });
        OnLead._flash = "AI переписал тексты — проверьте блоки и сохраните.";
        await OnLead.refresh();
        await OnLead.render();
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
      return;
    }
    if (act === "ol-preview-toggle") {
      const box = document.getElementById("ol-preview-box");
      const editor = document.querySelector(".ol-editor");
      if (!box || !editor) return;
      const open = box.hasAttribute("hidden");
      if (open) {
        const page = (OnLead.load().landings || []).find((p) => p.id === editor.dataset.id) || {};
        const content = OnLead.collectLandingOlContent(editor, page);
        box.innerHTML = OnLead.landingOlPublicHtml({ ...page, content }, { preview: true });
        box.removeAttribute("hidden");
        btn.textContent = "Скрыть предпросмотр";
      } else {
        box.setAttribute("hidden", "");
        box.innerHTML = "";
        btn.textContent = "Предпросмотр";
      }
      return;
    }
    if (act === "publish-landing") {
      const olEd = document.querySelector(".ol-editor");
      let body = { status: btn.dataset.status };
      if (olEd) {
        const page = (OnLead.load().landings || []).find((p) => p.id === olEd.dataset.id) || {};
        const content = OnLead.collectLandingOlContent(olEd, page);
        const pro = OnLead.collectOlProFields ? OnLead.collectOlProFields(olEd) : {};
        body = {
          name: document.getElementById("ol-title")?.value || page.name,
          slug: document.getElementById("ol-slug")?.value || page.slug,
          seoDescription: document.getElementById("ol-seo")?.value || "",
          content,
          ...pro,
          status: btn.dataset.status,
        };
      } else {
        const form = $("#landing-edit-form");
        if (form) body = { ...landingFromForm(form), status: btn.dataset.status };
      }
      await OnLead.api("/api/landings/" + btn.dataset.id, { method: "PATCH", body });
      OnLead._flash = btn.dataset.status === "published" ? "Страница опубликована — можно делиться ссылкой." : "Страница снята с публикации.";
      await OnLead.render();
      return;
    }
    if (act === "copy-landing-url") {
      await navigator.clipboard?.writeText(btn.dataset.url || "");
      btn.textContent = "Скопировано";
      return;
    }
    if (act === "del-landing") {
      if (!OnLead.confirmDel(btn.dataset.name || "страницу")) return;
      await OnLead.api("/api/landings/" + btn.dataset.id, { method: "DELETE" });
      OnLead._flash = "Страницу удалили.";
      OnLead.go("/office/landings");
      await OnLead.render();
      return;
    }
    if (act === "crm-pick") {
      OnLead._crmSelectedId = btn.dataset.id;
      await OnLead.render();
      return;
    }
    if (act === "compose-ai") {
      const form = document.getElementById("compose-form");
      const id = form?.dataset.id;
      if (!id) { alert("Сначала сохраните черновик"); return; }
      await OnLead.saveComposeDraft(form, { quiet: true });
      try {
        await OnLead.api("/api/posts/" + id + "/ai-text", { method: "POST", body: {} });
        OnLead._flash = "Текст сгенерирован";
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "compose-schedule") {
      const form = document.getElementById("compose-form");
      if (!form) return;
      const body = OnLead.composeFormBody(form);
      if (!body.scheduledAt) { alert("Укажите дату и время в поле «Расписание»"); return; }
      body.status = "scheduled";
      const id = form.dataset.id;
      if (id) await OnLead.api("/api/posts/" + id, { method: "PATCH", body });
      else await OnLead.saveComposeDraft(form);
      OnLead._flash = "Пост запланирован";
      OnLead.go("/office/content");
      await OnLead.render();
      return;
    }
    if (act === "compose-publish") {
      const form = document.getElementById("compose-form");
      if (!form) return;
      const id = await OnLead.saveComposeDraft(form, { quiet: true });
      const fd = new FormData(form);
      try {
        const r = await OnLead.api("/api/posts/" + id + "/publish", {
          method: "POST",
          body: { accountId: fd.get("accountId"), ownerId: fd.get("ownerId") },
        });
        OnLead._flash = r.result?.permalink ? "Опубликовано в VK" : "Готово";
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "compose-trash") {
      if (!OnLead.confirmDel("пост")) return;
      await OnLead.api("/api/posts/" + btn.dataset.id, { method: "DELETE" });
      OnLead._flash = "Пост в корзине";
      OnLead.go("/office/content");
      await OnLead.render();
      return;
    }
    if (act === "compose-submit-approval") {
      const form = document.getElementById("compose-form");
      if (!form) return;
      const id = await OnLead.saveComposeDraft(form, { quiet: true });
      try {
        await OnLead.api("/api/posts/" + id + "/submit-approval", { method: "POST" });
        OnLead._flash = "Отправлено на согласование";
        OnLead.go("/office/workflow");
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "compose-pick-media") {
      try {
        const lib = await OnLead.api("/api/media/library");
        const rows = [...(lib.uploads || []), ...(lib.ai || [])];
        if (!rows.length) { alert("Медиатека пуста — загрузите фото или создайте в AI-картинках"); return; }
        const list = rows.slice(0, 8).map((r, i) => `${i + 1}. ${(r.prompt || r.name || r.url).slice(0, 40)}`).join("\n");
        const n = prompt(`Номер фото (1–${Math.min(8, rows.length)}):\n${list}`);
        const idx = Number(n) - 1;
        if (idx >= 0 && rows[idx]) {
          OnLead._composePickMedia = rows[idx].url;
          await OnLead.render();
        }
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "ai-use-compose") {
      OnLead._composePickMedia = btn.dataset.url || "";
      OnLead.go("/office/compose");
      return;
    }
    if (act === "ai-preset") {
      const ta = document.querySelector('#ai-images-form [name="prompt"]');
      if (ta) ta.value = btn.textContent.trim();
      return;
    }
    if (act === "cal-prev") {
      const d = OnLead._calMonth || new Date();
      OnLead._calMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      await OnLead.loadContentCalendar?.();
      await OnLead.render();
      return;
    }
    if (act === "cal-next") {
      const d = OnLead._calMonth || new Date();
      OnLead._calMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      await OnLead.loadContentCalendar?.();
      await OnLead.render();
      return;
    }
    if (act === "wf-approve") {
      await OnLead.api("/api/posts/" + btn.dataset.id + "/approve", { method: "POST" });
      OnLead._flash = "Пост утверждён";
      await OnLead.loadWorkflow?.();
      await OnLead.render();
      return;
    }
    if (act === "wf-reject") {
      const reason = prompt("Причина отклонения (необязательно)") || "";
      await OnLead.api("/api/posts/" + btn.dataset.id + "/reject", { method: "POST", body: { reason } });
      OnLead._flash = "Пост отклонён";
      await OnLead.loadWorkflow?.();
      await OnLead.render();
      return;
    }
    if (act === "wf-mode") {
      await OnLead.api("/api/workflow/settings", { method: "PATCH", body: { approvalMode: btn.dataset.mode } });
      OnLead._flash = "Режим сохранён";
      await OnLead.loadWorkflow?.();
      await OnLead.render();
      return;
    }
    if (act === "repost-pick-src") {
      OnLead._repostSourceId = btn.dataset.id;
      await OnLead.render();
      return;
    }
    if (act === "repost-fetch") {
      try {
        const r = await OnLead.api("/api/repost/sources/" + btn.dataset.id + "/fetch", { method: "POST" });
        OnLead._flash = `+${r.created || 0} новых, ${r.updated || 0} обновлено`;
        await OnLead.loadRepostItems?.();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "repost-del-src") {
      if (!OnLead.confirmDel("источник")) return;
      await OnLead.api("/api/repost/sources/" + btn.dataset.id, { method: "DELETE" });
      OnLead._repostSourceId = "";
      OnLead._flash = "Источник удалён";
      await OnLead.render();
      return;
    }
    if (act === "repost-save-src") {
      const card = btn.closest(".ap-settings");
      const wallSel = card?.querySelector('[name="ownerId"]');
      const wallOpt = wallSel?.selectedOptions?.[0];
      await OnLead.api("/api/repost/sources/" + btn.dataset.id, {
        method: "PATCH",
        body: {
          enabled: card?.querySelector('[name="enabled"]')?.checked,
          onlineMode: card?.querySelector('[name="onlineMode"]')?.checked,
          includeKeywords: card?.querySelector('[name="includeKeywords"]')?.value,
          excludeKeywords: card?.querySelector('[name="excludeKeywords"]')?.value,
          accountId: card?.querySelector('[name="accountId"]')?.value,
          ownerId: wallSel?.value,
          ownerLabel: wallOpt?.textContent || "",
        },
      });
      OnLead._flash = "Настройки сохранены";
      return;
    }
    if (act === "repost-import") {
      const sourceId = document.getElementById("repost-items-box")?.dataset.source;
      const ids = [...document.querySelectorAll('input[name="repost-item"]:checked')].map((el) => el.value);
      if (!sourceId || !ids.length) { alert("Выберите посты"); return; }
      try {
        const r = await OnLead.api("/api/repost/import", { method: "POST", body: { sourceId, items: ids.map((itemId) => ({ itemId })) } });
        OnLead._flash = `Импортировано: ${r.imported || 0}`;
        await OnLead.loadRepostItems?.();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "cnt-copy-url") {
      await navigator.clipboard?.writeText(btn.dataset.url || "");
      btn.textContent = "OK";
      return;
    }
    if (act === "cnt-del-media") {
      if (!confirm("Удалить файл?")) return;
      await OnLead.api("/api/media/" + btn.dataset.name, { method: "DELETE" });
      OnLead._flash = "Файл удалён";
      await OnLead.loadContentMediaGrid?.();
      return;
    }
    if (act === "rss-pick-src") {
      OnLead._rssSourceId = btn.dataset.id;
      await OnLead.render();
      return;
    }
    if (act === "webhook-copy") {
      const url = OnLead._inboundWebhookUrl || document.querySelector(".ap-webhook-url")?.value || "";
      if (url) await navigator.clipboard?.writeText(url);
      btn.textContent = "Скопировано";
      setTimeout(() => { btn.textContent = "Копировать URL"; }, 1500);
      return;
    }
    if (act === "webhook-rotate") {
      if (!confirm("Старый URL перестанет работать. Сменить токен?")) return;
      try {
        const r = await OnLead.api("/api/webhooks/inbound/token/rotate", { method: "POST" });
        OnLead._inboundWebhookUrl = r.url || "";
        OnLead._flash = "Webhook URL обновлён";
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "rss-fetch") {
      try {
        const r = await OnLead.api("/api/rss/sources/" + btn.dataset.id + "/fetch", { method: "POST" });
        OnLead._flash = `+${r.created || 0} новых, ${r.updated || 0} обновлено`;
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "rss-del-src") {
      if (!OnLead.confirmDel(btn.dataset.name || "источник")) return;
      await OnLead.api("/api/rss/sources/" + btn.dataset.id, { method: "DELETE" });
      OnLead._rssSourceId = "";
      OnLead._flash = "Источник удалён";
      await OnLead.render();
      return;
    }
    if (act === "rss-save-src") {
      const card = btn.closest(".ap-settings");
      const wallSel = card?.querySelector('[name="ownerId"]');
      const wallOpt = wallSel?.selectedOptions?.[0];
      await OnLead.api("/api/rss/sources/" + btn.dataset.id, {
        method: "PATCH",
        body: {
          enabled: card?.querySelector('[name="enabled"]')?.checked,
          onlineMode: card?.querySelector('[name="onlineMode"]')?.checked,
          aiRewrite: card?.querySelector('[name="aiRewrite"]')?.checked,
          accountId: card?.querySelector('[name="accountId"]')?.value,
          ownerId: wallSel?.value,
          ownerLabel: wallOpt?.textContent || "",
        },
      });
      OnLead._flash = "Настройки сохранены";
      await OnLead.render();
      return;
    }
    if (act === "rss-import") {
      const sourceId = btn.dataset.source || document.getElementById("rss-items-box")?.dataset.source;
      const ids = [...document.querySelectorAll('input[name="rss-item"]:checked')].map((el) => el.value);
      if (!ids.length) { alert("Отметьте записи"); return; }
      try {
        const r = await OnLead.api("/api/rss/import", {
          method: "POST",
          body: { sourceId, items: ids.map((id) => ({ itemId: id })) },
        });
        OnLead._flash = `Импортировано: ${r.imported}`;
        OnLead.go("/office/content");
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "cross-plat") {
      const p = btn.dataset.plat;
      const plats = OnLead._crosspostPlats || ["vk", "telegram"];
      OnLead._crosspostPlats = plats.includes(p) ? plats.filter((x) => x !== p) : [...plats, p];
      await OnLead.render();
      return;
    }
    if (act === "cross-adapt") {
      OnLead._crosspostSource = document.getElementById("cross-source")?.value || "";
      try {
        const r = await OnLead.api("/api/crosspost/adapt", {
          method: "POST",
          body: { text: OnLead._crosspostSource, platforms: OnLead._crosspostPlats || ["vk", "telegram"] },
        });
        OnLead._crosspostVersions = r.versions || {};
        OnLead._flash = "Адаптации готовы";
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "cross-drafts") {
      const versions = OnLead.collectCrosspostVersions ? OnLead.collectCrosspostVersions() : OnLead._crosspostVersions;
      const acc = document.getElementById("cross-account")?.value;
      const ownerId = document.getElementById("cross-owner")?.value;
      const ownerLabel = document.getElementById("cross-owner")?.selectedOptions?.[0]?.textContent || "";
      try {
        const r = await OnLead.api("/api/crosspost/drafts", {
          method: "POST",
          body: { versions, accountId: acc, ownerId, ownerLabel },
        });
        OnLead._flash = `Создано черновиков: ${r.count}`;
        OnLead.go("/office/content");
        await OnLead.render();
      } catch (err) { alert(err.message); }
      return;
    }
    if (act === "analytics-days") {
      OnLead._analyticsDays = Number(btn.dataset.days) || 30;
      await OnLead.render();
      return;
    }
    if (act === "cab-del-item") {
      const kind = btn.dataset.kind;
      const id = btn.dataset.id;
      const c = OnLead.load().cabinet || {};
      const list = (c[kind] || []).filter((x) => x.id !== id);
      await OnLead.api("/api/cabinet/settings", { method: "PATCH", body: { [kind]: list } });
      OnLead._flash = "Удалено";
      await OnLead.render();
      return;
    }
    if (act === "crm-quick-stage") {
      await OnLead.patchCrmLead(btn.dataset.id, { stage: btn.dataset.stage });
      await OnLead.render();
      return;
    }
    if (act === "new-lead") {
      const name = prompt("Имя лида", "Новый контакт");
      if (!name) return;
      await OnLead.api("/api/leads", { method: "POST", body: { name } });
      await OnLead.render(); return;
    }
    if (act === "edit-lead") {
      const name = prompt("Имя", btn.dataset.name || "");
      if (name == null) return;
      const phone = prompt("Телефон", btn.dataset.phone || "");
      if (phone == null) return;
      const city = prompt("Город", btn.dataset.city || "");
      if (city == null) return;
      const note = prompt("Заметка", btn.dataset.note || "");
      if (note == null) return;
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim(), phone, city, note } });
      await OnLead.render();
      return;
    }
    if (act === "del-lead") {
      if (!OnLead.confirmDel(btn.dataset.name || "лид")) return;
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.render();
      return;
    }
    if (act === "archive-lead") {
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { archived: true } });
      await OnLead.render();
      return;
    }
    if (act === "restore-lead") {
      await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { archived: false } });
      await OnLead.render();
      return;
    }
    if (act === "add-bot") {
      return;
    }
    if (act === "edit-bot") {
      const name = prompt("Название", btn.dataset.name || "");
      if (name == null) return;
      await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim() } });
      await OnLead.render();
      return;
    }
    if (act === "retoken-bot") {
      const token = prompt("Новый токен из @BotFather", "");
      if (token == null || !token.trim()) return;
      try {
        await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { token: token.trim() } });
        OnLead._flash = "Токен обновлён, webhook переустановлен.";
      } catch (err) {
        alert(err.message);
      }
      await OnLead.render();
      return;
    }
    if (act === "toggle-bot") {
      await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
      await OnLead.render();
      return;
    }
    if (act === "del-bot") {
      if (!OnLead.confirmDel(btn.dataset.name || "бота")) return;
      await OnLead.api("/api/bots/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.render();
      return;
    }
    if (act === "refresh-tg-channels") {
      const res = await OnLead.api("/api/tg/channels/refresh", { method: "POST" });
      OnLead._flash = res.added ? `Добавлено каналов: ${res.added}` : (res.found ? "Список обновлён, новых каналов нет." : "Telegram не прислал каналы. Сделайте бота админом и напишите в канал, затем обновите снова.");
      await OnLead.render();
      return;
    }
    if (act === "add-tg-channel") {
      const username = prompt("Канал (@name или ссылка)", "@onlead_channel");
      if (!username) return;
      await OnLead.api("/api/tg/channels", { method: "POST", body: { username, name: username } });
      await OnLead.render();
      return;
    }
    if (act === "edit-tg-channel") {
      const name = prompt("Название", btn.dataset.name || "");
      if (name == null) return;
      const username = prompt("Username", btn.dataset.username || "");
      if (username == null) return;
      await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim(), username: username.trim() } });
      await OnLead.render();
      return;
    }
    if (act === "toggle-tg-channel") {
      await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
      await OnLead.render();
      return;
    }
    if (act === "del-tg-channel") {
      if (!OnLead.confirmDel(btn.dataset.name || "канал")) return;
      await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.render();
      return;
    }
    if (act === "add-funnel") {
      return;
    }
    if (act === "new-funnel") {
      const sc = OnLead.tgScenario(btn.dataset.scenario);
      if (!sc) return;
      const row = await OnLead.api("/api/tg/funnels", {
        method: "POST",
        body: { name: sc.name, scenario: sc.id, kind: sc.kind, sections: sc.sections },
      });
      OnLead.go("/office/telegram/funnels/" + row.id);
      await OnLead.render();
      return;
    }
    if (act === "funnel-add-section") {
      document.getElementById("funnel-sections")?.insertAdjacentHTML("beforeend", OnLead.funnelSecHtml({ title: "Новый раздел", text: "", buttons: "" }));
      return;
    }
    if (act === "funnel-del-section") {
      btn.closest(".funnel-sec")?.remove();
      return;
    }
    if (act === "archive-funnel") {
      await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "PATCH", body: { status: "archive" } });
      await OnLead.render();
      return;
    }
    if (act === "edit-funnel") {
      OnLead.go("/office/telegram/funnels/" + btn.dataset.id);
      return;
    }
    if (act === "toggle-funnel") {
      await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
      await OnLead.render();
      return;
    }
    if (act === "del-funnel") {
      if (!OnLead.confirmDel(btn.dataset.name || "воронку")) return;
      await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "DELETE" });
      if (location.hash.includes("/funnels/")) OnLead.go("/office/telegram/funnels");
      await OnLead.render();
      return;
    }
    if (act === "pause-cam") {
      await OnLead.api("/api/campaigns/" + btn.dataset.id + "/pause", { method: "POST" });
      await OnLead.render(); return;
    }
    if (act === "vk-tool-toggle") {
      const slug = btn.dataset.slug;
      const st = OnLead.load();
      const list = st.campaigns[slug] || [];
      const anyRunning = list.some((c) => c.status === "running");
      const targets = list.filter((c) => (anyRunning ? c.status === "running" : c.status === "paused"));
      for (const c of targets) {
        await OnLead.api("/api/campaigns/" + c.id + "/pause", { method: "POST" });
      }
      await OnLead.render();
      return;
    }
    if (act === "vk-tool-run") {
      const form = document.getElementById("tool-form");
      if (!form) return alert("Заполните форму запуска ниже");
      form.requestSubmit();
      return;
    }
    if (act === "edit-cam") {
      const title = prompt("Название задачи", btn.dataset.title || "");
      if (title == null) return;
      await OnLead.api("/api/campaigns/" + btn.dataset.id, { method: "PATCH", body: { title: title.trim() } });
      await OnLead.render();
      return;
    }
    if (act === "del-cam") {
      if (!OnLead.confirmDel(btn.dataset.name || "задачу")) return;
      await OnLead.api("/api/campaigns/" + btn.dataset.id, { method: "DELETE" });
      await OnLead.render();
      return;
    }
    if (act === "gm-approve" || act === "gm-deny") {
      await OnLead.api("/api/vk/groups/requests", {
        method: "POST",
        body: {
          action: act === "gm-approve" ? "approve" : "deny",
          groupId: btn.dataset.gid,
          userId: btn.dataset.uid,
          accountId: $("#tool-form [name=accountId]")?.value,
        },
      });
      await OnLead.loadToolExtras("group-manager-vk");
      return;
    }
    if (act === "vk-chat-reply") {
      const peerId = btn.dataset.peer;
      const input = document.getElementById(`chat-reply-${peerId}`);
      const message = String(input?.value || "").trim();
      if (!message) return alert("Введите текст ответа");
      await OnLead.api("/api/vk/chats/reply", {
        method: "POST",
        body: {
          peerId,
          message,
          accountId: $("#tool-form [name=accountId]")?.value,
        },
      });
      if (input) input.value = "";
      OnLead._flash = "Сообщение отправлено";
      await OnLead.loadToolExtras("chat-manager-vk");
      return;
    }
    if (act === "confirm-receipt") {
      await OnLead.api("/api/tg/receipts/" + btn.dataset.id + "/confirm", { method: "POST" });
      await OnLead.refresh();
      OnLead._flash = "Оплата подтверждена, клиенту отправлено сообщение";
      await OnLead.loadTgReceipts();
      return;
    }
    if (act === "reject-receipt") {
      const note = prompt("Причина отклонения (необязательно)", "") ?? "";
      await OnLead.api("/api/tg/receipts/" + btn.dataset.id + "/reject", { method: "POST", body: { note } });
      await OnLead.loadTgReceipts();
      return;
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

