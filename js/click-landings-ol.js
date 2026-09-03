/**
 * Landings click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickLandings = async function clickLandings(act, btn, e) {
  if (act === "new-landing") {
        await OnLead.createLanding(btn.dataset.name || "Новая страница", btn.dataset.template || "");
        return true;
      }

  if (act === "ol-save-landing") {
        await OnLead.saveOlLandingEditor();
        return true;
      }

  if (act === "ol-ai-generate") {
        const editor = document.querySelector(".ol-editor");
        const id = editor?.dataset.id;
        if (!id) return true;
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
        return true;
      }

  if (act === "ol-preview-toggle") {
        const box = document.getElementById("ol-preview-box");
        const editor = document.querySelector(".ol-editor");
        if (!box || !editor) return true;
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
        return true;
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
        return true;
      }

  if (act === "copy-landing-url") {
        await navigator.clipboard?.writeText(btn.dataset.url || "");
        btn.textContent = "Скопировано";
        return true;
      }

  if (act === "del-landing") {
        if (!OnLead.confirmDel(btn.dataset.name || "страницу")) return true;
        await OnLead.api("/api/landings/" + btn.dataset.id, { method: "DELETE" });
        OnLead._flash = "Страницу удалили.";
        OnLead.go("/office/landings");
        await OnLead.render();
        return true;
      }
  return false;
};
