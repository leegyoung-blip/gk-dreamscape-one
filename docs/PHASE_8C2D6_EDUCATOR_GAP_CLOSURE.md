# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.6

## Educator review preparation and priority gap closure

**Status:** Offline mathematical-structure coverage complete; **educator decisions pending**. The three specialist method records remain `draft`, not registered production teaching methods.

### What is demonstrably complete

- The previously reported **18 missing positive grade-by-difficulty cells** in the 8C-2D.5 matrix have one additional synthetic positive witness each. These additions have independent arithmetic assertions and pass the existing 8C-2C.3B draft-applicability rules via the existing 8C-2D.1 checker.
- Coverage now represents **45 of 45** (9 method × level combinations × 5 relative difficulty bands) **synthetic positive applicability cells**. This is structural test coverage, not a claim that every topic, child misconception, diagram, classroom method, or production question is covered.
- The earlier 54-case casebook remains unmodified; the 18 new cases are separate. The six previously authored specialist/incumbent explanation comparisons also remain unchanged.
- All relative difficulty labels are **author-assigned estimates** until independently calibrated by qualified educators. A high-difficulty label does not prove a hard or age-appropriate question.
- The review queue has 24 items: **six A/B pairs** already authored for educator comparison and **18 new structural witnesses** that still require complete authored explanations (and diagrams where appropriate) before educator evaluation.

### What remains unverified

1. Independent mathematical and pedagogical review, with two reviewers for each teaching explanation and comparison.
2. Whether the difficulty designation matches the learner's primary level, curriculum, vocabulary, classroom expectations, and the likely misconception pattern.
3. Actual NOVA-produced explanations, not the synthetic authored references, paired with an equally fair existing-method explanation for the **same question**.
4. Rendered diagrams and mathematical symbols; the scripts here do not render or visually review diagrams.
5. Learning outcomes with real children; no claims about learner improvement or effectiveness.
6. Previously deferred authenticated production-session checks; completing offline tests does not permit activating write-capable review submissions.

### How to use the two CSV review files

- `phase4e2b8c2d6-educator-review-queue.csv`: work list. **P0** = difficult gap witness (relative level difficulty 4/5) or an existing A/B pair; **P1** = remaining gaps. Priority is a planning aid, not a quality score.
- `phase4e2b8c2d6-educator-review-worksheet.csv`: two empty rows per case, marked `R1` and `R2` and `PENDING`. Avoid entering scores until each reviewer has inspected the complete explanation, diagrams, and age-level assumptions.
- For the **six existing pairs**, review both variants A and B in the 8C-2D.3 materials with counterbalanced order; use the existing 8C-2D.3 detailed per-variant scoring worksheets to avoid replacing their evaluation format. The 2D.6 sheet is a queue-level companion, not a substitute.
- For the **18 new witnesses**, first author a complete specialist and a fair incumbent-method explanation that solve the same synthetic question. Until then, numerical scores must remain empty.
- Any wrong final answer, unsupported mathematical assumption, misleading diagram or unsafe overclaim is a hard stop. Disagreement between reviewers goes to adjudication, not an automatic average or approval.

### Controlled process for real NOVA-output evaluation — later development gate

1. **Use only explicitly authorised staff-side test workflow** on a question with a known current ID/version and established mathematical answer. Do not extract user OAuth tokens or use production learner sessions to assemble datasets.
2. Capture the exact **NOVA-generated teaching explanation** and a separate existing-method comparison for the **same question version** in an access-controlled review location. Mark the source and model/rule version, date, and whether the output is genuinely generated rather than synthetic. Do not place the question body, source answer keys, credentials, personally identifiable student data, learner submissions or privileged response fields in Git.
3. Validate arithmetic, mathematical notation, horizontal fraction bars, intended year-level vocabulary, sequencing, model diagrams and explanation of misconceptions independently. For visuals, inspect actual rendering on supported layouts, not merely the underlying text.
4. Present explanations anonymously or in counterbalanced A/B order to two qualified educators. Do not tell reviewers which version is specialist until evaluations are submitted. Record both scores, concrete concerns and any mathematical hard stops.
5. Separate question-by-question findings from method-family recommendations. A specialist can be primary in one context, supporting in another, and unwarranted elsewhere.
6. Aggregate decisions only after adjudicating disagreements and rechecking source freshness. Do **not** treat a positive recommendation as automatic activation. Keep draft registration, 4C selector scores, audit write-path and learner release disabled until explicitly approved and the deferred live-session checks are complete.

### Repeatable commands

```powershell
node --test tests/phase4e2b8c2d6-review-priority-gap-closure.test.cjs
node scripts/phase4e2b8c2d6-review-priority-gap-closure.cjs --verify-assets
```

Expected summary:

```text
Phase 4E-2B-8C-2D.6: OFFLINE_GAP_CLOSURE_CHECKS_PASSED
18/18 new synthetic positive witnesses | 18 original gaps | 0 remaining
45/45 level-by-difficulty applicability cells represented synthetically
24 educator-priority items | 6 existing paired explanations | 18 structural-only additions
Human approval: PENDING | Real NOVA explanations: NOT TESTED | Production selection: UNCHANGED
```

**No SQL migration, API route, production scoring change, new method registration, or learner-facing teaching change is introduced by this phase.**
