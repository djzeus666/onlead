/** Per-entity SQLite. v6: remaining collections (jobs/ops/lists/logs/leadgen/tokens). */
import { sqliteHandle } from './sqlite.mjs';

export const SCHEMA_VERSION = 10;

export const COLLECTIONS = [
  'users', 'sessions', 'accounts', 'campaigns', 'jobs', 'leads', 'lists',
  'landings', 'bots', 'tgChannels', 'tgFunnels', 'ops', 'logs', 'leadgen',
  'leadgenMatches', 'payments', 'emailTokens', 'tgSessions',
];

const COLUMN_COLLECTIONS = new Set(COLLECTIONS);

export const DOC_COLLECTIONS = COLLECTIONS.filter((n) => !COLUMN_COLLECTIONS.has(n));

export function rowId(collection, item, index) {
  if (item?.id != null && String(item.id)) return String(item.id);
  if (collection === 'sessions' && item?.token) return String(item.token);
  if (item?.key) return String(item.key);
  return `${collection}-${index}`;
}

export function schemaVersion(database) {
  const db = database || sqliteHandle();
  const row = db.prepare('SELECT v FROM meta WHERE k = ?').get('schema');
  const n = Number(row?.v || 0);
  return Number.isFinite(n) ? n : 0;
}

export function docsCount(database) {
  const db = database || sqliteHandle();
  const row = db.prepare('SELECT COUNT(*) AS n FROM docs').get();
  return Number(row?.n || 0);
}

export function columnUsersCount(database) {
  const db = database || sqliteHandle();
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    return Number(row?.n || 0);
  } catch {
    return 0;
  }
}

export function columnLeadsCount(database) {
  const db = database || sqliteHandle();
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM leads').get();
    return Number(row?.n || 0);
  } catch {
    return 0;
  }
}

export function columnLandingsCount(database) {
  const db = database || sqliteHandle();
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM landings').get();
    return Number(row?.n || 0);
  } catch {
    return 0;
  }
}

export function columnBotsCount(database) {
  const db = database || sqliteHandle();
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM bots').get();
    return Number(row?.n || 0);
  } catch {
    return 0;
  }
}

export function columnJobsCount(database) {
  const db = database || sqliteHandle();
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM jobs').get();
    return Number(row?.n || 0);
  } catch {
    return 0;
  }
}

function emptyCollections() {
  const store = {};
  for (const name of COLLECTIONS) store[name] = [];
  store.settings = {};
  store.createdAt = 0;
  return store;
}

