# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.4
## Teaching Quality Decision Framework (offline, no release)

**Status:** Framework implemented. Human educator evaluations remain **PENDING**. No specialist is approved, activated, ranked by 4C, or released to learners.

### Purpose

Make consistent, reviewable **provisional** judgments about whether each inactive specialist teaching method is a useful primary explanation, a supporting explanation, or an unnecessary addition for the six **synthetic** same-question comparisons produced by Phase 8C-2D.3.

This stage does **not** compare genuine NOVA-generated explanations with live incumbent 4C explanations. Those are separate beta prerequisites. The six reference pairs were independently authored as examples, not produced or scored by NOVA. A high automated score cannot establish an educational advantage, teacher identity, or learning outcomes.

### Inputs — reuse existing Phase 8C-2D.3 files

- `tests/fixtures/phase4e2b8c2d3-paired-explanations.json` — six reference pairs, specialist/incumbent ID, A/B presentation order.
- `docs/phase4e2b8c2d3-educator-scoring-template.csv` — **24 rows**: each of 2 reviewers (`R1`,`R2`) scores versions A and B for 6 cases.
- `docs/phase4e2b8c2d3-method-role-template.csv` — **12 rows**: each of 2 reviewers makes one specialist-role proposal for each case.
- `docs/PHASE_8C2D3_PEDAGOGICAL_COMPARISON.md` — educator-facing paired cards and rubric.

No existing files are replaced. The checker reads the prior phase's files and performs no writes. The A/B order is read from the actual paired fixture rather than assumed. Teachers must *not* overwrite the fixtures to mark an approval.

### Educator-review procedure

1. Give each educator the paired cards as versions A and B, without revealing which is the specialist. Do not ask the two educators to consult each other before their initial ratings. `R1` and `R2` are review-slot labels **only**; identity and independence are not cryptographically verified.
2. On the scoring CSV, give **both variants** an integer `0`, `1`, `2`, or `3` for all six rubric dimensions. Use `human_review_status=COMPLETE` **only** when both ratings, the hard-stop field and meaningful observations are filled. Until then leave `PENDING`.
3. Set `hard_stop_yes_no=yes` with a clear `hard_stop_reason` for wrong mathematics, misleading models, unsupported assumptions, or ambiguity that can alter the solution. With `no`, leave its reason empty. A hard stop always overrides the numerical scores.
4. Record at least one concrete strength and concern for **each** variant in `specific_strength` and `specific_concern`; an explicit, explained absence of concern is acceptable. Do not include child data, login tokens or answer keys.
5. For each case, independently propose `primary`, `supporting`, `not_warranted`, or `undecided` in the method-role CSV. The `reasoning_with_example` and `complexity_or_visual_tradeoff` cells must describe the actual problem and a genuine trade-off. **Leave `approval_status=PENDING` in every row**; this file cannot grant approvals.
6. After both reviewers finish, run the checker. Any disagreement, mathematical problem or missing evidence must be adjudicated by people before a provisional recommendation is considered.

### Advisory quality screen (not beta policy)

Both versions must have, from both reviewers:

- `mathematical_correctness = 3/3`.
- Every other dimension at least `2/3`.
- Total at least `15/18`.
- **No hard stop**.

These are conservative *screening thresholds proposed for internal triage*, not a proven educational benchmark or release policy. They do not supersede qualitative educator judgment.

### Decision categories

