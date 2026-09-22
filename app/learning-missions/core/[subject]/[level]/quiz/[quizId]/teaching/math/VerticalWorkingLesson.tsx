"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import styles from "../CoreTeachingEngine.module.css";
import { readVerticalWorking, sourceText } from "./MathTeachingUtils";

export default function VerticalWorkingLesson({
  question: _question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const working = readVerticalWorking(lesson);
  if (!working) return <CoreTeachingLesson lesson={lesson} label={label} />;

  const method = sourceText(lesson, "method");
  const check = sourceText(lesson, "check");
  const operands = working.operands || [];

  return (
    <div className={`${styles.lessonPanel} ${styles.mathLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {method && (
        <div className={styles.mathMethodCard}>
          <span className={styles.lessonMiniLabel}>Method</span>
          <p><FractionText text={method} /></p>
        </div>
      )}

      <div className={styles.verticalWorkingWrap} aria-label="Worked calculation">
        {(working.carries || []).length > 0 && (
          <div className={styles.verticalCarryRow}>
            {(working.carries || []).map((carry, index) => (
              <span key={`${carry}-${index}`}><FractionText text={carry} /></span>
            ))}
          </div>
        )}

        {operands.map((operand, index) => (
          <div
            key={`${operand}-${index}`}
            className={`${styles.verticalWorkingRow} ${index === operands.length - 1 ? styles.verticalWorkingLastOperand : ""}`}
          >
            <span className={styles.verticalOperator}>
              {index === operands.length - 1 ? (working.operator || "") : ""}
            </span>
            <strong><FractionText text={operand} /></strong>
          </div>
        ))}

        {working.result && (
          <div className={`${styles.verticalWorkingRow} ${styles.verticalResultRow}`}>
            <span className={styles.verticalOperator} />
            <strong><FractionText text={working.result} /></strong>
          </div>
        )}
      </div>

      {working.note && (
        <p className={styles.mathWorkingNote}><FractionText text={working.note} /></p>
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

      {check && (
        <div className={styles.mathCheckCard}>
          <span className={styles.lessonMiniLabel}>Check</span>
          <p><FractionText text={check} /></p>
        </div>
      )}
    </div>
  );
}
