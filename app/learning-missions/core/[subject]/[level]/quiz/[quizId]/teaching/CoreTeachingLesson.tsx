"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { NormalisedTeachingLesson } from "./TeachingTypes";
import styles from "./CoreTeachingEngine.module.css";

export default function CoreTeachingLesson({
  lesson,
  label,
}: {
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  return (
    <div className={styles.lessonPanel}>
      <p className={styles.panelEyebrow}>{label}</p>

      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {lesson.text && (
        <p className={styles.lessonText}>
          <FractionText text={lesson.text} />
        </p>
      )}

      {lesson.steps.length > 0 && (
        <ol className={styles.stepList}>
          {lesson.steps.map((step, index) => (
            <li key={`${index}-${step.text}`} className={styles.stepItem}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <div>
                {step.title && (
                  <strong className={styles.stepTitle}>{step.title}</strong>
                )}
                <p className={styles.stepText}>
                  <FractionText text={step.text} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {lesson.examples.length > 0 && (
        <div className={styles.examples}>
          <p className={styles.examplesLabel}>Example</p>
          {lesson.examples.map((example, index) => (
            <div key={`${index}-${example.text}`} className={styles.exampleCard}>
              {example.title && (
                <strong className={styles.exampleTitle}>{example.title}</strong>
              )}
              <p className={styles.exampleText}>
                <FractionText text={example.text} />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
