"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import styles from "../CoreTeachingEngine.module.css";
import EnglishSentenceEvidence from "./EnglishSentenceEvidence";
import { sourceEvidence, sourceText } from "./EnglishTeachingUtils";

export default function RuleClueLesson({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const rule = sourceText(lesson, "rule");
  const conclusion = sourceText(lesson, "conclusion");
  const contrast = sourceText(lesson, "contrast");
  const sentence = sourceText(lesson, "sentence") || question.prompt;
  const evidence = sourceEvidence(lesson);

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

      {conclusion && (
        <div className={styles.conclusionCard}>
          <span className={styles.lessonMiniLabel}>Put it together</span>
          <strong><FractionText text={conclusion} /></strong>
        </div>
      )}

      {contrast && (
        <div className={styles.contrastCard}>
          <span className={styles.lessonMiniLabel}>Compare</span>
          <p><FractionText text={contrast} /></p>
        </div>
      )}

      {lesson.examples.length > 0 && (
        <div className={styles.examples}>
          <p className={styles.examplesLabel}>Example</p>
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
