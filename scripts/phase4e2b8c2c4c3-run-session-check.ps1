# DREAMSCAPE ONE Phase 8C-2C.4C-3 — local interactive, read-only.
# Session access tokens are pasted only in your local terminal via masked prompt.
# Never send tokens, passwords, .env files or terminal screenshots showing tokens to ChatGPT.
param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('anonymous','regular','staff')][string]$Role,
  [string]$QuizId,
  [string]$QuestionId
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $projectRoot
$script = Join-Path $PSScriptRoot 'phase4e2b8c2c4c3-readonly-session-check.cjs'
$argsToNode = @($script, '--role', $Role)
if ($Role -eq 'staff') {
  if (-not $QuizId -or -not $QuestionId) { throw 'Staff check requires quiz ID and question ID.' }
  $argsToNode += @('--quiz-id', $QuizId, '--question-id', $QuestionId)
}
if ($Role -eq 'anonymous') {
  & node @argsToNode
} else {
  Write-Host 'Use only a test account session JWT issued for THIS Supabase project.'
  Write-Host 'The token stays local and is never written to a file.'
  $secure = Read-Host "Paste $Role access token" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $plain | & node @argsToNode
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    Remove-Variable plain, secure -ErrorAction SilentlyContinue
  }
}
if ($LASTEXITCODE -ne 0) { throw "Read-only $Role session check did not pass." }
