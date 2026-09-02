/** VK OAuth helpers — code exchange for own app on onlead.m360-ural.online. */

/** @see https://dev.vk.com/reference/access-rights */
export const VK_ACCESS = {
  NOTIFY: 1,
  FRIENDS: 2,
  PHOTOS: 4,
  PAGES: 16384,
  WALL: 32768,
  OFFLINE: 65536,
  GROUPS: 524288,
  MESSAGES: 4096,
};

/** online-lead.ru blank.html scopes (app 5530956 / 6463690). */
export const VK_SCOPE_ONLINE_LEAD_BASE = 1073737727;
export const VK_SCOPE_ONLINE_LEAD_MESSAGES = 1073741823;

export const VK_OAUTH_BLANK_REDIRECT = 'https://oauth.vk.com/blank.html';

/** post2post / Kate blank.html — broad bitmask, only for other legacy apps. */
export const VK_SCOPE_LEGACY = 1040183263;

/** Minimal rights for own dev.vk.com app — enable «Друзья», «Стена», «Группы» in app settings. */
export const VK_SCOPE_OWN_APP =
  VK_ACCESS.FRIENDS
  | VK_ACCESS.WALL
  | VK_ACCESS.GROUPS;

/** Extended scope when offline/pages/photos are enabled in dev.vk.com (VK_SCOPE=638982). */
export const VK_SCOPE_OWN_APP_FULL =
  VK_ACCESS.FRIENDS
  | VK_ACCESS.PHOTOS
  | VK_ACCESS.PAGES
  | VK_ACCESS.WALL
  | VK_ACCESS.GROUPS
  | VK_ACCESS.OFFLINE;

export function resolveVkOAuthScope(forMessages, appId) {
  const fromEnv = String(process.env.VK_SCOPE || '').trim();
  if (fromEnv) {
    const n = Number(fromEnv);
    return String(forMessages && !fromEnv.includes(',') ? (n | VK_ACCESS.MESSAGES) : fromEnv);
  }
  const id = String(appId || '');
  if (forMessages) {
    if (id === '6463690') return String(VK_SCOPE_ONLINE_LEAD_MESSAGES);
    return String(VK_SCOPE_LEGACY | VK_ACCESS.MESSAGES);
  }
  if (id === '5530956') return String(VK_SCOPE_ONLINE_LEAD_BASE);
  if (id === '2685278' || id === '6463690') return String(VK_SCOPE_LEGACY);
  const ownId = String(process.env.VK_APP_ID || '5530956').trim();
  if (appId === ownId) return String(VK_SCOPE_OWN_APP);
  return String(VK_SCOPE_LEGACY);
}

export function hasVkClientSecret() {
  return Boolean(String(process.env.VK_CLIENT_SECRET || '').trim());
}

export function vkOAuthUsesCodeFlow(forMessages, redirectUri) {
  if (forMessages) return false;
  if (redirectUri.includes('blank.html')) return false;
  return hasVkClientSecret();
}

export async function exchangeVkOAuthCode({ appId, code, redirectUri, clientSecret, fetch: doFetch }) {
  const secret = String(clientSecret || process.env.VK_CLIENT_SECRET || '').trim();
  if (!secret) throw Object.assign(new Error('VK_CLIENT_SECRET не задан на сервере'), { code: 'VK_CONFIG' });
  const cid = String(appId || process.env.VK_APP_ID || '').trim();
  if (!cid) throw Object.assign(new Error('VK App ID не задан'), { code: 'VK_CONFIG' });
  const uri = String(redirectUri || '').trim();
  if (!uri) throw Object.assign(new Error('redirect_uri не задан'), { code: 'VK_CONFIG' });
  const rawCode = String(code || '').trim();
  if (!rawCode) throw Object.assign(new Error('Нет code от VK'), { code: 'VK_CODE' });

  const fetchFn = doFetch || globalThis.fetch.bind(globalThis);
  const q = new URLSearchParams({
    client_id: cid,
    client_secret: secret,
    redirect_uri: uri,
    code: rawCode,
  });
  let res;
  try {
    res = await fetchFn(`https://oauth.vk.ru/access_token?${q}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`VK OAuth недоступен (${reason})`), { code: 'VK_NETWORK' });
  }
  const json = await res.json();
  if (json.error || !json.access_token) {
    const msg = json.error_description || json.error || 'Не удалось обменять code на токен';
    throw Object.assign(new Error(msg), { code: 'VK_OAUTH' });
  }
  return {
    accessToken: String(json.access_token),
    userId: json.user_id != null ? String(json.user_id) : undefined,
    expiresIn: json.expires_in,
    email: json.email || undefined,
  };
}
