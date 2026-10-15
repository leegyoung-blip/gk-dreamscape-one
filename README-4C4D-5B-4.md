# DREAMSCAPE ONE — Phase 4C-4D-5B-4 Authenticated Quiz-Play Smoke Tests

**Status: MANUAL RUNTIME TESTS NOT YET RUN.** This is a test-only package, not a server deployment or security certificate. No production source files or SQL are replaced. B4 remains **disabled**; 4D-4 internal service remains disconnected from public/student routes.

## Why
The two 4D-5B-3 corrected functions passed *postflight structural/permission checks*. The next step is to verify actual feedback across authenticated learner requests. The 2026-10-14 13:21 CSV was byte-for-byte identical to the prior postflight export and therefore was **not** a new browser/runtime test.

## Install
Extract this ZIP over your `gk-design-world` repository, keeping paths. Run:

```powershell
node --test tests/phase4c4d5b4.test.cjs
node scripts/verify-math-4d5b4-smoke.cjs --init
```

`--init` creates `qa-artifacts/phase4c4d5b4/phase-4c4d5b4-results.json` if absent. It never overwrites an existing report. Tests verify only the *test tool*, not database behavior.

## Perform tests
Read `qa-artifacts/phase4c4d5b4/phase-4c4d5b4-smoke-plan.md` and carry out all cases with disposable, authorized learner accounts and non-production test quizzes, preferably in an isolated staging database. You need an `immediate` quiz with at least one automatically marked and one intentionally manually marked question, plus tests for `end_of_quiz` and `none` modes. Without safe test data, mark a scenario `BLOCKED` instead of creating live student data. Do not modify other people's attempts.

Use the browser UI and **your own** Network tab to inspect the selected Supabase RPC response fields, without exporting access tokens, cookies, request bodies, credentials or actual student data. Document only the statuses/absence or presence of protected fields. For ownership tests use two separately authorized test accounts on your own test data.

Update each entry's `status` to `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`; set `channel` to `ui`, `network`, or `ui+network` as required; write a short anonymized `observation` (at least 12 characters for completed PASS/FAIL). Never include correct answers, student names, bearer tokens or email addresses.

Run:

```powershell
node scripts/verify-math-4d5b4-smoke.cjs --check
```

The report stays **NOT VERIFIED** unless all 14 manual cases have evidence. Even a fully passing smoke report says **READY_FOR_SECURITY_REVIEW**, *not* "safe to deploy". Save/upload the small results JSON only after checking that it contains no sensitive data. Do not upload raw DevTools network exports.

## Critical stop conditions
- Any answer/explanation/correctness leaking while manual marking is pending → **STOP**, mark `FAIL`, do not introduce new teaching endpoint.
- Any attempt belonging to test user A mutable by test user B → **STOP**.
- Reward duplication or unexpected score changes → **STOP**.
- `content` may be added or repopulated later; current key-name inventory alone cannot certify safety.

No database migration, scoring, reward, quiz route or B4 approval-mode changes are part of this package.
