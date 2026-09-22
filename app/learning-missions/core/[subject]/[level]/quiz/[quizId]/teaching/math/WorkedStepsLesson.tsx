"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import styles from "../CoreTeachingEngine.module.css";
import { sourceText } from "./MathTeachingUtils";

export default function WorkedStepsLesson({
  question: _question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const method = sourceText(lesson, "method");
  const expression = sourceText(lesson, "expression");
  const result = sourceText(lesson, "result") || sourceText(lesson, "answer");
  const unit = sourceText(lesson, "unit");
  const check = sourceText(lesson, "check");

  return (
    <div className={`${styles.lessonPanel} ${styles.mathLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {expression && (
        <div className={styles.mathExpressionHero}>
          <span className={styles.lessonMiniLabel}>Problem</span>
          <strong><FractionText text={expression} /></strong>
        </div>
      )}

      {method && (
        <div className={styles.mathMethodCard}>
          <span className={styles.lessonMiniLabel}>Method</span>
          <p><FractionText text={method} /></p>
        </div>
      )}

      {lesson.text && (
        <p className={styles.lessonText}><FractionText text={lesson.text} /></p>
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

      {result && (
        <div className={styles.mathAnswerCard}>
          <span className={styles.lessonMiniLabel}>Answer</span>
          <strong>
            <FractionText text={`${result}${unit ? ` ${unit}` : ""}`} />
          </strong>
        </div>
      )}

      {check && (
        <div className={styles.mathCheckCard}>
          <span className={styles.lessonMiniLabel}>Check</span>
          <p><FractionText text={check} /></p>
        </div>
      )}

      {lesson.examples.length > 0 && (
        <div className={styles.examples}>
          <p className={styles.examplesLabel}>Another example</p>
          {lesson.examples.map((example, index) => (
            <div key={`${index}-${example.text}`} className={styles.exampleCard}>
              {example.title && <strong className={styles.exampleTitle}>{example.title}</strong>}
              <p className={styles.exampleText}><FractionText text={example.text} /></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
