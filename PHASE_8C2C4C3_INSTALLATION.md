# DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4C-3
## Authenticated staff-session verification — read-only package

**Status:** Locally tested; real production authenticated-session verification has **not** yet been performed.

## Scope

- Adds a Node.js verification script, a masked-input PowerShell helper, one test file, and two *SELECT-only* SQL files.
- Tests the existing `math_specialist_structure_review_preview` database function only.
- Confirms an authenticated session by calling Supabase Auth `GET /auth/v1/user` before accepting the regular or staff results.
- Does **not** call `math_specialist_structure_review_record` or insert/update/delete any database records.
- Does **not** create a Next.js route, staff UI, SQL migration, new permissions or teaching-method activation.
- Preview performs database `FOR SHARE` row locks on a staff-specified pair, but does not persist a change. Run outside busy production periods if possible.

## Files

| Repository path | Action |
| --- | --- |
| `scripts/phase4e2b8c2c4c3-readonly-session-check.cjs` | New |
| `scripts/phase4e2b8c2c4c3-run-session-check.ps1` | New |
| `tests/phase4e2b8c2c4c3-readonly-session-check.test.cjs` | New |
| `sql/phase-4e2b8c2c4c3-read-only-question-pair.sql` | New |
| `sql/phase-4e2b8c2c4c3-read-only-audit-count.sql` | New |

## Install / verify

Extract ZIP to the repository root, e.g. `C:\Users\leegy\gk-design-world`.

```powershell
Set-Location "C:\Users\leegy\gk-design-world"
node --test tests/phase4e2b8c2c4c3-readonly-session-check.test.cjs
node --check scripts/phase4e2b8c2c4c3-readonly-session-check.cjs
node scripts/phase4e2b8c2c4c3-readonly-session-check.cjs --role anonymous
```

The last command is an actual **read-only production RPC check** using your repository's `NEXT_PUBLIC_SUPABASE_URL` and *publishable/anon* key from `.env.local` (or current environment). It should return `pass: true`, `outcome: "DENIED_EXPECTED"`.

It refuses to transmit a session token to an arbitrary URL: a normal `https://...supabase.co` Supabase endpoint is required. If your project uses a Supabase custom domain, stop and ask for a reviewed adjustment instead of disabling this check yourself.

## Optional full authenticated tests

Run `sql/phase-4e2b8c2c4c3-read-only-question-pair.sql` in Supabase SQL Editor to obtain a *real* Mathematics quiz ID and linked question ID. It returns identifiers and version only, not question text or answer keys.

Use accounts **you control** with the correct roles. The PowerShell helper accepts a pasted **short-lived user access token** at a masked local prompt. It never writes tokens to a file or prints them. Do **not** paste a token into chat, an AI tool, logs or screenshots; do **not** use a service-role/secret key, user password or API secret. If you do not have a safe way to obtain these session tokens, stop after the anonymous check; do not scrape browser storage blindly.

```powershell
& .\scripts\phase4e2b8c2c4c3-run-session-check.ps1 -Role regular
& .\scripts\phase4e2b8c2c4c3-run-session-check.ps1 -Role staff -QuizId "<real-quiz-uuid>" -QuestionId "<linked-question-uuid>"
```

For ordinary-user role, expect `DENIED_EXPECTED`. For authenticated staff, expect `STAFF_PREVIEW_ONLY`, with `fingerprintVerified: true`. The tool checks the session through Supabase Auth before trusting the result. It does not reveal fingerprints or question contents.

Optional: run `sql/phase-4e2b8c2c4c3-read-only-audit-count.sql` before and after. The audit event count should be unchanged, assuming nobody else writes concurrently.

## Git

Commit only the five new repository files after local checks and any intended runtime tests pass. Keep unrelated Dream Tokens/NOVA+ changes out of the commit. No Supabase migration is required.

## Remaining gates

This phase does **not** test the write RPC's stale-source/duplicate/atomicity behaviour. Such tests could persist real audit events even when expected to fail. They require a separately approved, controlled nonproduction or reversible test design. No specialist method is activated, and no learner-facing teaching is released.
