/** Safe RSS/Atom fetch + parse (no external deps). */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivateIp(ip) {
  const v = ip.toLowerCase();
  if (v === '::1' || v === '0.0.0.0') return true;
  if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:')) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export async function assertSafeExternalUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw new Error('Некорректный URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Разрешены только http/https');
  }
  if (url.username || url.password) throw new Error('URL с credentials запрещён');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Внутренние хосты запрещены');
  }
  const port = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
  if (![80, 443, 8080, 8443].includes(port)) throw new Error('Неразрешённый порт');

  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Приватные IP запрещены');
    return url;
  }
  let records;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error('Не удалось разрешить DNS хоста');
  }
  if (!records?.length) throw new Error('DNS пустой');
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error('Хост резолвится в приватный IP');
  }
  return url;
}

async function fetchOnce(urlStr, redirect = true) {
  const safe = await assertSafeExternalUrl(urlStr);
  const res = await fetch(safe.toString(), {
    headers: {
      'User-Agent': 'OnLead/1.0 (RSS reader)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    redirect: redirect ? 'follow' : 'manual',
    signal: AbortSignal.timeout(20_000),
  });
  if (!redirect && [301, 302, 303, 307, 308].includes(res.status)) {
    const loc = res.headers.get('location');
    if (!loc) throw new Error(`HTTP ${res.status} без Location`);
    const next = new URL(loc, safe);
    await assertSafeExternalUrl(next.toString());
    const res2 = await fetch(next.toString(), {
      headers: { 'User-Agent': 'OnLead/1.0 (RSS reader)', Accept: 'application/rss+xml, application/xml, */*' },
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    return res2.text();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

export function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(xml, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const m = re.exec(xml);
  return m ? m[1].trim() : '';
}

function tagAttr(xml, name, attr) {
  const re = new RegExp(`<${name}[^>]*\\s${attr}=["']([^"']+)["']`, 'i');
  const m = re.exec(xml);
  return m ? m[1].trim() : '';
}

function cdata(val) {
  const m = /^<!\[CDATA\[([\s\S]*?)\]\]>$/i.exec(String(val || '').trim());
  return m ? m[1].trim() : String(val || '').trim();
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function pickImage(block, link) {
  const enc = tagAttr(block, 'enclosure', 'url');
  const encType = tagAttr(block, 'enclosure', 'type');
  if (enc && (!encType || encType.startsWith('image/'))) return normalizeImageUrl(enc, link);
  const media = tagAttr(block, 'media:content', 'url') || tagAttr(block, 'media:thumbnail', 'url');
  if (media) return normalizeImageUrl(media, link);
  const html = tag(block, 'content:encoded') || tag(block, 'content') || tag(block, 'description') || tag(block, 'summary');
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? normalizeImageUrl(img[1], link) : undefined;
}

function normalizeImageUrl(imageUrl, pageLink) {
  if (!imageUrl?.trim()) return undefined;
  const raw = imageUrl.trim();
  if (raw.startsWith('//')) return `https:${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (pageLink) {
    try { return new URL(raw, pageLink).toString(); } catch { return undefined; }
  }
  return raw;
}

function parseDate(raw) {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.getTime();
}

function parseRss2(xml) {
  const title = decodeEntities(cdata(tag(xml, 'title'))) || 'RSS';
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const items = blocks.map((block, index) => {
    const t = decodeEntities(cdata(tag(block, 'title'))) || 'Без заголовка';
    const link = decodeEntities(cdata(tag(block, 'link'))) || tagAttr(block, 'link', 'href');
    const guid = decodeEntities(cdata(tag(block, 'guid'))) || link || `${t}:${index}`;
    const rawDesc = tag(block, 'content:encoded') || tag(block, 'description');
    const summary = rawDesc ? stripHtml(cdata(rawDesc)).slice(0, 2000) : undefined;
    const content = rawDesc ? (rawDesc.includes('<') ? stripHtml(cdata(rawDesc)) : cdata(rawDesc)).slice(0, 20000) : summary;
    return {
      guid: String(guid).slice(0, 500),
      title: t.slice(0, 500),
      link: link || undefined,
      summary,
      content,
      imageUrl: pickImage(block, link),
      publishedAt: parseDate(tag(block, 'pubDate')),
    };
  });
  return { title, items };
}

function parseAtom(xml) {
  const title = decodeEntities(cdata(tag(xml, 'title'))) || 'Atom';
  const blocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const items = blocks.map((block, index) => {
    const t = decodeEntities(cdata(tag(block, 'title'))) || 'Без заголовка';
    const link = tagAttr(block, 'link', 'href') || decodeEntities(cdata(tag(block, 'link')));
    const guid = decodeEntities(cdata(tag(block, 'id'))) || link || `${t}:${index}`;
    const rawContent = tag(block, 'content') || tag(block, 'summary');
    const summary = rawContent ? stripHtml(cdata(rawContent)).slice(0, 2000) : undefined;
    const content = rawContent ? stripHtml(cdata(rawContent)).slice(0, 20000) : summary;
    const publishedAt = parseDate(tag(block, 'published') || tag(block, 'updated'));
    return {
      guid: String(guid).slice(0, 500),
      title: t.slice(0, 500),
      link: link || undefined,
      summary,
      content,
      imageUrl: pickImage(block, link),
      publishedAt,
    };
  });
  return { title, items };
}

export async function parseRssFeed(url) {
  const xml = await fetchOnce(url);
  const lower = xml.slice(0, 2000).toLowerCase();
  if (lower.includes('<feed') && lower.includes('xmlns="http://www.w3.org/2005/atom"')) {
    return parseAtom(xml);
  }
  if (lower.includes('<rss') || lower.includes('<channel')) {
    return parseRss2(xml);
  }
  if (lower.includes('<entry')) return parseAtom(xml);
  throw new Error('Неизвестный формат ленты');
}

export function buildRssTextBody(item) {
  const text = item.content || item.summary;
  if (text?.trim()) return text.trim().slice(0, 16384);
  const parts = [item.title];
  if (item.link) parts.push(`\n\nИсточник: ${item.link}`);
  return parts.filter(Boolean).join('').slice(0, 16384) || 'RSS item';
}

export function buildRewrittenPostBody(body, link) {
  const t = String(body || '').trim();
  if (!t) return 'RSS item';
  if (link && !t.includes(link)) return `${t}\n\nИсточник: ${link}`.slice(0, 16384);
  return t.slice(0, 16384);
}
