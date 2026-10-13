# Phase 4C-4C-A — Question-Level Pedagogical Audit Preparation

Generated from the user's original QA exports and their matching Phase F4 reports. This is an evidence-linked **review queue**, not a claim of human-verified pedagogical accuracy.

## Verified reconciliation

| Metric | Value |
|---|---:|
| Questions | 480 |
| Ready for review | 320 |
| Upstream blocked (separate queue) | 160 |
| Selected methods | 84 |
| Ambiguous | 236 |
| Adapter errors | 0 |
| Human verified method labels | 0 |
| External images needing separate verification | 26 |
| Ready questions relying on external images | 17 |
| Answer/option consistency flags (format only) | 0 |

## What to review first

P0: Selected methods with an external-image dependency, answer-option issue, or early-primary curriculum-level caution. P1: Remaining selections and equal/insufficient-margin ambiguities. P2: Low-quality winner cases. P3: Existing 4A blocks, tracked separately. P0/P1/P2 are **review priority**, not pedagogical verdicts.

## Ambiguity breakdown

- LOW_WINNER_QUALITY: 114
- INSUFFICIENT_WINNER_MARGIN: 122

## Most represented method families in ready questions

- data.read_compare_classify: 38
- fraction.multi_step: 26
- model.change: 22
- heuristic.logic_strategy: 19
- patterns.sequence_rule: 17
- ratio.relationship: 17
- number.place_value: 15
- algebra.equation_unknown: 14
- model.part_whole: 14
- geometry.area_perimeter: 13
- money.transaction: 12
- heuristic.systematic_enumeration: 10

## Evidence rules

1. **No automated correctness label** is assigned. Review fields are empty and must be filled by a qualified reviewer using source question + answer + method evidence.
2. The F4 score measures configured selection confidence, not observed mathematical or pedagogical accuracy.
3. Original text, correct answers, skill tags, method IDs and candidate scores are preserved where available; input JSON is never modified.
4. Remote Supabase media is **referenced, not fetched**. Images cannot be judged from storage paths or alt-text alone; embedded data URIs are noted but not reprinted in CSV.
5. Explanations provided in the question bank are reference evidence, **not independently verified solutions**.
6. No scoring weights, thresholds, registry entries, or 4A readiness baselines are modified.

## Source audit

- **fixed**: 240 questions; 179 ready, 61 upstream blocked; 50 selected, 129 ambiguous
- **holdout**: 240 questions; 141 ready, 99 upstream blocked; 34 selected, 107 ambiguous

## Decision gate before 4C-4C-B

Review selected methods first, sample the ambiguous cases from each dominant family, check external diagrams against actual rendered media, then approve question-backed feature discriminators. Never convert a tie to a selection using a fabricated evidence signal or a lowered threshold.
