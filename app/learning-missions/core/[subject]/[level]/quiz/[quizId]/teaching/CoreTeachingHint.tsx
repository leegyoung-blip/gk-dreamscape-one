"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { CoreSubject } from "../CoreQuizTypes";
import type { NormalisedTeachingText } from "./TeachingTypes";
import EnglishSentenceEvidence from "./english/EnglishSentenceEvidence";
import styles from "./CoreTeachingEngine.module.css";

export default function CoreTeachingHint({
  subject,
  questionText,
  hint,
  open,
  onToggle,
}: {
  subject: CoreSubject;
  questionText: string;
  hint: NormalisedTeachingText;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className={styles.hintShell} aria-label="Question hint">
      <button
        type="button"
        className={styles.hintButton}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles.hintSpark}>✦</span>
        <span>{open ? "Hide Hint" : "Hint"}</span>
        <span className={styles.hintChevron} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className={styles.hintPanel}>
          <p className={styles.panelEyebrow}>Nova&apos;s Hint</p>
          {hint.title && <p className={styles.panelTitle}>{hint.title}</p>}
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
      )}
    </section>
  );
}
