/**
 * Content / compose / RSS / workflow click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickContent = async function clickContent(act, btn, e) {
  if (act === "studio-next") {
    const step = Number(OnLead._studioStep || 1);
    OnLead._studioDraft = OnLead._studioDraft || { niche: "services", days: 7, brand: "" };
    if (step === 1) {
      OnLead._studioDraft.brand = document.getElementById("studio-brand")?.value || "";
    }
    OnLead._studioStep = Math.min(3, step + 1);
    await OnLead.render();
    return true;
  }
  if (act === "studio-prev") {
    OnLead._studioStep = Math.max(1, Number(OnLead._studioStep || 1) - 1);
    await OnLead.render();
    return true;
  }
  if (act === "studio-pick-niche") {
    OnLead._studioDraft = OnLead._studioDraft || { niche: "services", days: 7, brand: "" };
    OnLead._studioDraft.niche = btn.dataset.id || "services";
    await OnLead.render();
    return true;
  }

  if (act === "compose-ai") {
        const form = document.getElementById("compose-form");
        const id = form?.dataset.id;
        if (!id) { alert("Сначала сохраните черновик"); return true; }
        await OnLead.saveComposeDraft(form, { quiet: true });
        try {
          await OnLead.api("/api/posts/" + id + "/ai-text", { method: "POST", body: {} });
          OnLead._flash = "Текст сгенерирован";
          await OnLead.render();
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "compose-schedule") {
        const form = document.getElementById("compose-form");
        if (!form) return true;
        const body = OnLead.composeFormBody(form);
        if (!body.scheduledAt) { alert("Укажите дату и время в поле «Расписание»"); return true; }
        body.status = "scheduled";
        const id = form.dataset.id;
        if (id) await OnLead.api("/api/posts/" + id, { method: "PATCH", body });
        else await OnLead.saveComposeDraft(form);
        OnLead._flash = "Пост запланирован";
        OnLead.go("/office/content");
        await OnLead.render();
        return true;
      }

  if (act === "compose-publish") {
        const form = document.getElementById("compose-form");
        if (!form) return true;
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
        return true;
      }

  if (act === "compose-trash") {
        if (!OnLead.confirmDel("пост")) return true;
        await OnLead.api("/api/posts/" + btn.dataset.id, { method: "DELETE" });
        OnLead._flash = "Пост в корзине";
        OnLead.go("/office/content");
        await OnLead.render();
        return true;
      }

  if (act === "compose-submit-approval") {
        const form = document.getElementById("compose-form");
        if (!form) return true;
        const id = await OnLead.saveComposeDraft(form, { quiet: true });
        try {
          await OnLead.api("/api/posts/" + id + "/submit-approval", { method: "POST" });
          OnLead._flash = "Отправлено на согласование";
          OnLead.go("/office/workflow");
          await OnLead.render();
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "compose-pick-media") {
        try {
          const lib = await OnLead.api("/api/media/library");
          const rows = [...(lib.uploads || []), ...(lib.ai || [])];
          if (!rows.length) { alert("Медиатека пуста — загрузите фото или создайте в AI-картинках"); return true; }
          const list = rows.slice(0, 8).map((r, i) => `${i + 1}. ${(r.prompt || r.name || r.url).slice(0, 40)}`).join("\n");
          const n = prompt(`Номер фото (1–${Math.min(8, rows.length)}):\n${list}`);
          const idx = Number(n) - 1;
          if (idx >= 0 && rows[idx]) {
            OnLead._composePickMedia = rows[idx].url;
            await OnLead.render();
          }
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "ai-use-compose") {
        OnLead._composePickMedia = btn.dataset.url || "";
        OnLead.go("/office/compose");
        return true;
      }

  if (act === "ai-preset") {
        const ta = document.querySelector('#ai-images-form [name="prompt"]');
        if (ta) ta.value = (btn.dataset.prompt || btn.textContent || "").trim();
        return true;
      }

  if (act === "cal-prev") {
        const d = OnLead._calMonth || new Date();
        OnLead._calMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        await OnLead.loadContentCalendar?.();
        await OnLead.render();
        return true;
      }

  if (act === "cal-next") {
        const d = OnLead._calMonth || new Date();
        OnLead._calMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        await OnLead.loadContentCalendar?.();
        await OnLead.render();
        return true;
      }

  if (act === "wf-approve") {
        await OnLead.api("/api/posts/" + btn.dataset.id + "/approve", { method: "POST" });
        OnLead._flash = "Пост утверждён";
        await OnLead.loadWorkflow?.();
        await OnLead.render();
        return true;
      }

  if (act === "wf-reject") {
        const reason = prompt("Причина отклонения (необязательно)") || "";
        await OnLead.api("/api/posts/" + btn.dataset.id + "/reject", { method: "POST", body: { reason } });
        OnLead._flash = "Пост отклонён";
        await OnLead.loadWorkflow?.();
        await OnLead.render();
        return true;
      }

  if (act === "wf-mode") {
        await OnLead.api("/api/workflow/settings", { method: "PATCH", body: { approvalMode: btn.dataset.mode } });
        OnLead._flash = "Режим сохранён";
        await OnLead.loadWorkflow?.();
        await OnLead.render();
        return true;
      }

  if (act === "repost-pick-src") {
        OnLead._repostSourceId = btn.dataset.id;
        await OnLead.render();
        return true;
      }

  if (act === "repost-fetch") {
        try {
          const r = await OnLead.api("/api/repost/sources/" + btn.dataset.id + "/fetch", { method: "POST" });
          OnLead._flash = `+${r.created || 0} новых, ${r.updated || 0} обновлено`;
          await OnLead.loadRepostItems?.();
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "repost-del-src") {
        if (!OnLead.confirmDel("источник")) return true;
        await OnLead.api("/api/repost/sources/" + btn.dataset.id, { method: "DELETE" });
        OnLead._repostSourceId = "";
        OnLead._flash = "Источник удалён";
        await OnLead.render();
        return true;
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
        return true;
      }

  if (act === "repost-import") {
        const sourceId = document.getElementById("repost-items-box")?.dataset.source;
        const ids = [...document.querySelectorAll('input[name="repost-item"]:checked')].map((el) => el.value);
        if (!sourceId || !ids.length) { alert("Выберите посты"); return true; }
        try {
          const r = await OnLead.api("/api/repost/import", { method: "POST", body: { sourceId, items: ids.map((itemId) => ({ itemId })) } });
          OnLead._flash = `Импортировано: ${r.imported || 0}`;
          await OnLead.loadRepostItems?.();
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "cnt-copy-url") {
        await navigator.clipboard?.writeText(btn.dataset.url || "");
        btn.textContent = "OK";
        return true;
      }

  if (act === "cnt-del-media") {
        if (!confirm("Удалить файл?")) return true;
        await OnLead.api("/api/media/" + btn.dataset.name, { method: "DELETE" });
        OnLead._flash = "Файл удалён";
        await OnLead.loadContentMediaGrid?.();
        return true;
      }

  if (act === "rss-pick-src") {
        OnLead._rssSourceId = btn.dataset.id;
        await OnLead.render();
        return true;
      }

  if (act === "webhook-copy") {
        const url = OnLead._inboundWebhookUrl || document.querySelector(".ap-webhook-url")?.value || "";
        if (url) await navigator.clipboard?.writeText(url);
        btn.textContent = "Скопировано";
        setTimeout(() => { btn.textContent = "Копировать URL"; }, 1500);
        return true;
      }

  if (act === "webhook-rotate") {
        if (!confirm("Старый URL перестанет работать. Сменить токен?")) return true;
        try {
          const r = await OnLead.api("/api/webhooks/inbound/token/rotate", { method: "POST" });
          OnLead._inboundWebhookUrl = r.url || "";
          OnLead._flash = "Webhook URL обновлён";
          await OnLead.render();
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "rss-fetch") {
        try {
          const r = await OnLead.api("/api/rss/sources/" + btn.dataset.id + "/fetch", { method: "POST" });
          OnLead._flash = `+${r.created || 0} новых, ${r.updated || 0} обновлено`;
          await OnLead.render();
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "rss-del-src") {
        if (!OnLead.confirmDel(btn.dataset.name || "источник")) return true;
        await OnLead.api("/api/rss/sources/" + btn.dataset.id, { method: "DELETE" });
        OnLead._rssSourceId = "";
        OnLead._flash = "Источник удалён";
        await OnLead.render();
        return true;
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
        return true;
      }

  if (act === "rss-import") {
        const sourceId = btn.dataset.source || document.getElementById("rss-items-box")?.dataset.source;
        const ids = [...document.querySelectorAll('input[name="rss-item"]:checked')].map((el) => el.value);
        if (!ids.length) { alert("Отметьте записи"); return true; }
        try {
          const r = await OnLead.api("/api/rss/import", {
            method: "POST",
            body: { sourceId, items: ids.map((id) => ({ itemId: id })) },
          });
          OnLead._flash = `Импортировано: ${r.imported}`;
          OnLead.go("/office/content");
          await OnLead.render();
        } catch (err) { alert(err.message); }
        return true;
      }

  if (act === "cross-plat") {
        const p = btn.dataset.plat;
        const plats = OnLead._crosspostPlats || ["vk", "telegram"];
        OnLead._crosspostPlats = plats.includes(p) ? plats.filter((x) => x !== p) : [...plats, p];
        await OnLead.render();
        return true;
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
        return true;
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
        return true;
      }

  if (act === "analytics-days") {
        OnLead._analyticsDays = Number(btn.dataset.days) || 30;
        await OnLead.render();
        return true;
      }

  if (act === "cab-del-item") {
        const kind = btn.dataset.kind;
        const id = btn.dataset.id;
        const c = OnLead.load().cabinet || {};
        const list = (c[kind] || []).filter((x) => x.id !== id);
        await OnLead.api("/api/cabinet/settings", { method: "PATCH", body: { [kind]: list } });
        OnLead._flash = "Удалено";
        await OnLead.render();
        return true;
      }
  return false;
};
