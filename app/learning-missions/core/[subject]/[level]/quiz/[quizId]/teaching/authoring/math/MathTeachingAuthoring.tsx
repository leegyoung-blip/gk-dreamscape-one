"use client";

import ListEditor from "../ListEditor";
import styles from "../TeachingAuthoring.module.css";
import type { TeachingDraft } from "../TeachingAuthoringTypes";
import { isRecord, patchLesson, textValue } from "../TeachingAuthoringUtils";

export const MATH_LESSON_TYPES = [
  ["simple_explanation", "Simple explanation"],
  ["worked_steps", "Worked Steps"],
  ["vertical_working", "Vertical Working"],
  ["place_value", "Place Value"],
  ["fraction", "Fractions"],
  ["geometry", "Geometry"],
  ["unit_conversion", "Unit Conversion"],
  ["word_problem", "Word Problem"],
] as const;

export default function MathTeachingAuthoring({
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
            {MATH_LESSON_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>

      {type === "simple_explanation" && (
        <label className={styles.fieldLabel}>
          Explanation
          <textarea rows={5} disabled={disabled} value={textValue(value.text) || textValue(value.body)} onChange={(event) => patch({ text: event.target.value })} />
        </label>
      )}

      {type === "worked_steps" && (
        <>
          <label className={styles.fieldLabel}>Problem / expression<input disabled={disabled} value={textValue(value.expression) || prompt} onChange={(event) => patch({ expression: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Method<textarea rows={3} disabled={disabled} value={textValue(value.method)} onChange={(event) => patch({ method: event.target.value })} /></label>
          <ListEditor title="Worked steps" value={value.steps} disabled={disabled} onChange={(steps) => patch({ steps })} addLabel="+ Add step" />
          <div className={styles.twoColumns}>
            <label className={styles.fieldLabel}>Answer<input disabled={disabled} value={textValue(value.result) || textValue(value.answer)} onChange={(event) => patch({ result: event.target.value })} /></label>
            <label className={styles.fieldLabel}>Unit<input disabled={disabled} value={textValue(value.unit)} onChange={(event) => patch({ unit: event.target.value })} /></label>
          </div>
          <label className={styles.fieldLabel}>Check<textarea rows={2} disabled={disabled} value={textValue(value.check)} onChange={(event) => patch({ check: event.target.value })} /></label>
          <ListEditor title="Another example" value={value.examples} disabled={disabled} onChange={(examples) => patch({ examples })} />
        </>
      )}

      {type === "vertical_working" && (
        <VerticalWorkingEditor value={value} disabled={disabled} onChange={patch} />
      )}

      {type === "place_value" && (
        <PlaceValueEditor value={value} disabled={disabled} onChange={patch} />
      )}

      {type === "fraction" && (
        <FractionEditor value={value} disabled={disabled} onChange={patch} />
      )}

      {type === "geometry" && (
        <GeometryEditor value={value} disabled={disabled} onChange={patch} />
      )}

      {type === "unit_conversion" && (
        <ConversionEditor value={value} disabled={disabled} onChange={patch} />
      )}

      {type === "word_problem" && (
        <WordProblemEditor value={value} disabled={disabled} onChange={patch} />
      )}
    </div>
  );
}

function VerticalWorkingEditor({ value, disabled, onChange }: { value: TeachingDraft; disabled: boolean; onChange: (patch: TeachingDraft) => void }) {
  const working = isRecord(value.vertical_working) ? value.vertical_working : {};
  const operands = Array.isArray(working.operands) ? working.operands.map(String) : ["", ""];
  const carries = Array.isArray(working.carries) ? working.carries.map(String) : [];
  const patchWorking = (patch: TeachingDraft) => onChange({ vertical_working: { ...working, ...patch } });

  return <div className={styles.stack}>
    <label className={styles.fieldLabel}>Method<textarea rows={2} disabled={disabled} value={textValue(value.method)} onChange={(event) => onChange({ method: event.target.value })} /></label>
    <div className={styles.twoColumns}>
      <label className={styles.fieldLabel}>Operator<select disabled={disabled} value={textValue(working.operator) || "+"} onChange={(event) => patchWorking({ operator: event.target.value })}><option value="+">+</option><option value="−">−</option><option value="×">×</option><option value="÷">÷</option></select></label>
      <label className={styles.fieldLabel}>Result<input disabled={disabled} value={textValue(working.result)} onChange={(event) => patchWorking({ result: event.target.value })} /></label>
    </div>
    <div className={styles.subPanel}>
      <div className={styles.subPanelHeader}><strong>Operands</strong><button type="button" className={styles.smallButton} disabled={disabled} onClick={() => patchWorking({ operands: [...operands, ""] })}>+ Operand</button></div>
      {operands.map((operand, index) => <div key={index} className={styles.axisRow}><input disabled={disabled} value={operand} onChange={(event) => patchWorking({ operands: operands.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} />{operands.length > 2 && <button type="button" className={styles.removeButton} disabled={disabled} onClick={() => patchWorking({ operands: operands.filter((_, itemIndex) => itemIndex !== index) })}>×</button>}</div>)}
    </div>
    <label className={styles.fieldLabel}>Carries — one entry per line<textarea rows={3} disabled={disabled} value={carries.join("\n")} onChange={(event) => patchWorking({ carries: event.target.value.split("\n") })} /></label>
    <label className={styles.fieldLabel}>Working note<textarea rows={2} disabled={disabled} value={textValue(working.note)} onChange={(event) => patchWorking({ note: event.target.value })} /></label>
    <ListEditor title="Column steps" value={value.steps} disabled={disabled} onChange={(steps) => onChange({ steps })} addLabel="+ Add step" />
    <label className={styles.fieldLabel}>Check<textarea rows={2} disabled={disabled} value={textValue(value.check)} onChange={(event) => onChange({ check: event.target.value })} /></label>
  </div>;
}

function PlaceValueEditor({ value, disabled, onChange }: { value: TeachingDraft; disabled: boolean; onChange: (patch: TeachingDraft) => void }) {
  const table = isRecord(value.place_value) ? value.place_value : {};
  const columns = Array.isArray(table.columns) ? table.columns.map(String) : ["Hundreds", "Tens", "Ones"];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  const highlights = Array.isArray(table.highlight_columns) ? table.highlight_columns.map(String) : [];
  const patchTable = (patch: TeachingDraft) => onChange({ place_value: { ...table, ...patch } });

  return <div className={styles.stack}>
    <label className={styles.fieldLabel}>Method<textarea rows={2} disabled={disabled} value={textValue(value.method)} onChange={(event) => onChange({ method: event.target.value })} /></label>
    <div className={styles.subPanel}>
      <div className={styles.subPanelHeader}><strong>Place-value columns</strong><button type="button" className={styles.smallButton} disabled={disabled} onClick={() => patchTable({ columns: [...columns, "New column"] })}>+ Column</button></div>
      <div className={styles.inlineInputs}>{columns.map((column, index) => <div key={index} className={styles.axisRow}><input disabled={disabled} value={column} onChange={(event) => patchTable({ columns: columns.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} /><button type="button" className={styles.removeButton} disabled={disabled || columns.length <= 1} onClick={() => patchTable({ columns: columns.filter((_, itemIndex) => itemIndex !== index) })}>×</button></div>)}</div>
      <div className={styles.inlineChecks}>{columns.map((column) => <label key={column}><input type="checkbox" disabled={disabled} checked={highlights.includes(column)} onChange={(event) => patchTable({ highlight_columns: event.target.checked ? [...highlights, column] : highlights.filter((item) => item !== column) })} /> Highlight {column}</label>)}</div>
    </div>
    <div className={styles.subPanel}>
      <div className={styles.subPanelHeader}><strong>Rows</strong><button type="button" className={styles.smallButton} disabled={disabled} onClick={() => patchTable({ rows: [...rows, { label: "", values: columns.map(() => "") }] })}>+ Row</button></div>
      {rows.map((raw: any, rowIndex: number) => {
        const row = isRecord(raw) ? raw : {};
        const values = Array.isArray(row.values) ? row.values.map(String) : columns.map(() => "");
        return <div key={rowIndex} className={styles.placeValueRow}><input disabled={disabled} value={textValue(row.label)} placeholder="Row label" onChange={(event) => patchTable({ rows: rows.map((item: any, index: number) => index === rowIndex ? { ...(isRecord(item) ? item : {}), label: event.target.value, values } : item) })} />{columns.map((column, index) => <input key={column} disabled={disabled} value={values[index] || ""} placeholder={column} onChange={(event) => { const nextValues = columns.map((_, valueIndex) => valueIndex === index ? event.target.value : (values[valueIndex] || "")); patchTable({ rows: rows.map((item: any, itemIndex: number) => itemIndex === rowIndex ? { ...(isRecord(item) ? item : {}), label: textValue(row.label), values: nextValues } : item) }); }} />)}<button type="button" className={styles.removeButton} disabled={disabled} onClick={() => patchTable({ rows: rows.filter((_: any, index: number) => index !== rowIndex) })}>×</button></div>;
      })}
    </div>
    <ListEditor title="Teaching steps" value={value.steps} disabled={disabled} onChange={(steps) => onChange({ steps })} />
    <label className={styles.fieldLabel}>Answer<input disabled={disabled} value={textValue(value.answer) || textValue(value.result)} onChange={(event) => onChange({ answer: event.target.value })} /></label>
  </div>;
}

function FractionEditor({ value, disabled, onChange }: { value: TeachingDraft; disabled: boolean; onChange: (patch: TeachingDraft) => void }) {
  const fraction = isRecord(value.fraction) ? value.fraction : {};
  const patchFraction = (patch: TeachingDraft) => onChange({ fraction: { ...fraction, ...patch } });
  return <div className={styles.stack}>
    <label className={styles.fieldLabel}>Method<textarea rows={2} disabled={disabled} value={textValue(value.method)} onChange={(event) => onChange({ method: event.target.value })} /></label>
    <div className={styles.threeColumns}>
      <label className={styles.fieldLabel}>Left fraction<input disabled={disabled} value={textValue(fraction.left)} onChange={(event) => patchFraction({ left: event.target.value })} /></label>
      <label className={styles.fieldLabel}>Operator<input disabled={disabled} value={textValue(fraction.operator)} onChange={(event) => patchFraction({ operator: event.target.value })} /></label>
      <label className={styles.fieldLabel}>Right fraction<input disabled={disabled} value={textValue(fraction.right)} onChange={(event) => patchFraction({ right: event.target.value })} /></label>
    </div>
    <label className={styles.fieldLabel}>Common denominator<input disabled={disabled} value={textValue(fraction.common_denominator)} onChange={(event) => patchFraction({ common_denominator: event.target.value })} /></label>
    <div className={styles.twoColumns}><label className={styles.fieldLabel}>Equivalent left<input disabled={disabled} value={textValue(fraction.equivalent_left)} onChange={(event) => patchFraction({ equivalent_left: event.target.value })} /></label><label className={styles.fieldLabel}>Equivalent right<input disabled={disabled} value={textValue(fraction.equivalent_right)} onChange={(event) => patchFraction({ equivalent_right: event.target.value })} /></label></div>
    <label className={styles.fieldLabel}>Working<input disabled={disabled} value={textValue(fraction.working)} onChange={(event) => patchFraction({ working: event.target.value })} /></label>
    <div className={styles.twoColumns}><label className={styles.fieldLabel}>Result<input disabled={disabled} value={textValue(fraction.result)} onChange={(event) => patchFraction({ result: event.target.value })} /></label><label className={styles.fieldLabel}>Simplified answer<input disabled={disabled} value={textValue(fraction.simplified)} onChange={(event) => patchFraction({ simplified: event.target.value })} /></label></div>
    <label className={styles.fieldLabel}>Note<textarea rows={2} disabled={disabled} value={textValue(fraction.note)} onChange={(event) => patchFraction({ note: event.target.value })} /></label>
    <ListEditor title="Teaching steps" value={value.steps} disabled={disabled} onChange={(steps) => onChange({ steps })} />
    <label className={styles.fieldLabel}>Check<textarea rows={2} disabled={disabled} value={textValue(value.check)} onChange={(event) => onChange({ check: event.target.value })} /></label>
  </div>;
}

function GeometryEditor({ value, disabled, onChange }: { value: TeachingDraft; disabled: boolean; onChange: (patch: TeachingDraft) => void }) {
  const geometry = isRecord(value.geometry) ? value.geometry : {};
  const patchGeometry = (patch: TeachingDraft) => onChange({ geometry: { ...geometry, ...patch } });
  return <div className={styles.stack}>
    <div className={styles.infoBox}>The learner view reuses the question’s existing geometry diagram automatically when media is present.</div>
    <ListEditor title="What we know" value={geometry.known} disabled={disabled} onChange={(known) => patchGeometry({ known })} />
    <label className={styles.fieldLabel}>Geometry rule<textarea rows={2} disabled={disabled} value={textValue(geometry.rule)} onChange={(event) => patchGeometry({ rule: event.target.value })} /></label>
    <div className={styles.twoColumns}><label className={styles.fieldLabel}>Formula<input disabled={disabled} value={textValue(geometry.formula)} onChange={(event) => patchGeometry({ formula: event.target.value })} /></label><label className={styles.fieldLabel}>Substitution<input disabled={disabled} value={textValue(geometry.substitution)} onChange={(event) => patchGeometry({ substitution: event.target.value })} /></label></div>
    <label className={styles.fieldLabel}>Working<input disabled={disabled} value={textValue(geometry.working)} onChange={(event) => patchGeometry({ working: event.target.value })} /></label>
    <div className={styles.twoColumns}><label className={styles.fieldLabel}>Answer<input disabled={disabled} value={textValue(geometry.answer)} onChange={(event) => patchGeometry({ answer: event.target.value })} /></label><label className={styles.fieldLabel}>Unit<input disabled={disabled} value={textValue(geometry.unit)} onChange={(event) => patchGeometry({ unit: event.target.value })} /></label></div>
    <label className={styles.fieldLabel}>Check<textarea rows={2} disabled={disabled} value={textValue(value.check)} onChange={(event) => onChange({ check: event.target.value })} /></label>
  </div>;
}

function ConversionEditor({ value, disabled, onChange }: { value: TeachingDraft; disabled: boolean; onChange: (patch: TeachingDraft) => void }) {
  const conversion = isRecord(value.conversion) ? value.conversion : {};
  const patchConversion = (patch: TeachingDraft) => onChange({ conversion: { ...conversion, ...patch } });
  return <div className={styles.stack}>
    <div className={styles.twoColumns}><label className={styles.fieldLabel}>From<input disabled={disabled} value={textValue(conversion.from)} onChange={(event) => patchConversion({ from: event.target.value })} /></label><label className={styles.fieldLabel}>To<input disabled={disabled} value={textValue(conversion.to)} onChange={(event) => patchConversion({ to: event.target.value })} /></label></div>
    <label className={styles.fieldLabel}>Unit relationship<input disabled={disabled} value={textValue(conversion.relationship)} onChange={(event) => patchConversion({ relationship: event.target.value })} /></label>
    <label className={styles.fieldLabel}>Method<textarea rows={2} disabled={disabled} value={textValue(value.method)} onChange={(event) => onChange({ method: event.target.value })} /></label>
    <label className={styles.fieldLabel}>Calculation<input disabled={disabled} value={textValue(conversion.calculation)} onChange={(event) => patchConversion({ calculation: event.target.value })} /></label>
    <label className={styles.fieldLabel}>Result<input disabled={disabled} value={textValue(conversion.result)} onChange={(event) => patchConversion({ result: event.target.value })} /></label>
    <label className={styles.fieldLabel}>Check the unit<textarea rows={2} disabled={disabled} value={textValue(value.check)} onChange={(event) => onChange({ check: event.target.value })} /></label>
  </div>;
}

function WordProblemEditor({ value, disabled, onChange }: { value: TeachingDraft; disabled: boolean; onChange: (patch: TeachingDraft) => void }) {
  const problem = isRecord(value.word_problem) ? value.word_problem : {};
  const patchProblem = (patch: TeachingDraft) => onChange({ word_problem: { ...problem, ...patch } });
  return <div className={styles.stack}>
    <ListEditor title="1. What do we know?" value={problem.known} disabled={disabled} onChange={(known) => patchProblem({ known })} addLabel="+ Add fact" />
    <label className={styles.fieldLabel}>2. What are we finding?<textarea rows={2} disabled={disabled} value={textValue(problem.find)} onChange={(event) => patchProblem({ find: event.target.value })} /></label>
    <label className={styles.fieldLabel}>3. Strategy<textarea rows={2} disabled={disabled} value={textValue(problem.strategy)} onChange={(event) => patchProblem({ strategy: event.target.value })} /></label>
    <ListEditor title="4. Work it out" value={problem.working} disabled={disabled} onChange={(working) => patchProblem({ working })} addLabel="+ Add working step" />
    <div className={styles.twoColumns}><label className={styles.fieldLabel}>5. Answer<input disabled={disabled} value={textValue(problem.answer)} onChange={(event) => patchProblem({ answer: event.target.value })} /></label><label className={styles.fieldLabel}>Unit<input disabled={disabled} value={textValue(problem.unit)} onChange={(event) => patchProblem({ unit: event.target.value })} /></label></div>
    <label className={styles.fieldLabel}>Does it make sense? / Check<textarea rows={2} disabled={disabled} value={textValue(problem.check)} onChange={(event) => patchProblem({ check: event.target.value })} /></label>
  </div>;
}
