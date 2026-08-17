param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

function Read-NormalizedFile([string]$Path) {
  $raw = [System.IO.File]::ReadAllText($Path)
  $usesCrLf = $raw.Contains("`r`n")
  $normalized = $raw.Replace("`r`n", "`n")
  return @{
    Raw = $raw
    Text = $normalized
    UsesCrLf = $usesCrLf
  }
}

function Write-NormalizedFile(
  [string]$Path,
  [string]$Text,
  [bool]$UsesCrLf
) {
  $output = if ($UsesCrLf) {
    $Text.Replace("`n", "`r`n")
  } else {
    $Text
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $output, $utf8NoBom)
}

function Replace-Exact(
  [string]$Text,
  [string]$Old,
  [string]$New,
  [int]$ExpectedCount,
  [string]$Label
) {
  $count = 0
  $position = 0

  while ($true) {
    $index = $Text.IndexOf($Old, $position, [System.StringComparison]::Ordinal)
    if ($index -lt 0) { break }
    $count += 1
    $position = $index + $Old.Length
  }

  if ($count -eq 0 -and $Text.Contains($New)) {
    Write-Host "Already patched: $Label" -ForegroundColor DarkYellow
    return $Text
  }

  if ($count -ne $ExpectedCount) {
    throw "Patch stopped at '$Label'. Expected $ExpectedCount exact match(es), found $count. Your local file differs from the Aug 14 Curriculum Operations version; no unsafe guess was made."
  }

  Write-Host "Patched: $Label" -ForegroundColor Green
  return $Text.Replace($Old, $New)
}

$root = (Resolve-Path $ProjectRoot).Path
$opsPath = Join-Path $root "app\curriculum-developer\components\CurriculumOperationsView.tsx"
$importPath = Join-Path $root "app\curriculum-developer\components\QuizImportView.tsx"

if (-not (Test-Path $opsPath)) {
  throw "Missing: $opsPath"
}
if (-not (Test-Path $importPath)) {
  throw "Missing: $importPath"
}

$backupRoot = Join-Path $root ".phase1-curriculum-lead-backup"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

Copy-Item $opsPath (Join-Path $backupRoot "CurriculumOperationsView.tsx") -Force
Copy-Item $importPath (Join-Path $backupRoot "QuizImportView.tsx") -Force

Write-Host "Backups saved to: $backupRoot" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. CurriculumOperationsView.tsx
# ------------------------------------------------------------

$opsFile = Read-NormalizedFile $opsPath
$ops = $opsFile.Text

$ops = Replace-Exact $ops `
  '    if (!preview || role !== "admin") return;' `
  '    if (!preview || (role !== "admin" && role !== "curriculum_lead")) return;' `
  1 `
  "allow curriculum_lead to archive"

$ops = Replace-Exact $ops `
  '    if (role !== "admin") return;' `
  '    if (role !== "admin" && role !== "curriculum_lead") return;' `
  1 `
  "allow curriculum_lead to restore"

$ops = Replace-Exact $ops `
  '  const canSelect = role === "admin" && subject !== "all";' `
  '  const canSelect = (role === "admin" || role === "curriculum_lead") && subject !== "all";' `
  1 `
  "allow curriculum_lead selections"

$oldBanner = @'
      <div style={phaseBanner}>
        <strong>Phase 2 safe archive:</strong> records and student history are
        retained. Admin actions require a preview and an exact confirmation phrase.
        Curriculum leads have read-only preview access.
      </div>
'@

$newBanner = @'
      <div style={phaseBanner}>
        <strong>Safe archive:</strong> records and student history are retained.
        Admins and curriculum leads must review the impact preview and type the
        exact confirmation phrase before any archive action is applied.
      </div>
'@

$ops = Replace-Exact $ops $oldBanner $newBanner 1 "update archive permission message"

$ops = Replace-Exact $ops `
  '      {role === "admin" && subject === "all" && (' `
  '      {(role === "admin" || role === "curriculum_lead") && subject === "all" && (' `
  1 `
  "show subject-selection hint to curriculum_lead"

