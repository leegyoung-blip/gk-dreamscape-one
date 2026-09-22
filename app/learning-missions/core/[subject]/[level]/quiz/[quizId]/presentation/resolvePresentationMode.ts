import type { CoreSubject, QuizQuestion } from "../CoreQuizTypes";
import { getQuestionVisualMediaCount } from "../CoreQuizUtils";

export type CorePresentationMode =
  | "standard_choice"
  | "language_choice"
  | "math_standard"
  | "visual_choice"
  | "text_response"
  | "sentence_reordering"
  | "matching"
  | "blank";

const PRESENTATION_MODES = new Set<CorePresentationMode>([
  "standard_choice",
  "language_choice",
  "math_standard",
  "visual_choice",
  "text_response",
  "sentence_reordering",
  "matching",
  "blank",
]);

function explicitPresentationMode(question: QuizQuestion) {
  const raw = String(question.content?.presentation_mode ?? "").trim();
  return PRESENTATION_MODES.has(raw as CorePresentationMode)
    ? (raw as CorePresentationMode)
    : null;
}

export function resolvePresentationMode(
  question: QuizQuestion,
  subject: CoreSubject,
): CorePresentationMode {
  const explicit = explicitPresentationMode(question);
  if (explicit) return explicit;

  switch (question.question_type) {
    case "sentence_reordering":
      return "sentence_reordering";
    case "matching":
      return "matching";
    case "word_bank":
    case "dropdown_cloze":
      return "blank";
    case "short_text":
    case "long_text":
    case "open_cloze":
    case "editing":
    case "picture_description":
    case "oral_recording":
      return "text_response";
    case "multiple_choice":
    case "multiple_select":
    case "true_false":
    case "listening_comprehension": {
      if (getQuestionVisualMediaCount(question) > 0) return "visual_choice";
      if (subject === "math") return "math_standard";
      if (subject === "english") return "language_choice";
      return "standard_choice";
    }
    default:
      return "standard_choice";
  }
}
