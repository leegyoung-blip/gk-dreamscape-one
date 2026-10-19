# NOVA+ Intelligence Evaluation Report — Phase 2B-1A

Audit date: 2026-10-20 · HEAD `59f7def` · Audit and simulation only. No production code, Supabase objects or data were changed. No student records were accessed.

Companion files: `DECISION_RULE_INVENTORY.md`, `SCENARIO_MATRIX.md`, `scenario-results.json`.
Executable evidence: `tests/nova-plus-phase2b1-decision-audit.test.cjs`.

## 1. Headline

**NOVA+ is not yet defensibly beta-ready as a source of educational decisions.** There are two separate reasons:

1. **The core engine cannot be verified from this repository.** Mastery, confidence, status, trend, recency and decay, quiz-versus-schoolwork merging, lane selection and mission eligibility all run in Supabase RPCs. Their SQL is not in the repo, so none of them were tested (8 of 36 scenarios are NOT TESTABLE).
2. **The client layer that was tested makes some unsupported or contradictory claims.** 15 of the 28 executable scenarios fail against the expected educational interpretation. Most failures are cheap display or gating fixes, but two make explicitly false statements to families (see P0).

Clear-cut cases behave well: sustained strong, sustained weak, one weak concept among strong ones, concept dedupe and fallback exclusion, and the subject-level 5-question floor. The failures sit at the edges: small samples, borderline thresholds, time windows, and agreement between tabs.

## 2. Results

| Metric | Value |
|---|---|
| Scenarios created | **36**, covering all 12 required categories |
| PASS | **13** |
| FAIL | **15** |
| NOT TESTABLE | **8** (7 server-side RPC decisions, plus 1 conditional on an unknown server rule) |
| Executable tests | 29, all passing as characterisation tests of current behaviour |
| Full node suite | 712 / 712 pass |
| `npx tsc --noEmit` | **Fails**, but only in `lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2C3BApplicabilityReview.ts` (TS2737 BigInt literals). That file was committed by the Math workstream in `59f7def` and is unrelated to this audit. The new audit test is `.cjs` and is not type-checked by `tsc` |

**How strong the evidence is:**
- All PASS and FAIL verdicts on client rules are **production-equivalent**: the exact production source was executed.
- S18 and S19 add **static** source checks.
- No server behaviour was simulated. Server-derived values were supplied as synthetic inputs, so a PASS means "the client handles this server output correctly". It does **not** mean the server would produce that output.
- The expected interpretations are labelled expert-judgement (EJ) assumptions in the matrix.

## 3. Findings by risk

### P0: seriously misleading conclusions shown to families
| ID | Finding | Evidence |
|---|---|---|
| P0-1 | **Parent Report shows declining (and no-data) skills as "Stable".** | S11 · `ParentReportTab.tsx:1266` |
| P0-2 | **English concepts at Consolidating/Strong with *Low* server evidence confidence are shown as "Secure: Nova has enough evidence to show that this skill is secure."** This contradicts the server's own confidence label. | S31 · `english-mastery-ui.ts:134`, `MasteryMapTab.tsx:191-196` |

No privacy defects were found in this phase. Learner isolation was addressed in Phase 2A.

### P1: major unreliable or contradictory conclusions and recommendations
| ID | Finding | Evidence |
|---|---|---|
| P1-1 | **The tabs disagree about the same concept.** Strengths & Gaps, Mastery Map, Progress and Parent Report each re-gate the server `status` with different thresholds. "Gap" needs ≥6 q + spread + conf ≥35 on Strengths & Gaps, ≥5 q + ready + conf ≥55 on Parent Report, and nothing on Progress. "Secure" needs conf ≥55 only on Parent Report. `emerging` is "Needs Attention" only on Progress | S13, S14, S30, S32 |
| P1-2 | **"Needs Attention" from a single answer** on Progress (no evidence gate; `emerging` included) | S03 · `ProgressTab.tsx:161-168, 499-514` |
| P1-3 | **"Progress is happening" from 1–4 questions** on the Mastery Map (Math). "Needs More Evidence" only appears at zero questions | S02 · `MasteryMapTab.tsx:274-291, 361-368` |
| P1-4 | **Parent "strongest academic area" from any amount of evidence** (1 question is enough), while My Learning applies a 5-question floor | S04 · `ParentReportTab.tsx:220-230` |
| P1-5 | **Parent "One clear next step" can contradict Nova Recommends.** It is `recommendations[0]`, with no lane check and no open-cycle filter | S21 · `ParentReportTab.tsx:1035-1036` |
| P1-6 | **The schoolwork review gate is weaker in the UI than in the stored record.** The analyse response sends the model's raw `needs_review`, not the stored rule (mapping or extraction <0.78 forces review), so doubtful mappings start pre-included and can be committed in one click | S18 · `analyse/route.ts:1689-1693, 1876-1886`, `NovaSchoolworkUploader.tsx:221-253` |

