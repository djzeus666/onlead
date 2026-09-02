import { load } from '../server/db.mjs';

const email = (process.argv[2] || 'artgameportal@gmail.com').toLowerCase();
const db = load();
const u = db.users.find((x) => String(x.email).toLowerCase() === email);
if (!u) {
  console.log(JSON.stringify({ error: 'user not found', email }, null, 2));
  process.exit(1);
}
const mine = (db.landings || []).filter((l) => l.userId === u.id);
const shared = (db.landings || []).filter((l) => !l.userId);
console.log(JSON.stringify({
  user: { id: u.id, email: u.email, name: u.name },
  ownLandings: mine.map((l) => ({ id: l.id, name: l.name, status: l.status, userId: l.userId })),
  sharedDemoLandings: shared.map((l) => ({ id: l.id, name: l.name, status: l.status, userId: l.userId })),
  snapshotCount: [...shared, ...mine].length,
}, null, 2));
