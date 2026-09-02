import * as health from './health.mjs';
import * as auth from './auth.mjs';
import * as me from './me.mjs';
import * as cabinet from './cabinet-routes.mjs';
import * as billing from './billing-routes.mjs';
import * as campaigns from './campaigns-routes.mjs';
import * as landings from './landings-routes.mjs';

const handlers = [health, auth, me, cabinet, billing, campaigns, landings];

export async function dispatchRoutes(ctx) {
  for (const mod of handlers) {
    if (await mod.handle(ctx)) return true;
  }
  return false;
}
