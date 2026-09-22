"use client";

import EvidenceEditor from "../EvidenceEditor";
import ListEditor from "../ListEditor";
import styles from "../TeachingAuthoring.module.css";
import type { TeachingDraft } from "../TeachingAuthoringTypes";
import { isRecord, normaliseSlug, patchLesson, textValue } from "../TeachingAuthoringUtils";

export const ENGLISH_LESSON_TYPES = [
  ["simple_explanation", "Simple explanation"],
  ["rule_clue", "Rule + Clue"],
  ["rule_matrix", "Rule Matrix"],
  ["sentence_breakdown", "Sentence Breakdown"],
  ["vocabulary", "Vocabulary"],
  ["editing_correction", "Editing Correction"],
] as const;

export default function EnglishTeachingAuthoring({
  value,
  disabled,
  prompt,
  onChange,
}: {
  value: TeachingDraft;
  disabled: boolean;
  prompt: string;
  onChange: (value: TeachingDraft) => void;
}) {
  const type = textValue(value.type) || "simple_explanation";
  const patch = (next: Record<string, any>) => onChange(patchLesson(value, next));

  return (
    <div className={styles.stack}>
      <div className={styles.twoColumns}>
        <label className={styles.fieldLabel}>
          Lesson title
          <input disabled={disabled} value={textValue(value.title)} onChange={(event) => patch({ title: event.target.value })} />
        </label>
        <label className={styles.fieldLabel}>
          Teaching format
          <select disabled={disabled} value={type} onChange={(event) => patch({ type: event.target.value })}>
            {ENGLISH_LESSON_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>

      {type === "simple_explanation" && (
        <label className={styles.fieldLabel}>
          Explanation
          <textarea rows={5} disabled={disabled} value={textValue(value.text) || textValue(value.body)} onChange={(event) => patch({ text: event.target.value })} />
        </label>
      )}

      {(type === "rule_clue" || type === "sentence_breakdown" || type === "rule_matrix") && (
        <>
          <label className={styles.fieldLabel}>
            Sentence used for teaching
            <textarea rows={3} disabled={disabled} value={textValue(value.sentence) || prompt} onChange={(event) => patch({ sentence: event.target.value })} />
          </label>
          <EvidenceEditor
            value={value.evidence || value.clues}
            disabled={disabled}
            onChange={(evidence) => patch({ evidence })}
          />
          <label className={styles.fieldLabel}>
            Rule
            <textarea rows={3} disabled={disabled} value={textValue(value.rule)} onChange={(event) => patch({ rule: event.target.value })} />
          </label>
        </>
      )}

      {type === "rule_clue" && (
        <>
          <label className={styles.fieldLabel}>
            Put it together / conclusion
            <textarea rows={2} disabled={disabled} value={textValue(value.conclusion)} onChange={(event) => patch({ conclusion: event.target.value })} />
          </label>
          <label className={styles.fieldLabel}>
            Contrast / compare
            <textarea rows={2} disabled={disabled} value={textValue(value.contrast)} onChange={(event) => patch({ contrast: event.target.value })} />
          </label>
          <ListEditor title="Examples" value={value.examples} disabled={disabled} onChange={(examples) => patch({ examples })} />
        </>
      )}

      {type === "sentence_breakdown" && (
        <>
          <ListEditor title="Thinking steps" value={value.steps} disabled={disabled} onChange={(steps) => patch({ steps })} />
          <label className={styles.fieldLabel}>
            Conclusion / answer
            <textarea rows={2} disabled={disabled} value={textValue(value.conclusion)} onChange={(event) => patch({ conclusion: event.target.value })} />
          </label>
        </>
      )}

      {type === "rule_matrix" && (
        <RuleMatrixEditor value={value.matrix} disabled={disabled} onChange={(matrix) => patch({ matrix })} conclusion={textValue(value.conclusion)} onConclusion={(conclusion) => patch({ conclusion })} />
      )}

      {type === "vocabulary" && (
        <div className={styles.stack}>
          <div className={styles.twoColumns}>
            <label className={styles.fieldLabel}>Word<input disabled={disabled} value={textValue(value.word)} onChange={(event) => patch({ word: event.target.value })} /></label>
            <label className={styles.fieldLabel}>Meaning<input disabled={disabled} value={textValue(value.meaning)} onChange={(event) => patch({ meaning: event.target.value })} /></label>
          </div>
          <label className={styles.fieldLabel}>Context sentence<textarea rows={3} disabled={disabled} value={textValue(value.context_sentence)} onChange={(event) => patch({ context_sentence: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Context clue<textarea rows={2} disabled={disabled} value={textValue(value.context_clue)} onChange={(event) => patch({ context_clue: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Another example<textarea rows={2} disabled={disabled} value={textValue(value.example_sentence)} onChange={(event) => patch({ example_sentence: event.target.value })} /></label>
        </div>
      )}

      {type === "editing_correction" && (
        <div className={styles.stack}>
          <label className={styles.fieldLabel}>Original<textarea rows={2} disabled={disabled} value={textValue(value.original) || prompt} onChange={(event) => patch({ original: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Corrected<textarea rows={2} disabled={disabled} value={textValue(value.corrected)} onChange={(event) => patch({ corrected: event.target.value })} /></label>
          <label className={styles.fieldLabel}>What was wrong?<textarea rows={2} disabled={disabled} value={textValue(value.problem)} onChange={(event) => patch({ problem: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Rule<textarea rows={2} disabled={disabled} value={textValue(value.rule)} onChange={(event) => patch({ rule: event.target.value })} /></label>
        </div>
      )}
    </div>
  );
}

function axisItem(item: any, index: number) {
  if (typeof item === "string") return { key: normaliseSlug(item) || `item_${index + 1}`, label: item };
  if (isRecord(item)) {
    const label = textValue(item.label) || textValue(item.text) || `Item ${index + 1}`;
    return { ...item, key: textValue(item.key) || normaliseSlug(label) || `item_${index + 1}`, label };
  }
  return { key: `item_${index + 1}`, label: `Item ${index + 1}` };
}

function RuleMatrixEditor({
  value,
  disabled,
  onChange,
  conclusion,
  onConclusion,
}: {
  value: unknown;
  disabled: boolean;
  onChange: (value: TeachingDraft) => void;
  conclusion: string;
  onConclusion: (value: string) => void;
}) {
  const matrix = isRecord(value) ? value : {};
  const rows = Array.isArray(matrix.rows) ? matrix.rows.map(axisItem) : [];
  const columns = Array.isArray(matrix.columns) ? matrix.columns.map(axisItem) : [];
  const cells = isRecord(matrix.cells) ? matrix.cells : {};
  const highlight = isRecord(matrix.highlight) ? matrix.highlight : {};

  function write(next: Record<string, any>) {
    onChange({ ...matrix, ...next });
  }

  function patchAxis(kind: "rows" | "columns", index: number, label: string) {
    const source = kind === "rows" ? rows : columns;
    const next = source.map((item, itemIndex) => itemIndex === index ? { ...item, label } : item);
    write({ [kind]: next });
  }

  return (
    <div className={styles.subPanel}>
      <div className={styles.subPanelHeader}><strong>Rule Matrix</strong></div>
      <div className={styles.matrixAxisGrid}>
        <div>
          <div className={styles.subPanelHeader}><span>Rows</span><button type="button" className={styles.smallButton} disabled={disabled} onClick={() => write({ rows: [...rows, { key: `row_${Date.now()}`, label: "New row" }] })}>+ Row</button></div>
          {rows.map((row, index) => <div key={row.key} className={styles.axisRow}><input disabled={disabled} value={row.label} onChange={(event) => patchAxis("rows", index, event.target.value)} /><button type="button" className={styles.removeButton} disabled={disabled} onClick={() => write({ rows: rows.filter((_, rowIndex) => rowIndex !== index) })}>×</button></div>)}
        </div>
        <div>
          <div className={styles.subPanelHeader}><span>Columns</span><button type="button" className={styles.smallButton} disabled={disabled} onClick={() => write({ columns: [...columns, { key: `col_${Date.now()}`, label: "New column" }] })}>+ Column</button></div>
          {columns.map((column, index) => <div key={column.key} className={styles.axisRow}><input disabled={disabled} value={column.label} onChange={(event) => patchAxis("columns", index, event.target.value)} /><button type="button" className={styles.removeButton} disabled={disabled} onClick={() => write({ columns: columns.filter((_, columnIndex) => columnIndex !== index) })}>×</button></div>)}
        </div>
      </div>

      {rows.length > 0 && columns.length > 0 && (
        <div className={styles.matrixEditorScroller}>
          <table className={styles.matrixEditorTable}>
            <thead><tr><th /><>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.key}><th>{row.label}</th>{columns.map((column) => {
              const raw = isRecord(cells[row.key]) ? cells[row.key][column.key] : undefined;
              const text = typeof raw === "string" ? raw : isRecord(raw) ? textValue(raw.text) || textValue(raw.label) : "";
              return <td key={`${row.key}-${column.key}`}><input disabled={disabled} value={text} onChange={(event) => write({ cells: { ...cells, [row.key]: { ...(isRecord(cells[row.key]) ? cells[row.key] : {}), [column.key]: { ...(isRecord(raw) ? raw : {}), text: event.target.value } } } })} /></td>;
            })}</tr>)}</tbody>
          </table>
        </div>
      )}

      <div className={styles.twoColumns}>
        <label className={styles.fieldLabel}>Highlight row<select disabled={disabled} value={textValue(highlight.row)} onChange={(event) => write({ highlight: { ...highlight, row: event.target.value } })}><option value="">None</option>{rows.map((row) => <option key={row.key} value={row.key}>{row.label}</option>)}</select></label>
        <label className={styles.fieldLabel}>Highlight column<select disabled={disabled} value={textValue(highlight.column)} onChange={(event) => write({ highlight: { ...highlight, column: event.target.value } })}><option value="">None</option>{columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
      </div>
      <label className={styles.fieldLabel}>For this question / conclusion<textarea rows={2} disabled={disabled} value={conclusion} onChange={(event) => onConclusion(event.target.value)} /></label>
    </div>
  );
}
