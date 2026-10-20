# NOVA+ Confirmed-Gap Policy — Read-Only Diagnostic Plan

Status: **plan only.** No query has been run. Nothing in this note reads, writes or exports learner data.
Context: Phase 2B-1B shared classifier, `lib/nova-plus/evidence-presentation.ts` (`classifyConceptEvidence`).

## Why measure

The 2B-1B classifier confirms a gap only when **every** earlier NOVA+ rule agrees. That fails closed (no unsupported "Needs attention" claims), but it may hide support priorities that one earlier tab used to show. Before changing the policy, for example by adding a "Possible support area — still confirming" state (a pending product decision), measure how many concepts each rule affects.

## Population

Concept rows where the server status is `needs_support` **and** `questions_attempted >= 5` (the existing claim floor). Use only canonical curriculum concepts: the same eligibility the tabs use (`source = 'nova_curriculum_rollout_sql'`, not topic-level, English/Math, excluding English listening/viewing).

## Rules being compared (existing rules only)

| Rule | Definition |
|---|---|
| **SG**: earlier Strengths & Gaps / Mastery Map gap | `questions_attempted >= 6` AND (`unique_activities >= 2` OR `active_weeks >= 2`) AND `confidence_score >= 35` |
| **PR**: earlier Parent Report confirmed support | `granular_eligible = true` AND `evidence_quality = 'ready'` AND `questions_attempted >= 5` AND `confidence_score >= 55` |
| **Current (2B-1B)** | SG AND PR (`classifyConceptEvidence` → `confirmed_gap`) |

## Counts to produce (aggregate only)

| Bucket | Meaning | Shown as a confirmed gap today? |
|---|---|---|
| `sg_only` | SG true, PR false | No (was a gap on Strengths & Gaps / Mastery Map) |
| `pr_only` | PR true, SG false | No (was confirmed on Parent Report) |
| `both` | SG true, PR true | **Yes** |
| `neither` | SG false, PR false | No (was not a gap anywhere) |

Recommended breakdowns, still aggregate:
- by subject (english / math)
- by primary level
- the number of distinct learners per bucket, reported only as a count

**Output shape:** for example `{subject, primary_level, bucket, concept_rows, distinct_learners}`. Suppress any cell below a small-count threshold agreed with the privacy owner.

## Preconditions before any run

1. **Confirm where the fields live.**
   - `status`, `confidence_score`, `questions_attempted`, `unique_activities` and `active_weeks` appear in the profile payload (`ProfileSkill`).
   - `granular_eligible` and `evidence_quality` may be **computed by the profile builder** rather than stored in a table.
   - The real source must be confirmed from the read-only function definitions (`pg_get_functiondef`) first. Do not assume table or column names.
2. **Run only on an approved environment:** read-only role, aggregate output, no row-level export, no identifiers. A de-identified copy or non-production branch is preferred, and anything else needs explicit approval.
3. **Commit nothing to the repo** except this plan and the aggregate result once approved. Raw function dumps and data stay out.

## Decision this informs

- **If `sg_only` and `pr_only` are small:** keep the strict intersection.
- **If either is material:** the product owner chooses between:
  - (a) a separate, clearly worded "Possible support area — still confirming" state for unconfirmed `needs_support` concepts with 5+ questions, or
  - (b) adopting one earlier rule as the single policy.

  Either way, no new numeric thresholds.
