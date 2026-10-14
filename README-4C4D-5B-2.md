# DREAMSCAPE ONE — Phase 4C-4D-5B-2: Feedback/result trust verification

**Audit only. No SQL migrations, privilege changes, application-route changes, grading changes, or B4 activation. Live serving remains BLOCKED.**

## Findings from submitted 4D-5B-1 exports

- All **8** requested routines and explicit identity signatures are present in the execution-privilege export. The three public wrappers are callable by `authenticated`, but **none of the five internal helper/`_unlocked` functions are callable by PUBLIC, anon, or authenticated**. Their execution remains available to database/`service_role` principals. This closes the specific direct `_unlocked` bypass concern **for the checked signatures**.
- `core_assert_attempt_topic_access` verifies attempt `user_id` and quiz, while the saved-answer and submit implementations independently select attempts by `auth.uid()`. Both also check question membership. The helper checks published/topic visibility based on the caller's profile role.
- **Potential answer-release concern:** `get_math_quiz_payload_unlocked` returns unfiltered `question.content` for every published question on opening/resuming a quiz. We cannot infer which content values carry answers without a further inspection. In immediate mode it returns the authored `explanation` for a saved answer even when `is_correct IS NULL` (pending manual review). `save_math_quiz_answer_unlocked` also returns an explanation in immediate mode when marking is pending; in a repeated answer path it recomputes `core_mark_response` without basing its feedback fields exclusively on the stored manual-marking state. This demands review before a new answer-revealing teaching endpoint is attached.
- `submit_math_quiz_attempt_unlocked` returns `build_math_quiz_attempt_result(...)`, whose implementation and effective function permissions are not present in the prior exports. The existing audit therefore does **not** prove that `end_of_quiz` and `none` feedback modes suppress solutions correctly.

## Installation and checks

Extract into the existing `gk-design-world` root, retaining exact paths (`README` at project root, SQL under `sql/`). The package contains **additive audit files only**.

```powershell
node --test tests/phase4c4d5b2.test.cjs
```

## Two read-only Supabase SQL queries

Run each query separately in Supabase SQL Editor and export each output as CSV:

1. `sql/phase-4c4d5b2-01-readonly-result-helpers.sql` — exact implementation, owner settings and effective execution grants for `build_math_quiz_attempt_result`, `core_mark_response`, `core_user_has_access`, `require_complete_learning_profile`. Confirm no unexpected overloads. Privileged callers must **not** treat an arbitrary `p_user_id` supplied from a browser as authenticated identity.
2. `sql/phase-4c4d5b2-02-readonly-content-key-shapes.sql` — **aggregate metadata only**: number of published math questions and JSON object key names in `content`, including nested `teaching`. It does not export prompts or answers, but cannot prove no answer value is present.

**Review function-definition exports for embedded secrets before upload.** No SQL in this package changes database objects, table data, grants or policies.

Optionally, once both CSVs are downloaded, run the local **non-certifying** audit:

```powershell
node scripts/phase4c4d5b2-review.cjs "C:\path\to\result-helpers.csv" "C:\path\to\content-shapes.csv"
```

The script reports only helper names, grants and aggregate key names, **never function source**. It **always leaves the live endpoint blocked**. An output of zero apparent grant issues is not security certification.

## Exit criteria for next production step

- Audit the result builder's ownership enforcement and mode-specific output, including `none` and pending manual review.
- Confirm the meaning and sensitivity of `content.teaching` and other nested values without exporting real student data.
- Use a separately reviewed least-privilege server resolver that derives caller identity from the authenticated session, validates question membership and status, and never trusts browser-supplied feedback/approval state.
- Retain B4 `mode: disabled`. Deploy nothing automatically.
