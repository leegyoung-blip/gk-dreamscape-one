import {
  readMathVisualSpec,
  type MathVisualKind,
} from "@/components/core-math/visual-engine";
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

function promptMathVisualKinds(question: QuizQuestion) {
  const result = readMathVisualSpec(question.content?.math_visual);
  const kinds = new Set<MathVisualKind>();

  result.spec?.visuals.forEach((visual) => {
    if (visual.placement === "prompt") kinds.add(visual.kind);
  });

  return kinds;
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
  const notationOnly = /^[\s\d.,%$¢+\-−×xX÷/\*=<>?:()\[\]{}¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+$/u.test(
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

  // Math Visual V2 is canonical. During migration, a question can temporarily
  // retain legacy stimulus/assets. Prefer V2 semantic meaning so stale legacy
  // media cannot force the wrong presentation layout.
  const visualKinds = promptMathVisualKinds(question);

  if (visualKinds.has("data") || visualKinds.has("table")) {
    return "data_question";
  }

  if (visualKinds.has("geometry") || visualKinds.has("solid")) {
    return "geometry";
  }

  if (visualKinds.size > 0) {
    return "visual_math";
  }

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
