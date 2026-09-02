# Sync OnLead to the shared VPS (same host as post2post) and rebuild.
# Secrets: D:\Project\post2post\deploy.secrets.m360-ural.online.local
#   or D:\Project\on-lead\deploy.secrets.local
param(
  [string]$HostName = "66.151.42.48",
  [string]$User = "root",
  [string]$RemoteDir = "/opt/onlead",
  [string]$Password = "",
  [switch]$SkipUpload,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

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
$pscp = "C:\Program Files\PuTTY\pscp.exe"
if (-not (Test-Path $plink)) { throw "plink.exe not found" }

function Invoke-Remote([string]$Cmd) {
  & $plink -batch -ssh "$User@$HostName" -pw $Password $Cmd
  if ($LASTEXITCODE -ne 0) { throw "Remote failed: $Cmd" }
}

Write-Host "==> Ensuring $RemoteDir on $HostName"
Invoke-Remote "mkdir -p $RemoteDir/scripts $RemoteDir/infra"

if (-not $SkipUpload) {
  $archive = Join-Path $env:TEMP "onlead-deploy.tar.gz"
  if (Test-Path $archive) { Remove-Item $archive -Force }
  Write-Host "==> Packing"
  tar -czf $archive `
    --exclude=node_modules `
    --exclude=data `
    --exclude=.git `
    --exclude=.env `
    --exclude=.env.prod `
    --exclude=deploy.secrets.local `
    --exclude=next.config.ts `
    --exclude=next-env.d.ts `
    --exclude=tsconfig.json `
    --exclude=eslint.config.mjs `
    --exclude=postcss.config.mjs `
    -C $Root .
  Write-Host "==> Uploading"
  & $pscp -batch -pw $Password $archive "${User}@${HostName}:/tmp/onlead-deploy.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw "pscp upload failed" }
  Invoke-Remote "mkdir -p $RemoteDir && tar -xzf /tmp/onlead-deploy.tar.gz -C $RemoteDir && rm -f /tmp/onlead-deploy.tar.gz && chmod +x $RemoteDir/scripts/*.sh"
  $p2pEnv = "D:\Project\post2post\.env.prod.m360-ural.online"
  if (Test-Path $p2pEnv) {
    $snippet = Join-Path $env:TEMP "onlead-smtp.env"
    Get-Content $p2pEnv | Where-Object { $_ -match '^(SMTP_|SUPPORT_NOTIFY_EMAIL=)' } | Set-Content -Encoding ascii $snippet
    Write-Host "==> Uploading SMTP settings from post2post"
    & $pscp -batch -pw $Password $snippet "${User}@${HostName}:/tmp/onlead-smtp.env"
    Remove-Item $snippet -Force -ErrorAction SilentlyContinue
  }
}

if (-not $SkipBuild) {
  Write-Host "==> Build and Caddy on server"
  Invoke-Remote "sed -i 's/\r$//' $RemoteDir/scripts/*.sh 2>/dev/null; cd $RemoteDir && bash scripts/deploy-server.sh"
}

Write-Host "==> Done"
Write-Host "https://onlead.m360-ural.online"
Write-Host "Admin: https://onlead.m360-ural.online/admin"
