# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.1
## Specialist teaching-method quality casebook (offline)

**State:** automated casebook and rubric prepared; **not** an approved teaching-method assessment. No changes to the production catalogue, selector, scoring, quiz answers, staff permissions, Supabase or learner-serving routes.

### Evidence sources and scope

This review reuses the exact **three inactive teaching-method drafts** in `phase4E2B8C2C3ASpecialistDrafts.ts` and the applicability logic in `phase4E2B8C2C3BApplicabilityReview.ts`. It does not use database question/answer records. The 18 items in `tests/fixtures/phase4e2b8c2d1-quality-cases.json` are newly authored synthetic cases, not a sample of production student outcomes. Automated calculations are checked independently of the expected applicability label, but they do **not** evaluate the quality of any rendered or AI-generated learner explanation.

### Method-specific educational questions

| Method | Desired teaching insight | Critical learner misconception | Expected representation | Appropriate P-levels |
|---|---|---|---|---|
| Equal-spacing intervals | Distance uses gaps between positions, not the number of labelled objects | Counting the 4th and 12th markers as extra intervals | Short number line / marked diagram | P3–P6 |
| Multiplicative comparison chains | All quantities must be expressed relative to one consistent reference unit | Mixing units for successive 'times as many' relationships | Labelled bar model | P4–P6 |
| Changing ratios | Apply only stated changes and verify both before/after ratio states | Reusing the same unit size across changed ratio states; inventing a constant | Two-row ratio table / linked bars | P5–P6 |

### Automated coverage

Six synthetic scenarios per method: **two compatible worked examples** and **four negative or incomplete-evidence cases**. The script checks:

1. Structural classification matches the actual 3B applicability rule and exact reason code.
2. Independent arithmetic consistency: interval count and units; all multiplicative relationships and total; both ratio states and explicit changes.
3. Positive cases refer to real, authored draft teaching-stage IDs, misconception corrections and preferred representation types.
4. Negative cases cannot contain a worked-example/teaching-approval assertion.
5. All three drafts remain `draft`, with no synthetic curriculum skill declaration or teaching approval.
6. Report fields state `humanPedagogicalReview: pending`, `methodActivationAllowed: false`, `betaReady: false`.

To run in VS Code PowerShell from the repository root:

```powershell
node --test tests/phase4e2b8c2d1-specialist-teaching-quality.test.cjs
if ($LASTEXITCODE -ne 0) { throw "8C-2D.1 tests failed" }
node scripts/phase4e2b8c2d1-quality-casebook.cjs
if ($LASTEXITCODE -ne 0) { throw "8C-2D.1 casebook failed" }
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "TypeScript failed" }
```

### Human rubric: required for the next phase, not scored automatically

For **each positive exemplar**, a primary and a second independent educator review the actual explanation/diagram (not merely the method metadata). Give every dimension **0–3**, using the scale below. Record precise evidence, sample student errors and any necessary rewrite. Never write `approved` merely because the automated casebook passes.

| Dimension | What reviewers must inspect |
|---|---|
| Mathematical correctness | All steps, diagram labels, units and original question conditions hold. A mathematical error is a hard stop. |
| Conceptual explanation | Makes the *why* comprehensible, not just an operation to memorize. |
| Representation clarity | Diagram/table or manipulatives correctly match the variables and quantities, without visual clutter or misleading proportions. |
| Step progression | Prerequisites established, then represent → reason → calculate → verify; no unexplained jump. |
| Misconception response | Correctly diagnoses the likely mistake and provides a concrete correction/check. |
| Learner accessibility | Language, notation, pace and strategy are appropriate for the stated Primary level; no assumed prior algebra unless taught. |

Scoring guide: **0** incorrect/missing; **1** significant revision; **2** adequate with minor revisions; **3** effective, clear and defensible. **Proposed review threshold** (not product policy): every criterion at least **2** for both reviewers and a total at least **15/18** each. Mathematical incorrectness, an unreconciled reviewer disagreement, a misleading diagram, or a failed negative-lookalike is a hard stop independent of totals.

Before any method activation, compare each specialist's worked instruction with the highest-ranked existing general strategy on the **same reviewed question**: Would the specialist better explain the mathematical relationship, or is it merely extra jargon? Mark `primary`, `supporting`, or `not warranted`, with an explicit justification. This cannot be inferred from the existing 4C candidate scores.

#### Blank human-review record (copy per exemplar and reviewer)

```text
Case ID:
Method ID / exact draft commit:
Reviewer ID (staff only; do not place PII in public repo):
Review date:
Source: synthetic fixture / explicitly verified staff question version:
Version/fingerprint if real source (staff-only audit location):
Rendered learner explanation or screenshot (staff-only reference):
Mathematical correctness (0-3):      Evidence:
Conceptual explanation (0-3):        Evidence:
Representation clarity (0-3):       Evidence:
Step progression (0-3):             Evidence:
Misconception response (0-3):       Evidence:
Learner accessibility (0-3):        Evidence:
Explicit mistake / revision needed:
Comparison to incumbent strategy:
Suggested role: primary / supporting / not warranted / undecided
Provisional reviewer recommendation: revise / reject / review again
Second reviewer verdict and differences:
Adjudication owner and date:
Final human pedagogical approval: NOT YET GRANTED
```

### Deferred release blockers

- Two independent educators have not reviewed actual generated explanations or visuals.
- Real question answer-data and version-bound diagram verification are not performed by this offline fixture casebook.
- Previously deferred live Google-auth regular-user denial, staff preview, and write-path tests remain mandatory before enabling review submissions.
- Existing 5/7 selected/ambiguous baseline does not establish pedagogical correctness of the five selected methods.
- Any later change to the actual 4C selector requires a **new** controlled regression, not just this casebook.

**Recommended next step — Phase 8C-2D.2:** produce/inspect worked teaching exemplars in a strictly offline staff setting; obtain the two human reviews above, document disagreements and refine draft wording where necessary. Do not register the specialists into the live production catalogue at this stage.
