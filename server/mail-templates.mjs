/** Transactional letters — same events as post2post, OnLead branding. */
const ACCENTS = {
  brand: { from: '#182338', to: '#315cff', btn: '#315cff' },
  danger: { from: '#b91c1c', to: '#7f1d1d', btn: '#b91c1c' },
  success: { from: '#182338', to: '#37a77b', btn: '#315cff' },
  warning: { from: '#b45309', to: '#92400e', btn: '#b45309' },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function wrapMailLayout(opts) {
  const accent = ACCENTS[opts.accent ?? 'brand'];
  const footer = opts.footerNote ?? 'Это письмо отправлено автоматически сервисом OnLead.';
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3efe6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16171c;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3efe6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(22,23,28,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,${accent.from} 0%,${accent.to} 100%);padding:28px 32px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:600;">OnLead</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">${escapeHtml(opts.headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;padding-top:16px;border-top:1px solid #eee8dc;font-size:12px;line-height:1.5;color:#8a8478;">
                ${escapeHtml(footer)}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:#8a8478;">© OnLead · M360</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href, label, accent = 'brand') {
  const btn = ACCENTS[accent].btn;
  return `<a href="${escapeAttr(href)}" style="display:inline-block;background:${btn};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${escapeHtml(label)}</a>`;
}

function p(text, muted = false) {
  const color = muted ? '#5b564c' : '#16171c';
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${color};">${text}</p>`;
}

function greeting(name) {
  return `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Здравствуйте, <strong>${escapeHtml(name)}</strong>!</p>`;
}

function codeBlock(label, digits) {
  const spaced = String(digits).split('').join(' ');
  return `<div style="text-align:center;margin:20px 0;">
      <div style="display:inline-block;background:#f3efe6;border:1px solid #eee8dc;border-radius:14px;padding:18px 28px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8a8478;font-weight:600;">${escapeHtml(label)}</p>
        <p style="margin:0;font-size:36px;letter-spacing:0.28em;font-weight:700;color:#315cff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${escapeHtml(spaced)}</p>
      </div>
    </div>`;
}

export function buildVerificationEmail(opts) {
  const digits = String(opts.code).replace(/\D/g, '').slice(0, 6);
  const subject = `${digits} — код подтверждения OnLead`;
  const text = [
    `Здравствуйте, ${opts.name}!`,
    '',
    'Подтвердите email для OnLead.',
    '',
    `Ваш код: ${digits}`,
    '',
    `Или откройте ссылку: ${opts.verifyUrl}`,
    '',
    `Код действует ${opts.expiresMinutes} мин.`,
    'Если вы не регистрировались — просто проигнорируйте это письмо.',
    '',
    '— OnLead',
  ].join('\n');
  const bodyHtml = [
    greeting(opts.name),
    p('Введите код ниже на сайте, чтобы завершить регистрацию и войти в кабинет.', true),
    codeBlock('Код подтверждения', digits),
    `<div style="text-align:center;margin:8px 0 16px;">${ctaButton(opts.verifyUrl, 'Подтвердить на сайте')}</div>`,
    p(`Код действует ${opts.expiresMinutes} минут. Если кнопка не работает, скопируйте код вручную.`, true),
  ].join('');
  return {
    subject,
    text,
    html: wrapMailLayout({
      title: 'Подтверждение email',
      headline: 'Подтвердите email',
      bodyHtml,
      footerNote: 'Если вы не создавали аккаунт в OnLead — просто удалите это письмо. Никому не сообщайте код.',
    }),
  };
}

export function buildWelcomeEmail(opts) {
  const subject = 'Добро пожаловать в OnLead';
  const text = [
    `Здравствуйте, ${opts.name}!`,
    '',
    'Email подтверждён — добро пожаловать в OnLead.',
    'Подключите VK, откройте лидогенератор и соберите первый список.',
    '',
    opts.dashboardUrl,
    '',
    '— OnLead',
  ].join('\n');
  const bodyHtml = [
    greeting(opts.name),
    p('Email подтверждён — кабинет готов к работе.'),
    p('Дальше: подключите аккаунт VK, выберите инструмент и запустите первую задачу. Триал — 72 часа всех сервисов.', true),
    `<div style="text-align:center;margin:20px 0;">${ctaButton(opts.dashboardUrl, 'Открыть кабинет')}</div>`,
  ].join('');
  return {
    subject,
    text,
    html: wrapMailLayout({ title: 'Добро пожаловать', headline: 'Добро пожаловать!', accent: 'success', bodyHtml }),
  };
}

export function buildPasswordResetEmail(opts) {
  const digits = String(opts.code).replace(/\D/g, '').slice(0, 6);
  const subject = `${digits} — сброс пароля OnLead`;
  const text = [
    `Здравствуйте, ${opts.name}!`,
    '',
    `Код сброса пароля: ${digits}`,
    `Или откройте: ${opts.resetUrl}`,
    '',
    `Код действует ${opts.expiresMinutes} мин.`,
    'Если вы не запрашивали сброс — проигнорируйте письмо.',
    '',
    '— OnLead',
  ].join('\n');
  const bodyHtml = [
    greeting(opts.name),
    p('Вы запросили сброс пароля. Введите код или нажмите кнопку ниже.', true),
    codeBlock('Код сброса', digits),
    `<div style="text-align:center;margin:8px 0 16px;">${ctaButton(opts.resetUrl, 'Сбросить пароль', 'warning')}</div>`,
    p(`Код действует ${opts.expiresMinutes} минут.`, true),
  ].join('');
  return {
    subject,
    text,
    html: wrapMailLayout({
      title: 'Сброс пароля',
      headline: 'Сброс пароля',
      accent: 'warning',
      bodyHtml,
      footerNote: 'Если вы не запрашивали сброс пароля — просто удалите это письмо.',
    }),
  };
}

export function buildBillingPaymentEmail(opts) {
  const subject = `[OnLead] Оплата получена: ${opts.title}`;
  const text = [
    `Оплата прошла успешно.`,
    `Назначение: ${opts.title}`,
    opts.amountRub != null ? `Сумма: ${opts.amountRub} ₽` : '',
    opts.billingUrl,
  ].filter(Boolean).join('\n');
  const bodyHtml = [
    p('Оплата получена — баланс или подписка обновлены.'),
    p(`Назначение: <strong>${escapeHtml(opts.title)}</strong>`),
    opts.amountRub != null ? p(`Сумма: <strong>${opts.amountRub} ₽</strong>`, true) : '',
    `<div style="text-align:center;margin:16px 0;">${ctaButton(opts.billingUrl, 'Открыть баланс', 'success')}</div>`,
  ].join('');
  return {
    subject,
    text,
    html: wrapMailLayout({ title: 'Оплата', headline: 'Оплата получена', accent: 'success', bodyHtml }),
  };
}

export function buildTrialEndingEmail(opts) {
  const subject = opts.daysLeft <= 1
    ? '[OnLead] Триал заканчивается сегодня'
    : `[OnLead] Триал заканчивается через ${opts.daysLeft} дн.`;
  const text = [
    `Пробный период заканчивается через ${opts.daysLeft} дн.`,
    'Выберите тариф, чтобы сохранить доступ к инструментам.',
    opts.billingUrl,
  ].join('\n');
  const bodyHtml = [
    greeting(opts.name),
    p(`Пробный период заканчивается через <strong>${opts.daysLeft}</strong> дн.`),
    p('Выберите тариф, чтобы сохранить лидогенератор, парсеры и остальные сервисы.', true),
    `<div style="text-align:center;margin:16px 0;">${ctaButton(opts.billingUrl, 'Выбрать тариф', 'warning')}</div>`,
  ].join('');
  return {
    subject,
    text,
    html: wrapMailLayout({ title: 'Триал', headline: 'Триал заканчивается', accent: 'warning', bodyHtml }),
  };
}

export function buildLeadgenMatchesEmail(opts) {
  const subject = `[OnLead] ${opts.newCount} новых лидов`;
  const sampleLines = (opts.samples || []).slice(0, 5).map((s, i) => {
    const who = s.author ? `${s.author}: ` : '';
    return `${i + 1}. [${s.phrase}] ${who}${String(s.text || '').slice(0, 120)}${s.url ? ` — ${s.url}` : ''}`;
  });
  const text = [
    `Найдено новых совпадений: ${opts.newCount}.`,
    '',
    ...sampleLines,
    '',
    opts.leadgenUrl,
  ].join('\n');
  const sampleHtml = (opts.samples || []).slice(0, 5).map((s) => {
    const link = s.url ? `<a href="${escapeAttr(s.url)}" style="color:#315cff;">открыть</a>` : '';
    return `<li style="margin:0 0 8px;"><strong>${escapeHtml(s.phrase)}</strong>${
      s.author ? ` · ${escapeHtml(s.author)}` : ''
    } — ${escapeHtml(String(s.text || '').slice(0, 140))} ${link}</li>`;
  }).join('');
  const bodyHtml = [
    p(`Найдено <strong>${opts.newCount}</strong> новых совпадений по вашим фразам.`),
    sampleHtml ? `<ul style="padding-left:18px;margin:12px 0;font-size:13px;color:#334155;">${sampleHtml}</ul>` : '',
    `<div style="text-align:center;margin:16px 0;">${ctaButton(opts.leadgenUrl, 'Открыть лидогенератор')}</div>`,
  ].join('');
  return {
    subject,
    text,
    html: wrapMailLayout({ title: 'Лидогенератор', headline: 'Новые лиды', bodyHtml }),
  };
}