function parseBody(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function uidOf(item) {
  return item?.userId != null && item.userId !== '' ? String(item.userId) : null;
}

function hydrateUser(row) {
  let body = {};
  try { body = JSON.parse(row.body || '{}'); } catch { body = {}; }
  const colEmail = String(row.email || '');
  const email = colEmail.startsWith('dup:') ? (body.email || colEmail) : (colEmail || body.email || '');
  return {
    ...body,
    id: row.id,
    email,
    passwordHash: row.password_hash || body.passwordHash || '',
    role: row.role || body.role || 'user',
    name: row.name || body.name || '',
    banned: Number(row.banned) === 1 ? true : Boolean(body.banned),
  };
}

export function readStoreFromTables(database) {
  const db = database || sqliteHandle();
  const store = emptyCollections();
  const rows = db.prepare('SELECT collection, body FROM docs').all();
  for (const row of rows) {
    if (!COLLECTIONS.includes(row.collection)) continue;
    try {
      store[row.collection].push(JSON.parse(row.body));
    } catch {
      /* skip bad row */
    }
  }
  try {
    const urows = db.prepare('SELECT id, email, password_hash, role, name, banned, body FROM users').all();
    if (urows.length) store.users = urows.map(hydrateUser);
  } catch { /* v2 db without users table */ }
  try {
    const srows = db.prepare('SELECT token, user_id, exp FROM sessions').all();
    if (srows.length) {
      store.sessions = srows.map((r) => ({
        token: r.token,
        userId: r.user_id,
        exp: Number(r.exp) || 0,
      }));
    }
  } catch { /* ignore */ }
  try {
    const prows = db.prepare('SELECT id, user_id, status, amount, kind, body FROM payments').all();
    if (prows.length) {
      store.payments = prows.map((r) => {
        let body = {};
        try { body = JSON.parse(r.body || '{}'); } catch { body = {}; }
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          status: r.status || body.status,
          amount: r.amount != null ? Number(r.amount) : body.amount,
          kind: r.kind || body.kind,
        };
      });
    }
  } catch { /* ignore */ }
  const ver = schemaVersion(db);
  try {
    const lrows = db.prepare('SELECT id, user_id, stage, source, created_at, body FROM leads').all();
    if (ver >= 4 || lrows.length) {
      store.leads = lrows.map((r) => {
        let body = {};
        try { body = JSON.parse(r.body || '{}'); } catch { body = {}; }
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          stage: r.stage || body.stage || 'new',
          source: r.source || body.source || '',
          createdAt: r.created_at != null ? Number(r.created_at) : body.createdAt,
        };
      });
    }
  } catch { /* v3 db without leads table */ }
  try {
    const pageRows = db.prepare('SELECT id, user_id, slug, status, body FROM landings').all();
    if (ver >= 4 || pageRows.length) {
      store.landings = pageRows.map((r) => {
        let body = {};
        try { body = JSON.parse(r.body || '{}'); } catch { body = {}; }
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          slug: r.slug || body.slug || '',
          status: r.status || body.status || 'draft',
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const arows = db.prepare('SELECT id, user_id, vk_id, status, body FROM accounts').all();
    if (ver >= 5 || arows.length) {
      store.accounts = arows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          vkId: r.vk_id || body.vkId,
          status: r.status || body.status || 'active',
        };
      });
    }
  } catch { /* v4 without accounts table */ }
  try {
    const brows = db.prepare('SELECT id, user_id, username, status, body FROM bots').all();
    if (ver >= 5 || brows.length) {
      store.bots = brows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          username: r.username || body.username || '',
          status: r.status || body.status || 'on',
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const frows = db.prepare('SELECT id, user_id, bot_id, status, kind, body FROM tg_funnels').all();
    if (ver >= 5 || frows.length) {
      store.tgFunnels = frows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          botId: r.bot_id || body.botId || '',
          status: r.status || body.status || 'on',
          kind: r.kind || body.kind || 'lite',
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const chrows = db.prepare('SELECT id, user_id, bot_id, chat_id, body FROM tg_channels').all();
    if (ver >= 5 || chrows.length) {
      store.tgChannels = chrows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          botId: r.bot_id || body.botId || '',
          chatId: r.chat_id || body.chatId || '',
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const crows = db.prepare('SELECT id, user_id, slug, status, created_at, body FROM campaigns').all();
    if (ver >= 5 || crows.length) {
      store.campaigns = crows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          slug: r.slug || body.slug || '',
          status: r.status || body.status || 'running',
          created: body.created || (r.created_at ? new Date(Number(r.created_at)).toISOString() : body.created),
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const jrows = db.prepare('SELECT id, user_id, campaign_id, ok, body FROM jobs').all();
    if (ver >= 6 || jrows.length) {
      store.jobs = jrows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          campaignId: r.campaign_id || body.campaignId,
          ok: r.ok == null ? body.ok : Number(r.ok) === 1,
        };
      });
    }
  } catch { /* v5 without jobs table */ }
  try {
    const orows = db.prepare('SELECT id, user_id, amount, body FROM ops').all();
    if (ver >= 6 || orows.length) {
      store.ops = orows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          amount: r.amount != null ? Number(r.amount) : body.amount,
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const lrows = db.prepare('SELECT id, user_id, name, body FROM lists').all();
    if (ver >= 6 || lrows.length) {
      store.lists = lrows.map((r) => {
        const body = parseBody(r.body);
        return { ...body, id: r.id, userId: r.user_id || body.userId, name: r.name || body.name || '' };
      });
    }
  } catch { /* ignore */ }
  try {
    const logrows = db.prepare('SELECT id, user_id, level, created_at, body FROM logs').all();
    if (ver >= 6 || logrows.length) {
      store.logs = logrows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          level: r.level || body.level || 'info',
          at: body.at || (r.created_at ? new Date(Number(r.created_at)).toISOString() : body.at),
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const lgrows = db.prepare('SELECT id, user_id, body FROM leadgen').all();
    if (ver >= 6 || lgrows.length) {
      store.leadgen = lgrows.map((r) => {
        const body = parseBody(r.body);
        return { ...body, id: r.id, userId: r.user_id || body.userId };
      });
    }
  } catch { /* ignore */ }
  try {
    const mrows = db.prepare('SELECT id, user_id, body FROM leadgen_matches').all();
    if (ver >= 6 || mrows.length) {
      store.leadgenMatches = mrows.map((r) => {
        const body = parseBody(r.body);
        return { ...body, id: r.id, userId: r.user_id || body.userId };
      });
    }
  } catch { /* ignore */ }
  try {
    const erows = db.prepare('SELECT id, user_id, type, expires_at, body FROM email_tokens').all();
    if (ver >= 6 || erows.length) {
      store.emailTokens = erows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          type: r.type || body.type,
          expiresAt: r.expires_at != null ? Number(r.expires_at) : body.expiresAt,
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const trows = db.prepare('SELECT id, user_id, bot_id, chat_id, body FROM tg_sessions').all();
    if (ver >= 6 || trows.length) {
      store.tgSessions = trows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          key: r.id || body.key,
          userId: r.user_id || body.userId,
          botId: r.bot_id || body.botId,
          chatId: r.chat_id || body.chatId,
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const ncrows = db.prepare('SELECT id, user_id, body FROM neurocomments').all();
    if (ver >= 7 || ncrows.length) {
      store.neurocomments = ncrows.map((r) => {
        const body = parseBody(r.body);
        return { ...body, id: r.id, userId: r.user_id || body.userId };
      });
    }
  } catch { /* ignore */ }
  try {
    const cprows = db.prepare('SELECT id, user_id, status, scheduled_at, body FROM content_posts').all();
    if (ver >= 8 || cprows.length) {
      store.contentPosts = cprows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          status: r.status || body.status,
          scheduledAt: r.scheduled_at || body.scheduledAt,
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const plrows = db.prepare('SELECT id, user_id, created_at, body FROM pub_logs').all();
    if (ver >= 8 || plrows.length) {
      store.pubLogs = plrows.map((r) => {
        const body = parseBody(r.body);
        return { ...body, id: r.id, userId: r.user_id || body.userId, createdAt: r.created_at || body.createdAt };
      });
    }
  } catch { /* ignore */ }
  try {
    const rsrows = db.prepare('SELECT id, user_id, body FROM rss_sources').all();
    if (ver >= 9 || rsrows.length) {
      store.rssSources = rsrows.map((r) => {
        const body = parseBody(r.body);
        return { ...body, id: r.id, userId: r.user_id || body.userId };
      });
    }
  } catch { /* ignore */ }
  try {
    const rirows = db.prepare('SELECT id, user_id, source_id, status, body FROM rss_items').all();
    if (ver >= 9 || rirows.length) {
      store.rssItems = rirows.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          sourceId: r.source_id || body.sourceId,
          status: r.status || body.status,
        };
      });
    }
  } catch { /* ignore */ }
  try {
    const rprows = db.prepare('SELECT id, user_id, body FROM repost_sources').all();
    if (ver >= 10 || rprows.length) {
      store.repostSources = rprows.map((r) => {
        const body = parseBody(r.body);
        return { ...body, id: r.id, userId: r.user_id || body.userId };
      });
    }
  } catch { /* ignore */ }
  try {
    const rpitems = db.prepare('SELECT id, user_id, source_id, status, body FROM repost_items').all();
    if (ver >= 10 || rpitems.length) {
      store.repostItems = rpitems.map((r) => {
        const body = parseBody(r.body);
        return {
          ...body,
          id: r.id,
          userId: r.user_id || body.userId,
          sourceId: r.source_id || body.sourceId,
          status: r.status || body.status,
        };
      });
    }
  } catch { /* ignore */ }
  const settingsRow = db.prepare('SELECT v FROM meta WHERE k = ?').get('settings');
  if (settingsRow?.v) {
    try { store.settings = JSON.parse(settingsRow.v); } catch { store.settings = {}; }
  }
  const created = db.prepare('SELECT v FROM meta WHERE k = ?').get('createdAt');
  store.createdAt = Number(created?.v || 0) || Date.now();
  return store;
}

function insertDocs(db, store, now) {
  db.exec('DELETE FROM docs');
  const ins = db.prepare('INSERT INTO docs(collection, id, user_id, body, updated_at) VALUES(?, ?, ?, ?, ?)');
  for (const name of DOC_COLLECTIONS) {
    const list = Array.isArray(store[name]) ? store[name] : [];
    const used = new Set();
    list.forEach((item, i) => {
      let id = rowId(name, item, i);
      if (!id || used.has(id)) id = `${String(id || name)}~${i}`;
      let n = 0;
      while (used.has(id)) {
        n += 1;
        id = `${rowId(name, item, i) || name}~${i}~${n}`;
      }
      used.add(id);
      const uid = item?.userId != null && item.userId !== '' ? String(item.userId) : null;
      ins.run(name, id, uid, JSON.stringify(item), now);
    });
  }
}

function insertUsers(db, store) {
  db.exec('DELETE FROM users');
  const ins = db.prepare('INSERT INTO users(id, email, password_hash, role, name, banned, body) VALUES(?, ?, ?, ?, ?, ?, ?)');
  const emails = new Set();
  for (const u of store.users || []) {
    const id = String(u.id || '').trim() || `u-${emails.size}`;
    let email = String(u.email || '').trim().toLowerCase() || `${id}@local`;
    if (emails.has(email)) email = `dup:${id}`;
    emails.add(email);
    ins.run(
      id,
      email,
      String(u.passwordHash || ''),
      String(u.role || 'user'),
      String(u.name || '').slice(0, 120),
      u.banned ? 1 : 0,
      JSON.stringify(u),
    );
  }
}

function insertSessions(db, store) {
  db.exec('DELETE FROM sessions');
  const ins = db.prepare('INSERT INTO sessions(token, user_id, exp) VALUES(?, ?, ?)');
  const used = new Set();
  for (const s of store.sessions || []) {
    const token = String(s.token || '').trim();
    if (!token || used.has(token)) continue;
    used.add(token);
    ins.run(token, String(s.userId || ''), Number(s.exp) || 0);
  }
}

function insertPayments(db, store) {
  db.exec('DELETE FROM payments');
  const ins = db.prepare('INSERT INTO payments(id, user_id, status, amount, kind, body) VALUES(?, ?, ?, ?, ?, ?)');
  const used = new Set();
  (store.payments || []).forEach((p, i) => {
    let id = String(p.id || '').trim() || `pay-${i}`;
    if (used.has(id)) id = `${id}~${i}`;
    used.add(id);
    ins.run(
      id,
      p.userId != null ? String(p.userId) : null,
      String(p.status || ''),
      Number.isFinite(Number(p.amount)) ? Math.round(Number(p.amount)) : null,
      String(p.kind || ''),
      JSON.stringify(p),
    );
  });
}

function uniqueRowId(used, raw, fallback, index) {
  let id = String(raw || '').trim() || fallback;
  if (used.has(id)) id = `${id}~${index}`;
  let n = 0;
  while (used.has(id)) {
    n += 1;
    id = `${fallback}~${index}~${n}`;
  }
  used.add(id);
  return id;
}

function insertLeads(db, store) {
  db.exec('DELETE FROM leads');
  const ins = db.prepare('INSERT INTO leads(id, user_id, stage, source, created_at, body) VALUES(?, ?, ?, ?, ?, ?)');
  const used = new Set();
  (store.leads || []).forEach((l, i) => {
    const id = uniqueRowId(used, l.id, `lead-${i}`, i);
    ins.run(
      id,
      l.userId != null && l.userId !== '' ? String(l.userId) : null,
      String(l.stage || 'new'),
      String(l.source || '').slice(0, 160),
      Number.isFinite(Number(l.createdAt)) ? Math.round(Number(l.createdAt)) : 0,
      JSON.stringify(l),
    );
  });
}

function insertLandings(db, store) {
  db.exec('DELETE FROM landings');
  const ins = db.prepare('INSERT INTO landings(id, user_id, slug, status, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.landings || []).forEach((p, i) => {
    const id = uniqueRowId(used, p.id, `page-${i}`, i);
    ins.run(
      id,
      uidOf(p),
      String(p.slug || '').slice(0, 80),
      String(p.status || 'draft'),
      JSON.stringify(p),
    );
  });
}

function insertAccounts(db, store) {
  db.exec('DELETE FROM accounts');
  const ins = db.prepare('INSERT INTO accounts(id, user_id, vk_id, status, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.accounts || []).forEach((a, i) => {
    const id = uniqueRowId(used, a.id, `acc-${i}`, i);
    ins.run(id, uidOf(a), String(a.vkId || a.externalId || '').slice(0, 80), String(a.status || 'active'), JSON.stringify(a));
  });
}

