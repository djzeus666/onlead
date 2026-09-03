/**
 * AI-lead click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickAiLead = async function clickAiLead(act, btn, e) {
  if (act === "al-toggle") {
        const cfg = OnLead.load().aiLead || {};
        await OnLead.api("/api/ai-lead", { method: "PATCH", body: { enabled: !cfg.enabled } });
        OnLead._alRunMsg = "";
        OnLead._alRunErr = "";
        await OnLead.render();
        return true;
      }

  if (act === "al-save" || act === "al-save-list") {
        const body = OnLead.aiLeadCollectForm ? OnLead.aiLeadCollectForm() : {};
        await OnLead.api("/api/ai-lead", { method: "PATCH", body });
        OnLead._flash = "Сценарий сохранён";
        await OnLead.render();
        return true;
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
        return true;
      }
  return false;
};
