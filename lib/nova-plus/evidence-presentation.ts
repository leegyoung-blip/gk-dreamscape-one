import type {
  NovaRecommendation,
  ProfileSkill,
} from "./types";
import { safeNumber } from "./helpers";

/* --------------------------------------------------------------------------
 * NOVA+ presentation policy (display only).
 *
 * The server owns mastery, confidence, status, trend, lanes and ranking. This
 * module only decides which family-facing CLAIM the client may make from those
 * server values, so every tab says the same thing about the same concept.
 *
 * No new numeric thresholds are introduced here. Each gate reuses a rule that
 * already existed in NOVA+ before Phase 2B-1B:
 * - 5 questions: subject/milestone floor (helpers.subjectState) and the
 *   existing "strong" gates on Strengths & Gaps, Mastery Map, Parent Report.
 * - confidence >= 55: Parent Report strength / confirmed-support gates.
 * - repeated evidence (>= 6 questions, >= 2 activities or weeks,
 *   confidence >= 35): Strengths & Gaps / Mastery Map gap gate.
 * - granular + "ready" evidence: Parent Report confirmed-support gate.
 * - 4 questions: Strengths & Gaps "recently improved" gate.
 *
 * A confirmed claim requires EVERY existing policy to agree; otherwise the
 * concept is presented as still needing evidence rather than guessed.
 * -------------------------------------------------------------------------- */

/** Fields shared by profile skills and curriculum concepts. */
export type ConceptEvidence = Pick<
  ProfileSkill,
  "status" | "granular_eligible" | "evidence_quality"
> & {
  questions_attempted: number | null | undefined;
  unique_activities: number | null | undefined;
  active_weeks: number | null | undefined;
  confidence_score: number | null | undefined;
};

export type ConceptClaim =
  | "supported_strength"
  | "confirmed_gap"
  | "developing"
  | "needs_evidence";

export const MIN_CLAIM_QUESTIONS = 5;
export const CONFIRMED_CLAIM_CONFIDENCE = 55;
export const IMPROVEMENT_MIN_QUESTIONS = 4;

export function hasRepeatedEvidence(concept: ConceptEvidence) {
  const questions = safeNumber(concept.questions_attempted);
  const activities = safeNumber(concept.unique_activities);
  const weeks = safeNumber(concept.active_weeks);
  const confidence = safeNumber(concept.confidence_score);

  return (
    questions >= 6 &&
    (activities >= 2 || weeks >= 2) &&
    confidence >= 35
  );
}

/**
 * Evidence sufficiency first, then the server's performance status.
 * - needs_evidence: too few questions, the server says not_enough_data, or a
 *   strength/gap the evidence does not yet confirm.
 * - developing: server emerging/developing/review_due with enough questions.
 */
export function classifyConceptEvidence(concept: ConceptEvidence): ConceptClaim {
  const questions = safeNumber(concept.questions_attempted);
  const confidence = safeNumber(concept.confidence_score);

  if (questions < MIN_CLAIM_QUESTIONS || concept.status === "not_enough_data") {
    return "needs_evidence";
  }

  if (concept.status === "secure" || concept.status === "mastered") {
    return confidence >= CONFIRMED_CLAIM_CONFIDENCE
      ? "supported_strength"
      : "needs_evidence";
  }

  if (concept.status === "needs_support") {
    return hasRepeatedEvidence(concept) &&
      confidence >= CONFIRMED_CLAIM_CONFIDENCE &&
      concept.granular_eligible &&
      concept.evidence_quality === "ready"
      ? "confirmed_gap"
      : "needs_evidence";
  }

  return "developing";
}

/** "Improved" needs a positive server trend and the existing 4-question floor. */
export function hasImprovementEvidence(
  skill: Pick<ProfileSkill, "trend" | "trend_points" | "questions_attempted">,
) {
  return (
    skill.trend === "improving" &&
    safeNumber(skill.trend_points) > 0 &&
    safeNumber(skill.questions_attempted) >= IMPROVEMENT_MIN_QUESTIONS
  );
}

/** Every server trend value gets its own label; missing data is never "Stable". */
export function trendDisplayLabel(trend: string | null | undefined) {
  switch (trend) {
    case "improving":
      return "Improving";
    case "declining":
      return "Declining";
    case "stable":
      return "Stable";
    default:
      return "Not enough data yet";
  }
}

/* ---------- Reporting period baseline ---------- */

type DatedSnapshot = {
  snapshot_date?: string | null;
  generated_at?: string | null;
};

export type PeriodBaseline<T> = {
  snapshot: T;
  /** True only when the snapshot is from on/before the period start. */
  coversPeriod: boolean;
  date: Date;
};

function snapshotDate(snapshot: DatedSnapshot) {
  const value = snapshot.snapshot_date ?? snapshot.generated_at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The latest snapshot on/before the period start. If none exists, the earliest
 * later snapshot is returned with coversPeriod=false so the UI can label the
 * shorter span honestly instead of calling it a full-period change.
 */
export function selectPeriodBaseline<T extends DatedSnapshot>(
  timeline: T[] | null | undefined,
  periodStart: Date,
): PeriodBaseline<T> | null {
  const dated = (timeline ?? [])
    .map((snapshot) => ({ snapshot, date: snapshotDate(snapshot) }))
    .filter((item): item is { snapshot: T; date: Date } => item.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const before = dated.filter((item) => item.date <= periodStart);
  if (before.length) {
    const last = before[before.length - 1];
    return { snapshot: last.snapshot, date: last.date, coversPeriod: true };
  }

  const first = dated[0];
  return first
    ? { snapshot: first.snapshot, date: first.date, coversPeriod: false }
    : null;
}

/* ---------- Next step (mirrors Nova Recommends' Focus Now) ---------- */

export function openCycleSkillIds(
  cycles: { open_cycles?: Array<{ skill_id: string }> | null } | null | undefined,
) {
  return new Set((cycles?.open_cycles ?? []).map((cycle) => String(cycle.skill_id)));
}

/**
 * Same selection Nova Recommends shows as its top priority: drop concepts that
 * already have an open learning cycle, then take the first server-ordered
 * focus_now item. Returns null instead of falling back to another lane.
 */
export function focusRecommendation(
  recommendations: NovaRecommendation[] | null | undefined,
  openSkillIds: Set<string>,
) {
  return (
    (recommendations ?? []).find(
      (item) =>
        item.lane === "focus_now" && !openSkillIds.has(String(item.skill_id)),
    ) ?? null
  );
}
