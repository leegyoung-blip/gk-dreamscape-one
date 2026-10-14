# DREAMSCAPE ONE — Phase 4C-4D-2 source handoff for student-teaching integration.
# Run in PowerShell. Copies source files to a temporary folder and ZIPs them; does not modify originals.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$zip = Join-Path $root 'DREAMSCAPE_PHASE_4C-4D-3_STUDENT_TEACHING_SOURCE.zip'
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('dreamscape-4d3-sources-' + [guid]::NewGuid().ToString('N'))
$files = @(
  'hooks/useCoreMissionAccess.ts',
  'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizTypes.ts',
  'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizUtils.ts',
  'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/presentation/CoreMissionStage.tsx',
  'lib/supabase/server.ts',
  'lib/math-intelligence/teaching/contract/buildTeachingContract.ts',
  'lib/math-intelligence/teaching/contract/consumer/boundary.ts'
)
try {
  New-Item -ItemType Directory -Path $temp -Force | Out-Null
  $missing = @()
  foreach ($file in $files) {
    $src = Join-Path $root $file
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { $missing += $file; continue }
    $dest = Join-Path $temp $file
    New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
    Copy-Item -LiteralPath $src -Destination $dest
    Write-Host "Included: $file" -ForegroundColor Green
  }
  if ($missing.Count -gt 0) {
    throw ('Missing source files; ZIP not created: ' + ($missing -join ', '))
  }
  Compress-Archive -Path (Join-Path $temp '*') -DestinationPath $zip -Force
  if (-not (Test-Path -LiteralPath $zip -PathType Leaf)) { throw 'ZIP creation failed.' }
  Write-Host "ZIP created: $zip" -ForegroundColor Cyan
  explorer.exe /select,"$zip"
}
finally {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
}
