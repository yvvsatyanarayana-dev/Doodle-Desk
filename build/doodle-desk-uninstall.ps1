param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Prepare', 'Cleanup')]
  [string]$Phase,

  [Parameter(Mandatory = $true)]
  [string]$UserDataPath,

  [Parameter(Mandatory = $true)]
  [string]$LocalDataPath,

  [Parameter(Mandatory = $true)]
  [string]$DocumentsPath,

  [Parameter(Mandatory = $true)]
  [string]$StatePath,

  [switch]$CreateBackup
)

$ErrorActionPreference = 'Stop'

function Get-NormalizedPath([string]$Path) {
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $root = [System.IO.Path]::GetPathRoot($fullPath)
  if ($fullPath.Length -gt $root.Length) {
    $fullPath = $fullPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  }
  return $fullPath
}

function Test-PathContains([string]$Parent, [string]$Child) {
  $normalizedParent = Get-NormalizedPath $Parent
  $normalizedChild = Get-NormalizedPath $Child
  $parentPrefix = $normalizedParent
  if (-not $parentPrefix.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $parentPrefix += [System.IO.Path]::DirectorySeparatorChar
  }
  return $normalizedChild.Equals($normalizedParent, [System.StringComparison]::OrdinalIgnoreCase) -or
    $normalizedChild.StartsWith($parentPrefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function Remove-Directory([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return
  }

  $normalizedPath = Get-NormalizedPath $Path
  $protectedPaths = @(
    [System.IO.Path]::GetPathRoot($normalizedPath),
    $env:USERPROFILE,
    $env:APPDATA,
    $env:LOCALAPPDATA,
    $DocumentsPath,
    $UserDataPath,
    $LocalDataPath
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($protectedPath in $protectedPaths) {
    if ($normalizedPath.Equals((Get-NormalizedPath $protectedPath), [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to recursively remove a protected folder: $normalizedPath"
    }
  }

  Remove-Item -LiteralPath $normalizedPath -Recurse -Force
  if (Test-Path -LiteralPath $normalizedPath) {
    throw "Folder still exists after removal: $normalizedPath"
  }
}

function Get-VaultPath {
  $configPath = Join-Path $UserDataPath 'config.json'
  if (Test-Path -LiteralPath $configPath) {
    $settings = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    if ($settings.vaultPath -is [string] -and -not [string]::IsNullOrWhiteSpace($settings.vaultPath)) {
      return Get-NormalizedPath $settings.vaultPath
    }
  }

  return Get-NormalizedPath (Join-Path $DocumentsPath 'Doodle Vault')
}

try {
  if ($Phase -eq 'Prepare') {
    $vaultPath = Get-VaultPath
    $state = [ordered]@{ vaultPath = $vaultPath }

    if ($CreateBackup) {
      $backupParent = Join-Path $LocalDataPath 'Doodle Desk Uninstall Backups'
      $sources = @($UserDataPath, $vaultPath) | Where-Object { Test-Path -LiteralPath $_ }
      foreach ($source in $sources) {
        if ((Test-PathContains $source $backupParent) -or (Test-PathContains $backupParent $source)) {
          $backupParent = Join-Path $DocumentsPath 'Doodle Desk Uninstall Backups'
          break
        }
      }

      foreach ($source in $sources) {
        if ((Test-PathContains $source $backupParent) -or (Test-PathContains $backupParent $source)) {
          throw "Cannot safely create a backup without placing it inside a folder scheduled for removal: $source"
        }
      }

      $backupPath = Join-Path $backupParent (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
      New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

      if (Test-Path -LiteralPath $UserDataPath) {
        Copy-Item -LiteralPath $UserDataPath -Destination (Join-Path $backupPath 'Settings') -Recurse -Force
      }
      if (Test-Path -LiteralPath $vaultPath) {
        Copy-Item -LiteralPath $vaultPath -Destination (Join-Path $backupPath 'Doodle Vault') -Recurse -Force
      }

      $state.backupPath = $backupPath
    }

    $stateDirectory = Split-Path -Parent $StatePath
    New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
    $state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StatePath -Encoding UTF8
    exit 0
  }

  if (-not (Test-Path -LiteralPath $StatePath)) {
    throw 'Uninstall state is missing; refusing to guess which vault folder to remove.'
  }
  $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
  if ($state.vaultPath -isnot [string] -or [string]::IsNullOrWhiteSpace($state.vaultPath)) {
    throw 'The saved vault path is invalid; refusing to remove an unknown folder.'
  }

  Remove-Directory $state.vaultPath
  Remove-Directory (Join-Path $LocalDataPath 'Doodle Desk')
  Remove-Directory (Join-Path $LocalDataPath 'doodle-desk-updater')
  Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
  exit 0
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
