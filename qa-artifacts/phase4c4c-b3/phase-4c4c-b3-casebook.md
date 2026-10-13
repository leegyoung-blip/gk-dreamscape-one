# Phase 4C-4C-B3 — Source-Bound Mathematical Review (Not Approved)

**Status:** AI-assisted prompt mathematics checks, *not* independently authenticated teacher or curriculum approval. No B2-approved records are created. Both cohorts are previously inspected.

**Cohort coverage:** 480 joined; 320 4A ready; 84 selected; 236 ambiguous; 160 upstream blocked. **Reviewed cases:** 24 (11 P0).
**Prompt-only answer checks:** 20 (reported-answer agreement 20; conflicts 0). **Image-dependent answer checks pending:** 4. **External image references:** 9.

## Critical review principle

A correct arithmetic check does **not** establish that a selected teaching method is the best one. An external-image path is not the image; diagram counts and placements require viewing actual pixels. Grade appropriateness is separate from mathematical fit.

## P0 — MATH-P1-PROB-057-Q03 (fixed, P1)

**Question:** What is the missing number? 3 × □ + 8 = 20

**Current selector:** selected — algebra.equation_unknown.inverse_two_step_early

**Method candidates:** algebra.equation_unknown.inverse_two_step_early (77)

**Prompt structure:** two_step_inverse

**Independent mathematical analysis:** (20−8)÷3=4; undo +8 before ×3.

**Calculation:** 4. **Reported bank answer:** 4. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** fits_mathematics_curriculum_pending. P1 multiplication equation merits teacher assessment for core versus enrichment.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P1-GEO-002-Q05 (fixed, P1)

**Question:** How many triangles are used to make this picture?

**Current selector:** selected — heuristic.systematic_enumeration.spatial_sweep

**Method candidates:** heuristic.systematic_enumeration.spatial_sweep (77); heuristic.systematic_enumeration.ordered_list (68.666667)

**Prompt structure:** spatial_enumeration

**Independent mathematical analysis:** Triangle count cannot be verified from prompt without the pictured arrangement.

**Calculation:** Cannot establish from prompt alone. **Reported bank answer:** 3. **Answer comparison:** pending_image_evidence.

**Method-fit review flag:** requires_image_verification. Inspect stored picture and distinguish component triangles from composite triangles.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P1-MEAS-011-Q05 (fixed, P1)

**Question:** Which object is heavier: a circle or a square?

**Current selector:** selected — measurement.compare_change_total.compare_same_unit

**Method candidates:** measurement.compare_change_total.compare_same_unit (77)

**Prompt structure:** comparison_unknown_visual

**Independent mathematical analysis:** Whether the circle or square is heavier cannot be deduced from the prompt alone.

**Calculation:** Cannot establish from prompt alone. **Reported bank answer:** cannot tell. **Answer comparison:** pending_image_evidence.

**Method-fit review flag:** requires_image_verification. Inspect balance drawing or scale; cannot confirm “cannot tell” from words.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P1-DATA-020-Q05 (fixed, P1)

**Question:** One child changes from Dolls to Blocks. Which statement will be true?

**Current selector:** selected — data.read_compare_classify.compare_classify

**Method candidates:** data.read_compare_classify.compare_classify (82)

**Prompt structure:** data_transfer_visual

**Independent mathematical analysis:** A one-child transfer affects two category totals, but their initial counts are absent from text.

**Calculation:** Cannot establish from prompt alone. **Reported bank answer:** Dolls and Blocks will have the same number.. **Answer comparison:** pending_image_evidence.

**Method-fit review flag:** requires_image_verification. Read initial category counts directly from the original figure.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P1-NUM-009-Q04 (fixed, P1)

**Question:** The part–whole model shows a whole of 5 and one part of 4. What is the missing part?

**Current selector:** selected — number.place_value.compare_order

**Method candidates:** number.place_value.compare_order (77); number.place_value.place_value_chart (64.5)

**Prompt structure:** part_whole_known_whole_part_unknown

**Independent mathematical analysis:** Known whole 5 and known part 4 imply missing part 1.

**Calculation:** 1. **Reported bank answer:** 1. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** selected_method_mismatch_suspected. The chosen comparison/order method does not express the unknown-part operation.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P2-GEO-026-Q01 (fixed, P2)

**Question:** The source diagram is made up of 5 squares. How many triangles are also in the diagram?

