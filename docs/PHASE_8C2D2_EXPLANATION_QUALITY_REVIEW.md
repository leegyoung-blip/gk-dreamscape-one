# DREAMSCAPE ONE — 4E-2B-8C-2D.2
## Teaching explanation quality: offline reference exemplars

**Status: machine-verifiable reference examples prepared; independent educator review PENDING.**

These six worked explanations are newly written synthetic reference examples. They are not actual NOVA-generated teaching outputs, are not from live quiz questions or stored answer keys, and do not establish learner comprehension, MOE endorsement, visual correctness or beta readiness.

### Scope and safeguards

- Reads the existing 8C-2D.1 synthetic casebook and inactive method definitions; does not modify them.
- No Supabase, auth, APIs, scoring, answer-data, method catalogue, writes or learner release.
- Calculations, final quantities, expected teaching-stage IDs, diagram metadata and misconception fields are mechanically checked.
- A free-text teaching explanation or future rendered image can still be wrong or confusing despite passing these tests.
- The incumbent strategy comparison is an **illustrative hypothesis**, not a comparison against live, scored incumbent teaching outputs.

### Automated audit commands

```powershell
node --test tests/phase4e2b8c2d2-explanation-quality.test.cjs tests/phase4e2b8c2d1-specialist-teaching-quality.test.cjs
if ($LASTEXITCODE -ne 0) { throw "Phase 8C-2D tests failed" }
node scripts/phase4e2b8c2d2-explanation-quality.cjs
if ($LASTEXITCODE -ne 0) { throw "Phase 8C-2D.2 explanation audit failed" }
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Full TypeScript check failed" }
```

### Author-written explanation reference cards


#### SPACING_VALID_MAIN — How far is the 12th marker from the 4th marker?

**Primary level:** P3 · **Draft ID:** `heuristic.multi_step.equal_spacing_interval_count`

**Synthetic question:** The markers are equally spaced 6 m apart on a straight path. Find the distance from marker 4 to marker 12.

**Teaching steps:**

1. **represent_positions** — Put a small mark for the 4th marker and another for the 12th. Each neighbouring pair has a 6 m gap.
2. **count_intervals** — The marker numbers tell us the positions, not the number of gaps. Subtract 4 from 12 to count 8 gaps.
3. **calculate_distance** — All 8 gaps are 6 m long. Multiply 8 by 6 to get the whole distance of 48 m.
4. **check_small_case** — Between the 4th and 5th marker there is only one gap, even though two markers are shown. That gap is 6 m.

**Representation:** number_line — Label the 4th and 12th markers, then show eight identical gaps of 6 m between them.

**Label checklist:** 4th marker; 12th marker; 8 equal gaps; 6 m per gap

**Reference answer:** 48 m (distance).

**Likely error:** Count nine markers from the 4th through the 12th, then multiply by 6.

**Correction:** Mark two neighbouring positions and point to the one gap; intervals equal the difference in position numbers.

**Unverified comparative hypothesis:** Explicitly counting the gaps prevents an endpoint off-by-one error.

**Human decision:** PENDING. Do not label this method primary/supporting until independently reviewed against the actual incumbent explanation.

#### SPACING_VALID_ADJACENT — One gap between two adjacent markers

**Primary level:** P3 · **Draft ID:** `heuristic.multi_step.equal_spacing_interval_count`

**Synthetic question:** The markers are equally spaced 9 m apart. Find the distance from the 1st marker to the 2nd.

**Teaching steps:**

1. **represent_positions** — Mark the 1st and 2nd markers side by side. There is one equal gap of 9 m between them.
2. **count_intervals** — Subtract the first position number from the second: 2 minus 1 gives one gap, not two gaps.
3. **calculate_distance** — One gap is 9 m long, so the total distance is 1 times 9, which is 9 m.
4. **check_small_case** — Point to the single space between the two markers. We count spaces, not the number of markers.

**Representation:** number_line — Draw two labelled marks with one 9 m gap between them.

**Label checklist:** 1st marker; 2nd marker; 1 equal gap; 9 m per gap

**Reference answer:** 9 m (distance).

**Likely error:** Multiply 2 markers by 9 m, as if two markers meant two gaps.

**Correction:** Trace the space separating the two markers; there is exactly one interval.

**Unverified comparative hypothesis:** A simple adjacent case makes the gap-count idea visible before larger problems.

