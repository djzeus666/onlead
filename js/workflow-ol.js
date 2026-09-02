/**
 * Workflow — согласование постов (online-lead.ru parity)
 */
window.OnLead = window.OnLead || {};

OnLead.workflowOlPage = function workflowOlPage(state, path) {
  const esc = OnLead.esc || ((s) => String(s ?? ""));
  const nav = OnLead.cabinetOlNav ? OnLead.cabinetOlNav(path) : "";
  const wf = OnLead._workflow || {};
  const settings = wf.settings || { approvalMode: "optional" };
  const stages = wf.stages || [];
  const pending = wf.pending || [];

  const stageRail = stages.length
    ? `<div class="wf-stages">${stages.map((s) => `<div class="wf-stage" style="--wf-color:${esc(s.color || "#64748b")}">
        <b>${esc(s.name)}</b><span class="muted">${esc(s.kind || "")}</span></div>`).join("")}</div>`
    : `<p class="muted">Этапы загружаются…</p>`;

  const queue = pending.length
    ? `<div class="wf-queue">${pending.map((p) => `<div class="card wf-item">
        <div><b>${esc(p.title || p.text.slice(0, 48) || "Без названия")}</b>
          <p class="muted">${esc(String(p.text || "").slice(0, 160))}</p>
          <span class="muted">${OnLead.fmtContentDate ? OnLead.fmtContentDate(p.updatedAt) : ""}</span></div>
        <div class="toolbar">
          <a class="btn btn-ghost btn-sm" href="#/office/compose?id=${esc(p.id)}">Открыть</a>
          <button type="button" class="btn btn-primary btn-sm" data-act="wf-approve" data-id="${esc(p.id)}">Утвердить</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="wf-reject" data-id="${esc(p.id)}">Отклонить</button>
        </div></div>`).join("")}</div>`
    : `<div class="card muted">Очередь пуста — отправьте пост на согласование из редактора.</div>`;

  return `<div class="cab-ol wf-ol">
    ${nav}
    <div class="h-row"><div><p class="cab-kicker">Кабинет</p><h1>Рабочий процесс</h1>
      <p class="muted">Согласование перед публикацией · <a href="#/office/content">доска контента</a></p></div>
      <a class="btn btn-ghost" href="#/office/compose">+ Новый пост</a></div>
    <div class="card wf-settings">
      <b>Режим согласования</b>
      <div class="toolbar wf-modes">
        ${[["off", "Выкл"], ["optional", "По желанию"], ["required", "Обязательно"]].map(([v, label]) =>
          `<button type="button" class="btn btn-sm ${settings.approvalMode === v ? "btn-ink" : "btn-ghost"}" data-act="wf-mode" data-mode="${v}">${label}</button>`).join("")}
      </div>
      <label class="field chk"><input type="checkbox" id="wf-sched-after" ${settings.scheduleAfterApproval !== false ? "checked" : ""}> Планировать после утверждения</label>
    </div>
    ${stageRail}
    <h2 style="margin:16px 0 8px">Очередь согласования · ${pending.length}</h2>
    ${queue}
  </div>`;
};

OnLead.loadWorkflow = async function loadWorkflow() {
  try {
    OnLead._workflow = await OnLead.api("/api/workflow");
    const wf = OnLead._workflow || {};
    const rail = document.querySelector(".wf-stages");
    if (rail && wf.stages?.length) {
      const esc = OnLead.esc || ((s) => String(s ?? ""));
      rail.innerHTML = wf.stages.map((s) => `<div class="wf-stage" style="--wf-color:${esc(s.color || "#64748b")}">
        <b>${esc(s.name)}</b><span class="muted">${esc(s.kind || "")}</span></div>`).join("");
    }
  } catch { OnLead._workflow = {}; }
};
