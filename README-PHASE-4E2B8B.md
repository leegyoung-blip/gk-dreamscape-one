# DREAMSCAPE ONE — 4E-2B-8B P4 answer mismatch correction

## Evidence from Supabase, 18 October 2026

- `MATH-P4-NUM-043-Q102` is published, type `numeric_unit`.
- Stored answer is `value:57`, `display_answer:"57 g"`, units `["g"]`, tolerance 0, unit required.
- Independent calculation: (2145 - 489)/46 = 36 g per removed ball; 489 - (58 - 46)*36 = 57 g for the box.
- Previous 4A rule treated the prompt as generic removal and read only `58` and `46`, missing `2145g` and `489g`; it incorrectly computed `12` and raised `GATE_ANSWER_MISMATCH`.

## Direct repository files

Replace:
- `lib/math-intelligence/teaching/understanding/rules/representativeWordProblemEvidence.ts`
- `lib/math-intelligence/teaching/understanding/rules/answerValidation.ts`
- `tests/phase4e2b8a-representative-evidence.test.cjs` (the old test expected P4 to remain blocked pending answer-key verification)

Add:
- `tests/phase4e2b8b-p4-mass-and-unit-validation.test.cjs`

All files use their real repository paths. No installer, `payload` folder, backup TypeScript copy, or SQL migration.

## What this corrects

- Uses explicit two-state box+iron-ball mass information to compute the empty-box mass by a verified multi-step procedure.
- Requires positive integral values, the same gram unit on both weights, 0 < removed < total, positive mass per ball and consistent recomposition of both reported masses.
- The rule depends on mathematical text, not the question ID or stored answer.
- Adds a safe unit-disagreement check when both an expected and a computed answer expressly state physical units. Matching numbers with conflicting physical units do not count as a match.
- Never disables `GATE_ANSWER_MISMATCH`, never changes the learner quiz grader or stored answer.

## Local verification

From `gk-design-world` PowerShell:

```powershell
node --test tests/phase4e2b8a-representative-evidence.test.cjs
node --test tests/phase4e2b8b-p4-mass-and-unit-validation.test.cjs
node --test tests/phase4e2b4-ring-arrival-evidence.test.cjs
node --test tests/phase4e2b6-term-and-total-method.test.cjs
npx tsc --noEmit
```

Full-project `npx tsc --noEmit` must pass locally. In a reconstructed source tree, 42 cross-phase Node regression tests and strict TypeScript checks on the changed modules passed.

Stage only these four files, commit and push; do NOT stage old ZIPs or backups:

```powershell
git add -- "lib/math-intelligence/teaching/understanding/rules/representativeWordProblemEvidence.ts" "lib/math-intelligence/teaching/understanding/rules/answerValidation.ts" "tests/phase4e2b8a-representative-evidence.test.cjs" "tests/phase4e2b8b-p4-mass-and-unit-validation.test.cjs"
git commit -m "Correct P4 box mass teaching evidence and unit mismatch safety"
git push origin main
```

## After deploy

Rerun the staff preview for P4 Whole Number Final Mastery Q102 and verify it no longer incorrectly says `GATE_ANSWER_MISMATCH`. A later 4C selector result may still be `ambiguous` and is NOT a failure of this 4A patch.

Run the same 12-question staff representative verification and share the CSV to compare with 2 selected, 9 ambiguous and 1 blocked baseline. The B4 approval gateway and student-facing release remain disabled. No student results or rewards were changed.
