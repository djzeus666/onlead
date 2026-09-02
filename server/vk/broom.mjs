/**
 * «Веник» rules. The cabinet offers four modes and the tool used to ignore all
 * of them, deleting anyone without an avatar. Each rule states why a profile is
 * dead so the campaign log can explain the removal.
 */

const YEAR_MS = 365 * 86400000;

export function broomRuleKind(rules) {
  const s = String(rules || '').trim().toLowerCase();
  if (/все|эвристик/.test(s)) return 'all';
  if (/не\s*заходил|давност|365/.test(s)) return 'stale';
  if (/фото|аватар/.test(s)) return 'nophoto';
  if (/бот/.test(s)) return 'bots';
  return 'all';
}

export const BROOM_RULE_LABELS = {
  bots: 'боты и удалённые страницы',
  nophoto: 'без аватара',
  stale: 'не заходили больше года',
  all: 'все эвристики',
};

/** VK serves a placeholder avatar rather than an empty field for photoless users. */
function hasNoAvatar(p) {
  const photo = String(p.photo || '');
  return !photo || /camera_\d+|deactivated_/.test(photo);
}

/**
 * Deliberately conservative: this tool deletes people. Transliterated Latin
 * names are ordinary on VK, so script alone is never evidence — only a dead
 * page, a missing name, digits inside a name, or an avatarless profile that
 * has never been seen online.
 */
function isBot(p) {
  if (p.deactivated) return true;
  const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  if (!name) return true;
  if (/\d/.test(name)) return true;
  return hasNoAvatar(p) && !p.lastSeen;
}

function isStale(p, now) {
  const seen = Number(p.lastSeen || 0);
  if (!seen) return false;
  return now - seen * 1000 > YEAR_MS;
}

/** Why this profile matches, or '' when it should be kept. */
export function broomReason(person, kind, now = Date.now()) {
  const bot = isBot(person);
  const noPhoto = hasNoAvatar(person);
  const stale = isStale(person, now);
  if (kind === 'bots') return bot ? (person.deactivated ? 'страница удалена или заблокирована' : 'похоже на бота') : '';
  if (kind === 'nophoto') return noPhoto ? 'нет аватара' : '';
  if (kind === 'stale') return stale ? 'не заходил(а) больше года' : '';
  if (person.deactivated) return 'страница удалена или заблокирована';
  if (bot) return 'похоже на бота';
  if (noPhoto) return 'нет аватара';
  if (stale) return 'не заходил(а) больше года';
  return '';
}

export function broomCandidates(people, rules, now = Date.now()) {
  const kind = broomRuleKind(rules);
  const out = [];
  for (const p of people || []) {
    const reason = broomReason(p, kind, now);
    if (reason) out.push({ ...p, reason });
  }
  return out;
}
