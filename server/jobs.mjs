/** In-process worker: maps OnLead tools to live VK API from post2post adapters. */
import { decryptToken } from './crypto.mjs';
import { load, mutate, toolOn } from './db.mjs';
import { cabinetTaskMessage, isAdminDiagnosticMessage } from './user-error.mjs';
import { vkGrowthErrorHint, vkGetFriends, vkIsBirthdayToday, vkSendMessage, vkPostOnWall, vkInviteToGroup, vkIsGroupMember, vkDeleteFriend, vkBanUser, vkRemoveGroupMember, vkAddFriend, vkAcceptIncomingFriends, vkFetchWallPosts, vkGetGroupMembers, vkUsersSearch, vkConversations, vkListManagedGroups, vkGetGroupJoinRequests, vkApproveJoinRequest, vkBanGroupMember, vkSetGroupAccess, vkEditGroupManager, parseEditorLine, renderCongratsTemplate } from './vk/growth.mjs';
import { aiCreditsBalance, spendAiCredits, IMAGE_AI_CREDIT_COST } from './ai-credits.mjs';
import { audienceKind, filterByActivity, resolveAudience, audienceProgress, inviteAudiencePayload } from './vk/audience.mjs';
import { BROOM_RULE_LABELS, broomCandidates, broomRuleKind } from './vk/broom.mjs';
import { filterPostsByKeywords, parseKeywords, replaceGrabberLinks } from './vk/grabber.mjs';
import { postingDue, stepDue, withinSendHour, storiesDue } from './schedule.mjs';
import { vkDiscoverFriendsPosts, vkDiscoverWallPosts, vkResolveOwnerId, vkCreateNeuroComment } from './vk/neurocomment.mjs';
import { runMasslikeStep } from './vk/masslike.mjs';
import { vkScanGroupForPhrases } from './vk/leadgen.mjs';
import { sleep } from './vk/call.mjs';
import { vkPublishWall } from './vk/adapter.mjs';
import { vkPublishStory, vkStoryStats } from './vk/stories.mjs';
import { tickLeadgen } from './leadgen.mjs';
import { tickNeurocomments } from './neurocomments.mjs';
import { tickScheduledPosts } from './posts.mjs';
import { pollOnlineRssSources } from './rss.mjs';
import { pollOnlineRepostSources } from './repost.mjs';
import { recordAiLeadActionFromResult, tickAiLeadTools } from './ai-lead-tool.mjs';
import { tickPendingPayments } from './billing.mjs';
import { tickTrialEndingEmails } from './notify.mjs';
import { tickBackup } from './backup.mjs';
import { tickHousekeep } from './housekeep.mjs';
import {
  generateAiImage, saveGeneratedImage, readAiConfig, generateNeuroCommentText,
  generateLeadOpener, scoreLead,
} from './ai.mjs';
import { parseScoreThreshold } from './ai-prompts.mjs';
import { runChatManagerStep } from './vk/chat-manager.mjs';
import {
  getAiDialogs, runAiLeadDialogStep, syncCrmLead, trimAiDialogs,
} from './vk/ai-lead.mjs';

function log(db, entry) {
  db.logs.unshift({ id: 'log-' + Date.now() + Math.random().toString(16).slice(2), at: new Date().toISOString(), ...entry });
  db.logs = db.logs.slice(0, 2000);
}

