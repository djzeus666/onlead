# Upload Cloudflare API token to production .env.prod and restart OnLead.
param(
  [string]$HostName = "66.151.42.48",
  [string]$User = "root",
  [string]$Token = "",
  [string]$ZoneId = "4dd89c2f20fa46d1c4cdbe47eaf7d0a0"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Token) { throw "Pass -Token cfut_..." }

$Password = ""
$secFiles = @(
  (Join-Path $Root "deploy.secrets.local"),
  "D:\Project\post2post\deploy.secrets.m360-ural.online.local"
)
foreach ($secFile in $secFiles) {
  if (-not (Test-Path $secFile)) { continue }
  Get-Content $secFile | ForEach-Object {
    if ($_ -match '^PASSWORD=(.+)$') { $Password = $Matches[1].Trim() }
    if ($_ -match '^HOST=(.+)$') { $HostName = $Matches[1].Trim() }
    if ($_ -match '^USER=(.+)$') { $User = $Matches[1].Trim() }
  }
}
if (-not $Password) { throw "Set PASSWORD in deploy.secrets.local" }

$plink = "C:\Program Files\PuTTY\plink.exe"
$pscp = "C:\Program Files\PuTTY\pscp.exe"
if (-not (Test-Path $plink)) { throw "plink.exe not found" }

$sh = Join-Path $Root "scripts\set-cloudflare-dns.sh"
& $pscp -batch -pw $Password $sh "${User}@${HostName}:/tmp/set-cloudflare-dns.sh"
$escaped = $Token -replace "'", "'\\''"
& $plink -batch -ssh "${User}@${HostName}" -pw $Password @"
chmod +x /tmp/set-cloudflare-dns.sh && sed -i 's/\r$//' /tmp/set-cloudflare-dns.sh && bash /tmp/set-cloudflare-dns.sh /opt/onlead/.env.prod '$escaped' '$ZoneId' && cd /opt/onlead && docker compose -f infra/docker-compose.yml --env-file .env.prod up -d && docker exec onlead-app node scripts/service-audit.mjs 2>&1 | grep -E 'landing-dns|FAIL|OK '
"@
if ($LASTEXITCODE -ne 0) { throw "Remote configure failed" }
Write-Host "==> Cloudflare DNS configured on $HostName"
