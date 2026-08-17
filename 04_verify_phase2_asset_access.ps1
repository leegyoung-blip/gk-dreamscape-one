param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path $ProjectRoot).Path

$files = @{
  helper = Join-Path $root "lib\checkAdmin.ts"
  upload = Join-Path $root "app\api\curriculum-developer\assets\upload\route.ts"
  mappings = Join-Path $root "app\api\curriculum-developer\assets\mappings\route.ts"
  operations = Join-Path $root "app\curriculum-developer\components\CurriculumOperationsView.tsx"
  assetView = Join-Path $root "app\curriculum-developer\components\AssetDeploymentView.tsx"
}

foreach ($path in $files.Values) {
  if (-not (Test-Path $path)) { throw "Missing: $path" }
}

$helper = [System.IO.File]::ReadAllText($files.helper)
$upload = [System.IO.File]::ReadAllText($files.upload)
$mappings = [System.IO.File]::ReadAllText($files.mappings)
$operations = [System.IO.File]::ReadAllText($files.operations)
$assetView = [System.IO.File]::ReadAllText($files.assetView)

$checks = @(
  @("Original admin helper preserved", $helper.Contains("export async function checkAdminFromRequest(request: Request)")),
  @("Curriculum developer helper exists", $helper.Contains("export async function checkCurriculumDeveloperFromRequest(request: Request)")),
  @("Curriculum lead role allowed", $helper.Contains('profileRole === "curriculum-lead"')),
  @("Upload route uses curriculum helper", $upload.Contains("checkCurriculumDeveloperFromRequest(request)")),
  @("Mappings route uses curriculum helper", $mappings.Contains("checkCurriculumDeveloperFromRequest(request)")),
  @("Upload size limit preserved", $upload.Contains("const MAX_FILE_BYTES = 8 * 1024 * 1024;")),
  @("Mapping QC validation preserved", $mappings.Contains('mapping.qc_status !== "PASS"')),
  @("Asset tab allows curriculum lead", $operations.Contains('(role === "admin" || role === "curriculum_lead")')),
  @("Asset deployment wording updated", $assetView.Contains("Curriculum developers only."))
)

$failed = $false
foreach ($check in $checks) {
  $name = $check[0]
  $ok = [bool]$check[1]
  if ($ok) {
    Write-Host "OK   $name" -ForegroundColor Green
  } else {
    Write-Host "FAIL $name" -ForegroundColor Red
    $failed = $true
  }
}

if ($failed) {
  throw "One or more Phase 2 verification checks failed."
}

Write-Host ""
Write-Host "PHASE 2 STATIC VERIFICATION PASSED" -ForegroundColor Cyan
