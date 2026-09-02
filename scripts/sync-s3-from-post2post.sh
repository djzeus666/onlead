#!/usr/bin/env bash
# Point OnLead S3 backup at the post2post MinIO on this VPS.
# Does not print secret values. Skips if a non-MinIO endpoint is already set.
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

current_endpoint="$(grep '^S3_BACKUP_ENDPOINT=' "$ONLEAD_ENV" | head -1 | cut -d= -f2- || true)"
if [[ -n "$current_endpoint" && "$current_endpoint" != *minio* && "$current_endpoint" != *9000* && "$current_endpoint" != *9010* ]]; then
  echo "==> S3_BACKUP_ENDPOINT already points outside MinIO; leave as-is"
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
    if [[ -f "$f" ]] && grep -qE '^MINIO_ACCESS_KEY=.+' "$f" && grep -qE '^MINIO_SECRET_KEY=.+' "$f"; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

P2P_ENV="$(find_post2post_env || true)"
if [[ -z "${P2P_ENV}" ]]; then
  echo "==> post2post MinIO env not found; skip S3 copy" >&2
  exit 0
fi

ACCESS="$(grep '^MINIO_ACCESS_KEY=' "$P2P_ENV" | head -1 | cut -d= -f2-)"
SECRET="$(grep '^MINIO_SECRET_KEY=' "$P2P_ENV" | head -1 | cut -d= -f2-)"
if [[ -z "$ACCESS" || -z "$SECRET" ]]; then
  echo "==> MinIO keys empty; skip S3 copy" >&2
  exit 0
fi

upsert_env S3_BACKUP_ACCESS_KEY "$ACCESS" "$ONLEAD_ENV"
upsert_env S3_BACKUP_SECRET_KEY "$SECRET" "$ONLEAD_ENV"
upsert_env S3_BACKUP_BUCKET onlead-backups "$ONLEAD_ENV"
upsert_env S3_BACKUP_REGION us-east-1 "$ONLEAD_ENV"
upsert_env S3_BACKUP_PREFIX onlead/ "$ONLEAD_ENV"
grep -qE '^S3_BACKUP_ENDPOINT=.+' "$ONLEAD_ENV" || upsert_env S3_BACKUP_ENDPOINT 'http://minio:9000' "$ONLEAD_ENV"
if [[ -z "$current_endpoint" || "$current_endpoint" == *minio* || "$current_endpoint" == *9000* || "$current_endpoint" == *9010* ]]; then
  upsert_env S3_BACKUP_ENDPOINT 'http://minio:9000' "$ONLEAD_ENV"
fi

echo "==> Wired S3 backup to post2post MinIO (access key length ${#ACCESS}, bucket onlead-backups)"
