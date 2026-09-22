"use client";

import FractionText from "@/components/core-missions/FractionText";
import type {
  ImmediateFeedback,
  JsonObject,
  QuizQuestion,
  ScreenMode,
} from "../../CoreQuizTypes";
import {
  asOptions,
  formatCoreQuestionType,
  getCorrectChoiceOptionIds,
} from "../../CoreQuizUtils";
import styles from "../CoreMissionPresentation.module.css";

type ChoiceVisualState =
  | "idle"
  | "selected"
  | "correct"
  | "wrong"
  | "muted";

export default function LanguageChoiceRenderer({
  question,
  topicTitle,
  response,
  feedback,
  error,
  screenMode,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  topicTitle: string;
  response?: JsonObject;
  feedback?: ImmediateFeedback;
  error: string | null;
  screenMode: ScreenMode;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const options = asOptions(question.content);
  const isMultipleSelect = question.question_type === "multiple_select";
  const selectedIds = isMultipleSelect
    ? Array.isArray(response?.option_ids)
      ? response.option_ids.map(String)
      : []
    : response?.option_id
      ? [String(response.option_id)]
      : [];

  const feedbackVisible = Boolean(feedback?.locked || feedback?.pending_manual_review);
  const correctIds = getCorrectChoiceOptionIds(feedback, options, selectedIds);

  function chooseOption(optionId: string) {
    if (locked) return;

    if (isMultipleSelect) {
      const next = new Set(selectedIds);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      onChange({ option_ids: Array.from(next) });
      return;
    }

    onChange({ option_id: optionId });
  }

  function visualState(optionId: string): ChoiceVisualState {
    const selected = selectedIds.includes(optionId);

    if (!feedbackVisible || feedback?.pending_manual_review) {
      return selected ? "selected" : "idle";
    }

    if (correctIds.has(optionId)) return "correct";
    if (selected && feedback?.is_correct === false) return "wrong";
    return "muted";
  }

  const cue =
    question.question_type === "multiple_select"
      ? "Choose all that apply"
      : "Choose the best answer";

  return (
    <article
      data-presentation-mode="language_choice"
      className={styles.languageStage}
    >
      <div className={styles.languageHeader}>
        <div className={styles.badgeRow}>
          <span className={styles.typeBadge}>
            {formatCoreQuestionType(question.question_type)}
          </span>
          <span className={styles.skillBadge}>
            {question.skill || topicTitle}
          </span>
        </div>
        <span className={styles.stageCue}>{cue}</span>
      </div>

      <div className={styles.languageBody}>
        {question.instruction && (
          <p className={styles.instruction}>
            <FractionText text={question.instruction} />
          </p>
        )}

        <div className={styles.promptWrap}>
          <h1 className={styles.prompt}>
            <FractionText text={question.prompt} />
          </h1>
        </div>

        <div
          className={styles.choiceGrid}
          role={isMultipleSelect ? "group" : "radiogroup"}
          aria-label="Answer choices"
        >
          {options.map((option, index) => {
            const state = visualState(option.id);
            const selected = selectedIds.includes(option.id);
            const optionClassNames = [styles.choiceButton];

            if (state === "selected") {
              optionClassNames.push(styles.choiceButtonSelected);
            } else if (state === "correct") {
              optionClassNames.push(styles.choiceButtonCorrect);
            } else if (state === "wrong") {
              optionClassNames.push(styles.choiceButtonWrong);
            } else if (state === "muted") {
              optionClassNames.push(styles.choiceButtonMuted);
            }

            const status =
              state === "correct"
                ? { text: "✓", className: styles.choiceStatusCorrect }
                : state === "wrong"
                  ? { text: "×", className: styles.choiceStatusWrong }
                  : state === "selected"
                    ? { text: "Selected", className: styles.choiceStatusSelected }
                    : null;

            return (
              <button
                key={option.id}
                type="button"
                disabled={locked}
                onClick={() => chooseOption(option.id)}
                aria-pressed={isMultipleSelect ? selected : undefined}
                role={isMultipleSelect ? undefined : "radio"}
                aria-checked={isMultipleSelect ? undefined : selected}
                className={optionClassNames.join(" ")}
              >
                <span className={styles.choiceLetter}>
                  {String.fromCharCode(65 + index)}
                </span>

                <span className={styles.choiceText}>
                  {option.image_url && (
                    <img
                      src={option.image_url}
                      alt={option.image_alt || option.text || `Option ${index + 1}`}
                      style={{
                        display: "block",
                        width: "100%",
                        maxHeight: screenMode === "mobile" ? 120 : 170,
                        objectFit: "contain",
                        marginBottom:
                          option.show_text_with_image && option.text ? 8 : 0,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.96)",
                      }}
                    />
                  )}
                  {(!option.image_url || option.show_text_with_image) &&
                    option.text && <FractionText text={option.text} />}
                </span>

                {status && (
                  <span
                    className={`${styles.choiceStatus} ${status.className}`}
                    aria-hidden="true"
                  >
                    {status.text}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}
      </div>
    </article>
  );
}
