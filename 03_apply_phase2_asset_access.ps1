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

function Replace-Exact(
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
    throw "Patch stopped at '$Label'. Expected $ExpectedCount exact match(es), found $count. No project files were written."
  }

  Write-Host "Patched: $Label" -ForegroundColor Green
  return $Text.Replace($Old, $New)
}

$root = (Resolve-Path $ProjectRoot).Path

$checkAdminPath = Join-Path $root "lib\checkAdmin.ts"
$uploadPath = Join-Path $root "app\api\curriculum-developer\assets\upload\route.ts"
$mappingsPath = Join-Path $root "app\api\curriculum-developer\assets\mappings\route.ts"
$operationsPath = Join-Path $root "app\curriculum-developer\components\CurriculumOperationsView.tsx"
$assetViewPath = Join-Path $root "app\curriculum-developer\components\AssetDeploymentView.tsx"

$paths = @(
  $checkAdminPath,
  $uploadPath,
  $mappingsPath,
  $operationsPath,
  $assetViewPath
)

foreach ($path in $paths) {
  if (-not (Test-Path $path)) {
    throw "Missing required file: $path"
  }
}

# ---------------------------------------------------------------------------
# Read all files first. Nothing is written until ALL checks pass.
# ---------------------------------------------------------------------------

$checkAdminFile = Read-TextFile $checkAdminPath
$checkAdmin = $checkAdminFile.Text

$uploadFile = Read-TextFile $uploadPath
$upload = $uploadFile.Text

$mappingsFile = Read-TextFile $mappingsPath
$mappings = $mappingsFile.Text

$operationsFile = Read-TextFile $operationsPath
$operations = $operationsFile.Text

$assetViewFile = Read-TextFile $assetViewPath
$assetView = $assetViewFile.Text

# ---------------------------------------------------------------------------
# 1. lib/checkAdmin.ts
#
# KEEP checkAdminFromRequest unchanged.
# Add a separate curriculum-developer authorization helper.
# ---------------------------------------------------------------------------

if (-not $checkAdmin.Contains('export async function checkAdminFromRequest(request: Request)')) {
  throw "Could not find checkAdminFromRequest() in lib/checkAdmin.ts. No project files were written."
}

if (-not $checkAdmin.Contains('checkCurriculumDeveloperFromRequest')) {
  $helper = @'

function normaliseCurriculumRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

/**
 * Authorization for protected Curriculum Developer server routes.
 *
 * This deliberately does NOT replace checkAdminFromRequest().
 * Existing admin-only APIs keep their original authorization.
 *
 * Allowed here:
 * - an existing ADMIN_EMAILS administrator; or
 * - profiles.role = admin; or
 * - profiles.role = curriculum_lead
 */
export async function checkCurriculumDeveloperFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: null,
      error: "Missing auth token",
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: null,
      error: "Missing auth token",
    };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: null,
      error: "Invalid auth token",
    };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = data.user.email?.trim().toLowerCase() || "";
  const isAdminEmail =
    Boolean(userEmail) && adminEmails.includes(userEmail);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError && !isAdminEmail) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: data.user,
      error: "Could not verify curriculum developer role",
    };
  }

  const profileRole = normaliseCurriculumRole(profile?.role);
  const isAdmin = isAdminEmail || profileRole === "admin";
  const isCurriculumLead = profileRole === "curriculum-lead";
  const isCurriculumDeveloper = isAdmin || isCurriculumLead;

  return {
    isCurriculumDeveloper,
    isAdmin,
    role: isAdmin
      ? "admin"
      : isCurriculumLead
        ? "curriculum_lead"
        : profileRole || null,
    user: data.user,
    error: isCurriculumDeveloper
      ? null
      : "Not a curriculum developer",
  };
}
'@

  $checkAdmin = $checkAdmin.TrimEnd() + "`n" + $helper.TrimStart() + "`n"
  Write-Host "Patched: add checkCurriculumDeveloperFromRequest without changing admin-only helper" -ForegroundColor Green
} else {
  Write-Host "Already patched: checkCurriculumDeveloperFromRequest" -ForegroundColor DarkYellow
}

