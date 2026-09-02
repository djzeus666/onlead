#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${1:-/opt/onlead/.env.prod}"
STORE="${2:-/opt/onlead/data/store.json}"

echo "==> ENV"
grep '^VK_APP' "$ENV_FILE" || true
grep '^VK_REDIRECT' "$ENV_FILE" || true

if [[ -f "$STORE" ]]; then
  echo "==> store vkAppId before"
  node -e "const s=require(process.argv[1]); console.log(s.settings?.vkAppId||'(empty)')" "$STORE"
  node -e "
const fs=require('fs');
const p=process.argv[1];
const s=JSON.parse(fs.readFileSync(p,'utf8'));
let changed=false;
if (s.settings?.vkAppId==='5530956'||s.settings?.vkAppId===5530956){
  s.settings.vkAppId='54690675';
  changed=true;
}
if(changed){
  fs.writeFileSync(p, JSON.stringify(s,null,2));
  console.log('==> migrated store vkAppId to 54690675');
} else {
  console.log('==> store vkAppId unchanged:', s.settings?.vkAppId||'(empty)');
}
" "$STORE"
fi
