# NOVA+ Scenario Matrix — Phase 2B-1A

**Executable test:** `tests/nova-plus-phase2b1-decision-audit.test.cjs`, run with `node --test`. Set `NOVA_AUDIT_WRITE=1` to refresh `scenario-results.json`.

## How to read this

- **Production-equivalent (PE):** the client rule ran from its exact production source. Exported helpers were loaded as modules; private functions and inline expressions were extracted verbatim with the TypeScript AST. The *inputs* that Supabase would normally compute (status, trend, mastery, confidence, lane, stage) are synthetic fixtures.
- **Static (ST):** verified by inspecting source structure, not by executing it.
- **NOT TESTABLE (NT):** the decision runs inside a Supabase RPC whose SQL is not in the repository. No result is claimed.
- **EJ:** the expected interpretation is an expert-judgement assumption about good educational practice. It is not a proven standard.
- **Verdicts:** PASS means current behaviour matches the expected interpretation. FAIL means current behaviour conflicts with it. Every executable test asserts *current* behaviour, so the suite stays green; the verdict is recorded in each test name.

## Summary

| | Count |
|---|---|
| Scenarios | **36** |
| PASS | **13** |
| FAIL | **15** |
| NOT TESTABLE | **8** (7 server-side, 1 conditional) |

## Matrix

