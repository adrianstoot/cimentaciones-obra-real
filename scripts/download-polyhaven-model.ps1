param(
  [Parameter(Mandatory = $true)]
  [string]$AssetId,

  [ValidateSet('1k', '2k', '4k', '8k')]
  [string]$Resolution = '2k',

  [string]$Destination = 'public/assets/props'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destinationRoot = Join-Path $projectRoot $Destination
$assetRoot = Join-Path $destinationRoot $AssetId
$sourceRoot = Join-Path $assetRoot '_source'
New-Item -ItemType Directory -Path $sourceRoot -Force | Out-Null

$files = Invoke-RestMethod -Uri "https://api.polyhaven.com/files/$AssetId"
$entry = $files.gltf.$Resolution.gltf
if (-not $entry) {
  throw "Poly Haven no ofrece glTF $Resolution para '$AssetId'."
}

function Receive-VerifiedFile {
  param(
    [string]$Url,
    [string]$Target,
    [string]$ExpectedMd5
  )

  $directory = Split-Path -Parent $Target
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  if (-not (Test-Path -LiteralPath $Target)) {
    Invoke-WebRequest -Uri $Url -OutFile $Target
  }

  $actual = (Get-FileHash -LiteralPath $Target -Algorithm MD5).Hash.ToLowerInvariant()
  if ($actual -ne $ExpectedMd5.ToLowerInvariant()) {
    # Un proceso interrumpido puede dejar una descarga parcial. Solo se borra
    # el archivo exacto ya validado como incorrecto y se intenta una vez más.
    Remove-Item -LiteralPath $Target -Force
    Invoke-WebRequest -Uri $Url -OutFile $Target
    $actual = (Get-FileHash -LiteralPath $Target -Algorithm MD5).Hash.ToLowerInvariant()
  }
  if ($actual -ne $ExpectedMd5.ToLowerInvariant()) {
    throw "MD5 incorrecto para '$Target'. Esperado $ExpectedMd5, obtenido $actual."
  }
}

$mainName = [IO.Path]::GetFileName(([Uri]$entry.url).AbsolutePath)
$mainPath = Join-Path $sourceRoot $mainName
Receive-VerifiedFile -Url $entry.url -Target $mainPath -ExpectedMd5 $entry.md5

foreach ($dependency in $entry.include.PSObject.Properties) {
  $relativePath = $dependency.Name -replace '/', [IO.Path]::DirectorySeparatorChar
  $targetPath = Join-Path $sourceRoot $relativePath
  Receive-VerifiedFile -Url $dependency.Value.url -Target $targetPath -ExpectedMd5 $dependency.Value.md5
}

$gltfTransform = Join-Path $projectRoot 'node_modules/.bin/gltf-transform.cmd'
$outputPath = Join-Path $assetRoot "$AssetId.glb"
& $gltfTransform copy $mainPath $outputPath
if ($LASTEXITCODE -ne 0) {
  throw "glTF Transform no pudo empaquetar '$AssetId'."
}

$sha256 = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant()
[PSCustomObject]@{
  id = $AssetId
  resolution = $Resolution
  output = $outputPath
  bytes = (Get-Item -LiteralPath $outputPath).Length
  sha256 = $sha256
  license = 'CC0-1.0'
  source = "https://polyhaven.com/a/$AssetId"
}