**Human decision:** PENDING. Do not label this method primary/supporting until independently reviewed against the actual incumbent explanation.

#### CHAIN_VALID_HALF — Three linked quantities from a total of 66

**Primary level:** P5 · **Draft ID:** `heuristic.multi_step.multiplicative_comparison_chain`

**Synthetic question:** Bella has three times as many objects as Alan. Chen has half as many as Bella. Together they have 66. How many does Chen have?

**Teaching steps:**

1. **identify_reference** — Use Alan as the reference. Bella has three Alan-sized amounts; Chen has half of Bella, not half of Alan.
2. **equivalent_units** — To avoid half-bars, represent Alan with 2 little equal parts, Bella with 6, and Chen with 3. All bars use the same-sized part.
3. **find_one_unit** — There are 2 plus 6 plus 3, or 11 equal parts altogether. Divide 66 by 11 to find 6 objects in one part.
4. **scale_target** — Chen has 3 equal parts. Multiply 3 by 6 to find that Chen has 18 objects.
5. **check_comparisons** — Check: Alan has 12, Bella has 36, Chen has 18; Bella is three times Alan, Chen is half Bella, and 12 + 36 + 18 = 66.

**Representation:** bar_model — Aligned bars contain 2, 6 and 3 equally sized sections respectively. The same section size is used for everyone.

**Label checklist:** Alan: 2 equal parts; Bella: 6 equal parts; Chen: 3 equal parts; 1 equal part: 6 objects

**Reference answer:** 18 objects (chen).

**Likely error:** Treat half of Bella as half of Alan when adding the quantities.

**Correction:** Label each relationship first and split all bars into one common small part.

**Unverified comparative hypothesis:** Common equal parts reveal why half of Bella is not half of Alan.

**Human decision:** PENDING. Do not label this method primary/supporting until independently reviewed against the actual incumbent explanation.

#### CHAIN_VALID_SHARED_BASE — One base unit for three comparisons

**Primary level:** P5 · **Draft ID:** `heuristic.multi_step.multiplicative_comparison_chain`

**Synthetic question:** Bella has twice as many objects as Alan; Chen has three times as many as Alan. Together they have 72. How many does Chen have?

**Teaching steps:**

1. **identify_reference** — Both comparisons refer to Alan, so Alan is one reference part in our bar model.
2. **equivalent_units** — Show Alan as 1 equal part, Bella as 2 parts and Chen as 3 parts. All parts have the same value.
3. **find_one_unit** — Add 1 plus 2 plus 3 to make 6 equal parts. Divide the total of 72 by 6, giving 12 per part.
4. **scale_target** — Chen owns 3 parts, so multiply 3 by 12 and obtain 36 objects for Chen.
5. **check_comparisons** — Check Alan 12, Bella 24 and Chen 36. Bella is twice Alan, Chen is three times Alan, and 12 + 24 + 36 = 72.

**Representation:** bar_model — Place three bars of 1, 2 and 3 common parts in alignment.

**Label checklist:** Alan: 1 equal part; Bella: 2 equal parts; Chen: 3 equal parts; 1 equal part: 12 objects

**Reference answer:** 36 objects (chen).

**Likely error:** Assume Chen is three times Bella even though both comparisons mention Alan.

**Correction:** Underline the named reference in each statement; both comparisons refer to Alan.

**Unverified comparative hypothesis:** One common reference unit keeps two different multipliers from being mixed.

**Human decision:** PENDING. Do not label this method primary/supporting until independently reviewed against the actual incumbent explanation.

#### RATIO_VALID_MAIN — A ratio changes after two known additions

**Primary level:** P6 · **Draft ID:** `ratio.relationship.before_after_change`

**Synthetic question:** The ratio of quantities A:B was 3:2. A increases by 6 and B increases by 24; the new ratio becomes 1:2. Find the original amount of B.

**Teaching steps:**

1. **identify_quantities** — Keep A first and B second in both ratios. The original ratio is 3 to 2; both A and B increase by the stated amounts.
2. **represent_before** — Use a before-state unit u: original A = 3u and original B = 2u. Those before-state units are the same size.
3. **apply_changes** — After the additions, the quantities become A = 3u + 6 and B = 2u + 24. Neither quantity stays unchanged.
4. **enforce_after_ratio** — The new ratio 1:2 means B is twice A after the changes: 2(3u + 6) = 2u + 24. This gives u = 3.
5. **solve_and_verify** — Before: A = 9 and B = 6. After: A = 15 and B = 30. Their ratios are 3:2 and 1:2, and both additions are correct.

