"use client";

import styles from "./TeachingAuthoring.module.css";
import type { TeachingAuthoringOption, TeachingDraft } from "./TeachingAuthoringTypes";
import { blockText, isRecord, normaliseSlug, patchTextBlock } from "./TeachingAuthoringUtils";

export default function MisconceptionEditor({
  options,
  correctOptionIds,
  value,
  disabled,
  onChange,
}: {
  options: TeachingAuthoringOption[];
  correctOptionIds: string[];
  value: TeachingDraft;
  disabled: boolean;
  onChange: (value: TeachingDraft) => void;
}) {
  const source = isRecord(value.misconceptions) ? value.misconceptions : {};
  const correct = new Set(correctOptionIds);

  function existingFor(optionId: string) {
    return source[optionId] ?? source[`option_${optionId}`] ?? source[`option-${optionId}`] ?? {};
  }

  function patchOption(optionId: string, next: Record<string, any>) {
    const nextSource = { ...source };
    delete nextSource[`option_${optionId}`];
    delete nextSource[`option-${optionId}`];
    nextSource[optionId] = next;
    onChange({ ...value, misconceptions: nextSource });
  }

  return (
    <div className={styles.stack}>
      <div className={styles.sectionIntro}>
        <strong>Answer-specific feedback</strong>
        <p>Diagnose only errors that the distractor was deliberately authored to represent. The option’s stored ID is used automatically.</p>
      </div>

      <div className={styles.stack}>
        {options.map((option, index) => {
          const isCorrect = correct.has(option.id);
          const current = existingFor(option.id);
          const record = isRecord(current) ? current : typeof current === "string" ? { text: current } : {};
          const lesson = isRecord(record.lesson) ? record.lesson : {};

          return (
            <article key={option.id} className={`${styles.optionTeachingCard} ${isCorrect ? styles.correctOptionCard : ""}`}>
              <div className={styles.optionHeading}>
                <span>{String.fromCharCode(65 + index)}</span>
                <div>
                  <strong>{option.text || `Option ${option.id.toUpperCase()}`}</strong>
                  <small>{isCorrect ? "Correct answer — uses Correct feedback above" : `Stored ID: ${option.id}`}</small>
                </div>
              </div>

              {!isCorrect && (
                <div className={styles.stack}>
                  <label className={styles.fieldLabel}>
                    Misconception code
                    <div className={styles.slugRow}>
                      <input
                        disabled={disabled}
                        value={String(record.code || "")}
                        placeholder="e.g. singular_plural_confusion"
                        onChange={(event) => patchOption(option.id, patchTextBlock(record, { code: event.target.value }))}
                      />
                      <button
                        type="button"
                        className={styles.smallButton}
                        disabled={disabled || !String(record.code || "").trim()}
                        onClick={() => patchOption(option.id, patchTextBlock(record, { code: normaliseSlug(String(record.code || "")) }))}
                      >
                        Normalise
                      </button>
                    </div>
                  </label>

                  <label className={styles.fieldLabel}>
                    Feedback
                    <textarea
                      rows={3}
                      disabled={disabled}
                      value={blockText(record)}
                      placeholder="Explain the specific verified issue represented by this distractor."
                      onChange={(event) => patchOption(option.id, patchTextBlock(record, { text: event.target.value }))}
                    />
                  </label>

                  <label className={styles.fieldLabel}>
                    Optional deeper explanation
                    <textarea
                      rows={3}
                      disabled={disabled}
                      value={String(lesson.text || lesson.body || "")}
                      placeholder="Optional explanation shown when the learner opens Why? / Show Working."
                      onChange={(event) =>
                        patchOption(option.id, {
                          ...record,
                          lesson: { ...lesson, type: "simple_explanation", text: event.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
