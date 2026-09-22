"use client";

import type { CSSProperties } from "react";
import FractionText from "@/components/core-missions/FractionText";
import type { ImmediateFeedback } from "../CoreQuizTypes";
import { friendlyCorrectResponse } from "../CoreQuizUtils";
import styles from "./CoreMissionPresentation.module.css";

export default function CoreMissionFeedback({
  feedback,
  enhanced = false,
}: {
  feedback?: ImmediateFeedback;
  enhanced?: boolean;
}) {
  if (!feedback) return null;

  // Keep the existing compact visual treatment for presentation modes that
  // have not been redesigned yet. Phase 2 enhances only language-choice flows.
  if (!enhanced) {
    return <LegacyFeedback feedback={feedback} />;
  }

  if (feedback.pending_manual_review) {
    return (
      <div className={`${styles.feedback} ${styles.feedbackPending}`}>
        <span className={styles.feedbackIcon}>…</span>
        <div>
          <p className={styles.feedbackTitle}>Saved for teacher review</p>
          <p className={styles.feedbackText}>
            Your response has been recorded and will be reviewed.
          </p>
        </div>
      </div>
    );
  }

  const correct = feedback.is_correct === true;

  return (
    <div
      className={`${styles.feedback} ${
        correct ? styles.feedbackCorrect : styles.feedbackWrong
      }`}
    >
      <span className={styles.feedbackIcon}>{correct ? "✓" : "×"}</span>
      <div>
        <p className={styles.feedbackTitle}>
          {correct ? "Correct!" : "Not quite."}
        </p>
        {feedback.explanation && (
          <p className={styles.feedbackText}>
            <FractionText text={feedback.explanation} />
          </p>
        )}
        {!correct && feedback.correct_response && (
          <p className={styles.feedbackAnswer}>
            Correct answer: {" "}
            <FractionText text={friendlyCorrectResponse(feedback.correct_response)} />
          </p>
        )}
      </div>
    </div>
  );
}

function LegacyFeedback({ feedback }: { feedback: ImmediateFeedback }) {
  if (feedback.pending_manual_review) {
    return (
      <div style={legacyFeedbackCard(null)}>
        <p style={{ margin: 0, fontWeight: 900 }}>Saved for teacher review.</p>
      </div>
    );
  }

  return (
    <div style={legacyFeedbackCard(feedback.is_correct === true)}>
      <p style={{ margin: 0, fontWeight: 900 }}>
        {feedback.is_correct ? "Correct!" : "Not quite."}
      </p>
      {feedback.explanation && (
        <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
          <FractionText text={feedback.explanation} />
        </p>
      )}
      {!feedback.is_correct && feedback.correct_response && (
        <p style={{ margin: "6px 0 0", opacity: 0.82 }}>
          Correct answer:{" "}
          <FractionText text={friendlyCorrectResponse(feedback.correct_response)} />
        </p>
      )}
    </div>
  );
}

function legacyFeedbackCard(correct: boolean | null): CSSProperties {
  return {
    marginTop: "8px",
    flex: "0 0 auto",
    maxHeight: "118px",
    overflowY: "auto",
    boxSizing: "border-box",
    borderRadius: "12px",
    border:
      correct === true
        ? "1px solid rgba(52,211,153,0.28)"
        : correct === false
          ? "1px solid rgba(248,113,113,0.28)"
          : "1px solid rgba(251,191,36,0.25)",
    background:
      correct === true
        ? "rgba(52,211,153,0.08)"
        : correct === false
          ? "rgba(239,68,68,0.08)"
          : "rgba(251,191,36,0.08)",
    color:
      correct === true ? "#c8fae8" : correct === false ? "#fecaca" : "#fde7a6",
    padding: "13px",
    fontSize: "13px",
  };
}
