# DREAMSCAPE ONE — 4C-4D-5B-3 SQL 02 Line-Ending Guard Hotfix

This hotfix **replaces only** `sql/phase-4c4d5b3-02-manual-guarded-disclosure-fix.sql`. It adds a new Node regression test. It does **not** alter the preflight or postflight files or automatically run any SQL.

## Verified root cause

The read-only Supabase anchor diagnostic returned exactly **1 original match and 1 LF-normalized match** for all three target fragments. The payload-resume and locked-resave needles contain a carriage return; the first-save needle does not. Both reviewed function fingerprints matched. In the original migration, the stored definition was line-ending normalized while the anchor literal was not. That mismatch caused snippet 1 to report zero matches and the transaction to abort.

## This hotfix

- Normalizes both stored function definitions and ALL six old/new SQL anchors (CRLF/LF/CR to LF).
- Requires exact full-definition MD5 fingerprints previously returned by Supabase (`0eb83089...` for payload, `55ea44f3...` for save).
- Still requires all three literal anchors **exactly once**.
- Keeps the original owner, SECURITY DEFINER, search_path, privileges, ACL snapshots, explicit transaction, and postconditions.
- Keeps the same three narrow disclosure corrections; no rewards, grading or other logic changes are intended.

## Install in Windows VS Code

1. Back up the existing SQL 02 file and extract this ZIP to the `gk-design-world` project root, replacing **only SQL 02**.
2. Confirm `README-4C4D-5B-3.md`, original QA fixtures, SQL 01/03, and `tests/phase4c4d5b3.test.cjs` remain available from the earlier package.
3. Run:

```powershell
node --test tests/phase4c4d5b3.test.cjs tests/phase4c4d5b3-lineending-hotfix.test.cjs
```

4. **Manually review** the corrected SQL 02 and ensure the current original function definitions are saved for rollback. Run it in Supabase SQL Editor only after authorizing that live change and preparing a restoration plan. The failed earlier execution should have rolled back, but confirm the preflight if in doubt. Execute once, and stop if any `4D-5B-3 STOP` exception occurs.
5. On SQL success, run the existing **corrected read-only** `sql/phase-4c4d5b3-03-readonly-postflight.sql` from the SQL quote hotfix and upload its CSV result. Follow with authenticated quiz play/resume/manual-marking smoke tests before marking the issue closed.

## Security and validation limits

All local tests are static/unit checks. **No live DB migration has been executed by this package; this is not runtime security certification.** The B4 reviewed-evidence gateway remains disabled; do not expose the new student teaching endpoint until the remaining checks pass.
