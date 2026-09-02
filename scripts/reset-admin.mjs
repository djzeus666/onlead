/** Sync admin password from ADMIN_PASSWORD env (production recovery). */
import { load, mutate, save } from '../server/db.mjs';
import { hashPassword, verifyPassword } from '../server/crypto.mjs';

const email = String(process.env.ADMIN_EMAIL || 'admin@onlead.local').toLowerCase();
const pass = String(process.env.ADMIN_PASSWORD || '').trim();

if (!pass) {
  console.error('ADMIN_PASSWORD is empty');
  process.exit(1);
}

const db = load();
let u = db.users.find((x) => String(x.email).toLowerCase() === email);

mutate((d) => {
  d.users = d.users || [];
  u = d.users.find((x) => String(x.email).toLowerCase() === email);
  if (!u) {
    u = {
      id: 'u-admin',
      name: 'Администратор',
      email,
      role: 'admin',
      balance: 0,
      refBalance: 0,
      trialUntil: 0,
      packageId: 'maxi',
      packageUntil: Date.now() + 365 * 86400000,
      enabledTools: {},
      accountSlots: 10,
      referral: { invited: 0, paying: 0, earned: 0, code: 'ADMIN' },
      banned: false,
      emailVerified: true,
      createdAt: Date.now(),
    };
    d.users.unshift(u);
  }
  u.passwordHash = hashPassword(pass);
  u.role = 'admin';
  u.banned = false;
  u.emailVerified = true;
  u.seedPassword = false;
  if (!u.packageId) u.packageId = 'maxi';
  if (!u.packageUntil || u.packageUntil < Date.now()) {
    u.packageUntil = Date.now() + 365 * 86400000;
  }
});

save();
const check = load().users.find((x) => String(x.email).toLowerCase() === email);
console.log(JSON.stringify({
  ok: true,
  email,
  passOk: verifyPassword(pass, check.passwordHash),
  role: check.role,
}, null, 2));
