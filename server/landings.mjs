/** Owner-scoped landing lookup. Missing this function 500s cabinet GET/PATCH. */
export function findOwnedLanding(d, user, id) {
  const landingId = String(id || '');
  const userId = user?.id;
  if (!landingId || !userId) return null;
  return (d.landings || []).find((x) => x.id === landingId && x.userId === userId) || null;
}

export function findPublishedLandingByHost(d, host) {
  const h = String(host || '').trim().toLowerCase();
  if (!h) return null;
  return (d.landings || []).find((x) => x.status === 'published' && String(x.customHost || '').toLowerCase() === h) || null;
}

export function findPublishedLandingBySlug(d, slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return null;
  return (d.landings || []).find((x) => x.status === 'published' && String(x.slug || x.id).toLowerCase() === s) || null;
}

export function landingSlugTaken(d, slug, exceptId = '') {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return false;
  return (d.landings || []).some((x) => x.id !== exceptId && String(x.slug || '').toLowerCase() === s);
}

export function landingHostTaken(d, host, exceptId = '') {
  const h = String(host || '').trim().toLowerCase();
  if (!h) return false;
  return (d.landings || []).some((x) => x.id !== exceptId && String(x.customHost || '').toLowerCase() === h);
}
