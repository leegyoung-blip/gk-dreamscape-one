"use client";

import EvidenceEditor from "./EvidenceEditor";
import styles from "./TeachingAuthoring.module.css";
import type { TeachingDraft } from "./TeachingAuthoringTypes";
import { blockText, isRecord, patchTextBlock } from "./TeachingAuthoringUtils";

export default function TeachingCommonFields({
  value,
  legacyExplanation,
  disabled,
  onChange,
}: {
  value: TeachingDraft;
  legacyExplanation: string;
  disabled: boolean;
  onChange: (value: TeachingDraft) => void;
}) {
  const hint = isRecord(value.hint) ? value.hint : typeof value.hint === "string" ? { text: value.hint } : {};
  const correct = isRecord(value.correct) ? value.correct : typeof value.correct === "string" ? { text: value.correct } : {};
  const incorrect = isRecord(value.incorrect) ? value.incorrect : typeof value.incorrect === "string" ? { text: value.incorrect } : {};

  function patchRoot(key: string, next: unknown) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className={styles.stack}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Hint
          <textarea
            rows={3}
            disabled={disabled}
            value={blockText(hint)}
            placeholder="Give a clue or strategy without revealing the answer."
            onChange={(event) => patchRoot("hint", patchTextBlock(hint, { text: event.target.value }))}
          />
        </label>
        <p className={styles.helper}>Shown before the learner checks the answer. Leave blank if a safe hint has not been authored.</p>
        <EvidenceEditor
          title="Hint clue highlighting"
          value={hint.evidence || hint.clues}
          disabled={disabled}
          onChange={(evidence) => patchRoot("hint", patchTextBlock(hint, { evidence }))}
        />
      </div>

      <div className={styles.twoColumns}>
        <label className={styles.fieldLabel}>
          Correct feedback
          <textarea
            rows={3}
            disabled={disabled}
            value={blockText(correct)}
            placeholder="Short explanation shown immediately after a correct answer."
            onChange={(event) => patchRoot("correct", patchTextBlock(correct, { text: event.target.value }))}
          />
        </label>

        <label className={styles.fieldLabel}>
          General incorrect feedback
          <textarea
            rows={3}
            disabled={disabled}
            value={blockText(incorrect)}
            placeholder="Safe fallback when no answer-specific misconception is authored."
            onChange={(event) => patchRoot("incorrect", patchTextBlock(incorrect, { text: event.target.value }))}
          />
        </label>
      </div>

      {legacyExplanation.trim() && (
        <div className={styles.legacyBox}>
          <div>
            <strong>Existing student explanation</strong>
            <p>{legacyExplanation}</p>
          </div>
          <div className={styles.inlineActions}>
            <button
              type="button"
              className={styles.smallButton}
              disabled={disabled}
              onClick={() => patchRoot("correct", patchTextBlock(correct, { text: legacyExplanation }))}
            >
              Use as correct feedback
            </button>
            <button
              type="button"
              className={styles.smallButton}
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  lesson: {
                    ...(isRecord(value.lesson) ? value.lesson : {}),
                    type: "simple_explanation",
                    text: legacyExplanation,
                  },
                })
              }
            >
              Use as main explanation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
