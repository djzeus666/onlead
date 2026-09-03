/** Group-manager campaign step handler. */
import {
  vkGrowthErrorHint, vkListManagedGroups, vkGetGroupJoinRequests, vkApproveJoinRequest,
  vkBanGroupMember, vkSetGroupAccess, vkEditGroupManager, parseEditorLine,
} from './vk/growth.mjs';
import { sleep } from './vk/call.mjs';
import { findUserList, resolveOwners } from './jobs-shared.mjs';

export async function runGroupFamilyStep(ctx) {
  const { campaign, db, p, slug, pause, token } = ctx;

  if (slug !== 'group-manager-vk') {
    return { ok: false, message: `Нет исполнителя для ${slug}` };
  }

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
