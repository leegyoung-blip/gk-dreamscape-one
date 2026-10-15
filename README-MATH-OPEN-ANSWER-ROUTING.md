# DREAMSCAPE ONE — Maths Open-Ended Answer Routing Fix

## Confirmed underlying issue
The supplied 15 October source includes an implemented `MathAnswerInput` and `MathQuestionRenderer` routing for `fraction`; `CoreQuizUtils.responseIsComplete` already accepts nonempty fraction `response.text`. However, the earlier `CoreMissionStage` routing code only uses `MathQuestionRenderer` when `resolvePresentationMode` returns `math_standard`. A `fraction` / numeric question can instead reach the generic `QuestionResponseEditor`, which does not render the appropriate maths input in the screenshots.

**This is a guarded installer**, not a source-file overwrite. We inspected the present five source files from the latest six-file ZIP and used the previously exported `CoreMissionStage.tsx` (from the 4D-3 teaching-source package) for compatibility testing. The *exact current CoreMissionStage* was not included in the new ZIP. The installer checks its anchors on your machine and stops before writing any file if they differ.

## Scope
Only when `subject === "math"`, force the following database-backed math open-response types through `MathQuestionRenderer`: `fraction`, `numeric`, `numeric_unit`, `money`. This renderer uses your existing `MathAnswerInput`, which emits `{ text: "..." }`. `CoreQuizTypes` and `CoreQuizUtils` recognize and count those types as answered. Numeric and money questions get decimal keyboards; fractions accept `3/8`. Existing question type metadata and the server-side save RPC are not changed.

- Does **not** replace CoreQuizPlayer, any database function, visual teaching components, grading, or rewards.
- Leaves multiple-choice, English, and other question types on their existing routing paths.
- Does **not** force unsupported multi-part questions through a single textbox.
- Keeps the B4 approval gateway disabled.
- No claim is made that `{text:...}` is accepted or graded as intended for every numeric response type; **live authenticated testing is required**.

## Installation (PowerShell, in `C:\Users\leegy\gk-design-world`)

Extract this ZIP into the repository root, preserving `scripts/` and `tests/`. Then run:

```powershell
node --test tests/math-open-answer-routing.test.cjs
node scripts/fix-math-open-answer-routing.cjs --check
node scripts/fix-math-open-answer-routing.cjs --apply
npx tsc --noEmit
```

Expected package test: **12 passed, 0 failed**. The first installer command (`--check`) changes nothing, and the second (`--apply`) backs up altered files under `qa-artifacts/math-open-answer-routing/backups/`. Re-running `--apply` does nothing after successful installation. If you get **STOP**, do not force it; send the exact error so the local routing file can be inspected.

**Deployment:** If testing your public `dreamscape-one.com` site, you must commit and deploy the changes to Vercel. Restarting local development alone does not update the production URL. After deployment, hard refresh the browser (Ctrl+Shift+R) and start a new disposable quiz attempt if possible.

## Manual smoke checks

1. Open P6 Mathematics → Fraction Remainder Mastery → Question 4 (marbles). Expect a visible `YOUR ANSWER` field. Enter e.g. `1/4` and verify **Check Answer** enables. Before saving, verify the field value is actually entered and does not vanish on navigation.
2. Open Question 5 (Mrs Rex pizzas). Expect a visible number field. Enter a number; verify Check Answer enables.
3. Test the same questions with the workspace open; the answer field should remain visible on the question side.
4. Check a multiple-choice question: the options and feedback must look the same as before.
5. With a **disposable authenticated attempt**, submit one known-right and one known-wrong open answer and inspect the visible result. This is the first evidence about actual server grading. If the server rejects or misgrades, stop and share only sanitized error text.
6. Refresh / resume and verify answers or locked feedback are restored correctly. Continue full quiz submission QA only if these pass.

If the field is still absent after deployment, use browser inspector to see whether the question article has `data-presentation-mode="math_standard"` and `data-math-response-kind="text"`. If not, report those attributes and the installer output; don't modify your database.
