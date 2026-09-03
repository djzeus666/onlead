/**
 * Live check of every OnLead service. Run inside the container:
 *   docker exec onlead-app node scripts/service-audit.mjs
 * Add --send-mail to actually deliver a test letter to ADMIN_EMAIL.
 *
 * Exit code is 1 when something is FAIL, so it can gate a deploy.
 */
import { load, storageEngine, storageSchema, TOOLS } from '../server/db.mjs';
import { encryptionKeyStatus, isProd, isTelegramLive, allowMocks, isMockToken, publicUrl } from '../server/hardening.mjs';
import { isMailConfigured, isPlaceholderEmail, mailConfig, sendMail } from '../server/mail.mjs';
import { isLivePayments } from '../server/yookassa.mjs';
import { backupStatus } from '../server/backup.mjs';
import { probeRemoteBackup } from '../server/backup-remote.mjs';
import { readAiConfig, testAiChat, generateAiImage, publicAiSettings } from '../server/ai.mjs';
import { decryptToken } from '../server/crypto.mjs';
import { isDnsAutomationEnabled } from '../server/landing-hosts.mjs';
import { isCloudflareDnsConfigured } from '../server/cloudflare-dns.mjs';

const SEND_MAIL = process.argv.includes('--send-mail');
const rows = [];

function row(service, state, detail) {
  rows.push({ service, state, detail: String(detail || '') });
}

async function timed(fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { ok: true, detail, ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 };
  }
}

const db = load();
const settings = db.settings || {};

/* ------------------------------------------------------------- storage */
const engine = storageEngine();
row('storage', engine === 'sqlite-schema' ? 'OK' : 'FAIL', `${engine} v${storageSchema()}`);

/* ------------------------------------------------------------ hardening */
const key = encryptionKeyStatus();
row('encryption-key', key.ok ? 'OK' : 'FAIL', key.reason);
row('prod-mode', isProd() ? 'OK' : 'WARN', `NODE_ENV production=${isProd()}, mocks=${allowMocks() ? 'разрешены' : 'выключены'}`);

/* ------------------------------------------------------------- payments */
if (!isLivePayments()) {
  row('yookassa', 'OFF', 'PAYMENTS_MODE не live или нет ключей');
} else {
  const res = await timed(async () => {
    const auth = 'Basic ' + Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64');
    const r = await fetch('https://api.yookassa.ru/v3/payments?limit=1', {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return `shop ${process.env.YOOKASSA_SHOP_ID}, платежей в истории: ${(j.items || []).length ? 'есть' : 'нет'}`;
  });
  row('yookassa', res.ok ? 'OK' : 'FAIL', `${res.detail} (${res.ms}ms)`);
}

/* ----------------------------------------------------------------- mail */
if (!isMailConfigured()) {
  row('smtp', 'OFF', 'SMTP_HOST/USER/PASS/FROM не заданы');
} else {
  const c = mailConfig();
  const conn = await timed(async () => {
    const tls = await import('node:tls');
    await new Promise((resolve, reject) => {
      const s = tls.connect({ host: c.host, port: c.port, servername: c.host }, () => { s.end(); resolve(); });
      s.setTimeout(10000, () => { s.destroy(); reject(new Error('timeout')); });
      s.on('error', reject);
    });
    return `${c.host}:${c.port} как ${c.user}`;
  });
  row('smtp-connect', conn.ok ? 'OK' : 'FAIL', `${conn.detail} (${conn.ms}ms)`);
  if (SEND_MAIL) {
    // ADMIN_EMAIL is usually the .local placeholder, which no MTA will accept.
    const admin = String(process.env.ADMIN_EMAIL || '');
    const to = isPlaceholderEmail(admin) ? c.from : admin;
    const send = await timed(async () => {
      await sendMail({
        to,
        subject: 'OnLead: проверка почты',
        text: `Тестовое письмо от service-audit. ${new Date().toISOString()}`,
      });
      return `доставлено на ${to}`;
    });
    row('smtp-send', send.ok ? 'OK' : 'FAIL', `${send.detail} (${send.ms}ms)`);
  }
}

/* ------------------------------------------------------------- telegram */
row('telegram-mode', isTelegramLive() ? 'OK' : 'OFF', `TELEGRAM_LIVE=${process.env.TELEGRAM_LIVE || ''}`);
const bots = (db.bots || []).filter((b) => b.status !== 'off');
const activeFunnelBots = new Set(
  (db.tgFunnels || []).filter((f) => f.status === 'on' && f.botId).map((f) => f.botId),
);
const auditBots = bots.filter((b) => activeFunnelBots.has(b.id) || b.status === 'on');
if (!auditBots.length) {
  row('telegram-bots', 'OFF', 'нет активных ботов — пользователи подключают своих через BotFather');
}
for (const b of auditBots) {
  const label = `tg:${b.username || b.id}`;
  let token = '';
  try { token = b.tokenEnc ? decryptToken(b.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY) : ''; }
  catch { token = ''; }
  if (!token || String(token).startsWith('mock:') || isMockToken(token)) {
    row(label, 'OFF', 'демо/mock или пустой токен — замените в кабинете Telegram');
    continue;
  }
  const res = await timed(async () => {
    const me = await (await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(15000) })).json();
    if (!me.ok) throw new Error(me.description || 'getMe failed');
    const wh = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(15000) })).json();
    const url = wh.result?.url || '';
    const lastErr = wh.result?.last_error_message ? ` err=${wh.result.last_error_message}` : '';
    if (!url) return `WARN @${me.result.username}: webhook не установлен — пересохраните токен`;
    return `@${me.result.username} webhook=${url}${lastErr}`;
  });
  const state = res.ok && String(res.detail).startsWith('WARN') ? 'WARN' : (res.ok ? 'OK' : 'FAIL');
  row(label, state, res.detail);
}

