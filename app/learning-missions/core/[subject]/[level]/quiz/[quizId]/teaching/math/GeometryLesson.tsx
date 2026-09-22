"use client";

import FractionText from "@/components/core-missions/FractionText";
import QuestionMediaRenderer from "@/components/core-media/QuestionMediaRenderer";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import styles from "../CoreTeachingEngine.module.css";
import { readGeometry, sourceText } from "./MathTeachingUtils";

export default function GeometryLesson({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const geometry = readGeometry(lesson);
  if (!geometry) return <CoreTeachingLesson lesson={lesson} label={label} />;

  const check = sourceText(lesson, "check");
  const hasMedia = Boolean(question.stimulus) || (question.assets || []).length > 0;

  return (
    <div className={`${styles.lessonPanel} ${styles.mathLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {hasMedia && (
        <div className={styles.mathTeachingMedia}>
          <QuestionMediaRenderer
            stimulus={question.stimulus}
            assets={question.assets}
            variant="math"
            size="compact"
          />
        </div>
      )}

      {(geometry.known || []).length > 0 && (
        <div className={styles.mathKnownGrid}>
          <span className={styles.lessonMiniLabel}>What we know</span>
          {(geometry.known || []).map((item, index) => {
            const text = typeof item === "string" ? item : (item.text || item.body || "");
            const title = typeof item === "string" ? null : item.title;
            if (!text) return null;
            return (
              <div key={`${index}-${text}`} className={styles.mathKnownItem}>
                {title && <strong>{title}</strong>}
                <span><FractionText text={text} /></span>
              </div>
            );
          })}
        </div>
      )}

      {geometry.rule && (
        <div className={styles.mathMethodCard}>
          <span className={styles.lessonMiniLabel}>Geometry rule</span>
          <p><FractionText text={geometry.rule} /></p>
        </div>
      )}

      {geometry.formula && (
        <div className={styles.mathFormulaCard}>
          <span className={styles.lessonMiniLabel}>Formula</span>
          <strong><FractionText text={geometry.formula} /></strong>
        </div>
      )}

      {geometry.substitution && (
        <div className={styles.mathCalculationCard}>
          <span className={styles.lessonMiniLabel}>Substitute</span>
          <strong><FractionText text={geometry.substitution} /></strong>
        </div>
      )}

      {geometry.working && (
        <div className={styles.mathCalculationCard}>
          <span className={styles.lessonMiniLabel}>Working</span>
          <strong><FractionText text={geometry.working} /></strong>
        </div>
      )}

      {geometry.answer && (
        <div className={styles.mathAnswerCard}>
          <span className={styles.lessonMiniLabel}>Answer</span>
          <strong>
            <FractionText text={`${geometry.answer}${geometry.unit ? ` ${geometry.unit}` : ""}`} />
          </strong>
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
