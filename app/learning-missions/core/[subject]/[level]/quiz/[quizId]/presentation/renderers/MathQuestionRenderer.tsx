"use client";

import QuestionMediaRenderer from "@/components/core-media/QuestionMediaRenderer";
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
  getQuestionVisualMediaCount,
} from "../../CoreQuizUtils";
import {
  resolveMathPresentationVariant,
  type MathPresentationVariant,
} from "../resolveMathPresentationVariant";
import styles from "../CoreMissionPresentation.module.css";

type ChoiceVisualState =
  | "idle"
  | "selected"
  | "correct"
  | "wrong"
  | "muted";

export default function MathQuestionRenderer({
  question,
  topicTitle,
  response,
  feedback,
  error,
  screenMode,
  workspaceOpen,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  topicTitle: string;
  response?: JsonObject;
  feedback?: ImmediateFeedback;
  error: string | null;
  screenMode: ScreenMode;
  workspaceOpen: boolean;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const options = asOptions(question.content);
  const variant = resolveMathPresentationVariant(question);
  const isMultipleSelect = question.question_type === "multiple_select";
  const selectedIds = isMultipleSelect
    ? Array.isArray(response?.option_ids)
      ? response.option_ids.map(String)
      : []
    : response?.option_id
      ? [String(response.option_id)]
      : [];

  const feedbackVisible = Boolean(
    feedback?.locked || feedback?.pending_manual_review,
  );
  const correctIds = getCorrectChoiceOptionIds(feedback, options, selectedIds);
  const visualMediaCount = getQuestionVisualMediaCount(question);
  const hasMedia = visualMediaCount > 0 || Boolean(question.stimulus);

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

  const stageClassNames = [styles.mathStage];
  if (workspaceOpen) stageClassNames.push(styles.mathStageWorkspaceOpen);
  if (variant === "calculation") stageClassNames.push(styles.mathCalculationStage);
  if (variant === "word_problem") stageClassNames.push(styles.mathWordProblemStage);
  if (variant === "visual_math") stageClassNames.push(styles.mathVisualStage);
  if (variant === "geometry") stageClassNames.push(styles.mathGeometryStage);
  if (variant === "data_question") stageClassNames.push(styles.mathDataStage);

  const cue = getMathCue(variant, isMultipleSelect, hasMedia);

  const promptBlock = (
    <div className={promptWrapClass(variant, styles)}>
      {question.instruction && (
        <p className={styles.mathInstruction}>
          <FractionText text={question.instruction} />
        </p>
      )}
      <h1 className={promptClass(variant, styles)}>
        <FractionText text={question.prompt} />
      </h1>
    </div>
  );

  const mediaBlock = hasMedia ? (
    <div
      className={[
        styles.mathMedia,
        variant === "data_question" ? styles.mathDataMedia : "",
        "core-quiz-media-compact",
        visualMediaCount > 0 ? "core-quiz-media-has-image" : "",
        visualMediaCount > 1 ? "core-quiz-media-multiple-images" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <QuestionMediaRenderer
        stimulus={question.stimulus}
        assets={question.assets}
      />
    </div>
  ) : null;

  const choicesBlock = (
    <div
      className={[
        styles.mathChoiceGrid,
        variant === "data_question" ? styles.mathChoiceGridData : "",
        options.some((option) => option.image_url)
          ? styles.mathChoiceGridImages
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={isMultipleSelect ? "group" : "radiogroup"}
      aria-label="Answer choices"
    >
      {options.map((option, index) => {
        const state = visualState(option.id);
        const selected = selectedIds.includes(option.id);
        const optionClassNames = [styles.mathChoiceButton];

        if (state === "selected") {
          optionClassNames.push(styles.mathChoiceButtonSelected);
        } else if (state === "correct") {
          optionClassNames.push(styles.mathChoiceButtonCorrect);
        } else if (state === "wrong") {
          optionClassNames.push(styles.mathChoiceButtonWrong);
        } else if (state === "muted") {
          optionClassNames.push(styles.mathChoiceButtonMuted);
        }

        const status =
          state === "correct"
            ? { text: "✓", className: styles.mathChoiceStatusCorrect }
            : state === "wrong"
              ? { text: "×", className: styles.mathChoiceStatusWrong }
              : state === "selected"
                ? { text: "Selected", className: styles.mathChoiceStatusSelected }
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
            <span className={styles.mathChoiceLetter}>
              {String.fromCharCode(65 + index)}
            </span>

            <span className={styles.mathChoiceContent}>
              {option.image_url && (
                <img
                  src={option.image_url}
                  alt={option.image_alt || option.text || `Option ${index + 1}`}
                  className={styles.mathChoiceImage}
                />
              )}
              {(!option.image_url || option.show_text_with_image) &&
                option.text && (
                  <span className={styles.mathChoiceText}>
                    <FractionText text={option.text} />
                  </span>
                )}
            </span>

            {status && (
              <span
                className={`${styles.mathChoiceStatus} ${status.className}`}
                aria-hidden="true"
              >
                {status.text}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <article
      data-presentation-mode="math_standard"
      data-math-variant={variant}
      className={stageClassNames.join(" ")}
    >
      <div className={styles.mathHeader}>
        <div className={styles.badgeRow}>
          <span className={styles.typeBadge}>
            {formatCoreQuestionType(question.question_type)}
          </span>
          <span className={styles.mathSkillBadge}>
            {question.skill || topicTitle}
          </span>
        </div>
        <span className={styles.mathStageCue}>{cue}</span>
      </div>

      {variant === "data_question" && hasMedia && !workspaceOpen ? (
        <div className={styles.mathDataLayout}>
          <div className={styles.mathDataVisualColumn}>{mediaBlock}</div>
          <div className={styles.mathDataQuestionColumn}>
            {promptBlock}
            {choicesBlock}
          </div>
        </div>
      ) : (
        <div
          className={[
            styles.mathBody,
            hasMedia ? styles.mathBodyWithMedia : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {variant === "visual_math" || variant === "geometry" ? (
            <>
              {promptBlock}
              {mediaBlock}
              {choicesBlock}
            </>
          ) : (
            <>
              {promptBlock}
              {mediaBlock}
              {choicesBlock}
            </>
          )}
        </div>
      )}

      {error && <div className={styles.mathErrorBox}>{error}</div>}
    </article>
  );
}

function getMathCue(
  variant: MathPresentationVariant,
  multipleSelect: boolean,
  hasMedia: boolean,
) {
  if (multipleSelect) return "Choose all that apply";

  switch (variant) {
    case "calculation":
      return "Work this out";
    case "word_problem":
      return "Solve the problem";
    case "visual_math":
      return "Use the visual";
    case "geometry":
      return hasMedia ? "Study the diagram" : "Solve the geometry problem";
    case "data_question":
      return "Read the data";
    default:
      return "Choose the best answer";
  }
}

function promptWrapClass(
  variant: MathPresentationVariant,
  css: typeof styles,
) {
  const classes = [css.mathPromptWrap];
  if (variant === "calculation") classes.push(css.mathPromptWrapCalculation);
  if (variant === "word_problem") classes.push(css.mathPromptWrapWordProblem);
  if (variant === "visual_math" || variant === "geometry") {
    classes.push(css.mathPromptWrapVisual);
  }
  if (variant === "data_question") classes.push(css.mathPromptWrapData);
  return classes.join(" ");
}

function promptClass(
  variant: MathPresentationVariant,
  css: typeof styles,
) {
  const classes = [css.mathPrompt];
  if (variant === "calculation") classes.push(css.mathPromptCalculation);
  if (variant === "word_problem") classes.push(css.mathPromptWordProblem);
  if (variant === "visual_math" || variant === "geometry") {
    classes.push(css.mathPromptVisual);
  }
  if (variant === "data_question") classes.push(css.mathPromptData);
  return classes.join(" ");
}