function insertBots(db, store) {
  db.exec('DELETE FROM bots');
  const ins = db.prepare('INSERT INTO bots(id, user_id, username, status, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.bots || []).forEach((b, i) => {
    const id = uniqueRowId(used, b.id, `bot-${i}`, i);
    ins.run(id, uidOf(b), String(b.username || '').slice(0, 80), String(b.status || 'on'), JSON.stringify(b));
  });
}

function insertTgFunnels(db, store) {
  db.exec('DELETE FROM tg_funnels');
  const ins = db.prepare('INSERT INTO tg_funnels(id, user_id, bot_id, status, kind, body) VALUES(?, ?, ?, ?, ?, ?)');
  const used = new Set();
  (store.tgFunnels || []).forEach((f, i) => {
    const id = uniqueRowId(used, f.id, `fn-${i}`, i);
    ins.run(
      id,
      uidOf(f),
      String(f.botId || '').slice(0, 80),
      String(f.status || 'on'),
      String(f.kind || 'lite').slice(0, 16),
      JSON.stringify(f),
    );
  });
}

function insertTgChannels(db, store) {
  db.exec('DELETE FROM tg_channels');
  const ins = db.prepare('INSERT INTO tg_channels(id, user_id, bot_id, chat_id, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.tgChannels || []).forEach((c, i) => {
    const id = uniqueRowId(used, c.id, `ch-${i}`, i);
    ins.run(
      id,
      uidOf(c),
      String(c.botId || '').slice(0, 80),
      String(c.chatId || '').slice(0, 80),
      JSON.stringify(c),
    );
  });
}

