import { load, storageEngine } from '../server/db.mjs';

const d = load();
console.log('storage', storageEngine());
for (const u of d.users || []) {
  console.log([u.id, u.email, 'pack=' + (u.packageId || '-'), 'bal=' + (u.balance || 0)].join(' '));
}
console.log('payments', (d.payments || []).length);
for (const p of (d.payments || []).slice(0, 12)) {
  console.log([p.status, p.kind, p.amount, p.title, String(p.id || '').slice(0, 8)].join(' '));
}
