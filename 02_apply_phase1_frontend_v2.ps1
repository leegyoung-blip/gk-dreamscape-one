param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

function Read-TextFile([string]$Path) {
  $raw = [System.IO.File]::ReadAllText($Path)
  return @{
    Text = $raw.Replace("`r`n", "`n")
    UsesCrLf = $raw.Contains("`r`n")
  }
}

function Write-TextFile([string]$Path, [string]$Text, [bool]$UsesCrLf) {
  $output = if ($UsesCrLf) { $Text.Replace("`n", "`r`n") } else { $Text }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $output, $utf8NoBom)
}

function Replace-Literal(
  [string]$Text,
  [string]$Old,
  [string]$New,
  [string]$Label,
  [int]$ExpectedCount = 1
) {
  if ($Text.Contains($New) -and -not $Text.Contains($Old)) {
    Write-Host "Already patched: $Label" -ForegroundColor DarkYellow
    return $Text
  }

  $count = 0
  $offset = 0
  while ($true) {
    $idx = $Text.IndexOf($Old, $offset, [System.StringComparison]::Ordinal)
    if ($idx -lt 0) { break }
    $count++
    $offset = $idx + $Old.Length
  }

  if ($count -ne $ExpectedCount) {
    throw "Patch stopped at '$Label'. Expected $ExpectedCount exact match(es), found $count. No file was written."
  }

  Write-Host "Patched: $Label" -ForegroundColor Green
  return $Text.Replace($Old, $New)
}

