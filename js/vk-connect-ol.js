/**
 * VK OAuth / connect modals + checkout helpers (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.takePendingVkToken = function takePendingVkToken() {
  try {
    const raw = sessionStorage.getItem(OnLead.VK_PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OnLead.VK_PENDING_KEY);
    const data = JSON.parse(raw);
    if (data?.accessToken) return data;
  } catch { /* ignore */ }
  return null;
}

OnLead.consumePendingVkToken = async function consumePendingVkToken() {
  const pending = OnLead.takePendingVkToken();
  if (pending) await OnLead.finishVkConnect(pending);
}

OnLead.sleep = function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

OnLead.consumePaidReturn = async function consumePaidReturn() {
  let flag = false;
  try { flag = sessionStorage.getItem("onlead-paid") === "1"; } catch { /* ignore */ }
  const hashQ = location.hash.includes("?") ? new URLSearchParams(location.hash.slice(location.hash.indexOf("?") + 1)) : null;
  const paidReturn = flag || hashQ?.get("paid") === "1";
  const pending = (OnLead.load().pendingPayments || []).length;
  if (!paidReturn && !pending) return { applied: false };
  const attempts = paidReturn ? 3 : 1;
  let last = { applied: false };
  try {
    for (let i = 0; i < attempts; i += 1) {
      if (i) await OnLead.sleep(1500);
      last = await OnLead.api("/api/billing/confirm", { method: "POST" });
      if (last.applied || last.reason === "no pending payment" || last.status === "succeeded") break;
    }
    if (paidReturn) {
      try { sessionStorage.removeItem("onlead-paid"); } catch { /* ignore */ }
    }
    await OnLead.refresh();
    if (last.applied) {
      if (last.kind === "tg-plan" || /telegram/i.test(String(last.title || ""))) {
        OnLead._flash = last.title
          ? `Оплата прошла: ${last.title}. Тариф Telegram активен в разделе «Каналы → Тарифы».`
          : "Оплата прошла: тариф Telegram активен.";
      } else {
        OnLead._flash = "Оплата прошла. Баланс или подписка обновлены.";
      }
    } else if (paidReturn && last.status && last.status !== "succeeded") {
      OnLead._flash = "Платёж ещё обрабатывается. Откройте «Баланс» через минуту — зачисление догонит само.";
    }
  } catch (err) {
    OnLead._flash = err.message;
  }
  return last;
}

