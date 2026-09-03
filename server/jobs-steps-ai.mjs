/** AI-family campaign step handlers: image-ai, neurocomment, lead tools, chat-manager. */
import { mutate } from './db.mjs';
import { vkGrowthErrorHint, vkSendMessage, vkAddFriend, vkAcceptIncomingFriends } from './vk/growth.mjs';
import { aiCreditsBalance, spendAiCredits, IMAGE_AI_CREDIT_COST } from './ai-credits.mjs';
import { audienceProgress, resolveAudience } from './vk/audience.mjs';
import { stepDue } from './schedule.mjs';
import { vkDiscoverFriendsPosts, vkDiscoverWallPosts, vkCreateNeuroComment } from './vk/neurocomment.mjs';
import { sleep } from './vk/call.mjs';
import {
  generateAiImage, saveGeneratedImage, readAiConfig, generateNeuroCommentText,
  generateLeadOpener, scoreLead,
} from './ai.mjs';
import { parseScoreThreshold } from './ai-prompts.mjs';
import { runChatManagerStep } from './vk/chat-manager.mjs';
import {
  getAiDialogs, runAiLeadDialogStep, syncCrmLead, trimAiDialogs,
} from './vk/ai-lead.mjs';
import { pickLeadTemplate, applyLeadTemplate } from './lead-templates.mjs';
import {
  accountMessagesToken,
  firstLine,
  resolveOwners,
} from './jobs-shared.mjs';

export async function runAiFamilyStep(ctx) {
  const { campaign, db, user, p, slug, pause, done, account, token } = ctx;

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

  return { ok: false, message: `Нет исполнителя для ${slug}` };
}
