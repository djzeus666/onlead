/**
 * VK accounts page + connect slots (extracted from app.js)
 */
window.OnLead = window.OnLead || {};

OnLead.channelLabel = function channelLabel(c) {
  if (c.type === "personal") return "страница";
  if (c.type === "page") return "паблик";
  if (c.type === "event") return "событие";
  return "группа";
}

OnLead.renderVkMessagesBlock = function renderVkMessagesBlock(a, msgUi) {
  if (!msgUi) return "";
  const msgOk = a.hasMessagesToken;
  const id = OnLead.esc(a.id);
  const tokens = `<div class="vk-slot__tokens">
      <button class="vk-token vk-token--base is-ok" type="button" data-act="vk-login" title="Обновить базовый токен">
        <span class="vk-token__icon" aria-hidden="true">🔗</span>
        <span class="vk-token__label">Базовый токен</span>
        <span class="vk-token__refresh" aria-hidden="true">↻</span>
      </button>
      <button class="vk-token vk-token--msg${msgOk ? " is-ok" : ""}" type="button" data-act="vk-msg-login" data-id="${id}" title="${msgOk ? "Обновить токен сообщений" : "Получить токен сообщений"}">
        <span class="vk-token__icon" aria-hidden="true">💬</span>
        <span class="vk-token__label">Токен сообщений</span>
        <span class="vk-token__refresh" aria-hidden="true">↻</span>
      </button>
    </div>`;
  if (msgOk) {
    return `${tokens}
      <div class="vk-msg-paste-panel" data-id="${id}" hidden>
        <p class="vk-slot__hint">Скопируйте URL blank.html после входа во VK:</p>
        <textarea class="vk-msg-paste vk-slot__paste" data-id="${id}" rows="2" placeholder="https://oauth.vk.com/blank.html#access_token=…"></textarea>
        <button class="btn btn-ink btn-sm" data-act="vk-msg-save" data-id="${id}" type="button">Сохранить</button>
      </div>
      <p class="vk-slot__status vk-msg-status" data-id="${id}"></p>`;
  }
  return `${tokens}
    <div class="vk-msg-paste-panel" data-id="${id}">
      <p class="vk-slot__hint">Для ЛС нужен отдельный токен с правом «Сообщения».</p>
      <textarea class="vk-msg-paste vk-slot__paste" data-id="${id}" rows="2" placeholder="https://oauth.vk.com/blank.html#access_token=…"></textarea>
      <button class="btn btn-ink btn-sm" data-act="vk-msg-save" data-id="${id}" type="button">Сохранить</button>
    </div>
    <p class="vk-slot__status vk-msg-status" data-id="${id}"></p>`;
}

OnLead.vkSlotShortId = function vkSlotShortId(id) {
  const digits = String(id || "").replace(/\D/g, "");
  return digits ? digits.slice(-6) : "—";
}

OnLead.vkSlotAvatar = function vkSlotAvatar(a) {
  const initials = OnLead.esc((a.name || "VK").split(" ").map((p) => p[0]).join("").slice(0, 2));
  return a.avatarUrl
    ? `<img class="vk-slot__ava" src="${OnLead.esc(a.avatarUrl)}" alt="">`
    : `<div class="vk-slot__ava vk-slot__ava--fb">${initials}</div>`;
}

OnLead.renderActiveVkSlot = function renderActiveVkSlot(a, state, { isActive = false } = {}) {
  const msgUi = OnLead.vkMessagesUiOn(state);
  const groups = (a.channels || []).filter((c) => c.type !== "personal").length;
  const id = OnLead.esc(a.id);
  const vkUrl = `https://vk.com/id${encodeURIComponent(a.vkId || "")}`;
  return `<article class="vk-slot vk-slot--active${isActive ? " vk-slot--current" : ""}">
    <div class="vk-slot__top">
      <div class="vk-slot__badges">
        ${isActive ? `<span class="vk-slot__badge vk-slot__badge--active">★ Активный</span>` : ""}
        <span class="vk-slot__badge">AID: ${OnLead.vkSlotShortId(a.id)}</span>
      </div>
      <details class="vk-slot__menu">
        <summary aria-label="Меню аккаунта">⋯</summary>
        <div class="vk-slot__menu-pop">
          <a href="${vkUrl}" target="_blank" rel="noopener">Открыть профиль VK</a>
          <button type="button" data-act="vk-refresh-channels" data-id="${id}">Обновить сообщества</button>
          <button type="button" class="danger" data-act="del-acc" data-id="${id}">Отключить</button>
        </div>
      </details>
    </div>
    <div class="vk-slot__profile">
      ${OnLead.vkSlotAvatar(a)}
      <div class="vk-slot__who">
        <b>${OnLead.esc(a.name)}</b>
        <a class="vk-slot__vkid" href="${vkUrl}" target="_blank" rel="noopener">id ${OnLead.esc(a.vkId)}</a>
        ${groups ? `<span class="vk-slot__stat">${groups} сообществ</span>` : `<span class="vk-slot__stat vk-ch-status" data-id="${id}">сообщества не загружены</span>`}
      </div>
    </div>
    ${msgUi ? OnLead.renderVkMessagesBlock(a, msgUi) : `<div class="vk-slot__tokens"><button class="vk-token vk-token--base is-ok" type="button" data-act="vk-login"><span class="vk-token__icon">🔗</span><span class="vk-token__label">Базовый токен</span><span class="vk-token__refresh">↻</span></button></div>`}
    <p class="vk-slot__foot">Бесплатный слот · без срока</p>
  </article>`;
}

