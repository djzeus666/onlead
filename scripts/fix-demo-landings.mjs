/** Assign orphan demo landings (userId=null) to admin. */
import { load, mutate, save } from '../server/db.mjs';

const db = load();
const admin = (db.users || []).find((u) => u.role === 'admin');
if (!admin) {
  console.error('No admin user');
  process.exit(1);
}
const orphans = (db.landings || []).filter((l) => !l.userId);
mutate((d) => {
  for (const l of d.landings || []) {
    if (!l.userId) l.userId = admin.id;
  }
});
save();
console.log(JSON.stringify({ admin: admin.email, fixed: orphans.map((l) => l.id) }, null, 2));
