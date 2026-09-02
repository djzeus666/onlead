/** Neurocomments config, tasks, discover + send (online-lead.ru parity). */
import { decryptToken } from './crypto.mjs';
import { load, mutate, toolOn } from './db.mjs';
import { readAiConfig, generateNeuroCommentText } from './ai.mjs';
import {
  vkDiscoverFriendsPosts,
  vkDiscoverWallPosts,
  vkResolveOwnerId,
  vkCreateNeuroComment,
  vkListCommentReplies,
} from './vk/neurocomment.mjs';

const MAX_TASKS = 200;
const MAX_TARGETS = 5;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function accountToken(account) {
  if (!account?.tokenEnc) return null;
  if (String(account.tokenEnc).startsWith('mock:')) return account.tokenEnc;
  return decryptToken(account.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
}

function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultNeuroConfig(userId) {
  return {
    userId,
    enabled: false,
    accountId: null,
    modeFriends: true,
    modeAudience: false,
    modeWall: false,
    dailyLimit: 20,
    tonePrompt: '',
    targets: [],
    blocks: [],
    sentToday: 0,
    sentTodayDate: '',
    startedAt: null,
    tasks: [],
  };
}

function withDayReset(cfg) {
  const key = todayKey();
  if (cfg.sentTodayDate === key) return cfg;
  return { ...cfg, sentToday: 0, sentTodayDate: key };
}

export function getNeuroConfig(userId) {
  const db = load();
  db.neurocomments = db.neurocomments || [];
  let cfg = db.neurocomments.find((c) => c.userId === userId);
  if (!cfg) {
    cfg = mutate((d) => {
      d.neurocomments = d.neurocomments || [];
      const c = defaultNeuroConfig(userId);
      d.neurocomments.push(c);
      return c;
    });
  }
  const normalized = withDayReset(cfg);
  if (normalized.sentToday !== cfg.sentToday || normalized.sentTodayDate !== cfg.sentTodayDate) {
    cfg = mutate((d) => {
      const c = d.neurocomments.find((x) => x.userId === userId);
      if (c) {
        c.sentToday = normalized.sentToday;
        c.sentTodayDate = normalized.sentTodayDate;
      }
      return c;
    });
  }
  return cfg;
}

export function publicNeuro(cfg, userId) {
  const c = withDayReset(cfg || getNeuroConfig(userId));
  return {
    enabled: !!c.enabled,
    accountId: c.accountId || null,
    modeFriends: c.modeFriends !== false,
    modeAudience: !!c.modeAudience,
    modeWall: !!c.modeWall,
    dailyLimit: Number(c.dailyLimit) || 20,
    tonePrompt: c.tonePrompt || '',
    targets: (c.targets || []).slice(0, MAX_TARGETS),
    blocks: (c.blocks || []).slice(0, 200),
    sentToday: Number(c.sentToday) || 0,
    startedAt: c.startedAt || null,
  };
}

export function neuroStats(userId) {
  const cfg = withDayReset(getNeuroConfig(userId));
  const tasks = cfg.tasks || [];
  const sent = tasks.filter((t) => t.status === 'sent').length;
  const errors = tasks.filter((t) => t.status === 'error').length;
  const inProgress = tasks.filter((t) => t.status === 'scheduled' || t.status === 'sending').length;
  let days = 0;
  if (cfg.startedAt) {
    days = Math.max(1, Math.ceil((Date.now() - Date.parse(cfg.startedAt)) / 86400000));
  }
  return {
    enabled: !!cfg.enabled,
    dailyLimit: Number(cfg.dailyLimit) || 20,
    sentToday: Number(cfg.sentToday) || 0,
    inProgress,
    totalSent: sent,
    errors,
    days,
  };
}

export function listNeuroTasks(userId, statusFilter) {
  const tasks = getNeuroConfig(userId).tasks || [];
  const list = [...tasks].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  if (!statusFilter) return list.slice(0, 80);
  return list.filter((t) => t.status === statusFilter).slice(0, 80);
}

function blockedOwner(cfg, ownerId) {
  const id = String(ownerId);
  return (cfg.blocks || []).some((b) => String(b.recipientId) === id);
}

function pushTask(cfg, task) {
  cfg.tasks = cfg.tasks || [];
  cfg.tasks.unshift(task);
  if (cfg.tasks.length > MAX_TASKS) cfg.tasks.length = MAX_TASKS;
}

export async function runNeuroDiscover(userId) {
  const db = load();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !toolOn(user, 'neurocomment-vk', db.settings)) {
    throw new Error('Нейрокомментарии не активны');
  }
  const cfg = getNeuroConfig(userId);
  const account = db.accounts.find((a) => a.id === (cfg.accountId || user.activeAccount));
  const token = accountToken(account);
  if (!token) throw new Error('Подключите VK-аккаунт');

  const found = [];
  const seen = new Set();

  if (cfg.modeFriends !== false) {
    const posts = await vkDiscoverFriendsPosts(token, 12);
    for (const p of posts) {
      const key = `${p.ownerId}_${p.postId}`;
      if (seen.has(key) || blockedOwner(cfg, p.ownerId)) continue;
      seen.add(key);
      found.push({ ...p, mode: 'friends' });
    }
  }

  for (const t of (cfg.targets || []).slice(0, MAX_TARGETS)) {
    const ownerId = Number(t.vkId);
    if (!ownerId || blockedOwner(cfg, ownerId)) continue;
    const mode = t.mode === 'audience' ? 'audience' : 'wall';
    if (mode === 'audience' && !cfg.modeAudience) continue;
    if (mode === 'wall' && !cfg.modeWall) continue;
    const posts = await vkDiscoverWallPosts(token, ownerId, 8);
    for (const p of posts) {
      const key = `${p.ownerId}_${p.postId}`;
      if (seen.has(key) || blockedOwner(cfg, p.authorId ?? p.ownerId)) continue;
      seen.add(key);
      found.push({ ...p, mode });
    }
  }

  if (!found.length) throw new Error('Свежих постов не найдено — проверьте режимы и цели');

  let added = 0;
  mutate((d) => {
    const c = d.neurocomments.find((x) => x.userId === userId);
    if (!c) return;
    for (const p of found.slice(0, 15)) {
      const dup = (c.tasks || []).some(
        (t) => t.ownerId === p.ownerId && t.postId === p.postId && t.status !== 'cancelled',
      );
      if (dup) continue;
      pushTask(c, {
        id: newId('nct'),
        status: 'scheduled',
        mode: p.mode || 'friends',
        postText: p.text || '',
        postUrl: p.url || '',
        recipientId: String(p.authorId ?? p.ownerId),
        ownerId: p.ownerId,
        postId: p.postId,
        createdAt: new Date().toISOString(),
      });
      added += 1;
    }
  });

  return { ok: true, added, total: found.length };
}