**Current selector:** selected — heuristic.systematic_enumeration.spatial_sweep

**Method candidates:** heuristic.systematic_enumeration.spatial_sweep (77); heuristic.systematic_enumeration.ordered_list (68.666667); heuristic.systematic_enumeration.tabulation (60.333333)

**Prompt structure:** spatial_enumeration

**Independent mathematical analysis:** The exact triangle count depends on the unseen geometry of the five-square diagram.

**Calculation:** Cannot establish from prompt alone. **Reported bank answer:** 4. **Answer comparison:** pending_image_evidence.

**Method-fit review flag:** requires_image_verification. Inspect polygons and every triangle outline before confirmation.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P2-MEAS-053-Q07 (fixed, P2)

**Question:** A 160 cm rope forms a pattern. Four labelled sections measure 36 cm, 21 cm, 7 cm and 5 cm. How long is the remaining section?

**Current selector:** selected — patterns.sequence_rule.measurement_known_total

**Method candidates:** patterns.sequence_rule.measurement_known_total (77)

**Prompt structure:** measurement_known_total_remainder

**Independent mathematical analysis:** 160−(36+21+7+5)=91 cm, if sections exhaust the rope exactly once.

**Calculation:** 91 cm. **Reported bank answer:** 91 cm. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** visual_semantics_pending. Verify on the figure that labelled sections do not overlap and form the claimed partition.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P1-NUM-010-Q04 (holdout, P1)

**Question:** The part–whole model shows a whole of 10 and one part of 7. What is the missing part?

**Current selector:** selected — number.place_value.compare_order

**Method candidates:** number.place_value.compare_order (77); number.place_value.place_value_chart (64.5)

**Prompt structure:** part_whole_known_whole_part_unknown

**Independent mathematical analysis:** Known whole 10 and part 7 yield 3 missing.

**Calculation:** 3. **Reported bank answer:** 3. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** selected_method_mismatch_suspected. Place-value comparison is a poor structural account of a missing part.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P1-NUM-010-Q02 (holdout, P1)

**Question:** The part–whole model shows a whole of 10 and one part of 3. What is the missing part?

**Current selector:** selected — number.place_value.compare_order

**Method candidates:** number.place_value.compare_order (77); number.place_value.place_value_chart (64.5)

**Prompt structure:** part_whole_known_whole_part_unknown

**Independent mathematical analysis:** Known whole 10 and part 3 yield 7 missing.

**Calculation:** 7. **Reported bank answer:** 7. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** selected_method_mismatch_suspected. Part–whole subtraction should be examined against comparison/order.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P2-PROB-041-Q03 (holdout, P2)

**Question:** Three workers take 12 days to complete a job. Nine workers work at the same rate. How many days would they take?

**Current selector:** selected — speed.distance_time.inverse_work_rate

**Method candidates:** speed.distance_time.inverse_work_rate (77)

**Prompt structure:** inverse_constant_work

**Independent mathematical analysis:** 3×12 = 9×4 = 36 worker-days, assuming identical constant rate and equal job.

**Calculation:** 4 days. **Reported bank answer:** 4 days. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** fits_mathematics_curriculum_pending. Inverse work rate mathematically sound; P2 core/enrichment decision requires teacher.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P0 — MATH-P2-MEAS-061-Q03 (holdout, P2)

**Question:** A clock is 15 minutes fast and shows 4:25 p.m. What is the correct time?

**Current selector:** selected — time.read_interval.elapsed_timeline

**Method candidates:** time.read_interval.elapsed_timeline (77); time.read_interval.hour_minute_conversion (64.5)

**Prompt structure:** time_offset_direction

**Independent mathematical analysis:** A clock 15 minutes fast reads 4:25 p.m.; actual time is 4:10 p.m.

**Calculation:** 4:10 p.m.. **Reported bank answer:** 4:10 p.m.. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** visual_semantics_pending. Text supports subtracting 15 minutes; verify clock image and instructional method.

**Diagram status:** external_image_not_inspected. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P1-ASSESS-012-Q01 (fixed, P1)

**Question:** In a number pyramid, each box is the sum of the two boxes directly below it. The bottom row is 1, 3, 5, 7. What number belongs at the top?

**Current selector:** selected — patterns.sequence_rule.growing_difference

**Method candidates:** patterns.sequence_rule.growing_difference (77); patterns.sequence_rule.repeating_cycle (64.5)