# ---------------------------------------------------------------------------
# 2. Asset upload API route
# ---------------------------------------------------------------------------

$upload = Replace-Exact `
  $upload `
  'import { checkAdminFromRequest } from "@/lib/checkAdmin";' `
  'import { checkCurriculumDeveloperFromRequest } from "@/lib/checkAdmin";' `
  "upload route authorization import"

$uploadOldGate = @'
  const access = await checkAdminFromRequest(request);
  if (!access.isAdmin) return json({ error: access.error }, 403);
'@

$uploadNewGate = @'
  const access = await checkCurriculumDeveloperFromRequest(request);
  if (!access.isCurriculumDeveloper) {
    return json({ error: access.error }, 403);
  }
'@

$upload = Replace-Exact `
  $upload `
  $uploadOldGate `
  $uploadNewGate `
  "upload route curriculum developer gate"

# ---------------------------------------------------------------------------
# 3. Asset mappings API route
# ---------------------------------------------------------------------------

$mappings = Replace-Exact `
  $mappings `
  'import { checkAdminFromRequest } from "@/lib/checkAdmin";' `
  'import { checkCurriculumDeveloperFromRequest } from "@/lib/checkAdmin";' `
  "mappings route authorization import"

$mappingsOldGate = @'
  const access = await checkAdminFromRequest(request);
  if (!access.isAdmin) return json({ error: access.error }, 403);
'@

$mappingsNewGate = @'
  const access = await checkCurriculumDeveloperFromRequest(request);
  if (!access.isCurriculumDeveloper) {
    return json({ error: access.error }, 403);
  }
'@

$mappings = Replace-Exact `
  $mappings `
  $mappingsOldGate `
  $mappingsNewGate `
  "mappings route curriculum developer gate"

# ---------------------------------------------------------------------------
# 4. Curriculum Operations UI
# Reveal Asset Deployment for BOTH allowed curriculum roles.
# ---------------------------------------------------------------------------

