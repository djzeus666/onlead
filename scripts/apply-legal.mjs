/**
 * Apply LEGAL_* env (or CLI args) into settings.legal in SQLite.
 *   docker exec onlead-app node --experimental-sqlite scripts/apply-legal.mjs
 *   node --experimental-sqlite scripts/apply-legal.mjs --inn=7707083893 --operator="ООО …"
 */
import { load, save } from '../server/db.mjs';
import { isValidInn } from '../server/inn.mjs';

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
}

const operator = arg('operator') || process.env.LEGAL_OPERATOR || '';
const innRaw = arg('inn') || process.env.LEGAL_INN || '';
const inn = String(innRaw).replace(/\D/g, '').slice(0, 12);
const ogrn = String(arg('ogrn') || process.env.LEGAL_OGRN || '').replace(/\D/g, '').slice(0, 15);
const address = arg('address') || process.env.LEGAL_ADDRESS || '';
const email = arg('email') || process.env.LEGAL_EMAIL || process.env.SMTP_FROM || '';

if (inn && !isValidInn(inn)) {
  console.error(`Invalid INN checksum: ${inn}`);
  process.exit(1);
}
if (!operator.trim()) {
  console.error('LEGAL_OPERATOR / --operator required');
  process.exit(1);
}
if (!inn) {
  console.error('LEGAL_INN / --inn required for legal OK');
  process.exit(1);
}

const db = load();
db.settings = db.settings || {};
db.settings.legal = {
  ...(db.settings.legal || {}),
  operator: String(operator).trim().slice(0, 160),
  inn,
  ogrn,
  address: String(address).trim().slice(0, 240),
  email: String(email).trim().slice(0, 120),
};
save();
console.log(JSON.stringify({ ok: true, legal: db.settings.legal }, null, 2));
