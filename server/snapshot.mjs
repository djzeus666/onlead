import { load, publicUser } from './db.mjs';
import { aiCreditsBalance } from './ai-credits.mjs';
import { allowMocks, isTelegramLive } from './hardening.mjs';
import { isLivePayments } from './billing.mjs';
import { getLeadgenConfig, publicLeadgen } from './leadgen.mjs';
import {
  getNeuroConfig, publicNeuro, neuroStats, listNeuroTasks,
} from './neurocomments.mjs';
import {
  getAiLeadConfig, publicAiLead, aiLeadStats, listAiLeadActions,
} from './ai-lead-tool.mjs';
import { normalizeLead } from './crm.mjs';
import { listHostedLeadBots, publicHostedLeadBot } from './lead-bots.mjs';
import { activitySeries, activityTotals } from './stats.mjs';
import { listPosts, listPubLogs, publicPost, contentPostCounts } from './posts.mjs';
import { listRssSources, rssSourceItemCounts } from './rss.mjs';
import { listRepostSources, repostSourceItemCounts } from './repost.mjs';
import { publicCabinet } from './cabinet.mjs';
import {
  botToken, liveTgPlan, tgSlotUsage, trialLeft, publicAccount, publicCampaign, publicPromo,
} from './api-helpers.mjs';

export function snapshot(scope) {
  const db = load();
  const dataId = scope.workspaceId || scope.id;
  const actor = db.users.find((u) => u.id === (scope.actorId || scope.id)) || scope;
  const billingUser = db.users.find((u) => u.id === dataId) || actor;
  const accounts = db.accounts.filter((a) => a.userId === dataId).map(publicAccount);
  const autopostList = db.lists.find((l) => l.userId === dataId && l.source === 'Очередь автопостинга');
  return {
    user: {
      ...publicUser(actor),
      trialLeft: trialLeft(billingUser),
      aiCredits: aiCreditsBalance(billingUser),
      teamRole: actor.teamOwnerId ? (actor.teamRole || 'member') : 'owner',
      workspaceId: dataId,
    },
    accounts,
    activeAccount: accounts[0]?.id || null,
    campaigns: db.campaigns.filter((c) => c.userId === dataId).map(publicCampaign),
    leads: db.leads.filter((l) => !l.userId || l.userId === dataId).map(normalizeLead),
    lists: db.lists.filter((l) => !l.userId || l.userId === dataId).map((l) => ({ ...l, items: undefined, count: l.count || l.items?.length || 0 })),
    autopostQueue: (autopostList?.items || [])
      .filter((it) => it.status === 'queued')
      .slice(0, 12)
      .map((it) => ({
        id: it.id,
        text: String(it.text || '').slice(0, 200),
        photoCount: (it.attachments || []).length,
      })),
    landings: db.landings.filter((l) => l.userId === dataId),
    bots: db.bots.filter((b) => !b.userId || b.userId === dataId).map((b) => ({
      ...b, tokenEnc: undefined, webhookSecret: undefined,
      tokenBroken: !botToken(b),
    })),
    tgChannels: (db.tgChannels || []).filter((c) => !c.userId || c.userId === dataId),
    tgChannelAccess: (db.tgChannelAccess || [])
      .filter((a) => a.userId === dataId)
      .slice(0, 80)
      .map((a) => ({
        id: a.id,
        chatId: a.chatId,
        tgUserId: a.tgUserId,
        tgUsername: a.tgUsername || '',
        tariffDays: a.tariffDays || 0,
        until: a.until,
        invitedAt: a.invitedAt,
        status: a.status,
        kickedAt: a.kickedAt,
        note: a.note || '',
      })),
    tgFunnels: (db.tgFunnels || []).filter((f) => !f.userId || f.userId === dataId),
    tgReceipts: (db.tgReceipts || [])
      .filter((r) => r.userId === dataId)
      .slice(0, 40)
      .map((r) => ({
        id: r.id,
        status: r.status,
        funnelName: r.funnelName || '',
        tgName: r.tgName || '',
        tgUsername: r.tgUsername || '',
        product: r.product || '',
        price: r.price || '',
        fileId: r.fileId || '',
        createdAt: r.createdAt,
        confirmedAt: r.confirmedAt,
      })),
    tgPlan: liveTgPlan(billingUser),
    tgSlots: tgSlotUsage(db, dataId),
    ops: db.ops.filter((o) => !o.userId || o.userId === dataId),
    pendingPayments: (db.payments || [])
      .filter((p) => p.userId === dataId && p.status === 'pending' && p.provider !== 'balance')
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        kind: p.kind,
        amount: p.amount,
        title: p.title,
        packageId: p.packageId || '',
        slug: p.slug || '',
        tgPlan: p.tgPlan || '',
        months: p.months || 1,
        createdAt: p.createdAt,
      })),
    leadgen: publicLeadgen(getLeadgenConfig(dataId), dataId),
    leadgenMatches: (db.leadgenMatches || []).filter((m) => m.userId === dataId).slice(0, 200),
    neurocomments: publicNeuro(getNeuroConfig(dataId), dataId),
    neurocommentTasks: listNeuroTasks(dataId).slice(0, 80),
    neurocommentStats: neuroStats(dataId),
    aiLead: publicAiLead(getAiLeadConfig(dataId), dataId),
    aiLeadStats: aiLeadStats(dataId),
    aiLeadActions: listAiLeadActions(dataId),
    contentPosts: listPosts(db, dataId).slice(0, 120).map(publicPost),
    contentCounts: contentPostCounts(db, dataId),
    pubLogs: listPubLogs(db, dataId, 40),
    rssSources: (() => {
      const counts = rssSourceItemCounts(db, dataId);
      return listRssSources(db, dataId).map((s) => ({ ...s, itemCount: counts[s.id] || 0 }));
    })(),
    repostSources: (() => {
      const counts = repostSourceItemCounts(db, dataId);
      return listRepostSources(db, dataId).map((s) => ({ ...s, itemCount: counts[s.id] || 0 }));
    })(),
    cabinet: publicCabinet(billingUser),
    hostedLeadBots: listHostedLeadBots(dataId).map(publicHostedLeadBot),
    activity: activitySeries(db, dataId, 30),
    stats: (() => {
      const act = activityTotals(activitySeries(db, dataId, 30));
      return { leads: act.leads, messages: act.messages, likes: act.likes, posts: act.posts, bots: act.bots, actions: act.actions };
    })(),
    settings: {
      trialHours: db.settings.trialHours,
      toolsEnabled: db.settings.toolsEnabled,
      paymentsLive: isLivePayments(),
      mocksAllowed: allowMocks(),
      telegramLive: isTelegramLive(),
      vkMessagesUiEnabled: db.settings.vkMessagesUiEnabled === true,
    },
    promo: publicPromo(db.settings),
    balance: billingUser.balance || 0,
    refBalance: billingUser.refBalance || 0,
    referral: billingUser.referral || { invited: 0, paying: 0, earned: 0, code: '—' },
  };
}

export { publicAccount, publicCampaign, botToken, liveTgPlan, tgSlotUsage, publicPromo, trialLeft };
