"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import styles from "../CoreTeachingEngine.module.css";
import { readConversion, sourceText } from "./MathTeachingUtils";

export default function UnitConversionLesson({
  question: _question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const conversion = readConversion(lesson);
  if (!conversion) return <CoreTeachingLesson lesson={lesson} label={label} />;

  const method = sourceText(lesson, "method");
  const check = sourceText(lesson, "check");

  return (
    <div className={`${styles.lessonPanel} ${styles.mathLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {(conversion.from || conversion.to) && (
        <div className={styles.conversionRoute}>
          <div>
            <span className={styles.lessonMiniLabel}>From</span>
            <strong><FractionText text={conversion.from || ""} /></strong>
          </div>
          <span className={styles.conversionArrow}>→</span>
          <div>
            <span className={styles.lessonMiniLabel}>To</span>
            <strong><FractionText text={conversion.to || ""} /></strong>
          </div>
        </div>
      )}

      {conversion.relationship && (
        <div className={styles.mathMethodCard}>
          <span className={styles.lessonMiniLabel}>Unit relationship</span>
          <p><FractionText text={conversion.relationship} /></p>
        </div>
      )}

      {method && <p className={styles.lessonText}><FractionText text={method} /></p>}

      {conversion.calculation && (
        <div className={styles.mathCalculationCard}>
          <span className={styles.lessonMiniLabel}>Convert</span>
          <strong><FractionText text={conversion.calculation} /></strong>
        </div>
      )}

      {conversion.result && (
        <div className={styles.mathAnswerCard}>
          <span className={styles.lessonMiniLabel}>Answer</span>
          <strong><FractionText text={conversion.result} /></strong>
        </div>
      )}

      {check && (
        <div className={styles.mathCheckCard}>
          <span className={styles.lessonMiniLabel}>Check the unit</span>
          <p><FractionText text={check} /></p>
        </div>
      )}
    </div>
  );
}