function Replace-RegexOnce(
  [string]$Text,
  [string]$Pattern,
  [string]$Replacement,
  [string]$Label
) {
  $matches = [regex]::Matches(
    $Text,
    $Pattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($matches.Count -eq 0) {
    # Treat as already patched when the replacement's curriculum_lead marker is present
    # in the same functional area.
    if ($Text.Contains('role === "curriculum_lead"')) {
      Write-Host "No old pattern found for $Label; continuing because curriculum_lead logic is already present." -ForegroundColor DarkYellow
      return $Text
    }
    throw "Patch stopped at '$Label'. Pattern not found. No file was written."
  }

  if ($matches.Count -ne 1) {
    throw "Patch stopped at '$Label'. Expected exactly 1 targeted match, found $($matches.Count). No file was written."
  }

  Write-Host "Patched: $Label" -ForegroundColor Green
  return [regex]::Replace(
    $Text,
    $Pattern,
    $Replacement,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

$root = (Resolve-Path $ProjectRoot).Path
$opsPath = Join-Path $root "app\curriculum-developer\components\CurriculumOperationsView.tsx"
$importPath = Join-Path $root "app\curriculum-developer\components\QuizImportView.tsx"

if (-not (Test-Path $opsPath)) { throw "Missing file: $opsPath" }
if (-not (Test-Path $importPath)) { throw "Missing file: $importPath" }

# New backup folder for v2. The failed v1 patch did not write partial changes,
# but we still create a fresh backup before changing anything.
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $root ".phase1-curriculum-lead-backup-v2-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
Copy-Item $opsPath (Join-Path $backupRoot "CurriculumOperationsView.tsx") -Force
Copy-Item $importPath (Join-Path $backupRoot "QuizImportView.tsx") -Force

Write-Host "Backup created: $backupRoot" -ForegroundColor Cyan

# Read both files. We keep changes in memory until every safety check passes.
$opsFile = Read-TextFile $opsPath
$ops = $opsFile.Text

$importFile = Read-TextFile $importPath
$quizImport = $importFile.Text

# -------------------------------------------------------------------
# CurriculumOperationsView.tsx
# Only functional permission changes. NO banner/cosmetic text matching.
# -------------------------------------------------------------------

$ops = Replace-Literal `
  $ops `
  '    if (!preview || role !== "admin") return;' `
  '    if (!preview || (role !== "admin" && role !== "curriculum_lead")) return;' `
  "allow curriculum_lead to archive"

$ops = Replace-Literal `
  $ops `
  '    if (role !== "admin") return;' `
  '    if (role !== "admin" && role !== "curriculum_lead") return;' `
  "allow curriculum_lead to restore"

$ops = Replace-Literal `
  $ops `
  '  const canSelect = role === "admin" && subject !== "all";' `
  '  const canSelect = (role === "admin" || role === "curriculum_lead") && subject !== "all";' `
  "allow curriculum_lead quiz/topic selections"

# Topic checkbox:
# Anchor to the TopicRow article so we do NOT touch Asset Deployment's
# separate admin-only conditions.
$topicOld = @'
    <article className="curriculum-operations-topic-row" style={topicCard}>
      {role === "admin" && (
        <input
'@

$topicNew = @'
    <article className="curriculum-operations-topic-row" style={topicCard}>
      {(role === "admin" || role === "curriculum_lead") && (
        <input
'@

if ($ops.Contains($topicOld)) {
  $ops = $ops.Replace($topicOld, $topicNew)
  Write-Host "Patched: show topic checkbox to curriculum_lead" -ForegroundColor Green
} elseif ($ops.Contains($topicNew)) {
  Write-Host "Already patched: topic checkbox" -ForegroundColor DarkYellow
} else {
  # More tolerant fallback: only within 300 chars after the TopicRow anchor.
  $anchor = '<article className="curriculum-operations-topic-row"'
  $anchorIndex = $ops.IndexOf($anchor)
  if ($anchorIndex -lt 0) {
    throw "Patch stopped at 'topic checkbox'. TopicRow anchor not found. No file was written."
  }

  $windowLen = [Math]::Min(500, $ops.Length - $anchorIndex)
  $window = $ops.Substring($anchorIndex, $windowLen)
  $oldCond = '{role === "admin" && ('
  $newCond = '{(role === "admin" || role === "curriculum_lead") && ('

  if ($window.Contains($oldCond)) {
    $localIndex = $window.IndexOf($oldCond)
    $absolute = $anchorIndex + $localIndex
    $ops = $ops.Substring(0, $absolute) + $newCond + $ops.Substring($absolute + $oldCond.Length)
    Write-Host "Patched: show topic checkbox to curriculum_lead (tolerant match)" -ForegroundColor Green
  } elseif ($window.Contains($newCond)) {
    Write-Host "Already patched: topic checkbox" -ForegroundColor DarkYellow
  } else {
    throw "Patch stopped at 'topic checkbox'. Admin checkbox condition not found near TopicRow. No file was written."
  }
}

$restoreOld = @'
            const canRestore =
              role === "admin" &&
              operation.operation_type === "archive" &&
'@

$restoreNew = @'
            const canRestore =
              (role === "admin" || role === "curriculum_lead") &&
              operation.operation_type === "archive" &&
'@

if ($ops.Contains($restoreOld)) {
  $ops = $ops.Replace($restoreOld, $restoreNew)
  Write-Host "Patched: allow curriculum_lead restore control" -ForegroundColor Green
} elseif ($ops.Contains($restoreNew)) {
  Write-Host "Already patched: restore control" -ForegroundColor DarkYellow
} else {
  # tolerate whitespace differences
  $pattern = 'const\s+canRestore\s*=\s*role\s*===\s*"admin"\s*&&\s*operation\.operation_type\s*===\s*"archive"\s*&&'
  $replacement = 'const canRestore =`n              (role === "admin" || role === "curriculum_lead") &&`n              operation.operation_type === "archive" &&'
  $matches = [regex]::Matches($ops, $pattern)
  if ($matches.Count -eq 1) {
    $ops = [regex]::Replace($ops, $pattern, $replacement, 1)
    Write-Host "Patched: allow curriculum_lead restore control (tolerant match)" -ForegroundColor Green
  } elseif ($matches.Count -eq 0 -and $ops.Contains('(role === "admin" || role === "curriculum_lead")')) {
    Write-Host "Restore control appears already patched." -ForegroundColor DarkYellow
  } else {
    throw "Patch stopped at 'restore control'. Could not identify one safe target. No file was written."
  }
}

# -------------------------------------------------------------------
# QuizImportView.tsx
# -------------------------------------------------------------------

$canApplyOld = @'
  const canApply =
    role === "admin" &&
    batch?.status === "ready" &&
    batch.error_row_count === 0;
'@

$canApplyNew = @'
  const canApply =
    (role === "admin" || role === "curriculum_lead") &&
    batch?.status === "ready" &&
    batch.error_row_count === 0;
'@

if ($quizImport.Contains($canApplyOld)) {
  $quizImport = $quizImport.Replace($canApplyOld, $canApplyNew)
  Write-Host "Patched: allow curriculum_lead import Apply button" -ForegroundColor Green
} elseif ($quizImport.Contains($canApplyNew)) {
  Write-Host "Already patched: import Apply button" -ForegroundColor DarkYellow
} else {
  $pattern = 'const\s+canApply\s*=\s*role\s*===\s*"admin"\s*&&\s*batch\?\.status\s*===\s*"ready"\s*&&\s*batch\.error_row_count\s*===\s*0;'
  $replacement = 'const canApply =`n    (role === "admin" || role === "curriculum_lead") &&`n    batch?.status === "ready" &&`n    batch.error_row_count === 0;'
  $matches = [regex]::Matches($quizImport, $pattern)
  if ($matches.Count -eq 1) {
    $quizImport = [regex]::Replace($quizImport, $pattern, $replacement, 1)
    Write-Host "Patched: allow curriculum_lead import Apply button (tolerant match)" -ForegroundColor Green
  } elseif ($matches.Count -eq 0 -and $quizImport.Contains('(role === "admin" || role === "curriculum_lead")')) {
    Write-Host "Import Apply logic appears already patched." -ForegroundColor DarkYellow
  } else {
    throw "Patch stopped at 'import Apply button'. Could not identify one safe target. No file was written."
  }
}

$quizImport = Replace-Literal `
  $quizImport `
  '    if (!batch || role !== "admin") return;' `
  '    if (!batch || (role !== "admin" && role !== "curriculum_lead")) return;' `
  "allow curriculum_lead to execute validated import"

# Remove only the obsolete informational sentence if present.
# Cosmetic/layout differences no longer stop the patch.
$quizImport = $quizImport.Replace(
  'Validation is complete. An admin must apply this import.',
  'Validation is complete. An admin or curriculum lead may apply this import.'
)

# -------------------------------------------------------------------
# Safety checks BEFORE writing
# -------------------------------------------------------------------

# Ensure Phase 1 did not unlock Asset Deployment.
$assetAdminChecks = 0
if ($ops.Contains('{role === "admin" && (')) { $assetAdminChecks++ }
if ($ops.Contains('tab === "assets" && role === "admin"')) { $assetAdminChecks++ }

if ($assetAdminChecks -lt 2) {
  throw "Safety check failed: Asset Deployment no longer appears to have both admin-only guards. No file was written."
}

# Ensure expected curriculum_lead logic now exists.
$requiredOpsMarkers = @(
  'if (!preview || (role !== "admin" && role !== "curriculum_lead")) return;',
  'if (role !== "admin" && role !== "curriculum_lead") return;',
  'const canSelect = (role === "admin" || role === "curriculum_lead") && subject !== "all";'
)

foreach ($marker in $requiredOpsMarkers) {
  if (-not $ops.Contains($marker)) {
    throw "Verification failed for CurriculumOperationsView.tsx. Missing marker: $marker. No file was written."
  }
}

$requiredImportMarkers = @(
  'role === "curriculum_lead"',
  'if (!batch || (role !== "admin" && role !== "curriculum_lead")) return;'
)

foreach ($marker in $requiredImportMarkers) {
  if (-not $quizImport.Contains($marker)) {
    throw "Verification failed for QuizImportView.tsx. Missing marker: $marker. No file was written."
  }
}

# -------------------------------------------------------------------
# All checks passed. Write both files now.
# -------------------------------------------------------------------

Write-TextFile $opsPath $ops $opsFile.UsesCrLf
Write-TextFile $importPath $quizImport $importFile.UsesCrLf

Write-Host ""
Write-Host "PHASE 1 FRONTEND PATCH V2 COMPLETE" -ForegroundColor Cyan
Write-Host ""
Write-Host "Updated:" -ForegroundColor White
Write-Host "  app/curriculum-developer/components/CurriculumOperationsView.tsx"
Write-Host "  app/curriculum-developer/components/QuizImportView.tsx"
Write-Host ""
Write-Host "Still Admin-only (intentionally):" -ForegroundColor White
Write-Host "  Asset Deployment"
Write-Host ""
Write-Host "Next:" -ForegroundColor White
Write-Host "  1. npm run dev"
Write-Host "  2. Sign in as curriculum_lead"
Write-Host "  3. Test archive -> restore -> CSV validate/apply"
