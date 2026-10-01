$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $projectRoot 'build\crazygames'
$releaseDir = Join-Path $projectRoot 'release'
$zipPath = Join-Path $releaseDir 'lock-master-crazygames.zip'

if (-not (Test-Path -LiteralPath (Join-Path $buildDir 'index.html'))) {
    throw 'CrazyGames build is missing. Run npm run crazygames:build first.'
}
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath }
Compress-Archive -Path (Join-Path $buildDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
Write-Output "[crazygames] package: $zipPath"
