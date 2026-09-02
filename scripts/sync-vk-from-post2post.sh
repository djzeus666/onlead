#!/usr/bin/env bash
# Copy VK app credentials from post2post into OnLead .env.prod.
set -euo pipefail
ONLEAD_ENV="${1:-/opt/onlead/.env.prod}"
touch "$ONLEAD_ENV"

upsert_env() {
  local key="$1"
  local val="$2"
  local file="$3"
  local tmp
  tmp="$(mktemp)"
  grep -vE "^${key}=" "$file" > "$tmp" || true
  printf '%s=%s\n' "$key" "$val" >> "$tmp"
  mv "$tmp" "$file"
}

find_post2post_env() {
  local f
  for f in \
    /opt/postflow/.env.prod \
    /opt/post2post/.env.prod \
    /root/post2post/.env.prod.m360-ural.online \
    /opt/postflow/.env \
    /opt/post2post/.env
  do
    if [[ -f "$f" ]] && grep -qE '^VK_CLIENT_SECRET=.+' "$f"; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

SRC="$(find_post2post_env || true)"
if [[ -z "$SRC" ]]; then
  echo "==> post2post VK env not found; skip VK copy"
  exit 0
fi

echo "==> Merging VK credentials from $(basename "$SRC")"
for key in VK_APP_ID VK_CLIENT_ID VK_CLIENT_SECRET; do
  line="$(grep -E "^${key}=" "$SRC" | tail -1 || true)"
  [[ -z "$line" ]] && continue
  val="${line#*=}"
  [[ -z "$val" ]] && continue
  case "$key" in
    VK_CLIENT_ID)
      if ! grep -qE '^VK_APP_ID=.+' "$ONLEAD_ENV"; then
        upsert_env VK_APP_ID "$val" "$ONLEAD_ENV"
      fi
      ;;
    VK_CLIENT_SECRET)
      upsert_env VK_CLIENT_SECRET "$val" "$ONLEAD_ENV"
      ;;
    VK_APP_ID)
      upsert_env VK_APP_ID "$val" "$ONLEAD_ENV"
      ;;
  esac
done

grep -qE '^VK_REDIRECT_URI=.+' "$ONLEAD_ENV" || upsert_env VK_REDIRECT_URI 'https://onlead.m360-ural.online/vk-callback' "$ONLEAD_ENV"
echo "==> VK env merged (secret not printed)"
