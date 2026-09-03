/**
 * Telegram / bots / funnels click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickTelegram = async function clickTelegram(act, btn, e) {
  if (act === "tg-funnel-tab") {
        OnLead._tgFunnelTab = btn.dataset.tab || "products";
        OnLead._tgFunnelCacheId = null;
        await OnLead.render();
        return true;
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
        return true;
      }

  if (act === "tg-product-edit") {
        try { OnLead._tgProductDraft = JSON.parse(btn.dataset.json || "{}"); } catch { OnLead._tgProductDraft = {}; }
        await OnLead.render();
        return true;
      }

  if (act === "tg-product-cancel") {
        OnLead._tgProductDraft = null;
        await OnLead.render();
        return true;
      }

  if (act === "tg-product-toggle") {
        await OnLead.api("/api/tg/funnels/" + btn.dataset.fid + "/products/" + btn.dataset.pid, {
          method: "PATCH",
          body: { active: btn.dataset.active === "1" },
        });
        OnLead._tgFunnelCacheId = null;
        await OnLead.render();
        return true;
      }

  if (act === "tg-product-del") {
        if (!OnLead.confirmDel("товар")) return true;
        await OnLead.api("/api/tg/funnels/" + btn.dataset.fid + "/products/" + btn.dataset.pid, { method: "DELETE" });
        OnLead._tgFunnelCacheId = null;
        await OnLead.render();
        return true;
      }

  if (act === "lb-tab") {
        OnLead._lbTab = btn.dataset.tab || "list";
        await OnLead.render();
        return true;
      }

  if (act === "lb-pick-kind") {
        OnLead._lbKind = btn.dataset.kind || "lead";
        await OnLead.render();
        return true;
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
        return true;
      }

  if (act === "lb-snippet") {
        const sn = await OnLead.api("/api/lead-bots/" + btn.dataset.id + "/widget-snippet");
        OnLead._lbSnippet = sn.snippet || "";
        await OnLead.render();
        return true;
      }

  if (act === "lb-snippet-close") {
        OnLead._lbSnippet = "";
        await OnLead.render();
        return true;
      }

  if (act === "lb-copy-snippet") {
        const ta = document.querySelector(".tg-snippet-ta");
        if (ta) {
          ta.select();
          try { document.execCommand("copy"); OnLead._flash = "Сниппет скопирован"; } catch { /* ignore */ }
        }
        return true;
      }

  if (act === "lb-funnel") {
        const r = await OnLead.api("/api/lead-bots/" + btn.dataset.id + "/deploy-funnel", { method: "POST" });
        OnLead._flash = "Воронка создана из сценария";
        await OnLead.refresh();
        if (r.funnel?.id) OnLead.go("/office/telegram/funnels/" + r.funnel.id);
        else await OnLead.render();
        return true;
      }

  if (act === "lb-del") {
        if (!OnLead.confirmDel(btn.dataset.name || "бот")) return true;
        await OnLead.api("/api/lead-bots/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.refresh();
        await OnLead.render();
        return true;
      }

  if (act === "add-bot") {
        return true;
      }

  if (act === "edit-bot") {
        const name = prompt("Название", btn.dataset.name || "");
        if (name == null) return true;
        await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim() } });
        await OnLead.render();
        return true;
      }

  if (act === "retoken-bot") {
        const token = prompt("Новый токен из @BotFather", "");
        if (token == null || !token.trim()) return true;
        try {
          await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { token: token.trim() } });
          OnLead._flash = "Токен обновлён, webhook переустановлен.";
        } catch (err) {
          alert(err.message);
        }
        await OnLead.render();
        return true;
      }

  if (act === "toggle-bot") {
        await OnLead.api("/api/bots/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
        await OnLead.render();
        return true;
      }

  if (act === "del-bot") {
        if (!OnLead.confirmDel(btn.dataset.name || "бота")) return true;
        await OnLead.api("/api/bots/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.render();
        return true;
      }

  if (act === "refresh-tg-channels") {
        const res = await OnLead.api("/api/tg/channels/refresh", { method: "POST" });
        OnLead._flash = res.added ? `Добавлено каналов: ${res.added}` : (res.found ? "Список обновлён, новых каналов нет." : "Telegram не прислал каналы. Сделайте бота админом и напишите в канал, затем обновите снова.");
        await OnLead.render();
        return true;
      }

  if (act === "add-tg-channel") {
        const username = prompt("Канал (@name или ссылка)", "@onlead_channel");
        if (!username) return true;
        await OnLead.api("/api/tg/channels", { method: "POST", body: { username, name: username } });
        await OnLead.render();
        return true;
      }

  if (act === "edit-tg-channel") {
        const name = prompt("Название", btn.dataset.name || "");
        if (name == null) return true;
        const username = prompt("Username", btn.dataset.username || "");
        if (username == null) return true;
        await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "PATCH", body: { name: name.trim(), username: username.trim() } });
        await OnLead.render();
        return true;
      }

  if (act === "toggle-tg-channel") {
        await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
        await OnLead.render();
        return true;
      }

  if (act === "del-tg-channel") {
        if (!OnLead.confirmDel(btn.dataset.name || "канал")) return true;
        await OnLead.api("/api/tg/channels/" + btn.dataset.id, { method: "DELETE" });
        await OnLead.render();
        return true;
      }

  if (act === "add-funnel") {
        return true;
      }

  if (act === "new-funnel") {
        const sc = OnLead.tgScenario(btn.dataset.scenario);
        if (!sc) return true;
        const row = await OnLead.api("/api/tg/funnels", {
          method: "POST",
          body: { name: sc.name, scenario: sc.id, kind: sc.kind, sections: sc.sections },
        });
        OnLead.go("/office/telegram/funnels/" + row.id);
        await OnLead.render();
        return true;
      }

  if (act === "funnel-add-section") {
        document.getElementById("funnel-sections")?.insertAdjacentHTML("beforeend", OnLead.funnelSecHtml({ title: "Новый раздел", text: "", buttons: "" }));
        return true;
      }

  if (act === "funnel-del-section") {
        btn.closest(".funnel-sec")?.remove();
        return true;
      }

  if (act === "archive-funnel") {
        await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "PATCH", body: { status: "archive" } });
        await OnLead.render();
        return true;
      }

  if (act === "edit-funnel") {
        OnLead.go("/office/telegram/funnels/" + btn.dataset.id);
        return true;
      }

  if (act === "toggle-funnel") {
        await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "PATCH", body: { status: btn.dataset.status } });
        await OnLead.render();
        return true;
      }

  if (act === "del-funnel") {
        if (!OnLead.confirmDel(btn.dataset.name || "воронку")) return true;
        await OnLead.api("/api/tg/funnels/" + btn.dataset.id, { method: "DELETE" });
        if (location.hash.includes("/funnels/")) OnLead.go("/office/telegram/funnels");
        await OnLead.render();
        return true;
      }

  if (act === "confirm-receipt") {
        await OnLead.api("/api/tg/receipts/" + btn.dataset.id + "/confirm", { method: "POST" });
        await OnLead.refresh();
        OnLead._flash = "Оплата подтверждена, клиенту отправлено сообщение";
        await OnLead.loadTgReceipts();
        return true;
      }

  if (act === "reject-receipt") {
        const note = prompt("Причина отклонения (необязательно)", "") ?? "";
        await OnLead.api("/api/tg/receipts/" + btn.dataset.id + "/reject", { method: "POST", body: { note } });
        await OnLead.loadTgReceipts();
        return true;
      }
  return false;
};
