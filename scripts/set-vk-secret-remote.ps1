param(
  [Parameter(Mandatory = $true)][string]$Secret,
  [string]$HostName = "66.151.42.48",
  [string]$User = "root",
  [string]$Password = ""
)
$secFiles = @(
  (Join-Path (Split-Path $PSScriptRoot -Parent) "deploy.secrets.local"),
  "D:\Project\post2post\deploy.secrets.m360-ural.online.local"
)
foreach ($secFile in $secFiles) {
  if ($Password) { break }
  if (-not (Test-Path $secFile)) { continue }
  Get-Content $secFile | ForEach-Object {
    if ($_ -match '^PASSWORD=(.+)$') { $Password = $Matches[1].Trim() }
  }
}
if (-not $Password) { throw "PASSWORD not found" }
$plink = "C:\Program Files\PuTTY\plink.exe"
$pscp = "C:\Program Files\PuTTY\pscp.exe"
$script = Join-Path $PSScriptRoot "set-vk-secret.sh"
& $pscp -batch -pw $Password $script "${User}@${HostName}:/tmp/set-vk-secret.sh"
$escaped = $Secret -replace "'", "'\\''"
& $plink -batch -ssh "${User}@${HostName}" -pw $Password "chmod +x /tmp/set-vk-secret.sh && sed -i 's/\r$//' /tmp/set-vk-secret.sh && bash /tmp/set-vk-secret.sh /opt/onlead/.env.prod '$escaped' && cd /opt/onlead && docker compose -f infra/docker-compose.yml --env-file .env.prod up -d"
