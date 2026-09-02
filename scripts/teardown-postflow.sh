#!/usr/bin/env bash
# Remove PostFlow from the shared VPS. Keep OnLead, Caddy, MinIO (OnLead backups), other bots.
set -euo pipefail

CADDY_FILE=/opt/neiro-academy/infra/caddy/Caddyfile
STAMP="$(date +%Y%m%d%H%M%S)"

echo "==> Backup Caddyfile and PostFlow env (root-only, not printed)"
cp -a "$CADDY_FILE" "${CADDY_FILE}.bak.postflow-removed.${STAMP}"
if [[ -f /opt/postflow/.env.prod ]]; then
  cp -a /opt/postflow/.env.prod "/root/postflow.env.prod.bak.${STAMP}"
  chmod 600 "/root/postflow.env.prod.bak.${STAMP}"
fi

echo "==> Keep MinIO for OnLead backups"
if docker inspect postflow-prod-minio-1 >/dev/null 2>&1; then
  docker update --restart=unless-stopped postflow-prod-minio-1 >/dev/null
  docker rename postflow-prod-minio-1 onlead-minio 2>/dev/null || true
fi
if docker inspect onlead-minio >/dev/null 2>&1; then
  docker update --restart=unless-stopped onlead-minio >/dev/null
fi

echo "==> Remove PostFlow containers (not MinIO)"
while read -r name; do
  [[ -z "$name" ]] && continue
  case "$name" in
    *minio*|onlead-minio) continue ;;
  esac
  echo "    rm $name"
  docker rm -f "$name" >/dev/null
done < <(docker ps -a --filter name=postflow-prod- --format '{{.Names}}')

echo "==> Remove PostFlow Postgres/Redis volumes (not MinIO data)"
docker volume rm -f postflow-prod_postflow_pg postflow-prod_postflow_redis postflow-prod_postflow_backups 2>/dev/null || true

echo "==> Drop unused PostFlow network"
docker network rm postflow-prod_default 2>/dev/null || true

echo "==> Rewrite Caddy: PostFlow hosts redirect to OnLead; keep neuro-vibe66 and onlead"
cat > "$CADDY_FILE" <<'EOF'
# neuro-vibe66.ru — HTTPS reverse proxy (Let's Encrypt auto)

# www → apex (BotFather принимает только один домен)
www.neuro-vibe66.ru {
	redir https://neuro-vibe66.ru{uri} permanent
}

neuro-vibe66.ru {
	encode gzip

	handle /v1/* {
		reverse_proxy api:3001
	}

	handle /docs* {
		reverse_proxy api:3001
	}

	handle /bot/* {
		reverse_proxy bot:3002
	}

	handle {
		reverse_proxy web:3000
	}
}

# PostFlow removed. Product hosts go to OnLead.
www.m360-ural.online, m360-ural.online {
	redir https://onlead.m360-ural.online{uri} permanent
}

# OnLead landing hosts — any PRO subdomain (*.m360-ural.online)
*.m360-ural.online {
	encode gzip
	reverse_proxy onlead:4173
}

api.m360-ural.online {
	redir https://onlead.m360-ural.online{uri} permanent
}

admin.m360-ural.online {
	redir https://onlead.m360-ural.online/admin permanent
}

onlead.m360-ural.online {
	encode gzip
	reverse_proxy onlead:4173
}
EOF

echo "==> Reload Caddy"
docker exec neiro-caddy caddy reload --config /etc/caddy/Caddyfile \
  || docker restart neiro-caddy

echo "==> Remove PostFlow images"
docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'djzeus666/p2p|postflow-prod' | while read -r img; do
  echo "    rmi $img"
  docker rmi "$img" 2>/dev/null || true
done
docker image prune -f >/dev/null || true

echo "==> Remove /opt/postflow source"
if [[ -d /opt/postflow ]]; then
  rm -rf /opt/postflow
fi

echo "==> Health checks"
docker exec onlead-app node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
echo "    onlead-app ok"
MINIO_C=onlead-minio
docker inspect onlead-minio >/dev/null 2>&1 || MINIO_C=postflow-prod-minio-1
docker exec "$MINIO_C" curl -sf http://127.0.0.1:9000/minio/health/live >/dev/null
echo "    minio ok ($MINIO_C)"
docker exec onlead-app node -e "fetch('http://minio:9000/minio/health/live').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
echo "    onlead-app reaches minio alias"

echo "==> Remaining containers"
docker ps --format '{{.Names}} {{.Status}}'
echo "==> Done"