OnLead.choosePayMethod = function choosePayMethod({ amount, balance }) {
  return new Promise((resolve) => {
    document.querySelector(".pay-modal")?.remove();
    const need = Number(amount) || 0;
    const have = Number(balance) || 0;
    const enough = need > 0 && have >= need;
    const host = document.createElement("div");
    host.className = "pay-modal";
    host.innerHTML = `
      <button type="button" class="pay-modal-backdrop" data-pay="cancel" aria-label="Закрыть"></button>
      <div class="pay-modal-card" role="dialog" aria-modal="true">
        <h3>Как оплатить</h3>
        <p>${need ? `К оплате ${need.toLocaleString("ru-RU")} ₽. ` : ""}На счёте кабинета ${have.toLocaleString("ru-RU")} ₽.${enough ? "" : " Не хватает — пополните баланс или оплатите картой."}</p>
        <div class="pay-modal-acts">
          <button type="button" class="btn ${enough ? "btn-primary" : "btn-ghost"}" data-pay="balance" ${enough ? "" : "disabled"}>Списать со счёта</button>
          <button type="button" class="btn ${enough ? "btn-ink" : "btn-primary"}" data-pay="yookassa">Карта / СБП · ЮKassa</button>
          <button type="button" class="btn btn-ghost" data-pay="cancel">Отмена</button>
        </div>
      </div>`;
    const done = (value) => {
      document.removeEventListener("keydown", onKey);
      host.remove();
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape") done(null);
    };
    host.addEventListener("click", (e) => {
      const el = e.target.closest("[data-pay]");
      if (!el || el.disabled) return;
      const act = el.dataset.pay;
      if (act === "balance" || act === "yookassa") done(act);
      if (act === "cancel") done(null);
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(host);
    host.querySelector(enough ? "[data-pay=balance]" : "[data-pay=yookassa]")?.focus();
  });
}

OnLead.startCheckout = async function startCheckout(body, btn) {
  if (OnLead._checkoutBusy) return;
  OnLead._checkoutBusy = true;
  const prev = btn?.textContent;
  try {
    const kind = body.kind || (body.packageId ? "package" : body.slug ? "tool" : body.tgPlan ? "tg-plan" : "");
    if (kind && kind !== "topup" && !body.method) {
      const state = OnLead.load() || {};
      const pick = await OnLead.choosePayMethod({
        amount: Number(body.amount || btn?.dataset?.amount || 0),
        balance: Number(state.balance || 0),
      });
      if (!pick) return;
      body = { ...body, method: pick };
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = body.method === "balance" ? "Списываем со счёта…" : "Открываем оплату…";
    }
    const token = OnLead.getToken();
    try { if (token) localStorage.setItem(OnLead.tokenKey + "-pay", token); } catch { /* ignore */ }
    const res = await OnLead.api("/api/billing/checkout", { method: "POST", body });
    if (res.applied) {
      OnLead._flash = res.mode === "balance"
        ? "Списали со счёта кабинета. Доступ обновлён."
        : "Оплата уже зачислена.";
      await OnLead.refresh();
      await OnLead.render();
      return;
    }
    const url = res.confirmationUrl;
    if (!url) throw new Error("ЮKassa не вернула ссылку на оплату. Попробуйте ещё раз.");
    location.assign(url);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      if (prev) btn.textContent = prev;
    }
    throw err;
  } finally {
    OnLead._checkoutBusy = false;
  }
}

OnLead.onVkOAuthMessage = function onVkOAuthMessage(e) {
  if (e.origin !== location.origin) return;
  if (e.data?.type === "vk-token-error") {
    const status = document.getElementById("vk-connect-status");
    const text = e.data.errorDescription || e.data.error || "Ошибка авторизации VK";
    if (status) status.textContent = text;
    else alert(text);
    return;
  }
  if (e.data?.type === "vk-code" && e.data.code) {
    void OnLead.exchangeVkCodeAndConnect(e.data.code);
    return;
  }
  if (e.data?.type !== "vk-token" || !e.data.accessToken) return;
  try { sessionStorage.removeItem(OnLead.VK_PENDING_KEY); } catch { /* ignore */ }
  OnLead.finishVkConnect(e.data);
}

OnLead.exchangeVkCodeAndConnect = async function exchangeVkCodeAndConnect(code) {
  const status = document.getElementById("vk-connect-status");
  if (status) status.textContent = "Получаем токен VK…";
  try {
    const data = await OnLead.api("/api/vk/oauth-token", { method: "POST", body: { code } });
    await OnLead.finishVkConnect({ accessToken: data.accessToken, userId: data.userId });
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

OnLead.refreshVkChannelsFromBrowser = async function refreshVkChannelsFromBrowser(accountId, status) {
  const { accessToken } = await OnLead.api(`/api/accounts/${accountId}/vk-token`);
  const { channels, groupsError } = await OnLead.fetchVkChannels(accessToken);
  const groups = channels.filter((c) => c.type !== "personal");
  if (!groups.length) {
    const hint = groupsError || "VK не вернул админские сообщества. Проверьте права токена и переподключите аккаунт.";
    throw new Error(hint);
  }
  await OnLead.api(`/api/accounts/${accountId}/channels`, { method: "POST", body: { channels } });
  if (status) status.textContent = `Загружено сообществ: ${groups.length}`;
  await OnLead.render();
}

OnLead.refreshVkChannels = async function refreshVkChannels(accountId, statusEl) {
  const status = statusEl || document.querySelector(`.vk-ch-status[data-id="${CSS.escape(accountId)}"]`);
  if (status) status.textContent = "Запрашиваем сообщества VK…";
  try {
    const channels = await OnLead.api(`/api/accounts/${accountId}/channels`);
    const groups = channels.filter((c) => c.type !== "personal");
    if (!groups.length) {
      if (status) status.textContent = "VK не вернул админские сообщества. Проверьте права токена.";
      return;
    }
    if (status) status.textContent = `Загружено сообществ: ${groups.length}`;
    await OnLead.render();
  } catch (err) {
    if (!err?.payload?.ipBound) {
      if (status) status.textContent = err.message;
      else alert(err.message);
      return;
    }
    if (status) status.textContent = "Токен привязан к IP — запрашиваем из браузера…";
    try {
      await OnLead.refreshVkChannelsFromBrowser(accountId, status);
    } catch (err2) {
      if (status) status.textContent = err2.message;
      else alert(err2.message);
    }
  }
}

OnLead.finishVkConnect = async function finishVkConnect({ accessToken, userId }) {
  if (!accessToken || vkConnecting) return;
  vkConnecting = true;
  if (!OnLead.loggedIn()) {
    try {
      sessionStorage.setItem(OnLead.VK_PENDING_KEY, JSON.stringify({ type: "vk-token", accessToken, userId }));
    } catch { /* ignore */ }
    vkConnecting = false;
    OnLead.go("/login");
    return;
  }
  const status = document.getElementById("vk-connect-status");
  if (status) status.textContent = "Получаем ключ и все админские группы…";
  try {
    let channels = [];
    let groupsError = "";
    try {
      const fetched = await OnLead.fetchVkChannels(accessToken, userId);
      channels = fetched.channels || [];
      groupsError = fetched.groupsError || "";
    } catch (err) {
      groupsError = err.message || String(err);
    }
    const groups = channels.filter((c) => c.type !== "personal");
    if (status) {
      status.textContent = groups.length
        ? `Сохраняем аккаунт и ${groups.length} сообществ…`
        : "Сохраняем аккаунт (сообщества не загрузились)…";
    }
    await OnLead.api("/api/accounts", { method: "POST", body: { token: accessToken, userId, channels } });
    OnLead.closeVkConnectModal();
    await OnLead.render();
    if (!groups.length && groupsError && status) {
      status.textContent = `Аккаунт подключён, но сообщества не загрузились: ${groupsError}. Нажмите «Обновить сообщества» на карточке.`;
    }
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  } finally {
    vkConnecting = false;
  }
}

OnLead.startVkOAuth = async function startVkOAuth() {
  const status = document.getElementById("vk-connect-status");
  if (status) status.textContent = "Открываем VK (5530956 → blank.html)…";
  try {
    const { url } = await OnLead.api("/api/vk/oauth-url");
    window.open(url, "vk_oauth", "width=720,height=780,noopener=no");
    if (status) {
      status.textContent = "После входа скопируйте весь URL страницы blank.html и вставьте в поле ниже.";
    }
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

OnLead.startVkMessagesOAuth = async function startVkMessagesOAuth(accountId) {
  if (accountId) {
    const panel = document.querySelector(`.vk-msg-paste-panel[data-id="${CSS.escape(accountId)}"]`);
    if (panel) panel.hidden = false;
  }
  const status = accountId
    ? document.querySelector(`.vk-msg-status[data-id="${CSS.escape(accountId)}"]`)
    : document.querySelector(".vk-msg-status");
  if (status) status.textContent = "Открываем получение токена сообщений…";
  try {
    const { url } = await OnLead.api("/api/vk/oauth-url?kind=messages");
    const popup = window.open(url, "vk_oauth_msg", "width=720,height=780,noopener=no");
    if (!popup) {
      location.href = url;
      return;
    }
    if (status) {
      status.textContent = "После входа скопируйте URL blank.html и вставьте в поле ниже. В списке прав должно быть «Сообщения».";
    }
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

OnLead.saveVkMessagesToken = async function saveVkMessagesToken(accountId) {
  const box = document.querySelector(`.vk-msg-paste[data-id="${CSS.escape(accountId)}"]`);
  const status = document.querySelector(`.vk-msg-status[data-id="${CSS.escape(accountId)}"]`);
  const raw = box?.value || "";
  const parsed = OnLead.parseVkAccessToken(raw);
  if (!parsed?.accessToken) {
    if (status) status.textContent = "Вставьте URL blank.html или сам access_token.";
    else alert("Вставьте URL blank.html или сам access_token.");
    return;
  }
  if (status) status.textContent = "Проверяем право «Сообщения»…";
  try {
    await OnLead.api("/api/accounts/" + accountId + "/messages-token", {
      method: "POST",
      body: { messagesToken: parsed.accessToken },
    });
    await OnLead.render();
  } catch (err) {
    if (status) status.textContent = err.message;
    else alert(err.message);
  }
}

OnLead.openVkConnectModal = function openVkConnectModal() {
  const modal = document.getElementById("vk-connect-modal");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("vk-modal-open");
  modal.querySelector("#vk-token-paste")?.focus();
}

OnLead.closeVkConnectModal = function closeVkConnectModal() {
  const modal = document.getElementById("vk-connect-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("vk-modal-open");
}

OnLead.openVkEventLogModal = function openVkEventLogModal() {
  document.querySelector(".vk-event-modal")?.remove();
  const host = document.createElement("div");
  host.className = "vk-event-modal";
  host.innerHTML = `<button type="button" class="vk-connect-modal__backdrop" data-act="vk-event-close" aria-label="Закрыть"></button>
    <div class="vk-connect-modal__card" role="dialog" aria-modal="true">
      <button type="button" class="vk-connect-modal__x" data-act="vk-event-close" aria-label="Закрыть">×</button>
      <h2>Журнал событий</h2>
      <p class="vk-slot__hint">Загружаем…</p>
    </div>`;
  document.body.appendChild(host);
  document.body.classList.add("vk-modal-open");
  OnLead.api("/api/me/logs").then((rows) => {
    const list = (rows || []).length
      ? rows.map((r) => `<div class="vk-log-row"><span>${OnLead.esc(fmtWhen(r.at))}</span><span>${OnLead.esc(r.message || "")}</span></div>`).join("")
      : `<p class="vk-slot__hint">Пока нет событий по VK-аккаунтам.</p>`;
    host.querySelector(".vk-connect-modal__card").innerHTML = `
      <button type="button" class="vk-connect-modal__x" data-act="vk-event-close" aria-label="Закрыть">×</button>
      <h2>Журнал событий</h2>
      <div class="vk-log-list">${list}</div>`;
  }).catch((err) => {
    host.querySelector(".vk-slot__hint").textContent = err.message;
  });
}

OnLead.closeVkEventLogModal = function closeVkEventLogModal() {
  document.querySelector(".vk-event-modal")?.remove();
  if (!document.getElementById("vk-connect-modal") || document.getElementById("vk-connect-modal").hidden) {
    document.body.classList.remove("vk-modal-open");
  }
}

OnLead.saveVkTokenFromPaste = function saveVkTokenFromPaste() {
  const raw = $("#vk-token-paste")?.value || "";
  const parsed = OnLead.parseVkAccessToken(raw);
  if (!parsed?.accessToken) {
    const status = document.getElementById("vk-connect-status");
    if (status) status.textContent = "Вставьте весь URL blank.html или сам access_token.";
    return;
  }
  OnLead.finishVkConnect(parsed);
}

OnLead.vkAccountQuery = function vkAccountQuery() {
  const id = $("#tool-form [name=accountId]")?.value || "";
  return id ? `?accountId=${encodeURIComponent(id)}` : "";
}
