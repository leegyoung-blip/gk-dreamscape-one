"use client";

import type { CSSProperties } from "react";
import FractionText from "@/components/core-missions/FractionText";
import QuestionMediaRenderer from "@/components/core-media/QuestionMediaRenderer";
import type {
  CoreSubject,
  ImmediateFeedback,
  JsonObject,
  QuizQuestion,
  ScreenMode,
} from "../CoreQuizTypes";
import {
  formatCoreQuestionType,
  friendlyCorrectResponse,
  getQuestionVisualMediaCount,
} from "../CoreQuizUtils";
import { resolvePresentationMode } from "./resolvePresentationMode";
import QuestionResponseEditor from "./renderers/QuestionResponseEditor";

export default function CoreMissionStage({
  subject,
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
  subject: CoreSubject;
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
  const isMobile = screenMode === "mobile";
  const visualMediaCount = getQuestionVisualMediaCount(question);
  const presentationMode = resolvePresentationMode(question, subject);

  return (
    <>
      <article
        data-presentation-mode={presentationMode}
        style={questionCard(isMobile, workspaceOpen, Boolean(feedback))}
      >
        <div style={questionBadgeRow}>
          <span style={questionTypeBadge}>
            {formatCoreQuestionType(question.question_type)}
          </span>
          <span style={skillBadge}>{question.skill || topicTitle}</span>
        </div>

        {question.instruction && (
          <p style={instruction}>
            <FractionText text={question.instruction} />
          </p>
        )}

        <h1 style={questionPrompt(isMobile, workspaceOpen)}>
          <FractionText text={question.prompt} />
        </h1>

        <div
          className={[
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

        <QuestionResponseEditor
          question={question}
          response={response}
          locked={locked}
          screenMode={screenMode}
          workspaceOpen={workspaceOpen}
          onChange={onChange}
        />

        {error && <div style={errorBox}>{error}</div>}
      </article>

      <ImmediateFeedbackCard feedback={feedback} />
    </>
  );
}

function ImmediateFeedbackCard({
  feedback,
}: {
  feedback?: ImmediateFeedback;
}) {
  if (!feedback) return null;

  if (feedback.pending_manual_review) {
    return (
      <div style={feedbackCard(null)}>
        <p style={{ margin: 0, fontWeight: 900 }}>Saved for teacher review.</p>
      </div>
    );
  }

  return (
    <div style={feedbackCard(feedback.is_correct === true)}>
      <p style={{ margin: 0, fontWeight: 900 }}>
        {feedback.is_correct ? "Correct!" : "Not quite."}
      </p>
      {feedback.explanation && (
        <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
          <FractionText text={feedback.explanation} />
        </p>
      )}
      {!feedback.is_correct && feedback.correct_response && (
        <p style={{ margin: "6px 0 0", opacity: 0.82 }}>
          Correct answer:{" "}
          <FractionText text={friendlyCorrectResponse(feedback.correct_response)} />
        </p>
      )}
    </div>
  );
}

function questionCard(
  isMobile: boolean,
  workspaceOpen = false,
  feedbackVisible = false,
): CSSProperties {
  return {
    marginTop: isMobile ? "7px" : workspaceOpen ? "6px" : "9px",
    borderRadius: isMobile ? "15px" : "19px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    padding: isMobile ? "10px" : workspaceOpen ? "10px" : "14px",
    flex: 1,
    minHeight: 0,
    overflowX: "hidden",
    overflowY: "auto",
    boxSizing: "border-box",
    paddingBottom: feedbackVisible ? (isMobile ? "8px" : "10px") : undefined,
  };
}

const questionBadgeRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
};

const questionTypeBadge: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.26)",
  background: "rgba(83,215,255,0.10)",
  color: "#b9f4ff",
  padding: "5px 8px",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

const skillBadge: CSSProperties = {
  ...questionTypeBadge,
  border: "1px solid rgba(216,180,254,0.25)",
  background: "rgba(168,85,247,0.09)",
  color: "#ead6ff",
};

const instruction: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(255,255,255,0.45)",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.35,
};

function questionPrompt(
  isMobile: boolean,
  workspaceOpen = false,
): CSSProperties {
  return {
    margin: isMobile
      ? "7px 0 8px"
      : workspaceOpen
        ? "6px 0 7px"
        : "8px 0 10px",
    fontSize: isMobile
      ? "clamp(18px, 5vw, 21px)"
      : workspaceOpen
        ? "clamp(18px, 1.8vw, 23px)"
        : "clamp(21px, 2.3vw, 27px)",
    lineHeight: workspaceOpen ? 1.16 : 1.2,
    letterSpacing: "-0.02em",
  };
}

function feedbackCard(correct: boolean | null): CSSProperties {
  return {
    marginTop: "8px",
    flex: "0 0 auto",
    maxHeight: "118px",
    overflowY: "auto",
    boxSizing: "border-box",
    borderRadius: "12px",
    border:
      correct === true
        ? "1px solid rgba(52,211,153,0.28)"
        : correct === false
          ? "1px solid rgba(248,113,113,0.28)"
          : "1px solid rgba(251,191,36,0.25)",
    background:
      correct === true
        ? "rgba(52,211,153,0.08)"
        : correct === false
          ? "rgba(239,68,68,0.08)"
          : "rgba(251,191,36,0.08)",
    color:
      correct === true ? "#c8fae8" : correct === false ? "#fecaca" : "#fde7a6",
    padding: "13px",
    fontSize: "13px",
  };
}

const errorBox: CSSProperties = {
  marginTop: "8px",
  borderRadius: "11px",
  border: "1px solid rgba(248,113,113,0.30)",
  background: "rgba(239,68,68,0.10)",
  color: "#fecaca",
  padding: "13px",
  fontSize: "12px",
  lineHeight: 1.5,
};
