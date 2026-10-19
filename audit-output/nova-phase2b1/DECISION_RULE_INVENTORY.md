# NOVA+ Decision Rule Inventory — Phase 2B-1A

Audit date: 2026-10-20 · Repository HEAD: `59f7def` · Read-only audit; no production source changed.

## 1. Where decisions execute

| Layer | What it decides | Source available in repo? | Locally executable? |
|---|---|---|---|
| **Supabase / PostgreSQL** | Skill `mastery_score`, `confidence_score`, `status`, `trend`/`trend_points`, `evidence_quality`, `granular_eligible`, subject summaries, snapshots, insights; recommendation lanes, ranking, `reason`, mission eligibility; learning cycles; English `stage` / `evidence_confidence`; teaching-evidence `evidence_level` / `recovery_state`; schoolwork evidence write and mastery recompute | **No.** No `CREATE FUNCTION` for any of these RPCs exists in the repo (searched all file types, excluding `node_modules`) | **No → NOT TESTABLE** |
| **Next.js API routes (TS)** | Schoolwork AI extraction, skill mapping, proposed evidence weight, review flags | Yes | Partly. Pure functions run via source extraction; LLM output is non-deterministic |
| **Client components (TS)** | Re-labelling, gating, filtering, sorting and summarising server values per tab | Yes | **Yes.** Executed verbatim in `tests/nova-plus-phase2b1-decision-audit.test.cjs` |

### Supabase RPC dependencies (bodies not in repo)

| RPC | Caller | Decision owned |
|---|---|---|
| `get_nova_plus_learning_profile` / `refresh_nova_plus_learning_profile` (wrap `get_learning_profile_payload`) | `hooks/useNovaPlusProfile.ts` | All skill/subject mastery, confidence, status, trend, evidence quality, insights, snapshots |
| `get_nova_plus_recommendations` | `components/nova-plus/tabs/NovaRecommendsTab.tsx:1215`, `ParentReportTab.tsx`, `app/api/nova-plus/schoolwork/commit/route.ts:101` | Focus Now / Build Next / Reassess / Stretch, order, `recommendation_score`, `reason`, quiz + alternatives (mission eligibility) |
| `get_nova_learning_cycles`, `start_nova_learning_cycle` | `NovaRecommendsTab.tsx:1223` | Open cycles, readiness for a Nova Check |
| `get_english_mastery_profile_for_learner` | `hooks/useEnglishMasteryProfile.ts` | English `stage`, `evidence_confidence`, `effective_evidence_weight`, recency shares |
| `get_core_teaching_evidence_for_learner` | `hooks/useNovaTeachingEvidence.ts` | Misconception `evidence_level`, `recovery_state` |
| `commit_nova_schoolwork_review` | `app/api/nova-plus/schoolwork/commit/route.ts:159` | Final evidence weights written to the profile |
| `refresh_learner_skill_mastery_for_skills` | `commit/route.ts:197` | Mastery recompute after schoolwork; how quiz and schoolwork evidence are merged |
| `get_nova_schoolwork_evidence_summary` | `hooks/useNovaSchoolworkEvidence.ts` | `weighted_evidence`, `weighted_correct`, counts |

## 2. Mastery, evidence quality and confidence

| Rule | Location | Logic | Layer |
|---|---|---|---|
| Skill mastery / confidence / status / trend | RPC profile builder | Unknown | **Supabase (not in repo)** |
| Concept eligibility (true concept) | `lib/nova-plus/helpers.ts:147-156` `isTrueConceptSkill` | not topic-level, assessed subject, not a quiz-fallback source, has a name and a code | TS |
| Quiz-fallback exclusion | `helpers.ts:87-92, 129-145` `isQuizFallbackSkill` | source ∈ {english_quiz, math_quiz, science_quiz, core_quiz}, or `/(^|_)quiz$/`, or no source and a `-SKILL-` code | TS |
| Assessed boundary | `helpers.ts:112-123` `isNovaPlusAssessedConcept` | Science excluded; English listening/viewing excluded | TS |
| Concept dedupe | `helpers.ts:158-191` `conceptEvidenceScore`, `dedupeConceptSkills` | q + 3·activities + 4·weeks + conf/10 + 4 if granular + 6 if ready; highest wins | TS |
| Canonical source (Progress / Parent) | `ProgressTab.tsx:102-113`, `ParentReportTab.tsx:85-98` | exact `source === "nova_curriculum_rollout_sql"` | TS |
| Canonical source (Mastery Map) | `MasteryMapTab.tsx:250-263` | empty source **or** the rollout source | TS (diverges from the row above) |
| Math confidence label | `MasteryMapTab.tsx:237-242` `confidenceFromLegacyScore` | ≥70 High, ≥40 Moderate, else Low | TS label on a server score |

