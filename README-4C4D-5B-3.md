# DREAMSCAPE ONE — Phase 4C-4D-5B-3: Manual-Review Feedback Disclosure Correction

**Status: review package. No database change has been deployed.**

The 4D-5B-2 exports showed four function definitions and 2,349 published mathematics questions. None of those questions has `content.teaching` or the four surveyed top-level answer/solution keys. This key-name inventory is **not** a complete content security certification.

## Source-backed issue

- `save_math_quiz_answer_unlocked`: the first immediate-feedback save sets `pending_manual_review = true` but can return the `student` explanation.
- On a **repeat** immediate-feedback save of a locked answer, the function re-calls `core_mark_response` on the stored response, then returns a correctness result, explanation, and `correct_response` even when the stored answer is still pending manual review. This is the most urgent finding.
- `get_math_quiz_payload_unlocked`: when resuming an immediate-feedback quiz, saved pending-manual answers can receive an explanation, although their `correct_response` is already withheld.
- `build_math_quiz_attempt_result`: already withholds the explanation and correct response when `answer.is_correct` is NULL; this function is left unchanged.

## Package contents and scope

- `sql/phase-4c4d5b3-01-readonly-preflight.sql` — function permissions/ownership check (no learner records)
- `sql/phase-4c4d5b3-02-manual-guarded-disclosure-fix.sql` — **MANUAL DATABASE CHANGE; DO NOT AUTO-DEPLOY**
- `sql/phase-4c4d5b3-03-readonly-postflight.sql` — checks stored DDL/permissions after a supervised change
- `tests/phase4c4d5b3.test.cjs` — **static structural tests only**, not a database runtime test
- `qa-artifacts/phase4c4d5b3/` — grounded audit findings and three exact source edits

This proposal edits only the **bodies** of the two `_unlocked` functions, with existing signatures, grants, owner, `SECURITY DEFINER`, and `search_path` retained. It does not touch student tables, quiz marking rules, grading RPC wrappers, reward calculations, the B4 approval gateway, or Next.js routes. It does **not** make the new student teaching endpoint safe to deploy yet.

## Installation / safe review order

1. Extract the ZIP into the `gk-design-world` project root, maintaining folder structure.
2. Run `node --test tests/phase4c4d5b3.test.cjs` and expect **20/20 passed**. Tests verify the package's SQL and source-replacement templates; passing does **not** prove the SQL executed against your live database.
3. Run `sql/phase-4c4d5b3-01-readonly-preflight.sql` in Supabase SQL Editor. Confirm **two** rows, both `owner=postgres`, both `security_definer=true`, client/public execution `false`, service-role execution `true`, and both `candidate_patch_detected=false` (if unchanged).
4. **Do not run the manual SQL patch until you have reviewed the exact changes, taken an appropriate restore/backup precaution, and approved a supervised deployment window.** The script will abort on signature, owner, role, search-path, or snippet drift. It is not a migration to deploy through CI/CD.
5. After separately approving and executing the guarded SQL transaction, run `sql/phase-4c4d5b3-03-readonly-postflight.sql`. Expect both `disclosure_guards_present=true` and denied client/public execution. A human must then perform quiz-play smoke tests under actual authenticated accounts.

### Post-change smoke tests (use test questions and real authenticated test accounts)

- Immediate feedback, auto-marked: save normally, receive expected correctness and explanation.
- Immediate feedback, manual-marked: first save **hides** explanation, answer and score pending review.
- Immediate feedback, manual-marked: second save while locked remains **pending**, with explanation, answer and score hidden.
- Resume a manual-pending quiz: previously saved feedback continues to hide explanation and answer.
- End-of-quiz and `none` feedback modes remain unchanged.
- Cross-user access and question membership are rejected as before.
- Submission, rewards, teacher marking and quiz result rendering remain unchanged.

### Known remaining review items

`question.content` is still returned in the quiz payload. The key inventory excludes only the inspected key names and cannot verify all future `content` values, `audit_facts`, stimulus/asset metadata, or browser-present teaching text. Before an answer-revealing teaching endpoint goes live, also establish the runtime student authorization and release policy from 4D-3/4D-4. **Keep B4 disabled.**

**No automatic live deployment; this is not a runtime security certification.**
