/** YooKassa HTTP client — same shop/API as post2post (api.yookassa.ru/v3). */

export function isLivePayments() {
  const mode = String(process.env.PAYMENTS_MODE || '').trim();
  const shopId = String(process.env.YOOKASSA_SHOP_ID || '').trim();
  const secret = String(process.env.YOOKASSA_SECRET_KEY || '').trim();
  return mode === 'live' && Boolean(shopId && secret);
}

export function yookassaConfigured() {
  return Boolean(String(process.env.YOOKASSA_SHOP_ID || '').trim() && String(process.env.YOOKASSA_SECRET_KEY || '').trim());
}

export function formatYookassaAmount(raw) {
  const n = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Некорректная сумма оплаты: ${raw}`);
  return n.toFixed(2);
}

function authHeader() {
  const shopId = String(process.env.YOOKASSA_SHOP_ID || '').trim();
  const secret = String(process.env.YOOKASSA_SECRET_KEY || '').trim();
  if (!shopId || !secret) throw new Error('ЮKassa не настроена: укажите Shop ID и Secret Key');
  return 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64');
}

export function buildReceipt({ email, description, amountValue }) {
  const vatRaw = String(process.env.YOOKASSA_VAT_CODE || '1').trim();
  const vatCode = Math.min(12, Math.max(1, Number(vatRaw) || 1));
  const taxRaw = String(process.env.YOOKASSA_TAX_SYSTEM_CODE || '').trim();
  const taxSystem = taxRaw ? Math.min(6, Math.max(1, Number(taxRaw) || 0)) : undefined;
  const receipt = {
    customer: { email },
    items: [{
      description: String(description || 'OnLead').slice(0, 128),
      quantity: '1.00',
      amount: { value: amountValue, currency: 'RUB' },
      vat_code: vatCode,
      payment_mode: 'full_payment',
      payment_subject: 'service',
    }],
  };
  if (taxSystem) receipt.tax_system_code = taxSystem;
  return receipt;
}

export async function createYookassaPayment(opts) {
  const amountValue = formatYookassaAmount(opts.amountRaw);
  const receipt = buildReceipt({
    email: opts.email,
    description: opts.description,
    amountValue,
  });
  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': opts.idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value: amountValue, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: opts.returnUrl },
      description: String(opts.description || '').slice(0, 128),
      metadata: opts.metadata || {},
      receipt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[yookassa] create failed', res.status, text.slice(0, 400));
    throw new Error('ЮKassa отклонила платёж. Проверьте сумму и email в профиле.');
  }
  return res.json();
}

export async function getYookassaPayment(paymentId) {
  const res = await fetch(
    `https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: authHeader() } },
  );
  if (!res.ok) {
    console.error('[yookassa] get failed', paymentId, res.status);
    throw new Error(`yookassa fetch failed: ${res.status}`);
  }
  return res.json();
}
