/** Enable all platform tools globally and turn on leadgen configs. */
import { load, mutate, TOOLS, save } from '../server/db.mjs';

const toolSlugs = [...TOOLS, 'landings-pro'];

mutate((d) => {
  d.settings.toolsEnabled = {
    ...Object.fromEntries(toolSlugs.map((s) => [s, true])),
    ...(d.settings.toolsEnabled || {}),
  };
  for (const slug of toolSlugs) {
    if (d.settings.toolsEnabled[slug] !== false) d.settings.toolsEnabled[slug] = true;
  }
  d.leadgen = d.leadgen || [];
  for (const cfg of d.leadgen) {
    cfg.enabled = true;
  }
  for (const u of d.users || []) {
    if (u.role === 'admin') {
      u.packageId = u.packageId || 'maxi';
      u.packageUntil = u.packageUntil || Date.now() + 365 * 86400000;
    }
  }
});

const db = load();
const off = toolSlugs.filter((s) => db.settings.toolsEnabled?.[s] === false);
console.log(JSON.stringify({
  ok: true,
  toolsOff: off,
  leadgenOn: (db.leadgen || []).filter((c) => c.enabled).length,
  leadgenTotal: (db.leadgen || []).length,
}, null, 2));

save();
