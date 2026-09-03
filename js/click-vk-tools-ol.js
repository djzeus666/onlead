/**
 * VK connect / tools / lists / campaigns click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickVkTools = async function clickVkTools(act, btn, e) {
  if (act === "vk-connect-open") { OnLead.openVkConnectModal(); return true; }

  if (act === "vk-connect-close") { OnLead.closeVkConnectModal(); return true; }

  if (act === "vk-event-log") { OnLead.openVkEventLogModal(); return true; }

  if (act === "vk-event-close") { OnLead.closeVkEventLogModal(); return true; }

  if (act === "vk-rent-slot") { OnLead.go("/office/subscriptions"); return true; }

  if (act === "vk-login") { await OnLead.startVkOAuth(); return true; }

  if (act === "vk-refresh-channels") { await OnLead.refreshVkChannels(btn.dataset.id); return true; }

  if (act === "vk-save-token") { OnLead.saveVkTokenFromPaste(); return true; }

  if (act === "vk-msg-login") { await OnLead.startVkMessagesOAuth(btn.dataset.id); return true; }

  if (act === "vk-msg-save") { await OnLead.saveVkMessagesToken(btn.dataset.id); return true; }

  if (act === "vk-msg-clear") {
        await OnLead.api("/api/accounts/" + btn.dataset.id + "/messages-token", {
          method: "POST",
          body: { clear: true },
        });
        await OnLead.render();
        return true;
      }

  if (act === "vk-mock") {
        await OnLead.api("/api/accounts", { method: "POST", body: { token: "mock:vk" } });
        await OnLead.render(); return true;
      }

  if (act === "list-del") {
        if (!OnLead.confirmDel(btn.dataset.name || "список")) return true;
        await OnLead.api("/api/lists/" + btn.dataset.id, { method: "DELETE" });
        OnLead.go("/office/tools/lists");
        await OnLead.render();
        return true;
      }

  if (act === "list-rename") {
        const name = prompt("Название списка", btn.dataset.name || "");
        if (name == null) return true;
        const title = name.trim();
        if (!title) return true;
        await OnLead.api("/api/lists/" + btn.dataset.id, { method: "PATCH", body: { name: title } });
        await OnLead.render();
        return true;
      }

  if (act === "list-copy") {
        const list = await OnLead.api("/api/lists/" + btn.dataset.id);
        const ids = (list.items || []).map((p) => p.id).join("\n");
        await navigator.clipboard?.writeText(ids);
        btn.textContent = "Скопировано";
        return true;
      }

  if (act === "list-crm") {
        await OnLead.api("/api/lists/" + btn.dataset.id + "/crm", { method: "POST" });
        OnLead._flash = "Людей из списка отправили в CRM.";
        OnLead.go("/office/crm");
        await OnLead.render();
        return true;
      }

  if (act === "del-acc") {
        await OnLead.api("/api/accounts/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.render(); return true;
      }

  if (act === "pause-cam") {
        await OnLead.api("/api/campaigns/" + btn.dataset.id + "/pause", { method: "POST" });
        await OnLead.render(); return true;
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
        return true;
      }

  if (act === "vk-tool-run") {
        const form = document.getElementById("tool-form");
        if (!form) return alert("Заполните форму запуска ниже");
        form.requestSubmit();
        return true;
      }

  if (act === "edit-cam") {
        const title = prompt("Название задачи", btn.dataset.title || "");
        if (title == null) return true;
        await OnLead.api("/api/campaigns/" + btn.dataset.id, { method: "PATCH", body: { title: title.trim() } });
        await OnLead.render();
        return true;
      }

  if (act === "del-cam") {
        if (!OnLead.confirmDel(btn.dataset.name || "задачу")) return true;
        await OnLead.api("/api/campaigns/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.render();
        return true;
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
        return true;
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
        return true;
      }
  return false;
};
