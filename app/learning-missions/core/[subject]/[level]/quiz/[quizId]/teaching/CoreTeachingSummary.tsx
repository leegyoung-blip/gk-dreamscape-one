"use client";

import FractionText from "@/components/core-missions/FractionText";
import styles from "./CoreTeachingEngine.module.css";

type SummaryState = "correct" | "wrong" | "pending";

export default function CoreTeachingSummary({
  state,
  title,
  text,
  correctAnswer,
}: {
  state: SummaryState;
  title: string;
  text?: string | null;
  correctAnswer?: string | null;
}) {
  const stateClass =
    state === "correct"
      ? styles.summaryCorrect
      : state === "wrong"
        ? styles.summaryWrong
        : styles.summaryPending;

  return (
    <div className={`${styles.summary} ${stateClass}`}>
      <span className={styles.summaryIcon} aria-hidden="true">
        {state === "correct" ? "✓" : state === "wrong" ? "×" : "…"}
      </span>

      <div className={styles.summaryBody}>
        <p className={styles.summaryTitle}>{title}</p>

        {text && (
          <p className={styles.summaryText}>
            <FractionText text={text} />
          </p>
        )}

        {state === "wrong" && correctAnswer && (
          <p className={styles.correctAnswer}>
            <span>Correct answer:</span>{" "}
            <FractionText text={correctAnswer} />
          </p>
        )}
      </div>
    </div>
  );
}
