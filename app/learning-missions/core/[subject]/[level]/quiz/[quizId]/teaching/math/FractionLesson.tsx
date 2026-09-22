"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import styles from "../CoreTeachingEngine.module.css";
import { readFraction, sourceText } from "./MathTeachingUtils";

export default function FractionLesson({
  question: _question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const fraction = readFraction(lesson);
  if (!fraction) return <CoreTeachingLesson lesson={lesson} label={label} />;

  const method = sourceText(lesson, "method");
  const check = sourceText(lesson, "check");

  return (
    <div className={`${styles.lessonPanel} ${styles.mathLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {(fraction.left || fraction.right) && (
        <div className={styles.fractionEquation}>
          {fraction.left && <strong><FractionText text={fraction.left} /></strong>}
          {fraction.operator && <span>{fraction.operator}</span>}
          {fraction.right && <strong><FractionText text={fraction.right} /></strong>}
        </div>
      )}

      {method && (
        <div className={styles.mathMethodCard}>
          <span className={styles.lessonMiniLabel}>Method</span>
          <p><FractionText text={method} /></p>
        </div>
      )}

      {fraction.common_denominator && (
        <div className={styles.fractionStageCard}>
          <span className={styles.lessonMiniLabel}>Common denominator</span>
          <strong><FractionText text={fraction.common_denominator} /></strong>
        </div>
      )}

      {(fraction.equivalent_left || fraction.equivalent_right) && (
        <div className={styles.fractionEquivalentRow}>
          {fraction.equivalent_left && <FractionText text={fraction.equivalent_left} />}
          {fraction.equivalent_left && fraction.equivalent_right && <span>and</span>}
          {fraction.equivalent_right && <FractionText text={fraction.equivalent_right} />}
        </div>
      )}

      {fraction.working && (
        <div className={styles.mathCalculationCard}>
          <span className={styles.lessonMiniLabel}>Work it out</span>
          <strong><FractionText text={fraction.working} /></strong>
        </div>
      )}

      {lesson.steps.length > 0 && (
        <div className={styles.mathStepList}>
          {lesson.steps.map((step, index) => (
            <div key={`${index}-${step.text}`} className={styles.mathStepCard}>
              <span className={styles.mathStepNumber}>{index + 1}</span>
              <div>
                {step.title && <strong>{step.title}</strong>}
                <p><FractionText text={step.text} /></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(fraction.result || fraction.simplified) && (
        <div className={styles.mathAnswerCard}>
          <span className={styles.lessonMiniLabel}>
            {fraction.simplified ? "Simplified answer" : "Answer"}
          </span>
          <strong><FractionText text={fraction.simplified || fraction.result || ""} /></strong>
        </div>
      )}

      {fraction.note && <p className={styles.mathWorkingNote}><FractionText text={fraction.note} /></p>}

      {check && (
        <div className={styles.mathCheckCard}>
          <span className={styles.lessonMiniLabel}>Check</span>
          <p><FractionText text={check} /></p>
        </div>
      )}
    </div>
  );
}