$assetTabOld = @'
        {role === "admin" && (
          <TabButton active={tab === "assets"} onClick={() => setTab("assets")}>
'@

$assetTabNew = @'
        {(role === "admin" || role === "curriculum_lead") && (
          <TabButton active={tab === "assets"} onClick={() => setTab("assets")}>
'@

$operations = Replace-Exact `
  $operations `
  $assetTabOld `
  $assetTabNew `
  "show Asset Deployment tab to curriculum_lead"

$operations = Replace-Exact `
  $operations `
  '      ) : tab === "assets" && role === "admin" ? (' `
  '      ) : tab === "assets" && (role === "admin" || role === "curriculum_lead") ? (' `
  "render Asset Deployment for curriculum_lead"

# ---------------------------------------------------------------------------
# 5. Asset Deployment wording
# No functional client-side role trust is introduced here; server routes enforce.
# ---------------------------------------------------------------------------

$assetView = Replace-Exact `
  $assetView `
  '<p style={eyebrow}>ADMIN DEPLOYMENT TOOL</p>' `
  '<p style={eyebrow}>CURRICULUM DEPLOYMENT TOOL</p>' `
  "update Asset Deployment heading"

$oldSecurityText = @'
        <strong>Admin only.</strong> Uploads pass through protected server routes. Deployment packages with missing files or QC failures are blocked automatically.
'@

$newSecurityText = @'
        <strong>Curriculum developers only.</strong> Admin and curriculum_lead accounts may deploy assets through protected server routes. Deployment packages with missing files or QC failures are blocked automatically.
'@

$assetView = Replace-Exact `
  $assetView `
  $oldSecurityText `
  $newSecurityText `
  "update Asset Deployment permission wording"

# ---------------------------------------------------------------------------
# Safety verification BEFORE any project file is written.
# ---------------------------------------------------------------------------

if (-not $checkAdmin.Contains('export async function checkAdminFromRequest(request: Request)')) {
  throw "Safety check failed: original checkAdminFromRequest() is missing."
}

if (-not $checkAdmin.Contains('export async function checkCurriculumDeveloperFromRequest(request: Request)')) {
  throw "Safety check failed: new curriculum-developer helper is missing."
}

if (-not $checkAdmin.Contains('profileRole === "curriculum-lead"')) {
  throw "Safety check failed: curriculum_lead profile authorization is missing."
}

if (-not $upload.Contains('checkCurriculumDeveloperFromRequest(request)')) {
  throw "Safety check failed: upload route did not receive the new authorization."
}

if (-not $mappings.Contains('checkCurriculumDeveloperFromRequest(request)')) {
  throw "Safety check failed: mappings route did not receive the new authorization."
}

if ($upload.Contains('checkAdminFromRequest(request)')) {
  throw "Safety check failed: upload route still calls the old admin-only helper."
}

if ($mappings.Contains('checkAdminFromRequest(request)')) {
  throw "Safety check failed: mappings route still calls the old admin-only helper."
}

if (-not $operations.Contains('tab === "assets" && (role === "admin" || role === "curriculum_lead")')) {
  throw "Safety check failed: Curriculum Operations Asset Deployment render gate was not updated."
}

# Keep important upload protections.
$uploadProtections = @(
  'const MAX_FILE_BYTES = 8 * 1024 * 1024;',
  'const ALLOWED_CONTENT_TYPES = new Set([',
  'if (bucket !== STORAGE_BUCKET)',
  'if (!validPath(storagePath, subject, level))',
  'upsert: true'
)
foreach ($marker in $uploadProtections) {
  if (-not $upload.Contains($marker)) {
    throw "Safety check failed: upload protection missing after patch: $marker"
  }
}

# Keep important mapping protections.
$mappingProtections = @(
  'const MAX_MAPPINGS_PER_REQUEST = 250;',
  'validateMappings(mappings, subject, level);',
  'if (subject !== "math")',
  'if (mapping.qc_status && mapping.qc_status !== "PASS")',
  'Question code mismatch'
)
foreach ($marker in $mappingProtections) {
  if (-not $mappings.Contains($marker)) {
    throw "Safety check failed: mapping protection missing after patch: $marker"
  }
}

# ---------------------------------------------------------------------------
# Everything passed. Create backup, then write all files.
# ---------------------------------------------------------------------------

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $root ".phase2-curriculum-lead-backup-$stamp"

$backupMap = @{
  $checkAdminPath = "lib\checkAdmin.ts"
  $uploadPath = "app\api\curriculum-developer\assets\upload\route.ts"
  $mappingsPath = "app\api\curriculum-developer\assets\mappings\route.ts"
  $operationsPath = "app\curriculum-developer\components\CurriculumOperationsView.tsx"
  $assetViewPath = "app\curriculum-developer\components\AssetDeploymentView.tsx"
}

foreach ($entry in $backupMap.GetEnumerator()) {
  $target = Join-Path $backupRoot $entry.Value
  $targetDir = Split-Path $target -Parent
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item $entry.Key $target -Force
}

Write-TextFile $checkAdminPath $checkAdmin $checkAdminFile.UsesCrLf
Write-TextFile $uploadPath $upload $uploadFile.UsesCrLf
Write-TextFile $mappingsPath $mappings $mappingsFile.UsesCrLf
Write-TextFile $operationsPath $operations $operationsFile.UsesCrLf
Write-TextFile $assetViewPath $assetView $assetViewFile.UsesCrLf

Write-Host ""
Write-Host "PHASE 2 ASSET ACCESS PATCH COMPLETE" -ForegroundColor Cyan
Write-Host "Backup: $backupRoot" -ForegroundColor Cyan
Write-Host ""
Write-Host "Updated:" -ForegroundColor White
Write-Host "  lib/checkAdmin.ts"
Write-Host "  app/api/curriculum-developer/assets/upload/route.ts"
Write-Host "  app/api/curriculum-developer/assets/mappings/route.ts"
Write-Host "  app/curriculum-developer/components/CurriculumOperationsView.tsx"
Write-Host "  app/curriculum-developer/components/AssetDeploymentView.tsx"
Write-Host ""
Write-Host "No Supabase SQL is required for Phase 2." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor White
Write-Host "  npm run dev"
Write-Host "  Sign in as curriculum_lead"
Write-Host "  Curriculum Developer -> Curriculum Operations -> Asset Deployment"
