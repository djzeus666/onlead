/** Shared VK API caller — ported from post2post packages/integrations/src/vk. */
export const VK_API = 'https://api.vk.com/method';
export const API_VERSION = '5.199';

export function isMock(token) {
  return String(token || '').startsWith('mock:');
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const RETRYABLE_VK = new Set([6, 9, 10, 29]);

async function vkCallOnce(method, params, accessToken, doFetch) {
  const body = new URLSearchParams();
  body.set('access_token', accessToken);
  body.set('v', API_VERSION);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== '') body.set(k, String(v));
  }
  let res;
  try {
    res = await doFetch(`${VK_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : '';
    throw Object.assign(
      new Error(`VK API недоступен (${cause || reason}). Проверьте интернет/VPN и TLS.`),
      { code: 'VK_NETWORK', retryable: true },
    );
  }
  const json = await res.json();
  if (json.error) {
    const retryable = RETRYABLE_VK.has(json.error.error_code);
    const sub = json.error.error_subcode;
    let message = json.error.error_msg;
    if (json.error.error_code === 5 && sub === 1130) {
      message =
        'Токен VK привязан к IP браузера и не работает с сервера. ' +
        'В Standalone-приложении отключите проверку IP или получите токен через authorization code.';
    }
    throw Object.assign(new Error(message), {
      code: `VK_${json.error.error_code}`,
      retryable,
    });
  }
  return json.response;
}

export async function vkCall(method, params, accessToken, opts = {}) {
  const doFetch = opts.fetch || globalThis.fetch.bind(globalThis);
  const wait = opts.sleep || sleep;
  const attempts = Math.max(1, Number(opts.attempts ?? 3));
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await vkCallOnce(method, params, accessToken, doFetch);
    } catch (err) {
      last = err;
      if (!err?.retryable || i === attempts - 1) throw err;
      await wait(400 * (i + 1));
    }
  }
  throw last;
}

export function extractVkAccessToken(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  let hash = text;
  const hashIdx = text.indexOf('#');
  if (hashIdx >= 0) hash = text.slice(hashIdx + 1);
  else if (text.includes('access_token=')) hash = text.slice(text.indexOf('access_token='));
  if (hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.replace(/^\?/, ''));
    return params.get('access_token')?.trim() || null;
  }
  if (text.startsWith('mock:')) return text;
  if (/^vk1\.[A-Za-z0-9._-]+$/.test(text) || (/^[A-Za-z0-9._-]{24,}$/.test(text) && !/\s/.test(text))) {
    return text;
  }
  return null;
}

export function normalizeVkScreenRef(raw) {
  let s = String(raw || '').trim().replace(/^@+/, '');
  if (!s) return '';
  const urlMatch = s.match(/^(?:https?:\/\/)?(?:m\.|www\.)?(?:vk\.com|vk\.ru)\/(.+)$/i);
  if (urlMatch?.[1]) s = urlMatch[1];
  s = (s.split(/[/?#]/)[0] ?? '').trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }
  return s.trim();
}