function accountToken(db, account) {
  if (!account?.tokenEnc) return null;
  if (String(account.tokenEnc).startsWith('mock:')) return account.tokenEnc;
  return decryptToken(account.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
}

/** Token with messages scope (Kate Mobile), falls back to base if absent. */
function accountMessagesToken(account) {
  if (!account) return null;
  if (account.messagesTokenEnc) {
    if (String(account.messagesTokenEnc).startsWith('mock:')) return account.messagesTokenEnc;
    return decryptToken(account.messagesTokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
  }
  return accountToken(null, account);
}

import { pickLeadTemplate, applyLeadTemplate } from './lead-templates.mjs';

function firstLine(payload, keys) {
  for (const k of keys) {
    const v = payload?.[k];
    if (v) return String(v).split('\n').map((s) => s.trim()).filter(Boolean)[0];
  }
  return '';
}

/** Wall to publish to: own page by default, first managed community on request. */
async function grabberDestination(token, account, dest) {
  if (/сообществ/.test(dest)) {
    const groups = await vkListManagedGroups(token);
    if (groups[0]) return -groups[0].id;
  }
  return Number(account.externalId) || Number(account.vkId);
}

/**
 * The queue is an ordinary cabinet list, so the client can open «Мои списки»
 * and see exactly what autoposting is about to publish.
 */
const POST_QUEUE_SOURCE = 'Очередь автопостинга';

function findQueueList(db, userId) {
  return (db.lists || []).find((l) => l.userId === userId && l.source === POST_QUEUE_SOURCE) || null;
}

function queueGrabbedPosts(campaign, posts, replaceUrl) {
  let added = 0;
  mutate((d) => {
    let list = findQueueList(d, campaign.userId);
    if (!list) {
      list = {
        id: 'queue-' + campaign.userId,
        userId: campaign.userId,
        name: POST_QUEUE_SOURCE,
        source: POST_QUEUE_SOURCE,
        created: new Date().toLocaleDateString('ru-RU'),
        items: [],
        count: 0,
      };
      d.lists.unshift(list);
    }
    const seen = new Set((list.items || []).map((it) => `${it.text}|${(it.attachments || []).join(',')}`));
    for (const post of posts) {
      const text = replaceGrabberLinks(post.text || '', replaceUrl);
      const attachments = (post.attachments || []).filter(Boolean).slice(0, 10);
      if (text.length <= 40 && !attachments.length) continue;
      const key = `${text}|${attachments.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.items.push({
        id: 'q' + Date.now() + Math.random().toString(16).slice(2, 6),
        text,
        attachments,
        status: 'queued',
        createdAt: Date.now(),
      });
      added += 1;
      if (added >= 20) break;
    }
    list.items = list.items.slice(-200);
    list.count = list.items.filter((it) => it.status === 'queued').length;
  });
  return added;
}

function parseInviteBlacklist(raw) {
  const ids = new Set();
  for (const part of String(raw || '').split(/[\n,;]+/)) {
    const line = part.trim();
    if (!line) continue;
    const m = line.match(/(?:https?:\/\/vk\.com\/)?(?:id|club|public)?(\d+)/i) || line.match(/^(\d{5,})$/);
    if (m) ids.add(Number(m[1]));
  }
  return ids;
}

function parseStoryCaptions(raw) {
  return String(raw || '')
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function appendUtm(text, payload = {}) {
  const body = String(text || '');
  if (/utm_[a-z]+=/i.test(body)) return body;
  const urlMatch = body.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) return body;
  const src = encodeURIComponent(payload.utmSource || 'onlead');
  const med = encodeURIComponent(payload.utmMedium || 'vk');
  const camp = encodeURIComponent(payload.utmCampaign || payload.title || 'autopost');
  const url = urlMatch[0];
  const sep = url.includes('?') ? '&' : '?';
  return body.replace(url, `${url}${sep}utm_source=${src}&utm_medium=${med}&utm_campaign=${camp}`);
}

function takeQueuedPost(userId) {
  const list = findQueueList(load(), userId);
  return (list?.items || []).find((it) => it.status === 'queued') || null;
}

function markQueuedPost(userId, itemId, status) {
  mutate((d) => {
    const list = findQueueList(d, userId);
    const row = (list?.items || []).find((it) => it.id === itemId);
    if (!row) return;
    row.status = status;
    row.postedAt = Date.now();
    list.count = list.items.filter((it) => it.status === 'queued').length;
  });
}

function findUserList(db, userId, nameOrId) {
  const key = String(nameOrId || '').trim();
  if (!key) return null;
  return (db.lists || []).find((l) => l.userId === userId && (l.id === key || l.name === key));
}

async function resolveOwners(token, raw) {
  const lines = String(raw || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const ids = [];
  for (const line of lines.slice(0, 8)) {
    const r = await vkResolveOwnerId(token, line);
    if (r?.id) ids.push(r.id);
  }
  return ids;
}

export async function runCampaignStep(campaign) {
  const db = load();
  const user = db.users.find((u) => u.id === campaign.userId);
  if (!user) return { ok: false, message: 'Нет пользователя' };
  if (!toolOn(user, campaign.slug, db.settings)) return { ok: false, message: 'Инструмент выключен' };
  const p = campaign.payload || {};
  const slug = campaign.slug;
  const pause = Number(db.settings.pauseMs || 400);
  const limit = Number(p.perDay || p.perHour || db.settings.dailyLimit || 20);
  const done = campaign.stats?.ok || 0;
  if (slug !== 'massliking-vk' && slug !== 'image-ai' && done >= limit) {
    return { ok: true, done: true, skip: true, message: `Дневной лимит (${limit})` };
  }

  if (slug === 'image-ai') {
    const credits = aiCreditsBalance(user);
    if (credits < IMAGE_AI_CREDIT_COST) {
      return { ok: false, done: true, message: `Недостаточно кредитов (${credits}). Пополните баланс в админке или купите пакет.` };
    }
    try {
      const prompt = firstLine(p, ['prompt']) || String(p.prompt || '').trim();
      const img = await generateAiImage({ prompt, ratio: p.ratio, engine: p.engine }, readAiConfig(db.settings));
      const url = saveGeneratedImage(img);
      let left = credits;
      mutate((d) => {
        const spent = spendAiCredits(d, campaign.userId, IMAGE_AI_CREDIT_COST);
        if (spent.ok) left = spent.left;
      });
      return {
        ok: true,
        done: true,
        message: `Картинка готова · кредитов ${left}`,
        meta: { imageUrl: url, prompt, aiCreditsLeft: left },
      };
    } catch (err) {
      console.error('[image-ai]', err instanceof Error ? err.message : err);
      return { ok: false, done: true, message: 'Не получилось создать картинку. Попробуйте другое описание.' };
    }
  }

  const account = db.accounts.find((a) => a.id === campaign.accountId && a.userId === campaign.userId);
  if (!account) return { ok: false, message: 'Нет аккаунта VK' };
  const token = accountToken(db, account);
  if (!token) return { ok: false, message: 'Нет токена VK' };

  try {
    if (slug === 'massliking-vk') {
      const lists = db.lists.filter((l) => l.userId === campaign.userId);
      const result = await runMasslikeStep({
        payload: p,
        stats: campaign.stats || {},
        lists,
        token,
      });
      if (result.ok && !result.skip) await sleep(Math.max(pause, 400));
      return result;
    }

    if (slug === 'neurocomment-vk') {
      const perDay = Number(p.perDay) || 0;
      const dayKey = new Date().toISOString().slice(0, 10);
      const todayCount = campaign.stats?.neuroDay === dayKey ? Number(campaign.stats?.neuroToday || 0) : 0;
      if (perDay > 0 && todayCount >= perDay) {
        return { ok: true, skip: true, quiet: true, message: `Лимит ${perDay} комментариев/день` };
      }
      const owners = await resolveOwners(token, p.communities);
      let posts = [];
      if (owners.length) posts = await vkDiscoverWallPosts(token, owners[0], 8);
      else posts = await vkDiscoverFriendsPosts(token, 8);
      const post = posts[done % Math.max(posts.length, 1)];
      if (!post) return { ok: false, message: 'Нет постов' };
      const ai = readAiConfig(db.settings);
      let text = '';
      let adminMessage;
      try {
        text = await generateNeuroCommentText({
          postText: post.text,
          topics: p.topics || p.text,
          tone: p.tone,
        }, ai);
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        adminMessage = `neurocomment AI: ${raw}`;
        text = firstLine(p, ['topics', 'text']) || 'Интересная мысль, спасибо что поделились.';
      }
      if (!text) text = 'Интересная мысль, спасибо что поделились.';
      const r = await vkCreateNeuroComment(token, post.ownerId, post.postId, text);
      await sleep(pause);
      if (r.ok) {
        return {
          ok: true,
          message: `Комментарий ${post.url}`,
          adminMessage: adminMessage || undefined,
          meta: { neuroDay: dayKey, neuroToday: todayCount + 1 },
        };
      }
      return {
        ok: false,
        message: 'Не удалось оставить комментарий',
        adminMessage: (adminMessage ? adminMessage + ' · ' : '') + (vkGrowthErrorHint(r.message) || r.message),
      };
    }

    if (slug === 'congratulation-vk') {
      // «Время отправки» is a one-hour window, otherwise greetings land at night.
      if (!withinSendHour(p.time)) {
        return { ok: true, skip: true, quiet: true, message: `Ждём ${p.time} МСК` };
      }
      const aud = await resolveAudience({
        token,
        choice: p.audience || 'Друзья',
        payload: p,
        lists: db.lists.filter((l) => l.userId === campaign.userId),
        count: 200,
      });
      if (aud.error) return { ok: false, done: true, message: aud.error };
      const today = aud.people.filter((f) => vkIsBirthdayToday(f.bdate));
      const sentMap = new Map(
        (campaign.stats?.congrats || [])
          .filter((x) => x && x.ok && x.id != null)
          .map((x) => [Number(x.id), x]),
      );
      const pending = today.filter((f) => !sentMap.has(Number(f.id)));
      const userF = pending[0];
      if (!userF) {
        const sent = sentMap.size || Number(campaign.stats?.ok || 0);
        return {
          ok: true,
          skip: true,
          quiet: true,
          message: sent
            ? `Готово на сегодня · отправлено ${sent} из ${today.length || sent}`
            : `Сегодня нет именинников · ${aud.label} (дата скрыта или ДР не сегодня)`,
        };
      }
      const text = renderCongratsTemplate(
        p.text || (
          '{name}, с днём рождения!\n\n'
          + 'Пусть этот год будет как хороший маршрут: меньше пробок, больше открытий и остановок там, где по-настоящему тепло. '
          + 'Здоровья, лёгкости в делах и людей рядом, с которыми хочется делить и радость, и планы.\n\n'
          + 'Желаю, чтобы задуманное складывалось будто само собой — и чтобы поводов улыбнуться было больше, чем поводов откладывать.\n\n'
          + 'Обнимаю!'
        ),
        userF,
      );
      const channelRaw = String(p.channel || 'только стена').toLowerCase().trim();
      const messagesUiOn = db.settings?.vkMessagesUiEnabled === true;
      const msgToken = messagesUiOn && account.messagesTokenEnc ? accountMessagesToken(account) : null;
      const preferWall = !messagesUiOn
        || channelRaw === 'wall'
        || channelRaw === 'только стена'
        || !channelRaw;
      const preferDm = messagesUiOn && (channelRaw === 'message' || channelRaw === 'dm' || channelRaw === 'только лс');
      const canTryDm = Boolean(msgToken) && !preferWall;
      const congratsMeta = (ok, via) => ({
        congrats: {
          id: userF.id,
          name: `${userF.firstName} ${userF.lastName}`.trim(),
          via,
          ok,
          at: new Date().toISOString(),
        },
      });

      if (canTryDm && userF.canWritePrivateMessage !== false) {
        const r = await vkSendMessage(msgToken, userF.id, text);
        if (r.ok) {
          await sleep(pause);
          return { ok: true, message: `ЛС → ${userF.firstName}`, meta: congratsMeta(true, 'message') };
        }
        const wall = await vkPostOnWall(token, userF.id, text);
        await sleep(pause);
        if (wall.ok) {
          return {
            ok: true,
            message: `Стена → ${userF.firstName}`,
            adminMessage: `ЛС failed (${r.code || r.message}); wall ok for ${userF.firstName}`,
            meta: congratsMeta(true, 'wall'),
          };
        }
        return {
          ok: false,
          message: 'Не удалось отправить поздравление',
          adminMessage: vkGrowthErrorHint(r.message, r.code) || r.message,
          meta: congratsMeta(false, 'message'),
        };
      }

      if (preferDm && !msgToken) {
        const wall = await vkPostOnWall(token, userF.id, text);
        await sleep(pause);
        if (wall.ok) {
          return {
            ok: true,
            message: `Стена → ${userF.firstName}`,
            adminMessage: 'Нет messages-токена — отправили на стену',
            meta: congratsMeta(true, 'wall'),
          };
        }
        return {
          ok: false,
          message: 'Не удалось отправить поздравление',
          adminMessage: 'Нет messages-токена и wall.post не удался: ' + (wall.message || ''),
          meta: congratsMeta(false, 'wall'),
        };
      }

      const wall = await vkPostOnWall(token, userF.id, text);
      await sleep(pause);
      if (wall.ok) {
        return { ok: true, message: `Стена → ${userF.firstName}`, meta: congratsMeta(true, 'wall') };
      }
      return {
        ok: false,
        message: 'Не удалось отправить поздравление',
        adminMessage: vkGrowthErrorHint(wall.message, wall.code) || wall.message,
        meta: congratsMeta(false, 'wall'),
      };
    }

    if (slug === 'invite-vk') {
      const g = await vkResolveOwnerId(token, p.group || '');
      if (!g) return { ok: false, message: 'Укажите сообщество' };
      const aud = await resolveAudience({
        token,
        choice: p.list || 'Друзья друзей',
        payload: inviteAudiencePayload(p),
        lists: db.lists.filter((l) => l.userId === campaign.userId),
        count: 200,
      });
      if (aud.error) return { ok: false, done: true, message: aud.error };
      const { dayKey } = audienceProgress(campaign.stats);
      const sameDay = campaign.stats?.audienceDay === dayKey;
      let idx = sameDay ? Number(campaign.stats?.inviteIndex ?? campaign.stats?.ok ?? 0) : 0;
      const blacklist = parseInviteBlacklist(p.blacklist);
      const invitedIds = [...(campaign.stats?.invitedIds || [])];
      const joinedSet = new Set(campaign.stats?.joinedIds || []);
      for (const uid of invitedIds) {
        if (joinedSet.has(uid)) continue;
        const mem = await vkIsGroupMember(token, g.id, uid);
        if (mem.member) joinedSet.add(uid);
        break;
      }
      let u = aud.people[idx];
      while (u && blacklist.has(Number(u.id))) idx += 1, u = aud.people[idx];
      if (!u) {
        return {
          ok: true,
          skip: true,
          quiet: true,
          message: `Аудитория исчерпана · ${aud.label}`,
          meta: {
            audienceDay: dayKey,
            inviteIndex: idx,
            invitedIds: invitedIds.slice(-500),
            joinedIds: [...joinedSet],
            joinedCount: joinedSet.size,
          },
        };
      }
      const r = await vkInviteToGroup(token, g.id, u.id);
      await sleep(pause);
      const nextInvited = r.ok ? [...invitedIds, u.id].slice(-500) : invitedIds;
      return {
        ok: r.ok,
        message: r.ok ? `Инвайт ${u.firstName} · ${aud.label}` : vkGrowthErrorHint(r.message),
        meta: r.ok
          ? {
            audienceDay: dayKey,
            inviteIndex: idx + 1,
            invitedIds: nextInvited,
            joinedIds: [...joinedSet],
            joinedCount: joinedSet.size,
          }
          : {
            inviteIndex: idx + 1,
            invitedIds: nextInvited,
            joinedIds: [...joinedSet],
            joinedCount: joinedSet.size,
          },
      };
    }

    if (slug === 'broom-vk') {
      const scope = p.scope || 'Друзья';
      const kind = audienceKind(scope);
      const aud = await resolveAudience({
        token,
        choice: scope,
        payload: p,
        lists: db.lists.filter((l) => l.userId === campaign.userId),
        count: 200,
      });
      if (aud.error) return { ok: false, done: true, message: aud.error };
      const candidates = broomCandidates(aud.people, p.rules);
      const { dayKey, index } = audienceProgress(campaign.stats);
      const u = candidates[index];
      if (!u) {
        return {
          ok: true,
          skip: true,
          quiet: true,
          message: `Чистить больше некого · ${aud.label}, правило «${BROOM_RULE_LABELS[broomRuleKind(p.rules)]}»`,
          meta: { audienceDay: dayKey },
        };
      }
      let r;
      let verb = 'Удалён';
      if (kind === 'group') {
        const owner = await vkResolveOwnerId(token, String(p.groups || p.group || '').split(/[\s,]+/)[0]);
        if (!owner?.id) return { ok: false, done: true, message: 'Не нашёл сообщество для чистки' };
        r = await vkRemoveGroupMember(token, owner.id, u.id);
        verb = 'Исключён из сообщества';
      } else if (kind === 'friends') {
        r = await vkDeleteFriend(token, u.id);
      } else {
        // Followers and list entries are not friends: only a blacklist drops them.
        r = await vkBanUser(token, u.id);
        verb = 'Заблокирован';
      }
      await sleep(pause);
      const who = `${u.firstName} ${u.lastName}`.trim() || `id${u.id}`;
      return {
        ok: r.ok,
        message: r.ok ? `${verb} ${who} — ${u.reason}` : vkGrowthErrorHint(r.message),
        meta: r.ok ? { audienceDay: dayKey } : undefined,
      };
    }

    if (slug === 'grabber-vk') {
      const owners = await resolveOwners(token, p.sources);
      if (!owners.length) return { ok: false, message: 'Укажите источники' };
      const raw = [];
      for (const owner of owners.slice(0, 3)) {
        raw.push(...await vkFetchWallPosts(token, owner, 10));
      }
      const keys = parseKeywords(p.keys);
      const posts = filterPostsByKeywords(raw, keys);
      const dest = String(p.dest || '').toLowerCase();
      const oneShot = /стен|сообществ|очеред/.test(dest);
      if (!posts.length) {
        return {
          ok: true,
          done: oneShot,
          skip: !oneShot,
          quiet: !oneShot,
          message: keys.length
            ? `Пока нет постов по ключам: ${keys.join(', ')}`
            : 'Источники без новых постов',
        };
      }
      let batch = posts;
      if (!oneShot) {
        const seen = new Set(campaign.stats?.grabbedKeys || []);
        batch = posts.filter((post) => {
          const key = post.url || `${post.ownerId}_${post.postId}`;
          return key && !seen.has(key);
        });
        if (!batch.length) {
          return {
            ok: true,
            skip: true,
            quiet: true,
            done: false,
            message: 'Новых постов нет · мониторинг',
          };
        }
      }
      const listId = 'grab-' + Date.now();
      mutate((d) => {
        d.lists.unshift({
          id: listId,
          userId: campaign.userId,
          name: `Граббер ${owners[0]}${keys.length ? ` · ${keys[0]}` : ''}`,
          count: batch.length,
          source: 'Граббер постов',
          created: new Date().toLocaleDateString('ru-RU'),
          items: batch,
        });
      });
      const filtered = keys.length ? ` (из ${raw.length} по ключам)` : '';
      const grabbedKeys = [
        ...(campaign.stats?.grabbedKeys || []),
        ...batch.map((post) => post.url || `${post.ownerId}_${post.postId}`),
      ].slice(-300);
      if (/очеред/.test(dest)) {
        const queued = queueGrabbedPosts(campaign, batch, p.replaceUrl);
        return {
          ok: true,
          done: true,
          message: `Собрано ${batch.length}${filtered} · ${queued} в очереди автопостинга`,
          meta: { grabbedKeys },
        };
      }
      if (/стен|сообществ/.test(dest)) {
        const target = await grabberDestination(token, account, dest);
        const best = batch.find((x) => String(x.text || '').trim() || (x.attachments || []).length);
        if (!best) return { ok: true, done: true, message: `Собрано ${batch.length}${filtered} · публиковать нечего` };
        const r = await vkPublishWall(token, {
          ownerId: target,
          text: replaceGrabberLinks(best.text || '', p.replaceUrl),
          attachments: best.attachments,
        });
        const attNote = (best.attachments || []).length ? ` + ${best.attachments.length} фото` : '';
        return {
          ok: r.ok,
          done: true,
          message: r.ok
            ? `Собрано ${batch.length}${filtered} · опубликован 1 пост${attNote}`
            : `Собрано ${batch.length}${filtered}, публикация не удалась: ${r.message}`,
          meta: r.ok ? { posted: true, grabbedKeys } : { grabbedKeys },
        };
      }
      return {
        ok: true,
        done: false,
        message: `Собрано ${batch.length} новых постов${filtered} · мониторинг`,
        meta: { grabbedKeys },
      };
    }

    if (slug === 'autoposting-vk') {
      const gate = postingDue(p.when, campaign.createdAt || campaign.startedAt);
      if (!gate.due) return { ok: true, skip: true, quiet: true, message: gate.note };

      const dest = String(p.destinations || p.dest || '').trim();
      const targets = [];
      const explicit = Number(dest);
      if (Number.isFinite(explicit) && explicit !== 0) {
        targets.push(explicit);
      } else if (/сообществ/i.test(dest)) {
        const groups = await vkListManagedGroups(token);
        // «Несколько стен» means own page plus every community the user manages.
        const wanted = /нескольк/i.test(dest) ? groups : groups.slice(0, 1);
        targets.push(...wanted.map((g) => -g.id));
        if (/нескольк/i.test(dest)) targets.unshift(Number(account.externalId) || Number(account.vkId));
      } else if (/нескольк/i.test(dest)) {
        const groups = await vkListManagedGroups(token);
        targets.push(Number(account.externalId) || Number(account.vkId), ...groups.map((g) => -g.id));
      } else {
        targets.push(Number(account.externalId) || Number(account.vkId));
      }
      if (!targets.length) return { ok: false, done: true, message: 'Некуда публиковать: нет управляемых сообществ' };

      const queued = takeQueuedPost(campaign.userId);
      let text = String(p.text || '').trim() || queued?.text || '';
      if (text && (p.utmSource || p.utmCampaign || p.utmMedium)) text = appendUtm(text, p);
      const postAttachments = queued?.attachments || [];
      const recurring = /расписан|каждый день|пн\/ср\/пт/i.test(String(p.when || ''));
      if (!text) {
        return {
          ok: true,
          done: !recurring,
          skip: true,
          message: recurring ? 'Очередь пуста · ждём контент' : 'Нет текста поста и очередь пуста',
        };
      }

      const posted = [];
      const failed = [];
      for (const ownerId of targets.slice(0, 5)) {
        const r = await vkPublishWall(token, { ownerId, text, attachments: postAttachments });
        if (r.ok) posted.push(r.externalPostId);
        else failed.push(r.message);
        await sleep(pause);
      }
      if (queued) markQueuedPost(campaign.userId, queued.id, posted.length ? 'posted' : 'failed');
      return {
        ok: posted.length > 0,
        // A recurring schedule must stay running; a one-off is finished.
        done: !recurring,
        message: posted.length
          ? `Опубликовано на ${posted.length} ${posted.length === 1 ? 'стене' : 'стенах'}${queued ? ' (из очереди)' : ''}`
          : `Публикация не удалась: ${failed[0] || 'неизвестная ошибка'}`,
        meta: posted.length ? { posted: true } : undefined,
      };
    }

    if (slug === 'autostoris-vk') {
      const rawGroups = String(p.groups || '').trim();
      let ownerIds = [Number(account.externalId)];
      if (rawGroups) {
        const ids = await resolveOwners(token, rawGroups);
        if (ids.length) ownerIds = ids.map(Number);
      }
      const accountIdx = Number(campaign.stats?.storyAccountIdx || 0);
      const ownerId = ownerIds[accountIdx % ownerIds.length] || Number(account.externalId);
      const metrics = [...(campaign.stats?.storyMetrics || [])];
      for (const m of metrics.slice(0, 8)) {
        if (!m?.storyId) continue;
        const st = await vkStoryStats(token, m.ownerId || ownerId, m.storyId);
        m.views = st.views;
        m.clicks = st.clicks;
      }
      const gate = storiesDue(p.when, campaign.stats?.storyDay);
      if (!gate.due) {
        return {
          ok: true,
          skip: true,
          quiet: true,
          message: gate.note || 'Ждём расписание сторис',
          meta: metrics.length ? { storyMetrics: metrics } : undefined,
        };
      }
      const recurring = /каждый день|пн\/ср\/пт|расписан/i.test(String(p.when || ''));
      const captions = parseStoryCaptions(p.caption || p.text || 'Сторис');
      const storyIdx = Number(campaign.stats?.storyIdx || 0);
      let caption = captions[storyIdx % captions.length] || 'Сторис';
      const queueLeft = Math.max(0, captions.length - ((storyIdx % captions.length) + 1));
      const pollLines = String(p.poll || '').split('\n').map((s) => s.trim()).filter(Boolean);
      const poll = pollLines.length >= 2
        ? { question: pollLines[0], answers: pollLines.slice(1, 4) }
        : null;
      if (!poll && pollLines.length >= 2) {
        caption += `\n\n📊 ${pollLines[0]}: ${pollLines.slice(1, 4).join(' · ')}`;
      }
      let imageUrl = String(p.imageUrl || '').trim();
      if (!imageUrl) {
        try {
          const ai = readAiConfig(db.settings);
          const img = await generateAiImage({
            prompt: `Vertical VK story 9:16, clean SMM layout, topic: ${caption.slice(0, 120)}`,
            ratio: '9:16',
          }, ai);
          imageUrl = saveGeneratedImage(img);
        } catch {
          /* wall fallback inside vkPublishStory */
        }
      }
      const r = await vkPublishStory(token, {
        ownerId,
        caption,
        link: p.link,
        imageUrl: imageUrl || undefined,
        poll,
      });
      if (r.ok && r.storyId) {
        metrics.unshift({
          storyId: r.storyId,
          ownerId,
          caption: caption.slice(0, 100),
          views: 0,
          clicks: 0,
          via: r.via,
          at: new Date().toISOString(),
        });
      }
      const viewsSum = metrics.reduce((a, m) => a + (m.views || 0), 0);
      const nextStoryIdx = r.ok ? storyIdx + 1 : storyIdx;
      const nextAccountIdx = r.ok ? accountIdx + 1 : accountIdx;
      return {
        ok: r.ok,
        done: !recurring && queueLeft <= 0,
        message: r.ok
          ? `${r.message || 'Сторис опубликован'} · просмотров ${viewsSum}${recurring ? ' · следующий по расписанию' : ''}${queueLeft ? ` · в очереди ${queueLeft}` : ''}`
          : r.message,
        meta: r.ok
          ? {
            storyDay: gate.dayKey,
            imageUrl: imageUrl || undefined,
            via: r.via,
            storyMetrics: metrics.slice(0, 30),
            storyIdx: nextStoryIdx,
            storyAccountIdx: nextAccountIdx,
            storyQueueLeft: queueLeft,
          }
          : (metrics.length ? { storyMetrics: metrics, storyIdx, storyAccountIdx: accountIdx } : undefined),
      };
    }

    if (slug === 'ai-lead-vk') {
      const msgToken = accountMessagesToken(account);
      if (!msgToken) {
        return { ok: false, done: true, message: 'Нужен токен сообщений VK для диалогов AI Лид-менеджера' };
      }
      if (p.autoAccept !== 'Нет') {
        const accepted = await vkAcceptIncomingFriends(token, 2);
        if (accepted > 0) {
          return {
            ok: true,
            skip: true,
            quiet: true,
            message: `Принято заявок в друзья: ${accepted}`,
          };
        }
      }
      const ai = readAiConfig(db.settings);
      const offer = String(p.offer || '').trim();
      const threshold = parseScoreThreshold(p.score);
      const dialogs = getAiDialogs(campaign.stats);
      const dialogStep = await runAiLeadDialogStep({
        msgToken,
        dialogs,
        payload: p,
        ai,
        offer,
        threshold,
        userId: campaign.userId,
        mutateFn: (dialog, replyText, score, scoreReason) => {
          mutate((d) => syncCrmLead(d, campaign.userId, dialog, replyText, score, scoreReason, threshold));
        },
      });
      if (dialogStep.handled) return dialogStep.result;

      if (!stepDue(campaign.stats?.updatedAt, p.delay)) {
        return { ok: true, skip: true, quiet: true, message: `Пауза между шагами (${p.delay})` };
      }
      const aud = await resolveAudience({
        token,
        choice: p.source || p.list || 'Друзья',
        payload: p,
        lists: db.lists.filter((l) => l.userId === campaign.userId),
        count: 200,
      });
      if (aud.error) return { ok: false, done: true, message: aud.error };
      const { dayKey, index } = audienceProgress(campaign.stats);
      const u = aud.people[index];
      if (!u) {
        return {
          ok: true,
          skip: true,
          quiet: true,
          message: `Аудитория исчерпана · ${aud.label}`,
          meta: { audienceDay: dayKey, aiDialogs: trimAiDialogs(dialogs) },
        };
      }
      const sourceHint = String(p.groups || p.source || p.list || '').split('\n')[0].slice(0, 120);
      const notes = [];
      let text = firstLine(p, ['offer', 'templates', 'text', 'template']) || `Привет, ${u.firstName}!`;
      let score = 7;
      let scoreReason = '';
      const useAi = p.useAi !== false;
      if (useAi) {
        try {
          text = await generateLeadOpener({ person: u, offer, style: p.style, sourceHint }, ai);
        } catch (err) {
          notes.push(`opener AI: ${err instanceof Error ? err.message : err}`);
        }
      } else {
        const tpl = firstLine(p, ['template', 'text', 'offer']) || text;
        text = applyLeadTemplate(tpl, u);
      }
      try {
        const graded = await scoreLead({ person: u, offer, sourceHint }, ai);
        score = graded.score;
        scoreReason = graded.reason;
      } catch (err) {
        notes.push(`scoring AI: ${err instanceof Error ? err.message : err}`);
      }
      const rFriend = await vkAddFriend(token, u.id, text.slice(0, 120));
      const r = rFriend.ok ? await vkSendMessage(msgToken, u.id, text) : rFriend;
      const crmOn = p.createCrmLead !== false;
      const goesToCrm = crmOn && score >= threshold;
      if (goesToCrm) {
        mutate((d) => {
          syncCrmLead(d, campaign.userId, {
            vkId: u.id,
            name: `${u.firstName} ${u.lastName}`.trim(),
            score,
            scoreReason,
          }, text, score, scoreReason, threshold);
        });
      }
      if (r.ok) {
        dialogs[String(u.id)] = {
          vkId: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          lastSeenMessageId: 0,
          lastOutboundAt: Date.now(),
          turns: 1,
          score,
          scoreReason,
          opener: text.slice(0, 200),
        };
      }
      await sleep(pause);
      const scoreTag = ` · скоринг ${score}/10${goesToCrm ? '' : ', ниже порога — не в CRM'}`;
      return {
        ok: r.ok,
        message: r.ok ? `Касание ${u.firstName} (${aud.label})${scoreTag}` : vkGrowthErrorHint(r.message),
        adminMessage: [scoreReason, ...notes].filter(Boolean).join(' · ') || undefined,
        meta: r.ok ? { audienceDay: dayKey, aiDialogs: trimAiDialogs(dialogs) } : undefined,
      };
    }

    if (slug === 'lead-vk') {
      if (!stepDue(campaign.stats?.updatedAt, p.delay)) {
        return { ok: true, skip: true, quiet: true, message: `Пауза между шагами (${p.delay})` };
      }
      const aud = await resolveAudience({
        token,
        choice: p.source || p.list || 'Друзья',
        payload: p,
        lists: db.lists.filter((l) => l.userId === campaign.userId),
        count: 200,
      });
      if (aud.error) return { ok: false, done: true, message: aud.error };
      const { dayKey, index } = audienceProgress(campaign.stats);
      const u = aud.people[index];
      if (!u) {
        return {
          ok: true,
          skip: true,
          quiet: true,
          message: `Аудитория исчерпана · ${aud.label}`,
          meta: { audienceDay: dayKey },
        };
      }
      const text = pickLeadTemplate(p, u, index);
      const msgToken = accountMessagesToken(account);
      const channel = p.channel || 'message';
      let r;
      if (channel === 'friend') {
        r = await vkAddFriend(token, u.id, text.slice(0, 120));
        if (r.ok) r = await vkSendMessage(msgToken, u.id, text);
      } else {
        r = await vkSendMessage(msgToken, u.id, text);
      }
      mutate((d) => {
        d.leads.unshift({
          id: 'c' + Date.now(),
          userId: campaign.userId,
          name: `${u.firstName} ${u.lastName}`.trim(),
          source: 'Лид-менеджер',
          score: 5,
          stage: 'new',
          city: u.cityTitle || '—',
          note: text.slice(0, 120),
          vkId: u.id,
        });
      });
      await sleep(pause);
      return {
        ok: r.ok,
        message: r.ok ? `Касание ${u.firstName} (${aud.label})` : vkGrowthErrorHint(r.message),
        meta: r.ok ? { audienceDay: dayKey } : undefined,
      };
    }

    if (slug === 'chat-manager-vk') {
      const msgToken = accountMessagesToken(account);
      const result = await runChatManagerStep(msgToken, p, campaign.stats || {});
      if (result.meta?.repliedPeers) {
        result.meta.repliedPeers = result.meta.repliedPeers;
      }
      return result;
    }

    if (slug === 'group-manager-vk') {
      const groups = await vkListManagedGroups(token);
      const raw = String(p.groups || p.group || '').trim();
      const wantedIds = raw ? (await resolveOwners(token, raw)).map((id) => Math.abs(Number(id))) : [];
      const pool = wantedIds.length
        ? groups.filter((x) => wantedIds.includes(x.id))
        : groups;
      if (!pool.length) return { ok: false, message: 'Нет управляемых групп' };
      let approved = 0;
      let pending = 0;
      let banned = 0;
      let editorsSet = 0;
      const names = [];
      const listMode = p.autoJoin === 'По списку';
      const whitelist = listMode
        ? findUserList(db, campaign.userId, p.list || p.whitelist)
        : null;
      const allowed = listMode
        ? new Set((whitelist?.items || []).map((i) => Number(i.id || i.vkId)).filter(Boolean))
        : null;

      const accessMap = { 'Открытая': 0, 'Закрытая': 1, 'Приватная': 2 };
      const accessVal = accessMap[p.groupAccess || p.access];
      if (accessVal != null && !campaign.stats?.accessSet) {
        for (const g of pool.slice(0, 3)) {
          const r = await vkSetGroupAccess(token, g.id, accessVal);
          if (r.ok) names.push(g.name);
          await sleep(pause);
        }
        return {
          ok: true,
          message: `Статус «${p.groupAccess}» для ${names.slice(0, 3).join(', ') || pool.length + ' групп'}`,
          meta: { accessSet: true },
        };
      }

      const blacklist = findUserList(db, campaign.userId, p.blacklist || p.blacklistList);
      if (blacklist?.items?.length) {
        const g = pool[campaign.stats?.banCursor % pool.length || 0];
        const items = blacklist.items.slice(0, 3);
        for (const row of items) {
          const uid = Number(row.id || row.vkId);
          if (!uid || !g) continue;
          const r = await vkBanGroupMember(token, g.id, uid);
          if (r.ok) banned += 1;
          await sleep(pause);
        }
        if (banned) {
          return {
            ok: true,
            message: `Чёрный список «${blacklist.name}»: заблокировано ${banned} в «${g.name}»`,
            meta: { banCursor: ((campaign.stats?.banCursor || 0) + 1) % pool.length },
          };
        }
      }

      const editorLines = String(p.editors || '').split('\n').map(parseEditorLine).filter(Boolean);
      const editorIdx = Number(campaign.stats?.editorIdx || 0);
      if (editorLines.length && pool[0]) {
        const ed = editorLines[editorIdx % editorLines.length];
        const r = await vkEditGroupManager(token, pool[0].id, ed.userId, ed.role);
        if (r.ok) editorsSet = 1;
        return {
          ok: r.ok,
          message: r.ok
            ? `Редактор id${ed.userId} (${ed.role}) в «${pool[0].name}»`
            : vkGrowthErrorHint(r.message),
          meta: { editorIdx: editorIdx + 1 },
        };
      }

      for (const g of pool.slice(0, 5)) {
        const reqs = await vkGetGroupJoinRequests(token, g.id);
        pending += reqs.length;
        names.push(g.name);
        if (p.autoJoin === 'Авто-одобрение' && reqs.length) {
          for (const req of reqs.slice(0, 2)) {
            const r = await vkApproveJoinRequest(token, g.id, req.id);
            if (r?.ok !== false) approved += 1;
            await sleep(pause);
          }
        } else if (listMode && reqs.length && allowed?.size) {
          for (const req of reqs.slice(0, 5)) {
            if (!allowed.has(Number(req.id))) continue;
            const r = await vkApproveJoinRequest(token, g.id, req.id);
            if (r?.ok !== false) approved += 1;
            await sleep(pause);
          }
        }
      }
      if (p.autoJoin === 'Авто-одобрение' && approved) {
        return {
          ok: true,
          message: `Одобрено ${approved} заявок в ${pool.length} ${pool.length === 1 ? 'группе' : 'группах'} · ${names.slice(0, 2).join(', ')}`,
        };
      }
      if (listMode && approved) {
        return {
          ok: true,
          message: `По списку «${whitelist?.name || p.list}» одобрено ${approved} · ${names.slice(0, 2).join(', ')}`,
        };
      }
      if (listMode && !whitelist) {
        return {
          ok: true,
          skip: true,
          quiet: true,
          message: `Укажите список в поле «Белый список» · заявок ${pending}`,
        };
      }
      return {
        ok: true,
        skip: true,
        quiet: true,
        message: `Заявок: ${pending} · ${pool.length} ${pool.length === 1 ? 'группа' : 'групп'} (${names.slice(0, 3).join(', ')})`,
      };
    }

    return { ok: false, message: `Нет исполнителя для ${slug}` };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const retryable = !!(err && err.retryable);
    return {
      ok: false,
      skip: retryable,
      retryable,
      message: retryable ? 'VK временно недоступен — повторим шаг' : 'Не удалось выполнить шаг',
      adminMessage: vkGrowthErrorHint(raw, err?.code) || raw,
    };
  }
}

export function applyCampaignResult(campaignId, result) {
  mutate((d) => {
    const cam = d.campaigns.find((x) => x.id === campaignId);
    if (!cam) return;
    cam.stats = cam.stats || { ok: 0, fail: 0 };
    const nowIso = new Date().toISOString();
    const adminMsg = String(result.adminMessage || result.message || '').trim();
    const userMsg = String(
      result.userMessage
      || cabinetTaskMessage(result.message, { ok: result.ok, skip: result.skip }),
    ).trim();
    if (result.meta?.likedKey) {
      cam.stats.likedKeys = [...(cam.stats.likedKeys || []), result.meta.likedKey].slice(-500);
    }
    if (result.meta?.congrats?.id != null) {
      const entry = {
        id: Number(result.meta.congrats.id),
        name: String(result.meta.congrats.name || ''),
        via: result.meta.congrats.via || '',
        ok: !!result.meta.congrats.ok,
        at: result.meta.congrats.at || nowIso,
      };
      const list = [...(cam.stats.congrats || [])].filter((x) => Number(x.id) !== entry.id);
      list.unshift(entry);
      cam.stats.congrats = list.slice(0, 200);
    }
    if (result.meta?.audienceDay) {
      if (cam.stats.audienceDay !== result.meta.audienceDay) {
        cam.stats.ok = 0;
        cam.stats.inviteIndex = 0;
      }
      cam.stats.audienceDay = result.meta.audienceDay;
    }
    if (result.meta?.inviteIndex != null) cam.stats.inviteIndex = result.meta.inviteIndex;
    if (result.meta?.storyDay) cam.stats.storyDay = result.meta.storyDay;
    if (result.meta?.grabbedKeys) cam.stats.grabbedKeys = result.meta.grabbedKeys;
    if (result.meta?.neuroDay) {
      cam.stats.neuroDay = result.meta.neuroDay;
      cam.stats.neuroToday = result.meta.neuroToday;
    }
    if (result.meta?.banCursor != null) cam.stats.banCursor = result.meta.banCursor;
    if (result.meta?.editorIdx != null) cam.stats.editorIdx = result.meta.editorIdx;
    if (result.meta?.accessSet) cam.stats.accessSet = true;
    if (result.skip) {
      if (!result.quiet) {
        cam.stats.lastMessage = userMsg;
        if (adminMsg && (adminMsg !== userMsg || isAdminDiagnosticMessage(adminMsg))) {
          cam.stats.lastAdminMessage = adminMsg;
        }
        cam.stats.updatedAt = nowIso;
      }
      if (result.done) cam.status = 'done';
      return;
    }
    if (result.ok) cam.stats.ok += 1;
    else if (!result.retryable) cam.stats.fail += 1;
    cam.stats.lastMessage = userMsg;
    if (adminMsg) cam.stats.lastAdminMessage = adminMsg;
    cam.stats.updatedAt = nowIso;
    if (result.ok && result.meta?.likedItem?.url) {
      cam.stats.likedItems = [{ ...result.meta.likedItem, at: nowIso }, ...(cam.stats.likedItems || [])].slice(0, 80);
    }
    if (result.ok && result.meta?.dayKey) {
      cam.stats.sentToday = cam.stats.sentTodayDate === result.meta.dayKey ? (cam.stats.sentToday || 0) + 1 : 1;
      cam.stats.sentTodayDate = result.meta.dayKey;
      cam.stats.sentHour = cam.stats.hourKey === result.meta.hourKey ? (cam.stats.sentHour || 0) + 1 : 1;
      cam.stats.hourKey = result.meta.hourKey;
      cam.stats.lastLikeAt = nowIso;
    }
    if (result.meta?.imageUrl) {
      cam.stats.images = cam.stats.images || [];
      cam.stats.images.unshift({
        url: result.meta.imageUrl,
        prompt: result.meta.prompt || '',
        at: new Date().toISOString(),
      });
      cam.stats.images = cam.stats.images.slice(0, 24);
    }
    if (result.meta?.aiCreditsLeft != null) cam.stats.aiCreditsLeft = result.meta.aiCreditsLeft;
    if (result.meta?.repliedPeers) {
      cam.stats.repliedPeers = result.meta.repliedPeers;
    }
    if (result.meta?.welcomedKeys) cam.stats.welcomedKeys = result.meta.welcomedKeys;
    if (result.meta?.chatLog) cam.stats.chatLog = result.meta.chatLog;
    if (result.meta?.chats != null) cam.stats.chats = result.meta.chats;
    if (result.meta?.welcomed != null) cam.stats.welcomed = result.meta.welcomed;
    if (result.meta?.replied != null) cam.stats.replied = (cam.stats.replied || 0) + Number(result.meta.replied || 0);
    if (result.meta?.kicked != null) cam.stats.kicked = result.meta.kicked;
    if (result.meta?.moderated != null) cam.stats.moderated = result.meta.moderated;
    if (result.meta?.invitedIds) cam.stats.invitedIds = result.meta.invitedIds;
    if (result.meta?.joinedIds) cam.stats.joinedIds = result.meta.joinedIds;
    if (result.meta?.joinedCount != null) cam.stats.joinedCount = result.meta.joinedCount;
    if (result.meta?.storyIdx != null) cam.stats.storyIdx = result.meta.storyIdx;
    if (result.meta?.storyAccountIdx != null) cam.stats.storyAccountIdx = result.meta.storyAccountIdx;
    if (result.meta?.storyQueueLeft != null) cam.stats.storyQueueLeft = result.meta.storyQueueLeft;
    if (result.meta?.aiDialogs) cam.stats.aiDialogs = result.meta.aiDialogs;
    if (result.meta?.storyMetrics) cam.stats.storyMetrics = result.meta.storyMetrics;
    if (result.done) cam.status = 'done';
    if (!result.ok && cam.stats.fail >= 8) cam.status = 'error';
    d.jobs.unshift({
      id: 'j' + Date.now(),
      campaignId: cam.id,
      slug: cam.slug,
      userId: cam.userId,
      ok: result.ok,
      message: adminMsg || userMsg,
      userMessage: userMsg,
      at: new Date().toISOString(),
    });
    d.jobs = d.jobs.slice(0, 500);
    const logLevel = result.ok ? 'info' : 'warn';
    log(d, {
      level: logLevel,
      slug: cam.slug,
      userId: cam.userId,
      message: `[${cam.slug}] ${adminMsg || userMsg}`,
    });
    if (cam.slug === 'ai-lead-vk') {
      recordAiLeadActionFromResult(cam.userId, result);
    }
  });
}

async function tickSafe(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[worker] ${label}:`, err instanceof Error ? err.message : err);
  }
}

let tickBusy = false;
export async function tick() {
  if (tickBusy) return;
  tickBusy = true;
  try {
    await tickSafe('leadgen', () => tickLeadgen());
    await tickSafe('neurocomments', () => tickNeurocomments());
    await tickSafe('scheduled-posts', () => tickScheduledPosts(load(), {
      tokenOf: (acc) => {
        if (!acc?.tokenEnc) return null;
        return String(acc.tokenEnc).startsWith('mock:') ? acc.tokenEnc : decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
      },
      loadAccounts: (userId) => load().accounts.filter((a) => a.userId === userId),
    }));
    mutate((d) => d);
    await tickSafe('rss', async () => {
      const dbRss = load();
      await pollOnlineRssSources(dbRss, { aiConfig: readAiConfig(dbRss.settings) });
    });
    mutate((d) => d);
    await tickSafe('repost', async () => {
      const dbRepost = load();
      const tokenByUser = {};
      for (const acc of dbRepost.accounts || []) {
        if (acc.status !== 'active' || !acc.tokenEnc) continue;
        try {
          tokenByUser[acc.userId] = String(acc.tokenEnc).startsWith('mock:')
            ? acc.tokenEnc
            : decryptToken(acc.tokenEnc, process.env.TOKEN_ENCRYPTION_KEY);
        } catch { /* skip */ }
      }
      await pollOnlineRepostSources(dbRepost, tokenByUser);
    });
    mutate((d) => d);
    await tickSafe('ai-lead-tools', () => tickAiLeadTools());
    await tickSafe('payments', () => tickPendingPayments());
    await tickSafe('trial-emails', () => tickTrialEndingEmails());
    await tickSafe('backup', () => tickBackup());
    await tickSafe('housekeep', () => tickHousekeep());
    const STALE_MS = 45 * 60 * 1000;
    const nowMs = Date.now();
    mutate((d) => {
      for (const cam of d.campaigns || []) {
        if (cam.status !== 'running') continue;
        const updated =
          Date.parse(cam.stats?.updatedAt || '')
          || Date.parse(cam.created || '')
          || Number(cam.created)
          || 0;
        // Never-ticked (no updatedAt / unparseable created) or idle >45m → auto-stop.
        if (!updated || nowMs - updated > STALE_MS) {
          cam.status = 'error';
          cam.stats = cam.stats || {};
          cam.stats.lastMessage = updated
            ? 'Задача зависла без прогресса и остановлена. Запустите снова.'
            : 'Задача без прогресса (не тикала) и остановлена. Запустите снова.';
          cam.stats.updatedAt = new Date().toISOString();
        }
      }
    });
    const db2 = load();
    const running = db2.campaigns.filter((c) => c.status === 'running');
    for (const c of running.slice(0, 3)) {
      try {
        const result = await runCampaignStep(c);
        applyCampaignResult(c.id, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[worker] campaign ${c.id} (${c.slug}):`, msg);
        applyCampaignResult(c.id, {
          ok: false,
          message: 'Внутренняя ошибка шага. Задача продолжит попытки или остановится по лимиту сбоев.',
          adminMessage: msg.slice(0, 240),
        });
      }
    }
  } finally {
    tickBusy = false;
  }
}

export function startWorker() {
  setInterval(() => {
    tick().catch((err) => console.error('[worker]', err));
  }, 4000);
}

function parseAgeRange(raw) {
  const m = String(raw || '').match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (!m) return {};
  return { ageFrom: Number(m[1]), ageTo: Number(m[2]) };
}

/** Kept fields feed the audience picker later: broom needs lastSeen, congrats bdate. */
function compactPerson(u) {
  return {
    id: u.id,
    firstName: u.firstName || u.first_name || '',
    lastName: u.lastName || u.last_name || '',
    cityTitle: u.cityTitle || u.city || '',
    sex: u.sex,
    photo: u.photo,
    bdate: u.bdate,
    lastSeen: u.lastSeen,
    deactivated: u.deactivated,
    url: `https://vk.com/id${u.id}`,
  };
}

export async function runParser(userId, kind, payload) {
  const db = load();
  const account = db.accounts.find((a) => a.userId === userId && a.id === (payload.accountId || db.accounts.find((x) => x.userId === userId)?.id));
  const acc = account || db.accounts.find((a) => a.userId === userId);
  if (!acc) throw new Error('Сначала подключите VK-аккаунт');
  const token = accountToken(db, acc);
  const count = Math.min(Math.max(Number(payload.count || 100), 10), 1000);
  const sex = Number(payload.sex || 0);
  const activityDays = Number(payload.act || 0);
  // Activity is filtered after the fact, so ask VK for extra rows to compensate.
  const fetchCount = activityDays ? Math.min(count * 2, 1000) : count;

  if (kind === 'groups') {
    const owner = await vkResolveOwnerId(token, payload.src || payload.groups || '');
    if (!owner) throw new Error('Не удалось разобрать ссылку на группу');
    let people = await vkGetGroupMembers(token, owner.id, { count: fetchCount });
    const city = String(payload.city || payload.geo || '').trim().toLowerCase();
    if (sex === 1 || sex === 2) people = people.filter((p) => Number(p.sex) === sex);
    if (city) people = people.filter((p) => String(p.cityTitle || '').toLowerCase().includes(city));
    people = filterByActivity(people, activityDays).slice(0, count);
    const items = people.map(compactPerson);
    const list = {
      id: 'l' + Date.now(), userId,
      name: `Группа ${owner.screenName || owner.name || owner.id}`,
      count: items.length, source: 'Парсинг групп',
      created: new Date().toLocaleDateString('ru-RU'), items,
    };
    mutate((d) => { d.lists.unshift(list); });
    return list;
  }
  if (kind === 'scan') {
    const owner = await vkResolveOwnerId(token, payload.src || '');
    const phrases = String(payload.phrases || payload.int || '').split(',').map((s) => ({ phrase: s.trim() })).filter((p) => p.phrase);
    const scan = await vkScanGroupForPhrases(token, String(Math.abs(owner?.id || 0)), phrases);
    mutate((d) => {
      for (const h of scan.hits.slice(0, 50)) {
        d.leads.unshift({
          id: 'c' + Date.now() + Math.random().toString(16).slice(2),
          userId, name: h.authorName || h.authorId, source: 'Парсинг', score: 6,
          stage: 'new', city: '—', note: h.text?.slice(0, 120), vkId: h.authorId,
        });
      }
    });
    return scan;
  }
  const age = parseAgeRange(payload.age);
  const found = await vkUsersSearch(token, {
    q: [payload.int || payload.q, payload.geo].filter(Boolean).join(' '),
    city: payload.cityId,
    ageFrom: age.ageFrom,
    ageTo: age.ageTo,
    sex: sex || undefined,
    count: fetchCount,
  });
  const people = filterByActivity(found, activityDays).slice(0, count);
  const items = people.map(compactPerson);
  const list = {
    id: 'l' + Date.now(), userId,
    name: payload.geo ? `${payload.geo} · аккаунты` : (payload.int ? `${payload.int} · аккаунты` : 'Парсинг аккаунтов'),
    count: items.length, source: 'Парсинг аккаунтов',
    created: new Date().toLocaleDateString('ru-RU'), items,
  };
  mutate((d) => { d.lists.unshift(list); });
  return list;
}
