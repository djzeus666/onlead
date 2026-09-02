import { load } from '../server/db.mjs';
import { verifyPassword } from '../server/crypto.mjs';

const email = String(process.env.ADMIN_EMAIL || 'admin@onlead.local').toLowerCase();
const pass = String(process.env.ADMIN_PASSWORD || '');
const u = load().users.find((x) => String(x.email).toLowerCase() === email);
console.log(JSON.stringify({
  email,
  passLen: pass.length,
  found: !!u,
  role: u?.role,
  banned: u?.banned,
  verified: u?.emailVerified,
  passOk: u && pass ? verifyPassword(pass, u.passwordHash) : false,
}, null, 2));
