#!/usr/bin/env bash
# Attach onlead-app to the MinIO Docker network and point S3_BACKUP_ENDPOINT at a reachable host.
set -euo pipefail
ONLEAD_ENV="${1:-/opt/onlead/.env.prod}"

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

if ! docker inspect onlead-app >/dev/null 2>&1; then
  echo "==> onlead-app not running; skip MinIO network join" >&2
  exit 0
fi

MINIO_C="$(docker ps --format '{{.Names}}' | grep -E '[Mm]inio' | grep -viE 'mc|init|client' | head -1 || true)"
if [[ -z "$MINIO_C" ]]; then
  echo "==> MinIO container not found; skip network join" >&2
  exit 0
fi

NET="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$MINIO_C" \
  | grep -E 'postflow|neiro' | head -1 || true)"
if [[ -z "$NET" ]]; then
  NET="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$MINIO_C" | head -1 || true)"
fi
if [[ -z "$NET" ]]; then
  echo "==> MinIO has no docker network; skip" >&2
  exit 0
fi

docker network connect "$NET" onlead-app 2>/dev/null || true

HOST="$(docker inspect -f '{{range $n, $c := .NetworkSettings.Networks}}{{range $c.Aliases}}{{println .}}{{end}}{{end}}' "$MINIO_C" \
  | grep -x minio | head -1 || true)"
if [[ -z "$HOST" ]]; then
  HOST="$(docker inspect -f '{{.Name}}' "$MINIO_C" | sed 's#^/##')"
fi
IP="$(docker inspect -f "{{(index .NetworkSettings.Networks \"$NET\").IPAddress}}" "$MINIO_C" 2>/dev/null || true)"

probe() {
  local url="$1"
  docker exec onlead-app node -e "fetch('${url}').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1
}

ENDPOINT=""
if [[ -n "$HOST" ]] && probe "http://${HOST}:9000/minio/health/live"; then
  ENDPOINT="http://${HOST}:9000"
elif [[ -n "$IP" ]] && probe "http://${IP}:9000/minio/health/live"; then
  ENDPOINT="http://${IP}:9000"
fi

if [[ -z "$ENDPOINT" ]]; then
  echo "==> MinIO not reachable from onlead-app on ${NET} (host=${HOST:-none})" >&2
  exit 0
fi

upsert_env S3_BACKUP_ENDPOINT "$ENDPOINT" "$ONLEAD_ENV"
echo "==> MinIO reachable at ${ENDPOINT} via ${NET}"
