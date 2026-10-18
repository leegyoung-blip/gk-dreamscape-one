# DREAMSCAPE ONE — Phase 4E-2B-8A (Representative 4A evidence)

This is a **direct repository source update**. No installer, no `payload/` directory, and no duplicate TypeScript backups.

## From the 12-question 4E-2B-7 sample

Changes narrowly recognise four evidenced questions:
- P2 geometry: 4 equal straight sides + 4 corners -> property matching
- P3 tree intervals: distance between 5th and 95th tree at 7 m per interval -> 630 m
- P5 three-person marbles: 1:3:1.5 whole-number relation -> 57 marbles
- P5 tables/chairs: 80 items, 20 chairs removed, equal remaining counts, $6 per-table premium -> multipart quantity/cost system (do not compare a scalar answer)

They use explicit **question wording**, not answer keys, question IDs, skill tags alone or staff intervention. Conflicting/incomplete evidence fails closed. This is a 4A understanding update only; 4C may still return Ambiguous or Blocked.

## Files

Replace:
- `lib/math-intelligence/teaching/understanding/rules/structureRules.ts`

Add:
- `lib/math-intelligence/teaching/understanding/rules/representativeWordProblemEvidence.ts`
- `tests/phase4e2b8a-representative-evidence.test.cjs`

## Install

Copy/rewrite these files at the listed paths in the repository, then:

```powershell
node --test tests/phase4e2b8a-representative-evidence.test.cjs
node --test tests/phase4e2b4-ring-arrival-evidence.test.cjs
node --test tests/phase4e2b6-term-and-total-method.test.cjs
npx tsc --noEmit
```

Tests were run in a reconstructed code tree based on the supplied live audit plus the installed 4E2B4/4E2B6 changes. **Full project compilation still must pass in your repo.**

Stage exactly the three file paths and commit/push. Do not stage imported ZIPs, temp outputs or backups.

## P4 answer mismatch — remains blocked

`MATH-P4-NUM-043-Q102`: the prompt independently yields **57 g** from
`(2145 - 489) / 46 = 36 g per ball`, then `489 - (58 - 46) * 36 = 57 g`.
The exported CSV omits the authoritative stored answer, so we cannot distinguish a wrong answer key from a false deterministic computation yet. We **did not** modify or bypass `GATE_ANSWER_MISMATCH`.

Run the separate *read-only*, one-question SQL:
`4E2B8A_01_readonly_P4_stored_answer_check.sql` in Supabase SQL Editor, export the one-row CSV and send it for review. The query reveals the stored answer only to the SQL-Editor user; do not surface this data through the learner API.

## Unchanged

- 4C score threshold ≥75, margin ≥8
- B4 method approval and student-release disabled
- Quiz rendering, answer grading, rewards, live quiz submission
- Question-bank answer data and RLS

## Next

After the deployment, re-run the same staff-only 12-question verification and export CSV. Compare changes in blocked/ambiguous/selected without assuming all newly understood questions should be Selected. P4 mismatch investigation and 4C candidate gap review remain pending.
