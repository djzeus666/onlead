/**
 * Timing fields of the cabinet: «Пауза между шагами», «Время отправки», «Когда».
 * Everything is evaluated in Moscow time — that is the clock the client and
 * their VK audience live by, regardless of where the container runs.
 */

const MSK_OFFSET_MIN = 3 * 60;

/** Wall-clock parts in Moscow for a given instant. */
export function mskParts(now = new Date()) {
  const shifted = new Date(now.getTime() + (MSK_OFFSET_MIN + now.getTimezoneOffset()) * 60000);
  return {
    hour: shifted.getHours(),
    minute: shifted.getMinutes(),
    weekday: shifted.getDay(),
    dayKey: `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`,
  };
}

/** «2 мин» / «15 мин» / «1 час» / «1 день» → milliseconds. */
export function stepDelayMs(label) {
  const s = String(label || '').trim().toLowerCase();
  const m = s.match(/(\d+)/);
  const n = m ? Number(m[1]) : 0;
  if (!n) return 0;
  if (/день|дн|сут/.test(s)) return n * 86400000;
  if (/час/.test(s)) return n * 3600000;
  if (/мин/.test(s)) return n * 60000;
  if (/сек/.test(s)) return n * 1000;
  return 0;
}

/** True when the campaign may run again given its own pause setting. */
export function stepDue(lastIso, delayLabel, now = Date.now()) {
  const wait = stepDelayMs(delayLabel);
  if (!wait) return true;
  const last = lastIso ? Date.parse(lastIso) : 0;
  if (!last) return true;
  return now - last >= wait;
}

/** «09:00» → 9. Returns null when the label carries no hour. */
export function hourFromLabel(label) {
  const m = String(label || '').match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? h : null;
}

/**
 * Send windows are an hour wide: the worker only wakes every few seconds, and a
 * to-the-minute match would drop the whole day if a tick were missed.
 */
export function withinSendHour(label, now = new Date()) {
  const target = hourFromLabel(label);
  if (target == null) return true;
  return mskParts(now).hour === target;
}

/**
 * Autoposting «Когда»: «Сейчас», «Сегодня 18:00», «Завтра 10:00», «По расписанию».
 * @returns {{ due: boolean, note: string }}
 */
export function postingDue(when, startedAtIso, now = new Date()) {
  const s = String(when || '').trim().toLowerCase();
  const { hour, dayKey } = mskParts(now);
  if (!s || /сейчас/.test(s)) return { due: true, note: '' };

  const target = hourFromLabel(s);
  if (/завтра/.test(s)) {
    const startedKey = startedAtIso ? mskParts(new Date(startedAtIso)).dayKey : dayKey;
    if (dayKey === startedKey) return { due: false, note: `ждём завтра ${target ?? 10}:00 МСК` };
    if (target != null && hour < target) return { due: false, note: `ждём ${target}:00 МСК` };
    return { due: true, note: '' };
  }
  if (/сегодня/.test(s) && target != null) {
    if (hour < target) return { due: false, note: `ждём ${target}:00 МСК` };
    return { due: true, note: '' };
  }
  if (/расписан/.test(s)) {
    // No calendar UI yet: behave as a daily post in the morning window.
    if (hour !== 10) return { due: false, note: 'ждём 10:00 МСК' };
    return { due: true, note: '' };
  }
  return { due: true, note: '' };
}

/**
 * Autostoris «Публикация»: «Сейчас», «Каждый день 10:00», «Пн/Ср/Пт 19:00».
 * @returns {{ due: boolean, note: string, dayKey?: string }}
 */
export function storiesDue(when, lastDayKey, now = new Date()) {
  const s = String(when || '').trim().toLowerCase();
  const { hour, weekday, dayKey } = mskParts(now);
  if (!s || /сейчас/.test(s)) return { due: true, note: '', dayKey };

  const alreadyToday = lastDayKey && lastDayKey === dayKey;

  if (/каждый день/.test(s)) {
    const target = hourFromLabel(s) ?? 10;
    if (hour !== target) return { due: false, note: `ждём ${target}:00 МСК` };
    if (alreadyToday) return { due: false, note: 'сторис уже сегодня' };
    return { due: true, note: '', dayKey };
  }

  if (/пн\/ср\/пт/.test(s)) {
    if (![1, 3, 5].includes(weekday)) return { due: false, note: 'ждём пн, ср или пт' };
    const target = hourFromLabel(s) ?? 19;
    if (hour !== target) return { due: false, note: `ждём ${target}:00 МСК` };
    if (alreadyToday) return { due: false, note: 'сторис уже сегодня' };
    return { due: true, note: '', dayKey };
  }

  const gate = postingDue(when, null, now);
  return { ...gate, dayKey: gate.due ? dayKey : undefined };
}
