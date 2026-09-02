#!/usr/bin/env bash
# Inspect + clean safe junk on the shared VPS. Does NOT touch volumes or /opt/*/data.
set -euo pipefail

echo '========== BEFORE =========='
df -h /
echo
docker system df 2>/dev/null || true
echo

echo '========== TOP CONSUMERS =========='
du -xh --max-depth=1 /var /opt /tmp /root 2>/dev/null | sort -hr | head -40
echo
du -xh --max-depth=1 /var/lib/docker 2>/dev/null | sort -hr | head -15 || true
echo
journalctl --disk-usage 2>/dev/null || true
echo
ls -lah /tmp/*.tar.gz /tmp/onlead* 2>/dev/null || echo '(no deploy archives in /tmp)'
echo

echo '========== CLEAN =========='
# Old deploy packs
rm -fv /tmp/onlead-deploy.tar.gz /tmp/onlead-smtp.env /tmp/*.tar.gz 2>/dev/null || true

# Docker dangling images / stopped containers / build cache — keep volumes
docker container prune -f 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
docker network prune -f 2>/dev/null || true

# Apt cache
apt-get clean 2>/dev/null || true
rm -rf /var/cache/apt/archives/*.deb 2>/dev/null || true

# Journal (keep ~200M)
journalctl --vacuum-size=200M 2>/dev/null || true

# Rotated / huge logs older than 14d (not active *.log)
find /var/log -type f \( -name '*.gz' -o -name '*.1' -o -name '*.old' \) -mtime +14 -delete 2>/dev/null || true

echo
echo '========== AFTER =========='
df -h /
echo
docker system df 2>/dev/null || true
echo 'Done. Volumes and /opt/*/data untouched.'
