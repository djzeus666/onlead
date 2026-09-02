# Survey + safe cleanup on OnLead VPS (no volume / data wipe).
# Secrets: deploy.secrets.local or post2post deploy.secrets.*.local
param(
  [string]$HostName = "66.151.42.48",
  [string]$User = "root",
  [string]$Password = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$secFiles = @(
  (Join-Path $Root "deploy.secrets.local"),
  "D:\Project\post2post\deploy.secrets.m360-ural.online.local"
)
foreach ($secFile in $secFiles) {
  if ($Password) { break }
  if (-not (Test-Path $secFile)) { continue }
  Get-Content $secFile | ForEach-Object {
    if ($_ -match '^PASSWORD=(.+)$') { $Password = $Matches[1].Trim() }
    if ($_ -match '^HOST=(.+)$') { $HostName = $Matches[1].Trim() }
    if ($_ -match '^USER=(.+)$') { $User = $Matches[1].Trim() }
  }
}
if (-not $Password) { throw "Set PASSWORD in deploy.secrets.local" }

$plink = "C:\Program Files\PuTTY\plink.exe"
if (-not (Test-Path $plink)) { throw "plink.exe not found" }

function Invoke-Remote([string]$Cmd) {
  & $plink -batch -ssh "$User@$HostName" -pw $Password $Cmd
  if ($LASTEXITCODE -ne 0) { throw "Remote failed: $Cmd" }
}

$survey = @'
set +e
echo "== df -h =="
df -h
echo
echo "== docker system df =="
docker system df 2>/dev/null
echo
echo "== top /var /opt /tmp =="
du -xh --max-depth=1 /var /opt /tmp 2>/dev/null | sort -hr | head -40
echo
echo "== journal =="
journalctl --disk-usage 2>/dev/null
echo
echo "== large docker images =="
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" 2>/dev/null | head -30
echo
echo "== /tmp onlead archives =="
ls -lah /tmp/onlead* 2>/dev/null
ls -lah /opt/onlead/backups 2>/dev/null | head -20
'@

Write-Host "==> Survey $User@$HostName"
Invoke-Remote $survey

if (-not $Apply) {
  Write-Host ""
  Write-Host "Dry-run only. Re-run with -Apply to clean safely."
  exit 0
}

$clean = @'
set -e
echo "== before =="
df -h / | tail -1
echo "== apt clean =="
apt-get clean 2>/dev/null || true
echo "== journal vacuum 100M / 7d =="
journalctl --vacuum-size=100M --vacuum-time=7d 2>/dev/null || true
echo "== tmp deploy archives =="
rm -f /tmp/onlead-deploy.tar.gz /tmp/onlead-smtp.env /tmp/*.tar.gz 2>/dev/null || true
find /tmp -maxdepth 1 -type f -mtime +3 -size +10M -delete 2>/dev/null || true
echo "== old compressed logs =="
find /var/log -type f \( -name '*.gz' -o -name '*.old' \) -mtime +14 -delete 2>/dev/null || true
truncate -s 0 /var/log/syslog 2>/dev/null || true
truncate -s 0 /var/log/kern.log 2>/dev/null || true
echo "== docker builder / dangling / stopped =="
docker builder prune -af 2>/dev/null || true
docker container prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true
# Unused images not attached to a running container (keeps volumes)
docker image prune -af 2>/dev/null || true
docker network prune -f 2>/dev/null || true
echo "== after =="
df -h /
echo
docker system df 2>/dev/null || true
echo "DONE (volumes and /opt/*/data untouched)"
'@

Write-Host "==> Applying safe cleanup"
Invoke-Remote $clean
Write-Host "==> Done"
