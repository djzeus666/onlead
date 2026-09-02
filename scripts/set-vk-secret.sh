#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${1:-/opt/onlead/.env.prod}"
SECRET="${2:-}"
if [[ -z "$SECRET" ]]; then
  echo "Usage: $0 [env-file] [vk-client-secret]" >&2
  exit 1
fi
touch "$ENV_FILE"
tmp="$(mktemp)"
grep -vE '^(VK_CLIENT_SECRET|VK_APP_ID)=' "$ENV_FILE" > "$tmp" || true
printf 'VK_APP_ID=53828134\n' >> "$tmp"
printf 'VK_CLIENT_SECRET=%s\n' "$SECRET" >> "$tmp"
grep -qE '^VK_REDIRECT_URI=' "$tmp" || printf 'VK_REDIRECT_URI=https://onlead.m360-ural.online/vk-callback\n' >> "$tmp"
mv "$tmp" "$ENV_FILE"
echo "==> VK_CLIENT_SECRET set in $ENV_FILE"