### P2: limited usefulness, coverage or explanation quality
| ID | Finding | Evidence |
|---|---|---|
| P2-1 | Review screen weight labels disagree with the server proposal (for example "0.80" shown, 0.5 proposed); a parent concept edit unlocks "AI-checked" | S17 |
| P2-2 | "Improved / strengthened / newly secure" have no minimum evidence on Progress and Parent Report (Strengths & Gaps uses ≥4); "Newly secure" doesn't check the previous status | S09 · `ProgressTab.tsx:468-486` |
| P2-3 | Parent Report period lists (strengths, support, building) ignore the selected window while the copy says "This week…" | S25 · `ParentReportTab.tsx:934-973` |
| P2-4 | Period baselines fall back to the earliest snapshot, so a "30-day" change may span 2 days | S26 · `ProgressTab.tsx:282-304`, `ParentReportTab.tsx:162-185` |
| P2-5 | Schoolwork extraction and correctness are LLM-dependent with no temperature or seed, an env/DB-selected model and a fallback model; confidences are self-reported. Results are not reproducible | `analyse/route.ts:380-606` |
| P2-6 | Current English and Math level are inferred client-side and ignore the server `primary_level` | `english-mastery-ui.ts:45-92`, `MasteryMapTab.tsx:293-338` |
| P2-7 | The canonical-source rule differs: Progress and Parent need the exact source; the Mastery Map also accepts an empty source | `MasteryMapTab.tsx:256` vs `ProgressTab.tsx:112` |
| P2-8 | The cycle UI hard-codes 5 questions and the 5/2/70 defaults instead of the server's `cyclePayload.rules` | `NovaRecommendsTab.tsx` `CycleCard` |

### P3: can wait until after beta
- Server `rules` (`max_visible`, `focus_now_max`, …) are ignored, and the visible caps are hard-coded. Reassess always beats Stretch.
- My Learning milestones reuse the English stage names on a different scale. `MilestoneJourney` still includes Science.
- Orphaned components (root `StrengthsGapsTab.tsx`, `MyLearningTab.tsx`, `mastery/*`) and an unread sessionStorage key.
- "Observed once" is only correct if the server never tags `observation` with more than one occurrence (S33, conditional).

## 4. Top intelligence weaknesses

1. **The decision engine is unverifiable from source control.** None of the RPCs that make the actual educational judgements are versioned in the repo.
2. **There is no single shared classification of a concept.** Four tabs each re-derive strong, gap and developing from the same server status, so families can see contradictory verdicts.
3. **Small-sample claims.** Several family-facing claims ("Needs Attention", "Progress is happening", "Strengthened", "Strongest area") have no evidence floor.
4. **Displayed confidence contradicts the server's confidence** (English Low-confidence shown as secure) and hides trend direction (declines shown as "Stable").
5. **Time framing is inconsistent.** Period labels don't match the data actually used (unwindowed lists, snapshot fallback, lifetime `active_weeks`).
6. **The schoolwork evidence path depends on LLM self-confidence**, with a review gate that the UI applies more loosely than the stored record.

## 5. Recommended changes (not implemented)

**Before beta (client only, no SQL, no Math changes):**
1. P0-1: show the real trend in Parent Report ("Declining" or "Not enough data yet").
2. P0-2: require Moderate or High `evidence_confidence` before English "Secure / enough evidence". Low-confidence high stages should show as "Building – needs more evidence".
3. P1-1: put one shared, pure concept classifier in `lib/nova-plus/` (secure, confirmed gap, developing, needs evidence, with explicit floors) and use it on all four tabs. Add regression tests based on `tests/nova-plus-phase2b1-decision-audit.test.cjs`.
4. P1-2, P1-3, P1-4: apply evidence floors to "Needs Attention", "Building / progress is happening" and "Strongest area", reusing the shared classifier and the 5-question subject floor.
5. P1-5: derive Parent "next step" with the same lane and open-cycle logic as Nova Recommends, or link to Nova Recommends without naming a skill.
6. P1-6: return the stored `needs_review` value from the analyse route, and make the review screen reflect it. Show the server's proposed weight, not a recomputed label (P2-1).

**Soon after:** window the Parent lists; label baselines that are shorter than the selected period; read server `rules` for caps and cycle thresholds; add evidence floors to "improved"; remove orphaned files.

## 6. Remaining verification dependencies (smallest read-only follow-ups)

1. **Read-only function definitions.** Run `pg_get_functiondef` for the RPCs listed below and store the output in the repo as versioned read-only SQL. This turns 7 NOT TESTABLE scenarios into analysable ones, with no data access or changes.
   - `get_learning_profile_payload`, `get_nova_plus_learning_profile`, `refresh_nova_plus_learning_profile`
   - `get_nova_plus_recommendations`, `get_nova_learning_cycles`
   - `get_english_mastery_profile_for_learner`, `get_core_teaching_evidence_for_learner`
   - `commit_nova_schoolwork_review`, `refresh_learner_skill_mastery_for_skills`, `get_nova_schoolwork_evidence_summary`
   - plus any helpers they call
2. **Execute the server rules safely.** Once the definitions are available, run S10, S15, S20, S24 and S34–S36 against a *non-production* database (a Supabase branch or local Postgres) seeded only with synthetic learners. **Not production**, per constraint 7.
3. **S33 aggregate check (read-only, non-identifying).** Count teaching signals with `evidence_level = 'observation'` and `distinct_questions > 1`. If the count is zero, "Observed once" is accurate.
4. **Educational validation of thresholds** (85/70/5, 6+2+35, 55, 0.72/0.78): expert review against real, de-identified distributions. These are design choices, not verified standards.
5. **Browser checks** of the Phase 2A items remain outstanding (see the Phase 2A report).

## 7. Method notes and limits

- **How client rules were executed:** private functions and inline expressions were extracted with the TypeScript compiler API, using exact source text, then transpiled and executed. If a named function or expression changes or is removed, the test fails loudly instead of silently testing a copy.
- **Why the tests are characterisation tests:** they assert *current* behaviour. A fix to a FAIL item will deliberately break the matching test, which should then be updated to the corrected expectation in the same change.
- **What was not changed or used:** no production source, Supabase object, Math file or Dream Tokens file was modified, and no identifiable data was read.
- **Concurrent work:** uncommitted changes from other workstreams (Dream Tokens route and SQL, Phase 8C installation notes) were present before and after the audit and were left untouched.