function insertCampaigns(db, store) {
  db.exec('DELETE FROM campaigns');
  const ins = db.prepare('INSERT INTO campaigns(id, user_id, slug, status, created_at, body) VALUES(?, ?, ?, ?, ?, ?)');
  const used = new Set();
  (store.campaigns || []).forEach((c, i) => {
    const id = uniqueRowId(used, c.id, `cam-${i}`, i);
    const created = Date.parse(c.created) || Number(c.createdAt) || 0;
    ins.run(
      id,
      uidOf(c),
      String(c.slug || '').slice(0, 80),
      String(c.status || 'running'),
      Number.isFinite(created) ? Math.round(created) : 0,
      JSON.stringify(c),
    );
  });
}

function insertJobs(db, store) {
  db.exec('DELETE FROM jobs');
  const ins = db.prepare('INSERT INTO jobs(id, user_id, campaign_id, ok, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.jobs || []).forEach((j, i) => {
    const id = uniqueRowId(used, j.id, `job-${i}`, i);
    ins.run(id, uidOf(j), j.campaignId != null ? String(j.campaignId) : null, j.ok ? 1 : 0, JSON.stringify(j));
  });
}

function insertOps(db, store) {
  db.exec('DELETE FROM ops');
  const ins = db.prepare('INSERT INTO ops(id, user_id, amount, body) VALUES(?, ?, ?, ?)');
  const used = new Set();
  (store.ops || []).forEach((o, i) => {
    const id = uniqueRowId(used, o.id, `op-${i}`, i);
    const amount = Number.isFinite(Number(o.amount)) ? Math.round(Number(o.amount)) : null;
    ins.run(id, uidOf(o), amount, JSON.stringify(o));
  });
}

