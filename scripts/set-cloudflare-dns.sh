#!/usr/bin/env bash
# Set Cloudflare DNS automation vars in OnLead env (production).
set -euo pipefail
ENV_FILE="${1:-/opt/onlead/.env.prod}"
TOKEN="${2:-}"
ZONE_ID="${3:-4dd89c2f20fa46d1c4cdbe47eaf7d0a0}"
if [[ -z "$TOKEN" ]]; then
  echo "Usage: $0 [env-file] [cloudflare-api-token] [zone-id]" >&2
  exit 1
fi
touch "$ENV_FILE"
tmp="$(mktemp)"
grep -vE '^(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ZONE_ID|LANDING_DNS_ZONES|LANDING_DNS_TARGET|LANDING_DNS_PROXIED|LANDING_DNS_ENABLED)=' "$ENV_FILE" > "$tmp" || true
{
  printf 'CLOUDFLARE_API_TOKEN=%s\n' "$TOKEN"
  printf 'CLOUDFLARE_ZONE_ID=%s\n' "$ZONE_ID"
  printf 'LANDING_DNS_ZONES=m360-ural.online\n'
  printf 'LANDING_DNS_TARGET=66.151.42.48\n'
  printf 'LANDING_DNS_PROXIED=1\n'
  printf 'LANDING_DNS_ENABLED=1\n'
} >> "$tmp"
mv "$tmp" "$ENV_FILE"
echo "==> Cloudflare DNS vars set in $ENV_FILE"
