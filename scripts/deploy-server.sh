#!/usr/bin/env bash
# Deploy OnLead on the shared VPS (Caddy already owns :80/:443).
# Run from /opt/onlead on the server.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
DOMAIN="${ONLEAD_DOMAIN:-onlead.m360-ural.online}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> Creating $ENV_FILE"
  KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null \
    || openssl rand -hex 32)"
  ADMIN_PASS="$(node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))" 2>/dev/null \
    || openssl rand -hex 10)"
  cat > "$ENV_FILE" <<EOF
PORT=4173
PUBLIC_URL=https://onlead.m360-ural.online
TOKEN_ENCRYPTION_KEY=${KEY}
ADMIN_EMAIL=admin@onlead.local
ADMIN_PASSWORD=${ADMIN_PASS}
VK_APP_ID=5530956
VK_REDIRECT_URI=https://oauth.vk.com/blank.html
VK_MESSAGES_APP_ID=6463690
TELEGRAM_LIVE=1
EOF
  echo "==> New ADMIN_PASSWORD written to $ENV_FILE — save it now."
else
  grep -q '^PUBLIC_URL=' "$ENV_FILE" || echo 'PUBLIC_URL=https://onlead.m360-ural.online' >> "$ENV_FILE"
  grep -q '^VK_APP_ID=' "$ENV_FILE" || echo 'VK_APP_ID=5530956' >> "$ENV_FILE"
  grep -q '^VK_REDIRECT_URI=' "$ENV_FILE" || echo 'VK_REDIRECT_URI=https://oauth.vk.com/blank.html' >> "$ENV_FILE"
  grep -q '^VK_MESSAGES_APP_ID=' "$ENV_FILE" || echo 'VK_MESSAGES_APP_ID=6463690' >> "$ENV_FILE"
  if grep -qE '^VK_REDIRECT_URI=https://onlead' "$ENV_FILE"; then
    sed -i 's|^VK_REDIRECT_URI=.*|VK_REDIRECT_URI=https://oauth.vk.com/blank.html|' "$ENV_FILE"
    echo "==> Migrated VK redirect → oauth.vk.com/blank.html (online-lead.ru style)"
  fi
  if grep -qE '^VK_REDIRECT_URI=https://oauth\.vk\.ru/blank\.html' "$ENV_FILE"; then
    sed -i 's|^VK_REDIRECT_URI=.*|VK_REDIRECT_URI=https://oauth.vk.com/blank.html|' "$ENV_FILE"
    echo "==> Migrated VK redirect vk.ru → oauth.vk.com"
  fi
  if grep -qE '^VK_APP_ID=(53828134|54690675)' "$ENV_FILE"; then
    sed -i 's|^VK_APP_ID=.*|VK_APP_ID=5530956|' "$ENV_FILE"
    echo "==> Migrated VK_APP_ID → 5530956"
  fi
  if grep -q '^TELEGRAM_LIVE=' "$ENV_FILE"; then
    sed -i 's/^TELEGRAM_LIVE=.*/TELEGRAM_LIVE=1/' "$ENV_FILE"
  else
    echo 'TELEGRAM_LIVE=1' >> "$ENV_FILE"
  fi
fi
if [[ -f /tmp/onlead-smtp.env ]]; then
  echo "==> Merging SMTP from post2post snippet"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    case "$key" in
      SMTP_*|SUPPORT_NOTIFY_EMAIL) ;;
      *) continue ;;
    esac
    tmp="$(mktemp)"
    grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
    printf '%s=%s\n' "$key" "$val" >> "$tmp"
    mv "$tmp" "$ENV_FILE"
  done < /tmp/onlead-smtp.env
  rm -f /tmp/onlead-smtp.env
fi
sed -i 's/\r$//' "$ENV_FILE" || true
chmod +x "$ROOT/scripts/"*.sh || true
mkdir -p /opt/onlead/backups
bash "$ROOT/scripts/sync-yookassa-from-post2post.sh" "$ENV_FILE" || true
bash "$ROOT/scripts/sync-smtp-from-post2post.sh" "$ENV_FILE" || true
bash "$ROOT/scripts/sync-vk-from-post2post.sh" "$ENV_FILE" || true
bash "$ROOT/scripts/sync-s3-from-post2post.sh" "$ENV_FILE" || true
sed -i 's/\r$//' "$ENV_FILE" || true

COMPOSE=(docker compose -f infra/docker-compose.yml --env-file "$ENV_FILE")

echo "==> Building and starting OnLead"
"${COMPOSE[@]}" up -d --build --remove-orphans
bash "$ROOT/scripts/connect-minio-network.sh" "$ENV_FILE" || true
FILE_EP="$(grep '^S3_BACKUP_ENDPOINT=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
CONT_EP="$(docker exec onlead-app printenv S3_BACKUP_ENDPOINT 2>/dev/null || true)"
if [[ -n "$FILE_EP" && "$FILE_EP" != "$CONT_EP" ]]; then
  echo "==> Refreshing container env for S3 endpoint"
  "${COMPOSE[@]}" up -d
  bash "$ROOT/scripts/connect-minio-network.sh" "$ENV_FILE" || true
fi

CADDY_FILE=/opt/neiro-academy/infra/caddy/Caddyfile
if [[ -f "$CADDY_FILE" ]]; then
  if ! grep -q "$DOMAIN" "$CADDY_FILE"; then
    echo "==> Adding $DOMAIN to Caddyfile"
    cp "$CADDY_FILE" "$CADDY_FILE.bak.onlead.$(date +%s)"
    cat >> "$CADDY_FILE" <<EOF

# OnLead staging
${DOMAIN} {
	encode gzip
	reverse_proxy onlead:4173
}
EOF
  fi
  echo "==> Reloading Caddy"
  docker exec neiro-caddy caddy reload --config /etc/caddy/Caddyfile \
    || docker restart neiro-caddy
  bash "$ROOT/scripts/patch-caddy-landing-hosts.sh" || true
fi

echo "==> Status"
"${COMPOSE[@]}" ps
echo "Waiting for health..."
for i in $(seq 1 30); do
  if docker exec onlead-app node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    docker exec onlead-app node --input-type=module -e "import { runBackup } from './server/backup.mjs'; const r = runBackup({ force: true }); console.log('backup', JSON.stringify(r));" >/dev/null 2>&1 || true
    echo "OK https://${DOMAIN}/"
    exit 0
  fi
  sleep 2
done
echo "Container started but health check timed out" >&2
exit 1
