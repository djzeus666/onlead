import { assertWorkspaceMutation } from '../workspace-rbac.mjs';
import * as health from './health.mjs';
import * as auth from './auth.mjs';
import * as me from './me.mjs';
import * as cabinet from './cabinet-routes.mjs';
import * as billing from './billing-routes.mjs';
import * as campaigns from './campaigns-routes.mjs';
import * as landings from './landings-routes.mjs';
import * as vk from './vk-routes.mjs';
import * as content from './content-routes.mjs';
import * as crm from './crm-routes.mjs';

const handlers = [health, auth, me, cabinet, billing, campaigns, landings, vk, content, crm];

export async function dispatchRoutes(ctx) {
  if (!assertWorkspaceMutation(ctx.req, ctx.res, ctx.path)) return true;
  for (const mod of handlers) {
    if (await mod.handle(ctx)) return true;
  }
  return false;
}