**Prompt structure:** sequence_adjacent_sum_recurrence

**Independent mathematical analysis:** Rows: [4,8,12], [12,20], then 32. It is an adjacent-sum recurrence.

**Calculation:** 32. **Reported bank answer:** 32. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** selected_method_mismatch_suspected. Growing-difference extrapolation is not the rule given for pyramid boxes.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P1-ASSESS-012-Q06 (fixed, P1)

**Question:** Ali and Tricia are in a queue of 15 people. There are 9 people in front of Ali, and Tricia stands directly behind him. How many people are behind Tricia?

**Current selector:** selected — heuristic.logic_strategy.elimination

**Method candidates:** heuristic.logic_strategy.elimination (77)

**Prompt structure:** ordinal_position

**Independent mathematical analysis:** 9 in front => Ali 10th; Tricia 11th; 15−11=4 behind.

**Calculation:** 4. **Reported bank answer:** 4. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** method_fit_review. Ordinal indexing is more direct than generic elimination; teacher compare.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P1-PROB-050-Q02 (fixed, P1)

**Question:** A shop has 90 toys and sells 28. How many toys are left?

**Current selector:** ambiguous — no winner

**Method candidates:** model.change.find_change (77); model.change.forward_change (77)

**Prompt structure:** change_known_initial_and_change_final_unknown

**Independent mathematical analysis:** 90 starts, 28 sold, remainder 90−28=62; change magnitude is already known.

**Calculation:** 62. **Reported bank answer:** 62. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** tied_methods_distinguishable. Forward-change suits known decrease to unknown final; find_change targets unknown change.

**Diagram status:** embedded_diagram_not_semantically_certified. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P1-GEO-037-Q05 (fixed, P1)

**Question:** In a grid with 4 columns and 3 rows of unit squares, how many different 2 by 2 squares can be found?

**Current selector:** selected — heuristic.systematic_enumeration.spatial_sweep

**Method candidates:** heuristic.systematic_enumeration.spatial_sweep (77); heuristic.systematic_enumeration.ordered_list (68.666667)

**Prompt structure:** spatial_enumeration

**Independent mathematical analysis:** 2×2 block has 4−2+1=3 column starts and 3−2+1=2 row starts; total 6.

**Calculation:** 6. **Reported bank answer:** 6. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** fits_mathematics. Spatial sweep is plausibly aligned with the specified placements.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P1-ASSESS-011-Q07 (fixed, P1)

**Question:** Which statement is false?

**Current selector:** selected — number.place_value.compare_order

**Method candidates:** number.place_value.compare_order (77); number.place_value.place_value_chart (64.5)

**Prompt structure:** multiple_statement_check

**Independent mathematical analysis:** 87 is below both 88 and 89, so “87 is between 89 and 88” is false.

**Calculation:** 87 is between 89 and 88.. **Reported bank answer:** 87 is between 89 and 88.. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** fits_mathematics. Method is plausible; other listed statements also need checking.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P1-DATA-003-Q02 (fixed, P1)

**Question:** Use the list: car, bus, truck, bus, truck, truck, car, car, car. motorcycle. How many times does bus and truck appear?

**Current selector:** ambiguous — no winner

**Method candidates:** data.read_compare_classify.picture_graph_scale (77); data.read_compare_classify.read_table (77)

**Prompt structure:** data_plain_list

**Independent mathematical analysis:** The written list contains bus twice and truck three times, total 5.

**Calculation:** 5. **Reported bank answer:** 5. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** tied_methods_both_questionable. The source is a plain list; neither graph-specific nor table-specific method is evidenced.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P2 — MATH-P3-FRAC-035-Q104 (fixed, P3)

**Question:** George cut a pizza into 18 equal pieces. He gave 1 piece to his sister and 4/9 of the pizza was left. How many pieces did George eat?

**Current selector:** ambiguous — no winner

**Method candidates:** fraction.multi_step.equal_piece_combination (72); fraction.multi_step.dependency_model (67); fraction.multi_step.remaining_fraction (62)

**Prompt structure:** fraction_original_whole

**Independent mathematical analysis:** 4/9 of 18 = 8 pieces remain; one piece given to sister; eaten = 18−8−1=9.

**Calculation:** 9. **Reported bank answer:** 9. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** method_fit_review. Original whole remains 18. Fraction of remaining must not be silently substituted.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P2 — MATH-P5-RATIO-RB-Q102 (fixed, P5)

