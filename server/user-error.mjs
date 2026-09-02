/** Messages shown in the cabinet. Never leak SQL, stacks, or raw VK/Telegram API text. */

const FALLBACK = 'Не получилось выполнить запрос. Попробуйте ещё раз.';
const TASK_FAIL = 'Не удалось выполнить шаг. Попробуйте другой канал или позже.';

export function publicCabinetError(err, fallback = FALLBACK) {
  const code = String(err?.code || '');
  const raw = String(err?.message || err || '').trim();
  if (code === 'VK_NETWORK') return 'VK временно недоступен. Проверьте сеть и попробуйте снова.';
  if (code === 'VK_5') return 'Токен VK недействителен. Подключите аккаунт заново.';
  if (code === 'VK_6' || code === 'VK_9' || code === 'VK_29') return 'VK просит подождать. Повторите через минуту.';
  if (code === 'VK_7' || code === 'VK_15') return 'VK не дал доступ. Переподключите аккаунт VK.';
  if (code.startsWith('VK_')) return 'VK отклонил запрос. Попробуйте позже или переподключите аккаунт.';
  if (/telegram/i.test(code) || /^ETELEGRAM/i.test(code)) return 'Telegram отклонил запрос. Проверьте токен бота.';
  if (looksTechnical(raw) || looksAdminDiagnostic(raw)) return fallback;
  if (isSafeUserCopy(raw)) return raw.slice(0, 180);
  return fallback;
}

/**
 * Status line for cabinet tasks. Success copy stays; diagnostics go to admin only.
 */
export function cabinetTaskMessage(raw, opts = {}) {
  const msg = String(raw || '').trim();
  if (!msg) return opts.ok ? 'Готово' : TASK_FAIL;
  if (opts.ok || opts.skip) {
    if (looksAdminDiagnostic(msg) || looksTechnical(msg)) {
      return opts.ok ? 'Готово' : TASK_FAIL;
    }
    return msg.slice(0, 180);
  }
  if (looksAdminDiagnostic(msg) || looksTechnical(msg)) return TASK_FAIL;
  if (isSafeUserCopy(msg)) return msg.slice(0, 160);
  return TASK_FAIL;
}

export function isAdminDiagnosticMessage(raw) {
  return looksAdminDiagnostic(String(raw || '')) || looksTechnical(String(raw || ''));
}

function looksTechnical(msg) {
  return /sqlite|sql |ECONN|EAI_|ENOTFOUND|EPIPE|stack|at Object\.|node:internal|TOKEN_ENCRYPTION|password_hash|BEGIN IMMEDIATE|error_code|Access denied|invalid access_token|Unauthorized|messages\.send|wall\.post|VK_\d+/i.test(msg);
}

/** Ops / product internals — never show in LK. */
function looksAdminDiagnostic(msg) {
  return /Kate Mobile|2685278|5530956|messages\.send|токен с правом|токен сообщений|blank\.html|oauth\.vk|scope|bitmask|post2post|сервис заблокирован|проверьте права токена|вставьте рабочий|VK_MESSAGES|error_subcode|IP браузера|Standalon/i.test(msg);
}

function isSafeUserCopy(msg) {
  if (!msg || msg.length > 220) return false;
  if (!/[А-Яа-яЁё]/.test(msg)) return false;
  if (looksTechnical(msg) || looksAdminDiagnostic(msg)) return false;
  return true;
}