function insertLists(db, store) {
  db.exec('DELETE FROM lists');
  const ins = db.prepare('INSERT INTO lists(id, user_id, name, body) VALUES(?, ?, ?, ?)');
  const used = new Set();
  (store.lists || []).forEach((l, i) => {
    const id = uniqueRowId(used, l.id, `list-${i}`, i);
    ins.run(id, uidOf(l), String(l.name || '').slice(0, 160), JSON.stringify(l));
  });
}

function insertLogs(db, store) {
  db.exec('DELETE FROM logs');
  const ins = db.prepare('INSERT INTO logs(id, user_id, level, created_at, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.logs || []).forEach((l, i) => {
    const id = uniqueRowId(used, l.id, `log-${i}`, i);
    const at = Date.parse(l.at) || Number(l.createdAt) || 0;
    ins.run(id, uidOf(l), String(l.level || 'info').slice(0, 16), Number.isFinite(at) ? Math.round(at) : 0, JSON.stringify(l));
  });
}

function insertLeadgen(db, store) {
  db.exec('DELETE FROM leadgen');
  const ins = db.prepare('INSERT INTO leadgen(id, user_id, body) VALUES(?, ?, ?)');
  const used = new Set();
  (store.leadgen || []).forEach((c, i) => {
    const id = uniqueRowId(used, c.id || (c.userId ? `lg-${c.userId}` : ''), `lg-${i}`, i);
    ins.run(id, uidOf(c), JSON.stringify(c));
  });
}