export async function tickNeurocomments() {
  const db = load();
  for (const cfg of db.neurocomments || []) {
    if (!cfg.enabled) continue;
    const user = db.users.find((u) => u.id === cfg.userId);
    if (!user || !toolOn(user, 'neurocomment-vk', db.settings)) continue;

    const fresh = withDayReset(cfg);
    if (fresh.sentToday !== cfg.sentToday) {
      mutate((d) => {
        const c = d.neurocomments.find((x) => x.userId === cfg.userId);
        if (c) {
          c.sentToday = fresh.sentToday;
          c.sentTodayDate = fresh.sentTodayDate;
        }
      });
    }

    const limit = Number(cfg.dailyLimit) || 20;
    if (Number(cfg.sentToday) >= limit) continue;

    const account = db.accounts.find((a) => a.id === (cfg.accountId || user.activeAccount));
    const token = accountToken(account);
    if (!token) continue;

    const scheduled = (cfg.tasks || []).filter((t) => t.status === 'scheduled').length;
    if (scheduled < 3) {
      try {
        await runNeuroDiscover(cfg.userId);
      } catch { /* quiet */ }
    }

    const live = getNeuroConfig(cfg.userId);
    if (Number(live.sentToday) >= limit) continue;
    const task = (live.tasks || []).find((t) => t.status === 'scheduled');
    if (!task) continue;

    mutate((d) => {
      const c = d.neurocomments.find((x) => x.userId === cfg.userId);
      const t = c?.tasks?.find((x) => x.id === task.id);
      if (t) t.status = 'sending';
    });

    const ai = readAiConfig(load().settings);
    let text = '';
    let errMsg = '';
    try {
      text = await generateNeuroCommentText({
        postText: task.postText,
        topics: live.tonePrompt || '',
        tone: live.tonePrompt || 'Нейтральный',
      }, ai);
    } catch (err) {
      errMsg = err instanceof Error ? err.message : String(err);
      text = 'Интересная мысль, спасибо что поделились.';
    }
    if (!text) text = 'Интересная мысль, спасибо что поделились.';

    const r = await vkCreateNeuroComment(token, task.ownerId, task.postId, text);
    mutate((d) => {
      const c = d.neurocomments.find((x) => x.userId === cfg.userId);
      const t = c?.tasks?.find((x) => x.id === task.id);
      if (!c || !t) return;
      if (r.ok) {
        t.status = 'sent';
        t.generatedText = text;
        t.sentAt = new Date().toISOString();
        t.commentId = r.commentId || null;
        t.errorMessage = errMsg || null;
        c.sentToday = Number(c.sentToday || 0) + 1;
        c.sentTodayDate = todayKey();
      } else {
        t.status = 'error';
        t.errorMessage = r.message || 'VK error';
      }
    });
  }
}

export function cancelNeuroTask(userId, taskId) {
  mutate((d) => {
    const c = d.neurocomments.find((x) => x.userId === userId);
    const t = c?.tasks?.find((x) => x.id === taskId);
    if (t && (t.status === 'scheduled' || t.status === 'error')) t.status = 'cancelled';
  });
}

