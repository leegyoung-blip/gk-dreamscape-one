"use client";

import styles from "./TeachingAuthoring.module.css";
import type {
  TeachingAuthoringSubject,
  TeachingDraft,
} from "./TeachingAuthoringTypes";
import { isRecord, textValue } from "./TeachingAuthoringUtils";

type QuickCheckType = "multiple_choice" | "short_text" | "numeric" | "fraction";

const ENGLISH_TYPES: Array<[QuickCheckType, string]> = [
  ["multiple_choice", "Multiple Choice"],
  ["short_text", "Short Answer"],
];

const MATH_TYPES: Array<[QuickCheckType, string]> = [
  ["multiple_choice", "Multiple Choice"],
  ["short_text", "Short Answer"],
  ["numeric", "Numeric Answer"],
  ["fraction", "Fraction Answer"],
];

function defaultQuickCheck(subject: TeachingAuthoringSubject) {
  return {
    title: "Try One",
    instruction: "",
    prompt: "",
    type: subject === "math" ? "numeric" : "multiple_choice",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ],
    correct_option_id: "a",
    accepted_answers: [],
    value: "",
    tolerance: 0,
    numerator: "",
    denominator: "",
    allow_equivalent: true,
    explanation: "",
  };
}

export default function QuickCheckEditor({
  subject,
  value,
  disabled,
  onChange,
}: {
  subject: TeachingAuthoringSubject;
  value: TeachingDraft;
  disabled: boolean;
  onChange: (value: TeachingDraft) => void;
}) {
  const quickCheck = isRecord(value.quick_check) ? value.quick_check : null;

  if (!quickCheck) {
    return (
      <div className={styles.stack}>
        <div className={styles.sectionIntro}>
          <strong>Quick Check</strong>
          <p>
            Optional unscored transfer question shown after the learner opens
            teaching. It checks whether the explanation helped.
          </p>
        </div>
        <button
          type="button"
          className={styles.addTeachMeButton}
          disabled={disabled}
          onClick={() =>
            onChange({ ...value, quick_check: defaultQuickCheck(subject) })
          }
        >
          + Add Quick Check
        </button>
      </div>
    );
  }

  const currentQuickCheck = quickCheck;
  const type = String(currentQuickCheck.type || (subject === "math" ? "numeric" : "multiple_choice")) as QuickCheckType;
  const choices = subject === "math" ? MATH_TYPES : ENGLISH_TYPES;
  const options = Array.isArray(currentQuickCheck.options)
    ? currentQuickCheck.options.map((option: any, index: number) => ({
        id: String(option?.id ?? String.fromCharCode(97 + index)),
        text: String(option?.text ?? ""),
      }))
    : [];

  function patch(patchValue: Record<string, any>) {
    onChange({
      ...value,
      quick_check: {
        ...currentQuickCheck,
        ...patchValue,
      },
    });
  }

  function changeType(nextType: QuickCheckType) {
    const base = defaultQuickCheck(subject);
    patch({
      type: nextType,
      options:
        nextType === "multiple_choice"
          ? options.length >= 2
            ? options
            : base.options
          : currentQuickCheck.options,
      correct_option_id:
        nextType === "multiple_choice"
          ? String(currentQuickCheck.correct_option_id || "a")
          : currentQuickCheck.correct_option_id,
    });
  }

  return (
    <div className={styles.lessonEditor}>
      <div className={styles.lessonEditorHeader}>
        <div>
          <strong>Quick Check</strong>
          <p>
            Unscored practice. Keep it short and test the same concept with a
            new example rather than repeating the original question.
          </p>
        </div>
        <button
          type="button"
          className={styles.removeButton}
          disabled={disabled}
          onClick={() => {
            const next = { ...value };
            delete next.quick_check;
            onChange(next);
          }}
        >
          Clear
        </button>
      </div>

      <div className={styles.twoColumns}>
        <label className={styles.fieldLabel}>
          Label
          <input
            value={textValue(currentQuickCheck.title)}
            disabled={disabled}
            placeholder="Try One"
            onChange={(event) => patch({ title: event.target.value })}
          />
        </label>

        <label className={styles.fieldLabel}>
          Answer type
          <select
            value={type}
            disabled={disabled}
            onChange={(event) => changeType(event.target.value as QuickCheckType)}
          >
            {choices.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.fieldLabel}>
        Optional instruction
        <input
          value={textValue(currentQuickCheck.instruction)}
          disabled={disabled}
          placeholder={subject === "math" ? "Try this similar problem." : "Try this new example."}
          onChange={(event) => patch({ instruction: event.target.value })}
        />
      </label>

      <label className={styles.fieldLabel}>
        Quick Check question
        <textarea
          rows={3}
          value={textValue(currentQuickCheck.prompt)}
          disabled={disabled}
          placeholder="Enter a short transfer question."
          onChange={(event) => patch({ prompt: event.target.value })}
        />
      </label>

      {type === "multiple_choice" && (
        <div className={styles.quickCheckOptionEditor}>
          <div className={styles.sectionIntro}>
            <strong>Answer options</strong>
            <p>Quick Check supports one correct answer.</p>
          </div>
          {Array.from({ length: Math.max(4, options.length || 0) }).map((_, index) => {
            const option = options[index] || {
              id: String.fromCharCode(97 + index),
              text: "",
            };
            return (
              <div key={option.id} className={styles.quickCheckOptionRow}>
                <span>{String.fromCharCode(65 + index)}</span>
                <input
                  value={option.text}
                  disabled={disabled}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  onChange={(event) => {
                    const nextOptions = Array.from({ length: Math.max(4, options.length || 0) }).map((__, optionIndex) =>
                      options[optionIndex] || {
                        id: String.fromCharCode(97 + optionIndex),
                        text: "",
                      },
                    );
                    nextOptions[index] = {
                      ...nextOptions[index],
                      text: event.target.value,
                    };
                    patch({ options: nextOptions });
                  }}
                />
                <input
                  type="radio"
                  name="teaching-quick-check-correct"
                  checked={String(currentQuickCheck.correct_option_id || "a") === option.id}
                  disabled={disabled}
                  onChange={() => patch({ correct_option_id: option.id })}
                  aria-label={`Mark option ${String.fromCharCode(65 + index)} correct`}
                />
              </div>
            );
          })}
        </div>
      )}

      {type === "short_text" && (
        <label className={styles.fieldLabel}>
          Accepted answers — one per line
          <textarea
            rows={4}
            value={Array.isArray(currentQuickCheck.accepted_answers) ? currentQuickCheck.accepted_answers.map(String).join("\n") : ""}
            disabled={disabled}
            onChange={(event) =>
              patch({
                accepted_answers: event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      )}

      {type === "numeric" && (
        <div className={styles.twoColumns}>
          <label className={styles.fieldLabel}>
            Correct value
            <input
              type="number"
              step="any"
              value={currentQuickCheck.value ?? ""}
              disabled={disabled}
              onChange={(event) => patch({ value: event.target.value === "" ? "" : Number(event.target.value) })}
            />
          </label>
          <label className={styles.fieldLabel}>
            Tolerance
            <input
              type="number"
              min="0"
              step="any"
              value={currentQuickCheck.tolerance ?? 0}
              disabled={disabled}
              onChange={(event) => patch({ tolerance: event.target.value === "" ? 0 : Number(event.target.value) })}
            />
          </label>
        </div>
      )}

      {type === "fraction" && (
        <div className={styles.threeColumns}>
          <label className={styles.fieldLabel}>
            Numerator
            <input
              type="number"
              step="1"
              value={currentQuickCheck.numerator ?? ""}
              disabled={disabled}
              onChange={(event) => patch({ numerator: event.target.value === "" ? "" : Number(event.target.value) })}
            />
          </label>
          <label className={styles.fieldLabel}>
            Denominator
            <input
              type="number"
              step="1"
              value={currentQuickCheck.denominator ?? ""}
              disabled={disabled}
              onChange={(event) => patch({ denominator: event.target.value === "" ? "" : Number(event.target.value) })}
            />
          </label>
          <label className={styles.quickCheckEquivalentLabel}>
            <input
              type="checkbox"
              checked={currentQuickCheck.allow_equivalent !== false}
              disabled={disabled}
              onChange={(event) => patch({ allow_equivalent: event.target.checked })}
            />
            Accept equivalent fractions
          </label>
        </div>
      )}

      <label className={styles.fieldLabel}>
        Explanation if incorrect
        <textarea
          rows={3}
          value={textValue(currentQuickCheck.explanation)}
          disabled={disabled}
          placeholder="Optional short reminder. Do not turn this into another full lesson."
          onChange={(event) => patch({ explanation: event.target.value })}
        />
      </label>
    </div>
  );
}
