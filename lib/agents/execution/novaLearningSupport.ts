import "server-only";

type MachineSimpleQuestion = {
  question_type?: unknown;
  requires_manual_marking?: unknown;
  status?: unknown;
};

export const NOVA_LEARNING_MACHINE_SIMPLE_TYPES = [
  "multiple_choice",
  "true_false",
  "listening_comprehension",
] as const;

export function isNovaLearningMachineSimpleQuestion(
  question: MachineSimpleQuestion | null | undefined,
) {
  if (!question) {
    return false;
  }

  if (
    String(
      question.status || "",
    ).toLowerCase() !== "published"
  ) {
    return false;
  }

  if (
    question.requires_manual_marking === true
  ) {
    return false;
  }

  return NOVA_LEARNING_MACHINE_SIMPLE_TYPES.includes(
    String(
      question.question_type || "",
    ) as (
      typeof NOVA_LEARNING_MACHINE_SIMPLE_TYPES
    )[number],
  );
}