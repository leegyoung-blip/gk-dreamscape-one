# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8A

## Real NOVA generation-path discovery — not a generator or approval

**Development outcome:** A reproducible, local, read-only scan of the complete checkout for candidate text-generation code paths. The currently supplied historical source archives contain Mathematics method selection and staff preview services, but do **not** establish an actual NOVA Mathematics teaching-explanation generator. This source limitation is explicit: it does **not** establish that the live repository has no generator.

### What the scan does

- Searches actual repository source under `app/api`, `app`, `lib`, `components`, `src`, `pages/api`, and `server` (where present).
- Looks for likely model-provider calls and named explanation/generation routes, alongside evidence of staff guard calls. A guard appearing in the same file is only a **hint**, not an authorisation proof.
- Lists candidate **relative repository paths** and static signal IDs only. **No source snippets**, prompts, stored questions, answers, request bodies, passwords, URLs with parameters, environment variables, tokens or user data.
- Ignores node_modules, generated/build folders, test fixtures, backup files and symbolic links. Oversized or unreadable files are counted as scan limitations.
- Never imports or executes repository source code. Makes no network, database or API requests. Creates no files itself; a PowerShell redirect can create a local report.

**Every outcome is blocked for actual capture until manual code inspection and authorisation.** Even a candidate with a staff guard cannot pass security, correctness, method eligibility or real-output provenance requirements by static scanning.

### Run locally

```powershell
Set-Location "C:\Users\leegy\gk-design-world"
node --test tests/phase4e2b8c2d8-generator-path-audit.test.cjs
if ($LASTEXITCODE -ne 0) { throw "8C-2D.8A audit tests failed" }

# Report is created on your Desktop, outside Git:
$report = Join-Path ([Environment]::GetFolderPath('Desktop')) 'DREAMSCAPE_8C2D8_GENERATOR_PATH_AUDIT.json'
node scripts/phase4e2b8c2d8-generator-path-audit.cjs --root (Get-Location).Path | Set-Content -Path $report -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw 'Generator path audit failed' }
Write-Host "Audit report: $report"
```

The report will always contain `captureReadiness: "BLOCKED_NOT_VERIFIED"`. If `generationPathAssessment` is `CANDIDATES_REQUIRE_MANUAL_CODE_REVIEW`, inspect the listed source paths to verify: provider invocation, the authorised staff-only route, question/version provenance, prompts/output isolation, no learner-facing access, and no answer key exposure. If it says `NO_PROVIDER_CALL_FOUND_IN_SCANNED_SCOPE`, inspect unscanned locations or identify the real provider/wrapper; do **not** fabricate a NOVA generation result.

### Next implementation decision

1. **Existing generator verified:** prepare 8C-2D.8B, a private, explicitly staff-authorised capture adapter reusing that generator; secure by default, no learner release, no audit writes. Send candidate source files for review (do not upload secrets). Then actual captures can be stored outside Git and checked through the existing 8C-2D.7 manifest and hash validator.
2. **No generator verified:** explicitly mark `ACTUAL_NOVA_GENERATOR_PATH_NOT_YET_AVAILABLE`. The next development subphase must implement/validate an authorised explanation generator separately, with provider and policy decisions made before any real captures. Do not label authored synthetic explanations as generated outputs.

### Later beta gates — deferred, not passed

The user's decision is to defer live Google-sign-in tests until final beta readiness. Before any write-capable staff review submissions or learner-facing activation, complete: ordinary-user and admin/curriculum-lead access testing; version/fingerprint freshness; audit RPC write-path governance under controlled authorisation; independent mathematical/educator review; actual rendered device checks; explicit method activation and release approvals.

### Relationship to earlier work

- 8C-2D.1–.6: mathematical synthetic coverage, authored explanations and teacher-review preparation.
- 8C-2D.7: private SHA-256 evidence intake for **real** NOVA outputs (currently zero), never an output generator.
- 8C-2D.8A: discovery only, no real generation or capture claims.

**No Supabase SQL, new routes, provider dependencies, environment variables, production selection changes, or pupil-facing changes are included in this phase.**
