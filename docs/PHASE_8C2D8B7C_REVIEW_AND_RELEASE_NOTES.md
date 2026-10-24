# DREAMSCAPE ONE — Phase 8C-2D.8B-7C Review and Release Notes

## Purpose

Incorporate **one user's PDF review** of six offline, human-authored A/B teaching explanations into a concrete child-language and visual teaching reference. Keep the reference distinct from genuine NOVA generation, current production curriculum and method approval.

## Exact reviewer findings and disposition

| Reviewed question | User's comparison | Change in this phase |
| --- | --- | --- |
| Q1: 4th to 12th marker, P3 | B; Q1 scores A 9/18, B 15/18; B's step 4 felt unnecessary | B-style number line, 3 visible steps; brief optional adjacent-marker check |
| Q2: 1st to 2nd marker, P3 | A stronger; the original question is too trivial | Retain original 9 m warm-up in JSON; propose a **different, unreviewed** 72 m return-journey problem |
| Q3: comparison with half of Bella, P5 | B bar model stronger | Aligned bars with 2:6:3 common small parts, no leading fraction algebra |
| Q4: shared-base comparison, P5 | A bar model stronger | Aligned 1:2:3 bars, one-part working and a direct check |
| Q5: changing ratios 3:2 → 1:2, P6 | A bar model stronger; use less algebra, `u`/`v` acceptable with explanation | Actual before/after bar display, explicit meaning of `u`, equation only after comparing equal parts |
| Q6: changing ratios 2:3 → 1:2, P6 | A explanation better, neither version showed a bar model; reject undefined jargon | Actual before/after bar display; say “Let u stand for one equal part before the increase” |

Only **Q1** had six numerical rubric scores for each variant. Do not fabricate scores for Q2–Q6, or treat the single review as two independent educators.

## Contents

- `tests/fixtures/phase4e2b8c2d8b7c-refined-teaching.json` — six clearly attributed synthetic cases, explanations, reviewer actions, checks and diagram descriptions.
- `scripts/phase4e2b8c2d8b7c-teaching-refinement.cjs` — standalone Node audit + deterministic SVG/HTML preview generator. No API keys or external dependencies.
- `tests/phase4e2b8c2d8b7c-teaching-refinement.test.cjs` — arithmetic/regression/language/provenance tests.
- `docs/PHASE_8C2D8B7C_REFINED_TEACHING_PREVIEW.html` — **actual** SVG number lines and proportionally drawn bar models (after solving) for inspection and browser printing.
- `docs/PHASE_8C2D8B7C_PRIMARY_LANGUAGE_STANDARD.md` — mandatory specification for future NOVA work.

## Scope boundaries

This is an **additive offline authoring revision**, not a live Teaching Engine change. The diagram bars in the changing-ratio references are drawn to scale after determining `u`; they help check the answer. An educator must still decide whether the diagrams and reasoning are effective for children.

The `OFFLINE_REFERENCE_CHECKS_PASSED_REVIEW_PENDING` audit result means: all six fixture calculations agree with their declared numeric facts, basic data-integrity and language checks pass, and preview SVGs can be rendered. It does **not** mean teachers have approved the revised Q2, that pupils understand it, that the generator respects the language rules, or that any production question was reviewed.

Remaining release blockers (unchanged): genuine model output quality evidence skipped; published-question provider execution unimplemented; independent educator approval incomplete; production role/session and audit-write tests deferred; source freshness and published-question data egress policy unverified; specialist methods not active.

## Next implementation

**8B-7D — Integrate the language and visual review requirement into the future explanation-processing path**, first as an offline adapter test; then verify against real, authorised model outputs when those tests are permitted. Do not call the local phrase scanner a full readability/educator check. No SQL required for this phase.
