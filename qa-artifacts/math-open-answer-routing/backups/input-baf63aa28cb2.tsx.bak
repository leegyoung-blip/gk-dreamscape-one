"use client";

import FractionText, {
  hasRenderableFraction,
} from "@/components/core-missions/FractionText";
import type {
  ImmediateFeedback,
  JsonObject,
  QuizQuestion,
} from "../../CoreQuizTypes";
import styles from "../CoreMissionPresentation.module.css";

type AnswerInputMode = "text" | "numeric" | "decimal";

type AnswerInputConfig = {
  label: string;
  placeholder: string;
  prefix: string;
  suffix: string;
  inputMode: AnswerInputMode;
};

export default function MathAnswerInput({
  question,
  response,
  feedback,
  locked,
  workspaceOpen,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  feedback?: ImmediateFeedback;
  locked: boolean;
  workspaceOpen: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const value = String(response?.text ?? "");
  const config = getAnswerInputConfig(question);
  const checked = Boolean(feedback?.locked && !feedback.pending_manual_review);
  const correct = checked && feedback?.is_correct === true;
  const wrong = checked && feedback?.is_correct === false;
  const showFractionPreview = hasRenderableFraction(value);

  const shellClasses = [styles.mathAnswerShell];
  if (workspaceOpen) shellClasses.push(styles.mathAnswerShellWorkspace);
  if (correct) shellClasses.push(styles.mathAnswerShellCorrect);
  if (wrong) shellClasses.push(styles.mathAnswerShellWrong);

  return (
    <div className={shellClasses.join(" ")}>
      <div className={styles.mathAnswerHeadingRow}>
        <div>
          <p className={styles.mathAnswerEyebrow}>YOUR ANSWER</p>
          <p className={styles.mathAnswerLabel}>{config.label}</p>
        </div>

        {checked && (
          <span
            className={
              correct
                ? styles.mathAnswerVerdictCorrect
                : styles.mathAnswerVerdictWrong
            }
          >
            {correct ? "✓ Correct" : "× Check your answer"}
          </span>
        )}
      </div>

      <div className={styles.mathAnswerEntryRow}>
        {config.prefix && (
          <span className={styles.mathAnswerAffix} aria-hidden="true">
            <FractionText text={config.prefix} />
          </span>
        )}

        <input
          type="text"
          inputMode={config.inputMode}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          disabled={locked}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder={config.placeholder}
          aria-label={config.label}
          className={styles.mathAnswerInput}
        />

        {config.suffix && (
          <span className={styles.mathAnswerAffix}>
            <FractionText text={config.suffix} />
          </span>
        )}
      </div>

      {showFractionPreview && (
        <div className={styles.mathAnswerPreview} aria-live="polite">
          <span className={styles.mathAnswerPreviewLabel}>Preview</span>
          <span className={styles.mathAnswerPreviewValue}>
            <FractionText text={value} />
          </span>
        </div>
      )}

      {!checked && !workspaceOpen && (
        <p className={styles.mathAnswerHint}>
          Enter only the answer unless the question asks you to show working.
        </p>
      )}
    </div>
  );
}

function getAnswerInputConfig(question: QuizQuestion): AnswerInputConfig {
  const content = question.content ?? {};
  const nested =
    content.answer_input &&
    typeof content.answer_input === "object" &&
    !Array.isArray(content.answer_input)
      ? (content.answer_input as JsonObject)
      : {};

  const label =
    firstText(
      nested.label,
      content.answer_label,
      content.response_label,
    ) || "Type your answer";

  const placeholder =
    firstText(
      nested.placeholder,
      content.answer_placeholder,
      content.placeholder,
    ) || "Enter answer";

  const prefix = firstText(nested.prefix, content.answer_prefix);
  const suffix = firstText(
    nested.suffix,
    nested.unit,
    content.answer_suffix,
    content.answer_unit,
    content.unit,
  );

  const requestedMode = firstText(
    nested.input_mode,
    content.answer_input_mode,
    content.input_mode,
  ).toLowerCase();

  const inputMode: AnswerInputMode =
    requestedMode === "numeric" || requestedMode === "decimal"
      ? requestedMode
      : "text";

  return {
    label,
    placeholder,
    prefix,
    suffix,
    inputMode,
  };
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}