| ID | Category | Synthetic input | Expected interpretation | Actual output | Verdict | Rule · source | Notes |
|---|---|---|---|---|---|---|---|
| S01 | 1 Insufficient | Subject: 4 questions, 100% | No subject claim; "building picture" (EJ) | `unknown`, "Building Picture", no attention subject | **PASS** (PE) | `helpers.ts:24-32`, `milestones.ts:28-34` | 5-question floor applied consistently on My Learning |
| S02 | 1 Insufficient | Math concept: `not_enough_data`, 1 question, confidence 5 | "Needs more evidence"; no progress claim (EJ) | `building`: "This skill is developing. Progress is happening…" | **FAIL** (PE) | `MasteryMapTab.tsx:274-291, 361-368, 183-201` | "Needs More Evidence" appears only at 0 questions |
| S03 | 1 Insufficient | Skill: `emerging`, 1 question, attempted yesterday | No "needs attention" label from one answer (EJ) | "Needs Attention"; listed under "Needs continued attention" | **FAIL** (PE) | `ProgressTab.tsx:161-168, 499-514` | No minimum-evidence gate on Progress |
| S04 | 1 Insufficient | English 100% from 1 question; Math 62% from 40 | No "strongest area" from 1 question (EJ) | Parent Report: strongest = English. My Learning: English `unknown` | **FAIL** (PE) | `ParentReportTab.tsx:209-230` vs `helpers.ts:24-32` | Two tabs disagree on the same data |
| S05 | 2 Strong | `secure`, 92 mastery, conf 82, 30 q, 5 activities, 4 weeks | Strong everywhere (EJ) | SG Secure · MM Secure · Progress Strong · Parent Strength | **PASS** (PE) | SG 94-107, MM 274-291, PR 161-168, PA 100-106 | Clear cases are consistent |
| S06 | 2 Strong | Subject 92% over 20 q | Strong, top milestone, never "attention" | `strong`, Milestone 6 · Strong, no attention subject | **PASS** (PE) | `helpers.ts:24-51`, `milestones.ts:17-26` | |
| S07 | 3 Low | `needs_support`, 38, conf 72, 20 q, 3 activities, 3 weeks, ready | Confirmed gap (EJ) | SG Confirmed gap · MM Needs Practice · Progress Needs Attention · Parent Confirmed support | **PASS** (PE) | as S05 | |
| S08 | 3 Low | Subject 45% over 20 q | Attention; low milestone | `attention`, Milestone 2 · Building, attention subject = math | **PASS** (PE) | `helpers.ts`, `milestones.ts` | |
| S09 | 4 Improving | `developing`, improving, +12 points, **3 questions** | Too little evidence to call it "strengthened" (EJ); tabs should agree | Progress "Concepts strengthened" 1 · Parent "improved" 1 · SG "recently improved" 0 | **FAIL** (PE) | `ProgressTab.tsx:468-478`, `ParentReportTab.tsx:975-987`, `StrengthsGapsTab.tsx:558-570` | SG requires ≥4 questions; the others have no floor |
| S10 | 4 Improving | Attempt history rising over 6 weeks | `trend = improving` with sensible points | — | **NOT TESTABLE** | Profile RPC | Trend formula is server-side |
| S11 | 5 Declining | Skill trend `declining` / `no_data` | Parent sees "Declining" or "Not enough data" (EJ) | Expression `skill.trend === "improving" ? "Improving" : "Stable"` gives **"Stable"** for both | **FAIL** (PE) | `ParentReportTab.tsx:1266` | Hides declines from parents |
| S12 | 5 Declining | Secure skill now declining (−10) plus a weak skill | Decline surfaced first (EJ) | Order: declining, then weak | **PASS** (PE) | `ProgressTab.tsx:499-514` | |
| S13 | 6 Inconsistent | `needs_support`, 45, conf 40, 10 q, **1 activity, 1 week** | Consistent "still gathering evidence" message on every tab (EJ) | SG Still building · MM Building · Progress **Needs Attention** · Parent **(not shown)** | **FAIL** (PE) | SG 81-107, PR 161-168, PA 108-126 | Three different outcomes for one concept |
| S14 | 6 Inconsistent | `emerging`, 55, conf 50, 8 q | One shared label (EJ) | SG Still building · MM Building · Progress **Needs Attention** · Parent Building evidence | **FAIL** (PE) | as S13 | `emerging` means attention on one tab, developing on others |
| S15 | 7 Conflict | Quiz 90% on a concept; approved schoolwork 40% on the same concept | Mastery reflects both, weighted by quality and recency | — | **NOT TESTABLE** | `refresh_learner_skill_mastery_for_skills`, `commit_nova_schoolwork_review` | Merge logic is server-side |
| S16 | 7 Conflict | Schoolwork items with varied source, correctness and confidence | Teacher marks outweigh AI; uncertain or poorly mapped items get no weight (EJ) | teacher 0.8 / partial 0.6 / low-conf 0.5; model 0.5 or 0; uncertain 0; mapping 0.71 → 0, 0.72 → 0.5 | **PASS** (PE) | `analyse/route.ts:924-957` | Proposal only; the final weight is RPC-side |
| S17 | 7 Conflict | Teacher-marked correct, correctness confidence 0.6 | Review screen shows the weight the server will propose | UI "Teacher evidence · 0.80"; server proposes **0.5** | **FAIL** (PE) | `NovaSchoolworkUploader.tsx:255-296` vs `analyse/route.ts:924-957` | Parent-facing explanation is wrong |
| S18 | 7 Conflict | Model says include, `needs_review=false`, mapping **0.75** | Item starts in "review", because the stored rule forces review below 0.78 | Client default decision = **include**; the response sends the raw model flag | **FAIL** (PE + ST) | `analyse/route.ts:1689-1693, 1876-1886`; `NovaSchoolworkUploader.tsx:221-253` | Doubtful mapping can be committed in one click |
| S19 | 8 Missing content | Recommendation with empty `quiz_href` | "Practice mission unavailable", not clickable | Gate and copy present | **PASS** (ST) | `NovaRecommendsTab.tsx` `RecommendationCard` | Phase 2A fix; also runtime-tested in the Phase 2A suite |
| S20 | 8 Missing content | Weak concept with no published mapped mission | Not recommended, or flagged as unavailable | — | **NOT TESTABLE** | `get_nova_plus_recommendations` | Eligibility is server-side |
| S21 | 8 Missing content | First recommendation is in `stretch`, or already in an open cycle | Parent "next step" matches Nova Recommends' Focus Now (EJ) | Parent picks it anyway (`recommendations[0]`) | **FAIL** (PE) | `ParentReportTab.tsx:1035-1036` vs `NovaRecommendsTab.tsx:1317-1376` | Can contradict Nova Recommends |
| S22 | 9 One weak | 3 secure concepts plus 1 repeated needs_support | Only that concept is a gap | 3 strong, 1 attention | **PASS** (PE) | `StrengthsGapsTab.tsx:94-107` | |
| S23 | 9 One weak | English 92, Math 88, Science none | No "needs attention" subject | null, so "Nothing urgent right now" | **PASS** (PE) | `helpers.ts:39-51` | Phase 2A fix |
| S24 | 10 Recency | Concept secure 9 months ago, nothing since | `review_due`, lower confidence | — | **NOT TESTABLE** | Profile RPC | Decay and `review_due` are server-side |
| S25 | 10 Recency | Secure concept, last practised **200 days ago**; 7-day report | Not a "this week" strength (EJ) | Listed under strengths (in-window count 0) | **FAIL** (PE) | `ParentReportTab.tsx:929-946` | Strengths use unwindowed `academicSkills` |
| S26 | 10 Recency | Only snapshots 1 and 2 days old; 30-day window | No 30-day comparison, or a clear label for the shorter span (EJ) | Baseline = the 2-day-old snapshot, presented as a 30-day change | **FAIL** (PE) | `ProgressTab.tsx:282-304` | Same pattern in Parent Report (`ParentReportTab.tsx:162-185`) |
| S27 | 11 Multi-concept | Duplicate concept rows, `english_quiz` row, legacy `-SKILL-` row, listening row, science row | One canonical row; others excluded | Only `a2` (strongest evidence) kept | **PASS** (PE) | `helpers.ts:87-191` | |
| S28 | 11 Multi-concept | 4 teaching signals of mixed level and recovery | Likely gaps and "needs reinforcement" first | gapR, gap, emg, obs | **PASS** (PE) | `teaching-evidence.ts:175-208` | |
| S29 | 12 Boundary | Subject 4 vs 5 q; 85 / 84.99 / 70 / 69.99; milestone 78 / 77.99 / 55 / 40 / 39.99 | Thresholds applied exactly | unknown/strong; strong/developing/developing/attention; 5/4/3/2/1 | **PASS** (PE) | `helpers.ts:24-32`, `milestones.ts:17-26` | Applied as coded. Whether 85/70/5 are the *right* thresholds is EJ and unvalidated |
| S30 | 12 Boundary | needs_support, 5 q, 3 activities, conf 55, ready | Same verdict on every tab (EJ) | Parent **Confirmed support**; SG **Still building** (needs ≥6 q). Boundaries: q6/a1/w2/c35 true, q5 false, c34.99 false | **FAIL** (PE) | `StrengthsGapsTab.tsx:81-92` vs `ParentReportTab.tsx:108-116` | Different thresholds for "gap" |
| S31 | 12 Boundary | English `Consolidating`, evidence confidence **Low**, 2 unique questions | Not "secure / enough evidence" (EJ) | group `strong`, "Secure: Nova has enough evidence…" | **FAIL** (PE) | `english-mastery-ui.ts:120-146`, `MasteryMapTab.tsx:183-196, 352-359` | Contradicts the server's own Low confidence |
| S32 | 12 Boundary | `secure`, 88, **conf 20**, 5 q, 1 activity | One shared label (EJ) | SG Secure · MM Secure · Progress Strong · Parent **(not shown)** | **FAIL** (PE) | SG 94-100, PA 100-106 | Parent requires confidence ≥55; others don't |
| S33 | 12 Boundary | Teaching signal: `observation`, 3 distinct questions | Headline matches the count | "Observed once" / "seen once" | **NOT TESTABLE** (conditional) | `teaching-evidence.ts:244-256` | False only if the server can tag `observation` with more than one occurrence. Server rule unknown |
| S34 | 6 / 12 | Mixed evidence near Focus Now cut-off | Focus Now only after repeated evidence (`rules.focus_requires_repeated_evidence`) | — | **NOT TESTABLE** | `get_nova_plus_recommendations` | |
| S35 | 2 / 3 / 12 | Correct/wrong sequences around mastery and confidence thresholds | Mastery and confidence formulas monotonic and calibrated | — | **NOT TESTABLE** | Profile RPC | |
| S36 | 1 / 12 | English evidence at a stage boundary | Stage and confidence assignment defensible | — | **NOT TESTABLE** | `get_english_mastery_profile_for_learner` | |

### Category coverage

| Category | Scenarios |
|---|---|
| 1 Insufficient evidence | S01–S04, S36 |
| 2 Sustained strong | S05, S06, S35 |
| 3 Sustained low | S07, S08, S35 |
| 4 Improving | S09, S10 |
| 5 Declining | S11, S12 |
| 6 Inconsistent | S13, S14, S34 |
| 7 Quiz vs schoolwork conflict | S15–S18 |
| 8 Missing / unpublished practice | S19–S21 |
| 9 One weak among strong | S22, S23 |
| 10 Old vs recent | S24–S26 |
| 11 Multiple concepts / topics | S27, S28 |
| 12 Boundary thresholds | S29–S33, S34–S36 |

The IDs skip no categories; S10, S15, S20 and S24 are the server-side counterparts of the executable scenarios next to them.