| Output status | Meaning | Action |
| --- | --- | --- |
| `AWAITING_EDUCATOR_REVIEWS` | Missing/undecided human review | Continue reviews; no decision |
| `INVALID_REVIEW_EVIDENCE` | Malformed entries, unsubstantiated role, duplicate rows, claim of `APPROVED` | Correct inputs; don't use result |
| `HARD_STOP_ADJUDICATION_REQUIRED` | An educator identified a serious mathematical/teaching issue | Resolve it before any role recommendation |
| `QUALITY_CONCERNS_REQUIRE_REVIEW` | Quality screen not met by either variant | Rewrite/re-review; do not infer specialist superiority |
| `REVIEWER_DISAGREEMENT` | R1/R2 differ on the specialist's role | Convene explicit reconciliation; preserve original ratings |
| `PRIMARY_ADVANTAGE_NOT_DEMONSTRATED` | Both proposed primary, but rubric does not support a consistent advantage | Revisit role/evidence, no primary presumption |
| `PROVISIONAL_PRIMARY_CANDIDATE` | Both propose primary and, on each reviewer's scores, specialist beats incumbent on at least one of conceptual explanation, misconception response or learner accessibility, without being worse on any of those dimensions | **Advisory only**; independently test real outputs and learners |
| `PROVISIONAL_SUPPORTING_CANDIDATE` | Both propose supporting and clear quality floor | **Advisory only** |
| `PROVISIONAL_NOT_WARRANTED_CANDIDATE` | Both propose not warranted with no quality flag | **Advisory only**; does not delete method |

These rules are *decision hygiene*: they check that scores, reasons and proposals are internally coherent. They do not certify that the educators are qualified, that instruction improves learning, or that the specialist should be activated.

### Install and run in PowerShell

Run after installing the ZIP in the actual repository:

```powershell
Set-Location 'C:\Users\leegy\gk-design-world'
node --test tests/phase4e2b8c2d4-teaching-quality-decisions.test.cjs tests/phase4e2b8c2d3-pedagogical-comparison.test.cjs tests/phase4e2b8c2d2-explanation-quality.test.cjs tests/phase4e2b8c2d1-specialist-teaching-quality.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Phase 8C-2D quality tests failed. Do not commit.' }
node scripts/phase4e2b8c2d4-teaching-quality-decisions.cjs
if ($LASTEXITCODE -ne 0) { throw 'Decision input structure invalid. Do not commit.' }
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed. Do not commit.' }
git --no-pager diff --check
```

Expected with the templates still blank:

```
Phase 4E-2B-8C-2D.4: REVIEW_EVIDENCE_INCOMPLETE
6 synthetic pairs | 6 pending | 0 need adjudication | 0 provisional only
Teaching-method approval: NONE | Learner release: DISABLED | Real NOVA output review: PENDING
```

To make the incomplete-review condition a *failing release gate*, use:

```powershell
node scripts/phase4e2b8c2d4-teaching-quality-decisions.cjs --strict-complete
```

This deliberately exits non-zero while teacher reviews remain unfinished. **Do not run `--strict-complete` as a prerequisite for committing this scaffolding**. It will only pass when every case has a clean *provisional* recommendation; even then it does not imply beta readiness.

To process separately completed copies of the worksheets, without changing the repository templates:

```powershell
node scripts/phase4e2b8c2d4-teaching-quality-decisions.cjs --scores 'C:\path\to\educator-scores.csv' --roles 'C:\path\to\method-roles.csv'
```

Use `--json` for structured console output (only case IDs, statuses, method IDs, safe codes and a fixture fingerprint; it does **not** print reviewers' free-text comments). Treat local educator sheets as confidential and do not commit them if they contain identifiable information.

### Governance / limits

- **NO** automatic 4C scores, production method catalogue changes, staff approval, Supabase writes, HTTP routes or learner release.
- Inactive specialist drafts remain inactive regardless of provisional role.
- Existing released quiz content and Gold-protected questions are untouched.
- Human review is **not completed** merely because the script runs. Reviewer account, genuine independence, sources and experience remain unverified.
- No actual NOVA output, user data or rendered math diagrams were compared; these must be validated separately.
- Live staff/regular Google OAuth tests and audit-write tests remain **deferred beta readiness gates**.
- Before beta activation, get real NOVA vs incumbent examples, appropriately sampled P3–P6 questions including hard negatives and visually dependent problems, qualified independent reviewers, agreement resolution and a controlled staff-access audit. A later release authority must explicitly approve any activation.
