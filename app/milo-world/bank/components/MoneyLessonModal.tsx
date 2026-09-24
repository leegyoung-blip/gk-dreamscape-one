"use client";

import { adaptMoneyLabLesson } from "../lib/legacy-money-lab-adapter";
import type {
  FinancialAdvisorId,
  FinancialLessonResponseMap,
} from "../lib/financial-learning-engine-types";
import type {
  MoneyLabCompletionResult,
  MoneyLabLesson,
} from "../lib/money-lab-types";
import FinancialLessonPlayer from "./FinancialLessonPlayer";

type MoneyLessonModalProps = {
  lesson: MoneyLabLesson | null;
  open: boolean;
  advisorId: FinancialAdvisorId;
  /**
   * Kept for backwards compatibility with MoneyLabPanel.
   * The current FinancialLessonPlayer no longer needs this flag because the
   * secured completion RPC decides whether a completion is new or a replay.
   */
  alreadyCompleted: boolean;
  loading: boolean;
  onClose: () => void;
  onComplete: (
    lessonKey: MoneyLabLesson["key"],
  ) => Promise<MoneyLabCompletionResult>;
};

export default function MoneyLessonModal({
  lesson,
  open,
  advisorId,
  loading,
  onClose,
  onComplete,
}: MoneyLessonModalProps) {
  const engineLesson = lesson ? adaptMoneyLabLesson(lesson) : null;

  return (
    <FinancialLessonPlayer
      lesson={engineLesson}
      open={open}
      advisorId={advisorId}
      loading={loading}
      onClose={onClose}
      onComplete={async (
        definition,
        _responses: FinancialLessonResponseMap,
      ) => {
        if (!definition.legacyLessonKey) {
          throw new Error("Lesson completion key is missing.");
        }

        return onComplete(definition.legacyLessonKey);
      }}
    />
  );
}
