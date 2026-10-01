import type {
  CanonicalTeachingInputIssue,
  CanonicalTeachingQuestion,
} from "./types";

export function validateCanonicalTeachingQuestion(
  question: Omit<CanonicalTeachingQuestion, "diagnostics">,
): CanonicalTeachingInputIssue[] {
  const issues: CanonicalTeachingInputIssue[] = [];

  if (!question.identity.questionId) {
    issues.push({
      severity: "blocking",
      code: "MISSING_QUESTION_ID",
      message: "The source question does not have a valid question ID.",
      path: "identity.questionId",
    });
  }

  if (!question.content.prompt.trim()) {
    issues.push({
      severity: "blocking",
      code: "MISSING_PROMPT",
      message: "The question prompt is empty.",
      path: "content.prompt",
    });
  }

  if (question.curriculum.level === null) {
    issues.push({
      severity: "blocking",
      code: "MISSING_LEVEL",
      message:
        "The learner Primary level could not be established from the source question.",
      path: "curriculum.level",
    });
  }

  if (!question.answer.canonicalAnswer) {
    issues.push({
      severity: "blocking",
      code: "MISSING_ANSWER",
      message:
        "The source question does not provide a canonical answer that the Teaching Engine can validate against.",
      path: "answer.canonicalAnswer",
    });
  }

  if (question.curriculum.primarySkill === null) {
    issues.push({
      severity: "warning",
      code: "MISSING_SKILL_MAPPING",
      message:
        "No granular primary skill mapping was supplied. The legacy skill label has been preserved but is not treated as the canonical skill mapping.",
      path: "curriculum.primarySkill",
    });
  }

  if (
    question.content.questionType === "unknown" &&
    question.content.parts.length === 0
  ) {
    issues.push({
      severity: "warning",
      code: "UNKNOWN_QUESTION_TYPE",
      message:
        "The source question type is not currently mapped to a canonical teaching question type.",
      path: "content.questionType",
    });
  }

  if (question.content.questionType === "mcq") {
    const correctOptions = question.content.options.filter(
      (option) => option.isCorrect === true,
    );

    if (correctOptions.length !== 1) {
      issues.push({
        severity: "blocking",
        code: "INVALID_CORRECT_OPTION",
        message:
          "A canonical MCQ must contain exactly one valid correct option.",
        path: "content.options",
      });
    }
  }

  if (question.content.questionType === "multi_select") {
    const correctOptions = question.content.options.filter(
      (option) => option.isCorrect === true,
    );

    if (correctOptions.length < 1) {
      issues.push({
        severity: "blocking",
        code: "INVALID_CORRECT_OPTION",
        message:
          "A canonical multi-select question must contain at least one correct option.",
        path: "content.options",
      });
    }
  }

  for (const media of question.media.originalMedia) {
    const hasResolvableReference =
      Boolean(media.url?.trim()) || Boolean(media.storagePath?.trim());

    if (!hasResolvableReference) {
      issues.push({
        severity: "warning",
        code: "BROKEN_MEDIA_REFERENCE",
        message:
          "A source media record exists but has no usable URL or storage path.",
        path: "media.originalMedia",
      });
    }
  }

  if (
    question.content.parts.some(
      (part) => !part.key.trim() || !part.prompt.trim(),
    )
  ) {
    issues.push({
      severity: "blocking",
      code: "INVALID_MULTIPART_STRUCTURE",
      message:
        "At least one multi-part question section is missing its key or prompt.",
      path: "content.parts",
    });
  }

  return issues;
}
