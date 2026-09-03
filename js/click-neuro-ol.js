/**
 * Neurocomment click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickNeuro = async function clickNeuro(act, btn, e) {
  if (act === "nc-tab") {
        OnLead._ncTab = btn.dataset.tab || "settings";
        OnLead._ncDialogId = "";
        OnLead._ncThread = null;
        await OnLead.render();
        return true;
      }

  if (act === "nc-task-filter") {
        OnLead._ncTaskFilter = btn.dataset.val || "";
        await OnLead.render();
        return true;
      }

  if (act === "nc-toggle-enabled") {
        const cfg = OnLead.load().neurocomments || {};
        await OnLead.api("/api/neurocomments", { method: "PATCH", body: { enabled: !cfg.enabled } });
        await OnLead.refresh();
        await OnLead.render();
        return true;
      }

  if (act === "nc-discover") {
        await OnLead.api("/api/neurocomments/discover", { method: "POST" });
        await OnLead.refresh();
        OnLead._flash = "Поиск постов выполнен";
        await OnLead.render();
        return true;
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
        return true;
      }

  if (act === "nc-toggle-mode") {
        const key = btn.dataset.key;
        const val = btn.dataset.val === "1";
        if (!key) return true;
        await OnLead.api("/api/neurocomments", { method: "PATCH", body: { [key]: val } });
        await OnLead.refresh();
        await OnLead.render();
        return true;
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
        return true;
      }

  if (act === "nc-del-target") {
        await OnLead.api("/api/neurocomments/targets/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.refresh();
        await OnLead.render();
        return true;
      }

  if (act === "nc-cancel-task") {
        await OnLead.api("/api/neurocomments/tasks/" + btn.dataset.id + "/cancel", { method: "POST" });
        await OnLead.refresh();
        await OnLead.render();
        return true;
      }

  if (act === "nc-add-block") {
        const recipientId = String(document.getElementById("nc-block-id")?.value || "").trim();
        if (!recipientId) return alert("Укажите id");
        await OnLead.api("/api/neurocomments/blocks", { method: "POST", body: { recipientId } });
        await OnLead.refresh();
        await OnLead.render();
        return true;
      }

  if (act === "nc-del-block") {
        await OnLead.api("/api/neurocomments/blocks/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.refresh();
        await OnLead.render();
        return true;
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
        return true;
      }

  if (act === "nc-faq") {
        OnLead._ncFaqTab = btn.dataset.tab || "overview";
        OnLead._ncFaqOpen = true;
        await OnLead.render();
        return true;
      }

  if (act === "nc-faq-close") {
        OnLead._ncFaqOpen = false;
        await OnLead.render();
        return true;
      }
  return false;
};
