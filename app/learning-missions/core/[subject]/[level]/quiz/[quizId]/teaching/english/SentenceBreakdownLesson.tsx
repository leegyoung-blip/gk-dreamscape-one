"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import styles from "../CoreTeachingEngine.module.css";
import EnglishSentenceEvidence from "./EnglishSentenceEvidence";
import { sourceEvidence, sourceText } from "./EnglishTeachingUtils";

export default function SentenceBreakdownLesson({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const sentence = sourceText(lesson, "sentence") || question.prompt;
  const evidence = sourceEvidence(lesson);
  const rule = sourceText(lesson, "rule");
  const conclusion = sourceText(lesson, "conclusion");

  return (
    <div className={`${styles.lessonPanel} ${styles.englishLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      <EnglishSentenceEvidence sentence={sentence} evidence={evidence} />

      {rule && (
        <div className={styles.ruleCard}>
          <span className={styles.lessonMiniLabel}>Rule</span>
          <p><FractionText text={rule} /></p>
        </div>
      )}

      {lesson.text && (
        <p className={styles.lessonText}><FractionText text={lesson.text} /></p>
      )}

      {lesson.steps.length > 0 && (
        <div className={styles.breakdownSteps}>
          {lesson.steps.map((step, index) => (
            <div key={`${index}-${step.text}`} className={styles.breakdownStep}>
              <span>{index + 1}</span>
              <div>
                {step.title && <strong>{step.title}</strong>}
                <p><FractionText text={step.text} /></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {conclusion && (
        <div className={styles.conclusionCard}>
          <span className={styles.lessonMiniLabel}>Answer clue</span>
          <strong><FractionText text={conclusion} /></strong>
        </div>
      )}
    </div>
  );
}
