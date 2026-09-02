#!/usr/bin/env bash
# Overwrite the live SQLite file from an offsite copy. Destructive.
# Usage: RESTORE_CONFIRM=YES bash scripts/restore-store.sh [path-to-sqlite]
set -euo pipefail
if [[ "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "This replaces /app/data/onlead.sqlite inside onlead-app." >&2
  echo "Default source: newest /opt/onlead/backups/sqlite-*.sqlite" >&2
  echo "Run: RESTORE_CONFIRM=YES bash scripts/restore-store.sh [file]" >&2
  exit 1
fi
SRC="${1:-}"
if [[ -z "$SRC" ]]; then
  SRC="$(ls -1t /opt/onlead/backups/sqlite-*.sqlite 2>/dev/null | head -1 || true)"
fi
if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "No sqlite backup found" >&2
  exit 1
fi
echo "==> Restoring $SRC into onlead-app"
docker stop onlead-app
docker cp "$SRC" onlead-app:/app/data/onlead.sqlite
json="${SRC/sqlite-/store-}"
json="${json%.sqlite}.json"
if [[ -f "$json" ]]; then
  docker cp "$json" onlead-app:/app/data/store.json
  echo "==> Also restored $(basename "$json")"
fi
docker start onlead-app
echo "==> Container started. Check https://onlead.m360-ural.online/api/health"
