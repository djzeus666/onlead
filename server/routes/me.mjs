import { load, mutate } from '../db.mjs';
import { send, readBody, requireUser } from '../http-api.mjs';
import { snapshot } from '../snapshot.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;

  if (method === 'GET' && path === '/api/me') {
    const u = requireUser(req, res);
    if (!u) return true;
    send(res, 200, snapshot(u));
    return true;
  }

  if (method === 'PATCH' && path === '/api/me') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    mutate((db) => {
      const x = db.users.find((i) => i.id === u.actorId);
      if (body.name) x.name = String(body.name);
      if (body.email) x.email = String(body.email).toLowerCase();
    });
    const actor = load().users.find((i) => i.id === u.actorId);
    send(res, 200, snapshot({ ...actor, actorId: actor.id, workspaceId: u.workspaceId }));
    return true;
  }

  if (method === 'GET' && path === '/api/me/logs') {
    const u = requireUser(req, res);
    if (!u) return true;
    const rows = load().logs
      .filter((l) => l.userId === u.id)
      .slice(0, 80)
      .map((l) => ({ at: l.at, level: l.level, message: l.message }));
    send(res, 200, rows);
    return true;
  }

  return false;
}
