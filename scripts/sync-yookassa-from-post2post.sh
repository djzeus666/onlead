#!/usr/bin/env bash
# Copy YooKassa shop credentials from post2post PlatformConfig into OnLead .env.prod.
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

if grep -qE '^YOOKASSA_SHOP_ID=.+' "$ONLEAD_ENV" && grep -qE '^YOOKASSA_SECRET_KEY=.+' "$ONLEAD_ENV"; then
  echo "==> YooKassa keys already set in OnLead env"
  grep -q '^PAYMENTS_MODE=' "$ONLEAD_ENV" || echo 'PAYMENTS_MODE=live' >> "$ONLEAD_ENV"
  exit 0
fi

find_post2post_env() {
  local f
  for f in \
    /opt/postflow/.env \
    /opt/postflow/.env.prod \
    /opt/post2post/.env \
    /opt/post2post/.env.prod \
    /opt/neiro-academy/.env \
    /opt/neiro-academy/infra/docker/.env \
    /root/post2post/.env.prod.m360-ural.online
  do
    if [[ -f "$f" ]] && grep -q '^TOKEN_ENCRYPTION_KEY=' "$f"; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

P2P_ENV="$(find_post2post_env || true)"
if [[ -z "${P2P_ENV}" ]]; then
  echo "==> post2post env not found; skip YooKassa copy" >&2
  exit 0
fi

# Reuse plaintext keys if post2post still has them in env.
if grep -qE '^YOOKASSA_SHOP_ID=.+' "$P2P_ENV" && grep -qE '^YOOKASSA_SECRET_KEY=.+' "$P2P_ENV"; then
  SHOP="$(grep '^YOOKASSA_SHOP_ID=' "$P2P_ENV" | head -1 | cut -d= -f2-)"
  SECRET="$(grep '^YOOKASSA_SECRET_KEY=' "$P2P_ENV" | head -1 | cut -d= -f2-)"
  upsert_env PAYMENTS_MODE live "$ONLEAD_ENV"
  upsert_env YOOKASSA_SHOP_ID "$SHOP" "$ONLEAD_ENV"
  upsert_env YOOKASSA_SECRET_KEY "$SECRET" "$ONLEAD_ENV"
  echo "==> Copied YooKassa keys from post2post env (shop id length ${#SHOP})"
  exit 0
fi

PG_CONT="$(docker ps --format '{{.Names}}' | grep -E 'postgres|postflow-db' | head -1 || true)"
if [[ -z "$PG_CONT" ]]; then
  echo "==> postgres container not found; skip YooKassa copy" >&2
  exit 0
fi

ENC_KEY="$(grep '^TOKEN_ENCRYPTION_KEY=' "$P2P_ENV" | head -1 | cut -d= -f2-)"
PGUSER="$(docker exec "$PG_CONT" printenv POSTGRES_USER 2>/dev/null || echo postflow)"
PGDB="$(docker exec "$PG_CONT" printenv POSTGRES_DB 2>/dev/null || echo postflow)"

SHOP_ROW="$(docker exec "$PG_CONT" psql -U "$PGUSER" -d "$PGDB" -tAc "SELECT value FROM \"PlatformConfig\" WHERE key='YOOKASSA_SHOP_ID' LIMIT 1;" 2>/dev/null || true)"
SECRET_ROW="$(docker exec "$PG_CONT" psql -U "$PGUSER" -d "$PGDB" -tAc "SELECT value FROM \"PlatformConfig\" WHERE key='YOOKASSA_SECRET_KEY' LIMIT 1;" 2>/dev/null || true)"
VAT_ROW="$(docker exec "$PG_CONT" psql -U "$PGUSER" -d "$PGDB" -tAc "SELECT value FROM \"PlatformConfig\" WHERE key='YOOKASSA_VAT_CODE' LIMIT 1;" 2>/dev/null || true)"
TAX_ROW="$(docker exec "$PG_CONT" psql -U "$PGUSER" -d "$PGDB" -tAc "SELECT value FROM \"PlatformConfig\" WHERE key='YOOKASSA_TAX_SYSTEM_CODE' LIMIT 1;" 2>/dev/null || true)"

SHOP="$(echo -n "$SHOP_ROW" | tr -d '[:space:]')"
SECRET_ENC="$(echo -n "$SECRET_ROW" | tr -d '[:space:]')"
if [[ -z "$SHOP" || -z "$SECRET_ENC" ]]; then
  echo "==> PlatformConfig has no YooKassa keys; skip" >&2
  exit 0
fi

SECRET="$(ENC_KEY="$ENC_KEY" SECRET_ENC="$SECRET_ENC" docker run --rm -e ENC_KEY -e SECRET_ENC node:22-alpine node --input-type=module -e '
import { createDecipheriv } from "node:crypto";
const payload = process.env.SECRET_ENC || "";
const keyHex = process.env.ENC_KEY || "";
if (!payload.includes(":")) { process.stdout.write(payload); process.exit(0); }
const [ivB64, tagB64, dataB64] = payload.split(":");
const key = Buffer.from(keyHex, "hex");
const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
decipher.setAuthTag(Buffer.from(tagB64, "base64"));
process.stdout.write(Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8"));
')" || SECRET=""

if [[ -z "$SECRET" ]]; then
  echo "==> Failed to decrypt YooKassa secret; skip" >&2
  exit 0
fi

upsert_env PAYMENTS_MODE live "$ONLEAD_ENV"
upsert_env YOOKASSA_SHOP_ID "$SHOP" "$ONLEAD_ENV"
upsert_env YOOKASSA_SECRET_KEY "$SECRET" "$ONLEAD_ENV"
[[ -n "$(echo -n "$VAT_ROW" | tr -d '[:space:]')" ]] && upsert_env YOOKASSA_VAT_CODE "$(echo -n "$VAT_ROW" | tr -d '[:space:]')" "$ONLEAD_ENV"
[[ -n "$(echo -n "$TAX_ROW" | tr -d '[:space:]')" ]] && upsert_env YOOKASSA_TAX_SYSTEM_CODE "$(echo -n "$TAX_ROW" | tr -d '[:space:]')" "$ONLEAD_ENV"
echo "==> Copied YooKassa keys from post2post PlatformConfig (shop id length ${#SHOP})"
