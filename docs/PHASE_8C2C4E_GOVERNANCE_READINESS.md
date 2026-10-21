# DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4E
## Specialist-method security and teaching-governance readiness

**Scope:** Additive, offline verification only. This package adds a source-governance checker and regression tests. It does **not** update any production teaching code, create routes, activate methods, change scores, call Supabase, record staff decisions, or approve a beta release.

### Current defensible decision

- **Development-only, staff-advisory shadow work:** permitted to continue if the source checks, focused regressions, and full repository TypeScript check pass.
- **Enable write-capable staff review:** **NOT APPROVED**. Real authenticated ordinary-user denial, authorised staff preview, source-staleness checks, and controlled audit-recording behaviour still require runtime verification.
- **Enable specialist scoring or learner-facing teaching:** **NOT APPROVED**. The three methods are inactive drafts and lack independent teaching-quality review. The shadow comparator has no specialist score, ranking margin, selected method, or human-verification certificate.

### Verified context from prior phases (not re-tested by this script)

- A 12-question reference CSV had five selections and seven ambiguities. Preserved outcome counts are a regression baseline, **not mathematical correctness proof**.
- The production audit schema's previous **read-only configuration export** showed five audit objects, RLS protection, RPC permissions and two active append-only triggers. The offline tool does not re-query production.
- The anonymous preview request previously returned HTTP 401 / `DENIED_EXPECTED` and zero attempted writes.
- Live authenticated regular-user and staff Google OAuth session checks were **deliberately postponed** by project decision until beta readiness.

### Source checks covered

1. Required 4A/4B/4C/4D modules and audit writer are present.
2. The three specialist methods remain `draft`, have no fabricated curriculum skills and are not present in the live 4B method library.
3. The production selector does not import the inactive specialist modules.
4. Staff-side services are marked `server-only`.
5. The 4D entry point permits quiz/question IDs only; it re-resolves the authenticated source and rejects evidence from another question version.
6. The 4D result explicitly marks `humanVerified: false`, `teachingApproved: false`, `methodActivated: false`, `studentReleased: false` and `scoresModified: false`.
7. The 4D shadow service does not call Supabase write functions or the separate audit writer.
8. No unexpected imports into `app`, `components`, or other `lib` modules expose the inactive drafts or 4D/write service. Existing internal draft consumers are allowlisted.
9. The baseline count stays five selected / seven ambiguous; missing or changed files fail closed.

**Limits:** Static source checks cannot prove RLS efficacy, Google OAuth role validation, source-version atomicity, real-world teaching suitability, protection against all indirect imports, or absence of all possible exfiltration paths. `npx tsc --noEmit` and relevant runtime tests remain separate gates.

### Install

Copy the ZIP contents into the repository root, keeping their exact paths. New files:

- `scripts/phase4e2b8c2c4e-governance-readiness.cjs`
- `tests/phase4e2b8c2c4e-governance-readiness.test.cjs`
- `docs/PHASE_8C2C4E_GOVERNANCE_READINESS.md`

### Local verification — VS Code PowerShell

```powershell
Set-Location "C:\Users\leegy\gk-design-world"
$env:GIT_PAGER = "cat"
$zip = "$env:USERPROFILE\Downloads\DREAMSCAPE_4E2B_8C2C4E_GOVERNANCE_READINESS_INSTALL.zip"
Expand-Archive -LiteralPath $zip -DestinationPath (Get-Location).Path -Force

node --test tests/phase4e2b8c2c4e-governance-readiness.test.cjs
if ($LASTEXITCODE -ne 0) { throw "4E audit tests failed" }

node scripts/phase4e2b8c2c4e-governance-readiness.cjs
if ($LASTEXITCODE -ne 0) { throw "4E source-governance check blocked" }

node --test tests/phase4e2b8c2c3d-governance-regression.test.cjs tests/phase4e2b8c2c4a-staff-specialist-review.test.cjs tests/phase4e2b8c2c4b-verified-math-evidence.test.cjs tests/phase4e2b8c2c4c1-staff-confirmation-preflight.test.cjs tests/phase4e2b8c2c4d-staff-shadow-comparison.test.cjs
if ($LASTEXITCODE -ne 0) { throw "Earlier regressions failed" }

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Full TypeScript check failed" }

git --no-pager diff --check
if ($LASTEXITCODE -ne 0) { throw "Whitespace check failed" }
git --no-pager status --short
```

For structured output (prints to the terminal; no file writes):

```powershell
node scripts/phase4e2b8c2c4e-governance-readiness.cjs --json
```

**Note:** `--strict-beta` intentionally returns exit code 2 while beta-release gates are deferred. Do not use this as a normal installation success test or attempt to force it green by weakening the gates.

### Git commit — only after local checks pass

```powershell
git add scripts/phase4e2b8c2c4e-governance-readiness.cjs
git add tests/phase4e2b8c2c4e-governance-readiness.test.cjs
git add docs/PHASE_8C2C4E_GOVERNANCE_READINESS.md
git --no-pager diff --cached --name-only
git --no-pager diff --cached --check
# Confirm these are the only intended staged files before proceeding.
git commit -m "Phase 8C-2C4E specialist governance readiness audit"
git push
```

### Deferred beta-readiness gates

| Gate | Must pass before |
| --- | --- |
| Ordinary-user logged-in access denied | Enabling real staff audit submissions |
| Fresh admin / curriculum-lead access and preview verified | Enabling real staff audit submissions |
| Controlled stale-source rejection, duplicate-record handling and audit integrity | Enabling real staff audit submissions |
| Independent mathematical and instructional reviews of all three methods | Any method activation |
| Visual-case handling and answer-checked evaluation | Any method activation |
| Final end-to-end regression and production configuration review | Beta release |

These are **deferred, not passed**. For beta testing, use authorised test accounts, never paste access tokens or passwords into logs or ChatGPT, and use a clearly defined audit test protocol. The existing recorded-event table must not be treated as pedagogical approval.

### Next development track

Continue with a **staff-only pedagogical evaluation corpus**: test the three specialist methods on positive, counterexample and ambiguous questions; compare their teaching sequences and excluded cases; record reviewer findings without promoting the methods or changing the live 4C selector. The deferred runtime-security gates remain mandatory before any write-capable or learner-facing release.
