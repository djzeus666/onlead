window.OnLead = window.OnLead || {};

OnLead.VK_PENDING_KEY = "onlead-vk-pending";

OnLead.parseVkAccessToken = function (raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  let hash = text;
  const hashIdx = text.indexOf("#");
  if (hashIdx >= 0) hash = text.slice(hashIdx + 1);
  else if (text.includes("access_token=")) hash = text.slice(text.indexOf("access_token="));
  if (hash.includes("access_token=")) {
    const params = new URLSearchParams(hash.replace(/^\?/, ""));
    const accessToken = params.get("access_token");
    if (!accessToken) return null;
    return {
      accessToken,
      userId: params.get("user_id") || undefined,
    };
  }
  if (/^vk1\.[A-Za-z0-9._-]+$/.test(text) || (/^[A-Za-z0-9._-]{24,}$/.test(text) && !/\s/.test(text))) {
    return { accessToken: text };
  }
  return null;
};

function vkJsonp(method, params, accessToken) {
  return new Promise((resolve, reject) => {
    const cb = `__vkcb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      try { delete window[cb]; } catch { window[cb] = undefined; }
      script.remove();
    };
    window[cb] = (data) => {
      cleanup();
      if (data?.error) {
        reject(new Error(data.error.error_msg || "VK API error"));
        return;
      }
      resolve(data.response);
    };
    const q = new URLSearchParams();
    q.set("access_token", accessToken);
    q.set("v", "5.199");
    q.set("callback", cb);
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    script.src = `https://api.vk.com/method/${method}?${q}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("VK API недоступен из браузера (сеть или блокировка). Отключите блокировщик рекламы и обновите страницу."));
    };
    document.body.appendChild(script);
    setTimeout(() => {
      if (window[cb]) {
        cleanup();
        reject(new Error("VK JSONP timeout"));
      }
    }, 15000);
  });
}

function pushGroupChannel(out, seen, g) {
  const id = String(-Math.abs(g.id));
  if (seen.has(id)) return;
  seen.add(id);
  out.push({
    externalId: id,
    name: g.name,
    type: g.type === "page" ? "page" : g.type === "event" ? "event" : "community",
    avatarUrl: g.photo_100,
    screenName: g.screen_name,
  });
}

async function fetchVkGroups(accessToken) {
  const filters = ["admin,editor,moder", "admin,editor", "admin"];
  let lastError = "";
  for (const filter of filters) {
    const batch = [];
    const seen = new Set();
    try {
      let offset = 0;
      const count = 100;
      for (;;) {
        const groups = await vkJsonp("groups.get", {
          extended: 1,
          filter,
          count,
          offset,
          fields: "photo_100,screen_name",
        }, accessToken);
        const items = groups?.items || (Array.isArray(groups) ? groups : []);
        const total = groups?.count ?? items.length;
        for (const g of items) pushGroupChannel(batch, seen, g);
        offset += items.length;
        if (!items.length || offset >= total) break;
      }
      if (batch.length) return { groups: batch, groupsError: "" };
    } catch (err) {
      lastError = err?.message || String(err);
    }
  }
  return { groups: [], groupsError: lastError };
}

OnLead.fetchVkChannels = async function (accessToken, oauthUserId) {
  const channels = [];
  const seen = new Set();
  if (/^vk2\.a\./i.test(String(accessToken || ""))) {
    return {
      channels,
      groupsError: "Токен VK ID (vk2.a…) не видит админские сообщества. Нужен classic-токен (vk1.a…) через «Получить токен VK».",
    };
  }
  try {
    const users = await vkJsonp("users.get", { fields: "photo_100" }, accessToken);
    const u = users?.[0];
    if (u?.id) {
      const id = String(u.id);
      seen.add(id);
      channels.push({
        externalId: id,
        name: `Моя страница (${u.first_name} ${u.last_name})`.trim(),
        type: "personal",
        avatarUrl: u.photo_100,
      });
    }
  } catch {
    if (oauthUserId) {
      const id = String(oauthUserId);
      if (!seen.has(id)) {
        seen.add(id);
        channels.push({
          externalId: id,
          name: "Моя страница",
          type: "personal",
        });
      }
    }
  }
  const { groups, groupsError } = await fetchVkGroups(accessToken);
  for (const g of groups) {
    if (!seen.has(g.externalId)) channels.push(g);
  }
  return { channels, groupsError };
};
