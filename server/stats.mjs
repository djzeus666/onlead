/** Dashboard activity buckets — mirrors online-lead.ru «Общая активность VK». */

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function activitySeries(db, userId, days = 30) {
  const n = Math.min(Math.max(Number(days) || 30, 7), 90);
  const since = Date.now() - n * 86400000;
  const buckets = {};
  for (let i = 0; i < n; i += 1) {
    const key = dayKey(Date.now() - (n - 1 - i) * 86400000);
    buckets[key] = { date: key, actions: 0, leads: 0, messages: 0, likes: 0, posts: 0, bots: 0 };
  }
  for (const j of db.jobs || []) {
    if (j.userId !== userId || !j.ok) continue;
    const t = Date.parse(j.at);
    if (!t || t < since) continue;
    const key = dayKey(t);
    const bucket = buckets[key];
    if (!bucket) continue;
    bucket.actions += 1;
    const msg = String(j.message || '');
    if (/лайк/i.test(msg)) bucket.likes += 1;
    if (/сообщ|диалог|касание|коммент|автоответ/i.test(msg)) bucket.messages += 1;
    if (/пост|опублик|сторис/i.test(msg)) bucket.posts += 1;
    if (/^(удал[ёе]н|исключ[ёe]н|заблокирован)/i.test(msg)) bucket.bots += 1;
  }
  for (const l of db.leads || []) {
    if (l.userId !== userId) continue;
    const t = Number(l.createdAt || 0) || Date.parse(l.at || '');
    if (!t || t < since) continue;
    const bucket = buckets[dayKey(t)];
    if (bucket) bucket.leads += 1;
  }
  return Object.values(buckets);
}

export function activityTotals(series = []) {
  return series.reduce((acc, row) => ({
    actions: acc.actions + row.actions,
    leads: acc.leads + row.leads,
    messages: acc.messages + row.messages,
    likes: acc.likes + row.likes,
    posts: acc.posts + row.posts,
    bots: acc.bots + row.bots,
  }), { actions: 0, leads: 0, messages: 0, likes: 0, posts: 0, bots: 0 });
}
