/** Campaign step execution and result application. */
import { load, mutate, toolOn } from './db.mjs';
import { cabinetTaskMessage, isAdminDiagnosticMessage } from './user-error.mjs';
import { vkGrowthErrorHint } from './vk/growth.mjs';
import { recordAiLeadActionFromResult } from './ai-lead-tool.mjs';
import {
  log,
  accountToken,
} from './jobs-shared.mjs';
import { runAiFamilyStep } from './jobs-steps-ai.mjs';
import { runGrowthFamilyStep } from './jobs-steps-growth.mjs';
import { runContentFamilyStep } from './jobs-steps-content.mjs';
import { runGroupFamilyStep } from './jobs-steps-group.mjs';

const AI_SLUGS = new Set(['image-ai', 'neurocomment-vk', 'ai-lead-vk', 'lead-vk', 'chat-manager-vk']);
const GROWTH_SLUGS = new Set(['massliking-vk', 'congratulation-vk', 'invite-vk', 'broom-vk']);
const CONTENT_SLUGS = new Set(['grabber-vk', 'autoposting-vk', 'autostoris-vk']);
const GROUP_SLUGS = new Set(['group-manager-vk']);

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

  // image-ai does not need a VK account/token — keep that early path.
  if (slug === 'image-ai') {
    return runAiFamilyStep({ campaign, db, user, p, slug, pause, limit, done });
  }

  const account = db.accounts.find((a) => a.id === campaign.accountId && a.userId === campaign.userId);
  if (!account) return { ok: false, message: 'Нет аккаунта VK' };
  const token = accountToken(db, account);
  if (!token) return { ok: false, message: 'Нет токена VK' };

  const ctx = { campaign, db, user, p, slug, pause, limit, done, account, token };

  try {
    if (AI_SLUGS.has(slug)) return await runAiFamilyStep(ctx);
    if (GROWTH_SLUGS.has(slug)) return await runGrowthFamilyStep(ctx);
    if (CONTENT_SLUGS.has(slug)) return await runContentFamilyStep(ctx);
    if (GROUP_SLUGS.has(slug)) return await runGroupFamilyStep(ctx);
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
      // Quiet waits (hour window / no birthdays / pause) must still heartbeat
      // updatedAt — otherwise the 45m stale watchdog kills scheduled tools.
      cam.stats.updatedAt = nowIso;
      if (userMsg) cam.stats.lastMessage = userMsg;
      if (!result.quiet) {
        if (adminMsg && (adminMsg !== userMsg || isAdminDiagnosticMessage(adminMsg))) {
          cam.stats.lastAdminMessage = adminMsg;
        }
      }
      if (result.done) cam.status = 'done';
      return;
    }
    if (result.ok) {
      cam.stats.ok += 1;
      cam.stats.failStreak = 0;
    } else if (!result.retryable) {
      cam.stats.fail += 1;
      cam.stats.failStreak = Number(cam.stats.failStreak || 0) + 1;
    }
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
    // Stop only on a consecutive streak — scattered VK flukes after dozens of
    // successes (e.g. masslike 80 ok / 8 err) must not kill a healthy run.
    if (!result.ok && Number(cam.stats.failStreak || 0) >= 8) cam.status = 'error';
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
