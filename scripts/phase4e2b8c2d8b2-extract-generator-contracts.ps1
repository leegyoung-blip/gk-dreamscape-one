# Phase 8C-2D.8B-2: Export only the contracts needed to design the safe bridge.
# Does not execute app code, read env secrets, or alter repository files.
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\leegy\gk-design-world'
$root = (git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'Not inside a Git repository' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $env:TEMP "DREAMSCAPE_8C2D8B2_$stamp"
$zip = Join-Path ([Environment]::GetFolderPath('Desktop')) "DREAMSCAPE_8C2D8B2_CONTRACT_SOURCE_$stamp.zip"
$paths = @(
  'lib/math/teaching/student-serving/phase4E2A3StaffSourceResolver.server.ts',
  'lib/math-intelligence/MathQuestionNormalizer.ts',
  'lib/math-intelligence/MathIntelligenceTypes.ts',
  'lib/math-intelligence/MathAuthoringFingerprint.ts',
  'lib/math-intelligence/MathAuthoringProposal.ts',
  'lib/math-intelligence/MathAuthoringProposalTypes.ts',
  'lib/math-intelligence/MathTeachingVisualGenerator.ts',
  'lib/math-intelligence/MathTeachingSemanticValidator.ts',
  'lib/math-intelligence/MathTeachingSemanticTypes.ts',
  'lib/math-intelligence/MathTeachingVisualTypes.ts',
  'lib/math-intelligence/MathVisualGenerationTypes.ts',
  'components/core-math/visual-engine/MathVisualState.ts',
  'components/core-math/visual-engine/MathVisualTypes.ts',
  'lib/math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion.ts'
)
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$manifest = @()
$missing = @()
foreach ($relative in $paths) {
  $from = Join-Path $root $relative
  if (-not (Test-Path -LiteralPath $from -PathType Leaf)) {
    $missing += $relative
    Write-Warning "Missing: $relative"
    continue
  }
  $to = Join-Path $stage $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $to -Parent) | Out-Null
  Copy-Item -LiteralPath $from -Destination $to -Force
  $manifest += $relative
}
if ($manifest.Count -eq 0) { throw 'No contract files found. Nothing packaged.' }
$manifest | Set-Content -Path (Join-Path $stage 'SOURCE_MANIFEST.txt') -Encoding UTF8
$missing | Set-Content -Path (Join-Path $stage 'MISSING_PATHS.txt') -Encoding UTF8
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Write-Host "Created: $zip"
Write-Host "Included: $($manifest.Count); missing: $($missing.Count)"
Write-Host 'Review for hardcoded secrets before uploading. No .env files were collected.'
Start-Process explorer.exe -ArgumentList "/select,`"$zip`""
