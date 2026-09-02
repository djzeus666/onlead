import { load, storageEngine } from '../server/db.mjs';

const d = load();
console.log('storage', storageEngine());
const list = d.payments || [];
console.log('count', list.length);
for (const p of list.slice(0, 5)) {
  console.log(JSON.stringify({ id: p.id, status: p.status, kind: p.kind, userId: p.userId }));
}

const shop = process.env.YOOKASSA_SHOP_ID;
const secret = process.env.YOOKASSA_SECRET_KEY;
const auth = 'Basic ' + Buffer.from(`${shop}:${secret}`).toString('base64');
const latest = list[0];
if (!latest?.id) process.exit(0);
const r = await fetch('https://api.yookassa.ru/v3/payments/' + encodeURIComponent(latest.id), {
  headers: { Authorization: auth },
});
const body = await r.text();
console.log('yookassa_http', r.status);
const j = JSON.parse(body);
console.log(JSON.stringify({
  id: j.id,
  status: j.status,
  paid: j.paid,
  confirmation: j.confirmation,
  cancellation: j.cancellation_details,
  metadata: j.metadata,
}, null, 0));
