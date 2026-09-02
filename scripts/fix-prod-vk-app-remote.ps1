param(
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
$script = Join-Path $PSScriptRoot "fix-prod-vk-app.sh"
& $pscp -batch -pw $Password $script "${User}@${HostName}:/tmp/fix-prod-vk-app.sh"
& $plink -batch -ssh "${User}@${HostName}" -pw $Password "chmod +x /tmp/fix-prod-vk-app.sh && sed -i 's/\r$//' /tmp/fix-prod-vk-app.sh && bash /tmp/fix-prod-vk-app.sh && cd /opt/onlead && docker compose restart app"