function insertLeadgenMatches(db, store) {
  db.exec('DELETE FROM leadgen_matches');
  const ins = db.prepare('INSERT INTO leadgen_matches(id, user_id, body) VALUES(?, ?, ?)');
  const used = new Set();
  (store.leadgenMatches || []).forEach((m, i) => {
    const id = uniqueRowId(used, m.id, `lgm-${i}`, i);
    ins.run(id, uidOf(m), JSON.stringify(m));
  });
}

function insertNeurocomments(db, store) {
  db.exec('DELETE FROM neurocomments');
  const ins = db.prepare('INSERT INTO neurocomments(id, user_id, body) VALUES(?, ?, ?)');
  const used = new Set();
  (store.neurocomments || []).forEach((c, i) => {
    const id = uniqueRowId(used, c.id || (c.userId ? `nc-${c.userId}` : ''), `nc-${i}`, i);
    ins.run(id, uidOf(c), JSON.stringify(c));
  });
}

function insertContentPosts(db, store) {
  db.exec('DELETE FROM content_posts');
  const ins = db.prepare('INSERT INTO content_posts(id, user_id, status, scheduled_at, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.contentPosts || []).forEach((p, i) => {
    const id = uniqueRowId(used, p.id, `cp-${i}`, i);
    ins.run(id, uidOf(p), String(p.status || 'draft').slice(0, 20), Number(p.scheduledAt) || 0, JSON.stringify(p));
  });
}

function insertPubLogs(db, store) {
  db.exec('DELETE FROM pub_logs');
  const ins = db.prepare('INSERT INTO pub_logs(id, user_id, created_at, body) VALUES(?, ?, ?, ?)');
  const used = new Set();
  (store.pubLogs || []).forEach((l, i) => {
    const id = uniqueRowId(used, l.id, `pl-${i}`, i);
    ins.run(id, uidOf(l), Number(l.createdAt) || 0, JSON.stringify(l));
  });
}

