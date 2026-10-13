# B2 evaluation protocol — keep the holdout genuinely unseen

**Current status:** No new unseen cohort has been supplied or tested. Both `phase-2i-v1` and `phase-4a2c5-holdout-v1` have already been examined during F4, A and B1. Results from either are exploratory, not an unbiased measure of improvements.

1. Use the existing Math Intelligence QA sampling UI to sample a **new fixed seed** and export a new original JSON (e.g. 240 questions, ideally 40 from each P1–P6 level). Freeze the run ID, seed, question IDs, sampling strata and source version *before* inspecting results. Do not draw only from previously reviewed questions.
2. Save the original export separately. Do not open question text, answers, diagrams, or selector outcomes until the B2 evidence policy and trusted review process have been frozen. A separately held-out evaluator/reviewer is preferable.
3. The `qa-artifacts/phase4c4c-a/phase-4c4c-a-joined-480.json` file is a list of previously inspected question IDs. Provide it as the fourth CLI argument to mark overlap; zero overlap does **not** prove the sample is statistically independent.
4. Evaluate before/after with the same new export and the same versioned approved-review set. Check: 4A readiness preservation, adapter errors, no unapproved score increases, deterministic outputs, selected-vs-ambiguous shifts, method correctness by a curriculum reviewer, and P1–P6 / representation breakdown.
5. Evidence review records are trusted-server-only. Never infer method-fit labels from answers/explanations or automatically promote B1 proposals. External images require actual inspection, and curriculum appropriateness must be independently assessed.
6. Do not deploy score-changing review data until reviewer agreement and accuracy checks are signed off. This phase supplies the mechanism and preview runner, not the human judgments.

CLI example, after compiling and obtaining a new export:

```powershell
node tests/run-phase4c4c-b2.cjs "qa-exports/NEW-original.json" "qa-reports/phase-4c4c-b2-NEW.json" "qa-artifacts/phase4c4c-b2/approved-review-template.json" "qa-artifacts/phase4c4c-a/phase-4c4c-a-joined-480.json"
```

With the empty review template, this is a baseline/no-drift check only, not an efficacy test.
