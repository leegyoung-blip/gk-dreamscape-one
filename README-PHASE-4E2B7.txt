DREAMSCAPE ONE — PHASE 4E-2B-7
Representative Method Selection Verification (staff-only)

DIRECT REPOSITORY FILES: Extract into your gk-design-world project root.
Preserve the directory structure. Do not create a payload/ folder.

NEW FILES:
  app/curriculum-developer/math-intelligence/representative-verification/page.tsx
  app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.tsx
  app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.module.css
  lib/math/teaching/qa/phase4E2B7SamplePlan.ts
  tests/phase4e2b7-representative-verification.test.cjs

No existing production file is replaced. No new API route or database SQL.
The screen reuses your existing staff-only 4E-2B-2 preview API and
4E-2B-6 selector without altering either.

TEST in VS Code PowerShell (project root):
  node --test tests/phase4e2b7-representative-verification.test.cjs
  node --test tests/phase4e2b6-term-and-total-method.test.cjs
  npx tsc --noEmit

STAGE ONLY THE FIVE FILES:
  git add -- "app/curriculum-developer/math-intelligence/representative-verification/page.tsx" "app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.tsx" "app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.module.css" "lib/math/teaching/qa/phase4E2B7SamplePlan.ts" "tests/phase4e2b7-representative-verification.test.cjs"
  git commit -m "Add staff Mathematics method coverage verification"
  git push origin main

OPEN AFTER VERCEL DEPLOY:
  https://dreamscape-one.com/curriculum-developer/math-intelligence/representative-verification

Log in as admin or curriculum_lead. Click Run representative check.
By default, one question from two accessible published quizzes per level
(up to 12 question previews total) is evaluated sequentially. Option for
one quiz per level also available. You can stop the run. Export CSV to
review Selected / Ambiguous / Blocked / Skipped / Request errors, level,
quiz title, question code/type, selected method/confidence or diagnostic.

The sample is deterministic, not statistically representative. It only
covers the first 100 accessible quizzes per level and first 40 questions
per quiz. Blocked and Ambiguous are acceptable fail-closed outcomes;
review them for coverage rather than treating them as automatic test failures.

SECURITY AND NON-CHANGES:
  - Reuses authenticated staff preview API and database RLS.
  - No answer keys, prompts, solution steps or student data are requested.
  - No service-role API, new permission, authoring, approval or release.
  - No quiz grading, rewards, question library, teaching policy or SQL change.
  - Method selection does not constitute method approval.

VALIDATION PERFORMED BEFORE PACKAGING:
  - 23/23 new targeted tests passed.
  - 46/46 prior tests from 4E-2B-2/3/4/5/6 passed.
  - Strict isolated TypeScript check passed for new source files.
  - Full-project npx tsc --noEmit must still run in your repo.
