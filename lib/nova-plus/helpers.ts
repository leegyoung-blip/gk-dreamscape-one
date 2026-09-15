import type {
  NovaSubjectKey,
  ProfileSubjectSummary,
  ProfileSkill,
} from "./types";

export const SUBJECT_META: Record<
  NovaSubjectKey,
  { label: string; short: string; icon: string }
> = {
  english: { label: "English", short: "English", icon: "✎" },
  math: { label: "Mathematics", short: "Math", icon: "∑" },
  science: { label: "Science", short: "Science", icon: "⚗" },
  knowledge: { label: "General Knowledge", short: "Knowledge", icon: "◎" },
};

export type SubjectState = "strong" | "developing" | "attention" | "unknown";

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function subjectState(
  summary: ProfileSubjectSummary | null | undefined,
): SubjectState {
  if (!summary || safeNumber(summary.questions_attempted) < 5) return "unknown";
  const mastery = safeNumber(summary.mastery_score);
  if (mastery >= 85) return "strong";
  if (mastery >= 70) return "developing";
  return "attention";
}

export function subjectStateLabel(state: SubjectState) {
  switch (state) {
    case "strong":
      return "Strong";
    case "developing":
      return "Developing";
    case "attention":
      return "Needs attention";
    default:
      return "Building picture";
  }
}

export function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/* --------------------------------------------------------------------------
 * NOVA+ concept helpers
 *
 * Learning Profile contains both true curriculum concepts and legacy/fallback
 * rows that were created from whole quiz titles. The latter are useful as
 * broad internal evidence, but must never be presented to families as a
 * learner "strength" or "gap".
 *
 * Keep this logic shared so Mastery Map, Nova Recommends, Parent Report and
 * the future uploaded-work pipeline can use the same concept definition.
 * -------------------------------------------------------------------------- */


const QUIZ_FALLBACK_SOURCES = new Set([
  "english_quiz",
  "math_quiz",
  "science_quiz",
  "core_quiz",
]);


export type NovaConceptScope = {
  subject?: string | null;
  domain?: string | null;
  topic?: string | null;
  skill_name?: string | null;
};

/**
 * English Listening / Viewing is intentionally outside NOVA+ assessment scope.
 * Keep this shared so Strengths & Gaps, Mastery Map, recommendations and reports
 * all use the same curriculum boundary.
 */
export function isNovaPlusAssessedConcept(scope: NovaConceptScope) {
  const subject = String(scope.subject || "").trim().toLowerCase();
  if (subject !== "english") return true;

  const area = [scope.domain, scope.topic, scope.skill_name]
    .map((value) => String(value || "").trim().toLowerCase())
    .join(" ");

  return !(/\blistening\b/.test(area) || /\bviewing\b/.test(area));
}

function normaliseSource(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function isQuizFallbackSkill(skill: ProfileSkill) {
  const source = normaliseSource(skill.source);

  if (QUIZ_FALLBACK_SOURCES.has(source)) return true;

  // Covers future legacy source names such as "something_quiz" without
  // excluding question-level mapped concept sources.
  if (/(^|_)quiz$/.test(source)) return true;

  // Defensive compatibility for a profile payload generated before `source`
  // was exposed. Existing fallback taxonomy rows use codes such as
  // ENG-P4-SKILL-COMP-004 / MATH-P1-SKILL-GEO-014, while the granular
  // curriculum catalogue uses concept codes such as ENG-P1-READ-MAIN-IDEA.
  if (!source && /-SKILL-/i.test(String(skill.skill_code || ""))) return true;

  return false;
}

export function isTrueConceptSkill(skill: ProfileSkill) {
  if (skill.is_topic_level) return false;
  if (!isNovaPlusAssessedConcept(skill)) return false;
  if (isQuizFallbackSkill(skill)) return false;

  return Boolean(
    String(skill.skill_name || "").trim() &&
      String(skill.skill_code || skill.skill_id || "").trim(),
  );
}

function conceptEvidenceScore(skill: ProfileSkill) {
  return (
    safeNumber(skill.questions_attempted) +
    safeNumber(skill.unique_activities) * 3 +
    safeNumber(skill.active_weeks) * 4 +
    safeNumber(skill.confidence_score) / 10 +
    (skill.granular_eligible ? 4 : 0) +
    (skill.evidence_quality === "ready" ? 6 : 0)
  );
}

/**
 * Returns one row per actual curriculum concept. If duplicate taxonomy rows
 * ever exist, the row carrying the strongest direct evidence wins.
 */
export function dedupeConceptSkills(rows: ProfileSkill[]) {
  const byConcept = new Map<string, ProfileSkill>();

  for (const skill of rows) {
    if (!isTrueConceptSkill(skill)) continue;

    const key = String(skill.skill_code || skill.skill_id || skill.skill_name)
      .trim()
      .toLowerCase();

    const current = byConcept.get(key);

    if (!current || conceptEvidenceScore(skill) > conceptEvidenceScore(current)) {
      byConcept.set(key, skill);
    }
  }

  return [...byConcept.values()];
}
