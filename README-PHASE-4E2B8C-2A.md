# DREAMSCAPE ONE — Phase 4E-2B-8C-2A

## Verified method-family corrections (direct repo source)

This package contains exactly the 11 files below under their real repository paths. Copy them into `C:\Users\leegy\gk-design-world`, replacing only existing files at the listed paths. There is **no installer, payload folder, SQL migration, browser endpoint or TypeScript backup**.

### Source files to replace

1. `lib/math-intelligence/teaching/understanding/types.ts` — recognize two specific factor/multiple structures.
2. `lib/math-intelligence/teaching/understanding/rules/normalizeDomain.ts` — normalize those structure names.
3. `lib/math-intelligence/teaching/understanding/rules/structureRules.ts` — apply prompt-verified structure evidence before generic rules.
4. `lib/math-intelligence/teaching/understanding/understandTeachingQuestion.ts` — identify exact prompt-grounded whole-number domains.
5. `lib/math-intelligence/teaching/method-library/taxonomy/methodFamilyTaxonomy.ts` — map new factor structures to `number.factors_multiples`.
6. `lib/math-intelligence/teaching/method-library/methods/phase4B7CoverageHardening.ts` — map `Counting arrangements` to the existing digit-formation method.
7. `lib/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.ts` — add two new methods, requiring positive semantic evidence.
8. `lib/math/teaching/strategy-selection/phase4C4Adapter.ts` — pass only independently verified factor/multiple evidence to candidate eligibility.

### New files to add

9. `lib/math-intelligence/teaching/understanding/rules/factorDigitEvidence.ts` — validated common-multiple, HCF cutting, and constrained digit formation detectors.
10. `lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2AFactorMethods.ts` — reusable, question-agnostic specialist methods.
11. `tests/phase4e2b8c2a-family-correctness.test.cjs` — end-to-end tests, counterexamples, schema and governance safeguards.

### Evidence cases

- P2 `MATH-P2-NUM-106-Q04`: 24 candles, greatest positive shared multiple of 4 and 6 strictly below 24 is **12**; method `number.factors_multiples.bounded_common_multiple_maximum`.
- P3 `MATH-P3-NUM-078-Q104`: three-digit even numbers using 2, 5, 6 and 0 with no repeats, excluding leading zero: **14**; existing method `number.place_value.constrained_digit_formation`.
- P6 `MATH-P6-ALG-032-Q104`: HCF(126, 140, 154, 238) = **14 m**; total pieces **47**; method `number.factors_multiples.hcf_equal_cut_and_count`.

Positive proof comes from the mathematical requirements in the prompt, not IDs, answer keys, options, or broad topic tags. The P2 bank skill label is too broad for a specific verified curriculum-skill bonus, so its new method has an empty skill list. The existing **75 quality / 8 margin** policy is unchanged; a single eligible method has no runner-up margin to measure. A **Selected** method remains neither Gold-approved nor released to learners.

### Local verification

```powershell
node --test tests/phase4e2b8c2a-family-correctness.test.cjs
node --test tests/phase4e2b4-ring-arrival-evidence.test.cjs tests/phase4e2b6-term-and-total-method.test.cjs tests/phase4e2b8a-representative-evidence.test.cjs tests/phase4e2b8b-p4-mass-and-unit-validation.test.cjs
npx tsc --noEmit
```

The isolated 4A/4B/4C TypeScript compilation and **53/53** targeted + regression tests passed in the reconstructed source tree. This is not a full-project build. The project `npx tsc --noEmit` command above is the required local integration check.

### Git

```powershell
git add -- "lib/math-intelligence/teaching/understanding/types.ts" "lib/math-intelligence/teaching/understanding/rules/normalizeDomain.ts" "lib/math-intelligence/teaching/understanding/rules/structureRules.ts" "lib/math-intelligence/teaching/understanding/understandTeachingQuestion.ts" "lib/math-intelligence/teaching/method-library/taxonomy/methodFamilyTaxonomy.ts" "lib/math-intelligence/teaching/method-library/methods/phase4B7CoverageHardening.ts" "lib/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.ts" "lib/math/teaching/strategy-selection/phase4C4Adapter.ts" "lib/math-intelligence/teaching/understanding/rules/factorDigitEvidence.ts" "lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2AFactorMethods.ts" "tests/phase4e2b8c2a-family-correctness.test.cjs"
git commit -m "Correct Mathematics factor and digit method-family matching"
git push origin main
```

### Deployment test

After Vercel deploys, open the existing staff-only representative-verification page and run the same 12-question sample, or preview the three question codes above individually. Export the candidate-score coverage CSV. Verify no new unexpected blocks/technical errors. Do not enable the B4 approval gateway or change student explanations. No SQL is needed.
