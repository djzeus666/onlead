/**
 * CRM / leads click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickCrm = async function clickCrm(act, btn, e) {
  if (act === "crm-pick") {
        OnLead._crmSelectedId = btn.dataset.id;
        await OnLead.render();
        return true;
      }

  if (act === "crm-quick-stage") {
        await OnLead.patchCrmLead(btn.dataset.id, { stage: btn.dataset.stage });
        await OnLead.render();
        return true;
      }

  if (act === "new-lead") {
        const name = prompt("Имя лида", "Новый контакт");
        if (!name) return true;
        await OnLead.api("/api/leads", { method: "POST", body: { name } });
        await OnLead.render(); return true;
      }

  if (act === "edit-lead") {
        const name = prompt("Имя", btn.dataset.name || "");
        if (name == null) return true;
        const phone = prompt("Телефон", btn.dataset.phone || "");
        if (phone == null) return true;
        const city = prompt("Город", btn.dataset.city || "");
        if (city == null) return true;
        const note = prompt("Заметка", btn.dataset.note || "");
        if (note == null) return true;
        await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim(), phone, city, note } });
        await OnLead.render();
        return true;
      }

  if (act === "del-lead") {
        if (!OnLead.confirmDel(btn.dataset.name || "лид")) return true;
        await OnLead.api("/api/leads/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.render();
        return true;
      }

  if (act === "archive-lead") {
        await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { archived: true } });
        await OnLead.render();
        return true;
      }

  if (act === "restore-lead") {
        await OnLead.api("/api/leads/" + btn.dataset.id, { method: "PATCH", body: { archived: false } });
        await OnLead.render();
        return true;
      }
  return false;
};
