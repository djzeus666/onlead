window.OnLead = window.OnLead || {};

OnLead.API = '';
OnLead.tokenKey = 'onlead-token';

OnLead.getToken = () => {
  try {
    const live = sessionStorage.getItem(OnLead.tokenKey);
    if (live) return live;
    const pay = localStorage.getItem(OnLead.tokenKey + "-pay");
    if (pay) {
      sessionStorage.setItem(OnLead.tokenKey, pay);
      return pay;
    }
  } catch { /* ignore */ }
  return null;
};
OnLead.setToken = (t) => {
  try {
    if (t) {
      sessionStorage.setItem(OnLead.tokenKey, t);
      localStorage.setItem(OnLead.tokenKey + "-pay", t);
    } else {
      sessionStorage.removeItem(OnLead.tokenKey);
      localStorage.removeItem(OnLead.tokenKey + "-pay");
    }
  } catch { /* ignore */ }
};

OnLead.api = async function (path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const token = OnLead.getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(OnLead.API + path, { ...opts, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.payload = data;
    throw err;
  }
  return data;
};

OnLead.refresh = async function () {
  const snap = await OnLead.api('/api/me');
  if (!snap?.user) throw new Error('Не удалось загрузить профиль. Войдите снова.');
  OnLead._state = {
    user: snap.user,
    trialUntil: snap.user.trialUntil,
    balance: snap.user.balance || 0,
    refBalance: snap.user.refBalance || 0,
    accounts: snap.accounts || [],
    accountSlots: snap.user.accountSlots || 3,
    activeAccount: snap.activeAccount || snap.accounts?.[0]?.id,
    enabledTools: snap.user.enabledTools || {},
    packageId: snap.user.packageId,
    packageUntil: snap.user.packageUntil || 0,
    campaigns: groupCampaigns(snap.campaigns || []),
    lists: snap.lists || [],
    leads: snap.leads || [],
    leadgen: snap.leadgen || { phrases: [], groups: [], scanStatus: "idle", matchCount: 0, newCount: 0 },
    leadgenMatches: snap.leadgenMatches || [],
    neurocomments: snap.neurocomments || {},
    neurocommentTasks: snap.neurocommentTasks || [],
    neurocommentStats: snap.neurocommentStats || {},
    aiLead: snap.aiLead || {},
    aiLeadStats: snap.aiLeadStats || {},
    aiLeadActions: snap.aiLeadActions || [],
    hostedLeadBots: snap.hostedLeadBots || [],
    landings: snap.landings || [],
    bots: snap.bots || [],
    tgChannels: snap.tgChannels || [],
    tgChannelAccess: snap.tgChannelAccess || [],
    autopostQueue: snap.autopostQueue || [],
    tgFunnels: snap.tgFunnels || [],
    tgReceipts: snap.tgReceipts || [],
    tgPlan: snap.tgPlan || snap.user?.tgPlan || { id: null, lite: 0, pro: 0, until: 0 },
    tgSlots: snap.tgSlots || { lite: 0, pro: 0 },
    tgTrialUsed: !!(snap.user?.tgTrialUsed),
    referral: snap.user.referral || { invited: 0, paying: 0, earned: 0, code: '—' },
    ops: (snap.ops || []).map((o) => ({ ...o, at: o.at })),
    pendingPayments: snap.pendingPayments || [],
    stats: snap.stats || { leads: 0, messages: 0, likes: 0, posts: 0 },
    activity: snap.activity || [],
    promo: snap.promo || { enabled: false },
    settings: snap.settings,
    contentPosts: snap.contentPosts || [],
    contentCounts: snap.contentCounts || {},
    pubLogs: snap.pubLogs || [],
    rssSources: snap.rssSources || [],
    repostSources: snap.repostSources || [],
    cabinet: snap.cabinet || {},
  };
  return OnLead._state;
};

function groupCampaigns(list) {
  const out = {};
  for (const c of list) {
    out[c.slug] = out[c.slug] || [];
    out[c.slug].push({
      id: c.id,
      title: c.title
        || (c.slug === 'congratulation-vk' ? 'Автопоздравление' : null)
        || c.payload?.offer || c.payload?.prompt || c.payload?.caption
        || c.payload?.templates || c.payload?.topics || c.payload?.sources || c.payload?.filters
        || c.slug,
      created: c.created,
      status: c.status,
      stats: c.stats,
      accountId: c.accountId,
    });
  }
  return out;
}

OnLead.load = function () {
  return OnLead._state || {
    user: { name: '…', email: '', id: '' },
    trialUntil: 0, balance: 0, refBalance: 0, accounts: [], accountSlots: 3,
    activeAccount: null, enabledTools: {}, packageId: null, packageUntil: 0, campaigns: {},
    lists: [], leads: [], leadgen: { phrases: [], groups: [], scanStatus: "idle" }, leadgenMatches: [],
    neurocomments: {}, neurocommentTasks: [], neurocommentStats: {},
    aiLead: {}, aiLeadStats: {}, aiLeadActions: [],
    hostedLeadBots: [],
    landings: [], bots: [], tgChannels: [], tgFunnels: [],
    tgPlan: { id: null, lite: 0, pro: 0, until: 0 }, tgSlots: { lite: 0, pro: 0 }, tgTrialUsed: false,
    referral: { invited: 0, paying: 0, earned: 0, code: '—' },
    ops: [], pendingPayments: [], stats: { leads: 0, messages: 0, likes: 0, posts: 0 }, activity: [],
    promo: { enabled: false },
  };
};

OnLead.vkMessagesUiOn = function (state) {
  return !!(state || OnLead.load())?.settings?.vkMessagesUiEnabled;
};

OnLead.loggedIn = function () {
  return !!OnLead.getToken();
};

OnLead.logout = function () {
  OnLead.setToken(null);
  OnLead._state = null;
  location.hash = '#/';
};

OnLead.trialLeft = function (state) {
  return state?.user?.trialLeft || null;
};

OnLead.toolOn = function (state, slug) {
  if (slug === "lists") return true;
  if (state.user?.role === "admin") return true;
  if (OnLead.trialLeft(state)) return true;
  if (state.enabledTools?.[slug] && state.enabledTools[slug] > Date.now()) return true;
  if (!OnLead.packageActive(state)) return false;
  const pack = OnLead.PACKAGES.find((p) => p.id === state.packageId);
  return !!(pack && pack.tools.includes(slug));
};
