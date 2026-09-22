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
import MathAnswerInput from "./MathAnswerInput";

type ChoiceVisualState =
  | "idle"
  | "selected"
  | "correct"
  | "wrong"
  | "muted";

type MathResponseKind = "choice" | "text";

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
  const responseKind = getMathResponseKind(question);
  const options = responseKind === "choice" ? asOptions(question.content) : [];
  const variant = resolveMathPresentationVariant(question);
  const isMultipleSelect = question.question_type === "multiple_select";
  const selectedIds =
    responseKind === "choice"
      ? isMultipleSelect
        ? Array.isArray(response?.option_ids)
          ? response.option_ids.map(String)
          : []
        : response?.option_id
          ? [String(response.option_id)]
          : []
      : [];

  const feedbackVisible = Boolean(
    feedback?.locked || feedback?.pending_manual_review,
  );
  const correctIds =
    responseKind === "choice"
      ? getCorrectChoiceOptionIds(feedback, options, selectedIds)
      : new Set<string>();
  const visualMediaCount = getQuestionVisualMediaCount(question);
  const hasMedia = visualMediaCount > 0 || Boolean(question.stimulus);

  function chooseOption(optionId: string) {
    if (locked || responseKind !== "choice") return;

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
  if (responseKind === "text") stageClassNames.push(styles.mathTextResponseStage);
  if (variant === "calculation") stageClassNames.push(styles.mathCalculationStage);
  if (variant === "word_problem") stageClassNames.push(styles.mathWordProblemStage);
  if (variant === "visual_math") stageClassNames.push(styles.mathVisualStage);
  if (variant === "geometry") stageClassNames.push(styles.mathGeometryStage);
  if (variant === "data_question") stageClassNames.push(styles.mathDataStage);

  const cue = getMathCue(
    variant,
    responseKind,
    isMultipleSelect,
    hasMedia,
  );

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

  const mediaSize = workspaceOpen
    ? "compact"
    : variant === "visual_math" ||
        variant === "geometry" ||
        variant === "data_question"
      ? "large"
      : "standard";

  const mediaBlock = hasMedia ? (
    <div
      className={[
        styles.mathMedia,
        variant === "data_question" ? styles.mathDataMedia : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <QuestionMediaRenderer
        stimulus={question.stimulus}
        assets={question.assets}
        variant="math"
        size={mediaSize}
      />
    </div>
  ) : null;

  const responseBlock =
    responseKind === "text" ? (
      <MathAnswerInput
        question={question}
        response={response}
        feedback={feedback}
        locked={locked}
        workspaceOpen={workspaceOpen}
        onChange={onChange}
      />
    ) : (
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
                  ? {
                      text: "Selected",
                      className: styles.mathChoiceStatusSelected,
                    }
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
      data-math-response-kind={responseKind}
      data-screen-mode={screenMode}
      data-workspace-open={workspaceOpen ? "true" : "false"}
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

      {workspaceOpen && (
        <div className={styles.mathWorkspaceGuide}>
          <span className={styles.mathWorkspaceGuideDot} aria-hidden="true" />
          <span>
            Work on the page beside this question, then enter or choose your
            answer here.
          </span>
        </div>
      )}

      {variant === "data_question" && hasMedia && !workspaceOpen ? (
        <div className={styles.mathDataLayout}>
          <div className={styles.mathDataVisualColumn}>{mediaBlock}</div>
          <div className={styles.mathDataQuestionColumn}>
            {promptBlock}
            {responseBlock}
          </div>
        </div>
      ) : (
        <div
          className={[
            styles.mathBody,
            hasMedia ? styles.mathBodyWithMedia : "",
            responseKind === "text" ? styles.mathBodyTextResponse : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {promptBlock}
          {mediaBlock}
          {responseBlock}
        </div>
      )}

      {error && <div className={styles.mathErrorBox}>{error}</div>}
    </article>
  );
}

function getMathResponseKind(question: QuizQuestion): MathResponseKind {
  switch (question.question_type) {
    case "short_text":
    case "open_cloze":
      return "text";
    default:
      return "choice";
  }
}

function getMathCue(
  variant: MathPresentationVariant,
  responseKind: MathResponseKind,
  multipleSelect: boolean,
  hasMedia: boolean,
) {
  if (responseKind === "text") {
    if (variant === "calculation") return "Work it out, then enter your answer";
    if (variant === "data_question") return "Read the data, then enter your answer";
    if (variant === "geometry") return "Solve it, then enter your answer";
    return "Enter your answer";
  }

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
