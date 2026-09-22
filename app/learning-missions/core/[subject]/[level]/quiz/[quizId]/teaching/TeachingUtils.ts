import type { JsonObject, QuizQuestion } from "../CoreQuizTypes";
import type {
  NormalisedTeachingEvidence,
  NormalisedTeachingLesson,
  NormalisedTeachingMisconception,
  NormalisedTeachingQuickCheck,
  NormalisedTeachingText,
  TeachingConfig,
  TeachingEvidence,
  TeachingLesson,
  TeachingLessonItem,
  TeachingLessonObject,
  TeachingMisconception,
  TeachingQuickCheck,
  TeachingQuickCheckOption,
  TeachingQuickCheckType,
  TeachingTextBlock,
} from "./TeachingTypes";

export function isTeachingRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function teachingString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normaliseEvidenceItem(
  value: unknown,
): NormalisedTeachingEvidence | null {
  if (!isTeachingRecord(value)) return null;

  const text = teachingString(value.text);
  if (!text) return null;

  const occurrenceNumber = Number(value.occurrence);

  return {
    text,
    label: teachingString(value.label),
    role: teachingString(value.role),
    occurrence:
      Number.isFinite(occurrenceNumber) && occurrenceNumber >= 1
        ? Math.floor(occurrenceNumber)
        : 1,
  };
}

export function normaliseTeachingEvidence(
  value: unknown,
): NormalisedTeachingEvidence[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normaliseEvidenceItem)
    .filter(Boolean) as NormalisedTeachingEvidence[];
}

export function readTeachingConfig(
  content: JsonObject | null | undefined,
): TeachingConfig | null {
  const raw = content?.teaching;
  if (!isTeachingRecord(raw)) return null;
  return raw as TeachingConfig;
}

export function normaliseTeachingText(
  value: TeachingTextBlock | null | undefined,
): NormalisedTeachingText | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text
      ? { title: null, text, code: null, evidence: [] }
      : null;
  }

  if (!isTeachingRecord(value)) return null;

  const text =
    teachingString(value.text) ||
    teachingString(value.summary) ||
    teachingString(value.body);

  if (!text) return null;

  const evidence = normaliseTeachingEvidence(
    Array.isArray(value.evidence) ? value.evidence : value.clues,
  );

  return {
    title: teachingString(value.title),
    text,
    code: teachingString(value.code),
    evidence,
  };
}

function normaliseLessonItem(value: TeachingLessonItem) {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? { title: null, text } : null;
  }

  if (!isTeachingRecord(value)) return null;

  const text = teachingString(value.text) || teachingString(value.body);
  if (!text) return null;

  return {
    title: teachingString(value.title),
    text,
  };
}

export function normaliseTeachingLesson(
  value: TeachingLesson | null | undefined,
): NormalisedTeachingLesson | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text
      ? {
          type: "simple_explanation",
          title: null,
          text,
          steps: [],
          examples: [],
          source: null,
        }
      : null;
  }

  if (!isTeachingRecord(value)) return null;

  const text =
    teachingString(value.text) ||
    teachingString(value.summary) ||
    teachingString(value.body);

  const steps = Array.isArray(value.steps)
    ? value.steps
        .map((item) => normaliseLessonItem(item as TeachingLessonItem))
        .filter(Boolean) as Array<{ title: string | null; text: string }>
    : [];

  const examples = Array.isArray(value.examples)
    ? value.examples
        .map((item) => normaliseLessonItem(item as TeachingLessonItem))
        .filter(Boolean) as Array<{ title: string | null; text: string }>
    : [];

  // English lesson types can be meaningful even when they do not use the
  // shared text/steps/examples fields. Keep any typed lesson object that has a
  // type so the English renderer can read its structured source fields.
  const type = teachingString(value.type) || "simple_explanation";
  if (!text && steps.length === 0 && examples.length === 0 && !value.type) {
    return null;
  }

  return {
    type,
    title: teachingString(value.title),
    text,
    steps,
    examples,
    source: value as TeachingLessonObject,
  };
}

export function normaliseTeachingMisconception(
  value: TeachingTextBlock | TeachingMisconception | null | undefined,
): NormalisedTeachingMisconception | null {
  const text = normaliseTeachingText(value as TeachingTextBlock);
  if (!text) return null;

  const record: Record<string, unknown> | null = isTeachingRecord(value)
    ? (value as Record<string, unknown>)
    : null;
  const lesson =
    record && record.lesson
      ? normaliseTeachingLesson(record.lesson as TeachingLesson)
      : null;

  return {
    ...text,
    lesson,
  };
}

export function getSelectedResponseKeys(
  question: QuizQuestion,
  response?: JsonObject,
): string[] {
  if (!response) return [];

  if (
    question.question_type === "multiple_choice" ||
    question.question_type === "true_false" ||
    question.question_type === "listening_comprehension"
  ) {
    return response.option_id ? [String(response.option_id)] : [];
  }

  if (question.question_type === "multiple_select") {
    return Array.isArray(response.option_ids)
      ? response.option_ids.map(String)
      : [];
  }

  return [];
}

