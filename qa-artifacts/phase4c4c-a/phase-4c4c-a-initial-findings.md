# Phase 4C-4C-A — Initial Question-Specific Pedagogical Findings

The following observations derive from the actual text, supplied answer/explanation, and F4 candidate-method evidence in the joined cohorts. They are **preliminary desk-review notes**, not independent human-validated accuracy labels. No scores, confidence rules, question-bank entries, or student mastery assertions have been modified.

## 1. A real tie that appears resolvable with question semantics

**MATH-P1-PROB-050-Q02 — Fixed; ambiguous; model.change**

- Question: "A shop has 90 toys and sells 28. How many toys are left?"
- Source answer: 62.
- Equal-scoring candidates: `model.change.find_change` (77) and `model.change.forward_change` (77).
- The initial quantity (90) and change (28 toys sold) are **known**, while the final quantity is **unknown**. This is direct question evidence favoring a forward-change relationship. `find_change` normally corresponds to an unknown change given the initial and final states; those are not the roles in this question.
- **4C-4C-B feature proposal:** Represent the role of the unknown quantity and the direction of change as validated problem-structure evidence. Do not award scores merely because the prompt contains "sells" or arbitrarily favor one method.

## 2. A selected method that may be too broad

**MATH-P1-ASSESS-012-Q01 — Fixed; selected; patterns.sequence_rule.growing_difference (77)**

- Question gives the bottom row 1, 3, 5, 7 of a number pyramid; each box is explicitly defined as the **sum of two boxes below it**.
- Answer: 32; source workings: 4, 8, 12 → 12, 20 → 32.
- The selected method name describes growing differences, whereas the decisive rule is recursive adjacent addition. The method is related to patterns, but whether it is the best instructional method is **not established**.
- **Feature proposal:** Distinguish adjacent-sum recursive constructions from growing-difference sequences. Review method-family taxonomy fit before tuning weights.

## 3. Potentially good method, grade-level caution

**MATH-P2-PROB-041-Q03 — Holdout; selected; speed.distance_time.inverse_work_rate (77)**

- Three workers take 12 days; nine equally productive workers take 4 days, assuming the same total work and constant individual rate.
- `inverse_work_rate` is mathematically consistent with the described inverse relationship.
- However, this context and method are unusual for a P2 curricular treatment. Confirm whether this question is intentionally enriched / advanced and whether the method should be presented to a P2 learner in this form.
- **Feature proposal:** Separate "mathematically fits" from "is appropriate for the learner's grade and teaching goal". Do not infer a curriculum violation solely from the code or label.

## 4. Positional logic may need a more specific explanation

**MATH-P1-ASSESS-012-Q06 — Fixed; selected; heuristic.logic_strategy.elimination (77)**

- With 9 people before Ali, Ali is 10th; Tricia is immediately behind at 11th; 15 − 11 = 4 people behind.
- The selected elimination heuristic is not obviously the most natural method; position indexing followed by subtraction is the direct source explanation.
- **Feature proposal:** Audit whether positional/ordinal reasoning needs an explicit method or verified submethod instead of a broad `elimination` strategy.

## 5. Illustrative mathematically aligned selection

**MATH-P1-GEO-037-Q05 — Fixed; selected; heuristic.systematic_enumeration.spatial_sweep (77)**

- A 4-column by 3-row grid contains six 2×2 placements: 3 horizontal starting positions × 2 vertical starting positions.
- Spatial sweeping / systematic enumeration is consistent with the counting objective. This supports a useful Phase 4D plan: highlight each of the six 2×2 regions.
- This is a **text-based consistency observation**. The visual engine and rendered highlighting have not been audited here.

## 6. A selection that appears semantically plausible

**MATH-P1-ASSESS-011-Q07 — Fixed; selected; number.place_value.compare_order (77)**

- The incorrect claim is "87 is between 89 and 88"; comparing positions of 87, 88 and 89 is directly relevant.
- The other choices involve place-value regrouping and distance. `compare_order` is a plausible primary method for identifying the false statement, though a complete teaching explanation must check the alternatives rather than only that one option.

## 7. A visual-dependent selection that cannot yet be verified

**MATH-P1-GEO-002-Q05 — Fixed; selected; heuristic.systematic_enumeration.spatial_sweep (77)**

- Prompt asks how many triangles are used to make a picture; supplied answer is 3.
- The original export provides a Supabase `storage_path` for the image but not the pixels. The method is plausible, but neither the depicted triangle count nor any visual enumeration can be independently verified without the actual image.
- **Feature proposal:** Make media availability and visual-semantic verification explicit prerequisites of a diagram-grounded pedagogical *accuracy verdict*, not necessarily of recognizing candidate method families.

## 8. Early level + multistep symbols require policy clarity

**MATH-P1-PROB-057-Q03 — Fixed; selected; algebra.equation_unknown.inverse_two_step_early (77)**

- Question: `3 × □ + 8 = 20`, source answer 4; reverse operations give 20 − 8 = 12 and 12 ÷ 3 = 4.
- The selected method matches the algebraic structure, but the exact level and manner of presentation to P1 learners merits human curriculum review.
- **Feature proposal:** Require an explicit level-suitability check and distinguish optional enrichment from core P1 instruction.

## Readiness for evidence refinement

The records above justify a careful design of **question-role**, **pattern-recursion**, **ordinal-position**, **representation-type**, and **curriculum-suitability** evidence. They do **not** justify adding a score bonus to make more questions selected before ground-truth review. Selected methods and ambiguous candidates should first be labeled in the `ready-320-review.csv` file, with external diagrams inspected separately.
