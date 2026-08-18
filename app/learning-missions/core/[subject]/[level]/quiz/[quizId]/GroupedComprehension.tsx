"use client";

import type { CSSProperties } from "react";

type JsonObject = Record<string, any>;

type ComprehensionQuestion = {
  id: string;
  question_order: number;
  question_type: string;
  prompt: string;
  content: JsonObject;
  skill: string | null;
};

type Feedback = {
  locked?: boolean;
  is_correct?: boolean | null;
  explanation?: string | null;
  correct_response?: JsonObject | string | null;
};

type Props = {
  title: string;
  topicTitle: string;
  level: number;
  questions: ComprehensionQuestion[];
  questionIndex: number;
  answers: Record<string, JsonObject>;
  feedbackByQuestion: Record<string, Feedback>;
  tokenBalance: number;
  gemBalance: number;
  isMobile: boolean;
  busy: boolean;
  error: string | null;
  onAnswerChange: (questionId: string, response: JsonObject) => void;
  onQuestionChange: (index: number) => void;
  onPrimaryAction: () => void;
  onExit: () => void;
};

export default function GroupedComprehension({
  title,
  topicTitle,
  level,
  questions,
  questionIndex,
  answers,
  feedbackByQuestion,
  tokenBalance,
  gemBalance,
  isMobile,
  busy,
  error,
  onAnswerChange,
  onQuestionChange,
  onPrimaryAction,
  onExit,
}: Props) {
  const current = questions[questionIndex];
  const passage = String(
    questions[0]?.content?.comprehension_passage ?? "",
  );
  const passageTitle = String(
    questions[0]?.content?.passage_title ?? title,
  );
  const options = getOptions(current?.content ?? {});
  const selected = String(answers[current?.id]?.option_id ?? "");
  const feedback = current ? feedbackByQuestion[current.id] : undefined;
  const answeredCount = questions.filter(
    (question) => Boolean(answers[question.id]?.option_id),
  ).length;
  const isLast = questionIndex >= questions.length - 1;
  const complete = Boolean(selected);

  if (!current) return null;

  return (
    <main style={page}>
      <header style={header(isMobile)}>
        <button type="button" onClick={onExit} style={backButton}>
          ← Quiz List
        </button>

        <div style={headerTitleWrap}>
          <p style={eyebrow}>READING COMPREHENSION</p>
          <p style={headerTitle}>
            {topicTitle} · Primary {level}
          </p>
        </div>

        <div style={balances}>
          <span style={tokenPill}>🪙 {tokenBalance.toLocaleString()}</span>
          <span style={gemPill}>💎 {gemBalance.toLocaleString()}</span>
        </div>
      </header>

      <section style={shell(isMobile)}>
        <aside style={passagePanel(isMobile)}>
          <div style={panelTop}>
            <div>
              <p style={panelEyebrow}>READING PASSAGE</p>
              <h1 style={passageHeading}>{passageTitle}</h1>
            </div>

            <span style={readBadge}>Read carefully</span>
          </div>

          <div style={passageBody(isMobile)}>
            {passage.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index} style={passageParagraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </aside>

        <section style={questionPanel(isMobile)}>
          <div style={questionTop}>
            <div>
              <p style={questionEyebrow}>
                Question {questionIndex + 1} of {questions.length}
              </p>
              <p style={questionMeta}>
                {answeredCount}/{questions.length} answered
              </p>
            </div>

            <span style={skillBadge}>
              {current.skill || "Reading"}
            </span>
          </div>

          <div style={progressTrack}>
            <div
              style={{
                ...progressFill,
                width: `${((questionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          <div style={questionNavigator}>
            {questions.map((question, index) => {
              const answered = Boolean(answers[question.id]?.option_id);
              const active = index === questionIndex;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onQuestionChange(index)}
                  disabled={busy}
                  aria-label={`Open question ${index + 1}`}
                  style={navButton(active, answered)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <article style={questionCard}>
            <h2 style={prompt}>{current.prompt}</h2>

            <div style={optionGrid}>
              {options.map((option, index) => {
                const active = selected === option.id;
                const locked = Boolean(feedback?.locked);

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={busy || locked}
                    onClick={() =>
                      onAnswerChange(current.id, {
                        option_id: option.id,
                      })
                    }
                    style={optionButton(active, busy || locked)}
                  >
                    <span style={optionLetter}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span style={optionText}>{option.text}</span>
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div
                style={
                  feedback.is_correct === false
                    ? feedbackWrong
                    : feedbackGood
                }
              >
                <strong>
                  {feedback.is_correct === false
                    ? "Check your answer"
                    : "Answer saved"}
                </strong>
                {feedback.explanation && (
                  <span style={feedbackText}>{feedback.explanation}</span>
                )}
              </div>
            )}

            {error && <div style={errorBox}>{error}</div>}
          </article>

          <div style={actions(isMobile)}>
            <button
              type="button"
              disabled={busy || questionIndex === 0}
              onClick={() => onQuestionChange(questionIndex - 1)}
              style={{
                ...secondaryButton,
                opacity: busy || questionIndex === 0 ? 0.35 : 1,
                width: isMobile ? "100%" : "auto",
              }}
            >
              ← Previous
            </button>

            <button
              type="button"
              disabled={busy || !complete}
              onClick={onPrimaryAction}
              style={{
                ...primaryButton,
                opacity: busy || !complete ? 0.35 : 1,
                width: isMobile ? "100%" : "auto",
              }}
            >
              {busy
                ? "Saving..."
                : isLast
                  ? "Submit Quiz"
                  : "Next Question →"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function getOptions(content: JsonObject) {
  const options = Array.isArray(content.options) ? content.options : [];

  return options
    .map((option: any, index: number) => ({
      id: String(option?.id ?? index + 1),
      text: String(option?.text ?? ""),
    }))
    .filter((option: { text: string }) => option.text.trim().length > 0);
}

const page: CSSProperties = {
  minHeight: "100dvh",
  background:
    "radial-gradient(circle at 22% 12%,rgba(47,199,204,.12),transparent 34%),#061326",
  color: "white",
  padding: "18px",
  boxSizing: "border-box",
};

function header(isMobile: boolean): CSSProperties {
  return {
    maxWidth: 1540,
    margin: "0 auto 16px",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr auto" : "auto 1fr auto",
    alignItems: "center",
    gap: 12,
  };
}

const headerTitleWrap: CSSProperties = {
  minWidth: 0,
  textAlign: "center",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#78e8ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".18em",
};

const headerTitle: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,.66)",
  fontSize: 12,
  fontWeight: 800,
};

const backButton: CSSProperties = {
  minHeight: 38,
  borderRadius: 999,
  border: "1px solid rgba(126,232,255,.25)",
  background: "rgba(255,255,255,.055)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 850,
};

const balances: CSSProperties = {
  display: "flex",
  gap: 7,
  justifyContent: "flex-end",
};

const tokenPill: CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(255,215,106,.25)",
  background: "rgba(255,215,106,.08)",
  padding: "9px 11px",
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const gemPill: CSSProperties = {
  ...tokenPill,
  border: "1px solid rgba(210,160,255,.28)",
  background: "rgba(168,85,247,.1)",
};

function shell(isMobile: boolean): CSSProperties {
  return {
    maxWidth: 1540,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.18fr) minmax(380px,.82fr)",
    gap: 16,
    alignItems: "stretch",
  };
}

function passagePanel(isMobile: boolean): CSSProperties {
  return {
    minWidth: 0,
    borderRadius: isMobile ? 22 : 30,
    border: "1px solid rgba(126,232,255,.15)",
    background: "rgba(9,28,51,.92)",
    boxShadow: "0 26px 70px rgba(0,0,0,.25)",
    padding: isMobile ? 20 : 28,
    display: "flex",
    flexDirection: "column",
    maxHeight: isMobile ? "none" : "calc(100dvh - 100px)",
  };
}

const panelTop: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 16,
  borderBottom: "1px solid rgba(255,255,255,.08)",
};

const panelEyebrow: CSSProperties = {
  margin: 0,
  color: "#75e6ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".16em",
};

const passageHeading: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(22px,2.2vw,30px)",
  lineHeight: 1.08,
};

const readBadge: CSSProperties = {
  borderRadius: 999,
  background: "rgba(52,211,153,.1)",
  color: "#b9f7dc",
  padding: "7px 10px",
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

function passageBody(isMobile: boolean): CSSProperties {
  return {
    marginTop: 18,
    overflowY: isMobile ? "visible" : "auto",
    paddingRight: isMobile ? 0 : 10,
    minHeight: 0,
  };
}

const passageParagraph: CSSProperties = {
  margin: "0 0 18px",
  color: "rgba(255,255,255,.88)",
  fontSize: "clamp(16px,1.25vw,19px)",
  lineHeight: 1.85,
  letterSpacing: ".005em",
};

function questionPanel(isMobile: boolean): CSSProperties {
  return {
    minWidth: 0,
    borderRadius: isMobile ? 22 : 30,
    border: "1px solid rgba(255,255,255,.11)",
    background: "rgba(13,25,45,.95)",
    padding: isMobile ? 18 : 24,
    display: "flex",
    flexDirection: "column",
    maxHeight: isMobile ? "none" : "calc(100dvh - 100px)",
    overflowY: isMobile ? "visible" : "auto",
  };
}

const questionTop: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const questionEyebrow: CSSProperties = {
  margin: 0,
  color: "#8befff",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: ".14em",
  textTransform: "uppercase",
};

const questionMeta: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,.42)",
  fontSize: 12,
};

const skillBadge: CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(126,232,255,.15)",
  background: "rgba(126,232,255,.055)",
  color: "rgba(255,255,255,.62)",
  padding: "7px 9px",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  maxWidth: "48%",
};

const progressTrack: CSSProperties = {
  height: 7,
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,.07)",
  marginTop: 15,
};

const progressFill: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg,#56d8ff,#66e3bd)",
  transition: "width 180ms ease",
};

const questionNavigator: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 14,
};

function navButton(active: boolean, answered: boolean): CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: active
      ? "1px solid rgba(126,232,255,.7)"
      : "1px solid rgba(255,255,255,.1)",
    background: active
      ? "#7de7f6"
      : answered
        ? "rgba(52,211,153,.13)"
        : "rgba(255,255,255,.035)",
    color: active ? "#061326" : answered ? "#b8f7dc" : "rgba(255,255,255,.5)",
    fontSize: 11,
    fontWeight: 950,
    cursor: "pointer",
  };
}

const questionCard: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gap: 16,
};

const prompt: CSSProperties = {
  margin: 0,
  fontSize: "clamp(23px,2.2vw,32px)",
  lineHeight: 1.2,
};

const optionGrid: CSSProperties = {
  display: "grid",
  gap: 10,
};

function optionButton(active: boolean, disabled: boolean): CSSProperties {
  return {
    minHeight: 62,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    gap: 11,
    alignItems: "center",
    textAlign: "left",
    borderRadius: 15,
    border: active
      ? "1px solid rgba(116,232,247,.65)"
      : "1px solid rgba(255,255,255,.1)",
    background: active
      ? "rgba(74,205,227,.14)"
      : "rgba(255,255,255,.035)",
    color: "white",
    padding: "10px 13px",
    cursor: disabled ? "default" : "pointer",
  };
}

const optionLetter: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(126,232,255,.16)",
  background: "rgba(4,17,33,.5)",
  color: "#d7fbff",
  fontSize: 12,
  fontWeight: 950,
};

const optionText: CSSProperties = {
  fontSize: 14,
  fontWeight: 780,
  lineHeight: 1.45,
};

const feedbackGood: CSSProperties = {
  borderRadius: 13,
  border: "1px solid rgba(52,211,153,.25)",
  background: "rgba(52,211,153,.08)",
  color: "#c7f9e5",
  padding: 13,
  display: "grid",
  gap: 5,
  fontSize: 12,
};

const feedbackWrong: CSSProperties = {
  ...feedbackGood,
  border: "1px solid rgba(248,113,113,.28)",
  background: "rgba(239,68,68,.08)",
  color: "#fecaca",
};

const feedbackText: CSSProperties = {
  color: "rgba(255,255,255,.62)",
  lineHeight: 1.5,
};

const errorBox: CSSProperties = {
  borderRadius: 13,
  border: "1px solid rgba(248,113,113,.3)",
  background: "rgba(239,68,68,.1)",
  color: "#fecaca",
  padding: 13,
  fontSize: 12,
  lineHeight: 1.5,
};

function actions(isMobile: boolean): CSSProperties {
  return {
    marginTop: "auto",
    paddingTop: 20,
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    gap: 10,
  };
}

const secondaryButton: CSSProperties = {
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.055)",
  color: "white",
  padding: "0 18px",
  cursor: "pointer",
  fontWeight: 900,
};

const primaryButton: CSSProperties = {
  ...secondaryButton,
  border: "1px solid rgba(126,232,255,.4)",
  background: "linear-gradient(135deg,#77e6f5,#74ddc4)",
  color: "#061326",
};