**Representation:** ratio_table — Two rows for before and after, with A and B columns and a separate change row. Do not equate the before and after ratio units.

**Label checklist:** Before A: 9; Before B: 6; After A: 15; After B: 30; Change A: +6; Change B: +24

**Reference answer:** 6 objects (original_B).

**Likely error:** Use one unit-size for both 3:2 and 1:2, even though both amounts changed.

**Correction:** Use separate before/after rows and check the differences in actual quantities.

**Unverified comparative hypothesis:** The before-and-after table makes changed unit sizes and both additions explicit.

**Human decision:** PENDING. Do not label this method primary/supporting until independently reviewed against the actual incumbent explanation.

#### RATIO_VALID_DIFFERENT_SCALE — Two different ratio unit sizes

**Primary level:** P6 · **Draft ID:** `ratio.relationship.before_after_change`

**Synthetic question:** Quantities A:B start in the ratio 2:3. A increases by 5 and B increases by 16, giving a new ratio 1:2. Find original B.

**Teaching steps:**

1. **identify_quantities** — Write A then B in both rows. The before ratio is 2:3, the after ratio is 1:2, and both changes are given.
2. **represent_before** — Let u be one before-ratio unit. Initially A = 2u and B = 3u; we have not assumed an after-ratio unit.
3. **apply_changes** — After the changes, A = 2u + 5 and B = 3u + 16. Both quantities have changed from their original values.
4. **enforce_after_ratio** — Because the new B is twice the new A, 2(2u + 5) = 3u + 16. Solve to obtain u = 6.
5. **solve_and_verify** — Before A = 12 and B = 18. After A = 17 and B = 34. Both stated changes and both ratios are satisfied.

**Representation:** ratio_table — Use distinct before and after table rows so the before unit 6 is not mistaken for the after unit 17.

**Label checklist:** Before A: 12; Before B: 18; After A: 17; After B: 34; Change A: +5; Change B: +16

**Reference answer:** 18 objects (original_B).

**Likely error:** Assume a 6-object unit still applies after the quantities increase.

**Correction:** Compare actual amounts in both rows: A and B increase by different amounts, and the new ratio unit equals 17.

**Unverified comparative hypothesis:** A two-state table prevents the old and new ratio scales from being conflated.

**Human decision:** PENDING. Do not label this method primary/supporting until independently reviewed against the actual incumbent explanation.

---

### Independent educator review required

Assign two independent educators to each reference example, with access to its full explanation and any actual rendered diagram. Use the blank CSV worksheet `docs/phase4e2b8c2d2-human-review-worksheet.csv`. There are 12 blank rows (six cases × two reviews). Do not enter reviewer identity or child information in public Git; keep completed reviewer records in an access-controlled staff location.

Give each criterion 0–3 independently: mathematical correctness, conceptual explanation, representation clarity, step progression, misconception response, learner accessibility. A numerical total cannot override an incorrect solution, misleading diagram or disagreement between reviewers.

**Proposed (not yet adopted) review threshold:** Each criterion ≥2 and total ≥15/18 from both educators. Any hard-stop finding forces revision even if the total exceeds 15. The two reviewers must assess actual teaching prose and visuals, not just the checker output.

### Comparison with incumbent methods

For each **same verified problem and learner level**, an educator compares the specialist presentation with the actual highest-ranked incumbent method explanation, then records either `primary`, `supporting`, `not_warranted` or `undecided`, with justification. Generic incumbent labels in these reference cards are not evidence of actual production ranking or teaching quality.

### Next gate / unresolved items

- Real question text, version, answer and diagram have not been independently verified as part of this offline synthetic stage.
- Actual NOVA teaching output samples are not yet captured or graded.
- Two independent educator reviews per case and comparative judgments are outstanding.
- Live Google OAuth role checks and audit write-path tests remain deliberately deferred to final beta-readiness verification.
- The 3 specialist methods are still inactive; no 4C scores, learner APIs, approval states or Supabase objects are changed.

**Next suggested phase:** 8C-2D.3, independent pedagogical review and real explanation comparison under staff-only controls; if educators are not yet available, expand negative/edge-case quality sampling before requiring sign-off.
