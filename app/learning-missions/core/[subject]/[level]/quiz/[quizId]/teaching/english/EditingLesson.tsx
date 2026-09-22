"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import styles from "../CoreTeachingEngine.module.css";
import { sourceText } from "./EnglishTeachingUtils";

export default function EditingLesson({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const original = sourceText(lesson, "original") || question.prompt;
  const corrected =
    sourceText(lesson, "corrected") || sourceText(lesson, "correction");
  const problem = sourceText(lesson, "problem");
  const rule = sourceText(lesson, "rule");

  return (
    <div className={`${styles.lessonPanel} ${styles.englishLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      <div className={styles.editingCompare}>
        <div className={styles.editingBefore}>
          <span className={styles.lessonMiniLabel}>Before</span>
          <p><FractionText text={original} /></p>
        </div>

        {corrected && (
          <div className={styles.editingAfter}>
            <span className={styles.lessonMiniLabel}>Corrected</span>
            <p><FractionText text={corrected} /></p>
          </div>
        )}
      </div>

      {problem && (
        <div className={styles.ruleCard}>
          <span className={styles.lessonMiniLabel}>What was wrong?</span>
          <p><FractionText text={problem} /></p>
        </div>
      )}

      {rule && (
        <div className={styles.conclusionCard}>
          <span className={styles.lessonMiniLabel}>Rule</span>
          <strong><FractionText text={rule} /></strong>
        </div>
      )}

      {lesson.text && (
        <p className={styles.lessonText}><FractionText text={lesson.text} /></p>
      )}
    </div>
  );
}
