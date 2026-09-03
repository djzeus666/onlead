import { load, mutate } from '../db.mjs';
import { createCheckout, confirmUserPending, transferRefBalance, handleYookassaWebhook } from '../billing.mjs';
import { clientIp } from '../hardening.mjs';
import { yookassaIpAllowed } from '../ip-allow.mjs';
import { snapshot } from '../snapshot.mjs';
import { send, sendFail, readBody, requireUser, publicOrigin } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;

  if (method === 'POST' && path === '/api/billing/topup') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    try {
      const owner = load().users.find((i) => i.id === u.id);
      const result = await createCheckout(owner, { kind: 'topup', amount: body.amount || 1000 }, publicOrigin(req));
      send(res, 200, { ...result, ...(result.applied ? snapshot(u) : {}) });
    return true;
    } catch (err) {
      console.error('[billing] topup', err.message);
      sendFail(res, err);
    return true;
    }
    return true;
  }

  if (method === 'POST' && (path === '/api/billing/buy' || path === '/api/billing/checkout')) {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    try {
      const owner = load().users.find((i) => i.id === u.id);
      const result = await createCheckout(owner, body, publicOrigin(req));
      send(res, 200, { ...result, ...(result.applied ? snapshot(u) : {}) });
    return true;
    } catch (err) {
      console.error('[billing] checkout', err.message);
      sendFail(res, err);
    return true;
    }
    return true;
  }

  if (method === 'POST' && path === '/api/billing/confirm') {
    const u = requireUser(req, res);
    if (!u) return true;
    try {
      const result = await confirmUserPending(u.id);
      send(res, 200, { ...result, ...snapshot(u) });
    return true;
    } catch (err) {
      console.error('[billing] confirm', err.message);
      sendFail(res, err);
    return true;
    }
    return true;
  }

  if (method === 'POST' && path === '/api/billing/transfer-ref') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    try {
      const result = mutate((d) => transferRefBalance(d, u.id, body.amount));
      send(res, 200, { ...result, ...snapshot(u) });
    return true;
    } catch (err) {
      console.error('[billing] transfer-ref', err.message);
      sendFail(res, err);
    return true;
    }
    return true;
  }


if (method === 'POST' && path === '/api/billing/webhook/yookassa') {
    if (!yookassaIpAllowed(clientIp(req))) {
      console.warn('[yookassa] webhook ip rejected', clientIp(req));
      send(res, 401, { error: 'forbidden' });
    return true;
    }
    try {
      const result = await handleYookassaWebhook(await readBody(req));
      send(res, 200, result);
    return true;
    } catch (err) {
      sendFail(res, err, 'webhook');
    }
  }

  return false;
}
