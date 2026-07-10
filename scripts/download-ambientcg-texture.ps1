param(
  [Parameter(Mandatory = $true)]
  [string]$AssetId,

  [ValidateSet('1K', '2K', '4K', '8K')]
  [string]$Resolution = '4K'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $projectRoot "public/assets/textures/$AssetId"
$downloadRoot = Join-Path $projectRoot '.asset-cache/ambientcg'
$zipPath = Join-Path $downloadRoot "${AssetId}_${Resolution}-JPG.zip"
New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null
New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null

$url = "https://ambientcg.com/get?file=${AssetId}_${Resolution}-JPG.zip"
if (-not (Test-Path -LiteralPath $zipPath)) {
  Invoke-WebRequest -Uri $url -OutFile $zipPath
}

try {
  $archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
  $archive.Dispose()
}
catch {
  Remove-Item -LiteralPath $zipPath -Force
  Invoke-WebRequest -Uri $url -OutFile $zipPath
}

Expand-Archive -LiteralPath $zipPath -DestinationPath $assetRoot -Force

$files = Get-ChildItem -LiteralPath $assetRoot -File
if (-not ($files.Name -match '_Color\.jpg$') -or -not ($files.Name -match '_NormalGL\.jpg$') -or -not ($files.Name -match '_Roughness\.jpg$')) {
  throw "El paquete '$AssetId' no contiene el conjunto PBR esperado."
}

[PSCustomObject]@{
  id = $AssetId
  resolution = $Resolution
  files = $files.Count
  bytes = ($files | Measure-Object Length -Sum).Sum
  sha256 = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  license = 'CC0-1.0'
  source = "https://ambientcg.com/view?id=$AssetId"
}