OnLead.renderEmptyVkSlot = function renderEmptyVkSlot() {
  return `<article class="vk-slot vk-slot--empty">
    <div class="vk-slot__empty-ico" aria-hidden="true">👤+</div>
    <b>Слот свободен</b>
    <p class="vk-slot__hint">Привяжите VK-аккаунт, чтобы начать работу</p>
    <button type="button" class="btn btn-primary vk-slot__bind" data-act="vk-connect-open">🔗 Привязать аккаунт</button>
    <p class="vk-slot__foot">Бесплатный слот · без срока</p>
  </article>`;
}

OnLead.renderRentVkSlot = function renderRentVkSlot() {
  return `<article class="vk-slot vk-slot--rent">
    <div class="vk-slot__rent-ico" aria-hidden="true">+</div>
    <b>Арендовать слот</b>
    <p class="vk-slot__hint">Дополнительный платный слот на срок от 1 до 24 месяцев</p>
    <button type="button" class="btn btn-ghost vk-slot__rent" data-act="vk-rent-slot">Узнать условия</button>
  </article>`;
}

OnLead.vkConnectModalHtml = function vkConnectModalHtml(state) {
  return `<div class="vk-connect-modal" id="vk-connect-modal" hidden>
    <button type="button" class="vk-connect-modal__backdrop" data-act="vk-connect-close" aria-label="Закрыть"></button>
    <div class="vk-connect-modal__card" role="dialog" aria-modal="true" aria-labelledby="vk-connect-title">
      <button type="button" class="vk-connect-modal__x" data-act="vk-connect-close" aria-label="Закрыть">×</button>
      <h2 id="vk-connect-title">Привязать VK-аккаунт</h2>
      <p class="vk-slot__hint">Приложения 5530956 / 6463690 → <code>oauth.vk.com/blank.html</code></p>
      <p class="vk-slot__hint"><b>Шаг 1.</b> Получите токен во VK. <b>Шаг 2.</b> Скопируйте весь URL страницы blank.html.</p>
      <p class="vk-slot__status" id="vk-connect-status"></p>
      <button class="btn btn-primary btn-block" data-act="vk-login" type="button">Перейти и получить токен</button>
      <div class="field" style="margin-top:12px">
        <label>Токен vk1.a… или URL blank.html</label>
        <textarea id="vk-token-paste" class="vk-slot__paste" rows="3" placeholder="https://oauth.vk.com/blank.html#access_token=vk1.a.…"></textarea>
      </div>
      <div class="actions" style="margin-top:10px">
        <button class="btn btn-ink btn-block" data-act="vk-save-token" type="button">Привязать токен</button>
        ${OnLead.health?.mocksAllowed ? `<button class="btn btn-ghost btn-block" data-act="vk-mock" type="button">Демо без VK</button>` : ""}
      </div>
    </div>
  </div>`;
}

OnLead.accountsOlPage = function accountsOlPage(state) {
  const slots = state.accountSlots || 3;
  const used = state.accounts.length;
  const activeId = state.activeAccount || state.accounts[0]?.id;
  const slotCards = [];
  for (let i = 0; i < slots; i += 1) {
    const acc = state.accounts[i];
    if (acc) slotCards.push(OnLead.renderActiveVkSlot(acc, state, { isActive: acc.id === activeId }));
    else slotCards.push(OnLead.renderEmptyVkSlot());
  }
  slotCards.push(OnLead.renderRentVkSlot());
  return `<div class="vk-acc-page">
    <div class="vk-acc-head">
      <div>
        <h1>VK аккаунты</h1>
        <p class="vk-acc-sub">Привязано ${used} из ${slots} слотов</p>
      </div>
      <div class="vk-acc-head__acts">
        <button type="button" class="btn btn-ghost vk-acc-log-btn" data-act="vk-event-log">Журнал событий</button>
        <button type="button" class="btn btn-primary vk-acc-rent-btn" data-act="vk-rent-slot">+ Арендовать слот</button>
      </div>
    </div>
    <div class="vk-slot-grid">${slotCards.join("")}</div>
    ${OnLead.vkConnectModalHtml(state)}
  </div>`;
}
