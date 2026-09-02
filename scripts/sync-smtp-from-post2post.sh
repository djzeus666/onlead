#!/usr/bin/env bash
# Copy SMTP settings from post2post into OnLead .env.prod (same mailbox).
# Does not print secret values.
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

if grep -qE '^SMTP_HOST=.+' "$ONLEAD_ENV" && grep -qE '^SMTP_PASS=.+' "$ONLEAD_ENV"; then
  echo "==> SMTP already set in OnLead env"
  exit 0
fi

find_post2post_env() {
  local f
  for f in \
    /opt/postflow/.env \
    /opt/postflow/.env.prod \
    /opt/post2post/.env \
    /opt/post2post/.env.prod \
    /root/post2post/.env.prod.m360-ural.online \
    /opt/neiro-academy/.env
  do
    if [[ -f "$f" ]] && grep -qE '^SMTP_HOST=.+' "$f" && grep -qE '^SMTP_PASS=.+' "$f"; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

P2P_ENV="$(find_post2post_env || true)"
if [[ -z "${P2P_ENV}" ]]; then
  echo "==> post2post SMTP env not found; skip mail copy" >&2
  exit 0
fi

copy_key() {
  local key="$1"
  local val
  val="$(grep "^${key}=" "$P2P_ENV" | head -1 | cut -d= -f2- || true)"
  if [[ -n "$val" ]]; then
    upsert_env "$key" "$val" "$ONLEAD_ENV"
  fi
}

copy_key SMTP_HOST
copy_key SMTP_PORT
copy_key SMTP_SECURE
copy_key SMTP_USER
copy_key SMTP_PASS
copy_key SMTP_FROM
copy_key SMTP_REPLY_TO
copy_key SUPPORT_NOTIFY_EMAIL

if ! grep -qE '^SMTP_FROM=.+' "$ONLEAD_ENV"; then
  USER_VAL="$(grep '^SMTP_USER=' "$ONLEAD_ENV" | head -1 | cut -d= -f2- || true)"
  if [[ -n "$USER_VAL" ]]; then
    upsert_env SMTP_FROM "$USER_VAL" "$ONLEAD_ENV"
  fi
fi

echo "==> Copied SMTP settings from post2post (from mailbox length $(grep '^SMTP_FROM=' "$ONLEAD_ENV" | cut -d= -f2- | wc -c))"