## 3. Confidence thresholds and minimum sample sizes (client)

| Claim | Location | Minimum evidence |
|---|---|---|
| Subject state | `helpers.ts:24-32` `subjectState` | ≥5 questions; ≥85 strong, ≥70 developing, else attention |
| Subject milestone | `components/nova-plus/my-learning/milestones.ts:17-34` | ≥5 questions; 85/78/70/55/40 cut-points |
| "Repeated evidence" for a gap | `StrengthsGapsTab.tsx:81-92`, duplicated at `MasteryMapTab.tsx:265-272` | ≥6 questions AND (≥2 activities OR ≥2 weeks) AND confidence ≥35 |
| Secure concept (SG, Mastery Map) | `StrengthsGapsTab.tsx:94-100`, `MasteryMapTab.tsx:279-284` | server secure/mastered AND ≥5 questions; **no confidence check** |
| Parent strength | `ParentReportTab.tsx:100-106` `isStrongSkill` | secure/mastered AND ≥5 questions AND confidence ≥55 |
| Parent confirmed support | `ParentReportTab.tsx:108-116` | needs_support AND granular AND ready AND ≥5 questions AND confidence ≥55 |
| Parent building evidence | `ParentReportTab.tsx:118-126` | emerging/developing/not_enough_data AND ≥3 questions AND (recent wrong OR declining) |
| Progress "Needs Attention" | `ProgressTab.tsx:161-168, 499-514` | **None.** needs_support/emerging/review_due or declining |
| Progress / Parent "improved" | `ProgressTab.tsx:468-478`, `ParentReportTab.tsx:975-987` | **None.** improving AND trend_points > 0 |
| SG "recently improved" | `StrengthsGapsTab.tsx:558-570` | ≥4 questions |
| Parent strongest subject | `ParentReportTab.tsx:220-230` | **None** |
| Teaching headline | `lib/nova-plus/teaching-evidence.ts:244-256` | "Observed once" for `observation`, whatever the count |

## 4. Subject milestone classification

- `milestoneFromScore` (`milestones.ts:17-26`): ≥85 → 6 Strong, ≥78 → 5 Consolidating, ≥70 → 4 Developing, ≥55 → 3 Progressing, ≥40 → 2 Building, else 1 Starting.
- `milestoneForEvidence` (`milestones.ts:28-34`): null below 5 questions, shown as "Building Picture".
- Used by `SubjectMilestoneCard.tsx`, `tabs/MyLearningTab.tsx` and `MilestoneJourney.tsx`. `MilestoneJourney.tsx:25` still includes Science, which is locked everywhere else.
- The labels reuse the English server stage names (Starting…Strong) on a client-defined scale.

## 5. Strengths & Gaps rules

`components/nova-plus/tabs/StrengthsGapsTab.tsx` (live; the root `components/nova-plus/StrengthsGapsTab.tsx` is orphaned):

- Eligibility (145-156): ≥2 questions, then `dedupeConceptSkills`.
- State (94-107):
  - strong = secure/mastered with ≥5 questions
  - attention = needs_support with repeated evidence
  - everything else is "developing", shown as "Still building"
- Sort (118-139):
  - strong: mastery descending
  - attention: mastery ascending, then recent wrong answers descending
  - each column capped at 8
- Recently improved (558-570): improving, positive points, ≥4 questions, top 6.
- English uses the legacy `ProfileSkill.status` here, while Mastery Map uses the English mastery model, so the two tabs can disagree.

## 6. Focus Now / Build Next / Reassess / Stretch

| Step | Location | Layer |
|---|---|---|
| Lane assignment, ranking, `reason`, `persistent_weakness`, `review_due` | `get_nova_plus_recommendations` | **Supabase (not in repo)** |
| Remove skills already in an open cycle | `NovaRecommendsTab.tsx:1317-1345` | TS (skipped silently if the cycles RPC fails) |
| Visible caps | `NovaRecommendsTab.tsx:1367-1376` | TS: `focus_now[0]`, `build_next.slice(0,2)`, `reassess[0] ?? stretch[0]` |
| Server `rules` (`max_visible`, `focus_now_max`, …) | `lib/nova-plus/types.ts:265-272` | Typed but **never read** by the client |
| Parent "One clear next step" | `ParentReportTab.tsx:1035-1036` | TS: `recommendations[0]`, no lane or cycle check |