**Question:** 2/3 of Ali’s money equals 1/5 of Ben’s money. Express Ali’s money as a ratio of Ben’s money.

**Current selector:** ambiguous — no winner

**Method candidates:** ratio.relationship.part_whole_connection (64.5); ratio.relationship.ratio_units (64.5); ratio.relationship.equivalent_ratio_scale (58.25); ratio.relationship.scale_table (58.25)

**Prompt structure:** ratio_equivalent_units

**Independent mathematical analysis:** (2/3)A=(1/5)B => A/B=(1/5)÷(2/3)=3/10.

**Calculation:** 3 : 10. **Reported bank answer:** 3 : 10. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** method_fit_review. Equivalent common fractional quantity should govern the relationship.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P2 — MATH-P3-PROB-053-Q106 (fixed, P3)

**Question:** The sequence 6, 7, 4, 9, 2 repeats. What is the sum of the first 52 terms?

**Current selector:** ambiguous — no winner

**Method candidates:** patterns.sequence_rule.growing_difference (64.5); patterns.sequence_rule.recursive_rule (64.5); patterns.sequence_rule.repeating_cycle (64.5)

**Prompt structure:** sequence_repeating_cycle

**Independent mathematical analysis:** Cycle sum 6+7+4+9+2=28; 52=10×5+2, sum 10×28+6+7=293.

**Calculation:** 293. **Reported bank answer:** 293. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** tied_methods_distinguishable. Explicit repetition should distinguish repeating_cycle from growing_difference.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P2-PROB-036-Q04 (fixed, P2)

**Question:** Lionel sits in the 4th row from the front and the 3rd row from the back. How many rows are there altogether?

**Current selector:** ambiguous — no winner

**Method candidates:** heuristic.logic_strategy.constraint_table (77); heuristic.logic_strategy.elimination (77)

**Prompt structure:** ordinal_position

**Independent mathematical analysis:** 4th from front and 3rd from back overlap in one row: 4+3−1=6.

**Calculation:** 6. **Reported bank answer:** 6. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** tied_methods_both_questionable. Ordinal overlap is more specific than elimination or a constraint table.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P2-NUM-094-Q06 (fixed, P2)

**Question:** A farmer has 343 chickens and 536 ducks. How many birds are there altogether?

**Current selector:** ambiguous — no winner

**Method candidates:** model.part_whole.known_whole_find_part (77); model.part_whole.multi_part_strip (77); model.part_whole.parts_find_whole (77)

**Prompt structure:** part_whole_known_parts_whole_unknown

**Independent mathematical analysis:** 343 chickens plus 536 ducks = 879 birds.

**Calculation:** 879. **Reported bank answer:** 879. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** tied_methods_distinguishable. parts_find_whole is structurally different from known_whole_find_part.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P1 — MATH-P1-PROB-003-Q05 (fixed, P1)

**Question:** There are 9 balloons. 2 pop. How many are left?

**Current selector:** ambiguous — no winner

**Method candidates:** model.change.find_change (77); model.change.forward_change (77)

**Prompt structure:** change_known_initial_and_change_final_unknown

**Independent mathematical analysis:** 9 balloons initially; 2 pop; final is 9−2=7.

**Calculation:** 7. **Reported bank answer:** 7. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** tied_methods_distinguishable. Magnitude of change known; final unknown; not find-change.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

## P2 — MATH-P3-GEO-017-Q106 (fixed, P3)

**Question:** A square has area 36 cm² more than a smaller square. Both side lengths are positive whole numbers. What is the smaller square's side length?

**Current selector:** ambiguous — no winner

**Method candidates:** geometry.area_perimeter.distinguish_boundary_surface (60.333333); geometry.area_perimeter.rectangle_formula_meaning (60.333333)

**Prompt structure:** difference_of_square_areas

**Independent mathematical analysis:** For positive integer sides x>y, (x−y)(x+y)=36; only positive same-parity factor pair 2,18 gives y=8.

**Calculation:** 8 cm. **Reported bank answer:** 8 cm. **Answer comparison:** prompt_calculation_matches_reported_answer.

**Method-fit review flag:** method_family_coverage_review. Neither basic perimeter/area-distinction method describes difference-of-squares reasoning.

**Diagram status:** not_evaluated. **Curriculum approval:** pending. **Method approval:** pending.

---

