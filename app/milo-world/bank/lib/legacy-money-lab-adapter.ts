import type { FinancialLessonDefinition } from "./financial-learning-engine-types";
import type { MoneyLabLesson } from "./money-lab-types";

export function adaptMoneyLabLesson(lesson: MoneyLabLesson): FinancialLessonDefinition {
  return {
    schemaVersion: 1,
    id: `financial-foundations:${lesson.key}`,
    legacyLessonKey: lesson.key,
    courseId: "financial-foundations",
    order: lesson.order,
    title: lesson.title,
    shortTitle: lesson.shortTitle,
    description: lesson.description,
    duration: lesson.duration,
    rewardDt: lesson.rewardDt,
    accessTier: "free",
    concepts: lesson.concepts,
    blocks: lesson.steps.map((step, index) => {
      const id = `${lesson.key}:block:${index + 1}`;
      if (step.type === "info") {
        return {
          id,
          type: "explain" as const,
          eyebrow: step.eyebrow,
          title: step.title,
          body: step.body,
          example: step.example,
          advisorMessage: {
            nova: "Look for the principle behind this example. We’ll use it when the decisions become more complex.",
            milo: "Keep this idea in mind. You’ll use it across the Bank, Exchange and Business Builder.",
          },
        };
      }

      return {
        id,
        type: "question" as const,
        eyebrow: "Check your understanding",
        prompt: step.question,
        options: step.options.map((label, optionIndex) => ({
          id: `option-${optionIndex}`,
          label,
        })),
        correctOptionId: `option-${step.correctIndex}`,
        explanation: step.explanation,
        advisorMessage: {
          nova: "Choose the answer that best matches the financial principle, not simply the option that sounds safest.",
          milo: "Think about what the DT are actually doing before you choose.",
        },
      };
    }),
  };
}
