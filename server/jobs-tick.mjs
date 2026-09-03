/** Worker tick loop. */
import { decryptToken } from './crypto.mjs';
import { load, mutate } from './db.mjs';
import { readAiConfig } from './ai.mjs';
import { tickLeadgen } from './leadgen.mjs';
import { tickNeurocomments } from './neurocomments.mjs';
import { tickScheduledPosts } from './posts.mjs';
import { pollOnlineRssSources } from './rss.mjs';
import { pollOnlineRepostSources } from './repost.mjs';
import { tickAiLeadTools } from './ai-lead-tool.mjs';
import { tickPendingPayments } from './billing.mjs';
import { tickTrialEndingEmails } from './notify.mjs';
import { tickBackup } from './backup.mjs';
import { tickHousekeep } from './housekeep.mjs';
import { runCampaignStep, applyCampaignResult } from './jobs-campaign.mjs';

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
