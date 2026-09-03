/** Publish seed consultation landing p1 (admin). */
import { mutate } from '../server/db.mjs';

mutate((d) => {
  const l = (d.landings || []).find((x) => x.id === 'p1');
  if (!l) {
    console.error('p1 missing');
    process.exit(1);
  }
  l.status = 'published';
  l.publishedAt = Date.now();
  if (!String(l.slug || '').trim()) l.slug = 'consult';
  console.log(JSON.stringify({ id: l.id, status: l.status, slug: l.slug, headline: l.headline }));
});
