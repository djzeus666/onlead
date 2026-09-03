/**
 * Leadgen click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickLeadgen = async function clickLeadgen(act, btn, e) {
  if (act === "lg-save-cfg") { await OnLead.saveLeadgenCfg(); return true; }

  if (act === "lg-scan") { await OnLead.startLeadgenScan(); return true; }

  if (act === "lg-load-groups") { await OnLead.loadLeadgenGroups(); return true; }

  if (act === "lg-save-groups") {
        await OnLead.saveLeadgenGroups(true);
        document.getElementById("lg-groups-modal")?.setAttribute("hidden", "");
        return true;
      }

  if (act === "lg-del-phrase") { await OnLead.removeLeadgenPhrase(btn.dataset.id); return true; }

  if (act === "lg-del-exclude") { await OnLead.removeLeadgenExclude(btn.dataset.text); return true; }

  if (act === "lg-niche") { await OnLead.addLeadgenNiche(btn.dataset.id); return true; }

  if (act === "lg-save-match") {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { saveToCrm: true } });
        await OnLead.render(); return true;
      }

  if (act === "lg-del-match") {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "dismissed" } });
        await OnLead.render(); return true;
      }

  if (act === "lg-restore-match") {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "new" } });
        await OnLead.render(); return true;
      }

  if (act === "lg-filter") {
        OnLead._lgFilter = OnLead._lgFilter || { status: "", kind: "", phrase: "", author: "" };
        OnLead._lgFilter[btn.dataset.key] = btn.dataset.val;
        await OnLead.render(); return true;
      }

  if (act === "lg-apply-filters") {
        OnLead._lgFilter = OnLead._lgFilter || { status: "", kind: "", phrase: "", author: "" };
        OnLead._lgFilter.phrase = document.getElementById("lg-filter-phrase")?.value || "";
        OnLead._lgFilter.author = document.getElementById("lg-filter-author")?.value || "";
        await OnLead.render(); return true;
      }

  if (act === "lg-toggle-enabled") {
        await OnLead.api("/api/leadgen", { method: "PATCH", body: { enabled: btn.dataset.val === "1" } });
        await OnLead.refresh();
        await OnLead.render(); return true;
      }

  if (act === "lg-mark-saved") {
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "PATCH", body: { status: "saved" } });
        await OnLead.render(); return true;
      }

  if (act === "lg-delete-match") {
        if (!confirm("Удалить совпадение безвозвратно?")) return true;
        await OnLead.api("/api/leadgen/matches/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.render(); return true;
      }

  if (act === "lg-expand-match") {
        OnLead._lgExpanded = OnLead._lgExpanded === btn.dataset.id ? null : btn.dataset.id;
        await OnLead.render(); return true;
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
        return true;
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
        return true;
      }

  if (act === "lg-copy-draft") {
        await navigator.clipboard?.writeText(btn.dataset.text || "");
        btn.textContent = "Скопировано";
        return true;
      }

  if (act === "lg-open-groups") {
        document.getElementById("lg-groups-modal")?.removeAttribute("hidden");
        await OnLead.loadLeadgenGroups();
        return true;
      }

  if (act === "lg-close-groups") {
        document.getElementById("lg-groups-modal")?.setAttribute("hidden", "");
        return true;
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
        await OnLead.render(); return true;
      }

  if (act === "lg-groups-all" || act === "lg-groups-none") {
        OnLead.applyLeadgenGroupChecks(act === "lg-groups-all");
        return true;
      }
  return false;
};