export function addNeuroTarget(userId, { mode, raw }) {
  const m = mode === 'audience' ? 'audience' : 'wall';
  const db = load();
  const cfg = getNeuroConfig(userId);
  if ((cfg.targets || []).length >= MAX_TARGETS) throw new Error(`Не больше ${MAX_TARGETS} целей`);
  const user = db.users.find((u) => u.id === userId);
  const account = db.accounts.find((a) => a.id === (cfg.accountId || user?.activeAccount));
  const token = accountToken(account);
  if (!token) throw new Error('Подключите VK-аккаунт');
  return vkResolveOwnerId(token, raw).then((resolved) => {
    if (!resolved?.id) throw new Error('Не удалось распознать страницу VK');
    return mutate((d) => {
      const c = d.neurocomments.find((x) => x.userId === userId) || defaultNeuroConfig(userId);
      if (!d.neurocomments.includes(c)) d.neurocomments.push(c);
      const id = newId('nctg');
      c.targets = c.targets || [];
      c.targets.push({
        id,
        mode: m,
        vkId: String(resolved.id),
        name: resolved.name || resolved.screenName || String(resolved.id),
        screenName: resolved.screenName || '',
      });
      return c;
    });
  });
}

export function removeNeuroTarget(userId, targetId) {
  mutate((d) => {
    const c = d.neurocomments.find((x) => x.userId === userId);
    if (c) c.targets = (c.targets || []).filter((t) => t.id !== targetId);
  });
}

export function addNeuroBlock(userId, recipientId, reason) {
  const rid = String(recipientId || "").trim();
  if (!rid) throw new Error("Укажите id");
  mutate((d) => {
    const c = d.neurocomments.find((x) => x.userId === userId) || defaultNeuroConfig(userId);
    if (!d.neurocomments.includes(c)) d.neurocomments.push(c);
    if ((c.blocks || []).some((b) => b.recipientId === rid)) return;
    c.blocks = c.blocks || [];
    c.blocks.push({ id: newId('ncb'), recipientId: rid, reason: reason || '' });
  });
}

export function removeNeuroBlock(userId, blockId) {
  mutate((d) => {
    const c = d.neurocomments.find((x) => x.userId === userId);
    if (c) c.blocks = (c.blocks || []).filter((b) => b.id !== blockId);
  });
}

export function listNeuroDialogs(userId) {
  return (getNeuroConfig(userId).tasks || [])
    .filter((t) => t.status === 'sent')
    .map((t) => ({
      id: t.id,
      postUrl: t.postUrl,
      generatedText: t.generatedText,
      replyCount: Number(t.replyCount) || 0,
      sentAt: t.sentAt,
    }))
    .slice(0, 40);
}

export async function getNeuroDialogThread(userId, taskId) {
  const cfg = getNeuroConfig(userId);
  const task = (cfg.tasks || []).find((t) => t.id === taskId && t.status === 'sent');
  if (!task) throw new Error('Диалог не найден');
  const db = load();
  const user = db.users.find((u) => u.id === userId);
  const account = db.accounts.find((a) => a.id === (cfg.accountId || user?.activeAccount));
  const token = accountToken(account);
  if (!token) throw new Error('Подключите VK-аккаунт');

  let replies = [];
  if (task.commentId && task.ownerId != null && task.postId != null) {
    replies = await vkListCommentReplies(token, task.ownerId, task.postId, task.commentId);
    mutate((d) => {
      const c = d.neurocomments.find((x) => x.userId === userId);
      const t = c?.tasks?.find((x) => x.id === taskId);
      if (t) t.replyCount = replies.length;
    });
  }

  return {
    task: {
      generatedText: task.generatedText,
      postUrl: task.postUrl,
      postText: task.postText,
    },
    replies,
  };
}

export function patchNeuroConfig(userId, body) {
  return mutate((d) => {
    d.neurocomments = d.neurocomments || [];
    let c = d.neurocomments.find((x) => x.userId === userId);
    if (!c) {
      c = defaultNeuroConfig(userId);
      d.neurocomments.push(c);
    }
    if (body.enabled != null) {
      c.enabled = !!body.enabled;
      if (c.enabled && !c.startedAt) c.startedAt = new Date().toISOString();
    }
    if (body.accountId !== undefined) c.accountId = body.accountId || null;
    if (body.modeFriends != null) c.modeFriends = !!body.modeFriends;
    if (body.modeAudience != null) c.modeAudience = !!body.modeAudience;
    if (body.modeWall != null) c.modeWall = !!body.modeWall;
    if (body.dailyLimit != null) c.dailyLimit = Math.max(1, Math.min(200, Number(body.dailyLimit) || 20));
    if (body.tonePrompt !== undefined) c.tonePrompt = String(body.tonePrompt || '').slice(0, 2000);
    return c;
  });
}