export function resolveAuthoredMisconception(
  question: QuizQuestion,
  response: JsonObject | undefined,
  teaching: TeachingConfig | null,
): NormalisedTeachingMisconception | null {
  const source = teaching?.misconceptions;
  if (!source || !isTeachingRecord(source)) return null;

  const selectedKeys = getSelectedResponseKeys(question, response);
  if (selectedKeys.length !== 1) return null;

  const selectedKey = selectedKeys[0];
  const candidates = [
    selectedKey,
    `option_${selectedKey}`,
    `option-${selectedKey}`,
  ];

  for (const key of candidates) {
    if (!(key in source)) continue;
    const normalised = normaliseTeachingMisconception(source[key]);
    if (normalised) return normalised;
  }

  return null;
}

export function sameTeachingText(left: string | null, right: string | null) {
  if (!left || !right) return false;

  const normalise = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

  return normalise(left) === normalise(right);
}

const QUICK_CHECK_TYPES = new Set<TeachingQuickCheckType>([
  "multiple_choice",
  "short_text",
  "numeric",
  "fraction",
]);

function finiteNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normaliseTeachingQuickCheck(
  value: TeachingQuickCheck | null | undefined,
): NormalisedTeachingQuickCheck | null {
  if (!isTeachingRecord(value)) return null;

  const prompt = teachingString(value.prompt);
  const rawType = teachingString(value.type) as TeachingQuickCheckType | null;
  if (!prompt || !rawType || !QUICK_CHECK_TYPES.has(rawType)) return null;

  const options: TeachingQuickCheckOption[] = Array.isArray(value.options)
    ? value.options
        .map((option, index) => {
          if (!isTeachingRecord(option)) return null;
          const text = teachingString(option.text);
          if (!text) return null;
          return {
            id: teachingString(option.id) || String.fromCharCode(97 + index),
            text,
          };
        })
        .filter(Boolean) as TeachingQuickCheckOption[]
    : [];

  const acceptedAnswers = Array.isArray(value.accepted_answers)
    ? value.accepted_answers
        .map((answer) => teachingString(answer))
        .filter(Boolean) as string[]
    : [];

  const correctOptionId = teachingString(value.correct_option_id);
  const numericValue = finiteNumber(value.value);
  const tolerance = Math.max(0, finiteNumber(value.tolerance) ?? 0);
  const numerator = finiteNumber(value.numerator);
  const denominator = finiteNumber(value.denominator);

  if (rawType === "multiple_choice") {
    if (options.length < 2 || !correctOptionId) return null;
    if (!options.some((option) => option.id === correctOptionId)) return null;
  }

  if (rawType === "short_text" && acceptedAnswers.length === 0) return null;
  if (rawType === "numeric" && numericValue == null) return null;
  if (
    rawType === "fraction" &&
    (numerator == null ||
      denominator == null ||
      !Number.isInteger(numerator) ||
      !Number.isInteger(denominator) ||
      denominator === 0)
  ) {
    return null;
  }

  return {
    title: teachingString(value.title),
    instruction: teachingString(value.instruction),
    prompt,
    type: rawType,
    options,
    correctOptionId,
    acceptedAnswers,
    value: numericValue,
    tolerance,
    numerator,
    denominator,
    allowEquivalent: value.allow_equivalent !== false,
    explanation: teachingString(value.explanation),
  };
}

function normaliseAnswerText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export type TeachingQuickCheckResponse =
  | { optionId: string }
  | { text: string }
  | { value: string }
  | { numerator: string; denominator: string };

export function evaluateTeachingQuickCheck(
  quickCheck: NormalisedTeachingQuickCheck,
  response: TeachingQuickCheckResponse,
) {
  if (quickCheck.type === "multiple_choice") {
    return "optionId" in response && response.optionId === quickCheck.correctOptionId;
  }

  if (quickCheck.type === "short_text") {
    if (!("text" in response)) return false;
    const learner = normaliseAnswerText(response.text);
    return quickCheck.acceptedAnswers.some(
      (answer) => normaliseAnswerText(answer) === learner,
    );
  }

  if (quickCheck.type === "numeric") {
    if (!("value" in response)) return false;
    const learner = Number(response.value);
    if (!Number.isFinite(learner) || quickCheck.value == null) return false;
    return Math.abs(learner - quickCheck.value) <= quickCheck.tolerance;
  }

  if (!("numerator" in response) || !("denominator" in response)) return false;
  const learnerNumerator = Number(response.numerator);
  const learnerDenominator = Number(response.denominator);
  if (
    !Number.isInteger(learnerNumerator) ||
    !Number.isInteger(learnerDenominator) ||
    learnerDenominator === 0 ||
    quickCheck.numerator == null ||
    quickCheck.denominator == null
  ) {
    return false;
  }

  if (quickCheck.allowEquivalent) {
    return (
      learnerNumerator * quickCheck.denominator ===
      quickCheck.numerator * learnerDenominator
    );
  }

  return (
    learnerNumerator === quickCheck.numerator &&
    learnerDenominator === quickCheck.denominator
  );
}

