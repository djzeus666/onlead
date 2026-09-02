import { securityHeaders } from '../hardening.mjs';
import { publicHealthPayload } from '../health-public.mjs';
import { healthPayload, send } from '../http-api.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;
  if ((method === 'GET' || method === 'HEAD') && path === '/api/health') {
    const body = publicHealthPayload(healthPayload());
    if (method === 'HEAD') {
      const json = JSON.stringify(body);
      res.writeHead(200, {
        ...securityHeaders(req),
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(json),
      });
      return res.end();
    }
    send(res, 200, body);
    return true;
  }
  return false;
}
