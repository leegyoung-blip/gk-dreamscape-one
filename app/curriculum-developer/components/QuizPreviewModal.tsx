"use client";

import type { CSSProperties } from "react";
import type { CoreQuiz, LinkedQuestion } from "../types";

export default function QuizPreviewModal({
  quiz,
  questions,
  onClose,
}: {
  quiz: CoreQuiz;
  questions: LinkedQuestion[];
  onClose: () => void;
}) {
  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={modal}>
        <div style={topRow}>
          <div>
            <p style={eyebrow}>STUDENT PREVIEW</p>
            <h2 style={title}>{quiz.title}</h2>
            <p style={meta}>
              {quiz.question_count} questions · {quiz.estimated_minutes} minutes
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeButton}>
            Close
          </button>
        </div>

        <div style={questionList}>
          {questions.length === 0 ? (
            <p style={muted}>No questions have been added yet.</p>
          ) : (
            questions.map((question) => (
              <article key={question.id} style={questionCard}>
                <p style={questionNumber}>QUESTION {question.question_order}</p>
                {question.instruction && (
                  <p style={instruction}>{question.instruction}</p>
                )}
                <h3 style={prompt}>{question.prompt}</h3>
                <PreviewResponse question={question} />
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewResponse({ question }: { question: LinkedQuestion }) {
  if (question.question_type === "multiple_choice") {
    const options = Array.isArray(question.content?.options)
      ? question.content.options
      : [];
    return (
      <div style={optionGrid}>
        {options.map((option: any, index: number) => (
          <div key={String(option.id)} style={optionCard}>
            <strong>{String.fromCharCode(65 + index)}</strong>
            <span>{String(option.text || "")}</span>
          </div>
        ))}
      </div>
    );
  }

  if (question.question_type === "true_false") {
    return (
      <div style={optionGrid}>
        <div style={optionCard}>T · True</div>
        <div style={optionCard}>F · False</div>
      </div>
    );
  }

  if (question.question_type === "short_text") {
    return <div style={answerBox}>Student types an answer here.</div>;
  }

  const tokens = Array.isArray(question.content?.tokens)
    ? question.content.tokens
    : [];
  return (
    <div style={tokenWrap}>
      {tokens.map((token: any) => (
        <span key={String(token.id)} style={tokenChip}>
          {String(token.text || "")}
        </span>
      ))}
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(0,0,0,0.72)",
  padding: "18px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};
const modal: CSSProperties = {
  width: "min(900px,100%)",
  maxHeight: "92dvh",
  overflowY: "auto",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.35)",
  background: "linear-gradient(145deg,#071b3c,#0a2957)",
  padding: "20px",
  color: "white",
};
const topRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "10px",
  letterSpacing: "0.16em",
  fontWeight: 900,
};
const title: CSSProperties = { margin: "5px 0 0", fontSize: "30px" };
const meta: CSSProperties = { margin: "7px 0 0", color: "#ffe6a8" };
const closeButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.27)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 13px",
  cursor: "pointer",
};
const questionList: CSSProperties = { marginTop: "18px", display: "grid", gap: "12px" };
const questionCard: CSSProperties = {
  borderRadius: "17px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.05)",
  padding: "16px",
};
const questionNumber: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.13em",
  fontWeight: 900,
};
const instruction: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.58)",
};
const prompt: CSSProperties = { margin: "8px 0 0", fontSize: "20px" };
const optionGrid: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: "8px",
};
const optionCard: CSSProperties = {
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.055)",
  padding: "11px",
  display: "flex",
  gap: "9px",
};
const answerBox: CSSProperties = {
  marginTop: "12px",
  minHeight: "44px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.42)",
  padding: "12px",
};
const tokenWrap: CSSProperties = { marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" };
const tokenChip: CSSProperties = {
  borderRadius: "999px",
  background: "rgba(126,232,255,0.12)",
  padding: "8px 11px",
};
const muted: CSSProperties = { color: "rgba(255,255,255,0.58)" };
