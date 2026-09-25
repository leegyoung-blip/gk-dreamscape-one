"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { CoreSubject } from "../CoreQuizTypes";
import type { NormalisedTeachingText } from "./TeachingTypes";
import EnglishSentenceEvidence from "./english/EnglishSentenceEvidence";
import styles from "./CoreTeachingEngine.module.css";

export default function CoreTeachingHint({
  subject,
  questionText,
  hints,
  revealedCount,
  open,
  onToggle,
  onRevealNext,
}: {
  subject: CoreSubject;
  questionText: string;
  hints: NormalisedTeachingText[];
  revealedCount: number;
  open: boolean;
  onToggle: () => void;
  onRevealNext: () => void;
}) {
  if (hints.length === 0) return null;

  const safeRevealedCount = Math.min(
    hints.length,
    Math.max(1, revealedCount || 1),
  );
  const revealedHints = hints.slice(0, safeRevealedCount);
  const hasAnotherHint = safeRevealedCount < hints.length;
  const nextHintNumber = safeRevealedCount + 1;
  const nextLabel =
    nextHintNumber >= hints.length ? "Final Hint" : "Another Hint";

  return (
    <section className={styles.hintShell} aria-label="Question hints">
      <button
        type="button"
        className={styles.hintButton}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles.hintSpark}>✦</span>
        <span>
          {open
            ? hints.length > 1
              ? "Hide Hints"
              : "Hide Hint"
            : safeRevealedCount > 1
              ? "Show Hints"
              : "Hint"}
        </span>
        <span className={styles.hintChevron} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className={styles.hintPanel}>
          {revealedHints.map((hint, index) => (
            <div
              key={`${index}-${hint.text}`}
              style={{
                paddingTop: index === 0 ? 0 : 12,
                marginTop: index === 0 ? 0 : 12,
                borderTop:
                  index === 0
                    ? undefined
                    : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className={styles.panelEyebrow}>
                Nova&apos;s Hint {hints.length > 1 ? index + 1 : ""}
              </p>

              {hint.title && (
                <p className={styles.panelTitle}>{hint.title}</p>
              )}

              <p className={styles.panelText}>
                <FractionText text={hint.text} />
              </p>

              {subject === "english" && hint.evidence.length > 0 && (
                <EnglishSentenceEvidence
                  sentence={questionText}
                  evidence={hint.evidence}
                  compact
                />
              )}
            </div>
          ))}

          {hasAnotherHint && (
            <div className={styles.actionRow} style={{ marginTop: 12 }}>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={onRevealNext}
              >
                <span>{nextLabel}</span>
                <span aria-hidden="true">+</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
