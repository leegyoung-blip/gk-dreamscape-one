# DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4D
## Staff-only, source-correlated specialist shadow comparison

**Status:** Additive implementation. No live routing or learner integration. No SQL.

### Files
- `lib/math/teaching/student-serving/phase4E2B8C2C4DStaffShadowComparison.server.ts` — NEW
- `tests/phase4e2b8c2c4d-staff-shadow-comparison.test.cjs` — NEW

### What it does
1. Accepts exactly an authenticated `Request` plus quizId/questionId UUIDs. Denies extra fields, including browser-generated mathematical facts, approval flags, and method IDs.
2. Reuses the staff-only source-bound corroboration service (4B), then obtains a fresh authoritative question via the existing staff resolver.
3. Rebuilds canonical question understanding, strict 4A readiness, Teaching Contract, validated consumer envelopes, 4B taxonomy and unchanged 4C method selection from that source.
4. For a single-family ambiguous question, examines ONLY inactive specialist drafts whose structure was source-correlated by 4B and matches the real gated curriculum taxonomy.
5. Infers only three narrowly constrained text patterns, then calls the existing pure 3C shadow comparator with genuine ranked 4C candidates.
6. Re-reads the staff source and discards output when question version, content or status changed between reads.
7. Returns bounded comparison metadata for further staff review. Does NOT return answers, prompts, extracted facts, learner data or approval.

### Safeguards and limitations
- Source reads are NOT transactionally atomic. The same question may still change concurrently after the final check. This is a transient, **source-correlated** diagnostic, NOT a durable proof of a verified human review.
- A successful comparison is `pending_manual_review` with `humanVerified: false`, `scoresModified: false`, `persisted: false`, `methodActivated: false`, and `studentReleased: false`.
- No review-recording RPC or production scoring function is called. No public API route is created.
- The 3 inactive specialist drafts remain unregistered with the production catalogue.
- Live Google login tests were deferred at the user's request. **Before activating write-capable staff review or learner serving**, run and pass anonymous, ordinary-user and staff tests, authorisation, source freshness, database audit integrity, and full regression testing.
- The parser deliberately accepts only the already reviewed P3 equal-spacing, P5 comparison-chain and P6 changing-ratio wording. Other questions remain pending review.

### Install (VS Code PowerShell)
```powershell
Set-Location "C:\Users\leegy\gk-design-world"
$env:GIT_PAGER = "cat"
$zip = Join-Path $env:USERPROFILE "Downloads\DREAMSCAPE_4E2B_8C2C4D_STAFF_SHADOW_COMPARISON_INSTALL.zip"
Expand-Archive -LiteralPath $zip -DestinationPath (Get-Location).Path -Force

node --test tests/phase4e2b8c2c4d-staff-shadow-comparison.test.cjs tests/phase4e2b8c2c3c-shadow-ranking-comparison.test.cjs tests/phase4e2b8c2c4b-verified-math-evidence.test.cjs tests/phase4e2b8c2c3d-governance-regression.test.cjs
if ($LASTEXITCODE -ne 0) { throw "Phase 4D focused tests failed. Do not commit." }

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Repository TypeScript check failed. Do not commit." }

git --no-pager diff --check
if ($LASTEXITCODE -ne 0) { throw "Git diff check failed. Do not commit." }

git --no-pager status --short
```

### Commit only the two new files after tests pass
```powershell
git add lib/math/teaching/student-serving/phase4E2B8C2C4DStaffShadowComparison.server.ts
git add tests/phase4e2b8c2c4d-staff-shadow-comparison.test.cjs
git --no-pager diff --cached --name-only
git --no-pager diff --cached --check
# Check that only these 2 new files are staged.
git commit -m "Phase 8C-2C4D staff-only specialist shadow comparison"
git push
```

### Local verification notes
- 19/19 new 4D tests passed.
- 57/57 prior 3C/4B tests passed.
- 21/21 prior 3D governance tests passed.
- 97/97 focused tests in those completed runs.
- Full TypeScript check was NOT verifiable in the incomplete extracted snapshot, which lacks preexisting source modules; the full user repository is the acceptance gate.
- No live authenticated user/session or Supabase write test performed.

### What comes next
Phase 8C-2C.4E: beta-release security/teaching governance readiness, including deferred authenticated session testing before activating write-capable routes and any learner-facing release.
