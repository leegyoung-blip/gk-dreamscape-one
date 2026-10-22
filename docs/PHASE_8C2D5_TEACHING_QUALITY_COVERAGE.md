# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.5
## Teaching Quality Coverage Expansion (synthetic/offline)

**Status:** Offline applicability-and-arithmetic case expansion implemented; independent educator review **PENDING**. This is not pedagogical approval, a new production selector, or a beta launch sign-off.

### Purpose and relationship to earlier phases

Phase 8C-2D.1 defined **18** original synthetic cases (six per specialist). Phase 8C-2D.2 authored **six complete worked teaching explanations** for selected positive cases. Phase 8C-2D.3 authored **six paired specialist/incumbent references** for human review. Phase 8C-2D.4 introduced a provisional decision framework, which **still has no completed independent educator reviews**.

Phase **8C-2D.5 adds 54 additional synthetic question-pattern cases**, not 54 additional worked teaching explanations or comparisons. The new cases are passed through the *existing inactive specialist applicability rules* and the 8C-2D.1 arithmetic witness checker. This makes the test corpus broader and explicitly enumerates gaps without inventing approved teaching quality.

### Coverage, relative to primary level

| Specialist | Supported Primary levels | Additional synthetic cases | Compatible | Excluded | Insufficient evidence |
| --- | --- | ---: | ---: | ---: | ---: |
| Equal-spacing interval counting | P3–P6 | 18 | 9 | 6 | 3 |
| Multiplicative comparison chains | P4–P6 | 18 | 9 | 6 | 3 |
| Changing ratios (before/after) | P5–P6 | 18 | 9 | 5 | 4 |
| **Total** | Nine valid level-method combinations | **54** | **27** | **17** | **10** |

The `difficultyRelativeToLevel` field is **1–5 relative to the case's Primary level**, following DREAMSCAPE's curriculum policy. It is author-assigned and has **not been independently calibrated by classroom evidence**. Each specialist has compatible examples spanning all five difficulty bands **across its supported levels**, but not at every grade individually.

See `docs/phase4e2b8c2d5-coverage-matrix.csv` for the exact per-level counts and difficulty gaps. **18 of 45 individual method×grade×difficulty positive-example cells remain untested.** This is explicitly reported as a coverage gap rather than silently marked complete. Each of the nine method×grade combinations has at least one compatible example.

### Mathematical and misconception patterns covered

- **Equal spacing:** Adjacent vs distant positions; count gaps rather than objects; straight vs circular routes; unequal gaps; unconfirmed gap length; wrong target; invalid ordinal range; unreviewed diagram.
- **Multiplicative comparison chains:** Direct and indirect multipliers; three- and four-quantity networks; consistent fractional multipliers; additive lookalikes; contradictory/disconnected comparisons; unconfirmed totals; targets outside the comparison set; diagram and invalid-ratio blockers.
- **Changing ratio:** Both groups increasing, mixed positive/negative changes, explicitly unchanged groups, ratio-unit changes, underdetermined scale, assumed invariants, invalid ratio terms, whole-object integrality, wrong goal and unreviewed visual evidence.

The checker verifies expected specialist applicability reason codes against the actual pre-existing 8C-2C.3B function, numerical witnesses for compatible cases, negative-case fail-closed behaviour, case provenance, duplicate IDs, per-method balance, valid primary levels, and grade-relative difficulty metadata.

### Important unverified areas

| Area | Status |
| --- | --- |
| Structural and arithmetic checks on new synthetic cases | **Passed locally** |
| Human-authored complete teaching explanations from 8C-2D.2 | **Six reference examples**; not expanded by this phase |
| Paired specialist versus incumbent explanations from 8C-2D.3 | **Six authored reference pairs**; teacher comparisons pending |
| 18 uncovered method×grade×difficulty combinations | **Coverage gap** |
| Real production question/answer provenance | **Not evaluated here** |
| Actual NOVA-generated teaching explanations | **Not evaluated here** |
| Drawn/rendered bar models, number lines or ratio diagrams | **Not visually inspected** |
| Independent educators, pedagogical preference, lesson efficacy | **Pending** |
| Learner comprehension and accessibility | **Not tested** |
| Authenticated staff and ordinary-user live security tests | **Deferred to beta-readiness gate** |
| Specialist method approval, activation, curriculum-skill points | **Disabled** |

A positive applicability result means **compatible for staff review**. It never means that the method is mathematically optimal, has been taught successfully, or should become a production selector candidate.

### Files

| Repository path | Type |
| --- | --- |
| `scripts/phase4e2b8c2d5-quality-coverage.cjs` | Additive offline audit script |
| `tests/fixtures/phase4e2b8c2d5-expanded-quality-cases.json` | 54 synthetic question-pattern cases |
| `tests/phase4e2b8c2d5-quality-coverage.test.cjs` | Mutation and negative regression tests |
| `docs/phase4e2b8c2d5-coverage-matrix.csv` | Generated, reproducible static coverage matrix |
| `docs/PHASE_8C2D5_TEACHING_QUALITY_COVERAGE.md` | This guide |

### Local verification (PowerShell)

```powershell
Set-Location 'C:\Users\leegy\gk-design-world'
node --test tests/phase4e2b8c2d5-quality-coverage.test.cjs tests/phase4e2b8c2d4-teaching-quality-decisions.test.cjs tests/phase4e2b8c2d3-pedagogical-comparison.test.cjs tests/phase4e2b8c2d2-explanation-quality.test.cjs tests/phase4e2b8c2d1-specialist-teaching-quality.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Offline regression failed; do not commit.' }
node scripts/phase4e2b8c2d5-quality-coverage.cjs --check-matrix
if ($LASTEXITCODE -ne 0) { throw 'Coverage matrix audit failed; do not commit.' }
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed; do not commit.' }
git --no-pager diff --check
if ($LASTEXITCODE -ne 0) { throw 'Git whitespace check failed; do not commit.' }
```

The offline evaluation creates **no Supabase tables, writes, routes or production catalogue changes**. No SQL required. All tests currently run on existing repo scripts and synthetic fixtures. `--json` prints structured details; no private production question text is added to the new casebook.

### Next recommended stage

**8C-2D.6 — Educator Review Preparation and Priority Gap Closure**: Fill the 18 missing level×difficulty cells with independent examples, select representative counterexamples for teacher review, and conduct two independent ratings of the existing six authored pairs. Keep all approvals provisional. Actual NOVA-generated explanations, rendered diagrams and live-role security checks remain separate mandatory beta-readiness gates.
