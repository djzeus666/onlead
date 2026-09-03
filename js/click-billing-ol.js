/**
 * Billing / checkout click acts
 */
window.OnLead = window.OnLead || {};

OnLead.clickBilling = async function clickBilling(act, btn, e) {
  if (act === "topup") {
        await OnLead.startCheckout({ kind: "topup", amount: Number(btn.dataset.amount || 1000) }, btn);
        return true;
      }

  if (act === "sub-period") {
        OnLead._packMonths = Number(btn.dataset.m || 1);
        await OnLead.render();
        return true;
      }

  if (act === "transfer-ref") {
        await OnLead.api("/api/billing/transfer-ref", { method: "POST", body: { amount: "all" } });
        OnLead._flash = "Реферальный баланс переведён на основной счёт.";
        await OnLead.refresh();
        await OnLead.render();
        return true;
      }

  if (act === "resume-pay") {
        const url = btn.dataset.url || "";
        if (url && /^https?:\/\//i.test(url)) {
          location.assign(url);
          return true;
        }
        const kind = btn.dataset.kind || "topup";
        const body = { kind, method: "yookassa" };
        if (kind === "topup") body.amount = Number(btn.dataset.amount || 1000);
        if (kind === "package") {
          body.packageId = btn.dataset.package;
          body.months = Number(btn.dataset.m || 1);
        }
        if (kind === "tool") {
          body.slug = btn.dataset.slug;
          body.months = Number(btn.dataset.m || 1);
        }
        if (kind === "tg-plan") {
          body.tgPlan = btn.dataset.tgplan;
          body.months = Number(btn.dataset.m || 1);
        }
        await OnLead.startCheckout(body, btn);
        return true;
      }

  if (act === "buy-pack") {
        await OnLead.startCheckout({
          packageId: btn.dataset.id,
          months: Number(btn.dataset.m || 1),
          amount: Number(btn.dataset.amount || 0),
        }, btn);
        return true;
      }

  if (act === "buy-tool") {
        await OnLead.startCheckout({ slug: btn.dataset.slug, months: Number(btn.dataset.m || 1), amount: Number(btn.dataset.amount || 0) }, btn);
        return true;
      }

  if (act === "buy-tg") {
        await OnLead.startCheckout({ kind: "tg-plan", tgPlan: btn.dataset.plan, months: Number(btn.dataset.m || 1), amount: Number(btn.dataset.amount || 0) }, btn);
        return true;
      }

  if (act === "tg-trial") {
        await OnLead.api("/api/tg/trial", { method: "POST" });
        OnLead._flash = "Три дня Telegram включены: 1 слот Lite.";
        await OnLead.render();
        return true;
      }
  return false;
};
