/**
 * «Граббер постов» helpers. The cabinet promises a keyword filter, a publishing
 * destination and link replacement; these are the pure parts of that, kept
 * separate from VK calls so they can be tested.
 */

export function parseKeywords(raw) {
  return String(raw || '')
    .split(/[,\n;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 1)
    .slice(0, 20);
}

export function postMatchesKeywords(post, keys) {
  if (!keys.length) return true;
  const text = String(post?.text || '').toLowerCase();
  if (!text) return false;
  return keys.some((k) => text.includes(k));
}

export function filterPostsByKeywords(posts, keys) {
  const seen = new Set();
  const out = [];
  for (const post of posts || []) {
    const fingerprint = String(post?.text || '').trim().slice(0, 120);
    if (fingerprint && seen.has(fingerprint)) continue;
    if (fingerprint) seen.add(fingerprint);
    if (postMatchesKeywords(post, keys)) out.push(post);
  }
  return out;
}

/**
 * Reposting someone else's copy verbatim carries their links and @-mentions,
 * which reads as stolen content and pushes traffic to the source.
 */
export function stripSourceLinks(text) {
  return String(text || '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\[(?:club|id|public)\d+\|([^\]]+)\]/gi, '$1')
    .replace(/@[a-z0-9_.]+/gi, '')
    .replace(/#[^\s#]+/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 3800);
}

/** Strip competitor links, optionally swap or append own URL. */
export function replaceGrabberLinks(text, replaceUrl) {
  const stripped = stripSourceLinks(text);
  const url = String(replaceUrl || '').trim();
  if (!url) return stripped;
  if (/https?:\/\//i.test(String(text || ''))) {
    return String(text || '')
      .replace(/https?:\/\/\S+/gi, url)
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
      .slice(0, 3800);
  }
  return stripped ? `${stripped}\n\n${url}`.slice(0, 3800) : url.slice(0, 3800);
}
