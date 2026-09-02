import { load, storageEngine } from '../server/db.mjs';

const d = load();
console.log('storage', storageEngine());
const a = d.settings?.ai || {};
console.log(JSON.stringify({
  providerId: a.providerId,
  baseUrl: a.baseUrl,
  model: a.model,
  imageModel: a.imageModel,
  keyMask: a.keyMask,
  hasKey: Boolean(a.apiKeyEnc),
}, null, 2));
const cams = (d.campaigns || [])
  .filter((c) => c.slug === 'image-ai')
  .slice(0, 6)
  .map((c) => ({
    id: c.id,
    status: c.status,
    ok: c.stats?.ok,
    fail: c.stats?.fail,
    msg: c.stats?.lastMessage,
    prompt: String(c.payload?.prompt || '').slice(0, 80),
    images: (c.stats?.images || []).length,
  }));
console.log(JSON.stringify(cams, null, 2));
