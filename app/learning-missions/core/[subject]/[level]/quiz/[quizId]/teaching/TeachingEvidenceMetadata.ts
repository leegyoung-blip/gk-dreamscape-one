import type { QuizQuestion } from "../CoreQuizTypes";

function cleanString(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

/**
 * Phase 6 never guesses a Nova+/mastery concept from the visible wording.
 * It only forwards an explicit concept/taxonomy key when one already exists
 * in the question content. Skill/topic metadata remains available separately.
 */
export function readExplicitConceptKey(question: QuizQuestion) {
  const content = question.content || {};
  const candidates = [
    content.concept_key,
    content.concept_code,
    content.mastery_code,
    content.taxonomy_code,
    content.taxonomy_key,
    content.concept_id,
  ];

  for (const candidate of candidates) {
    const value = cleanString(candidate);
    if (value) return value;
  }

  return null;
}

export function buildTeachingEvidenceMetadata({
  question,
  primaryLevel,
  topicId,
  topicTitle,
  teachingVersion,
  extra,
}: {
  question: QuizQuestion;
  primaryLevel?: number | null;
  topicId?: string | null;
  topicTitle?: string | null;
  teachingVersion: number;
  extra?: Record<string, unknown>;
}) {
  return {
    teaching_version: teachingVersion,
    primary_level:
      typeof primaryLevel === "number" && Number.isFinite(primaryLevel)
        ? primaryLevel
        : null,
    topic_id: cleanString(topicId),
    topic_title: cleanString(topicTitle),
    skill: cleanString(question.skill),
    difficulty:
      typeof question.difficulty === "number" && Number.isFinite(question.difficulty)
        ? question.difficulty
        : null,
    question_order:
      typeof question.question_order === "number" &&
      Number.isFinite(question.question_order)
        ? question.question_order
        : null,
    concept_key: readExplicitConceptKey(question),
    ...(extra || {}),
  };
}
