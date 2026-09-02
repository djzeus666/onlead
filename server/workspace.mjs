/** Team workspace — map members to owner data scope. */
export function effectiveUserId(user) {
  if (!user) return null;
  return user.teamOwnerId || user.id;
}

export function workspaceUser(db, actor) {
  if (!actor) return null;
  const wid = effectiveUserId(actor);
  if (wid === actor.id) return actor;
  return (db.users || []).find((u) => u.id === wid) || actor;
}

export function workspaceContext(db, actor) {
  const workspace = workspaceUser(db, actor);
  return {
    actor,
    actorId: actor.id,
    workspaceId: workspace.id,
    workspace,
    isOwner: !actor.teamOwnerId,
    teamRole: actor.teamOwnerId ? (actor.teamRole || 'member') : 'owner',
  };
}

export function scopeUser(actor) {
  if (!actor) return null;
  const wsId = effectiveUserId(actor);
  return {
    ...actor,
    actorId: actor.id,
    workspaceId: wsId,
    id: wsId,
  };
}
