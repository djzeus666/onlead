/**
 * Office binders — sidebar + nav chrome wiring
 */
window.OnLead = window.OnLead || {};

OnLead.bindSidebar = function bindSidebar() {
  document.querySelectorAll("details.lk-side-group[data-pack]").forEach((el) => {
    el.addEventListener("toggle", () => OnLead.writeSideOpen(el.dataset.pack, el.open));
  });
};

OnLead.bindOfficeChrome = function bindOfficeChrome() {
  OnLead.bindSidebar();
  OnLead.setLkNav(false);
  if (!window._lkEsc) {
    window._lkEsc = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") OnLead.setLkNav(false);
    });
  }
};
