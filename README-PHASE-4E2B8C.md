# DREAMSCAPE ONE — Phase 4E-2B-8C-1 Candidate Score Coverage Export

This package changes **two existing source files** and adds **one test** in actual repository paths. No installer, duplicate TS backup or `payload` directory.

## Apply
Copy only the files in `app/`, `lib/`, and `tests/` to your `gk-design-world` root and overwrite existing counterparts. Keep the README outside the compiled project if desired.

- Replace `lib/math/teaching/qa/phase4E2B7SamplePlan.ts`
- Replace `app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.tsx`
- Add `tests/phase4e2b8c-candidate-coverage-export.test.cjs`

## Test
```powershell
node --test tests/phase4e2b7-representative-verification.test.cjs
node --test tests/phase4e2b8c-candidate-coverage-export.test.cjs
npx tsc --noEmit
```

If successful, stage only the three files above, commit and push to main. On the staff-only representative verification page rerun 12-question verification and export the NEW `DREAMSCAPE_4E2B8C_CANDIDATE_SCORE_COVERAGE.csv`.

## New CSV fields
The existing nine columns are unchanged. Appended fields include top two eligible candidate method IDs and scores, the *descriptive* top-two gap, the top candidate's largest dimension point shortfall and its size, selector's own issue codes, and count of scored eligible candidates. The real 4C selection margin may differ, particularly across families.

This only uses the sanitized `scoreComparison` data already returned to authorized staff by the existing method-preview API. It never requests answer keys, teaching steps, learner data, or new database permissions.

No Supabase SQL. No student release. No grading, reward or approval-policy changes.