/* ------------------------------------------------------------------- vk */
const accounts = db.accounts || [];
if (!accounts.length) row('vk-accounts', 'OFF', 'аккаунтов не подключено');
for (const a of accounts) {
  const res = await timed(async () => {
    const token = decryptToken(a.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
    const r = await (await fetch(`https://api.vk.com/method/users.get?access_token=${token}&v=5.199`, { signal: AbortSignal.timeout(15000) })).json();
    if (r.error) throw new Error(`VK ${r.error.error_code}: ${r.error.error_msg}`);
    let messages = 'нет messages-токена';
    if (a.messagesTokenEnc) {
      const mt = decryptToken(a.messagesTokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
      const mr = await (await fetch(`https://api.vk.com/method/messages.getConversations?count=1&access_token=${mt}&v=5.199`, { signal: AbortSignal.timeout(15000) })).json();
      messages = mr.error ? `messages ERR ${mr.error.error_code}` : 'messages OK';
    }
    return `${r.response?.[0]?.first_name || ''} ${r.response?.[0]?.last_name || ''} · ${messages}`;
  });
  row(`vk:${a.id}`, res.ok ? 'OK' : 'FAIL', res.detail);
}

/* ------------------------------------------------------------------- ai */
const aiPublic = publicAiSettings(settings.ai);
if (!aiPublic.configured) {
  row('ai', 'OFF', 'провайдер и ключ не заданы в админке');
} else {
  const cfg = readAiConfig(settings);
  const chat = await timed(async () => {
    const r = await testAiChat(cfg);
    return `${r.model} → ${JSON.stringify(r.reply).slice(0, 40)}`;
  });
  row('ai-chat', chat.ok ? 'OK' : 'FAIL', `${chat.detail} (${chat.ms}ms)`);
  const img = await timed(async () => {
    const out = await generateAiImage({ prompt: 'a red apple on a wooden table', ratio: '1:1 пост' }, cfg);
    return `${Math.round(out.buf.length / 1024)}KB ${out.mime}`;
  });
  row('ai-image', img.ok ? 'OK' : 'FAIL', `${img.detail} (${img.ms}ms)`);
}

/* -------------------------------------------------------------- backups */
const bak = backupStatus();
const bakAgeMin = bak.lastAt ? Math.round((Date.now() - bak.lastAt) / 60000) : null;
row(
  'backup-local',
  bak.count > 0 && bakAgeMin != null && bakAgeMin < 240 ? 'OK' : 'FAIL',
  `копий ${bak.count}, последняя ${bakAgeMin == null ? 'никогда' : bakAgeMin + ' мин назад'}, offsite ${bak.offsiteCount || 0}`,
);
const remote = await probeRemoteBackup();
row(
  'backup-s3',
  remote.configured ? (remote.ok ? 'OK' : 'FAIL') : 'OFF',
  remote.configured ? (remote.error || `bucket ${process.env.S3_BACKUP_BUCKET} отвечает`) : 'S3_BACKUP_* не заданы',
);
row(
  'backup-geo',
  remote.geoConfigured ? (remote.geoOk ? 'OK' : 'FAIL') : 'OFF',
  remote.geoConfigured
    ? (remote.geoError || 'второй контур отвечает')
    : 'не задан — для Екатеринбурга достаточно S3_BACKUP_* (ru-1)',
);

/* ---------------------------------------------------------------- legal */
const legal = settings.legal || {};
const legalReady = Boolean((legal.operator || process.env.LEGAL_OPERATOR) && (legal.inn || process.env.LEGAL_INN));
row('legal', legalReady ? 'OK' : 'OFF', legalReady ? legal.operator || process.env.LEGAL_OPERATOR : 'нет оператора и ИНН — оферта и политика остаются черновиком');

/* ---------------------------------------------------------------- tools */
const offTools = TOOLS.filter((t) => settings.toolsEnabled?.[t] === false);
row('tools', offTools.length ? 'WARN' : 'OK', offTools.length ? `выключены: ${offTools.join(', ')}` : `все ${TOOLS.length} включены`);

/* --------------------------------------------------------------- worker */
// A running campaign that has not touched stats.updatedAt for hours means the
// tick is stuck; quiet skips (pause between likes) are short by design.
const running = (db.campaigns || []).filter((c) => c.status === 'running');
const ageMinOf = (iso) => (iso ? Math.round((Date.now() - Date.parse(iso)) / 60000) : null);
if (!running.length) {
  row('worker', 'OK', `активных кампаний нет, всего ${(db.campaigns || []).length}`);
} else {
  const stale = [];
  for (const c of running) {
    const age = ageMinOf(c.stats?.updatedAt);
    const label = `${c.slug} «${String(c.title || '').slice(0, 24)}»`;
    if (age == null || age > 60) stale.push(`${label}: ${age == null ? 'ни разу не тикала' : age + ' мин'}`);
  }
  row(
    'worker',
    stale.length ? 'FAIL' : 'OK',
    stale.length
      ? `застряли ${stale.length} из ${running.length}: ${stale.join('; ')}`
      : `${running.length} кампаний тикают`,
  );
  for (const c of running) {
    row(`  ↳ ${c.slug}`.slice(0, 22), 'INFO', `ok=${c.stats?.ok || 0} fail=${c.stats?.fail || 0} · ${ageMinOf(c.stats?.updatedAt) ?? '—'} мин назад · ${String(c.stats?.lastAdminMessage || c.stats?.lastMessage || '').slice(0, 60)}`);
  }
}

/* -------------------------------------------------------------- leadgen */
const lgOn = (db.leadgen || []).filter((c) => c.enabled);
const lgFailed = (db.leadgen || []).filter((c) => c.scanStatus === 'failed');
row(
  'leadgen',
  lgFailed.length ? 'WARN' : 'OK',
  `конфигов ${(db.leadgen || []).length}, включено ${lgOn.length}${lgFailed.length ? `, с ошибкой ${lgFailed.length}: ${lgFailed[0].lastError}` : ''}`,
);

/* ------------------------------------------------------------- landings */
const all = db.landings || [];
const published = all.filter((l) => l.status === 'published');
if (!all.length) {
  row('landings', 'OFF', 'лендингов нет');
} else if (!published.length) {
  row('landings', 'WARN', `${all.length} шт., ни один не опубликован — заявки не принимаются`);
} else {
  const res = await timed(async () => {
    const port = process.env.PORT || 4173;
    // Prefer loopback: public HTTPS often fails TLS from inside the container.
    const url = `http://127.0.0.1:${port}/api/public/landings/${published[0].id}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    const j = await r.json();
    if (!j.headline) throw new Error('публичный ответ без заголовка');
    return `опубликовано ${published.length} из ${all.length}, «${j.headline}» отдаётся (${publicUrl()})`;
  });
  row('landings', res.ok ? 'OK' : 'FAIL', res.detail);
}

/* -------------------------------------------------------------- housekeep */
const now = Date.now();
const staleSessions = (db.sessions || []).filter((s) => s.exp <= now).length;
const staleTokens = (db.emailTokens || []).filter((t) => (t.exp || 0) <= now).length;
row(
  'housekeep',
  staleSessions > 50 || staleTokens > 50 ? 'WARN' : 'OK',
  `протухших сессий ${staleSessions}, токенов ${staleTokens}`,
);

/* ---------------------------------------------------------- landing DNS */
if (process.env.LANDING_DNS_ENABLED === '0') {
  row('landing-dns', 'OFF', 'LANDING_DNS_ENABLED=0');
} else if (!isCloudflareDnsConfigured()) {
  row('landing-dns', 'OFF', 'нет CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID');
} else if (!isDnsAutomationEnabled()) {
  row('landing-dns', 'OFF', 'DNS automation выключена');
} else {
  const res = await timed(async () => {
    const token = process.env.CLOUDFLARE_API_TOKEN.trim();
    const zone = process.env.CLOUDFLARE_ZONE_ID.trim();
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.errors?.[0]?.message || `HTTP ${r.status}`);
    return `zone ${j.result?.name || zone}, target ${process.env.LANDING_DNS_TARGET || '66.151.42.48'}`;
  });
  row('landing-dns', res.ok ? 'OK' : 'FAIL', `${res.detail} (${res.ms}ms)`);
}

/* ---------------------------------------------------------------- вывод */
const pad = (s, n) => String(s).padEnd(n);
console.log('');
console.log(pad('СЕРВИС', 22) + pad('СТАТУС', 8) + 'ДЕТАЛИ');
console.log('-'.repeat(110));
for (const r of rows) console.log(pad(r.service, 22) + pad(r.state, 8) + r.detail);
const failed = rows.filter((r) => r.state === 'FAIL');
const off = rows.filter((r) => r.state === 'OFF');
console.log('-'.repeat(110));
console.log(`OK ${rows.filter((r) => r.state === 'OK').length} · WARN ${rows.filter((r) => r.state === 'WARN').length} · OFF ${off.length} · FAIL ${failed.length}`);
if (failed.length) process.exitCode = 1;
