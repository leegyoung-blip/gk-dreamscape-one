"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import styles from "../CoreTeachingEngine.module.css";
import EnglishSentenceEvidence from "./EnglishSentenceEvidence";
import { sourceEvidence, sourceText } from "./EnglishTeachingUtils";

export default function VocabularyLesson({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const word = sourceText(lesson, "word");
  const meaning = sourceText(lesson, "meaning");
  const contextClue = sourceText(lesson, "context_clue");
  const contextSentence =
    sourceText(lesson, "context_sentence") || question.prompt;
  const exampleSentence = sourceText(lesson, "example_sentence");
  const evidence = sourceEvidence(lesson);

  return (
    <div className={`${styles.lessonPanel} ${styles.englishLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {(word || meaning) && (
        <div className={styles.vocabularyHero}>
          {word && <strong><FractionText text={word} /></strong>}
          {meaning && <p><FractionText text={meaning} /></p>}
        </div>
      )}

      <EnglishSentenceEvidence sentence={contextSentence} evidence={evidence} />

      {contextClue && (
        <div className={styles.ruleCard}>
          <span className={styles.lessonMiniLabel}>Context clue</span>
          <p><FractionText text={contextClue} /></p>
        </div>
      )}

      {lesson.text && (
        <p className={styles.lessonText}><FractionText text={lesson.text} /></p>
      )}

      {exampleSentence && (
        <div className={styles.exampleCard}>
          <strong className={styles.exampleTitle}>Another example</strong>
          <p className={styles.exampleText}><FractionText text={exampleSentence} /></p>
        </div>
      )}
    </div>
  );
}