# Patch ONLY the TopicRow checkbox condition. The Asset Deployment admin-only
# conditions intentionally stay unchanged.
$oldTopicCheckbox = @'
    <article className="curriculum-operations-topic-row" style={topicCard}>
      {role === "admin" && (
        <input
'@

$newTopicCheckbox = @'
    <article className="curriculum-operations-topic-row" style={topicCard}>
      {(role === "admin" || role === "curriculum_lead") && (
        <input
'@

$ops = Replace-Exact $ops $oldTopicCheckbox $newTopicCheckbox 1 "show topic checkbox to curriculum_lead"

$oldRestore = @'
            const canRestore =
              role === "admin" &&
              operation.operation_type === "archive" &&
'@

$newRestore = @'
            const canRestore =
              (role === "admin" || role === "curriculum_lead") &&
              operation.operation_type === "archive" &&
'@

$ops = Replace-Exact $ops $oldRestore $newRestore 1 "allow curriculum_lead restore controls"

# Safety assertions: Asset Deployment MUST remain admin-only in Phase 1.
if (-not $ops.Contains('        {role === "admin" && (')) {
  throw "Safety check failed: the admin-only Asset Deployment tab condition was not found."
}
if (-not $ops.Contains('      ) : tab === "assets" && role === "admin" ? (')) {
  throw "Safety check failed: the admin-only Asset Deployment render condition was not found."
}

Write-NormalizedFile $opsPath $ops $opsFile.UsesCrLf

# ------------------------------------------------------------
# 2. QuizImportView.tsx
# ------------------------------------------------------------

$importFile = Read-NormalizedFile $importPath
$quizImport = $importFile.Text

$oldCanApply = @'
  const canApply =
    role === "admin" &&
    batch?.status === "ready" &&
    batch.error_row_count === 0;
'@

$newCanApply = @'
  const canApply =
    (role === "admin" || role === "curriculum_lead") &&
    batch?.status === "ready" &&
    batch.error_row_count === 0;
'@

$quizImport = Replace-Exact $quizImport $oldCanApply $newCanApply 1 "allow curriculum_lead import apply state"

$quizImport = Replace-Exact $quizImport `
  '    if (!batch || role !== "admin") return;' `
  '    if (!batch || (role !== "admin" && role !== "curriculum_lead")) return;' `
  1 `
  "allow curriculum_lead to apply import"

$oldAdminBanner = @'
          {role !== "admin" && batch.status === "ready" && (
            <div style={infoBanner}>
              Validation is complete. An admin must apply this import.
            </div>
          )}
'@

# If this block exists in the Aug 14 file, remove it. If it was already removed,
# accept that as already patched.
if ($quizImport.Contains($oldAdminBanner)) {
  $quizImport = $quizImport.Replace($oldAdminBanner, "")
  Write-Host "Patched: remove obsolete admin-only import message" -ForegroundColor Green
} elseif ($quizImport.Contains("An admin must apply this import.")) {
  throw "Found the old admin-only message in an unexpected layout. Patch stopped rather than guessing."
} else {
  Write-Host "Already patched: admin-only import message absent" -ForegroundColor DarkYellow
}

Write-NormalizedFile $importPath $quizImport $importFile.UsesCrLf

Write-Host ""
Write-Host "PHASE 1 FRONTEND PATCH COMPLETE" -ForegroundColor Cyan
Write-Host "Changed:" -ForegroundColor White
Write-Host "  app/curriculum-developer/components/CurriculumOperationsView.tsx"
Write-Host "  app/curriculum-developer/components/QuizImportView.tsx"
Write-Host ""
Write-Host "Not changed:" -ForegroundColor White
Write-Host "  AssetDeploymentView.tsx"
Write-Host "  Asset Deployment admin-only guards"
Write-Host "  public.curriculum_assert_admin()"
Write-Host ""
Write-Host "Next: run the supplied Supabase SQL, then npm run dev and test using a curriculum_lead account."
