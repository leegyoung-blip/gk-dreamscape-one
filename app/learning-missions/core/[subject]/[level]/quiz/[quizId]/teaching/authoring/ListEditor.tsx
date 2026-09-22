"use client";

import styles from "./TeachingAuthoring.module.css";
import { isRecord, textValue } from "./TeachingAuthoringUtils";

export type LessonItemDraft = { title?: string; text?: string; body?: string; [key: string]: any };

export default function ListEditor({
  title,
  value,
  disabled,
  onChange,
  allowTitles = true,
  addLabel = "+ Add item",
}: {
  title: string;
  value: unknown;
  disabled: boolean;
  onChange: (value: LessonItemDraft[]) => void;
  allowTitles?: boolean;
  addLabel?: string;
}) {
  const rows: LessonItemDraft[] = Array.isArray(value)
    ? value.map((item) =>
        typeof item === "string"
          ? { text: item }
          : isRecord(item)
            ? { ...item, title: textValue(item.title), text: textValue(item.text) || textValue(item.body) }
            : { text: "" },
      )
    : [];

  function patch(index: number, patch: LessonItemDraft) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className={styles.subPanel}>
      <div className={styles.subPanelHeader}>
        <strong>{title}</strong>
        <button type="button" className={styles.smallButton} disabled={disabled} onClick={() => onChange([...rows, { title: "", text: "" }])}>
          {addLabel}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className={styles.emptyText}>No items added.</p>
      ) : (
        <div className={styles.stack}>
          {rows.map((row, index) => (
            <div key={index} className={styles.listRow}>
              {allowTitles && (
                <input
                  disabled={disabled}
                  value={row.title || ""}
                  placeholder="Optional label"
                  onChange={(event) => patch(index, { title: event.target.value })}
                />
              )}
              <textarea
                rows={2}
                disabled={disabled}
                value={row.text || ""}
                placeholder="Text"
                onChange={(event) => patch(index, { text: event.target.value })}
              />
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={styles.smallButton}
                  disabled={disabled || index === 0}
                  onClick={() => {
                    const next = [...rows];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onChange(next);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.smallButton}
                  disabled={disabled || index === rows.length - 1}
                  onClick={() => {
                    const next = [...rows];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    onChange(next);
                  }}
                >
                  ↓
                </button>
                <button type="button" className={styles.removeButton} disabled={disabled} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
