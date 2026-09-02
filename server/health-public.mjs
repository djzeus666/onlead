/** Public /api/health: SPA needs legal + flags. Do not expose encryption/backup internals. */
export function publicHealthPayload(full) {
  const bak = full?.backups || {};
  return {
    ok: true,
    service: full?.service || 'onlead',
    paymentsLive: Boolean(full?.paymentsLive),
    mailConfigured: Boolean(full?.mailConfigured),
    mocksAllowed: Boolean(full?.mocksAllowed),
    telegramLive: Boolean(full?.telegramLive),
    storage: full?.storage,
    storageSchema: full?.storageSchema,
    legal: full?.legal || {},
    backups: {
      remoteOk: Boolean(bak.remoteOk),
      geoConfigured: Boolean(bak.geoConfigured),
    },
  };
}
