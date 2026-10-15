# DREAMSCAPE ONE — P6 Fraction Answer Entry Hotfix

## Why
The P6 "Fraction Remainder Mastery" open-response question is stored with the runtime type `fraction`. The quiz UI's math renderer currently only treats `short_text` and `open_cloze` as text-entry types; the `fraction` type falls through to the answer-choice renderer, but it has no options. The quiz completion function also lacks `fraction`, so the Check Answer button never enables. The question-type badge is blank because the format map lacks the label.

## What this package changes
The guarded installer updates **three existing source files**, without overwriting their other code:

1. `.../CoreQuizTypes.ts` — declares the existing `fraction` question type.
2. `.../CoreQuizUtils.ts` — treats nonempty `response.text` for `fraction` as complete, and labels it `Fraction`.
3. `.../presentation/renderers/MathQuestionRenderer.tsx` — sends `fraction` through the existing `MathAnswerInput` instead of the empty choices grid. Only the input renderer receives a `short_text` presentation alias; the *actual* question object and type passed to the database remain `fraction`.

No Supabase SQL, grading function, rewards, teaching engine or quiz submission code is changed.

**Boundary:** This patch repairs the missing UI input and client-side completion check. The exported `core_mark_response` database function has a `fraction` branch, but its downstream `core_math_response_is_correct` response-data requirements and actual live behavior still need authenticated QA. Do **not** treat the backend grading behavior as certified merely because the textbox appears.

## Install from your VS Code PowerShell terminal

Run in `C:\Users\leegy\gk-design-world` after extracting the ZIP into the project root (maintain `scripts/` and `tests/` paths):

```powershell
node --test tests/fraction-answer-hotfix.test.cjs
node scripts/fix-math-fraction-answer.cjs --check
node scripts/fix-math-fraction-answer.cjs --apply
npx tsc --noEmit
```

The `--check` command does not change any file. The `--apply` command validates all three inputs before writing, and saves the original files under `qa-artifacts/fraction-answer-hotfix/backups/`. If it reports `STOP`, leave the file as-is and share the exact error. Never manually force the patch if an anchor differs.

The script can be run twice without duplicating any edits. The installer will also refuse to run if any source file is missing.

## Live UI smoke test (test account or staging)

1. Restart your Next.js development server, or deploy the code through your normal controlled process.
2. Open a fresh P6 Fraction Remainder Mastery test attempt. Navigate to the fraction question.
3. Confirm the `Fraction` badge and a visible answer entry box; workspace can stay open.
4. Enter e.g. `1/4`. Confirm `Check Answer` enables.
5. For an authenticated disposable test attempt, click Check Answer and check that the save request succeeds. Do **not** assume mathematical grading accuracy until comparing the server result against the known answer and verifying `core_math_response_is_correct`.
6. Refresh, return to the question, and verify entry/locked state behaves correctly.
7. Test a normal multiple-choice question to ensure the original choices/feedback are unchanged.

**If the box appears but the server rejects or misgrades fractions, stop.** Capture the *sanitized* error text (never share the network Authorization header or raw student tokens) and we'll inspect the exact database math response schema before changing anything further.
