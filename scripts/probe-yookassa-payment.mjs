import { load, storageEngine } from '../server/db.mjs';

const d = load();
console.log('storage', storageEngine());
const list = d.payments || [];
console.log('count', list.length);
for (const p of list.slice(0, 5)) {
  console.log(JSON.stringify({
    id: p.id, status: p.status, kind: p.kind, provider: p.provider, userId: p.userId,
  }));
}

const shop = process.env.YOOKASSA_SHOP_ID;
const secret = process.env.YOOKASSA_SECRET_KEY;
if (!shop || !secret) {
  console.error('missing YOOKASSA keys');
  process.exit(1);
}
const auth = 'Basic ' + Buffer.from(`${shop}:${secret}`).toString('base64');

const ykLocal = list.find((p) => p.provider === 'yookassa' && /^[0-9a-f-]{36}$/i.test(p.id));
let probeId = ykLocal?.id || '';
if (!probeId) {
  const listRes = await fetch('https://api.yookassa.ru/v3/payments?limit=1', {
    headers: { Authorization: auth },
  });
  const listBody = await listRes.json();
  probeId = listBody?.items?.[0]?.id || '';
  console.log('yookassa_list_http', listRes.status, 'items', listBody?.items?.length || 0);
}
if (!probeId) {
  console.error('no yookassa payment to probe');
  process.exit(2);
}

const r = await fetch('https://api.yookassa.ru/v3/payments/' + encodeURIComponent(probeId), {
  headers: { Authorization: auth },
});
const body = await r.text();
console.log('yookassa_http', r.status, 'id', probeId);
const j = JSON.parse(body);
console.log(JSON.stringify({
  id: j.id,
  status: j.status,
  paid: j.paid,
  amount: j.amount,
  confirmation: j.confirmation?.type,
  metadata: j.metadata,
}, null, 0));
if (!r.ok) process.exit(3);
console.log('payment_path_ok');