## 7. Recency and conflicting-evidence weighting

- **Server:** recency, decay, `review_due`, English `recent_90_*`, and the quiz-versus-schoolwork merge are all RPC-side and not visible in the repo.
- **Client windowing** (by `last_attempted_at` only):
  - Progress: `ProgressTab.tsx:63-83` (7/30/90/all)
  - Parent Report: `ParentReportTab.tsx:57-68`
  - Parent strengths, support and building lists use the **unwindowed** `academicSkills` (`ParentReportTab.tsx:934-973`)
- **Baseline:** `ProgressTab.tsx:282-304` uses the last snapshot before the window start, otherwise the **earliest** snapshot.
- **Teaching evidence window:** clamped to 7–365 days, default 90 (`hooks/useNovaTeachingEvidence.ts:52`).

## 8. Schoolwork evidence (TS proposal layer)

| Rule | Location |
|---|---|
| Skill pool: same subject and level, `source = nova_curriculum_rollout_sql`, active, approved, not topic-level; listening/viewing removed | `app/api/nova-plus/schoolwork/analyse/route.ts:1492-1518` |
| Model limited to valid codes; codes re-checked afterwards | `analyse/route.ts:712-853, 133-158, 1587-1612` |
| Proposed weight | `analyse/route.ts:924-957` `proposedEvidenceWeight`: 0 if excluded, no skill, uncertain or mapping <0.72; teacher/combined 0.8 (partial 0.6) if correctness ≥0.75 and mapping ≥0.8, else 0.5; model-only 0.5 (partial 0.35) if correctness ≥0.9 and mapping ≥0.85, else 0 |
| Stored `needs_review` | `analyse/route.ts:1689-1693`: model flag OR no skill OR mapping <0.78 OR extraction <0.78 |
| Response sent to the client | `analyse/route.ts:1876-1886` spreads the raw model item, so the client receives the model's own `needs_review` |
| Default review decision | `components/nova-plus/NovaSchoolworkUploader.tsx:221-253` |
| UI evidence label | `NovaSchoolworkUploader.tsx:255-296` `evidenceStrength`, an independent copy that disagrees with `proposedEvidenceWeight` |
| Final weight and mastery | `commit_nova_schoolwork_review`, `refresh_learner_skill_mastery_for_skills` (Supabase) |
| Non-determinism | OpenAI Responses API with no temperature or seed; model chosen by env vars and the settings table; fallback model (`analyse/route.ts:568-606`) |

## 9. Recommendation-to-mission eligibility

- Server decides which quiz is attached (`NovaRecommendation.quiz`, `alternatives`). Not testable locally.
- Client: missing or blank `quiz_href` shows "Practice mission unavailable" (`NovaRecommendsTab.tsx`, `RecommendationCard`). Valid link for a non-learner viewer shows the account notice. Admin preview is preserved (Phase 2A).

## 10. English mastery display

- `lib/nova-plus/english-mastery-ui.ts:120-146` `englishMasteryDisplayGroup`:
  - Not Yet Assessed → needs_evidence
  - Low confidence and stage in {Starting, Building, Progressing} → needs_evidence
  - Strong or Consolidating → strong, **at any confidence**
  - Starting or Building with Moderate/High confidence → attention
  - otherwise developing
- `english-mastery-ui.ts:45-92` `inferCurrentEnglishLevel`: the level with the most effective evidence weight, ties going higher. It ignores the server's `primary_level`.
- `MasteryMapTab.tsx:293-338` `inferMathCurrentLevel`: the same approach for Math.

## 11. Dead or orphaned code (not live, but a maintenance risk)

- `components/nova-plus/StrengthsGapsTab.tsx` and `components/nova-plus/MyLearningTab.tsx` (root): imported nowhere, and their CSS modules are missing.
- `components/nova-plus/mastery/MasteryOrbit.tsx`, `MasteryConceptDetail.tsx`, `MasteryTeachingSignal.tsx`: imported only by each other.
- `MasteryMapTab.tsx:410-415` writes the sessionStorage key `nova-plus-mastery-focus-v1`, which nothing reads.
