# DREAMSCAPE ONE — Phase 4C-4D-5B-1: Delegated quiz RPC trust verification

**Read-only audit package, no production source replacements. B4 gateway stays disabled.**

## Why this phase is required

The submitted 4D-5A SQL exports establish that `get_math_quiz_payload`, `save_math_quiz_answer`, and `submit_math_quiz_attempt` call `core_assert_*` functions using `auth.uid()` **before** delegating to `*_unlocked` routines. All three wrappers are `SECURITY DEFINER`, owned by `postgres`, and their owner bypasses RLS. The helper and `_unlocked` bodies were not in the supplied exports, so the authorization and early-answer protection must be verified independently.

**Especially important:** PostgreSQL grants EXECUTE to PUBLIC for newly created functions by default unless revoked. If an `_unlocked` routine is callable by an API role, it may circumvent its protected wrapper (subject to what the `_unlocked` code itself checks). Check its **effective** grants before any live integration. This is a potential exposure, not a confirmed exploit.

## Installation

Extract this ZIP into the **existing** VS Code project root `gk-design-world`, preserving paths. Both SQL files belong under `sql/`. This package adds only these files:

- `sql/phase-4c4d5b1-01-readonly-delegated-function-definitions.sql`
- `sql/phase-4c4d5b1-02-readonly-execute-permissions.sql`
- `scripts/phase4c4d5b1-delegation-audit.cjs`
- `tests/phase4c4d5b1.test.cjs`
- `qa-artifacts/phase4c4d5b1/phase-4c4d5b1-5a-review.md`
- `README-4C4D-5B-1.md`

The audit script reuses the CSV parser in the earlier installed `scripts/phase4c4d5a-audit-csv.cjs`. It does not communicate with Supabase or expose any function-body text in its reports.

## Step 1 — Tests (Windows PowerShell)

```powershell
node --test tests/phase4c4d5b1.test.cjs
```

## Step 2 — Supabase SQL Editor

Run the SQL queries in order, separately. Both use PostgreSQL system catalogs only; they do not return student records or mutate tables.

- Query 1: returns source definitions and owner settings for 2 authorization helpers and 3 `_unlocked` implementations.
- Query 2: returns effective EXECUTE permissions for those 5 routines **and the 3 original wrappers** as `anon`, `authenticated`, `service_role`, and PUBLIC.

Export both results to separate CSVs; check for literal credentials embedded in function definitions and redact them locally before uploading. The CSVs may reveal internal implementation details, so do not publish them publicly.

**If Query 2 shows `public_execute_granted = true`, `anon_can_execute = true`, or `authenticated_can_execute = true` for an `_unlocked` function, do not enable the student endpoint. Report that immediately for targeted remediation review.** Do not change function grants blindly, because existing legitimate callers may depend on them.

## Step 3 — Optional local CSV audit

After saving the two exports, run (adjust filenames):

```powershell
node scripts/phase4c4d5b1-delegation-audit.cjs "C:\path\definitions.csv" "C:\path\permissions.csv"
```

The script generates a **non-certifying** report under `qa-artifacts/phase4c4d5b1/` and intentionally exits with code 2 if permission issues or missing expected evidence are found. It does not write a production enablement flag.

## Next gate

Review those two exports. If the helper and delegated implementations provide adequate identity and disclosure enforcement, proceed to 4D-5B-2 (trusted server-backed context resolver with tests, B4 still disabled). If not, isolate repairs first without touching the existing quiz/grading RPC semantics unnecessarily.
