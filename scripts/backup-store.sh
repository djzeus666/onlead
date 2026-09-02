#!/usr/bin/env bash
# Copy store.json inside the app volume (safe to cron hourly).
set -euo pipefail
docker exec onlead-app node --input-type=module -e "import { runBackup } from './server/backup.mjs'; const r = runBackup({ force: true }); console.log(JSON.stringify(r));"
