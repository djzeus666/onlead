#!/usr/bin/env bash
# Switch OnLead VK OAuth to online-lead.ru style: 5530956 + blank.html
set -euo pipefail
ENV_FILE="${1:-/opt/onlead/.env.prod}"
touch "$ENV_FILE"
tmp="$(mktemp)"
grep -vE '^(VK_APP_ID|VK_REDIRECT_URI|VK_CLIENT_SECRET)=' "$ENV_FILE" > "$tmp" || true
{
  echo 'VK_APP_ID=5530956'
  echo 'VK_REDIRECT_URI=https://oauth.vk.com/blank.html'
} >> "$tmp"
mv "$tmp" "$ENV_FILE"
echo "==> VK OAuth: 5530956 + blank.html"
