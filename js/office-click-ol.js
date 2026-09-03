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

    const domainHandlers = [OnLead.clickBilling, OnLead.clickLeadgen, OnLead.clickTelegram, OnLead.clickLandings];
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
