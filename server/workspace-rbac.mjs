/** Team member RBAC — workspace write restrictions. */
import { authUser, send } from './http-api.mjs';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths team members may mutate (CRM + own profile + VK replies). */
const MEMBER_WRITE_RULES = [
  { method: 'POST', path: '/api/leads' },
  { method: 'PATCH', prefix: '/api/leads/' },
  { method: 'PATCH', path: '/api/me' },
  { method: 'POST', path: '/api/vk/chats/reply' },
];

function memberWriteAllowed(method, path) {
  for (const rule of MEMBER_WRITE_RULES) {
    if (rule.method !== method) continue;
    if (rule.path && path === rule.path) return true;
    if (rule.prefix && path.startsWith(rule.prefix)) return true;
  }
  return false;
}

/**
 * Block workspace mutations for teamRole=member unless whitelisted.
 * Call before dispatch + legacy handlers. Returns false if blocked (response sent).
 */
export function assertWorkspaceMutation(req, res, path) {
  const method = req.method || 'GET';
  if (!MUTATION_METHODS.has(method)) return true;
  if (!path.startsWith('/api/')) return true;

  const actor = authUser(req);
  if (!actor?.teamOwnerId) return true;
  const role = actor.teamRole || 'member';
  if (role === 'admin') return true;
  if (memberWriteAllowed(method, path)) return true;

  send(res, 403, {
    error: 'У участника команды доступ только на чтение. Изменения CRM и профиля — разрешены.',
    code: 'team_readonly',
  });
  return false;
}

export { memberWriteAllowed, MEMBER_WRITE_RULES };