function insertRssSources(db, store) {
  db.exec('DELETE FROM rss_sources');
  const ins = db.prepare('INSERT INTO rss_sources(id, user_id, body) VALUES(?, ?, ?)');
  const used = new Set();
  (store.rssSources || []).forEach((s, i) => {
    const id = uniqueRowId(used, s.id, `rs-${i}`, i);
    ins.run(id, uidOf(s), JSON.stringify(s));
  });
}

function insertRssItems(db, store) {
  db.exec('DELETE FROM rss_items');
  const ins = db.prepare('INSERT INTO rss_items(id, user_id, source_id, status, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.rssItems || []).forEach((it, i) => {
    const id = uniqueRowId(used, it.id, `ri-${i}`, i);
    ins.run(id, uidOf(it), String(it.sourceId || ''), String(it.status || 'new').slice(0, 20), JSON.stringify(it));
  });
}

function insertRepostSources(db, store) {
  db.exec('DELETE FROM repost_sources');
  const ins = db.prepare('INSERT INTO repost_sources(id, user_id, body) VALUES(?, ?, ?)');
  const used = new Set();
  (store.repostSources || []).forEach((s, i) => {
    const id = uniqueRowId(used, s.id, `rps-${i}`, i);
    ins.run(id, uidOf(s), JSON.stringify(s));
  });
}

function insertRepostItems(db, store) {
  db.exec('DELETE FROM repost_items');
  const ins = db.prepare('INSERT INTO repost_items(id, user_id, source_id, status, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.repostItems || []).forEach((it, i) => {
    const id = uniqueRowId(used, it.id, `rpi-${i}`, i);
    ins.run(id, uidOf(it), String(it.sourceId || ''), String(it.status || 'new').slice(0, 20), JSON.stringify(it));
  });
}

function insertEmailTokens(db, store) {
  db.exec('DELETE FROM email_tokens');
  const ins = db.prepare('INSERT INTO email_tokens(id, user_id, type, expires_at, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.emailTokens || []).forEach((t, i) => {
    const id = uniqueRowId(used, t.id, `et-${i}`, i);
    ins.run(id, uidOf(t), String(t.type || '').slice(0, 40), Number(t.expiresAt) || 0, JSON.stringify(t));
  });
}

function insertTgSessions(db, store) {
  db.exec('DELETE FROM tg_sessions');
  const ins = db.prepare('INSERT INTO tg_sessions(id, user_id, bot_id, chat_id, body) VALUES(?, ?, ?, ?, ?)');
  const used = new Set();
  (store.tgSessions || []).forEach((s, i) => {
    const id = uniqueRowId(used, s.key || s.id, `tgs-${i}`, i);
    ins.run(id, uidOf(s), String(s.botId || '').slice(0, 80), String(s.chatId || '').slice(0, 80), JSON.stringify(s));
  });
}

export function writeStoreToTables(store, database) {
  const db = database || sqliteHandle();
  const now = Date.now();
  db.exec('BEGIN IMMEDIATE');
  try {
    insertDocs(db, store, now);
    insertUsers(db, store);
    insertSessions(db, store);
    insertPayments(db, store);
    insertLeads(db, store);
    insertLandings(db, store);
    insertAccounts(db, store);
    insertBots(db, store);
    insertTgFunnels(db, store);
    insertTgChannels(db, store);
    insertCampaigns(db, store);
    insertJobs(db, store);
    insertOps(db, store);
    insertLists(db, store);
    insertLogs(db, store);
    insertLeadgen(db, store);
    insertLeadgenMatches(db, store);
    insertNeurocomments(db, store);
    insertContentPosts(db, store);
    insertPubLogs(db, store);
    insertRssSources(db, store);
    insertRssItems(db, store);
    insertRepostSources(db, store);
    insertRepostItems(db, store);
    insertEmailTokens(db, store);
    insertTgSessions(db, store);
    const upsert = db.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v');
    upsert.run('settings', JSON.stringify(store.settings || {}));
    upsert.run('createdAt', String(store.createdAt || now));
    upsert.run('schema', String(SCHEMA_VERSION));
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  }
}
