"use client";

import { adaptMoneyLabLesson } from "../lib/legacy-money-lab-adapter";
import type { FinancialAdvisorId, FinancialLessonResponseMap } from "../lib/financial-learning-engine-types";
import type { MoneyLabCompletionResult, MoneyLabLesson } from "../lib/money-lab-types";
import FinancialLessonPlayer from "./FinancialLessonPlayer";

export default function MoneyLessonModal({
  lesson,
  open,
  advisorId,
  alreadyCompleted,
  loading,
  onClose,
  onComplete,
}: {
  lesson: MoneyLabLesson | null;
  open: boolean;
  advisorId: FinancialAdvisorId;
  alreadyCompleted: boolean;
  loading: boolean;
  onClose: () => void;
  onComplete: (lessonKey: MoneyLabLesson["key"]) => Promise<MoneyLabCompletionResult>;
}) {
  const engineLesson = lesson ? adaptMoneyLabLesson(lesson) : null;

  return (
    <FinancialLessonPlayer
      lesson={engineLesson}
      open={open}
      advisorId={advisorId}
      alreadyCompleted={alreadyCompleted}
      loading={loading}
      onClose={onClose}
      onComplete={async (definition, _responses: FinancialLessonResponseMap) => {
        if (!definition.legacyLessonKey) throw new Error("Lesson completion key is missing.");
        return onComplete(definition.legacyLessonKey);
      }}
    />
  );
}
