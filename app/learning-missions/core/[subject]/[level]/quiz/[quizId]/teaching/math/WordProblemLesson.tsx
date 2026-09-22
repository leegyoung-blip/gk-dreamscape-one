"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import styles from "../CoreTeachingEngine.module.css";
import { readWordProblem } from "./MathTeachingUtils";

export default function WordProblemLesson({
  question: _question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const problem = readWordProblem(lesson);
  if (!problem) return <CoreTeachingLesson lesson={lesson} label={label} />;

  return (
    <div className={`${styles.lessonPanel} ${styles.mathLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      <div className={styles.problemFramework}>
        {(problem.known || []).length > 0 && (
          <section className={styles.problemFrameCard}>
            <span className={styles.problemFrameNumber}>1</span>
            <div>
              <strong>What do we know?</strong>
              {(problem.known || []).map((item, index) => {
                const text = typeof item === "string" ? item : (item.text || item.body || "");
                if (!text) return null;
                return <p key={`${index}-${text}`}><FractionText text={text} /></p>;
              })}
            </div>
          </section>
        )}

        {problem.find && (
          <section className={styles.problemFrameCard}>
            <span className={styles.problemFrameNumber}>2</span>
            <div>
              <strong>What are we finding?</strong>
              <p><FractionText text={problem.find} /></p>
            </div>
          </section>
        )}

        {problem.strategy && (
          <section className={styles.problemFrameCard}>
            <span className={styles.problemFrameNumber}>3</span>
            <div>
              <strong>Choose a strategy</strong>
              <p><FractionText text={problem.strategy} /></p>
            </div>
          </section>
        )}

        {(problem.working || []).length > 0 && (
          <section className={styles.problemFrameCard}>
            <span className={styles.problemFrameNumber}>4</span>
            <div>
              <strong>Work it out</strong>
              {(problem.working || []).map((item, index) => {
                const text = typeof item === "string" ? item : (item.text || item.body || "");
                const title = typeof item === "string" ? null : item.title;
                if (!text) return null;
                return (
                  <p key={`${index}-${text}`}>
                    {title && <b>{title}: </b>}
                    <FractionText text={text} />
                  </p>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {problem.answer && (
        <div className={styles.mathAnswerCard}>
          <span className={styles.lessonMiniLabel}>Answer</span>
          <strong>
            <FractionText text={`${problem.answer}${problem.unit ? ` ${problem.unit}` : ""}`} />
          </strong>
        </div>
      )}

      {problem.check && (
        <div className={styles.mathCheckCard}>
          <span className={styles.lessonMiniLabel}>Does it make sense?</span>
          <p><FractionText text={problem.check} /></p>
        </div>
      )}
    </div>
  );
}
