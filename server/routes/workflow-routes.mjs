import { load, mutate } from '../db.mjs';
import {
  workflowPublicPayload, patchWorkflowSettings,
} from '../workflow.mjs';
import {
  ensureInboundWebhookToken, rotateInboundWebhookToken, findUserByInboundToken,
  handleInboundWebhook, inboundWebhookUrl,
} from '../webhooks-inbound.mjs';
import { send, sendFail, readBody, requireUser, enforceRate } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;

if (method === 'GET' && path === '/api/workflow') {
    const u = requireUser(req, res); if (!u) return true;
    const db = load();
    const user = db.users.find((x) => x.id === u.id);
    send(res, 200, workflowPublicPayload(db, user));
  return true;
  }

  if (method === 'PATCH' && path === '/api/workflow/settings') {
    const u = requireUser(req, res); if (!u) return true;
    const body = await readBody(req);
    mutate((db) => {
      const x = db.users.find((i) => i.id === u.id);
      x.cabinet = patchWorkflowSettings(x.cabinet, body);
      return x.cabinet;
    });
    const db = load();
    const user = db.users.find((x) => x.id === u.id);
    send(res, 200, workflowPublicPayload(db, user));
  return true;
  }

  if (method === 'GET' && path === '/api/webhooks/inbound/token') {
    const u = requireUser(req, res); if (!u) return true;
    const tok = mutate((db) => ensureInboundWebhookToken(db, u.id));
    send(res, 200, { token: tok, url: inboundWebhookUrl(tok) });
  return true;
  }

  if (method === 'POST' && path === '/api/webhooks/inbound/token/rotate') {
    const u = requireUser(req, res); if (!u) return true;
    const tok = mutate((db) => rotateInboundWebhookToken(db, u.id));
    send(res, 200, { token: tok, url: inboundWebhookUrl(tok) });
  return true;
  }

  if (method === 'POST' && path.startsWith('/api/webhooks/inbound/')) {
    if (!enforceRate(req, res, 'webhook')) return true;
    const inboundToken = decodeURIComponent(path.slice('/api/webhooks/inbound/'.length));
    const user = findUserByInboundToken(load(), inboundToken);
    if (!user) { send(res, 401, { error: 'Invalid token' }); return true; }
    const body = await readBody(req);
    try {
      const result = mutate((db) => {
        const u = findUserByInboundToken(db, inboundToken);
        if (!u) {
          const err = new Error('Invalid token');
          err.status = 401;
          throw err;
        }
        return handleInboundWebhook(db, u.id, body);
      });
      send(res, 200, result);
    return true;
    } catch (err) {
      sendFail(res, err);
    }
  }

  return false;
}
