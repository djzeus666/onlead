/** Growth-family campaign step handlers: masslike, congrats, invite, broom. */
import {
  vkGrowthErrorHint, vkIsBirthdayToday, vkSendMessage, vkPostOnWall, vkInviteToGroup,
  vkIsGroupMember, vkDeleteFriend, vkBanUser, vkRemoveGroupMember, renderCongratsTemplate,
} from './vk/growth.mjs';
import { audienceKind, resolveAudience, audienceProgress, inviteAudiencePayload } from './vk/audience.mjs';
import { BROOM_RULE_LABELS, broomCandidates, broomRuleKind } from './vk/broom.mjs';
import { withinSendHour } from './schedule.mjs';
import { vkResolveOwnerId } from './vk/neurocomment.mjs';
import { runMasslikeStep } from './vk/masslike.mjs';
import { sleep } from './vk/call.mjs';
import {
  accountMessagesToken,
  parseInviteBlacklist,
} from './jobs-shared.mjs';

export async function runGrowthFamilyStep(ctx) {
  const { campaign, db, p, slug, pause, account, token } = ctx;

  if (slug === 'massliking-vk') {
    const lists = db.lists.filter((l) => l.userId === campaign.userId);
    return runMasslikeStep({
      payload: p,
      stats: campaign.stats || {},
      lists,
      token,
      pauseMs: pause,
    });
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

  return { ok: false, message: `Нет исполнителя для ${slug}` };
}
