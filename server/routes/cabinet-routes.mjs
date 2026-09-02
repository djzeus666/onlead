import { load, mutate } from '../db.mjs';
import {
  analyticsReport, publicCabinet, patchCabinet, teamPayload,
  inviteTeamMember, patchTeamMember, removeTeamMember,
} from '../cabinet.mjs';
import { send, readBody, requireUser, publicOrigin } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path, url } = ctx;

  if (method === 'GET' && path === '/api/analytics') {
    const u = requireUser(req, res);
    if (!u) return true;
    const days = Number(url.searchParams.get('days') || 30);
    send(res, 200, analyticsReport(load(), u.id, days));
    return true;
  }

  if (method === 'GET' && path === '/api/cabinet/settings') {
    const u = requireUser(req, res);
    if (!u) return true;
    const user = load().users.find((x) => x.id === u.id);
    send(res, 200, { cabinet: publicCabinet(user) });
    return true;
  }

  if (method === 'PATCH' && path === '/api/cabinet/settings') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    const cabinet = mutate((db) => {
      const x = db.users.find((i) => i.id === u.id);
      x.cabinet = patchCabinet(x, body);
      return x.cabinet;
    });
    send(res, 200, { cabinet: publicCabinet({ cabinet }) });
    return true;
  }

  if (method === 'GET' && path === '/api/team') {
    const u = requireUser(req, res);
    if (!u) return true;
    const payload = teamPayload(load(), u.actorId);
    send(res, 200, payload);
    return true;
  }

  if (method === 'POST' && path === '/api/team/invite') {
    const u = requireUser(req, res);
    if (!u) return true;
    const body = await readBody(req);
    const result = mutate((db) => inviteTeamMember(db, u.actorId, body));
    if (!result.ok) {
      send(res, 400, { error: result.error });
      return true;
    }
    const out = { ok: true, added: result.added };
    if (result.invite) {
      out.invite = {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        status: 'pending',
      };
      out.inviteLink = `${publicOrigin(req)}/#/register?teamInvite=${encodeURIComponent(result.invite.token)}`;
    }
    if (result.member) out.member = result.member;
    send(res, 200, out);
    return true;
  }

  const teamMemberPatch = path.match(/^\/api\/team\/members\/([^/]+)$/);
  if (method === 'PATCH' && teamMemberPatch) {
    const u = requireUser(req, res);
    if (!u) return true;
    const targetId = decodeURIComponent(teamMemberPatch[1]);
    const body = await readBody(req);
    const result = mutate((db) => patchTeamMember(db, u.actorId, targetId, body));
    if (!result.ok) {
      send(res, 400, { error: result.error });
      return true;
    }
    send(res, 200, { ok: true, member: result.member });
    return true;
  }

  const teamMemberDelete = path.match(/^\/api\/team\/members\/([^/]+)$/);
  if (method === 'DELETE' && teamMemberDelete) {
    const u = requireUser(req, res);
    if (!u) return true;
    const targetId = decodeURIComponent(teamMemberDelete[1]);
    const result = mutate((db) => removeTeamMember(db, u.actorId, targetId));
    if (!result.ok) {
      send(res, 400, { error: result.error });
      return true;
    }
    send(res, 200, { ok: true, removed: result.removed });
    return true;
  }

  return false;
}
