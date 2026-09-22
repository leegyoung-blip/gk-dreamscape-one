"use client";

import styles from "./TeachingAuthoring.module.css";
import { isRecord, textValue } from "./TeachingAuthoringUtils";

export type EvidenceDraft = {
  text: string;
  label?: string;
  role?: string;
  occurrence?: number;
  [key: string]: any;
};

export default function EvidenceEditor({
  title = "Clues in the question",
  value,
  disabled,
  onChange,
}: {
  title?: string;
  value: unknown;
  disabled: boolean;
  onChange: (value: EvidenceDraft[]) => void;
}) {
  const rows: EvidenceDraft[] = Array.isArray(value)
    ? value.map((item) =>
        isRecord(item)
          ? {
              ...item,
              text: textValue(item.text),
              label: textValue(item.label),
              role: textValue(item.role),
              occurrence: Math.max(1, Number(item.occurrence) || 1),
            }
          : { text: "", label: "", role: "", occurrence: 1 },
      )
    : [];

  function patch(index: number, next: Partial<EvidenceDraft>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)));
  }

  return (
    <div className={styles.subPanel}>
      <div className={styles.subPanelHeader}>
        <div>
          <strong>{title}</strong>
          <p>Highlight only clues that are explicitly present in the learner’s question.</p>
        </div>
        <button
          type="button"
          className={styles.smallButton}
          disabled={disabled}
          onClick={() => onChange([...rows, { text: "", label: "", role: "", occurrence: 1 }])}
        >
          + Add clue
        </button>
      </div>

      {rows.length === 0 ? (
        <p className={styles.emptyText}>No clue highlighting added.</p>
      ) : (
        <div className={styles.stack}>
          {rows.map((row, index) => (
            <div key={index} className={styles.evidenceRow}>
              <label>
                Text
                <input
                  value={row.text}
                  disabled={disabled}
                  onChange={(event) => patch(index, { text: event.target.value })}
                />
              </label>
              <label>
                Label
                <input
                  value={row.label || ""}
                  disabled={disabled}
                  placeholder="e.g. near"
                  onChange={(event) => patch(index, { label: event.target.value })}
                />
              </label>
              <label>
                Occurrence
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={row.occurrence || 1}
                  disabled={disabled}
                  onChange={(event) => patch(index, { occurrence: Math.max(1, Number(event.target.value) || 1) })}
                />
              </label>
              <button
                type="button"
                className={styles.removeButton}
                disabled={disabled}
                onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
