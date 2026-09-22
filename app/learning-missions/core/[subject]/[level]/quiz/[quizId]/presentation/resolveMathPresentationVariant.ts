import type { QuizQuestion } from "../CoreQuizTypes";
import { getQuestionVisualMediaCount } from "../CoreQuizUtils";

export type MathPresentationVariant =
  | "calculation"
  | "word_problem"
  | "visual_math"
  | "geometry"
  | "data_question"
  | "standard_math";

const VARIANTS = new Set<MathPresentationVariant>([
  "calculation",
  "word_problem",
  "visual_math",
  "geometry",
  "data_question",
  "standard_math",
]);

function normalise(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function explicitVariant(question: QuizQuestion): MathPresentationVariant | null {
  const raw = normalise(question.content?.presentation_variant);
  return VARIANTS.has(raw as MathPresentationVariant)
    ? (raw as MathPresentationVariant)
    : null;
}

function hasGeometrySignal(question: QuizQuestion) {
  const haystack = `${question.skill ?? ""} ${question.prompt}`.toLowerCase();
  return /\b(geometry|angle|angles|triangle|triangles|quadrilateral|quadrilaterals|rectangle|rectangles|square|squares|polygon|polygons|parallel|perpendicular|symmetry|symmetric|line of symmetry|circle|radius|diameter|perimeter|area of|volume|solid|shape|shapes|cube|cuboid|prism)\b/.test(
    haystack,
  );
}

function looksLikeCalculation(prompt: string) {
  const compact = prompt.trim();
  if (!compact || compact.length > 92) return false;

  // Conservative: only classify short prompts that are mostly mathematical
  // notation/numbers, or that clearly ask for a straightforward calculation.
  const notationOnly = /^[\s\d.,%$¢+\-−×xX÷/*=<>?:()\[\]{}¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+$/u.test(
    compact,
  );

  if (notationOnly) return true;

  return /^(calculate|work out|find|evaluate|simplify)\b/i.test(compact);
}

function looksLikeWordProblem(prompt: string) {
  const compact = prompt.trim();
  if (compact.length >= 105) return true;

  const sentenceCount = (compact.match(/[.!?](?:\s|$)/g) ?? []).length;
  if (sentenceCount >= 2 && compact.length >= 58) return true;

  return false;
}

export function resolveMathPresentationVariant(
  question: QuizQuestion,
): MathPresentationVariant {
  const explicit = explicitVariant(question);
  if (explicit) return explicit;

  const stimulusType = question.stimulus?.stimulus_type;

  if (stimulusType === "graph" || stimulusType === "table") {
    return "data_question";
  }

  if (hasGeometrySignal(question)) {
    return "geometry";
  }

  if (getQuestionVisualMediaCount(question) > 0) {
    return "visual_math";
  }

  if (looksLikeCalculation(question.prompt)) {
    return "calculation";
  }

  if (looksLikeWordProblem(question.prompt)) {
    return "word_problem";
  }

  return "standard_math";
}
